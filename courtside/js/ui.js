/* Courtside Manager — UI */
'use strict';

const UI = { view: 'title', params: {}, stack: [], sel: null, tab: {} };
const $ = (s) => document.querySelector(s);

/* ---------- Icons ---------- */
const IC = {
  inbox: '<path d="M4 4h16v16H4z" fill="none"/><path d="M4 13h4l2 3h4l2-3h4"/><path d="M4 4h16v16H4z"/>',
  squad: '<circle cx="9" cy="8" r="3.2"/><path d="M3 20c0-3.5 2.7-6 6-6s6 2.5 6 6"/><circle cx="17" cy="9" r="2.5"/><path d="M15.5 14.2c2.9.3 5.5 2.4 5.5 5.8"/>',
  tactics: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M12 4v16"/><circle cx="12" cy="12" r="3"/>',
  league: '<path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0z"/><path d="M17 6h3v2a3 3 0 0 1-3 3M7 6H4v2a3 3 0 0 0 3 3"/>',
  market: '<path d="M7 7h12l-3-3M17 17H5l3 3"/>',
  more: '<circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/>',
  back: '<path d="M15 5l-7 7 7 7"/>',
  play: '<path d="M7 5l12 7-12 7z"/>',
  edit: '<path d="M4 20h4L19 9l-4-4L4 16z"/>',
  ball: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3v18M5.6 5.6c3.5 3.5 3.5 9.3 0 12.8M18.4 5.6c-3.5 3.5-3.5 9.3 0 12.8"/>',
};
const icon = (n, cls = '') => `<svg class="ic ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${IC[n]}</svg>`;

/* ---------- Small components ---------- */
const starsHTML = (v) => `<span class="stars" title="${v} stars"><span class="on" style="width:${(v / 5) * 100}%">★★★★★</span>★★★★★</span>`;
const tier = (v) => (v >= 16 ? 4 : v >= 11 ? 3 : v >= 6 ? 2 : 1);
const attrCell = (v) => `<span class="av t${tier(Math.round(v))}">${Math.round(v)}</span>`;
const badge = (t, cls = '') => t ? `<span class="badge ${cls}" style="background:${t.c1};color:${t.c2}">${esc(t.abbr)}</span>` : `<span class="badge fa ${cls}">FA</span>`;
const ratingPill = (r) => r == null ? '<span class="rp">–</span>' : `<span class="rp ${r >= 8 ? 'r4' : r >= 7 ? 'r3' : r >= 6 ? 'r2' : 'r1'}">${r.toFixed(1)}</span>`;
function moraleLabel(m) { return m >= 85 ? ['Superb', 'm5'] : m >= 70 ? ['Very Good', 'm4'] : m >= 55 ? ['Good', 'm3'] : m >= 40 ? ['Okay', 'm2'] : m >= 25 ? ['Poor', 'm1'] : ['Very Poor', 'm0']; }
const moraleHTML = (m, short) => { const [l, c] = moraleLabel(m); return `<span class="mor ${c}">${short ? l.replace('Very ', 'V.') : l}</span>`; };
const condHTML = (c) => `<span class="cond ${c >= 85 ? 'c3' : c >= 65 ? 'c2' : 'c1'}">${Math.round(c)}%</span>`;
const injHTML = (p) => (p.inj ? `<span class="inj" title="${esc(p.inj.name)}">+</span>` : '');
const flag = (p) => NATS[p.nat]?.flag || '';
const avg1 = (a, b) => (b ? (a / b).toFixed(1) : '0.0');

function header(title, opts = {}) {
  return `<div class="phead">${opts.back !== false && UI.stack.length ? `<button class="iconbtn" data-act="back" aria-label="Back">${icon('back')}</button>` : ''}<h1>${title}</h1>${opts.right || ''}</div>`;
}
function tabs(key, list) {
  const cur = UI.tab[key] || list[0][0];
  return `<div class="tabs">${list.map(([k, n]) => `<button class="tab ${k === cur ? 'on' : ''}" data-act="tab" data-k="${key}" data-v="${k}">${n}</button>`).join('')}</div>`;
}
const curTab = (key, def) => UI.tab[key] || def;
function seg(name, cur, opts) {
  return `<div class="seg">${opts.map(([v, l]) => `<button class="${v === cur ? 'on' : ''}" data-act="tactic" data-k="${name}" data-v="${v}">${l}</button>`).join('')}</div>`;
}

function toast(msg, kind) {
  const el = document.createElement('div');
  el.className = 'toast ' + (kind || '');
  el.innerHTML = msg;
  document.body.appendChild(el);
  requestAnimationFrame(() => el.classList.add('show'));
  setTimeout(() => { el.classList.remove('show'); setTimeout(() => el.remove(), 300); }, 2600);
}
function modal(html) {
  closeModal();
  const el = document.createElement('div');
  el.className = 'modal-bg';
  el.innerHTML = `<div class="modal">${html}</div>`;
  el.addEventListener('click', (e) => { if (e.target === el) closeModal(); });
  document.body.appendChild(el);
}
function closeModal() { document.querySelectorAll('.modal-bg').forEach((m) => m.remove()); }

/* ---------- Router ---------- */
const ROOTS = ['inbox', 'squad', 'tactics', 'league', 'market', 'more'];
function go(view, params = {}, opts = {}) {
  if (ROOTS.includes(view) && !opts.keep) UI.stack = [];
  else if (!opts.replace && UI.view && UI.view !== view) UI.stack.push({ view: UI.view, params: UI.params });
  else if (!opts.replace && UI.view === view && JSON.stringify(params) !== JSON.stringify(UI.params)) UI.stack.push({ view: UI.view, params: UI.params });
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
  const top = $('#top'), nav = $('#nav');
  document.body.classList.toggle('ingame', !!inGame);
  if (S) {
    const t = userTeam();
    document.documentElement.style.setProperty('--team', t.c1);
    document.documentElement.style.setProperty('--team2', t.c2);
  }
  top.innerHTML = inGame ? topBar() : '';
  nav.innerHTML = inGame ? navBar() : '';
  const fn = VIEWS[UI.view] || VIEWS.title;
  $('#main').innerHTML = fn(UI.params || {});
  if (UI.view === 'match') Live.paint();
}

function topBar() {
  const t = userTeam();
  const label = S.pending ? 'Match Day' : S.phase === 'offseason' ? 'New Season' : S.phase === 'sacked' ? 'Find Job' : 'Continue';
  const rec = S.phase === 'playoffs' ? 'Playoffs' : `${t.w}-${t.l} · ${ordinal(teamRank(t.id))}`;
  return `<div class="tb-team" data-act="go" data-v="squad">${badge(t, 'lg')}<div><div class="tb-name">${esc(teamName(t))}</div><div class="tb-sub">${curDate()} · ${rec}</div></div></div>
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
    <p class="tag">Run a pro basketball club. Set the rotation, call the tactics, handle the egos, chase the title.</p>
    <div class="menu">
      ${hasSave() ? `<button class="btn primary big" data-act="loadGame">Continue Career</button>` : ''}
      <button class="btn ${hasSave() ? '' : 'primary'} big" data-act="go" data-v="newgame">New Career</button>
      <label class="btn big file">Start with Custom Database<input type="file" accept=".json,application/json" data-chg="importDbNew" hidden></label>
    </div>
    <p class="fine">All players, teams and names are fictional. Edit everything in the Database Editor.</p>
  </div>`;

let NG = null;
VIEWS.newgame = () => {
  if (!NG) NG = { db: generateDatabase(), team: null, name: '', length: 'short', custom: false };
  const tmpS = S; // compute strengths without state
  const strength = (tid) => {
    const r = NG.db.players.filter((p) => p.team === tid).map(calcCA).sort((a, b) => b - a).slice(0, 8);
    return r.length ? r.reduce((s, x) => s + x, 0) / r.length : 0;
  };
  const teams = NG.db.teams.map((t) => ({ t, s: strength(t.id) })).sort((a, b) => b.s - a.s);
  void tmpS;
  return `${header('New Career', { back: false, right: `<button class="btn sm" data-act="go" data-v="title">Cancel</button>` })}
  <div class="pad">
    <div class="card">
      <label class="lbl">Manager name</label>
      <input class="inp" id="ngName" maxlength="28" placeholder="Your name" value="${esc(NG.name)}" data-chg="ngName">
      <label class="lbl">Season length</label>
      <div class="seg">${[['short', `Short (${(NG.db.teams.length - 1) * 2} games)`], ['long', `Long (${(NG.db.teams.length - 1) * 4} games)`]].map(([v, l]) => `<button class="${NG.length === v ? 'on' : ''}" data-act="ngLen" data-v="${v}">${l}</button>`).join('')}</div>
      <div class="row-btns"><span class="muted sm">${esc(NG.db.leagueName)} · ${NG.db.teams.length} teams${NG.custom ? ' · custom database' : ''}</span>${NG.custom ? '' : `<button class="btn sm" data-act="ngReroll">Regenerate players</button>`}</div>
    </div>
    <h2 class="sec">Choose your club</h2>
    <div class="list">
      ${teams.map(({ t, s }, i) => `<button class="li team-pick ${NG.team === t.id ? 'sel' : ''}" data-act="ngTeam" data-id="${t.id}">
        ${badge(t, 'lg')}<div class="grow"><div class="b">${esc(t.city)} ${esc(t.nick)}</div><div class="muted sm">${i < 2 ? 'Title favourites' : i < 5 ? 'Contenders' : i < 9 ? 'Playoff hopefuls' : i < 12 ? 'Rebuilding' : 'Underdogs'}</div></div>
        ${starsHTML(stars(s))}</button>`).join('')}
    </div>
  </div>
  <div class="sticky-cta"><button class="btn primary big" data-act="ngStart" ${NG.team ? '' : 'disabled'}>Start Career</button></div>`;
};

/* Inbox */
VIEWS.inbox = () => {
  const list = S.inbox;
  return `${header('Inbox', { right: list.some((m) => !m.read) ? `<button class="btn sm" data-act="readAll">Mark all read</button>` : '' })}
  ${S.phase === 'sacked' ? `<div class="pad"><div class="card warn"><b>You have been sacked.</b><p>Hit <b>Find Job</b> to look at clubs interested in hiring you.</p></div></div>` : ''}
  <div class="list mails">${list.length ? list.map((m) => `<button class="li mail ${m.read ? '' : 'unread'}" data-act="mail" data-id="${m.id}">
    <span class="mfrom-ic ${m.type || ''}">${esc((m.from || '?')[0])}</span>
    <div class="grow"><div class="mrow"><span class="mfrom">${esc(m.from)}</span><span class="mdate">${fmtDate(m.season, m.day, true)}</span></div>
    <div class="msub">${esc(m.subject)}</div>${m.actions && !m.done ? '<span class="tagx">Action needed</span>' : ''}</div></button>`).join('') : '<p class="empty">No messages.</p>'}</div>`;
};
VIEWS.mail = ({ id }) => {
  const m = S.inbox.find((x) => x.id === id);
  if (!m) return header('Message') + '<p class="empty">Message not found.</p>';
  if (!m.read) { m.read = true; save(); setTimeout(() => { const n = $('#nav'); if (n) n.innerHTML = navBar(); }, 0); }
  return `${header('Message')}
  <div class="pad"><div class="card mailview">
    <div class="mhead"><span class="mfrom-ic ${m.type || ''}">${esc((m.from || '?')[0])}</span><div><div class="b">${esc(m.from)}</div><div class="muted sm">${fmtDate(m.season, m.day)}</div></div></div>
    <h2>${esc(m.subject)}</h2>
    <div class="mbody">${m.body.replace(/\n/g, '<br>')}</div>
    ${m.actions ? (m.done ? `<div class="done">✓ ${typeof m.done === 'string' ? esc(m.done) : 'Handled'}</div>` : `<div class="row-btns">${m.actions.map((a, i) => `<button class="btn ${i === 0 ? 'primary' : ''}" data-act="mailAct" data-id="${m.id}" data-a="${a.act}">${esc(a.label)}</button>`).join('')}</div>`) : ''}
  </div></div>`;
};

/* Squad */
function sortedRoster(tid) {
  const t = team(tid);
  cleanRotation(S, t);
  return t.rotation.map((id) => S.players[id]);
}
VIEWS.squad = () => {
  const t = userTeam();
  const r = sortedRoster(t.id);
  const tab = curTab('squad', 'ov');
  let body;
  if (tab === 'ov') {
    body = `<table class="tbl"><thead><tr><th>Pos</th><th class="l">Player</th><th>Age</th><th>Ability</th><th>Pot.</th><th>Cond</th><th>Morale</th></tr></thead><tbody>
    ${r.map((p, i) => `<tr data-act="player" data-id="${p.id}" class="${i === 5 ? 'sep' : ''}"><td><span class="ps">${p.pos}</span></td><td class="l nm">${injHTML(p)}${esc(pname(p, true))}</td><td>${p.age}</td><td>${starsHTML(stars(calcCA(p)))}</td><td>${starsHTML(stars(p.pot))}</td><td>${condHTML(p.cond)}</td><td>${moraleHTML(p.morale, 1)}</td></tr>`).join('')}
    </tbody></table>`;
  } else if (tab === 'st') {
    body = `<table class="tbl"><thead><tr><th class="l">Player</th><th>GP</th><th>MIN</th><th>PTS</th><th>REB</th><th>AST</th><th>FG%</th><th>Rat</th></tr></thead><tbody>
    ${r.map((p) => { const s = p.st; return `<tr data-act="player" data-id="${p.id}"><td class="l nm">${esc(pname(p, true))}</td><td>${s.gp}</td><td>${avg1(s.min, s.gp)}</td><td class="b">${avg1(s.pts, s.gp)}</td><td>${avg1(s.reb, s.gp)}</td><td>${avg1(s.ast, s.gp)}</td><td>${s.fga ? Math.round((s.fgm / s.fga) * 100) : '-'}</td><td>${s.gp ? ratingPill(s.rat / s.gp) : '-'}</td></tr>`; }).join('')}
    </tbody></table>`;
  } else {
    body = `<table class="tbl"><thead><tr><th class="l">Player</th><th>Age</th><th>Salary</th><th>Years</th><th></th></tr></thead><tbody>
    ${r.map((p) => `<tr data-act="player" data-id="${p.id}"><td class="l nm">${esc(pname(p, true))}</td><td>${p.age}</td><td>${fmtMoney(p.contract.sal)}</td><td>${p.contract.yrs}</td><td>${p.contract.yrs <= 1 ? '<span class="tagx">Expiring</span>' : ''}</td></tr>`).join('')}
    </tbody></table>
    <div class="pad"><div class="kv"><span>Payroll</span><b>${fmtMoney(teamPayroll(t.id))}</b></div><div class="kv"><span>Wage budget</span><b>${fmtMoney(t.budget)}</b></div><div class="kv"><span>Room</span><b class="${t.budget - teamPayroll(t.id) < 0 ? 'neg' : 'pos'}">${fmtMoney(Math.max(0, t.budget - teamPayroll(t.id)))}</b></div></div>`;
  }
  return `${header('Squad', { right: `<span class="muted sm">${r.length}/${ROSTER_MAX}</span>` })}${tabs('squad', [['ov', 'Overview'], ['st', 'Stats'], ['ct', 'Contracts']])}<div class="scrollx">${body}</div>`;
};

/* Player */
VIEWS.player = ({ id }) => {
  const p = S.players[id];
  if (!p) return header('Player') + '<p class="empty">This player has retired or no longer exists.</p>';
  const t = p.team != null ? team(p.team) : null;
  const mine = p.team === S.userTeam;
  const ca = calcCA(p);
  const tab = curTab('player', 'attr');
  let body = '';
  if (tab === 'attr') {
    body = `<div class="attr-grid">${ATTR_GROUPS.map((g) => `<div class="attr-box"><h3>${g}</h3>${ATTRS.filter((a) => a.g === g).map((a) => `<div class="arow"><span>${a.n}</span>${attrCell(p.a[a.k])}</div>`).join('')}</div>`).join('')}</div>`;
  } else if (tab === 'stats') {
    const s = p.st;
    const ps = p.pst;
    const line = (s) => `<div class="statline">${[['GP', s.gp], ['MIN', avg1(s.min, s.gp)], ['PTS', avg1(s.pts, s.gp)], ['REB', avg1(s.reb, s.gp)], ['AST', avg1(s.ast, s.gp)], ['STL', avg1(s.stl, s.gp)], ['BLK', avg1(s.blk, s.gp)], ['TOV', avg1(s.tov, s.gp)], ['FG%', s.fga ? ((s.fgm / s.fga) * 100).toFixed(1) : '-'], ['3P%', s.tpa ? ((s.tpm / s.tpa) * 100).toFixed(1) : '-'], ['FT%', s.fta ? ((s.ftm / s.fta) * 100).toFixed(1) : '-'], ['Avg Rat', s.gp ? (s.rat / s.gp).toFixed(2) : '-']].map(([k, v]) => `<div><span>${k}</span><b>${v}</b></div>`).join('')}</div>`;
    body = `<div class="pad"><h3 class="sec">${S.season}/${String(S.season + 1).slice(2)} regular season</h3>${line(s)}${ps && ps.gp ? `<h3 class="sec">Playoffs</h3>${line(ps)}` : ''}
    <h3 class="sec">Form (last 5)</h3><div class="form">${p.form.length ? p.form.map(ratingPill).join('') : '<span class="muted">No games yet</span>'}</div></div>`;
  } else {
    body = `<table class="tbl"><thead><tr><th class="l">Season</th><th>Team</th><th>GP</th><th>PPG</th><th>RPG</th><th>APG</th><th>Rat</th></tr></thead><tbody>
    ${p.career.length ? p.career.slice().reverse().map((c) => `<tr><td class="l">${c.s}/${String(c.s + 1).slice(2)}</td><td>${esc(c.t)}</td><td>${c.gp}</td><td>${avg1(c.pts, c.gp)}</td><td>${avg1(c.reb, c.gp)}</td><td>${avg1(c.ast, c.gp)}</td><td>${c.gp ? (c.rat / c.gp).toFixed(2) : '-'}</td></tr>`).join('') : '<tr><td colspan="7" class="empty">No career history yet</td></tr>'}</tbody></table>`;
  }
  let actions = '';
  if (mine) {
    actions = `<button class="btn primary" data-act="renewModal" data-id="${p.id}" ${p.contract.yrs > 2 ? 'disabled' : ''}>Renew Contract</button><button class="btn danger" data-act="release" data-id="${p.id}">Release</button>`;
    if (S.promises[p.id]) actions += `<span class="tagx">Promised minutes (${S.promises[p.id]} games left)</span>`;
  } else if (p.team == null) actions = `<button class="btn primary" data-act="signModal" data-id="${p.id}">Offer Contract</button>`;
  else actions = `<button class="btn primary" data-act="go" data-v="trade" data-id="${p.id}">Make Trade Offer</button>`;
  actions += `<button class="btn" data-act="go" data-v="editPlayer" data-id="${p.id}">${icon('edit')} Edit</button>`;
  return `${header('Player Profile')}
  <div class="phero" style="--pc:${t ? t.c1 : '#555'}">
    <div class="ph-top">${badge(t, 'xl')}<div class="grow"><div class="ph-name">${esc(p.first)} <b>${esc(p.last)}</b></div>
      <div class="ph-sub">${POS_NAME[p.pos]} · ${p.age} yrs · ${flag(p)} ${p.nat} · ${fmtHeight(p.h)}</div>
      <div class="ph-sub">${t ? `<a data-act="go" data-v="team" data-id="${t.id}">${esc(teamName(t))}</a>` : 'Free Agent'}${p.inj ? ` · <span class="neg">Injured: ${esc(p.inj.name)} (${p.inj.days}d)</span>` : ''}</div></div></div>
    <div class="ph-stats">
      <div><span>Ability</span>${starsHTML(stars(ca))}</div>
      <div><span>Potential</span>${starsHTML(stars(p.pot))}</div>
      <div><span>Condition</span>${condHTML(p.cond)}</div>
      <div><span>Morale</span>${moraleHTML(p.morale)}</div>
      <div><span>${p.team == null ? 'Asking' : 'Salary'}</span><b>${fmtMoney(p.team == null ? askingSalary(p) : p.contract.sal)}${p.team != null ? ` · ${p.contract.yrs}y` : ''}</b></div>
    </div>
    <div class="row-btns">${actions}</div>
  </div>
  ${tabs('player', [['attr', 'Attributes'], ['stats', 'Stats'], ['career', 'History']])}
  <div class="scrollx">${body}</div>`;
};

/* Team (other) */
VIEWS.team = ({ id }) => {
  const t = team(id);
  const r = sortedRoster(id);
  return `${header(esc(teamName(t)))}
  <div class="pad"><div class="card teamcard" style="--pc:${t.c1}">${badge(t, 'xl')}<div class="grow"><div class="b big">${esc(teamName(t))}</div><div class="muted">${t.w}-${t.l} · ${ordinal(teamRank(t.id))} · Payroll ${fmtMoney(teamPayroll(t.id))}</div>
  <div class="muted sm">Tactics: ${t.tactics.pace} pace · ${t.tactics.focus} focus · ${t.tactics.defense === 'zone' ? 'zone' : 'man-to-man'} D</div></div>${starsHTML(stars(teamStrength(t.id)))}</div></div>
  <div class="scrollx"><table class="tbl"><thead><tr><th>Pos</th><th class="l">Player</th><th>Age</th><th>Ability</th><th>PPG</th><th>Salary</th></tr></thead><tbody>
  ${r.map((p, i) => `<tr data-act="player" data-id="${p.id}" class="${i === 5 ? 'sep' : ''}"><td><span class="ps">${p.pos}</span></td><td class="l nm">${injHTML(p)}${esc(pname(p, true))}</td><td>${p.age}</td><td>${starsHTML(stars(calcCA(p)))}</td><td>${avg1(p.st.pts, p.st.gp)}</td><td>${fmtMoney(p.contract.sal)}</td></tr>`).join('')}
  </tbody></table></div>`;
};

/* Tactics */
VIEWS.tactics = () => {
  const t = userTeam();
  const r = sortedRoster(t.id);
  const tc = t.tactics;
  const slotName = (i) => (i < 5 ? POS[i] : i < 10 ? 'Bench' : 'Reserve');
  return `${header('Tactics')}
  <div class="pad">
    <div class="card">
      <div class="tac"><label>Pace</label>${seg('pace', tc.pace, [['slow', 'Slow'], ['normal', 'Balanced'], ['fast', 'Fast']])}</div>
      <div class="tac"><label>Offensive focus</label>${seg('focus', tc.focus, [['inside', 'Inside'], ['balanced', 'Balanced'], ['outside', 'Perimeter']])}</div>
      <div class="tac"><label>Defense</label>${seg('defense', tc.defense, [['man', 'Man-to-Man'], ['zone', 'Zone']])}</div>
      <div class="tac"><label>Intensity</label>${seg('intensity', tc.intensity, [['low', 'Conservative'], ['normal', 'Normal'], ['high', 'Aggressive']])}</div>
      <p class="hint">${tacticHint(tc)}</p>
    </div>
    <div class="sec-row"><h2 class="sec">Rotation</h2><div><button class="btn sm" data-act="autoRot">Auto-pick</button></div></div>
    <label class="check"><input type="checkbox" data-chg="autoRotToggle" ${S.autoRot ? 'checked' : ''}> Let my assistant pick the rotation before every game</label>
    <p class="hint">Tap a player, then tap another to swap them. Top 5 start. Bench players 6–10 get minutes; reserves don't play.</p>
  </div>
  <div class="list rot">${r.map((p, i) => `<button class="li rotrow ${UI.sel === p.id ? 'sel' : ''} ${i === 5 || i === 10 ? 'gap' : ''}" data-act="rotSel" data-id="${p.id}">
    <span class="slot ${i < 5 ? 'st' : i < 10 ? 'bn' : 'rs'}">${slotName(i)}</span>
    <span class="ps">${p.pos}</span>
    <span class="grow nm">${injHTML(p)}${esc(pname(p, true))}</span>
    ${starsHTML(stars(calcCA(p)))}
    ${condHTML(p.cond)}
    <span class="mins">${i < MIN_PLAN.length ? MIN_PLAN[i] + "'" : '–'}</span></button>`).join('')}</div>`;
};
function tacticHint(tc) {
  const h = [];
  if (tc.pace === 'fast') h.push('Fast pace = more possessions; good for athletic, deep teams.');
  if (tc.pace === 'slow') h.push('Slow pace = fewer possessions; helps underdogs keep games close.');
  if (tc.focus === 'inside') h.push('Inside focus feeds your finishers and big men.');
  if (tc.focus === 'outside') h.push('Perimeter focus lets your shooters fire away from three.');
  if (tc.defense === 'zone') h.push('Zone protects the paint but gives up more open threes.');
  if (tc.intensity === 'high') h.push('Aggressive D forces turnovers but sends opponents to the line.');
  if (tc.intensity === 'low') h.push('Conservative D avoids fouls but forces fewer turnovers.');
  return h.join(' ') || 'A balanced approach. Adjust to your roster\'s strengths.';
}

/* League */
VIEWS.league = () => {
  const tab = curTab('league', 'table');
  let body = '';
  if (tab === 'table') {
    const st = standings();
    const lead = st[0];
    const po = Math.min(8, st.length >= 8 ? 8 : 4);
    body = `<table class="tbl"><thead><tr><th>#</th><th class="l">Team</th><th>W</th><th>L</th><th>Pct</th><th>GB</th><th>Diff</th><th>Strk</th></tr></thead><tbody>
    ${st.map((t, i) => { const gp = t.w + t.l; const gb = ((lead.w - t.w) + (t.l - lead.l)) / 2; return `<tr data-act="go" data-v="team" data-id="${t.id}" class="${t.id === S.userTeam ? 'me' : ''} ${i === po - 1 ? 'cut' : ''}"><td>${i + 1}</td><td class="l nm">${badge(t)} ${esc(t.nick)}</td><td>${t.w}</td><td>${t.l}</td><td>${gp ? (t.w / gp).toFixed(3).replace(/^0/, '') : '.000'}</td><td>${gb ? gb.toFixed(1) : '–'}</td><td class="${t.pf - t.pa >= 0 ? 'pos' : 'neg'}">${t.pf - t.pa > 0 ? '+' : ''}${t.pf - t.pa}</td><td>${t.streak ? (t.streak > 0 ? 'W' + t.streak : 'L' + -t.streak) : '–'}</td></tr>`; }).join('')}
    </tbody></table><p class="hint pad">Top ${po} qualify for the playoffs.</p>`;
  } else if (tab === 'fix') {
    const fx = S.schedule.filter((f) => f.h === S.userTeam || f.a === S.userTeam).sort((a, b) => a.day - b.day);
    body = `<div class="list">${fx.map((f) => { const home = f.h === S.userTeam; const opp = team(home ? f.a : f.h); const us = home ? f.hs : f.as, them = home ? f.as : f.hs; return `<div class="li fx ${f.played ? '' : 'up'}"><span class="fxd">${fmtDate(S.season, f.day, true)}</span><span class="ha">${home ? 'vs' : '@'}</span>${badge(opp)}<span class="grow">${esc(opp.nick)}${f.type === 'po' ? ` <span class="tagx">PO G${f.game}</span>` : ''}</span>${f.played ? `<b class="${us > them ? 'pos' : 'neg'}">${us > them ? 'W' : 'L'} ${us}-${them}</b>` : '<span class="muted">—</span>'}</div>`; }).join('')}</div>`;
  } else if (tab === 'res') {
    const days = [...new Set(S.schedule.filter((f) => f.played).map((f) => f.day))].sort((a, b) => b - a).slice(0, 4);
    body = days.length ? days.map((d) => `<h3 class="sec pad">${fmtDate(S.season, d)}</h3><div class="list">${S.schedule.filter((f) => f.day === d && f.played).map((f) => { const H = team(f.h), A = team(f.a); const pom = S.players[f.pom]; return `<div class="li res ${f.h === S.userTeam || f.a === S.userTeam ? 'me' : ''}"><span class="rt">${badge(A)} ${esc(A.abbr)}</span><b class="${f.as > f.hs ? 'w' : ''}">${f.as}</b><span class="at">@</span><b class="${f.hs > f.as ? 'w' : ''}">${f.hs}</b><span class="rt">${esc(H.abbr)} ${badge(H)}</span>${pom ? `<span class="pom" data-act="player" data-id="${pom.id}">★ ${esc(pname(pom, true))}</span>` : ''}</div>`; }).join('')}</div>`).join('') : '<p class="empty">No games played yet.</p>';
  } else if (tab === 'lead') {
    const pl = Object.values(S.players).filter((p) => p.team != null && p.st.gp >= Math.max(1, Math.max(...S.teams.map((t) => t.w + t.l)) * 0.4));
    const cats = [['pts', 'Points'], ['reb', 'Rebounds'], ['ast', 'Assists'], ['stl', 'Steals'], ['blk', 'Blocks']];
    body = `<div class="pad">${cats.map(([k, n]) => `<div class="card lead"><h3>${n} per game</h3>${pl.sort((a, b) => b.st[k] / b.st.gp - a.st[k] / a.st.gp).slice(0, 5).map((p, i) => `<div class="lrow ${p.team === S.userTeam ? 'me' : ''}" data-act="player" data-id="${p.id}"><span>${i + 1}</span>${badge(team(p.team))}<span class="grow">${esc(pname(p, true))}</span><b>${avg1(p.st[k], p.st.gp)}</b></div>`).join('') || '<p class="muted">No data yet</p>'}</div>`).join('')}</div>`;
  } else if (tab === 'po') {
    body = playoffBracket();
  } else if (tab === 'hist') {
    body = S.history.length ? `<table class="tbl"><thead><tr><th class="l">Season</th><th class="l">Champion</th><th class="l">MVP</th><th>You</th></tr></thead><tbody>${S.history.map((h) => `<tr><td class="l">${h.season}/${String(h.season + 1).slice(2)}</td><td class="l">${esc(h.champName)}</td><td class="l">${esc(h.mvp)}</td><td>${ordinal(h.userRank)}</td></tr>`).join('')}</tbody></table>` : '<p class="empty">History will be written at the end of the season.</p>';
  }
  return `${header(esc(S.leagueName))}${tabs('league', [['table', 'Standings'], ['fix', 'Fixtures'], ['res', 'Results'], ['lead', 'Leaders'], ['po', 'Playoffs'], ['hist', 'History']])}<div class="scrollx">${body}</div>`;
};
function playoffBracket() {
  const P = S.playoffs;
  if (!P) return '<p class="empty">The playoffs start after the regular season. Top 8 teams qualify.</p>';
  const rounds = [1, 2, 3].filter((r) => P.series.some((s) => s.round === r));
  return `<div class="pad">${P.champion ? `<div class="card champ">🏆 <b>${esc(teamName(team(P.champion)))}</b> are champions!</div>` : ''}${rounds.map((r) => `<h3 class="sec">${ROUND_NAMES[r]} <span class="muted sm">· best of ${bestOf(r)}</span></h3>${P.series.filter((s) => s.round === r).map((s) => { const A = team(s.a), B = team(s.b); const w = seriesWinner(s); return `<div class="card series ${s.a === S.userTeam || s.b === S.userTeam ? 'me' : ''}"><div class="srow ${w === s.a ? 'w' : w ? 'l' : ''}"><span class="seed">${P.seeds.indexOf(s.a) + 1}</span>${badge(A)}<span class="grow">${esc(A.nick)}</span><b>${s.wa}</b></div><div class="srow ${w === s.b ? 'w' : w ? 'l' : ''}"><span class="seed">${P.seeds.indexOf(s.b) + 1}</span>${badge(B)}<span class="grow">${esc(B.nick)}</span><b>${s.wb}</b></div></div>`; }).join('')}`).join('')}</div>`;
}

/* Market */
VIEWS.market = () => {
  const tab = curTab('market', 'fa');
  const pos = UI.tab.mpos || 'ALL';
  const sort = UI.tab.msort || 'ca';
  let pl = tab === 'fa' ? freeAgents() : Object.values(S.players).filter((p) => p.team != null && p.team !== S.userTeam);
  if (pos !== 'ALL') pl = pl.filter((p) => p.pos === pos);
  const key = { ca: (p) => -calcCA(p), pot: (p) => -p.pot, age: (p) => p.age, sal: (p) => (tab === 'fa' ? askingSalary(p) : p.contract.sal) }[sort];
  pl.sort((a, b) => key(a) - key(b));
  const ut = userTeam();
  const room = ut.budget - teamPayroll(ut.id);
  return `${header('Market')}${tabs('market', [['fa', 'Free Agents'], ['tr', 'Trade Targets']])}
  <div class="pad filters">
    <div class="chips">${['ALL', ...POS].map((p) => `<button class="chip ${pos === p ? 'on' : ''}" data-act="tab" data-k="mpos" data-v="${p}">${p}</button>`).join('')}</div>
    <div class="chips">${[['ca', 'Ability'], ['pot', 'Potential'], ['age', 'Age'], ['sal', 'Salary']].map(([k, n]) => `<button class="chip ${sort === k ? 'on' : ''}" data-act="tab" data-k="msort" data-v="${k}">${n}</button>`).join('')}</div>
    <div class="muted sm">Wage room: <b class="${room < 0 ? 'neg' : 'pos'}">${fmtMoney(Math.max(0, room))}</b> · Roster ${roster(ut.id).length}/${ROSTER_MAX}${S.phase === 'regular' && S.day > seasonLastRegDay() * 0.75 ? ' · <span class="neg">Trade deadline passed</span>' : ''}</div>
  </div>
  <div class="scrollx"><table class="tbl"><thead><tr><th>Pos</th><th class="l">Player</th><th>Age</th><th>Ability</th><th>Pot.</th><th>${tab === 'fa' ? 'Asks' : 'Club'}</th></tr></thead><tbody>
  ${pl.slice(0, 80).map((p) => `<tr data-act="player" data-id="${p.id}"><td><span class="ps">${p.pos}</span></td><td class="l nm">${injHTML(p)}${esc(pname(p, true))}${p.rookie ? ' <span class="tagx">NEW</span>' : ''}</td><td>${p.age}</td><td>${starsHTML(stars(calcCA(p)))}</td><td>${starsHTML(stars(p.pot))}</td><td>${tab === 'fa' ? fmtMoney(askingSalary(p)) : badge(team(p.team))}</td></tr>`).join('') || '<tr><td colspan="6" class="empty">Nobody matches.</td></tr>'}
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
  const pct = clamp(interest * 100, 0, 100);
  const mine = sortedRoster(S.userTeam).sort((a, b) => playerValue(b) - playerValue(a));
  const inSal = tgt.contract.sal, outSal = off.reduce((s, x) => s + S.players[x].contract.sal, 0);
  return `${header('Trade Offer')}
  <div class="pad">
    <div class="card"><div class="muted sm">You receive</div>
      <div class="trow">${badge(t)}<div class="grow"><b>${esc(pname(tgt))}</b><div class="muted sm">${tgt.pos} · ${tgt.age} yrs · ${fmtMoney(tgt.contract.sal)} × ${tgt.contract.yrs}y</div></div>${starsHTML(stars(calcCA(tgt)))}</div></div>
    <div class="card"><div class="muted sm">${esc(t.nick)} interest</div>
      <div class="meter"><div style="width:${pct}%" class="${interest >= 1 ? 'ok' : interest > 0.8 ? 'mid' : ''}"></div></div>
      <div class="sm muted">${off.length ? (interest >= 1 ? 'They will accept this offer.' : interest > 0.8 ? 'Close — add a bit more value.' : 'Not enough. Add better players or younger talent.') : 'Select players to offer below.'}</div>
      <div class="sm muted">Salary in ${fmtMoney(inSal)} · out ${fmtMoney(outSal)}</div>
    </div>
    <h3 class="sec">You give</h3>
  </div>
  <div class="list">${mine.map((p) => `<button class="li ${off.includes(p.id) ? 'sel' : ''}" data-act="offerToggle" data-id="${p.id}"><span class="cbx">${off.includes(p.id) ? '✓' : ''}</span><span class="ps">${p.pos}</span><span class="grow nm">${esc(pname(p, true))} <span class="muted sm">${p.age}y · ${fmtMoney(p.contract.sal)}</span></span>${starsHTML(stars(calcCA(p)))}</button>`).join('')}</div>
  <div class="sticky-cta"><button class="btn primary big" data-act="proposeTrade" ${off.length ? '' : 'disabled'}>Propose Trade</button></div>`;
};

/* More */
VIEWS.more = () => `${header('More')}
  <div class="list menu-list">
    <button class="li" data-act="go" data-v="club"><span class="grow"><b>Club & Board</b><div class="muted sm">Finances, budget, board confidence</div></span>›</button>
    <button class="li" data-act="go" data-v="training"><span class="grow"><b>Training</b><div class="muted sm">Current focus: ${TRAINING[S.training].n}</div></span>›</button>
    <button class="li" data-act="go" data-v="editor"><span class="grow"><b>Database Editor</b><div class="muted sm">Edit league, teams and players · import/export</div></span>›</button>
    <button class="li" data-act="go" data-v="settings"><span class="grow"><b>Save & Settings</b><div class="muted sm">Backup, restore, start over</div></span>›</button>
    <button class="li" data-act="toTitle"><span class="grow"><b>Main Menu</b></span>›</button>
  </div>`;

VIEWS.club = () => {
  const t = userTeam();
  const pay = teamPayroll(t.id);
  const c = Math.round(S.board.conf);
  return `${header('Club & Board')}
  <div class="pad">
    <div class="card"><h3>Board confidence</h3><div class="meter big"><div style="width:${c}%" class="${c >= 60 ? 'ok' : c >= 35 ? 'mid' : 'bad'}"></div></div>
      <div class="kv"><span>Confidence</span><b>${c}%</b></div><div class="kv"><span>Season expectation</span><b>${esc(S.board.exp.txt)}</b></div><div class="kv"><span>Current position</span><b>${ordinal(teamRank(t.id))}</b></div>
      <p class="hint">Confidence below 20% at the end of a season and you'll be shown the door.</p></div>
    <div class="card"><h3>Finances</h3>
      <div class="kv"><span>Wage budget</span><b>${fmtMoney(t.budget)}</b></div><div class="kv"><span>Payroll</span><b>${fmtMoney(pay)}</b></div><div class="kv"><span>Room</span><b class="${t.budget - pay >= 0 ? 'pos' : 'neg'}">${fmtMoney(Math.abs(t.budget - pay))}${t.budget - pay < 0 ? ' over' : ''}</b></div>
      <div class="meter"><div style="width:${clamp((pay / t.budget) * 100, 0, 100)}%" class="${pay <= t.budget ? 'ok' : 'bad'}"></div></div></div>
    <div class="card"><h3>Manager</h3><div class="kv"><span>Name</span><b>${esc(S.manager)}</b></div><div class="kv"><span>Seasons</span><b>${S.history.length + 1}</b></div><div class="kv"><span>Titles</span><b>${S.history.filter((h) => h.champ === S.userTeam).length}</b></div></div>
  </div>`;
};

VIEWS.training = () => `${header('Training')}
  <div class="pad"><p class="hint">Training focus affects how your players develop week to week and over the summer. Young players with high potential and good Work Rate improve fastest, especially when they get minutes.</p></div>
  <div class="list">${Object.entries(TRAINING).map(([k, v]) => `<button class="li ${S.training === k ? 'sel' : ''}" data-act="training" data-v="${k}"><span class="cbx">${S.training === k ? '✓' : ''}</span><span class="grow"><b>${v.n}</b><div class="muted sm">${v.d}</div></span></button>`).join('')}</div>`;

VIEWS.settings = () => `${header('Save & Settings')}
  <div class="pad">
    <div class="card"><h3>Save game</h3><p class="hint">Your career auto-saves on this device after every action.</p>
      <div class="row-btns"><button class="btn" data-act="exportSave">Download backup</button><label class="btn file">Restore backup<input type="file" accept=".json,application/json" data-chg="importSave" hidden></label></div></div>
    <div class="card"><h3>Danger zone</h3><div class="row-btns"><button class="btn danger" data-act="deleteSave">Delete career</button></div></div>
    <p class="fine">Courtside Manager · all players, teams and names are fictional.</p>
  </div>`;

/* Editor */
VIEWS.editor = () => {
  const tab = curTab('editor', 'players');
  let body = '';
  if (tab === 'league') {
    body = `<div class="pad"><div class="card">
      <label class="lbl">League name</label><input class="inp" value="${esc(S.leagueName)}" data-chg="edLeague" data-f="leagueName" maxlength="40">
      <label class="lbl">Short name</label><input class="inp" value="${esc(S.short)}" data-chg="edLeague" data-f="short" maxlength="6"></div>
      <div class="card"><h3>Share your database</h3><p class="hint">Export the league, teams and players as a file. Others can load it from the main menu with “Start with Custom Database”.</p>
      <div class="row-btns"><button class="btn primary" data-act="exportDb">Export database</button><button class="btn" data-act="copyDb">Copy as text</button></div></div>
      <div class="card"><h3>Load a database</h3><p class="hint">Starts a <b>new career</b> with the imported league. Your current career will be replaced.</p>
      <div class="row-btns"><label class="btn file">Import file<input type="file" accept=".json,application/json" data-chg="importDbNew" hidden></label><button class="btn" data-act="pasteDb">Paste text</button></div></div></div>`;
  } else if (tab === 'teams') {
    body = `<div class="list">${S.teams.map((t) => `<button class="li" data-act="go" data-v="editTeam" data-id="${t.id}">${badge(t, 'lg')}<span class="grow"><b>${esc(teamName(t))}</b><div class="muted sm">${roster(t.id).length} players · budget ${fmtMoney(t.budget)}</div></span>${icon('edit')}</button>`).join('')}</div>`;
  } else {
    const q = (UI.tab.edq || '').toLowerCase();
    const ft = UI.tab.edteam || 'all';
    let pl = Object.values(S.players);
    if (ft === 'fa') pl = pl.filter((p) => p.team == null); else if (ft !== 'all') pl = pl.filter((p) => p.team === +ft);
    if (q) pl = pl.filter((p) => (p.first + ' ' + p.last).toLowerCase().includes(q));
    pl.sort((a, b) => calcCA(b) - calcCA(a));
    body = `<div class="pad filters"><input class="inp" placeholder="Search players…" value="${esc(UI.tab.edq || '')}" data-chg="edSearch" id="edq">
      <select class="inp" data-chg="edTeamFilter"><option value="all">All teams</option><option value="fa" ${ft === 'fa' ? 'selected' : ''}>Free agents</option>${S.teams.map((t) => `<option value="${t.id}" ${+ft === t.id ? 'selected' : ''}>${esc(teamName(t))}</option>`).join('')}</select>
      <div class="row-btns"><button class="btn primary" data-act="newPlayer">+ New player</button></div></div>
      <div class="list">${pl.slice(0, 100).map((p) => `<button class="li" data-act="go" data-v="editPlayer" data-id="${p.id}">${badge(p.team != null ? team(p.team) : null)}<span class="ps">${p.pos}</span><span class="grow nm">${esc(pname(p))} <span class="muted sm">${p.age}y</span></span>${starsHTML(stars(calcCA(p)))}</button>`).join('')}${pl.length > 100 ? `<p class="empty">${pl.length - 100} more — refine your search.</p>` : ''}</div>`;
  }
  return `${header('Database Editor')}${tabs('editor', [['players', 'Players'], ['teams', 'Teams'], ['league', 'League & Share']])}${body}`;
};
VIEWS.editTeam = ({ id }) => {
  const t = team(id);
  return `${header('Edit Team')}
  <div class="pad"><div class="card">
    <div class="trow">${badge(t, 'xl')}<b class="big">${esc(teamName(t))}</b></div>
    <label class="lbl">City</label><input class="inp" id="et_city" value="${esc(t.city)}" maxlength="24">
    <label class="lbl">Nickname</label><input class="inp" id="et_nick" value="${esc(t.nick)}" maxlength="24">
    <label class="lbl">Abbreviation</label><input class="inp" id="et_abbr" value="${esc(t.abbr)}" maxlength="4">
    <div class="two"><div><label class="lbl">Primary colour</label><input type="color" class="inp color" id="et_c1" value="${t.c1}"></div><div><label class="lbl">Text colour</label><input type="color" class="inp color" id="et_c2" value="${t.c2}"></div></div>
    <label class="lbl">Wage budget ($M)</label><input class="inp" id="et_budget" type="number" inputmode="decimal" value="${t.budget}">
  </div></div>
  <div class="sticky-cta"><button class="btn primary big" data-act="saveTeam" data-id="${t.id}">Save Team</button></div>`;
};
VIEWS.editPlayer = ({ id }) => {
  const p = S.players[id];
  if (!p) return header('Edit Player') + '<p class="empty">Player not found.</p>';
  const num = (key, val, min, max, step = 1) => `<input class="inp num" type="number" inputmode="decimal" id="ep_${key}" value="${val}" min="${min}" max="${max}" step="${step}">`;
  return `${header('Edit Player')}
  <div class="pad"><div class="card">
    <div class="two"><div><label class="lbl">First name</label><input class="inp" id="ep_first" value="${esc(p.first)}" maxlength="20"></div><div><label class="lbl">Last name</label><input class="inp" id="ep_last" value="${esc(p.last)}" maxlength="24"></div></div>
    <div class="two"><div><label class="lbl">Position</label><select class="inp" id="ep_pos">${POS.map((x) => `<option ${x === p.pos ? 'selected' : ''}>${x}</option>`).join('')}</select></div><div><label class="lbl">Nationality</label><select class="inp" id="ep_nat">${NAT_KEYS.map((k) => `<option value="${k}" ${k === p.nat ? 'selected' : ''}>${NATS[k].flag} ${k}</option>`).join('')}</select></div></div>
    <div class="two"><div><label class="lbl">Age</label>${num('age', p.age, 16, 45)}</div><div><label class="lbl">Height (cm)</label>${num('h', p.h, 165, 235)}</div></div>
    <label class="lbl">Team</label><select class="inp" id="ep_team"><option value="">Free agent</option>${S.teams.map((t) => `<option value="${t.id}" ${p.team === t.id ? 'selected' : ''}>${esc(teamName(t))}</option>`).join('')}</select>
    <div class="two"><div><label class="lbl">Salary ($M)</label>${num('sal', p.contract.sal, 0.5, 60, 0.1)}</div><div><label class="lbl">Contract years</label>${num('yrs', p.contract.yrs, 0, 6)}</div></div>
    <label class="lbl">Potential (1–20) <span class="muted sm">· current ability ≈ ${calcCA(p).toFixed(1)}</span></label>${num('pot', p.pot, 1, 20, 0.5)}
  </div>
  <div class="attr-grid edit">${ATTR_GROUPS.map((g) => `<div class="attr-box"><h3>${g}</h3>${ATTRS.filter((a) => a.g === g).map((a) => `<div class="arow"><span>${a.n}</span><span class="stepper"><button data-act="step" data-k="${a.k}" data-d="-1">−</button><input type="number" inputmode="numeric" min="1" max="20" id="ep_a_${a.k}" value="${p.a[a.k]}" class="t${tier(p.a[a.k])}" data-chg="attrIn"><button data-act="step" data-k="${a.k}" data-d="1">+</button></span></div>`).join('')}</div>`).join('')}</div>
  <div class="row-btns pad"><button class="btn danger" data-act="deletePlayer" data-id="${p.id}">Delete player</button></div>
  </div>
  <div class="sticky-cta"><button class="btn primary big" data-act="savePlayer" data-id="${p.id}">Save Player</button></div>`;
};

/* Pre-match */
VIEWS.prematch = () => {
  const f = S.schedule.find((x) => x.id === S.pending);
  if (!f) { go('inbox', {}, { replace: true }); return ''; }
  const H = team(f.h), A = team(f.a);
  const opp = f.h === S.userTeam ? A : H;
  const oppTop = roster(opp.id).filter((p) => !p.inj).sort((a, b) => calcCA(b) - calcCA(a)).slice(0, 3);
  const danger = oppTop[0];
  const best = danger ? ATTRS.slice().sort((a, b) => danger.a[b.k] - danger.a[a.k])[0] : null;
  const myInj = roster(S.userTeam).filter((p) => p.inj);
  const tired = sortedRoster(S.userTeam).slice(0, 8).filter((p) => !p.inj && p.cond < 75);
  const s = f.type === 'po' ? S.playoffs.series.find((x) => x.id === f.series) : null;
  const starters = sortedRoster(S.userTeam).slice(0, 5);
  return `${header(f.type === 'po' ? `${ROUND_NAMES[s.round]} · Game ${f.game}` : 'Match Day', { back: false })}
  <div class="pad">
    <div class="card matchup">
      <div class="mt">${badge(A, 'xl')}<b>${esc(A.nick)}</b><span class="muted sm">${f.type === 'po' ? '' : `${A.w}-${A.l}`}</span>${starsHTML(stars(teamStrength(A.id)))}</div>
      <div class="vs">@<div class="muted sm">${fmtDate(S.season, f.day, true)}</div>${s ? `<div class="sm">Series ${team(s.a).abbr} ${s.wa}–${s.wb} ${team(s.b).abbr}</div>` : ''}</div>
      <div class="mt">${badge(H, 'xl')}<b>${esc(H.nick)}</b><span class="muted sm">${f.type === 'po' ? '' : `${H.w}-${H.l}`}</span>${starsHTML(stars(teamStrength(H.id)))}</div>
    </div>
    <div class="card"><h3>Assistant's report</h3>
      ${danger ? `<p>Their danger man is <a data-act="player" data-id="${danger.id}">${esc(pname(danger))}</a> — ${best.n} ${danger.a[best.k]}. ${oppTop[1] ? `Also watch <a data-act="player" data-id="${oppTop[1].id}">${esc(pname(oppTop[1], true))}</a>.` : ''}</p>` : ''}
      <p>They play a <b>${opp.tactics.pace}</b> pace with a <b>${opp.tactics.focus}</b> focus and ${opp.tactics.defense === 'zone' ? '<b>zone</b> defense' : '<b>man-to-man</b> D'}.${opp.tactics.defense === 'zone' ? ' Perimeter shooting should hurt their zone.' : ''}${opp.tactics.focus === 'inside' ? ' A zone could clog the paint for them.' : ''}</p>
      ${myInj.length ? `<p class="neg">Unavailable: ${myInj.map((p) => esc(pname(p, true))).join(', ')}</p>` : ''}
      ${tired.length ? `<p class="warn-t">Tired: ${tired.map((p) => `${esc(pname(p, true))} (${Math.round(p.cond)}%)`).join(', ')}</p>` : ''}
    </div>
    <div class="card"><h3>Your starting five</h3>${starters.map((p) => `<div class="lrow" data-act="player" data-id="${p.id}"><span class="ps">${p.pos}</span><span class="grow">${injHTML(p)}${esc(pname(p))}</span>${condHTML(p.cond)}</div>`).join('')}
      <div class="row-btns"><button class="btn sm" data-act="go" data-v="tactics" data-keep="1">Change tactics</button></div></div>
  </div>
  <div class="sticky-cta two-btn"><button class="btn big" data-act="playMatch" data-watch="0">Quick Result</button><button class="btn primary big" data-act="playMatch" data-watch="1">${icon('play')} Watch Match</button></div>`;
};

/* Live match */
const Live = {
  f: null, res: null, t: 0, speed: 1, timer: null, shown: 0,
  start(f, res) { this.f = f; this.res = res; this.t = 0; this.shown = 0; this.speed = 1; this.done = false; this._painted = -1; this._ctl = ''; this.run(); },
  gtime(e) { return e.q <= 4 ? (e.q - 1) * 720 + (720 - e.c) : 2880 + (e.q - 5) * 300 + (300 - e.c); },
  run() {
    clearInterval(this.timer);
    const rate = { 1: 50, 2: 110, 4: 260 }[this.speed];
    this.timer = setInterval(() => {
      this.t += rate * 0.1;
      const evs = this.res.events;
      while (this.shown < evs.length && this.gtime(evs[this.shown]) <= this.t) this.shown++;
      if (this.shown >= evs.length) { this.finish(); }
      this.paint();
    }, 100);
  },
  skip() { this.shown = this.res.events.length; this.t = 1e9; this.finish(); this.paint(); },
  finish() {
    clearInterval(this.timer);
    if (this.done) return;
    this.done = true;
    finishUserMatch(this.f, this.res);
  },
  paint() {
    const root = $('#live'); if (!root || !this.res) return;
    const evs = this.res.events.slice(0, this.shown);
    const last = evs[evs.length - 1] || { hs: 0, as: 0, q: 1, c: 720 };
    const H = team(this.f.h), A = team(this.f.a);
    const gt = Math.min(this.t, this.gtime(this.res.events[this.res.events.length - 1]));
    let q, c;
    if (gt < 2880) { q = Math.floor(gt / 720) + 1; c = 720 - (gt - (q - 1) * 720); } else { q = 5 + Math.floor((gt - 2880) / 300); c = 300 - (gt - 2880 - (q - 5) * 300); }
    if (this.done) { q = last.q; c = 0; }
    const clock = `${Math.floor(c / 60)}:${String(Math.floor(c % 60)).padStart(2, '0')}`;
    $('#sb').innerHTML = `<div class="sbt">${badge(A, 'lg')}<span>${esc(A.abbr)}</span></div><div class="sbs"><b>${last.as}</b><span>–</span><b>${last.hs}</b></div><div class="sbt r"><span>${esc(H.abbr)}</span>${badge(H, 'lg')}</div>
      <div class="sbq">${this.done ? 'FINAL' + (this.res.ot ? ' / OT' : '') : (q <= 4 ? 'Q' + q : 'OT' + (q - 4)) + ' · ' + clock}</div>`;
    const sides = [H, A];
    if (this._painted === this.shown && $('#feed').childElementCount) { this.paintCtl(); return; }
    this._painted = this.shown;
    $('#feed').innerHTML = evs.slice().reverse().slice(0, 60).map((e) => { const tm = e.side >= 0 ? sides[e.side] : null; return `<div class="ev ${e.type}" style="--ec:${tm ? tm.c1 : 'transparent'}"><span class="evt">${e.q <= 4 ? 'Q' + e.q : 'OT'} ${Math.floor(e.c / 60)}:${String(e.c % 60).padStart(2, '0')}</span><span class="evx">${esc(e.text)}</span><span class="evs">${e.as}-${e.hs}</span></div>`; }).join('');
    this.paintCtl();
  },
  paintCtl() {
    if (this._ctl === this.speed + '|' + this.done) return;
    this._ctl = this.speed + '|' + this.done;
    $('#lctl').innerHTML = this.done ? `<button class="btn primary big" data-act="toResult">Match Report ${icon('play')}</button>` : `<div class="seg">${[1, 2, 4].map((s) => `<button class="${this.speed === s ? 'on' : ''}" data-act="liveSpeed" data-v="${s}">${s}×</button>`).join('')}</div><button class="btn" data-act="liveSkip">Skip to end</button>`;
  },
};
VIEWS.match = () => { Live._painted = -1; Live._ctl = ''; return `<div id="live" class="live"><div id="sb" class="scoreboard"></div><div id="lctl" class="lctl"></div><div id="feed" class="feed"></div></div>`; };

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
  </div>
  <div class="tabs"><button class="tab ${side === 'a' ? 'on' : ''}" data-act="tab" data-k="rside" data-v="a">${esc(A.nick)}</button><button class="tab ${side === 'h' ? 'on' : ''}" data-act="tab" data-k="rside" data-v="h">${esc(H.nick)}</button></div>
  <div class="scrollx"><table class="tbl box"><thead><tr><th class="l">Player</th><th>MIN</th><th>PTS</th><th>REB</th><th>AST</th><th>STL</th><th>BLK</th><th>FG</th><th>3P</th><th>Rat</th></tr></thead><tbody>
  ${rows.map(([id, b]) => { const p = S.players[id]; return `<tr data-act="player" data-id="${id}"><td class="l nm">${b.gs ? '<i class="st-dot"></i>' : ''}${p ? esc(pname(p, true)) : '?'}</td><td>${b.min}</td><td class="b">${b.pts}</td><td>${b.reb}</td><td>${b.ast}</td><td>${b.stl}</td><td>${b.blk}</td><td>${b.fgm}-${b.fga}</td><td>${b.tpm}-${b.tpa}</td><td>${ratingPill(r.ratings[id])}</td></tr>`; }).join('')}
  </tbody></table></div>
  <div class="sticky-cta"><button class="btn primary big" data-act="go" data-v="inbox">Done</button></div>`;
};

/* Sacked */
VIEWS.sacked = () => {
  const offers = standings().slice(-5).filter((t) => t.id !== S.userTeam).slice(-3);
  return `${header('Job Offers', { back: false })}<div class="pad"><div class="card warn"><b>You have been relieved of your duties.</b><p>A few clubs are interested in giving you another chance.</p></div></div>
  <div class="list">${offers.map((t) => `<button class="li" data-act="takeJob" data-id="${t.id}">${badge(t, 'lg')}<span class="grow"><b>${esc(teamName(t))}</b><div class="muted sm">${t.w}-${t.l} last season</div></span>${starsHTML(stars(teamStrength(t.id)))}</button>`).join('')}</div>
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
  NG = { db, team: null, name: '', length: 'short', custom: true };
  UI.stack = [];
  UI.view = 'newgame'; render();
}

const ACT = {
  back: () => back(),
  go: (d) => go(d.v, d.id ? { id: +d.id } : {}, { keep: !!d.keep }),
  tab: (d) => { UI.tab[d.k] = d.v; render(); },
  player: (d) => go('player', { id: +d.id }),
  loadGame: () => { if (load()) { UI.stack = []; go(S.pending ? 'prematch' : 'inbox'); } },
  toTitle: () => { save(); UI.stack = []; UI.view = 'title'; render(); },
  ngLen: (d) => { NG.length = d.v; render(); },
  ngTeam: (d) => { NG.team = +d.id; render(); const b = document.querySelector('.sticky-cta .btn'); if (b) b.scrollIntoView({ block: 'nearest' }); },
  ngReroll: () => { NG.db = generateDatabase(); NG.team = null; render(); },
  ngStart: () => {
    if (!NG.team) return;
    const name = ($('#ngName')?.value || '').trim() || 'The Coach';
    newGame({ manager: name, teamId: NG.team, db: NG.db, length: NG.length });
    NG = null; UI.tab = {};
    go('inbox');
  },
  continue: () => {
    if (S.phase === 'sacked') return go('sacked');
    const before = S.inbox.length;
    const r = advance();
    if (r.action === 'prematch') return go('prematch');
    const newMail = S.inbox.length > before;
    if (r.action === 'newseason') { toast(`Welcome to the ${S.season}/${String(S.season + 1).slice(2)} season!`); return go('inbox'); }
    if (r.action === 'playoffs' || r.action === 'endseason') return go('inbox');
    if (S.phase === 'sacked') return go('sacked');
    toast(newMail ? 'New messages in your inbox' : `${curDate()} — results are in`);
    render();
  },
  readAll: () => { S.inbox.forEach((m) => (m.read = true)); save(); render(); },
  mail: (d) => go('mail', { id: +d.id }),
  mailAct: (d) => {
    const r = mailAction(+d.id, d.a);
    if (r.renew) return ACT.renewModal({ id: r.renew, mail: d.id });
    if (r.msg) toast(esc(r.msg));
    render();
  },
  tactic: (d) => { userTeam().tactics[d.k] = d.v; save(); render(); },
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
  training: (d) => { S.training = d.v; save(); toast(`Training focus: ${TRAINING[d.v].n}`); render(); },
  renewModal: (d) => {
    const p = S.players[+d.id];
    if (!p || p.team !== S.userTeam) return toast('Player is no longer at the club.');
    const ask = askingSalary(p);
    modal(`<h2>Contract offer</h2><p><b>${esc(pname(p))}</b> is asking for <b>${fmtMoney(ask)}</b> per year.</p><p class="muted sm">Current: ${fmtMoney(p.contract.sal)} · ${p.contract.yrs} yr${p.contract.yrs === 1 ? '' : 's'} left</p>
      <label class="lbl">Length</label><div class="seg">${[1, 2, 3, 4].map((y) => `<button data-act="doRenew" data-id="${p.id}" data-y="${y}" data-mail="${d.mail || ''}">${y} yr${y > 1 ? 's' : ''}</button>`).join('')}</div>
      <div class="row-btns"><button class="btn" data-act="closeModal">Cancel</button></div>`);
  },
  doRenew: (d) => {
    const r = renewContract(+d.id, +d.y);
    closeModal(); toast(esc(r.msg), r.ok ? '' : 'bad');
    if (r.ok && d.mail) { const m = S.inbox.find((x) => x.id === +d.mail); if (m) m.done = 'New contract agreed.'; }
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
    modal(`<h2>Release ${esc(pname(p))}?</h2><p>He will become a free agent and his salary comes off your books.</p><div class="row-btns"><button class="btn" data-act="closeModal">Cancel</button><button class="btn danger" data-act="doRelease" data-id="${p.id}">Release</button></div>`);
  },
  doRelease: (d) => { const r = releasePlayer(+d.id); closeModal(); toast(esc(r.msg), r.ok ? '' : 'bad'); save(); if (r.ok) back(); else render(); },
  closeModal: () => closeModal(),
  offerToggle: (d) => { const id = +d.id; const o = UI.offer.ids; const i = o.indexOf(id); if (i >= 0) o.splice(i, 1); else o.push(id); render(); },
  proposeTrade: () => {
    const r = proposeTrade(UI.offer.tid, UI.offer.ids.slice());
    toast(esc(r.msg), r.ok ? '' : 'bad');
    if (r.ok) { const id = UI.offer.tid; UI.offer = null; save(); UI.stack = []; go('player', { id }); }
  },
  playMatch: (d) => {
    const { f, res } = playUserMatch();
    if (d.watch === '1') { UI.stack = []; UI.view = 'match'; Live.start(f, res); render(); }
    else { finishUserMatch(f, res); UI.stack = []; UI.tab.rside = null; go('result'); }
  },
  liveSpeed: (d) => { Live.speed = +d.v; Live.run(); Live.paint(); },
  liveSkip: () => Live.skip(),
  toResult: () => { UI.tab.rside = null; go('result'); },
  takeJob: (d) => { takeNewJob(+d.id); UI.stack = []; go('inbox'); },
  exportSave: () => { download(`courtside-save-${S.season}.json`, S); },
  deleteSave: () => modal(`<h2>Delete career?</h2><p>This cannot be undone.</p><div class="row-btns"><button class="btn" data-act="closeModal">Cancel</button><button class="btn danger" data-act="doDelete">Delete</button></div>`),
  doDelete: () => { closeModal(); deleteSave(); UI.stack = []; UI.view = 'title'; render(); },
  exportDb: () => download(`${(S.leagueName || 'league').replace(/\W+/g, '-').toLowerCase()}-database.json`, exportDatabase()),
  copyDb: async () => { try { await navigator.clipboard.writeText(JSON.stringify(exportDatabase())); toast('Database copied to clipboard'); } catch (e) { toast('Copy failed on this device — use Export instead.', 'bad'); } },
  pasteDb: () => modal(`<h2>Paste database</h2><textarea class="inp ta" id="pasteTa" placeholder="Paste exported database text here"></textarea><div class="row-btns"><button class="btn" data-act="closeModal">Cancel</button><button class="btn primary" data-act="doPasteDb">Load</button></div>`),
  doPasteDb: () => { try { const db = JSON.parse($('#pasteTa').value); closeModal(); startWithDb(db); } catch (e) { toast('Invalid database: ' + esc(e.message), 'bad'); } },
  newPlayer: () => { const p = genPlayer(S, 10, undefined, undefined, null); p.first = 'New'; p.last = 'Player'; S.players[p.id] = p; save(); go('editPlayer', { id: p.id }); },
  step: (d) => { const el = $('#ep_a_' + d.k); el.value = clamp((+el.value || 1) + +d.d, 1, 20); el.className = 't' + tier(+el.value); },
  saveTeam: (d) => {
    const t = team(+d.id);
    t.city = clean($('#et_city').value, 24) || t.city; t.nick = clean($('#et_nick').value, 24) || t.nick;
    t.abbr = (clean($('#et_abbr').value, 4) || t.abbr).toUpperCase().slice(0, 4);
    t.c1 = $('#et_c1').value; t.c2 = $('#et_c2').value;
    t.budget = clamp(+$('#et_budget').value || t.budget, 10, 1000);
    save(); toast('Team saved'); back();
  },
  savePlayer: (d) => {
    const p = S.players[+d.id];
    const v = (k) => $('#ep_' + k).value;
    p.first = clean(v('first'), 20) || p.first; p.last = clean(v('last'), 24) || p.last;
    p.pos = v('pos'); p.nat = v('nat');
    p.age = clamp(Math.round(+v('age') || p.age), 16, 45); p.h = clamp(Math.round(+v('h') || p.h), 160, 240);
    const nt = v('team') === '' ? null : +v('team');
    if (nt !== p.team) {
      const oldTeam = p.team;
      if (nt != null && roster(nt).length >= ROSTER_MAX) return toast(`${team(nt).nick} already have ${ROSTER_MAX} players.`, 'bad');
      p.team = nt;
      if (oldTeam != null) cleanRotation(S, team(oldTeam));
      if (nt != null) cleanRotation(S, team(nt));
    }
    p.contract = { sal: clamp(+v('sal') || p.contract.sal, 0.5, 60), yrs: clamp(Math.round(+v('yrs')), 0, 6) };
    if (p.team != null && p.contract.yrs < 1) p.contract.yrs = 1;
    for (const a of ATTRS) p.a[a.k] = clamp(Math.round(+$('#ep_a_' + a.k).value || p.a[a.k]), 1, 20);
    p.pot = clamp(+v('pot') || p.pot, 1, 20);
    if (p.pot < calcCA(p)) p.pot = Math.round(calcCA(p) * 10) / 10;
    save(); toast('Player saved'); back();
  },
  deletePlayer: (d) => modal(`<h2>Delete player?</h2><p>This permanently removes him from the database.</p><div class="row-btns"><button class="btn" data-act="closeModal">Cancel</button><button class="btn danger" data-act="doDeletePlayer" data-id="${d.id}">Delete</button></div>`),
  doDeletePlayer: (d) => {
    const p = S.players[+d.id];
    if (p && p.team === S.userTeam && roster(S.userTeam).length <= 8) { closeModal(); return toast('You need at least 8 players.', 'bad'); }
    const t = p.team; delete S.players[+d.id]; if (t != null) cleanRotation(S, team(t));
    closeModal(); save(); toast('Player deleted'); UI.stack = UI.stack.filter((s) => !(s.params && s.params.id === +d.id)); back();
  },
};
const CHG = {
  ngName: (el) => { NG.name = el.value; },
  importDbNew: (el) => readFile(el, (db) => { try { if (S && UI.view !== 'title') save(); startWithDb(db); } catch (e) { toast(esc(e.message), 'bad'); } }),
  importSave: (el) => readFile(el, (obj) => { if (!obj || !obj.teams || !obj.players || !obj.userTeam) return toast('Not a Courtside save file.', 'bad'); S = sanitizeSave(obj); save(); UI.stack = []; toast('Career restored'); go('inbox'); }),
  autoRotToggle: (el) => { S.autoRot = el.checked; if (S.autoRot) autoRotation(S, userTeam()); save(); render(); },
  edLeague: (el) => { S[el.dataset.f] = clean(el.value, el.dataset.f === 'short' ? 6 : 40) || S[el.dataset.f]; save(); },
  edSearch: (el) => { UI.tab.edq = el.value; render(); const i = $('#edq'); if (i) { i.focus(); i.setSelectionRange(i.value.length, i.value.length); } },
  edTeamFilter: (el) => { UI.tab.edteam = el.value; render(); },
  attrIn: (el) => { el.value = clamp(Math.round(+el.value || 1), 1, 20); el.className = 't' + tier(+el.value); },
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
  if (hasSave() && load()) { UI.view = 'title'; }
  render();
  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) navigator.serviceWorker.register('sw.js').catch(() => {});
});
