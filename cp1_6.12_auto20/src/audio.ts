export interface FrequencyData {
  low: number;
  mid: number;
  high: number;
}

export class AudioManager {
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private masterGain: GainNode | null = null;
  private dataArray: Uint8Array | null = null;
  private bpm: number = 120;
  private isPlaying: boolean = false;
  private nextNoteTime: number = 0;
  private currentBeat: number = 0;
  private schedulerTimer: number | null = null;
  private scheduleAheadTime: number = 0.1;
  private beatCallback: ((beat: number, isStrong: boolean) => void) | null = null;

  private readonly LOW_FREQ_MAX = 200;
  private readonly MID_FREQ_MAX = 2000;
  private readonly FFT_SIZE = 256;

  constructor() {}

  init(bpm: number = 120): void {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    this.bpm = bpm;
    this.setupAnalyser();
  }

  private setupAnalyser(): void {
    if (!this.audioContext) return;

    this.analyser = this.audioContext.createAnalyser();
    this.analyser.fftSize = this.FFT_SIZE;
    this.analyser.smoothingTimeConstant = 0.7;

    this.masterGain = this.audioContext.createGain();
    this.masterGain.gain.value = 0.3;

    this.masterGain.connect(this.analyser);
    this.analyser.connect(this.audioContext.destination);

    this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);
  }

  setBPM(bpm: number): void {
    this.bpm = bpm;
  }

  getBPM(): number {
    return this.bpm;
  }

  start(): void {
    if (!this.audioContext) {
      this.init(this.bpm);
    }
    if (this.audioContext?.state === 'suspended') {
      this.audioContext.resume();
    }
    if (this.isPlaying) return;

    this.isPlaying = true;
    this.nextNoteTime = this.audioContext!.currentTime;
    this.currentBeat = 0;
    this.scheduler();
  }

  stop(): void {
    this.isPlaying = false;
    if (this.schedulerTimer) {
      clearTimeout(this.schedulerTimer);
      this.schedulerTimer = null;
    }
    if (this.masterGain) {
      this.masterGain.gain.cancelScheduledValues(this.audioContext!.currentTime);
      this.masterGain.gain.setValueAtTime(0, this.audioContext!.currentTime);
    }
  }

  reset(): void {
    this.stop();
    this.currentBeat = 0;
    if (this.masterGain && this.audioContext) {
      this.masterGain.gain.setValueAtTime(0.3, this.audioContext.currentTime);
    }
  }

  onBeat(callback: (beat: number, isStrong: boolean) => void): void {
    this.beatCallback = callback;
  }

  private scheduler(): void {
    if (!this.isPlaying) return;

    while (this.nextNoteTime < this.audioContext!.currentTime + this.scheduleAheadTime) {
      this.scheduleBeat(this.currentBeat, this.nextNoteTime);
      this.nextNote();
    }

    this.schedulerTimer = window.setTimeout(() => this.scheduler(), 25);
  }

  private nextNote(): void {
    const secondsPerBeat = 60.0 / this.bpm;
    this.nextNoteTime += secondsPerBeat / 2;
    this.currentBeat = (this.currentBeat + 1) % 16;
  }

  private scheduleBeat(beat: number, time: number): void {
    if (!this.audioContext || !this.masterGain) return;

    const isStrong = beat % 4 === 0;
    const is8th = beat % 2 === 0;

    if (beat % 8 === 0) {
      this.playKick(time);
    }

    if (is8th) {
      this.playHiHat(time, beat % 4 === 0);
    }

    if (isStrong && beat % 8 !== 0) {
      this.playSnare(time);
    }

    if (beat % 2 === 1) {
      this.playBass(time, beat);
    }

    if (this.beatCallback && is8th) {
      const beatIndex = Math.floor(beat / 2);
      this.beatCallback(beatIndex, beat % 8 === 0);
    }
  }

  private playKick(time: number): void {
    if (!this.audioContext || !this.masterGain) return;

    const osc = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(150, time);
    osc.frequency.exponentialRampToValueAtTime(40, time + 0.15);

    gain.gain.setValueAtTime(1.0, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.3);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(time);
    osc.stop(time + 0.3);
  }

  private playSnare(time: number): void {
    if (!this.audioContext || !this.masterGain) return;

    const noise = this.audioContext.createBufferSource();
    const noiseBuffer = this.audioContext.createBuffer(1, this.audioContext.sampleRate * 0.2, this.audioContext.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < noiseBuffer.length; i++) {
      output[i] = Math.random() * 2 - 1;
    }
    noise.buffer = noiseBuffer;

    const noiseGain = this.audioContext.createGain();
    const noiseFilter = this.audioContext.createBiquadFilter();
    noiseFilter.type = 'highpass';
    noiseFilter.frequency.value = 1000;

    noiseGain.gain.setValueAtTime(0.5, time);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, time + 0.15);

    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(this.masterGain);

    noise.start(time);
    noise.stop(time + 0.2);

    const osc = this.audioContext.createOscillator();
    const oscGain = this.audioContext.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(200, time);
    osc.frequency.exponentialRampToValueAtTime(100, time + 0.1);

    oscGain.gain.setValueAtTime(0.3, time);
    oscGain.gain.exponentialRampToValueAtTime(0.001, time + 0.1);

    osc.connect(oscGain);
    oscGain.connect(this.masterGain);

    osc.start(time);
    osc.stop(time + 0.1);
  }

  private playHiHat(time: number, isOpen: boolean): void {
    if (!this.audioContext || !this.masterGain) return;

    const noise = this.audioContext.createBufferSource();
    const noiseBuffer = this.audioContext.createBuffer(1, this.audioContext.sampleRate * 0.1, this.audioContext.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < noiseBuffer.length; i++) {
      output[i] = Math.random() * 2 - 1;
    }
    noise.buffer = noiseBuffer;

    const filter = this.audioContext.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 5000;

    const gain = this.audioContext.createGain();
    const duration = isOpen ? 0.1 : 0.05;

    gain.gain.setValueAtTime(0.2, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + duration);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    noise.start(time);
    noise.stop(time + duration);
  }

  private playBass(time: number, beat: number): void {
    if (!this.audioContext || !this.masterGain) return;

    const notes = [55, 55, 73.42, 65.41, 55, 55, 73.42, 82.41];
    const noteIndex = Math.floor(beat / 2) % notes.length;
    const freq = notes[noteIndex];

    const osc = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(freq, time);

    const filter = this.audioContext.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(800, time);
    filter.frequency.exponentialRampToValueAtTime(200, time + 0.2);

    gain.gain.setValueAtTime(0.25, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.25);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    osc.start(time);
    osc.stop(time + 0.25);
  }

  getFrequencyData(): FrequencyData {
    if (!this.analyser || !this.dataArray) {
      return { low: 0, mid: 0, high: 0 };
    }

    this.analyser.getByteFrequencyData(this.dataArray);

    const nyquist = this.audioContext!.sampleRate / 2;
    const binWidth = nyquist / this.dataArray.length;

    let lowSum = 0;
    let midSum = 0;
    let highSum = 0;
    let lowCount = 0;
    let midCount = 0;
    let highCount = 0;

    for (let i = 0; i < this.dataArray.length; i++) {
      const freq = i * binWidth;
      const value = this.dataArray[i] / 255;

      if (freq < this.LOW_FREQ_MAX) {
        lowSum += value;
        lowCount++;
      } else if (freq < this.MID_FREQ_MAX) {
        midSum += value;
        midCount++;
      } else {
        highSum += value;
        highCount++;
      }
    }

    return {
      low: lowCount > 0 ? lowSum / lowCount : 0,
      mid: midCount > 0 ? midSum / midCount : 0,
      high: highCount > 0 ? highSum / highCount : 0
    };
  }

  getRawFFT(): Uint8Array | null {
    if (!this.analyser || !this.dataArray) return null;
    this.analyser.getByteFrequencyData(this.dataArray);
    return this.dataArray;
  }

  getBeatProgress(): number {
    if (!this.audioContext || this.bpm === 0) return 0;
    const secondsPerBeat = 60.0 / this.bpm;
    const elapsed = this.audioContext.currentTime - (this.nextNoteTime - secondsPerBeat / 2);
    return Math.min(1, Math.max(0, (elapsed / secondsPerBeat) * 2));
  }
}
