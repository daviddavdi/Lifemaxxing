/* Courtside Manager — players, ratings & match engine */
'use strict';

let _pid = 1;
function nextPid(S) { S.nextPid = (S.nextPid || 1) + 1; return S.nextPid; }

function calcCA(p) {
  const w = WEIGHTS[p.pos] || WEIGHTS.SF;
  let s = 0, t = 0;
  for (const a of ATTRS) { s += (p.a[a.k] || 1) * w[a.k]; t += w[a.k]; }
  return s / t;
}
function stars(ca) { return clamp(Math.round(((ca - 4.5) / 11) * 5 * 2) / 2, 0.5, 5); }
function salaryFor(ca, age, pot) {
  const eff = ca + (age <= 23 ? Math.max(0, (pot || ca) - ca) * 0.25 : 0);
  const v = 0.9 + 34 * Math.pow(clamp((eff - 7) / 9, 0, 1.2), 2.1);
  return Math.round(Math.min(42, v) * 10) / 10;
}
function playerValue(p) {
  const ca = calcCA(p);
  const yf = p.age <= 21 ? 0.7 : p.age <= 24 ? 0.4 : p.age <= 27 ? 0.15 : 0;
  let eff = ca + Math.max(0, p.pot - ca) * yf;
  if (p.age >= 31) eff -= (p.age - 30) * 0.35;
  return Math.pow(Math.max(1, eff), 3) / 100;
}

function genName(nat) {
  const n = NATS[nat];
  return { first: R.pick(n.first), last: R.pick(n.last) };
}
function randNat() { return R.wpick(NAT_KEYS, (k) => NATS[k].w).valueOf(); }
function randHeight(pos) {
  const r = { PG: [184, 196], SG: [190, 202], SF: [198, 207], PF: [203, 212], C: [208, 222] }[pos];
  return R.int(r[0], r[1]);
}

function genPlayer(S, level, pos, age, teamId) {
  pos = pos || R.pick(POS);
  age = age || clamp(Math.round(19 + Math.abs(R.gauss()) * 6 + R.f(0, 4)), 19, 36);
  const nat = randNat();
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
    a, pot: 0, morale: R.int(55, 75), cond: 100, inj: null, contract: { sal: 1, yrs: R.int(1, 4) },
    st: emptyStats(), career: [], form: [],
  };
  const ca = calcCA(p);
  const youth = Math.max(0, 26 - age);
  p.pot = Math.round(clamp(ca + youth * R.f(0.15, 0.6) + Math.abs(R.gauss()) * 0.6, ca, 20) * 10) / 10;
  p.contract.sal = salaryFor(ca, age, p.pot);
  return p;
}
function emptyStats() {
  return { gp: 0, gs: 0, min: 0, pts: 0, reb: 0, ast: 0, stl: 0, blk: 0, tov: 0, fgm: 0, fga: 0, tpm: 0, tpa: 0, ftm: 0, fta: 0, rat: 0 };
}
function pname(p, short) { return short ? `${p.first[0]}. ${p.last}` : `${p.first} ${p.last}`; }

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
}
function cleanRotation(S, team) {
  const ids = Object.values(S.players).filter((p) => p.team === team.id).map((p) => p.id);
  const set = new Set(ids);
  const rot = (team.rotation || []).filter((id) => set.has(id));
  for (const id of ids) if (!rot.includes(id)) rot.push(id);
  team.rotation = rot;
}

const MIN_PLAN = [34, 33, 32, 31, 30, 20, 18, 16, 14, 12];

/* ---------- Match engine ---------- */
function eff(p, k, ctx) {
  const condF = 0.86 + 0.14 * (p.cond / 100);
  const morF = 0.97 + 0.06 * (p.morale / 100);
  return p.a[k] * condF * morF * (ctx.home ? 1.02 : 1);
}

function simMatch(S, home, away, opts = {}) {
  const sides = [home, away].map((team, i) => {
    cleanRotation(S, team);
    let list = team.rotation.map((id) => S.players[id]).filter((p) => p && !p.inj);
    if (list.length < 5) list = list.concat(team.rotation.map((id) => S.players[id]).filter((p) => p && p.inj)).slice(0, 5);
    const plan = {};
    let leftover = 0;
    list.forEach((p, idx) => {
      const m = idx < MIN_PLAN.length ? MIN_PLAN[idx] : 0;
      plan[p.id] = m * 60;
    });
    if (list.length < 10) {
      const missing = MIN_PLAN.slice(list.length).reduce((s, x) => s + x, 0);
      leftover = missing * 60 / Math.max(1, Math.min(list.length, 5));
      list.slice(0, 5).forEach((p) => (plan[p.id] += leftover));
    }
    return { team, list, plan, played: {}, on: list.slice(0, 5), ctx: { home: i === 0 }, t: team.tactics, pts: 0, hot: clamp(R.gauss() * 0.04, -0.09, 0.09) };
  });
  const box = {};
  for (const sd of sides) for (const p of sd.list) {
    box[p.id] = { min: 0, pts: 0, reb: 0, oreb: 0, ast: 0, stl: 0, blk: 0, tov: 0, fgm: 0, fga: 0, tpm: 0, tpa: 0, ftm: 0, fta: 0, gs: sd.on.includes(p) ? 1 : 0, team: sd.team.id };
    sd.played[p.id] = 0;
  }
  const events = [];
  const quarters = [];
  const paceMap = { slow: 1.88, normal: 2.05, fast: 2.25 };
  const ppm = (paceMap[home.tactics.pace] + paceMap[away.tactics.pace]) / 2;
  const avgLen = 60 / (ppm * 2);
  let run = { team: -1, pts: 0 };
  const hn = home.abbr, an = away.abbr;

  const push = (q, clock, type, side, text) => events.push({ q, c: Math.max(0, Math.round(clock)), type, side, text, hs: sides[0].pts, as: sides[1].pts });

  function pickLineup(sd, q, clock) {
    const margin = Math.abs(sides[0].pts - sides[1].pts);
    if (q >= 4 && clock < 240 && margin <= 10) {
      const closers = sd.list.slice(0, 5);
      sd.on = closers; return;
    }
    if (q >= 4 && clock < 300 && margin >= 22) {
      const bench = sd.list.slice(5, 10);
      if (bench.length >= 5) { sd.on = bench; return; }
    }
    const scored = sd.list.map((p) => {
      let rem = sd.plan[p.id] - sd.played[p.id];
      if (sd.on.includes(p)) rem += 75;
      return { p, rem };
    }).sort((a, b) => b.rem - a.rem);
    sd.on = scored.slice(0, 5).map((x) => x.p);
  }
  const ordered = (arr) => arr.slice().sort((a, b) => POS.indexOf(a.pos) - POS.indexOf(b.pos));
  const avg = (arr, k, ctx) => arr.reduce((s, p) => s + eff(p, k, ctx), 0) / arr.length;

  function usage(p, ctx) {
    const sc = Math.max(eff(p, 'fin', ctx), eff(p, 'mid', ctx), eff(p, 'thr', ctx)) * 0.6 + (eff(p, 'fin', ctx) + eff(p, 'mid', ctx) + eff(p, 'thr', ctx)) / 3 * 0.4;
    return Math.pow(sc + p.a.iq * 0.15 + p.a.han * 0.1, 1.9);
  }

  function possession(oi, q, clock) {
    const O = sides[oi], D = sides[1 - oi];
    const off = ordered(O.on), def = ordered(D.on);
    const oc = O.ctx, dc = D.ctx;
    const intens = { low: -0.015, normal: 0, high: 0.02 }[D.t.intensity] || 0;
    let toP = 0.128 + (avg(def, 'stl', dc) + avg(def, 'pdef', dc) - avg(off, 'han', oc) - avg(off, 'pas', oc)) * 0.0035 + intens - (avg(off, 'iq', oc) - 10) * 0.002;
    if (R.chance(clamp(toP, 0.06, 0.22))) {
      const loser = R.wpick(off, (p) => usage(p, oc) * (22 - p.a.han));
      box[loser.id].tov++;
      if (R.chance(0.55)) {
        const st = R.wpick(def, (p) => Math.pow(eff(p, 'stl', dc), 2));
        box[st.id].stl++;
        if (R.chance(0.45)) push(q, clock, 'stl', 1 - oi, R.pick([`${pname(st, 1)} picks off the pass!`, `Steal by ${pname(st, 1)}.`, `${pname(st, 1)} strips ${pname(loser, 1)} clean!`]));
      }
      return 0;
    }
    let pts = 0, tries = 0;
    while (tries < 4) {
      tries++;
      const sh = R.wpick(off, (p) => usage(p, oc));
      const idx = off.indexOf(sh);
      const dfn = def[idx] || R.pick(def);
      const focus = O.t.focus;
      const zone = D.t.defense === 'zone';
      const wIn = Math.pow(eff(sh, 'fin', oc), 2) * (focus === 'inside' ? 1.35 : focus === 'outside' ? 0.75 : 1) * (zone ? 0.85 : 1);
      const wMid = Math.pow(eff(sh, 'mid', oc), 2) * 0.55;
      const wThr = Math.pow(eff(sh, 'thr', oc), 2) * 0.85 * (focus === 'outside' ? 1.4 : focus === 'inside' ? 0.7 : 1) * (zone ? 1.15 : 1);
      const r = Math.random() * (wIn + wMid + wThr);
      const type = r < wIn ? 'in' : r < wIn + wMid ? 'mid' : 'thr';
      const clutch = q >= 4 && clock < 180 && Math.abs(sides[0].pts - sides[1].pts) <= 6 ? (sh.a.cmp - 10) * 0.006 : 0;
      let p;
      if (type === 'in') p = 0.52 + (eff(sh, 'fin', oc) - (eff(dfn, 'idef', dc) * 0.5 + avg(def, 'idef', dc) * 0.5)) * 0.011 + (sh.a.jmp - 10) * 0.003 + (sh.a.str - 10) * 0.002 - (zone ? 0.02 : 0);
      else if (type === 'mid') p = 0.41 + (eff(sh, 'mid', oc) - eff(dfn, 'pdef', dc)) * 0.009;
      else p = 0.34 + (eff(sh, 'thr', oc) - 10) * 0.0095 - (eff(dfn, 'pdef', dc) - 10) * 0.004 + (zone ? 0.012 : 0);
      p = clamp(p + clutch + O.hot + (avg(off, 'iq', oc) - 10) * 0.002, 0.15, 0.75);
      const foulP = type === 'in' ? 0.13 + (D.t.intensity === 'high' ? 0.03 : 0) : type === 'mid' ? 0.04 : 0.015;
      const fouled = R.chance(foulP);
      const made = R.chance(fouled ? p * 0.55 : p);
      const val = type === 'thr' ? 3 : 2;
      const b = box[sh.id];
      if (made) {
        b.fga++; b.fgm++; if (type === 'thr') { b.tpa++; b.tpm++; }
        pts += val; b.pts += val;
        let ast = null;
        if (R.chance(type === 'thr' ? 0.82 : type === 'mid' ? 0.55 : 0.58)) {
          const mates = off.filter((x) => x !== sh);
          ast = R.wpick(mates, (x) => Math.pow(eff(x, 'pas', oc), 2.5));
          box[ast.id].ast++;
        }
        O.pts += val;
        const n = pname(sh, 1);
        const at = ast && R.chance(0.6) ? ` (${pname(ast, 1)} with the assist)` : '';
        let txt;
        if (type === 'thr') txt = R.pick([`${n} drains it from deep!`, `${n} buries the three!`, `Splash! ${n} from downtown.`, `${n} pulls up from 26 feet... got it!`, `${n} hits the corner three.`]);
        else if (type === 'mid') txt = R.pick([`${n} hits the mid-range jumper.`, `${n} with a smooth pull-up.`, `${n} fades away... good!`, `${n} knocks down the elbow jumper.`]);
        else if (sh.a.jmp >= 12 && R.chance(0.5)) txt = R.pick([`${n} throws it down with authority!`, `HUGE slam from ${n}!`, `${n} rises up and hammers it home!`, `Alley-oop! ${n} finishes above the rim!`]);
        else txt = R.pick([`${n} finishes at the rim.`, `${n} with the layup.`, `${n} scores in the paint.`, `${n} spins and lays it in.`, `${n} with a nice floater.`]);
        if (fouled) {
          txt = `And one! ` + txt;
          b.fta++;
          if (R.chance(0.5 + eff(sh, 'ft', oc) * 0.022)) { b.ftm++; b.pts++; pts++; O.pts++; }
        }
        trackRun(oi, val + (fouled ? 1 : 0), q, clock);
        push(q, clock, type === 'thr' ? 'three' : 'score', oi, txt + at);
        return pts;
      }
      if (fouled) {
        const n = val;
        let m = 0;
        for (let i = 0; i < n; i++) { box[sh.id].fta++; if (R.chance(clamp(0.48 + eff(sh, 'ft', oc) * 0.022, 0.4, 0.95))) { m++; box[sh.id].ftm++; box[sh.id].pts++; } }
        pts += m; O.pts += m;
        if (m) trackRun(oi, m, q, clock);
        if (R.chance(0.35)) push(q, clock, 'ft', oi, `${pname(sh, 1)} goes ${m}/${n} from the line.`);
        if (m === n || R.chance(0.6)) return pts;
      } else {
        b.fga++; if (type === 'thr') b.tpa++;
        if (type === 'in' && R.chance(0.1 * (avg(def, 'blk', dc) / 10) * 1.4)) {
          const bl = R.wpick(def, (x) => Math.pow(eff(x, 'blk', dc), 2.5) * (x.h / 200));
          box[bl.id].blk++;
          if (R.chance(0.6)) push(q, clock, 'blk', 1 - oi, R.pick([`Rejected! ${pname(bl, 1)} swats ${pname(sh, 1)}.`, `${pname(bl, 1)} with the block!`, `Get that outta here! ${pname(bl, 1)} denies ${pname(sh, 1)}.`]));
        } else if (type === 'thr' && R.chance(0.08)) {
          push(q, clock, 'miss', oi, `${pname(sh, 1)} misses from three.`);
        }
      }
      // rebound
      const orb = avg(off, 'reb', oc) + avg(off, 'str', oc) * 0.3, drb = avg(def, 'reb', dc) + avg(def, 'str', dc) * 0.3;
      const oP = clamp(0.24 * Math.pow(orb / drb, 1.6), 0.12, 0.38);
      if (R.chance(oP)) {
        const rb = R.wpick(off, (x) => Math.pow(eff(x, 'reb', oc), 1.6) * (x.h / 200) * (eff(x, 'jmp', oc) + 10));
        box[rb.id].reb++; box[rb.id].oreb++;
        continue;
      } else {
        const rb = R.wpick(def, (x) => Math.pow(eff(x, 'reb', dc), 1.6) * (x.h / 200) * (eff(x, 'jmp', dc) + 10));
        box[rb.id].reb++;
        return pts;
      }
    }
    return pts;
  }

  function trackRun(oi, v, q, clock) {
    if (run.team === oi) run.pts += v; else run = { team: oi, pts: v, said: 0 };
    if (run.pts >= 8 && run.pts - (run.said || 0) >= 4 && run.pts >= (run.said || 0) + 4) {
      run.said = run.pts;
      push(q, clock, 'run', oi, `${sides[oi].team.abbr} on a ${run.pts}-0 run!`);
    }
  }

  let q = 1, poss = R.chance(0.5) ? 0 : 1;
  const firstPoss = poss;
  let ot = 0;
  push(1, 720, 'info', -1, `Tip-off! ${home.city} ${home.nick} host the ${away.city} ${away.nick}.`);
  while (true) {
    const qLen = q <= 4 ? 720 : 300;
    let clock = qLen, sinceSub = 0;
    if (q > 1) { sides.forEach((sd) => pickLineup(sd, q, clock)); }
    poss = (q === 1 || q === 4) ? firstPoss : 1 - firstPoss;
    if (q > 4) poss = R.chance(0.5) ? 0 : 1;
    const qs = [sides[0].pts, sides[1].pts];
    while (clock > 0) {
      const len = Math.min(clock, avgLen * R.f(0.45, 1.55));
      possession(poss, q, clock);
      clock -= len;
      for (const sd of sides) for (const p of sd.on) { sd.played[p.id] += len; box[p.id].min += len; }
      sinceSub += len;
      if (sinceSub >= 55) { sinceSub = 0; sides.forEach((sd) => pickLineup(sd, q, clock)); }
      poss = 1 - poss;
    }
    quarters.push([sides[0].pts - qs[0], sides[1].pts - qs[1]]);
    const lbl = q <= 4 ? `Q${q}` : `OT${q - 4}`;
    if (q >= 4 && sides[0].pts !== sides[1].pts) {
      push(q, 0, 'end', -1, `FINAL: ${an} ${sides[1].pts} – ${sides[0].pts} ${hn}`);
      break;
    }
    push(q, 0, 'qend', -1, q === 2 ? `Halftime: ${an} ${sides[1].pts} – ${sides[0].pts} ${hn}` : q >= 4 ? `Tied ${sides[0].pts}–${sides[1].pts}! We're going to overtime!` : `End of ${lbl}: ${an} ${sides[1].pts} – ${sides[0].pts} ${hn}`);
    q++;
    if (q > 4) ot++;
    if (q > 12) break;
  }
  // finalize box
  for (const id in box) box[id].min = Math.round(box[id].min / 60);
  const ratings = {};
  for (const id in box) {
    const b = box[id];
    if (b.min <= 0 && b.pts === 0) { ratings[id] = null; continue; }
    const won = (b.team === home.id) === (sides[0].pts > sides[1].pts);
    const gsc = b.pts + 0.4 * b.fgm - 0.7 * b.fga - 0.4 * (b.fta - b.ftm) + 0.6 * b.reb + 0.4 * b.oreb + 0.7 * b.ast + b.stl + 0.7 * b.blk - b.tov;
    let r = 6.0 + gsc * 0.1 + (won ? 0.25 : -0.2) + (b.min < 8 ? -0.1 : 0);
    ratings[id] = Math.round(clamp(r, 3, 10) * 10) / 10;
  }
  let pom = null, best = -1;
  for (const id in ratings) if (ratings[id] != null && ratings[id] > best) { best = ratings[id]; pom = +id; }
  return { hs: sides[0].pts, as: sides[1].pts, box, events, quarters, ratings, pom, ot };
}
