export type WaveformType = 'sine' | 'square' | 'sawtooth';

export interface ADSRParams {
  attack: number;
  decay: number;
  sustain: number;
  release: number;
}

export interface SynthParams {
  waveform: WaveformType;
  frequency: number;
  volume: number;
  adsr: ADSRParams;
}

export class AudioEngine {
  private audioContext: AudioContext | null = null;
  private oscillator: OscillatorNode | null = null;
  private gainNode: GainNode | null = null;
  private analyser: AnalyserNode | null = null;
  private isPlaying: boolean = false;
  private params: SynthParams;
  private noteStartTime: number = 0;
  private scheduledStop: number | null = null;

  constructor() {
    this.params = {
      waveform: 'sine',
      frequency: 440,
      volume: 0.5,
      adsr: {
        attack: 0.1,
        decay: 0.2,
        sustain: 0.7,
        release: 0.5
      }
    };
  }

  private ensureContext(): AudioContext {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    }
    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }
    return this.audioContext;
  }

  setWaveform(wave: WaveformType): void {
    this.params.waveform = wave;
    if (this.oscillator && this.isPlaying) {
      this.oscillator.type = wave;
    }
  }

  setFrequency(freq: number): void {
    this.params.frequency = freq;
    if (this.oscillator && this.isPlaying) {
      this.oscillator.frequency.setValueAtTime(freq, this.audioContext!.currentTime);
    }
  }

  setVolume(vol: number): void {
    this.params.volume = vol;
    if (this.gainNode && this.isPlaying) {
      const ctx = this.audioContext!;
      const now = ctx.currentTime;
      const sustainLevel = this.params.volume * this.params.adsr.sustain;
      this.gainNode.gain.cancelScheduledValues(now);
      this.gainNode.gain.setValueAtTime(this.gainNode.gain.value, now);
      this.gainNode.gain.linearRampToValueAtTime(sustainLevel, now + 0.02);
    }
  }

  setADSR(adsr: Partial<ADSRParams>): void {
    this.params.adsr = { ...this.params.adsr, ...adsr };
  }

  getParams(): SynthParams {
    return { ...this.params, adsr: { ...this.params.adsr } };
  }

  getAnalyser(): AnalyserNode | null {
    return this.analyser;
  }

  getIsPlaying(): boolean {
    return this.isPlaying;
  }

  getCurrentAmplitude(): number {
    if (!this.gainNode || !this.isPlaying) return 0;
    return this.gainNode.gain.value;
  }

  play(): void {
    if (this.isPlaying) return;

    const ctx = this.ensureContext();
    const now = ctx.currentTime;

    this.oscillator = ctx.createOscillator();
    this.oscillator.type = this.params.waveform;
    this.oscillator.frequency.setValueAtTime(this.params.frequency, now);

    this.gainNode = ctx.createGain();
    this.gainNode.gain.setValueAtTime(0, now);

    this.analyser = ctx.createAnalyser();
    this.analyser.fftSize = 2048;

    this.oscillator.connect(this.gainNode);
    this.gainNode.connect(this.analyser);
    this.analyser.connect(ctx.destination);

    const { attack, decay, sustain, release } = this.params.adsr;
    const peakLevel = this.params.volume;
    const sustainLevel = this.params.volume * sustain;

    this.gainNode.gain.cancelScheduledValues(now);
    this.gainNode.gain.setValueAtTime(0, now);
    this.gainNode.gain.linearRampToValueAtTime(peakLevel, now + attack);
    this.gainNode.gain.linearRampToValueAtTime(sustainLevel, now + attack + decay);

    this.noteStartTime = now;
    this.scheduledStop = null;
    this.isPlaying = true;
    this.oscillator.start(now);
  }

  stop(): void {
    if (!this.isPlaying || !this.audioContext || !this.gainNode || !this.oscillator) return;

    const ctx = this.audioContext;
    const now = ctx.currentTime;
    const release = this.params.adsr.release;
    const currentGain = this.gainNode.gain.value;

    this.gainNode.gain.cancelScheduledValues(now);
    this.gainNode.gain.setValueAtTime(currentGain, now);
    this.gainNode.gain.linearRampToValueAtTime(0, now + release);

    this.oscillator.stop(now + release + 0.05);

    const osc = this.oscillator;
    setTimeout(() => {
      try {
        osc.disconnect();
      } catch (e) {
        // ignore
      }
    }, (release + 0.1) * 1000);

    this.isPlaying = false;
    this.oscillator = null;
    this.scheduledStop = now + release;
  }

  generateStaticWaveform(samples: number = 1024): Float32Array {
    const buffer = new Float32Array(samples);
    const freq = this.params.frequency;
    const cycles = 3;

    for (let i = 0; i < samples; i++) {
      const t = (i / samples) * cycles;
      let sample = 0;

      switch (this.params.waveform) {
        case 'sine':
          sample = Math.sin(t * 2 * Math.PI);
          break;
        case 'square':
          sample = Math.sin(t * 2 * Math.PI) >= 0 ? 1 : -1;
          break;
        case 'sawtooth':
          sample = 2 * (t - Math.floor(t + 0.5));
          break;
      }

      buffer[i] = sample;
    }

    return buffer;
  }

  getWaveformData(): Uint8Array | null {
    if (!this.analyser) return null;
    const bufferLength = this.analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    this.analyser.getByteTimeDomainData(dataArray);
    return dataArray;
  }
}
