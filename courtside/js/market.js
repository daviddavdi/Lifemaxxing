/* Courtside Manager — transfer list, "Wanted" interest, ambition, rumour mill, hot seat, deals log */
'use strict';

const INTEREST_LVL = { 1: ['Monitoring', 'i1'], 2: ['Interested', 'i2'], 3: ['Keen', 'i3'] };

function aiCoach(t) {
  const c = league(t.lg).country;
  const nm = genName(NATS[c] ? c : 'USA');
  return { name: `${nm.first} ${nm.last}`, conf: R.int(52, 72), since: S.season };
}
function ensureMarket() {
  S.interest = S.interest || []; S.news = S.news || []; S.deals = S.deals || []; S.nextNid = S.nextNid || 0;
  for (const t of S.teams) if (!t.coach) t.coach = aiCoach(t);
}
function news(kind, text, extra = {}) {
  S.news.unshift({ id: ++S.nextNid, day: S.day, season: S.season, kind, text, ...extra });
  if (S.news.length > 220) S.news.length = 220;
}
const snapP = (p) => ({ pid: p.id, name: pname(p), pos: p.pos, age: p.age, st: stars(calcCA(p)), val: playerValue(p) });
function logSigning(p, t, sal, yrs) {
  S.deals.unshift({ kind: 'sign', season: S.season, day: S.day, phase: S.phase, lg: t.lg, tid: t.id, ...snapP(p), sal, yrs });
  if (S.deals.length > 250) S.deals.length = 250;
  const lvl = leagueLevel(t.lg);
  if (calcCA(p) > lvl + 1 || t.id === S.userTeam) news('sign', `${teamName(t)} sign ${pname(p)} (${p.pos}, ${p.age}) on a ${yrs}-year deal worth ${fmtMoney(sal)}/yr.`, { lg: t.lg, tid: t.id, pid: p.id });
}
function logTrade(A, B, aGets, bGets) {
  const ag = aGets.map((id) => snapP(S.players[id])), bg = bGets.map((id) => snapP(S.players[id]));
  S.deals.unshift({ kind: 'trade', season: S.season, day: S.day, lg: A.lg, lg2: B.lg, a: A.id, b: B.id, aGets: ag, bGets: bg, val: ag.concat(bg).reduce((s, x) => s + x.val, 0) });
  if (S.deals.length > 250) S.deals.length = 250;
  const names = (arr) => arr.length ? arr.map((x) => x.name).join(' & ') : 'contract relief';
  news('trade', `TRADE: ${A.nick} acquire ${names(ag)} from the ${B.nick} for ${names(bg)}.`, { lg: A.lg, tid: A.id });
}

/* ---------- Hot seat ---------- */
function coachConf(t) { return t.id === S.userTeam ? S.board.conf : (t.coach ? t.coach.conf : 60); }
function coachName(t) { return t.id === S.userTeam ? S.coach.name : (t.coach ? t.coach.name : '—'); }
function oddsFor(c) { return c < 8 ? '1/3' : c < 15 ? 'EVS' : c < 22 ? '2/1' : c < 30 ? '4/1' : c < 40 ? '8/1' : c < 50 ? '14/1' : c < 60 ? '25/1' : c < 75 ? '50/1' : '100/1'; }
function hotSeat(lid) { return S.teams.filter((t) => !lid || lid === 'ALL' || t.lg === lid).map((t) => ({ t, conf: coachConf(t) })).sort((a, b) => a.conf - b.conf); }
function weeklyHotSeat() {
  for (const lg of S.leagues) {
    if (lg.state !== 'regular') continue;
    const ts = lgTeams(lg.id);
    const exp = ts.map((t) => ({ id: t.id, s: teamStrength(t.id) })).sort((a, b) => b.s - a.s).map((x) => x.id);
    const total = (ts.length - 1) * S.cycles;
    for (const t of ts) {
      if (t.id === S.userTeam || t.w + t.l < 3) continue;
      const before = t.coach.conf;
      const d = clamp((exp.indexOf(t.id) + 1 - teamRank(t.id)) * 1.3, -6, 5) + (t.streak <= -4 ? -3 : t.streak >= 4 ? 2 : 0) + (55 - t.coach.conf) * 0.02;
      t.coach.conf = clamp(t.coach.conf + d + R.gauss(), 0, 100);
      if (before >= 25 && t.coach.conf < 25) news('hot', `PRESSURE: ${t.coach.name} is on the hot seat at ${teamName(t)} after a ${t.w}-${t.l} start.`, { lg: lg.id, tid: t.id });
      if (t.coach.conf < 10 && t.w + t.l >= total * 0.35) {
        const old = t.coach.name;
        t.coach = aiCoach(t); t.cq = clamp(t.cq + R.int(-2, 3), 4, 19);
        news('sack', `SACKED: ${teamName(t)} have fired ${old}. ${t.coach.name} takes over.`, { lg: lg.id, tid: t.id });
      }
    }
  }
  if (S.board.conf < 30 && S.hotFlag !== S.season) {
    S.hotFlag = S.season;
    news('hot', `Bookmakers have slashed the odds on ${S.coach.name} being the next coach to lose his job at ${teamName(userTeam())}.`, { lg: userTeam().lg, tid: S.userTeam });
    mail('Your Agent', "You're on the hot seat", `Coach, I won't sugar-coat it — the bookies have you among the favourites for the sack. The board needs results, fast.\n\nCheck the <b>Rumour Mill</b> in the Market to see where you stand.`, { type: 'whisper' });
  }
}

/* ---------- Transfer listings (AI) ---------- */
function weeklyAiListings() {
  for (const t of S.teams) {
    if (t.id === S.userTeam) continue;
    const r = roster(t.id);
    if (r.filter((p) => p.listed).length >= 2) continue;
    const cand = r.find((p) => p.wantsOut && !p.listed);
    if (cand) { cand.listed = true; continue; }
    if (teamPayroll(t.id) > t.budget && R.chance(0.25)) {
      const worst = r.filter((p) => !p.listed).sort((a, b) => playerValue(a) / a.contract.sal - playerValue(b) / b.contract.sal)[0];
      if (worst) worst.listed = true;
    } else if (R.chance(0.03)) { const p = R.pick(r); if (p) p.listed = true; }
  }
}

/* ---------- Interest in your players ("Wanted") ---------- */
function interestFor(pid) { return (S.interest || []).filter((i) => i.pid === pid).sort((a, b) => b.lvl - a.lvl); }
function weeklyInterest() {
  S.interest = S.interest.filter((i) => S.players[i.pid]?.team === S.userTeam && team(i.tid) && i.tid !== S.userTeam);
  const ut = userTeam();
  const mine = roster(ut.id);
  if (!mine.length) return;
  // existing interest grows or fades on its own
  S.interest = S.interest.filter((i) => {
    const p = S.players[i.pid], t = team(i.tid);
    if (i.lvl < 3 && R.chance(p.listed ? 0.5 : 0.3)) { i.lvl++; if (i.lvl === 3) news('rumour', `${teamName(t)} are keen on ${pname(p)} (${ut.nick}, ${p.pos}).`, { lg: t.lg, tid: t.id, pid: p.id, mine: true }); }
    else if (i.lvl === 1 && R.chance(0.12)) return false;
    return true;
  });
  const tries = 4 + mine.filter((p) => p.listed).length * 3;
  for (let k = 0; k < tries; k++) {
    const t = R.chance(0.55) ? R.pick(lgTeams(ut.lg).filter((x) => x.id !== ut.id)) : R.pick(S.teams.filter((x) => x.id !== ut.id && Math.abs(x.prestige - ut.prestige) <= 7));
    if (!t) continue;
    const p = R.wpick(mine, (x) => playerValue(x) * (x.listed ? 3 : 1) * (x.wantsOut || x.unsettled ? 2 : 1) * (x.form.length && x.form.reduce((a, b) => a + b, 0) / x.form.length >= 7.2 ? 1.5 : 1));
    if (calcCA(p) < teamStrength(t.id) - 2 || p.contract.sal > t.budget * 0.45) continue;
    const ex = S.interest.find((i) => i.pid === p.id && i.tid === t.id);
    if (ex) {
      if (ex.lvl < 3 && R.chance(0.5)) { ex.lvl++; if (ex.lvl === 3) news('rumour', `${teamName(t)} are keen on ${pname(p)} (${ut.nick}, ${p.pos}).`, { lg: t.lg, tid: t.id, pid: p.id, mine: true }); }
    } else {
      S.interest.push({ pid: p.id, tid: t.id, lvl: p.listed ? 2 : 1, season: S.season, day: S.day });
      if (R.chance(0.4)) news('rumour', `Report: ${teamName(t)} scouts watched ${pname(p)} closely last week.`, { lg: t.lg, tid: t.id, pid: p.id, mine: true });
    }
  }
  if (S.interest.length > 24) { S.interest.sort((a, b) => b.lvl - a.lvl); S.interest.length = 24; }
  for (const i of S.interest) {
    const p = S.players[i.pid], t = team(i.tid);
    if (i.lvl >= 3 && !i.offered && R.chance(p.listed ? 0.6 : 0.3) && !deadlinePassed()) { if (aiTradeOfferFor(t, p)) i.offered = true; }
    if (i.lvl >= 2 && t.prestige > ut.prestige + 1 && p.hid.amb >= 13 && !p.listed && !(p.asked || []).includes(t.id) && R.chance(0.5)) ambitionTalk(p, t);
  }
  // unsettled players hand in transfer requests
  for (const p of mine) {
    if (!p.unsettled || p.listed || (p.reqAt && p.reqAt.season === S.season && S.day - p.reqAt.day < 30)) continue;
    const best = interestFor(p.id).map((i) => team(i.tid)).sort((a, b) => b.prestige - a.prestige)[0];
    if (best && R.chance(0.25)) {
      p.reqAt = { season: S.season, day: S.day }; p.wantsTo = best.id;
      mail(pname(p), `Transfer request: wants to join ${best.nick}`, `Coach,\n\nI've thought about this a lot. The ${teamName(best)} want me and I want to play for them. I'm formally asking you to let me go.\n\nIf you block this, I don't know how I can give 100% here.`, { type: 'player', pid: p.id, req: best.id, actions: [{ act: 'acceptReq', label: 'Accept request' }, { act: 'rejectReq', label: 'Reject request' }] });
    }
  }
}
function ambitionTalk(p, t) {
  (p.asked = p.asked || []).push(t.id);
  if (!p.known.includes('amb')) p.known.push('amb');
  mail(pname(p), `${t.nick} want me`, `Coach, can I be honest with you? My agent says the ${teamName(t)} (${league(t.lg).name}) are serious about me. That's a club I've always dreamed of playing for.\n\nI want to know if you'll let me talk to them.`,
    { type: 'player', pid: p.id, club: t.id, actions: [{ act: 'letTalk', label: 'Let him talk to them' }, { act: 'promiseMove', label: 'Promise a move next summer' }, { act: 'notForSale', label: "He's not for sale" }] });
}

/* AI club makes an offer for one of your players */
function aiTradeOfferFor(t, target) {
  if (!t || !target || target.team !== S.userTeam) return false;
  const room = t.budget - teamPayroll(t.id);
  const tv = playerValue(target);
  if (target.listed && room >= target.contract.sal && roster(t.id).length < ROSTER_MAX && R.chance(0.5)) {
    mail(`${t.nick} GM`, `Offer for ${pname(target)}`, `Hi ${S.coach.name},\n\nWe saw ${plink(target)} is available. The ${teamName(t)} (${league(t.lg).short}) will take over his full contract (${fmtMoney(target.contract.sal)}/yr × ${target.contract.yrs}). You get the wage room.\n\nDeal?`,
      { type: 'transfer', actions: [{ act: 'acceptTrade', label: 'Accept' }, { act: 'reject', label: 'Reject' }], trade: { team: t.id, give: [target.id], get: [] } });
    return true;
  }
  let best = null, bd = 1e9;
  for (const p of roster(t.id)) { const d = Math.abs(playerValue(p) - tv * R.f(0.9, 1.1) * (target.listed ? 0.9 : 1.05)); if (d < bd) { bd = d; best = p; } }
  if (!best || playerValue(best) < tv * 0.8) return false;
  mail(`${t.nick} GM`, `Trade proposal: ${pname(target)}`, `Hi ${S.coach.name},\n\nThe ${teamName(t)} (${league(t.lg).short}) want ${plink(target)} (${target.pos}, ${target.age}).\n\nIn exchange we'd send ${plink(best)} (${best.pos}, ${best.age}, ${fmtMoney(best.contract.sal)}/yr).`,
    { type: 'transfer', actions: [{ act: 'acceptTrade', label: 'Accept trade' }, { act: 'reject', label: 'Reject' }], trade: { team: t.id, give: [target.id], get: [best.id] } });
  return true;
}

/* ---------- AI ↔ AI trades ---------- */
function aiAiTrade(lid, quiet) {
  const ts = lgTeams(lid).filter((t) => t.id !== S.userTeam);
  if (ts.length < 2) return false;
  const A = R.pick(ts);
  const ra = roster(A.id).sort((a, b) => calcCA(b) - calcCA(a));
  const p = ra.find((x) => x.listed || x.wantsOut) || R.pick(ra.slice(0, 10));
  if (!p) return false;
  const B = R.pick(ts.filter((t) => t.id !== A.id));
  const v = playerValue(p);
  const q = roster(B.id).filter((x) => { const r = playerValue(x) / v; return r > 0.85 && r < 1.2; }).sort(() => Math.random() - 0.5)[0];
  if (!q) return false;
  if (!quiet && R.chance(0.45)) { news('rumour', `Report: ${B.nick} and ${A.nick} discussing a deal involving ${pname(p)}.`, { lg: lid, tid: B.id, pid: p.id }); return false; }
  logStint(p); logStint(q);
  p.team = B.id; q.team = A.id; p.listed = q.listed = false; p.wantsOut = q.wantsOut = false;
  autoRotation(S, A); autoRotation(S, B);
  logTrade(B, A, [p.id], [q.id]);
  return true;
}

/* ---------- Hooks called from game.js ---------- */
function marketDaily(d) {
  if (S.phase !== 'season') return;
  for (const p of roster(S.userTeam)) if (p.unsettled && p.morale > 45) p.morale = 45;
  for (const lg of S.leagues) if (lg.state === 'regular' && S.day < lastRegDay(lg.id) * 0.75 && R.chance(0.025)) aiAiTrade(lg.id);
}
function marketWeekly() {
  if (S.phase !== 'season') return;
  weeklyHotSeat(); weeklyAiListings();
  if (!deadlinePassed()) weeklyInterest();
}
function marketSeasonEnd() {
  // hot-seat driven sackings feed the summer job market
  const fired = S.teams.filter((t) => t.id !== S.userTeam && (t.coach.conf < 22 || R.chance(0.04) || ((S.rumoured || []).includes(t.id) && t.coach.conf < 45)));
  fired.forEach((t) => news('sack', `${teamName(t)} part ways with ${t.coach.name} after the season.`, { lg: t.lg, tid: t.id }));
  return fired.map((t) => t.id);
}
function marketNewSeason() {
  for (const t of S.teams) {
    if (t.id === S.userTeam) continue;
    if (S.vacancies && S.vacancies.includes(t.id)) { t.coach = aiCoach(t); news('sack', `${teamName(t)} appoint ${t.coach.name} as head coach.`, { lg: t.lg, tid: t.id }); }
    else t.coach.conf = clamp(t.coach.conf * 0.5 + 32, 0, 100);
  }
  for (const p of Object.values(S.players)) { if (p.team !== S.userTeam) p.listed = false; p.asked = []; }
  for (const p of roster(S.userTeam)) {
    if (p.movePromise != null && p.movePromise < S.season) {
      p.movePromise = null; p.unsettled = true; p.morale = clamp(p.morale - 25, 0, 100);
      S.coach.pcoach = clamp((S.coach.pcoach ?? 10) - 1.5, 1, 20);
      mail(pname(p), 'You promised me', `Coach, you promised I could move this summer. I'm still here. I won't forget this.`, { type: 'player', pid: p.id });
    }
  }
  S.interest = (S.interest || []).filter((i) => S.players[i.pid]?.team === S.userTeam).map((i) => ({ ...i, lvl: Math.max(1, i.lvl - 1), offered: false }));
  for (let i = 0; i < 8; i++) aiAiTrade(R.pick(S.leagues).id, true);
}
// a user trade went through — reward honouring wishes
function onUserTradeOut(ids, toTeam) {
  for (const id of ids) {
    const p = S.players[id];
    if (p.wantsTo === toTeam || p.unsettled || p.movePromise != null || p.listed) {
      if (p.wantsTo === toTeam || p.movePromise != null || p.unsettled) {
        S.coach.pcoach = clamp((S.coach.pcoach ?? 10) + 1, 1, 20);
        news('rumour', `${S.coach.name} honours ${pname(p)}'s wish — he joins the ${team(toTeam).nick}. Players around the league take note.`, { lg: team(toTeam).lg, tid: toTeam, pid: p.id });
      }
    }
    p.listed = false; p.unsettled = false; p.wantsTo = null; p.movePromise = null; p.morale = Math.max(p.morale, 70);
  }
  S.interest = S.interest.filter((i) => !ids.includes(i.pid));
}
function marketMailAction(m, act) {
  const p = m.pid ? S.players[m.pid] : null;
  if (!p || p.team !== S.userTeam) return 'He is no longer at the club.';
  if (act === 'letTalk') {
    p.listed = true; p.morale = clamp(p.morale + 6, 0, 100);
    const i = S.interest.find((x) => x.pid === p.id && x.tid === m.club); if (i) { i.lvl = 3; i.offered = false; }
    S.coach.pcoach = clamp((S.coach.pcoach ?? 10) + 0.3, 1, 20);
    return `${pname(p)} is grateful. He's been placed on the transfer list — expect an offer from the ${team(m.club).nick}.`;
  }
  if (act === 'promiseMove') { p.movePromise = S.season; p.morale = clamp(p.morale + 3, 0, 100); return `You promised ${pname(p)} a move next summer. Keep your word — or face the consequences.`; }
  if (act === 'notForSale') {
    const hit = p.hid.amb >= 16 ? 22 : p.hid.amb >= 14 ? 14 : 8;
    p.morale = clamp(p.morale - hit, 0, 100);
    if (p.hid.amb >= 15) p.unsettled = true;
    return p.hid.amb >= 15 ? `${pname(p)} storms out. He is now unsettled.` : `${pname(p)} is disappointed but accepts it.`;
  }
  if (act === 'acceptReq') {
    unlock('honour');
    p.listed = true; p.morale = clamp(p.morale + 8, 0, 100);
    let i = S.interest.find((x) => x.pid === p.id && x.tid === m.req);
    if (!i) S.interest.push(i = { pid: p.id, tid: m.req, lvl: 3, season: S.season, day: S.day });
    i.lvl = 3; i.offered = false;
    if (!deadlinePassed() && aiTradeOfferFor(team(m.req), p)) i.offered = true;
    return `You accepted ${pname(p)}'s transfer request. He's on the transfer list${i.offered ? ' — and the ' + team(m.req).nick + ' have already made an offer' : ''}.`;
  }
  if (act === 'rejectReq') {
    p.morale = clamp(p.morale - 15, 0, 100); p.unsettled = true;
    S.coach.pcoach = clamp((S.coach.pcoach ?? 10) - 0.5, 1, 20);
    return `You rejected the request. ${pname(p)} is furious and unsettled.`;
  }
  return '';
}
// rejecting a bid can upset ambitious players
function onOfferRejected(m) {
  const t = team(m.trade.team), ut = userTeam();
  for (const id of m.trade.give) {
    const p = S.players[id];
    if (!p || p.team !== S.userTeam) continue;
    if (p.listed || p.wantsTo === t.id) { p.morale = clamp(p.morale - 12, 0, 100); p.unsettled = p.unsettled || p.hid.amb >= 14; mail(pname(p), `Why did you turn down ${t.nick}?`, `Coach, you listed me / I asked to go, and then you turned down the ${t.nick}? What's going on?`, { type: 'player', pid: p.id }); }
    else if (p.hid.amb >= 14 && t.prestige > ut.prestige + 1 && R.chance(0.6)) { p.morale = clamp(p.morale - 10, 0, 100); if (p.hid.amb >= 16) p.unsettled = true; mail(pname(p), `I heard about ${t.nick}`, `Coach, word gets around. The ${teamName(t)} made an offer for me and you said no without even asking me. That hurts.`, { type: 'player', pid: p.id }); }
  }
}
