export type InstrumentType = 'piano' | 'guitar' | 'electone';

export interface Note {
  frequency: number;
  duration: number;
  name: string;
}

export interface FilterParams {
  lowPassFreq: number;
  highPassFreq: number;
  reverbSize: number;
}

interface ISynthesizer {
  playNote(note: Note, startTime: number): void;
  connect(destination: AudioNode): void;
  disconnect(): void;
}

export class PianoSynth implements ISynthesizer {
  private ctx: AudioContext;
  private output: GainNode;
  private instrumentFilter: BiquadFilterNode;

  constructor(ctx: AudioContext) {
    this.ctx = ctx;
    this.output = ctx.createGain();
    this.output.gain.value = 1;
    this.instrumentFilter = ctx.createBiquadFilter();
    this.instrumentFilter.type = 'lowpass';
    this.instrumentFilter.frequency.value = 2000;
    this.instrumentFilter.Q.value = 1;
    this.instrumentFilter.connect(this.output);
  }

  playNote(note: Note, startTime: number): void {
    const osc = this.ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.value = note.frequency;

    const gain = this.ctx.createGain();
    const attack = 0.005;
    const decay = note.duration * 0.7;
    const sustainLevel = 0.15;
    const release = 0.1;

    gain.gain.setValueAtTime(0, startTime);
    gain.gain.linearRampToValueAtTime(0.35, startTime + attack);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.001, sustainLevel * 0.35), startTime + attack + decay);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + note.duration + release);

    osc.connect(gain);
    gain.connect(this.instrumentFilter);
    osc.start(startTime);
    osc.stop(startTime + note.duration + release + 0.05);
  }

  connect(destination: AudioNode): void {
    this.output.connect(destination);
  }

  disconnect(): void {
    this.output.disconnect();
  }
}

export class GuitarSynth implements ISynthesizer {
  private ctx: AudioContext;
  private output: GainNode;

  constructor(ctx: AudioContext) {
    this.ctx = ctx;
    this.output = ctx.createGain();
    this.output.gain.value = 1;
  }

  playNote(note: Note, startTime: number): void {
    const osc = this.ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.value = note.frequency;

    const lfo = this.ctx.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.value = 5;

    const lfoGain = this.ctx.createGain();
    lfoGain.gain.value = note.frequency * 0.008;
    lfo.connect(lfoGain);
    lfoGain.connect(osc.frequency);

    const gain = this.ctx.createGain();
    const attack = 0.008;
    const decay = note.duration * 0.3;
    const sustainLevel = 0.6;
    const release = 0.35;

    gain.gain.setValueAtTime(0, startTime);
    gain.gain.linearRampToValueAtTime(0.3, startTime + attack);
    gain.gain.linearRampToValueAtTime(0.3 * sustainLevel, startTime + attack + decay);
    gain.gain.setValueAtTime(0.3 * sustainLevel, startTime + note.duration);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + note.duration + release);

    osc.connect(gain);
    gain.connect(this.output);
    osc.start(startTime);
    lfo.start(startTime);
    osc.stop(startTime + note.duration + release + 0.05);
    lfo.stop(startTime + note.duration + release + 0.05);
  }

  connect(destination: AudioNode): void {
    this.output.connect(destination);
  }

  disconnect(): void {
    this.output.disconnect();
  }
}

export class ElectoneSynth implements ISynthesizer {
  private ctx: AudioContext;
  private output: GainNode;
  private reverbNode: ConvolverNode;
  private reverbWet: GainNode;
  private reverbDry: GainNode;

  constructor(ctx: AudioContext, reverbSize: number = 0.5) {
    this.ctx = ctx;
    this.output = ctx.createGain();
    this.output.gain.value = 1;

    this.reverbNode = ctx.createConvolver();
    this.reverbNode.buffer = this.createImpulseResponse(reverbSize);

    this.reverbWet = ctx.createGain();
    this.reverbWet.gain.value = 0.35;
    this.reverbDry = ctx.createGain();
    this.reverbDry.gain.value = 0.8;

    this.reverbNode.connect(this.reverbWet);
    this.reverbWet.connect(this.output);
    this.reverbDry.connect(this.output);
  }

  private createImpulseResponse(duration: number): AudioBuffer {
    const rate = this.ctx.sampleRate;
    const length = Math.floor(rate * duration);
    const impulse = this.ctx.createBuffer(2, length, rate);
    for (let ch = 0; ch < 2; ch++) {
      const data = impulse.getChannelData(ch);
      for (let i = 0; i < length; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, 2.5);
      }
    }
    return impulse;
  }

  updateReverbSize(size: number): void {
    this.reverbNode.buffer = this.createImpulseResponse(Math.max(0.05, size * 1.2));
  }

  playNote(note: Note, startTime: number): void {
    const osc1 = this.ctx.createOscillator();
    osc1.type = 'square';
    osc1.frequency.value = note.frequency;

    const osc2 = this.ctx.createOscillator();
    osc2.type = 'square';
    osc2.frequency.value = note.frequency * 2;

    const subGain = this.ctx.createGain();
    subGain.gain.value = 0.35;
    osc2.connect(subGain);

    const gain = this.ctx.createGain();
    const attack = 0.003;
    const release = 0.08;

    gain.gain.setValueAtTime(0, startTime);
    gain.gain.linearRampToValueAtTime(0.25, startTime + attack);
    gain.gain.setValueAtTime(0.25, startTime + note.duration);
    gain.gain.linearRampToValueAtTime(0.0001, startTime + note.duration + release);

    osc1.connect(gain);
    subGain.connect(gain);
    gain.connect(this.reverbDry);
    gain.connect(this.reverbNode);

    osc1.start(startTime);
    osc2.start(startTime);
    osc1.stop(startTime + note.duration + release + 0.05);
    osc2.stop(startTime + note.duration + release + 0.05);
  }

  connect(destination: AudioNode): void {
    this.output.connect(destination);
  }

  disconnect(): void {
    this.output.disconnect();
  }
}

export class AudioEngine {
  public ctx: AudioContext;
  public analyser: AnalyserNode;

  public piano: PianoSynth;
  public guitar: GuitarSynth;
  public electone: ElectoneSynth;

  private highPassFilter: BiquadFilterNode;
  private lowPassFilter: BiquadFilterNode;
  private masterGain: GainNode;
  private currentSynth: ISynthesizer | null = null;

  constructor() {
    this.ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)({
      latencyHint: 'interactive'
    });

    this.analyser = this.ctx.createAnalyser();
    this.analyser.fftSize = 2048;
    this.analyser.smoothingTimeConstant = 0.7;

    this.highPassFilter = this.ctx.createBiquadFilter();
    this.highPassFilter.type = 'highpass';
    this.highPassFilter.frequency.value = 50;
    this.highPassFilter.Q.value = 0.7;

    this.lowPassFilter = this.ctx.createBiquadFilter();
    this.lowPassFilter.type = 'lowpass';
    this.lowPassFilter.frequency.value = 2000;
    this.lowPassFilter.Q.value = 0.7;

    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = 0.9;

    this.piano = new PianoSynth(this.ctx);
    this.guitar = new GuitarSynth(this.ctx);
    this.electone = new ElectoneSynth(this.ctx, 0.5);

    this.highPassFilter.connect(this.lowPassFilter);
    this.lowPassFilter.connect(this.analyser);
    this.analyser.connect(this.masterGain);
    this.masterGain.connect(this.ctx.destination);
  }

  async resume(): Promise<void> {
    if (this.ctx.state === 'suspended') {
      await this.ctx.resume();
    }
  }

  setActiveInstrument(type: InstrumentType): void {
    if (this.currentSynth) {
      this.currentSynth.disconnect();
    }
    switch (type) {
      case 'piano':
        this.currentSynth = this.piano;
        break;
      case 'guitar':
        this.currentSynth = this.guitar;
        break;
      case 'electone':
        this.currentSynth = this.electone;
        break;
    }
    this.currentSynth.connect(this.highPassFilter);
  }

  playNoteFor(type: InstrumentType, note: Note, startTime: number): void {
    switch (type) {
      case 'piano':
        this.piano.playNote(note, startTime);
        break;
      case 'guitar':
        this.guitar.playNote(note, startTime);
        break;
      case 'electone':
        this.electone.playNote(note, startTime);
        break;
    }
  }

  setFilterParams(params: Partial<FilterParams>): void {
    if (params.lowPassFreq !== undefined) {
      this.lowPassFilter.frequency.setTargetAtTime(params.lowPassFreq, this.ctx.currentTime, 0.01);
    }
    if (params.highPassFreq !== undefined) {
      this.highPassFilter.frequency.setTargetAtTime(params.highPassFreq, this.ctx.currentTime, 0.01);
    }
    if (params.reverbSize !== undefined) {
      this.electone.updateReverbSize(params.reverbSize);
    }
  }

  getFrequencyData(): Uint8Array {
    const data = new Uint8Array(256);
    this.analyser.getByteFrequencyData(data);
    return data;
  }

  getFloatFrequencyData(): Float32Array {
    const data = new Float32Array(256);
    this.analyser.getFloatFrequencyData(data);
    return data;
  }

  getCurrentTime(): number {
    return this.ctx.currentTime;
  }

  playSample(type: InstrumentType, freq: number, startTime: number, duration: number): void {
    const note: Note = { frequency: freq, duration, name: 'sample' };
    this.setActiveInstrument(type);
    this.playNoteFor(type, note, startTime);
  }
}

export function generateCMajorScale(): Note[] {
  const freqs = [261.63, 293.66, 329.63, 349.23, 392.00, 440.00, 493.88, 523.25];
  const names = ['C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4', 'C5'];
  const notes: Note[] = [];
  for (let i = 0; i < 8; i++) {
    notes.push({ frequency: freqs[i], duration: 0.35, name: names[i] });
  }
  for (let i = 6; i >= 0; i--) {
    notes.push({ frequency: freqs[i], duration: 0.35, name: names[i] });
  }
  return notes;
}
