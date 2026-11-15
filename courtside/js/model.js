/* Courtside Manager — schema versioning & save migrations */
'use strict';

const SCHEMA_VERSION = 3;

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
  return o;
}
