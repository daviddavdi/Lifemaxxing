/* Courtside — match-day sound. Everything is synthesised with WebAudio (no audio files).
   Home crowd perspective: big cheers when the home side scores, groans when the visitors do.
   Rivalry games, playoffs and tight finishes make the crowd louder. */
const Sound = {
  ctx: null, master: null, bed: null, bedGain: null, noise: null, on: true, loud: 1, lastChant: 0, pi: 0, voices: 0,
  pref() { try { const v = localStorage.getItem('courtside_sound'); return v == null ? true : v === '1'; } catch (e) { return true; } },
  setPref(v) { this.on = v; try { localStorage.setItem('courtside_sound', v ? '1' : '0'); } catch (e) {} if (!v) this.stopBed(); },
  silentWav() { // 1 s of silence as a WAV data URI (8 kHz, 8-bit mono)
    const n = 8000, b = new Uint8Array(44 + n), v = new DataView(b.buffer), w = (o, t) => [...t].forEach((c, i) => (b[o + i] = c.charCodeAt(0)));
    w(0, 'RIFF'); v.setUint32(4, 36 + n, true); w(8, 'WAVEfmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
    v.setUint32(24, 8000, true); v.setUint32(28, 8000, true); v.setUint16(32, 1, true); v.setUint16(34, 8, true); w(36, 'data'); v.setUint32(40, n, true); b.fill(128, 44);
    let str = ''; b.forEach((x) => (str += String.fromCharCode(x))); return 'data:audio/wav;base64,' + btoa(str);
  },
  unlock() {
    if (!this.on) return;
    try {
      if (navigator.audioSession) try { navigator.audioSession.type = 'playback'; } catch (e) {} // iPhone: play through the silent switch (Safari 17+)
      // iPhone: a looping (silent) HTML media element moves the page into the "playback" audio session, so WebAudio isn't muted by the silent switch
      if (!this.keep) { const a = new Audio(this.silentWav()); a.loop = true; a.setAttribute('playsinline', ''); a.volume = 0.01; this.keep = a; }
      if (this.keep.paused) { const pr = this.keep.play(); if (pr && pr.catch) pr.catch(() => {}); }
      if (!this.ctx) {
        const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
        this.ctx = new AC();
        const comp = this.ctx.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 4; comp.connect(this.ctx.destination);
        this.master = this.ctx.createGain(); this.master.gain.value = 1.6; this.master.connect(comp);
        const len = this.ctx.sampleRate * 4, b = this.ctx.createBuffer(1, len, this.ctx.sampleRate), d = b.getChannelData(0);
        let last = 0; for (let i = 0; i < len; i++) { const w = Math.random() * 2 - 1; last = (last + 0.04 * w) / 1.04; d[i] = w * 0.6 + last * 3; }
        this.noise = b;
      }
      if (this.ctx.state !== 'running') { const pr = this.ctx.resume(); if (pr && pr.catch) pr.catch(() => {}); }
      this.generate();
      if (!this.warm) { const b = this.ctx.createBuffer(1, 1, 22050), s = this.ctx.createBufferSource(); s.buffer = b; s.connect(this.ctx.destination); s.start(0); this.warm = true; } // iOS warm-up
    } catch (e) { console.warn('sound unavailable', e); }
  },
  ready() { return this.on && this.ctx && this.ctx.state === 'running'; },
  B: {}, genQ: null,
  generate() {
    if (this.genQ || typeof Crowd === 'undefined') return;
    const jobs = [['bedL', () => Crowd.bed()], ['bounce', () => Crowd.bounce()], ['cheer0', () => Crowd.cheer()], ['bedR', () => Crowd.bed()], ['cheer1', () => Crowd.cheer()],
      ['groan0', () => Crowd.groan()], ['ooh0', () => Crowd.ooh()], ['sq0', () => Crowd.squeak()], ['sq1', () => Crowd.squeak()], ['sq2', () => Crowd.squeak()],
      ['cheer2', () => Crowd.cheer(3, 30)], ['roar', () => Crowd.cheer(5, 52, true)], ['groan1', () => Crowd.groan(1.6)], ['ooh1', () => Crowd.ooh(1.3)], ['chant', () => Crowd.chant()]];
    this.genQ = jobs;
    const next = () => { const j = this.genQ.shift(); if (!j) return; try { const a = j[1](); const b = this.ctx.createBuffer(1, a.length, Crowd.SR); b.getChannelData(0).set(a); this.B[j[0]] = b; } catch (e) { console.warn('crowd gen', e); } setTimeout(next, 40); };
    setTimeout(next, 30);
  },
  play(name, gain, opt = {}) {
    const b = this.B[name]; if (!b || !this.ready()) return null;
    const c = this.ctx, s = c.createBufferSource(), g = c.createGain(); s.buffer = b; s.playbackRate.value = (opt.rate || 1) * (opt.vary === false ? 1 : 0.96 + Math.random() * 0.08);
    g.gain.value = gain; s.connect(g);
    if (opt.pan != null && c.createStereoPanner) { const p = c.createStereoPanner(); p.pan.value = Math.max(-1, Math.min(1, opt.pan)); g.connect(p); p.connect(opt.dest || this.master); } else g.connect(opt.dest || this.master);
    if (opt.loop) s.loop = true;
    s.start(c.currentTime + (opt.delay || 0)); return { s, g };
  },
  any(prefix) { const k = Object.keys(this.B).filter((x) => x.startsWith(prefix)); return k.length ? k[Math.floor(Math.random() * k.length)] : null; },
  test(n = 0) { if (!this.ready() || !this.B.cheer0) return n < 40 && setTimeout(() => this.test(n + 1), 250); this.swish(); setTimeout(() => this.cheer(1), 120); },
  stopAll() { this.stopBed(); try { if (this.keep) this.keep.pause(); } catch (e) {} },
  src() { const s = this.ctx.createBufferSource(); s.buffer = this.noise; s.loop = true; return s; },
  filt(type, f, q = 0.7) { const x = this.ctx.createBiquadFilter(); x.type = type; x.frequency.value = f; x.Q.value = q; return x; },
  env(g, t0, peak, att, hold, rel) {
    g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), t0 + att);
    g.gain.setValueAtTime(Math.max(0.0002, peak), t0 + att + hold); g.gain.exponentialRampToValueAtTime(0.0001, t0 + att + hold + rel);
    return t0 + att + hold + rel;
  },
  noiseHit(type, f, q, peak, att, hold, rel, delay = 0) {
    const c = this.ctx, t0 = c.currentTime + delay, s = this.src(), fl = this.filt(type, f, q), g = c.createGain();
    s.connect(fl); fl.connect(g); g.connect(this.master);
    const end = this.env(g, t0, peak, att, hold, rel);
    s.start(t0, Math.random() * 3); s.stop(end + 0.05);
  },
  tone(type, f0, f1, peak, att, hold, rel, delay = 0, lp) {
    const c = this.ctx, t0 = c.currentTime + delay, o = c.createOscillator(), g = c.createGain();
    o.type = type; o.frequency.setValueAtTime(f0, t0); if (f1 && f1 !== f0) o.frequency.exponentialRampToValueAtTime(f1, t0 + att + hold + rel);
    let n = o; if (lp) { const fl = this.filt('lowpass', lp, 0.8); o.connect(fl); n = fl; }
    n.connect(g); g.connect(this.master);
    const end = this.env(g, t0, peak, att, hold, rel); o.start(t0); o.stop(end + 0.05);
    return o;
  },
  /* ---- the sounds ---- */
  cheer(power = 1) {
    if (this.voices > 3) return; this.voices++; setTimeout(() => this.voices--, 1500);
    const L = Math.min(2.2, power * this.loud);
    if (L > 1.45 && this.B.roar) { this.play('roar', 0.55 * Math.min(1.5, L), { pan: -0.15 }); this.play(this.any('cheer'), 0.3 * L, { pan: 0.6, delay: 0.05 }); return; }
    const a = this.any('cheer'); let b = this.any('cheer'); if (b === a) b = this.any('cheer');
    this.play(a, 0.42 * L, { pan: -0.55 }); this.play(b, 0.36 * L, { pan: 0.55, delay: 0.03 + Math.random() * 0.06 });
  },
  groan(power = 1) { const L = Math.min(2, power * this.loud); this.play(this.any('groan'), 0.38 * L, { pan: (Math.random() - 0.5) * 0.6 }); },
  ooh(power = 1) { const L = Math.min(2, power * this.loud); this.play(this.any('ooh'), 0.38 * L, { pan: (Math.random() - 0.5) * 0.6 }); },
  swish() { this.noiseHit('highpass', 3200, 0.7, 0.22, 0.01, 0.04, 0.16); this.noiseHit('bandpass', 5200, 1.2, 0.08, 0.02, 0.05, 0.2, 0.03); },
  rim() { this.tone('sine', 640, 610, 0.16, 0.003, 0.02, 0.32); this.tone('sine', 1190, 1150, 0.07, 0.003, 0.01, 0.22); this.noiseHit('lowpass', 220, 0.8, 0.18, 0.005, 0.02, 0.12); },
  thud() { this.noiseHit('lowpass', 160, 0.9, 0.25, 0.005, 0.02, 0.1); },
  whistle(double) {
    const blow = (d, len) => { const o = this.tone('sine', 3050, 3000, 0.09, 0.02, len, 0.06, d); const o2 = this.tone('sine', 3120, 3080, 0.05, 0.02, len, 0.06, d);
      const lfo = this.ctx.createOscillator(), lg = this.ctx.createGain(); lfo.frequency.value = 28; lg.gain.value = 70; lfo.connect(lg); lg.connect(o.frequency); lg.connect(o2.frequency); const t0 = this.ctx.currentTime + d; lfo.start(t0); lfo.stop(t0 + len + 0.12); };
    blow(0, double ? 0.14 : 0.32); if (double) blow(0.22, 0.34);
  },
  buzzer() { this.tone('sawtooth', 196, 196, 0.1, 0.02, 0.85, 0.15, 0, 1400); this.tone('square', 201, 201, 0.05, 0.02, 0.85, 0.15, 0, 900); },
  claps(pattern, gain) { pattern.forEach((t) => this.noiseHit('bandpass', 1500 + Math.random() * 400, 1.1, gain, 0.004, 0.015, 0.07, t)); },
  chant() { this.play('chant', 0.42 * Math.min(2, this.loud), { vary: false }); },
  bounce(pan) { this.play('bounce', 0.16, { pan, rate: 0.95 + Math.random() * 0.1 }); },
  squeak(pan) { this.play(this.any('sq'), 0.05 + Math.random() * 0.04, { pan }); },
  /* ---- crowd bed ---- */
  startBed() {
    if (!this.ready() || this.bed || !this.B.bedL) return;
    const g = this.ctx.createGain(); g.gain.value = 0.0001; g.connect(this.master);
    const l = this.play('bedL', 1, { pan: -0.7, loop: true, dest: g, vary: false }), r = this.B.bedR ? this.play('bedR', 1, { pan: 0.7, loop: true, dest: g, vary: false, rate: 0.985 }) : null;
    this.bed = { stop: () => { try { l.s.stop(); r && r.s.stop(); } catch (e) {} } }; this.bedGain = g;
    if (!r) this.bedMono = true;
  },
  stopBed() { try { if (this.bed) { this.bedGain.gain.setTargetAtTime(0.0001, this.ctx.currentTime, 0.3); const b = this.bed; setTimeout(() => b.stop(), 1200); } } catch (e) {} this.bed = null; this.bedGain = null; },
  /* ---- match hook: called by the live controller with the game-time window it just played ---- */
  foley(m, t) { // ball dribbles while someone is bringing it up or setting up a shot, and the odd sneaker squeak
    const now = performance.now(), P = m.plog.find((x) => x.g0 <= t && x.g1 > t); if (!P) return;
    const acts = P.acts || []; let A = null; for (const a of acts) if (t >= a.ts) A = a;
    const u = A ? (t - A.ts) / Math.max(0.05, A.te - A.ts) : 0;
    const dribbling = !A ? true : A.t === 'shot' ? u < 0.5 : A.t === 'ft' ? u < 0.35 : false;
    const bx = typeof Court !== 'undefined' && Court.ball ? Court.ball.x : 47, pan = (bx / 94 * 2 - 1) * 0.7;
    if (dribbling && now - (this.lastBounce || 0) > (A && A.t === 'ft' ? 620 : 430) + Math.random() * 90) { this.lastBounce = now; this.bounce(pan); }
    if (!A || A.t === 'shot') { if (now - (this.lastSq || 0) > 1800 && Math.random() < 0.04) { this.lastSq = now; this.squeak(pan + (Math.random() - 0.5) * 0.5); } }
  },
  begin(m) {
    this.pi = 0; this.lastChant = 0;
    let loud = 1;
    if (m.rivalGame) loud += 0.55;
    if (m.imp) loud += 0.4;
    if (m.rv && Object.keys(m.rv).length) loud += 0.1;
    this.loud = loud;
  },
  tick(m, t0, t1, paused) {
    if (!this.ready()) return;
    if (this.bed && this.bedMono && this.B.bedR) { this.stopBed(); this.bedMono = false; }
    this.startBed();
    const [H, A] = m.sides, margin = Math.abs(H.pts - A.pts);
    const late = m.q >= 4 && m.clock < 240 && margin <= 8;
    const lvl = paused ? 0.12 : (0.2 + (late ? 0.14 : 0)) * Math.min(1.8, this.loud);
    if (this.bedGain) this.bedGain.gain.setTargetAtTime(lvl, this.ctx.currentTime, 0.4);
    if (paused || t1 <= t0) return;
    this.foley(m, t1);
    const rate = (t1 - t0);
    while (this.pi < m.plog.length && m.plog[this.pi].g1 < t0) this.pi++;
    for (let i = this.pi; i < m.plog.length && m.plog[i].g0 <= t1; i++) {
      const P = m.plog[i];
      if (P.g0 > t0 && P.g0 <= t1 && P.oi === 1 && (this.loud > 1.3 || late) && performance.now() - this.lastChant > 14000 && Math.random() < 0.5) { this.lastChant = performance.now(); this.chant(); }
      for (const a of P.acts || []) {
        if (a.ts > t0 && a.ts <= t1 && a.t === 'ft' && (a.n === 1 || a.tech)) this.whistle(false);
        if (!(a.te > t0 && a.te <= t1)) continue;
        const homeAct = a.s === 0, clutch = late ? 1.5 : 1;
        if (a.t === 'shot') {
          if (a.made) { this.swish(); if (homeAct) this.cheer((a.pts === 3 ? 1.35 : 1) * clutch * (a.foul ? 1.25 : 1)); else this.groan(clutch); }
          else if (a.b != null) { this.thud(); if (!homeAct) this.cheer(0.9 * clutch); else this.ooh(); }
          else this.rim();
          if (a.foul) this.whistle(true);
        } else if (a.t === 'ft') {
          if (a.made) { this.swish(); if (homeAct) this.cheer(0.45 * clutch); } else { this.rim(); if (!homeAct) this.cheer(0.35); else this.groan(0.5); }
        } else if (a.t === 'to' && a.st != null && rate < 3) { if (!homeAct) this.cheer(0.7 * clutch); else this.ooh(0.8); }
      }
    }
    for (let i = m.events.length - 1; i >= 0; i--) {
      const e = m.events[i]; if (e.g <= t0) break; if (e.g > t1) continue;
      if (e.type === 'qend') this.buzzer();
      if (e.type === 'end') { this.buzzer(); if (H.pts > A.pts) setTimeout(() => this.cheer(1.8), 350); else setTimeout(() => this.groan(1.4), 350); }
      if (e.type === 'tech' || e.type === 'flag') this.whistle(true);
    }
  },
};
// iOS only counts touchend / click as a user gesture that may start audio
['touchend', 'click', 'keydown'].forEach((ev) => document.addEventListener(ev, () => Sound.unlock(), { capture: true, passive: true }));
Sound.on = Sound.pref();
