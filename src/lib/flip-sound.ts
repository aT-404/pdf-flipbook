/**
 * An ultra-subtle, smooth "paper whisper" sound synthesized using Web Audio API.
 * Designed to feel completely natural, light, and non-distracting.
 */
export function createFlipSound(): () => void {
  let context: AudioContext | null = null;
  let noise: AudioBuffer | null = null;
  let lastPlayed = 0;

  return function play() {
    const now = performance.now();
    if (now - lastPlayed < 300) return;
    lastPlayed = now;

    try {
      const Ctor =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return;
      if (!context) context = new Ctor();
      if (context.state === 'suspended') void context.resume();

      if (!noise) {
        noise = context.createBuffer(1, Math.floor(context.sampleRate * 0.3), context.sampleRate);
        const data = noise.getChannelData(0);
        for (let i = 0; i < data.length; i++) {
          data[i] = Math.random() * 2 - 1;
        }
      }

      const t = context.currentTime;

      // 1) Featherlight paper slide (smooth whisper)
      const source = context.createBufferSource();
      source.buffer = noise;

      const band = context.createBiquadFilter();
      band.type = 'bandpass';
      band.Q.value = 0.7;
      band.frequency.setValueAtTime(1800, t);
      band.frequency.exponentialRampToValueAtTime(2400, t + 0.14);

      const gain = context.createGain();
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.linearRampToValueAtTime(0.022, t + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);

      source.connect(band).connect(gain).connect(context.destination);
      source.start(t, Math.random() * 0.1);
      source.stop(t + 0.2);

      // 2) Faint low-mid cushion for natural paper body
      const cushion = context.createBufferSource();
      cushion.buffer = noise;

      const low = context.createBiquadFilter();
      low.type = 'lowpass';
      low.frequency.value = 1000;

      const cushionGain = context.createGain();
      cushionGain.gain.setValueAtTime(0.0001, t + 0.02);
      cushionGain.gain.linearRampToValueAtTime(0.008, t + 0.06);
      cushionGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);

      cushion.connect(low).connect(cushionGain).connect(context.destination);
      cushion.start(t + 0.02, Math.random() * 0.1);
      cushion.stop(t + 0.18);
    } catch {
      /* sound is optional */
    }
  };
}

export const playFlipSound = createFlipSound();

