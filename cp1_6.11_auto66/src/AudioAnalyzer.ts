export interface AudioData {
  overallEnergy: number;
  bassEnergy: number;
  midEnergy: number;
  highEnergy: number;
  frequencyData: Uint8Array;
  beatDetected: boolean;
  time: number;
}

export class AudioAnalyzer {
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private gainNode: GainNode | null = null;
  private frequencyData: Uint8Array<ArrayBuffer>;
  private isPlaying: boolean = false;
  private musicStartTime: number = 0;
  private loopInterval: number = 30000;
  private lastBeatTime: number = 0;
  private beatThreshold: number = 0.65;
  private energyHistory: number[] = [];
  private sourceNode: AudioBufferSourceNode | null = null;

  constructor() {
    this.frequencyData = new Uint8Array(new ArrayBuffer(256));
  }

  public async init(): Promise<void> {
    this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    this.analyser = this.audioContext.createAnalyser();
    this.analyser.fftSize = 512;
    this.analyser.smoothingTimeConstant = 0.8;
    this.frequencyData = new Uint8Array(new ArrayBuffer(this.analyser.frequencyBinCount));
    this.gainNode = this.audioContext.createGain();
    this.gainNode.gain.value = 0.3;
    this.analyser.connect(this.gainNode);
    this.gainNode.connect(this.audioContext.destination);
  }

  public start(): void {
    if (!this.audioContext || this.isPlaying) return;
    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }
    this.playGeneratedMusic();
    this.isPlaying = true;
    this.musicStartTime = performance.now();
  }

  public stop(): void {
    if (this.sourceNode) {
      try { this.sourceNode.stop(); } catch (e) {}
      this.sourceNode.disconnect();
      this.sourceNode = null;
    }
    this.isPlaying = false;
  }

  private playGeneratedMusic(): void {
    if (!this.audioContext || !this.analyser) return;

    const sampleRate = this.audioContext.sampleRate;
    const duration = 30;
    const buffer = this.audioContext.createBuffer(2, sampleRate * duration, sampleRate);

    const leftChannel = buffer.getChannelData(0);
    const rightChannel = buffer.getChannelData(1);

    const bpm = 128;
    const beatDuration = 60 / bpm;
    const samplesPerBeat = Math.floor(beatDuration * sampleRate);

    const melody: [number, number][] = [
      [523.25, 0.5], [659.25, 0.5], [783.99, 0.5], [659.25, 0.5],
      [523.25, 0.5], [783.99, 0.5], [880.00, 0.5], [783.99, 0.5],
      [659.25, 0.5], [523.25, 0.5], [587.33, 0.5], [659.25, 0.5],
      [523.25, 0.5], [493.88, 0.5], [523.25, 0.5], [659.25, 0.5],
      [783.99, 0.5], [987.77, 0.5], [880.00, 0.5], [783.99, 0.5],
      [659.25, 0.5], [783.99, 0.5], [659.25, 0.5], [523.25, 0.5],
      [440.00, 0.5], [523.25, 0.5], [659.25, 0.5], [523.25, 0.5],
      [440.00, 0.5], [493.88, 0.5], [523.25, 0.5], [440.00, 0.5],
    ];

    const bassNotes: number[] = [
      130.81, 130.81, 146.83, 146.83,
      164.81, 164.81, 130.81, 130.81,
      146.83, 146.83, 164.81, 164.81,
      130.81, 130.81, 146.83, 146.83,
      164.81, 164.81, 146.83, 146.83,
      130.81, 130.81, 164.81, 164.81,
      146.83, 146.83, 130.81, 130.81,
      164.81, 164.81, 146.83, 146.83,
    ];

    let melodyIndex = 0;
    let bassIndex = 0;
    let noteSampleCounter = 0;
    let beatCounter = 0;

    for (let i = 0; i < buffer.length; i++) {
      const t = i / sampleRate;
      let sampleL = 0;
      let sampleR = 0;

      if (noteSampleCounter >= samplesPerBeat / 2) {
        noteSampleCounter = 0;
        melodyIndex = (melodyIndex + 1) % melody.length;
        if (beatCounter % 2 === 0) {
          bassIndex = (bassIndex + 1) % bassNotes.length;
        }
        beatCounter++;
      }

      const [freq, noteType] = melody[melodyIndex];
      const noteProgress = noteSampleCounter / (samplesPerBeat / 2);
      const envelope = this.getEnvelope(noteProgress, noteType);

      const squareWave = this.squareWave(freq, t) * 0.18 * envelope;
      sampleL += squareWave;
      sampleR += squareWave * 0.95;

      const bassFreq = bassNotes[bassIndex];
      const bassEnv = this.getEnvelope(noteProgress, 0.8);
      const bassWave = this.triangleWave(bassFreq, t) * 0.15 * bassEnv;
      sampleL += bassWave * 0.9;
      sampleR += bassWave;

      if (beatCounter % 4 === 0 && noteSampleCounter < samplesPerBeat * 0.15) {
        const kickEnv = Math.exp(-noteSampleCounter / (samplesPerBeat * 0.08));
        const kickFreq = 60 + 40 * Math.exp(-noteSampleCounter / (samplesPerBeat * 0.1));
        const kick = Math.sin(2 * Math.PI * kickFreq * t) * 0.35 * kickEnv;
        sampleL += kick;
        sampleR += kick;
      }

      if (beatCounter % 2 === 1 && noteSampleCounter < samplesPerBeat * 0.1) {
        const noiseEnv = Math.exp(-noteSampleCounter / (samplesPerBeat * 0.03));
        const noise = (Math.random() * 2 - 1) * 0.12 * noiseEnv;
        sampleL += noise;
        sampleR += noise;
      }

      if (noteSampleCounter >= samplesPerBeat / 2 - samplesPerBeat * 0.05) {
        const releaseFactor = 1 - (noteSampleCounter - (samplesPerBeat / 2 - samplesPerBeat * 0.05)) / (samplesPerBeat * 0.05);
        sampleL *= Math.max(0, releaseFactor);
        sampleR *= Math.max(0, releaseFactor);
      }

      leftChannel[i] = Math.max(-1, Math.min(1, sampleL));
      rightChannel[i] = Math.max(-1, Math.min(1, sampleR));
      noteSampleCounter++;
    }

    this.sourceNode = this.audioContext.createBufferSource();
    this.sourceNode.buffer = buffer;
    this.sourceNode.loop = true;
    this.sourceNode.connect(this.analyser);
    this.sourceNode.start(0);
  }

  private getEnvelope(progress: number, sustain: number): number {
    if (progress < 0.1) return progress / 0.1;
    if (progress < 0.3) return 1 - (1 - sustain) * ((progress - 0.1) / 0.2);
    if (progress < 0.85) return sustain;
    return sustain * (1 - (progress - 0.85) / 0.15);
  }

  private squareWave(freq: number, t: number): number {
    const v = Math.sin(2 * Math.PI * freq * t);
    return v >= 0 ? 0.8 : -0.8;
  }

  private triangleWave(freq: number, t: number): number {
    const phase = (t * freq) % 1;
    return phase < 0.5 ? (4 * phase - 1) : (3 - 4 * phase);
  }

  public analyze(): AudioData {
    if (!this.analyser) {
      return {
        overallEnergy: 0,
        bassEnergy: 0,
        midEnergy: 0,
        highEnergy: 0,
        frequencyData: this.frequencyData,
        beatDetected: false,
        time: 0
      };
    }

    this.analyser.getByteFrequencyData(this.frequencyData);

    const bins = this.frequencyData.length;
    const bassEnd = Math.floor(bins * 0.1);
    const midEnd = Math.floor(bins * 0.5);

    let bassSum = 0;
    let midSum = 0;
    let highSum = 0;
    let totalSum = 0;

    for (let i = 0; i < bins; i++) {
      const v = this.frequencyData[i] / 255;
      totalSum += v;
      if (i < bassEnd) bassSum += v;
      else if (i < midEnd) midSum += v;
      else highSum += v;
    }

    const overallEnergy = Math.min(1, (totalSum / bins) * 2);
    const bassEnergy = Math.min(1, (bassSum / bassEnd) * 2);
    const midEnergy = Math.min(1, (midSum / (midEnd - bassEnd)) * 2);
    const highEnergy = Math.min(1, (highSum / (bins - midEnd)) * 2);

    this.energyHistory.push(bassEnergy);
    if (this.energyHistory.length > 43) this.energyHistory.shift();

    const avgEnergy = this.energyHistory.reduce((a, b) => a + b, 0) / this.energyHistory.length;
    const now = performance.now();
    let beatDetected = false;

    if (bassEnergy > this.beatThreshold &&
        bassEnergy > avgEnergy * 1.4 &&
        now - this.lastBeatTime > 200) {
      beatDetected = true;
      this.lastBeatTime = now;
    }

    return {
      overallEnergy,
      bassEnergy,
      midEnergy,
      highEnergy,
      frequencyData: this.frequencyData,
      beatDetected,
      time: now
    };
  }

  public getElapsedTime(): number {
    if (!this.isPlaying) return 0;
    return performance.now() - this.musicStartTime;
  }

  public getLoopInterval(): number {
    return this.loopInterval;
  }
}
