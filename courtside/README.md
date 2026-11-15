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

## Career mode

- **Journeyman:** start unknown (low coach attributes, low reputation) in a European second division and earn your way up.
- **Established:** strong attributes, pick any club in any of the 7 leagues.
- **World:** Pro Hoops League (16 clubs) plus Spain, Italy and Germany with two divisions each, promotion/relegation (top 2 / bottom 2), separate playoffs per league.
- **Coach attributes (1–20):** Offensive/Defensive Coaching, Tactical Knowledge, Player Development, Conditioning, Motivating, Man Management, Discipline, Determination, Adaptability, Judging Ability, Judging Potential, Media Handling. They affect matches, development and team talks. Low Judging Ability shows other clubs' attributes as ranges (e.g. `11-13`). Attributes and reputation grow with results.
- **Job market:** board confidence, mid-season and end-of-season sackings, approaches from bigger clubs, a Job Centre with vacancies each summer.

## Hidden personality & the Grapevine

Every player has 9 hidden attributes (1–20): Consistency, Big Moments, Injury Proneness, Professionalism, Ambition, Loyalty, Temperament, Coachability, Ego. They are never shown as numbers in-game (only in the editor). They drive game-to-game variance, clutch shooting, injuries, development, contract demands, refusing to drop down a league, reactions to team talks and technical fouls.

You learn about them through **the Grapevine**: anonymous tips from the bus driver, the club chef, the video analyst, your agent and so on. Each tip updates the player's *Coach's Notes* and personality. Rumours also flag players on other clubs who want out (cheaper to trade for) and coaches on thin ice (future vacancies).

## Match day

Pre-match team talk → live commentary → touchline **shouts** (Praise / Encourage / Calm / Demand More / Berate) with a cooldown → quarter breaks for tactics and subs → **half-time team talk** → full-time talk that affects morale. Every player reacts individually (Fired up, Motivated, Focused, Complacent, Nervous, Annoyed, Furious…) based on the scoreline, expectations and his personality. Berating a hothead can earn him a technical.

## Tactics

- **Offense:** pace, system (Motion / Pick & Roll / Isolation / Post-Up / Run & Gun), shot focus, offensive rebounding.
- **Defense:** scheme (Man / Zone / Switch All / Full-court Press), help defense, intensity.
- **Individual:** roles (Floor General, Shot Creator, 3&D Wing, Slasher, Stretch Big, Post Scorer, Rim Protector, Rim Runner) with role-suitability stars, shot freedom, and one Defensive Stopper who shadows the opponent's top scorer.

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
