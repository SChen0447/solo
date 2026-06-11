export type OscillatorType = 'sine' | 'sawtooth' | 'square';

export type EffectType = 'rain' | 'wind' | 'insects' | 'heartbeat';

export interface EffectChannelState {
  volume: number;
  enabled: boolean;
  pitch: number;
}

export interface OscillatorState {
  type: OscillatorType;
  frequency: number;
  volume: number;
  enabled: boolean;
}

export interface AudioAnalysisData {
  frequencyData: Uint8Array;
  timeDomainData: Uint8Array;
}

class AudioEngine {
  private audioContext: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private analyser: AnalyserNode | null = null;

  private fileSource: AudioBufferSourceNode | null = null;
  private fileGain: GainNode | null = null;
  private audioBuffer: AudioBuffer | null = null;

  private oscillator: OscillatorNode | null = null;
  private oscillatorGain: GainNode | null = null;
  private oscillatorState: OscillatorState = {
    type: 'sine',
    frequency: 440,
    volume: 0,
    enabled: false,
  };

  private effectChannels: Map<EffectType, {
    gain: GainNode;
    source: AudioNode | null;
    state: EffectChannelState;
    filter?: BiquadFilterNode;
    lfo?: OscillatorNode;
    lfoGain?: GainNode;
  }> = new Map();

  private animationFrameId: number | null = null;
  private onAnalysisCallback: ((data: AudioAnalysisData) => void) | null = null;

  constructor() {
    this.initAudioContext();
  }

  private initAudioContext() {
    this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();

    this.masterGain = this.audioContext.createGain();
    this.masterGain.gain.value = 1;

    this.analyser = this.audioContext.createAnalyser();
    this.analyser.fftSize = 256;
    this.analyser.smoothingTimeConstant = 0.8;

    this.fileGain = this.audioContext.createGain();
    this.fileGain.gain.value = 1;
    this.fileGain.connect(this.masterGain);

    this.oscillatorGain = this.audioContext.createGain();
    this.oscillatorGain.gain.value = 0;
    this.oscillatorGain.connect(this.masterGain);

    this.initEffectChannels();

    this.masterGain.connect(this.analyser);
    this.analyser.connect(this.audioContext.destination);

    this.startAnalysisLoop();
  }

  private initEffectChannels() {
    if (!this.audioContext || !this.masterGain) return;

    const channelConfigs: EffectType[] = ['rain', 'wind', 'insects', 'heartbeat'];

    channelConfigs.forEach((type) => {
      const gain = this.audioContext!.createGain();
      gain.gain.value = 0;
      gain.connect(this.masterGain!);

      this.effectChannels.set(type, {
        gain,
        source: null,
        state: { volume: 50, enabled: false, pitch: 0 },
      });
    });
  }

  private createWhiteNoise(): AudioBuffer {
    const bufferSize = 2 * this.audioContext!.sampleRate;
    const buffer = this.audioContext!.createBuffer(1, bufferSize, this.audioContext!.sampleRate);
    const output = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }
    return buffer;
  }

  private startRainEffect(channel: any) {
    if (!this.audioContext) return;

    const noiseBuffer = this.createWhiteNoise();
    const source = this.audioContext.createBufferSource();
    source.buffer = noiseBuffer;
    source.loop = true;

    const bandpass = this.audioContext.createBiquadFilter();
    bandpass.type = 'bandpass';
    bandpass.frequency.value = 1000;
    bandpass.Q.value = 0.5;

    const highpass = this.audioContext.createBiquadFilter();
    highpass.type = 'highpass';
    highpass.frequency.value = 200;

    source.connect(bandpass);
    bandpass.connect(highpass);
    highpass.connect(channel.gain);

    source.start();
    channel.source = source;
    channel.filter = bandpass;
  }

  private stopRainEffect(channel: any) {
    if (channel.source) {
      (channel.source as AudioBufferSourceNode).stop();
      channel.source = null;
    }
  }

  private startWindEffect(channel: any) {
    if (!this.audioContext) return;

    const noiseBuffer = this.createWhiteNoise();
    const source = this.audioContext.createBufferSource();
    source.buffer = noiseBuffer;
    source.loop = true;

    const lowpass = this.audioContext.createBiquadFilter();
    lowpass.type = 'lowpass';
    lowpass.frequency.value = 400;

    const lfo = this.audioContext.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.value = 0.5;

    const lfoGain = this.audioContext.createGain();
    lfoGain.gain.value = 200;

    lfo.connect(lfoGain);
    lfoGain.connect(lowpass.frequency);

    source.connect(lowpass);
    lowpass.connect(channel.gain);

    source.start();
    lfo.start();

    channel.source = source;
    channel.filter = lowpass;
    channel.lfo = lfo;
    channel.lfoGain = lfoGain;
  }

  private stopWindEffect(channel: any) {
    if (channel.source) {
      (channel.source as AudioBufferSourceNode).stop();
      channel.source = null;
    }
    if (channel.lfo) {
      channel.lfo.stop();
      channel.lfo = null;
    }
  }

  private startInsectsEffect(channel: any) {
    if (!this.audioContext) return;

    const osc = this.audioContext.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.value = 3000;

    const tremolo = this.audioContext.createOscillator();
    tremolo.type = 'sine';
    tremolo.frequency.value = 20;

    const tremoloGain = this.audioContext.createGain();
    tremoloGain.gain.value = 0.5;

    const oscGain = this.audioContext.createGain();
    oscGain.gain.value = 0.5;

    tremolo.connect(tremoloGain);
    tremoloGain.connect(oscGain.gain);

    osc.connect(oscGain);
    oscGain.connect(channel.gain);

    osc.start();
    tremolo.start();

    channel.source = osc;
    channel.lfo = tremolo;
    channel.lfoGain = tremoloGain;
  }

  private stopInsectsEffect(channel: any) {
    if (channel.source) {
      (channel.source as OscillatorNode).stop();
      channel.source = null;
    }
    if (channel.lfo) {
      channel.lfo.stop();
      channel.lfo = null;
    }
  }

  private startHeartbeatEffect(channel: any) {
    if (!this.audioContext) return;

    const osc = this.audioContext.createOscillator();
    osc.type = 'square';
    osc.frequency.value = 60;

    const pulse = this.audioContext.createOscillator();
    pulse.type = 'sine';
    pulse.frequency.value = 1.2;

    const pulseGain = this.audioContext.createGain();
    pulseGain.gain.value = 0.8;

    const lowpass = this.audioContext.createBiquadFilter();
    lowpass.type = 'lowpass';
    lowpass.frequency.value = 120;

    pulse.connect(pulseGain);
    pulseGain.connect(osc.frequency);

    osc.connect(lowpass);
    lowpass.connect(channel.gain);

    osc.start();
    pulse.start();

    channel.source = osc;
    channel.lfo = pulse;
    channel.lfoGain = pulseGain;
  }

  private stopHeartbeatEffect(channel: any) {
    if (channel.source) {
      (channel.source as OscillatorNode).stop();
      channel.source = null;
    }
    if (channel.lfo) {
      channel.lfo.stop();
      channel.lfo = null;
    }
  }

  async loadAudioFile(file: File): Promise<void> {
    if (!this.audioContext) this.initAudioContext();
    if (this.audioContext!.state === 'suspended') {
      await this.audioContext!.resume();
    }

    const arrayBuffer = await file.arrayBuffer();
    this.audioBuffer = await this.audioContext!.decodeAudioData(arrayBuffer);

    this.playFile();
  }

  private playFile() {
    if (!this.audioContext || !this.audioBuffer || !this.fileGain) return;

    if (this.fileSource) {
      this.fileSource.stop();
      this.fileSource = null;
    }

    this.fileSource = this.audioContext.createBufferSource();
    this.fileSource.buffer = this.audioBuffer;
    this.fileSource.loop = true;
    this.fileSource.connect(this.fileGain);
    this.fileSource.start();
  }

  togglePlayPause() {
    if (!this.audioContext) return;

    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    } else if (this.audioContext.state === 'running') {
      this.audioContext.suspend();
    }
  }

  isAudioPlaying(): boolean {
    return this.audioContext?.state === 'running';
  }

  setFileVolume(volume: number) {
    if (this.fileGain) {
      this.fileGain.gain.value = volume / 100;
    }
  }

  setOscillator(type: OscillatorType, frequency: number, volume: number) {
    this.oscillatorState = { type, frequency, volume, enabled: this.oscillatorState.enabled };
    this.updateOscillator();
  }

  toggleOscillator(enabled: boolean) {
    this.oscillatorState.enabled = enabled;
    this.updateOscillator();
  }

  private updateOscillator() {
    if (!this.audioContext || !this.oscillatorGain) return;

    const { type, frequency, volume, enabled } = this.oscillatorState;

    if (enabled && volume > 0) {
      if (!this.oscillator) {
        this.oscillator = this.audioContext.createOscillator();
        this.oscillator.connect(this.oscillatorGain);
        this.oscillator.start();
      }
      this.oscillator.type = type;
      this.oscillator.frequency.value = frequency;
      this.oscillatorGain.gain.value = (volume / 100) * 0.3;
    } else {
      if (this.oscillator) {
        this.oscillator.stop();
        this.oscillator = null;
      }
    }
  }

  setEffectVolume(type: EffectType, volume: number) {
    const channel = this.effectChannels.get(type);
    if (channel) {
      channel.state.volume = volume;
      this.updateEffectChannel(type);
    }
  }

  toggleEffect(type: EffectType, enabled: boolean) {
    const channel = this.effectChannels.get(type);
    if (channel) {
      channel.state.enabled = enabled;
      this.updateEffectChannel(type);
    }
  }

  setEffectPitch(type: EffectType, pitch: number) {
    const channel = this.effectChannels.get(type);
    if (channel) {
      channel.state.pitch = pitch;
      this.applyPitchToEffect(type, pitch);
    }
  }

  private applyPitchToEffect(type: EffectType, pitch: number) {
    const channel = this.effectChannels.get(type);
    if (!channel || !channel.source) return;

    const pitchRatio = Math.pow(2, pitch / 12);

    if (type === 'rain' || type === 'wind') {
      if (channel.filter) {
        const baseFreq = type === 'rain' ? 1000 : 400;
        channel.filter.frequency.value = baseFreq * pitchRatio;
      }
    } else if (type === 'insects') {
      (channel.source as OscillatorNode).frequency.value = 3000 * pitchRatio;
      if (channel.lfo) {
        channel.lfo.frequency.value = 20 * pitchRatio;
      }
    } else if (type === 'heartbeat') {
      (channel.source as OscillatorNode).frequency.value = 60 * pitchRatio;
      if (channel.lfo) {
        channel.lfo.frequency.value = 1.2 * pitchRatio;
      }
    }
  }

  private updateEffectChannel(type: EffectType) {
    const channel = this.effectChannels.get(type);
    if (!channel) return;

    const { volume, enabled } = channel.state;
    const targetGain = enabled ? volume / 100 : 0;

    if (this.audioContext) {
      channel.gain.gain.setTargetAtTime(targetGain, this.audioContext.currentTime, 0.1);
    }

    if (enabled && volume > 0 && !channel.source) {
      switch (type) {
        case 'rain':
          this.startRainEffect(channel);
          break;
        case 'wind':
          this.startWindEffect(channel);
          break;
        case 'insects':
          this.startInsectsEffect(channel);
          break;
        case 'heartbeat':
          this.startHeartbeatEffect(channel);
          break;
      }
      this.applyPitchToEffect(type, channel.state.pitch);
    } else if ((!enabled || volume === 0) && channel.source) {
      switch (type) {
        case 'rain':
          this.stopRainEffect(channel);
          break;
        case 'wind':
          this.stopWindEffect(channel);
          break;
        case 'insects':
          this.stopInsectsEffect(channel);
          break;
        case 'heartbeat':
          this.stopHeartbeatEffect(channel);
          break;
      }
    }
  }

  getEffectState(type: EffectType): EffectChannelState {
    const channel = this.effectChannels.get(type);
    return channel ? { ...channel.state } : { volume: 50, enabled: false, pitch: 0 };
  }

  setAllEffects(presets: Partial<Record<EffectType, { volume: number; enabled: boolean; pitch: number }>>) {
    (Object.keys(presets) as EffectType[]).forEach((type) => {
      const preset = presets[type];
      if (preset) {
        const channel = this.effectChannels.get(type);
        if (channel) {
          channel.state = { ...preset };
          this.updateEffectChannel(type);
        }
      }
    });
  }

  resetAll() {
    this.setFileVolume(0);
    this.toggleOscillator(false);
    this.setOscillator('sine', 440, 0);

    (['rain', 'wind', 'insects', 'heartbeat'] as EffectType[]).forEach((type) => {
      this.setEffectVolume(type, 0);
      this.toggleEffect(type, false);
      this.setEffectPitch(type, 0);
    });

    if (this.audioContext) {
      this.audioContext.suspend();
    }
  }

  private startAnalysisLoop() {
    const analyze = () => {
      if (this.analyser && this.onAnalysisCallback) {
        const bufferLength = this.analyser.frequencyBinCount;
        const frequencyData = new Uint8Array(bufferLength);
        const timeDomainData = new Uint8Array(bufferLength);

        this.analyser.getByteFrequencyData(frequencyData);
        this.analyser.getByteTimeDomainData(timeDomainData);

        this.onAnalysisCallback({ frequencyData, timeDomainData });
      }
      this.animationFrameId = requestAnimationFrame(analyze);
    };
    analyze();
  }

  setOnAnalysisCallback(callback: (data: AudioAnalysisData) => void) {
    this.onAnalysisCallback = callback;
  }

  getAnalyser(): AnalyserNode | null {
    return this.analyser;
  }

  getAudioContext(): AudioContext | null {
    return this.audioContext;
  }

  destroy() {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
    if (this.audioContext) {
      this.audioContext.close();
    }
  }
}

export const audioEngine = new AudioEngine();
export default audioEngine;
