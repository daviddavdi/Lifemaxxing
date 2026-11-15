/* Courtside Manager — generated faces (players, staff, your coach) */
'use strict';

const SKINS = ['#F3D5B5', '#E8BC93', '#D49D6E', '#B47D52', '#8E5B3B', '#6C4329', '#4A2D1C'];
const HAIR_COLS = { black: '#1C1A19', dkbrown: '#3A2416', brown: '#5E3B21', blond: '#C9A15A', red: '#8E3B1E', gray: '#9C9C9C' };
const HAIR_STYLES = ['buzz', 'fade', 'short', 'sidepart', 'curly', 'afro', 'twists', 'cornrows', 'long', 'bun', 'bald'];
const BEARDS = ['none', 'stubble', 'chinstrap', 'goatee', 'mustache', 'beard'];
const HAIR_NAMES = { buzz: 'Buzz', fade: 'Fade', short: 'Short', sidepart: 'Side part', curly: 'Curly', afro: 'Afro', twists: 'Twists', cornrows: 'Cornrows', long: 'Long', bun: 'Bun', bald: 'Bald' };
const BEARD_NAMES = { none: 'Clean', stubble: 'Stubble', chinstrap: 'Chinstrap', goatee: 'Goatee', mustache: 'Mustache', beard: 'Full beard' };

function seeded(seed) { let a = (seed >>> 0) || 1; return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function strSeed(s) { let h = 2166136261; for (const ch of String(s)) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }
function wpickR(r, items, weights) { const tot = weights.reduce((a, b) => a + b, 0); let x = r() * tot; for (let i = 0; i < items.length; i++) { x -= weights[i]; if (x <= 0) return items[i]; } return items[items.length - 1]; }
const SKIN_W = {
  NGA: [0, 0, 1, 4, 20, 40, 35], USA: [9, 10, 10, 11, 18, 22, 20], BRA: [10, 15, 20, 20, 15, 12, 8], FRA: [22, 15, 10, 10, 14, 15, 14],
  CAN: [30, 24, 14, 8, 9, 9, 6], AUS: [32, 26, 14, 8, 8, 7, 5], EU: [34, 30, 22, 8, 3, 2, 1],
};
function mix(hex, to, k) {
  const p = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const a = p(hex), b = p(to);
  return '#' + a.map((v, i) => Math.round(v + (b[i] - v) * k).toString(16).padStart(2, '0')).join('');
}

/* ---------- looks ---------- */
function playerLook(p) {
  const r = seeded(p.id * 9301 + 49297);
  const sw = SKIN_W[p.nat] || SKIN_W.EU;
  const skin = wpickR(r, [0, 1, 2, 3, 4, 5, 6], sw);
  const dark = skin >= 4;
  const hair = dark ? wpickR(r, ['buzz', 'fade', 'afro', 'twists', 'cornrows', 'bald', 'short', 'curly'], [22, 22, 9, 12, 8, 10, 9, 8])
    : wpickR(r, ['short', 'sidepart', 'buzz', 'curly', 'long', 'bun', 'bald', 'fade'], [24, 18, 16, 12, 8, 6, 6, 10]);
  const hairColor = dark ? wpickR(r, ['black', 'dkbrown'], [85, 15]) : wpickR(r, ['black', 'dkbrown', 'brown', 'blond', 'red'], [26, 30, 24, 15, 5]);
  const beardRoll = r(), beardKind = wpickR(r, ['stubble', 'goatee', 'beard', 'mustache', 'chinstrap'], [35, 15, 30, 8, 12]);
  const age = p.age || 25;
  const beardChance = age <= 21 ? 0.2 : age <= 25 ? 0.5 : age <= 29 ? 0.7 : 0.85;
  let beard = beardRoll < beardChance ? beardKind : 'none';
  if (age <= 22 && (beard === 'beard' || beard === 'goatee')) beard = 'stubble';
  const hbRoll = r(), hbTeam = r() < 0.5;
  const headband = hbRoll < 0.1 + ((p.hid && p.hid.ego >= 15) ? 0.1 : 0);
  const grayK = r(), recedeK = r();
  const gray = age >= 31 ? Math.min(0.85, (age - 30) * 0.09) * (0.5 + grayK) : 0;
  const recede = age >= 29 && recedeK < 0.35 ? Math.min(0.9, (age - 28) * 0.08) : 0;
  return { skin, hair, hairColor, beard, headband, hbTeam, gray, recede, wrinkles: age >= 36 ? 2 : age >= 32 ? 1 : 0, rx: 23 + r() * 3.5, glasses: false, eye: r() < 0.15 ? '#4A6B8A' : '#2B1D14' };
}
function randomCoachLook(seed) {
  const r = seeded(seed || (Math.random() * 1e9) | 0);
  const skin = Math.floor(r() * SKINS.length);
  return { skin, hair: HAIR_STYLES[Math.floor(r() * HAIR_STYLES.length)], hairColor: Object.keys(HAIR_COLS)[Math.floor(r() * 6)], beard: BEARDS[Math.floor(r() * BEARDS.length)], glasses: r() < 0.3, headband: false, gray: 0, recede: r() < 0.3 ? 0.4 : 0, wrinkles: 1, rx: 24 + r() * 2, eye: '#2B1D14' };
}
function staffLook(st) { const fake = { id: strSeed(st.id), nat: st.nat, age: st.age, hid: { ego: 10 } }; const l = playerLook(fake); l.headband = false; return l; }

/* ---------- drawing ---------- */
function hairBack(l, hc) {
  switch (l.hair) {
    case 'afro': return `<circle cx="50" cy="34" r="31" fill="${hc}"/>`;
    case 'twists': return `<g fill="${hc}">${[24, 30, 36, 64, 70, 76].map((x, i) => `<rect x="${x - 3}" y="30" width="6" height="${30 + (i % 3) * 4}" rx="3"/>`).join('')}</g>`;
    case 'long': return `<path d="M22 44 Q20 12 50 10 Q80 12 78 44 L80 72 Q70 76 66 60 L34 60 Q30 76 20 72Z" fill="${hc}"/>`;
    default: return '';
  }
}
function hairFront(l, hc) {
  const top = 13 + l.recede * 8; // receding hairline
  switch (l.hair) {
    case 'bald': return `<ellipse cx="44" cy="22" rx="6" ry="3" fill="#fff" opacity=".12"/>`;
    case 'buzz': return `<path d="M25 44 Q24 ${top + 2} 50 ${top + 1} Q76 ${top + 2} 75 44 Q72 ${30 + l.recede * 6} 50 ${28 + l.recede * 6} Q28 ${30 + l.recede * 6} 25 44Z" fill="${hc}" opacity=".78"/>`;
    case 'fade': return `<path d="M26 40 Q25 ${top} 50 ${top - 1} Q75 ${top} 74 40 Q66 ${27 + l.recede * 5} 50 ${26 + l.recede * 5} Q34 ${27 + l.recede * 5} 26 40Z" fill="${hc}"/><path d="M25 46 L25 38 Q27 34 30 32 L30 46Z M75 46 L75 38 Q73 34 70 32 L70 46Z" fill="${hc}" opacity=".35"/>`;
    case 'short': return `<path d="M24 46 Q21 ${top - 2} 50 ${top - 3} Q79 ${top - 2} 76 46 Q73 ${28 + l.recede * 6} 60 ${26 + l.recede * 6} Q50 ${31 + l.recede * 6} 41 ${27 + l.recede * 6} Q29 ${29 + l.recede * 6} 24 46Z" fill="${hc}"/>`;
    case 'sidepart': return `<path d="M24 46 Q21 ${top - 2} 50 ${top - 4} Q80 ${top - 2} 76 46 Q74 ${30 + l.recede * 5} 66 ${27 + l.recede * 5} Q50 ${24 + l.recede * 5} 38 ${30 + l.recede * 5} Q28 ${31 + l.recede * 5} 24 46Z" fill="${hc}"/><path d="M38 ${top + 1} Q42 ${top + 8} 40 ${28 + l.recede * 5}" stroke="${mix(hc, '#000000', 0.4)}" stroke-width="1.2" fill="none"/>`;
    case 'curly': return `<g fill="${hc}">${[[28, 30], [34, 22], [42, 17], [50, 15], [58, 17], [66, 22], [72, 30], [26, 38], [74, 38]].map(([x, y]) => `<circle cx="${x}" cy="${y + l.recede * 4}" r="7"/>`).join('')}</g>`;
    case 'afro': return `<path d="M24 42 Q24 18 50 16 Q76 18 76 42 Q70 30 50 29 Q30 30 24 42Z" fill="${hc}"/>`;
    case 'twists': return `<path d="M25 42 Q23 14 50 12 Q77 14 75 42 Q70 28 50 27 Q30 28 25 42Z" fill="${hc}"/><g stroke="${mix(hc, '#ffffff', 0.15)}" stroke-width="1" fill="none">${[34, 42, 50, 58, 66].map((x) => `<path d="M${x} 14 Q${x + 1} 20 ${x} 27"/>`).join('')}</g>`;
    case 'cornrows': return `<path d="M25 42 Q24 15 50 13 Q76 15 75 42 Q70 30 50 29 Q30 30 25 42Z" fill="${hc}"/><g stroke="${mix(hc, '#ffffff', 0.25)}" stroke-width="1.1" fill="none">${[33, 41, 50, 59, 67].map((x) => `<path d="M${x} 15 L${x + (x - 50) * 0.15} 29"/>`).join('')}</g>`;
    case 'long': return `<path d="M24 46 Q21 ${top - 3} 50 ${top - 4} Q79 ${top - 3} 76 46 Q72 30 56 26 Q48 32 36 28 Q28 32 24 46Z" fill="${hc}"/>`;
    case 'bun': return `<circle cx="50" cy="${top - 4}" r="7" fill="${hc}"/><path d="M25 44 Q23 ${top} 50 ${top - 1} Q77 ${top} 75 44 Q70 ${28 + l.recede * 5} 50 ${27 + l.recede * 5} Q30 ${28 + l.recede * 5} 25 44Z" fill="${hc}"/>`;
    default: return '';
  }
}
function beardSVG(l, bc) {
  switch (l.beard) {
    case 'stubble': return `<path d="M27 50 Q28 76 50 79 Q72 76 73 50 Q70 64 60 66 Q50 70 40 66 Q30 64 27 50Z" fill="${bc}" opacity=".28"/>`;
    case 'chinstrap': return `<path d="M27 50 Q28 76 50 79 Q72 76 73 50 L71 52 Q68 72 50 75 Q32 72 29 52Z" fill="${bc}"/>`;
    case 'goatee': return `<path d="M43 63 Q50 61 57 63 Q56 66 50 66 Q44 66 43 63Z M44 70 Q50 68 56 70 Q56 77 50 78 Q44 77 44 70Z" fill="${bc}"/>`;
    case 'mustache': return `<path d="M41 63 Q50 59 59 63 Q55 65 50 64 Q45 65 41 63Z" fill="${bc}"/>`;
    case 'beard': return `<path d="M26 48 Q26 80 50 82 Q74 80 74 48 Q71 62 62 64 Q56 67 50 66 Q44 67 38 64 Q29 62 26 48Z" fill="${bc}"/><path d="M41 63 Q50 59 59 63 Q55 65 50 64 Q45 65 41 63Z" fill="${bc}"/><path d="M45 69 Q50 71 55 69" stroke="${mix(bc, '#000000', 0.3)}" stroke-width="1" fill="none"/>`;
    default: return '';
  }
}
function faceSVG(l, o = {}) {
  const skin = SKINS[l.skin] || SKINS[2], shade = mix(skin, '#000000', 0.18), deep = mix(skin, '#000000', 0.35);
  let hc = HAIR_COLS[l.hairColor] || HAIR_COLS.black;
  if (l.gray) hc = mix(hc, '#B8B8B8', l.gray);
  const bc = l.gray ? mix(HAIR_COLS[l.hairColor] || HAIR_COLS.black, '#C8C8C8', Math.min(1, l.gray * 1.2)) : hc;
  const c1 = o.c1 || '#3a3f4d', c2 = o.c2 || '#ffffff';
  const rx = l.rx || 25;
  const body = o.kind === 'coach'
    ? `<path d="M8 100 Q12 80 34 76 L44 73 L50 84 L56 73 L66 76 Q88 80 92 100Z" fill="#23262E"/><path d="M44 73 L50 84 L56 73 L53 72 L50 76 L47 72Z" fill="#F2F2F2"/><path d="M48.5 77 L51.5 77 L52.5 92 L50 96 L47.5 92Z" fill="${c1}"/><path d="M34 76 L44 73 L48 86 Z M66 76 L56 73 L52 86Z" fill="#2E323C"/>`
    : `<path d="M8 100 Q12 80 34 76 L42 74 Q50 83 58 74 L66 76 Q88 80 92 100Z" fill="${c1}"/><path d="M41 74 Q50 85 59 74" stroke="${c2}" stroke-width="3" fill="none"/><path d="M22 100 L26 82" stroke="${c2}" stroke-width="2" opacity=".6"/><path d="M78 100 L74 82" stroke="${c2}" stroke-width="2" opacity=".6"/>`;
  const wr = l.wrinkles ? `<g stroke="${deep}" stroke-width=".8" fill="none" opacity=".55"><path d="M40 ${30 + l.recede * 6} Q50 ${28 + l.recede * 6} 60 ${30 + l.recede * 6}"/>${l.wrinkles > 1 ? `<path d="M42 ${34 + l.recede * 5} Q50 ${32 + l.recede * 5} 58 ${34 + l.recede * 5}"/><path d="M31 49 l-3 1 M31 51 l-3 2 M69 49 l3 1 M69 51 l3 2"/>` : ''}<path d="M38 60 Q36 64 38 67 M62 60 Q64 64 62 67" opacity=".6"/></g>` : '';
  const hb = l.headband ? `<rect x="${50 - rx}" y="${27 + l.recede * 2}" width="${rx * 2}" height="5" rx="1.5" fill="${l.hbTeam ? c1 : '#F4F4F4'}" stroke="${l.hbTeam ? c2 : '#d9d9d9'}" stroke-width=".6"/>` : '';
  const glasses = l.glasses ? `<g fill="none" stroke="#1d1d1f" stroke-width="1.6"><rect x="33" y="43" width="13" height="9" rx="3"/><rect x="54" y="43" width="13" height="9" rx="3"/><path d="M46 47 L54 47 M33 46 L27 45 M67 46 L73 45"/></g>` : '';
  const id = 'f' + Math.random().toString(36).slice(2, 8);
  return `<svg viewBox="0 0 100 100" width="${o.size || 48}" height="${o.size || 48}" class="face" aria-hidden="true"><defs><clipPath id="${id}"><circle cx="50" cy="50" r="50"/></clipPath></defs><g clip-path="url(#${id})">
    <rect width="100" height="100" fill="${o.bg || '#2A303D'}"/>
    ${hairBack(l, hc)}
    <rect x="42" y="62" width="16" height="16" fill="${shade}"/>
    ${body}
    <ellipse cx="${50 - rx}" cy="49" rx="4" ry="6" fill="${shade}"/><ellipse cx="${50 + rx}" cy="49" rx="4" ry="6" fill="${shade}"/>
    <path d="M${50 - rx} 44 Q${50 - rx} 14 50 14 Q${50 + rx} 14 ${50 + rx} 44 Q${50 + rx - 1} 70 50 76 Q${50 - rx + 1} 70 ${50 - rx} 44Z" fill="${skin}"/>
    ${wr}
    ${hairFront(l, hc)}
    ${hb}
    <path d="M36 41 Q41 38 46 40" stroke="${l.hair === 'bald' ? deep : bc}" stroke-width="2" fill="none" stroke-linecap="round"/><path d="M54 40 Q59 38 64 41" stroke="${l.hair === 'bald' ? deep : bc}" stroke-width="2" fill="none" stroke-linecap="round"/>
    <ellipse cx="41" cy="47" rx="3.2" ry="2.2" fill="#fff"/><ellipse cx="59" cy="47" rx="3.2" ry="2.2" fill="#fff"/><circle cx="41" cy="47" r="1.7" fill="${l.eye || '#2B1D14'}"/><circle cx="59" cy="47" r="1.7" fill="${l.eye || '#2B1D14'}"/>
    <path d="M50 49 Q48 55 46 57 Q50 59 54 57" stroke="${deep}" stroke-width="1.3" fill="none" stroke-linecap="round"/>
    <path d="M44 66 Q50 69 56 66" stroke="${mix(skin, '#5a2020', 0.5)}" stroke-width="1.8" fill="none" stroke-linecap="round"/>
    ${beardSVG(l, bc)}
    ${glasses}
  </g></svg>`;
}

/* ---------- convenience ---------- */
const FACE_CACHE = new Map();
function playerFace(p, size = 48) {
  const t = p.team != null && typeof team === 'function' ? team(p.team) : null;
  const key = `${p.id}|${p.age}|${p.team}|${size}|${t ? t.c1 + t.c2 : ''}|${p.hid ? p.hid.ego : ''}`;
  if (FACE_CACHE.has(key)) return FACE_CACHE.get(key);
  const svg = faceSVG(playerLook(p), { size, c1: t ? t.c1 : '#4a5060', c2: t ? t.c2 : '#cfd3dd' });
  if (FACE_CACHE.size > 600) FACE_CACHE.clear();
  FACE_CACHE.set(key, svg);
  return svg;
}
function coachFace(size = 64, look) {
  const t = typeof userTeam === 'function' && S ? userTeam() : null;
  return faceSVG(look || (S && S.coach.look) || randomCoachLook(1), { size, kind: 'coach', c1: t ? t.c1 : '#c92a2a', c2: t ? t.c2 : '#fff' });
}
function staffFace(st, size = 40) { const t = st.team != null ? team(st.team) : null; return faceSVG(staffLook(st), { size, kind: 'coach', c1: t ? t.c1 : '#4a5060' }); }
