export type MusicType = 'cheerful' | 'tense';

export class AudioManager {
  private audioContext: AudioContext | null = null;
  private currentMusic: MusicType = 'cheerful';
  private isPlaying: boolean = false;
  private cheerfulOscillators: OscillatorNode[] = [];
  private tenseOscillators: OscillatorNode[] = [];
  private cheerfulGain: GainNode | null = null;
  private tenseGain: GainNode | null = null;
  private masterGain: GainNode | null = null;
  private musicInterval: number | null = null;
  private cheerfulPatternIndex: number = 0;
  private tensePatternIndex: number = 0;
  private crossfadeGain: GainNode | null = null;

  constructor() {}

  private init(): void {
    if (this.audioContext) return;
    this.audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext();
    this.masterGain = this.audioContext.createGain();
    this.masterGain.gain.value = 0.25;
    this.masterGain.connect(this.audioContext.destination);

    this.crossfadeGain = this.audioContext.createGain();
    this.crossfadeGain.gain.value = 1;
    this.crossfadeGain.connect(this.masterGain);
  }

  startMusic(type: MusicType): void {
    this.init();
    if (!this.audioContext || !this.crossfadeGain || !this.masterGain) return;

    this.audioContext.resume();

    this.currentMusic = type;
    this.stopAllMusic();

    if (type === 'cheerful') {
      this.startCheerfulMusic();
    } else {
      this.startTenseMusic();
    }
    this.isPlaying = true;
  }

  switchMusic(type: MusicType): void {
    if (type === this.currentMusic) return;
    if (!this.audioContext || !this.crossfadeGain) return;

    const now = this.audioContext.currentTime;
    const fadeDuration = 0.05;

    if (type === 'cheerful') {
      if (this.tenseGain) {
        this.tenseGain.gain.cancelScheduledValues(now);
        this.tenseGain.gain.setValueAtTime(this.tenseGain.gain.value, now);
        this.tenseGain.gain.linearRampToValueAtTime(0, now + fadeDuration);
      }
      if (this.cheerfulGain) {
        this.cheerfulGain.gain.cancelScheduledValues(now);
        this.cheerfulGain.gain.setValueAtTime(this.cheerfulGain.gain.value, now);
        this.cheerfulGain.gain.linearRampToValueAtTime(0.5, now + fadeDuration);
      } else {
        this.startCheerfulMusic(true);
      }
    } else {
      if (this.cheerfulGain) {
        this.cheerfulGain.gain.cancelScheduledValues(now);
        this.cheerfulGain.gain.setValueAtTime(this.cheerfulGain.gain.value, now);
        this.cheerfulGain.gain.linearRampToValueAtTime(0, now + fadeDuration);
      }
      if (this.tenseGain) {
        this.tenseGain.gain.cancelScheduledValues(now);
        this.tenseGain.gain.setValueAtTime(this.tenseGain.gain.value, now);
        this.tenseGain.gain.linearRampToValueAtTime(0.5, now + fadeDuration);
      } else {
        this.startTenseMusic(true);
      }
    }
    this.currentMusic = type;
  }

  private startCheerfulMusic(fadeIn: boolean = false): void {
    if (!this.audioContext || !this.crossfadeGain) return;

    this.cheerfulGain = this.audioContext.createGain();
    this.cheerfulGain.gain.value = fadeIn ? 0 : 0.5;
    this.cheerfulGain.connect(this.crossfadeGain);

    if (fadeIn) {
      const now = this.audioContext.currentTime;
      this.cheerfulGain.gain.linearRampToValueAtTime(0.5, now + 0.05);
    }

    const cheerfulNotes = [523.25, 587.33, 659.25, 783.99, 659.25, 587.33, 523.25, 659.25];
    const cheerfulBassNotes = [130.81, 164.81, 196.00, 130.81];

    this.cheerfulPatternIndex = 0;

    const playStep = () => {
      if (!this.audioContext || !this.cheerfulGain || this.currentMusic !== 'cheerful' && !this.isPlaying) return;

      const note = cheerfulNotes[this.cheerfulPatternIndex % cheerfulNotes.length];
      const bassNote = cheerfulBassNotes[Math.floor(this.cheerfulPatternIndex / 2) % cheerfulBassNotes.length];

      this.playNote(note, 0.15, 'triangle', 0.15);
      this.playNote(bassNote, 0.2, 'sine', 0.1);

      this.cheerfulPatternIndex++;
    };

    playStep();
    this.musicInterval = window.setInterval(playStep, 280);
  }

  private startTenseMusic(fadeIn: boolean = false): void {
    if (!this.audioContext || !this.crossfadeGain) return;

    this.tenseGain = this.audioContext.createGain();
    this.tenseGain.gain.value = fadeIn ? 0 : 0.5;
    this.tenseGain.connect(this.crossfadeGain);

    if (fadeIn) {
      const now = this.audioContext.currentTime;
      this.tenseGain.gain.linearRampToValueAtTime(0.5, now + 0.05);
    }

    const tenseNotes = [440, 466.16, 493.88, 523.25, 493.88, 466.16, 440, 392];
    const tenseBassNotes = [110, 123.47, 130.81, 110];

    this.tensePatternIndex = 0;

    const playStep = () => {
      if (!this.audioContext || !this.tenseGain || this.currentMusic !== 'tense' || !this.isPlaying) return;

      const note = tenseNotes[this.tensePatternIndex % tenseNotes.length];
      const bassNote = tenseBassNotes[Math.floor(this.tensePatternIndex / 2) % tenseBassNotes.length];

      this.playNote(note, 0.12, 'sawtooth', 0.12);
      this.playNote(bassNote, 0.18, 'square', 0.08);

      this.tensePatternIndex++;
    };

    playStep();
    this.musicInterval = window.setInterval(playStep, 180);
  }

  private playNote(frequency: number, duration: number, type: OscillatorType, volume: number): void {
    if (!this.audioContext) return;

    const osc = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(frequency, this.audioContext.currentTime);

    gain.gain.setValueAtTime(0, this.audioContext.currentTime);
    gain.gain.linearRampToValueAtTime(volume, this.audioContext.currentTime + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + duration);

    osc.connect(gain);

    if (this.currentMusic === 'cheerful' && this.cheerfulGain) {
      gain.connect(this.cheerfulGain);
      this.cheerfulOscillators.push(osc);
    } else if (this.currentMusic === 'tense' && this.tenseGain) {
      gain.connect(this.tenseGain);
      this.tenseOscillators.push(osc);
    }

    osc.start();
    osc.stop(this.audioContext.currentTime + duration);
  }

  private stopAllMusic(): void {
    if (this.musicInterval !== null) {
      clearInterval(this.musicInterval);
      this.musicInterval = null;
    }

    this.cheerfulOscillators.forEach(osc => {
      try { osc.stop(); } catch (_e) { /* ignore */ }
    });
    this.tenseOscillators.forEach(osc => {
      try { osc.stop(); } catch (_e) { /* ignore */ }
    });
    this.cheerfulOscillators = [];
    this.tenseOscillators = [];

    if (this.cheerfulGain) {
      try { this.cheerfulGain.disconnect(); } catch (_e) { /* ignore */ }
      this.cheerfulGain = null;
    }
    if (this.tenseGain) {
      try { this.tenseGain.disconnect(); } catch (_e) { /* ignore */ }
      this.tenseGain = null;
    }
  }

  playJumpSound(): void {
    if (!this.audioContext) return;

    const osc = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(600, this.audioContext.currentTime);
    osc.frequency.exponentialRampToValueAtTime(900, this.audioContext.currentTime + 0.15);

    gain.gain.setValueAtTime(0, this.audioContext.currentTime);
    gain.gain.linearRampToValueAtTime(0.15, this.audioContext.currentTime + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + 0.15);

    osc.connect(gain);
    if (this.masterGain) gain.connect(this.masterGain);
    osc.start();
    osc.stop(this.audioContext.currentTime + 0.15);
  }

  playCoinSound(): void {
    if (!this.audioContext) return;

    const osc = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(880, this.audioContext.currentTime);
    osc.frequency.setValueAtTime(1320, this.audioContext.currentTime + 0.08);

    gain.gain.setValueAtTime(0, this.audioContext.currentTime);
    gain.gain.linearRampToValueAtTime(0.2, this.audioContext.currentTime + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + 0.2);

    osc.connect(gain);
    if (this.masterGain) gain.connect(this.masterGain);
    osc.start();
    osc.stop(this.audioContext.currentTime + 0.2);
  }

  stop(): void {
    this.isPlaying = false;
    this.stopAllMusic();
  }

  getCurrentMusic(): MusicType {
    return this.currentMusic;
  }
}
