export type TimbreType = 'piano' | 'guitar' | 'organ' | 'xylophone';

export interface Note {
  id: string;
  pitch: string;
  midiNote: number;
  time: number;
  duration: number;
  type: NoteType;
  x?: number;
  y?: number;
}

export type NoteType = 'whole' | 'half' | 'quarter' | 'eighth' | 'sixteenth';

const NOTE_FREQUENCIES: { [key: string]: number } = {
  'C4': 261.63, 'C#4': 277.18, 'D4': 293.66, 'D#4': 311.13,
  'E4': 329.63, 'F4': 349.23, 'F#4': 369.99, 'G4': 392.00,
  'G#4': 415.30, 'A4': 440.00, 'A#4': 466.16, 'B4': 493.88,
  'C5': 523.25, 'C#5': 554.37, 'D5': 587.33, 'D#5': 622.25,
  'E5': 659.25, 'F5': 698.46, 'F#5': 739.99, 'G5': 783.99,
  'G#5': 830.61, 'A5': 880.00, 'A#5': 932.33, 'B5': 987.77,
  'C6': 1046.50,
};

export const PITCH_RANGE = [
  'C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4',
  'C5', 'D5', 'E5', 'F5', 'G5', 'A5', 'B5',
  'C6'
];

export class SoundEngine {
  private audioContext: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private reverbNode: ConvolverNode | null = null;
  private reverbGain: GainNode | null = null;
  private dryGain: GainNode | null = null;
  private volume: number = 0.7;
  private reverbAmount: number = 0.3;
  private currentTimbre: TimbreType = 'piano';

  constructor() {
    this.initAudio();
  }

  private initAudio() {
    try {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.masterGain = this.audioContext.createGain();
      this.masterGain.gain.value = this.volume;

      this.reverbNode = this.audioContext.createConvolver();
      this.reverbGain = this.audioContext.createGain();
      this.reverbGain.gain.value = this.reverbAmount;

      this.dryGain = this.audioContext.createGain();
      this.dryGain.gain.value = 1 - this.reverbAmount * 0.5;

      this.generateReverbImpulse();

      this.masterGain.connect(this.dryGain);
      this.masterGain.connect(this.reverbNode);
      this.reverbNode.connect(this.reverbGain);

      this.dryGain.connect(this.audioContext.destination);
      this.reverbGain.connect(this.audioContext.destination);
    } catch (e) {
      console.error('Web Audio API not supported:', e);
    }
  }

  private generateReverbImpulse() {
    if (!this.audioContext || !this.reverbNode) return;

    const sampleRate = this.audioContext.sampleRate;
    const duration = 2.0;
    const length = sampleRate * duration;
    const impulse = this.audioContext.createBuffer(2, length, sampleRate);

    for (let channel = 0; channel < 2; channel++) {
      const channelData = impulse.getChannelData(channel);
      for (let i = 0; i < length; i++) {
        const decay = Math.pow(1 - i / length, 2);
        channelData[i] = (Math.random() * 2 - 1) * decay;
      }
    }

    this.reverbNode.buffer = impulse;
  }

  public resume() {
    if (this.audioContext && this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }
  }

  public setVolume(value: number) {
    this.volume = value;
    if (this.masterGain) {
      this.masterGain.gain.setTargetAtTime(value, this.audioContext!.currentTime, 0.01);
    }
  }

  public setReverb(value: number) {
    this.reverbAmount = value;
    if (this.reverbGain) {
      this.reverbGain.gain.setTargetAtTime(value, this.audioContext!.currentTime, 0.01);
    }
    if (this.dryGain) {
      this.dryGain.gain.setTargetAtTime(1 - value * 0.5, this.audioContext!.currentTime, 0.01);
    }
  }

  public setTimbre(timbre: TimbreType) {
    this.currentTimbre = timbre;
  }

  public playNote(pitch: string, duration: number = 0.5, startTime?: number) {
    if (!this.audioContext || !this.masterGain) return;

    const freq = NOTE_FREQUENCIES[pitch];
    if (!freq) return;

    const start = startTime !== undefined ? startTime : this.audioContext.currentTime;

    switch (this.currentTimbre) {
      case 'piano':
        this.playPiano(freq, duration, start);
        break;
      case 'guitar':
        this.playGuitar(freq, duration, start);
        break;
      case 'organ':
        this.playOrgan(freq, duration, start);
        break;
      case 'xylophone':
        this.playXylophone(freq, duration, start);
        break;
    }
  }

  private playPiano(freq: number, duration: number, startTime: number) {
    if (!this.audioContext || !this.masterGain) return;

    const osc1 = this.audioContext.createOscillator();
    const osc2 = this.audioContext.createOscillator();
    const osc3 = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();

    osc1.type = 'sine';
    osc1.frequency.value = freq;

    osc2.type = 'sine';
    osc2.frequency.value = freq * 2;

    osc3.type = 'sine';
    osc3.frequency.value = freq * 3;

    const gain1 = this.audioContext.createGain();
    const gain2 = this.audioContext.createGain();
    const gain3 = this.audioContext.createGain();

    gain1.gain.value = 0.6;
    gain2.gain.value = 0.25;
    gain3.gain.value = 0.1;

    osc1.connect(gain1);
    osc2.connect(gain2);
    osc3.connect(gain3);

    gain1.connect(gainNode);
    gain2.connect(gainNode);
    gain3.connect(gainNode);

    gainNode.connect(this.masterGain);

    const attackTime = 0.005;
    const decayTime = 0.1;
    const sustainLevel = 0.3;
    const releaseTime = duration * 0.6;

    gainNode.gain.setValueAtTime(0, startTime);
    gainNode.gain.linearRampToValueAtTime(0.8, startTime + attackTime);
    gainNode.gain.exponentialRampToValueAtTime(sustainLevel * 0.8, startTime + attackTime + decayTime);
    gainNode.gain.setValueAtTime(sustainLevel * 0.8, startTime + duration - releaseTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

    osc1.start(startTime);
    osc2.start(startTime);
    osc3.start(startTime);

    osc1.stop(startTime + duration);
    osc2.stop(startTime + duration);
    osc3.stop(startTime + duration);
  }

  private playGuitar(freq: number, duration: number, startTime: number) {
    if (!this.audioContext || !this.masterGain) return;

    const osc = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();
    const filter = this.audioContext.createBiquadFilter();

    osc.type = 'sawtooth';
    osc.frequency.value = freq;

    filter.type = 'lowpass';
    filter.frequency.value = freq * 3;
    filter.Q.value = 1;

    osc.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(this.masterGain);

    const attackTime = 0.002;
    const decayTime = 0.3;
    const sustainLevel = 0.1;
    const releaseTime = duration * 0.5;

    gainNode.gain.setValueAtTime(0, startTime);
    gainNode.gain.linearRampToValueAtTime(0.5, startTime + attackTime);
    gainNode.gain.exponentialRampToValueAtTime(sustainLevel * 0.5, startTime + attackTime + decayTime);
    gainNode.gain.setValueAtTime(sustainLevel * 0.5, startTime + duration - releaseTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

    osc.start(startTime);
    osc.stop(startTime + duration);
  }

  private playOrgan(freq: number, duration: number, startTime: number) {
    if (!this.audioContext || !this.masterGain) return;

    const osc1 = this.audioContext.createOscillator();
    const osc2 = this.audioContext.createOscillator();
    const osc3 = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();

    osc1.type = 'sine';
    osc1.frequency.value = freq;

    osc2.type = 'sine';
    osc2.frequency.value = freq * 2;

    osc3.type = 'sine';
    osc3.frequency.value = freq * 4;

    const gain1 = this.audioContext.createGain();
    const gain2 = this.audioContext.createGain();
    const gain3 = this.audioContext.createGain();

    gain1.gain.value = 0.5;
    gain2.gain.value = 0.3;
    gain3.gain.value = 0.2;

    osc1.connect(gain1);
    osc2.connect(gain2);
    osc3.connect(gain3);

    gain1.connect(gainNode);
    gain2.connect(gainNode);
    gain3.connect(gainNode);

    gainNode.connect(this.masterGain);

    const attackTime = 0.02;
    const releaseTime = 0.1;

    gainNode.gain.setValueAtTime(0, startTime);
    gainNode.gain.linearRampToValueAtTime(0.4, startTime + attackTime);
    gainNode.gain.setValueAtTime(0.4, startTime + duration - releaseTime);
    gainNode.gain.linearRampToValueAtTime(0, startTime + duration);

    osc1.start(startTime);
    osc2.start(startTime);
    osc3.start(startTime);

    osc1.stop(startTime + duration);
    osc2.stop(startTime + duration);
    osc3.stop(startTime + duration);
  }

  private playXylophone(freq: number, duration: number, startTime: number) {
    if (!this.audioContext || !this.masterGain) return;

    const osc1 = this.audioContext.createOscillator();
    const osc2 = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();

    osc1.type = 'sine';
    osc1.frequency.value = freq;

    osc2.type = 'sine';
    osc2.frequency.value = freq * 3;

    const gain1 = this.audioContext.createGain();
    const gain2 = this.audioContext.createGain();

    gain1.gain.value = 0.8;
    gain2.gain.value = 0.2;

    osc1.connect(gain1);
    osc2.connect(gain2);

    gain1.connect(gainNode);
    gain2.connect(gainNode);

    gainNode.connect(this.masterGain);

    const attackTime = 0.001;
    const decayTime = 0.15;
    const sustainLevel = 0.05;
    const releaseTime = 0.1;

    gainNode.gain.setValueAtTime(0, startTime);
    gainNode.gain.linearRampToValueAtTime(0.6, startTime + attackTime);
    gainNode.gain.exponentialRampToValueAtTime(sustainLevel * 0.6, startTime + attackTime + decayTime);
    gainNode.gain.setValueAtTime(sustainLevel * 0.6, startTime + duration - releaseTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

    osc1.start(startTime);
    osc2.start(startTime);

    osc1.stop(startTime + duration);
    osc2.stop(startTime + duration);
  }

  public getFrequency(pitch: string): number {
    return NOTE_FREQUENCIES[pitch] || 440;
  }

  public getNoteDuration(type: NoteType, bpm: number = 120): number {
    const beatDuration = 60 / bpm;
    switch (type) {
      case 'whole': return beatDuration * 4;
      case 'half': return beatDuration * 2;
      case 'quarter': return beatDuration;
      case 'eighth': return beatDuration * 0.5;
      case 'sixteenth': return beatDuration * 0.25;
      default: return beatDuration;
    }
  }

  public getMidiNote(pitch: string): number {
    const noteMap: { [key: string]: number } = {
      'C': 0, 'C#': 1, 'D': 2, 'D#': 3, 'E': 4, 'F': 5,
      'F#': 6, 'G': 7, 'G#': 8, 'A': 9, 'A#': 10, 'B': 11
    };
    const match = pitch.match(/^([A-G]#?)(\d)$/);
    if (!match) return 60;
    const note = match[1];
    const octave = parseInt(match[2]);
    return (octave + 1) * 12 + noteMap[note];
  }
}
