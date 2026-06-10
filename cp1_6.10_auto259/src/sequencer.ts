export type NoteName = 'C4' | 'D4' | 'E4' | 'F4' | 'G4' | 'A4' | 'B4';
export type Duration = 'quarter' | 'eighth' | 'dotted';
export type WaveformType = 'sine' | 'square' | 'sawtooth' | 'triangle';

export interface Note {
  name: NoteName;
  frequency: number;
  colorHue: number;
}

export interface TrackElement {
  id: string;
  beat: number;
  note: Note;
  duration: Duration;
}

export interface SequencerConfig {
  bpm: number;
  volume: number;
  waveform: WaveformType;
  elements: TrackElement[];
}

export interface BeatEvent {
  beat: number;
  elements: TrackElement[];
  timestamp: number;
}

export const NOTES: Record<NoteName, Note> = {
  C4: { name: 'C4', frequency: 261.63, colorHue: 0 },
  D4: { name: 'D4', frequency: 293.66, colorHue: 51 },
  E4: { name: 'E4', frequency: 329.63, colorHue: 102 },
  F4: { name: 'F4', frequency: 349.23, colorHue: 153 },
  G4: { name: 'G4', frequency: 392.0, colorHue: 204 },
  A4: { name: 'A4', frequency: 440.0, colorHue: 255 },
  B4: { name: 'B4', frequency: 493.88, colorHue: 306 },
};

export const NOTE_ORDER: NoteName[] = ['C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4'];

export const DURATION_LABELS: Record<Duration, string> = {
  quarter: '四分音符',
  eighth: '八分音符',
  dotted: '附点音符',
};

const DURATION_MULTIPLIER: Record<Duration, number> = {
  quarter: 1.0,
  eighth: 0.5,
  dotted: 1.5,
};

const TOTAL_BEATS = 16;

type EventCallback = (event: BeatEvent) => void;
type ChangeCallback = () => void;

export class Sequencer {
  private audioContext: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private elements: TrackElement[] = [];
  private bpm: number = 120;
  private volume: number = 0.7;
  private waveform: WaveformType = 'sine';
  private isPlaying: boolean = false;
  private currentBeat: number = 0;
  private startTime: number = 0;
  private nextNoteTime: number = 0;
  private scheduleTimer: number | null = null;
  private rafId: number | null = null;
  private beatListeners: EventCallback[] = [];
  private changeListeners: ChangeCallback[] = [];

  constructor() {}

  private ensureAudioContext(): void {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.masterGain = this.audioContext.createGain();
      this.masterGain.gain.value = this.volume;
      this.masterGain.connect(this.audioContext.destination);
    }
    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }
  }

  addElement(beat: number, note: Note, duration: Duration = 'quarter'): TrackElement {
    if (beat < 0 || beat >= TOTAL_BEATS) {
      throw new Error(`Beat must be between 0 and ${TOTAL_BEATS - 1}`);
    }
    const element: TrackElement = {
      id: `el_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      beat,
      note,
      duration,
    };
    this.elements.push(element);
    this.emitChange();
    return element;
  }

  removeElement(id: string): boolean {
    const idx = this.elements.findIndex((e) => e.id === id);
    if (idx === -1) return false;
    this.elements.splice(idx, 1);
    this.emitChange();
    return true;
  }

  getElements(): TrackElement[] {
    return [...this.elements];
  }

  getElementsByBeat(beat: number): TrackElement[] {
    return this.elements.filter((e) => e.beat === beat);
  }

  setBPM(bpm: number): void {
    this.bpm = Math.max(60, Math.min(180, bpm));
    this.emitChange();
  }

  getBPM(): number {
    return this.bpm;
  }

  setVolume(volume: number): void {
    this.volume = Math.max(0, Math.min(1, volume));
    if (this.masterGain) {
      this.masterGain.gain.value = this.volume;
    }
    this.emitChange();
  }

  getVolume(): number {
    return this.volume;
  }

  setWaveform(waveform: WaveformType): void {
    this.waveform = waveform;
    this.emitChange();
  }

  getWaveform(): WaveformType {
    return this.waveform;
  }

  getCurrentBeat(): number {
    return this.currentBeat;
  }

  getPlaybackProgress(): number {
    if (!this.isPlaying || !this.audioContext) {
      return this.currentBeat / TOTAL_BEATS;
    }
    const elapsed = this.audioContext.currentTime - this.startTime;
    const beatDuration = 60 / this.bpm;
    const totalDuration = TOTAL_BEATS * beatDuration;
    return (elapsed % totalDuration) / totalDuration;
  }

  isPlayingState(): boolean {
    return this.isPlaying;
  }

  onBeat(callback: EventCallback): () => void {
    this.beatListeners.push(callback);
    return () => {
      const idx = this.beatListeners.indexOf(callback);
      if (idx !== -1) this.beatListeners.splice(idx, 1);
    };
  }

  onChange(callback: ChangeCallback): () => void {
    this.changeListeners.push(callback);
    return () => {
      const idx = this.changeListeners.indexOf(callback);
      if (idx !== -1) this.changeListeners.splice(idx, 1);
    };
  }

  private emitBeat(beat: number, timestamp: number): void {
    const elements = this.getElementsByBeat(beat);
    if (elements.length === 0 && this.beatListeners.length === 0) return;
    const event: BeatEvent = { beat, elements, timestamp };
    for (const cb of this.beatListeners) {
      cb(event);
    }
  }

  private emitChange(): void {
    for (const cb of this.changeListeners) {
      cb();
    }
  }

  play(): void {
    if (this.isPlaying) return;
    this.ensureAudioContext();
    this.isPlaying = true;
    this.currentBeat = 0;
    this.startTime = this.audioContext!.currentTime + 0.05;
    this.nextNoteTime = this.startTime;
    this.scheduler();
    this.startAnimationLoop();
    this.emitChange();
  }

  stop(): void {
    this.isPlaying = false;
    if (this.scheduleTimer !== null) {
      clearTimeout(this.scheduleTimer);
      this.scheduleTimer = null;
    }
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    this.emitChange();
  }

  togglePlay(): void {
    if (this.isPlaying) {
      this.stop();
    } else {
      this.play();
    }
  }

  clear(): void {
    this.stop();
    this.elements = [];
    this.currentBeat = 0;
    this.emitChange();
  }

  private scheduler(): void {
    if (!this.isPlaying || !this.audioContext) return;
    const beatDuration = 60 / this.bpm;
    const scheduleAheadTime = 0.1;

    while (this.nextNoteTime < this.audioContext.currentTime + scheduleAheadTime) {
      const beat = this.currentBeat;
      const beatElements = this.getElementsByBeat(beat);
      for (const el of beatElements) {
        this.synthesizeNote(el, this.nextNoteTime);
      }
      this.emitBeat(beat, this.nextNoteTime);
      this.nextNoteTime += beatDuration;
      this.currentBeat = (this.currentBeat + 1) % TOTAL_BEATS;
    }

    this.scheduleTimer = window.setTimeout(() => this.scheduler(), 25);
  }

  private synthesizeNote(element: TrackElement, time: number): void {
    if (!this.audioContext || !this.masterGain) return;
    const beatDuration = 60 / this.bpm;
    const noteDuration = beatDuration * DURATION_MULTIPLIER[element.duration] * 0.9;

    const osc = this.audioContext.createOscillator();
    osc.type = this.waveform;
    osc.frequency.value = element.note.frequency;

    const noteGain = this.audioContext.createGain();
    noteGain.gain.setValueAtTime(0, time);
    noteGain.gain.linearRampToValueAtTime(0.8, time + 0.01);
    noteGain.gain.exponentialRampToValueAtTime(0.001, time + noteDuration);

    osc.connect(noteGain);
    noteGain.connect(this.masterGain);
    osc.start(time);
    osc.stop(time + noteDuration + 0.05);
  }

  private startAnimationLoop(): void {
    const loop = () => {
      if (!this.isPlaying) return;
      this.emitChange();
      this.rafId = requestAnimationFrame(loop);
    };
    this.rafId = requestAnimationFrame(loop);
  }

  serialize(): SequencerConfig {
    return {
      bpm: this.bpm,
      volume: this.volume,
      waveform: this.waveform,
      elements: this.elements.map((e) => ({ ...e })),
    };
  }

  deserialize(config: SequencerConfig): void {
    this.stop();
    this.bpm = config.bpm;
    this.volume = config.volume;
    this.waveform = config.waveform;
    if (this.masterGain) {
      this.masterGain.gain.value = this.volume;
    }
    this.elements = config.elements.map((e) => ({ ...e }));
    this.currentBeat = 0;
    this.emitChange();
  }

  downloadConfig(): void {
    const config = this.serialize();
    const json = JSON.stringify(config, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `particle-corridor-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}

export const TOTAL_BEATS_COUNT = TOTAL_BEATS;
