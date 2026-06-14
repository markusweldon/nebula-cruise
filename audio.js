// Procedural spacecraft sound — Web Audio only, zero audio files.
// A deep engine roar (brown noise through a resonant lowpass + detuned sub-bass +
// a faint turbine whine) that scales with warp speed, plus a one-shot "jump to
// hyperspace" whoosh. Original synth design, not movie audio.
window.EngineAudio = (function () {
  const LEVEL = 0.4;

  let ctx = null;
  let master;
  let roarLP, roarGain, sub1, sub2, whineOsc, whineBP, whineGain, lfo;
  let muted = true;
  let speed = 1;

  // ~3s of brown noise (deep rumble, not hiss), looped
  function brownNoiseBuffer() {
    const len = ctx.sampleRate * 3;
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    let last = 0;
    for (let i = 0; i < len; i++) {
      const white = Math.random() * 2 - 1;
      last = (last + 0.02 * white) / 1.02;
      d[i] = last * 3.5;
    }
    return buf;
  }

  function init() {
    if (ctx) {
      ctx.resume();
      return;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();

    master = ctx.createGain();
    master.gain.value = 0;
    master.connect(ctx.destination);

    // Engine roar: brown noise → resonant lowpass
    const noise = ctx.createBufferSource();
    noise.buffer = brownNoiseBuffer();
    noise.loop = true;
    roarLP = ctx.createBiquadFilter();
    roarLP.type = "lowpass";
    roarGain = ctx.createGain();
    roarGain.gain.value = 0.5;
    noise.connect(roarLP);
    roarLP.connect(roarGain);
    roarGain.connect(master);
    noise.start();

    // Sub-bass body: two detuned sine oscillators
    sub1 = ctx.createOscillator(); sub1.type = "sine";
    sub2 = ctx.createOscillator(); sub2.type = "sine";
    const subGain = ctx.createGain();
    subGain.gain.value = 0.35;
    sub1.connect(subGain); sub2.connect(subGain);
    subGain.connect(master);
    sub1.start(); sub2.start();

    // Turbine whine: a thin sawtooth through a bandpass, faint
    whineOsc = ctx.createOscillator(); whineOsc.type = "sawtooth";
    whineBP = ctx.createBiquadFilter();
    whineBP.type = "bandpass"; whineBP.Q.value = 8;
    whineGain = ctx.createGain();
    whineGain.gain.value = 0;
    whineOsc.connect(whineBP); whineBP.connect(whineGain);
    whineGain.connect(master);
    whineOsc.start();

    // Slow amplitude wobble so the roar breathes
    lfo = ctx.createOscillator(); lfo.type = "sine"; lfo.frequency.value = 0.25;
    const lfoGain = ctx.createGain(); lfoGain.gain.value = 0.08;
    lfo.connect(lfoGain); lfoGain.connect(roarGain.gain);
    lfo.start();

    setSpeed(speed);
  }

  function setSpeed(value) {
    speed = value;
    if (!ctx) return;
    const n = (speed - 1) / 29;
    const t = ctx.currentTime;
    const ramp = (param, v) => param.setTargetAtTime(v, t, 0.25);
    ramp(roarLP.frequency, 180 + 1300 * n);
    roarLP.Q.setTargetAtTime(1 + 6 * n, t, 0.25);
    ramp(roarGain.gain, 0.35 + 0.3 * n);
    ramp(sub1.frequency, 32 + 16 * n);
    ramp(sub2.frequency, 48 + 22 * n);
    ramp(whineOsc.frequency, 220 + 700 * n);
    ramp(whineBP.frequency, 220 + 700 * n);
    ramp(whineGain.gain, 0.015 + 0.06 * n);
    ramp(lfo.frequency, 0.25 + 1.2 * n);
  }

  // One-shot hyperspace punch: a rising filtered-noise whoosh + a pitch-dropping
  // sub boom, on their own short-lived graph that cleans itself up.
  function jump() {
    if (!ctx) return;
    ctx.resume();
    const t = ctx.currentTime;
    const out = ctx.createGain();
    out.gain.value = 1;
    out.connect(master);

    // Whoosh: white noise sweeping a bandpass upward
    const len = ctx.sampleRate * 2;
    const nb = ctx.createBuffer(1, len, ctx.sampleRate);
    const nd = nb.getChannelData(0);
    for (let i = 0; i < len; i++) nd[i] = Math.random() * 2 - 1;
    const noise = ctx.createBufferSource(); noise.buffer = nb;
    const bp = ctx.createBiquadFilter(); bp.type = "bandpass"; bp.Q.value = 1.4;
    bp.frequency.setValueAtTime(250, t);
    bp.frequency.exponentialRampToValueAtTime(5000, t + 0.7);
    bp.frequency.exponentialRampToValueAtTime(400, t + 1.8);
    const wg = ctx.createGain();
    wg.gain.setValueAtTime(0.0001, t);
    wg.gain.exponentialRampToValueAtTime(0.9, t + 0.12);
    wg.gain.exponentialRampToValueAtTime(0.0001, t + 1.9);
    noise.connect(bp); bp.connect(wg); wg.connect(out);
    noise.start(t); noise.stop(t + 2);

    // Boom: sine diving into the sub for the "punch"
    const boom = ctx.createOscillator(); boom.type = "sine";
    boom.frequency.setValueAtTime(200, t);
    boom.frequency.exponentialRampToValueAtTime(38, t + 1.2);
    const bg = ctx.createGain();
    bg.gain.setValueAtTime(0.0001, t);
    bg.gain.exponentialRampToValueAtTime(0.8, t + 0.06);
    bg.gain.exponentialRampToValueAtTime(0.0001, t + 1.6);
    boom.connect(bg); bg.connect(out);
    boom.start(t); boom.stop(t + 1.7);

    boom.onended = function () { out.disconnect(); };
  }

  return {
    init: init,
    setSpeed: setSpeed,
    jump: jump,
    setMuted: function (value) {
      muted = value;
      if (!muted) init(); // first unmute is always a user gesture
      if (!ctx) return;
      ctx.resume();
      master.gain.setTargetAtTime(muted ? 0 : LEVEL, ctx.currentTime, 0.15);
    },
    isMuted: function () {
      return muted;
    },
    suspend: function () {
      if (ctx) ctx.suspend();
    },
    resume: function () {
      if (ctx && !muted) ctx.resume();
    },
  };
})();
