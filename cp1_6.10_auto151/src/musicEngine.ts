import { NoteBlock } from './noteBlock';

export class MusicEngine {
  private audioContext: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private volume = 0.3;
  private noteDuration = 0.5;

  constructor() {
    this.initAudioContext();
  }

  private initAudioContext(): void {
    if (typeof window !== 'undefined' && window.AudioContext) {
      this.audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      this.masterGain = this.audioContext.createGain();
      this.masterGain.gain.value = this.volume;
      this.masterGain.connect(this.audioContext.destination);
    }
  }

  public async resume(): Promise<void> {
    if (this.audioContext && this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }
  }

  public setNoteDuration(duration: number): void {
    this.noteDuration = Math.max(0.3, Math.min(2.0, duration));
  }

  public getNoteDuration(): number {
    return this.noteDuration;
  }

  public setVolume(vol: number): void {
    this.volume = Math.max(0, Math.min(1, vol));
    if (this.masterGain && this.audioContext) {
      this.masterGain.gain.setValueAtTime(this.volume, this.audioContext.currentTime);
    }
  }

  public playNote(pitch: number, customDuration?: number): void {
    if (!this.audioContext || !this.masterGain) return;

    const ctx = this.audioContext;
    const now = ctx.currentTime;
    const duration = customDuration ?? this.noteDuration;

    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(NoteBlock.midiToFreq(pitch), now);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(2000, now);
    filter.Q.setValueAtTime(1, now);

    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.setValueAtTime(0.4, now + 0.01);
    gainNode.gain.setValueAtTime(0.4, now + duration * 0.1);

    const decayStart = now + duration * 0.1;
    const steps = 20;
    for (let i = 0; i <= steps; i++) {
      const t = decayStart + (duration * 0.9 * i) / steps;
      const env = 0.4 * Math.cos((i / steps) * Math.PI * 0.5);
      gainNode.gain.setValueAtTime(Math.max(0, env), t);
    }
    gainNode.gain.setValueAtTime(0, now + duration);

    osc.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + duration + 0.05);

    setTimeout(() => {
      osc.disconnect();
      gainNode.disconnect();
      filter.disconnect();
    }, (duration + 0.1) * 1000);
  }

  public playClick(): void {
    if (!this.audioContext || !this.masterGain) return;

    const ctx = this.audioContext;
    const now = ctx.currentTime;
    const duration = 0.1;

    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();

    osc.type = 'square';
    osc.frequency.setValueAtTime(800, now);
    osc.frequency.exponentialRampToValueAtTime(400, now + duration);

    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(0.15, now + 0.005);
    gainNode.gain.linearRampToValueAtTime(0, now + duration);

    osc.connect(gainNode);
    gainNode.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + duration + 0.02);

    setTimeout(() => {
      osc.disconnect();
      gainNode.disconnect();
    }, (duration + 0.1) * 1000);
  }

  public isReady(): boolean {
    return this.audioContext !== null && this.audioContext.state === 'running';
  }
}
