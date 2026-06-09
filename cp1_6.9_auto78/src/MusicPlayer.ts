export class MusicPlayer {
  private audioContext: AudioContext | null = null;

  private ensureContext(): AudioContext {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return this.audioContext;
  }

  public playNote(frequency: number, volume: number = 0.3, duration: number = 1.5): void {
    const ctx = this.ensureContext();
    const now = ctx.currentTime;

    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(frequency, now);

    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(volume, now + 0.02);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.start(now);
    oscillator.stop(now + duration + 0.05);
  }

  public playChord(frequencies: number[], volume: number = 0.2, duration: number = 1.0): void {
    frequencies.forEach((freq, i) => {
      setTimeout(() => {
        this.playNote(freq, volume, duration);
      }, i * 80);
    });
  }
}
