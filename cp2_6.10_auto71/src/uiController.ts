import { AudioEngine, midiToNoteName, NOTE_NAMES, NOTE_NAMES_FLAT } from './audioEngine.js';

const START_MIDI = 60;
const END_MIDI = 84;

interface ChordPattern {
  name: string;
  intervals: number[];
}

const CHORD_PATTERNS: ChordPattern[] = [
  { name: 'maj7', intervals: [0, 4, 7, 11] },
  { name: '7', intervals: [0, 4, 7, 10] },
  { name: 'm7', intervals: [0, 3, 7, 10] },
  { name: 'm7b5', intervals: [0, 3, 6, 10] },
  { name: 'dim7', intervals: [0, 3, 6, 9] },
  { name: 'mMaj7', intervals: [0, 3, 7, 11] },
  { name: 'maj', intervals: [0, 4, 7] },
  { name: 'm', intervals: [0, 3, 7] },
  { name: 'aug', intervals: [0, 4, 8] },
  { name: 'dim', intervals: [0, 3, 6] },
  { name: 'sus2', intervals: [0, 2, 7] },
  { name: 'sus4', intervals: [0, 5, 7] }
];

export class UIController {
  private audioEngine: AudioEngine;
  private activeNotes: Set<number> = new Set();
  private noteListEl: HTMLElement | null = null;
  private chordNameEl: HTMLElement | null = null;
  private pianoRollEl: HTMLElement | null = null;
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private animationId: number | null = null;
  private lastFrameTime = 0;
  private frameInterval = 1000 / 30;
  private waveformHistory: Float32Array[] = [];
  private maxHistoryFrames = 15;
  private rollDotElements: Map<number, HTMLElement> = new Map();

  constructor(audioEngine: AudioEngine) {
    this.audioEngine = audioEngine;
  }

  init(): void {
    this.noteListEl = document.getElementById('noteList');
    this.chordNameEl = document.getElementById('chordName');
    this.pianoRollEl = document.getElementById('pianoRoll');
    this.canvas = document.getElementById('waveformCanvas') as HTMLCanvasElement;

    if (this.canvas) {
      this.ctx = this.canvas.getContext('2d');
      this.resizeCanvas();
      window.addEventListener('resize', () => this.resizeCanvas());
    }

    this.createPianoRoll();
    this.updateDisplay();
  }

  private resizeCanvas(): void {
    if (!this.canvas) return;
    const rect = this.canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = rect.width * dpr;
    this.canvas.height = 150 * dpr;
    if (this.ctx) {
      this.ctx.scale(dpr, dpr);
    }
  }

  private createPianoRoll(): void {
    if (!this.pianoRollEl) return;

    this.pianoRollEl.innerHTML = '';
    this.rollDotElements.clear();

    for (let midi = END_MIDI; midi >= START_MIDI; midi--) {
      const row = document.createElement('div');
      row.className = 'roll-row';

      const label = document.createElement('div');
      label.className = 'roll-label';
      label.textContent = midiToNoteName(midi, true);

      const line = document.createElement('div');
      const isBlack = this.isBlackKey(midi);
      line.className = `roll-line ${isBlack ? 'black' : 'white'}`;

      const dot = document.createElement('div');
      dot.className = 'roll-dot';
      line.appendChild(dot);
      this.rollDotElements.set(midi, dot);

      row.appendChild(label);
      row.appendChild(line);
      this.pianoRollEl.appendChild(row);
    }
  }

  private isBlackKey(midiNote: number): boolean {
    const whitePattern = [0, 2, 4, 5, 7, 9, 11];
    return !whitePattern.includes(midiNote % 12);
  }

  onNotePressed(midiNote: number): void {
    this.activeNotes.add(midiNote);
    this.updateRollDot(midiNote, true);
    this.updateDisplay();
  }

  onNoteReleased(midiNote: number): void {
    this.activeNotes.delete(midiNote);
    this.updateRollDot(midiNote, false);
    this.updateDisplay();
  }

  private updateRollDot(midiNote: number, active: boolean): void {
    const dot = this.rollDotElements.get(midiNote);
    if (!dot) return;
    if (active) {
      dot.classList.add('active');
    } else {
      dot.classList.remove('active');
    }
  }

  private updateDisplay(): void {
    this.updateNoteList();
    this.updateChordName();
  }

  private updateNoteList(): void {
    if (!this.noteListEl) return;

    if (this.activeNotes.size === 0) {
      this.noteListEl.textContent = '-';
      return;
    }

    const sorted = Array.from(this.activeNotes).sort((a, b) => a - b);
    const names = sorted.map(n => midiToNoteName(n, true));
    this.noteListEl.textContent = names.join(' ');
  }

  private updateChordName(): void {
    if (!this.chordNameEl) return;

    const notes = Array.from(this.activeNotes);
    if (notes.length < 3) {
      this.chordNameEl.textContent = '非和弦';
      return;
    }

    const chordName = this.identifyChord(notes);
    this.chordNameEl.textContent = chordName || '非和弦';
  }

  private identifyChord(notes: number[]): string | null {
    const pitches = Array.from(new Set(notes.map(n => n % 12))).sort((a, b) => a - b);

    if (pitches.length < 3 || pitches.length > 4) {
      return null;
    }

    for (let rootIdx = 0; rootIdx < pitches.length; rootIdx++) {
      const root = pitches[rootIdx];
      const intervals: number[] = [];

      for (let i = 0; i < pitches.length; i++) {
        const interval = ((pitches[i] - root) + 12) % 12;
        intervals.push(interval);
      }
      intervals.sort((a, b) => a - b);

      for (const pattern of CHORD_PATTERNS) {
        if (pattern.intervals.length !== intervals.length) continue;
        const matches = pattern.intervals.every((iv, idx) => intervals[idx] === iv);
        if (matches) {
          const rootName = this.getRootName(notes, root);
          return rootName + pattern.name;
        }
      }
    }

    return null;
  }

  private getRootName(allNotes: number[], rootPitch: number): string {
    const rootNotes = allNotes.filter(n => n % 12 === rootPitch).sort((a, b) => a - b);
    const lowestRoot = rootNotes.length > 0 ? rootNotes[0] : rootPitch + 60;
    const useFlats = [1, 3, 6, 8, 10].includes(rootPitch);
    return midiToNoteName(lowestRoot, useFlats).replace(/\d+$/, '');
  }

  startWaveformLoop(): void {
    this.animate();
  }

  stopWaveformLoop(): void {
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  private animate = (): void => {
    const now = performance.now();
    const elapsed = now - this.lastFrameTime;

    if (elapsed >= this.frameInterval) {
      this.lastFrameTime = now - (elapsed % this.frameInterval);
      this.collectWaveform();
      this.drawWaveform();
    }

    this.animationId = requestAnimationFrame(this.animate);
  };

  private collectWaveform(): void {
    const data = this.audioEngine.getWaveformData();
    if (data.length > 0) {
      this.waveformHistory.push(new Float32Array(data));
      if (this.waveformHistory.length > this.maxHistoryFrames) {
        this.waveformHistory.shift();
      }
    }
  }

  private drawWaveform(): void {
    if (!this.ctx || !this.canvas) return;

    const rect = this.canvas.getBoundingClientRect();
    const width = rect.width;
    const height = 150;
    const ctx = this.ctx;

    ctx.clearRect(0, 0, width, height);
    this.drawGrid(ctx, width, height);
    this.drawWaveformPath(ctx, width, height);
  }

  private drawGrid(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 1;

    const gridTimeMs = 100;
    const totalDurationMs = 500;
    const verticalLines = Math.floor(totalDurationMs / gridTimeMs);
    const xStep = width / verticalLines;

    for (let i = 0; i <= verticalLines; i++) {
      const x = i * xStep;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }

    const ampStep = 0.2;
    const halfHeight = height / 2;
    const ampPixels = halfHeight / 1;

    for (let i = -1; i <= 1; i += ampStep) {
      const y = halfHeight - i * ampPixels;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, halfHeight);
    ctx.lineTo(width, halfHeight);
    ctx.stroke();
  }

  private drawWaveformPath(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    if (this.waveformHistory.length === 0) return;

    const allSamples: number[] = [];
    for (const frame of this.waveformHistory) {
      for (let i = 0; i < frame.length; i++) {
        allSamples.push(frame[i]);
      }
    }

    if (allSamples.length < 2) return;

    const samplesPerPixel = allSamples.length / width;
    const halfHeight = height / 2;
    const ampPixels = halfHeight / 1.2;

    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    for (let x = 0; x < width - 1; x++) {
      const startIdx = Math.floor(x * samplesPerPixel);
      const endIdx = Math.floor((x + 1) * samplesPerPixel);

      let minVal = 1;
      let maxVal = -1;

      for (let i = startIdx; i < endIdx && i < allSamples.length; i++) {
        const v = allSamples[i];
        if (v < minVal) minVal = v;
        if (v > maxVal) maxVal = v;
      }

      const t = x / width;
      const gradient = this.getGradientColor(t);
      ctx.strokeStyle = gradient;

      const y1 = halfHeight - maxVal * ampPixels;
      const y2 = halfHeight - minVal * ampPixels;

      ctx.beginPath();
      ctx.moveTo(x, y1);
      ctx.lineTo(x, y2);
      ctx.stroke();
    }
  }

  private getGradientColor(t: number): string {
    const r1 = 74, g1 = 144, b1 = 217;
    const r2 = 147, g2 = 112, b2 = 219;

    const r = Math.round(r1 + (r2 - r1) * t);
    const g = Math.round(g1 + (g2 - g1) * t);
    const b = Math.round(b1 + (b2 - b1) * t);

    return `rgb(${r}, ${g}, ${b})`;
  }
}
