export enum BrickType {
  BRICK_2x4 = 'brick_2x4',
  BRICK_1x2 = 'brick_1x2',
  SLOPE_2x2 = 'slope_2x2',
  CYLINDER_1x1 = 'cylinder_1x1',
  PLATE_2x2 = 'plate_2x2'
}

export interface Brick {
  id: string;
  type: BrickType;
  color: string;
  position: { x: number; y: number; z: number };
  rotationY: number;
}

export interface BrickDimensions {
  width: number;
  depth: number;
  height: number;
  isSlope?: boolean;
  isCylinder?: boolean;
  isPlate?: boolean;
}

export const BRICK_DIMENSIONS: Record<BrickType, BrickDimensions> = {
  [BrickType.BRICK_2x4]: { width: 2, depth: 4, height: 1 },
  [BrickType.BRICK_1x2]: { width: 1, depth: 2, height: 1 },
  [BrickType.SLOPE_2x2]: { width: 2, depth: 2, height: 1, isSlope: true },
  [BrickType.CYLINDER_1x1]: { width: 1, depth: 1, height: 1, isCylinder: true },
  [BrickType.PLATE_2x2]: { width: 2, depth: 2, height: 0.33, isPlate: true }
};

export const BRICK_COLORS: string[] = [
  '#FF3333',
  '#3366FF',
  '#FFD700',
  '#33CC33',
  '#FFFFFF',
  '#333333',
  '#FF8800'
];

export const BRICK_TYPE_LABELS: Record<BrickType, string> = {
  [BrickType.BRICK_2x4]: '2x4 砖块',
  [BrickType.BRICK_1x2]: '1x2 砖块',
  [BrickType.SLOPE_2x2]: '2x2 斜面砖',
  [BrickType.CYLINDER_1x1]: '1x1 圆柱',
  [BrickType.PLATE_2x2]: '2x2 圆板'
};

export const GRID_SIZE = 20;
export const MAX_BRICKS = 60;
