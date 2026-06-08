export type TrajectoryMode = 'spiral' | 'wave' | 'explode';

export interface ParticleInitialData {
  index: number;
  baseRadius: number;
  theta: number;
  phi: number;
  seed: number;
  baseHue: number;
  baseSize: number;
}

export interface TrajectoryResult {
  x: number;
  y: number;
  z: number;
  hueShift: number;
  brightness: number;
}

const TWO_PI = Math.PI * 2;

function hash(n: number): number {
  const x = Math.sin(n * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

export function computeSpiral(p: ParticleInitialData, t: number): TrajectoryResult {
  const speed = 0.3 + p.seed * 0.4;
  const angleOffset = p.theta + t * speed;
  const radiusGrowth = t * 2.0 * (0.5 + p.seed * 0.5);
  const r = p.baseRadius + radiusGrowth;
  const verticalOsc = Math.sin(t * 0.8 + p.seed * TWO_PI) * 2.0;

  const x = r * Math.cos(angleOffset) * Math.sin(p.phi);
  const y = r * Math.cos(p.phi) * 0.6 + verticalOsc;
  const z = r * Math.sin(angleOffset) * Math.sin(p.phi);

  const hueShift = (t * 20 + p.seed * 60) % 360;
  const brightness = 0.7 + 0.3 * Math.sin(t * 1.5 + p.seed * TWO_PI);

  return { x, y, z, hueShift, brightness };
}

export function computeWave(p: ParticleInitialData, t: number): TrajectoryResult {
  const waveSpeed = 1.0 + p.seed * 0.8;
  const waveAmp = 1.5 + p.seed * 2.0;
  const phase = p.theta * 2 + p.seed * TWO_PI;

  const r = p.baseRadius + Math.sin(t * waveSpeed + phase) * waveAmp * 0.3;
  const waveY = Math.sin(t * waveSpeed * 0.7 + phase) * waveAmp;
  const waveZ = Math.cos(t * waveSpeed * 0.5 + phase * 1.3) * waveAmp * 0.5;

  const x = r * Math.cos(p.theta) * Math.sin(p.phi);
  const y = r * Math.cos(p.phi) + waveY;
  const z = r * Math.sin(p.theta) * Math.sin(p.phi) + waveZ;

  const hueShift = (Math.sin(t * 0.5 + p.seed * TWO_PI) * 40 + p.seed * 30) % 360;
  const brightness = 0.6 + 0.4 * Math.sin(t * 2 + phase);

  return { x, y, z, hueShift, brightness };
}

export function computeExplode(p: ParticleInitialData, t: number): TrajectoryResult {
  const cycleT = (t % 4) / 4;
  const phase = easeInOutCubic(cycleT);

  const explodeSpeed = 8 + p.seed * 12;
  const r = p.baseRadius + explodeSpeed * phase;

  const rotationSpeed = 0.5 + p.seed * 0.5;
  const rotAngle = t * rotationSpeed + p.theta;

  const wobble = Math.sin(t * 3 + p.seed * TWO_PI) * 0.5 * (1 - phase);

  const x = r * Math.cos(rotAngle) * Math.sin(p.phi) + wobble * Math.cos(p.seed * TWO_PI);
  const y = r * Math.cos(p.phi) + wobble * 0.5;
  const z = r * Math.sin(rotAngle) * Math.sin(p.phi) + wobble * Math.sin(p.seed * TWO_PI);

  const brightness = 0.5 + 0.5 * Math.sin(cycleT * Math.PI);
  const hueShift = (phase * 120 + p.seed * 50) % 360;

  return { x, y, z, hueShift, brightness };
}

export function computeTrajectory(
  mode: TrajectoryMode,
  p: ParticleInitialData,
  t: number
): TrajectoryResult {
  switch (mode) {
    case 'spiral':
      return computeSpiral(p, t);
    case 'wave':
      return computeWave(p, t);
    case 'explode':
      return computeExplode(p, t);
    default:
      return computeSpiral(p, t);
  }
}

export function interpolateTrajectory(
  fromMode: TrajectoryMode,
  toMode: TrajectoryMode,
  p: ParticleInitialData,
  t: number,
  blend: number
): TrajectoryResult {
  const from = computeTrajectory(fromMode, p, t);
  const to = computeTrajectory(toMode, p, t);
  const eased = easeInOutCubic(blend);

  return {
    x: lerp(from.x, to.x, eased),
    y: lerp(from.y, to.y, eased),
    z: lerp(from.z, to.z, eased),
    hueShift: lerp(from.hueShift, to.hueShift, eased),
    brightness: lerp(from.brightness, to.brightness, eased)
  };
}

export const TRAJECTORY_MODES: TrajectoryMode[] = ['spiral', 'wave', 'explode'];

export function nextMode(current: TrajectoryMode): TrajectoryMode {
  const idx = TRAJECTORY_MODES.indexOf(current);
  return TRAJECTORY_MODES[(idx + 1) % TRAJECTORY_MODES.length];
}
