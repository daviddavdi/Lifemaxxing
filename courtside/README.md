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
- **The court shows exactly what the engine decided:** every possession is replayed action by action. Three-pointers are taken from beyond the arc (corners included), two-pointers from inside it (drives finish at the rim, jumpers from mid-range), and free throws are shot from the line with players lined up on the lane, one attempt at a time ("Free throw 1 of 2"). And-ones, blocks, offensive and defensive rebounds, steals, turnovers and technical free throws are each shown, with a caption naming the player and the action, a result flash (+2, +3, ✓ FT, MISS, BLOCKED, STEAL), and the scoreboard ticks at the moment each point goes in. Every trip to the line gets a commentary line.
- **Faces:** generated faces appear on profiles, the squad list, the inbox, the starting five and staff list, and on match day.
- **Faces on match day:** under the court, your five on-court players are shown with their faces, points, an energy bar and their mood. When you shout or give a team talk, every player's face shows how he took it (💪 Motivated, 🙂 Focused, 😒 Nervous/Annoyed, 😡 Furious), and the on-court cards keep showing the reaction for a couple of minutes of game time.
- **Match sound:** an immersive arena, all generated in the browser (no audio files). The crowd is built from dozens of simulated human voices, each with its own pitch, vowel and timing, plus breath, claps and arena rumble. A stereo murmur runs the whole game and swells in tight finishes. The home crowd roars when its team scores (a bigger roar for threes, and-ones and clutch baskets), groans "awww" when the visitors score, and goes "ooh" at blocks and steals. In rivalry, playoff and close late games it's louder and chants "DE-FENSE!" with claps. You also hear the ball being dribbled while a team brings it up and sets up (panned to where the ball is), sneaker squeaks, the swish, rim clanks, referee whistles and the buzzer. 🔊/🔇 in the match controls turns it on or off. On iPhone, sound starts on your first tap (iOS requires that) and plays through the silent switch; if the button shows "🔈 Tap", tap it. Turning sound on plays a test cheer.
- **Drag to reorder:** on the Rotation tab, the Squad overview (in rotation order) and the in-match Subs screen, drag the ⋮⋮ handle to slide a player up or down. Tapping two players still swaps them.
- **Positions:** Auto-pick now finds the best five with players in their natural positions (a centre only starts at power forward if he's clearly better than the alternatives). Starters out of position are flagged with ⚠ on the Rotation tab.
- **In-game energy:** players tire on court (faster with low Stamina, a full-court press or aggressive intensity) and recover on the bench; tired players play slightly worse.
- **Assistant handles subs (on by default):** in the Subs screen, let your assistant make the substitutions. He rests tired players, benches players who've gone cold, rides the hot hand, keeps a ball-handler and a big on the floor, and closes tight games with your best five. Each change is announced in the commentary. Turn it off to manage the rotation yourself.
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

## Difficulty, Ironman & achievements

- **Difficulty:** Easy / Normal / Hard, chosen when you start a career. It changes board patience and the sacking thresholds, your wage budget, how hard AI clubs bargain in trades, injury rates, and a small on-court edge on Easy.
- **🛡️ Ironman:** one save with no restoring backups, no database or coach editor, and no reloading matches. A match you've started is final: closing or reloading the app plays it out. Not available with custom databases.
- **Achievements (18):** earned only in Ironman careers. They're stored on the device across careers and include First Blood, On a Roll, Comeback Kid, Champion, Dynasty, Going Up, Rags to Riches, Hard Knocks, Survivor, Player's Coach and Man of His Word.

## Match Preview, jersey numbers & retired numbers

- **Match Preview:** before every game your assistant shows win probability (calibrated against the match engine, using available players, condition, morale, form and home court), bookmaker odds, last-5 form, and three scouting notes: their hottest player, their biggest weakness, and how they play. One tap applies the recommended tweak, including putting a defensive stopper on their star.
- **Upsets:** beating a heavy favourite gives a big boost to board confidence and morale. Losing as a heavy favourite costs both, and makes the rumour mill.
- **Jersey numbers:** every player has a unique number (0–99) at his club. It's shown on the squad list, the profile, the rotation and inside his dot on the live court.
- **Retired numbers:** when a club legend retires (4+ seasons, or 3 with a high rating, or a title with you), the board offers to retire his number. Banners hang in **Club & Board → Club History**, and nobody wears that number again.

## Rivalries & press conferences

- **Coach rivalries:** firing back at a coach in the press, poaching one of his top-3 players, or close, overtime and playoff battles all build grudge points. Enough points makes you Rivals, then Bitter Rivals, then Sworn Enemies, shown on your Coach Profile, his club page and the hot seat. Before a grudge match he talks trash in the media. The preview flags the ⚔️ GRUDGE MATCH, and board-confidence and morale swings on the result are doubled.
- **Player rivalries:** trash talkers and hotheads who battle opponents at their position, or former teammates who leave on bad terms (clashing egos, unsettled exits), become personal rivals. When both are on court they trash talk far more, swing harder between On Fire and Cold, and are much likelier to get technicals and flagrants. They're marked with red rings on the court and listed in the preview.
- **Press conferences:** before and after every game, three questions each about rivals, your star, expectations, the result, ejections and the player of the match. Answers move morale, board confidence and rivalries, and blaming the refs can get you fined. Your Media Handling attribute matters. Delegate pre-game, post-game or both to your assistant in Settings (or per game) and he keeps it measured.

## Default world: real cities, original names, real colours

- **Pro Hoops League:** the 30 real NBA markets (Atlanta through Washington, with two Los Angeles clubs) under original names, e.g. Boston Colonials, Los Angeles Royals, Chicago Gales, New York Skyliners, Miami Flamingos and San Francisco Fog. Each uses its market's real primary and secondary colours. The short season is a 29-game round robin; long is 58. Top 8 make the playoffs.
- **Europe:** a pan-European two-tier pyramid with promotion and relegation (2 up, 2 down).
  - *Continental League:* Madrid, Barcelona, Belgrade, Athens, Piraeus, Istanbul, Munich, Milan, Vienna, Kaunas, Paris, Valencia, Bologna, Berlin, Vitoria and Monaco.
  - *Continental League Two:* Málaga, Zaragoza, Bilbao, Las Palmas, Venice, Rome, Naples, Thessaloniki, Ljubljana, Zagreb, Riga, Vilnius, Lyon, Bamberg, Ulm and Ankara.
  - Rosters lean toward local nationalities.
- **Colours everywhere:** text on team colours is chosen to stay readable, and the secondary colour appears as trim on badges, the header and the Continue button. On the court, players wear the primary colour with secondary trim, and the away team switches to its alternate kit when the colours clash.
- Existing careers keep their world. New careers use the new database.

## Faces

Every player gets a generated face that stays the same all career.
- **Skin and hair:** skin tone follows nationality, and hair style and colour vary (buzz, fade, afro, twists, cornrows, curly, long, bun, bald and more).
- **Age:** facial hair gets more likely with age. From about 31, hair greys, hairlines recede and wrinkles appear, so players visibly age through your career.
- **Extras:** some players wear headbands (more often the show-offs), and everyone wears their club's jersey colours.
- **Your coach:** you design your own face in New Career (skin, hair, hair colour, facial hair, glasses, or Randomize), shown in a suit with a team-colour tie. Change it any time from the Coach Profile.
- **Staff:** they get faces too.

## Code map

- `js/data.js` — name pools, attributes, default teams, helpers
- `js/engine.js` — player generation, ability calc, possession-by-possession match engine
- `js/faces.js` — generated SVG faces for players, staff and your coach
- `js/game.js` — season flow, schedule, playoffs, inbox, morale, injuries, board, trades, free agency, saves
- `js/traits.js` — traits, archetypes, aging, bios, career logs, duos, staff
- `js/court.js` — 2D court renderer for Key Highlights
- `js/market.js` — transfer list, interest, ambition, hot seat, rumours, deals log
- `js/preview.js` — win probability, odds, scouting, tactical tweak, upset swings
- `js/rivals.js` — coach & player rivalries, press conferences
- `js/achieve.js` — difficulty settings, Ironman lock, achievements
- `js/model.js` — save schema version & migrations
- `js/ui.js` — all screens & interactions
- `css/style.css` — theme (re-colours to your club)

## Going to the App Store later

The game is a static web app, so it can be wrapped with **Capacitor** (`npx cap add ios`) and sold as
a one-time unlock via **RevenueCat**. Natural places for a "Full Game" gate: seasons after the first,
or the Database Editor's import/export.
