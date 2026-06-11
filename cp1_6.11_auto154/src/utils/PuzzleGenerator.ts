export enum Direction {
  UP = 0,
  RIGHT = 1,
  DOWN = 2,
  LEFT = 3
}

export enum StatueType {
  HORUS = 'horus',
  ANUBIS = 'anubis',
  SET = 'set'
}

export interface StatueConfig {
  id: string;
  type: StatueType;
  x: number;
  y: number;
  rotation: number;
  isMirror: boolean;
}

export interface ScarabConfig {
  id: string;
  x: number;
  y: number;
  rotation: number;
}

export interface PuzzleConfig {
  level: number;
  maxSteps: number;
  sourcePosition: { x: number; y: number };
  sourceDirection: Direction;
  targetPosition: { x: number; y: number };
  statues: StatueConfig[];
  scarabs: ScarabConfig[];
  doorPosition: { x: number; y: number };
  doorSize: { width: number; height: number };
  solutionHint: { statueId: string; correctRotation: number };
  solutionPath: string[];
}

const LEVEL_CONFIGS = [
  { maxSteps: 15, statueCount: 6, scarabCount: 0 },
  { maxSteps: 12, statueCount: 6, scarabCount: 1 },
  { maxSteps: 10, statueCount: 6, scarabCount: 1 }
];

export class PuzzleGenerator {
  private static readonly GAME_WIDTH = 1024;
  private static readonly GAME_HEIGHT = 768;
  private static readonly DOOR_WIDTH = 200;
  private static readonly DOOR_HEIGHT = 260;
  private static readonly STATUE_SIZE = 60;

  public static generate(level: number): PuzzleConfig {
    const levelIndex = Math.min(level - 1, LEVEL_CONFIGS.length - 1);
    const config = LEVEL_CONFIGS[levelIndex];

    const doorX = this.GAME_WIDTH / 2;
    const doorY = this.GAME_HEIGHT / 2 + 20;

    const gemY = doorY - this.DOOR_HEIGHT / 2 - 20;
    const targetPosition = { x: doorX, y: gemY };

    const sourceY = 380;
    const sourcePosition = { x: 80, y: sourceY };
    const sourceDirection = Direction.RIGHT;

    const leftX = 220;
    const rightX = 804;

    const statues: StatueConfig[] = [];
    const types = [StatueType.HORUS, StatueType.ANUBIS, StatueType.SET];

    const leftYs = [180, 380, 580];
    for (let i = 0; i < 3; i++) {
      statues.push({
        id: `statue-left-${i}`,
        type: types[i],
        x: leftX,
        y: leftYs[i],
        rotation: 0,
        isMirror: true
      });
    }

    const rightYs = [250, 400, 580];
    for (let i = 0; i < 3; i++) {
      statues.push({
        id: `statue-right-${i}`,
        type: types[(i + 1) % 3],
        x: rightX,
        y: rightYs[i],
        rotation: 0,
        isMirror: true
      });
    }

    const solutionPath = this.setSolutionConfiguration(
      statues, level, sourceY, gemY, leftX, rightX, leftYs, rightYs
    );

    const scarabs: ScarabConfig[] = [];
    if (config.scarabCount > 0) {
      const scarabY = doorY + this.DOOR_HEIGHT / 2 + 60;
      scarabs.push({
        id: 'scarab-1',
        x: doorX,
        y: scarabY,
        rotation: 0
      });
    }

    const solutionStatue = statues.find(s => s.id === solutionPath[0]);
    const solutionHint = {
      statueId: solutionStatue ? solutionStatue.id : statues[0].id,
      correctRotation: solutionStatue ? solutionStatue.rotation : 0
    };

    this.randomizeStatues(statues);
    if (scarabs.length > 0) {
      this.randomizeScarabs(scarabs);
    }

    return {
      level,
      maxSteps: config.maxSteps,
      sourcePosition,
      sourceDirection,
      targetPosition,
      statues,
      scarabs,
      doorPosition: { x: doorX, y: doorY },
      doorSize: { width: this.DOOR_WIDTH, height: this.DOOR_HEIGHT },
      solutionHint,
      solutionPath
    };
  }

  private static setSolutionConfiguration(
    statues: StatueConfig[],
    level: number,
    sourceY: number,
    gemY: number,
    leftX: number,
    rightX: number,
    leftYs: number[],
    rightYs: number[]
  ): string[] {
    const leftMiddle = statues.find(s => s.id === 'statue-left-1');
    const leftBottom = statues.find(s => s.id === 'statue-left-2');
    const rightBottom = statues.find(s => s.id === 'statue-right-2');
    const rightTop = statues.find(s => s.id === 'statue-right-0');

    if (leftMiddle) leftMiddle.rotation = 1;
    if (leftBottom) leftBottom.rotation = 1;
    if (rightBottom) rightBottom.rotation = 0;
    if (rightTop) rightTop.rotation = 1;

    return [
      'statue-left-1',
      'statue-left-2',
      'statue-right-2',
      'statue-right-0'
    ];
  }

  private static randomizeStatues(statues: StatueConfig[]): void {
    statues.forEach(statue => {
      const randomRotations = Math.floor(Math.random() * 3) + 1;
      statue.rotation = (statue.rotation + randomRotations) % 4;
    });
  }

  private static randomizeScarabs(scarabs: ScarabConfig[]): void {
    scarabs.forEach(scarab => {
      const randomRotations = Math.floor(Math.random() * 2) + 1;
      scarab.rotation = (scarab.rotation + randomRotations * 2) % 4;
    });
  }

  public static getDirectionVector(direction: Direction): { dx: number; dy: number } {
    switch (direction) {
      case Direction.UP:
        return { dx: 0, dy: -1 };
      case Direction.RIGHT:
        return { dx: 1, dy: 0 };
      case Direction.DOWN:
        return { dx: 0, dy: 1 };
      case Direction.LEFT:
        return { dx: -1, dy: 0 };
    }
  }

  public static reflectDirection(incoming: Direction, mirrorRotation: number): Direction | null {
    const normalizedRotation = mirrorRotation % 4;
    const isSlash = normalizedRotation === 0 || normalizedRotation === 2;

    if (isSlash) {
      switch (incoming) {
        case Direction.RIGHT: return Direction.UP;
        case Direction.UP: return Direction.RIGHT;
        case Direction.LEFT: return Direction.DOWN;
        case Direction.DOWN: return Direction.LEFT;
      }
    } else {
      switch (incoming) {
        case Direction.RIGHT: return Direction.DOWN;
        case Direction.DOWN: return Direction.RIGHT;
        case Direction.LEFT: return Direction.UP;
        case Direction.UP: return Direction.LEFT;
      }
    }
  }
}
