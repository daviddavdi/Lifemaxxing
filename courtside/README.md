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

## Phase 1 systems (schema v3 — see ARCHITECTURE.md)

- **12 hidden traits**, now including Resilience, Natural Fitness and Trash Talk.
- **Archetypes:** ⚡ Fast Learner, 🐢 Slow Learner, 🩹 Injury Prone, 🛡️ Ironman, 🤝 Locker Room Glue Guy (cushions morale drops, mentors youth).
- **Aging:** every player has his own peak age and decline rate.
- **Profiles:** dynamic bios, plus an FM-style History tab (club, league, apps, minutes, points, rebounds, assists, average rating, awards, career totals).
- **Minutes:** set a minutes target per player.
- **Live match court:** 2D top-down court with Key Highlights (runs, clutch plays, players catching fire, technicals, flagrants, trash talk). Dots glow red-orange when On Fire and icy blue when Cold.
- **Touchline:** shouts now include Fire Up and Focus. Discipline escalates from Technical to 2nd T / Flagrant 2 ejection to suspensions (also 1 game per 5 techs).
- **Dynamic Duos (rare):** long-time teammates can click. They get +1 on key attributes when sharing the floor and look for each other. Trading one triggers a 1-on-1 with the other.
- **Staff:** assistant, scout, youth and fitness coaches. Retired players with the right mentality become staff; your club's legends ask to join you.
- **Career dates:** career start date, date joined, days in charge, coach bio.

## Transfer market & rumours (schema v4)

- **Transfer List:** list your players from their profile. Clubs take notice, offers come faster (including "we'll take his whole contract"). AI clubs list unhappy or surplus players too, and those come cheaper in trades.
- **Wanted (Squad tab):** clubs track your players and move from Monitoring to Interested to Keen. Keen clubs make offers. "Wanted by" shows on the player profile.
- **Ambition:** when a bigger club is keen on an ambitious player, he asks to talk. You can let him go, promise a move next summer, or say he's not for sale. Refusing can leave him *Unsettled* (morale capped). Unsettled players hand in a transfer request to the specific club that wants them. Honouring wishes raises your Player's Coach rating; breaking promises lowers it.
- **Rumour Mill (Market tab):**
  - *Hot Seat:* every AI club now has a coach with board confidence. Bookmaker odds, mid-season sackings and appointments. You're on the list too.
  - *Rumours:* scouting reports, keen clubs, deals being discussed.
  - *Biggest Trades:* includes AI-to-AI trades.
  - *Biggest Signings:* including the summer free-agency window.

## Code map

- `js/data.js` — name pools, attributes, default teams, helpers
- `js/engine.js` — player generation, ability calc, possession-by-possession match engine
- `js/game.js` — season flow, schedule, playoffs, inbox, morale, injuries, board, trades, free agency, saves
- `js/traits.js` — traits, archetypes, aging, bios, career logs, duos, staff
- `js/court.js` — 2D court renderer for Key Highlights
- `js/market.js` — transfer list, interest, ambition, hot seat, rumours, deals log
- `js/model.js` — save schema version & migrations
- `js/ui.js` — all screens & interactions
- `css/style.css` — theme (re-colours to your club)

## Going to the App Store later

The game is a static web app, so it can be wrapped with **Capacitor** (`npx cap add ios`) and sold as
a one-time unlock via **RevenueCat**. Natural places for a "Full Game" gate: seasons after the first,
or the Database Editor's import/export.
