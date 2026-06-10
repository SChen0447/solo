import { NoteBlock, NoteBlockState } from './noteBlock';
import { MusicEngine } from './musicEngine';

export type UndoAction =
  | { type: 'add'; blocks: NoteBlockState[] }
  | { type: 'remove'; blocks: NoteBlockState[] }
  | { type: 'move'; before: { id: string; x: number; y: number }[]; after: { id: string; x: number; y: number }[] };

export interface GlobalParams {
  noteDuration: number;
  glowRadius: number;
  backgroundBrightness: number;
}

export interface UIControllerCallbacks {
  onClear: () => void;
  onSave: () => void;
  onRandom: () => void;
  onUndo: (action: UndoAction) => void;
  onParamsChange: (params: GlobalParams) => void;
}

export class UIController {
  private params: GlobalParams = {
    noteDuration: 0.5,
    glowRadius: 40,
    backgroundBrightness: 50,
  };

  private undoStack: UndoAction[] = [];
  private readonly MAX_UNDO = 20;
  private callbacks: UIControllerCallbacks;
  private musicEngine: MusicEngine;

  private durationSlider!: HTMLInputElement;
  private durationValue!: HTMLSpanElement;
  private glowSlider!: HTMLInputElement;
  private glowValue!: HTMLSpanElement;
  private brightnessSlider!: HTMLInputElement;
  private brightnessValue!: HTMLSpanElement;
  private clearBtn!: HTMLButtonElement;
  private saveBtn!: HTMLButtonElement;
  private randomBtn!: HTMLButtonElement;
  private noteCountEl!: HTMLSpanElement;
  private undoCountEl!: HTMLSpanElement;

  constructor(callbacks: UIControllerCallbacks, musicEngine: MusicEngine) {
    this.callbacks = callbacks;
    this.musicEngine = musicEngine;
    this.initElements();
    this.bindEvents();
    this.updateSliderValues();
  }

  private initElements(): void {
    this.durationSlider = document.getElementById('durationSlider') as HTMLInputElement;
    this.durationValue = document.getElementById('durationValue') as HTMLSpanElement;
    this.glowSlider = document.getElementById('glowSlider') as HTMLInputElement;
    this.glowValue = document.getElementById('glowValue') as HTMLSpanElement;
    this.brightnessSlider = document.getElementById('brightnessSlider') as HTMLInputElement;
    this.brightnessValue = document.getElementById('brightnessValue') as HTMLSpanElement;
    this.clearBtn = document.getElementById('clearBtn') as HTMLButtonElement;
    this.saveBtn = document.getElementById('saveBtn') as HTMLButtonElement;
    this.randomBtn = document.getElementById('randomBtn') as HTMLButtonElement;
    this.noteCountEl = document.getElementById('noteCount') as HTMLSpanElement;
    this.undoCountEl = document.getElementById('undoCount') as HTMLSpanElement;
  }

  private bindEvents(): void {
    this.durationSlider.addEventListener('input', () => {
      this.params.noteDuration = parseFloat(this.durationSlider.value);
      this.musicEngine.setNoteDuration(this.params.noteDuration);
      this.updateSliderValues();
      this.callbacks.onParamsChange(this.params);
    });

    this.glowSlider.addEventListener('input', () => {
      this.params.glowRadius = parseFloat(this.glowSlider.value);
      this.updateSliderValues();
      this.callbacks.onParamsChange(this.params);
    });

    this.brightnessSlider.addEventListener('input', () => {
      this.params.backgroundBrightness = parseFloat(this.brightnessSlider.value);
      this.updateSliderValues();
      this.callbacks.onParamsChange(this.params);
    });

    this.clearBtn.addEventListener('click', () => this.callbacks.onClear());
    this.saveBtn.addEventListener('click', () => this.callbacks.onSave());
    this.randomBtn.addEventListener('click', () => this.callbacks.onRandom());

    document.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        this.performUndo();
      }
    });
  }

  private updateSliderValues(): void {
    this.updateSliderLabel(this.durationSlider, this.durationValue, `${this.params.noteDuration.toFixed(1)}s`);
    this.updateSliderLabel(this.glowSlider, this.glowValue, `${this.params.glowRadius.toFixed(0)}px`);
    this.updateSliderLabel(this.brightnessSlider, this.brightnessValue, `${this.params.backgroundBrightness.toFixed(0)}%`);
  }

  private updateSliderLabel(slider: HTMLInputElement, label: HTMLSpanElement, text: string): void {
    label.textContent = text;
    const min = parseFloat(slider.min);
    const max = parseFloat(slider.max);
    const value = parseFloat(slider.value);
    const percent = ((value - min) / (max - min)) * 100;
    label.style.left = `${percent}%`;
  }

  public getParams(): GlobalParams {
    return { ...this.params };
  }

  public pushUndo(action: UndoAction): void {
    this.undoStack.push(action);
    if (this.undoStack.length > this.MAX_UNDO) {
      this.undoStack.shift();
    }
    this.updateStatusBar(0);
  }

  public performUndo(): void {
    const action = this.undoStack.pop();
    if (action) {
      this.callbacks.onUndo(action);
    }
  }

  public clearUndoStack(): void {
    this.undoStack = [];
  }

  public updateStatusBar(noteCount: number): void {
    this.noteCountEl.textContent = `音符块：${noteCount}`;
    this.undoCountEl.textContent = `撤销栈：${this.undoStack.length} / ${this.MAX_UNDO}`;
  }

  public getUndoStackDepth(): number {
    return this.undoStack.length;
  }

  public downloadBlocksJSON(blocks: NoteBlock[]): void {
    const data = blocks.map((b) => b.getState());
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sound-trace-wall-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}
