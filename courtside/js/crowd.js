/* Courtside — crowd & court foley generator.
   Builds realistic-sounding crowd audio from scratch: dozens of simulated human voices
   (glottal pulse source + vowel formant filters, each with its own pitch, timing and vowel),
   breath noise, hand-claps, a stereo murmur bed, ball bounces and sneaker squeaks.
   Pure DSP into Float32Arrays, so it needs no audio files and runs the same everywhere. */
const CROWD_SR = 22050;
const Crowd = (() => {
  const SR = CROWD_SR, R = Math.random;
  const VOW = { ah: [800, 1200, 2500], eh: [580, 1800, 2550], ee: [300, 2250, 3000], oh: [520, 860, 2450], oo: [340, 820, 2300], aw: [620, 940, 2400], uh: [620, 1180, 2550], ae: [700, 1650, 2500] };
  const BW = [90, 120, 170], WT = [1, 0.6, 0.32];
  const bq = (f, q) => { const F = { x1: 0, x2: 0, y1: 0, y2: 0 }; set(F, f, q); return F; };
  function set(F, f, q) { const w = 2 * Math.PI * Math.min(f, SR * 0.45) / SR, al = Math.sin(w) / (2 * q), a0 = 1 + al; F.b0 = al / a0; F.b2 = -al / a0; F.a1 = -2 * Math.cos(w) / a0; F.a2 = (1 - al) / a0; }
  const run = (F, x) => { const y = F.b0 * x + F.b2 * F.x2 - F.a1 * F.y1 - F.a2 * F.y2; F.x2 = F.x1; F.x1 = x; F.y2 = F.y1; F.y1 = y; return y; };
  const pick = (a) => a[Math.floor(R() * a.length)];
  const male = () => R() < 0.62;
  const f0For = (m) => (m ? 95 + R() * 85 : 185 + R() * 120);

  // one human voice: glottal flow derivative + aspiration -> 3 formants, with pitch curve, vibrato, jitter, vowel morph
  function voice(out, o) {
    const N = out.length, n = Math.floor(o.dur * SR), s0 = Math.floor(o.t0 * SR);
    const v1 = VOW[o.v1] || o.v1, v2 = VOW[o.v2 || o.v1] || o.v2 || v1;
    const F = [0, 1, 2].map((j) => bq(v1[j], v1[j] / BW[j]));
    let ph = R(), pg = 0, jit = 0, sh = 0;
    const vf = 4 + R() * 2.5, vp = R() * 6.28, vd = o.vib ?? 0.012, morph = o.morph || 0.35, tilt = o.tilt ?? 0.55;
    for (let i = 0; i < n; i++) {
      const u = i / n, t = i / SR;
      if ((i & 63) === 0 && v2 !== v1) { const k = Math.min(1, u / morph); for (let j = 0; j < 3; j++) { const f = v1[j] + (v2[j] - v1[j]) * k; set(F[j], f, f / BW[j]); } }
      jit += (R() - 0.5) * 0.003; jit *= 0.996;
      const f = o.f0 * o.pitch(u) * (1 + vd * Math.sin(6.283 * vf * t + vp) + jit);
      ph += f / SR; if (ph >= 1) ph -= 1;
      const g = ph < 0.42 ? 0.5 * (1 - Math.cos(Math.PI * ph / 0.42)) : ph < 0.58 ? Math.cos(Math.PI * (ph - 0.42) / 0.32) : 0;
      let src = (g - pg) * 9; pg = g;
      sh += (src - sh) * tilt; src = sh + (R() * 2 - 1) * o.breath; // spectral tilt (softer voices are darker) + breath
      let y = 0; for (let j = 0; j < 3; j++) y += run(F[j], src) * WT[j];
      const ea = Math.min(1, t / o.att), er = Math.max(0, Math.min(1, (o.dur - t) / o.rel));
      const env = ea * ea * (3 - 2 * ea) * er * er * (o.trem ? 1 - o.trem * (0.5 + 0.5 * Math.sin(6.283 * 3.2 * t + vp)) : 1);
      let k = s0 + i; if (o.wrap) k %= N; else if (k >= N) break;
      out[k] += y * env * o.amp;
    }
  }
  // band-limited noise with an envelope function (crowd "roar", breath, rumble, hiss)
  function noise(out, t0, dur, amp, lo, hi, envFn, wrap) {
    const N = out.length, n = Math.floor(dur * SR), s0 = Math.floor(t0 * SR);
    const al = 1 - Math.exp(-2 * Math.PI * hi / SR), ah = 1 - Math.exp(-2 * Math.PI * lo / SR);
    let l1 = 0, l2 = 0, h = 0;
    for (let i = 0; i < n; i++) {
      const x = R() * 2 - 1; l1 += (x - l1) * al; l2 += (l1 - l2) * al; h += (l2 - h) * ah;
      let k = s0 + i; if (wrap) k %= N; else if (k >= N) break;
      out[k] += (l2 - h) * amp * envFn(i / n);
    }
  }
  function clap(out, t, amp) {
    const s0 = Math.floor(t * SR), F = bq(900 + R() * 1500, 1.1 + R() * 0.8), n = Math.floor(0.03 * SR);
    for (let i = 0; i < n && s0 + i < out.length; i++) { const tt = i / SR; const e = Math.exp(-tt / 0.0045) + 0.35 * Math.exp(-Math.max(0, tt - 0.006) / 0.004) * (tt > 0.006 ? 1 : 0); out[s0 + i] += run(F, R() * 2 - 1) * e * amp; }
  }
  function normalize(a, peak = 0.9) { let m = 0; for (const x of a) m = Math.max(m, Math.abs(x)); if (m > 0) { const k = peak / m; for (let i = 0; i < a.length; i++) a[i] *= k; } return a; }
  function fade(a, fi, fo) { const ni = Math.floor(fi * SR), no = Math.floor(fo * SR); for (let i = 0; i < ni; i++) a[i] *= i / ni; for (let i = 0; i < no; i++) a[a.length - 1 - i] *= i / no; return a; }

  /* ---- builders ---- */
  function cheer(dur = 3.4, nV = 34, big = false) {
    const out = new Float32Array(Math.floor(dur * SR));
    for (let v = 0; v < nV; v++) {
      const m = male(), t0 = Math.pow(R(), 2.2) * (big ? 0.5 : 0.3), d = Math.min(dur - t0 - 0.05, 1.1 + R() * (dur - 1.3));
      const [a, b] = pick([['oo', 'ah'], ['eh', 'ah'], ['ah', 'ah'], ['oh', 'ah'], ['ee', 'eh'], ['oo', 'oo'], ['ae', 'ah'], ['uh', 'ah']]);
      const rise = (a === 'oo' ? 0.45 : 0.2) + R() * 0.35, peakAt = 0.15 + R() * 0.2;
      voice(out, { t0, dur: d, f0: f0For(m) * (big ? 1.15 : 1.05), v1: a, v2: b, amp: (0.35 + R() * 0.75) * (R() < 0.25 ? 0.4 : 1),
        att: 0.04 + R() * 0.2, rel: 0.35 + R() * 0.9, breath: 0.25 + R() * 0.35, vib: 0.01 + R() * 0.02, tilt: 0.4 + R() * 0.35,
        pitch: (u) => (u < peakAt ? 1 + rise * (u / peakAt) : 1 + rise * (1 - (u - peakAt) * 0.55)) });
    }
    noise(out, 0, dur, big ? 0.55 : 0.4, 250, 3200, (u) => Math.min(1, u / 0.05) * Math.pow(1 - u, 1.4));
    noise(out, 0, dur, 0.18, 2500, 7000, (u) => Math.min(1, u / 0.04) * Math.pow(1 - u, 2));
    const nc = Math.floor(dur * (big ? 55 : 32));
    for (let i = 0; i < nc; i++) { const t = 0.25 + Math.pow(R(), 0.8) * (dur - 0.4); clap(out, t, (0.12 + R() * 0.22) * (1 - t / dur * 0.6)); }
    return fade(normalize(out), 0.005, 0.25);
  }
  function groan(dur = 1.9) {
    const out = new Float32Array(Math.floor(dur * SR));
    for (let v = 0; v < 28; v++) {
      const m = R() < 0.75, t0 = R() * 0.22, d = Math.min(dur - t0, 0.8 + R() * 0.9);
      voice(out, { t0, dur: d, f0: f0For(m) * 0.95, v1: pick(['aw', 'oh', 'uh']), v2: 'oo', morph: 0.9, amp: 0.3 + R() * 0.6, att: 0.06 + R() * 0.12, rel: 0.4 + R() * 0.4,
        breath: 0.3 + R() * 0.3, tilt: 0.3 + R() * 0.25, pitch: (u) => 1 + 0.08 * Math.sin(Math.PI * Math.min(1, u * 2.5)) - 0.32 * u });
    }
    noise(out, 0, dur, 0.22, 200, 1800, (u) => Math.min(1, u / 0.1) * (1 - u));
    return fade(normalize(out, 0.8), 0.01, 0.3);
  }
  function ooh(dur = 1.5) {
    const out = new Float32Array(Math.floor(dur * SR));
    for (let v = 0; v < 26; v++) {
      const m = male(), t0 = R() * 0.12, d = Math.min(dur - t0, 0.7 + R() * 0.7);
      voice(out, { t0, dur: d, f0: f0For(m), v1: 'oo', v2: pick(['oh', 'oo', 'aw']), morph: 0.8, amp: 0.3 + R() * 0.6, att: 0.05 + R() * 0.1, rel: 0.3 + R() * 0.4,
        breath: 0.25 + R() * 0.25, tilt: 0.35 + R() * 0.3, pitch: (u) => 1 + 0.28 * Math.sin(Math.PI * u) });
    }
    noise(out, 0, dur, 0.16, 250, 2000, (u) => Math.sin(Math.PI * u));
    return fade(normalize(out, 0.8), 0.01, 0.25);
  }
  function chant() { // "DE-FENSE!" clap clap, twice
    const dur = 4.2, out = new Float32Array(Math.floor(dur * SR));
    for (const T of [0.1, 2.15]) {
      for (let v = 0; v < 30; v++) {
        const m = R() < 0.7, f0 = (m ? 105 + R() * 60 : 200 + R() * 70), j = (R() - 0.5) * 0.06;
        voice(out, { t0: T + j, dur: 0.3, f0, v1: 'ee', amp: 0.5 + R() * 0.5, att: 0.03, rel: 0.08, breath: 0.2, tilt: 0.6, pitch: () => 1.08 });
        voice(out, { t0: T + 0.42 + j, dur: 0.42, f0, v1: 'eh', amp: 0.55 + R() * 0.5, att: 0.03, rel: 0.12, breath: 0.2, tilt: 0.6, pitch: (u) => 1 - 0.14 * u });
      }
      noise(out, T + 0.36, 0.06, 0.5, 2500, 7000, (u) => Math.sin(Math.PI * u)); // "f"
      noise(out, T + 0.8, 0.16, 0.6, 4000, 9000, (u) => Math.sin(Math.PI * u)); // "s"
      for (const c of [1.1, 1.42]) for (let k = 0; k < 40; k++) clap(out, T + c + (R() - 0.5) * 0.05, 0.12 + R() * 0.15);
    }
    noise(out, 0, dur, 0.12, 200, 2000, () => 1);
    return fade(normalize(out, 0.85), 0.02, 0.2);
  }
  function bed(dur = 7) { // seamless loop of arena chatter
    const out = new Float32Array(Math.floor(dur * SR));
    for (let v = 0; v < 44; v++) {
      const m = male(), base = f0For(m) * 0.9, amp = 0.12 + R() * 0.45, dark = 0.2 + R() * 0.3;
      let t = R() * dur; const end = t + dur;
      while (t < end) {
        const d = 0.08 + R() * 0.2, dir = R() < 0.5 ? 0.07 : -0.07;
        voice(out, { t0: t % dur, dur: d, f0: base * (0.9 + R() * 0.25), v1: pick(Object.keys(VOW)), v2: pick(Object.keys(VOW)), morph: 1, amp, att: 0.02, rel: 0.04, breath: 0.35, tilt: dark, wrap: true, vib: 0.005, pitch: (u) => 1 + dir * u });
        t += d + 0.02 + R() * 0.1 + (R() < 0.12 ? 0.4 + R() * 1.2 : 0);
      }
    }
    noise(out, 0, dur, 0.5, 60, 450, () => 1, true);   // arena rumble
    noise(out, 0, dur, 0.12, 400, 2500, () => 1, true); // general hubbub
    return normalize(out, 0.7);
  }
  function bounce() {
    const n = Math.floor(0.32 * SR), out = new Float32Array(n), F = bq(2600, 1.2);
    for (let i = 0; i < n; i++) {
      const t = i / SR;
      out[i] = Math.sin(6.283 * (70 * t + 90 * 0.012 * (1 - Math.exp(-t / 0.012)))) * Math.exp(-t / 0.05) * 0.9 // body thump
        + Math.sin(6.283 * 420 * t) * Math.exp(-t / 0.07) * 0.16 // hardwood ring
        + Math.sin(6.283 * 1180 * t) * Math.exp(-t / 0.012) * 0.08 // leather slap
        + run(F, R() * 2 - 1) * Math.exp(-t / 0.002) * 0.6; // contact click
    }
    return normalize(out, 0.9);
  }
  function squeak() {
    const d = 0.08 + R() * 0.12, n = Math.floor(d * SR), out = new Float32Array(n), f0 = 1700 + R() * 1300, sw = (R() < 0.5 ? 1 : -1) * (300 + R() * 700);
    let ph = 0;
    for (let i = 0; i < n; i++) { const u = i / n, t = i / SR, f = f0 + sw * u + 180 * Math.sin(6.283 * (35 + R() * 4) * t); ph += f / SR; const e = Math.min(1, u / 0.12) * Math.pow(1 - u, 0.6);
      out[i] = (Math.sin(6.283 * ph) + 0.35 * Math.sin(12.566 * ph) + 0.15 * (R() * 2 - 1)) * e; }
    return normalize(out, 0.8);
  }
  return { SR, cheer, groan, ooh, chant, bed, bounce, squeak };
})();
