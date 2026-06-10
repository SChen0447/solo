export interface SpiralPosition {
  x: number;
  y: number;
  z: number;
  rotation: number;
}

export const getSpiralPosition = (
  index: number,
  total: number,
  radius: number = 5,
  heightStep: number = 1.2,
  turns: number = 1.5
): SpiralPosition => {
  const angle = (index / (total - 1)) * Math.PI * 2 * turns;
  const x = Math.cos(angle) * radius;
  const z = Math.sin(angle) * radius;
  const y = (index - (total - 1) / 2) * heightStep;
  const rotation = -angle + Math.PI / 2;

  return { x, y, z, rotation };
};

export const getGridPosition = (
  index: number,
  cols: number = 4,
  spacing: number = 4
): { x: number; y: number; z: number } => {
  const row = Math.floor(index / cols);
  const col = index % cols;
  const x = (col - (cols - 1) / 2) * spacing;
  const y = -row * spacing * 0.8;
  const z = 0;

  return { x, y, z };
};

export const easeOutCubic = (t: number): number => {
  return 1 - Math.pow(1 - t, 3);
};

export const lerp = (start: number, end: number, t: number): number => {
  return start + (end - start) * t;
};

export const clamp = (value: number, min: number, max: number): number => {
  return Math.min(Math.max(value, min), max);
};
