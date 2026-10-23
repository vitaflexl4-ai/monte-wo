/**
 * MONTE WO — Haitian Pride & Strength Sound FX Synthesizer
 * Zero-dependency Web Audio API engine (safe no-op fallback where AudioContext is unavailable):
 * - Booming Traditional Haitian Tanbou Drum Roll (Manman + Segon + Ogan iron bell)
 *   fading into an energetic Cinematic 808 Sub-Bass Drop & Championship Brass Fanfare
 * - Electric-blue & gold lightning surge crackle for "EVOLVE" avatar transformation
 * - Zero-latency crystalline click chime for Global Nutrition quick food pills
 * - Forged-iron anvil strike, barcode lock beep, and camera shutter click
 */

let sharedCtx: AudioContext | null = null;
let fxEnabled = true;

export function isSoundFxEnabled(): boolean {
  return fxEnabled;
}

export function setSoundFxEnabled(next: boolean): void {
  fxEnabled = next;
}

export const isSoundEnabled = isSoundFxEnabled;
export const setSoundEnabled = setSoundFxEnabled;

function getCtx(): AudioContext | null {
  if (!fxEnabled) return null;
  if (typeof window === "undefined") return null;
  const Ctor =
    (window as any).AudioContext || (window as any).webkitAudioContext;
  if (!Ctor) return null;
  if (!sharedCtx) {
    try {
      sharedCtx = new Ctor();
    } catch {
      return null;
    }
  }
  if (sharedCtx && sharedCtx.state === "suspended") {
    sharedCtx.resume().catch(() => {});
  }
  return sharedCtx;
}

function triggerTanbouHit(
  ctx: AudioContext,
  when: number,
  startHz: number,
  endHz: number,
  gainPeak: number,
  withOganBell: boolean,
): void {
  // Deep carved-wood & goat-skin Tanbou membrane hit
  const body = ctx.createOscillator();
  const bodyGain = ctx.createGain();
  body.type = "sine";
  body.frequency.setValueAtTime(startHz, when);
  body.frequency.exponentialRampToValueAtTime(endHz, when + 0.13);
  bodyGain.gain.setValueAtTime(0.0001, when);
  bodyGain.gain.linearRampToValueAtTime(gainPeak, when + 0.006);
  bodyGain.gain.exponentialRampToValueAtTime(0.0008, when + 0.22);
  body.connect(bodyGain);
  bodyGain.connect(ctx.destination);
  body.start(when);
  body.stop(when + 0.24);

  // Warm wooden shell overtone
  const wood = ctx.createOscillator();
  const woodGain = ctx.createGain();
  wood.type = "triangle";
  wood.frequency.setValueAtTime(startHz * 1.65, when);
  wood.frequency.exponentialRampToValueAtTime(endHz * 1.2, when + 0.08);
  woodGain.gain.setValueAtTime(0.0001, when);
  woodGain.gain.linearRampToValueAtTime(gainPeak * 0.35, when + 0.004);
  woodGain.gain.exponentialRampToValueAtTime(0.0008, when + 0.09);
  wood.connect(woodGain);
  woodGain.connect(ctx.destination);
  wood.start(when);
  wood.stop(when + 0.1);

  // Palm-slap skin transient
  const snapLen = Math.floor(ctx.sampleRate * 0.035);
  const snapBuf = ctx.createBuffer(1, snapLen, ctx.sampleRate);
  const data = snapBuf.getChannelData(0);
  for (let i = 0; i < snapLen; i++) {
    data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (snapLen * 0.25));
  }
  const snap = ctx.createBufferSource();
  snap.buffer = snapBuf;
  const bp = ctx.createBiquadFilter();
  bp.type = "bandpass";
  bp.frequency.setValueAtTime(640, when);
  bp.Q.setValueAtTime(2.2, when);
  const snapGain = ctx.createGain();
  snapGain.gain.setValueAtTime(gainPeak * 0.32, when);
  snapGain.gain.exponentialRampToValueAtTime(0.0008, when + 0.035);
  snap.connect(bp);
  bp.connect(snapGain);
  snapGain.connect(ctx.destination);
  snap.start(when);

  // Optional traditional Haitian Ogan iron bell accent
  if (withOganBell) {
    const bell = ctx.createOscillator();
    const bellGain = ctx.createGain();
    bell.type = "square";
    bell.frequency.setValueAtTime(920, when);
    const bellFilter = ctx.createBiquadFilter();
    bellFilter.type = "bandpass";
    bellFilter.frequency.setValueAtTime(1380, when);
    bellFilter.Q.setValueAtTime(6.0, when);
    bellGain.gain.setValueAtTime(gainPeak * 0.12, when);
    bellGain.gain.exponentialRampToValueAtTime(0.0005, when + 0.075);
    bell.connect(bellFilter);
    bellFilter.connect(bellGain);
    bellGain.connect(ctx.destination);
    bell.start(when);
    bell.stop(when + 0.08);
  }
}

/**
 * Booming Traditional Haitian Tanbou Drum Roll -> Energetic Cinematic Bass Drop
 * Triggered on "EVOLVE" and "Play Ceremony"
 */
export function playHaitianDrumEvolveDrop(): void {
  const ctx = getCtx();
  if (!ctx) return;
  try {
    const now = ctx.currentTime;

    // 1. Accelerating Haitian Tanbou Roll (Manman 112->56Hz & Segon 178->92Hz)
    const rollOffsets = [
      0.0, 0.16, 0.31, 0.44, 0.56, 0.66, 0.75, 0.83, 0.9, 0.96, 1.01, 1.055,
      1.095, 1.13,
    ];
    rollOffsets.forEach((offset, idx) => {
      const isManman = idx % 2 === 0;
      const crescendo = 0.16 + (idx / rollOffsets.length) * 0.2;
      triggerTanbouHit(
        ctx,
        now + offset,
        isManman ? 116 : 178,
        isManman ? 56 : 92,
        crescendo,
        idx % 3 === 0,
      );
    });

    // 2. Electric Lightning Surge Crackle at Drop Point (t + 1.15s)
    const dropTime = now + 1.16;
    const zapLen = Math.floor(ctx.sampleRate * 0.42);
    const zapBuf = ctx.createBuffer(1, zapLen, ctx.sampleRate);
    const zapData = zapBuf.getChannelData(0);
    for (let i = 0; i < zapLen; i++) {
      const spike = Math.random() > 0.82 ? 1.0 : 0.28;
      zapData[i] =
        (Math.random() * 2 - 1) * spike * Math.exp(-i / (zapLen * 0.35));
    }
    const zap = ctx.createBufferSource();
    zap.buffer = zapBuf;
    const hp = ctx.createBiquadFilter();
    hp.type = "highpass";
    hp.frequency.setValueAtTime(1850, dropTime);
    const zapGain = ctx.createGain();
    zapGain.gain.setValueAtTime(0.22, dropTime);
    zapGain.gain.exponentialRampToValueAtTime(0.001, dropTime + 0.4);
    zap.connect(hp);
    hp.connect(zapGain);
    zapGain.connect(ctx.destination);
    zap.start(dropTime);

    // 3. Energetic Cinematic Sub-Bass Drop (104Hz -> 29Hz seismic boom)
    const sub = ctx.createOscillator();
    const subGain = ctx.createGain();
    sub.type = "sine";
    sub.frequency.setValueAtTime(104, dropTime);
    sub.frequency.exponentialRampToValueAtTime(38, dropTime + 0.28);
    sub.frequency.exponentialRampToValueAtTime(29, dropTime + 1.45);
    subGain.gain.setValueAtTime(0.0001, dropTime);
    subGain.gain.linearRampToValueAtTime(0.46, dropTime + 0.018);
    subGain.gain.exponentialRampToValueAtTime(0.001, dropTime + 1.55);
    sub.connect(subGain);
    subGain.connect(ctx.destination);
    sub.start(dropTime);
    sub.stop(dropTime + 1.6);

    // Warm harmonic punch layer for laptop/phone speakers
    const punch = ctx.createOscillator();
    const punchFilter = ctx.createBiquadFilter();
    const punchGain = ctx.createGain();
    punch.type = "sawtooth";
    punch.frequency.setValueAtTime(130.81, dropTime); // C3
    punch.frequency.exponentialRampToValueAtTime(65.41, dropTime + 0.55); // C2
    punchFilter.type = "lowpass";
    punchFilter.frequency.setValueAtTime(520, dropTime);
    punchFilter.frequency.exponentialRampToValueAtTime(140, dropTime + 0.9);
    punchGain.gain.setValueAtTime(0.22, dropTime);
    punchGain.gain.exponentialRampToValueAtTime(0.001, dropTime + 1.1);
    punch.connect(punchFilter);
    punchFilter.connect(punchGain);
    punchGain.connect(ctx.destination);
    punch.start(dropTime);
    punch.stop(dropTime + 1.15);

    // 4. Triumphant Haitian Sovereign Brass Chord (C3 - G3 - C4 - E4 - G4 - C5)
    const chord = [130.81, 196.0, 261.63, 329.63, 392.0, 523.25];
    chord.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const filter = ctx.createBiquadFilter();
      const g = ctx.createGain();
      const start = dropTime + idx * 0.035;
      osc.type = idx % 2 === 0 ? "sawtooth" : "triangle";
      osc.frequency.setValueAtTime(freq, start);

      filter.type = "lowpass";
      filter.frequency.setValueAtTime(480, start);
      filter.frequency.exponentialRampToValueAtTime(2800, start + 0.22);
      filter.frequency.exponentialRampToValueAtTime(950, start + 1.35);

      g.gain.setValueAtTime(0.0001, start);
      g.gain.linearRampToValueAtTime(0.085, start + 0.05);
      g.gain.exponentialRampToValueAtTime(0.0008, start + 1.45);

      osc.connect(filter);
      filter.connect(g);
      g.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + 1.5);
    });
  } catch {
    // Non-fatal audio synthesis guard
  }
}

/** Deep forged-iron anvil strike + sub-bass boom when logging a heavy lift */
export function playAnvilImpact(): void {
  const ctx = getCtx();
  if (!ctx) return;
  try {
    const now = ctx.currentTime;

    const sub = ctx.createOscillator();
    const subGain = ctx.createGain();
    sub.type = "sine";
    sub.frequency.setValueAtTime(115, now);
    sub.frequency.exponentialRampToValueAtTime(38, now + 0.36);
    subGain.gain.setValueAtTime(0.32, now);
    subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.42);
    sub.connect(subGain);
    subGain.connect(ctx.destination);
    sub.start(now);
    sub.stop(now + 0.44);

    const partials = [440, 885, 1320, 1980];
    partials.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = idx % 2 === 0 ? "triangle" : "sine";
      osc.frequency.setValueAtTime(freq, now);
      osc.frequency.exponentialRampToValueAtTime(freq * 0.96, now + 0.28);
      g.gain.setValueAtTime(0.11 / (idx + 1), now);
      g.gain.exponentialRampToValueAtTime(0.0008, now + 0.3 - idx * 0.04);
      osc.connect(g);
      g.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.32);
    });
  } catch {
    // Non-fatal
  }
}

/** Rank Ascension Ceremony -> Booming Traditional Haitian Tanbou Roll + Bass Drop */
export function playRankAscensionFanfare(_tierOneBased?: number): void {
  playHaitianDrumEvolveDrop();
}

/** Subtle rising harmonic pulse when previewing any of the 9 ranks */
export function playRankPreviewPulse(tierOneBased: number): void {
  const ctx = getCtx();
  if (!ctx) return;
  try {
    const now = ctx.currentTime;
    const scale = [
      220.0, 246.94, 261.63, 293.66, 329.63, 392.0, 440.0, 523.25, 659.25,
    ];
    const base =
      scale[Math.max(0, Math.min(8, tierOneBased - 1))] || 261.63;

    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(base * 0.75, now);
    osc.frequency.exponentialRampToValueAtTime(base, now + 0.08);
    g.gain.setValueAtTime(0.11, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.24);
    osc.connect(g);
    g.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.26);
  } catch {
    // Non-fatal
  }
}

/** Subtle crystalline click chime for Global Nutrition quick food pills */
export function playFoodChime(): void {
  const ctx = getCtx();
  if (!ctx) return;
  try {
    const now = ctx.currentTime;
    const notes = [659.25, 987.77]; // E5 -> B5 crystalline fifth
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      const t = now + i * 0.032;
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, t);
      g.gain.setValueAtTime(0.085, t);
      g.gain.exponentialRampToValueAtTime(0.0008, t + 0.11);
      osc.connect(g);
      g.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.12);
    });
  } catch {
    // Non-fatal
  }
}

/** Crisp set-completed check click */
export function playCheckClick(checked = true): void {
  const ctx = getCtx();
  if (!ctx) return;
  try {
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(checked ? 680 : 880, now);
    osc.frequency.exponentialRampToValueAtTime(
      checked ? 1040 : 540,
      now + 0.055,
    );
    g.gain.setValueAtTime(0.09, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.09);
    osc.connect(g);
    g.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.1);
  } catch {
    // Non-fatal
  }
}

/** High-tech scanner lock double-beep for barcode & AI plate capture */
export function playScannerLockBeep(): void {
  const ctx = getCtx();
  if (!ctx) return;
  try {
    const now = ctx.currentTime;
    [0, 0.085].forEach((offset, i) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(i === 0 ? 1174.66 : 1567.98, now + offset);
      g.gain.setValueAtTime(0.09, now + offset);
      g.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.07);
      osc.connect(g);
      g.connect(ctx.destination);
      osc.start(now + offset);
      osc.stop(now + offset + 0.075);
    });
  } catch {
    // Non-fatal
  }
}

/** Camera shutter click */
export function playCameraShutter(): void {
  const ctx = getCtx();
  if (!ctx) return;
  try {
    const now = ctx.currentTime;
    const bufferSize = Math.floor(ctx.sampleRate * 0.06);
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.3));
    }
    const whiteNoise = ctx.createBufferSource();
    whiteNoise.buffer = noiseBuffer;
    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.setValueAtTime(1600, now);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.18, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
    whiteNoise.connect(filter);
    filter.connect(g);
    g.connect(ctx.destination);
    whiteNoise.start(now);
  } catch {
    // Non-fatal
  }
}
