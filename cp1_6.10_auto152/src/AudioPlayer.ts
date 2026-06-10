export class AudioPlayer {
  private audioContext: AudioContext | null = null;
  private masterGain: GainNode | null = null;

  public init(): void {
    if (this.audioContext) return;
    try {
      const Ctx = window.AudioContext || (window as any).webkitAudioContext;
      this.audioContext = new Ctx();
      this.masterGain = this.audioContext.createGain();
      this.masterGain.gain.value = 0.3;
      this.masterGain.connect(this.audioContext.destination);
    } catch (e) {
      console.error('Web Audio API not supported:', e);
    }
  }

  public playFreq(freq: number, duration: number = 0.5): void {
    if (!this.audioContext || !this.masterGain) {
      this.init();
      if (!this.audioContext || !this.masterGain) return;
    }

    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }

    const now = this.audioContext.currentTime;
    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();

    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(freq, now);

    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(0.4, now + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + duration);

    oscillator.connect(gainNode);
    gainNode.connect(this.masterGain);

    oscillator.start(now);
    oscillator.stop(now + duration);
  }

  public playWrong(): void {
    if (!this.audioContext || !this.masterGain) {
      this.init();
      if (!this.audioContext || !this.masterGain) return;
    }

    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }

    const now = this.audioContext.currentTime;
    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();

    oscillator.type = 'sawtooth';
    oscillator.frequency.setValueAtTime(180, now);
    oscillator.frequency.linearRampToValueAtTime(120, now + 0.3);

    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(0.25, now + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

    oscillator.connect(gainNode);
    gainNode.connect(this.masterGain);

    oscillator.start(now);
    oscillator.stop(now + 0.3);
  }
}
