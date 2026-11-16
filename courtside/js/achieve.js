/* Courtside Manager — difficulty, Ironman mode & achievements */
'use strict';

const DIFFICULTY = {
  easy: { n: 'Easy', d: 'Patient board, bigger budget, other clubs easier to deal with. Your team gets a small edge.', gain: 1.25, loss: 0.6, trade: 0.9, budget: 1.15, edge: 0.012, inj: 0.8, sackMid: 5, sackEnd: 13 },
  normal: { n: 'Normal', d: 'The intended experience.', gain: 1, loss: 1, trade: 1, budget: 1, edge: 0, inj: 1, sackMid: 10, sackEnd: 20 },
  hard: { n: 'Hard', d: 'Impatient board, tighter budget, other clubs drive hard bargains, more injuries.', gain: 0.85, loss: 1.4, trade: 1.15, budget: 0.9, edge: -0.008, inj: 1.2, sackMid: 15, sackEnd: 26 },
};
const diffCfg = () => DIFFICULTY[(S && S.diff) || 'normal'] || DIFFICULTY.normal;

const ACHIEVEMENTS = [
  { k: 'first', ic: '🏀', n: 'First Blood', d: 'Win your first game.' },
  { k: 'streak', ic: '🔥', n: 'On a Roll', d: 'Win 8 games in a row.' },
  { k: 'century', ic: '💯', n: 'Track Meet', d: 'Score 130+ points in a game.' },
  { k: 'comeback', ic: '🧗', n: 'Comeback Kid', d: 'Win a game after trailing by 20 or more.' },
  { k: 'dominant', ic: '📈', n: 'Juggernaut', d: 'Finish a regular season winning 80% of your games.' },
  { k: 'champ', ic: '🏆', n: 'Champion', d: 'Win a league title.' },
  { k: 'dynasty', ic: '👑', n: 'Dynasty', d: 'Win 3 league titles.' },
  { k: 'promo', ic: '⬆️', n: 'Going Up', d: 'Win promotion.' },
  { k: 'bigtime', ic: '🇺🇸', n: 'The Big Time', d: 'Start as a Journeyman and coach in the Pro Hoops League.' },
  { k: 'rags', ic: '💎', n: 'Rags to Riches', d: 'Win the Pro Hoops League title after a Journeyman start.' },
  { k: 'hard', ic: '🥵', n: 'Hard Knocks', d: 'Win a league title on Hard.' },
  { k: 'survivor', ic: '🪑', n: 'Survivor', d: 'Fall below 25% board confidence and still keep your job at season end.' },
  { k: 'comebackjob', ic: '🔄', n: 'Back in the Game', d: 'Land a new job after being sacked.' },
  { k: 'pcoach', ic: '🤝', n: "Player's Coach", d: "Reach a Player's Coach rating of 15." },
  { k: 'duo', ic: '⚡', n: 'Dynamic Duo', d: 'See two of your players form a Dynamic Duo.' },
  { k: 'bigfish', ic: '🐋', n: 'Big Fish', d: 'Sign a 5-star free agent.' },
  { k: 'honour', ic: '🫡', n: 'Man of His Word', d: 'Accept a player\'s transfer request.' },
  { k: 'veteran', ic: '📅', n: 'Lifer', d: 'Coach 5 full seasons.' },
];
const ACH_KEY = 'courtside_achievements';
function achStore() { try { return JSON.parse(localStorage.getItem(ACH_KEY) || '{}'); } catch (e) { return {}; } }
function unlock(k) {
  if (!S || !S.ironman) return;
  const st = achStore();
  if (st[k]) return;
  const a = ACHIEVEMENTS.find((x) => x.k === k); if (!a) return;
  st[k] = { season: S.season, coach: S.coach.name, team: teamName(userTeam()), diff: S.diff || 'normal', at: Date.now() };
  try { localStorage.setItem(ACH_KEY, JSON.stringify(st)); } catch (e) {}
  mail('Courtside', `Achievement unlocked: ${a.n}`, `${a.ic} <b>${a.n}</b>\n\n${a.d}\n\nEarned in Ironman mode on ${DIFFICULTY[S.diff || 'normal'].n}.`, { type: 'league' });
  if (typeof toast === 'function') setTimeout(() => toast(`${a.ic} Achievement unlocked: <b>${esc(a.n)}</b>`), 50);
}
// hooks
function achAfterMatch(m, won, us, them) {
  if (won) unlock('first');
  if (userTeam().streak >= 8) unlock('streak');
  if (us >= 130) unlock('century');
  if (won && m) {
    const si = m.us;
    const worst = Math.min(0, ...m.events.map((e) => (si === 0 ? e.hs - e.as : e.as - e.hs)));
    if (worst <= -20) unlock('comeback');
  }
  if (S.board.conf < 25) S.wasHot = S.season;
  if ((S.coach.pcoach ?? 0) >= 15) unlock('pcoach');
}
function achSeasonEnd(ach) {
  const t = userTeam();
  if (t.w + t.l > 0 && t.w / (t.w + t.l) >= 0.8) unlock('dominant');
  if (ach.L === 5) { unlock('champ'); if (S.diff === 'hard') unlock('hard'); if (S.coach.journey && userLeague().id === 'PHL') unlock('rags'); }
  if (S.coach.titles >= 3) unlock('dynasty');
  if (ach.promoted) unlock('promo');
  if (S.wasHot === S.season && S.phase !== 'sacked') unlock('survivor');
  if (S.coach.hist.filter((h) => h.note !== 'Sacked').length >= 5) unlock('veteran');
  if ((S.coach.pcoach ?? 0) >= 15) unlock('pcoach');
}
function achJob() { if (S.coach.journey && userLeague().id === 'PHL') unlock('bigtime'); }
// Ironman: a match that was started can't be escaped by reloading
function ironmanResolve() {
  if (!S || !S.ironman || !S.matchLock || S.pending !== S.matchLock) return false;
  const m = createUserMatch(false);
  teamTalk(m, m.us, 'encourage', 0.5);
  simToEnd(m);
  finishUserMatch(m);
  S.matchLock = null; save();
  return true;
}
