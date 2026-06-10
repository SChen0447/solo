import seedrandom from 'seedrandom';

export interface LevelParams {
  obstacleDensity: number;
  platformSpacing: number;
  speedFactor: number;
  seed: number;
}

export interface Obstacle {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Platform {
  x: number;
  y: number;
  width: number;
  thickness: number;
}

export interface LevelData {
  obstacles: Obstacle[];
  platforms: Platform[];
}

const CANVAS_HEIGHT = 400;
const GROUND_Y = 380;
const PLAYER_SIZE = 30;

export function generateLevel(params: LevelParams, maxDistance: number = 3000): LevelData {
  const rng = seedrandom(params.seed.toString());
  const obstacles: Obstacle[] = [];
  const platforms: Platform[] = [];

  let x = 200;
  while (x < maxDistance) {
    const platformWidth = 80 + rng() * 70;
    const platformY = GROUND_Y;

    platforms.push({
      x,
      y: platformY,
      width: platformWidth,
      thickness: 20
    });

    const obstacleChancePer100px = params.obstacleDensity;
    const segmentStart = x;
    const segmentEnd = x + platformWidth;

    for (let ox = segmentStart + 20; ox < segmentEnd - 30; ox += 20) {
      if (rng() < obstacleChancePer100px * 0.2) {
        const obsWidth = 30 + rng() * 20;
        const obsHeight = 40 + rng() * 40;
        obstacles.push({
          x: ox,
          y: platformY - obsHeight,
          width: obsWidth,
          height: obsHeight
        });
        ox += obsWidth;
      }
    }

    const gap = params.platformSpacing * (0.8 + rng() * 0.4);
    x += platformWidth + gap;
  }

  return { obstacles, platforms };
}

export function computeDifficultyAtDistance(
  params: LevelParams,
  distance: number
): { density: number; spacing: number; speed: number; overall: number } {
  const baseSpacing = 200;
  const densityVal = params.obstacleDensity * 20;
  const spacingVal = (baseSpacing / params.platformSpacing) * 5;
  const speedVal = (params.speedFactor / 3) * 10;
  const overall = Math.min(10, densityVal * 0.4 + spacingVal * 0.3 + speedVal * 0.3);

  const wave = Math.sin(distance * 0.002) * 0.5 + 0.5;
  const densityWave = densityVal + wave * 1.5;
  const spacingWave = spacingVal + (1 - wave) * 1;
  const speedWave = speedVal + wave * 1;
  const overallWave = Math.min(10, densityWave * 0.4 + spacingWave * 0.3 + speedWave * 0.3);

  return {
    density: Math.min(10, densityWave),
    spacing: Math.min(10, spacingWave),
    speed: Math.min(10, speedWave),
    overall: Math.min(10, overallWave)
  };
}

export { GROUND_Y, PLAYER_SIZE };
