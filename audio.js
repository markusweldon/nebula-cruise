// Procedural hyperdrive hum — Web Audio only, zero audio files.
// Two detuned sawtooths through a lowpass (the drone), looped white noise
// through a bandpass (the wind), a slow LFO throb, all into one master gain.
window.EngineAudio = (function () {
  const LEVEL = 0.35;

  let ctx = null;
  let master, lowpass, bandpass, noiseGain, lfo, osc1, osc2;
  let muted = true;
  let speed = 1;

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

    // Slow throb: LFO wobbles a unity-gain stage, so muting master stays silent
    const throb = ctx.createGain();
    throb.gain.value = 1;
    throb.connect(master);
    lfo = ctx.createOscillator();
    lfo.type = "sine";
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 0.15;
    lfo.connect(lfoGain);
    lfoGain.connect(throb.gain);
    lfo.start();

    // Drone
    const droneGain = ctx.createGain();
    droneGain.gain.value = 0.5;
    droneGain.connect(throb);
    lowpass = ctx.createBiquadFilter();
    lowpass.type = "lowpass";
    lowpass.connect(droneGain);
    osc1 = ctx.createOscillator();
    osc1.type = "sawtooth";
    osc2 = ctx.createOscillator();
    osc2.type = "sawtooth";
    osc2.detune.value = 7;
    osc1.connect(lowpass);
    osc2.connect(lowpass);
    osc1.start();
    osc2.start();

    // Wind: 2 seconds of looped white noise
    const buffer = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    noise.loop = true;
    bandpass = ctx.createBiquadFilter();
    bandpass.type = "bandpass";
    noiseGain = ctx.createGain();
    noise.connect(bandpass);
    bandpass.connect(noiseGain);
    noiseGain.connect(throb);
    noise.start();

    setSpeed(speed);
  }

  function setSpeed(value) {
    speed = value;
    if (!ctx) return;
    const n = (speed - 1) / 29;
    const t = ctx.currentTime;
    osc1.frequency.setTargetAtTime(40 + 85 * n, t, 0.2);
    osc2.frequency.setTargetAtTime(40 + 85 * n, t, 0.2);
    lowpass.frequency.setTargetAtTime(150 + 1400 * n, t, 0.2);
    bandpass.frequency.setTargetAtTime(300 + 2600 * n, t, 0.2);
    lfo.frequency.setTargetAtTime(0.15 + 1.1 * n, t, 0.2);
    noiseGain.gain.setTargetAtTime(0.15 + 0.2 * n, t, 0.2);
  }

  return {
    init: init,
    setSpeed: setSpeed,
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
