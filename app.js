/* =========================================================
   LIFEMAXXING — app.js
   Vanilla JS. No dependencies. State persisted in LocalStorage.
   ========================================================= */

(function () {
  "use strict";

  /* ---------------------------------------------------------
   * 0. PAYMENT CONFIG
   * Replace this with your real Stripe Payment Link.
   * See SETUP_PAYMENTS.md for step-by-step instructions.
   * ------------------------------------------------------- */
  const STRIPE_PAYMENT_LINK = "https://buy.stripe.com/REPLACE_WITH_YOUR_LINK";

  const STORAGE_KEY = "lifemaxxing_state_v1";
  const CATEGORIES = ["strength", "intelligence", "aesthetics", "finance"];
  const CATEGORY_META = {
    strength: { icon: "🔴", label: "Strength" },
    intelligence: { icon: "🔵", label: "Intelligence" },
    aesthetics: { icon: "🟢", label: "Aesthetics" },
    finance: { icon: "🟡", label: "Finance" },
  };

  /* ---------------------------------------------------------
   * 1. DEFAULT STATE
   * ------------------------------------------------------- */
  function defaultHabits() {
    return [
      { id: "h1", name: "50 Push-ups", category: "strength", xp: 15, custom: false, lastCompleted: null },
      { id: "h2", name: "30-min Workout", category: "strength", xp: 25, custom: false, lastCompleted: null },
      { id: "h3", name: "Read 20 Pages", category: "intelligence", xp: 15, custom: false, lastCompleted: null },
      { id: "h4", name: "Learn Something New", category: "intelligence", xp: 20, custom: false, lastCompleted: null },
      { id: "h5", name: "Skincare Routine", category: "aesthetics", xp: 10, custom: false, lastCompleted: null },
      { id: "h6", name: "Hit 10K Steps", category: "aesthetics", xp: 20, custom: false, lastCompleted: null },
      { id: "h7", name: "Track Expenses", category: "finance", xp: 10, custom: false, lastCompleted: null },
      { id: "h8", name: "No Impulse Buy", category: "finance", xp: 20, custom: false, lastCompleted: null },
    ];
  }

  function defaultRivals() {
    return [
      { name: "Ragnar_Ironclad", strength: 240, intelligence: 90, aesthetics: 130, finance: 70 },
      { name: "Aiko_Nakamura", strength: 80, intelligence: 260, aesthetics: 150, finance: 110 },
      { name: "Victor.Sterling", strength: 60, intelligence: 120, aesthetics: 90, finance: 250 },
    ];
  }

  function defaultState() {
    return {
      level: 1,
      xp: 0,
      xpToNext: 100,
      stats: { strength: 0, intelligence: 0, aesthetics: 0, finance: 0 },
      habits: defaultHabits(),
      rivals: defaultRivals(),
      premium: false,
      premiumPreview: false,
      activeTab: "strength",
      lastRivalDrift: Date.now(),
    };
  }

  /* ---------------------------------------------------------
   * 2. STATE LOAD / SAVE
   * ------------------------------------------------------- */
  let state = loadState();

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return defaultState();
      const parsed = JSON.parse(raw);
      const merged = Object.assign(defaultState(), parsed);
      merged.stats = Object.assign({ strength: 0, intelligence: 0, aesthetics: 0, finance: 0 }, parsed.stats);
      merged.habits = Array.isArray(parsed.habits) && parsed.habits.length ? parsed.habits : defaultHabits();
      merged.rivals = Array.isArray(parsed.rivals) && parsed.rivals.length ? parsed.rivals : defaultRivals();
      return merged;
    } catch (e) {
      console.warn("LIFEMAXXING: failed to load saved state, resetting.", e);
      return defaultState();
    }
  }

  function saveState() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  function todayStr() {
    return new Date().toISOString().slice(0, 10);
  }

  function isPremiumActive() {
    return state.premium || state.premiumPreview;
  }

  /* ---------------------------------------------------------
   * 3. DOM REFS
   * ------------------------------------------------------- */
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => Array.from(document.querySelectorAll(sel));

  const levelNumEl = $("#levelNum");
  const xpBarEl = $("#xpBar");
  const xpTextEl = $("#xpText");
  const habitsListEl = $("#habitsList");
  const leaderboardListEl = $("#leaderboardList");
  const particlesContainer = $("#particlesContainer");
  const levelUpOverlay = $("#levelUpOverlay");
  const levelUpText = $("#levelUpText");
  const aiAnalysisCard = $("#aiAnalysisCard");
  const aiAnalysisText = $("#aiAnalysisText");
  const velocityCard = $("#velocityCard");
  const velocityCanvas = $("#velocityChart");
  const previewPremiumBtn = $("#previewPremiumBtn");

  /* ---------------------------------------------------------
   * 4. RENDER: TOP XP BAR
   * ------------------------------------------------------- */
  function renderXpBar() {
    levelNumEl.textContent = state.level;
    const pct = Math.min(100, (state.xp / state.xpToNext) * 100);
    xpBarEl.style.width = pct + "%";
    xpTextEl.textContent = `${state.xp} / ${state.xpToNext} XP`;
  }

  /* ---------------------------------------------------------
   * 5. RENDER: STATS
   * ------------------------------------------------------- */
  function statLevel(xpTotal) {
    return Math.floor(xpTotal / 100) + 1;
  }
  function statBarPct(xpTotal) {
    return xpTotal % 100;
  }

  function renderStats(pulseCategory) {
    CATEGORIES.forEach((cat) => {
      const total = state.stats[cat];
      $(`#lvl-${cat}`).textContent = "Lv." + statLevel(total);
      $(`#bar-${cat}`).style.width = statBarPct(total) + "%";
      $(`#val-${cat}`).textContent = total;

      if (cat === pulseCategory) {
        const row = document.querySelector(`.stat-row[data-stat="${cat}"]`);
        row.classList.remove("pulse");
        // force reflow to restart animation
        void row.offsetWidth;
        row.classList.add("pulse");
      }
    });
  }

  /* ---------------------------------------------------------
   * 6. RENDER: HABITS
   * ------------------------------------------------------- */
  function renderHabits() {
    const today = todayStr();
    habitsListEl.innerHTML = "";
    state.habits.forEach((h) => {
      const done = h.lastCompleted === today;
      const row = document.createElement("div");
      row.className = "habit-row" + (done ? " done" : "");
      row.dataset.id = h.id;

      const meta = CATEGORY_META[h.category];
      row.innerHTML = `
        <span class="habit-cat-dot">${meta.icon}</span>
        <span class="habit-name">${escapeHtml(h.name)}</span>
        <span class="habit-xp">+${h.xp} XP</span>
        <button class="habit-complete-btn" ${done ? "disabled" : ""}>${done ? "Done" : "Complete"}</button>
        ${h.custom ? '<button class="habit-delete" title="Delete quest">×</button>' : ""}
      `;

      row.querySelector(".habit-complete-btn").addEventListener("click", () => completeHabit(h.id, row));
      const delBtn = row.querySelector(".habit-delete");
      if (delBtn) delBtn.addEventListener("click", () => deleteHabit(h.id));

      habitsListEl.appendChild(row);
    });
  }

  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  function deleteHabit(id) {
    state.habits = state.habits.filter((h) => h.id !== id);
    saveState();
    renderHabits();
  }

  /* ---------------------------------------------------------
   * 7. COMPLETE HABIT — the core dopamine loop
   * ------------------------------------------------------- */
  function completeHabit(id, rowEl) {
    const habit = state.habits.find((h) => h.id === id);
    if (!habit) return;
    const today = todayStr();
    if (habit.lastCompleted === today) return;

    habit.lastCompleted = today;

    // bump stat total (drives leaderboard + stat level/bar)
    state.stats[habit.category] += habit.xp;

    // bump global XP / level
    addGlobalXp(habit.xp);

    // visual feedback
    rowEl.classList.add("just-completed");
    renderHabits();
    renderStats(habit.category);
    spawnParticles(rowEl);
    renderLeaderboard(true);
    updateAiAnalysis();
    updateVelocityChart();

    saveState();
  }

  function addGlobalXp(amount) {
    state.xp += amount;
    let leveledUp = false;
    while (state.xp >= state.xpToNext) {
      state.xp -= state.xpToNext;
      state.level += 1;
      state.xpToNext = Math.round(state.xpToNext * 1.25);
      leveledUp = true;
    }
    renderXpBar();
    if (leveledUp) triggerLevelUp();
  }

  /* ---------------------------------------------------------
   * 8. LEVEL UP OVERLAY
   * ------------------------------------------------------- */
  function triggerLevelUp() {
    levelUpText.textContent = `You reached Level ${state.level}`;
    levelUpOverlay.classList.add("active");
    spawnParticles(document.body, 60);
    setTimeout(() => {
      levelUpOverlay.classList.remove("active");
    }, 1000);
  }

  /* ---------------------------------------------------------
   * 9. PARTICLE CELEBRATION
   * ------------------------------------------------------- */
  const PARTICLE_COLORS = ["#ff3b5c", "#3b9eff", "#33ff8c", "#ffd23b", "#b06bff", "#ffffff"];

  function spawnParticles(anchorEl, count) {
    const rect = anchorEl.getBoundingClientRect
      ? anchorEl.getBoundingClientRect()
      : { left: window.innerWidth / 2, top: window.innerHeight / 2, width: 0, height: 0 };
    const originX = rect.left + rect.width / 2;
    const originY = rect.top + rect.height / 2;
    const n = count || 22;

    for (let i = 0; i < n; i++) {
      const p = document.createElement("div");
      p.className = "particle";
      const size = 4 + Math.random() * 6;
      const angle = Math.random() * Math.PI * 2;
      const distance = 60 + Math.random() * 160;
      const dx = Math.cos(angle) * distance;
      const dy = Math.sin(angle) * distance - 40;
      const rot = (Math.random() * 720 - 360) + "deg";
      const duration = 0.6 + Math.random() * 0.6;

      p.style.left = originX + "px";
      p.style.top = originY + "px";
      p.style.width = size + "px";
      p.style.height = size + "px";
      p.style.background = PARTICLE_COLORS[Math.floor(Math.random() * PARTICLE_COLORS.length)];
      p.style.setProperty("--dx", dx + "px");
      p.style.setProperty("--dy", dy + "px");
      p.style.setProperty("--rot", rot);
      p.style.animationDuration = duration + "s";

      particlesContainer.appendChild(p);
      setTimeout(() => p.remove(), duration * 1000 + 50);
    }
  }

  /* ---------------------------------------------------------
   * 10. LEADERBOARD (with FLIP slide animation)
   * ------------------------------------------------------- */
  function getLeaderboardRows(cat) {
    const rows = state.rivals.map((r) => ({ name: r.name, value: r[cat], isUser: false }));
    rows.push({ name: "You", value: state.stats[cat], isUser: true });
    rows.sort((a, b) => b.value - a.value);
    return rows;
  }

  function renderLeaderboard(animate) {
    const cat = state.activeTab;
    const rows = getLeaderboardRows(cat);

    // FLIP: record first positions of existing rows by key
    const firstRects = {};
    if (animate) {
      $$(".rank-row", leaderboardListEl).forEach((el) => {
        firstRects[el.dataset.key] = el.getBoundingClientRect().top;
      });
    }

    leaderboardListEl.innerHTML = "";
    rows.forEach((row, idx) => {
      const li = document.createElement("li");
      li.className = "rank-row" + (row.isUser ? " is-user" : "");
      li.dataset.key = row.name;
      li.innerHTML = `
        <span class="rank-num">${idx + 1}</span>
        <span class="rank-name">${escapeHtml(row.name)}</span>
        <span class="rank-value">${row.value}</span>
      `;
      leaderboardListEl.appendChild(li);
    });

    if (animate) {
      $$(".rank-row", leaderboardListEl).forEach((el) => {
        const first = firstRects[el.dataset.key];
        if (first === undefined) return;
        const last = el.getBoundingClientRect().top;
        const delta = first - last;
        if (delta !== 0) {
          el.style.transform = `translateY(${delta}px)`;
          requestAnimationFrame(() => {
            el.style.transform = "translateY(0)";
            if (delta > 0 && el.classList.contains("is-user")) {
              el.classList.add("rank-up");
              setTimeout(() => el.classList.remove("rank-up"), 800);
            }
          });
        }
      });
    }
  }

  function setupLeaderboardTabs() {
    $$(".tab").forEach((tab) => {
      tab.addEventListener("click", () => {
        $$(".tab").forEach((t) => t.classList.remove("active"));
        tab.classList.add("active");
        state.activeTab = tab.dataset.cat;
        saveState();
        renderLeaderboard(false);
      });
    });
  }

  // subtle rival "activity" so the leaderboard feels alive over time
  function driftRivals() {
    const now = Date.now();
    const elapsedMinutes = (now - state.lastRivalDrift) / 60000;
    if (elapsedMinutes < 1) return;
    state.rivals.forEach((r) => {
      CATEGORIES.forEach((cat) => {
        if (Math.random() < 0.3) r[cat] += Math.floor(Math.random() * 3);
      });
    });
    state.lastRivalDrift = now;
    saveState();
    renderLeaderboard(true);
  }

  /* ---------------------------------------------------------
   * 11. AI CHARACTER ANALYSIS (premium unlock)
   * ------------------------------------------------------- */
  function generateAiAnalysis() {
    const entries = CATEGORIES.map((c) => ({ cat: c, val: state.stats[c] }));
    entries.sort((a, b) => b.val - a.val);
    const strongest = entries[0];
    const weakest = entries[entries.length - 1];
    const labels = {
      strength: "physical discipline",
      intelligence: "cognitive growth",
      aesthetics: "self-image investment",
      finance: "financial control",
    };

    if (strongest.val === 0 && weakest.val === 0) {
      return "No data yet — complete a few quests and your AI behavior profile will generate automatically, highlighting your strongest trait and your biggest hidden risk.";
    }

    return `Your attributes indicate strong ${labels[strongest.cat]} (${strongest.val} XP) but a measurable vulnerability in ${labels[weakest.cat]} (${weakest.val} XP). At your current pace, this gap will compound over the next 30 days. Recommended focus: 2 extra ${CATEGORY_META[weakest.cat].label} quests per week to rebalance your profile before it limits overall growth velocity.`;
  }

  function updateAiAnalysis() {
    aiAnalysisText.textContent = generateAiAnalysis();
    const unlocked = isPremiumActive();
    aiAnalysisCard.classList.toggle("is-unlocked", unlocked);
    aiAnalysisText.classList.toggle("blurred", !unlocked);
    aiAnalysisText.classList.toggle("unlocked", unlocked);
  }

  /* ---------------------------------------------------------
   * 12. PREDICTIVE STAT VELOCITY CHART (premium unlock)
   * ------------------------------------------------------- */
  function updateVelocityChart() {
    const unlocked = isPremiumActive();
    velocityCanvas.classList.toggle("unlocked", unlocked);
    velocityCard.classList.toggle("is-unlocked", unlocked);
    drawVelocityChart(unlocked);
  }

  function drawVelocityChart(unlocked) {
    const ctx = velocityCanvas.getContext("2d");
    const w = velocityCanvas.width;
    const h = velocityCanvas.height;
    ctx.clearRect(0, 0, w, h);

    // background grid
    ctx.strokeStyle = "rgba(255,255,255,0.06)";
    ctx.lineWidth = 1;
    for (let i = 1; i < 5; i++) {
      const y = (h / 5) * i;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }

    // simulate historical + projected totalXp trend from current total stats
    const total = CATEGORIES.reduce((s, c) => s + state.stats[c], 0);
    const points = 14;
    const history = [];
    for (let i = 0; i < points; i++) {
      const base = Math.max(0, total - (points - i) * (total / points || 4));
      const noise = Math.sin(i * 1.3) * (total * 0.03 + 2);
      history.push(base + noise);
    }
    history.push(total);
    // projection (dashed) beyond today
    const projection = [];
    let lastVal = total;
    for (let i = 0; i < 6; i++) {
      lastVal += (total * 0.08 + 6);
      projection.push(lastVal);
    }

    const allVals = history.concat(projection);
    const maxVal = Math.max(...allVals, 10);
    const totalPoints = history.length + projection.length;
    const stepX = w / (totalPoints - 1);

    function toY(v) {
      return h - 20 - (v / maxVal) * (h - 40);
    }

    // solid historical line
    const gradient = ctx.createLinearGradient(0, 0, w, 0);
    gradient.addColorStop(0, "#3b9eff");
    gradient.addColorStop(1, "#b06bff");
    ctx.strokeStyle = unlocked ? gradient : "rgba(255,255,255,0.5)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    history.forEach((v, i) => {
      const x = i * stepX;
      const y = toY(v);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();

    // dashed projection line
    ctx.setLineDash([6, 6]);
    ctx.strokeStyle = unlocked ? "#ffd23b" : "rgba(255,255,255,0.35)";
    ctx.beginPath();
    const startX = (history.length - 1) * stepX;
    const startY = toY(history[history.length - 1]);
    ctx.moveTo(startX, startY);
    projection.forEach((v, i) => {
      const x = (history.length + i) * stepX;
      const y = toY(v);
      ctx.lineTo(x, y);
    });
    ctx.stroke();
    ctx.setLineDash([]);

    if (unlocked) {
      ctx.fillStyle = "rgba(255,210,59,0.9)";
      ctx.font = "11px sans-serif";
      ctx.fillText("Projected: Top 10 in ~12 days", startX - 40, startY - 10);
    }
  }

  /* ---------------------------------------------------------
   * 13. SKILL TREES (premium modal)
   * ------------------------------------------------------- */
  const SKILL_TREE_CONTENT = {
    finance: {
      title: "🟡 30-Day Financial Engine",
      body: `<ul>
        <li>Daily micro-budget check-ins with auto-generated savings targets</li>
        <li>AI-tuned "no-spend streak" challenges calibrated to your habits</li>
        <li>Compound growth simulator for your Finance stat</li>
        <li>Weekly AI coaching notes on your biggest money leaks</li>
      </ul>`,
    },
    aesthetics: {
      title: "🟢 Elite Aesthetic Glow-Up",
      body: `<ul>
        <li>Personalized 30-day grooming & style progression plan</li>
        <li>Before/after stat velocity tracking for Aesthetics</li>
        <li>Priority placement boosts on the Aesthetics leaderboard</li>
        <li>Weekly AI-curated glow-up checklist</li>
      </ul>`,
    },
    focus: {
      title: "🟣 Monk Mode Focus",
      body: `<ul>
        <li>Distraction-lockout timer with streak multipliers</li>
        <li>Deep work session XP bonuses (up to 3x)</li>
        <li>AI-generated daily focus targets based on your weakest stat</li>
        <li>Exclusive "Monk Mode" leaderboard badge</li>
      </ul>`,
    },
  };

  function setupSkillTrees() {
    $$(".skilltree").forEach((el) => {
      el.addEventListener("click", () => {
        const key = el.dataset.tree;
        if (isPremiumActive()) {
          el.classList.add("unlocked");
          return;
        }
        const content = SKILL_TREE_CONTENT[key];
        openPremiumModal(content.title, content.body);
      });
    });
  }

  function refreshSkillTreeLocks() {
    $$(".skilltree").forEach((el) => el.classList.toggle("unlocked", isPremiumActive()));
  }

  /* ---------------------------------------------------------
   * 14. PREMIUM MODAL (shared) + UPGRADE FLOW
   * ------------------------------------------------------- */
  const premiumModal = $("#premiumModal");
  const modalTitle = $("#modalTitle");
  const modalBody = $("#modalBody");
  const modalUpgradeBtn = $("#modalUpgradeBtn");

  const GENERIC_MODAL_CONTENT = {
    ai: {
      title: "🧠 AI Character Analysis",
      body: `<ul>
        <li>Full behavioral breakdown across all 4 stats, refreshed daily</li>
        <li>Root-cause analysis of your weakest attribute</li>
        <li>Personalized 14-day correction plan</li>
        <li>Trend alerts before a stat falls behind</li>
      </ul>`,
    },
    velocity: {
      title: "📈 Advanced Analytics & AI Coaching",
      body: `<ul>
        <li>Predictive stat velocity charts for all 4 attributes</li>
        <li>Projected Top-10 leaderboard rank timeline</li>
        <li>Weekly AI coaching digest with concrete next actions</li>
        <li>Historical trend export</li>
      </ul>`,
    },
  };

  function openPremiumModal(title, bodyHtml) {
    modalTitle.textContent = title;
    modalBody.innerHTML = bodyHtml;
    premiumModal.classList.add("active");
  }

  function setupPremiumModalTriggers() {
    $$("[data-modal]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const key = btn.dataset.modal;
        const content = GENERIC_MODAL_CONTENT[key];
        openPremiumModal(content.title, content.body);
      });
    });
    $("#premiumModalClose").addEventListener("click", () => premiumModal.classList.remove("active"));
    premiumModal.addEventListener("click", (e) => {
      if (e.target === premiumModal) premiumModal.classList.remove("active");
    });
    modalUpgradeBtn.addEventListener("click", startUpgradeCheckout);
  }

  function startUpgradeCheckout() {
    if (!STRIPE_PAYMENT_LINK || STRIPE_PAYMENT_LINK.includes("REPLACE_WITH_YOUR_LINK")) {
      alert(
        "Payments aren't configured yet.\n\nSet STRIPE_PAYMENT_LINK at the top of app.js to your real Stripe Payment Link. See SETUP_PAYMENTS.md for step-by-step instructions."
      );
      return;
    }
    window.open(STRIPE_PAYMENT_LINK, "_blank", "noopener");
  }

  // Handle return redirect from Stripe Payment Link (?upgraded=1)
  function checkUpgradeRedirect() {
    const params = new URLSearchParams(window.location.search);
    if (params.get("upgraded") === "1") {
      state.premium = true;
      saveState();
      params.delete("upgraded");
      const newUrl = window.location.pathname + (params.toString() ? "?" + params.toString() : "");
      window.history.replaceState({}, document.title, newUrl);
    }
  }

  /* ---------------------------------------------------------
   * 15. PREVIEW PREMIUM TOGGLE (non-payment, local demo only)
   * ------------------------------------------------------- */
  function refreshPreviewButton() {
    previewPremiumBtn.textContent = state.premiumPreview ? "🎭 Exit Premium Preview" : "🎭 Preview Premium";
    previewPremiumBtn.style.opacity = state.premium ? "0.5" : "1";
  }

  function setupPreviewToggle() {
    previewPremiumBtn.addEventListener("click", () => {
      if (state.premium) return; // already real premium, nothing to preview
      state.premiumPreview = !state.premiumPreview;
      saveState();
      refreshPreviewButton();
      updateAiAnalysis();
      updateVelocityChart();
      refreshSkillTreeLocks();
    });
  }

  /* ---------------------------------------------------------
   * 16. ADD CUSTOM QUEST MODAL
   * ------------------------------------------------------- */
  const addQuestModal = $("#addQuestModal");

  function setupAddQuestModal() {
    $("#addQuestBtn").addEventListener("click", () => addQuestModal.classList.add("active"));
    $("#addQuestModalClose").addEventListener("click", () => addQuestModal.classList.remove("active"));
    addQuestModal.addEventListener("click", (e) => {
      if (e.target === addQuestModal) addQuestModal.classList.remove("active");
    });

    $("#questSubmitBtn").addEventListener("click", () => {
      const nameInput = $("#questNameInput");
      const name = nameInput.value.trim();
      if (!name) {
        nameInput.focus();
        return;
      }
      const category = $("#questCategoryInput").value;
      const xp = parseInt($("#questXpInput").value, 10);

      state.habits.push({
        id: "custom_" + Date.now(),
        name,
        category,
        xp,
        custom: true,
        lastCompleted: null,
      });
      saveState();
      renderHabits();

      nameInput.value = "";
      addQuestModal.classList.remove("active");
    });
  }

  /* ---------------------------------------------------------
   * 17. LEGAL MODAL
   * ------------------------------------------------------- */
  function setupLegalModal() {
    const legalModal = $("#legalModal");
    $("#legalBtn").addEventListener("click", () => legalModal.classList.add("active"));
    $("#legalModalClose").addEventListener("click", () => legalModal.classList.remove("active"));
    legalModal.addEventListener("click", (e) => {
      if (e.target === legalModal) legalModal.classList.remove("active");
    });
  }

  /* ---------------------------------------------------------
   * 18. INIT
   * ------------------------------------------------------- */
  function init() {
    checkUpgradeRedirect();

    renderXpBar();
    renderStats();
    renderHabits();
    renderLeaderboard(false);
    updateAiAnalysis();
    updateVelocityChart();
    refreshSkillTreeLocks();
    refreshPreviewButton();

    setupLeaderboardTabs();
    setupSkillTrees();
    setupPremiumModalTriggers();
    setupPreviewToggle();
    setupAddQuestModal();
    setupLegalModal();

    // keep the active tab UI in sync with saved state on load
    $$(".tab").forEach((t) => t.classList.toggle("active", t.dataset.cat === state.activeTab));

    // subtle background rival activity, checked periodically
    setInterval(driftRivals, 60 * 1000);

    saveState();
  }

  document.addEventListener("DOMContentLoaded", init);
})();
