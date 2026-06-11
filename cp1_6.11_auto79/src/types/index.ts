export type CellType = 'wall' | 'path' | 'start' | 'end';

export type Direction = 'up' | 'down' | 'left' | 'right';

export interface Position {
  x: number;
  y: number;
}

export interface Fragment {
  id: string;
  position: Position;
  collected: boolean;
}

export interface Level {
  id: number;
  name: string;
  size: number;
  grid: CellType[][];
  start: Position;
  end: Position;
  fragments: Fragment[];
}

export type CommandType = 'forward' | 'turnLeft' | 'turnRight' | 'repeat' | 'ifWall';

export interface Command {
  id: string;
  type: CommandType;
  repeatCount?: number;
  children?: Command[];
  conditionType?: 'wallAhead';
  thenBranch?: Command[];
  elseBranch?: Command[];
}

export interface RobotState {
  position: Position;
  direction: Direction;
  collectedFragments: string[];
  steps: number;
}

export type GameStatus = 'idle' | 'running' | 'success' | 'failed';

export interface GameState {
  levels: Level[];
  currentLevelId: number;
  commands: Command[];
  robot: RobotState;
  gameStatus: GameStatus;
  isRunning: boolean;
  currentCommandIndex: number;
  highlightedBranch: 'then' | 'else' | null;
}
