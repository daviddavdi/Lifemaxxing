/* Courtside Manager — world, seasons, inbox, career, transfers */
'use strict';

const SAVE_KEY = 'courtside_save_v2';
let S = null;

const SLOT_LV = [2.5, 1.2, 0.8, 0.3, 0, -0.6, -1, -1.4, -1.8, -2.2, -2.6, -3, -3.5];
const SLOT_POS = ['PG', 'SG', 'SF', 'PF', 'C', 'PG', 'SG', 'SF', 'PF', 'C', null, null, null];
const ROSTER_MAX = 15, ROSTER_MIN = 10;
const deaccent = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '');

/* ---------- World / database ---------- */
function makeAbbr(city, used) {
  const c = deaccent(city).toUpperCase().replace(/[^A-Z]/g, '');
  const cands = [c.slice(0, 3), c[0] + c.slice(2, 4), c[0] + c[1] + c[c.length - 1], c[0] + c.slice(-2), c.slice(0, 2) + 'X'];
  for (const x of cands) if (x && x.length === 3 && !used.has(x)) { used.add(x); return x; }
  let i = 1; while (used.has(c.slice(0, 2) + i)) i++; used.add(c.slice(0, 2) + i); return c.slice(0, 2) + i;
}
function generateWorld() {
  const tmp = { players: {}, nextPid: 1 };
  const db = { format: 'courtside-db', version: 2, leagues: [], teams: [], players: [] };
  const usedAbbr = new Set(DEFAULT_TEAMS.map((t) => t.abbr));
  const usedCity = {};
  let tid = 1;
  for (const L of LEAGUE_DEFS) {
    db.leagues.push({ id: L.id, name: L.name, short: L.short, country: L.country, tier: L.tier });
    const levels = R.shuffle(Array.from({ length: L.size }, (_, i) => L.lv[0] + (L.lv[1] - L.lv[0]) * (i / (L.size - 1))));
    let clubs;
    if (L.country === 'USA') clubs = DEFAULT_TEAMS.slice(0, L.size).map((t) => ({ ...t }));
    else {
      const pool = EURO_CLUBS[L.country];
      usedCity[L.country] = usedCity[L.country] || new Set();
      const cities = R.shuffle(pool.cities.filter((c) => !usedCity[L.country].has(c))).slice(0, L.size);
      const nicks = R.shuffle(pool.nicks);
      const cols = R.shuffle(CLUB_COLORS);
      clubs = cities.map((city, i) => { usedCity[L.country].add(city); return { city, nick: nicks[i % nicks.length], abbr: makeAbbr(city, usedAbbr), c1: cols[i % cols.length][0], c2: cols[i % cols.length][1] }; });
    }
    clubs.forEach((c, i) => {
      const lv = levels[i];
      const prestige = Math.round(L.pr[0] + ((lv - L.lv[0]) / Math.max(0.01, L.lv[1] - L.lv[0])) * (L.pr[1] - L.pr[0]));
      const team = { id: tid++, lg: L.id, ...c, budget: 0, prestige, cq: Math.round(clamp(prestige * 0.6 + 4 + R.gauss() * 2, 4, 19)) };
      db.teams.push(team);
      const n = L.size >= 14 ? 13 : 12;
      for (let j = 0; j < n; j++) db.players.push(genPlayer(tmp, lv + SLOT_LV[j], SLOT_POS[j] || undefined, undefined, team.id, L.country));
    });
  }
  for (let i = 0; i < 60; i++) db.players.push(genPlayer(tmp, R.f(6.5, 10.5), undefined, undefined, null, R.pick(['USA', 'ESP', 'ITA', 'GER'])));
  db.nextPid = tmp.nextPid + 1;
  return db;
}
function exportDatabase() {
  return {
    format: 'courtside-db', version: 2,
    leagues: S.leagues.map(({ id, name, short, country, tier }) => ({ id, name, short, country, tier })),
    teams: S.teams.map(({ id, lg, city, nick, abbr, c1, c2, budget, prestige }) => ({ id, lg, city, nick, abbr, c1, c2, budget, prestige })),
    players: Object.values(S.players).map((p) => ({ id: p.id, first: p.first, last: p.last, nat: p.nat, age: p.age, pos: p.pos, h: p.h, team: p.team, a: p.a, hid: p.hid, pot: p.pot, contract: p.contract })),
  };
}
function validateDatabase(db) {
  if (!db || !Array.isArray(db.teams) || !Array.isArray(db.players)) throw new Error('Not a valid database file.');
  if (!Array.isArray(db.leagues) || !db.leagues.length) {
    db.leagues = [{ id: 'L1', name: clean(db.leagueName) || 'Custom League', short: clean(db.short, 6) || 'CL', country: 'USA', tier: 1 }];
    db.teams.forEach((t) => (t.lg = 'L1'));
  }
  db.leagues.forEach((l) => { l.id = clean(l.id, 8) || 'L' + Math.random().toString(36).slice(2, 5); l.name = clean(l.name) || 'League'; l.short = clean(l.short, 6) || l.id; l.tier = l.tier === 2 ? 2 : 1; l.country = COUNTRY_FLAG[l.country] ? l.country : 'USA'; });
  const lids = new Set(db.leagues.map((l) => l.id));
  for (const t of db.teams) {
    if (!lids.has(t.lg)) t.lg = db.leagues[0].id;
    t.city = clean(t.city, 24) || 'City'; t.nick = clean(t.nick, 24) || 'Team'; t.abbr = clean(t.abbr, 4).toUpperCase() || 'TM';
    t.c1 = /^#[0-9a-f]{6}$/i.test(t.c1) ? t.c1 : '#1f6feb'; t.c2 = /^#[0-9a-f]{6}$/i.test(t.c2) ? t.c2 : '#ffffff';
    t.budget = +t.budget || 0; t.prestige = clamp(+t.prestige || 10, 1, 20);
  }
  db.leagues = db.leagues.filter((l) => db.teams.filter((t) => t.lg === l.id).length >= 2);
  if (!db.leagues.length) throw new Error('A league needs at least 2 teams.');
  const okL = new Set(db.leagues.map((l) => l.id));
  db.teams = db.teams.filter((t) => okL.has(t.lg));
  const ids = new Set(db.teams.map((t) => t.id));
  let maxId = 1;
  for (const p of db.players) {
    p.first = clean(p.first, 20) || 'Player'; p.last = clean(p.last, 24) || String(p.id || '');
    if (!p.a) throw new Error('Player missing attributes: ' + p.first);
    for (const at of ATTRS) p.a[at.k] = clamp(Math.round(+p.a[at.k] || 10), 1, 20);
    if (!POS.includes(p.pos)) p.pos = 'SF';
    if (p.team != null && !ids.has(p.team)) p.team = null;
    p.age = clamp(+p.age || 25, 16, 45);
    p.h = +p.h || randHeight(p.pos);
    p.nat = NATS[p.nat] ? p.nat : 'USA';
    p.contract = p.contract || { sal: 1, yrs: 2 };
    p.pot = clamp(+p.pot || calcCA(p), 1, 20);
    if (p.hid) for (const h of HIDDEN) p.hid[h.k] = clamp(Math.round(+p.hid[h.k] || 10), 1, 20);
    maxId = Math.max(maxId, +p.id || 0);
  }
  db.players.forEach((p) => { if (!p.id) p.id = ++maxId; });
  db.nextPid = maxId + 1;
  return db;
}

/* ---------- Coach ---------- */
function makeCoach(name, style, mode) {
  const st = COACH_STYLES[style] || COACH_STYLES.allround;
  const base = mode === 'journey' ? 7.5 : 12;
  const a = {};
  for (const at of COACH_ATTRS) a[at.k] = Math.round(clamp(base + R.gauss() * 1.4 + (st.plus.includes(at.k) ? 4 : 0) - (st.minus.includes(at.k) ? 2 : 0), 1, 20));
  return { journey: mode === 'journey', name: clean(name, 28) || 'The Coach', style, a, rep: mode === 'journey' ? 3 : 12, frac: {}, hist: [], titles: 0, games: 0, wins: 0 };
}
function journeymanOffers(db) {
  const t2 = db.leagues.filter((l) => l.tier === 2).map((l) => l.id);
  const pool = db.teams.filter((t) => t2.includes(t.lg)).sort((a, b) => a.prestige - b.prestige).slice(0, 12);
  return R.shuffle(pool.length ? pool : db.teams.slice().sort((a, b) => a.prestige - b.prestige).slice(0, 6)).slice(0, 3).map((t) => t.id);
}

/* ---------- New game ---------- */
function newGame({ name, style, mode, teamId, db, length, diff, ironman }) {
  db = JSON.parse(JSON.stringify(db));
  S = {
    v: 5, season: 2026, day: 0, phase: 'season', cycles: length === 'long' ? 4 : 2, duos: [], pairs: {}, staff: [], nextSid: 0,
    coach: makeCoach(name, style, mode), userTeam: teamId, diff: DIFFICULTY[diff] ? diff : 'normal', ironman: !!ironman, matchLock: null,
    leagues: db.leagues.map((l) => ({ ...l, state: 'regular', po: null, final: [] })),
    teams: [], players: {}, schedule: [], inbox: [], nextPid: db.nextPid || 1, nextMid: 1, nextFx: 1,
    history: [], training: 'balanced', board: { conf: 65, exp: null }, pending: null, lastResult: null,
    tradeCooldown: 0, promises: {}, vacancies: [], applied: [], autoRot: false,
  };
  for (const t of db.teams) {
    S.teams.push({ id: t.id, lg: t.lg, city: t.city, nick: t.nick, abbr: t.abbr, c1: t.c1 || '#1f6feb', c2: t.c2 || '#ffffff', budget: t.budget || 0,
      prestige: t.prestige || 10, cq: t.cq || Math.round(clamp((t.prestige || 10) * 0.6 + 4 + R.gauss() * 2, 4, 19)),
      w: 0, l: 0, pf: 0, pa: 0, streak: 0, rotation: [], instr: {},
      tactics: { ...DEFAULT_TACTICS(), pace: R.pick(['slow', 'normal', 'normal', 'fast']), system: R.pick(['motion', 'motion', 'pnr', 'pnr', 'iso', 'post', 'run']), focus: R.pick(['inside', 'balanced', 'balanced', 'outside']), defense: R.pick(['man', 'man', 'man', 'zone', 'switch']) } });
  }
  for (const p of db.players) {
    S.players[p.id] = ensureTraits({ ...p, morale: 65, cond: 100, inj: null, st: emptyStats(), career: p.career || [], form: [], known: [] });
    S.nextPid = Math.max(S.nextPid, p.id + 1);
  }
  for (const t of S.teams) {
    const payroll = teamPayroll(t.id);
    if (!t.budget) t.budget = Math.round(Math.max(payroll * 1.08, payroll + 1.5) * 10) / 10;
    autoRotation(S, t);
  }
  const ut = userTeam();
  ut.tactics = DEFAULT_TACTICS(); ut.instr = {};
  ut.budget = Math.max(ut.budget, Math.round((teamPayroll(ut.id) * 1.06 + 1) * 10) / 10);
  ut.budget = Math.round(ut.budget * diffCfg().budget * 10) / 10;
  S.schedule = buildAllSchedules();
  ensureMarket(); ensureRivals();
  S.coach.start = { season: S.season, day: 0 }; S.coach.joined = { season: S.season, day: 0 }; S.coach.pcoach = 10; S.coach.badges = [];
  ensureUserStaff();
  setBoardExpectations();
  revealKnown(roster(ut.id));
  welcomeEmails(mode);
  save();
}

/* ---------- Lookups ---------- */
function team(id) { return S.teams.find((t) => t.id === id); }
function userTeam() { return team(S.userTeam); }
function league(id) { return S.leagues.find((l) => l.id === id); }
function userLeague() { return league(userTeam().lg); }
function lgTeams(lid) { return S.teams.filter((t) => t.lg === lid); }
function teamName(t) { return `${t.city} ${t.nick}`; }
function roster(id) { return Object.values(S.players).filter((p) => p.team === id); }
function teamPayroll(id) { return Math.round(roster(id).reduce((s, p) => s + p.contract.sal, 0) * 10) / 10; }
function teamStrength(id) { return strengthOf(S, id); }
function leagueLevel(lid) { const ts = lgTeams(lid); return ts.reduce((s, t) => s + teamStrength(t.id), 0) / Math.max(1, ts.length); }
function freeAgents() { return Object.values(S.players).filter((p) => p.team == null); }
function curDate() { return fmtDate(S.season, S.day); }
function ordinal(n) { const s = ['th', 'st', 'nd', 'rd'], v = n % 100; return n + (s[(v - 20) % 10] || s[v] || s[0]); }
function relegationLeague(lg) { return lg.tier === 1 && S.leagues.some((l) => l.country === lg.country && l.tier === 2); }
function promotionLeague(lg) { return lg.tier === 2 && S.leagues.some((l) => l.country === lg.country && l.tier === 1); }

/* ---------- Schedule ---------- */
function buildLeagueSchedule(lid, cycles, startDay) {
  const list = lgTeams(lid).map((t) => t.id);
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
  const span = cycles > 2 ? 150 : 90;
  const gap = Math.max(2, Math.floor(span / all.length));
  const fx = [];
  all.forEach((games, ri) => { for (const [h, a] of games) fx.push({ id: S.nextFx++, lg: lid, day: startDay + 3 + ri * gap, h, a, played: false, type: 'reg' }); });
  return fx;
}
function buildAllSchedules() { return S.leagues.flatMap((l) => buildLeagueSchedule(l.id, S.cycles, 0)); }
function lastRegDay(lid) { const d = S.schedule.filter((f) => f.type === 'reg' && f.lg === lid).map((f) => f.day); return d.length ? Math.max(...d) : 0; }
function deadlinePassed() { const lg = userLeague(); return lg.state !== 'regular' || S.day > lastRegDay(lg.id) * 0.75; }

/* ---------- Standings ---------- */
function standings(lid) {
  return lgTeams(lid).sort((a, b) => {
    const pa = a.w / Math.max(1, a.w + a.l), pb = b.w / Math.max(1, b.w + b.l);
    return pb - pa || (b.w - a.w) || ((b.pf - b.pa) - (a.pf - a.pa));
  });
}
function teamRank(id) { const t = team(id); return standings(t.lg).findIndex((x) => x.id === id) + 1; }
function poQualifiers(n) { return n >= 12 ? 8 : n >= 5 ? 4 : 2; }

/* ---------- Inbox ---------- */
function mail(from, subject, body, extra = {}) {
  S.inbox.unshift({ id: S.nextMid++, day: S.day, season: S.season, from, subject, body, read: false, ...extra });
  if (S.inbox.length > 150) S.inbox.length = 150;
}
function unreadCount() { return S.inbox.filter((m) => !m.read).length; }
const plink = (p, short) => `<a data-act="player" data-id="${p.id}">${pname(p, short)}</a>`;

function setBoardExpectations() {
  const t = userTeam(), lg = league(t.lg);
  const ts = lgTeams(lg.id).map((x) => ({ id: x.id, s: teamStrength(x.id) })).sort((a, b) => b.s - a.s);
  const r = ts.findIndex((x) => x.id === t.id) + 1, n = ts.length, q = poQualifiers(n);
  let exp;
  if (r <= 1) exp = { key: 'title', txt: 'Win the league title', target: 5 };
  else if (promotionLeague(lg) && r <= 3) exp = { key: 'promo', txt: 'Win promotion (finish top 2)', target: 4.5 };
  else if (r <= Math.max(2, Math.round(n * 0.25))) exp = q >= 8 ? { key: 'semis', txt: 'Reach the semi-finals', target: 3 } : { key: 'final', txt: 'Reach the playoff final', target: 4 };
  else if (r <= q) exp = { key: 'playoffs', txt: 'Qualify for the playoffs', target: 2 };
  else if (relegationLeague(lg)) exp = { key: 'survive', txt: 'Avoid relegation', target: 1 };
  else exp = { key: 'compete', txt: 'Be competitive and develop players', target: 1 };
  S.board.exp = exp;
}

function revealKnown(players) {
  const ja = S.coach.a.ja;
  for (const p of players) for (const h of HIDDEN) if (traitKind(p, h.k) && !p.known.includes(h.k) && R.chance(ja / 34)) p.known.push(h.k);
}

function welcomeEmails(mode) {
  const t = userTeam(), lg = league(t.lg);
  const r = roster(t.id).sort((a, b) => calcCA(b) - calcCA(a));
  const star = r[0];
  const young = r.filter((p) => p.age <= 22).sort((a, b) => b.pot - a.pot)[0];
  const weak = POS.map((p) => ({ p, v: Math.max(0, ...r.filter((x) => x.pos === p).map(calcCA)) })).sort((a, b) => a.v - b.v)[0];
  mail('Board of Directors', `Welcome to ${teamName(t)}`,
    `Dear ${S.coach.name},\n\nOn behalf of everyone at ${teamName(t)}, welcome. ${mode === 'journey' ? 'We know you are early in your coaching career — this is your chance to make a name for yourself in the ' + lg.name + '.' : 'We are delighted to have a coach of your standing.'}\n\nThe board's expectation for the ${S.season}/${String(S.season + 1).slice(2)} season:\n\n<b>${S.board.exp.txt}</b>\n\nWage budget: <b>${fmtMoney(t.budget)}</b> · Payroll: ${fmtMoney(teamPayroll(t.id))}`, { type: 'board' });
  mail('Assistant Coach', 'Squad assessment',
    `Coach,\n\nA few thoughts on the roster:\n\n• Our best player is ${plink(star)} (${star.pos}). Build around him.\n${young ? `• ${plink(young)} (${young.age}) is a real prospect — minutes will help him grow.\n` : ''}• Our weakest spot looks like <b>${POS_NAME[weak.p]}</b>. Worth checking the Market.\n\nSet the team's offense and defense in <b>Tactics</b>, and give players individual roles. During matches you can shout from the touchline and give team talks at half-time.\n\nOne more thing — keep your ears open. You'd be amazed what you hear around the building.`, { type: 'staff' });
}

/* ---------- Day advance ---------- */
function nextUserFixtureDay() { const f = S.schedule.filter((x) => !x.played && (x.h === S.userTeam || x.a === S.userTeam)); return f.length ? Math.min(...f.map((x) => x.day)) : null; }
function advance() {
  if (S.pending) return { action: 'prematch' };
  if (S.phase === 'offseason') { startNewSeason(); save(); return { action: 'newseason' }; }
  if (S.phase === 'sacked') return { action: 'sacked' };
  const startMail = S.inbox.length;
  for (let guard = 0; guard < 400; guard++) {
    const r = advanceDay();
    if (r === 'prematch') { save(); return { action: 'prematch' }; }
    if (r === 'alldone') { endSeason(); save(); return { action: 'endseason' }; }
    if (S.phase === 'sacked') { save(); return { action: 'sacked' }; }
    if (S.inbox.length > startMail) break;
  }
  save();
  return { action: 'day' };
}
function advanceDay() {
  ensureRosters();
  checkLeagues();
  if (S.leagues.every((l) => l.state === 'done')) return 'alldone';
  const unplayed = S.schedule.filter((f) => !f.played);
  if (!unplayed.length) { checkLeagues(); return S.leagues.every((l) => l.state === 'done') ? 'alldone' : 'day'; }
  const next = Math.min(...unplayed.map((f) => f.day));
  for (let d = S.day + 1; d <= next; d++) dailyTick(d);
  S.day = next;
  const today = S.schedule.filter((f) => f.day === next && !f.played);
  const playing = new Set(today.flatMap((f) => [f.h, f.a]));
  S.teams.forEach((t) => { if (playing.has(t.id) && (t.id !== S.userTeam || S.autoRot)) autoRotation(S, t); });
  const uf = today.find((f) => f.h === S.userTeam || f.a === S.userTeam);
  if (uf) { S.pending = uf.id; rivalsPregame(uf); if (S.press.pre === 'assistant') assistantPress('pre', uf); return 'prematch'; }
  simDay(today);
  return 'day';
}

function dailyTick(d) {
  const ut = S.userTeam;
  const fit = S.coach.a.fit;
  const fitCoach = userStaff('fitness');
  for (const p of Object.values(S.players)) {
    const mine = p.team === ut;
    p.cond = clamp(p.cond + 7 + p.a.sta * 0.25 + (p.hid.nfit - 10) * 0.15 + (mine ? (fit - 10) * 0.2 + (S.training === 'physical' ? 2 : 0) + (fitCoach ? (fitCoach.a.fitness - 10) * 0.15 : 0) : 0), 0, 100);
    if (p.inj && hasArch(p, 'iron') && R.chance(0.3)) p.inj.days--;
    p.morale += (62 - p.morale) * (0.012 + p.hid.prof * 0.0012);
    if (p.inj) {
      p.inj.days--;
      if (p.inj.days <= 0) {
        if (mine) mail('Physio', `${pname(p)} back in training`, `Good news coach — ${plink(p)} has recovered from his ${p.inj.name.toLowerCase()} and is available.`, { type: 'medical' });
        p.inj = null; p.cond = Math.min(p.cond, 80);
      }
    }
  }
  S.day = d;
  if (d % 7 === 0) { weeklyDevelopment(); marketWeekly(); }
  marketDaily(d);
  if (userLeague().state === 'regular') {
    if (S.tradeCooldown > 0) S.tradeCooldown--;
    else if (!deadlinePassed() && R.chance(roster(S.userTeam).some((p) => p.listed) ? 0.07 : 0.035)) aiTradeOffer();
  }
  if (R.chance(0.13)) grapevine();
}

function weeklyDevelopment() {
  const cdev = S.coach.a.dev;
  const glue = teamsWithGlue();
  for (const p of Object.values(S.players)) {
    if (p.team == null) continue;
    const ca = calcCA(p);
    if (p.age <= 25 && p.pot > ca) {
      const mine = p.team === S.userTeam;
      let g = (p.pot - ca) * 0.012 * (0.6 + p.a.wrk / 20) * (0.6 + p.hid.prof / 25) * (p.age <= 21 ? 1.4 : 1);
      g *= mine ? 0.75 + cdev / 40 : 0.75 + (team(p.team).cq || 10) / 40;
      if (mine && S.training === 'youth' && p.age <= 23) g *= 1.6;
      const mins = p.st.gp ? p.st.min / p.st.gp : 0;
      g *= 0.7 + Math.min(1, mins / 25) * 0.6;
      g *= devMult(p, glue);
      growPlayer(p, g * ATTRS.length * 0.35, mine ? S.training : 'balanced');
    }
  }
}
function growPlayer(p, total, focus) {
  const bias = (TRAINING[focus] || TRAINING.balanced).bias;
  const steps = Math.abs(total), sign = total >= 0 ? 1 : -1;
  p._frac = p._frac || {};
  for (const at of ATTRS) {
    const k = at.k;
    let share = steps / ATTRS.length * (bias[k] || 1) * R.f(0.4, 1.6);
    if (sign < 0 && ['spd', 'jmp', 'sta'].includes(k)) share *= 2.2;
    if (sign < 0 && ['iq', 'cmp', 'ldr'].includes(k)) share *= 0.2;
    const v = (p._frac[k] || 0) + share * sign;
    const whole = Math.trunc(v);
    p._frac[k] = v - whole;
    if (whole) p.a[k] = clamp(p.a[k] + whole, 1, 20);
  }
}

/* ---------- The Grapevine (hidden-attribute whispers) ---------- */
const GV_SOURCES = ['Equipment Manager', 'Team Bus Driver', 'Video Analyst', 'Strength Coach', 'Club Physio', 'Club Chef', 'Locker Room Source'];
const WHISPERS = {
  prof: { hi: ['{p} was in the gym at 6am again. Lights off, just him and the ball rack.', 'Saw {p} doing extra film work on his day off. Nobody asked him to.'],
    lo: ['{p} skipped another recovery session. Third one this month.', 'Heard {p} was out until 3am the night before practice. Don\'t tell anyone I said so.'] },
  clutch: { hi: ['I pulled {p}\'s numbers in close games. Coach — they\'re ridiculous.', 'The guys all say the same thing: in the last two minutes, give it to {p}.'],
    lo: ['{p} looked pale in the tunnel before the last tight one. Hands shaking.', 'Between us, {p} doesn\'t want the ball when it matters.'] },
  cons: { hi: ['{p} is a metronome. Same routine, same output, every single night.'], lo: ['Nobody on staff knows which {p} will turn up on a given night.', '{p}: brilliant Tuesday, invisible Friday. Every week.'] },
  injp: { hi: ['The physio is quietly worried about {p}\'s body. "Made of glass," she joked. She wasn\'t joking.'], lo: ['{p} played through something that would have benched most guys. Iron man.'] },
  amb: { hi: ['{p}\'s agent has been spotted having lunch with people from bigger clubs.', '{p} told a teammate he "isn\'t staying at this level forever".'], lo: ['{p} told me he\'s happy here. Nice house, kids in school, no plans to move.'] },
  loy: { hi: ['{p} told a local reporter he\'d love to finish his career in this jersey.'], lo: ['{p}\'s agent was asking around about which clubs are paying the most next summer.'] },
  temp: { hi: ['Someone shoved {p} in practice. He just smiled and hit the next three shots.'], lo: ['There was shouting after practice. Apparently {p} threw a water bottle at a teammate.', '{p} got into it with a referee during a scrimmage. A scrimmage.'] },
  coach: { hi: ['The assistants say {p} soaks up everything in film sessions. Asks great questions.'], lo: ['{p} keeps freelancing in drills. The assistants are getting frustrated.'] },
  res: { hi: ['{p} went 1-for-12 last night and was laughing in the shower afterwards. Water off a duck\'s back.'], lo: ['{p} sat alone on the bus for an hour after his bad game. Still looked shaken the next morning.'] },
  nfit: { hi: ['The strength coach says {p}\'s recovery numbers are freakish. Body of a 22-year-old.'], lo: ['{p} was blowing hard after the first sprint drill. The fitness guys are worried about the next few years.'] },
  trash: { hi: ['{p} spent the whole scrimmage telling the second unit exactly what he was going to do. Then did it.'], lo: ['I don\'t think I\'ve ever heard {p} say a word to an opponent.'] },
  ego: { hi: ['{p} was overheard complaining he doesn\'t get enough touches.', '{p} spent twenty minutes filming himself after the last game. Twenty.'], lo: ['{p} gave up his parking spot for a rookie. Little things, but the guys notice.'] },
};
function grapevine() {
  const mine = roster(S.userTeam);
  const roll = Math.random();
  if (roll < 0.62) {
    const cands = [];
    for (const p of mine) for (const h of HIDDEN) { const k = traitKind(p, h.k); if (k && !p.known.includes(h.k) && WHISPERS[h.k][k]) cands.push([p, h.k, k]); }
    if (!cands.length) return;
    const [p, key, kind] = R.pick(cands);
    p.known.push(key);
    mail(R.pick(GV_SOURCES), `Psst… about ${p.last}`, R.pick(WHISPERS[key][kind]).replace(/\{p\}/g, plink(p)) + `\n\n<i>Coach's Notes on ${pname(p, 1)} updated.</i>`, { type: 'whisper' });
  } else if (roll < 0.8) {
    const others = Object.values(S.players).filter((p) => p.team != null && p.team !== S.userTeam && !p.wantsOut && p.hid.amb >= 14 && calcCA(p) > teamStrength(p.team) + 0.5);
    if (!others.length) return;
    const p = R.pick(others);
    p.wantsOut = true; if (!p.known.includes('amb')) p.known.push('amb');
    mail('Your Agent', `Word is ${p.last} wants out`, `Heard from a contact: ${plink(p)} (${team(p.team).abbr}, ${league(team(p.team).lg).name}) has told his club he wants a move. They might let him go cheaper than usual.\n\nYou didn't hear it from me.`, { type: 'whisper' });
  } else if (roll < 0.9) {
    const egos = mine.filter((p) => p.hid.ego >= 14).sort((a, b) => calcCA(b) - calcCA(a));
    if (egos.length >= 2) {
      const [a, b] = egos;
      a.morale = clamp(a.morale - 5, 0, 100); b.morale = clamp(b.morale - 5, 0, 100);
      [a, b].forEach((p) => { if (!p.known.includes('ego')) p.known.push('ego'); });
      mail('Locker Room Source', 'Two alphas, one ball', `Tension in the locker room. ${plink(a)} and ${plink(b)} both think they should be the first option. It got loud after practice.`, { type: 'whisper' });
    }
  } else if (S.board.conf < 40) {
    mail('Club Chef', 'Something you should know', `The board had dinner in the private room last night. Your name came up. A lot. Thought you should know.`, { type: 'whisper' });
  } else {
    const t = lgTeams(userTeam().lg).filter((x) => x.id !== S.userTeam && x.coach).sort((a, b) => a.coach.conf - b.coach.conf)[0];
    if (!t || t.coach.conf > 45 || (S.rumoured || []).includes(t.id)) return;
    mail('Your Agent', `Rumour: ${t.nick} coach on thin ice`, `People are saying the ${teamName(t)} board is losing patience with their coach. If that job opens up in the summer, it could be one to watch.`, { type: 'whisper' });
    (S.rumoured = S.rumoured || []).push(t.id);
  }
}

/* ---------- Matches ---------- */
function simDay(fixtures) {
  for (const f of fixtures) {
    if (f.played) continue;
    applyResult(f, simMatch(S, team(f.h), team(f.a), { imp: f.type === 'po' ? 1 : 0 }));
  }
  checkLeagues();
}
function createUserMatch(pauses) {
  const f = S.schedule.find((x) => x.id === S.pending);
  const m = createMatch(S, team(f.h), team(f.a), { imp: f.type === 'po' ? 1 : 0, pauses });
  m.fid = f.id;
  m.us = f.h === S.userTeam ? 0 : 1;
  m.trackPairs = true;
  S.preview = { fid: f.id, p: matchPreview(f).pUs };
  return m;
}
function finishUserMatch(m) {
  const f = S.schedule.find((x) => x.id === m.fid);
  const res = matchResult(m);
  applyResult(f, res);
  S.pending = null; S.matchLock = null;
  S.lastResult = { fid: f.id, hs: res.hs, as: res.as, box: res.box, ratings: res.ratings, pom: res.pom, quarters: res.quarters, h: f.h, a: f.a, talked: false };
  const confBefore = S.board.conf, moraleBefore = {}; roster(S.userTeam).forEach((p) => (moraleBefore[p.id] = p.morale));
  S.lastTechs = { ...(res.techs || {}), ...(res.flags || {}) };
  userPostMatch(f, res);
  recordPairs(m); checkDuos();
  { const us = f.h === S.userTeam ? res.hs : res.as, them = f.h === S.userTeam ? res.as : res.hs; upsetSwing(f, us > them); rivalsPostMatch(m, f, res, confBefore, moraleBefore); achAfterMatch(m, us > them, us, them); }
  if (S.press.post === 'assistant') assistantPress('post', f);
  simDay(S.schedule.filter((x) => x.day === f.day && !x.played));
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
    const s = league(f.lg).po.series.find((x) => x.id === f.series);
    if ((res.hs > res.as) === (f.h === s.a)) s.wa++; else s.wb++;
  }
  for (const tid of [f.h, f.a]) for (const p of roster(tid)) if (p.susp > 0 && !res.box[p.id]) p.susp--;
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
    if (res.techs && res.techs[id] && p.team === S.userTeam && !p.known.includes('temp') && p.hid.temp <= 6) p.known.push('temp');
    if (res.techs && res.techs[id]) {
      const before = p.techs; p.techs += res.techs[id];
      if (Math.floor(p.techs / 5) > Math.floor(before / 5)) { p.susp += 1; if (p.team === S.userTeam) mail('League Office', `Suspension: ${pname(p)}`, `${plink(p)} has reached ${p.techs} technical fouls this season and is suspended for <b>1 game</b>.`, { type: 'league' }); }
    }
    if (res.flags && res.flags[id] === 2) {
      const g = R.int(1, 2); p.susp += g;
      if (p.team === S.userTeam) { if (!p.known.includes('temp')) p.known.push('temp'); mail('League Office', `Suspension: ${pname(p)}`, `Following his Flagrant 2 ejection, ${plink(p)} has been suspended for <b>${g} game${g > 1 ? 's' : ''}</b>.`, { type: 'league' }); }
    }
    if (!p.inj && b.min > 0 && R.chance(b.min * 0.0005 * (1 + (100 - p.cond) / 60) * (0.45 + p.hid.injp / 13) * injuryMult(p) * (p.team === S.userTeam ? diffCfg().inj : 1))) {
      const [n, lo, hi] = R.pick(INJURIES);
      p.inj = { name: n, days: Math.max(1, Math.round(R.int(lo, hi) * (0.8 + p.hid.injp / 50) * (hasArch(p, 'iron') ? 0.6 : hasArch(p, 'injury') ? 1.3 : 1))) };
      if (p.team === S.userTeam) mail('Physio', `Injury: ${pname(p)}`, `Coach, ${plink(p)} picked up a <b>${n.toLowerCase()}</b> against ${team(b.team === f.h ? f.a : f.h).nick}.\n\nExpected time out: <b>${p.inj.days} days</b>.`, { type: 'medical' });
    }
  }
}

function userPostMatch(f, res) {
  const t = userTeam();
  const home = f.h === t.id;
  const us = home ? res.hs : res.as, them = home ? res.as : res.hs;
  const won = us > them;
  const opp = team(home ? f.a : f.h);
  S.coach.games++; if (won) S.coach.wins++;
  const expectWin = teamStrength(t.id) >= teamStrength(opp.id);
  S.board.conf = clamp(S.board.conf + (won ? (expectWin ? 1 : 2.5) * diffCfg().gain : (expectWin ? -2.5 : -1) * diffCfg().loss) * (f.type === 'po' ? 1.5 : 1), 0, 100);
  const r = roster(t.id).sort((a, b) => calcCA(b) - calcCA(a));
  const man = S.coach.a.man;
  const cushion = r.some((x) => hasArch(x, 'glue') && !x.inj) ? 0.7 : 1;
  r.forEach((p, i) => {
    const b = res.box[p.id];
    const mins = b ? b.min : 0;
    if (p.inj) return;
    const expected = i < 5 ? 26 : i < 8 ? 14 : 0;
    const sens = (1 + (p.hid.ego - 10) * 0.06) * (1.25 - p.hid.prof / 40) * (1.25 - man / 40) * cushion;
    if (expected && mins < expected * 0.5) p.morale = clamp(p.morale - (i < 5 ? 5 : 3) * sens, 0, 100);
    else if (mins >= expected) p.morale = clamp(p.morale + 1, 0, 100);
    if (S.promises[p.id] && S.promises[p.id] > 0) {
      S.promises[p.id]--;
      if (mins >= 20) { delete S.promises[p.id]; S.coach.pcoach = clamp((S.coach.pcoach ?? 10) + 0.5, 1, 20); }
      else if (S.promises[p.id] === 0) { delete S.promises[p.id]; S.coach.pcoach = clamp((S.coach.pcoach ?? 10) - 1, 1, 20); p.morale = clamp(p.morale - 25, 0, 100); mail(pname(p), 'You broke your promise', `Coach, you told me I'd get more minutes. That hasn't happened. I'm really disappointed.`, { type: 'player', pid: p.id }); }
    }
    if (p.morale < 28 && !p._complained && expected > 0) {
      p._complained = true;
      mail(pname(p), 'Unhappy with playing time', `Coach,\n\nI'm not happy with my role. I believe I should be playing far more minutes than I am. I want to know where I stand.`, { type: 'player', pid: p.id, actions: [{ act: 'promise', label: 'Promise more minutes' }, { act: 'earn', label: 'Tell him to earn it' }] });
    }
  });
  if (res.ot && won) mail('Assistant Coach', `Overtime thriller vs ${opp.nick}`, `What a game coach! We got it done in ${res.ot > 1 ? res.ot + ' overtimes' : 'overtime'}. The players are buzzing.`, { type: 'staff' });
  const played = t.w + t.l;
  const total = (lgTeams(t.lg).length - 1) * S.cycles;
  if (f.type === 'reg' && played > 0 && played % 8 === 0) {
    const c = S.board.conf;
    const mood = c >= 75 ? 'delighted with' : c >= 55 ? 'pleased with' : c >= 35 ? 'concerned about' : 'very unhappy with';
    mail('Board of Directors', 'Board update', `${S.coach.name},\n\nAfter ${played} games we sit <b>${ordinal(teamRank(t.id))}</b> with a ${t.w}-${t.l} record. The board is ${mood} the team's progress.\n\nExpectation: <b>${S.board.exp.txt}</b>\nBoard confidence: <b>${Math.round(c)}%</b>`, { type: 'board' });
  }
  if (f.type === 'reg' && S.board.conf < diffCfg().sackMid && played >= total * 0.4) sackCoach('The board has lost all confidence in your ability to turn this season around.');
}

function sackCoach(reason) {
  const t = userTeam();
  S.coach.hist.unshift({ season: S.season, club: teamName(t), lg: league(t.lg).short, rec: `${t.w}-${t.l}`, note: 'Sacked' });
  S.coach.rep = clamp(S.coach.rep - 1.5, 1, 20);
  S.prevPhase = S.phase;
  S.phase = 'sacked';
  S.sackOffers = [];
  mail('Board of Directors', 'Your contract has been terminated', `${S.coach.name},\n\n${reason}\n\nWe thank you for your efforts and wish you well.`, { type: 'board' });
}

/* ---------- League state & playoffs ---------- */
const ROUND_NAMES = { 1: 'Quarter-Finals', 2: 'Semi-Finals', 3: 'Finals' };
function bestOf(round) { return round === 3 ? 5 : 3; }
function seriesDone(s) { const need = Math.ceil(s.bestOf / 2); return s.wa >= need || s.wb >= need; }
function seriesWinner(s) { const need = Math.ceil(s.bestOf / 2); return s.wa >= need ? s.a : s.wb >= need ? s.b : null; }
function checkLeagues() {
  for (const lg of S.leagues) {
    if (S.schedule.some((f) => f.lg === lg.id && !f.played)) continue;
    if (lg.state === 'regular') startPlayoffs(lg);
    else if (lg.state === 'playoffs') progressPlayoffs(lg);
  }
}
function startPlayoffs(lg) {
  const st = standings(lg.id);
  lg.final = st.map((t) => t.id);
  const n = poQualifiers(st.length);
  const seeds = st.slice(0, n).map((t) => t.id);
  const round = n === 8 ? 1 : n === 4 ? 2 : 3;
  lg.state = 'playoffs';
  lg.po = { seeds, round, series: [], champion: null };
  const pairs = n === 8 ? [[0, 7], [3, 4], [1, 6], [2, 5]] : n === 4 ? [[0, 3], [1, 2]] : [[0, 1]];
  pairs.forEach(([x, y], i) => lg.po.series.push({ id: i + 1, round, slot: i, a: seeds[x], b: seeds[y], wa: 0, wb: 0, bestOf: bestOf(round) }));
  scheduleSeriesGames(lg, S.day + 3);
  if (lg.id === userTeam().lg) {
    const inIt = seeds.includes(S.userTeam), seed = seeds.indexOf(S.userTeam) + 1;
    let extra = '';
    if (promotionLeague(lg)) extra = `\n\n${lg.final.slice(0, 2).includes(S.userTeam) ? '<b>We have won promotion!</b> ' : ''}The top 2 are promoted.`;
    if (relegationLeague(lg) && lg.final.slice(-2).includes(S.userTeam)) extra = '\n\n<b>We have been relegated.</b> A dark day for the club.';
    mail('League Office', inIt ? `Playoffs: we're in as the #${seed} seed!` : 'Regular season over — no playoffs',
      (inIt ? `The ${userTeam().nick} have qualified for the ${lg.name} playoffs as the <b>#${seed} seed</b>.` : `We finished ${ordinal(teamRank(S.userTeam))} and missed the playoffs. Hit Continue to follow the rest of the season.`) + extra, { type: 'league' });
  }
}
function scheduleSeriesGames(lg, day) {
  for (const s of lg.po.series.filter((x) => x.round === lg.po.round && !seriesDone(x))) {
    const g = s.wa + s.wb + 1, homeA = g % 2 === 1;
    S.schedule.push({ id: S.nextFx++, lg: lg.id, day, h: homeA ? s.a : s.b, a: homeA ? s.b : s.a, played: false, type: 'po', series: s.id, game: g });
  }
}
function progressPlayoffs(lg) {
  const P = lg.po;
  const cur = P.series.filter((s) => s.round === P.round);
  const mine = lg.id === userTeam().lg;
  for (const s of cur) {
    if (seriesDone(s) && !s.reported) {
      s.reported = true;
      const w = seriesWinner(s), l = w === s.a ? s.b : s.a;
      if (mine && (w === S.userTeam || l === S.userTeam)) {
        const won = w === S.userTeam;
        S.board.conf = clamp(S.board.conf + (won ? 6 : -2), 0, 100);
        mail('League Office', won ? `${ROUND_NAMES[s.round]}: we advance!` : `Eliminated in the ${ROUND_NAMES[s.round]}`,
          won ? `The ${team(w).nick} beat the ${team(l).nick} ${Math.max(s.wa, s.wb)}-${Math.min(s.wa, s.wb)}.` : `The ${team(w).nick} knocked us out ${Math.max(s.wa, s.wb)}-${Math.min(s.wa, s.wb)}. We go again next season.`, { type: 'league' });
      }
    }
  }
  if (cur.every(seriesDone)) {
    if (P.round === 3) {
      P.champion = seriesWinner(cur[0]);
      lg.state = 'done';
      if (mine) mail('League Office', `${teamName(team(P.champion))} win the ${lg.name}!`, P.champion === S.userTeam ? '🏆 <b>WE ARE CHAMPIONS!</b> What a season, coach!' : `The ${teamName(team(P.champion))} are the ${S.season}/${String(S.season + 1).slice(2)} ${lg.name} champions.`, { type: 'league' });
      return;
    }
    const winners = cur.sort((a, b) => a.slot - b.slot).map(seriesWinner);
    P.round++;
    for (let i = 0; i < winners.length; i += 2) {
      const [x, y] = [winners[i], winners[i + 1]].sort((m, n) => P.seeds.indexOf(m) - P.seeds.indexOf(n));
      P.series.push({ id: P.series.length + 1, round: P.round, slot: i / 2, a: x, b: y, wa: 0, wb: 0, bestOf: bestOf(P.round) });
    }
    scheduleSeriesGames(lg, S.day + 3);
  } else scheduleSeriesGames(lg, S.day + 2);
}

/* ---------- Season end ---------- */
function seasonScore(p) {
  const s = p.st; if (!s.gp) return 0;
  const t = team(p.team); const wp = t ? t.w / Math.max(1, t.w + t.l) : 0.3;
  const gpt = t ? (lgTeams(t.lg).length - 1) * S.cycles : 30;
  return (s.pts + 1.2 * s.reb + 1.5 * s.ast + 2 * s.stl + 2 * s.blk - s.tov) / s.gp * (0.75 + wp * 0.5) * Math.min(1, s.gp / (gpt * 0.6));
}
function userAchievement() {
  const lg = userLeague(), id = S.userTeam;
  let L = 1;
  if (lg.po) {
    if (lg.po.champion === id) L = 5;
    else if (lg.po.series.some((s) => s.round === 3 && (s.a === id || s.b === id))) L = 4;
    else if (lg.po.series.some((s) => s.round === 2 && (s.a === id || s.b === id))) L = 3;
    else if (lg.po.seeds.includes(id)) L = 2;
  }
  const promoted = promotionLeague(lg) && lg.final.slice(0, 2).includes(id);
  const relegated = relegationLeague(lg) && lg.final.slice(-2).includes(id);
  if (relegated) L = 0;
  return { L, promoted, relegated, score: promoted ? Math.max(L, 4.5) : L };
}
function endSeason() {
  S.phase = 'offseason';
  const summary = [];
  for (const lg of S.leagues) {
    const champ = lg.po ? lg.po.champion : standings(lg.id)[0].id;
    const ps = Object.values(S.players).filter((p) => p.team != null && team(p.team).lg === lg.id && p.st.gp > 0);
    const mvp = ps.slice().sort((a, b) => seasonScore(b) - seasonScore(a))[0];
    S.history.unshift({ season: S.season, lg: lg.id, champ, champName: teamName(team(champ)), mvp: mvp ? pname(mvp) : '-', mvpId: mvp?.id });
    if (mvp) mvp.awards.push({ s: S.season, k: 'MVP', lg: lg.short });
    roster(champ).forEach((p) => p.awards.push({ s: S.season, k: 'Champion', lg: lg.short }));
    summary.push(`${COUNTRY_FLAG[lg.country] || ''} <b>${lg.name}</b>: ${teamName(team(champ))}${mvp ? ` · MVP ${plink(mvp, 1)}` : ''}`);
  }
  if (S.history.length > 140) S.history.length = 140;
  mail('League Office', 'Around the basketball world', `Champions of the ${S.season}/${String(S.season + 1).slice(2)} season:\n\n${summary.join('\n')}`, { type: 'league' });

  const t = userTeam(), lg = league(t.lg);
  const ach = userAchievement();
  const diff = ach.score - S.board.exp.target;
  S.board.conf = clamp(S.board.conf + clamp(diff, -3, 2) * 11 * (diff < 0 ? diffCfg().loss : diffCfg().gain) - (ach.relegated ? 15 : 0), 0, 100);
  if (ach.L === 5) S.coach.titles++;
  const note = ach.L === 5 ? 'Champions' : ach.promoted ? 'Promoted' : ach.relegated ? 'Relegated' : ach.L === 4 ? 'Finalists' : ach.L === 3 ? 'Semi-finals' : ach.L === 2 ? 'Playoffs' : '';
  S.coach.hist.unshift({ season: S.season, club: teamName(t), lg: lg.short, rec: `${t.w}-${t.l}`, finish: ordinal(teamRank(t.id)), note });
  coachProgress(diff, ach);
  let verdict;
  if (S.board.conf < diffCfg().sackEnd) verdict = 'The board has decided to terminate your contract. Results have fallen well short of expectations.';
  else if (diff >= 1) verdict = 'The board is thrilled. You exceeded our expectations this season. Your wage budget will be increased.';
  else if (diff > -0.6) verdict = 'The board is satisfied — you met our expectations this season.';
  else verdict = 'The board is disappointed. We expected more. Next season must be better.';
  if (diff >= 1) t.budget = Math.round(t.budget * 1.08 * 10) / 10;
  mail('Board of Directors', 'End of season review', `${S.coach.name},\n\nExpectation: <b>${S.board.exp.txt}</b>\nFinal standing: <b>${ordinal(teamRank(S.userTeam))}</b> (${t.w}-${t.l})${note ? ` · ${note}` : ''}\n\n${verdict}\n\nYour reputation: <b>${repLabel(S.coach.rep)}</b> (${Math.round(S.coach.rep)}/20)`, { type: 'board' });
  S.vacancies = marketSeasonEnd(); S.applied = []; S.rumoured = [];
  achSeasonEnd(ach);
  if (S.board.conf < diffCfg().sackEnd) { sackCoach('Results have fallen well short of expectations.'); S.prevPhase = 'offseason'; return; }
  if (diff >= 0.5 || ach.L >= 4) {
    const up = S.teams.filter((x) => x.id !== S.userTeam && x.prestige > t.prestige && x.prestige <= S.coach.rep + 3);
    R.shuffle(up).slice(0, diff >= 1 ? 2 : 1).forEach((x) => {
      mail(`${x.nick} Chairman`, `Job offer: ${teamName(x)}`, `Dear ${S.coach.name},\n\nYour work at ${teamName(t)} has not gone unnoticed. The board of the <b>${teamName(x)}</b> (${league(x.lg).name}) would like you to become our next head coach.\n\nWage budget on offer: ${fmtMoney(x.budget)}.`,
        { type: 'job', job: x.id, actions: [{ act: 'acceptJob', label: 'Accept job' }, { act: 'reject', label: 'Decline' }] });
    });
  }
  if (S.vacancies.length) mail('Your Agent', 'Summer job market', `${S.vacancies.length} head coaching jobs have opened up around the world. Check <b>More → Job Centre</b> if you fancy a new challenge.`, { type: 'whisper' });
  for (const p of roster(S.userTeam)) {
    if (p.contract.yrs <= 1) mail(pname(p), 'Contract expiring', `Coach, my contract is up. I'd like to know if you see me as part of the future here.\n\nIf you don't offer a new deal, I'll leave as a free agent when the new season starts.`, { type: 'player', pid: p.id, actions: [{ act: 'renew', label: 'Offer new contract' }] });
  }
  mail('Assistant Coach', 'Off-season', `Season's done, coach. Sort out expiring contracts, check the Job Centre if you're curious, then hit <b>Continue</b> to start the new season.\n\nWhen it starts: players age and develop, veterans retire, promoted and relegated clubs swap divisions, and young free agents hit the Market.`, { type: 'staff' });
}
function coachProgress(diff, ach) {
  const c = S.coach;
  for (const at of COACH_ATTRS) {
    let g = 0.15 + R.gauss() * 0.25 + (c.a.det - 10) * 0.01;
    if (diff > 0 && ['mot', 'man', 'tac', 'off', 'def'].includes(at.k)) g += 0.25;
    if (['ja', 'jp', 'ada'].includes(at.k)) g += 0.1;
    const v = (c.frac[at.k] || 0) + g;
    const whole = Math.trunc(v); c.frac[at.k] = v - whole;
    c.a[at.k] = clamp(c.a[at.k] + whole, 1, 20);
  }
  const tp = userTeam().prestige;
  const target = tp + diff * 1.5 + (ach.L === 5 ? 3 : 0) + (ach.promoted ? 2 : 0);
  c.rep = Math.round(clamp(c.rep + clamp((target - c.rep) * 0.35, -1.5, 3), 1, 20) * 10) / 10;
}

function jobChance(tid) { const t = team(tid); return clamp(0.5 + (S.coach.rep - t.prestige) * 0.15, 0.03, 0.95); }
function applyJob(tid) {
  if (S.applied.includes(tid)) return { ok: false, msg: 'You already applied there.' };
  S.applied.push(tid);
  const t = team(tid);
  if (R.chance(jobChance(tid))) {
    mail(`${t.nick} Chairman`, `Job offer: ${teamName(t)}`, `Dear ${S.coach.name},\n\nThank you for your interest. We were impressed and would like to offer you the head coach position at the <b>${teamName(t)}</b>.`, { type: 'job', job: tid, actions: [{ act: 'acceptJob', label: 'Accept job' }, { act: 'reject', label: 'Decline' }] });
    save();
    return { ok: true, msg: `${t.nick} want you! Check your inbox for the offer.` };
  }
  mail(`${t.nick} Chairman`, 'Application unsuccessful', `Dear ${S.coach.name},\n\nThank you for applying. We have decided to go with a candidate of greater standing.`, { type: 'job' });
  save();
  return { ok: false, msg: `${t.nick} turned you down. Your reputation (${repLabel(S.coach.rep)}) wasn't enough.` };
}
function takeNewJob(tid) {
  const old = userTeam();
  if (old && old.id !== tid) {
    if (S.phase !== 'sacked' && S.coach.hist[0]) S.coach.hist[0].note = (S.coach.hist[0].note ? S.coach.hist[0].note + ' · ' : '') + 'Moved on';
    S.userTeam = tid; autoRotation(S, old); old.coach = aiCoach(old);
  }
  S.userTeam = tid;
  const t = team(tid);
  t.instr = {}; cleanRotation(S, t);
  S.coach.joined = { season: S.season, day: S.day };
  ensureUserStaff();
  if (S.phase === 'sacked') unlock('comebackjob');
  achJob();
  if (S.phase === 'sacked') S.phase = S.prevPhase === 'season' ? 'season' : 'offseason';
  S.board.conf = 60;
  S.vacancies = S.vacancies.filter((x) => x !== tid);
  S.promises = {}; S.sackOffers = [];
  setBoardExpectations();
  revealKnown(roster(tid));
  mail('Board of Directors', `Welcome to ${teamName(t)}`, `Dear ${S.coach.name},\n\nWelcome to the ${teamName(t)} of the ${league(t.lg).name}.\n\nThe board's expectation: <b>${S.board.exp.txt}</b>\nWage budget: <b>${fmtMoney(t.budget)}</b>`, { type: 'board' });
  save();
}
function sackedOffers() {
  const rep = S.coach.rep;
  if (!S.sackOffers || !S.sackOffers.length) {
    let pool = S.teams.filter((t) => t.id !== S.userTeam && t.prestige <= rep + 1);
    if (pool.length < 3) pool = S.teams.filter((t) => t.id !== S.userTeam).sort((a, b) => a.prestige - b.prestige).slice(0, 8);
    S.sackOffers = R.shuffle(pool.sort((a, b) => b.prestige - a.prestige).slice(0, 10)).slice(0, 3).map((t) => t.id);
  }
  return S.sackOffers.map(team);
}

function startNewSeason() {
  for (const t1 of S.leagues.filter((l) => l.tier === 1)) {
    const t2 = S.leagues.find((l) => l.country === t1.country && l.tier === 2);
    if (!t2 || t1.final.length < 4 || t2.final.length < 4) continue;
    const down = t1.final.slice(-2), up = t2.final.slice(0, 2);
    down.forEach((id) => { const t = team(id); t.lg = t2.id; t.budget = Math.round(t.budget * 0.85 * 10) / 10; t.prestige = Math.max(1, t.prestige - 2); });
    up.forEach((id) => { const t = team(id); t.lg = t1.id; t.budget = Math.round(t.budget * 1.2 * 10) / 10; t.prestige = Math.min(20, t.prestige + 2); });
    if (down.includes(S.userTeam)) mail('Board of Directors', `Life in the ${t2.name}`, `Relegation hurts. The wage budget has been cut to ${fmtMoney(userTeam().budget)}. We need to bounce straight back.`, { type: 'board' });
    if (up.includes(S.userTeam)) mail('Board of Directors', `Welcome to the ${t1.name}!`, `Promotion! The board has increased your wage budget to ${fmtMoney(userTeam().budget)}. Time to prove we belong.`, { type: 'board' });
  }
  const retirees = [];
  const cdev = S.coach.a.dev;
  for (const p of Object.values(S.players)) {
    ensureTraits(p);
    logStint(p);
    p.age++;
    let g = seasonGrowth(p);
    const mine = p.team === S.userTeam;
    if (mine && g > 0) g *= 0.8 + cdev / 50;
    if (mine && S.training === 'youth') g += p.age <= 23 ? 0.25 : -0.15;
    growPlayer(p, g * ATTRS.length, mine ? S.training : 'balanced');
    const nca = calcCA(p);
    if (nca > p.pot) p.pot = Math.round(nca * 10) / 10;
    const over = p.age - p.peak;
    const retireP = p.age >= 35 ? 0.3 + (p.age - 35) * 0.2 + Math.max(0, over - 5) * 0.05 : over >= 3 ? (nca < 9 ? 0.25 : 0.04) : (p.age >= 29 && nca < 6.5 && p.team == null ? 0.3 : 0);
    if (R.chance(retireP)) retirees.push(p);
  }
  for (const p of retirees) { handleRetirement(p); delete S.players[p.id]; }
  staffNewSeason();
  prunePlayerRivals();
  for (const p of Object.values(S.players)) {
    if (p.team == null) continue;
    p.contract.yrs--;
    if (p.contract.yrs <= 0) {
      if (p.team === S.userTeam) { dissolveDuo(p.id); p.team = null; p.contract = { sal: salaryFor(calcCA(p), p.age, p.pot), yrs: 0 }; continue; }
      const r = roster(p.team).sort((a, b) => calcCA(b) - calcCA(a));
      const ns = salaryFor(calcCA(p), p.age, p.pot);
      if (r.indexOf(p) < 10 && R.chance(0.65 + p.hid.loy * 0.015) && p.age < 34 && teamPayroll(p.team) - p.contract.sal + ns <= team(p.team).budget * 1.05) p.contract = { sal: ns, yrs: R.int(1, 4) };
      else { p.team = null; p.contract = { sal: ns, yrs: 0 }; }
    }
  }
  const nT = S.teams.length;
  for (let i = 0; i < Math.round(nT * 1.3); i++) {
    const p = genPlayer(S, R.f(6.5, 11.5), undefined, R.int(18, 21), null, R.pick(['USA', 'USA', 'ESP', 'ITA', 'GER']));
    p.pot = Math.round(clamp(calcCA(p) + R.f(1, 6.5), 0, 20) * 10) / 10;
    p.rookie = true;
    S.players[p.id] = p;
  }
  while (freeAgents().length < nT * 1.4) { const np = genPlayer(S, R.f(6, 10.5), undefined, R.int(23, 33), null, R.pick(['USA', 'ESP', 'ITA', 'GER'])); S.players[np.id] = np; }
  for (const p of freeAgents()) { p.contract.sal = salaryFor(calcCA(p), p.age, p.pot); p.wantsOut = false; }
  freeAgents().sort((a, b) => playerValue(b) - playerValue(a)).slice(nT * 2).forEach((p) => delete S.players[p.id]);
  S.season++; S.day = 0; S.phase = 'season';
  S.leagues.forEach((l) => { l.state = 'regular'; l.po = null; l.final = []; });
  for (const t of S.teams) { t.w = t.l = t.pf = t.pa = t.streak = 0; if (t.id !== S.userTeam) t.budget = Math.round(t.budget * 1.03 * 10) / 10; }
  for (const p of Object.values(S.players)) { p.st = emptyStats(); p.pst = null; p.cond = 100; p.techs = 0; p.susp = Math.min(p.susp || 0, 1); p.morale = clamp(p.morale * 0.5 + 32, 0, 100); p._complained = false; p.form = []; if (p.inj && p.inj.days > 30) p.inj.days -= 30; else p.inj = null; }
  marketNewSeason();
  ensureRosters(true);
  for (let i = 0; freeAgents().length < 70 && i < 200; i++) { const np = genPlayer(S, R.f(6, 11), undefined, R.int(20, 32), null, R.pick(['USA', 'ESP', 'ITA', 'GER'])); S.players[np.id] = np; }
  S.teams.forEach((t) => { if (t.id !== S.userTeam) autoRotation(S, t); else cleanRotation(S, t); });
  S.schedule = buildAllSchedules();
  S.vacancies = []; S.applied = []; S.sackOffers = [];
  checkDuos();
  setBoardExpectations();
  S.board.conf = clamp(S.board.conf * 0.6 + 28, 0, 100);
  revealKnown(roster(S.userTeam));
  const lg = userLeague();
  mail('Board of Directors', `${S.season}/${String(S.season + 1).slice(2)} season objectives`, `${S.coach.name},\n\nA new ${lg.name} season begins. The board's expectation:\n\n<b>${S.board.exp.txt}</b>\n\nWage budget: <b>${fmtMoney(userTeam().budget)}</b> · Payroll: ${fmtMoney(teamPayroll(S.userTeam))}`, { type: 'board' });
  const jp = S.coach.a.jp;
  const topRook = freeAgents().filter((p) => p.rookie).sort((a, b) => (b.pot + R.gauss() * (20 - jp) * 0.12) - (a.pot + R.gauss() * (20 - jp) * 0.12)).slice(0, 3);
  if (topRook.length) mail('Chief Scout', 'Young free agents to watch', `Coach, a new class of young players has entered free agency. My picks:\n\n${topRook.map((p) => `• ${plink(p)} — ${p.pos}, age ${p.age}`).join('\n')}\n\nFind them in the Market.`, { type: 'staff' });
}

function ensureRosters(offseason) {
  for (const t of S.teams) {
    if (t.id === S.userTeam) {
      const r = roster(t.id);
      if (r.length < 8) {
        const need = 8 - r.length;
        const cheap = freeAgents().sort((a, b) => a.contract.sal - b.contract.sal || calcCA(b) - calcCA(a)).slice(0, 12).sort((a, b) => calcCA(b) - calcCA(a)).slice(0, need);
        cheap.forEach((p) => { p.team = t.id; p.contract.yrs = 1; p.contract.sal = Math.min(p.contract.sal, 0.5); });
        if (cheap.length) mail('Assistant Coach', 'Emergency signings', `Coach, we didn't have enough bodies, so the league assigned us: ${cheap.map((p) => plink(p)).join(', ')} on 1-year minimum deals.`, { type: 'staff' });
        cleanRotation(S, t);
      }
      continue;
    }
    let r = roster(t.id);
    const target = offseason ? (lgTeams(t.lg).length >= 14 ? 13 : 12) : ROSTER_MIN;
    let guard = 0;
    while (r.length < target && guard++ < 20) {
      const room = t.budget - teamPayroll(t.id);
      const need = POS.find((p) => r.filter((x) => x.pos === p).length < 2);
      let cands = freeAgents().filter((p) => p.contract.sal <= Math.max(room, 0.6));
      if (!cands.length) cands = freeAgents().sort((x, y) => x.contract.sal - y.contract.sal).slice(0, 4);
      if (!cands.length || (offseason && calcCA(cands.slice().sort((x, y) => playerValue(y) - playerValue(x))[0]) < leagueLevel(t.lg) - 2.5)) { const np = genPlayer(S, leagueLevel(t.lg) - 1.4 + R.gauss() * 0.8, need, undefined, null, league(t.lg).country); np.contract.sal = salaryFor(calcCA(np), np.age, np.pot); S.players[np.id] = np; cands = [np]; }
      const pick = cands.sort((a, b) => (playerValue(b) + (b.pos === need ? 2 : 0)) - (playerValue(a) + (a.pos === need ? 2 : 0)))[0];
      pick.team = t.id; pick.contract.yrs = R.int(1, 3); pick.rookie = false; pick.wantsOut = false;
      logSigning(pick, t, pick.contract.sal, pick.contract.yrs);
      r = roster(t.id);
    }
    while (r.length > ROSTER_MAX) {
      const worst = r.sort((a, b) => playerValue(a) - playerValue(b))[0];
      logStint(worst);
      worst.team = null; worst.contract.yrs = 0;
      r = roster(t.id);
    }
  }
}

/* ---------- Transfers ---------- */
function packageValue(players) { const v = players.map(playerValue).sort((a, b) => b - a); return v.reduce((s, x, i) => s + x * (i === 0 ? 1 : 0.45), 0); }
function moveRefusal(p, toTeamId) {
  const from = p.team != null ? team(p.team) : null, to = team(toTeamId);
  if (from && p.hid.amb >= 13 && to.prestige < from.prestige - 3) return `${pname(p)} has no interest in dropping down to the ${league(to.lg).name}.`;
  if (!from && p.hid.amb >= 13 && calcCA(p) > leagueLevel(to.lg) + 2.3) return `${pname(p)}'s agent: "He's aiming higher than the ${league(to.lg).name}."`;
  return null;
}
function tradeInterest(targetId, offerIds) {
  const tgt = S.players[targetId];
  const offer = offerIds.map((id) => S.players[id]);
  if (!offer.length) return 0;
  return packageValue(offer) / (playerValue(tgt) * (tgt.wantsOut || tgt.listed ? 0.85 : 1.1) * diffCfg().trade);
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
function proposeTrade(targetId, offerIds, duoTalked) {
  const chk = tradeCheck(targetId, offerIds);
  if (!chk.ok) return chk;
  const tgt = S.players[targetId];
  const t = team(tgt.team);
  if (S.phase === 'season' && deadlinePassed()) return { ok: false, msg: 'The trade window is closed. Trades reopen in the off-season.' };
  const refuse = moveRefusal(tgt, S.userTeam);
  if (refuse) { if (!tgt.known.includes('amb')) tgt.known.push('amb'); return { ok: false, msg: refuse }; }
  const interest = tradeInterest(targetId, offerIds);
  if (interest >= 1) {
    executeTrade(tgt.team, [targetId], offerIds, duoTalked);
    mail(`${t.nick} GM`, `Trade completed: ${pname(tgt)}`, `We have a deal. ${plink(tgt)} heads to the ${userTeam().nick}; ${offerIds.map((id) => pname(S.players[id])).join(', ')} join${offerIds.length > 1 ? '' : 's'} us.`, { type: 'transfer', read: true });
    return { ok: true, msg: `Trade accepted! ${pname(tgt)} has joined your team.` };
  }
  const txt = interest > 0.8 ? "We're close, but we need a bit more value." : interest > 0.5 ? "That's not enough for a player of his quality." : "Not interested. That offer isn't even close.";
  return { ok: false, msg: `${t.nick} GM: “${txt}”` };
}
function executeTrade(otherTeamId, incoming, outgoing, duoTalked) {
  rivalsOnTrade(otherTeamId, incoming, outgoing);
  incoming.concat(outgoing).forEach((id) => logStint(S.players[id]));
  logTrade(userTeam(), team(otherTeamId), incoming, outgoing);
  onUserTradeOut(outgoing, otherTeamId);
  incoming.forEach((id) => { S.players[id].listed = false; S.players[id].unsettled = false; });
  outgoing.forEach((id) => dissolveDuo(id, duoTalked));
  incoming.forEach((id) => { const p = S.players[id]; p.team = S.userTeam; p.morale = 65; p.wantsOut = false; });
  outgoing.forEach((id) => { S.players[id].team = otherTeamId; });
  cleanRotation(S, userTeam());
  autoRotation(S, team(otherTeamId));
  revealKnown(incoming.map((id) => S.players[id]));
}
function aiTradeOffer() {
  const mine = roster(S.userTeam).sort((a, b) => playerValue(b) - playerValue(a));
  if (mine.length < 9) return;
  const target = R.pick(mine.slice(1, 9));
  const lg = userTeam().lg;
  const others = S.teams.filter((t) => t.id !== S.userTeam && (t.lg === lg || R.chance(0.3)));
  const t = R.pick(others);
  if (!t) return;
  const tv = playerValue(target);
  let best = null, bd = 1e9;
  for (const p of roster(t.id)) { const d = Math.abs(playerValue(p) - tv * R.f(0.95, 1.15)); if (d < bd) { bd = d; best = p; } }
  if (!best || playerValue(best) < tv * 0.85) return;
  S.tradeCooldown = 10;
  mail(`${t.nick} GM`, `Trade proposal: ${pname(target)}`, `Hi ${S.coach.name},\n\nThe ${teamName(t)} (${league(t.lg).short}) would like to acquire ${plink(target)} (${target.pos}, ${target.age}).\n\nIn exchange we'd send ${plink(best)} (${best.pos}, ${best.age}, ${fmtMoney(best.contract.sal)}/yr).\n\nLet us know.`,
    { type: 'transfer', actions: [{ act: 'acceptTrade', label: 'Accept trade' }, { act: 'reject', label: 'Reject' }], trade: { team: t.id, give: [target.id], get: [best.id] } });
}
function askingSalary(p) {
  const base = salaryFor(calcCA(p), p.age, p.pot);
  const mine = p.team === S.userTeam;
  const f = (p.morale < 40 ? 1.15 : 1) * (mine ? 1.12 - p.hid.loy * 0.012 : 1) * (1 + (p.hid.amb - 10) * 0.01);
  return Math.round(base * f * 100) / 100;
}
function signFreeAgent(pid, years) {
  const p = S.players[pid];
  const ut = userTeam();
  if (p.team != null) return { ok: false, msg: 'Player is not a free agent.' };
  if (roster(ut.id).length >= ROSTER_MAX) return { ok: false, msg: `Your roster is full (${ROSTER_MAX}). Release someone first.` };
  if (userLeague().state === 'playoffs') return { ok: false, msg: 'Free agent signings are closed during the playoffs.' };
  const refuse = moveRefusal(p, ut.id);
  if (refuse) { if (!p.known.includes('amb')) p.known.push('amb'); return { ok: false, msg: refuse }; }
  const sal = askingSalary(p);
  if (teamPayroll(ut.id) + sal > ut.budget) return { ok: false, msg: `Not enough wage budget. You have ${fmtMoney(Math.max(0, ut.budget - teamPayroll(ut.id)))} available.` };
  p.team = ut.id; p.contract = { sal, yrs: years + (S.phase === 'offseason' ? 1 : 0) }; p.morale = 70; p.rookie = false;
  logSigning(p, ut, sal, years);
  if (stars(calcCA(p)) >= 5) unlock('bigfish');
  cleanRotation(S, ut);
  revealKnown([p]);
  return { ok: true, msg: `${pname(p)} signed for ${fmtMoney(sal)}/yr over ${years} year${years > 1 ? 's' : ''}.` };
}
function renewContract(pid, years) {
  const p = S.players[pid];
  const ut = userTeam();
  const sal = askingSalary(p);
  if (p.morale < 25 && p.hid.loy < 15) return { ok: false, msg: `${pname(p)} is too unhappy to discuss a new deal.` };
  if (p.hid.amb >= 15 && calcCA(p) > leagueLevel(ut.lg) + 2.5) { p.wantsOut = true; if (!p.known.includes('amb')) p.known.push('amb'); return { ok: false, msg: `${pname(p)} wants to test himself at a higher level. He won't sign.` }; }
  if (teamPayroll(ut.id) - p.contract.sal + sal > ut.budget && sal > p.contract.sal) return { ok: false, msg: `A ${fmtMoney(sal)}/yr deal would take you over budget.` };
  p.contract = { sal, yrs: years + 1 };
  p.morale = clamp(p.morale + 10, 0, 100);
  return { ok: true, msg: `${pname(p)} signed a new ${years}-year deal at ${fmtMoney(sal)}/yr.` };
}
function releasePlayer(pid) {
  const p = S.players[pid];
  if (roster(S.userTeam).length <= 8) return { ok: false, msg: 'You need at least 8 players.' };
  logStint(p);
  dissolveDuo(p.id);
  p.listed = false; p.unsettled = false; S.interest = (S.interest || []).filter((i) => i.pid !== p.id);
  p.team = null; p.contract.yrs = 0;
  cleanRotation(S, userTeam());
  return { ok: true, msg: `${pname(p)} has been released.` };
}

/* ---------- Full-time talk ---------- */
function fullTimeTalk(tone) {
  const r = S.lastResult;
  if (!r || r.talked) return [];
  r.talked = true;
  const us = r.h === S.userTeam;
  const diff = us ? r.hs - r.as : r.as - r.hs;
  const fav = teamStrength(S.userTeam) - teamStrength(us ? r.a : r.h);
  const ctx = { diff, fav, late: true, pre: false, imp: 0 };
  const out = [];
  for (const p of roster(S.userTeam)) {
    if (!r.box[p.id]) continue;
    let b = toneBase(tone, ctx, p);
    if (b > 0) b += (S.coach.a.mot - 10) * 0.025; else b *= 1.2 - S.coach.a.man / 40;
    const d = clamp((b + R.gauss() * 0.15) * (0.5 + p.hid.coach / 22), -0.8, 0.8);
    p.morale = clamp(p.morale + d * 14, 0, 100);
    const [label, cls] = reactionLabel(tone, d, ctx, p);
    out.push({ p, d, label, cls });
  }
  save();
  return out.sort((a, b) => Math.abs(b.d) - Math.abs(a.d));
}

/* ---------- Mail actions ---------- */
function mailAction(mid, act) {
  const m = S.inbox.find((x) => x.id === mid);
  if (!m || m.done) return { msg: 'Already handled.' };
  const p = m.pid ? S.players[m.pid] : null;
  let msg = '';
  if (act === 'promise' && p) { p.morale = clamp(p.morale + 18, 0, 100); S.promises[p.id] = 5; msg = `You promised ${pname(p)} more minutes. Make sure he gets 20+ minutes within the next 5 games.`; }
  else if (act === 'earn' && p) { p.morale = clamp(p.morale - 8, 0, 100); if (p.hid.prof >= 13 || p.a.wrk >= 14) { p.morale += 12; msg = `${pname(p)} accepts the challenge and vows to work harder.`; } else msg = `${pname(p)} is not happy with your response.`; }
  else if (act === 'acceptTrade') {
    const tr = m.trade;
    const valid = tr.give.every((id) => S.players[id]?.team === S.userTeam) && tr.get.every((id) => S.players[id]?.team === tr.team);
    if (!valid) msg = 'This offer is no longer valid.';
    else if (roster(tr.team).length - tr.get.length + tr.give.length > ROSTER_MAX) msg = 'They no longer have roster space.';
    else if (roster(S.userTeam).length - tr.give.length + tr.get.length < 8) msg = 'You need at least 8 players.';
    else if (userLeague().state === 'playoffs') msg = 'Trades are closed.';
    else { executeTrade(tr.team, tr.get, tr.give, m.duoTalked); msg = 'Trade completed!'; }
  } else if (act === 'acceptJob') {
    if (S.phase === 'season') msg = 'You can only switch clubs in the off-season.';
    else { m.done = `You took the ${teamName(team(m.job))} job.`; takeNewJob(m.job); return { msg: m.done, job: true }; }
  } else if (act === 'hireStaff') msg = hireStaff(m.staffId);
  else if (act === 'retireNum') msg = retireNumber(m.retire);
  else if (['letTalk', 'promiseMove', 'notForSale', 'acceptReq', 'rejectReq'].includes(act)) msg = marketMailAction(m, act);
  else if (act === 'reject') { msg = 'Declined.'; if (m.trade) onOfferRejected(m); }
  else if (act === 'renew') return { renew: m.pid };
  m.done = msg || true;
  save();
  return { msg };
}

/* ---------- Save / load ---------- */
function save() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(S)); } catch (e) { console.warn('save failed', e); } }
function load() {
  try { const s = localStorage.getItem(SAVE_KEY); if (s) { const o = JSON.parse(s); if (o.v >= 2) { S = migrateSave(o); save(); return true; } } } catch (e) { console.warn(e); }
  return false;
}
function sanitizeSave(o) {
  o.coach.name = clean(o.coach.name, 28);
  for (const l of o.leagues) { l.name = clean(l.name); l.short = clean(l.short, 6); }
  for (const t of o.teams) { t.city = clean(t.city, 24); t.nick = clean(t.nick, 24); t.abbr = clean(t.abbr, 4); if (!/^#[0-9a-f]{6}$/i.test(t.c1)) t.c1 = '#1f6feb'; if (!/^#[0-9a-f]{6}$/i.test(t.c2)) t.c2 = '#ffffff'; }
  for (const p of Object.values(o.players)) { p.first = clean(p.first, 20); p.last = clean(p.last, 24); }
  for (const m of o.inbox || []) { m.from = clean(m.from); m.subject = clean(m.subject, 80); m.body = String(m.body || '').replace(/<(?!\/?(b|i)>|br>)[^>]*>/gi, ''); }
  for (const h of o.history || []) { h.champName = clean(h.champName, 60); h.mvp = clean(h.mvp, 50); }
  for (const h of o.coach.hist || []) { h.club = clean(h.club, 60); h.lg = clean(h.lg, 8); }
  for (const st of o.staff || []) { st.first = clean(st.first, 20); st.last = clean(st.last, 24); }
  for (const p of Object.values(o.players)) for (const c of p.career || []) { c.club = clean(c.club, 60); c.t = clean(c.t, 4); }
  return o;
}
function hasSave() { try { return !!localStorage.getItem(SAVE_KEY); } catch (e) { return false; } }
function deleteSave() { try { localStorage.removeItem(SAVE_KEY); } catch (e) {} S = null; }
