export enum Direction {
  UP = 0,
  RIGHT = 1,
  DOWN = 2,
  LEFT = 3
}

export type TrackType = 'straight' | 'curve' | 'switch';

export interface GridPos {
  x: number;
  y: number;
}

export interface TrackCell {
  type: TrackType | null;
  rotation: number;
}

export interface Train {
  id: string;
  color: 'green' | 'red';
  position: GridPos;
  prevPosition: GridPos;
  pixelProgress: number;
  direction: Direction;
  speed: number;
  isMoving: boolean;
  isWaiting: boolean;
  waitTimer: number;
  waitReason: string | null;
  reachedDestination: boolean;
  startStation: GridPos;
  targetStation: GridPos;
}

export interface SignalLight {
  id: string;
  position: GridPos;
  state: 'green' | 'red';
  timer: number;
  nextChangeTime: number;
}

export interface AnimalEvent {
  id: string;
  position: GridPos;
  direction: Direction;
  moveTimer: number;
  duration: number;
  active: boolean;
  startPos: GridPos;
  endPos: GridPos;
  progress: number;
}

export interface LevelConfig {
  level: number;
  gridSize: number;
  stations: { green: GridPos; red: GridPos };
  obstacles: GridPos[];
  maxTracks: number;
  signalCount: number;
  eventFrequency: number;
  timeLimit: number;
}

export interface ReplayFrame {
  timestamp: number;
  trains: Array<{
    id: string;
    color: 'green' | 'red';
    position: GridPos;
    pixelProgress: number;
    direction: Direction;
    isWaiting: boolean;
    waitReason: string | null;
    reachedDestination: boolean;
  }>;
  signals: Array<{ id: string; position: GridPos; state: 'green' | 'red' }>;
  animals: Array<{ id: string; position: GridPos; active: boolean; progress: number; direction: Direction }>;
  logs: string[];
}

export type GameState = 'editing' | 'running' | 'finished' | 'replaying';

export function posEquals(a: GridPos, b: GridPos): boolean {
  return a.x === b.x && a.y === b.y;
}

export function directionToDelta(dir: Direction): { dx: number; dy: number } {
  switch (dir) {
    case Direction.UP: return { dx: 0, dy: -1 };
    case Direction.RIGHT: return { dx: 1, dy: 0 };
    case Direction.DOWN: return { dx: 0, dy: 1 };
    case Direction.LEFT: return { dx: -1, dy: 0 };
  }
}

export function oppositeDirection(dir: Direction): Direction {
  return (dir + 2) % 4;
}

export function getTrackConnections(type: TrackType, rotation: number): Direction[] {
  const rotSteps = Math.floor(((rotation % 360) + 360) % 360 / 90);
  let base: Direction[] = [];

  switch (type) {
    case 'straight':
      base = [Direction.UP, Direction.DOWN];
      break;
    case 'curve':
      base = [Direction.UP, Direction.RIGHT];
      break;
    case 'switch':
      base = [Direction.UP, Direction.RIGHT, Direction.DOWN];
      break;
  }

  return base.map(d => ((d + rotSteps) % 4) as Direction);
}

export function nextTrackDirection(
  enterDir: Direction,
  trackType: TrackType,
  rotation: number
): Direction | null {
  const connections = getTrackConnections(trackType, rotation);
  const incoming = oppositeDirection(enterDir);

  if (!connections.includes(incoming)) {
    return null;
  }

  const exitOptions = connections.filter(d => d !== incoming);
  if (exitOptions.length === 0) return null;

  return exitOptions[0];
}
