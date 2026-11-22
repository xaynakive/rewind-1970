// All sound is synthesized with Web Audio: no audio files.
// The context starts on the first user gesture (PLAY in the cold open).

export function createAudio() {
  let ctx = null;
  let master = null;
  let noise = null;
  let rain = null;
  let rainLevel = 1;
  let enabled = true;
  const RAIN_GAIN = 0.07;

  function noiseBuffer(seconds) {
    const buf = ctx.createBuffer(1, ctx.sampleRate * seconds, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return buf;
  }

  function loop(filterType, freq, gain) {
    const src = ctx.createBufferSource();
    src.buffer = noise;
    src.loop = true;
    const f = ctx.createBiquadFilter();
    f.type = filterType;
    f.frequency.value = freq;
    const g = ctx.createGain();
    g.gain.value = gain;
    src.connect(f).connect(g).connect(master);
    src.start();
    return g;
  }

  return {
    get started() { return ctx !== null; },

    start() {
      if (ctx) { ctx.resume(); return; }
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = enabled ? 0.8 : 0;
      master.connect(ctx.destination);
      noise = noiseBuffer(2);
      rain = loop('lowpass', 900, RAIN_GAIN * rainLevel); // rain
      loop('highpass', 5200, 0.012); // tape hiss
    },

    /** Rain loudness: 1 outdoors, lower indoors. Fades over about a second. */
    setRain(level) {
      rainLevel = level;
      if (rain) rain.gain.setTargetAtTime(RAIN_GAIN * level, ctx.currentTime, 0.4);
    },

    setEnabled(on) {
      enabled = on;
      if (master) master.gain.setTargetAtTime(on ? 0.8 : 0, ctx.currentTime, 0.05);
    },

    thunder(delayMs = 0) {
      if (!ctx) return;
      const t = ctx.currentTime + delayMs / 1000;
      const src = ctx.createBufferSource();
      src.buffer = noise;
      src.playbackRate.value = 0.5;
      const f = ctx.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = 170;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.55, t + 0.12);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 3.6);
      src.connect(f).connect(g).connect(master);
      src.start(t);
      src.stop(t + 3.8);
    },

    /**
     * Rewind whirr: a motor that spins up while the tape rewinds.
     * Returns a function that stops it.
     */
    whirr(durationMs) {
      if (!ctx) return () => {};
      const t = ctx.currentTime;
      const osc = ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(90, t);
      osc.frequency.exponentialRampToValueAtTime(520, t + durationMs / 1000);
      const f = ctx.createBiquadFilter();
      f.type = 'bandpass';
      f.frequency.value = 900;
      f.Q.value = 0.7;
      const hiss = ctx.createBufferSource();
      hiss.buffer = noise;
      hiss.loop = true;
      const hf = ctx.createBiquadFilter();
      hf.type = 'highpass';
      hf.frequency.value = 3000;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.05, t + 0.15);
      osc.connect(f).connect(g);
      hiss.connect(hf).connect(g);
      g.connect(master);
      osc.start(t);
      hiss.start(t);
      let stopped = false;
      return () => {
        if (stopped) return;
        stopped = true;
        const now = ctx.currentTime;
        g.gain.cancelScheduledValues(now);
        g.gain.setValueAtTime(Math.max(g.gain.value, 0.0001), now);
        g.gain.exponentialRampToValueAtTime(0.0001, now + 0.12);
        osc.stop(now + 0.15);
        hiss.stop(now + 0.15);
      };
    },

    /** A soft drop into still water. */
    plop() {
      if (!ctx) return;
      const t = ctx.currentTime;
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(520, t);
      osc.frequency.exponentialRampToValueAtTime(140, t + 0.18);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.08, t + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.3);
      osc.connect(g).connect(master);
      osc.start(t);
      osc.stop(t + 0.32);
    },

    /** One music-box note: a bright sine with a quick fall. Haewol's lullaby. */
    chime(hz, delayMs = 0, ms = 600, gain = 0.07) {
      if (!ctx) return;
      const t = ctx.currentTime + delayMs / 1000;
      for (const [mult, g0] of [[1, 1], [2, 0.35], [3.01, 0.12]]) {
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.value = hz * mult;
        const g = ctx.createGain();
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(gain * g0, t + 0.008);
        g.gain.exponentialRampToValueAtTime(0.0001, t + Math.max(0.25, ms / 1000) * 1.6);
        osc.connect(g).connect(master);
        osc.start(t);
        osc.stop(t + Math.max(0.25, ms / 1000) * 1.7);
      }
    },

    /** Mechanical clunk and motor whine when a tape starts. */
    tapeStart() {
      if (!ctx) return;
      const t = ctx.currentTime;
      const click = ctx.createBufferSource();
      click.buffer = noise;
      const cf = ctx.createBiquadFilter();
      cf.type = 'bandpass';
      cf.frequency.value = 1800;
      const cg = ctx.createGain();
      cg.gain.setValueAtTime(0.4, t);
      cg.gain.exponentialRampToValueAtTime(0.0001, t + 0.06);
      click.connect(cf).connect(cg).connect(master);
      click.start(t);
      click.stop(t + 0.08);

      const osc = ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(38, t + 0.05);
      osc.frequency.exponentialRampToValueAtTime(96, t + 0.7);
      const of = ctx.createBiquadFilter();
      of.type = 'lowpass';
      of.frequency.value = 420;
      const og = ctx.createGain();
      og.gain.setValueAtTime(0.0001, t + 0.05);
      og.gain.exponentialRampToValueAtTime(0.06, t + 0.2);
      og.gain.exponentialRampToValueAtTime(0.0001, t + 1.1);
      osc.connect(of).connect(og).connect(master);
      osc.start(t + 0.05);
      osc.stop(t + 1.2);
    },

    // ----- memories (spec: memories, Requirement 5.7) -----

    /** A short filtered noise hit: footsteps, drawers, the presence's steps. */
    knock({ freq = 400, q = 1, gain = 0.1, length = 0.08, rate = 1, delay = 0 } = {}) {
      if (!ctx) return;
      const t = ctx.currentTime + delay;
      const src = ctx.createBufferSource();
      src.buffer = noise;
      src.playbackRate.value = rate;
      const f = ctx.createBiquadFilter();
      f.type = 'bandpass';
      f.frequency.value = freq;
      f.Q.value = q;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(Math.max(0.0002, gain), t + 0.005);
      g.gain.exponentialRampToValueAtTime(0.0001, t + length);
      src.connect(f).connect(g).connect(master);
      src.start(t, Math.random() * 1.5);
      src.stop(t + length + 0.02);
    },

    /** The user's footstep on tiles. */
    footstep(sneak) {
      this.knock({ freq: 260 + Math.random() * 120, q: 1.4, gain: sneak ? 0.035 : 0.08, length: 0.09 });
    },

    /** The presence's footstep: heavier, slower, at a loudness that tells you how close it is. */
    presenceStep(level) {
      if (level < 0.02) return;
      this.knock({ freq: 120 + Math.random() * 30, q: 2, gain: 0.18 * level, length: 0.16, rate: 0.6 });
    },

    /** Drawer slide, lid, cabinet door, shutter. */
    furniture(kind) {
      if (kind === 'shutter') {
        for (let i = 0; i < 9; i++) this.knock({ freq: 700 + Math.random() * 500, q: 3, gain: 0.06, length: 0.06, delay: i * 0.07 });
      } else if (kind === 'drawer') {
        this.knock({ freq: 520, q: 0.8, gain: 0.07, length: 0.28, rate: 0.7 });
      } else {
        this.knock({ freq: 900, q: 6, gain: 0.05, length: 0.35, rate: 0.4 }); // a creak
      }
    },

    /** Continuous levels 0..1: heartbeat (the presence is near), the market's murmur, radio static. */
    setMemoryLevels({ heartbeat = 0, murmur = 0, radio = 0 }) {
      if (!ctx) return;
      if (!this._mem) {
        const m = {};
        m.murmur = loop('bandpass', 380, 0);
        m.radio = loop('bandpass', 2400, 0);
        m.heartbeat = 0;
        m.nextBeat = 0;
        this._mem = m;
      }
      const m = this._mem;
      m.murmur.gain.setTargetAtTime(0.05 * murmur, ctx.currentTime, 0.5);
      m.radio.gain.setTargetAtTime(0.06 * radio, ctx.currentTime, 0.2);
      m.heartbeat = heartbeat;
      // Heartbeat: lub-dub, faster and louder as it comes closer.
      if (heartbeat > 0.05 && ctx.currentTime >= m.nextBeat) {
        const t = ctx.currentTime;
        for (const [d, g] of [[0, 1], [0.16, 0.7]]) {
          const osc = ctx.createOscillator();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(62, t + d);
          osc.frequency.exponentialRampToValueAtTime(40, t + d + 0.12);
          const og = ctx.createGain();
          og.gain.setValueAtTime(0.0001, t + d);
          og.gain.exponentialRampToValueAtTime(0.25 * heartbeat * g, t + d + 0.02);
          og.gain.exponentialRampToValueAtTime(0.0001, t + d + 0.18);
          osc.connect(og).connect(master);
          osc.start(t + d);
          osc.stop(t + d + 0.2);
        }
        m.nextBeat = t + 1.1 - 0.55 * heartbeat;
      }
    },

    /** A burst of tape static: being caught, the end of a memory. */
    staticBurst(seconds = 1.2) {
      if (!ctx) return;
      const t = ctx.currentTime;
      const src = ctx.createBufferSource();
      src.buffer = noise;
      src.loop = true;
      const f = ctx.createBiquadFilter();
      f.type = 'highpass';
      f.frequency.value = 900;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      // Swells in over a fifth of a second: unsettling, never a loud sting (product.md).
      g.gain.exponentialRampToValueAtTime(0.11, t + 0.2);
      g.gain.setValueAtTime(0.11, t + seconds * 0.6);
      g.gain.exponentialRampToValueAtTime(0.0001, t + seconds);
      src.connect(f).connect(g).connect(master);
      src.start(t);
      src.stop(t + seconds + 0.05);
    },
  };
}
