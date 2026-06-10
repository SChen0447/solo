export class AudioEngine {
  private audioContext: AudioContext | null = null;

  private pentatonicFrequencies: Record<string, number> = {
    C4: 262,
    D4: 294,
    E4: 330,
    G4: 392,
    A4: 440
  };

  constructor() {
    this.initAudioContext();
  }

  private initAudioContext(): void {
    try {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    } catch (e) {
      console.error('Web Audio API is not supported in this browser.');
    }
  }

  public resume(): void {
    if (this.audioContext && this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }
  }

  public playFrequency(frequency: number, duration: number = 0.3): void {
    if (!this.audioContext) return;
    this.resume();

    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(this.audioContext.destination);

    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(frequency, this.audioContext.currentTime);

    gainNode.gain.setValueAtTime(0.4, this.audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + duration);

    oscillator.start(this.audioContext.currentTime);
    oscillator.stop(this.audioContext.currentTime + duration);
  }

  public playPentatonicNote(note: keyof typeof this.pentatonicFrequencies): void {
    const freq = this.pentatonicFrequencies[note];
    if (freq !== undefined) {
      this.playFrequency(freq, 0.35);
    }
  }

  public getRandomPentatonicFrequency(): { note: string; frequency: number } {
    const notes = Object.keys(this.pentatonicFrequencies) as Array<keyof typeof this.pentatonicFrequencies>;
    const randomNote = notes[Math.floor(Math.random() * notes.length)];
    return {
      note: randomNote,
      frequency: this.pentatonicFrequencies[randomNote]
    };
  }
}
