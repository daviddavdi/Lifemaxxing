# Courtside Manager

A mobile-first basketball management game in the classic "manager sim" style: 1–20 attributes,
an inbox full of emails from your board, staff and players, rotations, tactics, trades, free
agency, playoffs and multi-season careers. All players and teams are fictional, and everything is
editable in the built-in Database Editor.

Plain HTML/CSS/JS. No build step, no server, no dependencies. Saves to the device (localStorage).

## Play it

- **Locally:** open `index.html`, or serve the folder: `python3 -m http.server` → http://localhost:8000
- **GitHub Pages:** once merged to `main`, the existing Pages workflow publishes it at `/courtside/`.
- **On your phone:** open the URL in Safari → Share → *Add to Home Screen*. It runs full-screen like an app.

## What's in it

| Area | Features |
|---|---|
| Inbox | Board objectives & reviews, assistant reports, injuries, unhappy players (promise minutes / tell him to earn it), AI trade proposals (accept/reject), contract renewals, awards |
| Squad | Ability/potential stars, condition, morale, season stats, contracts |
| Player | 19 attributes (1–20) in Technical / Defending / Physical / Mental, stats, form, career history |
| Tactics | Pace, offensive focus, man/zone, intensity; tap-to-swap rotation (starters, bench, reserves) |
| Match | Pre-match scouting report → watch live commentary (1×/2×/4×) or quick result → box score with player ratings & Player of the Match |
| League | Standings, fixtures, results, stat leaders, playoff bracket (top 8), history |
| Market | Free agents (sign with wage budget), trade any player (AI values ability, potential, age) |
| Club | Board confidence (get sacked below 20% and pick a new job), wage budget, training focus |
| Seasons | Aging, development (young + high potential + minutes + work rate), retirements, expiring contracts, new young free agents every summer |
| Editor | Edit league/team names, colours, budgets; edit/create/delete players & every attribute; export/import the database as a file to share custom rosters |

## Code map

- `js/data.js` — name pools, attributes, default teams, helpers
- `js/engine.js` — player generation, ability calc, possession-by-possession match engine
- `js/game.js` — season flow, schedule, playoffs, inbox, morale, injuries, board, trades, free agency, saves
- `js/ui.js` — all screens & interactions
- `css/style.css` — theme (re-colours to your club)

## Going to the App Store later

The game is a static web app, so it can be wrapped with **Capacitor** (`npx cap add ios`) and sold as
a one-time unlock via **RevenueCat**. Natural places for a "Full Game" gate: seasons after the first,
or the Database Editor's import/export.
