export type BubbleColor = 'red' | 'blue' | 'green' | 'yellow' | 'purple';

export interface Bubble {
  id: string;
  row: number;
  col: number;
  x: number;
  y: number;
  color: BubbleColor;
}

export interface FlyingBubble {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: BubbleColor;
  radius: number;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  life: number;
  maxLife: number;
  size: number;
}

export const BUBBLE_COLORS: BubbleColor[] = ['red', 'blue', 'green', 'yellow', 'purple'];

export const COLOR_HEX: Record<BubbleColor, string> = {
  red: '#ff4444',
  blue: '#4488ff',
  green: '#44ff44',
  yellow: '#ffdd44',
  purple: '#aa44ff',
};

export const BUBBLE_RADIUS = 28;
export const BUBBLE_DIAMETER = BUBBLE_RADIUS * 2;
export const HEX_VERTICAL_SPACING = BUBBLE_DIAMETER * Math.sqrt(3) / 2;
export const COLS = 8;
export const CANVAS_WIDTH = 800;
export const CANVAS_HEIGHT = 600;
export const GRID_OFFSET_X = (CANVAS_WIDTH - COLS * BUBBLE_DIAMETER) / 2 + BUBBLE_RADIUS;
export const GRID_OFFSET_Y = BUBBLE_RADIUS + 20;

export function getBubblePosition(row: number, col: number): { x: number; y: number } {
  const offsetX = row % 2 === 1 ? BUBBLE_RADIUS : 0;
  const x = GRID_OFFSET_X + col * BUBBLE_DIAMETER + offsetX;
  const y = GRID_OFFSET_Y + row * HEX_VERTICAL_SPACING;
  return { x, y };
}

export function getGridPosition(x: number, y: number): { row: number; col: number } {
  const row = Math.round((y - GRID_OFFSET_Y) / HEX_VERTICAL_SPACING);
  const offsetX = row % 2 === 1 ? BUBBLE_RADIUS : 0;
  const col = Math.round((x - GRID_OFFSET_X - offsetX) / BUBBLE_DIAMETER);
  return { row, col };
}

export function getNeighborCoords(row: number, col: number): Array<{ row: number; col: number }> {
  const isOddRow = row % 2 === 1;
  const neighbors: Array<{ row: number; col: number }> = [
    { row: row - 1, col: isOddRow ? col : col - 1 },
    { row: row - 1, col: isOddRow ? col + 1 : col },
    { row, col: col - 1 },
    { row, col: col + 1 },
    { row: row + 1, col: isOddRow ? col : col - 1 },
    { row: row + 1, col: isOddRow ? col + 1 : col },
  ];
  return neighbors;
}

export function isValidCell(row: number, col: number, maxRows: number): boolean {
  return row >= 0 && row < maxRows && col >= 0 && col < COLS;
}

export function createBubble(row: number, col: number, color: BubbleColor): Bubble {
  const { x, y } = getBubblePosition(row, col);
  return {
    id: `${row}-${col}`,
    row,
    col,
    x,
    y,
    color,
  };
}

export function generateInitialBubbles(rows: number): Bubble[] {
  const bubbles: Bubble[] = [];
  for (let row = 0; row < rows; row++) {
    const colsInRow = row % 2 === 0 ? COLS : COLS;
    for (let col = 0; col < colsInRow; col++) {
      const colorIndex = Math.floor(Math.random() * BUBBLE_COLORS.length);
      const color = BUBBLE_COLORS[colorIndex];
      bubbles.push(createBubble(row, col, color));
    }
  }
  return bubbles;
}

export function buildBubbleMap(bubbles: Bubble[]): Map<string, Bubble> {
  const map = new Map<string, Bubble>();
  for (const bubble of bubbles) {
    map.set(bubble.id, bubble);
  }
  return map;
}

function getBubbleKey(row: number, col: number): string {
  return `${row}-${col}`;
}

export function findConnectedSameColor(
  bubbleMap: Map<string, Bubble>,
  startBubble: Bubble
): Bubble[] {
  const visited = new Set<string>();
  const result: Bubble[] = [];
  const stack: Bubble[] = [startBubble];
  const targetColor = startBubble.color;

  while (stack.length > 0) {
    const current = stack.pop()!;
    if (visited.has(current.id)) continue;
    visited.add(current.id);
    result.push(current);

    const neighbors = getNeighborCoords(current.row, current.col);
    for (const { row, col } of neighbors) {
      const key = getBubbleKey(row, col);
      const neighbor = bubbleMap.get(key);
      if (neighbor && neighbor.color === targetColor && !visited.has(neighbor.id)) {
        stack.push(neighbor);
      }
    }
  }

  return result;
}

export function findIsolatedBubbles(bubbleMap: Map<string, Bubble>, maxRows: number): Bubble[] {
  const visited = new Set<string>();
  const queue: Bubble[] = [];

  for (let col = 0; col < COLS; col++) {
    const key = getBubbleKey(0, col);
    const bubble = bubbleMap.get(key);
    if (bubble) {
      queue.push(bubble);
      visited.add(bubble.id);
    }
  }

  while (queue.length > 0) {
    const current = queue.shift()!;
    const neighbors = getNeighborCoords(current.row, current.col);

    for (const { row, col } of neighbors) {
      if (!isValidCell(row, col, maxRows)) continue;
      const key = getBubbleKey(row, col);
      const neighbor = bubbleMap.get(key);
      if (neighbor && !visited.has(neighbor.id)) {
        visited.add(neighbor.id);
        queue.push(neighbor);
      }
    }
  }

  const isolated: Bubble[] = [];
  for (const bubble of bubbleMap.values()) {
    if (!visited.has(bubble.id)) {
      isolated.push(bubble);
    }
  }

  return isolated;
}

export function checkBubbleCollision(
  flying: FlyingBubble,
  bubbleMap: Map<string, Bubble>
): Bubble | null {
  const searchRadius = BUBBLE_DIAMETER * 2;
  const { row, col } = getGridPosition(flying.x, flying.y);

  for (let dr = -2; dr <= 2; dr++) {
    for (let dc = -2; dc <= 2; dc++) {
      const r = row + dr;
      const c = col + dc;
      const key = getBubbleKey(r, c);
      const bubble = bubbleMap.get(key);
      if (!bubble) continue;

      const dx = flying.x - bubble.x;
      const dy = flying.y - bubble.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < BUBBLE_DIAMETER - 2) {
        return bubble;
      }
    }
  }

  void searchRadius;
  return null;
}

export function findSnapPosition(
  flying: FlyingBubble,
  bubbleMap: Map<string, Bubble>,
  maxRows: number
): { row: number; col: number } | null {
  const { row, col } = getGridPosition(flying.x, flying.y);
  let bestPos: { row: number; col: number } | null = null;
  let bestDist = Infinity;

  for (let dr = -2; dr <= 2; dr++) {
    for (let dc = -2; dc <= 2; dc++) {
      const r = row + dr;
      const c = col + dc;

      if (r < 0 || r >= maxRows || c < 0 || c >= COLS) continue;

      const key = getBubbleKey(r, c);
      if (bubbleMap.has(key)) continue;

      let hasNeighbor = false;
      const neighbors = getNeighborCoords(r, c);
      for (const { row: nr, col: nc } of neighbors) {
        const nKey = getBubbleKey(nr, nc);
        if (bubbleMap.has(nKey)) {
          hasNeighbor = true;
          break;
        }
      }

      if (!hasNeighbor && r > 0) continue;

      const { x, y } = getBubblePosition(r, c);
      const dx = flying.x - x;
      const dy = flying.y - y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < bestDist) {
        bestDist = dist;
        bestPos = { row: r, col: c };
      }
    }
  }

  return bestPos;
}

export function checkWallCollision(flying: FlyingBubble): 'left' | 'right' | 'top' | null {
  if (flying.x - BUBBLE_RADIUS <= 0) return 'left';
  if (flying.x + BUBBLE_RADIUS >= CANVAS_WIDTH) return 'right';
  if (flying.y - BUBBLE_RADIUS <= 0) return 'top';
  return null;
}

export type SpatialHash = Map<string, Bubble[]>;

export function buildSpatialHash(bubbles: Bubble[], cellSize: number): SpatialHash {
  const hash = new Map<string, Bubble[]>();
  for (const bubble of bubbles) {
    const cellX = Math.floor(bubble.x / cellSize);
    const cellY = Math.floor(bubble.y / cellSize);
    const key = `${cellX},${cellY}`;
    if (!hash.has(key)) {
      hash.set(key, []);
    }
    hash.get(key)!.push(bubble);
  }
  return hash;
}

export function querySpatialHash(
  hash: SpatialHash,
  x: number,
  y: number,
  cellSize: number
): Bubble[] {
  const results: Bubble[] = [];
  const cellX = Math.floor(x / cellSize);
  const cellY = Math.floor(y / cellSize);

  for (let dx = -1; dx <= 1; dx++) {
    for (let dy = -1; dy <= 1; dy++) {
      const key = `${cellX + dx},${cellY + dy}`;
      const cell = hash.get(key);
      if (cell) {
        results.push(...cell);
      }
    }
  }

  return results;
}

export function createParticles(
  x: number,
  y: number,
  color: string,
  count: number
): Particle[] {
  const particles: Particle[] = [];
  for (let i = 0; i < count; i++) {
    const angle = (Math.PI * 2 * i) / count + Math.random() * 0.5;
    const speed = 80 + Math.random() * 60;
    particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      color,
      life: 0.5,
      maxLife: 0.5,
      size: 4 + Math.random() * 3,
    });
  }
  return particles;
}

export function randomColor(): BubbleColor {
  return BUBBLE_COLORS[Math.floor(Math.random() * BUBBLE_COLORS.length)];
}
