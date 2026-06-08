import { Obstacle, Ball } from './physics';

export interface LightPoint {
  x: number;
  y: number;
  radius: number;
  lit: boolean;
  litProgress: number;
  pulseProgress: number;
  isPulsing: boolean;
}

export interface LevelData {
  id: number;
  obstacles: Obstacle[];
  lights: LightPoint[];
  launchPosition: { x: number; y: number };
}

export interface LevelState {
  currentLevel: number;
  lights: LightPoint[];
  obstacles: Obstacle[];
  launchPosition: { x: number; y: number };
  isComplete: boolean;
  completionProgress: number;
  blinkCount: number;
  blinkTimer: number;
}

const LIGHT_RADIUS = 15;
const LIGHT_LIT_DURATION = 0.3;
const LIGHT_PULSE_DURATION = 0.8;
const BLINK_INTERVAL = 0.25;
const TOTAL_BLINKS = 3;

export function createLevelState(): LevelState {
  return {
    currentLevel: 1,
    lights: [],
    obstacles: [],
    launchPosition: { x: 0, y: 0 },
    isComplete: false,
    completionProgress: 0,
    blinkCount: 0,
    blinkTimer: 0
  };
}

export function loadLevel(state: LevelState, levelId: number, canvasWidth: number, canvasHeight: number): void {
  state.currentLevel = levelId;
  state.isComplete = false;
  state.completionProgress = 0;
  state.blinkCount = 0;
  state.blinkTimer = 0;

  const levelData = generateLevel(levelId, canvasWidth, canvasHeight);
  state.obstacles = levelData.obstacles;
  state.lights = levelData.lights;
  state.launchPosition = levelData.launchPosition;
}

function generateLevel(levelId: number, canvasWidth: number, canvasHeight: number): LevelData {
  const launchX = canvasWidth / 2;
  const launchY = canvasHeight - 80;

  const levels: LevelData[] = [
    {
      id: 1,
      obstacles: [
        { type: 'rect', x: canvasWidth * 0.15, y: canvasHeight * 0.4, width: 120, height: 20 },
        { type: 'rect', x: canvasWidth * 0.65, y: canvasHeight * 0.4, width: 120, height: 20 },
        { type: 'rect', x: canvasWidth * 0.4, y: canvasHeight * 0.25, width: 80, height: 20 },
        { type: 'circle', x: canvasWidth * 0.25, y: canvasHeight * 0.55, radius: 30 },
        { type: 'circle', x: canvasWidth * 0.75, y: canvasHeight * 0.55, radius: 30 },
        { type: 'slope', x: canvasWidth * 0.05, y: canvasHeight * 0.7, width: 150, height: 80, direction: 'right' },
        { type: 'slope', x: canvasWidth * 0.75, y: canvasHeight * 0.7, width: 150, height: 80, direction: 'left' }
      ],
      lights: [
        createLight(canvasWidth * 0.2, canvasHeight * 0.3),
        createLight(canvasWidth * 0.5, canvasHeight * 0.15),
        createLight(canvasWidth * 0.8, canvasHeight * 0.3),
        createLight(canvasWidth * 0.15, canvasHeight * 0.55),
        createLight(canvasWidth * 0.85, canvasHeight * 0.55),
        createLight(canvasWidth * 0.5, canvasHeight * 0.6)
      ],
      launchPosition: { x: launchX, y: launchY }
    },
    {
      id: 2,
      obstacles: [
        { type: 'rect', x: canvasWidth * 0.1, y: canvasHeight * 0.3, width: 100, height: 25 },
        { type: 'rect', x: canvasWidth * 0.75, y: canvasHeight * 0.3, width: 100, height: 25 },
        { type: 'rect', x: canvasWidth * 0.35, y: canvasHeight * 0.45, width: 150, height: 20 },
        { type: 'rect', x: canvasWidth * 0.2, y: canvasHeight * 0.65, width: 80, height: 20 },
        { type: 'rect', x: canvasWidth * 0.6, y: canvasHeight * 0.65, width: 80, height: 20 },
        { type: 'circle', x: canvasWidth * 0.5, y: canvasHeight * 0.2, radius: 35 },
        { type: 'circle', x: canvasWidth * 0.3, y: canvasHeight * 0.55, radius: 25 },
        { type: 'circle', x: canvasWidth * 0.7, y: canvasHeight * 0.55, radius: 25 },
        { type: 'slope', x: canvasWidth * 0.02, y: canvasHeight * 0.5, width: 120, height: 70, direction: 'right' },
        { type: 'slope', x: canvasWidth * 0.85, y: canvasHeight * 0.5, width: 120, height: 70, direction: 'left' }
      ],
      lights: [
        createLight(canvasWidth * 0.15, canvasHeight * 0.18),
        createLight(canvasWidth * 0.85, canvasHeight * 0.18),
        createLight(canvasWidth * 0.5, canvasHeight * 0.32),
        createLight(canvasWidth * 0.25, canvasHeight * 0.48),
        createLight(canvasWidth * 0.75, canvasHeight * 0.48),
        createLight(canvasWidth * 0.5, canvasHeight * 0.58),
        createLight(canvasWidth * 0.35, canvasHeight * 0.75),
        createLight(canvasWidth * 0.65, canvasHeight * 0.75)
      ],
      launchPosition: { x: launchX, y: launchY }
    },
    {
      id: 3,
      obstacles: [
        { type: 'rect', x: canvasWidth * 0.05, y: canvasHeight * 0.2, width: 80, height: 30 },
        { type: 'rect', x: canvasWidth * 0.8, y: canvasHeight * 0.2, width: 80, height: 30 },
        { type: 'rect', x: canvasWidth * 0.25, y: canvasHeight * 0.35, width: 60, height: 20 },
        { type: 'rect', x: canvasWidth * 0.6, y: canvasHeight * 0.35, width: 60, height: 20 },
        { type: 'rect', x: canvasWidth * 0.42, y: canvasHeight * 0.5, width: 70, height: 20 },
        { type: 'circle', x: canvasWidth * 0.15, y: canvasHeight * 0.4, radius: 28 },
        { type: 'circle', x: canvasWidth * 0.85, y: canvasHeight * 0.4, radius: 28 },
        { type: 'circle', x: canvasWidth * 0.35, y: canvasHeight * 0.6, radius: 22 },
        { type: 'circle', x: canvasWidth * 0.65, y: canvasHeight * 0.6, radius: 22 },
        { type: 'slope', x: canvasWidth * 0.1, y: canvasHeight * 0.75, width: 180, height: 90, direction: 'right' },
        { type: 'slope', x: canvasWidth * 0.7, y: canvasHeight * 0.75, width: 180, height: 90, direction: 'left' },
        { type: 'slope', x: canvasWidth * 0.35, y: canvasHeight * 0.25, width: 100, height: 50, direction: 'left' },
        { type: 'slope', x: canvasWidth * 0.5, y: canvasHeight * 0.25, width: 100, height: 50, direction: 'right' }
      ],
      lights: [
        createLight(canvasWidth * 0.1, canvasHeight * 0.1),
        createLight(canvasWidth * 0.9, canvasHeight * 0.1),
        createLight(canvasWidth * 0.5, canvasHeight * 0.12),
        createLight(canvasWidth * 0.2, canvasHeight * 0.28),
        createLight(canvasWidth * 0.8, canvasHeight * 0.28),
        createLight(canvasWidth * 0.5, canvasHeight * 0.4),
        createLight(canvasWidth * 0.25, canvasHeight * 0.55),
        createLight(canvasWidth * 0.75, canvasHeight * 0.55),
        createLight(canvasWidth * 0.5, canvasHeight * 0.7)
      ],
      launchPosition: { x: launchX, y: launchY }
    }
  ];

  const levelIndex = Math.min(levelId - 1, levels.length - 1);
  return levels[levelIndex];
}

function createLight(x: number, y: number): LightPoint {
  return {
    x,
    y,
    radius: LIGHT_RADIUS,
    lit: false,
    litProgress: 0,
    pulseProgress: 0,
    isPulsing: false
  };
}

export function checkLightCollisions(state: LevelState, ball: Ball): boolean {
  let anyLit = false;

  for (const light of state.lights) {
    if (light.lit && light.litProgress >= 1) continue;

    const dx = ball.position.x - light.x;
    const dy = ball.position.y - light.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance < light.radius + ball.radius) {
      if (!light.lit) {
        light.lit = true;
        light.isPulsing = true;
        light.pulseProgress = 0;
        anyLit = true;
      }
    }
  }

  return anyLit;
}

export function updateLights(state: LevelState, deltaTime: number): void {
  for (const light of state.lights) {
    if (light.lit && light.litProgress < 1) {
      light.litProgress = Math.min(1, light.litProgress + deltaTime / LIGHT_LIT_DURATION);
    }

    if (light.isPulsing) {
      light.pulseProgress += deltaTime / LIGHT_PULSE_DURATION;
      if (light.pulseProgress >= 1) {
        light.isPulsing = false;
        light.pulseProgress = 0;
      }
    }
  }
}

export function checkLevelComplete(state: LevelState): boolean {
  return state.lights.every(light => light.lit);
}

export function updateCompletionAnimation(state: LevelState, deltaTime: number): void {
  if (!state.isComplete) {
    if (checkLevelComplete(state)) {
      state.isComplete = true;
      state.blinkCount = 0;
      state.blinkTimer = 0;
      state.completionProgress = 0;
    }
    return;
  }

  state.blinkTimer += deltaTime;
  if (state.blinkTimer >= BLINK_INTERVAL) {
    state.blinkTimer = 0;
    state.blinkCount++;
  }

  if (state.blinkCount >= TOTAL_BLINKS * 2) {
    state.completionProgress = Math.min(1, state.completionProgress + deltaTime * 2);
  }
}

export function getLitCount(state: LevelState): number {
  return state.lights.filter(light => light.lit).length;
}

export function getTotalLights(state: LevelState): number {
  return state.lights.length;
}

export function resetLightsProgress(state: LevelState): void {
  for (const light of state.lights) {
    if (light.lit) {
      light.litProgress = 1;
    }
  }
}

export function getTotalLevels(): number {
  return 3;
}
