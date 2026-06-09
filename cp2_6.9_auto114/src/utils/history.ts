export class HistoryStack<T> {
  private past: T[] = [];
  private future: T[] = [];
  private maxDepth: number;

  constructor(maxDepth = 20) {
    this.maxDepth = maxDepth;
  }

  private deepClone(value: T): T {
    return JSON.parse(JSON.stringify(value));
  }

  push(state: T): void {
    this.past.push(this.deepClone(state));
    if (this.past.length > this.maxDepth) {
      this.past.shift();
    }
    this.future = [];
  }

  undo(current: T): T | null {
    if (this.past.length === 0) return null;
    this.future.push(this.deepClone(current));
    return this.past.pop()!;
  }

  redo(current: T): T | null {
    if (this.future.length === 0) return null;
    this.past.push(this.deepClone(current));
    return this.future.pop()!;
  }

  canUndo(): boolean {
    return this.past.length > 0;
  }

  canRedo(): boolean {
    return this.future.length > 0;
  }

  clear(): void {
    this.past = [];
    this.future = [];
  }
}
