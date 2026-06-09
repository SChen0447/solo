export interface ScoreNote {
  pitch: string;
  midi: number;
  frequency: number;
  startBeat: number;
  duration: number;
  staffLine: number;
}

export interface Score {
  title: string;
  bpm: number;
  notes: ScoreNote[];
  totalBeats: number;
}

interface UserMarker {
  x: number;
  y: number;
  startTime: number;
}

export class ScoreRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private score: Score;
  private currentBeat: number = 0;
  private speed: number = 1;
  private isPlaying: boolean = false;
  private loop: boolean = false;
  private lastTime: number = 0;
  private animationId: number = 0;
  private highlightedNotes: Map<number, number> = new Map();
  private userMarkers: UserMarker[] = [];
  private playedNotes: Set<number> = new Set();
  private dpr: number = 1;

  public onNoteReach: ((noteIndex: number, note: ScoreNote) => void) | null = null;

  private readonly PADDING_X = 40;
  private readonly LINE_SPACING = 14;
  private readonly NOTE_WIDTH = 18;
  private readonly BEAT_WIDTH = 60;

  constructor(canvas: HTMLCanvasElement, score: Score) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.score = score;
    this.resize();
    window.addEventListener('resize', this.handleResize);
    this.drawStatic();
  }

  private handleResize = (): void => {
    this.resize();
    this.draw();
  };

  private resize(): void {
    this.dpr = window.devicePixelRatio || 1;
    const rect = this.canvas.getBoundingClientRect();
    this.canvas.width = rect.width * this.dpr;
    this.canvas.height = rect.height * this.dpr;
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
  }

  public setSpeed(speed: number): void {
    this.speed = speed;
  }

  public setLoop(loop: boolean): void {
    this.loop = loop;
  }

  public play(): void {
    if (this.isPlaying) return;
    this.isPlaying = true;
    this.lastTime = performance.now();
    this.animationId = requestAnimationFrame(this.animate);
  }

  public pause(): void {
    this.isPlaying = false;
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = 0;
    }
  }

  public reset(): void {
    this.pause();
    this.currentBeat = 0;
    this.playedNotes.clear();
    this.highlightedNotes.clear();
    this.userMarkers = [];
    this.draw();
  }

  public addUserMarker(midi: number): void {
    const note = this.score.notes.find((n) => n.midi === midi);
    if (!note) return;
    const x = this.beatToX(note.startBeat);
    const y = this.staffLineToY(note.staffLine);
    this.userMarkers.push({ x, y, startTime: performance.now() });
  }

  public getCurrentBeat(): number {
    return this.currentBeat;
  }

  public getScore(): Score {
    return this.score;
  }

  private beatToX(beat: number): number {
    return this.PADDING_X + beat * this.BEAT_WIDTH;
  }

  private staffLineToY(line: number): number {
    const rect = this.canvas.getBoundingClientRect();
    const centerY = rect.height / 2;
    return centerY - (line - 4) * (this.LINE_SPACING / 2);
  }

  private animate = (now: number): void => {
    if (!this.isPlaying) return;
    const delta = (now - this.lastTime) / 1000;
    this.lastTime = now;

    const beatsPerSecond = (this.score.bpm / 60) * this.speed;
    this.currentBeat += delta * beatsPerSecond;

    this.score.notes.forEach((note, idx) => {
      if (this.currentBeat >= note.startBeat && !this.playedNotes.has(idx)) {
        this.playedNotes.add(idx);
        this.highlightedNotes.set(idx, performance.now());
        if (this.onNoteReach) {
          this.onNoteReach(idx, note);
        }
      }
    });

    if (this.currentBeat >= this.score.totalBeats) {
      if (this.loop) {
        this.currentBeat = 0;
        this.playedNotes.clear();
      } else {
        this.isPlaying = false;
        this.draw();
        return;
      }
    }

    this.draw();
    this.animationId = requestAnimationFrame(this.animate);
  };

  private drawStatic(): void {
    this.draw();
  }

  private draw(): void {
    const rect = this.canvas.getBoundingClientRect();
    const ctx = this.ctx;
    ctx.clearRect(0, 0, rect.width, rect.height);

    const centerY = rect.height / 2;
    const startX = this.PADDING_X;
    const endX = rect.width - this.PADDING_X;

    ctx.strokeStyle = '#333';
    ctx.lineWidth = 1;
    for (let i = 0; i < 5; i++) {
      const y = centerY - 2 * this.LINE_SPACING + i * this.LINE_SPACING;
      ctx.beginPath();
      ctx.moveTo(startX, y);
      ctx.lineTo(endX, y);
      ctx.stroke();
    }

    ctx.fillStyle = '#333';
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 2;
    const trebleY = centerY - this.LINE_SPACING;
    ctx.beginPath();
    ctx.ellipse(startX - 5, trebleY, 6, 9, -0.3, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(startX + 1, trebleY - 18);
    ctx.lineTo(startX + 1, trebleY + 20);
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.strokeStyle = '#333';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(startX - 12, centerY - 2 * this.LINE_SPACING - 4);
    ctx.lineTo(startX - 12, centerY + 2 * this.LINE_SPACING + 4);
    ctx.stroke();

    this.score.notes.forEach((note, idx) => {
      const x = this.beatToX(note.startBeat);
      const y = this.staffLineToY(note.staffLine);
      const highlightStart = this.highlightedNotes.get(idx);
      let fillColor = '#ffffff';

      if (highlightStart !== undefined) {
        const elapsed = (performance.now() - highlightStart) / 1000;
        if (elapsed < 0.2) {
          const t = elapsed / 0.2;
          if (t < 0.5) {
            fillColor = this.interpolateColor('#ffffff', '#ffcc00', t * 2);
          } else {
            fillColor = this.interpolateColor('#ffcc00', '#ffffff', (t - 0.5) * 2);
          }
        } else {
          this.highlightedNotes.delete(idx);
        }
      }

      this.drawNote(x, y, fillColor, note.staffLine);
    });

    const now = performance.now();
    this.userMarkers = this.userMarkers.filter((m) => now - m.startTime < 300);
    this.userMarkers.forEach((m) => {
      const age = (now - m.startTime) / 300;
      ctx.fillStyle = `rgba(100, 180, 255, ${0.6 * (1 - age)})`;
      ctx.beginPath();
      ctx.arc(m.x, m.y - 20, 6 * (1 - age * 0.3), 0, Math.PI * 2);
      ctx.fill();
    });

    const cursorX = this.beatToX(this.currentBeat);
    if (cursorX >= startX && cursorX <= endX) {
      ctx.strokeStyle = '#ff3333';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(cursorX, centerY - 2.5 * this.LINE_SPACING);
      ctx.lineTo(cursorX, centerY + 2.5 * this.LINE_SPACING);
      ctx.stroke();
    }
  }

  private drawNote(x: number, y: number, fillColor: string, staffLine: number): void {
    const ctx = this.ctx;

    ctx.fillStyle = fillColor;
    ctx.strokeStyle = '#111';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.ellipse(x, y, this.NOTE_WIDTH / 2, this.NOTE_WIDTH / 2.6, -0.25, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    if (staffLine < 0) {
      ctx.strokeStyle = '#333';
      ctx.lineWidth = 1;
      const lines = Math.ceil(-staffLine / 2);
      for (let i = 1; i <= lines; i++) {
        const ly = y + i * this.LINE_SPACING;
        ctx.beginPath();
        ctx.moveTo(x - this.NOTE_WIDTH / 2 - 4, ly);
        ctx.lineTo(x + this.NOTE_WIDTH / 2 + 4, ly);
        ctx.stroke();
      }
    } else if (staffLine > 8) {
      ctx.strokeStyle = '#333';
      ctx.lineWidth = 1;
      const lines = Math.ceil((staffLine - 8) / 2);
      for (let i = 1; i <= lines; i++) {
        const ly = y - i * this.LINE_SPACING;
        ctx.beginPath();
        ctx.moveTo(x - this.NOTE_WIDTH / 2 - 4, ly);
        ctx.lineTo(x + this.NOTE_WIDTH / 2 + 4, ly);
        ctx.stroke();
      }
    }

    ctx.strokeStyle = '#111';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(x + this.NOTE_WIDTH / 2 - 1, y);
    ctx.lineTo(x + this.NOTE_WIDTH / 2 - 1, y - 35);
    ctx.stroke();
  }

  private interpolateColor(a: string, b: string, t: number): string {
    const ah = parseInt(a.replace('#', ''), 16);
    const bh = parseInt(b.replace('#', ''), 16);
    const ar = (ah >> 16) & 0xff;
    const ag = (ah >> 8) & 0xff;
    const ab = ah & 0xff;
    const br = (bh >> 16) & 0xff;
    const bg = (bh >> 8) & 0xff;
    const bb = bh & 0xff;
    const rr = Math.round(ar + (br - ar) * t);
    const rg = Math.round(ag + (bg - ag) * t);
    const rb = Math.round(ab + (bb - ab) * t);
    return `#${((rr << 16) | (rg << 8) | rb).toString(16).padStart(6, '0')}`;
  }

  public destroy(): void {
    this.pause();
    window.removeEventListener('resize', this.handleResize);
  }
}
