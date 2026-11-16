/* Courtside — menu click sounds.
   The music is composed live (never the same loop twice): chord progressions, an electric-piano
   comp, bass, swung drums, a pentatonic melody with echo and a little vinyl crackle.
   It fades out during live matches (the arena takes over) and comes back afterwards. */
const Music = {
  g: null, on: true, clicks: true, timer: 0, next: 0, step: 0, bar: 0, prog: null, key: 57, bpm: 90, delay: null,
  pref(k, d) { try { const v = localStorage.getItem('courtside_' + k); return v == null ? d : v === '1'; } catch (e) { return d; } },
  save(k, v) { try { localStorage.setItem('courtside_' + k, v ? '1' : '0'); } catch (e) {} },
  init() { this.on = false; this.clicks = this.pref('clicks', true); },
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
  start() {}, stop() {}, // no menu music — clicks only
};
Music.init();
