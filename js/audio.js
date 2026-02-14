let audioCtx = null;

function getAudioContext() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  return audioCtx;
}

export function beep(duration = 200, frequency = 800) {
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
}
