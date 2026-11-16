/* Courtside — menu click sounds and a generated basketball-arena hip-hop beat for the menus
   (dribbling ball as percussion, sneaker squeaks, arena organ riffs, crowd "HEY!" shouts, whistle accents).
   The music is composed live (never the same loop twice): chord progressions, an electric-piano
   comp, bass, swung drums, a pentatonic melody with echo and a little vinyl crackle.
   It fades out during live matches (the arena takes over) and comes back afterwards. */
const Music = {
  g: null, on: true, clicks: true, timer: 0, next: 0, step: 0, bar: 0, prog: null, key: 57, bpm: 90, delay: null,
  pref(k, d) { try { const v = localStorage.getItem('courtside_' + k); return v == null ? d : v === '1'; } catch (e) { return d; } },
  save(k, v) { try { localStorage.setItem('courtside_' + k, v ? '1' : '0'); } catch (e) {} },
  init() { this.on = this.pref('music', true); this.clicks = this.pref('clicks', true); },
  setMusic(v) { this.on = v; this.save('music', v); if (v) this.start(); else this.stop(); },
  setClicks(v) { this.clicks = v; this.save('clicks', v); },
  ctx() { return Sound.ctx && Sound.ctx.state === 'running' ? Sound.ctx : null; },
  /* ---- UI clicks ---- */
  click(kind) {
    if (!this.clicks) return; const c = this.ctx(); if (!c) return;
    const t = c.currentTime, o = c.createOscillator(), g = c.createGain();
    const f = kind === 'primary' ? 880 : kind === 'tab' ? 1320 : kind === 'back' ? 620 : 1050;
    o.type = 'sine'; o.frequency.setValueAtTime(f, t); o.frequency.exponentialRampToValueAtTime(f * (kind === 'back' ? 0.8 : 1.25), t + 0.05);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(kind === 'primary' ? 0.09 : 0.055, t + 0.004); g.gain.exponentialRampToValueAtTime(0.0001, t + (kind === 'primary' ? 0.14 : 0.07));
    o.connect(g); g.connect(Sound.master); o.start(t); o.stop(t + 0.2);
    if (kind === 'primary') { const o2 = c.createOscillator(), g2 = c.createGain(); o2.type = 'triangle'; o2.frequency.value = 1320; g2.gain.setValueAtTime(0.0001, t + 0.05); g2.gain.exponentialRampToValueAtTime(0.05, t + 0.06); g2.gain.exponentialRampToValueAtTime(0.0001, t + 0.22); o2.connect(g2); g2.connect(Sound.master); o2.start(t + 0.05); o2.stop(t + 0.3); }
  },
  /* ---- music ---- */
  PROGS: [ // semitones from key root: each chord is [root, ...chord tones]
    [[5, 0, 4, 7, 11], [4, 0, 3, 7, 10], [2, 0, 3, 7, 10], [0, 0, 4, 7, 11]],   // IVmaj7 iiim7 iim7 Imaj7 (relative)
    [[0, 0, 3, 7, 10, 14], [5, 0, 4, 7, 11], [10, 0, 4, 7, 9], [7, 0, 3, 7, 10]],  // i9 VImaj7 ... lo-fi minor
    [[2, 0, 3, 7, 10, 14], [7, 0, 4, 7, 10, 14], [0, 0, 4, 7, 11, 14], [9, 0, 3, 7, 10]], // ii9 V9 Imaj9 vi7
    [[0, 0, 3, 7, 10], [8, 0, 4, 7, 11], [3, 0, 4, 7, 11], [10, 0, 4, 7, 10]],     // i bVI bIII bVII
  ],
  hz: (n) => 440 * Math.pow(2, (n - 69) / 12),
  start() {
    if (!this.on || this.timer) return; const c = this.ctx(); if (!c) return;
    if (!this.g) {
      this.g = c.createGain(); this.g.gain.value = 0.0001; this.g.connect(Sound.master);
      const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 5200; lp.connect(this.g); this.bus = lp; // warm, lo-fi top end
      const d = c.createDelay(1); d.delayTime.value = 60 / this.bpm * 0.75; const fb = c.createGain(); fb.gain.value = 0.32; const dl = c.createBiquadFilter(); dl.type = 'lowpass'; dl.frequency.value = 2200;
      d.connect(dl); dl.connect(fb); fb.connect(d); dl.connect(lp); this.delay = d;
    }
    this.newSection(); this.next = c.currentTime + 0.15; this.step = 0;
    this.timer = setInterval(() => this.schedule(), 60);
  },
  stop() { clearInterval(this.timer); this.timer = 0; try { if (this.bedSrc) this.bedSrc.stop(); } catch (e) {} this.bedSrc = null; if (this.g && Sound.ctx) this.g.gain.setTargetAtTime(0.0001, Sound.ctx.currentTime, 0.3); },
  newSection() {
    const first = !this.prog;
    this.prog = this.PROGS[Math.floor(Math.random() * this.PROGS.length)]; this.key = 55 + Math.floor(Math.random() * 6); this.bar = 0;
    const r = Math.random(); this.kind = first ? 'groove' : r < 0.45 ? 'groove' : r < 0.8 ? 'organ' : 'break';
    this.mel = this.kind === 'groove' && Math.random() < 0.6; this.busy = 0.2 + Math.random() * 0.3; this.drib = this.kind !== 'organ' || Math.random() < 0.5;
    // organ riff: 8 eighth-notes of chord tones, arena style
    this.riff = Array.from({ length: 8 }, (_, i) => (i === 7 || (i % 2 && Math.random() < 0.35) ? null : Math.floor(Math.random() * 4)));
    if (!first && Math.random() < 0.5) this.whistleNext = true;
  },
  buf(name, t, gain, rate = 1, pan = 0) {
    const c = this.ctx(), b = Sound.B && Sound.B[name]; if (!c || !b) return;
    const s = c.createBufferSource(), g = c.createGain(); s.buffer = b; s.playbackRate.value = rate; g.gain.value = gain; s.connect(g);
    if (c.createStereoPanner) { const p = c.createStereoPanner(); p.pan.value = pan; g.connect(p); p.connect(this.bus); } else g.connect(this.bus);
    s.start(t);
  },
  organ(t, n, len) {
    const c = this.ctx(), g = c.createGain(), lfo = c.createOscillator(), lg = c.createGain(); lfo.frequency.value = 6.2; lg.gain.value = 3; lfo.connect(lg);
    [[1, 1], [2, 0.7], [3, 0.45], [4, 0.3], [6, 0.15]].forEach(([h, a]) => { const o = c.createOscillator(), og = c.createGain(); o.type = 'sine'; o.frequency.value = this.hz(n) * h; lg.connect(o.detune); og.gain.value = a; o.connect(og); og.connect(g); o.start(t); o.stop(t + len + 0.1); });
    g.connect(this.bus); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.03, t + 0.01); g.gain.setValueAtTime(0.03, t + len * 0.85); g.gain.exponentialRampToValueAtTime(0.0001, t + len + 0.06);
    lfo.start(t); lfo.stop(t + len + 0.1);
  },
  tweet(t) { const c = this.ctx(); for (const [d, l] of [[0, 0.09], [0.14, 0.2]]) { const o = c.createOscillator(), g = c.createGain(); o.frequency.value = 3050; o.connect(g); g.connect(this.bus); this.env(g, t + d, 0.01, 0.022, l); o.start(t + d); o.stop(t + d + l + 0.05); } },
  level() { return typeof UI !== 'undefined' && UI.view === 'match' ? 0.0001 : 1.0; },
  schedule() {
    const c = this.ctx(); if (!c || !this.on) return;
    this.g.gain.setTargetAtTime(this.level(), c.currentTime, 0.6);
    if (typeof UI !== 'undefined' && UI.view === 'match') { this.next = c.currentTime + 0.1; return; }
    const s16 = 60 / this.bpm / 4;
    while (this.next < c.currentTime + 0.25) {
      const st = this.step % 16, swing = st % 2 ? s16 * 0.18 : 0, t = this.next + swing;
      if (st === 0) {
        if (this.bar >= 8) this.newSection();
        if (this.whistleNext) { this.whistleNext = false; this.tweet(t); }
        this.chordBar(t, this.prog[this.bar % 4], s16 * 16); this.bar++;
        if (!this.bedSrc && Sound.B && Sound.B.bedL) { const c = this.ctx(), s = c.createBufferSource(), g = c.createGain(); s.buffer = Sound.B.bedL; s.loop = true; g.gain.value = 0.05; s.connect(g); g.connect(this.bus); s.start(t); this.bedSrc = s; } // faint arena crowd under the beat
      }
      const ch = this.prog[(this.bar - 1 + 4) % 4], root = this.key + ch[0], tones = ch.slice(1);
      if (this.kind !== 'break' || st % 4 === 0) this.drums(t, st);
      if (this.drib && st % 4 === 0) this.buf('bounce', t, this.kind === 'break' ? 0.16 : 0.11, 0.97 + Math.random() * 0.06, Math.sin(this.step * 0.3) * 0.4); // the dribble keeps time
      if (this.kind === 'break' && st % 4 === 2 && Math.random() < 0.3) this.buf('bounce', t, 0.08, 1.05, 0.2); // crossover
      if (st === 6 && Math.random() < 0.3) this.buf('sq' + Math.floor(Math.random() * 3), t, 0.035, 1, (Math.random() - 0.5) * 1.2);
      if (this.kind === 'organ' && st % 2 === 0) { const r = this.riff[st / 2]; if (r != null) this.organ(t, root + 12 + tones[r % tones.length], s16 * 1.7); }
      if (this.kind === 'organ' && st === 12 && this.bar % 2 === 0) this.buf('hey', t - 0.03, 0.22, 1, 0);
      if (this.mel && st % 2 === 0 && Math.random() < this.busy) this.melody(t, s16);
      this.next += s16; this.step++;
    }
  },
  env(g, t, a, peak, dec) { g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + a + dec); },
  chordBar(t, ch, len) {
    const c = this.ctx(), root = this.key + ch[0], notes = ch.slice(1).map((x) => root + x);
    // pad
    for (const n of notes) for (const det of [-6, 6]) {
      const o = c.createOscillator(), g = c.createGain(), f = c.createBiquadFilter(); o.type = 'sawtooth'; o.frequency.value = this.hz(n); o.detune.value = det;
      f.type = 'lowpass'; f.frequency.value = 900; o.connect(f); f.connect(g); g.connect(this.bus);
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.012, t + 0.4); g.gain.setValueAtTime(0.012, t + len - 0.3); g.gain.exponentialRampToValueAtTime(0.0001, t + len + 0.2);
      o.start(t); o.stop(t + len + 0.3);
    }
    // electric piano comp (on 1 and the "and" of 2)
    for (const off of [0, len * 0.375, Math.random() < 0.5 ? len * 0.75 : null]) if (off != null) for (const n of notes.slice(0, 4)) {
      const o = c.createOscillator(), o2 = c.createOscillator(), g = c.createGain(); o.type = 'sine'; o2.type = 'sine'; o.frequency.value = this.hz(n + 12); o2.frequency.value = this.hz(n + 24) * 1.001;
      const g2 = c.createGain(); g2.gain.value = 0.25; o2.connect(g2); g2.connect(g); o.connect(g); g.connect(this.bus); this.env(g, t + off + Math.random() * 0.02, 0.006, 0.035, 0.9);
      o.start(t + off); o2.start(t + off); o.stop(t + off + 1.1); o2.stop(t + off + 1.1);
    }
    // bass
    for (const [off, n] of [[0, root - 12], [len * 0.5, root - 12], [len * 0.875, root - 12 + (Math.random() < 0.5 ? 7 : 12)]]) {
      const o = c.createOscillator(), g = c.createGain(); o.type = 'triangle'; o.frequency.value = this.hz(n); o.connect(g); g.connect(this.bus); this.env(g, t + off, 0.01, 0.16, 0.45); o.start(t + off); o.stop(t + off + 0.6);
    }
  },
  drums(t, st) {
    const c = this.ctx();
    if (st === 0 || st === 10 || (st === 7 && Math.random() < 0.3)) { // kick
      const o = c.createOscillator(), g = c.createGain(); o.frequency.setValueAtTime(120, t); o.frequency.exponentialRampToValueAtTime(42, t + 0.12); o.connect(g); g.connect(this.bus); this.env(g, t, 0.004, 0.42, 0.28); o.start(t); o.stop(t + 0.35);
    }
    if (st === 4 || st === 12) this.noise(t, 'bandpass', 1700, 0.18, 0.16, 0.9); // snare / clap
    if (st % 2 === 0) this.noise(t, 'highpass', 7000, st % 4 === 2 ? 0.05 : 0.03 * (0.6 + Math.random() * 0.6), 0.035); // hats
    if (Math.random() < 0.06) this.noise(t + Math.random() * 0.1, 'highpass', 3000, 0.02, 0.004); // vinyl crackle
  },
  noise(t, type, f, peak, dec, q = 0.7) {
    const c = this.ctx(); if (!Sound.noise) return;
    const s = c.createBufferSource(), fl = c.createBiquadFilter(), g = c.createGain(); s.buffer = Sound.noise; fl.type = type; fl.frequency.value = f; fl.Q.value = q;
    s.connect(fl); fl.connect(g); g.connect(this.bus); this.env(g, t, 0.003, peak, dec); s.start(t, Math.random() * 3); s.stop(t + dec + 0.05);
  },
  melody(t, s16) {
    const c = this.ctx(), pent = [0, 3, 5, 7, 10, 12, 15], n = this.key + 12 + pent[Math.floor(Math.random() * pent.length)];
    const o = c.createOscillator(), g = c.createGain(); o.type = 'triangle'; o.frequency.value = this.hz(n);
    o.connect(g); g.connect(this.bus); g.connect(this.delay); const len = s16 * (Math.random() < 0.3 ? 4 : 2);
    this.env(g, t, 0.01, 0.045, len + 0.25); o.start(t); o.stop(t + len + 0.4);
  },
};
Music.init();
