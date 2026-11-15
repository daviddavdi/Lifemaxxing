# Courtside Manager — Architecture & Data Model (schema v3)

Plain browser scripts, loaded in order (each file only *calls* later files at runtime, never at load time):

| File | Responsibility |
|---|---|
| `js/data.js` | Static tables: attributes, hidden traits, archetypes, roles, tactics, tones, leagues, names |
| `js/engine.js` | Player generation, ratings, rotation, the possession-by-possession match engine, talks & shouts |
| `js/traits.js` | **New.** Traits/archetypes, aging curves, bios, FM-style career logs, Dynamic Duos, staff & retirement |
| `js/court.js` | **New.** 2D top-down court renderer for Key Highlights (hot/cold glows) |
| `js/game.js` | World state, calendar, seasons, inbox, transfers, career |
| `js/market.js` | **New (v4).** Transfer list, "Wanted" interest, ambition/transfer requests, AI↔AI trades, hot seat, rumour mill, deals log |
| `js/model.js` | **New.** Schema version + save migrations (v2 → v3), so old careers keep working |
| `js/ui.js` | All screens (dark FM-style, star ratings, layout unchanged) |

## State (`S`) — v3

```
S = {
  v: 3, season, day, phase, cycles,
  coach: {
    name, style, a{13 attrs 1–20}, rep 1–20, frac, hist[], titles, games, wins,
    start{season,day}, joined{season,day},           // Phase 1 (career dates, days in charge)
    pcoach 1–20, badges[]                            // Phase 2 ("Player's Coach", coaching badges)
  },
  userTeam, leagues[], teams[], schedule[], inbox[], history[],
  players{ id: Player }, staff[ Staff ], duos[ Duo ], pairs{ "a-b": minutesTogether },
  board, training, promises, vacancies, ...
}

Player = {
  id, first, last, nat, age, pos, h, team,
  a{19 visible attrs 1–20}, pot,                     // visible: current & potential → 1–5 stars
  hid{ cons, clutch, injp, prof, amb, loy, temp, coach, ego, res, nfit, trash },   // hidden 1–20
  arch[ 'fast'|'slow'|'injury'|'iron'|'glue' ],       // archetypes
  peak, decl,                                         // individual aging curve (peak age, decline rate)
  known[], morale, cond, inj, susp, techs,            // scouting knowledge, status, discipline
  st{season}, pst{playoffs}, form[ last 5 match grades 1–10 ],
  career[ { s, tid, club, t, c1, c2, lg, gp, gs, min, pts, reb, ast, stl, blk, rat, pgp, ppts, prat } ],
  awards[ { s, k:'Champion'|'MVP'|'ROY', lg } ]
}
Staff = { id, first, last, nat, age, role:'assistant'|'scout'|'youth'|'fitness', a{7 attrs 1–20}, team, ex{former-player career} }
Duo   = { a, b, since{season,day} }
```

Match state (`m`, never saved) gains: `heat` per player (On Fire ↔ Cold), ejections, flagrants, duo map, pair-minutes, and highlight snapshots (lineups + heat) for the court renderer.

## Phases

1. **Done in this step.** Hidden traits (+Resilience, Natural Fitness, Trash Talk), archetypes, individual aging curves, dynamic bios, FM-style career history with average rating, minutes per player, hot/cold heat, the 2D Key Highlights court, extra shouts (Fire Up, Focus), technicals → Flagrant 1/2 → ejections → suspensions, Dynamic Duos (rare, stat boost, pre-trade talk with the partner), retired players becoming staff, and career dates/days in charge.
2. Manager RPG: coaching badges, "Player's Coach" rating effects (free-agent preference), Club Legend, arena naming.
3. Locker room inbox events: skipped shootarounds, playing-time talks, press conferences, "One Last Dance".
4. Transfers — **partly done (v4):** transfer list, Wanted interest, rumour mill, hot seat, biggest trades/signings, ambition-driven requests. Still to come: cash buyouts, player+cash, loans, shortlist, overseas mega-offers.

v4 adds: `S.interest[{pid,tid,lvl}]`, `S.news[]`, `S.deals[]`, `team.coach{name,conf}`, player flags `listed, unsettled, wantsTo, movePromise, asked[]`.
5. Legacy: 2-round draft/youth intake, "Jr." sons, coach's son, face-pack/custom roster loader, editor toggle.
