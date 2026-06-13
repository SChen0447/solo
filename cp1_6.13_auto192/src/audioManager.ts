import { BeatData } from './particle';

export type BeatPreset = '4/4' | '3/4' | 'electronic' | 'jazz' | 'hiphop';

export type AudioMode = 'none' | 'file' | 'preset';

interface PresetConfig {
  bpm: number;
  beatsPerMeasure: number;
  lowFreqPattern: number[];
}

const PRESET_CONFIGS: Record<BeatPreset, PresetConfig> = {
  '4/4': {
    bpm: 110,
    beatsPerMeasure: 4,
    lowFreqPattern: [1.0, 0.5, 0.7, 0.5]
  },
  '3/4': {
    bpm: 96,
    beatsPerMeasure: 3,
    lowFreqPattern: [1.0, 0.5, 0.5]
  },
  'electronic': {
    bpm: 128,
    beatsPerMeasure: 4,
    lowFreqPattern: [1.0, 0.3, 0.85, 0.3]
  },
  'jazz': {
    bpm: 132,
    beatsPerMeasure: 4,
    lowFreqPattern: [1.0, 0.4, 0.6, 0.75]
  },
  'hiphop': {
    bpm: 90,
    beatsPerMeasure: 4,
    lowFreqPattern: [1.0, 0.25, 0.55, 0.25]
  }
};

export class AudioManager {
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private gainNode: GainNode | null = null;
  private sourceNode: AudioBufferSourceNode | MediaElementAudioSourceNode | null = null;
  private audioElement: HTMLAudioElement | null = null;
  private frequencyData: Uint8Array | null = null;
  private timeData: Uint8Array | null = null;

  private mode: AudioMode = 'none';
  private activePreset: BeatPreset | null = null;
  private presetStartTime: number = 0;
  private presetLastBeatIndex: number = -1;
  private presetConfig: PresetConfig | null = null;

  private lastBeatDetectedAt: number = 0;
  private energyHistory: number[] = [];
  private readonly historySize: number = 43;
  private beatCallback: ((data: BeatData) => void) | null = null;
  private volume: number = 0.5;
  private rafId: number | null = null;
  private lastRafTime: number = 0;

  private _currentIntensity: number = 0;
  private _currentLowFreq: number = 0;
  private _lastPushBeatTime: number = 0;

  public get isPlaying(): boolean {
    return this.mode !== 'none';
  }

  public get currentMode(): AudioMode {
    return this.mode;
  }

  public get currentPreset(): BeatPreset | null {
    return this.activePreset;
  }

  public get currentIntensity(): number {
    return this._currentIntensity;
  }

  public get currentLowFreq(): number {
    return this._currentLowFreq;
  }

  public onBeat(callback: (data: BeatData) => void): void {
    this.beatCallback = callback;
  }

  public setVolume(vol: number): void {
    this.volume = Math.max(0, Math.min(1, vol / 100));
    if (this.gainNode) {
      this.gainNode.gain.value = this.volume;
    }
  }

  private ensureContext(): AudioContext {
    if (!this.audioContext) {
      const Ctx = (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext);
      this.audioContext = new Ctx();

      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 2048;
      this.analyser.smoothingTimeConstant = 0.75;

      this.gainNode = this.audioContext.createGain();
      this.gainNode.gain.value = this.volume;

      this.frequencyData = new Uint8Array(this.analyser.frequencyBinCount);
      this.timeData = new Uint8Array(this.analyser.frequencyBinCount);

      this.analyser.connect(this.gainNode);
      this.gainNode.connect(this.audioContext.destination);
    }
    return this.audioContext;
  }

  public async loadFile(file: File): Promise<void> {
    this.stop();

    const ctx = this.ensureContext();
    if (ctx.state === 'suspended') {
      await ctx.resume();
    }

    this.audioElement = new Audio();
    this.audioElement.src = URL.createObjectURL(file);
    this.audioElement.crossOrigin = 'anonymous';
    this.audioElement.loop = true;

    await new Promise<void>((resolve, reject) => {
      if (!this.audioElement) return reject(new Error('No audio element'));
      this.audioElement.oncanplay = () => resolve();
      this.audioElement.onerror = (e) => reject(e);
    });

    this.sourceNode = ctx.createMediaElementSource(this.audioElement);
    this.sourceNode.connect(this.analyser!);

    this.mode = 'file';
    this.audioElement.play().catch(() => { });

    this.startAnalysisLoop();
  }

  public startPresetBeat(preset: BeatPreset): void {
    this.stop();

    const ctx = this.ensureContext();
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => { });
    }

    this.activePreset = preset;
    this.presetConfig = PRESET_CONFIGS[preset];
    this.presetStartTime = performance.now();
    this.presetLastBeatIndex = -1;
    this.mode = 'preset';

    this.startAnalysisLoop();
  }

  public stop(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }

    if (this.audioElement) {
      this.audioElement.pause();
      this.audioElement.currentTime = 0;
      if (this.audioElement.src.startsWith('blob:')) {
        URL.revokeObjectURL(this.audioElement.src);
      }
      this.audioElement = null;
    }

    if (this.sourceNode) {
      try {
        this.sourceNode.disconnect();
      } catch { }
      this.sourceNode = null;
    }

    this.mode = 'none';
    this.activePreset = null;
    this.presetConfig = null;
    this._currentIntensity = 0;
    this._currentLowFreq = 0;
    this.energyHistory = [];
  }

  private startAnalysisLoop(): void {
    this.lastRafTime = performance.now();
    const loop = (now: number) => {
      if (this.mode === 'none') return;
      this.rafId = requestAnimationFrame(loop);

      if (this.mode === 'file' && this.analyser && this.frequencyData) {
        this.analyser.getByteFrequencyData(this.frequencyData);
        this.analyser.getByteTimeDomainData(this.timeData!);

        const lowEnd = Math.floor(this.frequencyData.length * 0.08);
        let lowSum = 0;
        for (let i = 0; i < lowEnd; i++) {
          lowSum += this.frequencyData[i];
        }
        const lowAvg = lowSum / lowEnd / 255;

        let totalSum = 0;
        const midEnd = Math.floor(this.frequencyData.length * 0.5);
        for (let i = 0; i < midEnd; i++) {
          totalSum += this.frequencyData[i];
        }
        const totalAvg = totalSum / midEnd / 255;

        this._currentLowFreq = lowAvg;
        this._currentIntensity = Math.max(lowAvg, totalAvg * 0.8);

        this.detectBeatFromEnergy(lowAvg, now);

      } else if (this.mode === 'preset' && this.presetConfig) {
        this.updatePresetBeat(now);
      }
    };
    this.rafId = requestAnimationFrame(loop);
  }

  private updatePresetBeat(now: number): void {
    if (!this.presetConfig) return;

    const elapsed = (now - this.presetStartTime) / 1000;
    const beatDuration = 60 / this.presetConfig.bpm;
    const beatIndex = Math.floor(elapsed / beatDuration);
    const beatInMeasure = beatIndex % this.presetConfig.beatsPerMeasure;
    const beatProgress = (elapsed % beatDuration) / beatDuration;

    const baseEnergy = this.presetConfig.lowFreqPattern[beatInMeasure];

    const attack = Math.max(0, Math.min(1, 1 - beatProgress / 0.15));
    const envelope = baseEnergy * (attack * 0.7 + (1 - beatProgress) * 0.3);

    this._currentLowFreq = envelope;
    this._currentIntensity = envelope * 0.9;

    if (beatIndex > this.presetLastBeatIndex && beatProgress < 0.5) {
      this.presetLastBeatIndex = beatIndex;

      const isKick = this.presetConfig.lowFreqPattern[beatInMeasure] >= 0.8;
      this.pushBeat({
        intensity: baseEnergy,
        isKick,
        lowFreqEnergy: baseEnergy,
        timestamp: now
      });
    }
  }

  private detectBeatFromEnergy(lowEnergy: number, now: number): void {
    this.energyHistory.push(lowEnergy);
    if (this.energyHistory.length > this.historySize) {
      this.energyHistory.shift();
    }

    if (this.energyHistory.length < this.historySize) return;

    const sum = this.energyHistory.reduce((a, b) => a + b, 0);
    const avg = sum / this.energyHistory.length;

    const variance = this.energyHistory.reduce((acc, v) => acc + (v - avg) * (v - avg), 0) / this.energyHistory.length;
    const std = Math.sqrt(variance);

    const threshold = avg + std * 1.35 + 0.05;
    const minInterval = 120;

    if (lowEnergy > threshold && (now - this.lastBeatDetectedAt) > minInterval && lowEnergy > 0.12) {
      this.lastBeatDetectedAt = now;

      const isKick = lowEnergy > avg + std * 1.8;
      this.pushBeat({
        intensity: Math.min(1, lowEnergy / (threshold + 0.1)),
        isKick,
        lowFreqEnergy: lowEnergy,
        timestamp: now
      });
    }
  }

  private pushBeat(data: BeatData): void {
    if (performance.now() - this._lastPushBeatTime < 80) return;
    this._lastPushBeatTime = performance.now();
    if (this.beatCallback) {
      this.beatCallback(data);
    }
  }

  public getLatestBeatSnapshot(): BeatData {
    const now = performance.now();
    const dt = now - this.lastBeatDetectedAt;
    const recentPulse = dt < 400 ? Math.max(0, 1 - dt / 400) : 0;

    return {
      intensity: Math.max(this._currentIntensity, recentPulse * 0.6),
      isKick: false,
      lowFreqEnergy: this._currentLowFreq,
      timestamp: now
    };
  }

  public dispose(): void {
    this.stop();
    if (this.audioContext) {
      this.audioContext.close().catch(() => { });
      this.audioContext = null;
    }
  }
}
