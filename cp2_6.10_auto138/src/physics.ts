export interface JumpParams {
  gravity: number;
  vx: number;
  vy: number;
  drag: number;
}

export interface TrajectoryPoint {
  x: number;
  y: number;
  vx: number;
  vy: number;
  frame: number;
}

export interface KeyPoints {
  start: TrajectoryPoint;
  peak: TrajectoryPoint | null;
  landing: TrajectoryPoint | null;
}

export interface ScoreResult {
  total: number;
  distanceScore: number;
  heightScore: number;
  smoothnessScore: number;
  rating: string;
}

export const DEFAULT_PARAMS: JumpParams = {
  gravity: 2.0,
  vx: 150,
  vy: -250,
  drag: 0,
};

export const START_X = 100;
export const START_Y = 400;
export const GROUND_Y = 400;
export const FRAME_COUNT = 120;
export const FPS = 60;
export const DT = 1 / FPS;

export function computeTrajectory(params: JumpParams): TrajectoryPoint[] {
  const points: TrajectoryPoint[] = [];
  let x = START_X;
  let y = START_Y;
  let vx = params.vx;
  let vy = params.vy;
  const dragFactor = 1 - params.drag * DT;

  for (let frame = 0; frame < FRAME_COUNT; frame++) {
    points.push({ x, y, vx, vy, frame });

    vy += params.gravity * 100 * DT;
    vx *= dragFactor;
    x += vx * DT;
    y += vy * DT;

    if (y >= GROUND_Y && frame > 0) {
      points.push({ x, y: GROUND_Y, vx, vy, frame: frame + 1 });
      break;
    }
  }

  return points;
}

export function findKeyPoints(trajectory: TrajectoryPoint[]): KeyPoints {
  const start = trajectory[0];
  let peak: TrajectoryPoint | null = null;
  let landing: TrajectoryPoint | null = null;

  let minY = Infinity;
  for (const p of trajectory) {
    if (p.y < minY) {
      minY = p.y;
      peak = p;
    }
  }

  for (let i = 1; i < trajectory.length; i++) {
    if (trajectory[i].y >= GROUND_Y) {
      landing = trajectory[i];
      break;
    }
  }

  return { start, peak, landing };
}

export function calculateScore(trajectory: TrajectoryPoint[]): ScoreResult {
  if (trajectory.length < 2) {
    return { total: 0, distanceScore: 0, heightScore: 0, smoothnessScore: 0, rating: '待优化' };
  }

  const landing = trajectory.find(p => p.y >= GROUND_Y) || trajectory[trajectory.length - 1];
  const horizontalDistance = Math.abs(landing.x - START_X);
  const maxDistance = 800;
  const distanceScore = Math.min(100, (horizontalDistance / maxDistance) * 100);

  let minY = Infinity;
  for (const p of trajectory) {
    if (p.y < minY) minY = p.y;
  }
  const peakHeight = GROUND_Y - minY;
  const idealHeight = 150;
  const heightDeviation = Math.abs(peakHeight - idealHeight);
  const heightScore = Math.max(0, 100 - (heightDeviation / idealHeight) * 100);

  const speedChanges: number[] = [];
  for (let i = 1; i < trajectory.length; i++) {
    const prev = trajectory[i - 1];
    const curr = trajectory[i];
    const prevSpeed = Math.sqrt(prev.vx * prev.vx + prev.vy * prev.vy);
    const currSpeed = Math.sqrt(curr.vx * curr.vx + curr.vy * curr.vy);
    speedChanges.push(Math.abs(currSpeed - prevSpeed));
  }
  const meanChange = speedChanges.reduce((a, b) => a + b, 0) / speedChanges.length;
  const variance = speedChanges.reduce((sum, v) => sum + (v - meanChange) ** 2, 0) / speedChanges.length;
  const smoothnessScore = Math.max(0, 100 - variance * 100);

  const total = distanceScore * 0.4 + heightScore * 0.3 + smoothnessScore * 0.3;

  let rating: string;
  if (total >= 90) rating = '完美';
  else if (total >= 70) rating = '良好';
  else if (total >= 50) rating = '一般';
  else rating = '待优化';

  return {
    total: Math.round(total),
    distanceScore: Math.round(distanceScore),
    heightScore: Math.round(heightScore),
    smoothnessScore: Math.round(smoothnessScore),
    rating,
  };
}
