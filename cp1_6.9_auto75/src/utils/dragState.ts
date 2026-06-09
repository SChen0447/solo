export interface Position {
  x: number;
  y: number;
}

export interface DragState {
  isDragging: boolean;
  draggedId: string | null;
  offset: Position;
}

export function createInitialDragState(): DragState {
  return {
    isDragging: false,
    draggedId: null,
    offset: { x: 0, y: 0 }
  };
}

export function calculateNewPosition(
  clientX: number,
  clientY: number,
  containerRect: DOMRect,
  offset: Position,
  equipmentWidth: number,
  equipmentHeight: number,
  tableWidth: number,
  tableHeight: number
): Position {
  let x = clientX - containerRect.left - offset.x;
  let y = clientY - containerRect.top - offset.y;

  x = Math.max(0, Math.min(x, tableWidth - equipmentWidth));
  y = Math.max(0, Math.min(y, tableHeight - equipmentHeight));

  return { x, y };
}

export function snapToGrid(position: Position, gridSize: number = 20): Position {
  return {
    x: Math.round(position.x / gridSize) * gridSize,
    y: Math.round(position.y / gridSize) * gridSize
  };
}

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function checkCollision(a: BoundingBox, b: BoundingBox): boolean {
  return !(
    a.x + a.width < b.x ||
    b.x + b.width < a.x ||
    a.y + a.height < b.y ||
    b.y + b.height < a.y
  );
}

export function isPointInsideBox(
  point: Position,
  box: BoundingBox
): boolean {
  return (
    point.x >= box.x &&
    point.x <= box.x + box.width &&
    point.y >= box.y &&
    point.y <= box.y + box.height
  );
}
