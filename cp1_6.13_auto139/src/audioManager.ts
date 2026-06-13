export class AudioManager {
  private audioContext: AudioContext | null = null;
  private volume: number = 0.5;
  private activeOscillators: Map<string, { oscillator: OscillatorNode; gainNode: GainNode }> = new Map();

  private readonly noteFrequencies: number[] = [];

  constructor() {
    this.generateNoteFrequencies();
  }

  private generateNoteFrequencies(): void {
    const c4Midi = 60;
    const c6Midi = 84;
    const totalRows = 20;

    for (let row = 0; row < totalRows; row++) {
      const midiNote = c4Midi + (row * (c6Midi - c4Midi)) / (totalRows - 1);
      const frequency = 440 * Math.pow(2, (midiNote - 69) / 12);
      this.noteFrequencies.push(frequency);
    }
  }

  private initAudioContext(): void {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }
  }

  public getFrequency(row: number, col: number): number {
    const baseFreq = this.noteFrequencies[row] || 440;
    const detune = (col - 10) * 5;
    return baseFreq * Math.pow(2, detune / 1200);
  }

  public playTone(row: number, col: number): string {
    this.initAudioContext();
    if (!this.audioContext) return '';

    const key = `${row}-${col}`;

    if (this.activeOscillators.has(key)) {
      return key;
    }

    const frequency = this.getFrequency(row, col);

    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();

    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(frequency, this.audioContext.currentTime);

    gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
    gainNode.gain.linearRampToValueAtTime(
      this.volume * 0.3,
      this.audioContext.currentTime + 0.02
    );

    oscillator.connect(gainNode);
    gainNode.connect(this.audioContext.destination);

    oscillator.start();

    this.activeOscillators.set(key, { oscillator, gainNode });

    return key;
  }

  public stopTone(row: number, col: number): void {
    const key = `${row}-${col}`;
    const active = this.activeOscillators.get(key);

    if (active && this.audioContext) {
      const { oscillator, gainNode } = active;

      gainNode.gain.cancelScheduledValues(this.audioContext.currentTime);
      gainNode.gain.setValueAtTime(
        gainNode.gain.value,
        this.audioContext.currentTime
      );
      gainNode.gain.linearRampToValueAtTime(
        0,
        this.audioContext.currentTime + 0.15
      );

      oscillator.stop(this.audioContext.currentTime + 0.15);

      setTimeout(() => {
        this.activeOscillators.delete(key);
      }, 160);
    }
  }

  public stopAll(): void {
    for (const [key] of this.activeOscillators) {
      const [row, col] = key.split('-').map(Number);
      this.stopTone(row, col);
    }
  }

  public setVolume(volume: number): void {
    this.volume = Math.max(0, Math.min(1, volume));
  }

  public getVolume(): number {
    return this.volume;
  }
}

export const audioManager = new AudioManager();
