import { Particle } from './particle';

export interface NoteStreamItem {
  id: number;
  noteIndex: number;
  noteName: string;
  velocity: number;
  x: number;
  y: number;
  alpha: number;
  fadeStart: number;
  color: string;
  startTime: number;
}

export interface KeyState {
  noteIndex: number;
  isPressed: boolean;
  pressTime: number;
  releaseTime: number;
}

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const NOTE_COLORS: Record<string, string> = {
  'C': '#FF4444',
  'D': '#FF8C00',
  'E': '#FFD700',
  'F': '#44FF44',
  'G': '#44DDFF',
  'A': '#4466FF',
  'B': '#AA44FF'
};

const TOTAL_KEYS = 88;
const FIRST_NOTE_INDEX = 9;

export function getNoteName(noteIndex: number): string {
  const note = NOTE_NAMES[noteIndex % 12];
  const octave = Math.floor(noteIndex / 12) - 1;
  return note + octave;
}

export function getNoteColor(noteIndex: number): string {
  const noteName = NOTE_NAMES[noteIndex % 12];
  const baseName = noteName.replace('#', '');
  return NOTE_COLORS[baseName] || '#FFFFFF';
}

export function isBlackKey(noteIndex: number): boolean {
  const n = noteIndex % 12;
  return n === 1 || n === 3 || n === 6 || n === 8 || n === 10;
}

export class Renderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private width: number = 0;
  private height: number = 0;
  private scrollOffset: number = 0;
  private keyStates: Map<number, KeyState> = new Map();
  private noteStreams: NoteStreamItem[] = [];
  private streamIdCounter: number = 0;
  private lastNoteTime: number = 0;
  private currentTime: number = 0;

  private readonly whiteKeyHeight: number = 160;
  private readonly blackKeyHeight: number = 100;
  private readonly keyboardBottomMargin: number = 30;
  private readonly controlHeight: number = 60;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.resize();
  }

  public resize(): void {
    const dpr = window.devicePixelRatio || 1;
    this.width = this.canvas.clientWidth;
    this.height = this.canvas.clientHeight;
    this.canvas.width = this.width * dpr;
    this.canvas.height = this.height * dpr;
    this.ctx.scale(dpr, dpr);
  }

  public setScrollOffset(offset: number): void {
    this.scrollOffset = offset;
  }

  public setKeyPressed(noteIndex: number, pressed: boolean): void {
    if (pressed) {
      this.keyStates.set(noteIndex, {
        noteIndex,
        isPressed: true,
        pressTime: this.currentTime,
        releaseTime: 0
      });
    } else {
      const state = this.keyStates.get(noteIndex);
      if (state) {
        state.isPressed = false;
        state.releaseTime = this.currentTime;
      }
    }
  }

  public addNoteStream(noteIndex: number, velocity: number): void {
    const color = getNoteColor(noteIndex);
    const streamY = this.getNoteStreamY(noteIndex);

    const item: NoteStreamItem = {
      id: this.streamIdCounter++,
      noteIndex,
      noteName: getNoteName(noteIndex),
      velocity,
      x: this.width,
      y: streamY,
      alpha: 1,
      fadeStart: 0.5,
      color,
      startTime: this.currentTime
    };

    this.noteStreams.push(item);
    this.lastNoteTime = this.currentTime;
  }

  private getNoteStreamY(noteIndex: number): number {
    const streamAreaHeight = this.height * 0.6;
    const minNote = FIRST_NOTE_INDEX;
    const maxNote = FIRST_NOTE_INDEX + TOTAL_KEYS - 1;
    const range = maxNote - minNote;
    const normalized = (noteIndex - minNote) / range;
    const padding = 40;
    return padding + normalized * (streamAreaHeight - padding * 2 - 40);
  }

  private getWhiteKeyWidth(): number {
    const isCompact = this.width < 600;
    const baseWidth = isCompact ? 18 : 26;
    return baseWidth;
  }

  private getKeyScale(noteIndex: number): number {
    const minNote = FIRST_NOTE_INDEX;
    const maxNote = FIRST_NOTE_INDEX + TOTAL_KEYS - 1;
    const range = maxNote - minNote;
    const t = (noteIndex - minNote) / range;
    return 1 - t * 0.25;
  }

  private getWhiteKeys(): { noteIndex: number; x: number; width: number }[] {
    const keys: { noteIndex: number; x: number; width: number }[] = [];
    const baseWidth = this.getWhiteKeyWidth();
    let x = 0;

    for (let i = 0; i < TOTAL_KEYS; i++) {
      const noteIndex = FIRST_NOTE_INDEX + i;
      if (!isBlackKey(noteIndex)) {
        const scale = this.getKeyScale(noteIndex);
        const width = baseWidth * scale;
        keys.push({ noteIndex, x, width });
        x += width;
      }
    }

    return keys;
  }

  private getBlackKeyPosition(
    noteIndex: number,
    whiteKeys: { noteIndex: number; x: number; width: number }[]
  ): { x: number; width: number } | null {
    const prevWhiteIdx = whiteKeys.findIndex(k => k.noteIndex === noteIndex - 1);
    if (prevWhiteIdx === -1 || prevWhiteIdx >= whiteKeys.length - 1) return null;

    const prev = whiteKeys[prevWhiteIdx];
    const next = whiteKeys[prevWhiteIdx + 1];
    const bw = (prev.width + next.width) * 0.3;
    const bx = prev.x + prev.width - bw / 2;

    return { x: bx, width: bw };
  }

  public getNoteAtPosition(px: number, py: number): number | null {
    const keyboardTop = this.height - this.whiteKeyHeight - this.keyboardBottomMargin - this.controlHeight;
    const keyboardBottom = this.height - this.keyboardBottomMargin - this.controlHeight;

    if (py < keyboardTop || py > keyboardBottom) return null;

    const whiteKeys = this.getWhiteKeys();
    const offsetX = px + this.scrollOffset;

    for (let i = whiteKeys.length - 1; i >= 0; i--) {
      const wk = whiteKeys[i];
      if (offsetX >= wk.x && offsetX <= wk.x + wk.width) {
        const nextNote = wk.noteIndex + 1;
        if (isBlackKey(nextNote)) {
          const bp = this.getBlackKeyPosition(nextNote, whiteKeys);
          if (bp && py < keyboardTop + this.blackKeyHeight) {
            if (offsetX >= bp.x && offsetX <= bp.x + bp.width) {
              return nextNote;
            }
          }
        }
        const prevNote = wk.noteIndex - 1;
        if (isBlackKey(prevNote)) {
          const bp = this.getBlackKeyPosition(prevNote, whiteKeys);
          if (bp && py < keyboardTop + this.blackKeyHeight) {
            if (offsetX >= bp.x && offsetX <= bp.x + bp.width) {
              return prevNote;
            }
          }
        }
        return wk.noteIndex;
      }
    }

    return null;
  }

  private drawBackground(): void {
    this.ctx.fillStyle = '#0F0F23';
    this.ctx.fillRect(0, 0, this.width, this.height);
  }

  private drawDivider(): void {
    const keyboardTop = this.height - this.whiteKeyHeight - this.keyboardBottomMargin - this.controlHeight;
    const y = keyboardTop - 2;

    const gradient = this.ctx.createLinearGradient(0, y, this.width, y);
    gradient.addColorStop(0, '#6C63FF');
    gradient.addColorStop(1, '#00D2FF');

    this.ctx.strokeStyle = gradient;
    this.ctx.lineWidth = 2;
    this.ctx.shadowColor = '#6C63FF';
    this.ctx.shadowBlur = 10;
    this.ctx.beginPath();
    this.ctx.moveTo(0, y);
    this.ctx.lineTo(this.width, y);
    this.ctx.stroke();
    this.ctx.shadowBlur = 0;
  }

  private drawKeyboard(): void {
    const keyboardTop = this.height - this.whiteKeyHeight - this.keyboardBottomMargin - this.controlHeight;
    const whiteKeys = this.getWhiteKeys();

    this.ctx.save();
    this.ctx.translate(-this.scrollOffset, 0);
    this.ctx.beginPath();
    this.ctx.rect(this.scrollOffset - 10, 0, this.width + 20, this.height);
    this.ctx.clip();

    for (const wk of whiteKeys) {
      this.drawWhiteKey(wk.x, keyboardTop, wk.width, this.whiteKeyHeight, wk.noteIndex);
    }

    for (let i = 0; i < TOTAL_KEYS; i++) {
      const noteIndex = FIRST_NOTE_INDEX + i;
      if (isBlackKey(noteIndex)) {
        const bp = this.getBlackKeyPosition(noteIndex, whiteKeys);
        if (bp) {
          this.drawBlackKey(bp.x, keyboardTop, bp.width, this.blackKeyHeight, noteIndex);
        }
      }
    }

    this.ctx.restore();
  }

  private getKeyPressOffset(noteIndex: number): number {
    const state = this.keyStates.get(noteIndex);
    if (!state) return 0;

    const animDuration = 100;
    if (state.isPressed) {
      const elapsed = this.currentTime - state.pressTime;
      const t = Math.min(1, elapsed / animDuration);
      return 5 * t;
    } else {
      const elapsed = this.currentTime - state.releaseTime;
      const t = Math.min(1, elapsed / animDuration);
      const eased = 1 - Math.pow(1 - t, 3);
      return 5 * (1 - eased);
    }
  }

  private drawWhiteKey(
    x: number,
    y: number,
    width: number,
    height: number,
    noteIndex: number
  ): void {
    const offset = this.getKeyPressOffset(noteIndex);
    const ky = y + offset;
    const kh = height - offset;

    const gradient = this.ctx.createLinearGradient(x, ky, x, ky + kh);
    gradient.addColorStop(0, '#F5F5F5');
    gradient.addColorStop(1, '#E8E8E8');

    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(x, ky, width - 1, kh);

    this.ctx.fillStyle = 'rgba(0,0,0,0.1)';
    this.ctx.fillRect(x + width - 3, ky, 2, kh);

    this.ctx.fillStyle = 'rgba(0,0,0,0.05)';
    this.ctx.fillRect(x, ky + kh - 3, width - 1, 3);

    if (offset > 0) {
      this.ctx.fillStyle = getNoteColor(noteIndex) + '40';
      this.ctx.fillRect(x, ky, width - 1, kh);
    }
  }

  private drawBlackKey(
    x: number,
    y: number,
    width: number,
    height: number,
    noteIndex: number
  ): void {
    const offset = this.getKeyPressOffset(noteIndex);
    const ky = y + offset;
    const kh = height - offset;

    this.ctx.fillStyle = '#1A1A1A';
    this.ctx.fillRect(x, ky, width, kh);

    this.ctx.fillStyle = '#333333';
    this.ctx.fillRect(x + 2, ky + 2, width - 4, 4);

    this.ctx.fillStyle = 'rgba(0,0,0,0.3)';
    this.ctx.fillRect(x + width - 3, ky, 3, kh);

    if (offset > 0) {
      this.ctx.fillStyle = getNoteColor(noteIndex) + '60';
      this.ctx.fillRect(x, ky, width, kh);
    }
  }

  private drawNoteStreams(): void {
    const streamAreaHeight = this.height * 0.6;

    if (this.noteStreams.length === 0) {
      const timeSinceLast = this.currentTime - this.lastNoteTime;
      if (timeSinceLast > 1000 || this.lastNoteTime === 0) {
        this.drawWaitingText();
      }
      return;
    }

    for (let i = this.noteStreams.length - 1; i >= 0; i--) {
      const item = this.noteStreams[i];
      const elapsed = (this.currentTime - item.startTime) / 1000;
      item.x = this.width - elapsed * 50;

      if (elapsed > item.fadeStart) {
        item.alpha = Math.max(0, item.alpha - 0.02);
      }

      if (item.x + 200 < 0 || item.alpha <= 0) {
        this.noteStreams.splice(i, 1);
        continue;
      }

      this.drawNoteStreamItem(item);
    }
  }

  private drawWaitingText(): void {
    const streamAreaHeight = this.height * 0.6;
    const cx = this.width / 2;
    const cy = streamAreaHeight / 2;

    const pulse = 0.5 + 0.5 * Math.sin(this.currentTime / 750);
    const alpha = 0.15 + pulse * 0.15;

    this.ctx.font = '24px -apple-system, BlinkMacSystemFont, sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
    this.ctx.fillText('等待演奏', cx, cy);
  }

  private drawNoteStreamItem(item: NoteStreamItem): void {
    const x = item.x;
    const y = item.y;
    const w = 200;
    const h = 40;
    const r = 8;

    this.ctx.save();
    this.ctx.globalAlpha = item.alpha;

    this.ctx.fillStyle = item.color + '26';
    this.ctx.strokeStyle = item.color + '80';
    this.ctx.lineWidth = 1;

    this.roundRect(x, y, w, h, r);
    this.ctx.fill();
    this.ctx.stroke();

    this.ctx.fillStyle = '#FFFFFF';
    this.ctx.font = '14px -apple-system, BlinkMacSystemFont, sans-serif';
    this.ctx.textAlign = 'left';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText(item.noteName, x + 12, y + h / 2);

    const barX = x + 60;
    const barY = y + 12;
    const barW = 120;
    const barH = 16;
    const fillW = (item.velocity / 100) * barW;

    this.ctx.fillStyle = '#FFFFFF20';
    this.roundRect(barX, barY, barW, barH, 4);
    this.ctx.fill();

    const grad = this.ctx.createLinearGradient(barX, barY, barX + barW, barY);
    grad.addColorStop(0, item.color);
    grad.addColorStop(1, '#FFFFFF');
    this.ctx.fillStyle = grad;
    this.roundRect(barX, barY, fillW, barH, 4);
    this.ctx.fill();

    this.ctx.restore();
  }

  private roundRect(x: number, y: number, w: number, h: number, r: number): void {
    this.ctx.beginPath();
    this.ctx.moveTo(x + r, y);
    this.ctx.lineTo(x + w - r, y);
    this.ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    this.ctx.lineTo(x + w, y + h - r);
    this.ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    this.ctx.lineTo(x + r, y + h);
    this.ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    this.ctx.lineTo(x, y + r);
    this.ctx.quadraticCurveTo(x, y, x + r, y);
    this.ctx.closePath();
  }

  private drawParticles(particles: Particle[]): void {
    for (const p of particles) {
      this.ctx.save();
      this.ctx.globalAlpha = p.alpha;
      this.ctx.fillStyle = p.color;
      this.ctx.shadowColor = p.color;
      this.ctx.shadowBlur = 8;
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.restore();
    }
  }

  private drawSpectrum(spectrum: Uint8Array): void {
    const panelX = this.width - 320;
    const panelY = 20;
    const panelW = 300;
    const panelH = 150;

    this.ctx.save();
    this.ctx.fillStyle = 'rgba(26, 26, 51, 0.85)';
    this.roundRect(panelX, panelY, panelW, panelH, 12);
    this.ctx.fill();

    const barCount = 128;
    const barWidth = 2;
    const gap = 1;
    const totalWidth = barCount * (barWidth + gap);
    const startX = panelX + (panelW - totalWidth) / 2;
    const startY = panelY + panelH - 5;

    for (let i = 0; i < barCount; i++) {
      const value = spectrum[i] || 0;
      const barHeight = (value / 255) * 140;
      const x = startX + i * (barWidth + gap);
      const y = startY - barHeight;

      const t = i / barCount;
      let color: string;
      if (t < 0.33) {
        color = '#FF6B6B';
      } else if (t < 0.66) {
        color = '#FFD93D';
      } else {
        color = '#6BCB77';
      }

      this.ctx.fillStyle = color;
      this.ctx.fillRect(x, y, barWidth, barHeight);
    }

    this.ctx.restore();
  }

  public draw(
    particles: Particle[],
    spectrum: Uint8Array,
    currentTime: number
  ): void {
    this.currentTime = currentTime;

    this.drawBackground();
    this.drawDivider();
    this.drawNoteStreams();
    this.drawKeyboard();
    this.drawParticles(particles);
    this.drawSpectrum(spectrum);
  }

  public getKeyboardWidth(): number {
    const whiteKeys = this.getWhiteKeys();
    if (whiteKeys.length === 0) return 0;
    const last = whiteKeys[whiteKeys.length - 1];
    return last.x + last.width;
  }

  public getDefaultScrollOffset(): number {
    const whiteKeys = this.getWhiteKeys();
    const c3Index = whiteKeys.findIndex(k => k.noteIndex === 48);
    if (c3Index === -1) return 0;
    return whiteKeys[c3Index].x - this.width / 4;
  }
}
