export interface HexCoord {
  x: number;
  y: number;
}

export interface PathNode extends HexCoord {
  weight: number;
}

export type CellType = 'grass' | 'obstacle';

export interface GridCell extends HexCoord {
  type: CellType;
}

export type GameMode = 'idle' | 'setStart' | 'setEnd' | 'edit';

export interface GameState {
  grid: CellType[][];
  start: HexCoord | null;
  end: HexCoord | null;
  path: PathNode[];
  mode: GameMode;
  isAnimating: boolean;
  error: string | null;
}
