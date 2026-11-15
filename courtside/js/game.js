/* Courtside Manager — game state, season flow, inbox, transfers */
'use strict';

const SAVE_KEY = 'courtside_save_v1';
let S = null;

const TEAM_LEVELS = [12.5, 12.3, 12.1, 11.95, 11.8, 11.7, 11.6, 11.5, 11.4, 11.3, 11.2, 11.05, 10.9, 10.75, 10.6, 10.4];
const SLOT_LV = [2.5, 1.2, 0.8, 0.3, 0, -0.6, -1, -1.4, -1.8, -2.2, -2.6, -3, -3.5];
const SLOT_POS = ['PG', 'SG', 'SF', 'PF', 'C', 'PG', 'SG', 'SF', 'PF', 'C', null, null, null];
const ROSTER_MAX = 15, ROSTER_MIN = 10;

/* ---------- Database (teams + players) ---------- */
function generateDatabase() {
  const db = { leagueName: 'Pro Hoops League', short: 'PHL', teams: [], players: [], nextPid: 1 };
  const tmp = { players: {}, nextPid: 1 };
  const levels = R.shuffle(TEAM_LEVELS);
  DEFAULT_TEAMS.forEach((t, i) => {
    const team = { id: i + 1, ...t };
    db.teams.push(team);
    SLOT_LV.forEach((l, j) => {
      const p = genPlayer(tmp, levels[i] + l, SLOT_POS[j] || undefined, undefined, team.id);
      db.players.push(p);
    });
  });
  for (let i = 0; i < 26; i++) db.players.push(genPlayer(tmp, R.f(7, 10.5), undefined, undefined, null));
  db.nextPid = tmp.nextPid;
  return db;
}
function exportDatabase() {
  return {
    format: 'courtside-db', version: 1, leagueName: S.leagueName, short: S.short,
    teams: S.teams.map(({ id, city, nick, abbr, c1, c2, budget }) => ({ id, city, nick, abbr, c1, c2, budget })),
    players: Object.values(S.players).map((p) => ({ id: p.id, first: p.first, last: p.last, nat: p.nat, age: p.age, pos: p.pos, h: p.h, team: p.team, a: p.a, pot: p.pot, contract: p.contract })),
  };
}
function validateDatabase(db) {
  if (!db || !Array.isArray(db.teams) || !Array.isArray(db.players)) throw new Error('Not a valid database file.');
  if (db.teams.length < 4) throw new Error('A league needs at least 4 teams.');
  const ids = new Set(db.teams.map((t) => t.id));
  let maxId = 1;
  db.leagueName = clean(db.leagueName) || 'Custom League'; db.short = clean(db.short, 6) || 'CL';
  for (const t of db.teams) { t.city = clean(t.city, 24) || 'City'; t.nick = clean(t.nick, 24) || 'Team'; t.abbr = clean(t.abbr, 4).toUpperCase() || 'TM'; t.c1 = /^#[0-9a-f]{6}$/i.test(t.c1) ? t.c1 : '#1f6feb'; t.c2 = /^#[0-9a-f]{6}$/i.test(t.c2) ? t.c2 : '#ffffff'; t.budget = +t.budget || 0; }
  for (const p of db.players) {
    p.first = clean(p.first, 20) || 'Player'; p.last = clean(p.last, 24) || String(p.id || '');
    if (!p.a) throw new Error('Player missing attributes: ' + (p.first || '?'));
    for (const at of ATTRS) p.a[at.k] = clamp(Math.round(+p.a[at.k] || 10), 1, 20);
    if (!POS.includes(p.pos)) p.pos = 'SF';
    if (p.team != null && !ids.has(p.team)) p.team = null;
    p.age = clamp(+p.age || 25, 16, 45);
    p.h = +p.h || randHeight(p.pos);
    p.nat = NATS[p.nat] ? p.nat : 'USA';
    p.contract = p.contract || { sal: 1, yrs: 2 };
    p.pot = clamp(+p.pot || calcCA(p), 1, 20);
    maxId = Math.max(maxId, +p.id || 0);
  }
  db.players.forEach((p) => { if (!p.id) p.id = ++maxId; });
  db.nextPid = maxId + 1;
  return db;
}

/* ---------- New game ---------- */
function newGame({ manager, teamId, db, length }) {
  db = JSON.parse(JSON.stringify(db));
  S = {
    v: 1, manager: clean(manager, 28) || 'Manager', leagueName: db.leagueName || 'Pro Hoops League', short: db.short || 'PHL',
    season: 2026, day: 0, phase: 'regular', cycles: length === 'long' ? 4 : 2,
    userTeam: teamId, teams: [], players: {}, schedule: [], inbox: [], nextPid: db.nextPid || 1, nextMid: 1, nextFx: 1,
    playoffs: null, history: [], training: 'balanced', board: { conf: 70, exp: '' }, pending: null, lastResult: null,
    tradeCooldown: 0, promises: {},
  };
  for (const t of db.teams) {
    S.teams.push({ id: t.id, city: t.city, nick: t.nick, abbr: t.abbr, c1: t.c1 || '#1f6feb', c2: t.c2 || '#ffffff', budget: t.budget || 0,
      w: 0, l: 0, pf: 0, pa: 0, streak: 0, rotation: [], tactics: { pace: R.pick(['slow', 'normal', 'normal', 'fast']), focus: R.pick(['inside', 'balanced', 'balanced', 'outside']), defense: R.chance(0.25) ? 'zone' : 'man', intensity: 'normal' } });
  }
  for (const p of db.players) {
    S.players[p.id] = { ...p, morale: 65, cond: 100, inj: null, st: emptyStats(), career: p.career || [], form: [] };
    S.nextPid = Math.max(S.nextPid, p.id + 1);
  }
  for (const t of S.teams) {
    const payroll = teamPayroll(t.id);
    if (!t.budget) t.budget = Math.round(Math.max(payroll * 1.08, payroll + 4));
    autoRotation(S, t);
  }
  const ut = userTeam();
  ut.tactics = { pace: 'normal', focus: 'balanced', defense: 'man', intensity: 'normal' };
  ut.budget = Math.max(ut.budget, Math.round(teamPayroll(ut.id) + 8));
  S.schedule = buildSchedule(S.teams.map((t) => t.id), S.cycles, 0);
  setBoardExpectations();
  welcomeEmails();
  save();
}

function team(id) { return S.teams.find((t) => t.id === id); }
function userTeam() { return team(S.userTeam); }
function teamName(t) { return `${t.city} ${t.nick}`; }
function roster(id) { return Object.values(S.players).filter((p) => p.team === id); }
function teamPayroll(id) { return Math.round(roster(id).reduce((s, p) => s + p.contract.sal, 0) * 10) / 10; }
function teamStrength(id) {
  const r = roster(id).map(calcCA).sort((a, b) => b - a).slice(0, 8);
  if (!r.length) return 0;
  return r.reduce((s, x, i) => s + x * (i < 5 ? 1.3 : 0.7), 0) / (5 * 1.3 + Math.max(0, r.length - 5) * 0.7);
}
function freeAgents() { return Object.values(S.players).filter((p) => p.team == null); }
function curDate() { return fmtDate(S.season, S.day); }

/* ---------- Schedule ---------- */
function buildSchedule(ids, cycles, startDay) {
  const list = ids.slice();
  if (list.length % 2) list.push(null);
  const n = list.length;
  const rounds = [];
  let arr = list.slice();
  for (let r = 0; r < n - 1; r++) {
    const games = [];
    for (let i = 0; i < n / 2; i++) {
      const a = arr[i], b = arr[n - 1 - i];
      if (a == null || b == null) continue;
      games.push((r + i) % 2 === 0 ? [a, b] : [b, a]);
    }
    rounds.push(games);
    arr = [arr[0], arr[n - 1], ...arr.slice(1, n - 1)];
  }
  const all = [];
  for (let c = 0; c < cycles; c++) {
    const order = c === 0 ? rounds : R.shuffle(rounds);
    for (const g of order) all.push(g.map(([h, a]) => (c % 2 ? [a, h] : [h, a])));
  }
  const gap = cycles > 2 ? 2 : 3;
  const fx = [];
  all.forEach((games, ri) => {
    const day = startDay + 3 + ri * gap;
    for (const [h, a] of games) fx.push({ id: S.nextFx++, day, h, a, played: false, type: 'reg' });
  });
  return fx;
}
function seasonLastRegDay() { return Math.max(...S.schedule.filter((f) => f.type === 'reg').map((f) => f.day)); }
function nextUserFixture() { return S.schedule.filter((f) => !f.played && (f.h === S.userTeam || f.a === S.userTeam)).sort((a, b) => a.day - b.day)[0]; }

/* ---------- Standings ---------- */
function standings() {
  return S.teams.slice().sort((a, b) => {
    const pa = a.w / Math.max(1, a.w + a.l), pb = b.w / Math.max(1, b.w + b.l);
    return pb - pa || (b.w - a.w) || ((b.pf - b.pa) - (a.pf - a.pa));
  });
}
function teamRank(id) { return standings().findIndex((t) => t.id === id) + 1; }

/* ---------- Inbox ---------- */
function mail(from, subject, body, extra = {}) {
  S.inbox.unshift({ id: S.nextMid++, day: S.day, season: S.season, from, subject, body, read: false, ...extra });
  if (S.inbox.length > 120) S.inbox.length = 120;
}
function unreadCount() { return S.inbox.filter((m) => !m.read).length; }

function setBoardExpectations() {
  const ranks = S.teams.map((t) => ({ id: t.id, s: teamStrength(t.id) })).sort((a, b) => b.s - a.s);
  const r = ranks.findIndex((x) => x.id === S.userTeam) + 1;
  S.board.rankPre = r;
  const n = S.teams.length;
  const po = Math.min(8, Math.floor(n / 2));
  if (r <= 2) S.board.exp = { key: 'title', txt: 'Win the championship', target: 1 };
  else if (r <= Math.ceil(po / 2)) S.board.exp = { key: 'semis', txt: 'Reach the semi-finals', target: 2 };
  else if (r <= po + 1) S.board.exp = { key: 'playoffs', txt: 'Qualify for the playoffs', target: 3 };
  else S.board.exp = { key: 'compete', txt: 'Be competitive and develop the squad', target: 4 };
}

function welcomeEmails() {
  const t = userTeam();
  const r = roster(t.id).sort((a, b) => calcCA(b) - calcCA(a));
  const star = r[0];
  const young = r.filter((p) => p.age <= 22).sort((a, b) => b.pot - a.pot)[0];
  const posCount = {}; POS.forEach((p) => (posCount[p] = r.filter((x) => x.pos === p).length));
  const weak = POS.map((p) => ({ p, v: Math.max(0, ...r.filter((x) => x.pos === p).map(calcCA)) })).sort((a, b) => a.v - b.v)[0];
  mail('Board of Directors', `Welcome to the ${t.nick}`,
    `Dear ${S.manager},\n\nOn behalf of everyone at the ${teamName(t)}, welcome aboard. We are delighted to have you as our new Head Coach.\n\nAfter reviewing the squad, the board's expectation for the ${S.season}/${String(S.season + 1).slice(2)} season is:\n\n<b>${S.board.exp.txt}</b>\n\nYour wage budget is set at <b>${fmtMoney(t.budget)}</b>, with a current payroll of ${fmtMoney(teamPayroll(t.id))}.\n\nWe wish you the very best of luck.`, { type: 'board' });
  mail('Assistant Coach', 'Squad assessment',
    `Coach,\n\nI've had a look over the roster. A few thoughts:\n\n• Our best player is <a data-act="player" data-id="${star.id}">${pname(star)}</a> (${star.pos}). Build around him.\n${young ? `• <a data-act="player" data-id="${young.id}">${pname(young)}</a> (${young.age}) is a real prospect — playing time will help him grow.\n` : ''}• Our weakest spot looks like <b>${POS_NAME[weak.p]}</b>. Might be worth checking the Market.\n\nI've set up a default rotation. Tweak it in Tactics whenever you like. Hit <b>Continue</b> when you're ready.`, { type: 'staff' });
}

/* ---------- Day advance ---------- */
function advance() {
  if (S.pending) return { action: 'prematch' };
  if (S.phase === 'offseason') { startNewSeason(); save(); return { action: 'newseason' }; }
  if (S.phase === 'sacked') return { action: 'sacked' };
  ensureRosters();
  const unplayed = S.schedule.filter((f) => !f.played);
  if (!unplayed.length) {
    if (S.phase === 'regular') { startPlayoffs(); save(); return { action: 'playoffs' }; }
    if (S.phase === 'playoffs') { endSeason(); save(); return { action: 'endseason' }; }
  }
  const next = Math.min(...unplayed.map((f) => f.day));
  for (let d = S.day + 1; d <= next; d++) dailyTick(d);
  S.day = next;
  const today = S.schedule.filter((f) => f.day === next && !f.played);
  const uf = today.find((f) => f.h === S.userTeam || f.a === S.userTeam);
  S.teams.forEach((t) => { if (t.id !== S.userTeam || S.autoRot) autoRotation(S, t); });
  if (uf) { S.pending = uf.id; save(); return { action: 'prematch' }; }
  simDay(today);
  save();
  return { action: 'day' };
}

function dailyTick(d) {
  const trainPhys = S.training === 'physical' ? 2 : 0;
  for (const p of Object.values(S.players)) {
    p.cond = clamp(p.cond + 7 + p.a.sta * 0.25 + (p.team === S.userTeam ? trainPhys : 0), 0, 100);
    p.morale += (62 - p.morale) * 0.02;
    if (p.inj) {
      p.inj.days--;
      if (p.inj.days <= 0) {
        if (p.team === S.userTeam) mail('Physio', `${pname(p)} back in training`, `Good news coach — <a data-act="player" data-id="${p.id}">${pname(p)}</a> has recovered from his ${p.inj.name.toLowerCase()} and is available for selection.`, { type: 'medical' });
        p.inj = null; p.cond = Math.min(p.cond, 80);
      }
    }
  }
  if (d % 7 === 0) weeklyDevelopment();
  if (S.phase === 'regular') {
    if (S.tradeCooldown > 0) S.tradeCooldown--;
    else if (d < seasonLastRegDay() * 0.75 && R.chance(0.05)) aiTradeOffer();
  }
  S.day = d;
}

function weeklyDevelopment() {
  for (const p of Object.values(S.players)) {
    if (p.team == null) continue;
    const ca = calcCA(p);
    if (p.age <= 25 && p.pot > ca) {
      let g = (p.pot - ca) * 0.012 * (0.6 + p.a.wrk / 20) * (p.age <= 21 ? 1.4 : 1);
      if (p.team === S.userTeam && S.training === 'youth' && p.age <= 23) g *= 1.6;
      const mins = p.st.gp ? p.st.min / p.st.gp : 0;
      g *= 0.7 + Math.min(1, mins / 25) * 0.6;
      growPlayer(p, g * ATTRS.length * 0.35, p.team === S.userTeam ? S.training : 'balanced');
    }
  }
}
function growPlayer(p, total, focus) {
  const bias = (TRAINING[focus] || TRAINING.balanced).bias;
  const keys = ATTRS.map((a) => a.k);
  const steps = Math.abs(total);
  const sign = total >= 0 ? 1 : -1;
  p._frac = p._frac || {};
  for (const k of keys) {
    let share = steps / keys.length * (bias[k] || 1) * R.f(0.4, 1.6);
    if (sign < 0 && ['spd', 'jmp', 'sta'].includes(k)) share *= 2.2;
    if (sign < 0 && ['iq', 'cmp', 'ldr'].includes(k)) share *= 0.2;
    const v = (p._frac[k] || 0) + share * sign;
    const whole = Math.trunc(v);
    p._frac[k] = v - whole;
    if (whole) p.a[k] = clamp(p.a[k] + whole, 1, 20);
  }
}

/* ---------- Matches ---------- */
function simDay(fixtures) {
  for (const f of fixtures) {
    if (f.played) continue;
    const res = simMatch(S, team(f.h), team(f.a));
    applyResult(f, res);
  }
  afterDay();
}

function playUserMatch() {
  const f = S.schedule.find((x) => x.id === S.pending);
  const res = simMatch(S, team(f.h), team(f.a));
  return { f, res };
}
function finishUserMatch(f, res) {
  applyResult(f, res);
  const others = S.schedule.filter((x) => x.day === f.day && !x.played);
  S.pending = null;
  S.lastResult = { fid: f.id, hs: res.hs, as: res.as, box: res.box, ratings: res.ratings, pom: res.pom, quarters: res.quarters, h: f.h, a: f.a };
  simDay(others);
  userPostMatch(f, res);
  save();
}

function applyResult(f, res) {
  f.played = true; f.hs = res.hs; f.as = res.as; f.pom = res.pom;
  const H = team(f.h), A = team(f.a);
  if (f.type === 'reg') {
    const hw = res.hs > res.as;
    H.pf += res.hs; H.pa += res.as; A.pf += res.as; A.pa += res.hs;
    if (hw) { H.w++; A.l++; H.streak = H.streak > 0 ? H.streak + 1 : 1; A.streak = A.streak < 0 ? A.streak - 1 : -1; }
    else { A.w++; H.l++; A.streak = A.streak > 0 ? A.streak + 1 : 1; H.streak = H.streak < 0 ? H.streak - 1 : -1; }
  } else {
    const s = S.playoffs.series.find((x) => x.id === f.series);
    if ((res.hs > res.as) === (f.h === s.a)) s.wa++; else s.wb++;
  }
  for (const id in res.box) {
    const p = S.players[id]; if (!p) continue;
    const b = res.box[id];
    const st = f.type === 'reg' ? p.st : (p.pst = p.pst || emptyStats());
    if (b.min > 0) {
      st.gp++; st.gs += b.gs; st.min += b.min;
      for (const k of ['pts', 'reb', 'ast', 'stl', 'blk', 'tov', 'fgm', 'fga', 'tpm', 'tpa', 'ftm', 'fta']) st[k] += b[k];
      if (res.ratings[id] != null) { st.rat += res.ratings[id]; p.form.push(res.ratings[id]); if (p.form.length > 5) p.form.shift(); }
    }
    const won = (b.team === f.h) === (res.hs > res.as);
    p.cond = clamp(p.cond - b.min * 0.62 * (1.35 - p.a.sta / 40), 20, 100);
    p.morale = clamp(p.morale + (won ? 1.5 : -1.5), 0, 100);
    // injuries
    if (!p.inj && b.min > 0 && R.chance(b.min * 0.0005 * (1 + (100 - p.cond) / 60))) {
      const [n, lo, hi] = R.pick(INJURIES);
      p.inj = { name: n, days: R.int(lo, hi) };
      if (p.team === S.userTeam) mail('Physio', `Injury: ${pname(p)}`, `Coach, <a data-act="player" data-id="${p.id}">${pname(p)}</a> picked up a <b>${n.toLowerCase()}</b> in the game against ${team(b.team === f.h ? f.a : f.h).nick}.\n\nExpected time out: <b>${p.inj.days} days</b>.`, { type: 'medical' });
    }
  }
}

function userPostMatch(f, res) {
  const t = userTeam();
  const home = f.h === t.id;
  const us = home ? res.hs : res.as, them = home ? res.as : res.hs;
  const won = us > them;
  const opp = team(home ? f.a : f.h);
  // board confidence
  const oppStr = teamStrength(opp.id), ourStr = teamStrength(t.id);
  const expectWin = ourStr >= oppStr;
  S.board.conf = clamp(S.board.conf + (won ? (expectWin ? 1 : 2.5) : (expectWin ? -2.5 : -1)) * (f.type === 'po' ? 1.5 : 1), 0, 100);
  // morale from minutes
  const r = roster(t.id).sort((a, b) => calcCA(b) - calcCA(a));
  r.forEach((p, i) => {
    const b = res.box[p.id];
    const mins = b ? b.min : 0;
    if (p.inj) return;
    const expected = i < 5 ? 26 : i < 8 ? 14 : 0;
    if (expected && mins < expected * 0.5) p.morale = clamp(p.morale - (i < 5 ? 5 : 3), 0, 100);
    else if (mins >= expected) p.morale = clamp(p.morale + 1, 0, 100);
    if (S.promises[p.id] && S.promises[p.id] > 0) {
      S.promises[p.id]--;
      if (mins >= 20) delete S.promises[p.id];
      else if (S.promises[p.id] === 0) { delete S.promises[p.id]; p.morale = clamp(p.morale - 25, 0, 100); mail(pname(p), 'You broke your promise', `Coach, you told me I'd get more minutes. That hasn't happened. I'm really disappointed.`, { type: 'player', pid: p.id }); }
    }
    if (p.morale < 28 && !p._complained && expected > 0) {
      p._complained = true;
      mail(pname(p), 'Unhappy with playing time', `Coach,\n\nI'm not happy with my role. I believe I should be playing far more minutes than I am. I want to know where I stand.`, { type: 'player', pid: p.id, actions: [{ act: 'promise', label: 'Promise more minutes' }, { act: 'earn', label: 'Tell him to earn it' }] });
    }
  });
  if (res.ot && won) mail('Assistant Coach', `Overtime thriller vs ${opp.nick}`, `What a game coach! We got it done in ${res.ot > 1 ? res.ot + ' overtimes' : 'overtime'}. The players are buzzing.`, { type: 'staff' });
  const played = t.w + t.l;
  if (f.type === 'reg' && played > 0 && played % 8 === 0) {
    const rank = teamRank(t.id);
    const c = S.board.conf;
    const mood = c >= 75 ? 'delighted with' : c >= 55 ? 'pleased with' : c >= 35 ? 'concerned about' : 'very unhappy with';
    mail('Board of Directors', 'Board update', `${S.manager},\n\nAfter ${played} games we sit <b>${ordinal(rank)}</b> with a ${t.w}-${t.l} record. The board is ${mood} the team's progress.\n\nExpectation: <b>${S.board.exp.txt}</b>\nBoard confidence: <b>${Math.round(c)}%</b>`, { type: 'board' });
  }
}
function afterDay() {
  // regular season end checks
  if (S.phase === 'regular' && S.schedule.every((f) => f.played)) {
    mail('League Office', 'Regular season complete', `The regular season is over. Playoff seeding is set — hit <b>Continue</b> to begin the postseason.`, { type: 'league' });
  }
  if (S.phase === 'playoffs') progressPlayoffs();
}
function ordinal(n) { const s = ['th', 'st', 'nd', 'rd'], v = n % 100; return n + (s[(v - 20) % 10] || s[v] || s[0]); }

/* ---------- Playoffs ---------- */
const ROUND_NAMES = { 1: 'Quarter-Finals', 2: 'Semi-Finals', 3: 'Finals' };
function startPlayoffs() {
  const st = standings();
  const n = Math.min(8, st.length >= 8 ? 8 : 4);
  const seeds = st.slice(0, n).map((t) => t.id);
  S.phase = 'playoffs';
  S.playoffs = { seeds, round: n === 8 ? 1 : 2, series: [], champion: null };
  const pairs = n === 8 ? [[0, 7], [3, 4], [1, 6], [2, 5]] : [[0, 3], [1, 2]];
  const sid = { v: 1 };
  pairs.forEach(([x, y], i) => S.playoffs.series.push({ id: sid.v++, round: S.playoffs.round, slot: i, a: seeds[x], b: seeds[y], wa: 0, wb: 0, bestOf: bestOf(S.playoffs.round) }));
  scheduleSeriesGames(S.day + 3);
  const inIt = seeds.includes(S.userTeam);
  const seed = seeds.indexOf(S.userTeam) + 1;
  mail('League Office', inIt ? `Playoffs: you're in as the #${seed} seed!` : 'Playoffs begin without us',
    inIt ? `Congratulations — the ${userTeam().nick} have qualified for the postseason as the <b>#${seed} seed</b>.\n\nQuarter-finals are best of 3, semi-finals best of 3 and the Finals best of 5. Good luck!` : `Unfortunately we finished ${ordinal(teamRank(S.userTeam))} and missed the playoffs. You can keep hitting Continue to follow the postseason.`, { type: 'league' });
}
function bestOf(round) { return round === 3 ? 5 : 3; }
function seriesDone(s) { const need = Math.ceil(s.bestOf / 2); return s.wa >= need || s.wb >= need; }
function seriesWinner(s) { const need = Math.ceil(s.bestOf / 2); return s.wa >= need ? s.a : s.wb >= need ? s.b : null; }
function scheduleSeriesGames(day) {
  for (const s of S.playoffs.series.filter((x) => x.round === S.playoffs.round && !seriesDone(x))) {
    const g = s.wa + s.wb + 1;
    const homeA = g % 2 === 1;
    S.schedule.push({ id: S.nextFx++, day, h: homeA ? s.a : s.b, a: homeA ? s.b : s.a, played: false, type: 'po', series: s.id, game: g });
  }
}
function progressPlayoffs() {
  const P = S.playoffs;
  const cur = P.series.filter((s) => s.round === P.round);
  if (S.schedule.some((f) => !f.played)) return;
  for (const s of cur) {
    if (seriesDone(s) && !s.reported) {
      s.reported = true;
      const w = seriesWinner(s), l = w === s.a ? s.b : s.a;
      if (w === S.userTeam || l === S.userTeam) {
        const won = w === S.userTeam;
        S.board.conf = clamp(S.board.conf + (won ? 6 : -2), 0, 100);
        mail('League Office', won ? `${ROUND_NAMES[s.round]}: we advance!` : `Eliminated in the ${ROUND_NAMES[s.round]}`,
          won ? `The ${team(w).nick} beat the ${team(l).nick} ${Math.max(s.wa, s.wb)}-${Math.min(s.wa, s.wb)}. ${s.round === 3 ? '' : 'On to the next round!'}` : `The ${team(w).nick} knocked us out ${Math.max(s.wa, s.wb)}-${Math.min(s.wa, s.wb)}. Heads up — we go again next season.`, { type: 'league' });
      }
    }
  }
  if (cur.every(seriesDone)) {
    if (P.round === 3) {
      P.champion = seriesWinner(cur[0]);
      return;
    }
    const winners = cur.sort((a, b) => a.slot - b.slot).map(seriesWinner);
    P.round++;
    for (let i = 0; i < winners.length; i += 2) {
      const [x, y] = [winners[i], winners[i + 1]].sort((m, n) => P.seeds.indexOf(m) - P.seeds.indexOf(n));
      P.series.push({ id: P.series.length + 1, round: P.round, slot: i / 2, a: x, b: y, wa: 0, wb: 0, bestOf: bestOf(P.round) });
    }
    scheduleSeriesGames(S.day + 3);
  } else {
    scheduleSeriesGames(S.day + 2);
  }
}

/* ---------- Season end ---------- */
function seasonScore(p) {
  const s = p.st; if (!s.gp) return 0;
  const t = team(p.team); const wp = t ? t.w / Math.max(1, t.w + t.l) : 0.3;
  return (s.pts + 1.2 * s.reb + 1.5 * s.ast + 2 * s.stl + 2 * s.blk - s.tov) / s.gp * (0.75 + wp * 0.5) * Math.min(1, s.gp / (gamesPerTeam() * 0.6));
}
function gamesPerTeam() { return (S.teams.length - 1) * S.cycles; }
function endSeason() {
  S.phase = 'offseason';
  const champ = S.playoffs ? S.playoffs.champion : standings()[0].id;
  const all = Object.values(S.players).filter((p) => p.team != null && p.st.gp > 0);
  const mvp = all.slice().sort((a, b) => seasonScore(b) - seasonScore(a))[0];
  const roy = all.filter((p) => p.age <= 21).sort((a, b) => seasonScore(b) - seasonScore(a))[0];
  S.history.unshift({ season: S.season, champ, champName: teamName(team(champ)), mvp: mvp ? pname(mvp) : '-', mvpId: mvp?.id, roy: roy ? pname(roy) : '-', userRank: teamRank(S.userTeam), userRec: `${userTeam().w}-${userTeam().l}` });
  const won = champ === S.userTeam;
  mail('League Office', `${team(champ).city} ${team(champ).nick} are champions!`,
    `${won ? '🏆 <b>WE ARE CHAMPIONS!</b> What a season, coach!\n\n' : ''}The ${teamName(team(champ))} have won the ${S.season}/${String(S.season + 1).slice(2)} ${S.leagueName} title.\n\n<b>Season Awards</b>\nMVP: ${mvp ? `<a data-act="player" data-id="${mvp.id}">${pname(mvp)}</a> (${team(mvp.team).abbr}) — ${(mvp.st.pts / mvp.st.gp).toFixed(1)} ppg` : '-'}\nRookie of the Year: ${roy ? `<a data-act="player" data-id="${roy.id}">${pname(roy)}</a> (${team(roy.team).abbr})` : '-'}`, { type: 'league' });
  // board verdict
  const P = S.playoffs;
  let reached = 4; // 1=champ 2=final/semis 3=playoffs 4=none
  if (P) {
    if (champ === S.userTeam) reached = 1;
    else if (P.series.some((s) => s.round >= 2 && (s.a === S.userTeam || s.b === S.userTeam))) reached = 2;
    else if (P.seeds.includes(S.userTeam)) reached = 3;
  }
  const target = S.board.exp.target;
  const diff = target - reached;
  S.board.conf = clamp(S.board.conf + diff * 12, 0, 100);
  let verdict;
  if (S.board.conf < 20) {
    verdict = `The board has decided to terminate your contract. Results have fallen well short of expectations.`;
    S.phase = 'sacked';
  } else if (diff > 0) verdict = `The board is thrilled. You exceeded our expectations this season. Your wage budget will be increased.`;
  else if (diff === 0) verdict = `The board is satisfied — you met our expectations this season.`;
  else verdict = `The board is disappointed. We expected more this season. Next season must be better.`;
  if (diff > 0) userTeam().budget = Math.round(userTeam().budget * 1.08);
  mail('Board of Directors', 'End of season review', `${S.manager},\n\nExpectation: <b>${S.board.exp.txt}</b>\nFinal standing: <b>${ordinal(teamRank(S.userTeam))}</b> (${userTeam().w}-${userTeam().l})\n\n${verdict}`, { type: 'board' });
  // expiring contracts
  for (const p of roster(S.userTeam)) {
    if (p.contract.yrs <= 1) mail(pname(p), 'Contract expiring', `Coach, my contract is up at the end of this season. I'd like to know if you see me as part of the future here.\n\nIf you don't offer a new deal, I'll leave as a free agent when the new season starts.`, { type: 'player', pid: p.id, actions: [{ act: 'renew', label: 'Offer new contract' }] });
  }
  if (S.phase === 'sacked') return;
  mail('Assistant Coach', 'Off-season', `Season's done, coach. Review your expiring contracts in the inbox, then hit <b>Continue</b> to start the new season.\n\nWhen the new season starts: players age and develop, veterans may retire, expiring deals end, and a fresh class of young free agents hits the Market.`, { type: 'staff' });
}

function takeNewJob(teamId) {
  S.userTeam = teamId;
  S.phase = 'offseason';
  S.board.conf = 60;
  S.inbox = [];
  mail('Board of Directors', `Welcome to the ${team(teamId).nick}`, `Dear ${S.manager},\n\nWe believe you deserve a second chance. Welcome to the ${teamName(team(teamId))}. Hit Continue to start the new season.`, { type: 'board' });
  save();
}

function startNewSeason() {
  const retirees = [];
  for (const p of Object.values(S.players)) {
    if (p.st.gp > 0 && p.team != null) p.career.push({ s: S.season, t: team(p.team)?.abbr || '-', gp: p.st.gp, pts: p.st.pts, reb: p.st.reb, ast: p.st.ast, rat: p.st.rat });
    p.age++;
    const ca = calcCA(p);
    let g;
    if (p.age <= 20) g = (p.pot - ca) * R.f(0.25, 0.5);
    else if (p.age <= 23) g = (p.pot - ca) * R.f(0.15, 0.4);
    else if (p.age <= 26) g = (p.pot - ca) * R.f(0.05, 0.3);
    else if (p.age <= 29) g = R.f(-0.2, 0.2);
    else if (p.age <= 32) g = -R.f(0.2, 0.7);
    else g = -R.f(0.5, 1.3);
    g *= 0.8 + p.a.wrk / 50;
    if (p.team === S.userTeam && S.training === 'youth') g += p.age <= 23 ? 0.25 : -0.15;
    growPlayer(p, g * ATTRS.length, p.team === S.userTeam ? S.training : 'balanced');
    const nca = calcCA(p);
    if (nca > p.pot) p.pot = Math.round(nca * 10) / 10;
    // retirement
    const retireP = p.age >= 35 ? 0.35 + (p.age - 35) * 0.2 : p.age >= 32 ? (nca < 10 ? 0.25 : 0.05) : (p.age >= 29 && nca < 7 && p.team == null ? 0.3 : 0);
    if (R.chance(retireP)) retirees.push(p);
  }
  for (const p of retirees) {
    if (p.team === S.userTeam) mail(pname(p), 'Retirement', `Coach, after ${p.age - 18} years in the game I've decided to hang up my sneakers. Thank you for everything.`, { type: 'player' });
    delete S.players[p.id];
  }
  // contracts
  for (const p of Object.values(S.players)) {
    if (p.team == null) continue;
    p.contract.yrs--;
    if (p.contract.yrs <= 0) {
      if (p.team === S.userTeam) { p.team = null; p.contract = { sal: salaryFor(calcCA(p), p.age, p.pot), yrs: 0 }; continue; }
      const r = roster(p.team).sort((a, b) => calcCA(b) - calcCA(a));
      const idx = r.indexOf(p);
      const ns = salaryFor(calcCA(p), p.age, p.pot);
      if (idx < 8 && R.chance(0.75) && p.age < 34 && teamPayroll(p.team) - p.contract.sal + ns <= team(p.team).budget * 1.05) p.contract = { sal: ns, yrs: R.int(1, 4) };
      else { p.team = null; p.contract = { sal: salaryFor(calcCA(p), p.age, p.pot), yrs: 0 }; }
    }
  }
  // rookies
  for (let i = 0; i < Math.round(S.teams.length * 1.6); i++) {
    const p = genPlayer(S, R.f(8.5, 12.5), undefined, R.int(19, 21), null);
    p.pot = Math.round(clamp(calcCA(p) + R.f(1, 6), 0, 20) * 10) / 10;
    p.contract.sal = salaryFor(calcCA(p), p.age, p.pot);
    p.rookie = true;
    S.players[p.id] = p;
  }
  for (const p of Object.values(S.players)) { if (p.team == null) p.contract.sal = salaryFor(calcCA(p), p.age, p.pot); }
  // keep a healthy pool of journeymen
  while (freeAgents().length < 40) { const np = genPlayer(S, R.f(7, 10.5), undefined, R.int(23, 33), null); S.players[np.id] = np; }
  // trim FA pool
  const fas = freeAgents().sort((a, b) => playerValue(b) - playerValue(a));
  fas.slice(70).forEach((p) => delete S.players[p.id]);
  // reset
  S.season++;
  S.day = 0;
  S.phase = 'regular';
  S.playoffs = null;
  S.schedule = [];
  for (const t of S.teams) { t.w = t.l = t.pf = t.pa = t.streak = 0; if (t.id !== S.userTeam) t.budget = Math.round(t.budget * 1.03); }
  for (const p of Object.values(S.players)) { p.st = emptyStats(); p.pst = null; p.cond = 100; p.morale = clamp(p.morale * 0.5 + 32, 0, 100); p._complained = false; p.form = []; if (p.inj && p.inj.days > 30) p.inj.days -= 30; else p.inj = null; }
  ensureRosters(true);
  S.teams.forEach((t) => { if (t.id !== S.userTeam) autoRotation(S, t); else cleanRotation(S, t); });
  S.schedule = buildSchedule(S.teams.map((t) => t.id), S.cycles, 0);
  setBoardExpectations();
  S.board.conf = clamp(S.board.conf * 0.6 + 28, 0, 100);
  mail('Board of Directors', `${S.season}/${String(S.season + 1).slice(2)} season objectives`, `${S.manager},\n\nA new season begins. The board's expectation this year:\n\n<b>${S.board.exp.txt}</b>\n\nWage budget: <b>${fmtMoney(userTeam().budget)}</b> · Payroll: ${fmtMoney(teamPayroll(S.userTeam))}`, { type: 'board' });
  const topRook = freeAgents().filter((p) => p.rookie).sort((a, b) => b.pot - a.pot).slice(0, 3);
  if (topRook.length) mail('Chief Scout', 'Top young free agents', `Coach, the new class of young players has entered free agency. The ones I'd keep an eye on:\n\n${topRook.map((p) => `• <a data-act="player" data-id="${p.id}">${pname(p)}</a> — ${p.pos}, age ${p.age}`).join('\n')}\n\nFind them in the Market.`, { type: 'staff' });
}

function ensureRosters(offseason) {
  for (const t of S.teams) {
    if (t.id === S.userTeam) {
      const r = roster(t.id);
      if (r.length < 8) {
        const need = 8 - r.length;
        const cheap = freeAgents().sort((a, b) => a.contract.sal - b.contract.sal || calcCA(b) - calcCA(a)).slice(0, 12).sort((a, b) => calcCA(b) - calcCA(a)).slice(0, need);
        cheap.forEach((p) => { p.team = t.id; p.contract.yrs = 1; });
        if (cheap.length) mail('Assistant Coach', 'Emergency signings', `Coach, we didn't have enough bodies to field a team, so the league assigned us: ${cheap.map(pname).join(', ')} on 1-year minimum deals.`, { type: 'staff' });
        cleanRotation(S, t);
      }
      continue;
    }
    let r = roster(t.id);
    const target = offseason ? 13 : ROSTER_MIN;
    let guard = 0;
    while (r.length < target && guard++ < 20) {
      const room = t.budget - teamPayroll(t.id);
      const need = POS.find((p) => r.filter((x) => x.pos === p).length < 2);
      let cands = freeAgents().filter((p) => p.contract.sal <= Math.max(room, 1.5));
      if (!cands.length) cands = freeAgents().sort((x, y) => x.contract.sal - y.contract.sal).slice(0, 4);
      if (!cands.length) { const np = genPlayer(S, 8, need, undefined, null); S.players[np.id] = np; cands = [np]; }
      const pick = cands.sort((a, b) => (playerValue(b) + (b.pos === need ? 2 : 0)) - (playerValue(a) + (a.pos === need ? 2 : 0)))[0];
      pick.team = t.id; pick.contract.yrs = R.int(1, 3); pick.rookie = false;
      r = roster(t.id);
    }
    while (r.length > ROSTER_MAX) {
      const worst = r.sort((a, b) => playerValue(a) - playerValue(b))[0];
      worst.team = null; worst.contract.yrs = 0;
      r = roster(t.id);
    }
  }
}

/* ---------- Transfers ---------- */
function packageValue(players) {
  const v = players.map(playerValue).sort((a, b) => b - a);
  return v.reduce((s, x, i) => s + x * (i === 0 ? 1 : 0.45), 0);
}
function tradeInterest(targetId, offerIds) {
  const tgt = S.players[targetId];
  const offer = offerIds.map((id) => S.players[id]);
  if (!offer.length) return 0;
  return packageValue(offer) / (playerValue(tgt) * 1.1);
}
function tradeCheck(targetId, offerIds) {
  const tgt = S.players[targetId];
  const offer = offerIds.map((id) => S.players[id]);
  const ut = userTeam();
  const inSal = tgt.contract.sal, outSal = offer.reduce((s, p) => s + p.contract.sal, 0);
  const myCount = roster(ut.id).length - offer.length + 1;
  const theirCount = roster(tgt.team).length - 1 + offer.length;
  if (myCount > ROSTER_MAX) return { ok: false, msg: `That would put you over the ${ROSTER_MAX}-man roster limit.` };
  if (myCount < 8) return { ok: false, msg: `You need at least 8 players on your roster.` };
  if (theirCount > ROSTER_MAX) return { ok: false, msg: `They'd have too many players. Offer fewer players.` };
  if (teamPayroll(ut.id) - outSal + inSal > ut.budget && inSal > outSal) return { ok: false, msg: `This trade would put you over your wage budget (${fmtMoney(ut.budget)}).` };
  return { ok: true };
}
function proposeTrade(targetId, offerIds) {
  const chk = tradeCheck(targetId, offerIds);
  if (!chk.ok) return chk;
  const tgt = S.players[targetId];
  const t = team(tgt.team);
  const interest = tradeInterest(targetId, offerIds);
  if (S.phase === 'regular' && S.day > seasonLastRegDay() * 0.75) return { ok: false, msg: 'The trade deadline has passed. Trades reopen in the off-season.' };
  if (S.phase === 'playoffs') return { ok: false, msg: 'No trades during the playoffs.' };
  if (interest >= 1) {
    executeTrade(tgt.team, [targetId], offerIds);
    mail(`${t.nick} GM`, `Trade completed: ${pname(tgt)}`, `We have a deal. <a data-act="player" data-id="${tgt.id}">${pname(tgt)}</a> is heading to the ${userTeam().nick}, and ${offerIds.map((id) => pname(S.players[id])).join(', ')} join${offerIds.length > 1 ? '' : 's'} us. Pleasure doing business.`, { type: 'transfer', read: true });
    return { ok: true, msg: `Trade accepted! ${pname(tgt)} has joined your team.` };
  }
  const txt = interest > 0.8 ? "We're close, but we need a bit more value." : interest > 0.5 ? "That's not enough for a player of his quality." : "Not interested. That offer isn't even close.";
  return { ok: false, msg: `${t.nick} GM: “${txt}”` };
}
function executeTrade(otherTeamId, incoming, outgoing) {
  incoming.forEach((id) => { S.players[id].team = S.userTeam; S.players[id].morale = 65; });
  outgoing.forEach((id) => { S.players[id].team = otherTeamId; });
  cleanRotation(S, userTeam());
  autoRotation(S, team(otherTeamId));
}
function aiTradeOffer() {
  const mine = roster(S.userTeam).sort((a, b) => playerValue(b) - playerValue(a));
  if (mine.length < 9) return;
  const target = R.pick(mine.slice(1, 9));
  const others = S.teams.filter((t) => t.id !== S.userTeam);
  const t = R.pick(others);
  const theirs = roster(t.id).sort((a, b) => playerValue(b) - playerValue(a));
  const tv = playerValue(target);
  let best = null, bd = 1e9;
  for (const p of theirs) {
    const d = Math.abs(playerValue(p) - tv * R.f(0.95, 1.15));
    if (d < bd && p.pos !== undefined) { bd = d; best = p; }
  }
  if (!best || playerValue(best) < tv * 0.85) return;
  S.tradeCooldown = 10;
  mail(`${t.nick} GM`, `Trade proposal: ${pname(target)}`, `Hi ${S.manager},\n\nThe ${teamName(t)} would like to acquire <a data-act="player" data-id="${target.id}">${pname(target)}</a> (${target.pos}, ${target.age}).\n\nIn exchange we'd send you <a data-act="player" data-id="${best.id}">${pname(best)}</a> (${best.pos}, ${best.age}, ${fmtMoney(best.contract.sal)}/yr).\n\nLet us know.`,
    { type: 'transfer', actions: [{ act: 'acceptTrade', label: 'Accept trade' }, { act: 'reject', label: 'Reject' }], trade: { team: t.id, give: [target.id], get: [best.id] } });
}

function signFreeAgent(pid, years) {
  const p = S.players[pid];
  const ut = userTeam();
  if (p.team != null) return { ok: false, msg: 'Player is not a free agent.' };
  if (roster(ut.id).length >= ROSTER_MAX) return { ok: false, msg: `Your roster is full (${ROSTER_MAX}). Release someone first.` };
  if (S.phase === 'playoffs') return { ok: false, msg: 'Free agent signings are closed during the playoffs.' };
  const sal = askingSalary(p);
  if (teamPayroll(ut.id) + sal > ut.budget) return { ok: false, msg: `Not enough wage budget. You have ${fmtMoney(Math.max(0, ut.budget - teamPayroll(ut.id)))} available.` };
  p.team = ut.id; p.contract = { sal, yrs: years + (S.phase === 'offseason' ? 1 : 0) }; p.morale = 70; p.rookie = false;
  cleanRotation(S, ut);
  return { ok: true, msg: `${pname(p)} signed for ${fmtMoney(sal)}/yr over ${years} year${years > 1 ? 's' : ''}.` };
}
function askingSalary(p) {
  const base = salaryFor(calcCA(p), p.age, p.pot);
  return Math.round(base * (p.morale < 40 ? 1.15 : 1) * 10) / 10;
}
function renewContract(pid, years) {
  const p = S.players[pid];
  const ut = userTeam();
  const sal = askingSalary(p);
  if (p.morale < 25) return { ok: false, msg: `${pname(p)} is too unhappy to discuss a new deal.` };
  if (teamPayroll(ut.id) - p.contract.sal + sal > ut.budget && sal > p.contract.sal) return { ok: false, msg: `A ${fmtMoney(sal)}/yr deal would take you over budget.` };
  p.contract = { sal, yrs: years + 1 };
  p.morale = clamp(p.morale + 10, 0, 100);
  return { ok: true, msg: `${pname(p)} signed a new ${years}-year deal at ${fmtMoney(sal)}/yr.` };
}
function releasePlayer(pid) {
  const p = S.players[pid];
  if (roster(S.userTeam).length <= 8) return { ok: false, msg: 'You need at least 8 players.' };
  p.team = null; p.contract.yrs = 0;
  cleanRotation(S, userTeam());
  return { ok: true, msg: `${pname(p)} has been released.` };
}

/* ---------- Mail actions ---------- */
function mailAction(mid, act) {
  const m = S.inbox.find((x) => x.id === mid);
  if (!m || m.done) return { msg: 'Already handled.' };
  const p = m.pid ? S.players[m.pid] : null;
  let msg = '';
  if (act === 'promise' && p) { p.morale = clamp(p.morale + 18, 0, 100); S.promises[p.id] = 5; msg = `You promised ${pname(p)} more minutes. Make sure he gets 20+ minutes within the next 5 games.`; }
  else if (act === 'earn' && p) { p.morale = clamp(p.morale - 8, 0, 100); if (p.a.wrk >= 14) { p.morale += 12; msg = `${pname(p)} accepts the challenge and vows to work harder.`; } else msg = `${pname(p)} is not happy with your response.`; }
  else if (act === 'acceptTrade') {
    const tr = m.trade;
    const valid = tr.give.every((id) => S.players[id]?.team === S.userTeam) && tr.get.every((id) => S.players[id]?.team === tr.team);
    if (!valid) msg = 'This offer is no longer valid.';
    else if (S.phase === 'playoffs') msg = 'Trades are closed.';
    else { executeTrade(tr.team, tr.get, tr.give); msg = 'Trade completed!'; }
  }
  else if (act === 'reject') msg = 'Offer rejected.';
  else if (act === 'renew') return { renew: m.pid };
  m.done = msg || true;
  save();
  return { msg };
}

/* ---------- Save / load ---------- */
function save() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(S)); } catch (e) { console.warn('save failed', e); } }
function load() {
  try { const s = localStorage.getItem(SAVE_KEY); if (s) { S = JSON.parse(s); return true; } } catch (e) { console.warn(e); }
  return false;
}
function sanitizeSave(o) {
  o.manager = clean(o.manager, 28); o.leagueName = clean(o.leagueName);
  for (const t of o.teams) { t.city = clean(t.city, 24); t.nick = clean(t.nick, 24); t.abbr = clean(t.abbr, 4); if (!/^#[0-9a-f]{6}$/i.test(t.c1)) t.c1 = '#1f6feb'; if (!/^#[0-9a-f]{6}$/i.test(t.c2)) t.c2 = '#ffffff'; }
  for (const p of Object.values(o.players)) { p.first = clean(p.first, 20); p.last = clean(p.last, 24); }
  for (const m of o.inbox || []) { m.from = clean(m.from); m.subject = clean(m.subject, 80); m.body = String(m.body || '').replace(/<(?!\/?b>|br>)[^>]*>/gi, ''); }
  for (const h of o.history || []) { h.champName = clean(h.champName, 60); h.mvp = clean(h.mvp, 50); }
  return o;
}
function hasSave() { try { return !!localStorage.getItem(SAVE_KEY); } catch (e) { return false; } }
function deleteSave() { try { localStorage.removeItem(SAVE_KEY); } catch (e) {} S = null; }
