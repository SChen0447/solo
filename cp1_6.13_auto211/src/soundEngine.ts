export type SoundEvent = 'select' | 'move' | 'battle_win' | 'battle_lose' |
  'skill_shield' | 'skill_freeze' | 'skill_starcrack' | 'victory';

export class SoundEngine {
  private audioContext: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private initialized = false;

  init(): void {
    if (this.initialized) return;

    try {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.audioContext = new AC();
      this.masterGain = this.audioContext.createGain();
      this.masterGain.gain.value = 0.3;
      this.masterGain.connect(this.audioContext.destination);
      this.initialized = true;
    } catch (e) {
      console.warn('Web Audio API not supported');
    }
  }

  play(event: SoundEvent): void {
    if (!this.initialized || !this.audioContext || !this.masterGain) {
      this.init();
      if (!this.initialized) return;
    }

    if (this.audioContext!.state === 'suspended') {
      this.audioContext!.resume();
    }

    switch (event) {
      case 'select':
        this.playSelect();
        break;
      case 'move':
        this.playMove();
        break;
      case 'battle_win':
        this.playBattleWin();
        break;
      case 'battle_lose':
        this.playBattleLose();
        break;
      case 'skill_shield':
        this.playShield();
        break;
      case 'skill_freeze':
        this.playFreeze();
        break;
      case 'skill_starcrack':
        this.playStarcrack();
        break;
      case 'victory':
        this.playVictory();
        break;
    }
  }

  private playSelect(): void {
    const ctx = this.audioContext!;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1320, ctx.currentTime + 0.08);

    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.25, ctx.currentTime + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);

    osc.connect(gain);
    gain.connect(this.masterGain!);

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.15);
  }

  private playMove(): void {
    const ctx = this.audioContext!;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(520, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(780, ctx.currentTime + 0.12);

    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.2, ctx.currentTime + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);

    osc.connect(gain);
    gain.connect(this.masterGain!);

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.2);
  }

  private playBattleWin(): void {
    const ctx = this.audioContext!;
    const notes = [523.25, 659.25, 783.99, 1046.50];

    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.value = freq;

      const startTime = ctx.currentTime + i * 0.08;
      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(0.3, startTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.4);

      osc.connect(gain);
      gain.connect(this.masterGain!);

      osc.start(startTime);
      osc.stop(startTime + 0.4);
    });
  }

  private playBattleLose(): void {
    const ctx = this.audioContext!;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(400, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.5);

    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.25, ctx.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);

    osc.connect(gain);
    gain.connect(this.masterGain!);

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.5);
  }

  private playShield(): void {
    const ctx = this.audioContext!;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(300, ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(600, ctx.currentTime + 0.15);
    osc.frequency.linearRampToValueAtTime(300, ctx.currentTime + 0.3);

    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.3, ctx.currentTime + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);

    osc.connect(gain);
    gain.connect(this.masterGain!);

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.4);
  }

  private playFreeze(): void {
    const ctx = this.audioContext!;

    const bufferSize = ctx.sampleRate * 0.6;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 2);
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 2000;

    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + 0.5);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.25, ctx.currentTime + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);

    noise.connect(filter);
    filter.connect(gain);
    osc.connect(gain);
    gain.connect(this.masterGain!);

    noise.start(ctx.currentTime);
    osc.start(ctx.currentTime);
    noise.stop(ctx.currentTime + 0.6);
    osc.stop(ctx.currentTime + 0.6);
  }

  private playStarcrack(): void {
    const ctx = this.audioContext!;

    const bufferSize = ctx.sampleRate * 1.2;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 1.5);
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(200, ctx.currentTime);
    filter.frequency.exponentialRampToValueAtTime(2000, ctx.currentTime + 0.5);
    filter.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + 1.0);
    filter.Q.value = 5;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.35, ctx.currentTime + 0.1);
    gain.gain.linearRampToValueAtTime(0.4, ctx.currentTime + 0.5);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.2);

    const osc1 = ctx.createOscillator();
    osc1.type = 'sawtooth';
    osc1.frequency.setValueAtTime(150, ctx.currentTime);
    osc1.frequency.exponentialRampToValueAtTime(800, ctx.currentTime + 0.6);

    const osc1Gain = ctx.createGain();
    osc1Gain.gain.setValueAtTime(0.1, ctx.currentTime);
    osc1Gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain!);

    osc1.connect(osc1Gain);
    osc1Gain.connect(this.masterGain!);

    noise.start(ctx.currentTime);
    osc1.start(ctx.currentTime);
    noise.stop(ctx.currentTime + 1.2);
    osc1.stop(ctx.currentTime + 0.8);
  }

  private playVictory(): void {
    const ctx = this.audioContext!;
    const notes = [523.25, 659.25, 783.99, 1046.50, 783.99, 1046.50, 1318.51];

    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.value = freq;

      const startTime = ctx.currentTime + i * 0.12;
      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(0.3, startTime + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.5);

      osc.connect(gain);
      gain.connect(this.masterGain!);

      osc.start(startTime);
      osc.stop(startTime + 0.5);
    });
  }

  setVolume(volume: number): void {
    if (this.masterGain) {
      this.masterGain.gain.value = Math.max(0, Math.min(1, volume));
    }
  }

  isInitialized(): boolean {
    return this.initialized;
  }
}
