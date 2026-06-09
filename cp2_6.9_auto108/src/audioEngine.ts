const NOTE_C6 = 1046.50;
const NOTE_E3 = 164.81;
const NOTE_A4 = 440.00;

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export class AudioEngine {
  private audioContext: AudioContext | null = null;
  private gainNode: GainNode | null = null;
  private volume: number;

  constructor(initialVolume: number = 60) {
    this.volume = initialVolume;
  }

  private ensureContext(): void {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.gainNode = this.audioContext.createGain();
      this.gainNode.gain.value = this.volume / 100 * 0.3;
      this.gainNode.connect(this.audioContext.destination);
    }
    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }
  }

  getContext(): AudioContext {
    this.ensureContext();
    return this.audioContext!;
  }

  setVolume(volume: number): void {
    this.volume = Math.max(0, Math.min(100, volume));
    if (this.gainNode) {
      this.gainNode.gain.value = this.volume / 100 * 0.3;
    }
  }

  getVolume(): number {
    return this.volume;
  }

  playTone(frequency: number, duration: number = 0.15): void {
    this.ensureContext();
    const ctx = this.audioContext!;
    const osc = ctx.createOscillator();
    const envelope = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.value = frequency;

    envelope.gain.setValueAtTime(0, ctx.currentTime);
    envelope.gain.linearRampToValueAtTime(1, ctx.currentTime + 0.01);
    envelope.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

    osc.connect(envelope);
    envelope.connect(this.gainNode!);

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + duration);
  }

  getFrequencyFromColor(hue: number): number {
    const normalizedHue = ((hue % 360) + 360) % 360;

    if (normalizedHue <= 120) {
      const t = normalizedHue / 120;
      return lerp(NOTE_C6, NOTE_E3, t);
    } else if (normalizedHue <= 240) {
      const t = (normalizedHue - 120) / 120;
      return lerp(NOTE_E3, NOTE_A4, t);
    } else {
      const t = (normalizedHue - 240) / 120;
      return lerp(NOTE_A4, NOTE_C6, t);
    }
  }
}
