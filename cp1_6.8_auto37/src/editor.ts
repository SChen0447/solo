import { SoundEngine, NoteType, PITCH_RANGE, Note } from './sound';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  alpha: number;
  life: number;
  maxLife: number;
}

export interface EditorNote extends Note {
  columnIndex: number;
  staffPosition: number;
  isHighlighted: boolean;
  highlightProgress: number;
}

export type TimeSignature = '4/4' | '3/4' | '6/8';

const NOTE_COLORS: { [key in NoteType]: string } = {
  whole: '#e74c3c',
  half: '#e67e22',
  quarter: '#f1c40f',
  eighth: '#3498db',
  sixteenth: '#9b59b6',
};

const NOTE_WIDTHS: { [key in NoteType]: number } = {
  whole: 30,
  half: 26,
  quarter: 22,
  eighth: 20,
  sixteenth: 18,
};

const NOTE_HEIGHTS: { [key in NoteType]: number } = {
  whole: 20,
  half: 18,
  quarter: 16,
  eighth: 14,
  sixteenth: 12,
};

const NOTE_DURATIONS: { [key in NoteType]: number } = {
  whole: 4,
  half: 2,
  quarter: 1,
  eighth: 0.5,
  sixteenth: 0.25,
};

export class ScoreEditor {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private soundEngine: SoundEngine;
  private notes: EditorNote[] = [];
  private selectedNoteType: NoteType = 'quarter';
  private timeSignature: TimeSignature = '4/4';
  private particles: Particle[] = [];

  private staffTop: number = 100;
  private staffLineSpacing: number = 12;
  private noteSpacing: number = 60;
  private firstNoteX: number = 80;
  private canvasWidth: number = 1200;
  private canvasHeight: number = 400;

  private isDragging: boolean = false;
  private draggedNote: EditorNote | null = null;
  private dragOffsetX: number = 0;
  private dragOffsetY: number = 0;
  private dragStartColumn: number = 0;
  private dragStartStaffPos: number = 0;

  private hoverX: number = -1;
  private hoverY: number = -1;
  private hoverStaffPos: number = -1;
  private hoverColumn: number = -1;

  private animationFrameId: number | null = null;
  private onNotesChangeCallback: (() => void) | null = null;

  constructor(canvas: HTMLCanvasElement, soundEngine: SoundEngine) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.soundEngine = soundEngine;

    this.setupCanvas();
    this.setupEventListeners();
    this.startAnimation();
  }

  private setupCanvas() {
    const container = this.canvas.parentElement;
    if (container) {
      this.canvasHeight = container.clientHeight - 20;
    }
    this.canvas.width = this.canvasWidth;
    this.canvas.height = this.canvasHeight;
    this.staffTop = this.canvasHeight / 2 - this.staffLineSpacing * 2;
  }

  public resize() {
    const container = this.canvas.parentElement;
    if (container) {
      this.canvasHeight = container.clientHeight - 20;
      this.canvas.width = Math.max(this.canvasWidth, container.clientWidth);
      this.canvas.height = this.canvasHeight;
      this.staffTop = this.canvasHeight / 2 - this.staffLineSpacing * 2;
    }
  }

  private setupEventListeners() {
    this.canvas.addEventListener('mousedown', this.handleMouseDown.bind(this));
    this.canvas.addEventListener('mousemove', this.handleMouseMove.bind(this));
    this.canvas.addEventListener('mouseup', this.handleMouseUp.bind(this));
    this.canvas.addEventListener('mouseleave', this.handleMouseLeave.bind(this));
    this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  private handleMouseDown(e: MouseEvent) {
    this.soundEngine.resume();
    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left + this.canvas.parentElement!.scrollLeft;
    const y = e.clientY - rect.top;

    const clickedNote = this.getNoteAt(x, y);

    if (e.button === 2) {
      if (clickedNote) {
        this.deleteNote(clickedNote);
      }
      return;
    }

    if (clickedNote) {
      this.isDragging = true;
      this.draggedNote = clickedNote;
      this.dragOffsetX = x - clickedNote.x!;
      this.dragOffsetY = y - clickedNote.y!;
      this.dragStartColumn = clickedNote.columnIndex;
      this.dragStartStaffPos = clickedNote.staffPosition;
    } else if (this.isOnStaff(y)) {
      const staffPos = this.getStaffPosition(y);
      const columnIndex = this.getColumnIndex(x);
      const pitch = this.getPitchFromStaffPosition(staffPos);

      if (pitch) {
        this.addNote(columnIndex, staffPos, pitch);
      }
    }
  }

  private handleMouseMove(e: MouseEvent) {
    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left + this.canvas.parentElement!.scrollLeft;
    const y = e.clientY - rect.top;

    this.hoverX = x;
    this.hoverY = y;

    if (this.isOnStaff(y)) {
      this.hoverStaffPos = Math.round(this.getStaffPosition(y));
      this.hoverColumn = Math.round(this.getColumnIndex(x));
    } else {
      this.hoverStaffPos = -1;
      this.hoverColumn = -1;
    }

    if (this.isDragging && this.draggedNote) {
      const newColumn = Math.round(this.getColumnIndex(x - this.dragOffsetX + NOTE_WIDTHS[this.draggedNote.type] / 2));
      const newStaffPos = Math.round(this.getStaffPosition(y - this.dragOffsetY));

      if (newColumn !== this.draggedNote.columnIndex || newStaffPos !== this.draggedNote.staffPosition) {
        const pitch = this.getPitchFromStaffPosition(newStaffPos);
        if (pitch) {
          this.moveNote(this.draggedNote, newColumn, newStaffPos, pitch);
        }
      }
    }
  }

  private handleMouseUp(e: MouseEvent) {
    if (this.isDragging && this.draggedNote) {
      if (this.draggedNote.columnIndex !== this.dragStartColumn ||
          this.draggedNote.staffPosition !== this.dragStartStaffPos) {
        this.soundEngine.playNote(this.draggedNote.pitch, 0.3);
        this.spawnParticles(this.draggedNote.x!, this.draggedNote.y!, NOTE_COLORS[this.draggedNote.type], 5);
        this.notesChanged();
      }
    }
    this.isDragging = false;
    this.draggedNote = null;
  }

  private handleMouseLeave() {
    this.hoverX = -1;
    this.hoverY = -1;
    this.hoverStaffPos = -1;
    this.hoverColumn = -1;
    this.isDragging = false;
    this.draggedNote = null;
  }

  private getNoteAt(x: number, y: number): EditorNote | null {
    for (let i = this.notes.length - 1; i >= 0; i--) {
      const note = this.notes[i];
      const w = NOTE_WIDTHS[note.type];
      const h = NOTE_HEIGHTS[note.type];
      if (note.x !== undefined && note.y !== undefined) {
        if (x >= note.x - w / 2 - 5 && x <= note.x + w / 2 + 5 &&
            y >= note.y - h / 2 - 5 && y <= note.y + h / 2 + 5) {
          return note;
        }
      }
    }
    return null;
  }

  private isOnStaff(y: number): boolean {
    const staffBottom = this.staffTop + this.staffLineSpacing * 4;
    return y >= this.staffTop - 30 && y <= staffBottom + 30;
  }

  private getStaffPosition(y: number): number {
    const middleY = this.staffTop + this.staffLineSpacing * 2;
    return (middleY - y) / (this.staffLineSpacing / 2);
  }

  private getYFromStaffPosition(pos: number): number {
    const middleY = this.staffTop + this.staffLineSpacing * 2;
    return middleY - pos * (this.staffLineSpacing / 2);
  }

  private getPitchFromStaffPosition(pos: number): string | null {
    const pitchIndex = Math.floor(pos) + 7;
    if (pitchIndex >= 0 && pitchIndex < PITCH_RANGE.length) {
      return PITCH_RANGE[pitchIndex];
    }
    return null;
  }

  private getColumnIndex(x: number): number {
    return Math.floor((x - this.firstNoteX + this.noteSpacing / 2) / this.noteSpacing);
  }

  private getXFromColumnIndex(col: number): number {
    return this.firstNoteX + col * this.noteSpacing;
  }

  private addNote(columnIndex: number, staffPosition: number, pitch: string) {
    const existingNote = this.notes.find(
      n => n.columnIndex === columnIndex && n.staffPosition === staffPosition
    );
    if (existingNote) {
      this.deleteNote(existingNote);
      return;
    }

    const note: EditorNote = {
      id: `note_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      pitch,
      midiNote: this.soundEngine.getMidiNote(pitch),
      time: columnIndex,
      duration: NOTE_DURATIONS[this.selectedNoteType],
      type: this.selectedNoteType,
      columnIndex,
      staffPosition,
      isHighlighted: false,
      highlightProgress: 0,
      x: this.getXFromColumnIndex(columnIndex),
      y: this.getYFromStaffPosition(staffPosition),
    };

    this.notes.push(note);
    this.sortNotes();

    const newMaxColumn = Math.max(...this.notes.map(n => n.columnIndex));
    const requiredWidth = this.getXFromColumnIndex(newMaxColumn + 4);
    if (requiredWidth > this.canvasWidth) {
      this.canvasWidth = requiredWidth;
      this.canvas.width = this.canvasWidth;
    }

    this.soundEngine.playNote(pitch, 0.4);
    this.spawnParticles(note.x!, note.y!, NOTE_COLORS[note.type], 8);
    this.notesChanged();
  }

  private moveNote(note: EditorNote, newColumn: number, newStaffPos: number, newPitch: string) {
    const existingNote = this.notes.find(
      n => n.id !== note.id && n.columnIndex === newColumn && n.staffPosition === newStaffPos
    );
    if (existingNote) {
      return;
    }

    note.columnIndex = newColumn;
    note.staffPosition = newStaffPos;
    note.pitch = newPitch;
    note.midiNote = this.soundEngine.getMidiNote(newPitch);
    note.time = newColumn;
    note.x = this.getXFromColumnIndex(newColumn);
    note.y = this.getYFromStaffPosition(newStaffPos);

    this.sortNotes();

    const newMaxColumn = Math.max(...this.notes.map(n => n.columnIndex));
    const requiredWidth = this.getXFromColumnIndex(newMaxColumn + 4);
    if (requiredWidth > this.canvasWidth) {
      this.canvasWidth = requiredWidth;
      this.canvas.width = this.canvasWidth;
    }
  }

  private deleteNote(note: EditorNote) {
    const index = this.notes.indexOf(note);
    if (index > -1) {
      this.notes.splice(index, 1);
      this.spawnParticles(note.x!, note.y!, NOTE_COLORS[note.type], 10);
      this.notesChanged();
    }
  }

  private sortNotes() {
    this.notes.sort((a, b) => {
      if (a.columnIndex !== b.columnIndex) return a.columnIndex - b.columnIndex;
      return b.staffPosition - a.staffPosition;
    });
  }

  private spawnParticles(x: number, y: number, color: string, count: number) {
    for (let i = 0; i < count; i++) {
      this.particles.push({
        x,
        y,
        vx: (Math.random() - 0.5) * 2,
        vy: -Math.random() * 2 - 0.5,
        size: Math.random() * 2 + 2,
        color,
        alpha: 1,
        life: 0,
        maxLife: 60 + Math.random() * 30,
      });
    }
  }

  private updateParticles() {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.life++;
      p.alpha = 1 - p.life / p.maxLife;

      if (p.life >= p.maxLife) {
        this.particles.splice(i, 1);
      }
    }
  }

  private startAnimation() {
    const animate = () => {
      this.updateParticles();
      this.render();
      this.animationFrameId = requestAnimationFrame(animate);
    };
    animate();
  }

  public stopAnimation() {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  public setNoteType(type: NoteType) {
    this.selectedNoteType = type;
  }

  public setTimeSignature(sig: TimeSignature) {
    this.timeSignature = sig;
  }

  public getNotes(): EditorNote[] {
    return [...this.notes];
  }

  public getNoteDuration(type: NoteType): number {
    return NOTE_DURATIONS[type];
  }

  public highlightNote(noteId: string) {
    const note = this.notes.find(n => n.id === noteId);
    if (note) {
      note.isHighlighted = true;
      note.highlightProgress = 0;
      this.spawnParticles(note.x!, note.y!, NOTE_COLORS[note.type], 6);
    }
  }

  public clearHighlights() {
    this.notes.forEach(n => {
      n.isHighlighted = false;
      n.highlightProgress = 0;
    });
  }

  public updateHighlightProgress(dt: number) {
    this.notes.forEach(n => {
      if (n.isHighlighted && n.highlightProgress < 1) {
        n.highlightProgress = Math.min(1, n.highlightProgress + dt / 300);
      }
    });
  }

  public clearNotes() {
    this.notes = [];
    this.particles = [];
    this.canvasWidth = 1200;
    this.canvas.width = this.canvasWidth;
    this.notesChanged();
  }

  private notesChanged() {
    if (this.onNotesChangeCallback) {
      this.onNotesChangeCallback();
    }
  }

  public onNotesChange(callback: () => void) {
    this.onNotesChangeCallback = callback;
  }

  private getBeatsPerMeasure(): number {
    switch (this.timeSignature) {
      case '4/4': return 4;
      case '3/4': return 3;
      case '6/8': return 6;
      default: return 4;
    }
  }

  private render() {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    ctx.clearRect(0, 0, w, h);

    ctx.fillStyle = '#16213e';
    ctx.fillRect(0, 0, w, h);

    this.drawStaff();
    this.drawMeasureLines();
    this.drawClef();
    this.drawTimeSignature();

    if (this.hoverStaffPos >= 0 && this.hoverColumn >= 0 && !this.isDragging) {
      this.drawHoverPreview();
    }

    this.drawNotes();
    this.drawParticles();
  }

  private drawStaff() {
    const ctx = this.ctx;
    ctx.strokeStyle = 'rgba(224, 224, 224, 0.6)';
    ctx.lineWidth = 1;

    for (let i = 0; i < 5; i++) {
      const y = this.staffTop + i * this.staffLineSpacing;
      ctx.beginPath();
      ctx.moveTo(40, y);
      ctx.lineTo(this.canvas.width - 20, y);
      ctx.stroke();
    }
  }

  private drawMeasureLines() {
    const ctx = this.ctx;
    const beatsPerMeasure = this.getBeatsPerMeasure();
    const notesPerBeat = this.timeSignature === '6/8' ? 0.5 : 1;
    const measures = Math.ceil((this.notes.length > 0 ? Math.max(...this.notes.map(n => n.columnIndex)) + 4 : 20) / (beatsPerMeasure / notesPerBeat / NOTE_DURATIONS[this.selectedNoteType]));

    ctx.strokeStyle = '#ff6b35';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);

    ctx.font = '12px sans-serif';
    ctx.fillStyle = '#ff6b35';
    ctx.textAlign = 'center';

    const staffBottom = this.staffTop + this.staffLineSpacing * 4;

    for (let i = 0; i <= measures; i++) {
      const colIndex = i * beatsPerMeasure / notesPerBeat / NOTE_DURATIONS[this.selectedNoteType];
      const x = this.getXFromColumnIndex(colIndex);

      if (x < 40) continue;

      ctx.beginPath();
      ctx.moveTo(x, this.staffTop - 10);
      ctx.lineTo(x, staffBottom + 10);
      ctx.stroke();

      if (i < measures) {
        const nextX = this.getXFromColumnIndex((i + 1) * beatsPerMeasure / notesPerBeat / NOTE_DURATIONS[this.selectedNoteType]);
        ctx.fillText(`${i + 1}`, (x + nextX) / 2, this.staffTop - 20);
      }
    }

    ctx.setLineDash([]);
  }

  private drawClef() {
    const ctx = this.ctx;
    const x = 50;
    const y = this.staffTop + this.staffLineSpacing * 2;

    ctx.font = '48px serif';
    ctx.fillStyle = 'rgba(224, 224, 224, 0.8)';
    ctx.textBaseline = 'middle';
    ctx.fillText('𝄞', x - 15, y);
  }

  private drawTimeSignature() {
    const ctx = this.ctx;
    const x = 55;
    const y = this.staffTop + this.staffLineSpacing * 2;

    ctx.font = 'bold 16px sans-serif';
    ctx.fillStyle = 'rgba(224, 224, 224, 0.8)';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const parts = this.timeSignature.split('/');
    ctx.fillText(parts[0], x, y - 8);
    ctx.fillText(parts[1], x, y + 8);
  }

  private drawHoverPreview() {
    const ctx = this.ctx;
    const x = this.getXFromColumnIndex(this.hoverColumn);
    const y = this.getYFromStaffPosition(this.hoverStaffPos);
    const pitch = this.getPitchFromStaffPosition(this.hoverStaffPos);

    if (!pitch) return;

    const color = NOTE_COLORS[this.selectedNoteType];
    const w = NOTE_WIDTHS[this.selectedNoteType];
    const h = NOTE_HEIGHTS[this.selectedNoteType];

    ctx.save();
    ctx.globalAlpha = 0.4;

    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.ellipse(x, y, w / 2, h / 2, 0, 0, Math.PI * 2);
    ctx.fill();

    const stemUp = this.hoverStaffPos <= 0;
    const stemX = stemUp ? x + w / 2 - 1 : x - w / 2 + 1;
    const stemYStart = stemUp ? y : y;
    const stemYEnd = stemUp ? y - this.staffLineSpacing * 3 : y + this.staffLineSpacing * 3;

    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(stemX, stemYStart);
    ctx.lineTo(stemX, stemYEnd);
    ctx.stroke();

    if (this.selectedNoteType === 'eighth' || this.selectedNoteType === 'sixteenth') {
      const flagCount = this.selectedNoteType === 'eighth' ? 1 : 2;
      const flagStartY = stemUp ? stemYEnd : stemYEnd;
      const flagEndX = stemUp ? stemX + 8 : stemX - 8;

      for (let i = 0; i < flagCount; i++) {
        const flagY = flagStartY + (stemUp ? i * 5 : -i * 5);
        ctx.beginPath();
        ctx.moveTo(stemX, flagY);
        ctx.quadraticCurveTo(
          stemUp ? stemX + 4 : stemX - 4,
          flagY + (stemUp ? 4 : -4),
          flagEndX,
          flagY + (stemUp ? 6 : -6)
        );
        ctx.stroke();
      }
    }

    ctx.restore();
  }

  private drawNotes() {
    this.notes.forEach(note => {
      if (note.x === undefined || note.y === undefined) return;

      const color = NOTE_COLORS[note.type];
      const w = NOTE_WIDTHS[note.type];
      const h = NOTE_HEIGHTS[note.type];
      const isHighlighted = note.isHighlighted;
      const progress = note.highlightProgress;

      let scale = 1;
      let glowIntensity = 0;
      let displayColor = color;

      if (isHighlighted) {
        if (progress < 0.3) {
          scale = 1 + 0.2 * (progress / 0.3);
          glowIntensity = progress / 0.3;
        } else {
          scale = 1.2 - 0.2 * ((progress - 0.3) / 0.7);
          glowIntensity = 1 - (progress - 0.3) / 0.7;
        }
        displayColor = this.lerpColor('#ffffff', color, Math.min(1, progress / 0.3));
      }

      const x = note.x;
      const y = note.y;

      this.ctx.save();
      this.ctx.translate(x, y);
      this.ctx.scale(scale, scale);
      this.ctx.translate(-x, -y);

      if (glowIntensity > 0) {
        this.ctx.shadowColor = color;
        this.ctx.shadowBlur = 20 * glowIntensity;
      }

      this.ctx.fillStyle = displayColor;
      this.ctx.beginPath();
      this.ctx.ellipse(x, y, w / 2, h / 2, 0, 0, Math.PI * 2);
      this.ctx.fill();

      const stemUp = note.staffPosition <= 0;
      const stemX = stemUp ? x + w / 2 - 1 : x - w / 2 + 1;
      const stemYStart = stemUp ? y : y;
      const stemYEnd = stemUp ? y - this.staffLineSpacing * 3 : y + this.staffLineSpacing * 3;

      this.ctx.strokeStyle = displayColor;
      this.ctx.lineWidth = 1.5;
      this.ctx.beginPath();
      this.ctx.moveTo(stemX, stemYStart);
      this.ctx.lineTo(stemX, stemYEnd);
      this.ctx.stroke();

      if (note.type === 'eighth' || note.type === 'sixteenth') {
        const flagCount = note.type === 'eighth' ? 1 : 2;
        const flagStartY = stemUp ? stemYEnd : stemYEnd;
        const flagEndX = stemUp ? stemX + 8 : stemX - 8;

        for (let i = 0; i < flagCount; i++) {
          const flagY = flagStartY + (stemUp ? i * 5 : -i * 5);
          this.ctx.beginPath();
          this.ctx.moveTo(stemX, flagY);
          this.ctx.quadraticCurveTo(
            stemUp ? stemX + 4 : stemX - 4,
            flagY + (stemUp ? 4 : -4),
            flagEndX,
            flagY + (stemUp ? 6 : -6)
          );
          this.ctx.stroke();
        }
      }

      this.ctx.restore();

      if (note.staffPosition > 10 || note.staffPosition < -2) {
        const ledgerCount = note.staffPosition > 10
          ? Math.floor((note.staffPosition - 10) / 2) + 1
          : Math.floor((-2 - note.staffPosition) / 2) + 1;

        this.ctx.strokeStyle = 'rgba(224, 224, 224, 0.6)';
        this.ctx.lineWidth = 1;

        for (let i = 0; i < ledgerCount; i++) {
          let ledgerY: number;
          if (note.staffPosition > 10) {
            ledgerY = this.staffTop - (i + 1) * this.staffLineSpacing;
          } else {
            ledgerY = this.staffTop + 4 * this.staffLineSpacing + (i + 1) * this.staffLineSpacing;
          }
          this.ctx.beginPath();
          this.ctx.moveTo(x - w / 2 - 3, ledgerY);
          this.ctx.lineTo(x + w / 2 + 3, ledgerY);
          this.ctx.stroke();
        }
      }
    });
  }

  private drawParticles() {
    const ctx = this.ctx;
    this.particles.forEach(p => {
      ctx.save();
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });
  }

  private lerpColor(color1: string, color2: string, t: number): string {
    const c1 = this.hexToRgb(color1);
    const c2 = this.hexToRgb(color2);
    const r = Math.round(c1.r + (c2.r - c1.r) * t);
    const g = Math.round(c1.g + (c2.g - c1.g) * t);
    const b = Math.round(c1.b + (c2.b - c1.b) * t);
    return `rgb(${r}, ${g}, ${b})`;
  }

  private hexToRgb(hex: string): { r: number; g: number; b: number } {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : { r: 0, g: 0, b: 0 };
  }

  public getCanvasWidth(): number {
    return this.canvasWidth;
  }

  public getFirstNoteX(): number {
    return this.firstNoteX;
  }

  public getNoteSpacing(): number {
    return this.noteSpacing;
  }

  public getStaffTop(): number {
    return this.staffTop;
  }

  public getStaffLineSpacing(): number {
    return this.staffLineSpacing;
  }
}
