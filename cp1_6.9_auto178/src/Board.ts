import p5 from 'p5';
import { CONFIG, PieceColor, HexCoord, hexToRgb } from './main';
import { Piece } from './Piece';

function setFill(p: p5, hex: string, alpha: number): void {
  const { r, g, b } = hexToRgb(hex);
  p.fill(r, g, b, alpha);
}

function setStroke(p: p5, hex: string, alpha: number): void {
  const { r, g, b } = hexToRgb(hex);
  p.stroke(r, g, b, alpha);
}

export interface HexCell {
  q: number;
  r: number;
  screenX: number;
  screenY: number;
  activated: boolean;
  activatedBy: PieceColor | null;
  activationTime: number;
}

export interface ActivationWave {
  hexQ: number;
  hexR: number;
  startTime: number;
  duration: number;
  color: PieceColor;
  centerX: number;
  centerY: number;
}

export class Board {
  private p: p5;
  private cells: Map<string, HexCell> = new Map();
  private centerX: number = 0;
  private centerY: number = 0;
  private rotation: number = 0;
  private activationWaves: ActivationWave[] = [];

  constructor(p: p5) {
    this.p = p;
    this.initBoard();
    this.calculateLayout();
  }

  private initBoard(): void {
    this.cells.clear();
    for (let q = 0; q < CONFIG.GRID_COLS; q++) {
      for (let r = 0; r < CONFIG.GRID_ROWS; r++) {
        const key = this.cellKey(q, r);
        this.cells.set(key, {
          q,
          r,
          screenX: 0,
          screenY: 0,
          activated: false,
          activatedBy: null,
          activationTime: 0
        });
      }
    }
  }

  private cellKey(q: number, r: number): string {
    return `${q},${r}`;
  }

  public onResize(): void {
    this.calculateLayout();
  }

  private calculateLayout(): void {
    this.centerX = this.p.width / 2;
    this.centerY = this.p.height / 2;

    const hexW = CONFIG.HEX_SIZE * Math.sqrt(3);
    const hexH = CONFIG.HEX_SIZE * 1.5;

    const gridW = CONFIG.GRID_COLS * hexW + hexW * 0.5;
    const gridH = (CONFIG.GRID_ROWS - 1) * hexH + CONFIG.HEX_SIZE * 2;
    const offsetX = -gridW / 2 + hexW / 2;
    const offsetY = -gridH / 2 + CONFIG.HEX_SIZE;

    for (let q = 0; q < CONFIG.GRID_COLS; q++) {
      for (let r = 0; r < CONFIG.GRID_ROWS; r++) {
        const key = this.cellKey(q, r);
        const cell = this.cells.get(key);
        if (cell) {
          const x = q * hexW + (r % 2) * (hexW / 2) + offsetX;
          const y = r * hexH + offsetY;
          cell.screenX = x;
          cell.screenY = y;
        }
      }
    }
  }

  public update(dt: number, time: number): void {
    this.rotation = -((time % CONFIG.BOARD_ROTATION_PERIOD) / CONFIG.BOARD_ROTATION_PERIOD) * Math.PI * 2;

    for (let i = this.activationWaves.length - 1; i >= 0; i--) {
      if (time - this.activationWaves[i].startTime > this.activationWaves[i].duration) {
        this.activationWaves.splice(i, 1);
      }
    }
  }

  public getCellCenter(q: number, r: number): { x: number; y: number } | null {
    const key = this.cellKey(q, r);
    const cell = this.cells.get(key);
    if (!cell) return null;
    const rotated = this.rotatePoint(cell.screenX, cell.screenY, this.rotation);
    return {
      x: this.centerX + rotated.x,
      y: this.centerY + rotated.y
    };
  }

  private rotatePoint(x: number, y: number, angle: number): { x: number; y: number } {
    return {
      x: x * Math.cos(angle) - y * Math.sin(angle),
      y: x * Math.sin(angle) + y * Math.cos(angle)
    };
  }

  public findCellAt(screenX: number, screenY: number): HexCoord | null {
    const localX = screenX - this.centerX;
    const localY = screenY - this.centerY;
    const unrotated = this.rotatePoint(localX, localY, -this.rotation);

    let closest: HexCoord | null = null;
    let closestDist = Infinity;

    for (const cell of this.cells.values()) {
      const dx = cell.screenX - unrotated.x;
      const dy = cell.screenY - unrotated.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < CONFIG.HEX_SIZE * 0.9 && dist < closestDist) {
        closestDist = dist;
        closest = { q: cell.q, r: cell.r };
      }
    }
    return closest;
  }

  public isCellEmpty(q: number, r: number, pieces: Piece[]): boolean {
    return !pieces.some(p => p.hexQ === q && p.hexR === r);
  }

  public getPieceAt(q: number, r: number, pieces: Piece[]): Piece | null {
    return pieces.find(p => p.hexQ === q && p.hexR === r) || null;
  }

  public activateCell(q: number, r: number, color: PieceColor, time: number): void {
    const key = this.cellKey(q, r);
    const cell = this.cells.get(key);
    if (!cell) return;
    cell.activated = true;
    cell.activatedBy = color;
    cell.activationTime = time;

    const center = this.getCellCenter(q, r);
    if (center) {
      this.activationWaves.push({
        hexQ: q,
        hexR: r,
        startTime: time,
        duration: 800,
        color,
        centerX: center.x,
        centerY: center.y
      });
    }
  }

  public getActivationWaves(): ActivationWave[] {
    return this.activationWaves;
  }

  public isInActivationWave(px: number, py: number, time: number): { inWave: boolean; color: PieceColor | null } {
    for (const wave of this.activationWaves) {
      const elapsed = time - wave.startTime;
      if (elapsed > wave.duration) continue;
      const t = elapsed / wave.duration;
      const radius = 120 * t;
      const dx = px - wave.centerX;
      const dy = py - wave.centerY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist <= radius && dist >= radius - 30) {
        return { inWave: true, color: wave.color };
      }
    }
    return { inWave: false, color: null };
  }

  public render(time: number, pieces: Piece[]): void {
    this.p.push();
    this.p.translate(this.centerX, this.centerY);
    this.p.rotate(this.rotation);

    this.renderEnergyLines(pieces);
    this.renderHexCells(time);

    this.p.pop();

    this.renderActivationWaves(time);
  }

  private renderEnergyLines(pieces: Piece[]): void {
    const hexW = CONFIG.HEX_SIZE * Math.sqrt(3);
    const hexH = CONFIG.HEX_SIZE * 1.5;

    const lines: { x1: number; y1: number; x2: number; y2: number; pieceCount: number }[] = [];

    for (let q = 0; q < CONFIG.GRID_COLS; q++) {
      for (let r = 0; r < CONFIG.GRID_ROWS; r++) {
        const key1 = this.cellKey(q, r);
        const c1 = this.cells.get(key1);
        if (!c1) continue;

        const neighbors: [number, number][] = this.getNeighborOffsets(r);

        for (const [dq, dr] of neighbors) {
          const nq = q + dq;
          const nr = r + dr;
          if (nq < 0 || nq >= CONFIG.GRID_COLS || nr < 0 || nr >= CONFIG.GRID_ROWS) continue;
          if (nq < q || (nq === q && nr <= r)) continue;

          const key2 = this.cellKey(nq, nr);
          const c2 = this.cells.get(key2);
          if (!c2) continue;

          let pieceCount = 0;
          if (pieces.some(p => p.hexQ === q && p.hexR === r)) pieceCount++;
          if (pieces.some(p => p.hexQ === nq && p.hexR === nr)) pieceCount++;

          lines.push({
            x1: c1.screenX,
            y1: c1.screenY,
            x2: c2.screenX,
            y2: c2.screenY,
            pieceCount
          });
        }
      }
    }

    for (const line of lines) {
      const t = line.pieceCount / 2;
      const color = this.lerpColor(CONFIG.COLORS.ENERGY_LOW, CONFIG.COLORS.ENERGY_HIGH, t);
      setStroke(this.p, color, Math.floor(80 + t * 100));
      this.p.strokeWeight(1 + t * 1.5);
      this.p.line(line.x1, line.y1, line.x2, line.y2);
    }
  }

  private getNeighborOffsets(r: number): [number, number][] {
    if (r % 2 === 0) {
      return [[1, 0], [-1, 1], [0, 1]];
    } else {
      return [[1, 0], [0, 1], [1, 1]];
    }
  }

  private lerpColor(c1: string, c2: string, t: number): string {
    const r1 = parseInt(c1.slice(1, 3), 16);
    const g1 = parseInt(c1.slice(3, 5), 16);
    const b1 = parseInt(c1.slice(5, 7), 16);
    const r2 = parseInt(c2.slice(1, 3), 16);
    const g2 = parseInt(c2.slice(3, 5), 16);
    const b2 = parseInt(c2.slice(5, 7), 16);

    const r = Math.round(this.p.lerp(r1, r2, t));
    const g = Math.round(this.p.lerp(g1, g2, t));
    const b = Math.round(this.p.lerp(b1, b2, t));

    return '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('');
  }

  private renderHexCells(time: number): void {
    for (const cell of this.cells.values()) {
      this.drawHexagon(cell.screenX, cell.screenY, CONFIG.HEX_SIZE, time, cell.activated, cell.activatedBy, cell.activationTime);
    }
  }

  private drawHexagon(
    cx: number,
    cy: number,
    size: number,
    time: number,
    activated: boolean,
    activatedBy: PieceColor | null,
    activationTime: number
  ): void {
    this.p.push();
    this.p.translate(cx, cy);

    const borderColor = CONFIG.COLORS.HEX_BORDER;
    const borderAlpha = Math.floor(0.4 * 255);

    this.p.beginShape();
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2 - Math.PI / 6;
      const x = Math.cos(angle) * size;
      const y = Math.sin(angle) * size;
      this.p.vertex(x, y);
    }
    this.p.endShape(this.p.CLOSE);

    this.p.noFill();
    setStroke(this.p, borderColor, borderAlpha);
    this.p.strokeWeight(1.5);

    this.p.drawingContext.save();
    this.p.drawingContext.shadowColor = borderColor;
    this.p.drawingContext.shadowBlur = 8;
    this.p.beginShape();
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2 - Math.PI / 6;
      const x = Math.cos(angle) * size;
      const y = Math.sin(angle) * size;
      this.p.vertex(x, y);
    }
    this.p.endShape(this.p.CLOSE);
    this.p.drawingContext.restore();

    if (activated && activatedBy && time - activationTime < 500) {
      const t = (time - activationTime) / 500;
      const glowColor = CONFIG.COLORS[activatedBy];
      const pulse = 0.5 + 0.5 * Math.sin(time * 0.01);
      this.p.drawingContext.save();
      this.p.drawingContext.shadowColor = glowColor;
      this.p.drawingContext.shadowBlur = 15 * (1 - t) * pulse;
      this.p.noFill();
      setStroke(this.p, glowColor, Math.floor((1 - t) * 180));
      this.p.strokeWeight(2);
      this.p.beginShape();
      for (let i = 0; i < 6; i++) {
        const angle = (i / 6) * Math.PI * 2 - Math.PI / 6;
        const x = Math.cos(angle) * (size + 4);
        const y = Math.sin(angle) * (size + 4);
        this.p.vertex(x, y);
      }
      this.p.endShape(this.p.CLOSE);
      this.p.drawingContext.restore();
    }

    this.p.pop();
  }

  private renderActivationWaves(time: number): void {
    for (const wave of this.activationWaves) {
      const elapsed = time - wave.startTime;
      if (elapsed > wave.duration) continue;

      const t = elapsed / wave.duration;
      const radius = 120 * t;
      const alpha = (1 - t) * 0.6 * 255;
      const color = CONFIG.COLORS[wave.color];

      this.p.push();
      this.p.noFill();
      setStroke(this.p, color, alpha);
      this.p.strokeWeight(3 * (1 - t * 0.5));
      this.p.drawingContext.save();
      this.p.drawingContext.shadowColor = color;
      this.p.drawingContext.shadowBlur = 20;
      this.p.circle(wave.centerX, wave.centerY, radius * 2);
      this.p.drawingContext.restore();
      this.p.pop();

      for (let i = 0; i < 24; i++) {
        const angle = (i / 24) * Math.PI * 2 + t * Math.PI;
        const px = wave.centerX + Math.cos(angle) * radius;
        const py = wave.centerY + Math.sin(angle) * radius;
        this.p.noStroke();
        this.p.fill(this.p.hex(color) + this.p.alpha(alpha * 0.6));
        this.p.circle(px, py, 3 * (1 - t));
      }
    }
  }

  public getAllCells(): HexCell[] {
    return Array.from(this.cells.values());
  }

  public getCells(): Map<string, HexCell> {
    return this.cells;
  }

  public getRotation(): number {
    return this.rotation;
  }

  public getCenter(): { x: number; y: number } {
    return { x: this.centerX, y: this.centerY };
  }

  public areNeighbors(q1: number, r1: number, q2: number, r2: number): boolean {
    const dq = q2 - q1;
    const dr = r2 - r1;

    if (r1 % 2 === 0) {
      const neighbors: [number, number][] = [
        [1, 0], [-1, 0], [0, -1], [-1, -1], [0, 1], [-1, 1]
      ];
      return neighbors.some(([nq, nr]) => nq === dq && nr === dr);
    } else {
      const neighbors: [number, number][] = [
        [1, 0], [-1, 0], [1, -1], [0, -1], [1, 1], [0, 1]
      ];
      return neighbors.some(([nq, nr]) => nq === dq && nr === dr);
    }
  }

  public hexDistance(q1: number, r1: number, q2: number, r2: number): number {
    const dx = q2 - q1;
    const dy = r2 - r1;
    return Math.max(Math.abs(dx), Math.abs(dy), Math.abs(dx - dy));
  }
}
