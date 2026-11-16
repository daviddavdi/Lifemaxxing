/* Courtside — match-day sound. Everything is synthesised with WebAudio (no audio files).
   Home crowd perspective: big cheers when the home side scores, groans when the visitors do.
   Rivalry games, playoffs and tight finishes make the crowd louder. */
const Sound = {
  ctx: null, master: null, bed: null, bedGain: null, noise: null, on: true, loud: 1, lastChant: 0, pi: 0, voices: 0,
  pref() { try { const v = localStorage.getItem('courtside_sound'); return v == null ? true : v === '1'; } catch (e) { return true; } },
  setPref(v) { this.on = v; try { localStorage.setItem('courtside_sound', v ? '1' : '0'); } catch (e) {} if (!v) this.stopBed(); },
  unlock() {
    if (!this.on) return;
    try {
      if (navigator.audioSession) navigator.audioSession.type = 'playback'; // lets iPhone play even with the silent switch on (Safari 17+)
      if (!this.ctx) {
        const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
        this.ctx = new AC();
        const comp = this.ctx.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 4; comp.connect(this.ctx.destination);
        this.master = this.ctx.createGain(); this.master.gain.value = 0.9; this.master.connect(comp);
        const len = this.ctx.sampleRate * 4, b = this.ctx.createBuffer(1, len, this.ctx.sampleRate), d = b.getChannelData(0);
        let last = 0; for (let i = 0; i < len; i++) { const w = Math.random() * 2 - 1; last = (last + 0.04 * w) / 1.04; d[i] = w * 0.6 + last * 3; }
        this.noise = b;
      }
      if (this.ctx.state === 'suspended') this.ctx.resume();
    } catch (e) { this.ctx = null; }
  },
  ready() { return this.on && this.ctx && this.ctx.state === 'running'; },
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
    if (this.voices > 3) return; this.voices++; setTimeout(() => this.voices--, 1800);
    const L = Math.min(2.2, power * this.loud), dur = 1.3 + L * 0.9;
    this.noiseHit('bandpass', 1150, 0.55, 0.32 * L, 0.1, dur * 0.35, dur * 0.65);
    this.noiseHit('lowpass', 420, 0.7, 0.22 * L, 0.14, dur * 0.3, dur * 0.7);
    const n = Math.round(2 + L * 3);
    for (let i = 0; i < n; i++) { const f = 260 + Math.random() * 320, d = Math.random() * 0.35; this.tone('triangle', f, f * (1.25 + Math.random() * 0.3), 0.012 * L, 0.12, 0.25 + Math.random() * 0.4, 0.5, d, 1500); }
  },
  groan(power = 1) {
    const L = Math.min(2, power * this.loud);
    this.noiseHit('lowpass', 520, 0.7, 0.12 * L, 0.12, 0.25, 0.8);
    for (let i = 0; i < 3; i++) { const f = 190 + Math.random() * 60; this.tone('sawtooth', f, f * 0.72, 0.006 * L, 0.1, 0.3, 0.6, Math.random() * 0.15, 650); }
  },
  ooh(power = 1) { const L = Math.min(2, power * this.loud); for (let i = 0; i < 4; i++) { const f = 220 + Math.random() * 90; this.tone('sawtooth', f, f * 1.18, 0.006 * L, 0.15, 0.25, 0.5, Math.random() * 0.1, 700); } this.noiseHit('bandpass', 700, 0.8, 0.08 * L, 0.12, 0.2, 0.6); },
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
  chant() { // "DE-FENSE" — two crowd vowels over claps
    const L = Math.min(2, this.loud), g = 0.012 * L;
    [[0, 230, 0.32], [0.45, 185, 0.42]].forEach(([d, f, len]) => { for (let i = 0; i < 5; i++) { const ff = f * (0.97 + Math.random() * 0.06); this.tone('sawtooth', ff, ff * 0.98, g, 0.04, len, 0.15, d + Math.random() * 0.03, 900); } });
    this.claps([0, 0.45, 1.2, 1.65], 0.12 * L);
  },
  /* ---- crowd bed ---- */
  startBed() {
    if (!this.ready() || this.bed) return;
    const s = this.src(), f1 = this.filt('bandpass', 650, 0.4), f2 = this.filt('lowpass', 1800, 0.5), g = this.ctx.createGain();
    g.gain.value = 0.0001; s.connect(f1); f1.connect(f2); f2.connect(g); g.connect(this.master); s.start();
    this.bed = s; this.bedGain = g;
  },
  stopBed() { try { if (this.bed) { this.bedGain.gain.setTargetAtTime(0.0001, this.ctx.currentTime, 0.3); const b = this.bed; setTimeout(() => { try { b.stop(); } catch (e) {} }, 1200); } } catch (e) {} this.bed = null; this.bedGain = null; },
  /* ---- match hook: called by the live controller with the game-time window it just played ---- */
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
    this.startBed();
    const [H, A] = m.sides, margin = Math.abs(H.pts - A.pts);
    const late = m.q >= 4 && m.clock < 240 && margin <= 8;
    const lvl = paused ? 0.03 : (0.05 + (late ? 0.05 : 0)) * this.loud;
    if (this.bedGain) this.bedGain.gain.setTargetAtTime(lvl, this.ctx.currentTime, 0.4);
    if (paused || t1 <= t0) return;
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
document.addEventListener('pointerdown', () => Sound.unlock(), { passive: true });
Sound.on = Sound.pref();
