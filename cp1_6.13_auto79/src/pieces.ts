export interface Point {
  x: number;
  y: number;
}

export interface Piece {
  id: number;
  points: Point[];
  targetX: number;
  targetY: number;
  targetRotation: number;
  x: number;
  y: number;
  rotation: number;
  width: number;
  height: number;
  isPlaced: boolean;
  isDragging: boolean;
  isHighlighted: boolean;
  highlightTime: number;
  dragOffsetX: number;
  dragOffsetY: number;
  patternOffsetX: number;
  patternOffsetY: number;
  noiseSeed: number;
}

export interface GameState {
  pieces: Piece[];
  currentDraggingPiece: Piece | null;
  hintCount: number;
  isCompleted: boolean;
  startTime: number;
  elapsedTime: number;
  isTimerRunning: boolean;
  canvasWidth: number;
  canvasHeight: number;
  potCenterX: number;
  potCenterY: number;
}

const SNAP_DISTANCE = 40;
const PIECE_COUNT = 7;

function generateJaggedEdge(basePoints: Point[], jaggedness: number = 6): Point[] {
  const result: Point[] = [];
  for (let i = 0; i < basePoints.length; i++) {
    const p1 = basePoints[i];
    const p2 = basePoints[(i + 1) % basePoints.length];
    result.push(p1);
    for (let j = 1; j <= jaggedness; j++) {
      const t = j / (jaggedness + 1);
      const nx = p1.x + (p2.x - p1.x) * t;
      const ny = p1.y + (p2.y - p1.y) * t;
      const angle = Math.atan2(p2.y - p1.y, p2.x - p1.x) + Math.PI / 2;
      const offset = (Math.random() - 0.5) * 12;
      result.push({
        x: nx + Math.cos(angle) * offset,
        y: ny + Math.sin(angle) * offset
      });
    }
  }
  return result;
}

function generatePotPieceShapes(): { points: Point[]; center: Point; targetX: number; targetY: number; targetRotation: number; width: number; height: number; patternOffsetX: number; patternOffsetY: number }[] {
  const cx = 0;
  const cy = 0;
  const potHeight = 300;
  const potTopWidth = 130;
  const potBottomWidth = 90;
  const potMaxWidth = 180;

  const pieces = [
    {
      points: [
        { x: -potTopWidth / 2, y: -potHeight / 2 },
        { x: potTopWidth / 2, y: -potHeight / 2 },
        { x: potMaxWidth / 2 - 20, y: -potHeight / 4 },
        { x: -potMaxWidth / 2 + 20, y: -potHeight / 4 }
      ],
      center: { x: 0, y: -potHeight / 3 },
      targetX: cx,
      targetY: cy - potHeight / 3,
      targetRotation: 0,
      width: potTopWidth + 20,
      height: potHeight / 4 + 10,
      patternOffsetX: 0,
      patternOffsetY: -80
    },
    {
      points: [
        { x: -potMaxWidth / 2 + 20, y: -potHeight / 4 },
        { x: potMaxWidth / 2 - 20, y: -potHeight / 4 },
        { x: potMaxWidth / 2, y: 0 },
        { x: -potMaxWidth / 2, y: 0 }
      ],
      center: { x: 0, y: -potHeight / 8 },
      targetX: cx,
      targetY: cy - potHeight / 8,
      targetRotation: 0,
      width: potMaxWidth,
      height: potHeight / 4,
      patternOffsetX: 0,
      patternOffsetY: -30
    },
    {
      points: [
        { x: -potMaxWidth / 2, y: 0 },
        { x: -potMaxWidth / 4, y: -potHeight / 8 },
        { x: potMaxWidth / 4, y: -potHeight / 8 },
        { x: potMaxWidth / 2, y: 0 },
        { x: potMaxWidth / 2 - 10, y: potHeight / 6 },
        { x: -potMaxWidth / 2 + 10, y: potHeight / 6 }
      ],
      center: { x: 0, y: potHeight / 12 },
      targetX: cx,
      targetY: cy + potHeight / 12,
      targetRotation: 0,
      width: potMaxWidth,
      height: potHeight / 4 + 10,
      patternOffsetX: 0,
      patternOffsetY: 20
    },
    {
      points: [
        { x: -potMaxWidth / 2 + 10, y: potHeight / 6 },
        { x: potMaxWidth / 2 - 10, y: potHeight / 6 },
        { x: potBottomWidth / 2 + 30, y: potHeight / 3 },
        { x: -potBottomWidth / 2 - 30, y: potHeight / 3 }
      ],
      center: { x: 0, y: potHeight / 4 },
      targetX: cx,
      targetY: cy + potHeight / 4,
      targetRotation: 0,
      width: potMaxWidth - 20,
      height: potHeight / 6,
      patternOffsetX: 0,
      patternOffsetY: 60
    },
    {
      points: [
        { x: -potBottomWidth / 2 - 30, y: potHeight / 3 },
        { x: potBottomWidth / 2 + 30, y: potHeight / 3 },
        { x: potBottomWidth / 2, y: potHeight / 2 - 10 },
        { x: -potBottomWidth / 2, y: potHeight / 2 - 10 }
      ],
      center: { x: 0, y: potHeight / 2.5 },
      targetX: cx,
      targetY: cy + potHeight / 2.5,
      targetRotation: 0,
      width: potBottomWidth + 60,
      height: potHeight / 6,
      patternOffsetX: 0,
      patternOffsetY: 100
    },
    {
      points: [
        { x: -potTopWidth / 2, y: -potHeight / 2 },
        { x: -potMaxWidth / 2 + 20, y: -potHeight / 4 },
        { x: -potMaxWidth / 2, y: 0 },
        { x: -potMaxWidth / 2 + 10, y: potHeight / 6 },
        { x: -potBottomWidth / 2 - 20, y: potHeight / 4 },
        { x: -potBottomWidth / 2 - 15, y: potHeight / 8 }
      ],
      center: { x: -potMaxWidth / 3, y: -potHeight / 12 },
      targetX: cx - potMaxWidth / 3,
      targetY: cy - potHeight / 12,
      targetRotation: 0,
      width: potMaxWidth / 2 + 10,
      height: potHeight * 0.7,
      patternOffsetX: -50,
      patternOffsetY: 0
    },
    {
      points: [
        { x: potTopWidth / 2, y: -potHeight / 2 },
        { x: potMaxWidth / 2 - 20, y: -potHeight / 4 },
        { x: potMaxWidth / 2, y: 0 },
        { x: potMaxWidth / 2 - 10, y: potHeight / 6 },
        { x: potBottomWidth / 2 + 20, y: potHeight / 4 },
        { x: potBottomWidth / 2 + 15, y: potHeight / 8 }
      ],
      center: { x: potMaxWidth / 3, y: -potHeight / 12 },
      targetX: cx + potMaxWidth / 3,
      targetY: cy - potHeight / 12,
      targetRotation: 0,
      width: potMaxWidth / 2 + 10,
      height: potHeight * 0.7,
      patternOffsetX: 50,
      patternOffsetY: 0
    }
  ];

  return pieces.map(p => ({
    ...p,
    points: generateJaggedEdge(p.points, 5)
  }));
}

export function createGameState(canvasWidth: number, canvasHeight: number): GameState {
  return {
    pieces: [],
    currentDraggingPiece: null,
    hintCount: 3,
    isCompleted: false,
    startTime: 0,
    elapsedTime: 0,
    isTimerRunning: false,
    canvasWidth,
    canvasHeight,
    potCenterX: canvasWidth * 0.4,
    potCenterY: canvasHeight * 0.5
  };
}

export function initPieces(state: GameState): void {
  const pieceData = generatePotPieceShapes();
  state.pieces = [];

  const scatterArea = {
    minX: state.canvasWidth * 0.05,
    maxX: state.canvasWidth * 0.75,
    minY: state.canvasHeight * 0.1,
    maxY: state.canvasHeight * 0.9
  };

  pieceData.forEach((data, index) => {
    const baseSize = 90 + Math.random() * 30;
    const scaleFactor = baseSize / Math.max(data.width, data.height);

    let x: number, y: number;
    let attempts = 0;
    do {
      x = scatterArea.minX + Math.random() * (scatterArea.maxX - scatterArea.minX);
      y = scatterArea.minY + Math.random() * (scatterArea.maxY - scatterArea.minY);
      attempts++;
    } while (attempts < 50 && state.pieces.some(p => {
      const dx = p.x - x;
      const dy = p.y - y;
      return Math.sqrt(dx * dx + dy * dy) < 130;
    }));

    const piece: Piece = {
      id: index,
      points: data.points.map(p => ({ x: p.x * scaleFactor, y: p.y * scaleFactor })),
      targetX: state.potCenterX + data.targetX * scaleFactor,
      targetY: state.potCenterY + data.targetY * scaleFactor,
      targetRotation: data.targetRotation,
      x,
      y,
      rotation: (Math.random() - 0.5) * Math.PI * 1.5,
      width: data.width * scaleFactor,
      height: data.height * scaleFactor,
      isPlaced: false,
      isDragging: false,
      isHighlighted: false,
      highlightTime: 0,
      dragOffsetX: 0,
      dragOffsetY: 0,
      patternOffsetX: data.patternOffsetX * scaleFactor,
      patternOffsetY: data.patternOffsetY * scaleFactor,
      noiseSeed: Math.random() * 10000
    };

    state.pieces.push(piece);
  });

  state.currentDraggingPiece = null;
  state.hintCount = 3;
  state.isCompleted = false;
  state.startTime = performance.now();
  state.elapsedTime = 0;
  state.isTimerRunning = true;
}

export function getPieceAtPoint(state: GameState, x: number, y: number): Piece | null {
  for (let i = state.pieces.length - 1; i >= 0; i--) {
    const piece = state.pieces[i];
    if (isPointInPiece(piece, x, y)) {
      return piece;
    }
  }
  return null;
}

function isPointInPiece(piece: Piece, x: number, y: number): boolean {
  const cos = Math.cos(-piece.rotation);
  const sin = Math.sin(-piece.rotation);
  const localX = (x - piece.x) * cos - (y - piece.y) * sin;
  const localY = (x - piece.x) * sin + (y - piece.y) * cos;

  let inside = false;
  for (let i = 0, j = piece.points.length - 1; i < piece.points.length; j = i++) {
    const xi = piece.points[i].x, yi = piece.points[i].y;
    const xj = piece.points[j].x, yj = piece.points[j].y;

    const intersect = ((yi > localY) !== (yj > localY)) &&
      (localX < (xj - xi) * (localY - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

export function startDrag(state: GameState, piece: Piece, mouseX: number, mouseY: number): void {
  if (piece.isPlaced) return;

  piece.isDragging = true;
  state.currentDraggingPiece = piece;

  const cos = Math.cos(-piece.rotation);
  const sin = Math.sin(-piece.rotation);
  piece.dragOffsetX = (mouseX - piece.x) * cos - (mouseY - piece.y) * sin;
  piece.dragOffsetY = (mouseX - piece.x) * sin + (mouseY - piece.y) * cos;

  const index = state.pieces.indexOf(piece);
  if (index > -1) {
    state.pieces.splice(index, 1);
    state.pieces.push(piece);
  }
}

export function updateDrag(state: GameState, mouseX: number, mouseY: number): void {
  const piece = state.currentDraggingPiece;
  if (!piece || !piece.isDragging) return;

  const cos = Math.cos(piece.rotation);
  const sin = Math.sin(piece.rotation);
  piece.x = mouseX - (piece.dragOffsetX * cos - piece.dragOffsetY * sin);
  piece.y = mouseY - (piece.dragOffsetX * sin + piece.dragOffsetY * cos);
}

export function endDrag(state: GameState): void {
  const piece = state.currentDraggingPiece;
  if (!piece) return;

  piece.isDragging = false;

  const dx = piece.x - piece.targetX;
  const dy = piece.y - piece.targetY;
  const dist = Math.sqrt(dx * dx + dy * dy);

  if (dist < SNAP_DISTANCE) {
    piece.x = piece.targetX;
    piece.y = piece.targetY;
    piece.rotation = piece.targetRotation;
    piece.isPlaced = true;

    checkCompletion(state);
  }

  state.currentDraggingPiece = null;
}

export function checkCompletion(state: GameState): void {
  const allPlaced = state.pieces.every(p => p.isPlaced);
  if (allPlaced) {
    state.isCompleted = true;
    state.isTimerRunning = false;
    state.elapsedTime = performance.now() - state.startTime;
  }
}

export function useHint(state: GameState): boolean {
  if (state.hintCount <= 0) return false;

  const unplacedPiece = state.pieces.find(p => !p.isPlaced);
  if (!unplacedPiece) return false;

  state.pieces.forEach(p => {
    p.isHighlighted = false;
  });

  unplacedPiece.isHighlighted = true;
  unplacedPiece.highlightTime = 3;
  state.hintCount--;

  return true;
}

export function updatePieces(state: GameState, deltaTime: number): void {
  state.pieces.forEach(piece => {
    if (piece.isHighlighted) {
      piece.highlightTime -= deltaTime;
      if (piece.highlightTime <= 0) {
        piece.isHighlighted = false;
      }
    }
  });
}

export function getNextHintPiece(state: GameState): Piece | null {
  return state.pieces.find(p => !p.isPlaced) || null;
}
