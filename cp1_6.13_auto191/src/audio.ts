let audioCtx: AudioContext | null = null;

function getCtx(): AudioContext {
  if (!audioCtx) {
    audioCtx = new AudioContext();
  }
  return audioCtx;
}

function playTone(frequency: number, duration: number, type: OscillatorType = 'sine', volume: number = 0.15): void {
  const ctx = getCtx();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(frequency, ctx.currentTime);
  gain.gain.setValueAtTime(volume, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + duration);
}

export function playColorPick(): void {
  playTone(329.63, 0.25, 'sine', 0.12);
}

export function playStretch(): void {
  playTone(220, 0.3, 'triangle', 0.08);
}

export function playFlatten(): void {
  playTone(165, 0.25, 'triangle', 0.08);
}

export function playCrystalFix(): void {
  playTone(523.25, 0.2, 'sine', 0.1);
  setTimeout(() => playTone(659.25, 0.2, 'sine', 0.08), 80);
}

export function playCool(): void {
  playTone(440, 0.5, 'sine', 0.1);
  setTimeout(() => playTone(349.23, 0.4, 'sine', 0.08), 150);
  setTimeout(() => playTone(261.63, 0.6, 'sine', 0.06), 300);
}

export function playCrack(): void {
  playTone(1800, 0.08, 'sawtooth', 0.05);
}

export function playFurnaceOpen(): void {
  playTone(293.66, 0.3, 'sine', 0.1);
  setTimeout(() => playTone(369.99, 0.3, 'sine', 0.1), 100);
  setTimeout(() => playTone(440, 0.4, 'sine', 0.08), 200);
}

export function playSolidify(): void {
  playTone(523.25, 0.4, 'sine', 0.08);
  setTimeout(() => playTone(659.25, 0.4, 'sine', 0.08), 150);
  setTimeout(() => playTone(783.99, 0.4, 'sine', 0.08), 300);
  setTimeout(() => playTone(1046.5, 0.6, 'sine', 0.06), 450);
}

export function playClick(): void {
  playTone(800, 0.08, 'sine', 0.06);
}

export function resumeAudio(): void {
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
}
