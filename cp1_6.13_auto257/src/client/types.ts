export interface PathPoint {
  x: number;
  y: number;
}

export interface PathSegment {
  points: PathPoint[];
  color: string;
  width: number;
}

export interface DiaryEntry {
  id: string;
  timestamp: number;
  paths: PathSegment[];
}

export interface DiaryEntrySummary {
  id: string;
  timestamp: number;
  pathCount: number;
  previewPaths: Array<{
    color: string;
    pointCount: number;
  }>;
}

export const COLOR_PALETTE = [
  '#ff6b6b',
  '#ff9ff3',
  '#48dbfb',
  '#feca57',
  '#54a0ff',
  '#a29bfe',
];
