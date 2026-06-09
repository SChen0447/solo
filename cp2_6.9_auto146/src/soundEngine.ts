export type WaveformType = 'sine' | 'sawtooth' | 'square';

export interface SoundStatus {
  frequency: number;
  volume: number;
}

export class SoundEngine {
  private audioContext: AudioContext | null = null;
  private oscillator: OscillatorNode | null = null;
  private gainNode: GainNode | null = null;
  private currentWaveform: WaveformType = 'sine';
  private isPlaying = false;
  private fadeOutTimer: number | null = null;

  constructor() {}

  private ensureContext(): AudioContext {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    }
    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }
    return this.audioContext;
  }

  setWaveform(type: WaveformType): void {
    this.currentWaveform = type;
    if (this.oscillator) {
      this.oscillator.type = type;
    }
  }

  start(frequency: number, volume: number): void {
    const ctx = this.ensureContext();

    if (this.fadeOutTimer !== null) {
      clearTimeout(this.fadeOutTimer);
      this.fadeOutTimer = null;
    }

    if (this.isPlaying) {
      this.update(frequency, volume);
      return;
    }

    this.oscillator = ctx.createOscillator();
    this.oscillator.type = this.currentWaveform;
    this.oscillator.frequency.setValueAtTime(frequency, ctx.currentTime);

    this.gainNode = ctx.createGain();
    this.gainNode.gain.setValueAtTime(volume, ctx.currentTime);

    this.oscillator.connect(this.gainNode);
    this.gainNode.connect(ctx.destination);

    this.oscillator.start();
    this.isPlaying = true;
  }

  update(frequency: number, volume: number): void {
    if (!this.audioContext || !this.oscillator || !this.gainNode || !this.isPlaying) {
      return;
    }

    const now = this.audioContext.currentTime;
    this.oscillator.frequency.setTargetAtTime(frequency, now, 0.02);
    this.gainNode.gain.setTargetAtTime(volume, now, 0.02);
  }

  stop(): void {
    if (!this.isPlaying || !this.gainNode || !this.oscillator || !this.audioContext) {
      return;
    }

    const ctx = this.audioContext;
    const gain = this.gainNode;
    const osc = this.oscillator;
    const now = ctx.currentTime;

    gain.gain.cancelScheduledValues(now);
    gain.gain.setValueAtTime(gain.gain.value, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.5);

    this.fadeOutTimer = window.setTimeout(() => {
      try {
        osc.stop();
        osc.disconnect();
        gain.disconnect();
      } catch (_e) {
        // ignore
      }
      this.oscillator = null;
      this.gainNode = null;
      this.isPlaying = false;
      this.fadeOutTimer = null;
    }, 510);
  }

  getWaveform(): WaveformType {
    return this.currentWaveform;
  }

  destroy(): void {
    this.stop();
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
  }
}

export function xToFrequency(x: number, width: number): number {
  const minFreq = 100;
  const maxFreq = 2000;
  const minLog = Math.log(minFreq);
  const maxLog = Math.log(maxFreq);
  const ratio = Math.max(0, Math.min(1, x / width));
  return Math.exp(minLog + (maxLog - minLog) * ratio);
}

export function yToVolume(y: number, height: number): number {
  const ratio = 1 - Math.max(0, Math.min(1, y / height));
  return ratio;
}
