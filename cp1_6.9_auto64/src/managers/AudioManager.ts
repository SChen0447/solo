import * as Phaser from 'phaser';

export type SoundType = 'playCard' | 'damage' | 'victory' | 'defeat' | 'collision' | 'shatter';

export class AudioManager {
  private static instance: AudioManager;
  private scene: Phaser.Scene | null = null;
  private enabled: boolean = true;

  private constructor() {}

  public static getInstance(): AudioManager {
    if (!AudioManager.instance) {
      AudioManager.instance = new AudioManager();
    }
    return AudioManager.instance;
  }

  public setScene(scene: Phaser.Scene): void {
    this.scene = scene;
  }

  public playSound(type: SoundType): void {
    if (!this.enabled || !this.scene) return;

    try {
      switch (type) {
        case 'playCard':
          this.playTone(440, 0.1, 'sine', 0.15);
          break;
        case 'damage':
          this.playTone(200, 0.15, 'sawtooth', 0.2);
          break;
        case 'collision':
          this.playTone(150, 0.2, 'square', 0.25);
          this.scene.time.delayedCall(50, () => this.playTone(100, 0.15, 'sawtooth', 0.2));
          break;
        case 'victory':
          this.playTone(523, 0.15, 'sine', 0.2);
          this.scene.time.delayedCall(150, () => this.playTone(659, 0.15, 'sine', 0.2));
          this.scene.time.delayedCall(300, () => this.playTone(784, 0.3, 'sine', 0.2));
          break;
        case 'defeat':
          this.playTone(300, 0.2, 'sine', 0.2);
          this.scene.time.delayedCall(200, () => this.playTone(250, 0.2, 'sine', 0.2));
          this.scene.time.delayedCall(400, () => this.playTone(200, 0.4, 'sine', 0.2));
          break;
        case 'shatter':
          this.playTone(800, 0.1, 'square', 0.1);
          this.scene.time.delayedCall(50, () => this.playTone(600, 0.08, 'square', 0.08));
          this.scene.time.delayedCall(100, () => this.playTone(400, 0.12, 'sawtooth', 0.1));
          break;
      }
    } catch (e) {
      console.warn('Audio playback failed:', e);
    }
  }

  private playTone(frequency: number, duration: number, type: OscillatorType, volume: number): void {
    if (!this.scene) return;

    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContext) return;

      const audioContext = new AudioContext();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.type = type;
      oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);

      gainNode.gain.setValueAtTime(volume, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration);

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + duration);
    } catch (e) {
      console.warn('Tone generation failed:', e);
    }
  }

  public setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  public isEnabled(): boolean {
    return this.enabled;
  }
}
