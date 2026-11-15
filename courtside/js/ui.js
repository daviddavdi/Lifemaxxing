/* Courtside Manager — UI */
'use strict';

const UI = { view: 'title', params: {}, stack: [], sel: null, tab: {} };
const $ = (s) => document.querySelector(s);

/* ---------- Icons ---------- */
const IC = {
  inbox: '<path d="M4 13h4l2 3h4l2-3h4"/><path d="M4 4h16v16H4z"/>',
  squad: '<circle cx="9" cy="8" r="3.2"/><path d="M3 20c0-3.5 2.7-6 6-6s6 2.5 6 6"/><circle cx="17" cy="9" r="2.5"/><path d="M15.5 14.2c2.9.3 5.5 2.4 5.5 5.8"/>',
  tactics: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M12 4v16"/><circle cx="12" cy="12" r="3"/>',
  league: '<path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0z"/><path d="M17 6h3v2a3 3 0 0 1-3 3M7 6H4v2a3 3 0 0 0 3 3"/>',
  market: '<path d="M7 7h12l-3-3M17 17H5l3 3"/>',
  more: '<circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/>',
  back: '<path d="M15 5l-7 7 7 7"/>',
  play: '<path d="M7 5l12 7-12 7z"/>',
  pause: '<path d="M8 5v14M16 5v14"/>',
  edit: '<path d="M4 20h4L19 9l-4-4L4 16z"/>',
  mega: '<path d="M3 10v4h4l6 4V6L7 10z"/><path d="M16 9a4 4 0 0 1 0 6M18.5 6.5a8 8 0 0 1 0 11"/>',
  ball: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3v18M5.6 5.6c3.5 3.5 3.5 9.3 0 12.8M18.4 5.6c-3.5 3.5-3.5 9.3 0 12.8"/>',
};
const icon = (n, cls = '') => `<svg class="ic ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${IC[n]}</svg>`;

/* ---------- Scouting fog (coach Judging Ability / Potential) ---------- */
const hashN = (a, b) => { const x = Math.sin(a * 12.9898 + b * 78.233) * 43758.5453; return x - Math.floor(x); };
const isMine = (p) => S && p.team === S.userTeam;
function seenCA(p) { const ca = calcCA(p); if (isMine(p)) return ca; return ca + (hashN(p.id, S.season) * 2 - 1) * ((20 - effJA()) / 20) * 1.6; }
function seenPot(p) { if (isMine(p) && effJP() >= 16) return p.pot; return Math.max(seenCA(p), p.pot + (hashN(p.id, S.season + 7) * 2 - 1) * ((21 - effJP()) / 20) * 2.4); }
function attrRange(p, k) {
  const v = p.a[k];
  if (isMine(p)) return [v, v];
  const ja = effJA(), w = ja >= 16 ? 0 : ja >= 12 ? 1 : ja >= 8 ? 2 : 3;
  const off = Math.floor(hashN(p.id * 31 + k.length * 7 + k.charCodeAt(0), 3) * (w + 1));
  const lo = clamp(v - off, 1, 20);
  return [lo, clamp(lo + w, 1, 20)];
}

/* ---------- Small components ---------- */
const starsHTML = (v) => `<span class="stars"><span class="on" style="width:${(v / 5) * 100}%">★★★★★</span>★★★★★</span>`;
const tier = (v) => (v >= 16 ? 4 : v >= 11 ? 3 : v >= 6 ? 2 : 1);
const attrCell = (v) => `<span class="av t${tier(Math.round(v))}">${Math.round(v)}</span>`;
const attrRangeCell = ([lo, hi]) => lo === hi ? attrCell(lo) : `<span class="av rng t${tier((lo + hi) / 2)}">${lo}-${hi}</span>`;
const badge = (t, cls = '') => t ? `<span class="badge ${cls}" style="background:${t.c1};color:${readableOn(t.c1, t.c2)};--trim:${t.c2}">${esc(t.abbr)}</span>` : `<span class="badge fa ${cls}">FA</span>`;
const ratingPill = (r) => r == null ? '<span class="rp">–</span>' : `<span class="rp ${r >= 8 ? 'r4' : r >= 7 ? 'r3' : r >= 6 ? 'r2' : 'r1'}">${r.toFixed(1)}</span>`;
function moraleLabel(m) { return m >= 85 ? ['Superb', 'm5'] : m >= 70 ? ['Very Good', 'm4'] : m >= 55 ? ['Good', 'm3'] : m >= 40 ? ['Okay', 'm2'] : m >= 25 ? ['Poor', 'm1'] : ['Very Poor', 'm0']; }
const moraleHTML = (m, short) => { const [l, c] = moraleLabel(m); return `<span class="mor ${c}">${short ? l.replace('Very ', 'V.') : l}</span>`; };
const condHTML = (c) => `<span class="cond ${c >= 85 ? 'c3' : c >= 65 ? 'c2' : 'c1'}">${Math.round(c)}%</span>`;
const injHTML = (p) => (p.inj ? `<span class="inj" title="${esc(p.inj.name)}">+</span>` : '') + (p.susp > 0 ? `<span class="inj susp" title="Suspended ${p.susp}">S</span>` : '');
const flag = (p) => NATS[p.nat]?.flag || '';
const avg1 = (a, b) => (b ? (a / b).toFixed(1) : '0.0');
const lgFlag = (lg) => COUNTRY_FLAG[lg.country] || '';
const prestigeStars = (pr) => starsHTML(clamp(Math.round(pr / 2) / 2, 0.5, 5));

function header(title, opts = {}) {
  return `<div class="phead">${opts.back !== false && UI.stack.length ? `<button class="iconbtn" data-act="back" aria-label="Back">${icon('back')}</button>` : ''}<h1>${title}</h1>${opts.right || ''}</div>`;
}
function tabs(key, list, def) {
  const cur = UI.tab[key] || def || list[0][0];
  return `<div class="tabs">${list.map(([k, n]) => `<button class="tab ${k === cur ? 'on' : ''}" data-act="tab" data-k="${key}" data-v="${k}">${n}</button>`).join('')}</div>`;
}
const curTab = (key, def) => UI.tab[key] || def;
function tacSeg(k, cur, act = 'tactic') {
  return `<div class="seg ${TACTIC_OPTS[k].length > 3 ? 'wrap' : ''}">${TACTIC_OPTS[k].map(([v, l]) => `<button class="${v === cur ? 'on' : ''}" data-act="${act}" data-k="${k}" data-v="${v}">${l}</button>`).join('')}</div>`;
}
function leagueChips(cur, key, withAll) {
  return `<div class="chips">${withAll ? `<button class="chip ${cur === 'ALL' ? 'on' : ''}" data-act="tab" data-k="${key}" data-v="ALL">All</button>` : ''}${S.leagues.map((l) => `<button class="chip ${cur === l.id ? 'on' : ''}" data-act="tab" data-k="${key}" data-v="${l.id}">${lgFlag(l)} ${esc(l.short)}</button>`).join('')}</div>`;
}

function toast(msg, kind) {
  const el = document.createElement('div');
  el.className = 'toast ' + (kind || '');
  el.innerHTML = msg;
  document.body.appendChild(el);
  requestAnimationFrame(() => el.classList.add('show'));
  setTimeout(() => { el.classList.remove('show'); setTimeout(() => el.remove(), 300); }, 2800);
}
function modal(html, opts = {}) {
  closeModal();
  const el = document.createElement('div');
  el.className = 'modal-bg';
  el.innerHTML = `<div class="modal ${opts.tall ? 'tall' : ''}">${html}</div>`;
  if (!opts.locked) el.addEventListener('click', (e) => { if (e.target === el) closeModal(); });
  document.body.appendChild(el);
}
function closeModal() { document.querySelectorAll('.modal-bg').forEach((m) => m.remove()); }

/* ---------- Router ---------- */
const ROOTS = ['inbox', 'squad', 'tactics', 'league', 'market', 'more'];
function go(view, params = {}, opts = {}) {
  if (ROOTS.includes(view) && !opts.keep) UI.stack = [];
  else if (!opts.replace && (UI.view !== view || JSON.stringify(params) !== JSON.stringify(UI.params))) UI.stack.push({ view: UI.view, params: UI.params });
  UI.view = view; UI.params = params; UI.sel = null;
  render();
  window.scrollTo(0, 0);
}
function back() {
  const s = UI.stack.pop();
  if (s) { UI.view = s.view; UI.params = s.params; } else UI.view = 'inbox';
  render();
}
function render() {
  const inGame = S && !['title', 'newgame', 'match'].includes(UI.view);
  document.body.classList.toggle('ingame', !!inGame);
  document.body.classList.toggle('live-on', UI.view === 'match');
  if (S && userTeam()) {
    const t = userTeam();
    document.documentElement.style.setProperty('--team', t.c1);
    document.documentElement.style.setProperty('--team2', readableOn(t.c1, t.c2));
    document.documentElement.style.setProperty('--trim', t.c2);
  }
  $('#top').innerHTML = inGame ? topBar() : '';
  $('#nav').innerHTML = inGame ? navBar() : '';
  $('#main').innerHTML = (VIEWS[UI.view] || VIEWS.title)(UI.params || {});
  if (UI.view === 'match') Live.paint(true);
}
function topBar() {
  const t = userTeam(), lg = league(t.lg);
  const label = S.pending ? 'Match Day' : S.phase === 'offseason' ? 'New Season' : S.phase === 'sacked' ? 'Find Job' : 'Continue';
  const rec = lg.state === 'playoffs' ? 'Playoffs' : `${t.w}-${t.l} · ${ordinal(teamRank(t.id))}`;
  return `<div class="tb-team" data-act="go" data-v="squad">${badge(t, 'lg')}<div><div class="tb-name">${esc(teamName(t))}</div><div class="tb-sub">${S.ironman ? '<span class="imtag">IRONMAN</span> ' : ''}${fmtDate(S.season, S.day, true)} · ${esc(lg.short)} · ${rec}</div></div></div>
  <button class="continue" data-act="continue">${label} ${icon('play')}</button>`;
}
function navBar() {
  const items = [['inbox', 'Inbox'], ['squad', 'Squad'], ['tactics', 'Tactics'], ['league', 'League'], ['market', 'Market'], ['more', 'More']];
  const root = ROOTS.includes(UI.view) ? UI.view : (UI.stack[0] && UI.stack[0].view) || '';
  const u = unreadCount();
  return items.map(([k, n]) => `<button class="nb ${root === k ? 'on' : ''}" data-act="go" data-v="${k}">${icon(k)}<span>${n}</span>${k === 'inbox' && u ? `<i class="dot">${u > 9 ? '9+' : u}</i>` : ''}</button>`).join('');
}

/* ---------- Views ---------- */
const VIEWS = {};

VIEWS.title = () => `
  <div class="title-screen">
    <div class="logo">${icon('ball', 'logo-ic')}<div><div class="l1">COURTSIDE</div><div class="l2">MANAGER</div></div></div>
    <p class="tag">From the second division in Europe to the biggest league in the world. Call the plays, handle the egos, read the room.</p>
    <div class="menu">
      ${hasSave() ? `<button class="btn primary big" data-act="loadGame">Continue Career</button>` : ''}
      <button class="btn ${hasSave() ? '' : 'primary'} big" data-act="go" data-v="newgame">New Career</button>
      <button class="btn big" data-act="go" data-v="achievements">🏆 Achievements (${Object.keys(achStore()).length}/${ACHIEVEMENTS.length})</button>
      <label class="btn big file">Start with Custom Database<input type="file" accept=".json,application/json" data-chg="importDbNew" hidden></label>
    </div>
    <p class="fine">All players, clubs, leagues and names are fictional. Edit everything in the Database Editor.</p>
  </div>`;

let NG = null;
function ngStrength(tid) { const r = NG.db.players.filter((p) => p.team === tid).map(calcCA).sort((a, b) => b - a).slice(0, 8); return r.length ? r.reduce((s, x) => s + x, 0) / r.length : 0; }
VIEWS.newgame = () => {
  if (!NG) NG = { db: generateWorld(), step: 1, team: null, name: '', length: 'short', style: 'allround', mode: 'journey', custom: false, lg: null, diff: 'normal', ironman: false };
  const db = NG.db;
  if (NG.step === 1) {
    return `${header('New Career', { back: false, right: `<button class="btn sm" data-act="go" data-v="title">Cancel</button>` })}
    <div class="pad">
      <div class="card"><label class="lbl">Coach name</label><input class="inp" id="ngName" maxlength="28" placeholder="Your name" value="${esc(NG.name)}" data-chg="ngName"></div>
      <h2 class="sec">Your look</h2>
      ${lookEditor(NG.look = NG.look || randomCoachLook(), 'ng')}
      <h2 class="sec">Career path</h2>
      <div class="pick-grid">
        <button class="pick ${NG.mode === 'journey' ? 'on' : ''}" data-act="ngSet" data-k="mode" data-v="journey"><b>Journeyman</b><span>Start unknown in a European second division. Low attributes, low reputation. Earn your way to the top.</span></button>
        <button class="pick ${NG.mode === 'est' ? 'on' : ''}" data-act="ngSet" data-k="mode" data-v="est"><b>Established Coach</b><span>A respected name. Strong attributes. Choose any club in the world.</span></button>
      </div>
      <h2 class="sec">Coaching style</h2>
      <div class="pick-grid">${Object.entries(COACH_STYLES).map(([k, v]) => `<button class="pick ${NG.style === k ? 'on' : ''}" data-act="ngSet" data-k="style" data-v="${k}"><b>${v.n}</b><span>${v.d}</span></button>`).join('')}</div>
      <h2 class="sec">Difficulty</h2>
      <div class="seg">${Object.entries(DIFFICULTY).map(([k, v]) => `<button class="${(NG.diff || 'normal') === k ? 'on' : ''}" data-act="ngSet" data-k="diff" data-v="${k}">${v.n}</button>`).join('')}</div>
      <p class="hint">${DIFFICULTY[NG.diff || 'normal'].d}</p>
      <h2 class="sec">Game mode</h2>
      <div class="pick-grid">
        <button class="pick ${!NG.ironman ? 'on' : ''}" data-act="ngSet" data-k="ironman" data-v="">${'<b>Standard</b><span>Database editor, save backups and restores allowed. No achievements.</span>'}</button>
        <button class="pick ${NG.ironman ? 'on' : ''}" data-act="ngSet" data-k="ironman" data-v="1" ${NG.custom ? 'disabled' : ''}><b>🛡️ Ironman</b><span>${NG.custom ? 'Not available with a custom database.' : 'One save, no reloading matches, no editor, no restoring backups. Earn achievements.'}</span></button>
      </div>
      <h2 class="sec">Season length</h2>
      <div class="seg">${[['short', 'Short (~30 games)'], ['long', 'Long (~60 games)']].map(([v, l]) => `<button class="${NG.length === v ? 'on' : ''}" data-act="ngSet" data-k="length" data-v="${v}">${l}</button>`).join('')}</div>
      <p class="hint">${db.leagues.length} leagues · ${db.teams.length} clubs${NG.custom ? ' · custom database' : ''}</p>
    </div>
    <div class="sticky-cta"><button class="btn primary big" data-act="ngNext">Next: Choose Club</button></div>`;
  }
  let list;
  if (NG.mode === 'journey') {
    NG.offers = NG.offers || journeymanOffers(db);
    list = NG.offers.map((id) => db.teams.find((t) => t.id === id));
  } else {
    NG.lg = NG.lg || db.leagues[0].id;
    list = db.teams.filter((t) => t.lg === NG.lg).sort((a, b) => ngStrength(b.id) - ngStrength(a.id));
  }
  return `${header(NG.mode === 'journey' ? 'Job Offers' : 'Choose Your Club', { back: false, right: `<button class="btn sm" data-act="ngBack">Back</button>` })}
  ${NG.mode === 'journey' ? `<div class="pad"><div class="card"><p>Nobody knows your name yet. These three clubs are willing to give you a chance:</p></div></div>` : `<div class="pad"><div class="chips">${db.leagues.map((l) => `<button class="chip ${NG.lg === l.id ? 'on' : ''}" data-act="ngLg" data-v="${l.id}">${COUNTRY_FLAG[l.country] || ''} ${esc(l.short)}</button>`).join('')}</div></div>`}
  <div class="list">${list.map((t) => { const lg = db.leagues.find((l) => l.id === t.lg); return `<button class="li team-pick ${NG.team === t.id ? 'sel' : ''}" data-act="ngTeam" data-id="${t.id}">
    ${badge(t, 'lg')}<div class="grow"><div class="b">${esc(t.city)} ${esc(t.nick)}</div><div class="muted sm">${COUNTRY_FLAG[lg.country] || ''} ${esc(lg.name)}${lg.tier === 2 ? ' · 2nd tier' : ''}</div></div>${starsHTML(stars(ngStrength(t.id)))}</button>`; }).join('')}</div>
  <div class="sticky-cta"><button class="btn primary big" data-act="ngStart" ${NG.team ? '' : 'disabled'}>Start Career</button></div>`;
};

/* Inbox */
VIEWS.inbox = () => {
  const list = S.inbox;
  return `${header('Inbox', { right: list.some((m) => !m.read) ? `<button class="btn sm" data-act="readAll">Mark all read</button>` : '' })}
  ${S.phase === 'sacked' ? `<div class="pad"><div class="card warn"><b>You have been sacked.</b><p>Hit <b>Find Job</b> to see which clubs are interested.</p></div></div>` : ''}
  <div class="list mails">${list.length ? list.map((m) => `<button class="li mail ${m.read ? '' : 'unread'} ${m.type === 'whisper' ? 'whisper' : ''}" data-act="mail" data-id="${m.id}">
    ${m.pid && S.players[m.pid] ? `<span class="mfrom-face">${playerFace(S.players[m.pid], 36)}</span>` : `<span class="mfrom-ic ${m.type || ''}">${m.type === 'whisper' ? '🤫' : esc((m.from || '?')[0])}</span>`}
    <div class="grow"><div class="mrow"><span class="mfrom">${esc(m.from)}</span><span class="mdate">${fmtDate(m.season, m.day, true)}</span></div>
    <div class="msub">${esc(m.subject)}</div>${m.actions && !m.done ? '<span class="tagx">Action needed</span>' : ''}</div></button>`).join('') : '<p class="empty">No messages.</p>'}</div>`;
};
VIEWS.mail = ({ id }) => {
  const m = S.inbox.find((x) => x.id === id);
  if (!m) return header('Message') + '<p class="empty">Message not found.</p>';
  if (!m.read) { m.read = true; save(); setTimeout(() => { const n = $('#nav'); if (n) n.innerHTML = navBar(); }, 0); }
  return `${header(m.type === 'whisper' ? 'The Grapevine' : 'Message')}
  <div class="pad"><div class="card mailview ${m.type === 'whisper' ? 'whisper' : ''}">
    <div class="mhead"><span class="mfrom-ic ${m.type || ''}">${m.type === 'whisper' ? '🤫' : esc((m.from || '?')[0])}</span><div><div class="b">${esc(m.from)}</div><div class="muted sm">${fmtDate(m.season, m.day)}</div></div></div>
    <h2>${esc(m.subject)}</h2>
    <div class="mbody">${m.body.replace(/\n/g, '<br>')}</div>
    ${m.actions ? (m.done ? `<div class="done">✓ ${typeof m.done === 'string' ? esc(m.done) : 'Handled'}</div>` : `<div class="row-btns">${m.actions.map((a, i) => `<button class="btn ${i === 0 ? 'primary' : ''}" data-act="mailAct" data-id="${m.id}" data-a="${a.act}">${esc(a.label)}</button>`).join('')}</div>`) : ''}
  </div></div>`;
};

/* Squad */
function sortedRoster(tid) { const t = team(tid); cleanRotation(S, t); return t.rotation.map((id) => S.players[id]); }
function personalityVisible(p) { return isMine(p) || p.known.length >= 2 || effJA() >= 16; }
function archVisible(p) { return isMine(p) || p.known.includes('arch') || effJA() >= 15; }
const archIcons = (p) => archVisible(p) && p.arch && p.arch.length ? `<span class="archi">${p.arch.map((k) => `<i title="${ARCHETYPES[k].n}">${ARCHETYPES[k].ic}</i>`).join('')}</span>` : '';
VIEWS.squad = () => {
  const t = userTeam();
  const r = sortedRoster(t.id);
  const tab = curTab('squad', 'ov');
  let body;
  if (tab === 'ov') {
    const rs = sortSquad(r, 'ov');
    body = `<table class="tbl"><thead><tr>${sth('ov', 'num', '#')}${sth('ov', 'pos', 'Pos')}${sth('ov', 'name', 'Player', 'l')}${sth('ov', 'age', 'Age')}${sth('ov', 'ca', 'Ability')}${sth('ov', 'pot', 'Pot.')}${sth('ov', 'cond', 'Cond')}${sth('ov', 'mor', 'Morale')}</tr></thead><tbody>
    ${rs.map((p, i) => `<tr data-act="player" data-id="${p.id}" class="${i === 5 && !UI.tab.sq_ov ? 'sep' : ''}"><td><span class="jn">${p.num ?? '–'}</span></td><td><span class="ps">${p.pos}</span></td><td class="l nm"><span class="mini">${playerFace(p, 26)}</span>${injHTML(p)}${esc(pname(p, true))}${archIcons(p)}${duoPartner(p.id) ? '<i class="duoi">⚡</i>' : ''}</td><td>${p.age}</td><td>${starsHTML(stars(calcCA(p)))}</td><td>${starsHTML(stars(seenPot(p)))}</td><td>${condHTML(p.cond)}</td><td>${moraleHTML(p.morale, 1)}</td></tr>`).join('')}
    </tbody></table>`;
  } else if (tab === 'st') {
    const rs = sortSquad(r, 'st');
    body = `<table class="tbl"><thead><tr>${sth('st', 'name', 'Player', 'l')}${sth('st', 'age', 'Age')}${sth('st', 'gp', 'GP')}${sth('st', 'min', 'MIN')}${sth('st', 'pts', 'PTS')}${sth('st', 'reb', 'REB')}${sth('st', 'ast', 'AST')}${sth('st', 'stl', 'STL')}${sth('st', 'blk', 'BLK')}${sth('st', 'fg', 'FG%')}${sth('st', 'tp', '3P%')}${sth('st', 'rat', 'Rat')}</tr></thead><tbody>
    ${rs.map((p) => { const s = p.st; return `<tr data-act="player" data-id="${p.id}"><td class="l nm">${esc(pname(p, true))}</td><td>${p.age}</td><td>${s.gp}</td><td>${avg1(s.min, s.gp)}</td><td class="b">${avg1(s.pts, s.gp)}</td><td>${avg1(s.reb, s.gp)}</td><td>${avg1(s.ast, s.gp)}</td><td>${avg1(s.stl, s.gp)}</td><td>${avg1(s.blk, s.gp)}</td><td>${s.fga ? Math.round((s.fgm / s.fga) * 100) : '-'}</td><td>${s.tpa ? Math.round((s.tpm / s.tpa) * 100) : '-'}</td><td>${s.gp ? ratingPill(s.rat / s.gp) : '-'}</td></tr>`; }).join('')}
    </tbody></table>`;
  } else if (tab === 'want') {
    body = wantedView(r);
  } else if (tab === 'dyn') {
    const avgM = r.reduce((s, p) => s + p.morale, 0) / Math.max(1, r.length);
    const atm = avgM >= 75 ? ['Electric', 'pos'] : avgM >= 62 ? ['Positive', 'pos'] : avgM >= 50 ? ['Steady', ''] : avgM >= 38 ? ['Tense', 'warn-t'] : ['Toxic', 'neg'];
    const leaders = r.slice().sort((a, b) => (b.a.ldr * 0.6 + b.age * 0.25 + calcCA(b) * 0.3) - (a.a.ldr * 0.6 + a.age * 0.25 + calcCA(a) * 0.3)).slice(0, 3);
    const unhappy = r.filter((p) => p.morale < 40);
    body = `<div class="pad">
      <div class="card"><h3>Locker room atmosphere</h3><div class="big b ${atm[1]}">${atm[0]}</div><div class="meter"><div class="${avgM >= 60 ? 'ok' : avgM >= 45 ? 'mid' : 'bad'}" style="width:${avgM}%"></div></div></div>
      <div class="card"><h3>Team leaders</h3>${leaders.map((p) => `<div class="lrow" data-act="player" data-id="${p.id}"><span class="ps">${p.pos}</span><span class="grow">${esc(pname(p))}</span><span class="pers">${esc(personality(p))}</span></div>`).join('')}<p class="hint">Leaders set the tone. Keep them happy and the room follows.</p></div>
      <div class="card"><h3>Unhappy players</h3>${unhappy.length ? unhappy.map((p) => `<div class="lrow" data-act="player" data-id="${p.id}"><span class="grow">${esc(pname(p))}</span>${moraleHTML(p.morale)}</div>`).join('') : '<p class="muted">Nobody is unhappy right now.</p>'}</div>
      <div class="card"><h3>⚡ Dynamic Duos</h3>${(S.duos || []).filter((d) => S.players[d.a]?.team === S.userTeam && S.players[d.b]?.team === S.userTeam).map((d) => `<div class="lrow"><span class="grow"><a data-act="player" data-id="${d.a}">${esc(pname(S.players[d.a], true))}</a> + <a data-act="player" data-id="${d.b}">${esc(pname(S.players[d.b], true))}</a></span><span class="muted sm">since ${fmtDate(d.since.season, d.since.day, true)} ${d.since.season}</span></div>`).join('') || '<p class="muted">None yet. Players who share the floor for a long time can — rarely — develop a special chemistry.</p>'}</div>
      <div class="card"><h3>🤝 Glue guys</h3>${r.filter((p) => hasArch(p, 'glue')).map((p) => `<div class="lrow" data-act="player" data-id="${p.id}"><span class="grow">${esc(pname(p))}</span><span class="muted sm">Cushions morale drops · mentors youth</span></div>`).join('') || '<p class="muted">No Locker Room Glue Guy on the roster.</p>'}</div>
      <div class="card"><h3>Personalities</h3>${r.map((p) => `<div class="lrow" data-act="player" data-id="${p.id}"><span class="grow">${esc(pname(p, true))}</span><span class="pers">${esc(personality(p))}</span><span class="muted sm">${p.known.length} note${p.known.length === 1 ? '' : 's'}</span></div>`).join('')}</div>
    </div>`;
  } else {
    const rs = sortSquad(r, 'ct');
    body = `<table class="tbl"><thead><tr>${sth('ct', 'name', 'Player', 'l')}${sth('ct', 'age', 'Age')}${sth('ct', 'sal', 'Salary')}${sth('ct', 'yrs', 'Years')}<th></th></tr></thead><tbody>
    ${rs.map((p) => `<tr data-act="player" data-id="${p.id}"><td class="l nm">${esc(pname(p, true))}</td><td>${p.age}</td><td>${fmtMoney(p.contract.sal)}</td><td>${p.contract.yrs}</td><td>${p.contract.yrs <= 1 ? '<span class="tagx">Expiring</span>' : ''}</td></tr>`).join('')}
    </tbody></table>
    <div class="pad"><div class="kv"><span>Payroll</span><b>${fmtMoney(teamPayroll(t.id))}</b></div><div class="kv"><span>Wage budget</span><b>${fmtMoney(t.budget)}</b></div><div class="kv"><span>Room</span><b class="${t.budget - teamPayroll(t.id) < 0 ? 'neg' : 'pos'}">${fmtMoney(Math.max(0, t.budget - teamPayroll(t.id)))}</b></div></div>`;
  }
  return `${header('Squad', { right: `<span class="muted sm">${r.length}/${ROSTER_MAX}</span>` })}${tabs('squad', [['ov', 'Overview'], ['st', 'Stats'], ['dyn', 'Dynamics'], ['want', `Wanted${S.interest && S.interest.length ? ' (' + new Set(S.interest.map((i) => i.pid)).size + ')' : ''}`], ['ct', 'Contracts']])}<div class="scrollx">${body}</div>`;
};

/* Player */
VIEWS.player = ({ id }) => {
  const p = S.players[id];
  if (!p) return header('Player') + '<p class="empty">This player has retired or no longer exists.</p>';
  ensureHidden(p);
  const t = p.team != null ? team(p.team) : null;
  const mine = isMine(p);
  const tab = curTab('player', 'attr');
  let body = '';
  if (tab === 'attr') {
    body = `${!mine && effJA() < 16 ? `<p class="hint pad">Ranges reflect your Judging Ability (${effJA()}, incl. scout). Sign him to see exact values.</p>` : ''}
    <div class="attr-grid">${ATTR_GROUPS.map((g) => `<div class="attr-box"><h3>${g}</h3>${ATTRS.filter((a) => a.g === g).map((a) => `<div class="arow"><span>${a.n}</span>${attrRangeCell(attrRange(p, a.k))}</div>`).join('')}</div>`).join('')}</div>`;
  } else if (tab === 'notes') {
    const notes = p.known.map((k) => { const kind = traitKind(p, k); return kind ? `<li>${TRAIT_NOTES[k][kind]}</li>` : ''; }).join('');
    const ins = mine ? (userTeam().instr[p.id] || {}) : {};
    const br = bestRole(p);
    const dp = duoPartner(p.id), dpp = dp ? S.players[dp] : null;
    const peakNote = mine && p.age >= 27 && (p.known.includes('nfit') || S.coach.a.fit >= 13) ? `<li>Fitness staff expect him to hold his level until around age ${p.peak}.</li>` : '';
    body = `<div class="pad">
      <div class="card"><h3>Bio</h3><p class="bio">${esc(playerBio(p, { pers: personalityVisible(p), arch: archVisible(p), ca: seenCA(p), pot: seenPot(p) }))}</p></div>
      ${archVisible(p) && p.arch.length ? `<div class="card"><h3>Traits</h3>${p.arch.map((k) => `<div class="lrow"><span class="arch-ic">${ARCHETYPES[k].ic}</span><span class="grow"><b>${ARCHETYPES[k].n}</b><div class="muted sm">${ARCHETYPES[k].d}</div></span></div>`).join('')}</div>` : ''}
      ${dpp ? `<div class="card duo"><h3>⚡ Dynamic Duo</h3><div class="lrow" data-act="player" data-id="${dpp.id}"><span class="grow"><b>${esc(pname(dpp))}</b><div class="muted sm">+1 to Finishing, Mid-Range, Three Point, Passing and IQ when they share the floor. They look for each other.</div></span></div></div>` : ''}
      ${playerRivalOf(p.id).length ? `<div class="card rivalcard"><h3>⚔️ Personal rivals</h3>${playerRivalOf(p.id).filter((r) => S.players[r.other]).map((r) => { const o = S.players[r.other]; return `<div class="lrow" data-act="player" data-id="${o.id}"><span class="grow"><b>#${o.num ?? '–'} ${esc(pname(o))}</b> ${o.team != null ? badge(team(o.team)) : ''}<div class="muted sm">${esc(r.reason)} · since ${r.since.season}</div></span></div>`; }).join('')}</div>` : ''}
      <div class="card"><h3>Personality</h3><div class="big b">${personalityVisible(p) ? esc(personality(p)) : 'Unknown'}</div>${personalityVisible(p) ? '' : '<p class="hint">Your staff don\'t know him well enough yet.</p>'}</div>
      <div class="card"><h3>Coach's notes</h3>${notes || peakNote ? `<ul class="notes">${notes}${peakNote}</ul>` : `<p class="muted">${mine ? 'Staff are still getting to know him. Keep your ears open around the building.' : 'Nothing on file. Rumours and scouting will fill this in.'}</p>`}</div>
      <div class="card"><h3>Roles</h3>${Object.keys(ROLES).filter((r) => r !== 'bal').map((r) => ({ r, s: roleScore(p, r) })).sort((a, b) => b.s - a.s).slice(0, 4).map(({ r, s }) => `<div class="lrow"><span class="grow">${ROLES[r].n}${r === br ? ' <span class="tagx ok">Best</span>' : ''}${mine && ins.role === r ? ' <span class="tagx">Current</span>' : ''}</span>${starsHTML(stars(s))}</div>`).join('')}
      ${mine ? `<div class="row-btns"><button class="btn sm" data-act="go" data-v="tactics" data-keep="1" data-tab="roles">Set role in Tactics</button></div>` : ''}</div>
    </div>`;
  } else if (tab === 'stats') {
    const line = (s) => `<div class="statline">${[['GP', s.gp], ['MIN', avg1(s.min, s.gp)], ['PTS', avg1(s.pts, s.gp)], ['REB', avg1(s.reb, s.gp)], ['AST', avg1(s.ast, s.gp)], ['STL', avg1(s.stl, s.gp)], ['BLK', avg1(s.blk, s.gp)], ['TOV', avg1(s.tov, s.gp)], ['FG%', s.fga ? ((s.fgm / s.fga) * 100).toFixed(1) : '-'], ['3P%', s.tpa ? ((s.tpm / s.tpa) * 100).toFixed(1) : '-'], ['FT%', s.fta ? ((s.ftm / s.fta) * 100).toFixed(1) : '-'], ['Avg Rat', s.gp ? (s.rat / s.gp).toFixed(2) : '-']].map(([k, v]) => `<div><span>${k}</span><b>${v}</b></div>`).join('')}</div>`;
    body = `<div class="pad"><h3 class="sec">${S.season}/${String(S.season + 1).slice(2)} regular season</h3>${line(p.st)}${p.pst && p.pst.gp ? `<h3 class="sec">Playoffs</h3>${line(p.pst)}` : ''}
    <h3 class="sec">Form (last 5)</h3><div class="form">${p.form.length ? p.form.map(ratingPill).join('') : '<span class="muted">No games yet</span>'}</div></div>`;
  } else {
    const rows = p.career.slice();
    if (p.team != null && (p.st.gp || (p.pst && p.pst.gp))) rows.push({ ...careerRow(p), live: true });
    body = historyTable(rows, p.awards);
  }
  let actions = '';
  if (mine) {
    actions = `<button class="btn primary" data-act="renewModal" data-id="${p.id}" ${p.contract.yrs > 2 ? 'disabled' : ''}>Renew Contract</button><button class="btn" data-act="toggleList" data-id="${p.id}">${p.listed ? 'Remove from List' : 'Transfer List'}</button><button class="btn danger" data-act="release" data-id="${p.id}">Release</button>`;
    if (S.promises[p.id]) actions += `<span class="tagx">Promised minutes (${S.promises[p.id]} games left)</span>`;
  } else if (p.team == null) actions = `<button class="btn primary" data-act="signModal" data-id="${p.id}">Offer Contract</button>`;
  else actions = `<button class="btn primary" data-act="go" data-v="trade" data-id="${p.id}">Make Trade Offer</button>`;
  if (!S.ironman) actions += `<button class="btn" data-act="go" data-v="editPlayer" data-id="${p.id}">${icon('edit')} Edit</button>`;
  return `${header('Player Profile')}
  <div class="phero" style="--pc:${t ? t.c1 : '#555'}">
    <div class="ph-top"><div class="avatar">${playerFace(p, 78)}${t ? `<span class="avbadge">${badge(t)}</span>` : ''}</div><div class="grow"><div class="ph-name">${p.team != null && p.num != null ? `<span class="jbig">#${p.num}</span> ` : ''}${esc(p.first)} <b>${esc(p.last)}</b></div>
      <div class="ph-sub">${POS_NAME[p.pos]} · ${p.age} yrs · ${flag(p)} ${p.nat} · ${fmtHeight(p.h)}</div>
      <div class="ph-sub">${t ? `<a data-act="go" data-v="team" data-id="${t.id}">${esc(teamName(t))}</a> · ${esc(league(t.lg).short)}` : 'Free Agent'}${p.inj ? ` · <span class="neg">Injured: ${esc(p.inj.name)} (${p.inj.days}d)</span>` : ''}${p.wantsOut ? ' · <span class="warn-t">Wants out</span>' : ''}</div>
      ${personalityVisible(p) ? `<div class="ph-sub">Personality: <b>${esc(personality(p))}</b></div>` : ''}
      <div class="ph-sub">${archVisible(p) ? p.arch.map((k) => `<span class="atag">${ARCHETYPES[k].ic} ${ARCHETYPES[k].n}</span>`).join('') : ''}${duoPartner(p.id) && S.players[duoPartner(p.id)] ? `<span class="atag duo">⚡ Duo: ${esc(S.players[duoPartner(p.id)].last)}</span>` : ''}${p.susp > 0 ? `<span class="atag bad">Suspended (${p.susp})</span>` : ''}${p.listed ? '<span class="atag tl">Transfer Listed</span>' : ''}${playerRivalOf(p.id).filter((r) => S.players[r.other]).map((r) => `<span class="atag bad">⚔️ ${esc(S.players[r.other].last)}</span>`).join('')}${p.unsettled && isMine(p) ? '<span class="atag bad">Unsettled</span>' : ''}${p.wantsTo && isMine(p) && team(p.wantsTo) ? `<span class="atag bad">Wants ${esc(team(p.wantsTo).nick)}</span>` : ''}${p.movePromise != null && isMine(p) ? '<span class="atag">Promised a move</span>' : ''}</div>
      ${isMine(p) && interestFor(p.id).length ? `<div class="ph-sub wantedby">Wanted by: ${interestFor(p.id).slice(0, 4).map((i) => `${badge(team(i.tid))} <span class="ilv ${INTEREST_LVL[i.lvl][1]}">${INTEREST_LVL[i.lvl][0]}</span>`).join(' ')}</div>` : ''}</div></div>
    <div class="ph-stats">
      <div><span>Ability</span>${starsHTML(stars(seenCA(p)))}</div>
      <div><span>Potential</span>${starsHTML(stars(seenPot(p)))}</div>
      <div><span>Condition</span>${condHTML(p.cond)}</div>
      <div><span>Morale</span>${moraleHTML(p.morale)}</div>
      <div><span>${p.team == null ? 'Asking' : 'Salary'}</span><b>${fmtMoney(p.team == null ? askingSalary(p) : p.contract.sal)}${p.team != null ? ` · ${p.contract.yrs}y` : ''}</b></div>
    </div>
    <div class="row-btns">${actions}</div>
  </div>
  ${tabs('player', [['attr', 'Attributes'], ['notes', 'Profile'], ['stats', 'Stats'], ['career', 'History']])}
  <div class="scrollx">${body}</div>`;
};

/* Team (other) */
VIEWS.team = ({ id }) => {
  const t = team(id), lg = league(t.lg);
  const r = sortedRoster(id);
  const tc = t.tactics;
  return `${header(esc(teamName(t)))}
  <div class="pad"><div class="card teamcard" style="--pc:${t.c1}">${badge(t, 'xl')}<div class="grow"><div class="b big">${esc(teamName(t))}</div><div class="muted">${lgFlag(lg)} ${esc(lg.name)} · ${t.w}-${t.l} · ${ordinal(teamRank(t.id))}</div>
  <div class="muted sm">${TACTIC_OPTS.system.find((x) => x[0] === tc.system)?.[1] || 'Motion'} offense · ${TACTIC_OPTS.defense.find((x) => x[0] === tc.defense)?.[1]} defense · ${tc.pace} pace</div>
  <div class="muted sm">Prestige ${prestigeStars(t.prestige)} · Payroll ${fmtMoney(teamPayroll(t.id))}</div>
  ${t.coach && t.id !== S.userTeam ? `<div class="sm">Coach: <b>${esc(t.coach.name)}</b>${coachRival(t) ? ` <span class="rivlvl">⚔️ ${rivalLabel(coachRival(t).pts)}</span>` : ''}</div>` : ''}</div></div></div>
  <div class="scrollx"><table class="tbl"><thead><tr><th>Pos</th><th class="l">Player</th><th>Age</th><th>Ability</th><th>PPG</th><th>Salary</th></tr></thead><tbody>
  ${r.map((p, i) => `<tr data-act="player" data-id="${p.id}" class="${i === 5 ? 'sep' : ''}"><td><span class="ps">${p.pos}</span></td><td class="l nm">${injHTML(p)}${esc(pname(p, true))}</td><td>${p.age}</td><td>${starsHTML(stars(seenCA(p)))}</td><td>${avg1(p.st.pts, p.st.gp)}</td><td>${fmtMoney(p.contract.sal)}</td></tr>`).join('')}
  </tbody></table></div>`;
};

/* Tactics */
function rotationList(r, opts = {}) {
  const slotName = (i) => (i < 5 ? POS[i] : i < 10 ? 'Bench' : 'Reserve');
  return `<div class="list rot">${r.map((p, i) => `<button class="li rotrow ${UI.sel === p.id ? 'sel' : ''} ${i === 5 || i === 10 ? 'gap' : ''}" data-act="${opts.act || 'rotSel'}" data-id="${p.id}">
    <span class="slot ${i < 5 ? 'st' : i < 10 ? 'bn' : 'rs'}">${slotName(i)}</span><span class="jn">${p.num ?? '–'}</span><span class="ps">${p.pos}</span>
    <span class="grow nm">${injHTML(p)}${esc(pname(p, true))}</span>${opts.live ? `<span class="mins">${opts.live(p)}</span>` : starsHTML(stars(calcCA(p)))}${condHTML(p.cond)}
    ${opts.live ? '' : `<span class="mins">${i < MIN_PLAN.length ? MIN_PLAN[i] + "'" : '–'}</span>`}</button>`).join('')}</div>`;
}
function tacticsPanel(tc, which) {
  const keys = which === 'off' ? ['pace', 'system', 'focus', 'oreb'] : ['defense', 'help', 'intensity'];
  return keys.map((k) => `<div class="tac"><label>${TACTIC_LABEL[k]}</label>${tacSeg(k, tc[k])}${TACTIC_DESC[tc[k]] ? `<p class="hint">${TACTIC_DESC[tc[k]]}</p>` : ''}</div>`).join('');
}
VIEWS.tactics = () => {
  const t = userTeam();
  const r = sortedRoster(t.id);
  if (!t.tactics.system) t.tactics = { ...DEFAULT_TACTICS(), ...t.tactics };
  const tc = t.tactics;
  const tab = curTab('tac', 'off');
  let body = '';
  if (tab === 'off' || tab === 'def') body = `<div class="pad"><div class="card">${tacticsPanel(tc, tab)}</div><p class="hint">Your Tactical Knowledge (${S.coach.a.tac}) affects how well systems work. ${tab === 'off' ? `Offensive Coaching: ${S.coach.a.off}.` : `Defensive Coaching: ${S.coach.a.def}.`}</p></div>`;
  else if (tab === 'roles') {
    body = `<div class="pad"><p class="hint">Give players roles and instructions. Coachable players follow them more closely. One player can be your Defensive Stopper — he shadows the opponent's top scorer.</p></div>
    <div class="list">${r.slice(0, 12).map((p, i) => { const ins = t.instr[p.id] || {}; const rk = ins.role || 'bal'; return `<div class="li rolecard ${i === 5 ? 'gap' : ''}">
      <div class="rc-top"><span class="ps">${p.pos}</span><b class="grow nm" data-act="player" data-id="${p.id}">${esc(pname(p, true))}</b>${starsHTML(stars(roleScore(p, rk)))}</div>
      <div class="rc-row"><select class="inp sm" data-chg="setRole" data-id="${p.id}">${Object.entries(ROLES).map(([k, v]) => `<option value="${k}" ${k === rk ? 'selected' : ''}>${v.n}${k !== 'bal' ? ` (${stars(roleScore(p, k))}★)` : ''}</option>`).join('')}</select></div>
      <div class="rc-row"><span class="muted sm grow">Minutes target</span><span class="stepper"><button data-act="setMin" data-id="${p.id}" data-d="-2">−</button><span class="minv">${ins.min != null ? ins.min + "'" : 'Auto'}</span><button data-act="setMin" data-id="${p.id}" data-d="2">+</button></span>${ins.min != null ? `<button class="chip" data-act="setMin" data-id="${p.id}" data-d="auto">Auto</button>` : ''}</div>
      <div class="rc-row"><div class="seg mini">${[[-1, 'Fewer shots'], [0, 'Normal'], [1, 'More shots']].map(([v, l]) => `<button class="${(ins.shots || 0) === v ? 'on' : ''}" data-act="setShots" data-id="${p.id}" data-v="${v}">${l}</button>`).join('')}</div>
      <button class="chip ${ins.lock ? 'on' : ''}" data-act="setLock" data-id="${p.id}">🔒 Stopper</button></div></div>`; }).join('')}</div>`;
  } else {
    body = `<div class="pad"><div class="sec-row"><h2 class="sec">Rotation</h2><button class="btn sm" data-act="autoRot">Auto-pick</button></div>
    <label class="check"><input type="checkbox" data-chg="autoRotToggle" ${S.autoRot ? 'checked' : ''}> Let my assistant pick the rotation before every game</label>
    <p class="hint">Tap a player, then another to swap. Top 5 start; bench 6–10 get minutes; reserves don't play.</p></div>${rotationList(r)}`;
  }
  return `${header('Tactics')}${tabs('tac', [['off', 'Offense'], ['def', 'Defense'], ['roles', 'Roles'], ['rot', 'Rotation']])}${body}`;
};

/* League */
VIEWS.league = () => {
  const lid = UI.tab.lgSel || userTeam().lg;
  const lg = league(lid) || userLeague();
  const tab = curTab('league', 'table');
  let body = '';
  if (tab === 'table') {
    const st = standings(lg.id);
    const lead = st[0];
    const po = poQualifiers(st.length);
    const promo = promotionLeague(lg), rel = relegationLeague(lg);
    body = `<table class="tbl"><thead><tr><th>#</th><th class="l">Team</th><th>W</th><th>L</th><th>Pct</th><th>GB</th><th>Diff</th><th>Strk</th></tr></thead><tbody>
    ${st.map((t, i) => { const gp = t.w + t.l; const gb = ((lead.w - t.w) + (t.l - lead.l)) / 2; const z = promo && i < 2 ? 'zpro' : rel && i >= st.length - 2 ? 'zrel' : ''; return `<tr data-act="go" data-v="team" data-id="${t.id}" class="${t.id === S.userTeam ? 'me' : ''} ${i === po - 1 ? 'cut' : ''} ${z}"><td>${i + 1}</td><td class="l nm">${badge(t)} ${esc(t.nick)}</td><td>${t.w}</td><td>${t.l}</td><td>${gp ? (t.w / gp).toFixed(3).replace(/^0/, '') : '.000'}</td><td>${gb ? gb.toFixed(1) : '–'}</td><td class="${t.pf - t.pa >= 0 ? 'pos' : 'neg'}">${t.pf - t.pa > 0 ? '+' : ''}${t.pf - t.pa}</td><td>${t.streak ? (t.streak > 0 ? 'W' + t.streak : 'L' + -t.streak) : '–'}</td></tr>`; }).join('')}
    </tbody></table><p class="hint pad">Top ${po} make the playoffs.${promo ? ' <span class="pos">Top 2 promoted.</span>' : ''}${rel ? ' <span class="neg">Bottom 2 relegated.</span>' : ''}</p>`;
  } else if (tab === 'fix') {
    const fx = S.schedule.filter((f) => f.h === S.userTeam || f.a === S.userTeam).sort((a, b) => a.day - b.day);
    body = `<div class="list">${fx.map((f) => { const home = f.h === S.userTeam; const opp = team(home ? f.a : f.h); const us = home ? f.hs : f.as, them = home ? f.as : f.hs; return `<div class="li fx ${f.played ? '' : 'up'}"><span class="fxd">${fmtDate(S.season, f.day, true)}</span><span class="ha">${home ? 'vs' : '@'}</span>${badge(opp)}<span class="grow">${esc(opp.nick)}${f.type === 'po' ? ` <span class="tagx">PO G${f.game}</span>` : ''}</span>${f.played ? `<b class="${us > them ? 'pos' : 'neg'}">${us > them ? 'W' : 'L'} ${us}-${them}</b>` : '<span class="muted">—</span>'}</div>`; }).join('') || '<p class="empty">No fixtures.</p>'}</div>`;
  } else if (tab === 'res') {
    const days = [...new Set(S.schedule.filter((f) => f.played && f.lg === lg.id).map((f) => f.day))].sort((a, b) => b - a).slice(0, 4);
    body = days.length ? days.map((d) => `<h3 class="sec pad">${fmtDate(S.season, d)}</h3><div class="list">${S.schedule.filter((f) => f.day === d && f.played && f.lg === lg.id).map((f) => { const H = team(f.h), A = team(f.a); const pom = S.players[f.pom]; return `<div class="li res ${f.h === S.userTeam || f.a === S.userTeam ? 'me' : ''}"><span class="rt">${badge(A)} ${esc(A.abbr)}</span><b class="${f.as > f.hs ? 'w' : ''}">${f.as}</b><span class="at">@</span><b class="${f.hs > f.as ? 'w' : ''}">${f.hs}</b><span class="rt">${esc(H.abbr)} ${badge(H)}</span>${pom ? `<span class="pom" data-act="player" data-id="${pom.id}">★ ${esc(pname(pom, true))}</span>` : ''}</div>`; }).join('')}</div>`).join('') : '<p class="empty">No games played yet.</p>';
  } else if (tab === 'lead') {
    const ts = new Set(lgTeams(lg.id).map((t) => t.id));
    const maxGp = Math.max(1, ...lgTeams(lg.id).map((t) => t.w + t.l));
    const pl = Object.values(S.players).filter((p) => ts.has(p.team) && p.st.gp >= maxGp * 0.4);
    const cats = [['pts', 'Points'], ['reb', 'Rebounds'], ['ast', 'Assists'], ['stl', 'Steals'], ['blk', 'Blocks']];
    body = `<div class="pad">${cats.map(([k, n]) => `<div class="card lead"><h3>${n} per game</h3>${pl.sort((a, b) => b.st[k] / b.st.gp - a.st[k] / a.st.gp).slice(0, 5).map((p, i) => `<div class="lrow ${p.team === S.userTeam ? 'me' : ''}" data-act="player" data-id="${p.id}"><span>${i + 1}</span>${badge(team(p.team))}<span class="grow">${esc(pname(p, true))}</span><b>${avg1(p.st[k], p.st.gp)}</b></div>`).join('') || '<p class="muted">No data yet</p>'}</div>`).join('')}</div>`;
  } else if (tab === 'po') body = playoffBracket(lg);
  else if (tab === 'hist') {
    const h = S.history.filter((x) => x.lg === lg.id);
    body = h.length ? `<table class="tbl"><thead><tr><th class="l">Season</th><th class="l">Champion</th><th class="l">MVP</th></tr></thead><tbody>${h.map((x) => `<tr><td class="l">${x.season}/${String(x.season + 1).slice(2)}</td><td class="l">${esc(x.champName)}</td><td class="l">${esc(x.mvp)}</td></tr>`).join('')}</tbody></table>` : '<p class="empty">History is written at the end of each season.</p>';
  }
  return `${header(`${lgFlag(lg)} ${esc(lg.name)}`)}<div class="pad tight">${leagueChips(lg.id, 'lgSel')}</div>${tabs('league', [['table', 'Standings'], ['fix', 'My Fixtures'], ['res', 'Results'], ['lead', 'Leaders'], ['po', 'Playoffs'], ['hist', 'History']])}<div class="scrollx">${body}</div>`;
};
function playoffBracket(lg) {
  const P = lg.po;
  if (!P) return `<p class="empty">The playoffs start after the regular season. Top ${poQualifiers(lgTeams(lg.id).length)} qualify.</p>`;
  const rounds = [1, 2, 3].filter((r) => P.series.some((s) => s.round === r));
  return `<div class="pad">${P.champion ? `<div class="card champ">🏆 <b>${esc(teamName(team(P.champion)))}</b> are champions!</div>` : ''}${rounds.map((r) => `<h3 class="sec">${ROUND_NAMES[r]} <span class="muted sm">· best of ${bestOf(r)}</span></h3>${P.series.filter((s) => s.round === r).map((s) => { const A = team(s.a), B = team(s.b); const w = seriesWinner(s); return `<div class="card series ${s.a === S.userTeam || s.b === S.userTeam ? 'me' : ''}"><div class="srow ${w === s.a ? 'w' : w ? 'l' : ''}"><span class="seed">${P.seeds.indexOf(s.a) + 1}</span>${badge(A)}<span class="grow">${esc(A.nick)}</span><b>${s.wa}</b></div><div class="srow ${w === s.b ? 'w' : w ? 'l' : ''}"><span class="seed">${P.seeds.indexOf(s.b) + 1}</span>${badge(B)}<span class="grow">${esc(B.nick)}</span><b>${s.wb}</b></div></div>`; }).join('')}`).join('')}</div>`;
}

/* Market */
VIEWS.market = () => {
  const tab = curTab('market', 'fa');
  if (tab === 'tl') return transferListView();
  if (tab === 'rm') return rumourMillView();
  const pos = UI.tab.mpos || 'ALL', sort = UI.tab.msort || 'ca', ml = UI.tab.mlg || 'ALL';
  let pl = tab === 'fa' ? freeAgents() : Object.values(S.players).filter((p) => p.team != null && p.team !== S.userTeam);
  if (pos !== 'ALL') pl = pl.filter((p) => p.pos === pos);
  if (tab === 'tr' && ml !== 'ALL') pl = pl.filter((p) => team(p.team).lg === ml);
  if (tab === 'tr' && UI.tab.mout === '1') pl = pl.filter((p) => p.wantsOut);
  const cache = new Map(pl.map((p) => [p.id, { ca: seenCA(p), pot: seenPot(p) }]));
  const key = { ca: (p) => -cache.get(p.id).ca, pot: (p) => -cache.get(p.id).pot, age: (p) => p.age, sal: (p) => (tab === 'fa' ? askingSalary(p) : p.contract.sal) }[sort];
  pl.sort((a, b) => key(a) - key(b));
  const ut = userTeam();
  const room = ut.budget - teamPayroll(ut.id);
  return `${header('Market')}${tabs('market', [['fa', 'Free Agents'], ['tr', 'Trade Targets']].concat(MARKET_EXTRA))}
  <div class="pad filters">
    ${tab === 'tr' ? leagueChips(ml, 'mlg', true) : ''}
    <div class="chips">${['ALL', ...POS].map((p) => `<button class="chip ${pos === p ? 'on' : ''}" data-act="tab" data-k="mpos" data-v="${p}">${p}</button>`).join('')}${tab === 'tr' ? `<button class="chip ${UI.tab.mout === '1' ? 'on' : ''}" data-act="tab" data-k="mout" data-v="${UI.tab.mout === '1' ? '0' : '1'}">Wants out</button>` : ''}</div>
    <div class="chips">${[['ca', 'Ability'], ['pot', 'Potential'], ['age', 'Age'], ['sal', 'Salary']].map(([k, n]) => `<button class="chip ${sort === k ? 'on' : ''}" data-act="tab" data-k="msort" data-v="${k}">${n}</button>`).join('')}</div>
    <div class="muted sm">Wage room: <b class="${room < 0 ? 'neg' : 'pos'}">${fmtMoney(Math.max(0, room))}</b> · Roster ${roster(ut.id).length}/${ROSTER_MAX}${S.phase === 'season' && deadlinePassed() ? ' · <span class="neg">Trade window closed</span>' : ''}</div>
  </div>
  <div class="scrollx"><table class="tbl"><thead><tr><th>Pos</th><th class="l">Player</th><th>Age</th><th>Ability</th><th>Pot.</th><th>${tab === 'fa' ? 'Asks' : 'Club'}</th></tr></thead><tbody>
  ${pl.slice(0, 80).map((p) => `<tr data-act="player" data-id="${p.id}"><td><span class="ps">${p.pos}</span></td><td class="l nm">${injHTML(p)}${esc(pname(p, true))}${p.rookie ? ' <span class="tagx">NEW</span>' : ''}${p.listed ? ' <span class="tagx tl">LISTED</span>' : p.wantsOut ? ' <span class="tagx">OUT</span>' : ''}</td><td>${p.age}</td><td>${starsHTML(stars(cache.get(p.id).ca))}</td><td>${starsHTML(stars(cache.get(p.id).pot))}</td><td>${tab === 'fa' ? fmtMoney(askingSalary(p)) : badge(team(p.team))}</td></tr>`).join('') || '<tr><td colspan="6" class="empty">Nobody matches.</td></tr>'}
  </tbody></table></div>`;
};

/* Trade builder */
VIEWS.trade = ({ id }) => {
  const tgt = S.players[id];
  if (!tgt || tgt.team == null || tgt.team === S.userTeam) return header('Trade') + '<p class="empty">Player unavailable.</p>';
  UI.offer = UI.offer && UI.offer.tid === id ? UI.offer : { tid: id, ids: [] };
  const off = UI.offer.ids;
  const t = team(tgt.team);
  const interest = tradeInterest(id, off);
  const mine = sortedRoster(S.userTeam).sort((a, b) => playerValue(b) - playerValue(a));
  const inSal = tgt.contract.sal, outSal = off.reduce((s, x) => s + S.players[x].contract.sal, 0);
  return `${header('Trade Offer')}
  <div class="pad">
    <div class="card"><div class="muted sm">You receive</div>
      <div class="trow">${badge(t)}<div class="grow"><b>${esc(pname(tgt))}</b><div class="muted sm">${tgt.pos} · ${tgt.age} yrs · ${fmtMoney(tgt.contract.sal)} × ${tgt.contract.yrs}y${tgt.wantsOut ? ' · <span class="warn-t">wants out</span>' : ''}</div></div>${starsHTML(stars(seenCA(tgt)))}</div></div>
    <div class="card"><div class="muted sm">${esc(t.nick)} interest</div>
      <div class="meter"><div style="width:${clamp(interest * 100, 0, 100)}%" class="${interest >= 1 ? 'ok' : interest > 0.8 ? 'mid' : ''}"></div></div>
      <div class="sm muted">${off.length ? (interest >= 1 ? 'They will accept — if he agrees to come.' : interest > 0.8 ? 'Close — add a bit more value.' : 'Not enough. Add better players or younger talent.') : 'Select players to offer below.'}</div>
      <div class="sm muted">Salary in ${fmtMoney(inSal)} · out ${fmtMoney(outSal)}</div></div>
    <h3 class="sec">You give</h3></div>
  <div class="list">${mine.map((p) => `<button class="li ${off.includes(p.id) ? 'sel' : ''}" data-act="offerToggle" data-id="${p.id}"><span class="cbx">${off.includes(p.id) ? '✓' : ''}</span><span class="ps">${p.pos}</span><span class="grow nm">${esc(pname(p, true))} <span class="muted sm">${p.age}y · ${fmtMoney(p.contract.sal)}</span></span>${starsHTML(stars(calcCA(p)))}</button>`).join('')}</div>
  <div class="sticky-cta"><button class="btn primary big" data-act="proposeTrade" ${off.length ? '' : 'disabled'}>Propose Trade</button></div>`;
};

/* More / Club / Coach / Jobs */
VIEWS.more = () => `${header('More')}
  <div class="list menu-list">
    <button class="li" data-act="go" data-v="coach"><span class="grow"><b>Coach Profile</b><div class="muted sm">${esc(S.coach.name)} · ${repLabel(S.coach.rep)} reputation</div></span>›</button>
    <button class="li" data-act="rumours"><span class="grow"><b>Rumour Mill</b><div class="muted sm">Hot seat, rumours, biggest trades & signings</div></span>›</button>
    <button class="li" data-act="go" data-v="staff"><span class="grow"><b>Staff</b><div class="muted sm">Assistant, scout, youth & fitness coaches · former players</div></span>›</button>
    <button class="li" data-act="go" data-v="club"><span class="grow"><b>Club & Board</b><div class="muted sm">Board confidence, finances</div></span>›</button>
    <button class="li" data-act="go" data-v="jobs"><span class="grow"><b>Job Centre</b><div class="muted sm">${S.phase === 'offseason' && S.vacancies.length ? `<span class="pos">${S.vacancies.length} vacancies open</span>` : 'Opens at the end of each season'}</div></span>›</button>
    <button class="li" data-act="go" data-v="training"><span class="grow"><b>Training</b><div class="muted sm">Focus: ${TRAINING[S.training].n}</div></span>›</button>
    <button class="li" data-act="go" data-v="achievements"><span class="grow"><b>🏆 Achievements</b><div class="muted sm">${Object.keys(achStore()).length}/${ACHIEVEMENTS.length} unlocked${S.ironman ? '' : ' · Ironman careers only'}</div></span>›</button>
    <button class="li" data-act="go" data-v="editor"><span class="grow"><b>Database Editor</b><div class="muted sm">${S.ironman ? '🔒 Locked in Ironman mode' : 'Leagues, clubs, players, hidden attributes · share files'}</div></span>›</button>
    <button class="li" data-act="go" data-v="settings"><span class="grow"><b>Save & Settings</b><div class="muted sm">Backup, restore, start over</div></span>›</button>
    <button class="li" data-act="toTitle"><span class="grow"><b>Main Menu</b></span>›</button>
  </div>`;
VIEWS.coach = () => {
  const c = S.coach;
  return `${header('Coach Profile', { right: S.ironman ? '<span class="imtag">IRONMAN</span>' : `<button class="btn sm" data-act="go" data-v="editCoach">${icon('edit')} Edit</button>` })}
  <div class="pad"><div class="card coachcard"><div class="coachhead"><div class="avatar">${coachFace(84)}</div><div><div class="big b">${esc(c.name)}</div><button class="btn sm" data-act="go" data-v="coachLook">Change look</button></div></div><div class="muted">${COACH_STYLES[c.style]?.n || 'Coach'} · ${esc(teamName(userTeam()))}</div>
    <div class="kv"><span>Reputation</span><b>${repLabel(c.rep)} (${Math.round(c.rep)})</b></div><div class="meter"><div class="ok" style="width:${c.rep * 5}%"></div></div>
    <div class="kv"><span>Record</span><b>${c.wins}-${c.games - c.wins}${c.games ? ` (${Math.round((c.wins / c.games) * 100)}%)` : ''}</b></div><div class="kv"><span>Titles</span><b>${c.titles}</b></div>
    <div class="kv"><span>Career started</span><b>${fmtDate(c.start.season, c.start.day)}</b></div><div class="kv"><span>Joined club</span><b>${fmtDate(c.joined.season, c.joined.day)}</b></div>
    <div class="kv"><span>Days in charge</span><b>${daysBetween(c.joined, { season: S.season, day: S.day })}</b></div>
    <div class="kv"><span>Player's Coach</span><b>${attrCell(c.pcoach ?? 10)}</b></div></div>
    <div class="card"><h3>Bio</h3><p class="bio">${esc(coachBio())}</p></div>
    <div class="card rivalcard"><h3>⚔️ Personal rivals</h3>${(S.rivals?.coach || []).length ? S.rivals.coach.map((r) => { const t = S.teams.find((x) => x.coach && x.coach.name === r.name); return `<div class="lrow"><span class="grow"><b>${esc(r.name)}</b> ${t ? badge(t) : '<span class="muted sm">(out of work)</span>'}<div class="muted sm">${esc(r.reasons.join(' · ') || 'Long-running feud')}</div></span><span class="rivlvl">${rivalLabel(r.pts)}</span></div>`; }).join('') : '<p class="muted">No rivals yet. Clash with coaches in the press, poach their stars or battle them in tight games and the media will make it personal.</p>'}</div></div>
  <div class="attr-grid three">${COACH_GROUPS.map((g) => `<div class="attr-box"><h3>${g}</h3>${COACH_ATTRS.filter((a) => a.g === g).map((a) => `<div class="arow"><span>${a.n}</span>${attrCell(c.a[a.k])}</div>`).join('')}</div>`).join('')}</div>
  <div class="pad"><p class="hint">Coaching attributes shape matches (Offense, Defense, Tactical Knowledge), development (Player Development, Conditioning), team talks (Motivating, Man Management, Discipline) and how accurately you rate players (Judging Ability / Potential). They grow with experience and success.</p></div>
  <h3 class="sec pad">Career</h3>
  <div class="scrollx"><table class="tbl"><thead><tr><th class="l">Season</th><th class="l">Club</th><th>Lg</th><th>Rec</th><th class="l">Result</th></tr></thead><tbody>${c.hist.length ? c.hist.map((h) => `<tr><td class="l">${h.season}/${String(h.season + 1).slice(2)}</td><td class="l nm">${esc(h.club)}</td><td>${esc(h.lg)}</td><td>${esc(h.rec)}</td><td class="l">${esc([h.finish, h.note].filter(Boolean).join(' · '))}</td></tr>`).join('') : '<tr><td colspan="5" class="empty">Your first season is under way.</td></tr>'}</tbody></table></div>`;
};
VIEWS.club = () => {
  const t = userTeam();
  const pay = teamPayroll(t.id);
  const c = Math.round(S.board.conf);
  return `${header('Club & Board')}
  <div class="pad">
    <div class="card"><h3>Board confidence</h3><div class="meter big"><div style="width:${c}%" class="${c >= 60 ? 'ok' : c >= 35 ? 'mid' : 'bad'}"></div></div>
      <div class="kv"><span>Confidence</span><b>${c}%</b></div><div class="kv"><span>Season expectation</span><b>${esc(S.board.exp.txt)}</b></div><div class="kv"><span>Current position</span><b>${ordinal(teamRank(t.id))}</b></div>
      <p class="hint">Drop too low and you'll be shown the door — mid-season if things get really bad.</p></div>
    <button class="btn big" data-act="go" data-v="clubHistory">🏛️ Club History & Retired Numbers</button>
    <div class="card"><h3>Club</h3><div class="kv"><span>League</span><b>${lgFlag(league(t.lg))} ${esc(league(t.lg).name)}</b></div><div class="kv"><span>Prestige</span><b>${prestigeStars(t.prestige)}</b></div></div>
    <div class="card"><h3>Finances</h3>
      <div class="kv"><span>Wage budget</span><b>${fmtMoney(t.budget)}</b></div><div class="kv"><span>Payroll</span><b>${fmtMoney(pay)}</b></div><div class="kv"><span>Room</span><b class="${t.budget - pay >= 0 ? 'pos' : 'neg'}">${fmtMoney(Math.abs(t.budget - pay))}${t.budget - pay < 0 ? ' over' : ''}</b></div>
      <div class="meter"><div style="width:${clamp((pay / t.budget) * 100, 0, 100)}%" class="${pay <= t.budget ? 'ok' : 'bad'}"></div></div></div>
  </div>`;
};
VIEWS.jobs = () => {
  const open = S.phase === 'offseason' || S.phase === 'sacked';
  const list = S.phase === 'sacked' ? sackedOffers() : S.vacancies.map(team);
  const chanceTxt = (t) => { const c = jobChance(t.id); return c >= 0.7 ? ['Strong candidate', 'pos'] : c >= 0.4 ? ['Possible', 'warn-t'] : ['Long shot', 'neg']; };
  return `${header('Job Centre')}
  <div class="pad"><div class="card"><div class="kv"><span>Your reputation</span><b>${repLabel(S.coach.rep)} (${Math.round(S.coach.rep)})</b></div><p class="hint">${open ? 'Clubs with an open head coach position. Bigger clubs want bigger reputations.' : 'The job market opens when the season ends. Keep an ear on the grapevine for coaches on thin ice.'}</p></div></div>
  ${open ? `<div class="list">${list.length ? list.map((t) => { const [l, c] = chanceTxt(t); const lg = league(t.lg); return `<div class="li"><span>${badge(t, 'lg')}</span><span class="grow"><b>${esc(teamName(t))}</b><div class="muted sm">${lgFlag(lg)} ${esc(lg.name)} · ${prestigeStars(t.prestige)}</div><div class="sm ${c}">${S.phase === 'sacked' ? 'Interested in you' : l}</div></span>${S.phase === 'sacked' ? `<button class="btn sm primary" data-act="takeJob" data-id="${t.id}">Accept</button>` : `<button class="btn sm" data-act="applyJob" data-id="${t.id}" ${S.applied.includes(t.id) ? 'disabled' : ''}>${S.applied.includes(t.id) ? 'Applied' : 'Apply'}</button>`}</div>`; }).join('') : '<p class="empty">No vacancies right now.</p>'}</div>` : ''}`;
};
VIEWS.training = () => `${header('Training')}
  <div class="pad"><p class="hint">Training focus affects how your players develop. Young, professional, hard-working players with minutes improve fastest. Your Player Development (${S.coach.a.dev}) and Conditioning (${S.coach.a.fit}) attributes matter.</p></div>
  <div class="list">${Object.entries(TRAINING).map(([k, v]) => `<button class="li ${S.training === k ? 'sel' : ''}" data-act="training" data-v="${k}"><span class="cbx">${S.training === k ? '✓' : ''}</span><span class="grow"><b>${v.n}</b><div class="muted sm">${v.d}</div></span></button>`).join('')}</div>`;
VIEWS.settings = () => `${header('Save & Settings')}
  <div class="pad">
    <div class="card"><h3>Press conferences</h3><p class="hint">Face the media yourself, or send your assistant (he keeps it measured — no drama, no rivalry fuel).</p>
      <label class="lbl">Pre-match</label><div class="seg">${[['me', 'I\'ll do it'], ['assistant', 'Assistant']].map(([v, l]) => `<button class="${S.press.pre === v ? 'on' : ''}" data-act="pressSet" data-k="pre" data-v="${v}">${l}</button>`).join('')}</div>
      <label class="lbl">Post-match</label><div class="seg">${[['me', 'I\'ll do it'], ['assistant', 'Assistant']].map(([v, l]) => `<button class="${S.press.post === v ? 'on' : ''}" data-act="pressSet" data-k="post" data-v="${v}">${l}</button>`).join('')}</div></div>
    <div class="card"><h3>Career mode</h3><div class="kv"><span>Difficulty</span><b>${DIFFICULTY[S.diff || 'normal'].n}</b></div><div class="kv"><span>Mode</span><b>${S.ironman ? '🛡️ Ironman' : 'Standard'}</b></div></div>
    <div class="card"><h3>Save game</h3><p class="hint">Your career auto-saves on this device after every action.</p>
      ${S.ironman ? '<p class="hint">🔒 Ironman: backups and restores are disabled. Matches you start are final — reloading the app plays them out.</p>' : `<div class="row-btns"><button class="btn" data-act="exportSave">Download backup</button><label class="btn file">Restore backup<input type="file" accept=".json,application/json" data-chg="importSave" hidden></label></div>`}</div>
    <div class="card"><h3>Danger zone</h3><div class="row-btns"><button class="btn danger" data-act="deleteSave">Delete career</button></div></div>
    <p class="fine">Courtside Manager · all players, clubs, leagues and names are fictional.</p>
  </div>`;

/* Editor */
VIEWS.editor = () => {
  if (S.ironman) return ironLocked();
  const tab = curTab('editor', 'players');
  let body = '';
  if (tab === 'share') {
    body = `<div class="pad">
      <div class="card"><h3>Share your database</h3><p class="hint">Export every league, club and player (including hidden attributes) as a file. Others load it from the main menu with “Start with Custom Database”.</p>
      <div class="row-btns"><button class="btn primary" data-act="exportDb">Export database</button><button class="btn" data-act="copyDb">Copy as text</button></div></div>
      <div class="card"><h3>Load a database</h3><p class="hint">Starts a <b>new career</b> with the imported world.</p>
      <div class="row-btns"><label class="btn file">Import file<input type="file" accept=".json,application/json" data-chg="importDbNew" hidden></label><button class="btn" data-act="pasteDb">Paste text</button></div></div></div>`;
  } else if (tab === 'leagues') {
    body = `<div class="pad">${S.leagues.map((l) => `<div class="card"><div class="two"><div><label class="lbl">${lgFlag(l)} Name</label><input class="inp" value="${esc(l.name)}" data-chg="edLeague" data-id="${l.id}" data-f="name" maxlength="40"></div><div><label class="lbl">Short</label><input class="inp" value="${esc(l.short)}" data-chg="edLeague" data-id="${l.id}" data-f="short" maxlength="6"></div></div><p class="muted sm">${l.tier === 2 ? '2nd tier' : 'Top tier'} · ${lgTeams(l.id).length} clubs</p></div>`).join('')}</div>`;
  } else if (tab === 'teams') {
    const lf = UI.tab.edlg || userTeam().lg;
    body = `<div class="pad tight">${leagueChips(lf, 'edlg')}</div><div class="list">${lgTeams(lf).map((t) => `<button class="li" data-act="go" data-v="editTeam" data-id="${t.id}">${badge(t, 'lg')}<span class="grow"><b>${esc(teamName(t))}</b><div class="muted sm">${roster(t.id).length} players · budget ${fmtMoney(t.budget)}</div></span>${icon('edit')}</button>`).join('')}</div>`;
  } else {
    const q = (UI.tab.edq || '').toLowerCase();
    const ft = UI.tab.edteam || String(S.userTeam);
    let pl = Object.values(S.players);
    if (ft === 'fa') pl = pl.filter((p) => p.team == null); else if (ft !== 'all') pl = pl.filter((p) => p.team === +ft);
    if (q) pl = pl.filter((p) => (p.first + ' ' + p.last).toLowerCase().includes(q));
    pl.sort((a, b) => calcCA(b) - calcCA(a));
    body = `<div class="pad filters"><input class="inp" placeholder="Search players… (press Enter)" value="${esc(UI.tab.edq || '')}" data-chg="edSearch" id="edq">
      <select class="inp" data-chg="edTeamFilter"><option value="all" ${ft === 'all' ? 'selected' : ''}>All players</option><option value="fa" ${ft === 'fa' ? 'selected' : ''}>Free agents</option>${S.leagues.map((l) => `<optgroup label="${esc(l.name)}">${lgTeams(l.id).map((t) => `<option value="${t.id}" ${+ft === t.id ? 'selected' : ''}>${esc(teamName(t))}</option>`).join('')}</optgroup>`).join('')}</select>
      <div class="row-btns"><button class="btn primary" data-act="newPlayer">+ New player</button></div></div>
      <div class="list">${pl.slice(0, 100).map((p) => `<button class="li" data-act="go" data-v="editPlayer" data-id="${p.id}">${badge(p.team != null ? team(p.team) : null)}<span class="ps">${p.pos}</span><span class="grow nm">${esc(pname(p))} <span class="muted sm">${p.age}y</span></span>${starsHTML(stars(calcCA(p)))}</button>`).join('')}${pl.length > 100 ? `<p class="empty">${pl.length - 100} more — refine your search.</p>` : ''}</div>`;
  }
  return `${header('Database Editor')}${tabs('editor', [['players', 'Players'], ['teams', 'Clubs'], ['leagues', 'Leagues'], ['share', 'Share']])}${body}`;
};
VIEWS.editTeam = ({ id }) => {
  if (S.ironman) return ironLocked();
  const t = team(id);
  return `${header('Edit Club')}
  <div class="pad"><div class="card">
    <div class="trow">${badge(t, 'xl')}<b class="big">${esc(teamName(t))}</b></div>
    <label class="lbl">City</label><input class="inp" id="et_city" value="${esc(t.city)}" maxlength="24">
    <label class="lbl">Nickname</label><input class="inp" id="et_nick" value="${esc(t.nick)}" maxlength="24">
    <div class="two"><div><label class="lbl">Abbreviation</label><input class="inp" id="et_abbr" value="${esc(t.abbr)}" maxlength="4"></div><div><label class="lbl">Prestige (1–20)</label><input class="inp" id="et_pr" type="number" min="1" max="20" value="${t.prestige}"></div></div>
    <div class="two"><div><label class="lbl">Primary colour</label><input type="color" class="inp color" id="et_c1" value="${t.c1}"></div><div><label class="lbl">Text colour</label><input type="color" class="inp color" id="et_c2" value="${t.c2}"></div></div>
    <label class="lbl">Wage budget ($M)</label><input class="inp" id="et_budget" type="number" inputmode="decimal" value="${t.budget}">
    <p class="hint">Moving clubs between leagues takes effect next season (in a new career).</p>
  </div></div>
  <div class="sticky-cta"><button class="btn primary big" data-act="saveTeam" data-id="${t.id}">Save Club</button></div>`;
};
const stepper = (id, v, min = 1, max = 20) => `<span class="stepper"><button data-act="step" data-t="${id}" data-d="-1" data-min="${min}" data-max="${max}">−</button><input type="number" inputmode="numeric" min="${min}" max="${max}" id="${id}" value="${v}" class="t${tier(v)}" data-chg="attrIn"><button data-act="step" data-t="${id}" data-d="1" data-min="${min}" data-max="${max}">+</button></span>`;
VIEWS.editPlayer = ({ id }) => {
  if (S.ironman) return ironLocked();
  const p = S.players[id];
  if (!p) return header('Edit Player') + '<p class="empty">Player not found.</p>';
  ensureHidden(p);
  const num = (key, val, min, max, step = 1) => `<input class="inp num" type="number" inputmode="decimal" id="ep_${key}" value="${val}" min="${min}" max="${max}" step="${step}">`;
  return `${header('Edit Player')}
  <div class="pad"><div class="card">
    <div class="two"><div><label class="lbl">First name</label><input class="inp" id="ep_first" value="${esc(p.first)}" maxlength="20"></div><div><label class="lbl">Last name</label><input class="inp" id="ep_last" value="${esc(p.last)}" maxlength="24"></div></div>
    <div class="two"><div><label class="lbl">Position</label><select class="inp" id="ep_pos">${POS.map((x) => `<option ${x === p.pos ? 'selected' : ''}>${x}</option>`).join('')}</select></div><div><label class="lbl">Nationality</label><select class="inp" id="ep_nat">${NAT_KEYS.map((k) => `<option value="${k}" ${k === p.nat ? 'selected' : ''}>${NATS[k].flag} ${k}</option>`).join('')}</select></div></div>
    <div class="two"><div><label class="lbl">Age</label>${num('age', p.age, 16, 45)}</div><div><label class="lbl">Height (cm)</label>${num('h', p.h, 165, 235)}</div></div>
    <label class="lbl">Club</label><select class="inp" id="ep_team"><option value="">Free agent</option>${S.leagues.map((l) => `<optgroup label="${esc(l.name)}">${lgTeams(l.id).map((t) => `<option value="${t.id}" ${p.team === t.id ? 'selected' : ''}>${esc(teamName(t))}</option>`).join('')}</optgroup>`).join('')}</select>
    <div class="two"><div><label class="lbl">Salary ($M)</label>${num('sal', p.contract.sal, 0.1, 60, 0.05)}</div><div><label class="lbl">Contract years</label>${num('yrs', p.contract.yrs, 0, 6)}</div></div>
    <div class="two"><div><label class="lbl">Potential (1–20) <span class="muted sm">· now ≈ ${calcCA(p).toFixed(1)}</span></label>${num('pot', p.pot, 1, 20, 0.5)}</div><div><label class="lbl">Jersey number</label>${num('num', p.num ?? 0, 0, 99)}</div></div>
  </div>
  <div class="attr-grid edit">${ATTR_GROUPS.map((g) => `<div class="attr-box"><h3>${g}</h3>${ATTRS.filter((a) => a.g === g).map((a) => `<div class="arow"><span>${a.n}</span>${stepper('ep_a_' + a.k, p.a[a.k])}</div>`).join('')}</div>`).join('')}
  <div class="attr-box hiddenbox"><h3>Hidden — editor only</h3>${HIDDEN.map((h) => `<div class="arow"><span>${h.n}</span>${stepper('ep_h_' + h.k, p.hid[h.k])}</div>`).join('')}<p class="hint">In-game these are never shown as numbers. They drive personality, consistency, clutch play, injuries, contract demands and reactions to team talks.</p></div></div>
  <div class="row-btns pad"><button class="btn danger" data-act="deletePlayer" data-id="${p.id}">Delete player</button></div>
  </div>
  <div class="sticky-cta"><button class="btn primary big" data-act="savePlayer" data-id="${p.id}">Save Player</button></div>`;
};
VIEWS.editCoach = () => {
  if (S.ironman) return ironLocked();
  const c = S.coach;
  return `${header('Edit Coach')}
  <div class="pad"><div class="card"><label class="lbl">Name</label><input class="inp" id="ec_name" value="${esc(c.name)}" maxlength="28"><label class="lbl">Reputation (1–20)</label>${stepper('ec_rep', Math.round(c.rep))}</div>
  <div class="attr-grid edit">${COACH_GROUPS.map((g) => `<div class="attr-box"><h3>${g}</h3>${COACH_ATTRS.filter((a) => a.g === g).map((a) => `<div class="arow"><span>${a.n}</span>${stepper('ec_' + a.k, c.a[a.k])}</div>`).join('')}</div>`).join('')}</div></div>
  <div class="sticky-cta"><button class="btn primary big" data-act="saveCoach">Save Coach</button></div>`;
};

/* Pre-match */
VIEWS.prematch = () => {
  const f = S.schedule.find((x) => x.id === S.pending);
  if (!f) { setTimeout(() => go('inbox', {}, { replace: true }), 0); return ''; }
  const H = team(f.h), A = team(f.a);
  const opp = f.h === S.userTeam ? A : H;
  const oppTop = roster(opp.id).filter((p) => !p.inj).sort((a, b) => calcCA(b) - calcCA(a)).slice(0, 3);
  const danger = oppTop[0];
  const best = danger ? ATTRS.slice().sort((a, b) => danger.a[b.k] - danger.a[a.k])[0] : null;
  const myInj = roster(S.userTeam).filter((p) => p.inj);
  const tired = sortedRoster(S.userTeam).slice(0, 8).filter((p) => !p.inj && p.cond < 75);
  const s = f.type === 'po' ? league(f.lg).po.series.find((x) => x.id === f.series) : null;
  const starters = sortedRoster(S.userTeam).slice(0, 5);
  const ot = opp.tactics;
  const tip = ot.defense === 'zone' ? 'Their zone should struggle against perimeter shooting.' : ot.defense === 'press' ? 'They press — good ball handlers and a Floor General will punish it.' : ot.defense === 'switch' ? 'They switch everything. Attack mismatches inside.' : '';
  return `${header(f.type === 'po' ? `${ROUND_NAMES[s.round]} · Game ${f.game}` : 'Match Day', { back: false })}
  <div class="pad">
    <div class="card matchup">
      <div class="mt">${badge(A, 'xl')}<b>${esc(A.nick)}</b><span class="muted sm">${f.type === 'po' ? '' : `${A.w}-${A.l}`}</span>${starsHTML(stars(teamStrength(A.id)))}</div>
      <div class="vs">@<div class="muted sm">${fmtDate(S.season, f.day, true)}</div>${s ? `<div class="sm">Series ${team(s.a).abbr} ${s.wa}–${s.wb} ${team(s.b).abbr}</div>` : ''}</div>
      <div class="mt">${badge(H, 'xl')}<b>${esc(H.nick)}</b><span class="muted sm">${f.type === 'po' ? '' : `${H.w}-${H.l}`}</span>${starsHTML(stars(teamStrength(H.id)))}</div>
    </div>
    ${previewCard(f, H, A)}
    ${pressCard('pre', f)}
    ${myInj.length || tired.length ? `<div class="card">${myInj.length ? `<p class="neg">Unavailable: ${myInj.map((p) => esc(pname(p, true))).join(', ')}</p>` : ''}${tired.length ? `<p class="warn-t">Tired: ${tired.map((p) => `${esc(pname(p, true))} (${Math.round(p.cond)}%)`).join(', ')}</p>` : ''}</div>` : ''}
    <div class="card"><h3>Your starting five</h3>${starters.map((p) => `<div class="lrow" data-act="player" data-id="${p.id}"><span class="mini">${playerFace(p, 28)}</span><span class="jn">${p.num ?? '–'}</span><span class="ps">${p.pos}</span><span class="grow">${injHTML(p)}${esc(pname(p))}${p.instrLock || (userTeam().instr[p.id] || {}).lock ? ' <span class="tagx">🔒 Stopper</span>' : ''}</span><span class="muted sm">${ROLES[(userTeam().instr[p.id] || {}).role || 'bal'].n}</span>${condHTML(p.cond)}</div>`).join('')}
      <div class="row-btns"><button class="btn sm" data-act="go" data-v="tactics" data-keep="1">Change tactics</button></div></div>
  </div>
  <div class="sticky-cta two-btn"><button class="btn big" data-act="playMatch" data-watch="0">Quick Result</button><button class="btn primary big" data-act="playMatch" data-watch="1">${icon('play')} Go to Match</button></div>`;
};

/* Live match */
const SPEEDS = { 1: 4, 2: 8, 4: 16, 8: 32 }; // game seconds per real second (1× ≈ 12-minute game)
function clockAt(t) {
  if (t < 2880) { const q = Math.min(4, Math.floor(t / 720) + 1); return { q, c: Math.max(0, 720 - (t - (q - 1) * 720)) }; }
  const k = Math.floor((t - 2880) / 300); return { q: 5 + k, c: Math.max(0, 300 - (t - 2880 - k * 300)) };
}
const Live = {
  m: null, t: 0, speed: 1, paused: false, painted: -1, tab: 'feed', hlOn: true, raf: 0, last: 0, lastPaint: 0, curRate: 6, hlLabel: null,
  start(m) {
    this.m = m; this.t = 0; this.speed = 1; this.paused = true; this.painted = -1; this.tab = 'feed'; this.finished = false; this.hlLabel = null;
    cancelAnimationFrame(this.raf); this.last = performance.now(); this.raf = requestAnimationFrame((ts) => this.loop(ts));
  },
  loop(ts) {
    if (!this.m || UI.view !== 'match') { this.raf = 0; return; }
    const dt = Math.min(0.1, Math.max(0, (ts - this.last) / 1000)); this.last = ts;
    this.raf = requestAnimationFrame((t2) => this.loop(t2));
    this.step(dt);
    if (ts - this.lastPaint > 120) { this.lastPaint = ts; this.paint(); }
  },
  nearHL() {
    const m = this.m;
    for (let i = m.events.length - 1; i >= 0; i--) {
      const e = m.events[i];
      if (e.g < this.t - 2.5) break;
      if (e.hl && e.g <= this.t + 3.5) return e;
    }
    return null;
  },
  step(dt) {
    const m = this.m;
    if (m.done && this.t >= m.gt) { if (!this.finished) this.finish(); return; }
    if (this.paused || document.querySelector('.modal-bg')) { this.curRate = 0; return; }
    if (m.brk && this.t >= m.gt) { this.curRate = 0; this.breakTime(); return; }
    let rate = SPEEDS[this.speed] || 4;
    this.hlLabel = null;
    if (this.hlOn) { const e = this.nearHL(); if (e) { rate = Math.min(rate, 1.6); this.hlLabel = e.lbl || 'KEY MOMENT'; } }
    this.curRate = rate;
    let nt = this.t + dt * rate;
    if (m.brk || m.done) nt = Math.min(nt, m.gt);
    this.t = nt;
    if (!m.brk && !m.done) simUntil(m, this.t + 0.01);
  },
  shownScore() {
    const m = this.m;
    for (let i = m.plog.length - 1; i >= 0; i--) { const P = m.plog[i]; if (P.g0 + (P.g1 - P.g0) * 0.85 <= this.t) return [P.hs, P.as]; }
    return [0, 0];
  },
  visibleCount() { const m = this.m; let n = 0; for (const e of m.events) if (e.g <= this.t) n++; return n; },
  breakTime() {
    const m = this.m, q = m.brk;
    if (q === 2) { talkModal('Half-time team talk', true); return; }
    modal(`<h2>${q <= 4 ? `End of Q${q}` : 'End of regulation'}</h2>${scoreLine()}<p class="hint">Make changes or carry on.</p>
      <div class="grid3"><button class="btn" data-act="liveTac">Tactics</button><button class="btn" data-act="liveSubs">Subs</button><button class="btn" data-act="liveShout">${icon('mega')} Shout</button></div>
      <div class="row-btns"><button class="btn primary big" data-act="liveResume">Resume ${icon('play')}</button></div>`, { locked: true });
  },
  finish() {
    this.finished = true;
    finishUserMatch(this.m);
    this.paint(true);
  },
  paintLegend() {
    const m = this.m, el = $('#clegend'); if (!el || !m) return;
    const hot = [], cold = [];
    m.sides.forEach((s) => s.on.forEach((p) => { const h = s.heat[p.id] || 0; if (h > 0.45) hot.push(`${esc(s.team.abbr)} ${esc(p.last)}`); else if (h < -0.45) cold.push(`${esc(s.team.abbr)} ${esc(p.last)}`); }));
    const html = `<span class="fire">🔥 ${hot.join(', ') || '—'}</span><span class="ice">🧊 ${cold.join(', ') || '—'}</span>`;
    if (el._h !== html) { el._h = html; el.innerHTML = html; }
  },
  paint(force) {
    const m = this.m; const root = $('#live'); if (!root || !m) return;
    const cv = $('#court'); if (cv && Court.cv !== cv) Court.attach(cv, m);
    this.paintLegend();
    const H = m.sides[0].team, A = m.sides[1].team;
    const over = m.done && this.t >= m.gt;
    const [hs, as] = over ? [m.sides[0].pts, m.sides[1].pts] : this.shownScore();
    const { q, c } = clockAt(this.t);
    const clock = `${Math.floor(c / 60)}:${String(Math.floor(c % 60)).padStart(2, '0')}`;
    $('#sb').innerHTML = `<div class="sbt">${badge(A, 'lg')}<span>${esc(A.abbr)}</span></div><div class="sbs"><b>${as}</b><span>–</span><b>${hs}</b></div><div class="sbt r"><span>${esc(H.abbr)}</span>${badge(H, 'lg')}</div>
      <div class="sbq">${over ? 'FINAL' + (m.ot ? ' / OT' : '') : (q <= 4 ? 'Q' + q : 'OT' + (q - 4)) + ' · ' + clock}</div>`;
    const ctlKey = [this.speed, this.paused, over, this.tab, this.t === 0, this.hlOn].join('|');
    if (force || this._ctl !== ctlKey) {
      this._ctl = ctlKey;
      $('#lctl').innerHTML = over ? `<button class="btn primary big" data-act="toResult">Match Report ${icon('play')}</button>`
        : this.t === 0 && this.paused ? `<button class="btn primary big" data-act="liveTipoff">${icon('mega')} Pre-match team talk & tip-off</button>`
        : `<div class="seg">${[1, 2, 4, 8].map((s) => `<button class="${this.speed === s ? 'on' : ''}" data-act="liveSpeed" data-v="${s}">${s}×</button>`).join('')}</div><button class="iconbtn" data-act="livePause">${icon(this.paused ? 'play' : 'pause')}</button><button class="chip ${this.hlOn !== false ? 'on' : ''}" data-act="liveHL">★ Key</button><button class="btn sm" data-act="liveSkip">Skip</button>`;
      $('#ltabs').innerHTML = ['feed', 'box'].map((k) => `<button class="tab ${this.tab === k ? 'on' : ''}" data-act="liveTab" data-v="${k}">${k === 'feed' ? 'Commentary' : 'Live Stats'}</button>`).join('');
      $('#lbar').innerHTML = over ? '' : `<button class="btn" data-act="liveShout" ${this.t === 0 ? 'disabled' : ''}>${icon('mega')} Shout</button><button class="btn" data-act="liveTac">Tactics</button><button class="btn" data-act="liveSubs">Subs</button>`;
    }
    const vis = this.visibleCount();
    if (!force && this.painted === vis && this.tab === 'feed') return;
    this.painted = vis;
    if (this.tab === 'feed') {
      $('#feed').innerHTML = m.events.filter((e) => e.g <= this.t).reverse().slice(0, 60).map((e) => { const tm = e.side >= 0 ? m.sides[e.side].team : null; return `<div class="ev ${e.type}${e.hl ? ' hl' : ''}" style="--ec:${tm ? tm.c1 : 'transparent'}"><span class="evt">${e.q <= 4 ? 'Q' + e.q : 'OT'} ${Math.floor(e.c / 60)}:${String(e.c % 60).padStart(2, '0')}</span><span class="evx">${esc(e.text)}</span><span class="evs">${e.as}-${e.hs}</span></div>`; }).join('');
    } else {
      const s = m.sides[m.us];
      $('#feed').innerHTML = `<table class="tbl box"><thead><tr><th class="l">Player</th><th>MIN</th><th>PTS</th><th>REB</th><th>AST</th><th>FG</th><th>Mood</th><th>Form</th></tr></thead><tbody>${s.list.map((p) => { const b = m.box[p.id]; const md = s.mood[p.id] || 0; const h = s.heat[p.id] || 0; return `<tr class="${s.on.includes(p) ? 'oncourt' : ''}"><td class="l nm">${s.on.includes(p) ? '<i class="st-dot"></i>' : ''}<span class="jn">${p.num ?? ''}</span>${esc(pname(p, true))}${m.ej[p.id] ? ' <span class="neg">EJ</span>' : m.techs[p.id] ? ' <span class="warn-t">T</span>' : ''}</td><td>${Math.round(b.min / 60)}</td><td class="b">${b.pts}</td><td>${b.reb}</td><td>${b.ast}</td><td>${b.fgm}-${b.fga}</td><td>${moodIcon(md)}</td><td>${h > 0.45 ? '🔥' : h < -0.45 ? '🧊' : h > 0.2 ? '<span class="pos">↑</span>' : h < -0.2 ? '<span class="neg">↓</span>' : '<span class="muted">·</span>'}</td></tr>`; }).join('')}</tbody></table>`;
    }
  },
};
const moodIcon = (v) => v > 0.35 ? '<span class="pos">▲▲</span>' : v > 0.1 ? '<span class="pos">▲</span>' : v < -0.35 ? '<span class="neg">▼▼</span>' : v < -0.1 ? '<span class="neg">▼</span>' : '<span class="muted">●</span>';
function scoreLine() { const m = Live.m; return `<p class="b">${esc(m.sides[1].team.abbr)} ${m.sides[1].pts} – ${m.sides[0].pts} ${esc(m.sides[0].team.abbr)}</p>`; }
function talkModal(title, isBreak) {
  modal(`<h2>${title}</h2>${Live.m.gt > 0 ? scoreLine() : '<p class="hint">Set the tone before tip-off.</p>'}
    <div class="tones">${Object.entries(TONES).map(([k, v]) => `<button class="tone t-${k}" data-act="doTalk" data-v="${k}" data-brk="${isBreak ? 1 : 0}"><b>${v.n}</b><span>${v.d}</span></button>`).join('')}</div>
    <div class="row-btns"><button class="btn" data-act="skipTalk" data-brk="${isBreak ? 1 : 0}">No talk</button>${isBreak ? `<button class="btn" data-act="liveTac">Tactics</button><button class="btn" data-act="liveSubs">Subs</button>` : ''}</div>`, { locked: true, tall: true });
}
function reactionsHTML(list) {
  const counts = {};
  list.forEach((r) => (counts[r.label] = (counts[r.label] || 0) + 1));
  return `<div class="rsum">${Object.entries(counts).map(([l, n]) => `<span class="rchip ${list.find((r) => r.label === l).cls}">${n} ${l}</span>`).join('')}</div>
  <div class="rlist">${list.slice(0, 12).map((r) => `<div class="lrow"><span class="grow">${esc(pname(r.p, true))}</span><span class="rchip ${r.cls}">${r.label}</span></div>`).join('')}</div>`;
}
VIEWS.match = () => `<div id="live" class="live"><div id="sb" class="scoreboard"></div><div class="courtwrap"><canvas id="court"></canvas></div><div id="clegend" class="clegend"></div><div id="lctl" class="lctl"></div><div id="ltabs" class="tabs"></div><div id="feed" class="feed"></div><div id="lbar" class="lbar"></div></div>`;

/* Result */
VIEWS.result = () => {
  const r = S.lastResult;
  if (!r) return header('Match Report') + '<p class="empty">No recent match.</p>';
  const H = team(r.h), A = team(r.a);
  const side = UI.tab.rside || (r.h === S.userTeam ? 'h' : 'a');
  const tid = side === 'h' ? r.h : r.a;
  const rows = Object.entries(r.box).filter(([, b]) => b.team === tid).sort((x, y) => y[1].gs - x[1].gs || y[1].min - x[1].min);
  const pom = S.players[r.pom];
  const won = (r.h === S.userTeam) === (r.hs > r.as);
  return `${header('Match Report', { back: false })}
  <div class="pad">
    <div class="card final ${won ? 'won' : 'lost'}">
      <div class="fs">${badge(A, 'xl')}<b>${r.as}</b><span class="muted">FINAL</span><b>${r.hs}</b>${badge(H, 'xl')}</div>
      <table class="qtbl"><tr><th></th>${r.quarters.map((_, i) => `<th>${i < 4 ? 'Q' + (i + 1) : 'OT'}</th>`).join('')}<th>T</th></tr>
      <tr><td>${esc(A.abbr)}</td>${r.quarters.map((q) => `<td>${q[1]}</td>`).join('')}<td><b>${r.as}</b></td></tr>
      <tr><td>${esc(H.abbr)}</td>${r.quarters.map((q) => `<td>${q[0]}</td>`).join('')}<td><b>${r.hs}</b></td></tr></table>
      ${pom ? `<div class="pomc" data-act="player" data-id="${pom.id}">★ Player of the Match: <b>${esc(pname(pom))}</b> (${esc(team(r.box[pom.id].team).abbr)}) ${ratingPill(r.ratings[pom.id])}</div>` : ''}
    </div>
    ${pressCard('post', S.schedule.find((x) => x.id === r.fid) || { id: r.fid, h: r.h, a: r.a })}
    <div class="card" id="ftt">${r.talked ? (UI.ftReact ? `<h3>Post-match talk</h3>${reactionsHTML(UI.ftReact)}` : '<p class="muted">Post-match talk done.</p>') : `<h3>Post-match team talk</h3><p class="hint">Your words now affect morale going into the next game.</p><div class="tones compact">${Object.entries(TONES).map(([k, v]) => `<button class="tone t-${k}" data-act="ftTalk" data-v="${k}"><b>${v.n}</b></button>`).join('')}</div>`}</div>
  </div>
  <div class="tabs"><button class="tab ${side === 'a' ? 'on' : ''}" data-act="tab" data-k="rside" data-v="a">${esc(A.nick)}</button><button class="tab ${side === 'h' ? 'on' : ''}" data-act="tab" data-k="rside" data-v="h">${esc(H.nick)}</button></div>
  <div class="scrollx"><table class="tbl box"><thead><tr><th class="l">Player</th><th>MIN</th><th>PTS</th><th>REB</th><th>AST</th><th>STL</th><th>BLK</th><th>FG</th><th>3P</th><th>Rat</th></tr></thead><tbody>
  ${rows.map(([id, b]) => { const p = S.players[id]; return `<tr data-act="player" data-id="${id}"><td class="l nm">${b.gs ? '<i class="st-dot"></i>' : ''}${p ? esc(pname(p, true)) : '?'}</td><td>${b.min}</td><td class="b">${b.pts}</td><td>${b.reb}</td><td>${b.ast}</td><td>${b.stl}</td><td>${b.blk}</td><td>${b.fgm}-${b.fga}</td><td>${b.tpm}-${b.tpa}</td><td>${ratingPill(r.ratings[id])}</td></tr>`; }).join('')}
  </tbody></table></div>
  <div class="sticky-cta"><button class="btn primary big" data-act="go" data-v="inbox">Done</button></div>`;
};

/* Sacked */
VIEWS.sacked = () => {
  const offers = sackedOffers();
  return `${header('Job Offers', { back: false })}<div class="pad"><div class="card warn"><b>You have been relieved of your duties.</b><p>Your reputation: ${repLabel(S.coach.rep)}. These clubs are willing to talk:</p></div></div>
  <div class="list">${offers.map((t) => `<button class="li" data-act="takeJob" data-id="${t.id}">${badge(t, 'lg')}<span class="grow"><b>${esc(teamName(t))}</b><div class="muted sm">${lgFlag(league(t.lg))} ${esc(league(t.lg).name)} · ${t.w}-${t.l}</div></span>${prestigeStars(t.prestige)}</button>`).join('')}</div>
  <div class="pad"><button class="btn danger" data-act="deleteSave">Retire & start a new career</button></div>`;
};

/* ---------- Actions ---------- */
function download(name, obj) {
  const blob = new Blob([JSON.stringify(obj)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = name;
  document.body.appendChild(a); a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
}
function readFile(input, cb) {
  const f = input.files && input.files[0];
  if (!f) return;
  const rd = new FileReader();
  rd.onload = () => { try { cb(JSON.parse(rd.result)); } catch (e) { toast('Could not read file: ' + esc(e.message), 'bad'); } input.value = ''; };
  rd.readAsText(f);
}
function startWithDb(db) {
  validateDatabase(db);
  NG = { db, step: 1, team: null, name: '', length: 'short', style: 'allround', mode: 'est', custom: true, lg: null };
  UI.stack = []; UI.view = 'newgame'; render();
}
function liveSide() { return Live.m.sides[Live.m.us]; }

const ACT = {
  back: () => back(),
  go: (d) => { if (d.tab) UI.tab.tac = d.tab; go(d.v, d.sid ? { sid: d.sid } : d.id ? { id: +d.id } : {}, { keep: !!d.keep }); },
  tab: (d) => { UI.tab[d.k] = d.v; render(); },
  player: (d) => { closeModal(); go('player', { id: +d.id }); },
  loadGame: () => { if (load()) { UI.stack = []; if (ironmanResolve() || IRON_RESOLVED) { IRON_RESOLVED = false; toast('🛡️ Ironman: the match you left was played to the finish.'); UI.tab.rside = null; return go('result'); } go(S.pending ? 'prematch' : S.phase === 'sacked' ? 'sacked' : 'inbox'); } },
  toTitle: () => { save(); UI.stack = []; UI.view = 'title'; render(); },
  ngSet: (d) => { NG.name = ($('#ngName')?.value ?? NG.name); NG[d.k] = d.k === 'ironman' ? !!d.v : d.v; if (d.k === 'mode') { NG.team = null; NG.offers = null; } render(); },
  ngNext: () => { NG.name = ($('#ngName')?.value || NG.name || '').trim(); NG.step = 2; render(); window.scrollTo(0, 0); },
  ngBack: () => { NG.step = 1; render(); },
  ngLg: (d) => { NG.lg = d.v; NG.team = null; render(); },
  ngTeam: (d) => { NG.team = +d.id; render(); },
  ngStart: () => {
    if (!NG.team) return;
    newGame({ look: NG.look, name: NG.name || 'The Coach', style: NG.style, mode: NG.mode, teamId: NG.team, db: NG.db, length: NG.length, diff: NG.diff, ironman: !!NG.ironman && !NG.custom });
    NG = null; UI.tab = {};
    go('inbox');
  },
  continue: () => {
    if (S.phase === 'sacked') return go('sacked');
    const before = S.inbox.length;
    const r = advance();
    if (r.action === 'prematch') return go('prematch');
    if (r.action === 'sacked' || S.phase === 'sacked') return go('sacked');
    if (r.action === 'newseason') { toast(`Welcome to the ${S.season}/${String(S.season + 1).slice(2)} season!`); return go('inbox'); }
    if (r.action === 'endseason') return go('inbox');
    toast(S.inbox.length > before ? 'New messages in your inbox' : `${curDate()}`);
    if (UI.view === 'inbox') render(); else go('inbox');
  },
  readAll: () => { S.inbox.forEach((m) => (m.read = true)); save(); render(); },
  mail: (d) => go('mail', { id: +d.id }),
  mailAct: (d) => {
    const mm = S.inbox.find((x) => x.id === +d.id);
    if (d.a === 'acceptTrade' && mm && mm.trade && !mm.duoTalked && !mm.done) {
      const going = mm.trade.give.find((id) => { const pp = duoPartner(id); return pp && S.players[pp]?.team === S.userTeam && !mm.trade.give.includes(pp); });
      if (going) return duoTalk(going, 'mail', mm.id);
    }
    const r = mailAction(+d.id, d.a);
    if (r.renew) return ACT.renewModal({ id: r.renew, mail: d.id });
    if (r.msg) toast(esc(r.msg));
    if (r.job) { UI.stack = []; return go('inbox'); }
    render();
  },
  tactic: (d) => { userTeam().tactics[d.k] = d.v; save(); if (UI.view === 'match') { modalTactics(); } else render(); },
  autoRot: () => { autoRotation(S, userTeam()); save(); toast('Assistant picked the best rotation.'); render(); },
  rotSel: (d) => {
    const id = +d.id;
    if (UI.sel == null) { UI.sel = id; render(); return; }
    if (UI.sel === id) { UI.sel = null; render(); return; }
    const rot = userTeam().rotation;
    const i = rot.indexOf(UI.sel), j = rot.indexOf(id);
    if (i >= 0 && j >= 0) [rot[i], rot[j]] = [rot[j], rot[i]];
    UI.sel = null; S.autoRot = false; save(); render();
  },
  setShots: (d) => { const t = userTeam(); const i = t.instr[d.id] || (t.instr[d.id] = {}); i.shots = +d.v; save(); render(); },
  setLock: (d) => { const t = userTeam(); const on = !(t.instr[d.id] && t.instr[d.id].lock); for (const k in t.instr) t.instr[k].lock = false; const i = t.instr[d.id] || (t.instr[d.id] = {}); i.lock = on; save(); render(); },
  training: (d) => { S.training = d.v; save(); toast(`Training focus: ${TRAINING[d.v].n}`); render(); },
  renewModal: (d) => {
    const p = S.players[+d.id];
    if (!p || p.team !== S.userTeam) return toast('Player is no longer at the club.');
    modal(`<h2>Contract offer</h2><p><b>${esc(pname(p))}</b> is asking for <b>${fmtMoney(askingSalary(p))}</b> per year.</p><p class="muted sm">Current: ${fmtMoney(p.contract.sal)} · ${p.contract.yrs} yr${p.contract.yrs === 1 ? '' : 's'} left</p>
      <label class="lbl">Length</label><div class="seg">${[1, 2, 3, 4].map((y) => `<button data-act="doRenew" data-id="${p.id}" data-y="${y}" data-mail="${d.mail || ''}">${y} yr${y > 1 ? 's' : ''}</button>`).join('')}</div>
      <div class="row-btns"><button class="btn" data-act="closeModal">Cancel</button></div>`);
  },
  doRenew: (d) => {
    const r = renewContract(+d.id, +d.y);
    closeModal(); toast(esc(r.msg), r.ok ? '' : 'bad');
    if (d.mail) { const m = S.inbox.find((x) => x.id === +d.mail); if (m) m.done = r.ok ? 'New contract agreed.' : r.msg; }
    save(); render();
  },
  signModal: (d) => {
    const p = S.players[+d.id];
    const ut = userTeam();
    modal(`<h2>Sign ${esc(pname(p))}</h2><p>Asking salary: <b>${fmtMoney(askingSalary(p))}</b>/yr</p><p class="muted sm">Your wage room: ${fmtMoney(Math.max(0, ut.budget - teamPayroll(ut.id)))} · Roster ${roster(ut.id).length}/${ROSTER_MAX}</p>
      <label class="lbl">Contract length</label><div class="seg">${[1, 2, 3, 4].map((y) => `<button data-act="doSign" data-id="${p.id}" data-y="${y}">${y} yr${y > 1 ? 's' : ''}</button>`).join('')}</div>
      <div class="row-btns"><button class="btn" data-act="closeModal">Cancel</button></div>`);
  },
  doSign: (d) => { const r = signFreeAgent(+d.id, +d.y); closeModal(); toast(esc(r.msg), r.ok ? '' : 'bad'); if (r.ok) mail('Assistant Coach', `${pname(S.players[+d.id])} signs`, `${esc(r.msg)} I've added him to the end of the rotation — adjust in Tactics.`, { type: 'transfer', read: true }); save(); render(); },
  release: (d) => {
    const p = S.players[+d.id];
    modal(`<h2>Release ${esc(pname(p))}?</h2><p>He becomes a free agent and his salary comes off your books.</p><div class="row-btns"><button class="btn" data-act="closeModal">Cancel</button><button class="btn danger" data-act="doRelease" data-id="${p.id}">Release</button></div>`);
  },
  doRelease: (d) => { const r = releasePlayer(+d.id); closeModal(); toast(esc(r.msg), r.ok ? '' : 'bad'); save(); if (r.ok) back(); else render(); },
  closeModal: () => closeModal(),
  offerToggle: (d) => { const id = +d.id; const o = UI.offer.ids; const i = o.indexOf(id); if (i >= 0) o.splice(i, 1); else o.push(id); render(); },
  proposeTrade: (d) => {
    const ids = UI.offer.ids.slice();
    const going = ids.find((id) => { const pp = duoPartner(id); return pp && S.players[pp]?.team === S.userTeam && !ids.includes(pp); });
    if (going && !d.talked) {
      const tgt = S.players[UI.offer.tid];
      const okNow = tradeCheck(UI.offer.tid, ids).ok && !(S.phase === 'season' && deadlinePassed()) && !moveRefusal(tgt, S.userTeam) && tradeInterest(UI.offer.tid, ids) >= 1;
      if (okNow) return duoTalk(going, 'offer');
    }
    const r = proposeTrade(UI.offer.tid, ids, !!d.talked);
    toast(esc(r.msg), r.ok ? '' : 'bad');
    if (r.ok) { const id = UI.offer.tid; UI.offer = null; save(); UI.stack = []; go('player', { id }); }
  },
  duoAnswer: (d) => {
    const goingP = S.players[+d.g], partner = S.players[duoPartner(+d.g)];
    closeModal();
    if (d.a === 'cancel') {
      partner.morale = clamp(partner.morale + 6, 0, 100); S.coach.pcoach = clamp((S.coach.pcoach ?? 10) + 0.5, 1, 20);
      if (d.ctx === 'mail') { const mm = S.inbox.find((x) => x.id === +d.mail); if (mm) mm.done = `Rejected after talking with ${pname(partner)}.`; }
      save(); toast(`Deal off. ${esc(pname(partner))} won't forget that.`); return render();
    }
    let msg;
    if (d.a === 'business') {
      partner.morale = clamp(partner.morale - (partner.hid.loy >= 15 ? 25 : 18), 0, 100);
      msg = `${pname(partner)} walks out without a word.`;
      if (partner.hid.amb >= 14 || partner.hid.temp <= 6) { partner.wantsOut = true; mail(pname(partner), 'I want out', `Coach, you traded ${pname(goingP)} after I told you what he means to me. I don't see a future for me here anymore. I'd like you to find me a new club.`, { type: 'player', pid: partner.id }); }
    } else {
      const ok = R.chance(clamp(0.35 + S.coach.a.man * 0.03 + (partner.hid.prof - 10) * 0.02, 0.1, 0.92));
      partner.morale = clamp(partner.morale - (ok ? 5 : 15), 0, 100);
      msg = ok ? `${pname(partner)}: "I don't like it, but I get it."` : `${pname(partner)} isn't buying it.`;
    }
    toast(esc(msg));
    if (d.ctx === 'offer') ACT.proposeTrade({ talked: 1 });
    else { const mm = S.inbox.find((x) => x.id === +d.mail); if (mm) { mm.duoTalked = true; ACT.mailAct({ id: d.mail, a: 'acceptTrade' }); } }
  },
  setMin: (d) => {
    const t = userTeam(); const i = t.instr[d.id] || (t.instr[d.id] = {});
    if (d.d === 'auto') delete i.min;
    else { const idx = t.rotation.indexOf(+d.id); const cur = i.min != null ? i.min : (idx < MIN_PLAN.length ? MIN_PLAN[idx] : 0); i.min = clamp(cur + +d.d, 0, 44); }
    save(); render();
  },
  toggleList: (d) => {
    const p = S.players[+d.id]; p.listed = !p.listed;
    if (p.listed) { toast(`${esc(pname(p))} is on the transfer list. Clubs will be told he is available.`); if (p.hid.amb < 12 && p.hid.loy >= 14) { p.morale = clamp(p.morale - 12, 0, 100); mail(pname(p), 'Transfer listed?', `Coach, I just saw I'm on the transfer list. I thought I was part of this club. That hurts.`, { type: 'player', pid: p.id }); } }
    else { toast(`${esc(pname(p))} removed from the transfer list.`); if (p.unsettled) p.morale = clamp(p.morale - 8, 0, 100); }
    save(); render();
  },
  rumours: () => { UI.tab.market = 'rm'; go('market'); },
  liveHL: () => { Live.hlOn = Live.hlOn === false; Live.paint(true); },
  applyJob: (d) => { const r = applyJob(+d.id); toast(esc(r.msg), r.ok ? '' : 'bad'); render(); },
  takeJob: (d) => { takeNewJob(+d.id); UI.stack = []; toast(`Welcome to ${esc(teamName(team(+d.id)))}!`); go('inbox'); },
  /* match */
  playMatch: (d) => {
    UI.ftReact = null;
    if (S.ironman) { S.matchLock = S.pending; save(); }
    if (d.watch === '1') { const m = createUserMatch(true); UI.stack = []; UI.view = 'match'; Live.start(m); render(); }
    else { const m = createUserMatch(false); teamTalk(m, m.us, 'encourage', 0.5); simToEnd(m); finishUserMatch(m); UI.stack = []; UI.tab.rside = null; go('result'); }
  },
  liveTipoff: () => talkModal('Pre-match team talk', false),
  doTalk: (d) => {
    const m = Live.m;
    const res = teamTalk(m, m.us, d.v, 1);
    modal(`<h2>${TONES[d.v].n}</h2><p class="hint">How the players reacted:</p>${reactionsHTML(res)}<div class="row-btns"><button class="btn primary big" data-act="talkDone" data-brk="${d.brk}">${d.brk === '1' ? 'Start 2nd half' : 'Tip-off'} ${icon('play')}</button></div>`, { locked: true, tall: true });
    Live.paint(true);
  },
  skipTalk: (d) => ACT.talkDone(d),
  talkDone: () => { closeModal(); Live.m.brk = 0; Live.paused = false; Live.paint(true); },
  liveResume: () => { closeModal(); Live.m.brk = 0; Live.paused = false; Live.paint(true); },
  liveSpeed: (d) => { Live.speed = +d.v; Live.paint(true); },
  livePause: () => { Live.paused = !Live.paused; Live.paint(true); },
  liveTab: (d) => { Live.tab = d.v; Live.paint(true); },
  liveSkip: () => modal(`<h2>Skip to the end?</h2><p class="hint">You won't be able to give a half-time talk or make changes.</p><div class="row-btns"><button class="btn" data-act="closeModal">Cancel</button><button class="btn primary" data-act="doSkip">Skip</button></div>`),
  doSkip: () => { closeModal(); const m = Live.m; m.pauses = false; m.brk = 0; simToEnd(m); Live.t = m.gt; Live.finish(); },
  liveShout: () => {
    const m = Live.m;
    const wait = Math.ceil((m.shoutAt + 150 - m.gt) / 60);
    modal(`<h2>${icon('mega')} Touchline shout</h2>${scoreLine()}${wait > 0 && m.shoutAt > 0 ? `<p class="warn-t">The players need time before you shout again (~${wait} min).</p>` : ''}
      <div class="tones">${Object.entries(TONES).map(([k, v]) => `<button class="tone t-${k}" data-act="doShout" data-v="${k}" ${wait > 0 && m.shoutAt > 0 ? 'disabled' : ''}><b>${v.n}</b><span>${v.d}</span></button>`).join('')}</div>
      <div class="row-btns"><button class="btn" data-act="${m.brk ? 'liveBreakBack' : 'closeModal'}">Back</button></div>`, { tall: true });
  },
  doShout: (d) => {
    const m = Live.m; m.shoutAt = Math.max(1, m.gt);
    const res = teamTalk(m, m.us, d.v, 0.45);
    modal(`<h2>${TONES[d.v].n}!</h2>${reactionsHTML(res.filter((r) => liveSide().on.includes(r.p)).concat(res.filter((r) => !liveSide().on.includes(r.p))))}<div class="row-btns"><button class="btn primary big" data-act="${m.brk ? 'liveBreakBack' : 'closeModal'}">Back to the game</button></div>`, { tall: true });
    Live.paint(true);
  },
  liveBreakBack: () => { closeModal(); Live.breakTime(); },
  liveTac: () => modalTactics(),
  liveSubs: () => modalSubs(),
  liveSubSel: (d) => {
    const id = +d.id;
    if (UI.sel == null || UI.sel === id) { UI.sel = UI.sel === id ? null : id; return modalSubs(); }
    const t = userTeam(); const rot = t.rotation;
    const i = rot.indexOf(UI.sel), j = rot.indexOf(id);
    if (i >= 0 && j >= 0) [rot[i], rot[j]] = [rot[j], rot[i]];
    UI.sel = null; S.autoRot = false;
    rebuildPlan(S, Live.m, liveSide(), false);
    modalSubs();
  },
  toResult: () => { UI.tab.rside = null; go('result'); },
  ftTalk: (d) => { UI.ftReact = fullTimeTalk(d.v); render(); },
  /* misc */
  exportSave: () => S.ironman ? toast('Disabled in Ironman.', 'bad') : download(`courtside-save-${S.season}.json`, S),
  deleteSave: () => modal(`<h2>Delete career?</h2><p>This cannot be undone.</p><div class="row-btns"><button class="btn" data-act="closeModal">Cancel</button><button class="btn danger" data-act="doDelete">Delete</button></div>`),
  doDelete: () => { closeModal(); deleteSave(); UI.stack = []; UI.view = 'title'; render(); },
  exportDb: () => download('courtside-database.json', exportDatabase()),
  copyDb: async () => { try { await navigator.clipboard.writeText(JSON.stringify(exportDatabase())); toast('Database copied to clipboard'); } catch (e) { toast('Copy failed on this device — use Export instead.', 'bad'); } },
  pasteDb: () => modal(`<h2>Paste database</h2><textarea class="inp ta" id="pasteTa" placeholder="Paste exported database text here"></textarea><div class="row-btns"><button class="btn" data-act="closeModal">Cancel</button><button class="btn primary" data-act="doPasteDb">Load</button></div>`),
  doPasteDb: () => { try { const db = JSON.parse($('#pasteTa').value); closeModal(); startWithDb(db); } catch (e) { toast('Invalid database: ' + esc(e.message), 'bad'); } },
  newPlayer: () => { const p = genPlayer(S, 10, undefined, undefined, null); p.first = 'New'; p.last = 'Player'; S.players[p.id] = p; save(); go('editPlayer', { id: p.id }); },
  step: (d) => { const el = $('#' + d.t); el.value = clamp((+el.value || 1) + +d.d, +d.min, +d.max); el.className = 't' + tier(+el.value); },
  saveTeam: (d) => {
    const t = team(+d.id);
    t.city = clean($('#et_city').value, 24) || t.city; t.nick = clean($('#et_nick').value, 24) || t.nick;
    t.abbr = (clean($('#et_abbr').value, 4) || t.abbr).toUpperCase();
    t.c1 = $('#et_c1').value; t.c2 = $('#et_c2').value;
    t.budget = clamp(+$('#et_budget').value || t.budget, 1, 1000);
    t.prestige = clamp(Math.round(+$('#et_pr').value || t.prestige), 1, 20);
    save(); toast('Club saved'); back();
  },
  savePlayer: (d) => {
    const p = S.players[+d.id];
    const v = (k) => $('#ep_' + k).value;
    p.first = clean(v('first'), 20) || p.first; p.last = clean(v('last'), 24) || p.last;
    p.pos = v('pos'); p.nat = v('nat');
    p.age = clamp(Math.round(+v('age') || p.age), 16, 45); p.h = clamp(Math.round(+v('h') || p.h), 160, 240);
    const nt = v('team') === '' ? null : +v('team');
    if (nt !== p.team) {
      if (nt != null && roster(nt).length >= ROSTER_MAX) return toast(`${team(nt).nick} already have ${ROSTER_MAX} players.`, 'bad');
      const old = p.team; p.team = nt;
      if (old != null) cleanRotation(S, team(old));
      if (nt != null) cleanRotation(S, team(nt));
    }
    p.contract = { sal: clamp(+v('sal') || p.contract.sal, 0.1, 60), yrs: clamp(Math.round(+v('yrs')), 0, 6) };
    if (p.team != null && p.contract.yrs < 1) p.contract.yrs = 1;
    for (const a of ATTRS) p.a[a.k] = clamp(Math.round(+$('#ep_a_' + a.k).value || p.a[a.k]), 1, 20);
    for (const h of HIDDEN) p.hid[h.k] = clamp(Math.round(+$('#ep_h_' + h.k).value || p.hid[h.k]), 1, 20);
    p.pot = clamp(+v('pot') || p.pot, 1, 20);
    { const nn = clamp(Math.round(+v('num')), 0, 99); if (p.team != null && nn !== p.num) { const tm = team(p.team); if ((tm.retired || []).some((x) => x.num === nn)) { toast(`#${nn} is retired at ${esc(tm.nick)}.`, 'bad'); } else { const other = roster(p.team).find((x) => x.id !== p.id && x.num === nn); if (other) other.num = p.num; p.num = nn; } } }
    if (p.pot < calcCA(p)) p.pot = Math.round(calcCA(p) * 10) / 10;
    save(); toast('Player saved'); back();
  },
  saveCoach: () => {
    const c = S.coach;
    c.name = clean($('#ec_name').value, 28) || c.name;
    c.rep = clamp(+$('#ec_rep').value || c.rep, 1, 20);
    for (const a of COACH_ATTRS) c.a[a.k] = clamp(Math.round(+$('#ec_' + a.k).value || c.a[a.k]), 1, 20);
    save(); toast('Coach saved'); back();
  },
  deletePlayer: (d) => modal(`<h2>Delete player?</h2><p>This permanently removes him from the database.</p><div class="row-btns"><button class="btn" data-act="closeModal">Cancel</button><button class="btn danger" data-act="doDeletePlayer" data-id="${d.id}">Delete</button></div>`),
  doDeletePlayer: (d) => {
    const p = S.players[+d.id];
    if (p && p.team === S.userTeam && roster(S.userTeam).length <= 8) { closeModal(); return toast('You need at least 8 players.', 'bad'); }
    const t = p.team; delete S.players[+d.id]; if (t != null) cleanRotation(S, team(t));
    closeModal(); save(); toast('Player deleted'); UI.stack = UI.stack.filter((s) => !(s.params && s.params.id === +d.id)); back();
  },
};
function modalTactics() {
  const prev = document.querySelector('.modal'); const st = prev ? prev.scrollTop : 0;
  const tc = userTeam().tactics;
  const back = Live.m && Live.m.brk ? 'liveBreakBack' : 'closeModal';
  modal(`<h2>Tactics</h2><h3 class="sec">Offense</h3>${tacticsPanel(tc, 'off')}<h3 class="sec">Defense</h3>${tacticsPanel(tc, 'def')}<div class="row-btns"><button class="btn primary big" data-act="${back}">Done</button></div>`, { tall: true });
  const nm = document.querySelector('.modal'); if (nm) nm.scrollTop = st;
}
function modalSubs() {
  const m = Live.m, s = liveSide();
  const r = sortedRoster(S.userTeam);
  const back = m.brk ? 'liveBreakBack' : 'closeModal';
  modal(`<h2>Substitutions</h2><p class="hint">Tap two players to swap their rotation slots. Changes take effect at the next stoppage.</p>
    ${rotationList(r, { act: 'liveSubSel', live: (p) => `${Math.round((m.box[p.id]?.min || 0) / 60)}'${s.on.includes(p) ? ' <i class="st-dot"></i>' : ''}` })}
    <div class="row-btns"><button class="btn primary big" data-act="${back}">Done</button></div>`, { tall: true });
}
const CHG = {
  ngName: (el) => { NG.name = el.value; },
  importDbNew: (el) => readFile(el, (db) => { try { if (S && UI.view !== 'title') save(); startWithDb(db); } catch (e) { toast(esc(e.message), 'bad'); } }),
  importSave: (el) => readFile(el, (obj) => { if (!obj || !(obj.v >= 2) || !obj.teams || !obj.players) return toast('Not a Courtside save file.', 'bad'); if (obj.ironman || (S && S.ironman)) return toast('Ironman careers cannot be restored from backups.', 'bad'); obj = migrateSave(obj); S = sanitizeSave(obj); save(); UI.stack = []; toast('Career restored'); go('inbox'); }),
  autoRotToggle: (el) => { S.autoRot = el.checked; if (S.autoRot) autoRotation(S, userTeam()); save(); render(); },
  edLeague: (el) => { const l = league(el.dataset.id); if (l) { l[el.dataset.f] = clean(el.value, el.dataset.f === 'short' ? 6 : 40) || l[el.dataset.f]; save(); } },
  edSearch: (el) => { UI.tab.edq = el.value; render(); },
  edTeamFilter: (el) => { UI.tab.edteam = el.value; render(); },
  attrIn: (el) => { el.value = clamp(Math.round(+el.value || 1), +el.min || 1, +el.max || 20); el.className = 't' + tier(+el.value); },
  setRole: (el) => { const t = userTeam(); const i = t.instr[el.dataset.id] || (t.instr[el.dataset.id] = {}); i.role = el.value; save(); render(); },
};

document.addEventListener('click', (e) => {
  const el = e.target.closest('[data-act]');
  if (!el || el.disabled) return;
  const fn = ACT[el.dataset.act];
  if (fn) { e.preventDefault(); fn(el.dataset, el); }
});
document.addEventListener('change', (e) => { const el = e.target.closest('[data-chg]'); if (el && CHG[el.dataset.chg]) CHG[el.dataset.chg](el); });
document.addEventListener('input', (e) => { const el = e.target; if (el.dataset && el.dataset.chg === 'ngName') CHG.ngName(el); });

window.addEventListener('DOMContentLoaded', () => {
  if (hasSave() && load() && ironmanResolve()) IRON_RESOLVED = true;
  render();
  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) navigator.serviceWorker.register('sw.js').catch(() => {});
});

/* ---------- v3: shared history table, duo talk, staff ---------- */
function historyTable(rows, awards = []) {
  if (!rows.length) return '<p class="empty">No career history yet.</p>';
  const aw = (r) => awards.filter((a) => a.s === r.s && (!a.lg || a.lg === r.lg)).map((a) => `<span class="aw" title="${a.k}">${a.k === 'MVP' ? 'MVP' : '🏆'}</span>`).join('');
  const tot = rows.reduce((t, r) => { for (const k of ['gp', 'gs', 'min', 'pts', 'reb', 'ast', 'rat', 'pgp']) t[k] += r[k] || 0; return t; }, { gp: 0, gs: 0, min: 0, pts: 0, reb: 0, ast: 0, rat: 0, pgp: 0 });
  const line = (r, cls = '') => `<tr class="${cls}"><td class="l">${r.live ? '<b>' : ''}${r.s}/${String(r.s + 1).slice(2)}${r.live ? '*</b>' : ''}</td>
    <td class="l nm"><span class="badge" style="background:${r.c1};color:${r.c2}">${esc(r.t)}</span> ${esc(r.club)} ${aw(r)}</td><td>${esc(r.lg)}</td>
    <td>${r.gp}${r.pgp ? ` <span class="muted">(${r.pgp})</span>` : ''}</td><td>${avg1(r.min, r.gp)}</td><td class="b">${avg1(r.pts, r.gp)}</td><td>${avg1(r.reb, r.gp)}</td><td>${avg1(r.ast, r.gp)}</td><td>${r.gp ? ratingPill(r.rat / r.gp) : '-'}</td></tr>`;
  return `<table class="tbl hist"><thead><tr><th class="l">Season</th><th class="l">Club</th><th>Lg</th><th>Apps</th><th>Min</th><th>Pts</th><th>Reb</th><th>Ast</th><th>Av Rat</th></tr></thead><tbody>
    ${rows.slice().reverse().map((r) => line(r)).join('')}
    <tr class="tot"><td class="l" colspan="3"><b>Career</b> · ${new Set(rows.map((r) => r.s)).size} seasons</td><td><b>${tot.gp}</b>${tot.pgp ? ` <span class="muted">(${tot.pgp})</span>` : ''}</td><td>${avg1(tot.min, tot.gp)}</td><td class="b">${avg1(tot.pts, tot.gp)}</td><td>${avg1(tot.reb, tot.gp)}</td><td>${avg1(tot.ast, tot.gp)}</td><td>${tot.gp ? ratingPill(tot.rat / tot.gp) : '-'}</td></tr>
  </tbody></table><p class="hint pad">Apps = regular-season games (playoff games in brackets). * = current season.</p>`;
}
function duoTalk(goingId, ctx, mailId) {
  const going = S.players[goingId], partner = S.players[duoPartner(goingId)];
  const h = partner.hid;
  const quote = h.temp <= 6 ? `Are you serious? ${going.first} is the reason I'm playing like this. You move him and you'll regret it.`
    : h.loy >= 15 ? `Coach, I've given everything to this club. ${going.first} and I have something special. Please tell me the rumours aren't true.`
    : h.ego >= 15 ? `Look, I'll still get mine. But ${going.first} makes my life easy out there. Think about what you're doing.`
    : `Coach, can we talk? I heard you might move ${going.first}. He's my guy — we just click. Are you really doing this?`;
  modal(`<div class="talk-head"><span class="mfrom-face">${playerFace(partner, 48)}</span><div><b>${esc(pname(partner))}</b><div class="muted sm">⚡ Dynamic Duo with ${esc(pname(going))} · ${personalityVisible(partner) ? esc(personality(partner)) : ''}</div></div></div>
    <p class="quote">“${esc(quote)}”</p>
    <div class="tones one">
      <button class="tone t-demand" data-act="duoAnswer" data-a="business" data-g="${goingId}" data-ctx="${ctx}" data-mail="${mailId || ''}"><b>"It's a business decision."</b><span>Go ahead with the trade. He won't like it.</span></button>
      <button class="tone t-encourage" data-act="duoAnswer" data-a="explain" data-g="${goingId}" data-ctx="${ctx}" data-mail="${mailId || ''}"><b>"I'll find you a new running mate."</b><span>Go ahead and try to talk him round (Man Management ${S.coach.a.man}).</span></button>
      <button class="tone t-praise" data-act="duoAnswer" data-a="cancel" data-g="${goingId}" data-ctx="${ctx}" data-mail="${mailId || ''}"><b>"You're right. The deal is off."</b><span>Call off the trade. Earns respect in the locker room.</span></button>
    </div>`, { locked: true, tall: true });
}
function staffBio(st) {
  const club = st.team != null ? teamName(team(st.team)) : null;
  const out = [`${st.first} ${st.last} (${st.age}) ${club ? `is the ${STAFF_ROLES[st.role].n} at ${club}` : `is a ${STAFF_ROLES[st.role].n} currently without a club`}.`];
  const best = STAFF_ATTRS.slice().sort((a, b) => st.a[b.k] - st.a[a.k])[0];
  out.push(`His strongest quality is ${best.n.toLowerCase()} (${st.a[best.k]}).`);
  if (st.ex) {
    const e = st.ex;
    out.push(`A former ${POS_NAME[e.pos].toLowerCase()}, he played ${e.seasons} season${e.seasons === 1 ? '' : 's'} for ${joinList(e.clubs.slice(-4))}${e.gp ? ` — ${e.gp} games, ${(e.pts / e.gp).toFixed(1)} points per game, average rating ${(e.rat / e.gp).toFixed(2)}` : ''}.`);
    const t = e.awards.filter((a) => a.k === 'Champion').length, mv = e.awards.filter((a) => a.k === 'MVP').length;
    if (t || mv) out.push(`Won ${[t ? `${t} title${t > 1 ? 's' : ''}` : '', mv ? `${mv} MVP award${mv > 1 ? 's' : ''}` : ''].filter(Boolean).join(' and ')} as a player.`);
  }
  return out.join(' ');
}
VIEWS.staff = () => {
  const mine = Object.keys(STAFF_ROLES).map((r) => userStaff(r)).filter(Boolean);
  const ex = (S.staff || []).filter((s) => s.ex && s.team !== S.userTeam && s.team != null).slice(-20).reverse();
  return `${header('Staff')}
  <div class="pad"><p class="hint">Your backroom team. Retired players with the right mentality can become coaches and scouts — legends of your club will ask to join you.</p></div>
  <div class="list">${mine.map((st) => `<button class="li" data-act="go" data-v="staffProfile" data-sid="${st.id}"><span class="mfrom-face">${staffFace(st, 36)}</span><span class="grow"><b>${esc(st.first)} ${esc(st.last)}</b>${st.ex ? ' <span class="tagx ok">Ex-player</span>' : ''}<div class="muted sm">${STAFF_ROLES[st.role].n} · ${STAFF_ROLES[st.role].d}</div></span>${attrCell(Math.round(staffScores(st.a)[st.role]))}</button>`).join('')}</div>
  ${ex.length ? `<h3 class="sec pad">Former players coaching elsewhere</h3><div class="list">${ex.map((st) => `<button class="li" data-act="go" data-v="staffProfile" data-sid="${st.id}">${badge(team(st.team))}<span class="grow"><b>${esc(st.first)} ${esc(st.last)}</b><div class="muted sm">${STAFF_ROLES[st.role].n} · ${st.ex.gp} career games</div></span>${attrCell(Math.round(staffScores(st.a)[st.role]))}</button>`).join('')}</div>` : ''}`;
};
VIEWS.staffProfile = ({ sid }) => {
  const st = (S.staff || []).find((s) => s.id === sid);
  if (!st) return header('Staff') + '<p class="empty">No longer in the game.</p>';
  const t = st.team != null ? team(st.team) : null;
  return `${header('Staff Profile')}
  <div class="phero" style="--pc:${t ? t.c1 : '#555'}"><div class="ph-top"><div class="avatar">${staffFace(st, 78)}${t ? `<span class="avbadge">${badge(t)}</span>` : ''}</div><div class="grow"><div class="ph-name">${esc(st.first)} <b>${esc(st.last)}</b></div>
    <div class="ph-sub">${STAFF_ROLES[st.role].n} · ${st.age} yrs · ${NATS[st.nat]?.flag || ''} ${st.nat}</div><div class="ph-sub">${t ? esc(teamName(t)) : 'Unattached'}${st.ex ? ' · <span class="atag">Former player</span>' : ''}</div></div></div></div>
  <div class="pad"><div class="card"><h3>Bio</h3><p class="bio">${esc(staffBio(st))}</p></div></div>
  <div class="attr-grid"><div class="attr-box" style="grid-column:1/-1"><h3>Attributes</h3>${STAFF_ATTRS.map((a) => `<div class="arow"><span>${a.n}</span>${attrCell(st.a[a.k])}</div>`).join('')}</div></div>
  ${st.ex ? `<h3 class="sec pad">Playing career</h3><div class="scrollx">${historyTable(st.ex.career, st.ex.awards)}</div>` : ''}`;
};

/* ---------- v4: transfer list, wanted, rumour mill ---------- */
const MARKET_EXTRA = [['tl', 'Transfer List'], ['rm', 'Rumour Mill']];
function marketHeader(tab) { return `${header('Market')}${tabs('market', [['fa', 'Free Agents'], ['tr', 'Trade Targets']].concat(MARKET_EXTRA), tab)}`; }
function wantedView(r) {
  const wanted = r.filter((p) => interestFor(p.id).length);
  return `<div class="pad"><p class="hint">Clubs tracking your players. Interest grows from <span class="ilv i1">Monitoring</span> to <span class="ilv i2">Interested</span> to <span class="ilv i3">Keen</span> — keen clubs make offers. Ambitious players notice when bigger clubs come calling.</p></div>
  ${wanted.length ? `<div class="list">${wanted.map((p) => `<div class="li wantrow"><div class="grow" data-act="player" data-id="${p.id}"><b>${esc(pname(p))}</b> <span class="muted sm">${p.pos} · ${p.age}</span>${p.listed ? ' <span class="tagx tl">LISTED</span>' : ''}${p.unsettled ? ' <span class="tagx">UNSETTLED</span>' : ''}
    <div class="wchips">${interestFor(p.id).map((i) => `<span class="wchip">${badge(team(i.tid))}<span class="ilv ${INTEREST_LVL[i.lvl][1]}">${INTEREST_LVL[i.lvl][0]}</span></span>`).join('')}</div></div>${starsHTML(stars(calcCA(p)))}</div>`).join('')}</div>` : '<p class="empty">No clubs are tracking your players right now. Transfer listing a player makes clubs take notice.</p>'}`;
}
function transferListView() {
  const ut = userTeam();
  const mine = roster(ut.id).filter((p) => p.listed);
  const lf = UI.tab.tllg || 'ALL';
  let others = Object.values(S.players).filter((p) => p.listed && p.team != null && p.team !== ut.id);
  if (lf !== 'ALL') others = others.filter((p) => team(p.team).lg === lf);
  others.sort((a, b) => seenCA(b) - seenCA(a));
  return `${marketHeader('tl')}
  <h3 class="sec pad">Your transfer list</h3>
  ${mine.length ? `<div class="list">${mine.map((p) => `<div class="li"><span class="ps">${p.pos}</span><span class="grow nm" data-act="player" data-id="${p.id}"><b>${esc(pname(p))}</b><div class="muted sm">${p.age} yrs · ${fmtMoney(p.contract.sal)} × ${p.contract.yrs}y · ${interestFor(p.id).length} club${interestFor(p.id).length === 1 ? '' : 's'} interested</div></span>${starsHTML(stars(calcCA(p)))}<button class="btn sm" data-act="toggleList" data-id="${p.id}">Remove</button></div>`).join('')}</div>` : '<p class="empty">Nobody listed. Use “Transfer List” on a player profile to tell clubs he is available.</p>'}
  <h3 class="sec pad">Listed around the world</h3>
  <div class="pad tight">${leagueChips(lf, 'tllg', true)}</div>
  <div class="scrollx"><table class="tbl"><thead><tr><th>Pos</th><th class="l">Player</th><th>Age</th><th>Ability</th><th>Salary</th><th>Club</th></tr></thead><tbody>
  ${others.slice(0, 60).map((p) => `<tr data-act="player" data-id="${p.id}"><td><span class="ps">${p.pos}</span></td><td class="l nm">${esc(pname(p, true))}${p.wantsOut ? ' <span class="tagx">OUT</span>' : ''}</td><td>${p.age}</td><td>${starsHTML(stars(seenCA(p)))}</td><td>${fmtMoney(p.contract.sal)}</td><td>${badge(team(p.team))}</td></tr>`).join('') || '<tr><td colspan="6" class="empty">No listed players.</td></tr>'}
  </tbody></table></div><p class="hint pad">Listed players come cheaper in trades.</p>`;
}
function rumourMillView() {
  const sub = UI.tab.rm || 'hot';
  const lf = UI.tab.rmlg || userTeam().lg;
  const inLg = (lg) => lf === 'ALL' || lg === lf;
  let body = '';
  if (sub === 'hot') {
    const list = hotSeat(lf).slice(0, 12);
    const all = hotSeat(lf), myPos = all.findIndex((x) => x.t.id === S.userTeam) + 1;
    body = `${myPos ? `<div class="pad"><div class="card ${S.board.conf < 30 ? 'warn' : ''}"><div class="kv"><span>Your position on the sack race</span><b>${ordinal(myPos)} of ${all.length}</b></div><div class="kv"><span>Odds</span><b>${oddsFor(S.board.conf)}</b></div></div></div>` : ''}
    <div class="scrollx"><table class="tbl"><thead><tr><th>#</th><th class="l">Coach</th><th>Board</th><th>Odds</th></tr></thead><tbody>
    ${list.map((x, i) => `<tr class="${x.t.id === S.userTeam ? 'me' : ''}" data-act="go" data-v="team" data-id="${x.t.id}"><td>${i + 1}</td><td class="l nm">${badge(x.t)} <b>${esc(coachName(x.t))}</b>${x.t.id === S.userTeam ? ' <span class="tagx">YOU</span>' : coachRival(x.t) ? ' <span class="rivlvl">⚔️</span>' : ''}<div class="muted sm">${esc(x.t.nick)} · ${x.t.w}-${x.t.l} · ${esc(league(x.t.lg).short)}</div></td><td><div class="meter mini"><div class="${x.conf >= 50 ? 'ok' : x.conf >= 25 ? 'mid' : 'bad'}" style="width:${x.conf}%"></div></div></td><td class="b">${oddsFor(x.conf)}</td></tr>`).join('')}
    </tbody></table></div><p class="hint pad">Next coach to leave his job — bookmaker odds based on board confidence.</p>`;
  } else if (sub === 'news') {
    const items = (S.news || []).filter((n) => inLg(n.lg) || n.mine).slice(0, 50);
    const ic = { hot: '🔥', sack: '🪑', rumour: '🗞️', trade: '🔁', sign: '✍️' };
    body = `<div class="list">${items.map((n) => `<div class="li newsrow ${n.mine ? 'mine' : ''}" ${n.pid && S.players[n.pid] ? `data-act="player" data-id="${n.pid}"` : ''}><span class="nic">${ic[n.kind] || '•'}</span><span class="grow"><span class="sm">${esc(n.text)}</span><div class="muted sm">${fmtDate(n.season, n.day, true)} ${n.season}${n.lg && league(n.lg) ? ' · ' + esc(league(n.lg).short) : ''}</div></span></div>`).join('') || '<p class="empty">Quiet out there. Rumours will start flying soon.</p>'}</div>`;
  } else if (sub === 'trades') {
    const ds = (S.deals || []).filter((d) => d.kind === 'trade' && (inLg(d.lg) || inLg(d.lg2)) && d.season >= S.season - 1).sort((a, b) => b.season - a.season || b.val - a.val).slice(0, 25);
    const side = (arr) => arr.length ? arr.map((x) => `<div class="tp" ${S.players[x.pid] ? `data-act="player" data-id="${x.pid}"` : ''}><span class="ps">${x.pos}</span> ${esc(x.name)} ${starsHTML(x.st)}</div>`).join('') : '<div class="muted sm">Contract relief</div>';
    body = `<div class="pad">${ds.map((d, i) => `<div class="card deal ${d.a === S.userTeam || d.b === S.userTeam ? 'me' : ''}"><div class="muted sm">#${i + 1} · ${fmtDate(d.season, d.day, true)} ${d.season}</div>
      <div class="dealgrid"><div>${badge(team(d.a))} <b>${esc(team(d.a).nick)}</b> get${side(d.aGets)}</div><div>${badge(team(d.b))} <b>${esc(team(d.b).nick)}</b> get${side(d.bGets)}</div></div></div>`).join('') || '<p class="empty">No trades yet this season.</p>'}</div>`;
  } else {
    const ds = (S.deals || []).filter((d) => d.kind === 'sign' && inLg(d.lg) && d.season >= S.season - 1).sort((a, b) => b.season - a.season || b.sal - a.sal).slice(0, 30);
    body = `<div class="scrollx"><table class="tbl"><thead><tr><th class="l">Player</th><th>Age</th><th>Ability</th><th>Club</th><th>Salary</th><th>Yrs</th></tr></thead><tbody>
    ${ds.map((d) => `<tr class="${d.tid === S.userTeam ? 'me' : ''}" ${S.players[d.pid] ? `data-act="player" data-id="${d.pid}"` : ''}><td class="l nm"><span class="ps">${d.pos}</span> ${esc(d.name)}${d.day === 0 ? ' <span class="tagx">FA</span>' : ''}</td><td>${d.age}</td><td>${starsHTML(d.st)}</td><td>${badge(team(d.tid))}</td><td class="b">${fmtMoney(d.sal)}</td><td>${d.yrs}</td></tr>`).join('') || '<tr><td colspan="6" class="empty">No signings yet.</td></tr>'}
    </tbody></table></div><p class="hint pad">FA = signed in the summer free-agency window.</p>`;
  }
  return `${marketHeader('rm')}<div class="pad tight">${leagueChips(lf, 'rmlg', true)}</div>${tabs('rm', [['hot', 'Hot Seat'], ['news', 'Rumours'], ['trades', 'Biggest Trades'], ['signs', 'Biggest Signings']])}${body}`;
}

/* ---------- v5: Ironman & achievements ---------- */
let IRON_RESOLVED = false;
function ironLocked() {
  return `${header('Locked')}<div class="pad"><div class="card"><h3>🛡️ Ironman career</h3><p>The database editor is disabled in Ironman mode so achievements stay earned, not edited.</p><p class="hint">Start a Standard career to use the editor.</p></div></div>`;
}
VIEWS.achievements = () => {
  const st = achStore();
  const n = Object.keys(st).length;
  return `${header('Achievements')}
  <div class="pad"><div class="card"><div class="kv"><span>Unlocked</span><b>${n} / ${ACHIEVEMENTS.length}</b></div><div class="meter"><div class="ok" style="width:${(n / ACHIEVEMENTS.length) * 100}%"></div></div>
  <p class="hint">Achievements can only be earned in <b>🛡️ Ironman</b> careers. They are kept on this device across all careers.</p></div></div>
  <div class="achgrid pad">${ACHIEVEMENTS.map((a) => { const u = st[a.k]; return `<div class="ach ${u ? 'on' : ''}"><div class="achic">${u ? a.ic : '🔒'}</div><div class="grow"><b>${a.n}</b><div class="muted sm">${a.d}</div>${u ? `<div class="sm achmeta">${esc(u.team)} · ${u.season}/${String(u.season + 1).slice(2)} · ${DIFFICULTY[u.diff]?.n || ''}</div>` : ''}</div></div>`; }).join('')}</div>`;
};

/* ---------- v6: match preview, club history ---------- */
const formHTML = (f) => f.n ? f.str.split('').map((x) => `<i class="fm ${x === 'W' ? 'w' : 'l'}">${x}</i>`).join('') : '<span class="muted sm">—</span>';
function previewCard(f, H, A) {
  const pv = matchPreview(f);
  UI.pv = pv;
  const pa = Math.round(pv.pA * 100), ph = 100 - pa;
  const applied = S.tweakApplied === f.id;
  const tw = pv.tweak;
  const stopTxt = tw.stopper ? `${pname(S.players[tw.stopper.id], true)} (#${S.players[tw.stopper.id].num}) shadows ${pname(S.players[tw.stopper.star], true)}` : null;
  const oppT = team(f.h === S.userTeam ? f.a : f.h), cr = coachRival(oppT);
  const prv = []; const rmap = playerRivalMap();
  roster(S.userTeam).forEach((p) => (rmap[p.id] || []).forEach((oid) => { const o = S.players[oid]; if (o && o.team === oppT.id) prv.push([p, o]); }));
  return `<div class="card preview">
    <h3>Match Preview</h3>
    ${cr ? `<div class="grudge">⚔️ <b>GRUDGE MATCH</b> — you vs ${esc(cr.name)} · ${rivalLabel(cr.pts)}<div class="sm">Board confidence and locker-room swings are doubled tonight.</div></div>` : ''}
    <div class="wp-row"><span class="b">${esc(A.abbr)} ${pa}%</span><span class="muted sm">Win probability</span><span class="b">${ph}% ${esc(H.abbr)}</span></div>
    <div class="wpbar"><div style="width:${pa}%;background:${A.c1}"></div><div style="width:${ph}%;background:${H.c1}"></div></div>
    <div class="odds">
      <div><span class="muted sm">${esc(A.nick)}</span><b>${pv.oddsA.frac}</b><span class="muted sm">${pv.oddsA.dec}</span><div class="form">${formHTML(pv.formA)}</div></div>
      <div class="oddlbl muted sm">Bookmaker odds<br>Last 5</div>
      <div class="r"><span class="muted sm">${esc(H.nick)}</span><b>${pv.oddsH.frac}</b><span class="muted sm">${pv.oddsH.dec}</span><div class="form">${formHTML(pv.formH)}</div></div>
    </div>
    <p class="hint">Based on available players, condition, morale, form and home court. ${pv.pUs < 0.35 ? 'An upset here would lift the board and the locker room.' : pv.pUs > 0.65 ? 'We are clear favourites — losing this one would hurt.' : ''}</p>
    <h3 class="sec2">Assistant's scouting</h3>
    <ul class="scout">${pv.bullets.map((b) => `<li><span>${b.ic}</span><div>${b.html}</div></li>`).join('')}${prv.map(([a, o]) => `<li><span>⚔️</span><div><b>#${a.num} ${esc(a.last)}</b> vs <b>#${o.num} ${esc(o.last)}</b> — personal rivals. Expect trash talk, big swings and foul trouble when they share the floor.</div></li>`).join('')}</ul>
    ${tw.changes.length || stopTxt ? `<div class="tweak"><div class="muted sm">Recommended tweak</div><div class="sm">${tw.changes.map((c) => esc(c.label)).concat(stopTxt ? [`🔒 ${esc(stopTxt)}`] : []).join(' · ')}</div>
      <button class="btn ${applied ? '' : 'primary'} big" data-act="applyTweak" ${applied ? 'disabled' : ''}>${applied ? '✓ Tweak applied' : 'Apply Assistant\'s Tweak'}</button></div>` : ''}
  </div>`;
}
VIEWS.clubHistory = () => {
  const t = userTeam();
  const ret = (t.retired || []).slice().sort((a, b) => a.num - b.num);
  const titles = S.history.filter((h) => h.champ === t.id);
  const myHist = S.coach.hist.filter((h) => h.club === teamName(t));
  return `${header('Club History')}
  <div class="pad">
    <div class="card"><h3>${esc(teamName(t))}</h3><div class="kv"><span>League</span><b>${esc(league(t.lg).name)}</b></div><div class="kv"><span>Titles in your era</span><b>${titles.length}</b></div></div>
    <h3 class="sec">Retired numbers</h3>
    ${ret.length ? `<div class="banners">${ret.map((r) => `<div class="banner" style="--bc:${t.c1};--bt:${readableOn(t.c1, t.c2)}"><div class="bnum">${r.num}</div><div class="bname">${esc(r.name)}</div><div class="bmeta">${r.pos} · ${r.seasons} seasons · ${r.gp} games<br>${r.gp ? (r.pts / r.gp).toFixed(1) : '0'} ppg · ${r.gp ? (r.rat / r.gp).toFixed(2) : '-'} avg rating${r.titles ? `<br>🏆 ${r.titles}` : ''}</div><div class="bseason">Retired ${r.season}</div></div>`).join('')}</div>` : '<p class="empty">No numbers retired yet. When a club legend hangs up his sneakers, the board can raise his number to the rafters.</p>'}
    <h3 class="sec">Championships</h3>
    ${titles.length ? titles.map((h) => `<div class="lrow"><span>🏆</span><span class="grow">${h.season}/${String(h.season + 1).slice(2)} ${esc(league(h.lg)?.name || '')}</span><span class="muted sm">MVP ${esc(h.mvp)}</span></div>`).join('') : '<p class="muted">No titles yet.</p>'}
    <h3 class="sec">Your seasons here</h3>
    ${myHist.length ? myHist.map((h) => `<div class="lrow"><span class="grow">${h.season}/${String(h.season + 1).slice(2)} · ${esc(h.rec)}</span><span class="muted sm">${esc([h.finish, h.note].filter(Boolean).join(' · '))}</span></div>`).join('') : '<p class="muted">Your first season is under way.</p>'}
  </div>`;
};
ACT.applyTweak = () => { if (!UI.pv) return; applyTweak(UI.pv); toast("Assistant's tweak applied."); render(); };

/* ---------- v7: press conferences ---------- */
function pressCard(kind, f) {
  if (!f) return '';
  ensureRivals();
  const label = kind === 'pre' ? 'Pre-match press conference' : 'Post-match press conference';
  if (S.pressDone[kind] === f.id) return `<div class="card press done"><h3>🎙️ ${label}</h3><p class="muted sm">${S.press[kind] === 'assistant' ? 'Your assistant handled the media and kept it measured.' : 'Done.'}</p></div>`;
  return `<div class="card press"><h3>🎙️ ${label}</h3><p class="hint">The media are waiting. Your answers affect morale, the board and your rivalries.</p>
    <div class="row-btns"><button class="btn primary" data-act="pressStart" data-k="${kind}" data-f="${f.id}">Face the press</button><button class="btn" data-act="pressAssistant" data-k="${kind}" data-f="${f.id}">Send assistant</button></div></div>`;
}
function pressFixture(fid) { return S.schedule.find((x) => x.id === +fid) || (S.lastResult && S.lastResult.fid === +fid ? { id: +fid, h: S.lastResult.h, a: S.lastResult.a } : null); }
function pressModal() {
  const P = UI.press, q = P.qs[P.i];
  if (!q) {
    S.pressDone[P.kind] = P.f.id; save(); closeModal();
    toast(P.notes.length ? `🎙️ Press done · ${esc(P.notes.join(' · '))}` : '🎙️ Press conference done.');
    return render();
  }
  modal(`<div class="muted sm">🎙️ ${P.kind === 'pre' ? 'Pre-match' : 'Post-match'} press conference · question ${P.i + 1} of ${P.qs.length}</div><h2 class="pq">${esc(q.q)}</h2>
    <div class="tones one">${q.opts.map((o, i) => `<button class="tone ${['t-berate', 't-calm', 't-encourage'][i]}" data-act="pressAnswer" data-i="${i}"><b>${esc(o.t)}</b><span>${esc(o.d)}</span></button>`).join('')}</div>
    <p class="hint">Your Media Handling (${S.coach.a.med}) affects how well your words land.</p>`, { locked: true, tall: true });
}
ACT.pressStart = (d) => { const f = pressFixture(d.f); if (!f) return; UI.press = { kind: d.k, f, qs: pressQuestions(d.k, f), i: 0, notes: [] }; pressModal(); };
ACT.pressAnswer = (d) => { const P = UI.press; const o = P.qs[P.i].opts[+d.i]; P.notes.push(...applyPress(o.fx, P.f)); P.i++; pressModal(); };
ACT.pressAssistant = (d) => { const f = pressFixture(d.f); if (!f) return; assistantPress(d.k, f); save(); toast('Your assistant faced the media.'); render(); };
ACT.pressSet = (d) => { S.press[d.k] = d.v; save(); render(); };

/* ---------- sortable squad tables ---------- */
const SORT_KEYS = {
  num: (p) => p.num ?? 999, pos: (p) => POS.indexOf(p.pos), name: (p) => p.last.toLowerCase(), age: (p) => p.age, ca: (p) => calcCA(p), pot: (p) => seenPot(p),
  cond: (p) => p.cond, mor: (p) => p.morale, sal: (p) => p.contract.sal, yrs: (p) => p.contract.yrs,
  gp: (p) => p.st.gp, min: (p) => p.st.gp ? p.st.min / p.st.gp : -1, pts: (p) => p.st.gp ? p.st.pts / p.st.gp : -1, reb: (p) => p.st.gp ? p.st.reb / p.st.gp : -1,
  ast: (p) => p.st.gp ? p.st.ast / p.st.gp : -1, stl: (p) => p.st.gp ? p.st.stl / p.st.gp : -1, blk: (p) => p.st.gp ? p.st.blk / p.st.gp : -1,
  fg: (p) => p.st.fga ? p.st.fgm / p.st.fga : -1, tp: (p) => p.st.tpa ? p.st.tpm / p.st.tpa : -1, rat: (p) => p.st.gp ? p.st.rat / p.st.gp : -1,
};
function sortSquad(r, tab) {
  const st = UI.tab['sq_' + tab]; if (!st || !SORT_KEYS[st.k]) return r;
  const f = SORT_KEYS[st.k], dir = st.dir === 'asc' ? 1 : -1;
  return r.slice().sort((a, b) => { const x = f(a), y = f(b); return (x < y ? -1 : x > y ? 1 : 0) * dir; });
}
function sth(tab, k, label, cls = '') {
  const st = UI.tab['sq_' + tab], on = st && st.k === k;
  return `<th class="${cls} sortable ${on ? 'on' : ''}" data-act="sortBy" data-t="${tab}" data-k="${k}">${label}${on ? (st.dir === 'asc' ? ' ▲' : ' ▼') : ''}</th>`;
}
// first tap: highest→lowest (A→Z for names); second tap flips; third tap back to rotation order
ACT.sortBy = (d) => {
  const key = 'sq_' + d.t, cur = UI.tab[key];
  const first = ['name', 'num', 'pos'].includes(d.k) ? 'asc' : 'desc';
  if (!cur || cur.k !== d.k) UI.tab[key] = { k: d.k, dir: first };
  else if (cur.dir === first) UI.tab[key] = { k: d.k, dir: first === 'asc' ? 'desc' : 'asc' };
  else UI.tab[key] = null;
  render();
};

/* ---------- v10: faces & coach look editor ---------- */
function lookEditor(L, target) {
  const sw = (k, v, col, on) => `<button class="swatch ${on ? 'on' : ''}" style="background:${col}" data-act="lookSet" data-t="${target}" data-k="${k}" data-v="${v}" aria-label="${k} ${v}"></button>`;
  const chip = (k, v, label, on) => `<button class="chip ${on ? 'on' : ''}" data-act="lookSet" data-t="${target}" data-k="${k}" data-v="${v}">${label}</button>`;
  return `<div class="card looked"><div class="lookprev">${faceSVG(L, { size: 104, kind: 'coach', c1: target === 'coach' ? userTeam().c1 : '#c92a2a' })}<button class="btn sm" data-act="lookRandom" data-t="${target}">🎲 Randomize</button></div>
    <label class="lbl">Skin</label><div class="swrow">${SKINS.map((c, i) => sw('skin', i, c, L.skin === i)).join('')}</div>
    <label class="lbl">Hair</label><div class="chips wrap">${HAIR_STYLES.map((h) => chip('hair', h, HAIR_NAMES[h], L.hair === h)).join('')}</div>
    <label class="lbl">Hair colour</label><div class="swrow">${Object.entries(HAIR_COLS).map(([k, c]) => sw('hairColor', k, c, L.hairColor === k)).join('')}</div>
    <label class="lbl">Facial hair</label><div class="chips wrap">${BEARDS.map((b) => chip('beard', b, BEARD_NAMES[b], L.beard === b)).join('')}</div>
    <label class="lbl">Glasses</label><div class="chips">${chip('glasses', '', 'None', !L.glasses)}${chip('glasses', '1', 'Glasses', !!L.glasses)}</div></div>`;
}
const lookOf = (t) => (t === 'ng' ? NG.look : S.coach.look);
ACT.lookSet = (d) => { const L = lookOf(d.t); L[d.k] = d.k === 'skin' ? +d.v : d.k === 'glasses' ? !!d.v : d.v; if (d.t === 'coach') save(); render(); };
ACT.lookRandom = (d) => { const nl = randomCoachLook(); if (d.t === 'ng') NG.look = nl; else { S.coach.look = nl; save(); } render(); };
VIEWS.coachLook = () => `${header('Your Look')}<div class="pad">${lookEditor(S.coach.look = S.coach.look || randomCoachLook(strSeed(S.coach.name)), 'coach')}</div>`;
