import type { Stroke } from './brush';

export class UndoManager {
  private undoStack: Stroke[][] = [];
  private redoStack: Stroke[][] = [];
  private readonly maxUndo: number = 10;
  private readonly maxRedo: number = 5;

  saveState(strokes: Stroke[]): void {
    this.undoStack.push(this.deepClone(strokes));
    if (this.undoStack.length > this.maxUndo) {
      this.undoStack.shift();
    }
    this.redoStack = [];
  }

  undo(currentStrokes: Stroke[]): Stroke[] | null {
    if (this.undoStack.length === 0) return null;

    this.redoStack.push(this.deepClone(currentStrokes));
    if (this.redoStack.length > this.maxRedo) {
      this.redoStack.shift();
    }

    return this.undoStack.pop() ?? null;
  }

  redo(): Stroke[] | null {
    if (this.redoStack.length === 0) return null;
    return this.redoStack.pop() ?? null;
  }

  canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  getUndoCount(): number {
    return this.undoStack.length;
  }

  clear(): void {
    this.undoStack = [];
    this.redoStack = [];
  }

  private deepClone(strokes: Stroke[]): Stroke[] {
    return strokes.map((stroke) => ({
      ...stroke,
      points: stroke.points.map((p) => ({ ...p }))
    }));
  }
}
