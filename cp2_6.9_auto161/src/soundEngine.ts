export class SoundEngine {
  private audioContext: AudioContext | null = null;
  private currentOscillator: OscillatorNode | null = null;
  private currentGain: GainNode | null = null;

  constructor() {
    this.initAudioContext();
  }

  private initAudioContext(): void {
    try {
      const AudioCtx = (window.AudioContext || (window as any).webkitAudioContext) as typeof AudioContext;
      this.audioContext = new AudioCtx();
    } catch (e) {
      console.error('Web Audio API not supported:', e);
    }
  }

  public async resume(): Promise<void> {
    if (this.audioContext && this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }
  }

  public playTone(frequency: number, duration: number = 0.3): void {
    if (!this.audioContext) return;
    this.stop();

    const now = this.audioContext.currentTime;

    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();

    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(frequency, now);

    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(0.3, now + 0.02);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + duration);

    oscillator.connect(gainNode);
    gainNode.connect(this.audioContext.destination);

    oscillator.start(now);
    oscillator.stop(now + duration);

    this.currentOscillator = oscillator;
    this.currentGain = gainNode;

    oscillator.onended = () => {
      if (this.currentOscillator === oscillator) {
        this.currentOscillator = null;
        this.currentGain = null;
      }
      oscillator.disconnect();
      gainNode.disconnect();
    };
  }

  public stop(): void {
    if (this.currentOscillator) {
      try {
        this.currentOscillator.stop();
      } catch (e) {}
      this.currentOscillator = null;
    }
    if (this.currentGain) {
      this.currentGain = null;
    }
  }
}
