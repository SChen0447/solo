export type Season = 'spring' | 'summer' | 'autumn' | 'winter';

export interface PuzzlePiece {
  id: number;
  season: Season;
  gridX: number;
  gridY: number;
  width: number;
  height: number;
  targetX: number;
  targetY: number;
  currentX: number;
  currentY: number;
  targetRotation: number;
  currentRotation: number;
  isPlaced: boolean;
  isSnapping: boolean;
  snapProgress: number;
  zIndex: number;
  imageData: ImageData | null;
}

export interface Particle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  rotation: number;
  rotationSpeed: number;
  opacity: number;
  life: number;
  maxLife: number;
  season: Season;
  type: 'petal' | 'leaf' | 'maple' | 'snow';
}

export interface GameState {
  pieces: PuzzlePiece[];
  particles: Particle[];
  currentSeason: Season;
  isComplete: boolean;
  completeProgress: number;
  opacity: number;
  highlightSeason: Season | null;
  highlightProgress: number;
  goldenGlowProgress: number;
}

export class DataManager {
  private state: GameState;
  private pieceIdCounter: number;
  private particleIdCounter: number;

  constructor(canvasWidth: number, canvasHeight: number) {
    this.pieceIdCounter = 0;
    this.particleIdCounter = 0;
    this.state = {
      pieces: [],
      particles: [],
      currentSeason: 'spring',
      isComplete: false,
      completeProgress: 0,
      opacity: 1,
      highlightSeason: null,
      highlightProgress: 0,
      goldenGlowProgress: 0
    };
    this.initializePieces(canvasWidth, canvasHeight);
  }

  private initializePieces(canvasWidth: number, canvasHeight: number): void {
    const cols = 4;
    const rows = 3;
    const pieceWidth = canvasWidth / cols;
    const pieceHeight = canvasHeight / rows;
    const seasons: Season[] = ['spring', 'summer', 'autumn', 'winter'];

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const seasonIndex = col;
        const season = seasons[seasonIndex];
        const sizeVariation = 0.9 + Math.random() * 0.2;
        const w = pieceWidth * sizeVariation;
        const h = pieceHeight * sizeVariation;

        const targetX = col * pieceWidth + pieceWidth / 2;
        const targetY = row * pieceHeight + pieceHeight / 2;

        const side = col < 2 ? 'left' : 'right';
        const startX = side === 'left'
          ? -pieceWidth * 0.5 - Math.random() * 80
          : canvasWidth + pieceWidth * 0.5 + Math.random() * 80;
        const startY = targetY + (Math.random() - 0.5) * 100;

        const startRotation = (Math.random() - 0.5) * 60;

        const piece: PuzzlePiece = {
          id: this.pieceIdCounter++,
          season,
          gridX: col,
          gridY: row,
          width: w,
          height: h,
          targetX,
          targetY,
          currentX: startX,
          currentY: startY,
          targetRotation: 0,
          currentRotation: startRotation,
          isPlaced: false,
          isSnapping: false,
          snapProgress: 0,
          zIndex: 0,
          imageData: null
        };

        this.state.pieces.push(piece);
      }
    }

    this.state.pieces.sort(() => Math.random() - 0.5);
    this.state.pieces.forEach((p, i) => {
      p.zIndex = i;
    });
  }

  getState(): GameState {
    return this.state;
  }

  getPieces(): PuzzlePiece[] {
    return this.state.pieces;
  }

  getParticles(): Particle[] {
    return this.state.particles;
  }

  getCurrentSeason(): Season {
    return this.state.currentSeason;
  }

  setCurrentSeason(season: Season): void {
    this.state.currentSeason = season;
    this.state.highlightSeason = season;
    this.state.highlightProgress = 0;
  }

  getOpacity(): number {
    return this.state.opacity;
  }

  setOpacity(value: number): void {
    this.state.opacity = Math.max(0.2, Math.min(1, value));
  }

  isComplete(): boolean {
    return this.state.isComplete;
  }

  setComplete(value: boolean): void {
    this.state.isComplete = value;
    if (value) {
      this.state.completeProgress = 0;
      this.state.goldenGlowProgress = 0;
    }
  }

  getCompleteProgress(): number {
    return this.state.completeProgress;
  }

  setCompleteProgress(value: number): void {
    this.state.completeProgress = value;
  }

  getGoldenGlowProgress(): number {
    return this.state.goldenGlowProgress;
  }

  setGoldenGlowProgress(value: number): void {
    this.state.goldenGlowProgress = value;
  }

  getHighlightSeason(): Season | null {
    return this.state.highlightSeason;
  }

  getHighlightProgress(): number {
    return this.state.highlightProgress;
  }

  setHighlightProgress(value: number): void {
    this.state.highlightProgress = value;
  }

  clearHighlight(): void {
    this.state.highlightSeason = null;
    this.state.highlightProgress = 0;
  }

  getPieceAtPosition(x: number, y: number): PuzzlePiece | null {
    const sortedPieces = [...this.state.pieces].sort((a, b) => b.zIndex - a.zIndex);

    for (const piece of sortedPieces) {
      if (piece.isPlaced) continue;

      const dx = x - piece.currentX;
      const dy = y - piece.currentY;
      const halfW = piece.width / 2;
      const halfH = piece.height / 2;

      const rad = (-piece.currentRotation * Math.PI) / 180;
      const cos = Math.cos(rad);
      const sin = Math.sin(rad);
      const localX = dx * cos - dy * sin;
      const localY = dx * sin + dy * cos;

      if (Math.abs(localX) <= halfW && Math.abs(localY) <= halfH) {
        return piece;
      }
    }

    return null;
  }

  bringToFront(piece: PuzzlePiece): void {
    const maxZ = Math.max(...this.state.pieces.map(p => p.zIndex));
    piece.zIndex = maxZ + 1;
  }

  addParticle(particle: Omit<Particle, 'id'>): void {
    if (this.state.particles.length >= 120) {
      return;
    }
    this.state.particles.push({
      ...particle,
      id: this.particleIdCounter++
    });
  }

  removeParticle(id: number): void {
    const index = this.state.particles.findIndex(p => p.id === id);
    if (index !== -1) {
      this.state.particles.splice(index, 1);
    }
  }

  clearParticles(): void {
    this.state.particles = [];
  }

  getPlacedCount(): number {
    return this.state.pieces.filter(p => p.isPlaced).length;
  }

  getTotalPieces(): number {
    return this.state.pieces.length;
  }
}
