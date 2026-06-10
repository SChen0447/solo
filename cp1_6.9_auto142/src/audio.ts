export interface ScaleNote {
  name: string;
  frequency: number;
  color: string;
}

export const SCALES: ScaleNote[] = [
  { name: 'Do', frequency: 261, color: '#ff4466' },
  { name: 'Re', frequency: 293, color: '#ff8844' },
  { name: 'Mi', frequency: 329, color: '#ffcc33' },
  { name: 'Fa', frequency: 349, color: '#66ff66' },
  { name: 'Sol', frequency: 392, color: '#44aaff' },
  { name: 'La', frequency: 440, color: '#8844ff' },
  { name: 'Si', frequency: 493, color: '#ff66aa' },
];

export class AudioManager {
  private audioContext: AudioContext | null = null;
  private canPlay = false;

  init(): void {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }
    this.canPlay = true;
  }

  playNote(frequency: number, duration: number = 0.15, volume: number = 0.3): void {
    if (!this.canPlay || !this.audioContext) return;

    const ctx = this.audioContext;
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(frequency, ctx.currentTime);

    gainNode.gain.setValueAtTime(0, ctx.currentTime);
    gainNode.gain.linearRampToValueAtTime(volume, ctx.currentTime + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + duration + 0.05);
  }

  playScaleNote(scaleIndex: number): void {
    if (scaleIndex >= 0 && scaleIndex < SCALES.length) {
      this.playNote(SCALES[scaleIndex].frequency);
    }
  }
}
