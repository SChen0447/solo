import { v4 as uuidv4 } from 'uuid';
import { Piece, PieceStats, Tile, TileVisitInfo, PIECE_COLORS, HighlightPath } from './types';
import { TileMapEditor } from './TileMapEditor';

type StatsUpdateHandler = (stats: PieceStats[]) => void;
type VisitUpdateHandler = (visitInfo: Map<string, TileVisitInfo>) => void;
type SimulationEndHandler = () => void;
type PieceMoveHandler = (pieces: Piece[]) => void;

interface PQNode {
  row: number;
  col: number;
  dist: number;
}

export class PathSimulator {
  private tileMapEditor: TileMapEditor;
  private pieces: Piece[] = [];
  private visitInfo: Map<string, TileVisitInfo> = new Map();
  private isRunning = false;
  private animationFrameId: number | null = null;
  private moveIntervalMs = 400;
  private lastMoveTime = 0;
  private maxSteps = 50;
  private statsHandlers: StatsUpdateHandler[] = [];
  private visitHandlers: VisitUpdateHandler[] = [];
  private endHandlers: SimulationEndHandler[] = [];
  private moveHandlers: PieceMoveHandler[] = [];
  private animFrame = 0;
  private activeColorIndex = 0;

  constructor(tileMapEditor: TileMapEditor) {
    this.tileMapEditor = tileMapEditor;
  }

  public initVisitInfo(): void {
    this.visitInfo.clear();
    const tiles = this.tileMapEditor.getTiles();
    for (const row of tiles) {
      for (const tile of row) {
        const key = `${tile.row},${tile.col}`;
        this.visitInfo.set(key, {
          tileKey: key,
          totalVisits: 0,
          lastVisitorColor: null,
          visitByPiece: new Map()
        });
      }
    }
  }

  public createPiece(row: number, col: number): Piece | null {
    if (this.pieces.length >= 4) return null;
    if (this.isRunning) return null;

    const colorIdx = this.activeColorIndex;
    if (colorIdx >= PIECE_COLORS.length) return null;

    const pieceColor = PIECE_COLORS[colorIdx];
    const key = `${row},${col}`;

    const piece: Piece = {
      id: uuidv4(),
      color: pieceColor.value,
      colorKey: pieceColor.key,
      row,
      col,
      prevRow: row,
      prevCol: col,
      steps: 0,
      visitedTiles: new Set([key]),
      repeatVisits: 0,
      path: [{ row, col, timestamp: Date.now() }],
      alive: true
    };

    this.pieces.push(piece);
    this.activeColorIndex++;

    this.recordVisit(piece, row, col);
    this.notifyStats();
    this.notifyMove();
    return piece;
  }

  public removePiece(pieceId: string): void {
    if (this.isRunning) return;
    const idx = this.pieces.findIndex(p => p.id === pieceId);
    if (idx >= 0) {
      const removed = this.pieces.splice(idx, 1)[0];
      const colorIdx = PIECE_COLORS.findIndex(c => c.key === removed.colorKey);
      if (colorIdx < this.activeColorIndex) {
        this.activeColorIndex = colorIdx;
      }
      this.notifyStats();
      this.notifyMove();
    }
  }

  public clearPieces(): void {
    if (this.isRunning) return;
    this.pieces = [];
    this.activeColorIndex = 0;
    this.initVisitInfo();
    this.notifyStats();
    this.notifyMove();
  }

  public getPieces(): Piece[] {
    return [...this.pieces];
  }

  public getAvailablePieceCount(): number {
    return Math.max(0, 4 - this.pieces.length);
  }

  public isSimulationRunning(): boolean {
    return this.isRunning;
  }

  public startSimulation(maxSteps: number = 50): boolean {
    if (this.isRunning) return false;
    if (this.pieces.length === 0) return false;

    this.isRunning = true;
    this.maxSteps = maxSteps;
    this.lastMoveTime = performance.now();
    this.initVisitInfo();

    for (const piece of this.pieces) {
      piece.steps = 0;
      piece.visitedTiles = new Set([`${piece.row},${piece.col}`]);
      piece.repeatVisits = 0;
      piece.path = [{ row: piece.row, col: piece.col, timestamp: Date.now() }];
      piece.prevRow = piece.row;
      piece.prevCol = piece.col;
      piece.alive = true;
      this.recordVisit(piece, piece.row, piece.col);
    }

    this.notifyStats();
    this.notifyVisit();
    this.notifyMove();
    this.loop();
    return true;
  }

  public stopSimulation(): void {
    this.isRunning = false;
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    this.notifyEnd();
  }

  private loop(): void {
    if (!this.isRunning) return;

    this.animFrame++;
    const now = performance.now();

    if (now - this.lastMoveTime >= this.moveIntervalMs) {
      this.lastMoveTime = now;
      this.step();
    }

    this.notifyMove();

    if (this.isRunning) {
      this.animationFrameId = requestAnimationFrame(() => this.loop());
    }
  }

  private step(): void {
    let anyAlive = false;

    for (const piece of this.pieces) {
      if (!piece.alive) continue;
      if (piece.steps >= this.maxSteps) {
        piece.alive = false;
        continue;
      }

      const moveSteps = 1 + Math.floor(Math.random() * 2);
      let moved = false;

      for (let s = 0; s < moveSteps; s++) {
        const result = this.tryMoveRandom(piece);
        if (result) {
          moved = true;
          piece.steps++;
          const key = `${piece.row},${piece.col}`;
          if (piece.visitedTiles.has(key)) {
            piece.repeatVisits++;
          } else {
            piece.visitedTiles.add(key);
          }
          piece.path.push({ row: piece.row, col: piece.col, timestamp: Date.now() });
          this.recordVisit(piece, piece.row, piece.col);
        }
      }

      if (moved) anyAlive = true;
      if (piece.steps >= this.maxSteps) piece.alive = false;
    }

    this.notifyStats();
    this.notifyVisit();

    if (!anyAlive || !this.pieces.some(p => p.alive)) {
      this.stopSimulation();
    }
  }

  private tryMoveRandom(piece: Piece): boolean {
    const neighbors = this.tileMapEditor.getNeighbors(piece.row, piece.col);
    const passable = neighbors.filter(n =>
      this.tileMapEditor.isPassable(piece.row, piece.col, n.row, n.col)
    );

    if (passable.length === 0) return false;

    const choice = passable[Math.floor(Math.random() * passable.length)];
    piece.prevRow = piece.row;
    piece.prevCol = piece.col;
    piece.row = choice.row;
    piece.col = choice.col;
    return true;
  }

  private recordVisit(piece: Piece, row: number, col: number): void {
    const key = `${row},${col}`;
    const info = this.visitInfo.get(key);
    if (info) {
      info.totalVisits++;
      info.lastVisitorColor = piece.color;
      const count = info.visitByPiece.get(piece.id) || 0;
      info.visitByPiece.set(piece.id, count + 1);
    }
  }

  public getVisitInfo(): Map<string, TileVisitInfo> {
    return new Map(this.visitInfo);
  }

  public getPieceStats(): PieceStats[] {
    const totalPassable = this.tileMapEditor.getTotalPassableTiles();
    return this.pieces.map(p => ({
      id: p.id,
      color: p.color,
      colorKey: p.colorKey,
      steps: p.steps,
      visitedCount: p.visitedTiles.size,
      repeatVisits: p.repeatVisits,
      coverageRate: totalPassable > 0 ? p.visitedTiles.size / totalPassable : 0
    }));
  }

  public dijkstra(startRow: number, startCol: number): Map<string, { dist: number; prev: string | null }> {
    const tiles = this.tileMapEditor.getTiles();
    const rows = tiles.length;
    const cols = tiles[0]?.length || 0;
    const dist = new Map<string, { dist: number; prev: string | null }>();

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        dist.set(`${r},${c}`, { dist: Infinity, prev: null });
      }
    }

    const startKey = `${startRow},${startCol}`;
    dist.set(startKey, { dist: 0, prev: null });

    const pq: PQNode[] = [{ row: startRow, col: startCol, dist: 0 }];

    while (pq.length > 0) {
      pq.sort((a, b) => a.dist - b.dist);
      const current = pq.shift()!;
      const currentKey = `${current.row},${current.col}`;
      const currentDist = dist.get(currentKey)?.dist;

      if (currentDist === undefined || current.dist > currentDist) continue;

      const neighbors = this.tileMapEditor.getNeighbors(current.row, current.col);
      for (const n of neighbors) {
        if (!this.tileMapEditor.isPassable(current.row, current.col, n.row, n.col)) continue;
        const nKey = `${n.row},${n.col}`;
        const newDist = current.dist + 1;
        const nInfo = dist.get(nKey);
        if (nInfo && newDist < nInfo.dist) {
          dist.set(nKey, { dist: newDist, prev: currentKey });
          pq.push({ row: n.row, col: n.col, dist: newDist });
        }
      }
    }

    return dist;
  }

  public getShortestPathToEnds(fromRow: number, fromCol: number): HighlightPath[] {
    const tiles = this.tileMapEditor.getTiles();
    const endTiles: Tile[] = [];
    for (const row of tiles) {
      for (const t of row) {
        if (t.isEnd) endTiles.push(t);
      }
    }

    if (endTiles.length === 0) return [];

    const distMap = this.dijkstra(fromRow, fromCol);
    const results: HighlightPath[] = [];

    for (const endTile of endTiles) {
      const endKey = `${endTile.row},${endTile.col}`;
      const endInfo = distMap.get(endKey);
      if (!endInfo || endInfo.dist === Infinity) continue;

      const path: Array<{ row: number; col: number }> = [];
      let curKey: string | null = endKey;
      while (curKey) {
        const [r, c] = curKey.split(',').map(Number);
        path.unshift({ row: r, col: c });
        const info = distMap.get(curKey);
        curKey = info?.prev || null;
      }

      results.push({
        path,
        targetRow: endTile.row,
        targetCol: endTile.col,
        distance: endInfo.dist
      });
    }

    return results;
  }

  public getAnimFrame(): number {
    return this.animFrame;
  }

  public setPieces(pieces: Piece[]): void {
    this.pieces = pieces.map(p => ({
      ...p,
      visitedTiles: new Set(p.visitedTiles),
      path: [...p.path]
    }));
    const maxIdx = this.pieces.reduce((m, p) => {
      const idx = PIECE_COLORS.findIndex(c => c.key === p.colorKey);
      return Math.max(m, idx);
    }, -1);
    this.activeColorIndex = maxIdx + 1;
    this.notifyStats();
    this.notifyMove();
  }

  public onStatsUpdate(handler: StatsUpdateHandler): void {
    this.statsHandlers.push(handler);
  }

  public onVisitUpdate(handler: VisitUpdateHandler): void {
    this.visitHandlers.push(handler);
  }

  public onSimulationEnd(handler: SimulationEndHandler): void {
    this.endHandlers.push(handler);
  }

  public onPieceMove(handler: PieceMoveHandler): void {
    this.moveHandlers.push(handler);
  }

  private notifyStats(): void {
    const stats = this.getPieceStats();
    this.statsHandlers.forEach(h => h(stats));
  }

  private notifyVisit(): void {
    this.visitHandlers.forEach(h => h(this.visitInfo));
  }

  private notifyEnd(): void {
    this.endHandlers.forEach(h => h());
  }

  private notifyMove(): void {
    this.moveHandlers.forEach(h => h(this.pieces));
  }
}
