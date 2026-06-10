export type BeatEventCallback = (intensity: number, isStrong: boolean) => void;

export class AudioManager {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private analyser: AnalyserNode | null = null;
  private dataArray: Uint8Array | null = null;
  private isPlaying: boolean = false;
  private bpm: number = 120;
  private beatInterval: number = 500;
  private lastBeatTime: number = 0;
  private beatIndex: number = 0;
  private beatCallbacks: BeatEventCallback[] = [];
  private schedulerId: number | null = null;
  private startTime: number = 0;
  private melodyGain: GainNode | null = null;
  private bassGain: GainNode | null = null;
  private drumGain: GainNode | null = null;
  private musicStarted: boolean = false;

  public getBPM(): number {
    return this.bpm;
  }

  public getBeatProgress(): number {
    if (!this.musicStarted) return 0;
    const elapsed = performance.now() - this.startTime;
    return (elapsed % this.beatInterval) / this.beatInterval;
  }

  public onBeat(callback: BeatEventCallback): void {
    this.beatCallbacks.push(callback);
  }

  private fireBeat(intensity: number, isStrong: boolean): void {
    this.beatCallbacks.forEach((cb) => cb(intensity, isStrong));
  }

  public async init(): Promise<void> {
    if (this.ctx) return;
    this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = 0.3;
    this.masterGain.connect(this.ctx.destination);

    this.analyser = this.ctx.createAnalyser();
    this.analyser.fftSize = 256;
    this.analyser.connect(this.masterGain);
    this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);

    this.melodyGain = this.ctx.createGain();
    this.melodyGain.gain.value = 0.15;
    this.melodyGain.connect(this.analyser);

    this.bassGain = this.ctx.createGain();
    this.bassGain.gain.value = 0.25;
    this.bassGain.connect(this.analyser);

    this.drumGain = this.ctx.createGain();
    this.drumGain.gain.value = 0.3;
    this.drumGain.connect(this.analyser);

    this.beatInterval = 60000 / this.bpm;
  }

  public async start(): Promise<void> {
    if (!this.ctx) await this.init();
    if (!this.ctx) return;
    if (this.ctx.state === 'suspended') {
      await this.ctx.resume();
    }
    if (this.isPlaying) return;

    this.isPlaying = true;
    this.musicStarted = true;
    this.startTime = performance.now();
    this.lastBeatTime = this.startTime;
    this.beatIndex = 0;

    this.startMusicLoop();
    this.startBeatScheduler();
  }

  public stop(): void {
    this.isPlaying = false;
    if (this.schedulerId !== null) {
      cancelAnimationFrame(this.schedulerId);
      this.schedulerId = null;
    }
  }

  private startBeatScheduler(): void {
    const schedule = () => {
      if (!this.isPlaying) return;
      const now = performance.now();
      const elapsed = now - this.startTime;
      const currentBeat = Math.floor(elapsed / this.beatInterval);

      while (this.beatIndex <= currentBeat) {
        const beatTime = this.startTime + this.beatIndex * this.beatInterval;
        const intensity = this.analyzeBeatIntensity();
        const isStrong = this.beatIndex % 4 === 0 || intensity > 0.6;
        this.fireBeat(intensity, isStrong);
        this.beatIndex++;
        this.lastBeatTime = beatTime;
      }

      this.schedulerId = requestAnimationFrame(schedule);
    };
    this.schedulerId = requestAnimationFrame(schedule);
  }

  private analyzeBeatIntensity(): number {
    if (!this.analyser || !this.dataArray) return 0.5;
    this.analyser.getByteFrequencyData(this.dataArray);
    const lowEnd = this.dataArray.slice(0, 16);
    const sum = lowEnd.reduce((a, b) => a + b, 0);
    const avg = sum / lowEnd.length;
    return Math.min(1, avg / 180);
  }

  private startMusicLoop(): void {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const lookahead = 0.1;
    const scheduleAhead = 0.2;
    const secondsPerBeat = 60 / this.bpm;
    let nextNoteTime = ctx.currentTime + 0.1;

    const melody: number[] = [
      523, 659, 784, 659, 523, 659, 784, 880,
      784, 659, 523, 587, 659, 587, 523, 494,
      523, 659, 784, 659, 523, 659, 784, 880,
      988, 880, 784, 659, 523, 587, 659, 523
    ];

    const bass: number[] = [
      131, 131, 196, 196, 175, 175, 147, 147,
      131, 131, 196, 196, 175, 165, 147, 131,
      131, 131, 196, 196, 175, 175, 147, 147,
      196, 175, 165, 147, 131, 165, 196, 131
    ];

    const scheduleNote = (beat: number, time: number) => {
      const melIdx = beat % melody.length;
      const bassIdx = beat % bass.length;
      const isStrong = beat % 4 === 0;

      this.playSquare(melody[melIdx], time, secondsPerBeat * 0.4, this.melodyGain!, isStrong ? 1 : 0.7);
      this.playSquare(bass[bassIdx], time, secondsPerBeat * 0.6, this.bassGain!, 1);

      if (beat % 2 === 0) {
        this.playKick(time);
      }
      if (beat % 4 === 2) {
        this.playSnare(time);
      }
      if (beat % 1 === 0) {
        this.playHat(time, beat % 2 === 1 ? 0.3 : 0.6);
      }
    };

    const scheduler = () => {
      if (!this.isPlaying || !this.ctx) return;
      while (nextNoteTime < ctx.currentTime + scheduleAhead) {
        const beat = Math.round((nextNoteTime - ctx.currentTime) / secondsPerBeat) + Math.floor(ctx.currentTime / secondsPerBeat);
        scheduleNote(beat, nextNoteTime);
        nextNoteTime += secondsPerBeat;
      }
      setTimeout(scheduler, lookahead * 1000);
    };
    scheduler();
  }

  private playSquare(freq: number, time: number, duration: number, output: GainNode, volume: number): void {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'square';
    osc.frequency.value = freq;

    gain.gain.setValueAtTime(0, time);
    gain.gain.linearRampToValueAtTime(volume, time + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.001, time + duration);

    osc.connect(gain);
    gain.connect(output);
    osc.start(time);
    osc.stop(time + duration + 0.05);
  }

  private playKick(time: number): void {
    if (!this.ctx || !this.drumGain) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(150, time);
    osc.frequency.exponentialRampToValueAtTime(40, time + 0.1);

    gain.gain.setValueAtTime(0, time);
    gain.gain.linearRampToValueAtTime(1, time + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.15);

    osc.connect(gain);
    gain.connect(this.drumGain);
    osc.start(time);
    osc.stop(time + 0.2);
  }

  private playSnare(time: number): void {
    if (!this.ctx || !this.drumGain) return;
    const noise = this.ctx.createBufferSource();
    const bufferSize = this.ctx.sampleRate * 0.15;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    noise.buffer = buffer;

    const noiseFilter = this.ctx.createBiquadFilter();
    noiseFilter.type = 'highpass';
    noiseFilter.frequency.value = 1000;

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0, time);
    noiseGain.gain.linearRampToValueAtTime(0.6, time + 0.005);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, time + 0.15);

    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(this.drumGain);
    noise.start(time);
    noise.stop(time + 0.2);
  }

  private playHat(time: number, volume: number): void {
    if (!this.ctx || !this.drumGain) return;
    const noise = this.ctx.createBufferSource();
    const bufferSize = this.ctx.sampleRate * 0.05;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    noise.buffer = buffer;

    const hatFilter = this.ctx.createBiquadFilter();
    hatFilter.type = 'highpass';
    hatFilter.frequency.value = 5000;

    const hatGain = this.ctx.createGain();
    hatGain.gain.setValueAtTime(0, time);
    hatGain.gain.linearRampToValueAtTime(volume * 0.3, time + 0.001);
    hatGain.gain.exponentialRampToValueAtTime(0.001, time + 0.05);

    noise.connect(hatFilter);
    hatFilter.connect(hatGain);
    hatGain.connect(this.drumGain);
    noise.start(time);
    noise.stop(time + 0.06);
  }

  public playExplosion(): void {
    if (!this.ctx || !this.masterGain) return;
    const ctx = this.ctx;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(800, now);
    osc.frequency.exponentialRampToValueAtTime(100, now + 0.2);

    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.4, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.25);
  }

  public playShockwave(): void {
    if (!this.ctx || !this.masterGain) return;
    const ctx = this.ctx;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(200, now);
    osc.frequency.exponentialRampToValueAtTime(1200, now + 0.3);

    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.5, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.35);
  }
}
