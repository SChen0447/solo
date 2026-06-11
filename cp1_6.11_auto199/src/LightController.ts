import { v4 as uuidv4 } from 'uuid';
import type { CellState, CellPosition, TrailPoint } from './types';
import { COLORS, GRID_SIZE } from './types';

export function computeCellState(
  position: CellPosition,
  isActive: boolean,
  isHovered: boolean,
  amplitude: number
): CellState {
  let color = COLORS.cellDefault;
  let scale = 1;
  let glowColor = 'transparent';
  let glowSize = 0;

  if (isActive) {
    color = COLORS.cellActive;
    scale = 1.2;
    glowColor = COLORS.cellActive;
    glowSize = 12;
  } else if (isHovered) {
    glowColor = COLORS.cellHoverGlow;
    glowSize = 8;
  }

  if (amplitude > 0 && !isActive) {
    const brightness = Math.min(1, amplitude);
    const r = parseInt(COLORS.cellDefault.slice(1, 3), 16);
    const g = parseInt(COLORS.cellDefault.slice(3, 5), 16);
    const b = parseInt(COLORS.cellDefault.slice(5, 7), 16);
    const nr = Math.round(r + (255 - r) * brightness * 0.3);
    const ng = Math.round(g + (255 - g) * brightness * 0.3);
    const nb = Math.round(b + (255 - b) * brightness * 0.3);
    color = `#${nr.toString(16).padStart(2, '0')}${ng.toString(16).padStart(2, '0')}${nb.toString(16).padStart(2, '0')}`;
  }

  return {
    position,
    color,
    scale,
    glowColor,
    glowSize,
    isActive,
    isHovered,
  };
}

export function computeTrailPoints(
  path: CellPosition[],
  gridOffset: { x: number; y: number },
  cellSize: number,
  gap: number
): TrailPoint[] {
  const totalPoints = path.length;
  if (totalPoints === 0) return [];

  return path.map((pos, index) => {
    const progress = totalPoints > 1 ? index / (totalPoints - 1) : 0;
    const radius = 20 - progress * 15;

    const startR = parseInt(COLORS.trailStart.slice(1, 3), 16);
    const startG = parseInt(COLORS.trailStart.slice(3, 5), 16);
    const startB = parseInt(COLORS.trailStart.slice(5, 7), 16);
    const endR = parseInt(COLORS.trailEnd.slice(1, 3), 16);
    const endG = parseInt(COLORS.trailEnd.slice(3, 5), 16);
    const endB = parseInt(COLORS.trailEnd.slice(5, 7), 16);

    const r = Math.round(startR + (endR - startR) * progress);
    const g = Math.round(startG + (endG - startG) * progress);
    const b = Math.round(startB + (endB - startB) * progress);
    const color = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;

    const x = gridOffset.x + pos.col * (cellSize + gap) + cellSize / 2;
    const y = gridOffset.y + pos.row * (cellSize + gap) + cellSize / 2;

    return {
      id: uuidv4(),
      x,
      y,
      radius: Math.max(5, radius),
      color,
      opacity: 1,
      createdAt: performance.now(),
    };
  });
}

export function computePanelBgColor(recentNotes: { octave: number }[]): string {
  if (recentNotes.length === 0) return 'rgba(30, 30, 60, 0.6)';

  const avgOctave = recentNotes.reduce((sum, n) => sum + n.octave, 0) / recentNotes.length;

  const warmth = Math.min(1, Math.max(0, (avgOctave - 3) / 3));

  const warmR = Math.round(200 * warmth + 60 * (1 - warmth));
  const warmG = Math.round(80 * warmth + 50 * (1 - warmth));
  const warmB = Math.round(60 * warmth + 180 * (1 - warmth));

  return `rgba(${warmR}, ${warmG}, ${warmB}, 0.3)`;
}

export function getDefaultGrid(): CellState[][] {
  const grid: CellState[][] = [];
  for (let row = 0; row < GRID_SIZE; row++) {
    const rowCells: CellState[] = [];
    for (let col = 0; col < GRID_SIZE; col++) {
      rowCells.push(
        computeCellState({ row, col }, false, false, 0)
      );
    }
    grid.push(rowCells);
  }
  return grid;
}
