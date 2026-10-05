/**
 * A soft "paper page turn" sound made with the browser's audio tools.
 * No sound file is needed, so it also works offline.
 * (Browsers only allow sound after the person has clicked or touched the page.
 * Turning a page is always such an action.)
 */
export function createFlipSound(): () => void {
  let context: AudioContext | null = null;
  let noise: AudioBuffer | null = null;
  let lastPlayed = 0;

  return function play() {
    // one sound per page turn, even if two signals arrive together
    const now = performance.now();
    if (now - lastPlayed < 500) return;
    lastPlayed = now;
    try {
      const Ctor =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return;
      if (!context) context = new Ctor();
      if (context.state === 'suspended') void context.resume();

      if (!noise) {
        noise = context.createBuffer(1, Math.floor(context.sampleRate * 0.6), context.sampleRate);
        const data = noise.getChannelData(0);
        for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
      }

      const t = context.currentTime;

      // 1) the "swish" of the page moving through the air
      const swish = context.createBufferSource();
      swish.buffer = noise;
      const band = context.createBiquadFilter();
      band.type = 'bandpass';
      band.Q.value = 0.8;
      band.frequency.setValueAtTime(900, t);
      band.frequency.exponentialRampToValueAtTime(4200, t + 0.28);
      const swishGain = context.createGain();
      swishGain.gain.setValueAtTime(0.0001, t);
      swishGain.gain.exponentialRampToValueAtTime(0.45, t + 0.04);
      swishGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.4);
      swish.connect(band).connect(swishGain).connect(context.destination);
      swish.start(t, Math.random() * 0.15);
      swish.stop(t + 0.45);

      // 2) a very soft "thup" as the page lands
      const thud = context.createBufferSource();
      thud.buffer = noise;
      const low = context.createBiquadFilter();
      low.type = 'lowpass';
      low.frequency.value = 420;
      const thudGain = context.createGain();
      thudGain.gain.setValueAtTime(0.0001, t + 0.26);
      thudGain.gain.exponentialRampToValueAtTime(0.3, t + 0.285);
      thudGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.4);
      thud.connect(low).connect(thudGain).connect(context.destination);
      thud.start(t + 0.26, Math.random() * 0.15);
      thud.stop(t + 0.45);
    } catch {
      /* sound is optional: never break reading because of it */
    }
  };
}

export const playFlipSound = createFlipSound();
