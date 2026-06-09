import { InstrumentType, INSTRUMENT_COLORS, PITCH_NAMES, synth } from './synth.js';

export interface NoteData {
  id: string;
  instrument: InstrumentType;
  pitch: string;
  volume: number;
  duration: number;
  row: number;
  col: number;
  animationStart?: number;
  deleteAnimStart?: number;
}

export type RowState = 'normal' | 'muted' | 'solo';

export interface AppState {
  notes: Map<string, NoteData>;
  rowStates: RowState[];
  bpm: number;
  isPlaying: boolean;
  currentStep: number;
  stepProgress: number;
  draggingNote: DraggingNote | null;
  editingKey: string | null;
}

interface DraggingNote {
  instrument: InstrumentType;
  x: number;
  y: number;
  fromToolbar: boolean;
  originalKey?: string;
}

const GRID_ROWS = 8;
const GRID_COLS = 8;
const DEFAULT_CELL = 60;
const GAP = 2;
const ROW_CTRL_W = 40;
const ANIM_DURATION = 300;
const DEFAULT_PITCHES: Record<number, string> = {
  0: 'C4', 1: 'D4', 2: 'E4', 3: 'G4', 4: 'A4', 5: 'C5', 6: 'D5', 7: 'E5'
};

function noteKey(row: number, col: number): string {
  return `${row}-${col}`;
}

function adjustColor(hex: string, vol: number, pitchIdx: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const satFactor = 0.5 + (vol / 100) * 0.5;
  const gray = (r + g + b) / 3;
  const sr = Math.round(gray + (r - gray) * satFactor);
  const sg = Math.round(gray + (g - gray) * satFactor);
  const sb = Math.round(gray + (b - gray) * satFactor);
  const lightFactor = 0.75 + (pitchIdx / 35) * 0.5;
  const fr = Math.min(255, Math.round(sr * lightFactor));
  const fg = Math.min(255, Math.round(sg * lightFactor));
  const fb = Math.min(255, Math.round(sb * lightFactor));
  return `rgb(${fr}, ${fg}, ${fb})`;
}

function elasticOut(t: number): number {
  const c4 = (2 * Math.PI) / 3;
  return t === 0 ? 0 : t === 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
}

export class Sequencer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private wrapper: HTMLElement;
  private rowControlsEl: HTMLElement;
  private editPanel: HTMLElement;
  private volSlider: HTMLInputElement;
  private volValue: HTMLSpanElement;
  private pitchSelect: HTMLSelectElement;
  private durValue: HTMLSpanElement;
  private durMinus: HTMLButtonElement;
  private durPlus: HTMLButtonElement;
  private panelClose: HTMLButtonElement;
  private playBtn: HTMLButtonElement;
  private playIcon: HTMLDivElement;
  private bpmSlider: HTMLInputElement;
  private bpmValue: HTMLSpanElement;
  private progressFill: HTMLDivElement;
  private resetBtn: HTMLButtonElement;
  private exportBtn: HTMLButtonElement;
  private toast: HTMLDivElement;

  public state: AppState;
  private cellSize = DEFAULT_CELL;
  private gridX = 0;
  private gridY = 0;
  private gridW = 0;
  private gridH = 0;
  private dpr = 1;
  private lastClickInfo: { row: number; col: number; time: number } | null = null;
  private listeners: Map<string, Set<(arg?: unknown) => void>> = new Map();
  private rowButtons: HTMLButtonElement[] = [];

  constructor() {
    this.canvas = document.getElementById('main-canvas') as HTMLCanvasElement;
    const ctx = this.canvas.getContext('2d');
    if (!ctx) throw new Error('Cannot get 2D context');
    this.ctx = ctx;
    this.wrapper = document.getElementById('canvas-wrapper') as HTMLElement;
    this.rowControlsEl = document.getElementById('row-controls') as HTMLElement;
    this.editPanel = document.getElementById('edit-panel') as HTMLElement;
    this.volSlider = document.getElementById('volume-slider') as HTMLInputElement;
    this.volValue = document.getElementById('vol-value') as HTMLSpanElement;
    this.pitchSelect = document.getElementById('pitch-select') as HTMLSelectElement;
    this.durValue = document.getElementById('dur-value') as HTMLSpanElement;
    this.durMinus = document.getElementById('dur-minus') as HTMLButtonElement;
    this.durPlus = document.getElementById('dur-plus') as HTMLButtonElement;
    this.panelClose = document.getElementById('panel-close') as HTMLButtonElement;
    this.playBtn = document.getElementById('play-btn') as HTMLButtonElement;
    this.playIcon = document.getElementById('play-icon') as HTMLDivElement;
    this.bpmSlider = document.getElementById('bpm-slider') as HTMLInputElement;
    this.bpmValue = document.getElementById('bpm-value') as HTMLSpanElement;
    this.progressFill = document.getElementById('progress-fill') as HTMLDivElement;
    this.resetBtn = document.getElementById('reset-btn') as HTMLButtonElement;
    this.exportBtn = document.getElementById('export-btn') as HTMLButtonElement;
    this.toast = document.getElementById('toast') as HTMLDivElement;

    this.state = {
      notes: new Map(),
      rowStates: Array(GRID_ROWS).fill('normal'),
      bpm: 120,
      isPlaying: false,
      currentStep: 0,
      stepProgress: 0,
      draggingNote: null,
      editingKey: null
    };

    this.initPitchSelect();
    this.initRowButtons();
    this.bindEvents();
    this.resize();
    this.startRenderLoop();
  }

  on(event: string, fn: (arg?: unknown) => void): void {
    if (!this.listeners.has(event)) this.listeners.set(event, new Set());
    this.listeners.get(event)!.add(fn);
  }

  emit(event: string, arg?: unknown): void {
    const set = this.listeners.get(event);
    if (set) set.forEach((fn) => fn(arg));
  }

  private initPitchSelect(): void {
    this.pitchSelect.innerHTML = '';
    for (const p of PITCH_NAMES) {
      const opt = document.createElement('option');
      opt.value = p;
      opt.textContent = p;
      this.pitchSelect.appendChild(opt);
    }
  }

  private initRowButtons(): void {
    this.rowControlsEl.innerHTML = '';
    this.rowButtons = [];
    for (let i = 0; i < GRID_ROWS; i++) {
      const btn = document.createElement('button');
      btn.className = 'row-btn';
      btn.title = '单击静音 / 双击独奏';
      btn.addEventListener('click', (e) => this.onRowBtnClick(i, e));
      btn.addEventListener('dblclick', (e) => {
        e.preventDefault();
        this.onRowBtnDblClick(i);
      });
      this.rowControlsEl.appendChild(btn);
      this.rowButtons.push(btn);
    }
  }

  private onRowBtnClick(row: number, e: MouseEvent): void {
    e.preventDefault();
    const now = Date.now();
    if (this.lastClickInfo && this.lastClickInfo.row === row && now - this.lastClickInfo.time < 300) {
      this.lastClickInfo = null;
      return;
    }
    this.lastClickInfo = { row, col: -1, time: now };
    setTimeout(() => {
      if (this.lastClickInfo && this.lastClickInfo.row === row && this.lastClickInfo.col === -1) {
        this.toggleRowMute(row);
        this.lastClickInfo = null;
      }
    }, 280);
  }

  private onRowBtnDblClick(row: number): void {
    this.toggleRowSolo(row);
  }

  private toggleRowMute(row: number): void {
    const hasSolo = this.state.rowStates.some((s) => s === 'solo');
    if (hasSolo) {
      this.state.rowStates.fill('normal');
      this.state.rowStates[row] = 'muted';
    } else {
      this.state.rowStates[row] = this.state.rowStates[row] === 'muted' ? 'normal' : 'muted';
    }
    this.updateRowButtons();
    this.emit('rowStateChange');
  }

  private toggleRowSolo(row: number): void {
    const isSolo = this.state.rowStates[row] === 'solo';
    if (isSolo) {
      this.state.rowStates.fill('normal');
    } else {
      this.state.rowStates.fill('muted');
      this.state.rowStates[row] = 'solo';
    }
    this.updateRowButtons();
    this.emit('rowStateChange');
  }

  private updateRowButtons(): void {
    this.state.rowStates.forEach((s, i) => {
      const btn = this.rowButtons[i];
      btn.classList.remove('muted', 'solo');
      if (s === 'muted') btn.classList.add('muted');
      else if (s === 'solo') btn.classList.add('solo');
    });
  }

  private bindEvents(): void {
    window.addEventListener('resize', () => this.resize());

    const toolBtns = document.querySelectorAll('.tool-btn');
    toolBtns.forEach((btn) => {
      btn.addEventListener('mousedown', (e) => {
        const instr = (btn as HTMLElement).dataset.instrument as InstrumentType;
        this.startToolbarDrag(instr, e as MouseEvent);
      });
      btn.addEventListener('touchstart', (e) => {
        const instr = (btn as HTMLElement).dataset.instrument as InstrumentType;
        const t = (e as TouchEvent).touches[0];
        this.startToolbarDrag(instr, { clientX: t.clientX, clientY: t.clientY } as MouseEvent);
      }, { passive: true });
    });

    this.canvas.addEventListener('mousedown', (e) => this.onCanvasMouseDown(e));
    this.canvas.addEventListener('mousemove', (e) => this.onCanvasMouseMove(e));
    window.addEventListener('mouseup', (e) => this.onMouseUp(e));
    this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());

    this.playBtn.addEventListener('click', () => {
      synth.ensureContext();
      this.emit('togglePlay');
    });

    this.bpmSlider.addEventListener('input', () => {
      this.state.bpm = parseInt(this.bpmSlider.value, 10);
      this.bpmValue.textContent = String(this.state.bpm);
      this.emit('bpmChange', this.state.bpm);
    });

    this.resetBtn.addEventListener('click', () => this.resetAll());

    this.exportBtn.addEventListener('click', () => this.exportJSON());

    this.panelClose.addEventListener('click', () => this.hideEditPanel());

    this.volSlider.addEventListener('input', () => {
      this.updateEditingNote('volume', parseInt(this.volSlider.value, 10));
    });
    this.pitchSelect.addEventListener('change', () => {
      this.updateEditingNote('pitch', this.pitchSelect.value);
    });
    this.durMinus.addEventListener('click', () => this.adjustDuration(-0.25));
    this.durPlus.addEventListener('click', () => this.adjustDuration(0.25));
  }

  private startToolbarDrag(instrument: InstrumentType, e: MouseEvent): void {
    synth.ensureContext();
    const rect = this.canvas.getBoundingClientRect();
    this.state.draggingNote = {
      instrument,
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      fromToolbar: true
    };
  }

  private onCanvasMouseDown(e: MouseEvent): void {
    const rect = this.canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) * this.dpr;
    const y = (e.clientY - rect.top) * this.dpr;
    const cell = this.hitTest(x, y);
    if (!cell) return;

    const key = noteKey(cell.row, cell.col);
    const note = this.state.notes.get(key);

    const now = Date.now();
    if (this.lastClickInfo && this.lastClickInfo.row === cell.row && this.lastClickInfo.col === cell.col && now - this.lastClickInfo.time < 300) {
      this.lastClickInfo = null;
      if (note) this.showEditPanel(cell.row, cell.col, e);
      return;
    }
    this.lastClickInfo = { row: cell.row, col: cell.col, time: now };
    setTimeout(() => {
      if (this.lastClickInfo && this.lastClickInfo.row === cell.row && this.lastClickInfo.col === cell.col) {
        if (note) {
          this.startNoteDrag(cell.row, cell.col, e);
        }
        this.lastClickInfo = null;
      }
    }, 280);
  }

  private startNoteDrag(row: number, col: number, e: MouseEvent): void {
    const key = noteKey(row, col);
    const note = this.state.notes.get(key);
    if (!note) return;
    const rect = this.canvas.getBoundingClientRect();
    this.state.draggingNote = {
      instrument: note.instrument,
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      fromToolbar: false,
      originalKey: key
    };
    this.state.notes.delete(key);
    this.emit('notesChange');
  }

  private onCanvasMouseMove(e: MouseEvent): void {
    if (!this.state.draggingNote) return;
    const rect = this.canvas.getBoundingClientRect();
    this.state.draggingNote.x = e.clientX - rect.left;
    this.state.draggingNote.y = e.clientY - rect.top;
  }

  private onMouseUp(e: MouseEvent): void {
    if (!this.state.draggingNote) return;
    const rect = this.canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) * this.dpr;
    const y = (e.clientY - rect.top) * this.dpr;
    const cell = this.hitTest(x, y);

    if (cell) {
      const key = noteKey(cell.row, cell.col);
      const existing = this.state.notes.get(key);
      if (existing) {
        existing.deleteAnimStart = performance.now();
        setTimeout(() => {
          const cur = this.state.notes.get(key);
          if (cur && cur.deleteAnimStart === existing.deleteAnimStart) {
            this.state.notes.delete(key);
            this.emit('notesChange');
          }
        }, ANIM_DURATION);
      }
      const d = this.state.draggingNote;
      const defaultPitch = DEFAULT_PITCHES[cell.row] || 'C4';
      this.state.notes.set(key, {
        id: Math.random().toString(36).slice(2, 10),
        instrument: d.instrument,
        pitch: defaultPitch,
        volume: 80,
        duration: 1,
        row: cell.row,
        col: cell.col,
        animationStart: performance.now()
      });
      this.emit('notesChange');
      synth.playNote(d.instrument, defaultPitch, 80, 0.5, synth.currentTime, this.state.bpm);
    }
    this.state.draggingNote = null;
  }

  private hitTest(x: number, y: number): { row: number; col: number } | null {
    if (x < this.gridX || x > this.gridX + this.gridW || y < this.gridY || y > this.gridY + this.gridH) return null;
    const cs = this.cellSize * this.dpr;
    const gap = GAP * this.dpr;
    const relX = x - this.gridX;
    const relY = y - this.gridY;
    const col = Math.floor(relX / (cs + gap));
    const row = Math.floor(relY / (cs + gap));
    if (col < 0 || col >= GRID_COLS || row < 0 || row >= GRID_ROWS) return null;
    const cellX = col * (cs + gap);
    const cellY = row * (cs + gap);
    if (relX - cellX > cs || relY - cellY > cs) return null;
    return { row, col };
  }

  private showEditPanel(row: number, col: number, e: MouseEvent): void {
    const key = noteKey(row, col);
    const note = this.state.notes.get(key);
    if (!note) return;
    this.state.editingKey = key;
    this.volSlider.value = String(note.volume);
    this.volValue.textContent = String(note.volume);
    this.pitchSelect.value = note.pitch;
    this.durValue.textContent = note.duration.toFixed(2);
    const rect = this.wrapper.getBoundingClientRect();
    let px = e.clientX - rect.left + 16;
    let py = e.clientY - rect.top + 16;
    const panelW = 280;
    const panelH = 220;
    if (px + panelW > rect.width) px = e.clientX - rect.left - panelW - 16;
    if (py + panelH > rect.height) py = e.clientY - rect.top - panelH - 16;
    this.editPanel.style.left = px + 'px';
    this.editPanel.style.top = py + 'px';
    this.editPanel.classList.add('visible');
  }

  private hideEditPanel(): void {
    this.editPanel.classList.remove('visible');
    this.state.editingKey = null;
  }

  private updateEditingNote<K extends keyof NoteData>(field: K, value: NoteData[K]): void {
    if (!this.state.editingKey) return;
    const note = this.state.notes.get(this.state.editingKey);
    if (!note) return;
    (note[field] as NoteData[K]) = value;
    if (field === 'volume') this.volValue.textContent = String(value);
    if (field === 'duration') this.durValue.textContent = (value as number).toFixed(2);
    this.emit('notesChange');
  }

  private adjustDuration(delta: number): void {
    if (!this.state.editingKey) return;
    const note = this.state.notes.get(this.state.editingKey);
    if (!note) return;
    const newVal = Math.max(0.25, Math.min(2, Math.round((note.duration + delta) * 4) / 4));
    this.updateEditingNote('duration', newVal);
  }

  private resetAll(): void {
    this.state.notes.clear();
    this.state.rowStates.fill('normal');
    this.state.currentStep = 0;
    this.state.stepProgress = 0;
    this.bpmSlider.value = '120';
    this.state.bpm = 120;
    this.bpmValue.textContent = '120';
    this.updateRowButtons();
    this.hideEditPanel();
    this.emit('reset');
  }

  private exportJSON(): void {
    const data = {
      bpm: this.state.bpm,
      notes: Array.from(this.state.notes.values()).map((n) => ({
        pitch: n.pitch,
        volume: n.volume,
        duration: n.duration,
        instrument: n.instrument,
        row: n.row,
        col: n.col
      })),
      rowStates: this.state.rowStates
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rhythm-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    this.showToast('导出成功！');
  }

  private showToast(msg: string): void {
    this.toast.textContent = msg;
    this.toast.classList.remove('show');
    void this.toast.offsetWidth;
    this.toast.classList.add('show');
  }

  resize(): void {
    const w = this.wrapper.clientWidth;
    const h = this.wrapper.clientHeight;
    this.dpr = window.devicePixelRatio || 1;
    this.canvas.width = w * this.dpr;
    this.canvas.height = h * this.dpr;
    this.canvas.style.width = w + 'px';
    this.canvas.style.height = h + 'px';
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);

    const isMobile = w <= 768;
    this.cellSize = isMobile ? DEFAULT_CELL * 0.8 : DEFAULT_CELL;

    const gridWidth = GRID_COLS * this.cellSize + (GRID_COLS - 1) * GAP;
    const gridHeight = GRID_ROWS * this.cellSize + (GRID_ROWS - 1) * GAP;
    this.gridW = gridWidth;
    this.gridH = gridHeight;

    const availLeft = 100 + (isMobile ? 24 : 40);
    this.gridX = Math.max(availLeft, (w - gridWidth) / 2);
    this.gridY = (h - gridHeight) / 2;

    this.positionRowControls();
  }

  private positionRowControls(): void {
    const cs = this.cellSize;
    const gap = GAP;
    const btnH = 20;
    const totalGap = ((GRID_ROWS - 1) * gap) / GRID_ROWS;
    this.rowControlsEl.style.left = (this.gridX - ROW_CTRL_W) + 'px';
    this.rowControlsEl.style.top = (this.gridY + (cs - btnH) / 2) + 'px';
    this.rowControlsEl.style.gap = (gap + cs - btnH) + 'px';
  }

  setPlaying(playing: boolean): void {
    this.state.isPlaying = playing;
    if (playing) {
      this.playIcon.className = 'pause-icon';
      this.playIcon.innerHTML = '<span></span><span></span>';
    } else {
      this.playIcon.className = 'play-icon';
      this.playIcon.innerHTML = '';
    }
  }

  setStep(step: number, progress: number): void {
    this.state.currentStep = step;
    this.state.stepProgress = progress;
    const totalCols = GRID_COLS;
    const pct = ((step + progress) / totalCols) * 100;
    this.progressFill.style.width = pct + '%';
  }

  hasSoloRow(): boolean {
    return this.state.rowStates.some((s) => s === 'solo');
  }

  isRowMuted(row: number): boolean {
    const s = this.state.rowStates[row];
    if (this.hasSoloRow()) return s !== 'solo';
    return s === 'muted';
  }

  private startRenderLoop(): void {
    const render = (): void => {
      this.render();
      requestAnimationFrame(render);
    };
    requestAnimationFrame(render);
  }

  private render(): void {
    const w = this.canvas.width / this.dpr;
    const h = this.canvas.height / this.dpr;
    this.ctx.clearRect(0, 0, w, h);

    this.ctx.fillStyle = '#1A1A2E';
    this.ctx.fillRect(0, 0, w, h);

    this.renderGrid();
    this.renderNotes();
    this.renderHighlight();
    this.renderDragging();
  }

  private renderGrid(): void {
    const cs = this.cellSize;
    const gap = GAP;
    for (let r = 0; r < GRID_ROWS; r++) {
      for (let c = 0; c < GRID_COLS; c++) {
        const x = this.gridX + c * (cs + gap);
        const y = this.gridY + r * (cs + gap);
        this.ctx.fillStyle = '#16213E';
        this.ctx.fillRect(x, y, cs, cs);
      }
    }
  }

  private renderNotes(): void {
    const cs = this.cellSize;
    const gap = GAP;
    const now = performance.now();
    const toDelete: string[] = [];

    this.state.notes.forEach((note, key) => {
      const muted = this.isRowMuted(note.row);
      let scale = 1;
      let animOpacity = 1;
      let isDeleting = false;

      if (note.deleteAnimStart !== undefined) {
        isDeleting = true;
        const t = Math.min(1, (now - note.deleteAnimStart) / ANIM_DURATION);
        animOpacity = 1 - t;
        scale = 1 + t * 0.3;
        if (t >= 1) toDelete.push(key);
      } else if (note.animationStart !== undefined) {
        const t = Math.min(1, (now - note.animationStart) / ANIM_DURATION);
        scale = 0.5 + elasticOut(t) * 0.5;
        if (t >= 1) note.animationStart = undefined;
      }

      const x = this.gridX + note.col * (cs + gap);
      const y = this.gridY + note.row * (cs + gap);
      const size = cs * scale;
      const offset = (cs - size) / 2;

      const pitchIdx = PITCH_NAMES.indexOf(note.pitch);
      const baseColor = INSTRUMENT_COLORS[note.instrument];
      const adjusted = adjustColor(baseColor, note.volume, pitchIdx >= 0 ? pitchIdx : 12);
      const alpha = muted ? 0.5 : animOpacity;

      this.ctx.globalAlpha = alpha;
      this.ctx.fillStyle = adjusted;
      this.ctx.beginPath();
      const radius = 8;
      const nx = x + offset;
      const ny = y + offset;
      this.ctx.moveTo(nx + radius, ny);
      this.ctx.lineTo(nx + size - radius, ny);
      this.ctx.quadraticCurveTo(nx + size, ny, nx + size, ny + radius);
      this.ctx.lineTo(nx + size, ny + size - radius);
      this.ctx.quadraticCurveTo(nx + size, ny + size, nx + size - radius, ny + size);
      this.ctx.lineTo(nx + radius, ny + size);
      this.ctx.quadraticCurveTo(nx, ny + size, nx, ny + size - radius);
      this.ctx.lineTo(nx, ny + radius);
      this.ctx.quadraticCurveTo(nx, ny, nx + radius, ny);
      this.ctx.closePath();
      this.ctx.fill();

      if (!isDeleting) {
        this.ctx.globalAlpha = muted ? 0.35 : 0.9;
        this.ctx.fillStyle = '#FFFFFF';
        this.ctx.font = `${Math.round(cs * 0.28)}px -apple-system, "PingFang SC", "Microsoft YaHei", sans-serif`;
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText(note.pitch, x + cs / 2, y + cs / 2);
      }
      this.ctx.globalAlpha = 1;
    });

    for (const k of toDelete) this.state.notes.delete(k);
  }

  private renderHighlight(): void {
    if (!this.state.isPlaying) return;
    const cs = this.cellSize;
    const gap = GAP;
    const step = this.state.currentStep;
    const x = this.gridX + step * (cs + gap);
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
    this.ctx.fillRect(x, this.gridY, cs, this.gridH);

    for (let r = 0; r < GRID_ROWS; r++) {
      const key = noteKey(r, step);
      const note = this.state.notes.get(key);
      if (note && !this.isRowMuted(r)) {
        const cx = this.gridX + step * (cs + gap);
        const cy = this.gridY + r * (cs + gap);
        this.ctx.strokeStyle = 'rgba(230, 179, 51, 0.9)';
        this.ctx.lineWidth = 3;
        this.ctx.strokeRect(cx + 1.5, cy + 1.5, cs - 3, cs - 3);
      }
    }
  }

  private renderDragging(): void {
    const d = this.state.draggingNote;
    if (!d) return;
    const size = this.cellSize;
    const color = INSTRUMENT_COLORS[d.instrument];
    this.ctx.globalAlpha = 0.6;
    this.ctx.fillStyle = color;
    this.ctx.beginPath();
    const radius = 8;
    const x = d.x - size / 2;
    const y = d.y - size / 2;
    this.ctx.moveTo(x + radius, y);
    this.ctx.lineTo(x + size - radius, y);
    this.ctx.quadraticCurveTo(x + size, y, x + size, y + radius);
    this.ctx.lineTo(x + size, y + size - radius);
    this.ctx.quadraticCurveTo(x + size, y + size, x + size - radius, y + size);
    this.ctx.lineTo(x + radius, y + size);
    this.ctx.quadraticCurveTo(x, y + size, x, y + size - radius);
    this.ctx.lineTo(x, y + radius);
    this.ctx.quadraticCurveTo(x, y, x + radius, y);
    this.ctx.closePath();
    this.ctx.fill();
    this.ctx.globalAlpha = 1;
  }
}
