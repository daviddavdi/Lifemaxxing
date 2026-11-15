/* Courtside Manager — pre-game match preview: win probability, odds, scouting, tactical tweak, upsets */
'use strict';

// Rating calibrated against the match engine: P(home win) = 1 / (1 + e^-(rH - rA))
function teamRating(tid, home) {
  const ps = roster(tid).filter((p) => !p.inj && !(p.susp > 0)).sort((a, b) => calcCA(b) - calcCA(a)).slice(0, 8);
  if (!ps.length) return 8;
  let s = 0, w = 0;
  ps.forEach((p, i) => { const wt = i < 5 ? 1.3 : 0.7; s += calcCA(p) * (0.86 + 0.14 * p.cond / 100) * (1 + 0.035 * (p.morale - 60) / 110) * wt; w += wt; });
  const f = teamForm(tid);
  return (s / w) * (home ? 1.02 : 1) + (f.w - f.n / 2) * 0.03;
}
function teamForm(tid) {
  const g = S.schedule.filter((f) => f.played && (f.h === tid || f.a === tid)).sort((a, b) => b.day - a.day).slice(0, 5);
  const res = g.map((f) => ((f.h === tid) === (f.hs > f.as) ? 'W' : 'L'));
  return { str: res.join(''), w: res.filter((x) => x === 'W').length, n: res.length };
}
const FRACS = [[0.05, '1/20'], [0.1, '1/10'], [0.125, '1/8'], [0.167, '1/6'], [0.2, '1/5'], [0.25, '1/4'], [0.286, '2/7'], [0.333, '1/3'], [0.364, '4/11'], [0.4, '2/5'], [0.444, '4/9'], [0.5, '1/2'], [0.571, '4/7'], [0.615, '8/13'], [0.667, '4/6'], [0.727, '8/11'], [0.8, '4/5'], [0.909, '10/11'], [1, 'EVS'], [1.1, '11/10'], [1.25, '5/4'], [1.375, '11/8'], [1.5, '6/4'], [1.75, '7/4'], [2, '2/1'], [2.5, '5/2'], [3, '3/1'], [3.5, '7/2'], [4, '4/1'], [5, '5/1'], [6, '6/1'], [8, '8/1'], [10, '10/1'], [14, '14/1'], [20, '20/1'], [33, '33/1']];
function oddsFrom(p) {
  const dec = Math.max(1.02, 1 / (clamp(p, 0.01, 0.99) * 1.06));
  let best = FRACS[0];
  for (const f of FRACS) if (Math.abs(f[0] - (dec - 1)) < Math.abs(best[0] - (dec - 1))) best = f;
  return { dec: dec.toFixed(2), frac: best[1] };
}

const STOPPER = (r) => r.slice(0, 8).filter((p) => !p.inj).sort((a, b) => b.a.pdef - a.a.pdef)[0];
function starterAvg(tid) {
  const t = team(tid);
  const ids = (t.rotation && t.rotation.length ? t.rotation : roster(tid).map((p) => p.id)).slice(0, 5);
  const ps = ids.map((id) => S.players[id]).filter(Boolean);
  const avg = (fn) => ps.reduce((s, p) => s + fn(p), 0) / Math.max(1, ps.length);
  return { ps, pdef: avg((p) => p.a.pdef), idef: avg((p) => (p.a.idef + p.a.blk) / 2), sta: avg((p) => p.a.sta), cond: avg((p) => p.cond), ball: avg((p) => (p.a.han + p.a.pas) / 2), reb: avg((p) => p.a.reb), thr: avg((p) => p.a.thr) };
}
function matchPreview(f) {
  const us = f.h === S.userTeam ? f.h : f.a, oppId = us === f.h ? f.a : f.h;
  const rH = teamRating(f.h, true), rA = teamRating(f.a, false);
  const pH = 1 / (1 + Math.exp(-(rH - rA)));
  const pUs = us === f.h ? pH : 1 - pH;
  const opp = team(oppId), ot = opp.tactics;
  const oppR = roster(oppId).filter((p) => !p.inj && !(p.susp > 0));
  const bullets = [];
  const changes = [];
  const add = (k, v) => { if (!changes.some((c) => c.k === k)) changes.push({ k, v, label: `${TACTIC_LABEL[k]}: ${TACTIC_OPTS[k].find((x) => x[0] === v)[1]}` }); };
  // 1. hottest player
  const withForm = oppR.filter((p) => p.form.length >= 2).map((p) => ({ p, f: p.form.reduce((a, b) => a + b, 0) / p.form.length }));
  const hot = withForm.sort((a, b) => b.f - a.f)[0];
  const star = hot ? hot.p : oppR.sort((a, b) => calcCA(b) - calcCA(a))[0];
  if (star) {
    const ppg = star.st.gp ? (star.st.pts / star.st.gp).toFixed(1) : null;
    bullets.push({ ic: '🔥', html: hot ? `<b>${plink(star)}</b> #${star.num} is their hottest player — ${hot.f.toFixed(1)} average rating over his last ${star.form.length} games${ppg ? `, ${ppg} ppg` : ''}.` : `<b>${plink(star)}</b> #${star.num} is their go-to man${ppg ? ` (${ppg} ppg)` : ''}. Everything runs through him.` });
  }
  // 2. key weakness, relative to the league's starting fives
  const lg = lgTeams(opp.lg).map((t) => starterAvg(t.id));
  const L = (k) => lg.reduce((s, x) => s + x[k], 0) / lg.length;
  const o = starterAvg(oppId);
  const cands = [
    { s: (L('pdef') - o.pdef) / 1.2, txt: `Weak perimeter defense — their starters average ${o.pdef.toFixed(1)} Perimeter D (league ${L('pdef').toFixed(1)}). Let our shooters fire.`, k: 'focus', v: 'outside' },
    { s: (L('idef') - o.idef) / 1.2, txt: `Soft at the rim — rim protection of ${o.idef.toFixed(1)} vs a league average of ${L('idef').toFixed(1)}. Attack the paint.`, k: 'focus', v: 'inside' },
    { s: (L('cond') - o.cond) / 6 + (L('sta') - o.sta) / 2.5, txt: `Tired legs — their starters are at ${Math.round(o.cond)}% condition with ${o.sta.toFixed(1)} average Stamina. Push the pace and run them.`, k: 'pace', v: 'fast' },
    { s: (L('ball') - o.ball) / 1.2, txt: `Careless with the ball — weak handling and passing (${o.ball.toFixed(1)}). Pressure them into turnovers.`, k: 'intensity', v: 'high' },
    { s: (L('reb') - o.reb) / 1.3, txt: `They don't rebound — ${o.reb.toFixed(1)} Rebounding in the starting five. Crash the offensive glass.`, k: 'oreb', v: 'crash' },
  ];
  const hh = o.ps.find((p) => p.hid.temp <= 6 && (p.known.includes('temp') || effJA() >= 12 || p.techs > 0));
  if (hh) cands.push({ s: 1.4 + (7 - hh.hid.temp) * 0.2, txt: `${plink(hh)} #${hh.num} has a short fuse${hh.techs ? ` — ${hh.techs} technical${hh.techs > 1 ? 's' : ''} this season` : ''}. Attack him early and get him into foul trouble.`, k: 'focus', v: 'inside' });
  if (ot.defense === 'zone') cands.push({ s: 1.2, txt: 'They sit in a zone, which leaves shooters open. Get the ball moving and fire from three.', k: 'focus', v: 'outside' });
  const weak = cands.sort((a, b) => b.s - a.s)[0];
  if (weak && weak.s > 0.55) { bullets.push({ ic: '🎯', html: weak.txt }); add(weak.k, weak.v); }
  else bullets.push({ ic: '🎯', html: 'No glaring weakness — a well-balanced group. Stick to what we do well.' });
  // 3. their approach and a counter
  const counters = {
    pnr: ['They run everything through the pick & roll. Switching every screen takes it away.', 'defense', 'switch'],
    iso: ['Isolation-heavy — they clear out for their star. Our best defender should shadow him, with help packing the paint.', 'help', 'paint'],
    post: ['They feed the post relentlessly. A zone will crowd their bigs.', 'defense', 'zone'],
    run: ['They want to run and gun. Slow the game down and make them play half-court.', 'pace', 'slow'],
    motion: ['Lots of ball and player movement. Aggressive defense can break up their rhythm.', 'intensity', 'high'],
  };
  let [ctxt, ck, cv] = counters[ot.system] || counters.motion;
  if (o.thr > L('thr') + 1.2) { ctxt = `A shooting team — their starters average ${o.thr.toFixed(1)} Three Point. Run them off the line.`; ck = 'help'; cv = 'perimeter'; }
  if (changes.some((c) => c.k === ck)) bullets.push({ ic: '🧠', html: ctxt });
  else { bullets.push({ ic: '🧠', html: ctxt }); add(ck, cv); }
  const stopper = star ? STOPPER(sortedRosterIds(S.userTeam).map((id) => S.players[id])) : null;
  return { pUs, pH, pA: 1 - pH, oddsH: oddsFrom(pH), oddsA: oddsFrom(1 - pH), formH: teamForm(f.h), formA: teamForm(f.a), bullets, tweak: { changes, stopper: stopper && star ? { id: stopper.id, star: star.id } : null } };
}
function sortedRosterIds(tid) { const t = team(tid); cleanRotation(S, t); return t.rotation.slice(); }
function applyTweak(pv) {
  const t = userTeam();
  for (const c of pv.tweak.changes) t.tactics[c.k] = c.v;
  if (pv.tweak.stopper) { for (const k in t.instr) t.instr[k].lock = false; const i = t.instr[pv.tweak.stopper.id] || (t.instr[pv.tweak.stopper.id] = {}); i.lock = true; }
  S.tweakApplied = S.pending;
  save();
}
// bigger swings when the favourite falls
function upsetSwing(f, won) {
  const pv = S.preview && S.preview.fid === f.id ? S.preview : null;
  if (!pv) return;
  const p = pv.p, d = diffCfg();
  const opp = team(f.h === S.userTeam ? f.a : f.h);
  if (won && p < 0.35) {
    const b = (0.5 - p) * 22;
    S.board.conf = clamp(S.board.conf + b * d.gain, 0, 100);
    roster(S.userTeam).forEach((x) => (x.morale = clamp(x.morale + b * 0.45, 0, 100)));
    news('rumour', `UPSET! ${teamName(userTeam())} stun the ${opp.nick} as ${oddsFrom(p).frac} underdogs.`, { lg: userTeam().lg, tid: S.userTeam, mine: true });
    mail('Assistant Coach', `Huge upset over the ${opp.nick}!`, `Coach, nobody gave us a chance — we were ${Math.round(p * 100)}% to win and ${oddsFrom(p).frac} with the bookies. The board is thrilled and the locker room is flying.`, { type: 'staff' });
  } else if (!won && p > 0.65) {
    const b = (p - 0.5) * 26;
    S.board.conf = clamp(S.board.conf - b * d.loss, 0, 100);
    roster(S.userTeam).forEach((x) => (x.morale = clamp(x.morale - b * 0.3, 0, 100)));
    news('hot', `Shock defeat: ${opp.nick} beat ${teamName(userTeam())}, who were ${oddsFrom(p).frac} favourites.`, { lg: userTeam().lg, tid: S.userTeam, mine: true });
    mail('Board of Directors', `Unacceptable result against the ${opp.nick}`, `${S.coach.name},\n\nWe were ${Math.round(p * 100)}% favourites and lost. Results like this do real damage to the board's confidence.`, { type: 'board' });
  }
}
