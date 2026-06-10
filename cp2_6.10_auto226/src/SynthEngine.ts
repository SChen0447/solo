export type WaveformType = 'sine' | 'square' | 'sawtooth' | 'triangle';

export interface SynthParams {
  oscillator: {
    waveform: WaveformType;
  };
  filter: {
    cutoff: number;
    resonance: number;
  };
  envelope: {
    attack: number;
    decay: number;
    sustain: number;
    release: number;
  };
  lfo: {
    rate: number;
    depth: number;
  };
}

export interface Preset {
  id: string;
  name: string;
  params: SynthParams;
}

const NOTE_FREQUENCY = 220;
const DEFAULT_SAMPLE_RATE = 44100;

export class SynthEngine {
  private audioContext: AudioContext | null = null;
  private params: SynthParams;

  constructor(initialParams: SynthParams) {
    this.params = initialParams;
  }

  private ensureContext(): AudioContext {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }
    return this.audioContext;
  }

  setParams(params: SynthParams): void {
    this.params = params;
  }

  playTestTone(durationMs: number = 500): void {
    const ctx = this.ensureContext();
    const now = ctx.currentTime;
    const durationSec = durationMs / 1000;

    const oscillator = ctx.createOscillator();
    oscillator.type = this.params.oscillator.waveform;
    oscillator.frequency.setValueAtTime(NOTE_FREQUENCY, now);

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(this.params.filter.cutoff, now);
    filter.Q.setValueAtTime(this.params.filter.resonance / 10, now);

    const lfo = ctx.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.setValueAtTime(this.params.lfo.rate, now);

    const lfoGain = ctx.createGain();
    lfoGain.gain.setValueAtTime(this.params.lfo.depth * 50, now);

    lfo.connect(lfoGain);
    lfoGain.connect(oscillator.frequency);

    const gainNode = ctx.createGain();
    const { attack, decay, sustain, release } = this.params.envelope;
    const attackSec = attack / 1000;
    const decaySec = decay / 1000;
    const releaseSec = release / 1000;
    const peakTime = now + attackSec;
    const sustainTime = peakTime + decaySec;
    const endTime = now + durationSec + releaseSec;

    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(0.5, peakTime);
    gainNode.gain.linearRampToValueAtTime(0.5 * sustain, sustainTime);
    gainNode.gain.setValueAtTime(0.5 * sustain, now + durationSec);
    gainNode.gain.linearRampToValueAtTime(0, endTime);

    oscillator.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.start(now);
    lfo.start(now);
    oscillator.stop(endTime + 0.05);
    lfo.stop(endTime + 0.05);
  }
}

export function calculateWaveform(
  params: SynthParams,
  durationMs: number = 500,
  sampleRate: number = DEFAULT_SAMPLE_RATE
): Float32Array {
  const durationSec = durationMs / 1000;
  const totalSamples = Math.floor(sampleRate * durationSec);
  const buffer = new Float32Array(totalSamples);

  const { attack, decay, sustain } = params.envelope;
  const attackSec = attack / 1000;
  const decaySec = decay / 1000;
  const attackSamples = Math.floor(attackSec * sampleRate);
  const decaySamples = Math.floor(decaySec * sampleRate);
  const sustainStart = attackSamples + decaySamples;

  const waveform = params.oscillator.waveform;
  const cutoff = params.filter.cutoff;
  const resonance = params.filter.resonance;
  const lfoRate = params.lfo.rate;
  const lfoDepth = params.lfo.depth;

  let prevSample = 0;
  let prevPrevSample = 0;
  const filterCoef = Math.min(1, cutoff / (sampleRate / 2));
  const feedbackCoef = resonance / 100;

  for (let i = 0; i < totalSamples; i++) {
    const t = i / sampleRate;
    const phase = 2 * Math.PI * NOTE_FREQUENCY * t;
    const lfoPhase = 2 * Math.PI * lfoRate * t;
    const lfoMod = Math.sin(lfoPhase) * lfoDepth * 50;
    const modulatedPhase = 2 * Math.PI * (NOTE_FREQUENCY + lfoMod) * t;

    let sample = 0;
    switch (waveform) {
      case 'sine':
        sample = Math.sin(modulatedPhase);
        break;
      case 'square':
        sample = Math.sin(modulatedPhase) >= 0 ? 1 : -1;
        break;
      case 'sawtooth': {
        const frac = t * (NOTE_FREQUENCY + lfoMod) - Math.floor(t * (NOTE_FREQUENCY + lfoMod));
        sample = 2 * frac - 1;
        break;
      }
      case 'triangle': {
        const frac = t * (NOTE_FREQUENCY + lfoMod) - Math.floor(t * (NOTE_FREQUENCY + lfoMod));
        sample = 4 * Math.abs(frac - 0.5) - 1;
        break;
      }
    }

    const filtered = sample * filterCoef + prevSample * (1 - filterCoef) + feedbackCoef * (prevSample - prevPrevSample);
    prevPrevSample = prevSample;
    prevSample = filtered;

    let envelope = 0;
    if (i < attackSamples) {
      envelope = i / attackSamples;
    } else if (i < sustainStart) {
      envelope = 1 - (1 - sustain) * ((i - attackSamples) / decaySamples);
    } else {
      envelope = sustain;
    }

    buffer[i] = filtered * envelope * 0.5;
  }

  return buffer;
}

export const defaultPresets: Preset[] = [
  {
    id: 'preset-warm-bass',
    name: 'Warm Bass',
    params: {
      oscillator: { waveform: 'sawtooth' },
      filter: { cutoff: 800, resonance: 40 },
      envelope: { attack: 10, decay: 200, sustain: 0.6, release: 300 },
      lfo: { rate: 0.5, depth: 0.1 },
    },
  },
  {
    id: 'preset-airy-pad',
    name: 'Airy Pad',
    params: {
      oscillator: { waveform: 'sine' },
      filter: { cutoff: 4000, resonance: 20 },
      envelope: { attack: 500, decay: 300, sustain: 0.8, release: 1000 },
      lfo: { rate: 3, depth: 0.3 },
    },
  },
  {
    id: 'preset-pulse-lead',
    name: 'Pulse Lead',
    params: {
      oscillator: { waveform: 'square' },
      filter: { cutoff: 2500, resonance: 60 },
      envelope: { attack: 5, decay: 100, sustain: 0.4, release: 200 },
      lfo: { rate: 6, depth: 0.2 },
    },
  },
];
