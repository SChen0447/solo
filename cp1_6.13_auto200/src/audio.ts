export class AudioManager {
  private audioContext: AudioContext | null = null;
  private masterGain: GainNode | null = null;

  private initContext(): void {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      this.masterGain = this.audioContext.createGain();
      this.masterGain.gain.value = 0.3;
      this.masterGain.connect(this.audioContext.destination);
    }
    if (this.audioContext.state === 'suspended') {
      void this.audioContext.resume();
    }
  }

  private playTone(frequency: number, duration: number, type: OscillatorType = 'sine', vibrato: boolean = false): void {
    this.initContext();
    if (!this.audioContext || !this.masterGain) return;

    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();

    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, this.audioContext.currentTime);

    if (vibrato) {
      const lfo = this.audioContext.createOscillator();
      const lfoGain = this.audioContext.createGain();
      lfo.frequency.value = 8;
      lfoGain.gain.value = 5;
      lfo.connect(lfoGain);
      lfoGain.connect(oscillator.frequency);
      lfo.start();
      lfo.stop(this.audioContext.currentTime + duration);
    }

    gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.5, this.audioContext.currentTime + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + duration);

    oscillator.connect(gainNode);
    gainNode.connect(this.masterGain);

    oscillator.start();
    oscillator.stop(this.audioContext.currentTime + duration);
  }

  private noteToFrequency(note: string, octave: number): number {
    const notes: Record<string, number> = {
      'C': 16.35, 'C#': 17.32, 'D': 18.35, 'D#': 19.45,
      'E': 20.60, 'F': 21.83, 'F#': 23.12, 'G': 24.50,
      'G#': 25.96, 'A': 27.50, 'A#': 29.14, 'B': 30.87
    };
    return notes[note] * Math.pow(2, octave);
  }

  public playPlaceSound(): void {
    this.playTone(this.noteToFrequency('C', 5), 0.2, 'sine');
  }

  public playBounceSound(): void {
    this.playTone(this.noteToFrequency('E', 4), 0.15, 'triangle');
  }

  public playCollectSound(): void {
    this.playTone(this.noteToFrequency('G', 5), 0.25, 'sine', true);
  }
}

export const audioManager = new AudioManager();
