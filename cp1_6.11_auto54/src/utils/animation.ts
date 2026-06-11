export const easeOutCubic = (t: number): number => {
  return 1 - Math.pow(1 - t, 3);
};

export const easeInOutCubic = (t: number): number => {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
};

export const lerp = (start: number, end: number, t: number): number => {
  return start + (end - start) * t;
};

export const clamp = (value: number, min: number, max: number): number => {
  return Math.max(min, Math.min(max, value));
};

export const getBezierControlPoints = (
  x1: number,
  y1: number,
  x2: number,
  y2: number
): { cp1x: number; cp1y: number; cp2x: number; cp2y: number } => {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const distance = Math.sqrt(dx * dx + dy * dy);
  const offset = Math.min(distance * 0.5, 100);

  if (Math.abs(dx) > Math.abs(dy)) {
    return {
      cp1x: x1 + offset,
      cp1y: y1,
      cp2x: x2 - offset,
      cp2y: y2,
    };
  } else {
    return {
      cp1x: x1,
      cp1y: y1 + offset,
      cp2x: x2,
      cp2y: y2 - offset,
    };
  }
};

export const getCardEdgePoint = (
  cardX: number,
  cardY: number,
  cardWidth: number,
  cardHeight: number,
  targetX: number,
  targetY: number
): { x: number; y: number } => {
  const centerX = cardX + cardWidth / 2;
  const centerY = cardY + cardHeight / 2;

  const dx = targetX - centerX;
  const dy = targetY - centerY;

  const halfWidth = cardWidth / 2;
  const halfHeight = cardHeight / 2;

  if (Math.abs(dx) * halfHeight > Math.abs(dy) * halfWidth) {
    const t = halfWidth / Math.abs(dx);
    return {
      x: centerX + dx * t,
      y: centerY + dy * t,
    };
  } else {
    const t = halfHeight / Math.abs(dy);
    return {
      x: centerX + dx * t,
      y: centerY + dy * t,
    };
  }
};
