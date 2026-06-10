export type BeatEventHandler = (isHeavy: boolean) => void;

export class AudioAnalyzer {
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private dataArray: Uint8Array | null = null;
  private onBeatCallback: BeatEventHandler | null = null;

  private beatStartTime = 0;
  private beatInterval = 500;
  private lastHeavyBeatTime = -1000;
  private heavyBeatThreshold = 50;
  private heavyBeatCooldown = 400;

  private bassOscillators: OscillatorNode[] = [];
  private trebleOscillators: OscillatorNode[] = [];
  private bassGains: GainNode[] = [];
  private trebleGains: GainNode[] = [];
  private masterGain: GainNode | null = null;
  private musicStartTime = 0;
  private isPlaying = false;
  private bpm = 120;

  private beatCount = 0;
  private scheduledBeats = new Set<number>();

  constructor() {}

  setOnBeatCallback(callback: BeatEventHandler): void {
    this.onBeatCallback = callback;
  }

  async init(): Promise<void> {
    if (this.audioContext) return;

    this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();

    this.analyser = this.audioContext.createAnalyser();
    this.analyser.fftSize = 256;
    this.analyser.smoothingTimeConstant = 0.3;

    const bufferLength = this.analyser.frequencyBinCount;
    this.dataArray = new Uint8Array(bufferLength);

    this.masterGain = this.audioContext.createGain();
    this.masterGain.gain.value = 0.5;
    this.masterGain.connect(this.analyser);
    this.analyser.connect(this.audioContext.destination);

    this.beatInterval = 60000 / this.bpm;
  }

  startMusic(): void {
    if (!this.audioContext || this.isPlaying) return;

    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }

    this.isPlaying = true;
    this.musicStartTime = this.audioContext.currentTime;
    this.beatCount = 0;
    this.scheduledBeats.clear();

    this.scheduleMusicLoop();
  }

  private scheduleMusicLoop(): void {
    if (!this.audioContext || !this.masterGain) return;

    const ctx = this.audioContext;
    const now = ctx.currentTime;

    for (let i = 0; i < 32; i++) {
      const beatTime = this.musicStartTime + i * (this.beatInterval / 1000);

      if (beatTime >= now - 0.1 && !this.scheduledBeats.has(i)) {
        this.scheduledBeats.add(i);
        this.scheduleBeat(beatTime, i);
      }
    }

    setTimeout(() => {
      if (this.isPlaying) {
        this.scheduleMusicLoop();
      }
    }, 2000);
  }

  private scheduleBeat(time: number, beatIndex: number): void {
    if (!this.audioContext || !this.masterGain) return;

    const ctx = this.audioContext;
    const beatDuration = 0.15;

    if (beatIndex % 1 === 0) {
      const bassOsc = ctx.createOscillator();
      const bassGain = ctx.createGain();

      bassOsc.type = 'sine';
      bassOsc.frequency.setValueAtTime(100, time);

      bassGain.gain.setValueAtTime(0, time);
      bassGain.gain.linearRampToValueAtTime(0.8, time + 0.01);
      bassGain.gain.exponentialRampToValueAtTime(0.001, time + beatDuration);

      bassOsc.connect(bassGain);
      bassGain.connect(this.masterGain);

      bassOsc.start(time);
      bassOsc.stop(time + beatDuration + 0.05);

      this.bassOscillators.push(bassOsc);
      this.bassGains.push(bassGain);
    }

    if (beatIndex % 2 === 0) {
      const trebleOsc = ctx.createOscillator();
      const trebleGain = ctx.createGain();

      trebleOsc.type = 'square';
      trebleOsc.frequency.setValueAtTime(440, time);

      trebleGain.gain.setValueAtTime(0, time);
      trebleGain.gain.linearRampToValueAtTime(0.3, time + 0.01);
      trebleGain.gain.exponentialRampToValueAtTime(0.001, time + beatDuration * 0.8);

      trebleOsc.connect(trebleGain);
      trebleGain.connect(this.masterGain);

      trebleOsc.start(time);
      trebleOsc.stop(time + beatDuration + 0.05);

      this.trebleOscillators.push(trebleOsc);
      this.trebleGains.push(trebleGain);
    }
  }

  update(now: number): void {
    if (!this.audioContext || !this.analyser || !this.dataArray || !this.isPlaying) return;

    this.analyser.getByteFrequencyData(this.dataArray as Uint8Array<ArrayBuffer>);

    const bassBinIndex = Math.round(100 * this.analyser.fftSize / this.audioContext.sampleRate);
    const bassEnergy = this.dataArray[Math.min(bassBinIndex, this.dataArray.length - 1)];

    const elapsed = now - this.beatStartTime;
    if (elapsed >= this.beatInterval * 0.9) {
      this.beatStartTime = now;
      this.beatCount++;

      const isHeavy = bassEnergy > this.heavyBeatThreshold &&
        (now - this.lastHeavyBeatTime) > this.heavyBeatCooldown;

      if (isHeavy) {
        this.lastHeavyBeatTime = now;
      }

      if (this.onBeatCallback) {
        this.onBeatCallback(isHeavy || this.beatCount % 4 === 1);
      }
    }
  }

  getBeatCount(): number {
    return this.beatCount;
  }

  getBeatInterval(): number {
    return this.beatInterval;
  }

  isHeavyBeatWindow(now: number): boolean {
    return (now - this.lastHeavyBeatTime) < this.beatInterval * 4;
  }

  isHeavyBeatMoment(now: number): boolean {
    return (now - this.lastHeavyBeatTime) < 150;
  }

  stop(): void {
    this.isPlaying = false;

    [...this.bassOscillators, ...this.trebleOscillators].forEach(osc => {
      try { osc.stop(); } catch (e) {}
    });
    this.bassOscillators = [];
    this.trebleOscillators = [];
    this.bassGains = [];
    this.trebleGains = [];

    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
  }
}
