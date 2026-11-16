/* Courtside Manager — continuous 2D top-down court (players run offense & defense, hot/cold glows) */
'use strict';

const Court = {
  cv: null, ctx: null, W: 0, H: 0, raf: 0, dots: {}, ball: null, lastNow: 0, m: null,
  attach(cv, m) {
    if (this.m !== m) { this.dots = {}; this.ball = null; }
    this.cv = cv; this.m = m;
    const dpr = window.devicePixelRatio || 1;
    const pe = cv.parentElement, cs = getComputedStyle(pe);
    const w = Math.floor((pe.clientWidth - parseFloat(cs.paddingLeft || 0) - parseFloat(cs.paddingRight || 0)) || 340);
    this.W = w; this.H = Math.round(w * 50 / 94);
    cv.width = Math.round(this.W * dpr); cv.height = Math.round(this.H * dpr);
    cv.style.width = this.W + 'px'; cv.style.height = this.H + 'px';
    this.ctx = cv.getContext('2d'); this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (!cv._tap) { cv._tap = true; cv.style.cursor = 'pointer'; cv.addEventListener('click', (e) => { // tap a player's dot to see his game
      const r = cv.getBoundingClientRect(), fx = (e.clientX - r.left) / r.width * 94, fy = (e.clientY - r.top) / r.height * 50;
      let best = null, bd = 6;
      for (const id in this.dots) { const d = this.dots[id]; if (d.a < 0.5 || d.y > 50) continue; const dd = Math.hypot(d.x - fx, Math.min(d.y, 49.5) - fy); if (dd < bd) { bd = dd; best = +id; } }
      if (best != null && typeof livePlayerCard === 'function') livePlayerCard(best);
    }); }
    if (!this.raf) { this.lastNow = performance.now(); this.loop(); }
  },
  loop() {
    this.raf = requestAnimationFrame(() => this.loop());
    if (!this.cv || !this.cv.isConnected) { cancelAnimationFrame(this.raf); this.raf = 0; return; }
    const now = performance.now();
    const dt = Math.min(0.1, (now - this.lastNow) / 1000); this.lastNow = now;
    this.draw(now, dt);
  },
  X(x) { return (x / 94) * this.W; }, Y(y) { return (y / 50) * this.H; },

  /* ---------- drawing primitives ---------- */
  drawCourt() {
    const c = this.ctx, W = this.W, H = this.H;
    const g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#222b38'); g.addColorStop(1, '#1a212c');
    c.fillStyle = g; c.fillRect(0, 0, W, H);
    c.strokeStyle = 'rgba(255,255,255,.28)'; c.lineWidth = 1.2;
    c.strokeRect(1, 1, W - 2, H - 2);
    c.beginPath(); c.moveTo(W / 2, 0); c.lineTo(W / 2, H); c.stroke();
    c.beginPath(); c.arc(W / 2, H / 2, this.X(6), 0, Math.PI * 2); c.stroke();
    for (const side of [0, 1]) {
      const bx = side ? 88.75 : 5.25, dir = side ? -1 : 1, base = side ? 94 : 0;
      c.fillStyle = 'rgba(255,255,255,.05)';
      const px = side ? this.X(94 - 19) : 0;
      c.fillRect(px, this.Y(17), this.X(19), this.Y(16)); c.strokeRect(px, this.Y(17), this.X(19), this.Y(16));
      c.beginPath(); c.arc(this.X(base + dir * 19), this.Y(25), this.X(6), 0, Math.PI * 2); c.stroke();
      const ang = Math.asin(22 / 23.75);
      c.beginPath();
      c.moveTo(this.X(base), this.Y(3)); c.lineTo(this.X(bx + dir * Math.cos(ang) * 23.75), this.Y(3));
      if (side) c.arc(this.X(bx), this.Y(25), this.X(23.75), Math.PI + ang, Math.PI - ang, true);
      else c.arc(this.X(bx), this.Y(25), this.X(23.75), -ang, ang);
      c.lineTo(this.X(base), this.Y(47)); c.stroke();
      c.beginPath(); c.moveTo(this.X(base + dir * 4), this.Y(22)); c.lineTo(this.X(base + dir * 4), this.Y(28)); c.stroke();
      c.strokeStyle = '#ff8c2a'; c.beginPath(); c.arc(this.X(bx), this.Y(25), Math.max(2.5, this.X(0.9)), 0, Math.PI * 2); c.stroke();
      c.strokeStyle = 'rgba(255,255,255,.28)';
    }
  },
  dot(x, y, team, label, heat, opts = {}) {
    const c = this.ctx, r = Math.max(7, this.W / 48);
    const px = this.X(x), py = this.Y(y);
    const now = performance.now();
    c.globalAlpha = opts.alpha ?? 1;
    if (heat > 0.25 || heat < -0.25) {
      const fire = heat > 0, k = Math.min(1, (Math.abs(heat) - 0.25) / 0.45);
      const pulse = 0.8 + 0.2 * Math.sin(now / (fire ? 160 : 300));
      const col = fire ? `rgba(255,${Math.round(110 - 60 * k)},20,` : 'rgba(110,205,255,';
      const rr = r * (2 + k * 1.3) * pulse;
      const gr = c.createRadialGradient(px, py, r * 0.6, px, py, rr);
      gr.addColorStop(0, col + (0.55 * k + 0.25) + ')'); gr.addColorStop(1, col + '0)');
      c.fillStyle = gr; c.beginPath(); c.arc(px, py, rr, 0, Math.PI * 2); c.fill();
    }
    const fill = opts.fill || team.c1, trim = opts.trim || team.c2;
    c.fillStyle = fill; c.beginPath(); c.arc(px, py, r, 0, Math.PI * 2); c.fill();
    c.lineWidth = opts.focus ? 2.5 : 2; c.strokeStyle = opts.focus ? '#f2c94c' : (colorDist(trim, fill) > 60 ? trim : 'rgba(255,255,255,.55)'); c.stroke();
    c.fillStyle = readableOn(fill, trim); c.font = `800 ${Math.round(r * (label.length > 1 ? 0.92 : 1.05))}px -apple-system, Segoe UI, sans-serif`; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillText(label, px, py + 0.5);
    c.globalAlpha = 1;
  },
  drawBall(x, y, z = 0) {
    const c = this.ctx, r = Math.max(3, this.W / 110) * (1 + z * 0.8);
    if (z > 0.05) { c.fillStyle = 'rgba(0,0,0,.35)'; c.beginPath(); c.ellipse(this.X(x), this.Y(y), r, r * 0.5, 0, 0, Math.PI * 2); c.fill(); }
    c.fillStyle = '#ff8c2a'; c.beginPath(); c.arc(this.X(x), this.Y(y) - z * 16, r, 0, Math.PI * 2); c.fill();
    c.strokeStyle = 'rgba(0,0,0,.5)'; c.lineWidth = 0.8; c.stroke();
  },
  banner(txt) {
    const c = this.ctx;
    c.font = '800 11px -apple-system, Segoe UI, sans-serif';
    const w = c.measureText(txt).width + 22;
    c.fillStyle = 'rgba(10,12,16,.85)'; c.beginPath(); if (c.roundRect) c.roundRect(this.W / 2 - w / 2, 6, w, 20, 6); else c.rect(this.W / 2 - w / 2, 6, w, 20); c.fill();
    c.fillStyle = '#f2c94c'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(txt, this.W / 2, 16);
  },
  kit(m, si) { // away team wears its alternate when colours clash
    const H = m.sides[0].team, A = m.sides[1].team;
    if (si === 0) return [H.c1, H.c2];
    if (colorDist(H.c1, A.c1) > 90) return [A.c1, A.c2];
    const alt = colorDist(H.c1, A.c2) > 90 ? A.c2 : '#F4F4F4';
    return [alt, A.c1];
  },
  initials(p) { return p ? (Number.isInteger(p.num) ? String(p.num) : p.last.slice(0, 2)) : '?'; },

  /* ---------- positions ---------- */
  spot(i, att) { // offensive spots attacking the right basket (feet), mirrored for the left
    const OFF = [[66, 25], [73, 7], [75, 43], [80, 16], [84.5, 33]];
    const [x, y] = OFF[i] || [70, 25];
    return att === 0 ? [x, y] : [94 - x, y];
  },
  shotSpot(k, base, att, corner) {
    const bx = att === 0 ? 88.75 : 5.25;
    if (k === 'thr' && corner) return [att === 0 ? 88 : 6, base[1] > 25 ? 48 : 2];
    let ang = Math.atan2(base[1] - 25, base[0] - bx);
    if (Math.abs(Math.cos(ang)) < 0.05) ang = (att === 0 ? Math.PI : 0) + (base[1] > 25 ? -0.4 : 0.4);
    const r = k === 'thr' ? 25.5 : k === 'mid' ? 15 : 3.5;
    let x = bx + Math.cos(ang) * r, y = 25 + Math.sin(ang) * r;
    if (k === 'thr' && (y < 2.5 || y > 47.5)) { y = y < 25 ? 2 : 48; x = att === 0 ? 88 : 6; } // corner three
    if ((att === 0 && x > bx) || (att === 1 && x < bx)) x = bx + (att === 0 ? -1 : 1) * Math.abs(x - bx);
    return [x, y];
  },
  // off-ball movement for each half-court play (screens, rolls, drives, cuts, clear-outs)
  playMove(A, id, cur, u, att, mir, pos) {
    const sh = pos(A.p), rim = mir(87, 25), lerp = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t], k1 = clamp(u / 0.3, 0, 1);
    const pl = A.play;
    if (pl === 'pnr' && id === A.sc) return lerp(cur, [sh[0] + (att === 0 ? 2.2 : -2.2), sh[1] + (sh[1] > 25 ? -2 : 2)], k1); // sets the screen on the ball
    if ((pl === 'roll' || pl === 'pop') && id === A.ps) { // ball-handler comes off the shooter's screen, then gives it up
      return lerp(cur, mir(70, cur[1] > 25 ? 30 : 20), clamp(u / 0.34, 0, 1));
    }
    if (pl === 'kick' && id === A.ps) return lerp(cur, mir(80, 25 + (cur[1] > 25 ? 5 : -5)), clamp(u / 0.3, 0, 1)); // drives to collapse the defense
    if (pl === 'iso') { const away = cur[1] > 25 ? 44 : 6; return lerp(cur, mir(82, away), k1 * 0.9); } // clear out
    if (pl === 'post' && id === A.ps) return lerp(cur, mir(70, sh[1] > 25 ? 40 : 10), k1); // entry pass from the wing
    return cur;
  },
  current() {
    const L = Live, m = L.m; if (!m || !m.plog || !m.plog.length) return null;
    for (let i = m.plog.length - 1; i >= 0; i--) if (m.plog[i].g0 <= L.t) return m.plog[i];
    return null;
  },
  draw(now, dt) {
    if (!this.ctx) return;
    this.drawCourt();
    const L = Live, m = L.m; if (!m) return;
    const P = this.current();
    const nowS = now / 1000;
    const targets = {};
    const sideOf = {};
    let ballT = null, ballZ = 0, ballExact = false, focus = null;
    if (!P) { this.deadBall = false; this.rush = null; // jump ball
      m.sides.forEach((s, si) => ordered(s.on).forEach((p, i) => {
        const ang = (i / 5) * Math.PI * 2;
        targets[p.id] = i === 4 ? [47 + (si ? 1.2 : -1.2), 25] : [47 + (si ? 1 : -1) * (7 + Math.cos(ang) * 4), 25 + Math.sin(ang) * 9];
        sideOf[p.id] = si;
      }));
      ballT = [47, 25]; ballZ = 0.6 + 0.4 * Math.sin(nowS * 3); ballExact = true;
    } else {
      const acts = P.acts || [];
      let ai = -1; for (let i = 0; i < acts.length; i++) if (L.t >= acts[i].ts) ai = i;
      const A = ai >= 0 ? acts[ai] : null;
      const so = A ? A.s : P.oi;                       // side with the ball for this step
      const att = so === 0 ? 0 : 1, bx = att === 0 ? 88.75 : 5.25, rim = [bx, 25];
      const offIds = P.on[so] || [], defIds = P.on[1 - so] || [];
      const firstTs = acts.length ? acts[0].ts : P.g1;
      const setUp = clamp((L.t - P.g0) / Math.max(0.5, (firstTs - P.g0) * 0.7), 0, 1);
      const u = A ? clamp((L.t - A.ts) / Math.max(0.05, A.te - A.ts), 0, 1) : 0;
      const ft = A && A.t === 'ft'; this.deadBall = ft; this.rush = null;
      const mir = (x, y) => (att === 0 ? [x, y] : [94 - x, y]);
      const pos = (id) => { const d = this.dots[id]; return d ? [d.x, d.y] : targets[id] || [47, 25]; };
      const lerp = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
      // offense
      const laneO = [mir(80.5, 17.5), mir(80.5, 32.5), mir(66, 9), mir(66, 41)];
      let lo = 0;
      offIds.forEach((id, i) => {
        let [x, y] = this.spot(i, att);
        if (!A && setUp < 1 && so === P.oi && !P.fb) { const sx = att === 0 ? x - 40 : x + 40; x = sx + (x - sx) * setUp; }
        if (P.fb && !ft) { // fast break: everyone sprinting the floor, the runner out in front
          const lead = A && A.t === 'shot' && A.play === 'fast' ? A.p : null;
          const k = A ? 1 : setUp, lane = [[70, 25], [66, 8], [66, 42], [56, 18], [54, 32]][i];
          [x, y] = mir(...lane); const sx = att === 0 ? x - 34 : x + 34; x = sx + (x - sx) * k;
          if (id === lead && A.k === 'in') { [x, y] = mir(76, 25 + (i % 2 ? 4 : -4)); }
        }
        if (ft) { [x, y] = id === A.p ? mir(75, 25) : laneO[lo++ % 4]; }
        else {
          x += Math.sin(nowS * 0.8 + i * 1.9 + P.g0) * 2 * setUp; y += Math.cos(nowS * 0.6 + i * 1.3 + P.g0) * 2.4 * setUp;
          if (A && A.t === 'shot' && A.play && id !== A.p && u < 0.6) [x, y] = this.playMove(A, id, [x, y], u, att, mir, pos);
          if (A && A.t === 'shot' && id === A.p) { const sp = this.shotSpot(A.k, [x, y], att, A.corner); const k = clamp(u / 0.45, 0, 1);
            if ((A.play === 'roll' || A.play === 'pop') && u < 0.3) { const bh = pos(A.ps ?? A.p); const kk = clamp(u / 0.2, 0, 1); x += (bh[0] + (att === 0 ? 2 : -2) - x) * kk; y += (bh[1] - y) * kk; } // screen first
            else if (A.play === 'cut' && u < 0.45) { const wp = mir(85, y > 25 ? 42 : 8); if (u < 0.22) { const kk = u / 0.22; x += (wp[0] - x) * kk; y += (wp[1] - y) * kk; } else { const kk = (u - 0.22) / 0.23; x = wp[0] + (sp[0] - wp[0]) * kk; y = wp[1] + (sp[1] - wp[1]) * kk; } } // baseline cut
            else { x += (sp[0] - x) * k; y += (sp[1] - y) * k; }
            this.rush = { id, by: A.ts + (A.te - A.ts) * 0.5, snap: u >= 0.5 }; }
          if (A && A.t === 'reb' && A.off && id === A.p) { const k = clamp(u / 0.6, 0, 1); [x, y] = lerp([x, y], mir(84, y > 25 ? 28 : 22), k); }
        }
        targets[id] = [x, y]; sideOf[id] = so;
      });
      // defense: shadow their man, or line the lane on free throws
      const laneD = [mir(84, 17.5), mir(84, 32.5), mir(77, 17.5), mir(77, 32.5), mir(62, 25)];
      defIds.forEach((id, i) => {
        let x, y;
        if (ft) [x, y] = laneD[i];
        else {
          const o = this.dots[offIds[i]] || { x: targets[offIds[i]]?.[0] ?? 47, y: targets[offIds[i]]?.[1] ?? 25 };
          x = o.x + (bx - o.x) * 0.3; y = o.y + (25 - o.y) * 0.22;
          if (P.fb && (!A || (A.t === 'shot' && A.play === 'fast' && u < 0.7))) { x = o.x + (att === 0 ? -9 : 9) - i * (att === 0 ? 2 : -2); y = o.y + (i % 2 ? 3 : -3); } // beaten down the floor
          if (A && A.t === 'reb' && !A.off && id === A.p) { const k = clamp(u / 0.6, 0, 1); [x, y] = lerp([x, y], mir(83, y > 25 ? 27 : 23), k); }
          if (A && A.t === 'shot' && A.b === id) { const k = clamp((u - 0.5) / 0.3, 0, 1); [x, y] = lerp([x, y], pos(A.p), k * 0.7); }
          if (A && A.t === 'to' && A.st != null && A.st !== id && u > 0.62) { const k = clamp((u - 0.62) / 0.38, 0, 1); x = x + ((att === 0 ? 40 : 54) - x) * k * 0.6; }
          if (A && A.t === 'to' && A.st === id && u > 0.5) { const k = clamp((u - 0.62) / 0.38, 0, 1); x = x + ((att === 0 ? 30 : 64) - x) * k; y = y + (25 - y) * k * 0.5; } // picks it and runs
        }
        targets[id] = [x, y]; sideOf[id] = 1 - so;
      });
      // ball
      const pg = offIds[0];
      const hold = (id) => { const p = pos(id); ballT = [p[0] + 0.8, p[1] + 0.6]; ballZ = Math.abs(Math.sin(nowS * 9)) * 0.12; };
      const prev = ai > 0 ? acts[ai - 1] : null;
      if (!A) hold(pg);
      else if (A.t === 'shot') {
        const passer = A.ps != null ? A.ps : A.a;
        const from = passer != null && offIds.includes(passer) && passer !== A.p ? passer : prev && prev.t === 'reb' && prev.p === A.p ? A.p : A.play === 'pnr' || A.play === 'iso' || A.play === 'putback' ? A.p : A.play === 'fast' ? A.p : pg;
        const [p0, p1] = { kick: [0.3, 0.42], roll: [0.34, 0.46], cut: [0.32, 0.44], post: [0.08, 0.2], pop: [0.3, 0.42], fast: [0.12, 0.24] }[A.play] || [0.15, 0.3];
        if (from === A.p) { if (u < 0.6) hold(A.p); }
        else if (u < p0) hold(from);
        else if (u < p1) { ballT = lerp(pos(from), pos(A.p), (u - p0) / (p1 - p0)); ballZ = 0.2; ballExact = true; }
        else if (u < 0.6) hold(A.p);
        if (u >= 0.6) {
          const k = (u - 0.6) / 0.4, stop = A.b != null ? 0.45 : 1, kk = Math.min(k, stop);
          ballT = lerp(pos(A.p), rim, kk); ballZ = Math.sin(kk * Math.PI) * (A.k === 'thr' ? 1.3 : A.k === 'in' ? 0.5 : 0.9); ballExact = true;
          if (k > stop) { ballT = [ballT[0] + (att === 0 ? -1 : 1) * (k - stop) * 16, ballT[1] + (k - stop) * 12]; ballZ = 0.15; }
          if (u >= 1 && A.made) { ballT = [bx, 25 + Math.min(2.5, (L.t - A.te) * 3)]; ballZ = 0; }
        }
        focus = A.p;
      } else if (A.t === 'ft') {
        if (u < 0.55) hold(A.p);
        else { const k = (u - 0.55) / 0.45; ballT = lerp(pos(A.p), rim, k); ballZ = Math.sin(k * Math.PI) * 1.1; ballExact = true; if (u >= 1) { ballT = A.made ? [bx, 26.5] : [bx + (att === 0 ? -3 : 3), 25 + 3]; ballZ = 0; } }
        focus = A.p;
      } else if (A.t === 'reb') {
        if (u < 0.5) { ballT = lerp(rim, pos(A.p), u / 0.5); ballZ = 0.6 * (1 - u / 0.5); ballExact = true; } else hold(A.p);
        focus = A.p;
      } else if (A.t === 'to') {
        if (u < 0.5) hold(A.p);
        else if (A.st != null) { if (u < 0.62) { ballT = lerp(pos(A.p), pos(A.st), (u - 0.5) / 0.12); ballExact = true; } else hold(A.st); focus = A.st; }
        else { const p0 = pos(A.p); ballT = [p0[0], p0[1] > 25 ? 51 : -1]; }
      }
      // result flash right after each step, and a caption for the step in progress
      const done = acts.filter((a) => a.te <= L.t && L.t - a.te < 1.6).pop();
      if (done) this.flash = { txt: this.resultText(done), col: this.resultCol(done), at: done.t === 'ft' || done.t === 'shot' ? [done.s === 0 ? 88.75 : 5.25, 25] : pos(done.st ?? done.p), k: (L.t - done.te) / 1.6 };
      else this.flash = null;
      this.caption = A && L.t < A.te + 0.3 ? this.stepText(A, m) : !A ? (P.fb ? `${m.sides[so].team.abbr} on the fast break!` : `${m.sides[so].team.abbr} bring it up`) : null;
    }
    // bench for everyone else
    const rate = L.curRate || 6;
    const vmax = this.deadBall ? 70 : Math.min(45, 14 + rate * 1.1); // feet per real second — always a run, never a teleport (faster reset to the lane on free throws)
    m.sides.forEach((s, si) => s.list.forEach((p, i) => {
      if (!targets[p.id]) { targets[p.id] = [47 + (si ? 6 : -6) + (i % 5) * (si ? 1.6 : -1.6), 53]; sideOf[p.id] = si; }
    }));
    for (const id in targets) {
      const [tx, ty] = targets[id];
      let d = this.dots[id];
      const onCourt = ty < 51;
      if (!d) { const st = P && onCourt ? [47 + (sideOf[id] ? 6 : -6), 53] : [tx, ty]; d = this.dots[id] = { x: st[0], y: st[1], a: onCourt ? (P ? 0.2 : 1) : 0 }; }
      const dx = tx - d.x, dy = ty - d.y, dist = Math.hypot(dx, dy);
      let vm = vmax;
      const ru = this.rush && P && +id === this.rush.id ? this.rush : null;
      if (ru) { // the shooter must be standing on the exact spot (inside / beyond the arc) when he lets it go
        if (ru.snap) { d.x = tx; d.y = ty; }
        else vm = Math.max(vmax, dist / Math.max(0.04, (ru.by - L.t) / Math.max(0.5, rate)) * 1.15);
      }
      const step = Math.min(dist, vm * dt * (dist < 1.5 && !ru ? 0.6 : 1));
      if (dist > 0.01) { d.x += (dx / dist) * step; d.y += (dy / dist) * step; }
      d.a += ((onCourt ? 1 : 0) - d.a) * Math.min(1, dt * 3);
    }
    const onIds = new Set(m.sides.flatMap((s) => s.on.map((p) => p.id)));
    if (m.rv) for (const id of onIds) for (const o of m.rv[id] || []) if (onIds.has(o) && id < o && this.dots[id] && this.dots[o]) {
      const c = this.ctx, r = Math.max(7, this.W / 48) + 4; c.strokeStyle = 'rgba(255,82,82,.85)'; c.lineWidth = 1.5; c.setLineDash([3, 3]);
      for (const q of [this.dots[id], this.dots[o]]) { c.beginPath(); c.arc(this.X(q.x), this.Y(Math.min(q.y, 49.5)), r, 0, Math.PI * 2); c.stroke(); }
      c.setLineDash([]);
    }
    for (const id in this.dots) {
      const d = this.dots[id]; if (d.a < 0.03) continue;
      const si = sideOf[id]; if (si == null) continue;
      const s = m.sides[si], p = S.players[id];
      const kit = this.kit(m, si);
      this.dot(d.x, Math.min(d.y, 49.5), s.team, this.initials(p), s.heat[id] || 0, { alpha: d.a * (m.ej[id] ? 0.35 : 1), focus: focus === +id, fill: kit[0], trim: kit[1] });
    }
    if (ballT) {
      if (!this.ball || ballExact) this.ball = { x: ballT[0], y: ballT[1] };
      else { const dx = ballT[0] - this.ball.x, dy = ballT[1] - this.ball.y, dist = Math.hypot(dx, dy), st = Math.min(dist, Math.max(70 * dt, dist * Math.min(1, dt * 8))); if (dist > 0.01) { this.ball.x += dx / dist * st; this.ball.y += dy / dist * st; } }
      this.drawBall(this.ball.x, this.ball.y, ballZ);
    }
    if (this.flash) this.floatText(this.flash.txt, this.flash.at[0], this.flash.at[1], this.flash.col, this.flash.k);
    if (P && this.caption) this.captionBar(this.caption);
    if (L.hlLabel) this.banner(`★ ${L.hlLabel}`);
  },
  who(id) { const p = S.players[id]; return p ? `#${p.num ?? ''} ${p.last}` : '?'; },
  stepText(a) {
    if (a.t === 'shot') {
      const z = a.k === 'thr' ? (a.corner ? 'corner 3' : '3-point attempt') : a.k === 'mid' ? '2-point jumper' : '2 at the rim';
      const pl = { fast: 'Fast break', pnr: 'Pick & roll', roll: 'Pick & roll — the roll man', pop: 'Pick & pop', kick: 'Drive & kick', cut: 'Backdoor cut', post: 'Post-up', iso: 'Isolation', putback: 'Putback', spot: 'Ball movement' }[a.play];
      return `${this.who(a.p)} · ${pl ? pl + ' · ' : ''}${z}`;
    }
    if (a.t === 'ft') return `${this.who(a.p)} · ${a.tech ? 'Technical free throw' : a.and1 ? 'And-one free throw' : `Free throw ${a.n} of ${a.of}`}`;
    if (a.t === 'reb') return `${this.who(a.p)} · ${a.off ? 'Offensive rebound' : 'Defensive rebound'}`;
    if (a.t === 'to') return a.st != null ? `${this.who(a.st)} · Steal — and he's off!` : `${this.who(a.p)} · Turnover`;
    return '';
  },
  resultText(a) {
    if (a.t === 'shot') return a.made ? (a.foul ? `+${a.pts} AND-1` : `+${a.pts}`) : a.b != null ? 'BLOCKED' : a.foul ? 'FOUL' : 'MISS';
    if (a.t === 'ft') return a.made ? `✓ FT +1` : '✗ FT';
    if (a.t === 'reb') return a.off ? 'O-REB' : 'REB';
    if (a.t === 'to') return a.st != null ? 'STEAL' : 'TURNOVER';
    return '';
  },
  resultCol(a) { return (a.t === 'shot' && a.made) || (a.t === 'ft' && a.made) ? '#4cc38a' : a.t === 'reb' ? '#c6cbd8' : a.t === 'to' ? '#9fd0ff' : '#f06a6a'; },
  floatText(t, x, y, col, k) { const c = this.ctx; c.globalAlpha = Math.max(0, 1 - k); c.fillStyle = col; c.font = '900 14px -apple-system, Segoe UI, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(t, this.X(x), this.Y(y) - 16 - k * 14); c.globalAlpha = 1; },
  captionBar(t) {
    const c = this.ctx; c.font = '700 11px -apple-system, Segoe UI, sans-serif';
    const w = c.measureText(t).width + 18;
    c.fillStyle = 'rgba(10,12,16,.8)'; c.beginPath(); if (c.roundRect) c.roundRect(8, this.H - 26, w, 19, 5); else c.rect(8, this.H - 26, w, 19); c.fill();
    c.fillStyle = '#e7e9ef'; c.textAlign = 'left'; c.textBaseline = 'middle'; c.fillText(t, 17, this.H - 16.5);
  },
};
