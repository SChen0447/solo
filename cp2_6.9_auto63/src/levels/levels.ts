import { LevelData, GAME_CONFIG } from '../types';

export const LEVEL_1: LevelData = {
  name: '第 1 关：初识磁力',
  worldWidth: GAME_CONFIG.WORLD_WIDTH,
  worldHeight: GAME_CONFIG.WORLD_HEIGHT,
  gravity: GAME_CONFIG.GRAVITY,
  playerStart: { x: 100, y: 500 },
  blocks: [
    { id: 0, position: { x: 400, y: 600 }, mass: 2, size: GAME_CONFIG.BLOCK_SIZE },
    { id: 1, position: { x: 700, y: 600 }, mass: 1, size: GAME_CONFIG.BLOCK_SIZE },
  ],
  plates: [
    {
      id: 0,
      position: { x: 250, y: 665 },
      size: { x: 60, y: 15 },
      activated: false,
      targetBlockId: 0,
    },
    {
      id: 1,
      position: { x: 950, y: 665 },
      size: { x: 60, y: 15 },
      activated: false,
      targetBlockId: 1,
    },
  ],
  exit: {
    position: { x: 1180, y: 615 },
    size: { x: 50, y: 50 },
    unlocked: false,
    particles: [],
  },
  platforms: [
    {
      id: 0,
      position: { x: 0, y: 680 },
      size: { x: GAME_CONFIG.WORLD_WIDTH, y: 40 },
      initialPosition: { x: 0, y: 680 },
    },
    {
      id: 1,
      position: { x: 300, y: 520 },
      size: { x: 150, y: 20 },
      initialPosition: { x: 300, y: 520 },
    },
    {
      id: 2,
      position: { x: 800, y: 460 },
      size: { x: 150, y: 20 },
      initialPosition: { x: 800, y: 460 },
    },
  ],
};

export const LEVEL_2: LevelData = {
  name: '第 2 关：移动平台',
  worldWidth: GAME_CONFIG.WORLD_WIDTH,
  worldHeight: GAME_CONFIG.WORLD_HEIGHT,
  gravity: GAME_CONFIG.GRAVITY,
  playerStart: { x: 80, y: 500 },
  blocks: [
    { id: 0, position: { x: 300, y: 600 }, mass: 1, size: GAME_CONFIG.BLOCK_SIZE },
    { id: 1, position: { x: 600, y: 300 }, mass: 2, size: GAME_CONFIG.BLOCK_SIZE },
    { id: 2, position: { x: 1000, y: 600 }, mass: 3, size: GAME_CONFIG.BLOCK_SIZE },
  ],
  plates: [
    {
      id: 0,
      position: { x: 180, y: 665 },
      size: { x: 60, y: 15 },
      activated: false,
      targetBlockId: 0,
    },
    {
      id: 1,
      position: { x: 580, y: 665 },
      size: { x: 60, y: 15 },
      activated: false,
      targetBlockId: 1,
    },
    {
      id: 2,
      position: { x: 1100, y: 385 },
      size: { x: 60, y: 15 },
      activated: false,
      targetBlockId: 2,
    },
  ],
  exit: {
    position: { x: 1180, y: 320 },
    size: { x: 50, y: 50 },
    unlocked: false,
    particles: [],
  },
  platforms: [
    {
      id: 0,
      position: { x: 0, y: 680 },
      size: { x: GAME_CONFIG.WORLD_WIDTH, y: 40 },
      initialPosition: { x: 0, y: 680 },
    },
    {
      id: 1,
      position: { x: 200, y: 420 },
      size: { x: 140, y: 20 },
      initialPosition: { x: 200, y: 420 },
      path: [
        { x: 200, y: 420 },
        { x: 450, y: 420 },
      ],
      pathSpeed: 100,
      pathIndex: 0,
      pathProgress: 0,
    },
    {
      id: 2,
      position: { x: 700, y: 350 },
      size: { x: 140, y: 20 },
      initialPosition: { x: 700, y: 350 },
      path: [
        { x: 700, y: 350 },
        { x: 700, y: 500 },
      ],
      pathSpeed: 100,
      pathIndex: 0,
      pathProgress: 0,
    },
    {
      id: 3,
      position: { x: 1050, y: 400 },
      size: { x: 200, y: 20 },
      initialPosition: { x: 1050, y: 400 },
    },
  ],
};

export const LEVEL_3: LevelData = {
  name: '第 3 关：时间挑战',
  worldWidth: GAME_CONFIG.WORLD_WIDTH,
  worldHeight: GAME_CONFIG.WORLD_HEIGHT,
  gravity: GAME_CONFIG.GRAVITY,
  timeLimit: 60,
  playerStart: { x: 80, y: 500 },
  blocks: [
    { id: 0, position: { x: 250, y: 600 }, mass: 1, size: GAME_CONFIG.BLOCK_SIZE },
    { id: 1, position: { x: 500, y: 350 }, mass: 2, size: GAME_CONFIG.BLOCK_SIZE },
    { id: 2, position: { x: 800, y: 600 }, mass: 3, size: GAME_CONFIG.BLOCK_SIZE },
    { id: 3, position: { x: 1050, y: 250 }, mass: 2, size: GAME_CONFIG.BLOCK_SIZE },
  ],
  plates: [
    {
      id: 0,
      position: { x: 120, y: 665 },
      size: { x: 60, y: 15 },
      activated: false,
      targetBlockId: 0,
    },
    {
      id: 1,
      position: { x: 420, y: 665 },
      size: { x: 60, y: 15 },
      activated: false,
      targetBlockId: 1,
    },
    {
      id: 2,
      position: { x: 720, y: 665 },
      size: { x: 60, y: 15 },
      activated: false,
      targetBlockId: 2,
    },
    {
      id: 3,
      position: { x: 1160, y: 665 },
      size: { x: 60, y: 15 },
      activated: false,
      targetBlockId: 3,
    },
  ],
  exit: {
    position: { x: 615, y: 130 },
    size: { x: 50, y: 50 },
    unlocked: false,
    particles: [],
  },
  platforms: [
    {
      id: 0,
      position: { x: 0, y: 680 },
      size: { x: GAME_CONFIG.WORLD_WIDTH, y: 40 },
      initialPosition: { x: 0, y: 680 },
    },
    {
      id: 1,
      position: { x: 400, y: 450 },
      size: { x: 180, y: 20 },
      initialPosition: { x: 400, y: 450 },
    },
    {
      id: 2,
      position: { x: 950, y: 350 },
      size: { x: 180, y: 20 },
      initialPosition: { x: 950, y: 350 },
    },
    {
      id: 3,
      position: { x: 550, y: 180 },
      size: { x: 180, y: 20 },
      initialPosition: { x: 550, y: 180 },
    },
    {
      id: 4,
      position: { x: 150, y: 320 },
      size: { x: 120, y: 20 },
      initialPosition: { x: 150, y: 320 },
      path: [
        { x: 150, y: 320 },
        { x: 150, y: 500 },
      ],
      pathSpeed: 120,
      pathIndex: 0,
      pathProgress: 0,
    },
  ],
};

export const ALL_LEVELS: LevelData[] = [LEVEL_1, LEVEL_2, LEVEL_3];
