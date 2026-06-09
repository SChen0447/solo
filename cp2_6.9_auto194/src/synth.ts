export type InstrumentType = 'drum' | 'bass' | 'chord' | 'melody';

export const INSTRUMENT_COLORS: Record<InstrumentType, string> = {
  drum: '#E94560',
  bass: '#0F3460',
  chord: '#533483',
  melody: '#E6B333'
};

export const PITCH_NAMES: string[] = [];
(function buildPitchNames(): void {
  const names = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  for (let octave = 3; octave <= 5; octave++) {
    for (const n of names) {
      PITCH_NAMES.push(n + octave);
    }
  }
})();

export function pitchToFrequency(pitch: string): number {
  const match = pitch.match(/^([A-G]#?)(\d)$/);
  if (!match) return 440;
  const name = match[1];
  const octave = parseInt(match[2], 10);
  const semitoneMap: Record<string, number> = {
    C: 0, 'C#': 1, D: 2, 'D#': 3, E: 4, F: 5, 'F#': 6, G: 7, 'G#': 8, A: 9, 'A#': 10, B: 11
  };
  const semitones = semitoneMap[name] !== undefined ? semitoneMap[name] : 0;
  const midi = (octave + 1) * 12 + semitones;
  return 440 * Math.pow(2, (midi - 69) / 12);
}

class AudioSynth {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private noiseBuffer: AudioBuffer | null = null;

  init(): void {
    if (this.ctx) return;
    this.ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = 0.7;
    this.masterGain.connect(this.ctx.destination);
    const length = this.ctx.sampleRate * 1;
    this.noiseBuffer = this.ctx.createBuffer(1, length, this.ctx.sampleRate);
    const data = this.noiseBuffer.getChannelData(0);
    for (let i = 0; i < length; i++) {
      data[i] = Math.random() * 2 - 1;
    }
  }

  ensureContext(): void {
    if (!this.ctx) this.init();
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  get currentTime(): number {
    return this.ctx ? this.ctx.currentTime : 0;
  }

  playNote(
    instrument: InstrumentType,
    pitch: string,
    volume: number,
    duration: number,
    when: number,
    bpm: number
  ): void {
    this.ensureContext();
    if (!this.ctx || !this.masterGain) return;
    const freq = pitchToFrequency(pitch);
    const vol = Math.max(0, Math.min(1, volume / 100));
    const seconds = (duration * 60) / bpm;
    const t = Math.max(when, this.ctx.currentTime);

    switch (instrument) {
      case 'drum':
        this.playDrum(freq, vol, seconds, t);
        break;
      case 'bass':
        this.playBass(freq, vol, seconds, t);
        break;
      case 'chord':
        this.playChord(freq, vol, seconds, t);
        break;
      case 'melody':
        this.playMelody(freq, vol, seconds, t);
        break;
    }
  }

  private playDrum(freq: number, vol: number, dur: number, t: number): void {
    if (!this.ctx || !this.masterGain || !this.noiseBuffer) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq * 0.5, t);
    osc.frequency.exponentialRampToValueAtTime(freq * 0.25, t + 0.1);

    const drumDur = Math.min(dur, 0.3);
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(vol * 0.8, t + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.001, t + drumDur);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + drumDur + 0.05);

    const noise = this.ctx.createBufferSource();
    noise.buffer = this.noiseBuffer;
    const noiseGain = this.ctx.createGain();
    const noiseFilter = this.ctx.createBiquadFilter();
    noiseFilter.type = 'highpass';
    noiseFilter.frequency.value = 1000;
    noiseGain.gain.setValueAtTime(0, t);
    noiseGain.gain.linearRampToValueAtTime(vol * 0.3, t + 0.003);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);

    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(this.masterGain);
    noise.start(t);
    noise.stop(t + 0.15);
  }

  private playBass(freq: number, vol: number, dur: number, t: number): void {
    if (!this.ctx || !this.masterGain) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    osc.type = 'triangle';
    osc.frequency.value = freq;

    filter.type = 'lowpass';
    filter.frequency.value = freq * 3;
    filter.Q.value = 1;

    const attack = 0.01;
    const decay = 0.1;
    const sustain = 0.6;
    const release = 0.15;
    const totalDur = Math.max(dur, attack + decay + release);

    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(vol, t + attack);
    gain.gain.linearRampToValueAtTime(vol * sustain, t + attack + decay);
    gain.gain.setValueAtTime(vol * sustain, t + Math.max(dur - release, attack + decay));
    gain.gain.linearRampToValueAtTime(0, t + dur);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + totalDur + 0.05);
  }

  private playChord(freq: number, vol: number, dur: number, t: number): void {
    if (!this.ctx || !this.masterGain) return;

    const freqs = [freq, freq * 1.25, freq * 1.5];
    const masterChordGain = this.ctx.createGain();

    const attack = 0.03;
    const decay = 0.15;
    const sustain = 0.5;
    const release = 0.25;

    masterChordGain.gain.setValueAtTime(0, t);
    masterChordGain.gain.linearRampToValueAtTime(vol * 0.6, t + attack);
    masterChordGain.gain.linearRampToValueAtTime(vol * 0.6 * sustain, t + attack + decay);
    masterChordGain.gain.setValueAtTime(vol * 0.6 * sustain, t + Math.max(dur - release, attack + decay));
    masterChordGain.gain.linearRampToValueAtTime(0, t + dur);
    masterChordGain.connect(this.masterGain);

    for (const f of freqs) {
      const osc = this.ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.value = f;
      const g = this.ctx.createGain();
      g.gain.value = 0.35;
      osc.connect(g);
      g.connect(masterChordGain);
      osc.start(t);
      osc.stop(t + dur + 0.1);
    }
  }

  private playMelody(freq: number, vol: number, dur: number, t: number): void {
    if (!this.ctx || !this.masterGain) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const vibrato = this.ctx.createOscillator();
    const vibratoGain = this.ctx.createGain();

    osc.type = 'square';
    osc.frequency.value = freq;

    vibrato.type = 'sine';
    vibrato.frequency.value = 5;
    vibratoGain.gain.value = freq * 0.008;
    vibrato.connect(vibratoGain);
    vibratoGain.connect(osc.frequency);

    const attack = 0.01;
    const decay = 0.08;
    const sustain = 0.7;
    const release = 0.15;

    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(vol * 0.7, t + attack);
    gain.gain.linearRampToValueAtTime(vol * 0.7 * sustain, t + attack + decay);
    gain.gain.setValueAtTime(vol * 0.7 * sustain, t + Math.max(dur - release, attack + decay));
    gain.gain.linearRampToValueAtTime(0, t + dur);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(t);
    vibrato.start(t);
    osc.stop(t + dur + 0.1);
    vibrato.stop(t + dur + 0.1);
  }
}

export const synth = new AudioSynth();
