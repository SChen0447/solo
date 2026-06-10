export interface ActiveVoice {
  oscillator: OscillatorNode;
  gainNode: GainNode;
  analyser: AnalyserNode;
  midiNote: number;
  startTime: number;
}

export const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
export const NOTE_NAMES_FLAT = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];

export const A4_MIDI = 69;
export const A4_FREQ = 440;

export function midiToFrequency(midiNote: number): number {
  return A4_FREQ * Math.pow(2, (midiNote - A4_MIDI) / 12);
}

export function midiToNoteName(midiNote: number, useFlats = false): string {
  const noteIndex = ((midiNote % 12) + 12) % 12;
  const octave = Math.floor(midiNote / 12) - 1;
  const names = useFlats ? NOTE_NAMES_FLAT : NOTE_NAMES;
  return names[noteIndex] + octave;
}

export function noteNameToMidi(noteName: string): number {
  const match = noteName.match(/^([A-G])([#b]?)(-?\d+)$/);
  if (!match) return -1;
  const [, letter, accidental, octaveStr] = match;
  const octave = parseInt(octaveStr, 10);
  const noteMap: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  let semitone = noteMap[letter];
  if (accidental === '#') semitone += 1;
  if (accidental === 'b') semitone -= 1;
  return (octave + 1) * 12 + semitone;
}

export class AudioEngine {
  private audioContext: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private activeVoices: Map<number, ActiveVoice> = new Map();
  private voiceQueue: number[] = [];
  private maxPolyphony = 4;
  private masterAnalyser: AnalyserNode | null = null;
  private waveformBuffer: Float32Array;
  private sampleRate = 44100;
  private bufferDuration = 0.5;

  constructor() {
    this.waveformBuffer = new Float32Array(Math.floor(this.sampleRate * this.bufferDuration));
  }

  private ensureContext(): AudioContext {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.sampleRate = this.audioContext.sampleRate;
      this.waveformBuffer = new Float32Array(Math.floor(this.sampleRate * this.bufferDuration));

      this.masterGain = this.audioContext.createGain();
      this.masterGain.gain.value = 0.7;
      this.masterGain.connect(this.audioContext.destination);

      this.masterAnalyser = this.audioContext.createAnalyser();
      this.masterAnalyser.fftSize = 2048;
      this.masterGain.connect(this.masterAnalyser);
    }
    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }
    return this.audioContext;
  }

  playNote(midiNote: number): void {
    const ctx = this.ensureContext();
    if (!this.masterGain || !this.masterAnalyser) return;

    if (this.activeVoices.has(midiNote)) {
      this.stopNote(midiNote);
    }

    while (this.activeVoices.size >= this.maxPolyphony) {
      const oldestNote = this.voiceQueue.shift();
      if (oldestNote !== undefined) {
        this.stopNote(oldestNote);
      }
    }

    const frequency = midiToFrequency(midiNote);
    const now = ctx.currentTime;

    const oscillator = ctx.createOscillator();
    oscillator.type = 'sine';
    oscillator.frequency.value = frequency;

    const gainNode = ctx.createGain();
    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(0.5, now + 0.002);

    const analyser = ctx.createAnalyser();
    analyser.fftSize = 2048;

    oscillator.connect(gainNode);
    gainNode.connect(this.masterGain);

    oscillator.start(now);

    const voice: ActiveVoice = {
      oscillator,
      gainNode,
      analyser,
      midiNote,
      startTime: now
    };

    this.activeVoices.set(midiNote, voice);
    this.voiceQueue.push(midiNote);
  }

  stopNote(midiNote: number): void {
    const voice = this.activeVoices.get(midiNote);
    if (!voice || !this.audioContext) return;

    const now = this.audioContext.currentTime;
    const attackTime = 0.002;
    const releaseTime = 0.1;

    voice.gainNode.gain.cancelScheduledValues(now);
    const currentGain = voice.gainNode.gain.value;
    voice.gainNode.gain.setValueAtTime(currentGain, now);
    voice.gainNode.gain.linearRampToValueAtTime(0, now + releaseTime);

    const stopTime = now + releaseTime + 0.05;
    voice.oscillator.stop(stopTime);

    this.activeVoices.delete(midiNote);
    const idx = this.voiceQueue.indexOf(midiNote);
    if (idx !== -1) {
      this.voiceQueue.splice(idx, 1);
    }
  }

  stopAllNotes(): void {
    for (const midiNote of Array.from(this.activeVoices.keys())) {
      this.stopNote(midiNote);
    }
  }

  getActiveNotes(): number[] {
    return Array.from(this.activeVoices.keys());
  }

  getWaveformData(): Float32Array {
    if (!this.masterAnalyser) {
      return new Float32Array(0);
    }
    const bufferLength = this.masterAnalyser.fftSize;
    const dataArray = new Float32Array(bufferLength);
    this.masterAnalyser.getFloatTimeDomainData(dataArray);
    return dataArray;
  }

  getSampleRate(): number {
    return this.sampleRate;
  }
}
