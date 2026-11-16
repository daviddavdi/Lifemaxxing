/* Courtside Manager — schema versioning & save migrations */
'use strict';

const SCHEMA_VERSION = 6;

// Upgrade any older save to the current schema without losing the career.
function migrateSave(o) {
  if (o.v < 3) {
    const prev = S; S = o; // helpers below read the global state
    try {
      for (const p of Object.values(o.players)) ensureTraits(p);
      o.duos = o.duos || []; o.pairs = o.pairs || {}; o.staff = o.staff || []; o.nextSid = o.nextSid || 0;
      const c = o.coach;
      const first = c.hist && c.hist.length ? Math.min(...c.hist.map((h) => h.season)) : o.season;
      c.start = c.start || { season: first, day: 0 };
      c.joined = c.joined || { season: o.season, day: 0 };
      c.pcoach = c.pcoach ?? 10; c.badges = c.badges || [];
      if (o.userTeam != null) ensureUserStaff();
      o.v = 3;
    } finally { if (prev) S = prev; }
  }
  if (o.v >= 2) { const prev = S; S = o; try { o.teams.forEach((t) => ensureNumbers(o, t)); } finally { if (prev) S = prev; } }
  if (o.v < 4) {
    const prev = S; S = o;
    try { ensureMarket(); o.v = 4; } finally { if (prev) S = prev; }
  }
  if (o.coach && !o.coach.look) o.coach.look = randomCoachLook(strSeed(o.coach.name));
  if (o.v < 5) { const prev = S; S = o; try { ensureRivals(); o.v = Math.max(o.v, 5); } finally { if (prev) S = prev; } }
  if (o.v < 6) { try { rebalanceVenues(o); } catch (e) { console.warn(e); } o.v = 6; }
  return o;
}
// v6: older schedules could send a team on a season-long road trip. Re-pick who hosts each remaining
// regular-season game (same dates and opponents), carrying on from the games already played.
function rebalanceVenues(o) {
  if (!o.schedule || typeof orientHomeAway !== 'function') return;
  const byLg = {};
  for (const f of o.schedule) if (f.type === 'reg') (byLg[f.lg] = byLg[f.lg] || []).push(f);
  for (const lid in byLg) {
    const fx = byLg[lid].sort((a, b) => a.day - b.day || a.id - b.id);
    const mem = { st: {}, pair: {} };
    orientHomeAway(fx.filter((f) => f.played || f.id === o.pending).map((f) => [[f.h, f.a]]), mem, true);
    const todo = fx.filter((f) => !f.played && f.id !== o.pending);
    const days = [...new Set(todo.map((f) => f.day))];
    for (const d of days) {
      const list = todo.filter((f) => f.day === d), round = list.map((f) => [f.h, f.a]);
      orientHomeAway([round], mem);
      list.forEach((f, i) => { f.h = round[i][0]; f.a = round[i][1]; });
    }
  }
}
