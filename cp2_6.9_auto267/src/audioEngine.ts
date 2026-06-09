export type ScaleMode = 'piano' | 'synth';

const PIANO_FREQUENCIES: number[] = [
  261.63, 293.66, 329.63, 349.23, 392.00, 440.00, 493.88,
  523.25, 587.33, 659.25, 698.46, 783.99, 880.00, 987.77,
  1046.50
];

const SYNTH_FREQUENCIES: number[] = [
  261.63, 311.13, 392.00, 466.16, 523.25, 622.25, 783.99,
  932.33, 1046.50
];

const MIN_FREQ = 261.63;
const MAX_FREQ = 1046.50;

export interface NoteEvent {
  frequency: number;
  volume: number;
  startTime: number;
  duration: number;
  mode: ScaleMode;
}

export class AudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private scaleMode: ScaleMode = 'piano';
  private activeOscillators: Set<{ osc: OscillatorNode; gain: GainNode }> = new Set();
  private isPlaying = false;

  constructor() {}

  private ensureContext(): AudioContext {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 0.8;
      this.masterGain.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  public setScaleMode(mode: ScaleMode): void {
    this.scaleMode = mode;
  }

  public getScaleMode(): ScaleMode {
    return this.scaleMode;
  }

  private quantizeFrequency(freq: number): number {
    const frequencies = this.scaleMode === 'piano' ? PIANO_FREQUENCIES : SYNTH_FREQUENCIES;
    let closest = frequencies[0];
    let minDiff = Math.abs(freq - closest);
    for (const f of frequencies) {
      const diff = Math.abs(f - freq);
      if (diff < minDiff) {
        minDiff = diff;
        closest = f;
      }
    }
    return closest;
  }

  public mapXToFrequency(x: number, width: number): number {
    const t = Math.max(0, Math.min(1, x / width));
    const freq = MIN_FREQ + (MAX_FREQ - MIN_FREQ) * t;
    return this.quantizeFrequency(freq);
  }

  public mapYToVolume(y: number, height: number): number {
    const t = Math.max(0, Math.min(1, y / height));
    return 0.3 + (1.0 - 0.3) * (1 - t);
  }

  public playNote(frequency: number, volume: number, duration: number = 0.15): void {
    if (this.isPlaying) return;
    const ctx = this.ensureContext();
    if (!this.masterGain) return;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(volume, ctx.currentTime + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);
    gain.connect(this.masterGain);

    const osc = ctx.createOscillator();
    osc.frequency.value = frequency;

    if (this.scaleMode === 'piano') {
      osc.type = 'sine';
      osc.connect(gain);

      const osc2 = ctx.createOscillator();
      osc2.type = 'triangle';
      osc2.frequency.value = frequency * 2;
      const subGain = ctx.createGain();
      subGain.gain.value = 0.3;
      osc2.connect(subGain);
      subGain.connect(gain);
      osc2.start(ctx.currentTime);
      osc2.stop(ctx.currentTime + duration);
    } else {
      osc.type = 'sawtooth';
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 2000;
      osc.connect(filter);
      filter.connect(gain);
    }

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + duration);

    const entry = { osc, gain };
    this.activeOscillators.add(entry);
    osc.onended = () => {
      this.activeOscillators.delete(entry);
    };
  }

  public stopAll(): void {
    for (const { osc, gain } of this.activeOscillators) {
      try {
        osc.stop();
      } catch (_e) {
        // ignore
      }
      gain.disconnect();
    }
    this.activeOscillators.clear();
  }

  public async playback(events: NoteEvent[]): Promise<void> {
    if (events.length === 0) return;
    this.isPlaying = true;
    this.ensureContext();
    if (!this.masterGain) return;

    const originalMode = this.scaleMode;

    for (const event of events) {
      if (!this.isPlaying) break;
      this.scaleMode = event.mode;
      this.playNote(event.frequency, event.volume, event.duration);
      await new Promise(resolve => setTimeout(resolve, event.duration * 1000));
    }

    this.scaleMode = originalMode;
    this.isPlaying = false;
  }

  public stopPlayback(): void {
    this.isPlaying = false;
    this.stopAll();
  }

  public getIsPlaying(): boolean {
    return this.isPlaying;
  }
}
