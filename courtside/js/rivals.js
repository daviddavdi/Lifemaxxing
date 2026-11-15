/* Courtside Manager — personal rivalries (coaches & players) and press conferences */
'use strict';

const RIVAL_LVL = [[20, 'Sworn Enemies'], [12, 'Bitter Rivals'], [6, 'Rivals']];
const rivalLabel = (pts) => (RIVAL_LVL.find(([v]) => pts >= v) || [0, 'Tension'])[1];
function ensureRivals() {
  S.rivals = S.rivals || { coach: [], player: [] };
  S.rpts = S.rpts || {};
  S.press = S.press || { pre: 'me', post: 'me' };
  S.pressDone = S.pressDone || {};
}

/* ---------- Coach rivalries ---------- */
function coachRival(t) { if (!t || !t.coach) return null; return (S.rivals.coach || []).find((r) => r.name === t.coach.name) || null; }
function coachRivalryPts(t, pts, reason) {
  if (!t || t.id === S.userTeam || !t.coach) return;
  ensureRivals();
  const name = t.coach.name;
  S.rpts[name] = Math.max(0, (S.rpts[name] || 0) + pts);
  let r = S.rivals.coach.find((x) => x.name === name);
  if (r) { r.pts = S.rpts[name]; r.tid = t.id; if (reason && !r.reasons.includes(reason)) r.reasons.push(reason); return; }
  if (S.rpts[name] >= 6 + Math.max(0, S.rivals.coach.length - 2) * 2) {
    S.rivals.coach.push({ name, tid: t.id, pts: S.rpts[name], since: { season: S.season, day: S.day }, reasons: reason ? [reason] : [] });
    news('rumour', `A rivalry is born: ${S.coach.name} and ${name} of the ${teamName(t)} clearly can't stand each other.`, { lg: t.lg, tid: t.id, mine: true });
    mail('Media', `A rivalry is born: you vs ${name}`, `The papers have decided: <b>${S.coach.name}</b> and <b>${name}</b> (${teamName(t)}) are now Personal Rivals.\n\nEvery meeting will be billed as a grudge match. The board and the locker room will take results against them twice as seriously.`, { type: 'league' });
  }
}
const TRASH_QUOTES = [
  (c, me) => `"${me} can draw up all the plays he wants. My guys are going to punch his team in the mouth."`,
  (c, me) => `"Last time we played, ${me} was whining to the refs all night. Bring tissues."`,
  (c, me) => `"I don't lose sleep over ${me}. I don't think about him at all, honestly."`,
  (c, me) => `"Some coaches get lucky. We'll see how lucky ${me} feels on our floor."`,
];

/* ---------- Player rivalries ---------- */
const pkey = (a, b) => (a < b ? `${a}-${b}` : `${b}-${a}`);
function playerRivalOf(pid) { return (S.rivals?.player || []).filter((r) => r.a === pid || r.b === pid).map((r) => ({ ...r, other: r.a === pid ? r.b : r.a })); }
function playerRivalMap() {
  const map = {};
  for (const r of S.rivals?.player || []) { if (!S.players[r.a] || !S.players[r.b]) continue; (map[r.a] = map[r.a] || []).push(r.b); (map[r.b] = map[r.b] || []).push(r.a); }
  return map;
}
function addPlayerRivalry(a, b, reason) {
  ensureRivals();
  if (!S.players[a] || !S.players[b] || a === b) return;
  const k = pkey(a, b);
  if (S.rivals.player.some((r) => pkey(r.a, r.b) === k)) return;
  if (playerRivalOf(a).length >= 2 || playerRivalOf(b).length >= 2) return;
  S.rivals.player.push({ a, b, reason, since: { season: S.season, day: S.day } });
  const A = S.players[a], B = S.players[b];
  const mine = A.team === S.userTeam ? A : B.team === S.userTeam ? B : null;
  if (mine) {
    const other = mine === A ? B : A;
    news('rumour', `Bad blood: ${pname(A)} and ${pname(B)} are now personal rivals (${reason.toLowerCase()}).`, { tid: S.userTeam, pid: mine.id, mine: true });
    mail('Assistant Coach', `${mine.last} has a new rival`, `Coach, ${plink(mine)} and ${plink(other)}${other.team != null ? ` (${team(other.team).abbr})` : ''} have a real problem with each other — ${reason.toLowerCase()}.\n\nWhen they share the floor expect trash talk, big swings in form — and a real risk of technicals.`, { type: 'staff' });
  }
}
function prunePlayerRivals() { S.rivals.player = (S.rivals.player || []).filter((r) => S.players[r.a] && S.players[r.b]); }

/* ---------- Hooks ---------- */
function rivalsPregame(f) {
  ensureRivals();
  const opp = team(f.h === S.userTeam ? f.a : f.h);
  const r = coachRival(opp);
  if (r) {
    const q = R.pick(TRASH_QUOTES)(opp.coach.name, S.coach.name);
    mail('Media', `Grudge match: ${opp.coach.name} talks trash`, `Ahead of tonight's game, ${opp.coach.name} (${teamName(opp)}) had this to say about you:\n\n<i>${q}</i>\n\nRivalry: <b>${rivalLabel(r.pts)}</b>. Results tonight count double with the board and the locker room.`, { type: 'league' });
  }
  const map = playerRivalMap();
  for (const p of roster(S.userTeam)) for (const oid of map[p.id] || []) {
    const o = S.players[oid];
    if (o && o.team === opp.id) {
      const talker = o.hid.trash >= p.hid.trash ? o : p, target = talker === o ? p : o;
      mail('Media', `Bad blood: #${p.num} ${p.last} vs #${o.num} ${o.last}`, `${pname(talker)} on ${pname(target)}: <i>"${R.pick(['He knows what\'s coming. He\'s known since last time.', 'I\'m going to live in his head all night.', 'Tell him to bring a better game than last time.', 'No handshake. Not tonight.'])}"</i>`, { type: 'league' });
    }
  }
}
function isRivalMatch(f) { const opp = team(f.h === S.userTeam ? f.a : f.h); return !!coachRival(opp); }
function rivalsPostMatch(m, f, res, confBefore, moraleBefore) {
  ensureRivals();
  const opp = team(f.h === S.userTeam ? f.a : f.h);
  const us = f.h === S.userTeam ? res.hs : res.as, them = f.h === S.userTeam ? res.as : res.hs;
  const won = us > them;
  if (coachRival(opp)) {
    // double the board and locker-room swing
    S.board.conf = clamp(S.board.conf + (S.board.conf - confBefore), 0, 100);
    for (const p of roster(S.userTeam)) if (moraleBefore[p.id] != null) p.morale = clamp(p.morale + (p.morale - moraleBefore[p.id]) + (won ? 3 : -3), 0, 100);
    if (won) news('rumour', `${S.coach.name} gets one over on rival ${opp.coach.name} — ${us}-${them}.`, { lg: opp.lg, tid: S.userTeam, mine: true });
  }
  if (!won && S.pressPressure === f.id) { S.board.conf = clamp(S.board.conf - 3, 0, 100); }
  let pts = 0;
  if (Math.abs(us - them) <= 3) pts += 1.5;
  if (f.type === 'po') pts += 1.5;
  if (res.ot) pts += 1;
  if (pts) coachRivalryPts(opp, pts, f.type === 'po' ? 'Playoff battles' : 'Close games');
  // player rivalries forged on court
  const rp = m && m.rp ? m.rp : {};
  for (const k in rp) {
    const [a, b] = k.split('-').map(Number);
    S.rpts['p' + k] = (S.rpts['p' + k] || 0) + rp[k];
    if (S.rpts['p' + k] >= 4) addPlayerRivalry(a, b, 'Heated on-court battles');
  }
}
function rivalsOnTrade(otherTeamId, incoming, outgoing) {
  ensureRivals();
  const other = team(otherTeamId);
  const their = roster(otherTeamId).sort((a, b) => calcCA(b) - calcCA(a));
  for (const id of incoming) if (their.slice(0, 3).some((p) => p.id === id)) {
    coachRivalryPts(other, 4, 'Poached a key player');
    mail('Media', `${other.coach.name} fumes over ${S.players[id].last} deal`, `${other.coach.name}: <i>"We'll remember how ${S.coach.name} does business. Believe that."</i>`, { type: 'league' });
  }
  // messy exits create bad blood with former teammates
  for (const id of outgoing) {
    const p = S.players[id];
    const mates = roster(S.userTeam).filter((q) => !outgoing.includes(q.id));
    const enemy = mates.find((q) => (q.hid.ego >= 14 && p.hid.ego >= 14) || (p.unsettled && q.hid.temp <= 7));
    if (enemy && R.chance(0.55)) addPlayerRivalry(p.id, enemy.id, 'Former teammates — bad blood');
  }
}

/* ---------- Press conferences ---------- */
function pressQuestions(kind, f) {
  const opp = team(f.h === S.userTeam ? f.a : f.h), cname = opp.coach ? opp.coach.name : 'their coach';
  const rival = coachRival(opp);
  const r = roster(S.userTeam).filter((p) => !p.inj).sort((a, b) => calcCA(b) - calcCA(a));
  const qs = [];
  if (kind === 'pre') {
    const pUs = matchPreview(f).pUs;
    if (rival || R.chance(0.55)) qs.push({ q: rival ? `Your rival ${cname} says he "can't wait to beat you again". Your response?` : `${cname} called the ${userTeam().nick} "soft in the paint" this week. Any response?`,
      opts: [{ t: 'Fire back', d: '"He should worry about his own team."', fx: { rival: 3, morale: 2 } }, { t: 'Stay classy', d: '"I respect him. Our play will do the talking."', fx: { rival: -1, morale: 1 } }, { t: 'No comment', d: '"I\'m not here to talk about other coaches."', fx: {} }] });
    const star = r[0];
    if (star) qs.push({ q: `Is ${pname(star)} the best ${POS_NAME[star.pos].toLowerCase()} in the league right now?`,
      opts: [{ t: 'Hype him up', d: `"No question. Nobody can guard him."`, fx: { pid: star.id, pm: star.hid.ego >= 14 ? 8 : 5 } }, { t: 'Team first', d: '"We win as a team. That\'s what matters."', fx: { morale: 1, pid: star.id, pm: star.hid.ego >= 15 ? -3 : 1 } }, { t: 'Challenge him', d: '"He has more to give. I expect more."', fx: { pid: star.id, pm: star.hid.prof >= 14 ? 4 : -6 } }] });
    qs.push({ q: pUs > 0.6 ? 'You\'re big favourites tonight. Is anything less than a win a failure?' : pUs < 0.4 ? 'Nobody gives you a chance tonight. Fair?' : 'It looks like a coin-flip game. What decides it?',
      opts: [{ t: 'Confident', d: '"We expect to win. Simple."', fx: { morale: 3, pressure: true } }, { t: 'Measured', d: '"Every game in this league is tough."', fx: { morale: 1 } }, { t: pUs < 0.4 ? 'Embrace underdog' : 'Deflect pressure', d: pUs < 0.4 ? '"Good. Let them write us off."' : '"The pressure is all on them."', fx: { morale: pUs < 0.4 ? 3 : 0 } }] });
  } else {
    const lr = S.lastResult; if (!lr) return [];
    const us = lr.h === S.userTeam ? lr.hs : lr.as, them = lr.h === S.userTeam ? lr.as : lr.hs, won = us > them;
    qs.push(won ? { q: `${us}-${them}. What pleased you most tonight?`, opts: [{ t: 'Praise the players', d: '"The guys were outstanding. All credit to them."', fx: { morale: 3 } }, { t: 'Stay humble', d: '"One game. We go again."', fx: { morale: 1 } }, { t: 'Credit the opponent', d: `"Credit to ${opp.nick}, they made it tough."`, fx: { rival: -1 } }] }
      : { q: `${us}-${them}. What went wrong?`, opts: [{ t: 'Take the blame', d: '"That\'s on me. I didn\'t have them ready."', fx: { morale: 2, board: -1 } }, { t: 'Call out effort', d: '"The effort wasn\'t good enough. Simple."', fx: { morale: -3, profBoost: 4 } }, { t: 'Blame the refs', d: '"I\'ve never seen officiating like it."', fx: { morale: 1, fine: true } }] });
    const ej = Object.entries(lr.box).find(([id, b]) => b.team === S.userTeam && S.players[id] && (S.lastTechs || {})[id]);
    if (ej) { const p = S.players[ej[0]]; qs.push({ q: `${pname(p)} lost his cool tonight. Will there be consequences?`, opts: [{ t: 'Defend him', d: '"He plays with passion. I\'ll always back him."', fx: { pid: p.id, pm: 6, fine: true } }, { t: 'Unacceptable', d: '"That can\'t happen. We\'ll deal with it."', fx: { pid: p.id, pm: p.hid.prof >= 13 ? -2 : -8, morale: 1 } }, { t: 'Internal matter', d: '"We\'ll handle it in-house."', fx: {} }] }); }
    else if (rival || R.chance(0.5)) qs.push({ q: `Any words for ${cname} after tonight?`, opts: [{ t: 'Fire back', d: won ? '"Tell him I said good game. He\'ll need the practice."' : '"Enjoy it. It won\'t happen again."', fx: { rival: 3, morale: 1 } }, { t: 'Respect', d: '"He\'s a good coach. Tough opponent."', fx: { rival: -2 } }, { t: 'No comment', d: '"Next question."', fx: {} }] });
    const pom = S.players[lr.pom];
    if (pom && pom.team === S.userTeam) qs.push({ q: `${pname(pom)} was player of the match. Your thoughts?`, opts: [{ t: 'Big praise', d: '"He was unstoppable tonight."', fx: { pid: pom.id, pm: 5 } }, { t: 'Measured', d: '"Good game. He knows he can do even more."', fx: { pid: pom.id, pm: 1 } }, { t: 'Spread credit', d: '"Everyone contributed tonight."', fx: { morale: 1, pid: pom.id, pm: pom.hid.ego >= 15 ? -3 : 0 } }] });
  }
  return qs.slice(0, 3);
}
function applyPress(fx, f) {
  const med = 0.7 + S.coach.a.med / 30;
  const opp = team(f.h === S.userTeam ? f.a : f.h);
  const notes = [];
  if (fx.morale) roster(S.userTeam).forEach((p) => (p.morale = clamp(p.morale + fx.morale * med, 0, 100)));
  if (fx.pid && S.players[fx.pid]) S.players[fx.pid].morale = clamp(S.players[fx.pid].morale + fx.pm * med, 0, 100);
  if (fx.profBoost) roster(S.userTeam).filter((p) => p.hid.prof >= 14).forEach((p) => (p.morale = clamp(p.morale + fx.profBoost, 0, 100)));
  if (fx.board) S.board.conf = clamp(S.board.conf + fx.board, 0, 100);
  if (fx.rival > 0) { coachRivalryPts(opp, fx.rival, 'Press conference clashes'); if (R.chance(0.5)) mail('Media', `${opp.coach.name} hits back`, `${opp.coach.name}: <i>"${R.pick(['I heard what he said. We\'ll answer on the court.', 'He talks a lot for a guy with that record.', 'Cute. Let\'s see if his players believe it.'])}"</i>`, { type: 'league' }); notes.push('Rivalry heats up'); }
  if (fx.rival < 0) coachRivalryPts(opp, fx.rival, null);
  if (fx.pressure) S.pressPressure = f.id;
  if (fx.fine && R.chance(0.35)) { userTeam().budget = Math.round((userTeam().budget - 0.15) * 100) / 100; mail('League Office', 'Fined for comments', `The league has fined the club $150K for your comments to the media.`, { type: 'league' }); notes.push('Fined $150K'); }
  return notes;
}
function assistantPress(kind, f) {
  const qs = pressQuestions(kind, f);
  qs.forEach((q) => applyPress(q.opts[1].fx, f));
  S.pressDone[kind] = f.id;
  return qs.length;
}
