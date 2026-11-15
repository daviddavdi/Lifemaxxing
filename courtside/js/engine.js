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
  return p;
}
function ensureHidden(p) { if (!p.hid) p.hid = genHidden(calcCA(p), p.a.wrk || 10, p.age); if (!p.known) p.known = []; return p; }
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
  const avail = roster.filter((p) => !p.inj);
  const pool = avail.length >= 5 ? avail : roster;
  const used = new Set();
  const starters = [];
  for (let i = 0; i < 5; i++) {
    let best = null, bs = -1e9;
    for (const p of pool) {
      if (used.has(p.id)) continue;
      const d = Math.abs(POS.indexOf(p.pos) - i);
      const sc = calcCA(p) - d * 1.4 - (p.cond < 70 ? 1 : 0);
      if (sc > bs) { bs = sc; best = p; }
    }
    if (best) { used.add(best.id); starters.push(best.id); }
  }
  const rest = roster.filter((p) => !used.has(p.id)).sort((x, y) => (x.inj ? 1 : 0) - (y.inj ? 1 : 0) || calcCA(y) - calcCA(x));
  team.rotation = starters.concat(rest.map((p) => p.id));
  if (team.id !== S.userTeam) {
    team.instr = {};
    team.rotation.slice(0, 9).forEach((id) => { const p = S.players[id]; const r = bestRole(p); if (roleScore(p, r) > calcCA(p) + 0.8) team.instr[id] = { role: r, shots: 0 }; });
  }
}
function cleanRotation(S, team) {
  const ids = Object.values(S.players).filter((p) => p.team === team.id).map((p) => p.id);
  const set = new Set(ids);
  const rot = (team.rotation || []).filter((id) => set.has(id));
  for (const id of ids) if (!rot.includes(id)) rot.push(id);
  team.rotation = rot;
  if (team.instr) for (const id in team.instr) if (!set.has(+id)) delete team.instr[id];
}

const MIN_PLAN = [34, 33, 32, 31, 30, 20, 18, 16, 14, 12];

/* ---------- Match engine (stateful, possession by possession) ---------- */
function teamCoachAttrs(S, team) {
  if (team.id === S.userTeam && S.coach) return S.coach.a;
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
    run: { team: -1, pts: 0, said: 0 }, ot: 0, qs: [0, 0], sinceSub: 0, trans: [0, 0], lastTone: {}, shoutAt: -999, techs: {}, talks: 0 };
  m.sides = [home, away].map((team, i) => {
    if (!team.tactics.system) Object.assign(team.tactics, { ...DEFAULT_TACTICS(), ...team.tactics });
    return { team, ctx: { home: i === 0 }, t: team.tactics, ins: team.instr || (team.instr = {}), coach: teamCoachAttrs(S, team), pts: 0,
      hot: clamp(R.gauss() * 0.04, -0.09, 0.09), mood: {}, base: {}, form: {}, played: {}, list: [], plan: {}, on: [], user: team.id === S.userTeam };
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
function rebuildPlan(S, m, s, initial) {
  const team = s.team;
  cleanRotation(S, team);
  let list = team.rotation.map((id) => S.players[id]).filter((p) => p && !p.inj);
  if (list.length < 5) list = list.concat(team.rotation.map((id) => S.players[id]).filter((p) => p && p.inj)).slice(0, 5);
  const remain = initial ? 1 : clamp((2880 - m.gt) / 2880, 0.02, 1);
  const plan = {};
  list.forEach((p, idx) => { plan[p.id] = (s.played[p.id] || 0) + (idx < MIN_PLAN.length ? MIN_PLAN[idx] : 0) * 60 * remain; });
  if (list.length < 10) {
    const extra = MIN_PLAN.slice(list.length).reduce((a, x) => a + x, 0) * 60 * remain / Math.max(1, Math.min(list.length, 5));
    list.slice(0, 5).forEach((p) => (plan[p.id] += extra));
  }
  for (const p of list) {
    ensureHidden(p);
    if (s.played[p.id] == null) s.played[p.id] = 0;
    if (!m.box[p.id]) {
      m.box[p.id] = blankBox(team.id, 0);
      const b = (p.morale - 60) / 110; s.base[p.id] = b; s.mood[p.id] = b; s.form[p.id] = R.gauss() * ((21 - p.hid.cons) / 20) * 0.045;
    }
  }
  s.list = list; s.plan = plan;
  if (!initial) { s.on = s.on.filter((p) => list.includes(p)); pickLineup(m, s, true); }
}
function push(m, type, side, text) {
  m.events.push({ g: m.gt, q: m.q, c: Math.max(0, Math.round(m.clock)), type, side, text, hs: m.sides[0].pts, as: m.sides[1].pts });
}

function role(s, p) { const i = s.ins[p.id]; return ROLES[(i && i.role) || 'bal'] || ROLES.bal; }
function roleMod(s, p, key) {
  const v = role(s, p)[key];
  if (v == null) return key === 'eff' ? 0 : 1;
  const k = clamp(p.hid.coach / 13, 0.45, 1.15);
  return key === 'eff' ? v * k : 1 + (v - 1) * k;
}
function eff(m, s, p, k) {
  const condF = 0.86 + 0.14 * (p.cond / 100);
  let v = p.a[k];
  const r = role(s, p);
  if (r === ROLES.td && k === 'pdef') v += 1;
  if (r === ROLES.rp && k === 'idef') v += 1;
  if (k === 'blk' && r.blk) v *= r.blk;
  if (k === 'pdef' && s.ins[p.id] && s.ins[p.id].lock) v += 1;
  return v * condF * (1 + 0.035 * (s.mood[p.id] || 0)) * (s.ctx.home ? 1.02 : 1);
}
const avgE = (m, s, arr, k) => arr.reduce((a, p) => a + eff(m, s, p, k), 0) / arr.length;

function pickLineup(m, s, force) {
  const margin = Math.abs(m.sides[0].pts - m.sides[1].pts);
  if (m.q >= 4 && m.clock < 240 && margin <= 10) { s.on = s.list.slice(0, 5); return; }
  if (m.q >= 4 && m.clock < 300 && margin >= 22 && s.list.length >= 10) { s.on = s.list.slice(5, 10); return; }
  const sc = s.list.map((p) => {
    let rem = s.plan[p.id] - s.played[p.id];
    if (s.on.includes(p)) rem += force ? 30 : 75;
    return { p, rem };
  }).sort((a, b) => b.rem - a.rem);
  s.on = sc.slice(0, 5).map((x) => x.p);
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
  const exp = t.system === 'iso' ? 2.6 : t.system === 'motion' ? 1.55 : 1.9;
  let u = Math.pow(Math.max(1, base), exp);
  u *= roleMod(s, p, 'use');
  const ins = s.ins[p.id];
  if (ins && ins.shots) u *= ins.shots > 0 ? 1.35 : 0.7;
  return u * (1 + (p.hid.ego - 10) * 0.015);
}

function stepMatch(m) {
  if (m.done || m.brk) return;
  const len = Math.min(m.clock, m.avgLen * R.f(0.45, 1.55));
  possession(m, m.poss);
  m.clock -= len; m.gt += len;
  for (const s of m.sides) for (const p of s.on) {
    s.played[p.id] += len; m.box[p.id].min += len;
    s.mood[p.id] += ((s.base[p.id] || 0) - s.mood[p.id]) * 0.004;
  }
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

function possession(m, oi) {
  const O = m.sides[oi], D = m.sides[1 - oi];
  const off = ordered(O.on), def = ordered(D.on);
  const ot = O.t, dt = D.t;
  const tacO = 0.6 + O.coach.tac / 25, tacD = 0.6 + D.coach.tac / 25;
  if (O.pts - D.pts <= -10 && R.chance(0.004)) {
    const hh = off.find((p) => p.hid.temp <= 5 && !m.techs[p.id]);
    if (hh) technical(m, O, D, hh, `${pname(hh, 1)} gets a technical foul for barking at the referee!`);
  }
  const fgOn = off.some((p) => role(O, p) === ROLES.fg);
  const toP = 0.128 + (avgE(m, D, def, 'stl') + avgE(m, D, def, 'pdef') - avgE(m, O, off, 'han') - avgE(m, O, off, 'pas')) * 0.0035
    + ({ low: -0.015, normal: 0, high: 0.02 }[dt.intensity] || 0) - (avgE(m, O, off, 'iq') - 10) * 0.002
    + (dt.defense === 'press' ? 0.025 * tacD : 0) + (ot.system === 'run' ? 0.01 : 0) + (ot.system === 'iso' ? -0.01 : 0) + (ot.system === 'motion' ? -0.005 : 0)
    + (fgOn ? -0.012 : 0) + (D.coach.def - 10) * 0.0008 - (O.coach.off - 10) * 0.0008;
  if (R.chance(clamp(toP, 0.06, 0.24))) {
    const loser = R.wpick(off, (p) => usage(m, O, p) * (22 - p.a.han));
    m.box[loser.id].tov++;
    if (R.chance(0.55)) {
      const st = R.wpick(def, (p) => Math.pow(eff(m, D, p, 'stl'), 2));
      m.box[st.id].stl++;
      m.trans[1 - oi] = dt.defense === 'press' && R.chance(0.3) ? 0.06 : 0.03;
      if (R.chance(0.45)) push(m, 'stl', 1 - oi, R.pick([`${pname(st, 1)} picks off the pass!`, `Steal by ${pname(st, 1)}.`, `${pname(st, 1)} strips ${pname(loser, 1)} clean!`]));
    }
    return;
  }
  let tries = 0;
  const transB = m.trans[oi]; m.trans[oi] = 0;
  const lockP = def.find((p) => D.ins[p.id] && D.ins[p.id].lock);
  let offStar = off[0], bu = -1;
  for (const p of off) { const u = usage(m, O, p); if (u > bu) { bu = u; offStar = p; } }
  while (tries < 4) {
    tries++;
    const sh = R.wpick(off, (p) => usage(m, O, p));
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
    const type = rr < wIn ? 'in' : rr < wIn + wMid ? 'mid' : 'thr';
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
    p += clutch + O.hot + (O.form[sh.id] || 0) + transB - (sh.hid.ego - 10) * 0.0015 + (avgE(m, O, off, 'iq') - 10) * 0.002;
    p = clamp(p, 0.15, 0.78);
    const foulP = (type === 'in' ? 0.13 + (dt.intensity === 'high' ? 0.03 : 0) : type === 'mid' ? 0.04 : 0.015) * roleMod(O, sh, 'foul') * (ot.system === 'post' ? 1.15 : 1) * (1 - (D.coach.dis - 10) * 0.01);
    const fouled = R.chance(foulP);
    const made = R.chance(fouled ? p * 0.55 : p);
    const val = type === 'thr' ? 3 : 2;
    const b = m.box[sh.id];
    if (made) {
      b.fga++; b.fgm++; if (type === 'thr') { b.tpa++; b.tpm++; }
      b.pts += val; O.pts += val;
      let ast = null;
      const astP = (type === 'thr' ? 0.82 : type === 'mid' ? 0.55 : 0.58) + (ot.system === 'motion' ? 0.08 : ot.system === 'iso' ? -0.18 : ot.system === 'pnr' ? 0.04 : 0) + (fgOn ? 0.06 : 0);
      if (R.chance(clamp(astP, 0.2, 0.95))) {
        const mates = off.filter((x) => x !== sh);
        ast = R.wpick(mates, (x) => Math.pow(eff(m, O, x, 'pas'), 2.5) * roleMod(O, x, 'ast'));
        m.box[ast.id].ast++;
      }
      const n = pname(sh, 1);
      const at = ast && R.chance(0.6) ? ` (${pname(ast, 1)} with the assist)` : '';
      let txt;
      if (type === 'thr') txt = R.pick([`${n} drains it from deep!`, `${n} buries the three!`, `Splash! ${n} from downtown.`, `${n} pulls up from 26 feet... got it!`, `${n} hits the corner three.`]);
      else if (type === 'mid') txt = R.pick([`${n} hits the mid-range jumper.`, `${n} with a smooth pull-up.`, `${n} fades away... good!`, `${n} knocks down the elbow jumper.`]);
      else if (sh.a.jmp >= 12 && R.chance(0.5)) txt = R.pick([`${n} throws it down with authority!`, `HUGE slam from ${n}!`, `${n} rises up and hammers it home!`, `Alley-oop! ${n} finishes above the rim!`]);
      else txt = R.pick([`${n} finishes at the rim.`, `${n} with the layup.`, `${n} scores in the paint.`, `${n} spins and lays it in.`, `${n} with a nice floater.`]);
      if (late && R.chance(0.5)) txt = R.pick(['Clutch! ', 'Big-time bucket! ', 'Ice cold! ']) + txt;
      if (fouled) {
        txt = 'And one! ' + txt;
        b.fta++;
        if (R.chance(0.5 + eff(m, O, sh, 'ft') * 0.022)) { b.ftm++; b.pts++; O.pts++; }
      }
      trackRun(m, oi, val + (fouled ? 1 : 0));
      push(m, type === 'thr' ? 'three' : 'score', oi, txt + at);
      return;
    }
    if (fouled) {
      let k = 0;
      for (let i = 0; i < val; i++) { b.fta++; if (R.chance(clamp(0.48 + eff(m, O, sh, 'ft') * 0.022 + (late ? (sh.hid.clutch - 10) * 0.006 : 0), 0.4, 0.95))) { k++; b.ftm++; b.pts++; } }
      O.pts += k;
      if (k) trackRun(m, oi, k);
      if (R.chance(0.3) || late) push(m, 'ft', oi, `${pname(sh, 1)} goes ${k}/${val} from the line.`);
      if (k === val || R.chance(0.6)) return;
    } else {
      b.fga++; if (type === 'thr') b.tpa++;
      if (type === 'in' && R.chance(0.1 * (avgE(m, D, def, 'blk') / 10) * 1.4)) {
        const bl = R.wpick(def, (x) => Math.pow(eff(m, D, x, 'blk'), 2.5) * (x.h / 200));
        m.box[bl.id].blk++;
        if (R.chance(0.6)) push(m, 'blk', 1 - oi, R.pick([`Rejected! ${pname(bl, 1)} swats ${pname(sh, 1)}.`, `${pname(bl, 1)} with the block!`, `Get that outta here! ${pname(bl, 1)} denies ${pname(sh, 1)}.`]));
      } else if (late && R.chance(0.4)) push(m, 'miss', oi, `${pname(sh, 1)} ${type === 'thr' ? 'misses the three' : 'can\'t get it to drop'} in crunch time.`);
      else if (type === 'thr' && R.chance(0.06)) push(m, 'miss', oi, `${pname(sh, 1)} misses from three.`);
    }
    const orb = avgE(m, O, off, 'reb') + avgE(m, O, off, 'str') * 0.3, drb = avgE(m, D, def, 'reb') + avgE(m, D, def, 'str') * 0.3;
    const crash = ot.oreb === 'crash' ? 1.25 : ot.oreb === 'back' ? 0.78 : 1;
    const oP = clamp(0.24 * Math.pow(orb / drb, 1.6) * crash, 0.1, 0.42);
    if (R.chance(oP)) {
      const rb = R.wpick(off, (x) => Math.pow(eff(m, O, x, 'reb'), 1.6) * (x.h / 200) * (eff(m, O, x, 'jmp') + 10) * roleMod(O, x, 'reb'));
      m.box[rb.id].reb++; m.box[rb.id].oreb++;
      continue;
    }
    const rb = R.wpick(def, (x) => Math.pow(eff(m, D, x, 'reb'), 1.6) * (x.h / 200) * (eff(m, D, x, 'jmp') + 10) * roleMod(D, x, 'reb'));
    m.box[rb.id].reb++;
    m.trans[1 - oi] = ot.oreb === 'crash' ? 0.02 : ot.oreb === 'back' ? -0.01 : 0;
    return;
  }
}
function technical(m, O, D, p, text) {
  m.techs[p.id] = (m.techs[p.id] || 0) + 1;
  O.mood[p.id] = clamp((O.mood[p.id] || 0) - 0.15, -1, 1);
  push(m, 'tech', m.sides.indexOf(O), text);
  const sh = D.on.slice().sort((a, b) => b.a.ft - a.a.ft)[0];
  if (!sh) return;
  m.box[sh.id].fta++;
  if (R.chance(0.5 + sh.a.ft * 0.022)) { D.pts++; m.box[sh.id].pts++; m.box[sh.id].ftm++; }
}
function trackRun(m, oi, v) {
  const run = m.run;
  if (run.team === oi) run.pts += v; else { run.team = oi; run.pts = v; run.said = 0; }
  if (run.pts >= 8 && run.pts - run.said >= 4) { run.said = run.pts; push(m, 'run', oi, `${m.sides[oi].team.abbr} on a ${run.pts}-0 run!`); }
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
  if (tone === 'encourage' || tone === 'calm') b += (10 - h.clutch) * 0.015;
  if (tone === 'demand' || tone === 'berate') b -= (10 - h.temp) * 0.025;
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
    out.push({ p, d, label, cls });
    if (tone === 'berate' && !m.done && m.gt > 0 && p.hid.temp <= 6 && s.on.includes(p) && R.chance(0.3 * scale) && !m.techs[p.id]) {
      technical(m, s, o, p, `${pname(p, 1)} snaps back at his own bench and picks up a technical!`);
    }
  }
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
    const r = 6.0 + gsc * 0.1 + (won ? 0.25 : -0.2) + (b.min < 8 ? -0.1 : 0) - (m.techs[id] ? 0.3 : 0);
    ratings[id] = Math.round(clamp(r, 3, 10) * 10) / 10;
  }
  let pom = null, best = -1;
  for (const id in ratings) if (ratings[id] != null && ratings[id] > best) { best = ratings[id]; pom = +id; }
  return { hs: H.pts, as: A.pts, box, events: m.events, quarters: m.quarters, ratings, pom, ot: m.ot, techs: m.techs };
}
function simMatch(S, home, away, opts) {
  const m = createMatch(S, home, away, opts);
  simToEnd(m);
  return matchResult(m);
}
