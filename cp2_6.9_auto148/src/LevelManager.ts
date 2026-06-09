import Matter from 'matter-js';

const { Bodies } = Matter;

export interface WallData {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface SpikeData {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface PlatformData {
  x: number;
  y: number;
  w: number;
  h: number;
  direction: 'horizontal' | 'vertical';
  range: number;
  speed: number;
}

export interface BreakableWallData {
  x: number;
  y: number;
  cols: number;
  rows: number;
  brickSize: number;
}

export interface GoalData {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface CheckPoint {
  x: number;
  y: number;
}

export interface LevelData {
  id: number;
  walls: WallData[];
  spikes: SpikeData[];
  platforms: PlatformData[];
  breakableWalls: BreakableWallData[];
  goal: GoalData;
  checkpoints: CheckPoint[];
  playerStart: { x: number; y: number };
  rewindCount: number;
}

export interface LevelBodies {
  walls: Matter.Body[];
  spikes: Matter.Body[];
  platforms: Matter.Body[];
  bricks: Matter.Body[];
  goal: Matter.Body;
  platformData: PlatformData[];
}

const LEVELS: LevelData[] = [
  {
    id: 1,
    playerStart: { x: 60, y: 500 },
    rewindCount: 3,
    walls: [
      { x: 400, y: 590, w: 800, h: 20 },
      { x: 10, y: 300, w: 20, h: 600 },
      { x: 790, y: 300, w: 20, h: 600 },
      { x: 400, y: 10, w: 800, h: 20 },
      { x: 200, y: 480, w: 120, h: 20 },
      { x: 450, y: 400, w: 120, h: 20 },
      { x: 650, y: 320, w: 100, h: 20 },
    ],
    spikes: [
      { x: 320, y: 575, w: 100, h: 15 },
    ],
    platforms: [
      {
        x: 350, y: 500, w: 80, h: 15,
        direction: 'horizontal',
        range: 80,
        speed: 2
      }
    ],
    breakableWalls: [
      { x: 560, y: 360, cols: 4, rows: 2, brickSize: 20 }
    ],
    goal: { x: 720, y: 280, w: 30, h: 40 },
    checkpoints: [
      { x: 60, y: 500 },
      { x: 200, y: 440 },
      { x: 450, y: 360 },
    ]
  },
  {
    id: 2,
    playerStart: { x: 50, y: 500 },
    rewindCount: 4,
    walls: [
      { x: 400, y: 590, w: 800, h: 20 },
      { x: 10, y: 300, w: 20, h: 600 },
      { x: 790, y: 300, w: 20, h: 600 },
      { x: 400, y: 10, w: 800, h: 20 },
      { x: 150, y: 500, w: 80, h: 20 },
      { x: 350, y: 430, w: 100, h: 20 },
      { x: 550, y: 350, w: 80, h: 20 },
      { x: 300, y: 250, w: 100, h: 20 },
      { x: 650, y: 180, w: 120, h: 20 },
    ],
    spikes: [
      { x: 250, y: 575, w: 80, h: 15 },
      { x: 470, y: 575, w: 80, h: 15 },
    ],
    platforms: [
      {
        x: 250, y: 380, w: 70, h: 15,
        direction: 'vertical',
        range: 80,
        speed: 2
      },
      {
        x: 500, y: 280, w: 70, h: 15,
        direction: 'horizontal',
        range: 80,
        speed: 2
      }
    ],
    breakableWalls: [
      { x: 420, y: 390, cols: 5, rows: 2, brickSize: 20 }
    ],
    goal: { x: 700, y: 140, w: 30, h: 40 },
    checkpoints: [
      { x: 50, y: 500 },
      { x: 150, y: 460 },
      { x: 350, y: 390 },
      { x: 550, y: 310 },
    ]
  },
  {
    id: 3,
    playerStart: { x: 50, y: 500 },
    rewindCount: 5,
    walls: [
      { x: 400, y: 590, w: 800, h: 20 },
      { x: 10, y: 300, w: 20, h: 600 },
      { x: 790, y: 300, w: 20, h: 600 },
      { x: 400, y: 10, w: 800, h: 20 },
      { x: 100, y: 500, w: 60, h: 20 },
      { x: 250, y: 440, w: 60, h: 20 },
      { x: 400, y: 380, w: 60, h: 20 },
      { x: 550, y: 320, w: 60, h: 20 },
      { x: 400, y: 240, w: 60, h: 20 },
      { x: 200, y: 180, w: 60, h: 20 },
      { x: 600, y: 120, w: 150, h: 20 },
    ],
    spikes: [
      { x: 180, y: 575, w: 60, h: 15 },
      { x: 330, y: 575, w: 60, h: 15 },
      { x: 480, y: 575, w: 60, h: 15 },
      { x: 630, y: 575, w: 60, h: 15 },
    ],
    platforms: [
      {
        x: 170, y: 380, w: 60, h: 15,
        direction: 'vertical',
        range: 80,
        speed: 2
      },
      {
        x: 330, y: 300, w: 60, h: 15,
        direction: 'horizontal',
        range: 80,
        speed: 2
      },
      {
        x: 480, y: 180, w: 60, h: 15,
        direction: 'vertical',
        range: 80,
        speed: 2
      }
    ],
    breakableWalls: [
      { x: 130, y: 460, cols: 6, rows: 2, brickSize: 20 },
      { x: 280, y: 400, cols: 6, rows: 2, brickSize: 20 }
    ],
    goal: { x: 680, y: 80, w: 30, h: 40 },
    checkpoints: [
      { x: 50, y: 500 },
      { x: 100, y: 460 },
      { x: 400, y: 340 },
      { x: 200, y: 140 },
    ]
  }
];

export class LevelManager {
  private currentLevelId: number = 1;

  getTotalLevels(): number {
    return LEVELS.length;
  }

  getLevelData(levelId: number): LevelData | null {
    return LEVELS.find(l => l.id === levelId) || null;
  }

  getCurrentLevelData(): LevelData | null {
    return this.getLevelData(this.currentLevelId);
  }

  setCurrentLevel(levelId: number): void {
    this.currentLevelId = levelId;
  }

  buildLevel(levelId: number): LevelBodies | null {
    const levelData = this.getLevelData(levelId);
    if (!levelData) return null;

    this.currentLevelId = levelId;

    const walls: Matter.Body[] = levelData.walls.map(w =>
      Bodies.rectangle(w.x, w.y, w.w, w.h, {
        isStatic: true,
        label: 'wall',
        render: { fillStyle: '#888888' }
      })
    );

    const spikes: Matter.Body[] = levelData.spikes.map(s =>
      Bodies.rectangle(s.x, s.y, s.w, s.h, {
        isStatic: true,
        isSensor: true,
        label: 'spike',
        render: { fillStyle: '#FF5555' }
      })
    );

    const platforms: Matter.Body[] = levelData.platforms.map((p, i) =>
      Bodies.rectangle(p.x, p.y, p.w, p.h, {
        isStatic: true,
        label: `platform_${i}`,
        render: { fillStyle: '#CCAA66' }
      })
    );

    const bricks: Matter.Body[] = [];
    levelData.breakableWalls.forEach(bw => {
      for (let row = 0; row < bw.rows; row++) {
        for (let col = 0; col < bw.cols; col++) {
          const bx = bw.x + col * bw.brickSize;
          const by = bw.y + row * bw.brickSize;
          bricks.push(
            Bodies.rectangle(bx, by, bw.brickSize - 2, bw.brickSize - 2, {
              isStatic: false,
              density: 0.001,
              friction: 0.5,
              label: 'brick',
              render: { fillStyle: '#AA7744' }
            })
          );
        }
      }
    });

    const goal = Bodies.rectangle(
      levelData.goal.x,
      levelData.goal.y,
      levelData.goal.w,
      levelData.goal.h,
      {
        isStatic: true,
        isSensor: true,
        label: 'goal',
        render: { fillStyle: '#00FF88' }
      }
    );

    return {
      walls,
      spikes,
      platforms,
      bricks,
      goal,
      platformData: levelData.platforms
    };
  }

  getCheckPoints(levelId: number): CheckPoint[] {
    const levelData = this.getLevelData(levelId);
    return levelData ? levelData.checkpoints : [];
  }
}
