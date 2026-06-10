export class AudioManager {
  private audioContext: AudioContext | null = null;
  private volume: number = 0.5;
  private initialized: boolean = false;

  constructor() {}

  private init(): void {
    if (this.initialized) return;
    try {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.initialized = true;
    } catch (e) {
      console.warn('Web Audio API not supported:', e);
    }
  }

  public setVolume(volume: number): void {
    this.volume = Math.max(0, Math.min(10, volume)) / 10;
  }

  public playMergeSound(velocity: number, angle: number, mass: number): void {
    if (!this.initialized) {
      this.init();
    }
    if (!this.audioContext) return;

    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }

    const ctx = this.audioContext;
    const now = ctx.currentTime;

    const normalizedSpeed = Math.min(Math.max(velocity, 0), 5) / 5;
    const minFreq = 261.63;
    const maxFreq = 1046.50;
    const baseFreq = minFreq + (maxFreq - minFreq) * normalizedSpeed;

    const osc1 = ctx.createOscillator();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(baseFreq, now);

    const osc2 = ctx.createOscillator();
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(baseFreq * 1.5, now);

    const gainNode = ctx.createGain();
    const finalVolume = this.volume * (0.3 + mass * 0.1);
    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(finalVolume, now + 0.02);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(2000 + Math.abs(Math.cos(angle)) * 3000, now);
    filter.Q.setValueAtTime(1, now);

    osc1.connect(filter);
    osc2.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(ctx.destination);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 0.3);
    osc2.stop(now + 0.3);
  }
}
