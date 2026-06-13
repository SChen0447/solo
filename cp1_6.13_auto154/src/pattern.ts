export type ShapeType = 'free' | 'circle' | 'triangle' | 'rectangle';
export type WeaveMode = 'mirror' | 'rotation' | 'kaleidoscope';

export interface Point {
  x: number;
  y: number;
}

export interface BaseShape {
  id: string;
  type: ShapeType;
  points: Point[];
  color: string;
  lineWidth: number;
  createdAt: number;
}

export interface PatternState {
  shapes: BaseShape[];
  symmetry: number;
  weaveMode: WeaveMode;
  palette: [string, string, string];
}

const MAX_HISTORY = 20;

function generateId(): string {
  return `shape_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function cloneState(state: PatternState): PatternState {
  return {
    shapes: state.shapes.map((s) => ({
      ...s,
      points: s.points.map((p) => ({ ...p }))
    })),
    symmetry: state.symmetry,
    weaveMode: state.weaveMode,
    palette: [...state.palette] as [string, string, string]
  };
}

export class PatternManager {
  private state: PatternState;
  private history: PatternState[] = [];
  private historyIndex: number = -1;

  constructor() {
    this.state = {
      shapes: [],
      symmetry: 6,
      weaveMode: 'mirror',
      palette: ['#6366f1', '#f472b6', '#34d399']
    };
    this.saveHistory();
  }

  private saveHistory(): void {
    if (this.historyIndex < this.history.length - 1) {
      this.history = this.history.slice(0, this.historyIndex + 1);
    }
    this.history.push(cloneState(this.state));
    if (this.history.length > MAX_HISTORY + 1) {
      this.history.shift();
    } else {
      this.historyIndex++;
    }
  }

  getState(): PatternState {
    return this.state;
  }

  getShapes(): BaseShape[] {
    return this.state.shapes;
  }

  getSymmetry(): number {
    return this.state.symmetry;
  }

  setSymmetry(symmetry: number): void {
    const clamped = Math.max(1, Math.min(12, Math.floor(symmetry)));
    if (this.state.symmetry !== clamped) {
      this.state.symmetry = clamped;
      this.saveHistory();
    }
  }

  getWeaveMode(): WeaveMode {
    return this.state.weaveMode;
  }

  setWeaveMode(mode: WeaveMode): void {
    if (this.state.weaveMode !== mode) {
      this.state.weaveMode = mode;
      this.saveHistory();
    }
  }

  getPalette(): [string, string, string] {
    return this.state.palette;
  }

  setPaletteSlot(index: 0 | 1 | 2, color: string): void {
    if (this.state.palette[index] !== color) {
      this.state.palette[index] = color;
    }
  }

  setCurrentColor(color: string): void {
    this.setPaletteSlot(0, color);
  }

  getCurrentColor(): string {
    return this.state.palette[0];
  }

  addShape(
    type: ShapeType,
    points: Point[],
    color: string,
    lineWidth: number
  ): BaseShape | null {
    if (points.length < 2) return null;
    const shape: BaseShape = {
      id: generateId(),
      type,
      points: points.map((p) => ({ ...p })),
      color,
      lineWidth,
      createdAt: performance.now()
    };
    this.state.shapes.push(shape);
    this.saveHistory();
    return shape;
  }

  clear(): void {
    if (this.state.shapes.length > 0) {
      this.state.shapes = [];
      this.saveHistory();
    }
  }

  canUndo(): boolean {
    return this.historyIndex > 0;
  }

  canRedo(): boolean {
    return this.historyIndex < this.history.length - 1;
  }

  undo(): boolean {
    if (!this.canUndo()) return false;
    this.historyIndex--;
    this.state = cloneState(this.history[this.historyIndex]);
    return true;
  }

  redo(): boolean {
    if (!this.canRedo()) return false;
    this.historyIndex++;
    this.state = cloneState(this.history[this.historyIndex]);
    return true;
  }
}
