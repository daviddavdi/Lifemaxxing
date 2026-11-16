/* Courtside Manager — players, ratings & step-based match engine */
'use strict';

function nextPid(S) { S.nextPid = (S.nextPid || 1) + 1; return S.nextPid; }

function calcCA(p) {
  const w = WEIGHTS[p.pos] || WEIGHTS.SF;
  let s = 0, t = 0;
  for (const a of ATTRS) { s += (p.a[a.k] || 1) * w[a.k]; t += w[a.k]; }
  return s / t;
}
function roleScore(p, role) {
  const w = ROLES[role] && ROLES[role].w;
  if (!w) return calcCA(p);
  let s = 0, t = 0;
  for (const k in w) { s += p.a[k] * w[k]; t += w[k]; }
  return s / t;
}
function bestRole(p) {
  let best = 'bal', bs = -1;
  for (const r in ROLES) { if (r === 'bal') continue; const s = roleScore(p, r); if (s > bs) { bs = s; best = r; } }
  return best;
}
function stars(ca) { return clamp(Math.round(((ca - 4.5) / 11) * 5 * 2) / 2, 0.5, 5); }
function salaryFor(ca, age, pot) {
  const eff = ca + (age <= 23 ? Math.max(0, (pot || ca) - ca) * 0.25 : 0);
  const v = 0.25 + 34 * Math.pow(clamp((eff - 6) / 10, 0, 1.2), 2.2);
  return Math.round(Math.min(42, v) * 100) / 100;
}
function playerValue(p) {
  const ca = calcCA(p);
  const yf = p.age <= 21 ? 0.7 : p.age <= 24 ? 0.4 : p.age <= 27 ? 0.15 : 0;
  let eff = ca + Math.max(0, p.pot - ca) * yf;
  if (p.age >= 31) eff -= (p.age - 30) * 0.35;
  return Math.pow(Math.max(1, eff), 3) / 100;
}

function genName(nat) { const n = NATS[nat]; return { first: R.pick(n.first), last: R.pick(n.last) }; }
function randNat(bias) {
  if (bias === 'EUR') bias = R.pick(['ESP', 'ITA', 'GER', 'FRA', 'GRE', 'SRB', 'LTU', 'TUR', 'CRO', 'SLO']);
  if (bias && !NATS[bias]) bias = null;
  if (bias && bias !== 'USA' && R.chance(0.5)) return bias;
  if (bias === 'USA' && R.chance(0.35)) return 'USA';
  return R.wpick(NAT_KEYS, (k) => NATS[k].w);
}
function randHeight(pos) {
  const r = { PG: [184, 196], SG: [190, 202], SF: [198, 207], PF: [203, 212], C: [208, 222] }[pos];
  return R.int(r[0], r[1]);
}
const h20 = (v) => Math.round(clamp(v, 1, 20));
function genHidden(base, wrk, age) {
  return {
    cons: h20(10 + R.gauss() * 3.8 + (age - 25) * 0.15), clutch: h20(10 + R.gauss() * 4), injp: h20(8 + R.gauss() * 4),
    prof: h20(wrk + R.gauss() * 3), amb: h20(10 + R.gauss() * 4 + (base - 10) * 0.4), loy: h20(10 + R.gauss() * 4.5),
    temp: h20(11 + R.gauss() * 4), coach: h20(11 + R.gauss() * 3.8 - Math.max(0, age - 29) * 0.3), ego: h20(9 + R.gauss() * 4 + (base - 10) * 0.6),
    res: h20(10.5 + R.gauss() * 3.8), nfit: h20(10 + R.gauss() * 4), trash: h20(8 + R.gauss() * 4.5),
  };
}

function genPlayer(S, level, pos, age, teamId, natBias) {
  pos = pos || R.pick(POS);
  age = age || clamp(Math.round(19 + Math.abs(R.gauss()) * 6 + R.f(0, 4)), 19, 36);
  const nat = randNat(natBias);
  const nm = genName(nat);
  let base = level + R.gauss() * 0.8;
  if (age <= 21) base -= 1.5; else if (age <= 23) base -= 0.7; else if (age >= 33) base -= 0.4;
  const a = {};
  for (const at of ATTRS) {
    let v = base + (TEMPLATE[pos][at.k] || 0) + R.gauss() * 2.1;
    if (at.k === 'sta' || at.k === 'wrk' || at.k === 'ldr') v = 8 + R.gauss() * 3.5 + (at.k === 'ldr' ? (age - 25) * 0.35 : 0) + (base - 10) * 0.3;
    if (at.k === 'spd' || at.k === 'jmp') v -= Math.max(0, age - 29) * 0.5;
    if (at.k === 'iq' || at.k === 'cmp') v += (age - 25) * 0.18;
    a[at.k] = Math.round(clamp(v, 1, 20));
  }
  const p = {
    id: nextPid(S), first: nm.first, last: nm.last, nat, age, pos, h: randHeight(pos), team: teamId ?? null,
    a, hid: genHidden(base, a.wrk, age), known: [], pot: 0, morale: R.int(55, 75), cond: 100, inj: null,
    contract: { sal: 1, yrs: R.int(1, 4) }, st: emptyStats(), career: [], form: [],
  };
  const ca = calcCA(p);
  const youth = Math.max(0, 26 - age);
  p.pot = Math.round(clamp(ca + youth * R.f(0.15, 0.6) + Math.abs(R.gauss()) * 0.6, ca, 20) * 10) / 10;
  p.contract.sal = salaryFor(ca, age, p.pot);
  if (typeof ensureTraits === 'function') ensureTraits(p);
  return p;
}
function ensureHidden(p) {
  const g = genHidden(calcCA(p), p.a.wrk || 10, p.age);
  if (!p.hid) p.hid = g; else for (const k in g) if (p.hid[k] == null) p.hid[k] = g[k];
  if (!p.known) p.known = [];
  return p;
}
function emptyStats() { return { gp: 0, gs: 0, min: 0, pts: 0, reb: 0, ast: 0, stl: 0, blk: 0, tov: 0, fgm: 0, fga: 0, tpm: 0, tpa: 0, ftm: 0, fta: 0, rat: 0 }; }
function pname(p, short) { return short ? `${p.first[0]}. ${p.last}` : `${p.first} ${p.last}`; }

function personality(p) {
  const h = p.hid;
  if (h.prof >= 16 && h.temp >= 12) return 'Consummate Pro';
  if (h.ego >= 16 && h.amb >= 14) return 'Alpha Ego';
  if (h.temp <= 5) return 'Short Fuse';
  if (h.amb >= 16 && h.prof >= 12) return 'Hungry';
  if (h.loy >= 17) return 'Lifer';
  if (h.coach >= 16) return 'Film-Room Junkie';
  if (h.prof <= 5) return 'Free Spirit';
  if (h.ego <= 5 && h.coach >= 11) return 'Team-First';
  if (h.amb <= 5) return 'Content';
  if (h.ego >= 15) return 'Showman';
  return 'Even-Keeled';
}
function traitKind(p, k) { const v = p.hid[k]; return v >= 15 ? 'hi' : v <= 6 ? 'lo' : null; }

/* ---------- Rotation ---------- */
function autoRotation(S, team) {
  const roster = Object.values(S.players).filter((p) => p.team === team.id);
  const avail = roster.filter((p) => !p.inj && !(p.susp > 0));
  const pool = avail.length >= 5 ? avail : roster;
  const used = new Set();
  let starters = [];
  // best five with each player in his own position where possible (a C only plays PF if he's clearly better)
  const cand = pool.slice().sort((x, y) => calcCA(y) - calcCA(x)).slice(0, 10);
  const PEN = [0, 2.6, 6, 10, 14];
  const CA = new Map(cand.map((p) => [p, calcCA(p)]));
  const fit = (p, i) => CA.get(p) - PEN[Math.abs(POS.indexOf(p.pos) - i)] - (p.cond < 70 ? 1 : 0);
  let best = -1e9, pick = null;
  const cur = [], rec = (i, sc) => {
    if (i === 5) { if (sc > best) { best = sc; pick = cur.slice(); } return; }
    for (const p of cand) if (!cur.includes(p)) { cur.push(p); rec(i + 1, sc + fit(p, i)); cur.pop(); }
  };
  if (cand.length >= 5) rec(0, 0); else pick = cand;
  starters = pick.map((p) => p.id); starters.forEach((id) => used.add(id));
  ensureNumbers(S, team);
  const rest = roster.filter((p) => !used.has(p.id)).sort((x, y) => (x.inj || x.susp > 0 ? 1 : 0) - (y.inj || y.susp > 0 ? 1 : 0) || calcCA(y) - calcCA(x));
  team.rotation = starters.concat(rest.map((p) => p.id));
  if (team.id !== S.userTeam) {
    team.instr = {};
    team.rotation.slice(0, 9).forEach((id) => { const p = S.players[id]; const r = bestRole(p); if (roleScore(p, r) > calcCA(p) + 0.8) team.instr[id] = { role: r, shots: 0 }; });
  }
}
function cleanRotation(S, team) {
  const ids = Object.values(S.players).filter((p) => p.team === team.id).map((p) => p.id);
  const set = new Set(ids);
  ensureNumbers(S, team);
  const rot = (team.rotation || []).filter((id) => set.has(id));
  for (const id of ids) if (!rot.includes(id)) rot.push(id);
  team.rotation = rot;
  if (team.instr) for (const id in team.instr) if (!set.has(+id)) delete team.instr[id];
}

const MIN_PLAN = [34, 33, 32, 31, 30, 20, 18, 16, 14, 12];

/* ---------- Jersey numbers (unique per club, retired numbers excluded) ---------- */
const JERSEY_FAV = [0, 1, 2, 3, 4, 5, 7, 8, 9, 10, 11, 12, 13, 14, 15, 20, 21, 22, 23, 24, 25, 30, 31, 32, 33, 34, 35, 40, 41, 42, 44, 45, 50, 55];
function ensureNumbers(S, team) {
  const r = Object.values(S.players).filter((p) => p.team === team.id).sort((a, b) => a.id - b.id);
  const used = new Set((team.retired || []).map((x) => x.num));
  const need = [];
  for (const p of r) { if (Number.isInteger(p.num) && p.num >= 0 && p.num <= 99 && !used.has(p.num)) used.add(p.num); else need.push(p); }
  for (const p of need) {
    const free = JERSEY_FAV.filter((n) => !used.has(n));
    const pool = free.length ? free : Array.from({ length: 100 }, (_, i) => i).filter((n) => !used.has(n));
    p.num = pool.length ? pool[Math.floor(Math.random() * pool.length)] : 0;
    used.add(p.num);
  }
}

/* ---------- Match engine (stateful, possession by possession) ---------- */
function teamCoachAttrs(S, team) {
  if (team.id === S.userTeam && S.coach) return typeof coachEffective === 'function' ? coachEffective() : S.coach.a;
  const q = team.cq || 10;
  const o = {}; COACH_ATTRS.forEach((a) => (o[a.k] = q)); return o;
}
function strengthOf(S, tid) {
  const r = Object.values(S.players).filter((p) => p.team === tid).map(calcCA).sort((a, b) => b - a).slice(0, 8);
  return r.length ? r.reduce((s, x) => s + x, 0) / r.length : 8;
}
function blankBox(tid, gs) { return { min: 0, pts: 0, reb: 0, oreb: 0, ast: 0, stl: 0, blk: 0, tov: 0, fgm: 0, fga: 0, tpm: 0, tpa: 0, ftm: 0, fta: 0, gs, team: tid }; }

function createMatch(S, home, away, opts = {}) {
  const m = { home, away, imp: opts.imp || 0, box: {}, events: [], quarters: [], q: 1, clock: 720, gt: 0, done: false, brk: 0, pauses: !!opts.pauses,
    run: { team: -1, pts: 0, said: 0 }, ot: 0, qs: [0, 0], sinceSub: 0, trans: [0, 0], lastTone: {}, shoutAt: -999, techs: {}, talks: 0,
    snap: !!opts.pauses, fb: [null, null], plog: [], out: null, rv: typeof playerRivalMap === 'function' ? playerRivalMap() : {}, rp: {}, lastHL: -999, nextHL: null, ej: {}, flags: {}, pairT: {}, focus: [0, 0] };
  m.sides = [home, away].map((team, i) => {
    if (!team.tactics.system) Object.assign(team.tactics, { ...DEFAULT_TACTICS(), ...team.tactics });
    return { team, ctx: { home: i === 0 }, t: team.tactics, ins: team.instr || (team.instr = {}), coach: teamCoachAttrs(S, team), pts: 0,
      hot: clamp(R.gauss() * 0.04, -0.09, 0.09) + (team.id === S.userTeam && typeof diffCfg === 'function' ? diffCfg().edge : 0), mood: {}, base: {}, form: {}, heat: {}, played: {}, list: [], plan: {}, on: [], en: {}, user: team.id === S.userTeam, asst: team.id === S.userTeam && !!opts.pauses && S.asstSubs !== false,
      duo: typeof duoMapFor === 'function' && team.id === S.userTeam ? duoMapFor(team.id) : {} };
  });
  m.fav = [strengthOf(S, home.id) - strengthOf(S, away.id), 0]; m.fav[1] = -m.fav[0];
  m.sides.forEach((s) => { rebuildPlan(S, m, s, true); s.on = s.list.slice(0, 5); s.on.forEach((p) => (m.box[p.id].gs = 1)); });
  const pm = { slow: 1.88, normal: 2.05, fast: 2.25 };
  const sysP = (t) => (t.system === 'run' ? 1.08 : t.system === 'post' ? 0.95 : 1) * (t.defense === 'press' ? 1.04 : 1);
  const ppm = (pm[home.tactics.pace] * sysP(home.tactics) + pm[away.tactics.pace] * sysP(away.tactics)) / 2;
  m.avgLen = 60 / (ppm * 2);
  m.firstPoss = R.chance(0.5) ? 0 : 1; m.poss = m.firstPoss;
  push(m, 'info', -1, `Tip-off! The ${away.city} ${away.nick} visit the ${home.city} ${home.nick}.`);
  return m;
}
/* Minutes plan for a list of players in rotation order. Targets the manager set are kept as they are;
   the "Auto" players share whatever is left of the 240 minutes (in proportion to the default plan). */
function minTargets(list, ins) {
  const set = (p) => { const o = ins && ins[p.id] && ins[p.id].min; return o != null && o !== '' ? clamp(+o, 0, 44) : null; };
  const fixed = list.map(set), auto = list.map((p, i) => (fixed[i] == null ? (i < MIN_PLAN.length ? MIN_PLAN[i] : 0) : 0));
  const tgt = list.map((p, i) => (fixed[i] != null ? fixed[i] : auto[i]));
  if (list.length < 10) return tgt;
  const fSum = fixed.reduce((a, x) => a + (x || 0), 0), aSum = auto.reduce((a, x) => a + x, 0), left = 240 - fSum;
  if (aSum > 0 && left >= aSum * 0.25) return tgt.map((x, i) => (fixed[i] != null ? x : Math.min(44, auto[i] * left / aSum)));
  // the set targets alone don't fit (or leave almost nothing): squeeze everybody proportionally
  const sum = tgt.reduce((a, x) => a + x, 0);
  return sum > 0 ? tgt.map((x) => Math.min(44, x * 240 / sum)) : tgt;
}
function rebuildPlan(S, m, s, initial) {
  const team = s.team;
  cleanRotation(S, team);
  let list = team.rotation.map((id) => S.players[id]).filter((p) => p && !p.inj && !(p.susp > 0));
  if (list.length < 5) list = list.concat(team.rotation.map((id) => S.players[id]).filter((p) => p && !list.includes(p) && !(p.susp > 0))).slice(0, 5);
  if (list.length < 5) list = list.concat(team.rotation.map((id) => S.players[id]).filter((p) => p && !list.includes(p))).slice(0, 5);
  const remain = initial ? 1 : clamp((2880 - m.gt) / 2880, 0.02, 1);
  const plan = {};
  const target = minTargets(list, s.ins);
  list.forEach((p, idx) => { plan[p.id] = (s.played[p.id] || 0) + target[idx] * 60 * remain; });
  if (list.length < 10) {
    const extra = MIN_PLAN.slice(list.length).reduce((a, x) => a + x, 0) * 60 * remain / Math.max(1, Math.min(list.length, 5));
    list.slice(0, 5).forEach((p) => (plan[p.id] += extra));
  }
  for (const p of list) {
    ensureHidden(p);
    if (s.played[p.id] == null) s.played[p.id] = 0;
    if (s.en[p.id] == null) s.en[p.id] = 100;
    if (!m.box[p.id]) {
      m.box[p.id] = blankBox(team.id, 0);
      const b = (p.morale - 60) / 110; s.base[p.id] = b; s.mood[p.id] = b; s.form[p.id] = R.gauss() * ((21 - p.hid.cons) / 20) * 0.045; s.heat[p.id] = clamp(s.form[p.id] * 4, -0.2, 0.2);
    }
  }
  s.list = list; s.plan = plan;
  if (!initial) { s.on = s.on.filter((p) => list.includes(p)); pickLineup(m, s, true); }
}
function push(m, type, side, text, meta) {
  const e = { g: m.gt, q: m.q, c: Math.max(0, Math.round(m.clock)), type, side, text, hs: m.sides[0].pts, as: m.sides[1].pts };
  if (meta) Object.assign(e, meta);
  e.ai = m.acts ? (e.next ? m.acts.length : m.acts.length - 1) : -1;
  if (m.nextHL && (type === 'score' || type === 'three')) { e.hl = true; e.lbl = m.nextHL; m.nextHL = null; }
  if (e.hl && m.snap) {
    if (!e.force && m.gt - m.lastHL < (e.lbl && e.lbl.startsWith('CLUTCH') ? 45 : 150)) e.hl = false;
    else {
      m.lastHL = m.gt;
      e.on = m.sides.map((s) => ordered(s.on).map((p) => p.id));
      e.heat = {}; m.sides.forEach((s) => s.on.forEach((p) => (e.heat[p.id] = Math.round((s.heat[p.id] || 0) * 100) / 100)));
      e.ej = Object.keys(m.ej).map(Number);
    }
  }
  m.events.push(e);
  return e;
}
// Ordered actions of the current possession, replayed exactly on the 2D court (live matches only).
function act(m, a) { if (!m.snap || !m.acts) return; a.hs = m.sides[0].pts; a.as = m.sides[1].pts; m.acts.push(a); }
const heatAdd = (s, p, v) => { s.heat[p.id] = clamp((s.heat[p.id] || 0) + v, -1, 1); };
function rivalOn(m, p, side) { const l = m.rv && m.rv[p.id]; return l ? side.on.find((x) => l.includes(x.id)) || null : null; }

function role(s, p) { const i = s.ins[p.id]; return ROLES[(i && i.role) || 'bal'] || ROLES.bal; }
function roleMod(s, p, key) {
  const v = role(s, p)[key];
  if (v == null) return key === 'eff' ? 0 : 1;
  const k = clamp(p.hid.coach / 13, 0.45, 1.15);
  return key === 'eff' ? v * k : 1 + (v - 1) * k;
}
function eff(m, s, p, k) {
  const condF = (0.86 + 0.14 * (p.cond / 100)) * (0.94 + 0.06 * ((s.en && s.en[p.id] != null ? s.en[p.id] : 100) / 100));
  let v = p.a[k];
  const r = role(s, p);
  if (r === ROLES.td && k === 'pdef') v += 1;
  if (r === ROLES.rp && k === 'idef') v += 1;
  if (k === 'blk' && r.blk) v *= r.blk;
  if (k === 'pdef' && s.ins[p.id] && s.ins[p.id].lock) v += 1;
  const dp = s.duo[p.id];
  if (dp && DUO_KEYS.includes(k) && s.on.some((x) => x.id === dp)) v += 1.2;
  return v * condF * (1 + 0.035 * (s.mood[p.id] || 0)) * (s.ctx.home ? 1.02 : 1);
}
const avgE = (m, s, arr, k) => arr.reduce((a, p) => a + eff(m, s, p, k), 0) / arr.length;

function pickLineup(m, s, force) {
  if (s.asst) return asstLineup(m, s, force);
  const margin = Math.abs(m.sides[0].pts - m.sides[1].pts);
  const av = s.list.filter((p) => !m.ej[p.id]);
  if (av.length <= 5) { s.on = av.slice(0, 5); return; }
  if (m.q >= 4 && m.clock < 240 && margin <= 10) { s.on = av.slice(0, 5); return; }
  if (m.q >= 4 && m.clock < 300 && margin >= 22 && av.length >= 10) { s.on = av.slice(5, 10); return; }
  const sc = av.map((p) => {
    let rem = s.plan[p.id] - s.played[p.id];
    if (s.on.includes(p)) rem += force ? 30 : 75;
    return { p, rem };
  }).sort((a, b) => b.rem - a.rem);
  s.on = sc.slice(0, 5).map((x) => x.p);
}
// Assistant coach runs the substitutions: minutes plan + energy + hot/cold hand + foul-outs, announced in the feed.
function asstLineup(m, s, force) {
  const before = s.on.slice();
  const margin = Math.abs(m.sides[0].pts - m.sides[1].pts);
  const av = s.list.filter((p) => !m.ej[p.id]);
  const en = (p) => s.en[p.id] ?? 100, heat = (p) => s.heat[p.id] || 0;
  if (av.length <= 5) s.on = av.slice(0, 5);
  else {
    const crunch = m.q >= 4 && m.clock < 300 && margin <= 10, garbage = m.q >= 4 && m.clock < 300 && margin >= 22;
    const sc = av.map((p, idx) => {
      let v = (s.plan[p.id] || 0) - (s.played[p.id] || 0);
      if (s.on.includes(p)) v += force ? 40 : 150;
      v += (en(p) - 70) * 4 + heat(p) * 140;
      if (heat(p) > 0.45) v += 90; if (heat(p) < -0.45) v -= 90;
      if (crunch) v += (10 - idx) * 40 + calcCA(p) * 12;
      if (garbage) v += idx >= 5 ? 400 : -400;
      if (en(p) < 40) v -= 300;
      return { p, v };
    }).sort((a, b) => b.v - a.v);
    let on = sc.slice(0, 5).map((x) => x.p);
    // keep a ball-handler and a big on the floor when possible
    const need = (pos) => !on.some((p) => pos.includes(p.pos));
    for (const pos of [['PG', 'SG'], ['PF', 'C']]) if (need(pos)) {
      const inn = sc.find((x) => !on.includes(x.p) && pos.includes(x.p.pos));
      if (inn) { const out = on.slice().reverse().find((p) => !(['PG', 'SG'].includes(p.pos) && on.filter((q) => ['PG', 'SG'].includes(q.pos)).length === 1) && !(['PF', 'C'].includes(p.pos) && on.filter((q) => ['PF', 'C'].includes(q.pos)).length === 1)); if (out) on[on.indexOf(out)] = inn.p; }
    }
    s.on = on;
  }
  if (m.gt > 0 && !m.done) {
    const ins = s.on.filter((p) => !before.includes(p)), outs = before.filter((p) => !s.on.includes(p));
    if (ins.length && outs.length) {
      const why = (p) => m.ej[p.id] ? 'ejected' : (s.en[p.id] ?? 100) < 55 ? 'needs a breather' : (s.heat[p.id] || 0) < -0.45 ? 'gone cold' : 'rest';
      const pairs = ins.map((p, i) => outs[i] ? `${pname(p, 1)} in for ${pname(outs[i], 1)} (${why(outs[i])})` : `${pname(p, 1)} in`);
      push(m, 'sub', m.sides.indexOf(s), `Assistant sub: ${pairs.join(', ')}.`, { subIn: ins.map((p) => p.id), subOut: outs.map((p) => p.id) });
    }
  }
}
const ordered = (arr) => arr.slice().sort((a, b) => POS.indexOf(a.pos) - POS.indexOf(b.pos));

function usage(m, s, p) {
  const t = s.t;
  const sc = Math.max(p.a.fin, p.a.mid, p.a.thr) * 0.6 + (p.a.fin + p.a.mid + p.a.thr) / 3 * 0.4;
  let base = sc + p.a.iq * 0.15 + p.a.han * 0.1;
  const tacK = 0.6 + s.coach.tac / 25;
  if (t.system === 'pnr' && (p.pos === 'PG' || p.pos === 'SG')) base += (p.a.han - 10) * 0.25 * tacK;
  if (t.system === 'pnr' && (p.pos === 'C' || p.pos === 'PF')) base += (p.a.jmp - 10) * 0.2 * tacK;
  if (t.system === 'post' && (p.pos === 'C' || p.pos === 'PF')) base += 2.2 * tacK;
  const exp = t.system === 'iso' ? 2.3 : t.system === 'motion' ? 1.4 : 1.7;
  let u = Math.pow(Math.max(1, base), exp);
  u *= roleMod(s, p, 'use');
  const ins = s.ins[p.id];
  if (ins && ins.shots) u *= ins.shots > 0 ? 1.35 : 0.7;
  return u * (1 + (p.hid.ego - 10) * 0.015);
}

function stepMatch(m) {
  if (m.done || m.brk) return;
  const fbNow = !!(m.fb && m.fb[m.poss]);
  const len = Math.min(m.clock, fbNow ? R.f(5, 8) : m.avgLen * 1.05 * R.f(0.45, 1.55));
  const g0 = m.gt, c0 = m.clock, n0 = m.events.length, oi = m.poss;
  const on = m.snap ? m.sides.map((s) => ordered(s.on).map((p) => p.id)) : null;
  m.out = null; m.acts = m.snap ? [] : null;
  const s0 = [m.sides[0].pts, m.sides[1].pts];
  possession(m, m.poss);
  m.clock -= len; m.gt += len;
  if (m.snap) {
    // spread the actions over the possession: set-up first, then each shot / free throw / rebound in order
    const W = { shot: 1, ft: 0.55, reb: 0.4, to: 0.7 };
    const acts = m.acts, tot = acts.reduce((x, a) => x + (W[a.t] || 0.5), 0) || 1;
    const start = g0 + len * (acts.length > 3 ? 0.38 : 0.55), span = g0 + len * 0.97 - start;
    let cur = start;
    for (const a of acts) { a.ts = cur; cur += span * (W[a.t] || 0.5) / tot; a.te = cur; }
    for (let i = n0; i < m.events.length; i++) {
      const e = m.events[i], a = acts[Math.min(Math.max(e.ai, 0), acts.length - 1)];
      const tt = a ? (e.ai < 0 ? a.ts : a.te) : g0 + len * 0.5;
      e.g = tt; e.c = Math.max(0, Math.round(c0 - (tt - g0)));
    }
    m.plog.push({ g0, g1: g0 + len, oi, on, acts, s0, fb: fbNow, out: m.out, hs: m.sides[0].pts, as: m.sides[1].pts });
  }
  m.acts = null;
  for (const s of m.sides) for (const p of s.list) {
    if (s.on.includes(p)) s.en[p.id] = Math.max(15, (s.en[p.id] ?? 100) - len * (0.062 - p.a.sta * 0.0016) * (s.t.defense === 'press' ? 1.25 : 1) * (s.t.intensity === 'high' ? 1.12 : s.t.intensity === 'low' ? 0.9 : 1));
    else s.en[p.id] = Math.min(100, (s.en[p.id] ?? 100) + len * 0.1);
  }
  for (const s of m.sides) for (const p of s.on) {
    s.played[p.id] += len; m.box[p.id].min += len;
    s.mood[p.id] += ((s.base[p.id] || 0) - s.mood[p.id]) * 0.004;
    const h = s.heat[p.id] || 0; s.heat[p.id] = h * (h < 0 ? 0.975 - p.hid.res * 0.001 : 0.972); if (m.fireShown && h < 0.2) m.fireShown[p.id] = false;
  }
  if (m.snap || m.trackPairs) { const s = m.sides[m.us ?? 0]; if (s.user) { const on = s.on; for (let i = 0; i < on.length; i++) for (let j = i + 1; j < on.length; j++) { const k = pairKey(on[i].id, on[j].id); m.pairT[k] = (m.pairT[k] || 0) + len; } } }
  m.sinceSub += len;
  if (m.sinceSub >= 55) { m.sinceSub = 0; m.sides.forEach((s) => pickLineup(m, s)); }
  m.poss = 1 - m.poss;
  if (m.clock <= 0.01) endQuarter(m);
}
function endQuarter(m) {
  const [H, A] = m.sides;
  m.quarters.push([H.pts - m.qs[0], A.pts - m.qs[1]]);
  const hn = H.team.abbr, an = A.team.abbr;
  const lbl = m.q <= 4 ? `Q${m.q}` : `OT${m.q - 4}`;
  if (m.q >= 4 && H.pts !== A.pts) { push(m, 'end', -1, `FINAL: ${an} ${A.pts} – ${H.pts} ${hn}`); m.done = true; return; }
  push(m, 'qend', -1, m.q === 2 ? `Halftime: ${an} ${A.pts} – ${H.pts} ${hn}` : m.q >= 4 ? `Tied ${H.pts}–${A.pts}! We're going to overtime!` : `End of ${lbl}: ${an} ${A.pts} – ${H.pts} ${hn}`);
  if (m.q === 2) {
    for (const s of m.sides) if (!s.user) {
      const diff = s.pts - m.sides[s === H ? 1 : 0].pts;
      for (const p of s.list) s.mood[p.id] = clamp(s.mood[p.id] + (diff < -8 ? 0.12 : 0.03) * (s.coach.mot / 12) + R.gauss() * 0.08, -1, 1);
    }
  }
  if (m.q > 12) { m.done = true; return; }
  m.q++;
  if (m.q > 4) m.ot++;
  m.clock = m.q <= 4 ? 720 : 300;
  m.qs = [H.pts, A.pts];
  m.poss = m.q > 4 ? (R.chance(0.5) ? 0 : 1) : (m.q === 4 ? m.firstPoss : 1 - m.firstPoss);
  m.sides.forEach((s) => pickLineup(m, s, true));
  if (m.pauses) m.brk = m.q - 1;
}
function simUntil(m, g) { while (!m.done && !m.brk && m.gt < g) stepMatch(m); }
function simToEnd(m) { while (!m.done) { m.brk = 0; stepMatch(m); } }

const TEAM_REB = 0.11;
// Half-court play that produced the shot: decides how the court animates it and who passes.
const PLAY_AST = { fast: 1.15, roll: 1.4, kick: 1.45, cut: 1.45, spot: 1.35, pop: 1.35, pnr: 0.45, iso: 0.25, post: 0.55, putback: 0.15 };
const PLAY_TXT = {
  roll: (n, ps) => `${ps} runs the pick-and-roll and finds ${n} rolling to the rim!`,
  pop: (n, ps, k) => k === 'thr' ? `Pick-and-pop — ${n} steps out and buries the three.` : `${n} pops off the screen and hits the jumper.`,
  pnr: (n, ps, k) => k === 'thr' ? `${n} comes off the high screen and pulls up from three!` : k === 'mid' ? `${n} uses the screen and nails the pull-up.` : `${n} turns the corner off the pick and finishes.`,
  kick: (n, ps, k, pl) => pl.corner ? `${ps} drives and kicks — ${n} hits the corner three!` : `${ps} draws the help and kicks it to ${n} for three.`,
  cut: (n, ps) => `${n} cuts backdoor and ${ps} hits him for the layup.`,
  post: (n, ps, k) => k === 'mid' ? `${n} backs down on the block and hits the turnaround.` : `${n} goes to work in the post and scores.`,
  iso: (n, ps, k) => k === 'thr' ? `${n} isolates, step-back three... good!` : `${n} clears it out, beats his man one-on-one.`,
  putback: (n) => `${n} cleans up the miss with the putback!`,
};
function pickPlay(O, off, sh, type, putback) {
  const sys = O.t.system, big = (p) => p.pos === 'C' || p.pos === 'PF', mates = off.filter((x) => x !== sh);
  const handler = mates.length ? R.wpick(mates, (x) => Math.pow(x.a.han + x.a.pas, 2.2)) : null;
  const screener = mates.filter(big).sort((a, b) => b.a.str - a.a.str)[0] || mates.find((x) => x !== handler);
  if (putback && type === 'in') return { play: 'putback', ps: null };
  const w = {};
  const add = (k, v) => (w[k] = (w[k] || 0) + v);
  if (type === 'thr') { add('kick', 3); add('spot', 2); if (big(sh)) add('pop', 2.5); else { add('pnr', 1.5); add('iso', 0.8); } }
  else if (type === 'mid') { if (big(sh)) { add('post', 3); add('pop', 1.2); } else { add('pnr', 3); add('iso', 1.4); } add('spot', 0.6); }
  else { if (big(sh)) { add('roll', 3); add('post', 2.2); } else { add('pnr', 2); add('cut', 1.8); add('iso', 1); } add('cut', 0.6); }
  const k = { pnr: { pnr: 1.8, roll: 1.8, pop: 1.8 }, post: { post: 2 }, iso: { iso: 2.5 }, motion: { cut: 1.8, kick: 1.4, spot: 1.4 }, run: { kick: 1.4, spot: 1.3 } }[sys] || {};
  for (const x in k) if (w[x]) w[x] *= k[x];
  let r = Math.random() * Object.values(w).reduce((a, b) => a + b, 0), play = 'spot';
  for (const x in w) { r -= w[x]; if (r <= 0) { play = x; break; } }
  const ps = play === 'pnr' || play === 'iso' ? null : play === 'post' ? (handler || null)?.id : handler ? handler.id : null;
  return { play, ps: ps ?? null, sc: play === 'pnr' || play === 'roll' || play === 'pop' ? (play === 'pnr' ? screener : handler)?.id ?? null : null, corner: play === 'kick' && Math.random() < 0.55 };
}
function possession(m, oi) {
  const O = m.sides[oi], D = m.sides[1 - oi];
  const off = ordered(O.on), def = ordered(D.on);
  const ot = O.t, dt = D.t;
  const tacO = 0.6 + O.coach.tac / 25, tacD = 0.6 + D.coach.tac / 25;
  if (O.pts - D.pts <= -10 && R.chance(0.004)) {
    const hh = off.find((p) => p.hid.temp <= 5 && (m.techs[p.id] || 0) < 2 && !m.ej[p.id] && R.chance(m.focus[oi] > m.gt ? 0.4 : 1));
    if (hh) technical(m, O, D, hh, `${pname(hh, 1)} gets a technical foul for barking at the referee!`);
  }
  const fb = m.fb[oi]; m.fb[oi] = null;
  const fgOn = off.some((p) => role(O, p) === ROLES.fg);
  const toP = 0.128 + (avgE(m, D, def, 'stl') + avgE(m, D, def, 'pdef') - avgE(m, O, off, 'han') - avgE(m, O, off, 'pas')) * 0.0035
    + ({ low: -0.015, normal: 0, high: 0.02 }[dt.intensity] || 0) - (avgE(m, O, off, 'iq') - 10) * 0.002
    + (dt.defense === 'press' ? 0.025 * tacD : 0) + (ot.system === 'run' ? 0.01 : 0) + (ot.system === 'iso' ? -0.01 : 0) + (ot.system === 'motion' ? -0.005 : 0)
    + (fgOn ? -0.012 : 0) + (D.coach.def - 10) * 0.0008 - (O.coach.off - 10) * 0.0008;
  if (R.chance(clamp(toP, 0.06, 0.24) * (fb ? 0.45 : 1))) {
    const loser = R.wpick(off, (p) => usage(m, O, p) * (22 - p.a.han));
    m.box[loser.id].tov++;
    m.out = { k: 'to', p: loser.id };
    let stl = null;
    if (R.chance(0.55)) {
      const st = R.wpick(def, (p) => Math.pow(eff(m, D, p, 'stl'), 2));
      m.box[st.id].stl++; heatAdd(D, st, 0.08); m.out.s = st.id; heatAdd(O, loser, -0.08); stl = st;
      act(m, { t: 'to', s: oi, p: loser.id, st: st.id });
      m.trans[1 - oi] = dt.defense === 'press' && R.chance(0.3) ? 0.06 : 0.03;
      if (R.chance(0.55)) m.fb[1 - oi] = { p: st.id };
      push(m, 'stl', 1 - oi, R.pick([`${pname(st, 1)} picks off the pass!`, `Steal by ${pname(st, 1)}.`, `${pname(st, 1)} strips ${pname(loser, 1)} clean!`]), { p: st.id, v: loser.id, k: 'stl', hl: (D.heat[st.id] || 0) > 0.45 || (m.q >= 4 && m.clock < 120) });
    }
    if (!stl) { act(m, { t: 'to', s: oi, p: loser.id }); push(m, 'to', oi, R.pick([`${pname(loser, 1)} throws it away.`, `Turnover — ${pname(loser, 1)} steps out of bounds.`, `${pname(loser, 1)} loses the handle.`])); }
    return;
  }
  let tries = 0;
  const transB = m.trans[oi]; m.trans[oi] = 0;
  const lockP = def.find((p) => D.ins[p.id] && D.ins[p.id].lock);
  let offStar = off[0], bu = -1;
  for (const p of off) { const u = usage(m, O, p); if (u > bu) { bu = u; offStar = p; } }
  while (tries < 4) {
    tries++;
    const fbRun = fb && tries === 1;
    const runner = fbRun ? off.find((x) => x.id === fb.p) : null;
    const sh = fbRun ? (runner && R.chance(0.6) ? runner : R.wpick(off, (x) => Math.pow(x.a.spd, 2) * (x === runner ? 0.3 : 1))) : R.wpick(off, (p) => usage(m, O, p));
    const idx = off.indexOf(sh);
    let dfn = def[idx] || R.pick(def);
    if (dt.defense === 'switch') dfn = R.pick(def);
    if (lockP && sh === offStar) dfn = lockP;
    const z = dt.defense === 'zone', sw = dt.defense === 'switch';
    let wIn = Math.pow(eff(m, O, sh, 'fin'), 2) * (ot.focus === 'inside' ? 1.35 : ot.focus === 'outside' ? 0.75 : 1) * (z ? 0.85 : 1) * roleMod(O, sh, 'inn') * (ot.system === 'post' && (sh.pos === 'C' || sh.pos === 'PF') ? 1.4 : 1);
    const wMid = Math.pow(eff(m, O, sh, 'mid'), 2) * 0.55 * roleMod(O, sh, 'mid') * (ot.system === 'pnr' && sh.pos !== 'C' ? 1.2 : 1);
    let wThr = Math.pow(eff(m, O, sh, 'thr'), 2) * 0.85 * (ot.focus === 'outside' ? 1.4 : ot.focus === 'inside' ? 0.7 : 1) * (z ? 1.15 : 1) * roleMod(O, sh, 'thr') * (ot.system === 'run' ? 1.2 : 1);
    if (dt.help === 'paint') { wIn *= 0.9; wThr *= 1.08; } else if (dt.help === 'perimeter') { wIn *= 1.1; wThr *= 0.9; }
    const rr = Math.random() * (wIn + wMid + wThr);
    let type = rr < wIn ? 'in' : rr < wIn + wMid ? 'mid' : 'thr';
    if (fbRun) type = R.chance(0.84) ? 'in' : 'thr';
    const pl = fbRun ? { play: 'fast', ps: runner && runner !== sh ? runner.id : null } : pickPlay(O, off, sh, type, tries > 1 && m.out && m.out.r === sh.id);
    const late = m.q >= 4 && m.clock < 180 && Math.abs(m.sides[0].pts - m.sides[1].pts) <= 6;
    const clutch = (late ? (sh.a.cmp - 10) * 0.004 + (sh.hid.clutch - 10) * 0.005 : 0) + (m.imp ? (sh.hid.clutch - 10) * 0.003 : 0);
    let p;
    if (type === 'in') {
      p = 0.52 + (eff(m, O, sh, 'fin') - (eff(m, D, dfn, 'idef') * 0.5 + avgE(m, D, def, 'idef') * 0.5)) * 0.011 + (sh.a.jmp - 10) * 0.003 + (sh.a.str - 10) * 0.002;
      if (z) p -= 0.02 * tacD;
      if (dt.help === 'paint') p -= 0.02 * tacD; else if (dt.help === 'perimeter') p += 0.02;
      if (sw) p += 0.012;
      if (dt.defense === 'press' && R.chance(0.08)) p += 0.15;
      if (ot.system === 'pnr' && (sh.pos === 'C' || sh.pos === 'PF')) p += 0.02 * tacO;
      p += roleMod(O, sh, 'eff');
    } else if (type === 'mid') {
      p = 0.41 + (eff(m, O, sh, 'mid') - eff(m, D, dfn, 'pdef')) * 0.009;
    } else {
      p = 0.34 + (eff(m, O, sh, 'thr') - 10) * 0.0095 - (eff(m, D, dfn, 'pdef') - 10) * 0.004 + (z ? 0.012 * tacD : 0);
      if (dt.help === 'paint') p += 0.015; else if (dt.help === 'perimeter') p -= 0.015 * tacD;
      if (sw) p -= 0.012 * tacD * (avgE(m, D, def, 'spd') / 11);
    }
    if (ot.system === 'motion') p += (avgE(m, O, off, 'iq') - 10) * 0.003 * tacO;
    if (ot.system === 'iso') p += (sh.a.han - 12) * 0.003;
    p += (O.coach.off - 10) * 0.0015 - (D.coach.def - 10) * 0.0015;
    p += clutch + O.hot + (O.form[sh.id] || 0) + (O.heat[sh.id] || 0) * 0.035 + transB - (sh.hid.ego - 10) * 0.0015 + (avgE(m, O, off, 'iq') - 10) * 0.002;
    if (fbRun) p += type === 'in' ? 0.05 : 0;
    p = clamp(p, 0.15, 0.82);
    const foulP = (type === 'in' ? 0.13 + (dt.intensity === 'high' ? 0.03 : 0) : type === 'mid' ? 0.04 : 0.015) * roleMod(O, sh, 'foul') * (ot.system === 'post' ? 1.15 : 1) * (1 - (D.coach.dis - 10) * 0.01);
    const fouled = R.chance(foulP);
    if (fouled && type === 'in' && (dfn.hid.temp <= 7 || (m.rv[dfn.id] && m.rv[dfn.id].includes(sh.id))) && !m.ej[dfn.id]) {
      const di = 1 - oi;
      const fc = (m.rv[dfn.id] && m.rv[dfn.id].includes(sh.id) ? 2 : 1) * 0.085 * ((9 - dfn.hid.temp) / 8) * ((D.heat[dfn.id] || 0) < -0.3 ? 1.6 : 1) * (D.pts < O.pts - 8 ? 1.5 : 1) * (1.25 - D.coach.dis / 40) * (m.focus[di] > m.gt ? 0.5 : 1);
      if (R.chance(fc)) {
        const lvl = R.chance(0.15) ? 2 : 1;
        m.flags[dfn.id] = Math.max(m.flags[dfn.id] || 0, lvl);
        heatAdd(D, dfn, -0.3);
        if (lvl === 2) { m.ej[dfn.id] = true; push(m, 'flag', di, `FLAGRANT 2! ${pname(dfn, 1)} is EJECTED after a dangerous foul on ${pname(sh, 1)}!`, { p: dfn.id, v: sh.id, k: 'flag', hl: true, force: true, lbl: 'FLAGRANT 2 · EJECTED', next: true }); pickLineup(m, D, true); }
        else push(m, 'flag', di, `FLAGRANT 1 on ${pname(dfn, 1)} — he wraps up ${pname(sh, 1)} on the drive.`, { p: dfn.id, v: sh.id, k: 'flag', hl: true, force: true, lbl: 'FLAGRANT 1', next: true });
      }
    }
    const made = R.chance(fouled ? p * 0.55 : p);
    const val = type === 'thr' ? 3 : 2;
    const b = m.box[sh.id];
    if (made) {
      b.fga++; b.fgm++; if (type === 'thr') { b.tpa++; b.tpm++; }
      b.pts += val; O.pts += val;
      let ast = null;
      const astP = (type === 'thr' ? 0.74 : type === 'mid' ? 0.46 : 0.5) + (ot.system === 'motion' ? 0.08 : ot.system === 'iso' ? -0.18 : ot.system === 'pnr' ? 0.04 : 0) + (fgOn ? 0.06 : 0);
      const astK = PLAY_AST[pl.play] ?? 1;
      if (R.chance(clamp(astP * astK, 0.05, 0.95))) {
        const mates = off.filter((x) => x !== sh), byPlay = pl.ps && mates.find((x) => x.id === pl.ps);
        ast = byPlay && R.chance(0.45) ? byPlay : R.wpick(mates, (x) => Math.pow(eff(m, O, x, 'pas'), 1.65) * roleMod(O, x, 'ast') * (O.duo[sh.id] === x.id ? 2.5 : 1));
        m.box[ast.id].ast++;
      }
      const n = pname(sh, 1);
      const at = ast && R.chance(0.6) ? ` (${pname(ast, 1)} with the assist)` : '';
      let txt;
      if (type === 'thr') txt = R.pick([`${n} drains it from deep!`, `${n} buries the three!`, `Splash! ${n} from downtown.`, `${n} pulls up from 26 feet... got it!`, `${n} hits the corner three.`]);
      else if (type === 'mid') txt = R.pick([`${n} hits the mid-range jumper.`, `${n} with a smooth pull-up.`, `${n} fades away... good!`, `${n} knocks down the elbow jumper.`]);
      else if (sh.a.jmp >= 12 && R.chance(0.5)) txt = R.pick([`${n} throws it down with authority!`, `HUGE slam from ${n}!`, `${n} rises up and hammers it home!`, `Alley-oop! ${n} finishes above the rim!`]);
      else txt = R.pick([`${n} finishes at the rim.`, `${n} with the layup.`, `${n} scores in the paint.`, `${n} spins and lays it in.`, `${n} with a nice floater.`]);
      if (pl.play === 'fast') txt = (type === 'in' ? R.pick([`${n} races the other way and finishes the fast break!`, `${n} all alone on the break — slam!`, `Fast break! ${n} lays it in.`]) : `${n} trails the break and drains the three!`);
      else if (PLAY_TXT[pl.play] && R.chance(0.6)) txt = PLAY_TXT[pl.play](n, pname(off.find((x) => x.id === pl.ps) || sh, 1), type, pl) || txt;
      if (late && R.chance(0.5)) txt = R.pick(['Clutch! ', 'Big-time bucket! ', 'Ice cold! ']) + txt;
      const rvOn = rivalOn(m, sh, D);
      heatAdd(O, sh, (type === 'thr' ? 0.17 : 0.12) * (rvOn ? 1.6 : 1)); if (ast) heatAdd(O, ast, 0.04);
      const fire = (O.heat[sh.id] || 0) > 0.45;
      m.fireShown = m.fireShown || {};
      const newFire = fire && !m.fireShown[sh.id]; if (fire) m.fireShown[sh.id] = true;
      if (fire && R.chance(0.3)) txt += R.pick([` ${pname(sh, 1)} is ON FIRE!`, ` He can't miss!`, ` ${pname(sh, 1)} is heating up!`]);
      if (fouled) txt = 'And one! ' + txt;
      act(m, { t: 'shot', s: oi, k: type, p: sh.id, a: ast ? ast.id : null, made: true, pts: val, foul: fouled, ...pl, ps: ast ? ast.id : pl.ps });
      m.out = { k: type, p: sh.id, a: ast ? ast.id : null, made: true };
      push(m, type === 'thr' ? 'three' : 'score', oi, txt + at, { p: sh.id, a: ast ? ast.id : null, k: type, made: true, hl: late || newFire || (type === 'in' && sh.a.jmp >= 16 && R.chance(0.08)), lbl: late ? 'CLUTCH' : newFire ? 'ON FIRE' : null });
      let ftPts = 0;
      if (fouled) {
        b.fta++;
        const ok = R.chance(0.5 + eff(m, O, sh, 'ft') * 0.022);
        if (ok) { b.ftm++; b.pts++; O.pts++; ftPts = 1; }
        act(m, { t: 'ft', s: oi, p: sh.id, made: ok, n: 1, of: 1, and1: true });
        push(m, 'ft', oi, ok ? `${pname(sh, 1)} completes the ${type === 'thr' ? 'four' : 'three'}-point play at the line.` : `${pname(sh, 1)} misses the and-one free throw.`);
      }
      trackRun(m, oi, val + ftPts);
      if (rvOn && R.chance(0.22 + Math.max(0, sh.hid.trash - 10) * 0.02)) trashTalk(m, O, D, sh, rvOn, oi, true);
      else if (sh.hid.trash >= 14 && R.chance((sh.hid.trash - 12) * 0.04)) trashTalk(m, O, D, sh, dfn, oi);
      return;
    }
    if (fouled) {
      let k = 0;
      act(m, { t: 'shot', s: oi, k: type, p: sh.id, made: false, foul: true, ...pl });
      for (let i = 0; i < val; i++) {
        b.fta++;
        const ok = R.chance(clamp(0.48 + eff(m, O, sh, 'ft') * 0.022 + (late ? (sh.hid.clutch - 10) * 0.006 : 0), 0.4, 0.95));
        if (ok) { k++; b.ftm++; b.pts++; O.pts++; }
        act(m, { t: 'ft', s: oi, p: sh.id, made: ok, n: i + 1, of: val });
      }
      m.out = { k: 'ft', p: sh.id, made: k > 0 };
      if (k) trackRun(m, oi, k);
      push(m, 'ft', oi, `${pname(sh, 1)} ${k === val ? `makes ${val === 3 ? 'all three' : 'both'}` : k === 0 ? `misses ${val === 3 ? 'all three' : 'both'}` : `makes ${k} of ${val}`} from the line${type === 'thr' ? ' after being fouled on a three' : ''}.`);
      if (k === val || R.chance(0.6)) return;
    } else {
      b.fga++; if (type === 'thr') b.tpa++;
      m.out = { k: type, p: sh.id, made: false };
      heatAdd(O, sh, -0.08 * (1.25 - sh.hid.res / 40) * (rivalOn(m, sh, D) ? 1.6 : 1));
      const shotAct = { t: 'shot', s: oi, k: type, p: sh.id, made: false, ...pl };
      act(m, shotAct);
      if (type === 'in' && R.chance(0.1 * (avgE(m, D, def, 'blk') / 10) * 1.4)) {
        const bl = R.wpick(def, (x) => Math.pow(eff(m, D, x, 'blk'), 2.5) * (x.h / 200));
        m.box[bl.id].blk++; m.out.b = bl.id; shotAct.b = bl.id; heatAdd(D, bl, 0.12); heatAdd(O, sh, -0.06);
        if (R.chance(0.6)) push(m, 'blk', 1 - oi, R.pick([`Rejected! ${pname(bl, 1)} swats ${pname(sh, 1)}.`, `${pname(bl, 1)} with the block!`, `Get that outta here! ${pname(bl, 1)} denies ${pname(sh, 1)}.`]), { p: bl.id, v: sh.id, k: 'blk', hl: late || (D.heat[bl.id] || 0) > 0.45, lbl: late ? 'CLUTCH STOP' : null });
      } else if (late && R.chance(0.4)) push(m, 'miss', oi, `${pname(sh, 1)} ${type === 'thr' ? 'misses the three' : 'can\'t get it to drop'} in crunch time.`, { p: sh.id, k: type, made: false, hl: true, lbl: 'CLUTCH' });
      else if (type === 'thr' && R.chance(0.06)) push(m, 'miss', oi, `${pname(sh, 1)} misses from three.`);
    }
    const orb = avgE(m, O, off, 'reb') + avgE(m, O, off, 'str') * 0.3, drb = avgE(m, D, def, 'reb') + avgE(m, D, def, 'str') * 0.3;
    const crash = ot.oreb === 'crash' ? 1.25 : ot.oreb === 'back' ? 0.78 : 1;
    const oP = clamp(0.24 * Math.pow(orb / drb, 1.6) * crash, 0.1, 0.42);
    if (R.chance(oP)) {
      const rb = R.wpick(off, (x) => Math.pow(eff(m, O, x, 'reb'), 1.5) * (x.h / 200) * (eff(m, O, x, 'jmp') + 14) * roleMod(O, x, 'reb'));
      const tr = R.chance(TEAM_REB); if (!tr) { m.box[rb.id].reb++; m.box[rb.id].oreb++; }
      if (m.out) m.out.r = rb.id;
      act(m, { t: 'reb', s: oi, p: rb.id, off: true, tr });
      continue;
    }
    const rb = R.wpick(def, (x) => Math.pow(eff(m, D, x, 'reb'), 1.5) * (x.h / 200) * (eff(m, D, x, 'jmp') + 14) * roleMod(D, x, 'reb'));
    const tr = R.chance(TEAM_REB); if (!tr) m.box[rb.id].reb++; // some boards go down as team rebounds (out of bounds, tipped around), as in real box scores
    if (m.out) m.out.r = rb.id;
    act(m, { t: 'reb', s: oi, p: rb.id, off: false, tr });
    m.trans[1 - oi] = ot.oreb === 'crash' ? 0.02 : ot.oreb === 'back' ? -0.01 : 0;
    if (R.chance(0.035 + (dt.system === 'run' ? 0.05 : 0) + (ot.oreb === 'crash' ? 0.04 : 0))) m.fb[1 - oi] = { p: rb.id };
    return;
  }
}
function technical(m, O, D, p, text) {
  m.techs[p.id] = (m.techs[p.id] || 0) + 1;
  O.mood[p.id] = clamp((O.mood[p.id] || 0) - 0.15, -1, 1);
  heatAdd(O, p, -0.2);
  const si = m.sides.indexOf(O);
  push(m, 'tech', si, text, { p: p.id, k: 'tech', hl: true, force: true, lbl: 'TECHNICAL FOUL', next: true });
  if (m.techs[p.id] >= 2 && !m.ej[p.id]) { m.ej[p.id] = true; push(m, 'flag', si, `${pname(p, 1)} has been EJECTED after his second technical!`, { p: p.id, k: 'flag', hl: true, force: true, lbl: 'EJECTED' }); pickLineup(m, O, true); }
  const sh = D.on.slice().sort((a, b) => b.a.ft - a.a.ft)[0];
  if (!sh) return;
  m.box[sh.id].fta++;
  const ok = R.chance(0.5 + sh.a.ft * 0.022);
  if (ok) { D.pts++; m.box[sh.id].pts++; m.box[sh.id].ftm++; }
  act(m, { t: 'ft', s: m.sides.indexOf(D), p: sh.id, made: ok, n: 1, of: 1, tech: true });
  push(m, 'ft', m.sides.indexOf(D), `${pname(sh, 1)} ${ok ? 'hits' : 'misses'} the technical free throw.`);
}
function trackRun(m, oi, v) {
  const run = m.run;
  if (run.team === oi) run.pts += v; else { run.team = oi; run.pts = v; run.said = 0; }
  if (run.pts >= 8 && run.pts - run.said >= 4) {
    run.said = run.pts; m.nextHL = `${m.sides[oi].team.abbr} ${run.pts}-0 RUN`; m.lastHL = -999;
    push(m, 'run', oi, `${m.sides[oi].team.abbr} on a ${run.pts}-0 run!`);
    m.sides[oi].on.forEach((p) => heatAdd(m.sides[oi], p, 0.05)); m.sides[1 - oi].on.forEach((p) => heatAdd(m.sides[1 - oi], p, -0.05));
  }
}
function trashTalk(m, O, D, sh, dfn, oi, rivals) {
  heatAdd(O, sh, rivals ? 0.16 : 0.1);
  const rk = pairKey(sh.id, dfn.id); m.rp[rk] = (m.rp[rk] || 0) + (rivals ? 0 : sh.pos === dfn.pos ? 1.5 : 0.75);
  if (rivals) { push(m, 'trash', oi, `${pname(sh, 1)} and his rival ${pname(dfn, 1)} are jawing at each other again!`, { p: sh.id, v: dfn.id, k: 'trash', hl: true, lbl: 'RIVALRY' }); }
  if (!sh.known.includes('trash') && sh.team === S.userTeam && m.snap) sh.known.push('trash');
  if ((dfn.hid.temp <= 7 || (rivals && dfn.hid.temp <= 11)) && (m.techs[dfn.id] || 0) < 2 && !m.ej[dfn.id]) {
    heatAdd(D, dfn, -0.15);
    push(m, 'trash', oi, `${pname(sh, 1)} lets ${pname(dfn, 1)} hear about it — and it's getting under his skin.`, { p: sh.id, v: dfn.id, k: 'trash', hl: (m.techs[dfn.id] || 0) === 0, lbl: 'TRASH TALK' });
    if (R.chance((rivals ? 0.4 : 0.22) * Math.max(1, 8 - dfn.hid.temp) / 7) && (m.rp[rk] = (m.rp[rk] || 0) + 2)) technical(m, D, O, dfn, `${pname(dfn, 1)} bites back at ${pname(sh, 1)} and gets T'd up!`);
  } else if (dfn.hid.res >= 14) {
    heatAdd(D, dfn, 0.15);
    push(m, 'trash', oi, `${pname(sh, 1)} talks trash to ${pname(dfn, 1)}... who just smiles. That might have woken him up.`, { p: sh.id, v: dfn.id, k: 'trash' });
  } else push(m, 'trash', oi, `${pname(sh, 1)} barks at ${pname(dfn, 1)} after the bucket.`, { p: sh.id, v: dfn.id, k: 'trash' });
}

/* ---------- Team talks & touchline shouts ---------- */
function toneBase(tone, ctx, p) {
  const h = p.hid;
  const { diff, fav, late, pre, imp } = ctx;
  const winBig = diff >= 12, win = diff > 3, close = Math.abs(diff) <= 3, lose = diff < -3, loseBig = diff <= -12;
  let b = 0;
  if (pre) {
    b = { praise: fav > 1 ? -0.05 : 0.15, encourage: fav < 0 ? 0.3 : 0.15, calm: imp ? 0.35 : 0.08, demand: fav > 1 ? 0.25 : 0.05, berate: -0.35 }[tone];
    if (tone === 'praise' && h.prof < 9 && fav > 1) b -= 0.15;
  } else if (tone === 'praise') { b = winBig ? 0.3 : win ? 0.4 : close ? 0.1 : lose ? -0.15 : -0.35; if (winBig && h.prof < 10) b -= 0.3; b += (h.ego - 10) * 0.02; }
  else if (tone === 'encourage') b = close ? 0.35 : lose && !loseBig ? 0.4 : loseBig ? 0.15 : win ? 0.15 : 0.1;
  else if (tone === 'calm') b = (close && late) || imp ? 0.4 : winBig ? 0.2 : loseBig ? -0.25 : 0.1;
  else if (tone === 'demand') { b = lose && fav > 0 ? 0.4 : lose ? 0.25 : close ? 0.15 : winBig ? -0.2 : -0.05; b += (h.prof - 10) * 0.02; }
  else if (tone === 'berate') { b = loseBig ? 0.4 : lose ? 0.05 : -0.5; b += (h.prof - 10) * 0.025 - (h.ego - 10) * 0.03; }
  if (tone === 'encourage' || tone === 'calm' || tone === 'focus') b += (10 - h.clutch) * 0.015;
  if (tone === 'fireup') { b = pre ? 0.2 : lose ? 0.35 : close ? 0.3 : winBig ? 0.05 : 0.2; b -= Math.max(0, 8 - h.temp) * 0.04; }
  if (tone === 'focus') { b = (close && late) || imp ? 0.35 : lose ? 0.2 : winBig ? 0.25 : 0.15; b += (h.coach - 10) * 0.01; }
  if (tone === 'demand' || tone === 'berate') b -= (10 - h.temp) * 0.025 - (h.res - 10) * 0.015;
  return b;
}
function reactionLabel(tone, d, ctx, p) {
  if (d > 0.3) return ['Fired up', 'r-great'];
  if (d > 0.1) return ['Motivated', 'r-good'];
  if (d > -0.1) return tone === 'praise' && ctx.diff >= 12 && p.hid.prof < 10 ? ['Complacent', 'r-bad'] : ['Focused', 'r-ok'];
  if (d > -0.3) return tone === 'berate' || tone === 'demand' ? ['Annoyed', 'r-bad'] : ['Nervous', 'r-bad'];
  return tone === 'berate' ? ['Furious', 'r-awful'] : ['Deflated', 'r-awful'];
}
function teamTalk(m, si, tone, scale = 1) {
  const s = m.sides[si], o = m.sides[1 - si];
  const ctx = { diff: s.pts - o.pts, fav: m.fav[si], late: m.q >= 4, pre: m.gt === 0, imp: m.imp };
  const repeat = m.lastTone[si] === tone ? 0.5 : 1;
  m.lastTone[si] = tone;
  const c = s.coach;
  const out = [];
  for (const p of s.list) {
    let b = toneBase(tone, ctx, p) * repeat;
    if (b > 0) b += (c.mot - 10) * 0.025; else b *= 1.2 - c.man / 40;
    const k = (0.5 + p.hid.coach / 22) * scale;
    const d = clamp((b + R.gauss() * 0.15) * k, -0.8, 0.8);
    s.mood[p.id] = clamp((s.mood[p.id] || 0) + d, -1, 1);
    s.base[p.id] = clamp((s.base[p.id] || 0) + d * 0.5, -1, 1);
    const [label, cls] = reactionLabel(tone, d, ctx, p);
    const hg = { praise: 0.2, encourage: 0.15, calm: 0.08, demand: 0.25, berate: 0.4, fireup: 0.5, focus: 0.15 }[tone] || 0.15;
    if (!s.heat) s.heat = {};
    s.heat[p.id] = clamp((s.heat[p.id] || 0) + d * hg, -1, 1);
    if (tone === 'focus' && s.heat[p.id] < 0) s.heat[p.id] *= 0.55;
    out.push({ p, d, label, cls });
    const hothead = !m.done && m.gt > 0 && p.hid.temp <= 6 && s.on.includes(p) && (m.techs[p.id] || 0) < 2 && !m.ej[p.id];
    if (hothead && ((tone === 'berate' && R.chance(0.3 * scale)) || (tone === 'fireup' && R.chance(0.15 * scale)))) {
      technical(m, s, o, p, tone === 'berate' ? `${pname(p, 1)} snaps back at his own bench and picks up a technical!` : `${pname(p, 1)} gets way too fired up and is hit with a technical!`);
    }
  }
  if (tone === 'focus') m.focus[si] = m.gt + 300;
  if (scale >= 1) m.talks++;
  return out.sort((a, b) => Math.abs(b.d) - Math.abs(a.d));
}

function matchResult(m) {
  const [H, A] = m.sides;
  const box = {};
  for (const id in m.box) box[id] = { ...m.box[id], min: Math.round(m.box[id].min / 60) };
  const ratings = {};
  for (const id in box) {
    const b = box[id];
    if (b.min <= 0 && b.pts === 0) { ratings[id] = null; continue; }
    const won = (b.team === H.team.id) === (H.pts > A.pts);
    const gsc = b.pts + 0.4 * b.fgm - 0.7 * b.fga - 0.4 * (b.fta - b.ftm) + 0.6 * b.reb + 0.4 * b.oreb + 0.7 * b.ast + b.stl + 0.7 * b.blk - b.tov;
    const r = 6.0 + gsc * 0.1 + (won ? 0.25 : -0.2) + (b.min < 8 ? -0.1 : 0) - (m.techs[id] ? 0.3 : 0) - (m.flags[id] ? 0.4 * m.flags[id] : 0);
    ratings[id] = Math.round(clamp(r, 3, 10) * 10) / 10;
  }
  let pom = null, best = -1;
  for (const id in ratings) if (ratings[id] != null && ratings[id] > best) { best = ratings[id]; pom = +id; }
  return { hs: H.pts, as: A.pts, box, events: m.events, quarters: m.quarters, ratings, pom, ot: m.ot, techs: m.techs, flags: m.flags, ej: m.ej };
}
function simMatch(S, home, away, opts) {
  const m = createMatch(S, home, away, opts);
  simToEnd(m);
  return matchResult(m);
}
