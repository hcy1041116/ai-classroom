/**
 * Web Audio API synthesized sound effects for Soul Cards gacha experience.
 * No external files needed — all sounds are generated programmatically.
 */

let audioCtx: AudioContext | null = null;

function getCtx(): AudioContext {
  if (!audioCtx) audioCtx = new AudioContext();
  if (audioCtx.state === "suspended") audioCtx.resume();
  return audioCtx;
}

/* ── Helper: play a short tone ── */
function playTone(
  freq: number,
  duration: number,
  type: OscillatorType = "sine",
  gain = 0.15,
  delay = 0,
  fadeOut = true,
) {
  const ctx = getCtx();
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, ctx.currentTime + delay);
  g.gain.setValueAtTime(gain, ctx.currentTime + delay);
  if (fadeOut) {
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + duration);
  }
  osc.connect(g).connect(ctx.destination);
  osc.start(ctx.currentTime + delay);
  osc.stop(ctx.currentTime + delay + duration);
}

/* ── Helper: filtered noise burst (for whoosh / shuffle) ── */
function playNoiseBurst(duration: number, freq: number, gain = 0.08, delay = 0) {
  const ctx = getCtx();
  const bufferSize = ctx.sampleRate * duration;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1;
  }
  const source = ctx.createBufferSource();
  source.buffer = buffer;

  const filter = ctx.createBiquadFilter();
  filter.type = "bandpass";
  filter.frequency.setValueAtTime(freq, ctx.currentTime + delay);
  filter.Q.setValueAtTime(1.5, ctx.currentTime + delay);

  const g = ctx.createGain();
  g.gain.setValueAtTime(gain, ctx.currentTime + delay);
  g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + duration);

  source.connect(filter).connect(g).connect(ctx.destination);
  source.start(ctx.currentTime + delay);
  source.stop(ctx.currentTime + delay + duration);
}

/* ═══════════════════════════════════════
   Public SFX functions
   ═══════════════════════════════════════ */

export function sfxDeal(delay = 0) {
  playNoiseBurst(0.05, 2500, 0.1, delay);
  playTone(600, 0.06, "triangle", 0.04, delay);
  playNoiseBurst(0.03, 400, 0.06, delay + 0.02);
}

export function sfxShuffle() {
  const totalTicks = 18;
  for (let i = 0; i < totalTicks; i++) {
    const t = i * 0.11;
    const freq = 800 + Math.sin(i * 0.7) * 200;
    playNoiseBurst(0.04, freq, 0.06 + (i / totalTicks) * 0.04, t);
    if (i % 3 === 0) {
      playTone(1200 + i * 30, 0.05, "triangle", 0.03, t);
    }
  }
  playNoiseBurst(1.8, 200, 0.03, 0);
}

export function sfxFlip() {
  const ctx = getCtx();
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(300, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.15);
  osc.frequency.exponentialRampToValueAtTime(600, ctx.currentTime + 0.3);
  g.gain.setValueAtTime(0.08, ctx.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
  osc.connect(g).connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + 0.35);

  playNoiseBurst(0.2, 2000, 0.06, 0);
  playNoiseBurst(0.06, 500, 0.1, 0.12);
}

export function sfxReveal() {
  const notes = [523, 587, 659, 784, 880, 1047];
  notes.forEach((freq, i) => {
    playTone(freq, 0.6 - i * 0.05, "sine", 0.1 - i * 0.008, i * 0.08);
    playTone(freq * 2, 0.3, "sine", 0.04, i * 0.08 + 0.02);
  });

  playNoiseBurst(0.8, 6000, 0.04, 0.2);
  playNoiseBurst(0.5, 8000, 0.03, 0.5);

  playTone(262, 1.2, "sine", 0.06, 0.1);
  playTone(330, 1.0, "sine", 0.04, 0.2);

  playTone(1047, 0.8, "triangle", 0.07, 0.55);
  playTone(1568, 0.6, "sine", 0.04, 0.6);
}

export function sfxClick() {
  playTone(900, 0.08, "square", 0.05);
  playNoiseBurst(0.03, 3000, 0.04, 0);
}
