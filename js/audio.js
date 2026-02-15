window.App = window.App || {};

let audioCtx = null;

function getAudioContext() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  return audioCtx;
}

// Standard beep (used for BELL character etc.)
App.beep = function(duration, frequency) {
  if (duration === undefined) duration = 200;
  if (frequency === undefined) frequency = 800;
  try {
    const ctx = getAudioContext();
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.connect(gain);
    gain.connect(ctx.destination);
    oscillator.type = 'square';
    oscillator.frequency.value = frequency;
    gain.gain.value = 0.1;
    oscillator.start();
    oscillator.stop(ctx.currentTime + duration / 1000);
  } catch (e) { /* Audio not available */ }
};

// Apple II power-on beep: 1-bit speaker toggling at ~1kHz
// The real Apple II beep was harsh and buzzy
App.appleBeep = function() {
  try {
    const ctx = getAudioContext();
    const t = ctx.currentTime;
    const duration = 0.2;

    // Square wave at 1000Hz (the classic Apple II beep frequency)
    const osc = ctx.createOscillator();
    osc.type = 'square';
    osc.frequency.value = 1000;

    // Add harmonics to make it sound more like a 1-bit speaker
    const osc2 = ctx.createOscillator();
    osc2.type = 'square';
    osc2.frequency.value = 2000;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.08, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + duration);

    const gain2 = ctx.createGain();
    gain2.gain.setValueAtTime(0.03, t);
    gain2.gain.exponentialRampToValueAtTime(0.001, t + duration);

    // Slight distortion via waveshaper for that 1-bit crunch
    const shaper = ctx.createWaveShaper();
    const curve = new Float32Array(256);
    for (let i = 0; i < 256; i++) {
      const x = (i * 2) / 256 - 1;
      curve[i] = x > 0 ? 1 : -1;  // hard clip = 1-bit feel
    }
    shaper.curve = curve;

    osc.connect(gain);
    osc2.connect(gain2);
    gain.connect(shaper);
    gain2.connect(shaper);
    shaper.connect(ctx.destination);

    osc.start(t);
    osc.stop(t + duration);
    osc2.start(t);
    osc2.stop(t + duration);
  } catch (e) { /* Audio not available */ }
};

// Disk II stepper motor click - sharp mechanical impulse
App.diskClick = function() {
  try {
    const ctx = getAudioContext();
    const t = ctx.currentTime;

    // Short noise burst = mechanical click
    const bufferSize = ctx.sampleRate * 0.012;  // 12ms
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      // Exponential decay noise
      const env = Math.exp(-i / (bufferSize * 0.15));
      data[i] = (Math.random() * 2 - 1) * env;
    }

    const source = ctx.createBufferSource();
    source.buffer = buffer;

    // Bandpass to make it sound mechanical, not hissy
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 800 + Math.random() * 400;
    filter.Q.value = 2;

    const gain = ctx.createGain();
    gain.gain.value = 0.15;

    source.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    source.start(t);
  } catch (e) { /* Audio not available */ }
};

// Disk II motor spin - continuous whirring noise
App.diskMotorStart = function() {
  try {
    const ctx = getAudioContext();
    const t = ctx.currentTime;

    // Low frequency oscillation = motor spin
    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.value = 300;

    // Modulate with low frequency for the "whirring" feel
    const lfo = ctx.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.value = 10;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 30;
    lfo.connect(lfoGain);
    lfoGain.connect(osc.frequency);

    // Noise component for the mechanical hiss
    const bufferSize = ctx.sampleRate * 2;
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const noiseData = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      noiseData[i] = Math.random() * 2 - 1;
    }
    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuffer;
    noise.loop = true;

    const noiseFilter = ctx.createBiquadFilter();
    noiseFilter.type = 'bandpass';
    noiseFilter.frequency.value = 400;
    noiseFilter.Q.value = 3;

    const noiseGain = ctx.createGain();
    noiseGain.gain.value = 0.02;

    const motorGain = ctx.createGain();
    motorGain.gain.setValueAtTime(0.001, t);
    motorGain.gain.linearRampToValueAtTime(0.04, t + 0.3);

    const masterGain = ctx.createGain();
    masterGain.gain.value = 1;

    osc.connect(motorGain);
    motorGain.connect(masterGain);
    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(masterGain);
    masterGain.connect(ctx.destination);

    osc.start(t);
    lfo.start(t);
    noise.start(t);

    // Return a stop function
    return {
      stop: function(fadeTime) {
        const now = ctx.currentTime;
        const fade = fadeTime || 0.3;
        masterGain.gain.linearRampToValueAtTime(0.001, now + fade);
        setTimeout(function() {
          try { osc.stop(); lfo.stop(); noise.stop(); } catch(e) {}
        }, fade * 1000 + 50);
      }
    };
  } catch (e) {
    return { stop: function() {} };
  }
};

// Disk II head seek - rapid series of stepper clicks
App.diskSeek = function(steps, interval) {
  steps = steps || 8;
  interval = interval || 40;
  return new Promise(function(resolve) {
    var i = 0;
    var timer = setInterval(function() {
      if (i >= steps) {
        clearInterval(timer);
        resolve();
        return;
      }
      App.diskClick();
      i++;
    }, interval + Math.random() * 20);
  });
};

// Memory test "tick" - very short click
App.memTick = function() {
  try {
    const ctx = getAudioContext();
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    osc.type = 'square';
    osc.frequency.value = 4000;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.04, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.015);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.02);
  } catch (e) { /* Audio not available */ }
};

// CRT power-on "thunk" - the electromagnetic pop when a CRT powers on
App.crtPop = function() {
  try {
    const ctx = getAudioContext();
    const t = ctx.currentTime;

    // Low frequency thump
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(150, t);
    osc.frequency.exponentialRampToValueAtTime(30, t + 0.1);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.12, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.2);

    // High frequency crackle
    const bufSize = ctx.sampleRate * 0.05;
    const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < bufSize; i++) {
      d[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufSize * 0.1));
    }
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const g2 = ctx.createGain();
    g2.gain.value = 0.06;
    src.connect(g2);
    g2.connect(ctx.destination);
    src.start(t);
  } catch (e) { /* Audio not available */ }
};

// CRT power-off "fzzt" - the degaussing sound
App.crtOff = function() {
  try {
    const ctx = getAudioContext();
    const t = ctx.currentTime;

    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(2000, t);
    osc.frequency.exponentialRampToValueAtTime(60, t + 0.25);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.08, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.35);
  } catch (e) { /* Audio not available */ }
};
