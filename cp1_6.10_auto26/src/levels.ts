export type PolarType = 'N' | 'S';

export interface MagnetData {
  id: string;
  x: number;
  y: number;
  initialPolarity: PolarType;
}

export interface SpikeData {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface PortalData {
  id: string;
  x: number;
  y: number;
  targetId: string;
}

export interface WallData {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface LevelData {
  id: number;
  name: string;
  width: number;
  height: number;
  startX: number;
  startY: number;
  goalX: number;
  goalY: number;
  magnets: MagnetData[];
  spikes: SpikeData[];
  portals: PortalData[];
  walls: WallData[];
  gradeThresholds: { S: number; A: number; B: number };
}

export const LEVELS: LevelData[] = [
  {
    id: 1,
    name: '入门磁场',
    width: 2400,
    height: 800,
    startX: 100,
    startY: 400,
    goalX: 2280,
    goalY: 400,
    magnets: [
      { id: 'm1', x: 600, y: 300, initialPolarity: 'N' },
      { id: 'm2', x: 900, y: 500, initialPolarity: 'S' },
      { id: 'm3', x: 1300, y: 350, initialPolarity: 'S' },
      { id: 'm4', x: 1700, y: 450, initialPolarity: 'N' },
      { id: 'm5', x: 2000, y: 300, initialPolarity: 'S' }
    ],
    spikes: [
      { id: 's1', x: 1100, y: 100, width: 80, height: 80 },
      { id: 's2', x: 1100, y: 620, width: 80, height: 80 },
      { id: 's3', x: 1500, y: 200, width: 80, height: 80 }
    ],
    portals: [],
    walls: [
      { x: 0, y: 0, width: 2400, height: 20 },
      { x: 0, y: 780, width: 2400, height: 20 },
      { x: 0, y: 0, width: 20, height: 800 },
      { x: 2380, y: 0, width: 20, height: 800 },
      { x: 400, y: 0, width: 20, height: 250 },
      { x: 400, y: 550, width: 20, height: 250 },
      { x: 1900, y: 0, width: 20, height: 300 },
      { x: 1900, y: 500, width: 20, height: 300 }
    ],
    gradeThresholds: { S: 15, A: 25, B: 40 }
  },
  {
    id: 2,
    name: '传送迷径',
    width: 2800,
    height: 900,
    startX: 100,
    startY: 450,
    goalX: 2680,
    goalY: 450,
    magnets: [
      { id: 'm1', x: 500, y: 250, initialPolarity: 'S' },
      { id: 'm2', x: 500, y: 650, initialPolarity: 'N' },
      { id: 'm3', x: 1000, y: 450, initialPolarity: 'N' },
      { id: 'm4', x: 1500, y: 200, initialPolarity: 'S' },
      { id: 'm5', x: 1500, y: 700, initialPolarity: 'S' },
      { id: 'm6', x: 2100, y: 450, initialPolarity: 'N' }
    ],
    spikes: [
      { id: 's1', x: 800, y: 400, width: 100, height: 100 },
      { id: 's2', x: 1800, y: 300, width: 80, height: 80 },
      { id: 's3', x: 1800, y: 520, width: 80, height: 80 },
      { id: 's4', x: 2400, y: 150, width: 80, height: 80 },
      { id: 's5', x: 2400, y: 670, width: 80, height: 80 }
    ],
    portals: [
      { id: 'p1', x: 1200, y: 450, targetId: 'p2' },
      { id: 'p2', x: 2000, y: 450, targetId: 'p1' }
    ],
    walls: [
      { x: 0, y: 0, width: 2800, height: 20 },
      { x: 0, y: 880, width: 2800, height: 20 },
      { x: 0, y: 0, width: 20, height: 900 },
      { x: 2780, y: 0, width: 20, height: 900 },
      { x: 300, y: 0, width: 20, height: 350 },
      { x: 300, y: 550, width: 20, height: 350 },
      { x: 700, y: 200, width: 20, height: 500 },
      { x: 2500, y: 0, width: 20, height: 350 },
      { x: 2500, y: 550, width: 20, height: 350 }
    ],
    gradeThresholds: { S: 20, A: 35, B: 55 }
  },
  {
    id: 3,
    name: '磁极风暴',
    width: 3200,
    height: 1000,
    startX: 100,
    startY: 500,
    goalX: 3080,
    goalY: 500,
    magnets: [
      { id: 'm1', x: 400, y: 300, initialPolarity: 'N' },
      { id: 'm2', x: 400, y: 700, initialPolarity: 'S' },
      { id: 'm3', x: 800, y: 500, initialPolarity: 'S' },
      { id: 'm4', x: 1200, y: 250, initialPolarity: 'N' },
      { id: 'm5', x: 1200, y: 750, initialPolarity: 'N' },
      { id: 'm6', x: 1700, y: 500, initialPolarity: 'S' },
      { id: 'm7', x: 2200, y: 300, initialPolarity: 'N' },
      { id: 'm8', x: 2200, y: 700, initialPolarity: 'S' },
      { id: 'm9', x: 2700, y: 500, initialPolarity: 'N' }
    ],
    spikes: [
      { id: 's1', x: 600, y: 200, width: 80, height: 80 },
      { id: 's2', x: 600, y: 720, width: 80, height: 80 },
      { id: 's3', x: 1000, y: 450, width: 100, height: 100 },
      { id: 's4', x: 1450, y: 150, width: 80, height: 80 },
      { id: 's5', x: 1450, y: 770, width: 80, height: 80 },
      { id: 's6', x: 1950, y: 450, width: 100, height: 100 },
      { id: 's7', x: 2450, y: 200, width: 80, height: 80 },
      { id: 's8', x: 2450, y: 720, width: 80, height: 80 }
    ],
    portals: [
      { id: 'p1', x: 1600, y: 200, targetId: 'p2' },
      { id: 'p2', x: 1600, y: 800, targetId: 'p1' }
    ],
    walls: [
      { x: 0, y: 0, width: 3200, height: 20 },
      { x: 0, y: 980, width: 3200, height: 20 },
      { x: 0, y: 0, width: 20, height: 1000 },
      { x: 3180, y: 0, width: 20, height: 1000 },
      { x: 250, y: 0, width: 20, height: 400 },
      { x: 250, y: 600, width: 20, height: 400 },
      { x: 2900, y: 0, width: 20, height: 400 },
      { x: 2900, y: 600, width: 20, height: 400 }
    ],
    gradeThresholds: { S: 30, A: 50, B: 80 }
  }
];
