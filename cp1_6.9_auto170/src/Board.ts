import p5 from 'p5';
import { Piece, ElementType, ELEMENT_COLORS } from './Piece';
import { ConnectionLine, RadialWave, StardustBurst, RuneRing } from './effects';

export interface HexCell {
  q: number;
  r: number;
  x: number;
  y: number;
  piece: Piece | null;
}

export interface TriangleFormation {
  pieces: Piece[];
  color: p5.Color;
  triggered: boolean;
  lines: ConnectionLine[];
}

const HEX_SIZE = 36;
const BOARD_RADIUS = 250;

export class Board {
  private p: p5;
  private cx: number;
  private cy: number;
  private hexSize: number;
  private cells: Map<string, HexCell> = new Map();
  public placedPieces: Piece[] = [];
  public connections: ConnectionLine[] = [];
  private waves: RadialWave[] = [];
  public bursts: StardustBurst[] = [];
  private runeRing: RuneRing;
  private starDust: { x: number; y: number; size: number; phase: number; period: number }[] = [];
  private triangles: TriangleFormation[] = [];
  public onTriangleComplete: ((color: p5.Color) => void) | null = null;

  constructor(p: p5, cx: number, cy: number) {
    this.p = p;
    this.cx = cx;
    this.cy = cy;
    this.hexSize = HEX_SIZE;
    this.runeRing = new RuneRing(p, cx, cy, BOARD_RADIUS + 30);
    this.generateGrid();
    this.generateStarDust();
  }

  private generateGrid(): void {
    const maxRing = Math.floor(BOARD_RADIUS / (this.hexSize * 1.75));
    for (let q = -maxRing; q <= maxRing; q++) {
      for (let r = -maxRing; r <= maxRing; r++) {
        const s = -q - r;
        if (Math.abs(s) <= maxRing) {
          const pos = this.hexToPixel(q, r);
          const dist = Math.sqrt(pos.x * pos.x + pos.y * pos.y);
          if (dist <= BOARD_RADIUS - this.hexSize * 0.3) {
            const key = `${q},${r}`;
            this.cells.set(key, {
              q,
              r,
              x: this.cx + pos.x,
              y: this.cy + pos.y,
              piece: null
            });
          }
        }
      }
    }
  }

  private generateStarDust(): void {
    for (let i = 0; i < 30; i++) {
      const angle = this.p.random(0, this.p.TWO_PI);
      const dist = this.p.random(10, BOARD_RADIUS - 20);
      this.starDust.push({
        x: this.cx + Math.cos(angle) * dist,
        y: this.cy + Math.sin(angle) * dist,
        size: 2,
        phase: this.p.random(0, this.p.TWO_PI),
        period: this.p.random(1.5, 3.5)
      });
    }
  }

  private hexToPixel(q: number, r: number): { x: number; y: number } {
    const x = this.hexSize * (Math.sqrt(3) * q + (Math.sqrt(3) / 2) * r);
    const y = this.hexSize * ((3 / 2) * r);
    return { x, y };
  }

  private getHexNeighbors(q: number, r: number): { q: number; r: number }[] {
    return [
      { q: q + 1, r: r },
      { q: q - 1, r: r },
      { q: q, r: r + 1 },
      { q: q, r: r - 1 },
      { q: q + 1, r: r - 1 },
      { q: q - 1, r: r + 1 }
    ];
  }

  private cellKey(q: number, r: number): string {
    return `${q},${r}`;
  }

  private hexDistance(q1: number, r1: number, q2: number, r2: number): number {
    return (Math.abs(q1 - q2) + Math.abs(q1 + r1 - q2 - r2) + Math.abs(r1 - r2)) / 2;
  }

  update(dt: number, t: number): void {
    for (let i = this.waves.length - 1; i >= 0; i--) {
      if (!this.waves[i].update(dt)) {
        this.waves.splice(i, 1);
      }
    }
    for (let i = this.bursts.length - 1; i >= 0; i--) {
      if (!this.bursts[i].update(dt)) {
        this.bursts.splice(i, 1);
      }
    }
    for (const conn of this.connections) {
      conn.update(dt);
    }
    this.runeRing.update(dt, t);
    for (const dust of this.starDust) {
      dust.phase += (this.p.TWO_PI / dust.period) * dt;
    }
    this.checkTriangles();
  }

  render(): void {
    this.renderStarDust();
    this.renderBoardBase();
    this.renderGrid();
    for (const conn of this.connections) {
      conn.render();
    }
    for (const piece of this.placedPieces) {
      piece.render();
    }
    for (const wave of this.waves) {
      wave.render();
    }
    for (const burst of this.bursts) {
      burst.render();
    }
    this.runeRing.render();
  }

  private renderStarDust(): void {
    const p = this.p;
    p.push();
    p.noStroke();
    for (const dust of this.starDust) {
      const twinkle = 0.3 + 0.4 * Math.sin(dust.phase);
      p.fill(136, 136, 170, twinkle * 255);
      p.ellipse(dust.x, dust.y, dust.size, dust.size);
    }
    p.pop();
  }

  private renderBoardBase(): void {
    const p = this.p;
    p.push();
    p.noFill();
    p.stroke(68, 85, 170, 64);
    p.strokeWeight(2);
    p.ellipse(this.cx, this.cy, BOARD_RADIUS * 2, BOARD_RADIUS * 2);

    for (let i = 0; i < 3; i++) {
      const r = BOARD_RADIUS - i * 25;
      if (r > 20) {
        p.stroke(68, 85, 170, 20 - i * 5);
        p.strokeWeight(1);
        p.ellipse(this.cx, this.cy, r * 2, r * 2);
      }
    }
    p.pop();
  }

  private renderGrid(): void {
    const p = this.p;
    p.push();
    p.noFill();
    p.stroke(68, 85, 170, 64);
    p.strokeWeight(1);
    for (const cell of this.cells.values()) {
      if (!cell.piece) {
        this.drawHexagon(cell.x, cell.y, this.hexSize * 0.92);
      }
    }
    p.pop();
  }

  private drawHexagon(cx: number, cy: number, r: number): void {
    const p = this.p;
    p.beginShape();
    for (let i = 0; i < 6; i++) {
      const angle = (p.PI / 3) * i - p.HALF_PI;
      const x = cx + r * p.cos(angle);
      const y = cy + r * p.sin(angle);
      p.vertex(x, y);
    }
    p.endShape(p.CLOSE);
  }

  getNearestCell(mx: number, my: number): HexCell | null {
    let nearest: HexCell | null = null;
    let minDist = Infinity;
    for (const cell of this.cells.values()) {
      if (cell.piece) continue;
      const dx = mx - cell.x;
      const dy = my - cell.y;
      const dist = dx * dx + dy * dy;
      if (dist < minDist && dist < this.hexSize * this.hexSize) {
        minDist = dist;
        nearest = cell;
      }
    }
    return nearest;
  }

  highlightCell(mx: number, my: number): void {
    const cell = this.getNearestCell(mx, my);
    if (cell) {
      const p = this.p;
      p.push();
      p.noFill();
      p.stroke(150, 180, 255, 180);
      p.strokeWeight(2);
      p.drawingContext.shadowBlur = 10;
      p.drawingContext.shadowColor = '#88aaff';
      this.drawHexagon(cell.x, cell.y, this.hexSize * 0.95);
      p.pop();
    }
  }

  placePiece(piece: Piece, cell: HexCell): void {
    piece.setPlaced(cell.q, cell.r, cell.x, cell.y);
    cell.piece = piece;
    this.placedPieces.push(piece);
    this.waves.push(new RadialWave(this.p, cell.x, cell.y, piece.getColor(), 60, 0.6));
    this.updateConnections();
  }

  canPlaceAt(mx: number, my: number): boolean {
    return this.getNearestCell(mx, my) !== null;
  }

  private mixColors(e1: ElementType, e2: ElementType): p5.Color {
    const p = this.p;
    const c1 = ELEMENT_COLORS[e1].main;
    const c2 = ELEMENT_COLORS[e2].main;
    const r1 = parseInt(c1.slice(1, 3), 16);
    const g1 = parseInt(c1.slice(3, 5), 16);
    const b1 = parseInt(c1.slice(5, 7), 16);
    const r2 = parseInt(c2.slice(1, 3), 16);
    const g2 = parseInt(c2.slice(3, 5), 16);
    const b2 = parseInt(c2.slice(5, 7), 16);
    return p.color(
      Math.floor((r1 + r2) / 2),
      Math.floor((g1 + g2) / 2),
      Math.floor((b1 + b2) / 2)
    );
  }

  private updateConnections(): void {
    this.connections = [];
    const processed = new Set<string>();
    for (const piece of this.placedPieces) {
      const neighbors = this.getHexNeighbors(piece.gridQ, piece.gridR);
      for (const n of neighbors) {
        const nKey = this.cellKey(n.q, n.r);
        const pairKey = [
          this.cellKey(piece.gridQ, piece.gridR),
          nKey
        ].sort().join('|');
        if (processed.has(pairKey)) continue;
        const neighborCell = this.cells.get(nKey);
        if (neighborCell && neighborCell.piece) {
          processed.add(pairKey);
          const mixedColor = this.mixColors(piece.element, neighborCell.piece.element);
          this.connections.push(
            new ConnectionLine(
              this.p,
              piece.x,
              piece.y,
              neighborCell.piece.x,
              neighborCell.piece.y,
              mixedColor
            )
          );
        }
      }
    }
  }

  private checkTriangles(): void {
    if (this.placedPieces.length < 3) return;
    for (let i = 0; i < this.placedPieces.length; i++) {
      for (let j = i + 1; j < this.placedPieces.length; j++) {
        for (let k = j + 1; k < this.placedPieces.length; k++) {
          const a = this.placedPieces[i];
          const b = this.placedPieces[j];
          const c = this.placedPieces[k];
          const dAB = this.hexDistance(a.gridQ, a.gridR, b.gridQ, b.gridR);
          const dBC = this.hexDistance(b.gridQ, b.gridR, c.gridQ, c.gridR);
          const dCA = this.hexDistance(c.gridQ, c.gridR, a.gridQ, a.gridR);
          if (dAB === 1 && dBC === 1 && dCA === 1) {
            this.triggerTriangle([a, b, c]);
          }
        }
      }
    }
  }

  private triggerTriangle(pieces: Piece[]): void {
    const existing = this.triangles.find(t =>
      t.pieces.every(p => pieces.includes(p)) &&
      pieces.every(p => t.pieces.includes(p))
    );
    if (existing) return;

    const lines: ConnectionLine[] = [];
    for (const conn of this.connections) {
      const eps = conn.getEndpoints();
      const matches = pieces.filter(p =>
        (Math.abs(p.x - eps.x1) < 1 && Math.abs(p.y - eps.y1) < 1) ||
        (Math.abs(p.x - eps.x2) < 1 && Math.abs(p.y - eps.y2) < 1)
      );
      if (matches.length === 2) {
        lines.push(conn);
        conn.intensify();
      }
    }

    const cx = (pieces[0].x + pieces[1].x + pieces[2].x) / 3;
    const cy = (pieces[0].y + pieces[1].y + pieces[2].y) / 3;
    const color = this.mixTriangleColor(pieces);
    this.bursts.push(new StardustBurst(this.p, cx, cy, color, 150, 150, 1.5));

    this.triangles.push({
      pieces: [...pieces],
      color,
      triggered: true,
      lines
    });

    if (this.onTriangleComplete) {
      this.onTriangleComplete(color);
    }
  }

  private mixTriangleColor(pieces: Piece[]): p5.Color {
    let r = 0, g = 0, b = 0;
    for (const piece of pieces) {
      const c = ELEMENT_COLORS[piece.element].main;
      r += parseInt(c.slice(1, 3), 16);
      g += parseInt(c.slice(3, 5), 16);
      b += parseInt(c.slice(5, 7), 16);
    }
    return this.p.color(
      Math.floor(r / pieces.length),
      Math.floor(g / pieces.length),
      Math.floor(b / pieces.length)
    );
  }

  reset(): void {
    for (const cell of this.cells.values()) {
      cell.piece = null;
    }
    this.placedPieces = [];
    this.connections = [];
    this.waves = [];
    this.bursts = [];
    this.triangles = [];
  }

  getTriangleCount(): number {
    return this.triangles.length;
  }
}
