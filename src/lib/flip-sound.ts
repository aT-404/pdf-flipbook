/**
 * A soft, realistic "paper page turn" sound synthesized using the Web Audio API.
 * No external sound file is needed, so it works offline and in single-file exports.
 */
export function createFlipSound(): () => void {
  let context: AudioContext | null = null;
  let noise: AudioBuffer | null = null;
  let lastPlayed = 0;

  return function play() {
    const now = performance.now();
    if (now - lastPlayed < 350) return;
    lastPlayed = now;

    try {
      const Ctor =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return;
      if (!context) context = new Ctor();
      if (context.state === 'suspended') void context.resume();

      if (!noise) {
        noise = context.createBuffer(1, Math.floor(context.sampleRate * 0.4), context.sampleRate);
        const data = noise.getChannelData(0);
        for (let i = 0; i < data.length; i++) {
          data[i] = Math.random() * 2 - 1;
        }
      }

      const t = context.currentTime;

      // 1) Primary paper friction / sliding rustle (sweeping bandpass)
      const rustle = context.createBufferSource();
      rustle.buffer = noise;

      const band = context.createBiquadFilter();
      band.type = 'bandpass';
      band.Q.value = 1.1;
      band.frequency.setValueAtTime(1500, t);
      band.frequency.exponentialRampToValueAtTime(3200, t + 0.16);

      const rustleGain = context.createGain();
      rustleGain.gain.setValueAtTime(0.0001, t);
      rustleGain.gain.exponentialRampToValueAtTime(0.08, t + 0.03);
      rustleGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);

      rustle.connect(band).connect(rustleGain).connect(context.destination);
      rustle.start(t, Math.random() * 0.1);
      rustle.stop(t + 0.25);

      // 2) High-frequency paper crispness / flutter
      const flutter = context.createBufferSource();
      flutter.buffer = noise;

      const high = context.createBiquadFilter();
      high.type = 'highpass';
      high.frequency.value = 2600;

      const flutterGain = context.createGain();
      flutterGain.gain.setValueAtTime(0.0001, t + 0.03);
      flutterGain.gain.exponentialRampToValueAtTime(0.035, t + 0.07);
      flutterGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.19);

      flutter.connect(high).connect(flutterGain).connect(context.destination);
      flutter.start(t + 0.03, Math.random() * 0.1);
      flutter.stop(t + 0.25);

      // 3) Gentle paper contact (soft low-mid resting sound, no heavy slap)
      const land = context.createBufferSource();
      land.buffer = noise;

      const lowMid = context.createBiquadFilter();
      lowMid.type = 'bandpass';
      lowMid.Q.value = 1.0;
      lowMid.frequency.value = 500;

      const landGain = context.createGain();
      landGain.gain.setValueAtTime(0.0001, t + 0.12);
      landGain.gain.exponentialRampToValueAtTime(0.03, t + 0.15);
      landGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.24);

      land.connect(lowMid).connect(landGain).connect(context.destination);
      land.start(t + 0.12, Math.random() * 0.1);
      land.stop(t + 0.25);
    } catch {
      /* sound is optional */
    }
  };
}

export const playFlipSound = createFlipSound();

