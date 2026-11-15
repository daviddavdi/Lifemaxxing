/* Courtside Manager — continuous 2D top-down court (players run offense & defense, hot/cold glows) */
'use strict';

const Court = {
  cv: null, ctx: null, W: 0, H: 0, raf: 0, dots: {}, ball: null, lastNow: 0, m: null,
  attach(cv, m) {
    if (this.m !== m) { this.dots = {}; this.ball = null; }
    this.cv = cv; this.m = m;
    const dpr = window.devicePixelRatio || 1;
    const w = cv.parentElement.clientWidth || 340;
    this.W = w; this.H = Math.round(w * 50 / 94);
    cv.width = Math.round(this.W * dpr); cv.height = Math.round(this.H * dpr);
    cv.style.width = this.W + 'px'; cv.style.height = this.H + 'px';
    this.ctx = cv.getContext('2d'); this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
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
    c.fillStyle = team.c1; c.beginPath(); c.arc(px, py, r, 0, Math.PI * 2); c.fill();
    c.lineWidth = opts.focus ? 2.5 : 1.2; c.strokeStyle = opts.focus ? '#f2c94c' : 'rgba(255,255,255,.55)'; c.stroke();
    c.fillStyle = team.c2; c.font = `800 ${Math.round(r * (label.length > 1 ? 0.92 : 1.05))}px -apple-system, Segoe UI, sans-serif`; c.textAlign = 'center'; c.textBaseline = 'middle';
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
  initials(p) { return p ? (Number.isInteger(p.num) ? String(p.num) : p.last.slice(0, 2)) : '?'; },

  /* ---------- positions ---------- */
  spot(i, att) { // offensive spots attacking the right basket (feet), mirrored for the left
    const OFF = [[66, 25], [73, 7], [75, 43], [80, 16], [84.5, 33]];
    const [x, y] = OFF[i] || [70, 25];
    return att === 0 ? [x, y] : [94 - x, y];
  },
  shotSpot(k, base, att) {
    const r = (x, y) => (att === 0 ? [x, y] : [94 - x, y]);
    if (k === 'in') return r(85, base[1] > 25 ? 27 : 23);
    if (k === 'mid') return r(76, base[1] > 25 ? 31 : 19);
    if (k === 'ft') return r(75, 25);
    const bx = att === 0 ? 88.75 : 5.25;
    return Math.hypot(base[0] - bx, base[1] - 25) < 23 ? r(66, base[1] > 25 ? 40 : 10) : base;
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
    if (!P) { // jump ball
      m.sides.forEach((s, si) => ordered(s.on).forEach((p, i) => {
        const ang = (i / 5) * Math.PI * 2;
        targets[p.id] = i === 4 ? [47 + (si ? 1.2 : -1.2), 25] : [47 + (si ? 1 : -1) * (7 + Math.cos(ang) * 4), 25 + Math.sin(ang) * 9];
        sideOf[p.id] = si;
      }));
      ballT = [47, 25]; ballZ = 0.6 + 0.4 * Math.sin(nowS * 3); ballExact = true;
    } else {
      const oi = P.oi, att = oi === 0 ? 0 : 1;
      const bx = att === 0 ? 88.75 : 5.25;
      const len = Math.max(1, P.g1 - P.g0), u = clamp((L.t - P.g0) / len, 0, 1);
      const out = P.out || {};
      const offIds = P.on[oi] || [], defIds = P.on[1 - oi] || [];
      const shooter = offIds.includes(out.p) ? out.p : offIds[Math.floor(P.g0) % Math.max(1, offIds.length)];
      const setUp = Math.min(1, u / 0.2);
      offIds.forEach((id, i) => {
        let [x, y] = this.spot(i, att);
        // transition: start from the other half and flow into the half court
        if (setUp < 1) { const sx = att === 0 ? x - 40 : x + 40; x = sx + (x - sx) * setUp; }
        x += Math.sin(nowS * 0.8 + i * 1.9 + P.g0) * 2.2 * setUp; y += Math.cos(nowS * 0.6 + i * 1.3 + P.g0) * 2.6 * setUp;
        if (id === shooter && out.k && out.k !== 'to' && u > 0.6) { const s = this.shotSpot(out.k, [x, y], att); const k = clamp((u - 0.6) / 0.18, 0, 1); x += (s[0] - x) * k; y += (s[1] - y) * k; }
        if (out.k === 'to' && out.s == null && id === out.p && u > 0.55) { y += (y > 25 ? 1 : -1) * (u - 0.55) * 30; }
        targets[id] = [x, y]; sideOf[id] = oi;
      });
      defIds.forEach((id, i) => {
        const o = this.dots[offIds[i]] || { x: targets[offIds[i]]?.[0] ?? 47, y: targets[offIds[i]]?.[1] ?? 25 };
        let x = o.x + (bx - o.x) * 0.3, y = o.y + (25 - o.y) * 0.22;
        if (out.k === 'to' && id === out.s && u > 0.6) { x = att === 0 ? 30 - (u - 0.6) * 20 : 64 + (u - 0.6) * 20; y = 25; }
        targets[id] = [x, y]; sideOf[id] = 1 - oi;
      });
      // ball: PG brings it up, swings it, finds the shooter
      const pg = offIds[0];
      let mid = out.a && out.a !== shooter && offIds.includes(out.a) ? out.a : offIds[(Math.floor(P.g0 * 7) % 4) + 1] || pg;
      if (mid === shooter) mid = pg;
      const pos = (id) => { const d = this.dots[id]; return d ? [d.x, d.y] : targets[id] || [47, 25]; };
      const lerp = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
      const hold = (id) => { const p = pos(id); ballT = [p[0] + 0.8, p[1] + 0.6]; ballZ = Math.abs(Math.sin(nowS * 9)) * 0.12; };
      if (out.k === 'to') {
        if (u < 0.35) hold(pg);
        else if (u < 0.42) { ballT = lerp(pos(pg), pos(mid), (u - 0.35) / 0.07); ballZ = 0.2; ballExact = true; }
        else if (u < 0.55) hold(mid);
        else if (out.s != null) { if (u < 0.6) { ballT = lerp(pos(mid), pos(out.s), (u - 0.55) / 0.05); ballExact = true; } else hold(out.s); focus = out.s; }
        else { ballT = [pos(out.p)[0], pos(out.p)[1] > 25 ? 51 : -1]; ballExact = false; }
      } else if (out.k) {
        const rim = [bx, 25];
        if (u < 0.33) hold(pg);
        else if (u < 0.4) { ballT = lerp(pos(pg), pos(mid), (u - 0.33) / 0.07); ballZ = 0.2; ballExact = true; }
        else if (u < 0.55) hold(mid);
        else if (u < 0.62) { ballT = lerp(pos(mid), pos(shooter), (u - 0.55) / 0.07); ballZ = 0.2; ballExact = true; }
        else if (u < 0.8) hold(shooter);
        else if (u < 0.9) {
          const k = (u - 0.8) / 0.1, stop = out.b != null ? 0.55 : 1;
          const kk = Math.min(k, stop);
          ballT = lerp(pos(shooter), rim, kk); ballZ = Math.sin(kk * Math.PI) * (out.k === 'thr' ? 1.3 : out.k === 'in' ? 0.6 : 0.9); ballExact = true;
          if (k > stop) { ballT = [ballT[0] + (att === 0 ? -1 : 1) * (k - stop) * 18, ballT[1] + (k - stop) * 14]; ballZ = 0.2; }
        } else if (out.made) { ballT = [bx, 25 + (u - 0.9) * 12]; ballZ = 0; ballExact = true; }
        else if (out.r != null) { ballT = lerp(rim, pos(out.r), (u - 0.9) / 0.1); ballZ = 0.4 * (1 - (u - 0.9) / 0.1); ballExact = true; }
        else { ballT = [bx + (att === 0 ? -6 : 6) * (u - 0.9) * 10, 25]; ballExact = true; }
        focus = L.hlLabel ? shooter : null;
      } else hold(pg);
    }
    // bench for everyone else
    const rate = L.curRate || 6;
    const vmax = Math.min(45, 14 + rate * 1.1); // feet per real second — always a run, never a teleport
    m.sides.forEach((s, si) => s.list.forEach((p, i) => {
      if (!targets[p.id]) { targets[p.id] = [47 + (si ? 6 : -6) + (i % 5) * (si ? 1.6 : -1.6), 53]; sideOf[p.id] = si; }
    }));
    for (const id in targets) {
      const [tx, ty] = targets[id];
      let d = this.dots[id];
      const onCourt = ty < 51;
      if (!d) { const st = P && onCourt ? [47 + (sideOf[id] ? 6 : -6), 53] : [tx, ty]; d = this.dots[id] = { x: st[0], y: st[1], a: onCourt ? (P ? 0.2 : 1) : 0 }; }
      const dx = tx - d.x, dy = ty - d.y, dist = Math.hypot(dx, dy);
      const step = Math.min(dist, vmax * dt * (dist < 1.5 ? 0.6 : 1));
      if (dist > 0.01) { d.x += (dx / dist) * step; d.y += (dy / dist) * step; }
      d.a += ((onCourt ? 1 : 0) - d.a) * Math.min(1, dt * 3);
    }
    for (const id in this.dots) {
      const d = this.dots[id]; if (d.a < 0.03) continue;
      const si = sideOf[id]; if (si == null) continue;
      const s = m.sides[si], p = S.players[id];
      this.dot(d.x, Math.min(d.y, 49.5), s.team, this.initials(p), s.heat[id] || 0, { alpha: d.a * (m.ej[id] ? 0.35 : 1), focus: focus === +id });
    }
    if (ballT) {
      if (!this.ball || ballExact) this.ball = { x: ballT[0], y: ballT[1] };
      else { const dx = ballT[0] - this.ball.x, dy = ballT[1] - this.ball.y, dist = Math.hypot(dx, dy), st = Math.min(dist, Math.max(70 * dt, dist * Math.min(1, dt * 8))); if (dist > 0.01) { this.ball.x += dx / dist * st; this.ball.y += dy / dist * st; } }
      this.drawBall(this.ball.x, this.ball.y, ballZ);
    }
    if (L.hlLabel) this.banner(`★ ${L.hlLabel}`);
  },
};
