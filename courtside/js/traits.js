/* Courtside Manager — traits, archetypes, aging, bios, career logs, Dynamic Duos, staff */
'use strict';

/* ---------- Traits & archetypes ---------- */
function genArchetypes(p) {
  const h = p.hid, a = [];
  if (R.chance(0.07)) a.push('fast'); else if (R.chance(0.06)) a.push('slow');
  if (h.injp >= 16) a.push('injury');
  else if ((h.injp <= 4 && h.nfit >= 13) || R.chance(0.02)) { a.push('iron'); h.injp = Math.min(h.injp, 5); }
  if (p.a.ldr >= 12 && h.prof >= 12 && h.ego <= 10 && R.chance(0.45)) a.push('glue');
  return a;
}
function ensureTraits(p) {
  ensureHidden(p);
  if (!p.arch) p.arch = genArchetypes(p);
  if (p.peak == null) {
    p.peak = Math.round(clamp(29 + (p.hid.nfit - 10) * 0.25 + R.gauss() * 1.2, 27, 34));
    p.decl = Math.round(clamp(1 + (10 - p.hid.nfit) * 0.04 + R.gauss() * 0.2, 0.5, 1.6) * 100) / 100;
  }
  if (!p.awards) p.awards = [];
  if (p.susp == null) p.susp = 0;
  if (p.techs == null) p.techs = 0;
  p.career = (p.career || []).map(normCareer);
  return p;
}
const hasArch = (p, k) => !!(p.arch && p.arch.includes(k));
function teamsWithGlue() {
  const s = new Set();
  for (const p of Object.values(S.players)) if (p.team != null && hasArch(p, 'glue')) s.add(p.team);
  return s;
}
// development multiplier from archetypes, mentoring and staff
function devMult(p, glueSet) {
  let m = hasArch(p, 'fast') ? 1.5 : hasArch(p, 'slow') ? 0.6 : 1;
  if (p.age <= 22 && glueSet && glueSet.has(p.team) && !hasArch(p, 'glue')) m *= 1.15;
  if (p.team === S.userTeam && p.age <= 23) { const y = userStaff('youth'); if (y) m *= 0.9 + y.a.youth / 100; }
  return m;
}
function injuryMult(p) {
  let m = hasArch(p, 'injury') ? 1.6 : hasArch(p, 'iron') ? 0.3 : 1;
  m *= 1.15 - p.hid.nfit / 70;
  if (p.team === S.userTeam) { const f = userStaff('fitness'); if (f) m *= 1.1 - f.a.fitness / 100; }
  return m;
}
// yearly change in ability (attribute points spread over all attributes) — individual aging curves
function seasonGrowth(p) {
  const ca = calcCA(p);
  let g;
  if (p.age <= 20) g = (p.pot - ca) * R.f(0.25, 0.5);
  else if (p.age <= 23) g = (p.pot - ca) * R.f(0.15, 0.4);
  else if (p.age <= 26) g = (p.pot - ca) * R.f(0.05, 0.3);
  else if (p.age <= p.peak) g = R.f(-0.15, 0.2);
  else {
    const yrs = p.age - p.peak;
    g = -R.f(0.25, 0.7) * p.decl * (1 + yrs * 0.22) * (1.3 - p.hid.prof / 40) * (1.2 - p.hid.nfit / 50);
  }
  g *= 0.8 + p.a.wrk / 50;
  if (g > 0) g *= (0.7 + p.hid.prof / 35) * devMult(p);
  return g;
}

/* ---------- Career logs (FM-style history) ---------- */
function normCareer(c) {
  return { s: c.s, tid: c.tid ?? null, club: c.club || c.t || '-', t: c.t || '-', c1: c.c1 || '#3a3f4d', c2: c.c2 || '#ffffff', lg: c.lg || '', gp: c.gp || 0, gs: c.gs || 0, min: c.min || 0,
    pts: c.pts || 0, reb: c.reb || 0, ast: c.ast || 0, stl: c.stl || 0, blk: c.blk || 0, rat: c.rat || 0, pgp: c.pgp || 0, ppts: c.ppts || 0, prat: c.prat || 0 };
}
function careerRow(p) {
  const t = p.team != null ? team(p.team) : null;
  const s = p.st, ps = p.pst || emptyStats();
  return { s: S.season, tid: p.team, club: t ? teamName(t) : 'Free Agent', t: t ? t.abbr : 'FA', c1: t ? t.c1 : '#3a3f4d', c2: t ? t.c2 : '#fff', lg: t ? league(t.lg).short : '',
    gp: s.gp, gs: s.gs, min: s.min, pts: s.pts, reb: s.reb, ast: s.ast, stl: s.stl, blk: s.blk, rat: s.rat, pgp: ps.gp, ppts: ps.pts, prat: ps.rat };
}
// close the current stint at a club (season end, trade, release)
function logStint(p) {
  if (p.team != null && (p.st.gp > 0 || (p.pst && p.pst.gp > 0))) {
    p.career.push(careerRow(p));
    if (p.career.length > 25) p.career.shift();
  }
  p.st = emptyStats(); p.pst = null; p.form = [];
}
function careerTotals(p, includeCurrent = true) {
  const rows = p.career.slice();
  if (includeCurrent && p.team != null && p.st.gp > 0) rows.push(careerRow(p));
  const t = { gp: 0, gs: 0, min: 0, pts: 0, reb: 0, ast: 0, stl: 0, blk: 0, rat: 0, pgp: 0, ppts: 0, prat: 0, seasons: new Set(rows.map((r) => r.s)).size };
  for (const r of rows) for (const k in t) if (k !== 'seasons') t[k] += r[k] || 0;
  t.clubs = [...new Set(rows.map((r) => r.club))];
  return t;
}

/* ---------- Bios ---------- */
function attrTop(p, n) { return ATTRS.filter((a) => !['wrk', 'ldr', 'sta', 'cmp'].includes(a.k)).sort((x, y) => p.a[y.k] - p.a[x.k]).slice(0, n).map((a) => a.k); }
const joinList = (arr) => arr.length <= 1 ? (arr[0] || '') : arr.slice(0, -1).join(', ') + ' and ' + arr[arr.length - 1];
function playerBio(p, o = {}) {
  const out = [];
  const nat = NAT_ADJ[p.nat] || '';
  const inches = Math.round(p.h / 2.54);
  out.push(`${p.first} ${p.last} is a ${p.age}-year-old ${nat} ${POS_NAME[p.pos].toLowerCase()} standing ${Math.floor(inches / 12)}'${inches % 12}".`);
  const [a1, a2] = attrTop(p, 2);
  out.push(`He is best known for his ${ATTR_PHRASE[a1]} and ${ATTR_PHRASE[a2]}.`);
  const tot = careerTotals(p);
  const rows = p.career.concat(p.team != null && p.st.gp ? [careerRow(p)] : []);
  if (!rows.length) out.push(p.age <= 21 ? 'He is a young prospect yet to make his mark in the professional game.' : 'He has yet to log meaningful minutes at this level.');
  else {
    const clubs = tot.clubs;
    out.push(clubs.length === 1 ? `He has spent his entire ${tot.seasons > 1 ? tot.seasons + '-season ' : ''}career with ${clubs[0]}.` : `Over ${tot.seasons} season${tot.seasons > 1 ? 's' : ''} he has played for ${joinList(clubs.slice(-4))}${clubs.length > 4 ? ' among others' : ''}.`);
    const best = rows.filter((r) => r.gp >= 8).sort((x, y) => y.pts / y.gp - x.pts / x.gp)[0];
    if (best && best.pts / best.gp >= 10) out.push(`His best scoring season came in ${best.s}/${String(best.s + 1).slice(2)} with ${best.club}, averaging ${(best.pts / best.gp).toFixed(1)} points.`);
    if (tot.gp >= 10) out.push(`Career average rating: ${(tot.rat / tot.gp).toFixed(2)} over ${tot.gp} games.`);
  }
  const titles = p.awards.filter((a) => a.k === 'Champion').length, mvps = p.awards.filter((a) => a.k === 'MVP').length;
  if (titles || mvps) out.push([titles ? `${titles}× champion` : '', mvps ? `${mvps}× MVP` : ''].filter(Boolean).join(', ') + '.');
  if (o.pers) out.push(`Staff describe his personality as "${personality(p)}".`);
  if (o.arch && p.arch.length) out.push(p.arch.map((k) => ({ fast: 'He is a quick study who absorbs coaching fast.', slow: 'Coaches say he needs time to absorb new ideas.', injury: 'His body has let him down more than once.', iron: 'He almost never misses a game.', glue: 'Teammates call him the glue of the locker room — young players gravitate to him.' }[k])).join(' '));
  if (o.ca != null && p.age <= 23 && o.pot - o.ca > 2.5) out.push(o.pot >= 15 ? 'Scouts believe he could become a star.' : 'Scouts see real room for growth.');
  else if (p.age > p.peak + 1 && o.pers) out.push('He is past his physical peak.');
  const dp = duoPartner(p.id);
  if (dp && S.players[dp]) out.push(`He forms a Dynamic Duo with ${pname(S.players[dp])}.`);
  return out.join(' ');
}

/* ---------- Dynamic Duos ---------- */
const DUO_KEYS = ['fin', 'pas', 'iq', 'mid', 'thr'];
const pairKey = (a, b) => (a < b ? `${a}-${b}` : `${b}-${a}`);
function duoOf(pid) { return (S.duos || []).find((d) => d.a === pid || d.b === pid); }
function duoPartner(pid) { const d = duoOf(pid); return d ? (d.a === pid ? d.b : d.a) : null; }
function duoMapFor(tid) {
  const map = {};
  for (const d of S.duos || []) if (S.players[d.a]?.team === tid && S.players[d.b]?.team === tid) { map[d.a] = d.b; map[d.b] = d.a; }
  return map;
}
function recordPairs(m) {
  S.pairs = S.pairs || {};
  for (const k in m.pairT) S.pairs[k] = (S.pairs[k] || 0) + m.pairT[k] / 60;
}
function checkDuos() {
  S.duos = S.duos || []; S.pairs = S.pairs || {};
  const ut = S.userTeam;
  for (const k of Object.keys(S.pairs)) { const [a, b] = k.split('-').map(Number); if (S.players[a]?.team !== ut || S.players[b]?.team !== ut) delete S.pairs[k]; }
  if (S.duos.filter((d) => S.players[d.a]?.team === ut).length >= 2) return;
  const elig = Object.entries(S.pairs).filter(([k, mins]) => { if (mins < 900) return false; const [a, b] = k.split('-').map(Number); return !duoOf(a) && !duoOf(b) && !(S.players[a].hid.ego >= 15 && S.players[b].hid.ego >= 15); });
  if (!elig.length) return;
  {
    const [k] = R.pick(elig);
    const [a, b] = k.split('-').map(Number);
    const A = S.players[a], B = S.players[b];
    const compat = 0.6 + ((A.a.pas + B.a.pas) / 2 - 10) * 0.04 + ((A.hid.coach + B.hid.coach) / 2 - 10) * 0.03 + (A.pos !== B.pos ? 0.2 : 0);
    if (R.chance(0.012 * clamp(compat, 0.3, 1.6))) {
      S.duos.push({ a, b, since: { season: S.season, day: S.day } }); unlock('duo');
      A.morale = clamp(A.morale + 6, 0, 100); B.morale = clamp(B.morale + 6, 0, 100);
      mail('Assistant Coach', `Dynamic Duo: ${A.last} & ${B.last}`, `Coach, have you seen ${plink(A)} and ${plink(B)} lately? They're finishing each other's sentences out there.\n\nThey now share a <b>Dynamic Duo</b> chemistry link — both play better when they're on the floor together, and they look for each other constantly.\n\nI'd think very carefully before breaking that up.`, { type: 'staff' });
      return;
    }
  }
}
// called when a player leaves the user's club. If the user already had "the talk", pass silent=true.
function dissolveDuo(pid, silent) {
  const d = duoOf(pid); if (!d) return;
  S.duos = S.duos.filter((x) => x !== d);
  const other = S.players[d.a === pid ? d.b : d.a], gone = S.players[pid];
  if (other && other.team === S.userTeam && !silent) {
    other.morale = clamp(other.morale - 10, 0, 100);
    mail(pname(other), `Missing ${gone ? gone.last : 'my running mate'}`, `Coach, it's not the same out there without ${gone ? pname(gone) : 'him'}. We had something special. I'll get on with it, but I won't pretend I'm happy.`, { type: 'player', pid: other.id });
  }
}

/* ---------- Staff ---------- */
const sclamp = (v) => Math.round(clamp(v, 1, 20));
function genericStaff(role, q, tid) {
  const nat = R.pick(['USA', 'USA', 'ESP', 'ITA', 'GER', 'FRA', 'SRB']);
  const nm = genName(nat);
  const a = {};
  for (const at of STAFF_ATTRS) a[at.k] = sclamp(q + R.gauss() * 2);
  const spec = { assistant: ['coaching', 'tactics', 'motivation'], scout: ['judgeA', 'judgeP'], youth: ['youth', 'coaching'], fitness: ['fitness'] }[role];
  spec.forEach((k) => (a[k] = sclamp(a[k] + 3)));
  return { id: 's' + (S.nextSid = (S.nextSid || 0) + 1), first: nm.first, last: nm.last, nat, age: R.int(34, 62), role, a, team: tid, ex: null, joined: { season: S.season, day: S.day } };
}
function staffScores(a) { return { assistant: (a.coaching + a.tactics + a.motivation) / 3, scout: (a.judgeA + a.judgeP) / 2, youth: (a.youth + a.coaching) / 2, fitness: a.fitness }; }
function staffFromPlayer(p) {
  const h = p.hid, A = p.a;
  const a = {
    coaching: sclamp((A.iq + A.ldr + h.prof + A.wrk) / 4 + 1), tactics: sclamp((A.iq * 2 + h.coach + A.cmp) / 4 + 1),
    motivation: sclamp((A.ldr * 2 + h.temp + h.prof) / 4 + 1), judgeA: sclamp((A.iq + h.prof + h.cons) / 3 + 1),
    judgeP: sclamp((A.iq + h.coach + h.amb) / 3 + 0.5), fitness: sclamp((h.nfit + A.wrk + h.prof) / 3 + 1),
    youth: sclamp((A.ldr + h.prof + h.loy + h.coach) / 4 + (hasArch(p, 'glue') ? 3 : 1)),
  };
  const sc = staffScores(a);
  const role = Object.keys(sc).sort((x, y) => sc[y] - sc[x])[0];
  const tot = careerTotals(p, false);
  return { id: 's' + (S.nextSid = (S.nextSid || 0) + 1), first: p.first, last: p.last, nat: p.nat, age: p.age, role, score: sc[role], a, team: null, joined: null,
    ex: { pos: p.pos, seasons: tot.seasons, clubs: tot.clubs, gp: tot.gp, pts: tot.pts, reb: tot.reb, ast: tot.ast, rat: tot.rat, career: p.career.slice(-20), awards: p.awards.slice() } };
}
function userStaff(role) { return (S.staff || []).find((s) => s.team === S.userTeam && s.role === role); }
function ensureUserStaff() {
  S.staff = S.staff || [];
  const t = userTeam();
  const q = clamp(Math.round(t.prestige * 0.45 + 5), 5, 15);
  for (const role of Object.keys(STAFF_ROLES)) if (!userStaff(role)) S.staff.push(genericStaff(role, q, t.id));
}
function hireStaff(sid) {
  const st = S.staff.find((s) => s.id === sid);
  if (!st) return 'That person has taken another job.';
  const cur = userStaff(st.role);
  if (cur) cur.team = null;
  st.team = S.userTeam; st.joined = { season: S.season, day: S.day };
  return `${st.first} ${st.last} joins your staff as ${STAFF_ROLES[st.role].n}.`;
}
function effJA() { const s = userStaff('scout'), c = S.coach.a.ja; return s ? Math.round(clamp(c + Math.max(0, s.a.judgeA - c) * 0.6, 1, 20)) : c; }
function effJP() { const s = userStaff('scout'), c = S.coach.a.jp; return s ? Math.round(clamp(c + Math.max(0, s.a.judgeP - c) * 0.6, 1, 20)) : c; }
function coachEffective() {
  const a = { ...S.coach.a };
  const as = userStaff('assistant');
  if (as) {
    a.tac = clamp(a.tac + (as.a.tactics - 10) * 0.12, 1, 20);
    a.off = clamp(a.off + (as.a.coaching - 10) * 0.08, 1, 20);
    a.def = clamp(a.def + (as.a.coaching - 10) * 0.08, 1, 20);
    a.mot = clamp(a.mot + (as.a.motivation - 10) * 0.08, 1, 20);
  }
  return a;
}
// retirement → maybe a second career on the bench
function handleRetirement(p) {
  const wasMine = p.team === S.userTeam;
  logStint(p);
  dissolveDuo(p.id, true);
  const atUs = p.career.filter((c) => c.tid === S.userTeam).length;
  const tot = careerTotals(p, false);
  const avg = tot.gp ? (tot.rat / tot.gp).toFixed(2) : '-';
  if (wasMine) mail(pname(p), 'Retirement', `Coach, after ${tot.seasons} seasons and ${tot.gp} games I've decided to hang up my sneakers. Thank you for everything.\n\nCareer: ${(tot.pts / Math.max(1, tot.gp)).toFixed(1)} ppg · average rating ${avg}.`, { type: 'player' });
  const atUsRows = p.career.filter((c) => c.tid === S.userTeam);
  const atUsGp = atUsRows.reduce((s, c) => s + c.gp, 0), atUsRat = atUsRows.reduce((s, c) => s + c.rat, 0);
  const titlesHere = p.awards.filter((a) => a.k === 'Champion' && atUsRows.some((c) => c.s === a.s)).length;
  const legend = atUs >= 4 || (atUs >= 3 && atUsGp && atUsRat / atUsGp >= 7) || (atUs >= 2 && titlesHere >= 1);
  if (legend && Number.isInteger(p.num) && !(userTeam().retired || []).some((x) => x.num === p.num)) {
    const rt = { tid: S.userTeam, num: p.num, pid: p.id, name: pname(p), pos: p.pos, seasons: atUs, gp: atUsGp, pts: atUsRows.reduce((s, c) => s + c.pts, 0), rat: atUsRat, titles: titlesHere };
    mail('Board of Directors', `Retire #${p.num}?`, `${S.coach.name},

${pname(p)} gave this club ${atUs} seasons and ${atUsGp} games${titlesHere ? `, winning ${titlesHere} title${titlesHere > 1 ? 's' : ''}` : ''}, averaging ${atUsGp ? (rt.pts / atUsGp).toFixed(1) : '0'} points with a ${atUsGp ? (atUsRat / atUsGp).toFixed(2) : '-'} average rating.

The board proposes to officially retire his <b>#${p.num}</b> jersey. No player at ${teamName(userTeam())} would ever wear it again, and his banner would hang in the Club History.`,
      { type: 'board', retire: rt, actions: [{ act: 'retireNum', label: `Retire #${p.num}` }, { act: 'reject', label: 'Not now' }] });
  }
  if (p.career.length < 4) return;
  const st = staffFromPlayer(p);
  if (st.score < 12.5) return;
  S.staff = S.staff || [];
  if (wasMine || atUs >= 3) {
    S.staff.push(st);
    const cur = userStaff(st.role);
    mail(`${p.first} ${p.last}`, `Wants to join your staff`, `Coach,\n\nI'm done playing, but I'm not done with this game — or this club. I'd love to join your staff as <b>${STAFF_ROLES[st.role].n}</b>.\n\n${STAFF_ATTRS.map((x) => `${x.n}: <b>${st.a[x.k]}</b>`).join(' · ')}${cur ? `\n\nHe would replace ${cur.first} ${cur.last}.` : ''}`, { type: 'staff', staffId: st.id, actions: [{ act: 'hireStaff', label: 'Hire him' }, { act: 'reject', label: 'Decline' }] });
  } else if (R.chance(0.7)) {
    st.team = R.pick(S.teams.filter((t) => t.id !== S.userTeam)).id;
    st.joined = { season: S.season + 1, day: 0 };
    S.staff.push(st);
    if (tot.gp && tot.rat / tot.gp >= 7 && R.chance(0.5)) mail('Locker Room Source', `${p.last} moves to the bench`, `Word is former player ${p.first} ${p.last} has joined ${teamName(team(st.team))} as ${STAFF_ROLES[st.role].n}. Good career — ${tot.gp} games, ${avg} average rating.`, { type: 'whisper' });
  }
}
function staffNewSeason() {
  S.staff = (S.staff || []).filter((s) => { s.age++; if (s.team === S.userTeam) return s.age < 72; return s.age < 68 && (s.team != null || s.joined == null || s.joined.season >= S.season - 1); });
  const others = S.staff.filter((s) => s.team !== S.userTeam);
  if (others.length > 80) { const drop = new Set(others.slice(0, others.length - 80).map((s) => s.id)); S.staff = S.staff.filter((s) => !drop.has(s.id)); }
}

function retireNumber(rt) {
  const t = team(rt.tid);
  if (!t) return 'The club no longer exists.';
  t.retired = t.retired || [];
  if (t.retired.some((x) => x.num === rt.num)) return 'Already retired.';
  t.retired.push({ ...rt, season: S.season });
  const wearer = roster(t.id).find((p) => p.num === rt.num);
  ensureNumbers(S, t);
  roster(t.id).forEach((p) => (p.morale = clamp(p.morale + 4, 0, 100)));
  news('rumour', `${teamName(t)} retire #${rt.num} in honour of ${rt.name}. His banner now hangs from the rafters.`, { lg: t.lg, tid: t.id, mine: t.id === S.userTeam });
  return `#${rt.num} is retired forever. ${rt.name}'s banner hangs in the Club History.${wearer ? ` ${pname(wearer)} switches to #${wearer.num}.` : ''}`;
}

/* ---------- Manager career dates & bio ---------- */
function daysBetween(a, b) { return Math.max(0, Math.round((dayToDate(b.season, b.day) - dayToDate(a.season, a.day)) / 86400000)); }
function coachBio() {
  const c = S.coach, t = userTeam();
  const now = { season: S.season, day: S.day };
  const yrs = S.season - c.start.season;
  const clubs = [...new Set(c.hist.map((h) => h.club).concat(teamName(t)))];
  const out = [`${c.name} is a ${(COACH_STYLES[c.style]?.n || 'coach').toLowerCase()} who began coaching professionally on ${fmtDate(c.start.season, c.start.day)}.`];
  out.push(`Currently head coach of ${teamName(t)} (${league(t.lg).name}), in charge for ${daysBetween(c.joined, now)} days.`);
  if (clubs.length > 1) out.push(`Previous stops: ${joinList(clubs.filter((x) => x !== teamName(t)).slice(0, 4))}.`);
  if (c.games) out.push(`Career record ${c.wins}-${c.games - c.wins} (${Math.round((c.wins / c.games) * 100)}%)${c.titles ? ` with ${c.titles} league title${c.titles > 1 ? 's' : ''}` : ''}.`);
  out.push(c.rep >= 14 ? 'One of the most respected names in the game.' : c.rep >= 8 ? 'Building a strong reputation.' : yrs >= 2 ? 'Still fighting to make a name for himself.' : 'A newcomer to the professional ranks.');
  const pc = c.pcoach ?? 10;
  if (pc >= 14) out.push('Players love playing for him.'); else if (pc <= 6) out.push('Players question whether he keeps his word.');
  return out.join(' ');
}
