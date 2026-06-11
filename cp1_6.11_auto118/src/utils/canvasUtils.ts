import { Shape, Note, Point } from '../types';

export function getShapeBounds(shape: Shape): { x: number; y: number; width: number; height: number } {
  switch (shape.type) {
    case 'rect':
      return { x: shape.x!, y: shape.y!, width: shape.width!, height: shape.height! };
    case 'circle':
      return {
        x: shape.x! - shape.radius!,
        y: shape.y! - shape.radius!,
        width: shape.radius! * 2,
        height: shape.radius! * 2,
      };
    case 'line':
    case 'curve':
      if (shape.points && shape.points.length > 0) {
        const xs = shape.points.map((p) => p.x);
        const ys = shape.points.map((p) => p.y);
        const minX = Math.min(...xs);
        const maxX = Math.max(...xs);
        const minY = Math.min(...ys);
        const maxY = Math.max(...ys);
        return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
      }
      return { x: 0, y: 0, width: 0, height: 0 };
    default:
      return { x: 0, y: 0, width: 0, height: 0 };
  }
}

export function isPointInShape(point: Point, shape: Shape): boolean {
  const bounds = getShapeBounds(shape);
  const padding = 5;
  return (
    point.x >= bounds.x - padding &&
    point.x <= bounds.x + bounds.width + padding &&
    point.y >= bounds.y - padding &&
    point.y <= bounds.y + bounds.height + padding
  );
}

export function isPointInNote(point: Point, note: Note): boolean {
  return (
    point.x >= note.x &&
    point.x <= note.x + note.width &&
    point.y >= note.y &&
    point.y <= note.y + note.height
  );
}

export function isPointOnResizeHandle(point: Point, shape: Shape, handleSize: number = 10): boolean {
  const bounds = getShapeBounds(shape);
  const handleX = bounds.x + bounds.width - handleSize / 2;
  const handleY = bounds.y + bounds.height - handleSize / 2;
  return (
    point.x >= handleX - handleSize / 2 &&
    point.x <= handleX + handleSize / 2 &&
    point.y >= handleY - handleSize / 2 &&
    point.y <= handleY + handleSize / 2
  );
}

export function isPointOnNoteCorner(point: Point, note: Note, cornerSize: number = 12): 'tl' | 'tr' | 'bl' | 'br' | null {
  const corners = [
    { name: 'tl' as const, x: note.x, y: note.y },
    { name: 'tr' as const, x: note.x + note.width, y: note.y },
    { name: 'bl' as const, x: note.x, y: note.y + note.height },
    { name: 'br' as const, x: note.x + note.width, y: note.y + note.height },
  ];
  for (const corner of corners) {
    if (
      Math.abs(point.x - corner.x) <= cornerSize / 2 &&
      Math.abs(point.y - corner.y) <= cornerSize / 2
    ) {
      return corner.name;
    }
  }
  return null;
}

export function screenToWorld(
  screenX: number,
  screenY: number,
  offsetX: number,
  offsetY: number,
  scale: number
): Point {
  return {
    x: (screenX - offsetX) / scale,
    y: (screenY - offsetY) / scale,
  };
}

export function generateId(): string {
  return Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
}
