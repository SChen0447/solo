export type ChordType = 'C' | 'D' | 'E' | 'F' | 'G' | 'A' | 'B';
export type LoopMode = 'forward' | 'reverse' | 'random';

export interface Chord {
  name: string;
  type: ChordType;
  notes: number[];
  color: string;
}

export interface TrackState {
  muted: boolean;
  solo: boolean;
}

export interface TrackStates {
  [row: number]: TrackState;
}

const MIDI_NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

function midiToFreq(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

export const CHORD_LIBRARY: Chord[] = [
  { name: 'Cmaj7', type: 'C', notes: [60, 64, 67, 71], color: '#ff6b35' },
  { name: 'Cmin7', type: 'C', notes: [60, 63, 67, 70], color: '#ff8c5a' },
  { name: 'C7',    type: 'C', notes: [60, 64, 67, 70], color: '#ffad7f' },
  { name: 'Dm7',   type: 'D', notes: [62, 65, 69, 72], color: '#4dabf7' },
  { name: 'Dmaj7', type: 'D', notes: [62, 66, 69, 73], color: '#74c0fc' },
  { name: 'D7',    type: 'D', notes: [62, 66, 69, 72], color: '#a5d8ff' },
  { name: 'Em7',   type: 'E', notes: [64, 67, 71, 74], color: '#51cf66' },
  { name: 'Emaj7', type: 'E', notes: [64, 68, 71, 75], color: '#69db7c' },
  { name: 'E7',    type: 'E', notes: [64, 68, 71, 74], color: '#8ce99a' },
  { name: 'Fmaj7', type: 'F', notes: [65, 69, 72, 76], color: '#da77f2' },
  { name: 'Fmin7', type: 'F', notes: [65, 68, 72, 75], color: '#e599f7' },
  { name: 'G7',    type: 'G', notes: [67, 71, 74, 77], color: '#ffd43b' },
  { name: 'Gmaj7', type: 'G', notes: [67, 71, 74, 78], color: '#ffe066' },
  { name: 'Am7',   type: 'A', notes: [69, 72, 76, 79], color: '#ff922b' },
  { name: 'Amaj7', type: 'A', notes: [69, 73, 76, 80], color: '#ffa94d' },
  { name: 'Bm7b5', type: 'B', notes: [71, 74, 77, 80], color: '#e64980' },
  { name: 'Bmaj7', type: 'B', notes: [71, 75, 78, 82], color: '#f06595' },
];

interface BeatCallback {
  (col: number): void;
}

export class AudioEngine {
  private audioContext: AudioContext | null = null;
  private bpm: number = 120;
  private loopMode: LoopMode = 'forward';
  private currentCol: number = 0;
  private isPlaying: boolean = false;
  private nextNoteTime: number = 0;
  private schedulerTimer: number | null = null;
  private beatCallbacks: BeatCallback[] = [];
  private trackStates: TrackStates = {};
  private scheduledCols: Set<number> = new Set();
  private blocksCache: Map<string, Chord> = new Map();
  private readonly MAX_CACHE = 32;
  private masterGain: GainNode | null = null;
  private lookahead: number = 25;
  private scheduleAheadTime: number = 0.1;

  constructor() {
    for (let i = 0; i < 4; i++) {
      this.trackStates[i] = { muted: false, solo: false };
    }
  }

  async init(): Promise<void> {
    if (this.audioContext) return;
    this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    this.masterGain = this.audioContext.createGain();
    this.masterGain.gain.value = 0.7;
    this.masterGain.connect(this.audioContext.destination);
  }

  getAudioContext(): AudioContext {
    if (!this.audioContext) throw new Error('AudioEngine not initialized');
    return this.audioContext;
  }

  setBPM(bpm: number): void {
    this.bpm = Math.max(60, Math.min(180, bpm));
  }

  getBPM(): number {
    return this.bpm;
  }

  setLoopMode(mode: LoopMode): void {
    this.loopMode = mode;
    this.scheduledCols.clear();
  }

  getLoopMode(): LoopMode {
    return this.loopMode;
  }

  setTrackState(row: number, state: Partial<TrackState>): void {
    if (this.trackStates[row]) {
      this.trackStates[row] = { ...this.trackStates[row], ...state };
    }
  }

  getTrackState(row: number): TrackState {
    return this.trackStates[row] || { muted: false, solo: false };
  }

  getAllTrackStates(): TrackStates {
    return { ...this.trackStates };
  }

  onBeat(callback: BeatCallback): void {
    this.beatCallbacks.push(callback);
  }

  getCurrentCol(): number {
    return this.currentCol;
  }

  start(): void {
    if (this.isPlaying) return;
    if (!this.audioContext) return;
    this.isPlaying = true;
    this.nextNoteTime = this.audioContext.currentTime + 0.05;
    this.scheduledCols.clear();
    this.scheduler();
  }

  stop(): void {
    this.isPlaying = false;
    if (this.schedulerTimer !== null) {
      window.clearTimeout(this.schedulerTimer);
      this.schedulerTimer = null;
    }
  }

  private getNextCol(current: number): number {
    switch (this.loopMode) {
      case 'reverse':
        return current <= 0 ? 7 : current - 1;
      case 'random': {
        let next = Math.floor(Math.random() * 8);
        while (next === current && Math.random() > 0.3) {
          next = Math.floor(Math.random() * 8);
        }
        return next;
      }
      case 'forward':
      default:
        return (current + 1) % 8;
    }
  }

  private hasAnySolo(): boolean {
    return Object.values(this.trackStates).some(s => s.solo);
  }

  private isTrackAudible(row: number): boolean {
    const state = this.trackStates[row];
    if (!state) return false;
    if (state.muted) return false;
    const hasSolo = this.hasAnySolo();
    if (hasSolo && !state.solo) return false;
    return true;
  }

  cacheBlock(id: string, chord: Chord): void {
    if (this.blocksCache.size >= this.MAX_CACHE) {
      const firstKey = this.blocksCache.keys().next().value;
      if (firstKey !== undefined) this.blocksCache.delete(firstKey);
    }
    this.blocksCache.set(id, chord);
  }

  removeCachedBlock(id: string): void {
    this.blocksCache.delete(id);
  }

  getCachedBlocks(): IterableIterator<[string, Chord]> {
    return this.blocksCache.entries();
  }

  playChord(chord: Chord, when: number, duration: number): void {
    if (!this.audioContext || !this.masterGain) return;

    const masterBus = this.audioContext.createGain();
    masterBus.gain.value = 0.8;
    masterBus.connect(this.masterGain);

    const filter = this.audioContext.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 4500;
    filter.Q.value = 0.8;
    filter.connect(masterBus);

    chord.notes.forEach((midi, idx) => {
      const freq = midiToFreq(midi);
      const detune = (Math.random() - 0.5) * 6;

      const osc1 = this.audioContext!.createOscillator();
      osc1.type = 'triangle';
      osc1.frequency.value = freq;
      osc1.detune.value = detune;

      const osc2 = this.audioContext!.createOscillator();
      osc2.type = 'sine';
      osc2.frequency.value = freq * 2;
      osc2.detune.value = detune + 3;

      const gainNode = this.audioContext!.createGain();
      const velocity = 0.18 - idx * 0.02;
      const now = when;

      gainNode.gain.setValueAtTime(0, now);
      gainNode.gain.linearRampToValueAtTime(velocity, now + 0.005);
      gainNode.gain.linearRampToValueAtTime(velocity * 0.6, now + 0.2);
      gainNode.gain.linearRampToValueAtTime(velocity * 0.5, now + duration * 0.7);
      gainNode.gain.linearRampToValueAtTime(0, now + duration);

      const oscGain = this.audioContext!.createGain();
      oscGain.gain.value = 0.7;
      osc1.connect(oscGain);
      oscGain.connect(gainNode);

      const osc2Gain = this.audioContext!.createGain();
      osc2Gain.gain.value = 0.25;
      osc2.connect(osc2Gain);
      osc2Gain.connect(gainNode);

      gainNode.connect(filter);

      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + duration + 0.05);
      osc2.stop(now + duration + 0.05);
    });
  }

  triggerBlockChordAtCol(
    getBlockAt: (row: number, col: number) => { id: string; chord: Chord } | null,
    col: number,
    when: number
  ): void {
    const beatDuration = 60 / this.bpm;
    for (let row = 0; row < 4; row++) {
      if (!this.isTrackAudible(row)) continue;
      const block = getBlockAt(row, col);
      if (block) {
        this.playChord(block.chord, when, beatDuration * 4);
      }
    }
  }

  private scheduler(): void {
    if (!this.isPlaying || !this.audioContext) return;

    while (this.nextNoteTime < this.audioContext.currentTime + this.scheduleAheadTime) {
      const colToSchedule = this.currentCol;
      if (!this.scheduledCols.has(colToSchedule)) {
        const currentTime = this.nextNoteTime;
        this.beatCallbacks.forEach(cb => cb(colToSchedule));
        this.scheduledCols.add(colToSchedule);
      }
      this.currentCol = this.getNextCol(this.currentCol);
      if (this.scheduledCols.size > 8) {
        const oldest = [...this.scheduledCols][0];
        this.scheduledCols.delete(oldest);
      }
      this.nextNoteTime += 60 / this.bpm;
    }

    this.schedulerTimer = window.setTimeout(() => this.scheduler(), this.lookahead);
  }

  previewChord(chord: Chord): void {
    if (!this.audioContext || !this.masterGain) return;
    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }
    this.playChord(chord, this.audioContext.currentTime + 0.01, 0.8);
  }
}
