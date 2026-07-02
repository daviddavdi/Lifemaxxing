/* ==========================================================================
   Lifemaxxing — Wienerisch: app logic
   Everything persists to localStorage. No backend, no build step.
   ========================================================================== */

const STORAGE_KEYS = {
  srs: "lm_srs_v1",
  roadmap: "lm_roadmap_v1",
  streak: "lm_streak_v1",
  progress: "lm_progress_v1",
};

const LEITNER_INTERVAL_DAYS = [0, 1, 2, 4, 8, 16, 32];

/* ---------- word id helper ---------- */
function wordId(w) { return w.cat + "::" + w.de; }

/* ---------- storage helpers ---------- */
function loadJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (e) { return fallback; }
}
function saveJSON(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function getSRS() { return loadJSON(STORAGE_KEYS.srs, {}); }
function setSRS(data) { saveJSON(STORAGE_KEYS.srs, data); }

function ensureCard(srs, id) {
  if (!srs[id]) srs[id] = { box: 0, due: Date.now() };
  return srs[id];
}

function isDue(card) { return card.due <= Date.now(); }

function gradeCard(srs, id, grade) {
  const card = ensureCard(srs, id);
  if (grade === "again") {
    card.box = 0;
  } else if (grade === "good") {
    card.box = Math.min(card.box + 1, LEITNER_INTERVAL_DAYS.length - 1);
  } else if (grade === "easy") {
    card.box = Math.min(card.box + 2, LEITNER_INTERVAL_DAYS.length - 1);
  }
  const days = LEITNER_INTERVAL_DAYS[card.box];
  card.due = Date.now() + days * 24 * 60 * 60 * 1000;
  setSRS(srs);
}

/* ---------- streak ---------- */
function touchStreak() {
  const data = loadJSON(STORAGE_KEYS.streak, { count: 0, last: null });
  const today = new Date().toDateString();
  if (data.last === today) return data;
  const yesterday = new Date(Date.now() - 86400000).toDateString();
  data.count = data.last === yesterday ? data.count + 1 : 1;
  data.last = today;
  saveJSON(STORAGE_KEYS.streak, data);
  return data;
}
function getStreak() { return loadJSON(STORAGE_KEYS.streak, { count: 0, last: null }); }

/* ---------- gamification: progress, XP, levels ---------- */
const DEFAULT_PROGRESS = { xp: 0, achievements: [], quizzesTaken: 0, perfectQuizzes: 0, flashcardSessions: 0, maxCombo: 0, soundMuted: false };
function getProgress() { return Object.assign({}, DEFAULT_PROGRESS, loadJSON(STORAGE_KEYS.progress, {})); }
function setProgress(p) { saveJSON(STORAGE_KEYS.progress, p); }

function getLevelInfo(xp) {
  let idx = 0;
  for (let i = 0; i < RANKS.length; i++) {
    if (xp >= RANKS[i].threshold) idx = i;
  }
  const rank = RANKS[idx];
  const isMax = idx === RANKS.length - 1;
  const next = isMax ? null : RANKS[idx + 1];
  const span = isMax ? 1 : next.threshold - rank.threshold;
  const into = xp - rank.threshold;
  const pct = isMax ? 100 : Math.min(100, Math.round((into / span) * 100));
  return { idx, rank, next, pct, isMax, xp };
}

// Adds XP, detects level-ups, and fires the celebratory side-effects.
function addXP(amount) {
  const progress = getProgress();
  const before = getLevelInfo(progress.xp);
  progress.xp += amount;
  setProgress(progress);
  const after = getLevelInfo(progress.xp);
  if (after.idx > before.idx) {
    playLevelUp();
    confettiBurst(60);
    showToast(`⭐ Rank up! You're now a ${after.rank.title}`, after.rank.sub);
  }
  renderGamiBar();
  return after;
}

function computeStats() {
  const srs = getSRS();
  let studied = 0, mastered = 0;
  VOCAB.forEach(w => {
    const c = srs[wordId(w)];
    if (c) {
      studied++;
      if (c.box >= 4) mastered++;
    }
  });
  return { studied, mastered, streak: getStreak(), progress: getProgress() };
}

function checkAchievements() {
  const stats = computeStats();
  const progress = getProgress();
  let unlockedSomething = false;
  ACHIEVEMENTS.forEach(a => {
    if (progress.achievements.includes(a.id)) return;
    if (a.test(stats)) {
      progress.achievements.push(a.id);
      unlockedSomething = true;
      showToast(`${a.emoji} Achievement unlocked: ${a.title}`, a.desc);
      confettiBurst(35);
      playAchievement();
    }
  });
  if (unlockedSomething) setProgress(progress);
}

/* ---------- sound effects (Web Audio, no external files) ---------- */
let audioCtx = null;
function getAudioCtx() {
  if (!audioCtx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (AC) audioCtx = new AC();
  }
  return audioCtx;
}
function playTone(freq, startTime, duration, type = "sine", volume = 0.16) {
  if (getProgress().soundMuted) return;
  const ctx = getAudioCtx();
  if (!ctx) return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(volume, ctx.currentTime + startTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + startTime + duration);
  osc.connect(gain).connect(ctx.destination);
  osc.start(ctx.currentTime + startTime);
  osc.stop(ctx.currentTime + startTime + duration);
}
function playCorrect() { playTone(660, 0, 0.12); playTone(880, 0.1, 0.18); }
function playWrong() { playTone(330, 0, 0.22, "triangle", 0.12); }
function playNeutral() { playTone(440, 0, 0.1, "sine", 0.1); }
function playLevelUp() {
  [523, 659, 784, 1046].forEach((f, i) => playTone(f, i * 0.11, 0.22, "triangle", 0.15));
}
function playAchievement() {
  [784, 988, 1175].forEach((f, i) => playTone(f, i * 0.09, 0.16, "sine", 0.14));
}
function toggleMute() {
  const progress = getProgress();
  progress.soundMuted = !progress.soundMuted;
  setProgress(progress);
  renderGamiBar();
}

/* ---------- confetti (lightweight, no dependencies) ---------- */
function confettiBurst(count) {
  let layer = document.getElementById("confetti-layer");
  if (!layer) {
    layer = document.createElement("div");
    layer.id = "confetti-layer";
    document.body.appendChild(layer);
  }
  const colors = ["#c8102e", "#ffffff", "#b8860b", "#2e7d4f", "#4a5158"];
  for (let i = 0; i < count; i++) {
    const piece = document.createElement("div");
    piece.className = "confetti-piece";
    piece.style.left = Math.random() * 100 + "vw";
    piece.style.background = colors[Math.floor(Math.random() * colors.length)];
    piece.style.animationDuration = (1.4 + Math.random() * 1.2) + "s";
    piece.style.animationDelay = (Math.random() * 0.3) + "s";
    piece.style.transform = `rotate(${Math.random() * 360}deg)`;
    layer.appendChild(piece);
    setTimeout(() => piece.remove(), 3200);
  }
}

/* ---------- toast notifications ---------- */
function showToast(title, sub) {
  let stack = document.getElementById("toast-stack");
  if (!stack) {
    stack = document.createElement("div");
    stack.id = "toast-stack";
    document.body.appendChild(stack);
  }
  const toast = document.createElement("div");
  toast.className = "toast";
  toast.innerHTML = `<div class="toast-title">${title}</div>${sub ? `<div class="toast-sub">${sub}</div>` : ""}`;
  stack.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add("show"));
  setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => toast.remove(), 350);
  }, 3400);
}

/* ---------- gamification bar (level, XP, streak, mute) ---------- */
function renderGamiBar() {
  const bar = document.getElementById("gami-bar");
  if (!bar) return;
  const progress = getProgress();
  const level = getLevelInfo(progress.xp);
  const streak = getStreak();
  bar.innerHTML = `
    <div class="gami-rank">
      <span class="gami-rank-title">${level.rank.title}</span>
      <span class="gami-rank-sub">${level.rank.sub}</span>
    </div>
    <div class="gami-xp">
      <div class="gami-xp-track"><div class="gami-xp-fill" style="width:${level.pct}%"></div></div>
      <div class="gami-xp-label">${level.isMax ? `${progress.xp} XP · max rank` : `${progress.xp} / ${level.next.threshold} XP`}</div>
    </div>
    <div class="gami-streak" title="Day streak">🔥 ${streak.count}</div>
    <button class="gami-mute" id="gami-mute-btn" title="${progress.soundMuted ? "Unmute" : "Mute"} sound">${progress.soundMuted ? "🔇" : "🔊"}</button>
  `;
  document.getElementById("gami-mute-btn").addEventListener("click", toggleMute);
}

/* ---------- achievements gallery ---------- */
function renderAchievements() {
  const container = document.getElementById("achievements-grid");
  if (!container) return;
  const progress = getProgress();
  container.innerHTML = ACHIEVEMENTS.map(a => {
    const unlocked = progress.achievements.includes(a.id);
    return `<div class="badge ${unlocked ? "unlocked" : "locked"}" title="${a.desc}">
      <div class="badge-emoji">${unlocked ? a.emoji : "🔒"}</div>
      <div class="badge-title">${a.title}</div>
    </div>`;
  }).join("");
}

/* ---------- TTS ---------- */
function speak(text) {
  if (!("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  const utter = new SpeechSynthesisUtterance(text);
  const voices = window.speechSynthesis.getVoices();
  const atVoice = voices.find(v => v.lang === "de-AT");
  const deVoice = voices.find(v => v.lang && v.lang.startsWith("de"));
  utter.voice = atVoice || deVoice || null;
  utter.lang = (atVoice || deVoice) ? undefined : "de-DE";
  utter.rate = 0.92;
  window.speechSynthesis.speak(utter);
}
// Warm up voice list (Chrome loads it async)
if ("speechSynthesis" in window) {
  window.speechSynthesis.onvoiceschanged = () => window.speechSynthesis.getVoices();
}

/* ---------- navigation ---------- */
function showView(id) {
  document.querySelectorAll(".view").forEach(v => v.classList.remove("active"));
  document.querySelectorAll("nav.tabs button").forEach(b => b.classList.remove("active"));
  document.getElementById("view-" + id).classList.add("active");
  document.querySelector(`nav.tabs button[data-view="${id}"]`).classList.add("active");
  window.scrollTo({ top: 0, behavior: "instant" in window ? "instant" : "auto" });
  if (id === "dashboard") renderDashboard();
  if (id === "roadmap") renderRoadmap();
  if (id === "vocab") renderVocab();
  if (id === "flashcards") renderFlashcardSetup();
  if (id === "quiz") renderQuizSetup();
  renderGamiBar();
}

/* ---------- Dashboard ---------- */
function renderDashboard() {
  const srs = getSRS();
  const total = VOCAB.length;
  let due = 0, mastered = 0, started = 0;
  VOCAB.forEach(w => {
    const id = wordId(w);
    const card = srs[id];
    if (card) {
      started++;
      if (isDue(card)) due++;
      if (card.box >= 4) mastered++;
    } else {
      due++; // new cards count as due
    }
  });
  const streak = getStreak();

  document.getElementById("dash-stats").innerHTML = `
    <div class="stat"><div class="num">${streak.count}</div><div class="lbl">Day streak</div></div>
    <div class="stat"><div class="num">${due}</div><div class="lbl">Cards due</div></div>
    <div class="stat"><div class="num">${mastered}</div><div class="lbl">Mastered</div></div>
    <div class="stat"><div class="num">${total}</div><div class="lbl">Total words</div></div>
  `;
  renderAchievements();
}

/* ---------- Roadmap ---------- */
function renderRoadmap() {
  const done = loadJSON(STORAGE_KEYS.roadmap, {});
  const container = document.getElementById("roadmap-content");
  container.innerHTML = ROADMAP.map((phase, pIdx) => {
    const items = phase.items.map((item, iIdx) => {
      const key = pIdx + "-" + iIdx;
      const checked = done[key] ? "checked" : "";
      const doneClass = done[key] ? "done" : "";
      return `<li class="${doneClass}">
        <input type="checkbox" data-key="${key}" ${checked} />
        <span>${item}</span>
      </li>`;
    }).join("");
    return `<div class="card phase">
      <h3>${phase.phase}</h3>
      <p class="goal">${phase.goal}</p>
      <ul>${items}</ul>
    </div>`;
  }).join("");

  container.querySelectorAll('input[type="checkbox"]').forEach(cb => {
    cb.addEventListener("change", () => {
      const done = loadJSON(STORAGE_KEYS.roadmap, {});
      done[cb.dataset.key] = cb.checked;
      saveJSON(STORAGE_KEYS.roadmap, done);
      cb.closest("li").classList.toggle("done", cb.checked);
    });
  });
}

/* ---------- Grammar & Pronunciation (static render) ---------- */
function renderGrammar() {
  document.getElementById("grammar-content").innerHTML = GRAMMAR_SECTIONS.map(s => `
    <div class="card grammar-section">
      <h3>${s.title}</h3>
      ${s.html}
    </div>
  `).join("");
}
function renderPronunciation() {
  document.getElementById("pron-content").innerHTML = PRONUNCIATION_SECTIONS.map(s => `
    <div class="card pron-section">
      <h3>${s.title}</h3>
      ${s.html}
    </div>
  `).join("");
}

/* ---------- Vocabulary browser ---------- */
function renderVocab() {
  const catSel = document.getElementById("vocab-cat");
  if (catSel.options.length === 0) {
    catSel.innerHTML = `<option value="all">All categories</option>` +
      CATEGORIES.map(c => `<option value="${c.id}">${c.emoji} ${c.label}</option>`).join("");
  }
  drawVocabList();
}

function drawVocabList() {
  const cat = document.getElementById("vocab-cat").value || "all";
  const q = document.getElementById("vocab-search").value.trim().toLowerCase();
  const list = VOCAB.filter(w => {
    const catMatch = cat === "all" || w.cat === cat;
    const qMatch = !q || w.de.toLowerCase().includes(q) || w.en.toLowerCase().includes(q) ||
      (w.de_std && w.de_std.toLowerCase().includes(q));
    return catMatch && qMatch;
  });
  const container = document.getElementById("vocab-list");
  if (list.length === 0) {
    container.innerHTML = `<div class="empty-state">No words match your search.</div>`;
    return;
  }
  container.innerHTML = list.map(w => `
    <div class="word-row">
      <button class="speak-btn" data-speak="${escapeAttr(w.de)}" title="Pronounce">🔊</button>
      <div class="de">${w.de}${w.de_std ? `<span class="std">Germany-standard: ${w.de_std}</span>` : ""}</div>
      <div class="en">${w.en}</div>
      <div class="sr">${w.sr}</div>
      ${w.note ? `<div class="note">${w.note}</div>` : ""}
    </div>
  `).join("");
  container.querySelectorAll("[data-speak]").forEach(btn => {
    btn.addEventListener("click", () => speak(btn.dataset.speak));
  });
}
function escapeAttr(s) { return s.replace(/"/g, "&quot;"); }

/* ---------- Flashcards ---------- */
let fcState = { queue: [], index: 0, flipped: false, direction: "de-en" };

function renderFlashcardSetup() {
  const catSel = document.getElementById("fc-cat");
  if (catSel.options.length === 0) {
    catSel.innerHTML = `<option value="all">All categories</option>` +
      CATEGORIES.map(c => `<option value="${c.id}">${c.emoji} ${c.label}</option>`).join("");
  }
  document.getElementById("fc-body").innerHTML = `<div class="empty-state">Choose a category and click "Start studying".</div>`;
  document.getElementById("fc-progress").textContent = "";
}

function startFlashcards() {
  const cat = document.getElementById("fc-cat").value || "all";
  const onlyDue = document.getElementById("fc-due-only").checked;
  const srs = getSRS();
  let pool = VOCAB.filter(w => cat === "all" || w.cat === cat);
  if (onlyDue) {
    pool = pool.filter(w => {
      const card = srs[wordId(w)];
      return !card || isDue(card);
    });
  }
  shuffle(pool);
  fcState = { queue: pool, index: 0, flipped: false, direction: document.getElementById("fc-dir").value };
  touchStreak();
  const progress = getProgress();
  progress.flashcardSessions++;
  setProgress(progress);
  renderDashboardIfVisible();
  renderGamiBar();
  drawFlashcard();
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function drawFlashcard() {
  const body = document.getElementById("fc-body");
  const progressEl = document.getElementById("fc-progress");
  if (fcState.index >= fcState.queue.length) {
    body.innerHTML = `<div class="empty-state">🎉 Session complete! Nice work. Start another round anytime.</div>`;
    progressEl.textContent = "";
    return;
  }
  const w = fcState.queue[fcState.index];
  const front = fcState.direction === "de-en" ? w.de : `${w.en}`;
  const back = fcState.direction === "de-en" ? `${w.en} · ${w.sr}` : w.de;

  body.innerHTML = `
    <div class="flashcard ${fcState.flipped ? "flipped" : ""}" id="fc-card">
      <div class="front-only">
        <div class="front">${front}</div>
        <div class="hint">Tap card to reveal</div>
      </div>
      <div class="back">
        <div class="front">${back}</div>
        ${w.note ? `<div class="sub">${w.note}</div>` : ""}
      </div>
    </div>
    <div class="grade-buttons ${fcState.flipped ? "visible" : ""}" id="fc-grades">
      <button class="grade-again" data-grade="again">Again</button>
      <button class="grade-good" data-grade="good">Good</button>
      <button class="grade-easy" data-grade="easy">Easy</button>
    </div>
  `;
  progressEl.textContent = `Card ${fcState.index + 1} of ${fcState.queue.length}`;

  document.getElementById("fc-card").addEventListener("click", () => {
    fcState.flipped = !fcState.flipped;
    drawFlashcard();
    if (fcState.flipped) speak(w.de);
  });
  document.querySelectorAll("#fc-grades button").forEach(btn => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const srs = getSRS();
      const grade = btn.dataset.grade;
      gradeCard(srs, wordId(w), grade);
      const xpMap = { again: 2, good: 5, easy: 8 };
      xpPop(xpMap[grade], e.clientX, e.clientY);
      if (grade === "again") playNeutral(); else playCorrect();
      addXP(xpMap[grade]);
      checkAchievements();
      renderDashboardIfVisible();
      fcState.index++;
      fcState.flipped = false;
      drawFlashcard();
    });
  });
}

/* ---------- Quiz ---------- */
let quizState = { questions: [], index: 0, score: 0, direction: "de-en", combo: 0, maxCombo: 0 };

function renderQuizSetup() {
  const catSel = document.getElementById("quiz-cat");
  if (catSel.options.length === 0) {
    catSel.innerHTML = `<option value="all">All categories</option>` +
      CATEGORIES.map(c => `<option value="${c.id}">${c.emoji} ${c.label}</option>`).join("");
  }
  document.getElementById("quiz-body").innerHTML = `<div class="empty-state">Choose your options and click "Start quiz".</div>`;
  document.getElementById("quiz-progress").textContent = "";
}

function startQuiz() {
  const cat = document.getElementById("quiz-cat").value || "all";
  const count = parseInt(document.getElementById("quiz-count").value, 10);
  const direction = document.getElementById("quiz-dir").value;
  let pool = VOCAB.filter(w => cat === "all" || w.cat === cat);
  if (pool.length < 4) {
    document.getElementById("quiz-body").innerHTML = `<div class="empty-state">Not enough words in this category for a multiple-choice quiz. Pick "All categories".</div>`;
    return;
  }
  shuffle(pool);
  const questions = pool.slice(0, Math.min(count, pool.length)).map(w => {
    const distractors = shuffle(VOCAB.filter(o => o !== w)).slice(0, 3);
    const options = shuffle([w, ...distractors]);
    return { correct: w, options, direction };
  });
  quizState = { questions, index: 0, score: 0, direction, combo: 0, maxCombo: 0 };
  touchStreak();
  renderDashboardIfVisible();
  renderGamiBar();
  drawQuiz();
}

function drawQuiz() {
  const body = document.getElementById("quiz-body");
  const progressEl = document.getElementById("quiz-progress");
  if (quizState.index >= quizState.questions.length) {
    const pct = Math.round((quizState.score / quizState.questions.length) * 100);
    const isPerfect = quizState.score === quizState.questions.length;

    const progress = getProgress();
    progress.quizzesTaken++;
    if (isPerfect) progress.perfectQuizzes++;
    progress.maxCombo = Math.max(progress.maxCombo, quizState.maxCombo);
    setProgress(progress);
    if (isPerfect) {
      addXP(25);
      playLevelUp();
      confettiBurst(80);
    }
    checkAchievements();
    renderDashboardIfVisible();
    renderGamiBar();

    body.innerHTML = `
      <div class="card quiz-result">
        <div class="score">${quizState.score} / ${quizState.questions.length}</div>
        <p>${pct}% correct${isPerfect ? " — perfect run! +25 bonus XP 🎉" : ""}</p>
        ${quizState.maxCombo >= 3 ? `<p class="combo-summary">🔥 Best combo: ${quizState.maxCombo} in a row</p>` : ""}
      </div>`;
    progressEl.textContent = "";
    return;
  }
  const q = quizState.questions[quizState.index];
  const prompt = q.direction === "de-en" ? q.correct.de : q.correct.en;
  body.innerHTML = `
    ${quizState.combo >= 2 ? `<div class="combo-badge">🔥 Combo x${quizState.combo}</div>` : ""}
    <div class="card">
      <div class="quiz-question">${prompt}</div>
      <div class="quiz-options">
        ${q.options.map((opt, i) => {
          const label = q.direction === "de-en" ? opt.en : opt.de;
          return `<button class="quiz-option" data-idx="${i}">${label}</button>`;
        }).join("")}
      </div>
      <div class="quiz-feedback" id="quiz-feedback"></div>
    </div>
  `;
  progressEl.textContent = `Question ${quizState.index + 1} of ${quizState.questions.length} · Score: ${quizState.score}`;

  document.querySelectorAll(".quiz-option").forEach((btn, i) => {
    btn.addEventListener("click", (e) => {
      document.querySelectorAll(".quiz-option").forEach(b => b.disabled = true);
      const isCorrect = q.options[i] === q.correct;
      btn.classList.add(isCorrect ? "correct" : "wrong");
      const feedback = document.getElementById("quiz-feedback");
      let xpGain;
      if (isCorrect) {
        quizState.score++;
        quizState.combo++;
        quizState.maxCombo = Math.max(quizState.maxCombo, quizState.combo);
        xpGain = 8 + Math.min(quizState.combo, 10) * 2;
        playCorrect();
        feedback.textContent = CORRECT_PHRASES[Math.floor(Math.random() * CORRECT_PHRASES.length)];
        feedback.className = "quiz-feedback good";
      } else {
        document.querySelectorAll(".quiz-option").forEach(b => {
          const bi = parseInt(b.dataset.idx, 10);
          if (q.options[bi] === q.correct) b.classList.add("correct");
        });
        quizState.combo = 0;
        xpGain = 1;
        playWrong();
        feedback.textContent = WRONG_PHRASES[Math.floor(Math.random() * WRONG_PHRASES.length)];
        feedback.className = "quiz-feedback bad";
      }
      xpPop(xpGain, e.clientX, e.clientY);
      addXP(xpGain);
      speak(q.correct.de);
      setTimeout(() => {
        quizState.index++;
        drawQuiz();
      }, 1200);
    });
  });
}

/* ---------- misc ---------- */
function renderDashboardIfVisible() {
  if (document.getElementById("view-dashboard").classList.contains("active")) renderDashboard();
}

function xpPop(amount, x, y) {
  const pop = document.createElement("div");
  pop.className = "xp-pop";
  pop.textContent = `+${amount} XP`;
  pop.style.left = (x || window.innerWidth / 2) + "px";
  pop.style.top = (y || window.innerHeight / 2) + "px";
  document.body.appendChild(pop);
  setTimeout(() => pop.remove(), 900);
}

function syncNavHeight() {
  const nav = document.querySelector("nav.tabs");
  if (nav) document.documentElement.style.setProperty("--nav-height", nav.offsetHeight + "px");
}

/* ---------- boot ---------- */
document.addEventListener("DOMContentLoaded", () => {
  syncNavHeight();
  window.addEventListener("resize", syncNavHeight);
  document.querySelectorAll("nav.tabs button").forEach(btn => {
    btn.addEventListener("click", () => showView(btn.dataset.view));
  });
  document.getElementById("vocab-cat").addEventListener("change", drawVocabList);
  document.getElementById("vocab-search").addEventListener("input", drawVocabList);
  document.getElementById("fc-start").addEventListener("click", startFlashcards);
  document.getElementById("quiz-start").addEventListener("click", startQuiz);
  document.querySelectorAll("[data-goto]").forEach(el => {
    el.addEventListener("click", () => showView(el.dataset.goto));
  });

  renderGrammar();
  renderPronunciation();
  showView("dashboard");
  touchStreak();
  renderDashboard();
  renderGamiBar();
});
