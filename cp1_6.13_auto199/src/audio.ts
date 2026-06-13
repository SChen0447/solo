import { CONFIG } from './config';

const NOTE_FREQUENCIES: Record<string, number> = {
  'C4': 261.63, 'C#4': 277.18, 'D4': 293.66, 'D#4': 311.13, 'E4': 329.63,
  'F4': 349.23, 'F#4': 369.99, 'G4': 392.00, 'G#4': 415.30, 'A4': 440.00,
  'A#4': 466.16, 'B4': 493.88, 'C5': 523.25, 'C#5': 554.37, 'D5': 587.33,
  'D#5': 622.25, 'E5': 659.25, 'F5': 698.46, 'F#5': 739.99, 'G5': 783.99,
  'G#5': 830.61, 'A5': 880.00, 'A#5': 932.33, 'B5': 987.77, 'C6': 1046.50
};

export class AudioManager {
  private audioContext: AudioContext | null = null;
  private initialized = false;

  init(): void {
    if (this.initialized) return;
    try {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.initialized = true;
    } catch (e) {
      console.warn('Web Audio API not supported');
    }
  }

  playClickNote(intensity: number = 0): void {
    if (!this.audioContext) {
      this.init();
      if (!this.audioContext) return;
    }

    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }

    const startFreq = NOTE_FREQUENCIES[CONFIG.audio.noteStart];
    const endFreq = NOTE_FREQUENCIES[CONFIG.audio.noteEnd];
    const freqRange = endFreq - startFreq;
    const baseFreq = startFreq + freqRange * Math.min(Math.max(intensity, 0), 1);

    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();

    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(baseFreq, this.audioContext.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(
      baseFreq * 1.5,
      this.audioContext.currentTime + CONFIG.audio.duration
    );

    gainNode.gain.setValueAtTime(0.3, this.audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(
      0.001,
      this.audioContext.currentTime + CONFIG.audio.duration
    );

    oscillator.connect(gainNode);
    gainNode.connect(this.audioContext.destination);

    oscillator.start();
    oscillator.stop(this.audioContext.currentTime + CONFIG.audio.duration);
  }

  playPlatformBeam(): void {
    if (!this.audioContext) return;
    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }

    const frequencies = [523.25, 659.25, 783.99, 1046.50];

    frequencies.forEach((freq, index) => {
      const oscillator = this.audioContext!.createOscillator();
      const gainNode = this.audioContext!.createGain();
      const delay = index * 0.1;

      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(freq, this.audioContext!.currentTime + delay);

      gainNode.gain.setValueAtTime(0, this.audioContext!.currentTime + delay);
      gainNode.gain.linearRampToValueAtTime(0.2, this.audioContext!.currentTime + delay + 0.1);
      gainNode.gain.exponentialRampToValueAtTime(
        0.001,
        this.audioContext!.currentTime + delay + 1.5
      );

      oscillator.connect(gainNode);
      gainNode.connect(this.audioContext!.destination);

      oscillator.start(this.audioContext!.currentTime + delay);
      oscillator.stop(this.audioContext!.currentTime + delay + 1.5);
    });
  }
}

export const audioManager = new AudioManager();
