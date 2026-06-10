import type { Chime } from './wind-chime';

export interface SoundWave {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  alpha: number;
  color: string;
  speed: number;
  isRipple?: boolean;
}

const MAX_WAVES = 10;

let audioContext: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!audioContext) {
    audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
  }
  return audioContext;
}

export function playNote(baseFreq?: number): void {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    const freq = baseFreq ?? (220 + Math.random() * 660);

    const fundamental = ctx.createOscillator();
    const fundamentalGain = ctx.createGain();
    fundamental.type = 'sine';
    fundamental.frequency.setValueAtTime(freq, now);
    fundamentalGain.gain.setValueAtTime(0.3, now);
    fundamentalGain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
    fundamental.connect(fundamentalGain);
    fundamentalGain.connect(ctx.destination);
    fundamental.start(now);
    fundamental.stop(now + 0.3);

    const harmonic = ctx.createOscillator();
    const harmonicGain = ctx.createGain();
    harmonic.type = 'sine';
    harmonic.frequency.setValueAtTime(freq * 2, now);
    harmonicGain.gain.setValueAtTime(0.09, now);
    harmonicGain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
    harmonic.connect(harmonicGain);
    harmonicGain.connect(ctx.destination);
    harmonic.start(now);
    harmonic.stop(now + 0.3);
  } catch {
    // Audio not available
  }
}

export function createWaveFromChime(chime: Chime): SoundWave | null {
  return {
    x: chime.x,
    y: chime.y,
    radius: 0,
    maxRadius: 80,
    alpha: 0.6,
    color: chime.color,
    speed: 2
  };
}

export function createRipple(chime: Chime): SoundWave | null {
  return {
    x: chime.x,
    y: chime.y,
    radius: 0,
    maxRadius: 10,
    alpha: 0.25,
    color: '#ffffff',
    speed: 3,
    isRipple: true
  };
}

export function addWave(waves: SoundWave[], wave: SoundWave): void {
  if (waves.length < MAX_WAVES) {
    waves.push(wave);
  }
}

export function updateWaves(waves: SoundWave[]): void {
  for (let i = waves.length - 1; i >= 0; i--) {
    const wave = waves[i];
    wave.radius += wave.speed;
    const progress = wave.radius / wave.maxRadius;
    wave.alpha = (wave.isRipple ? 0.25 : 0.6) * (1 - progress);
    if (wave.radius >= wave.maxRadius) {
      waves.splice(i, 1);
    }
  }
}

export function drawWaves(ctx: CanvasRenderingContext2D, waves: SoundWave[]): void {
  for (const wave of waves) {
    ctx.save();
    const r = parseInt(wave.color.substring(1, 3), 16);
    const g = parseInt(wave.color.substring(3, 5), 16);
    const b = parseInt(wave.color.substring(5, 7), 16);
    ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${wave.alpha})`;
    ctx.lineWidth = wave.isRipple ? 1 : 2;
    ctx.beginPath();
    ctx.arc(wave.x, wave.y, wave.radius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
}
