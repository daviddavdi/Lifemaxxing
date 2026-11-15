/* Courtside Manager — 2D top-down court for Key Highlights (hot/cold glows) */
'use strict';

const Court = {
  cv: null, ctx: null, W: 0, H: 0, raf: 0, anim: null, m: null,
  attach(cv, m) {
    this.cv = cv; this.m = m;
    const dpr = window.devicePixelRatio || 1;
    const w = cv.parentElement.clientWidth;
    this.W = w; this.H = Math.round(w * 50 / 94);
    cv.width = Math.round(this.W * dpr); cv.height = Math.round(this.H * dpr);
    cv.style.width = this.W + 'px'; cv.style.height = this.H + 'px';
    this.ctx = cv.getContext('2d'); this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (!this.raf) this.loop();
  },
  play(e, m, dur) { this.anim = { e, t0: performance.now(), dur }; this.m = m; },
  busy() { return !!this.anim; },
  loop() {
    this.raf = requestAnimationFrame(() => this.loop());
    if (!this.cv || !this.cv.isConnected) { cancelAnimationFrame(this.raf); this.raf = 0; return; }
    this.draw(performance.now());
  },
  X(x) { return (x / 94) * this.W; }, Y(y) { return (y / 50) * this.H; },
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
  // formation spot (feet) for lineup index i, attacking right (side 0) or left (side 1)
  spot(i, off, attSide) {
    const OFF = [[66, 25], [73, 7], [75, 43], [80, 16], [84.5, 33]];
    let [x, y] = OFF[i] || [70, 25];
    if (!off) { x = x + (88.75 - x) * 0.32; y = y + (25 - y) * 0.25; }
    return attSide === 0 ? [x, y] : [94 - x, y];
  },
  dot(x, y, team, label, heat, opts = {}) {
    const c = this.ctx, r = Math.max(7, this.W / 48);
    const px = this.X(x), py = this.Y(y);
    const now = performance.now();
    if (heat > 0.25 || heat < -0.25) {
      const fire = heat > 0, k = Math.min(1, (Math.abs(heat) - 0.25) / 0.45);
      const pulse = 0.75 + 0.25 * Math.sin(now / (fire ? 140 : 260));
      const col = fire ? `rgba(255,${Math.round(110 - 60 * k)},20,` : `rgba(110,205,255,`;
      const gr = c.createRadialGradient(px, py, r * 0.6, px, py, r * (2.2 + k * 1.4) * pulse);
      gr.addColorStop(0, col + (0.55 * k + 0.25) + ')'); gr.addColorStop(1, col + '0)');
      c.fillStyle = gr; c.beginPath(); c.arc(px, py, r * (2.2 + k * 1.4) * pulse, 0, Math.PI * 2); c.fill();
    }
    c.globalAlpha = opts.dim ? 0.35 : 1;
    c.fillStyle = team.c1; c.beginPath(); c.arc(px, py, r, 0, Math.PI * 2); c.fill();
    c.lineWidth = opts.focus ? 2.5 : 1.2; c.strokeStyle = opts.focus ? '#f2c94c' : 'rgba(255,255,255,.55)'; c.stroke();
    c.fillStyle = team.c2; c.font = `700 ${Math.round(r * 0.95)}px -apple-system, Segoe UI, sans-serif`; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillText(label, px, py + 0.5);
    if (opts.x) { c.strokeStyle = '#ff5252'; c.lineWidth = 2; c.beginPath(); c.moveTo(px - r, py - r); c.lineTo(px + r, py + r); c.moveTo(px + r, py - r); c.lineTo(px - r, py + r); c.stroke(); }
    c.globalAlpha = 1;
  },
  ball(x, y, z = 0) {
    const c = this.ctx, r = Math.max(3, this.W / 110) * (1 + z * 0.9);
    if (z > 0) { c.fillStyle = 'rgba(0,0,0,.35)'; c.beginPath(); c.ellipse(this.X(x), this.Y(y) + z * 14, r, r * 0.5, 0, 0, Math.PI * 2); c.fill(); }
    c.fillStyle = '#ff8c2a'; c.beginPath(); c.arc(this.X(x), this.Y(y) - z * 14, r, 0, Math.PI * 2); c.fill();
    c.strokeStyle = 'rgba(0,0,0,.5)'; c.lineWidth = 0.8; c.stroke();
  },
  banner(txt, sub) {
    const c = this.ctx;
    c.font = '800 11px -apple-system, Segoe UI, sans-serif';
    const w = Math.max(c.measureText(txt).width, sub ? c.measureText(sub).width : 0) + 22;
    c.fillStyle = 'rgba(10,12,16,.82)'; c.beginPath(); c.roundRect ? c.roundRect(this.W / 2 - w / 2, 6, w, sub ? 32 : 20, 6) : c.rect(this.W / 2 - w / 2, 6, w, sub ? 32 : 20); c.fill();
    c.fillStyle = '#f2c94c'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(txt, this.W / 2, 16);
    if (sub) { c.fillStyle = '#c6cbd8'; c.font = '600 10px -apple-system, Segoe UI, sans-serif'; c.fillText(sub, this.W / 2, 29); }
  },
  initials(p) { return p ? (p.last.replace(/[^A-Za-zÀ-ž]/g, '').slice(0, 2)) : '?'; },
  draw(now) {
    if (!this.ctx) return;
    this.drawCourt();
    const m = this.m; if (!m) return;
    if (this.anim && now - this.anim.t0 > this.anim.dur) this.anim = null;
    if (this.anim) return this.drawHighlight(this.anim.e, Math.min(1, (now - this.anim.t0) / this.anim.dur), now);
    // idle: current lineups, live heat
    const offS = m.done ? 0 : m.poss;
    const bob = (i) => Math.sin(now / 700 + i) * 0.6;
    m.sides.forEach((s, si) => ordered(s.on).forEach((p, i) => {
      const [x, y] = this.spot(i, si === offS, offS === 0 ? 0 : 1);
      this.dot(x + bob(i + si * 5), y + bob(i * 2 + si), s.team, this.initials(p), s.heat[p.id] || 0, { x: m.ej[p.id] });
    }));
    const [bx, by] = this.spot(0, true, offS === 0 ? 0 : 1);
    this.ball(bx + (offS === 0 ? 1.5 : -1.5), by + 1.2);
  },
  drawHighlight(e, u, now) {
    const m = this.m;
    const k = e.k;
    const offSide = ['stl', 'blk', 'flag'].includes(k) ? 1 - e.side : k === 'tech' ? 1 - e.side : e.side;
    const att = offSide === 0 ? 0 : 1;
    const bx = att === 0 ? 88.75 : 5.25;
    const lerp = (a, b, t) => a + (b - a) * clamp(t, 0, 1);
    const ease = (t) => (t < 0 ? 0 : t > 1 ? 1 : t * t * (3 - 2 * t));
    const pos = {};
    [0, 1].forEach((si) => (e.on[si] || []).forEach((id, i) => { pos[id] = this.spot(i, si === offSide, att); }));
    const shooterId = ['stl', 'blk'].includes(k) ? e.v : k === 'flag' ? e.v : e.p;
    const shooter = pos[shooterId];
    let target = shooter ? shooter.slice() : null;
    if (shooter && (k === 'in' || k === 'blk' || k === 'flag')) target = [att === 0 ? 85.3 : 8.7, 25 + (shooter[1] > 25 ? 2 : -2)];
    else if (shooter && k === 'mid') target = [att === 0 ? 77 : 17, shooter[1] > 25 ? 31 : 19];
    else if (shooter && k === 'thr' && Math.hypot(shooter[0] - bx, shooter[1] - 25) < 23) target = [att === 0 ? 66 : 28, shooter[1] > 25 ? 40 : 10];
    const mv = ease((u - 0.38) / 0.2);
    const cur = (id) => {
      let [x, y] = pos[id];
      const jit = Math.sin(now / 500 + id) * 0.5;
      if (id === shooterId && target && !['tech', 'trash'].includes(k)) { x = lerp(x, target[0], mv); y = lerp(y, target[1], mv); }
      if (k === 'stl' && id === e.p && u > 0.5) { x = lerp(x, att === 0 ? 30 : 64, (u - 0.5) * 2); }
      if (k === 'flag' && id === e.p) { const t = pos[e.v] && target; if (t) { x = lerp(x, t[0] + (att === 0 ? -1.5 : 1.5), mv); y = lerp(y, t[1], mv); } }
      return [x + jit, y];
    };
    [0, 1].forEach((si) => (e.on[si] || []).forEach((id) => {
      const p = S.players[id]; const [x, y] = cur(id);
      const team = m.sides[si].team;
      const focus = id === e.p || (['trash', 'flag'].includes(k) && id === e.v);
      this.dot(x, y, team, this.initials(p), (e.heat && e.heat[id]) || 0, { focus, x: (e.ej || []).includes(id) || (k === 'flag' && e.lbl && e.lbl.includes('EJECT') && id === e.p && u > 0.7), dim: false });
    }));
    // ball
    const offIds = e.on[offSide] || [];
    const passerId = e.a && pos[e.a] ? e.a : offIds[0];
    if (['in', 'mid', 'thr', 'blk'].includes(k) && shooter) {
      const pp = cur(passerId), sp = cur(shooterId);
      if (u < 0.3) this.ball(pp[0], pp[1] + 1);
      else if (u < 0.42) { const t = (u - 0.3) / 0.12; this.ball(lerp(pp[0], sp[0], t), lerp(pp[1], sp[1], t), Math.sin(t * Math.PI) * 0.3); }
      else if (u < 0.6) this.ball(sp[0], sp[1] + 1);
      else {
        const t = Math.min(1, (u - 0.6) / 0.25), stop = k === 'blk' ? 0.45 : 1;
        if (t < stop) this.ball(lerp(sp[0], bx, t), lerp(sp[1], 25, t), Math.sin(t * Math.PI) * (k === 'thr' ? 1.2 : 0.7));
        else if (k === 'blk') { const t2 = (t - stop) / (1 - stop); const x0 = lerp(sp[0], bx, stop), y0 = lerp(sp[1], 25, stop); this.ball(x0 + (att === 0 ? -8 : 8) * t2, y0 + 10 * t2, 0.3 * (1 - t2)); }
        else if (e.made) { const t2 = (u - 0.85) / 0.15; this.ball(bx, 25 + Math.max(0, t2) * 1.5, 0); this.ring(bx, u); }
        else { const t2 = Math.max(0, (u - 0.85) / 0.15); this.ball(bx + (att === 0 ? -1 : 1) * 6 * t2, 25 + 5 * Math.sin(t2 * 3), 0.4 * (1 - t2)); }
      }
      if (u > 0.86) this.floatText(e.made ? (k === 'thr' ? '+3' : '+2') : k === 'blk' ? 'BLOCKED' : 'MISS', bx, u, e.made ? '#4cc38a' : '#f06a6a');
    } else if (k === 'stl') {
      const vp = cur(e.v), sp = cur(e.p);
      if (u < 0.4) this.ball(vp[0], vp[1] + 1); else this.ball(sp[0], sp[1] + 1);
      if (u > 0.45) this.floatText('STEAL', sp[0], u, '#9fd0ff', sp[1]);
    } else {
      const pp = cur(offIds[0] || e.p); this.ball(pp[0], pp[1] + 1);
      const fp = cur(e.p);
      const col = k === 'trash' ? '#c9b8ff' : '#ff5252';
      const txt = k === 'trash' ? '💬' : k === 'tech' ? 'T' : 'F' + (e.lbl && e.lbl.includes('2') ? '2' : '1');
      this.bubble(fp[0], fp[1], txt, col, now);
      if (k === 'trash' && pos[e.v]) { const vp = cur(e.v); this.ctx.strokeStyle = 'rgba(201,184,255,.6)'; this.ctx.setLineDash([3, 3]); this.ctx.beginPath(); this.ctx.moveTo(this.X(fp[0]), this.Y(fp[1])); this.ctx.lineTo(this.X(vp[0]), this.Y(vp[1])); this.ctx.stroke(); this.ctx.setLineDash([]); }
    }
    const qtxt = `${e.q <= 4 ? 'Q' + e.q : 'OT'} ${Math.floor(e.c / 60)}:${String(e.c % 60).padStart(2, '0')}`;
    this.banner(`★ ${e.lbl || 'KEY HIGHLIGHT'} · ${qtxt}`, null);
  },
  ring(bx, u) { const c = this.ctx, r = Math.max(4, this.W / 70) * (1 + (u - 0.85) * 6); c.strokeStyle = `rgba(76,195,138,${Math.max(0, 1 - (u - 0.85) * 6)})`; c.lineWidth = 2; c.beginPath(); c.arc(this.X(bx), this.Y(25), r, 0, Math.PI * 2); c.stroke(); },
  floatText(t, x, u, col, y = 25) { const c = this.ctx; c.globalAlpha = Math.min(1, (1 - u) * 6); c.fillStyle = col; c.font = '900 13px -apple-system, Segoe UI, sans-serif'; c.textAlign = 'center'; c.fillText(t, this.X(x), this.Y(y) - 18 - (u - 0.85) * 40); c.globalAlpha = 1; },
  bubble(x, y, t, col, now) { const c = this.ctx, px = this.X(x), py = this.Y(y) - this.W / 28; const s = 1 + 0.12 * Math.sin(now / 120); c.fillStyle = col; c.beginPath(); c.arc(px, py, 8 * s, 0, Math.PI * 2); c.fill(); c.fillStyle = '#101418'; c.font = '900 10px -apple-system, Segoe UI, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(t, px, py + 0.5); },
};
