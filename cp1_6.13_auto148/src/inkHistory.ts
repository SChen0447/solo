import type { Stroke } from './brushEngine';

export type HistoryListener = (strokes: Stroke[]) => void;

export class InkHistory {
  private done: Stroke[] = [];
  private undone: Stroke[] = [];
  private listeners: Set<HistoryListener> = new Set();
  private readonly MAX_HISTORY = 100;

  public getStrokes(): Stroke[] {
    return [...this.done];
  }

  public canUndo(): boolean {
    return this.done.length > 0;
  }

  public canRedo(): boolean {
    return this.undone.length > 0;
  }

  public push(stroke: Stroke): void {
    this.done.push(stroke);
    if (this.done.length > this.MAX_HISTORY) {
      this.done.shift();
    }
    this.undone = [];
    this.notify();
  }

  public undo(): Stroke | null {
    if (!this.canUndo()) return null;
    const stroke = this.done.pop()!;
    this.undone.push(stroke);
    this.notify();
    return stroke;
  }

  public redo(): Stroke | null {
    if (!this.canRedo()) return null;
    const stroke = this.undone.pop()!;
    this.done.push(stroke);
    this.notify();
    return stroke;
  }

  public clear(): void {
    this.done = [];
    this.undone = [];
    this.notify();
  }

  public subscribe(listener: HistoryListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    const strokes = this.getStrokes();
    for (const listener of this.listeners) {
      listener(strokes);
    }
  }
}
