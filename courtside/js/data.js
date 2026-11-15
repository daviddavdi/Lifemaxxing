/* Courtside Manager — static data & utilities */
'use strict';

const R = {
  f: (a, b) => a + Math.random() * (b - a),
  int: (a, b) => a + Math.floor(Math.random() * (b - a + 1)),
  pick: (arr) => arr[Math.floor(Math.random() * arr.length)],
  chance: (p) => Math.random() < p,
  gauss: () => {
    let u = 0, v = 0;
    while (u === 0) u = Math.random();
    while (v === 0) v = Math.random();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  },
  wpick(arr, wfn) {
    let total = 0;
    const w = arr.map((x) => { const v = Math.max(0, wfn(x)); total += v; return v; });
    if (total <= 0) return R.pick(arr);
    let r = Math.random() * total;
    for (let i = 0; i < arr.length; i++) { r -= w[i]; if (r <= 0) return arr[i]; }
    return arr[arr.length - 1];
  },
  shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
  },
};
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const clean = (s, max = 40) => String(s ?? '').replace(/[<>"&`\\]/g, '').trim().slice(0, max);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const POS = ['PG', 'SG', 'SF', 'PF', 'C'];
const POS_NAME = { PG: 'Point Guard', SG: 'Shooting Guard', SF: 'Small Forward', PF: 'Power Forward', C: 'Center' };

const ATTRS = [
  { k: 'fin', n: 'Finishing', g: 'Technical' },
  { k: 'mid', n: 'Mid-Range', g: 'Technical' },
  { k: 'thr', n: 'Three Point', g: 'Technical' },
  { k: 'ft', n: 'Free Throws', g: 'Technical' },
  { k: 'pas', n: 'Passing', g: 'Technical' },
  { k: 'han', n: 'Ball Handling', g: 'Technical' },
  { k: 'pdef', n: 'Perimeter D', g: 'Defending' },
  { k: 'idef', n: 'Interior D', g: 'Defending' },
  { k: 'reb', n: 'Rebounding', g: 'Defending' },
  { k: 'blk', n: 'Blocking', g: 'Defending' },
  { k: 'stl', n: 'Stealing', g: 'Defending' },
  { k: 'spd', n: 'Speed', g: 'Physical' },
  { k: 'str', n: 'Strength', g: 'Physical' },
  { k: 'jmp', n: 'Vertical', g: 'Physical' },
  { k: 'sta', n: 'Stamina', g: 'Physical' },
  { k: 'iq', n: 'Basketball IQ', g: 'Mental' },
  { k: 'cmp', n: 'Composure', g: 'Mental' },
  { k: 'wrk', n: 'Work Rate', g: 'Mental' },
  { k: 'ldr', n: 'Leadership', g: 'Mental' },
];
const ATTR_GROUPS = ['Technical', 'Defending', 'Physical', 'Mental'];

// Offsets from a player's base level per position
const TEMPLATE = {
  PG: { han: 4, pas: 4, thr: 2, mid: 1, spd: 4, stl: 2, pdef: 1, iq: 1, idef: -4, reb: -4, blk: -5, str: -3 },
  SG: { thr: 3, mid: 2, han: 1, fin: 1, spd: 2, pdef: 1, stl: 1, idef: -3, reb: -3, blk: -4, str: -2 },
  SF: { fin: 1, thr: 1, pdef: 1, jmp: 1, mid: 1 },
  PF: { fin: 2, idef: 2, reb: 3, blk: 1, str: 3, thr: -2, han: -3, pas: -1, spd: -1, stl: -1 },
  C: { fin: 3, idef: 4, reb: 5, blk: 5, str: 5, thr: -5, han: -5, pas: -2, spd: -3, ft: -3, stl: -2, pdef: -2 },
};
const WEIGHTS = {};
for (const p of POS) {
  WEIGHTS[p] = {};
  for (const a of ATTRS) {
    const t = TEMPLATE[p][a.k] || 0;
    let w = t > 0 ? 1 + t * 0.5 : t < 0 ? 0.45 : 1;
    if (a.k === 'iq') w = 2;
    if (a.k === 'cmp') w = 1.2;
    if (a.k === 'wrk' || a.k === 'ldr') w = 0.4;
    WEIGHTS[p][a.k] = w;
  }
}

const NATS = {
  USA: { flag: '🇺🇸', w: 55,
    first: ['Marcus','Jalen','Tyrese','Darnell','Isaiah','Andre','Malik','Trey','Devin','Corey','Jaylen','Dominic','Terrance','Brandon','Cameron','Elijah','Xavier','Desmond','Quentin','Reggie','Tavon','Kendrick','Omar','Garrett','Wyatt','Cole','Brody','Mason','Logan','Hunter','Tristan','Jamal','Darius','Cedric','Lamar','Nate','Rashad','Keon','Javon','Damon','Avery','Colby','Grant','Jordan','Tyler','Bryce','Caleb','Micah','Zion','Amari'],
    last: ['Whitfield','Banks','Holloway','Pruitt','Merriweather','Gaines','Rollins','Hargrove','Sutton','Batts','Kinnard','Lockhart','Roe','Calloway','Fennell','Dorsey','Trotter','Boykins','Strickland','McCall','Raines','Thibodeaux','Haskins','Pettway','Ellery','Hale','Crenshaw','Faulk','Grayson','Hightower','Kimbrough','Langston','Fox','Nesbitt','Oakes','Pendleton','Quarles','Ridley','Stokes','Tolliver','Upshaw','Vance','Winslow','Yates','Ashby','Brantley','Coleridge','Dabney','Everhart','Fairley','Goodwin','Hatcher','Lee','Jessup','Kirkland','Lyles','Cox','Norwood','Overton','Pickens'] },
  CAN: { flag: '🇨🇦', w: 5, first: ['Liam','Owen','Dillon','Kofi','Mathis','Ryder','Malcolm','Noah','Kieran','Andrew'], last: ['Beaulieu','MacInnis','Okonjo','Thibault','Lachance','Fraser','Boateng','Gauthier','Mensah','Ward'] },
  FRA: { flag: '🇫🇷', w: 5, first: ['Théo','Killian','Mathéo','Rudy','Évan','Bastien','Moussa','Yanis','Lucas','Nolan'], last: ['Diallo','Ferrand','Lemoine','Bouchet','Traoré','Marchand','Roux','Delorme','Fofana','Garnier'] },
  SRB: { flag: '🇷🇸', w: 4, first: ['Nemanja','Stefan','Luka','Bogdan','Miloš','Vasilije','Dušan','Aleksa','Filip','Marko'], last: ['Petrović','Jovanović','Stanković','Marinković','Radulović','Simić','Lazić','Kovačević','Đurić','Milutinović'] },
  ESP: { flag: '🇪🇸', w: 4, first: ['Sergio','Álvaro','Marc','Iker','Rubén','Joan','Dario','Adrián','Hugo','Mateo'], last: ['Navarrete','Albareda','Castell','Ibáñez','Ferrer','Montoro','Prat','Llorente','Vidal','Echeverría'] },
  LTU: { flag: '🇱🇹', w: 3, first: ['Mindaugas','Rokas','Tadas','Domantas','Arnas','Lukas','Ignas','Gytis'], last: ['Kazlauskas','Butkevičius','Jankus','Paulauskas','Valančius','Rasimas','Žukauskas','Sabaliauskas'] },
  AUS: { flag: '🇦🇺', w: 4, first: ['Jock','Mitch','Lachlan','Callum','Josh','Dante','Harrison','Tom'], last: ['Kearney','Whitlock','Mabior','O\'Rourke','Pemberton','Dunstan','Ngata','Fairbairn'] },
  NGA: { flag: '🇳🇬', w: 4, first: ['Chidi','Emeka','Tobi','Obinna','Ifeanyi','Femi','Segun','Kelechi'], last: ['Adeyemi','Okwuosa','Nwankwo','Eze','Babatunde','Olaniyan','Chukwu','Ogunleye'] },
  BRA: { flag: '🇧🇷', w: 3, first: ['Thiago','Caio','Rafael','Gui','Bruno','Vitor','Leandro'], last: ['Albuquerque','Bezerra','Cavalcanti','Teixeira','Moraes','Siqueira','Fontes'] },
  GRE: { flag: '🇬🇷', w: 3, first: ['Giorgos','Kostas','Nikos','Thanasis','Vangelis','Dimitris'], last: ['Papadakis','Kalogeropoulos','Mavridis','Stavropoulos','Antonakos','Lekkas'] },
  GER: { flag: '🇩🇪', w: 4, first: ['Moritz','Jonas','Niklas','Lennard','Felix','Tim','Johannes'], last: ['Hartmann','Brückner','Vogelsang','Lindemann','Eichhorn','Steinmetz','Wagenknecht'] },
  TUR: { flag: '🇹🇷', w: 3, first: ['Emre','Can','Furkan','Mert','Burak','Kerem'], last: ['Yıldırım','Aksoy','Demirel','Korkmaz','Özdemir','Çelikkaya'] },
  ARG: { flag: '🇦🇷', w: 2, first: ['Facundo','Nicolás','Gabriel','Tomás','Agustín'], last: ['Bertoldi', 'Cáceres', 'Ledesma', 'Villarreal', 'Quiroga'] },
  SLO: { flag: '🇸🇮', w: 2, first: ['Klemen','Žiga','Jaka','Rok','Matic'], last: ['Novak', 'Blažič', 'Hrovat', 'Kranjc', 'Zupančič'] },
  CRO: { flag: '🇭🇷', w: 2, first: ['Ante','Mario','Ivica','Dario','Toni'], last: ['Babić', 'Horvat', 'Kos', 'Perković', 'Ban'] },
  ITA: { flag: '🇮🇹', w: 2, first: ['Alessandro','Matteo','Simone','Davide','Nico'], last: ['Rossi', 'Conte', 'Bianchi', 'Moro', 'Ricci'] },
};
const NAT_KEYS = Object.keys(NATS);

const DEFAULT_TEAMS = [
  { city: 'Bayshore', nick: 'Gulls', abbr: 'BAY', c1: '#1f6feb', c2: '#ffffff' },
  { city: 'Ironwood', nick: 'Lumberjacks', abbr: 'IRW', c1: '#2f8f46', c2: '#ffffff' },
  { city: 'Northgate', nick: 'Owls', abbr: 'NOR', c1: '#6e40c9', c2: '#ffffff' },
  { city: 'Red Mesa', nick: 'Scorpions', abbr: 'RMS', c1: '#d1382c', c2: '#ffffff' },
  { city: 'Harbor City', nick: 'Anchors', abbr: 'HBC', c1: '#0e4a7a', c2: '#f2c94c' },
  { city: 'Silver Lake', nick: 'Stallions', abbr: 'SLK', c1: '#8a96a8', c2: '#101418' },
  { city: 'Granite Falls', nick: 'Bison', abbr: 'GRF', c1: '#7a4a2a', c2: '#ffffff' },
  { city: 'Sunvale', nick: 'Comets', abbr: 'SUN', c1: '#f08c00', c2: '#101418' },
  { city: 'Kingsport', nick: 'Monarchs', abbr: 'KGP', c1: '#b8952e', c2: '#101418' },
  { city: 'Riverbend', nick: 'Otters', abbr: 'RVB', c1: '#14918a', c2: '#ffffff' },
  { city: 'Ashford', nick: 'Foxes', abbr: 'ASH', c1: '#e8590c', c2: '#ffffff' },
  { city: 'Pinecrest', nick: 'Vipers', abbr: 'PIN', c1: '#5c940d', c2: '#101418' },
  { city: 'Coral Bay', nick: 'Barracudas', abbr: 'CRL', c1: '#e64980', c2: '#ffffff' },
  { city: 'Steelton', nick: 'Forge', abbr: 'STL', c1: '#495057', c2: '#ff922b' },
  { city: 'Westmoor', nick: 'Condors', abbr: 'WSM', c1: '#862e9c', c2: '#ffd43b' },
  { city: 'Eastport', nick: 'Tide', abbr: 'EPT', c1: '#1864ab', c2: '#74c0fc' },
];

const INJURIES = [
  ['Sprained ankle', 4, 14], ['Bruised knee', 3, 8], ['Hamstring strain', 7, 21], ['Back spasms', 3, 10],
  ['Sprained wrist', 5, 12], ['Groin strain', 7, 18], ['Broken finger', 14, 28], ['Torn meniscus', 30, 60],
  ['Concussion', 5, 12], ['Calf strain', 6, 16], ['Hip pointer', 3, 9], ['Stress fracture (foot)', 35, 70],
];

const TRAINING = {
  balanced: { n: 'Balanced', d: 'Even development across all areas.', bias: {} },
  shooting: { n: 'Shooting', d: 'Focus on Three Point, Mid-Range and Free Throws.', bias: { thr: 2, mid: 2, ft: 2 } },
  playmaking: { n: 'Playmaking', d: 'Passing, Ball Handling and Basketball IQ.', bias: { pas: 2, han: 2, iq: 1.6 } },
  defense: { n: 'Defense', d: 'Perimeter & Interior D, Blocking, Stealing.', bias: { pdef: 2, idef: 2, blk: 1.6, stl: 1.6 } },
  inside: { n: 'Inside Game', d: 'Finishing, Rebounding and Strength.', bias: { fin: 2, reb: 2, str: 1.6 } },
  physical: { n: 'Conditioning', d: 'Speed, Vertical and Stamina. Faster recovery.', bias: { spd: 2, jmp: 2, sta: 2 } },
  youth: { n: 'Youth Development', d: 'Extra growth for players 23 and under, less for veterans.', bias: {} },
};

const START_DATE = new Date(2026, 9, 20); // 20 Oct 2026
function dayToDate(season, day) {
  const d = new Date(START_DATE.getTime());
  d.setFullYear(season);
  d.setDate(d.getDate() + day);
  return d;
}
function fmtDate(season, day, short) {
  const d = dayToDate(season, day);
  const opts = short ? { day: 'numeric', month: 'short' } : { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' };
  return d.toLocaleDateString('en-GB', opts);
}
function fmtMoney(m) {
  if (m >= 1) return '$' + (Math.round(m * 10) / 10).toFixed(1) + 'M';
  return '$' + Math.round(m * 1000) + 'K';
}
function fmtHeight(cm) {
  const inches = Math.round(cm / 2.54);
  return `${Math.floor(inches / 12)}'${inches % 12}" (${cm}cm)`;
}
