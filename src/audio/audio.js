// All sound is synthesized with Web Audio: no audio files.
// The context starts on the first user gesture (PLAY in the cold open).

export function createAudio() {
  let ctx = null;
  let master = null;
  let noise = null;
  let enabled = true;

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
      loop('lowpass', 900, 0.05);    // rain on the roof
      loop('highpass', 5200, 0.012); // tape hiss
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
  };
}
