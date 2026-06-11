export type MaterialType = 'glass' | 'metal' | 'bamboo' | 'shell';

export interface MaterialConfig {
  baseFrequency: number;
  harmonicWeights: number[];
  attack: number;
  decay: number;
  release: number;
  filterType: BiquadFilterType;
  filterFreq: number;
  filterQ: number;
  color: string;
  glowColor: string;
}

export const MATERIAL_CONFIGS: Record<MaterialType, MaterialConfig> = {
  glass: {
    baseFrequency: 880,
    harmonicWeights: [1.0, 0.6, 0.3, 0.15],
    attack: 0.005,
    decay: 0.8,
    release: 2.5,
    filterType: 'highpass',
    filterFreq: 2000,
    filterQ: 1.2,
    color: '#88ddff',
    glowColor: '#aaeeff'
  },
  metal: {
    baseFrequency: 520,
    harmonicWeights: [1.0, 0.8, 0.5, 0.3, 0.15],
    attack: 0.008,
    decay: 1.5,
    release: 4.0,
    filterType: 'bandpass',
    filterFreq: 3500,
    filterQ: 0.8,
    color: '#c0c8d0',
    glowColor: '#e8f0ff'
  },
  bamboo: {
    baseFrequency: 330,
    harmonicWeights: [1.0, 0.4, 0.15],
    attack: 0.015,
    decay: 0.5,
    release: 1.8,
    filterType: 'lowpass',
    filterFreq: 1800,
    filterQ: 1.0,
    color: '#b88650',
    glowColor: '#d4a870'
  },
  shell: {
    baseFrequency: 660,
    harmonicWeights: [1.0, 0.5, 0.25, 0.1],
    attack: 0.01,
    decay: 1.0,
    release: 3.2,
    filterType: 'bandpass',
    filterFreq: 2800,
    filterQ: 1.5,
    color: '#f0e8dc',
    glowColor: '#fff5e8'
  }
};

export class AudioManager {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private convolver: ConvolverNode | null = null;
  private reverbGain: GainNode | null = null;
  private dryGain: GainNode | null = null;
  private reverbTime: number = 1.0;

  constructor() {}

  private ensureContext(): AudioContext {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 0.7;
      this.masterGain.connect(this.ctx.destination);

      this.dryGain = this.ctx.createGain();
      this.dryGain.gain.value = 0.6;
      this.dryGain.connect(this.masterGain);

      this.convolver = this.ctx.createConvolver();
      this.updateConvolverIR(this.reverbTime);
      this.convolver.connect(this.masterGain);

      this.reverbGain = this.ctx.createGain();
      this.reverbGain.gain.value = 0.4;
      this.reverbGain.connect(this.convolver);
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  private updateConvolverIR(time: number): void {
    if (!this.ctx || !this.convolver) return;
    const sampleRate = this.ctx.sampleRate;
    const length = Math.floor(sampleRate * Math.max(0.1, time));
    const ir = this.ctx.createBuffer(2, length, sampleRate);
    
    for (let ch = 0; ch < 2; ch++) {
      const channelData = ir.getChannelData(ch);
      for (let i = 0; i < length; i++) {
        const t = i / length;
        const envelope = Math.exp(-t * 3 / Math.max(0.1, time));
        channelData[i] = (Math.random() * 2 - 1) * envelope * 0.5;
      }
    }
    this.convolver.buffer = ir;
  }

  setReverbTime(time: number): void {
    this.reverbTime = time;
    if (this.ctx && this.convolver) {
      this.updateConvolverIR(time);
    }
  }

  playChime(material: MaterialType, length: number, velocity: number = 1.0): void {
    const ctx = this.ensureContext();
    const config = MATERIAL_CONFIGS[material];
    
    const lengthFactor = 1.0 + (2.0 - length) * 0.6;
    const baseFreq = config.baseFrequency * lengthFactor;

    const now = ctx.currentTime;
    const vel = Math.min(1.5, Math.max(0.2, velocity));
    const gainScale = 0.15 + vel * 0.25;

    const filter = ctx.createBiquadFilter();
    filter.type = config.filterType;
    filter.frequency.value = config.filterFreq;
    filter.Q.value = config.filterQ;
    filter.connect(this.dryGain!);
    filter.connect(this.reverbGain!);

    const harmonicGains: GainNode[] = [];
    const oscillators: OscillatorNode[] = [];

    config.harmonicWeights.forEach((weight, idx) => {
      const osc = ctx.createOscillator();
      const harmonic = idx + 1;
      const detune = (Math.random() - 0.5) * 8;
      osc.type = idx === 0 ? 'sine' : (idx < 2 ? 'triangle' : 'sine');
      osc.frequency.value = baseFreq * harmonic;
      osc.detune.value = detune;

      const g = ctx.createGain();
      const peakGain = weight * gainScale;
      
      g.gain.setValueAtTime(0, now);
      g.gain.linearRampToValueAtTime(peakGain, now + config.attack);
      g.gain.exponentialRampToValueAtTime(
        peakGain * 0.3,
        now + config.attack + config.decay * vel
      );
      g.gain.exponentialRampToValueAtTime(
        0.0001,
        now + config.attack + config.decay * vel + config.release
      );

      osc.connect(g);
      g.connect(filter);
      osc.start(now);
      osc.stop(now + config.attack + config.decay * vel + config.release + 0.1);

      harmonicGains.push(g);
      oscillators.push(osc);
    });
  }

  playResonance(material: MaterialType, length: number): void {
    const ctx = this.ensureContext();
    const config = MATERIAL_CONFIGS[material];
    const lengthFactor = 1.0 + (2.0 - length) * 0.6;
    const baseFreq = config.baseFrequency * lengthFactor;

    const now = ctx.currentTime;

    const filter = ctx.createBiquadFilter();
    filter.type = config.filterType;
    filter.frequency.value = config.filterFreq * 1.1;
    filter.Q.value = config.filterQ * 0.7;
    filter.connect(this.dryGain!);
    filter.connect(this.reverbGain!);

    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = baseFreq * 2;
    osc.detune.value = (Math.random() - 0.5) * 15;

    const g = ctx.createGain();
    const peakGain = 0.04;
    
    g.gain.setValueAtTime(0, now);
    g.gain.linearRampToValueAtTime(peakGain, now + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.4);

    osc.connect(g);
    g.connect(filter);
    osc.start(now);
    osc.stop(now + 0.5);
  }
}
