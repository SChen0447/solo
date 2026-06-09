import p5 from 'p5';

export type ElementType = 'fire' | 'ice' | 'thunder' | 'wind';

export const ELEMENT_COLORS: Record<ElementType, { main: string; glow: string }> = {
  fire: { main: '#ff6633', glow: '#ff8855' },
  ice: { main: '#33aaff', glow: '#66ccff' },
  thunder: { main: '#ffdd33', glow: '#ffee66' },
  wind: { main: '#66ff66', glow: '#99ff99' }
};

export const ELEMENT_SYMBOLS: Record<ElementType, string> = {
  fire: '🔥',
  ice: '❄',
  thunder: '⚡',
  wind: '🌀'
};

export const ELEMENT_NAMES: Record<ElementType, string> = {
  fire: '火',
  ice: '冰',
  thunder: '雷',
  wind: '风'
};

export class Piece {
  private p: p5;
  public element: ElementType;
  public x: number;
  public y: number;
  public size: number;
  public isDragging: boolean = false;
  public isPlaced: boolean = false;
  public gridQ: number = 0;
  public gridR: number = 0;
  private trail: { x: number; y: number; alpha: number }[] = [];
  private maxTrailLength: number = 8;
  private glowPulse: number = 0;
  private haloRadius: number = 0;

  constructor(p: p5, element: ElementType, x: number, y: number, size: number = 30) {
    this.p = p;
    this.element = element;
    this.x = x;
    this.y = y;
    this.size = size;
  }

  update(dt: number, mouseX: number, mouseY: number): void {
    this.glowPulse += dt * 2;
    if (this.isDragging) {
      this.x = mouseX;
      this.y = mouseY;
      this.trail.unshift({ x: mouseX, y: mouseY, alpha: 1 });
      if (this.trail.length > this.maxTrailLength) {
        this.trail.pop();
      }
      for (let i = 0; i < this.trail.length; i++) {
        this.trail[i].alpha = 1 - i / this.maxTrailLength;
      }
    } else {
      this.trail = [];
    }
    if (this.isPlaced) {
      this.haloRadius = this.size + 10 + Math.sin(this.glowPulse) * 5;
    }
  }

  render(): void {
    const p = this.p;
    const colors = ELEMENT_COLORS[this.element];

    if (this.isDragging) {
      this.renderTrail();
    }

    if (this.isPlaced) {
      this.renderHalo();
    }

    p.push();
    p.translate(this.x, this.y);

    p.drawingContext.shadowBlur = 15 + Math.sin(this.glowPulse) * 5;
    p.drawingContext.shadowColor = colors.glow;

    p.fill(20, 25, 45, 230);
    p.stroke(colors.main);
    p.strokeWeight(2);
    this.drawHexagon(0, 0, this.size);

    p.noStroke();
    p.drawingContext.shadowBlur = 20;
    p.drawingContext.shadowColor = colors.glow;
    p.fill(colors.main);
    p.textSize(this.size * 1.1);
    p.textAlign(p.CENTER, p.CENTER);
    p.text(ELEMENT_SYMBOLS[this.element], 0, 1);

    p.pop();
  }

  private renderTrail(): void {
    const p = this.p;
    const colors = ELEMENT_COLORS[this.element];
    p.push();
    p.noStroke();
    for (let i = this.trail.length - 1; i >= 0; i--) {
      const t = this.trail[i];
      const r = 3 + (this.maxTrailLength - i) * 0.5;
      p.drawingContext.globalAlpha = t.alpha * 0.6;
      p.drawingContext.shadowBlur = 8;
      p.drawingContext.shadowColor = colors.glow;
      p.fill(colors.main);
      p.ellipse(t.x, t.y, r, r);
    }
    p.pop();
  }

  private renderHalo(): void {
    const p = this.p;
    const colors = ELEMENT_COLORS[this.element];
    p.push();
    p.noFill();
    for (let i = 0; i < 3; i++) {
      const r = this.haloRadius + i * 6;
      const alpha = 0.15 - i * 0.04;
      p.stroke(colors.main);
      p.strokeWeight(2 - i * 0.5);
      p.drawingContext.globalAlpha = alpha;
      p.drawingContext.shadowBlur = 15;
      p.drawingContext.shadowColor = colors.glow;
      p.ellipse(this.x, this.y, r * 2, r * 2);
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

  contains(px: number, py: number): boolean {
    const dx = px - this.x;
    const dy = py - this.y;
    return dx * dx + dy * dy <= this.size * this.size;
  }

  setPlaced(q: number, r: number, x: number, y: number): void {
    this.gridQ = q;
    this.gridR = r;
    this.x = x;
    this.y = y;
    this.isPlaced = true;
    this.isDragging = false;
  }

  clone(): Piece {
    return new Piece(this.p, this.element, this.x, this.y, this.size);
  }

  getColor(): p5.Color {
    return this.p.color(ELEMENT_COLORS[this.element].main);
  }
}

export class PiecePool {
  private p: p5;
  public pieces: Piece[] = [];
  private poolX: number = 0;
  private poolY: number = 0;
  private spacing: number = 80;

  constructor(p: p5) {
    this.p = p;
    this.resetPieces();
  }

  resetPieces(): void {
    this.pieces = [];
    const elements: ElementType[] = ['fire', 'ice', 'thunder', 'wind'];
    let idx = 0;
    for (const elem of elements) {
      for (let i = 0; i < 2; i++) {
        const piece = new Piece(this.p, elem, 0, 0, 30);
        this.pieces.push(piece);
        idx++;
      }
    }
  }

  layout(startX: number, startY: number): void {
    this.poolX = startX;
    this.poolY = startY;
    for (let i = 0; i < this.pieces.length; i++) {
      if (!this.pieces[i].isPlaced && !this.pieces[i].isDragging) {
        this.pieces[i].x = startX + i * this.spacing;
        this.pieces[i].y = startY;
      }
    }
  }

  update(dt: number, mouseX: number, mouseY: number): void {
    for (const piece of this.pieces) {
      piece.update(dt, mouseX, mouseY);
    }
  }

  render(): void {
    const p = this.p;
    p.push();
    p.fill(20, 25, 45, 180);
    p.noStroke();
    const totalWidth = this.pieces.length * this.spacing;
    p.rect(this.poolX - 50, this.poolY - 55, totalWidth + 20, 100, 12);
    p.stroke(100, 120, 200, 100);
    p.strokeWeight(1);
    p.rect(this.poolX - 50, this.poolY - 55, totalWidth + 20, 100, 12);
    p.pop();

    for (const piece of this.pieces) {
      if (!piece.isPlaced) {
        piece.render();
      }
    }
  }

  getPieceAt(mx: number, my: number): Piece | null {
    for (let i = this.pieces.length - 1; i >= 0; i--) {
      const piece = this.pieces[i];
      if (!piece.isPlaced && !piece.isDragging && piece.contains(mx, my)) {
        return piece;
      }
    }
    return null;
  }

  removePiece(piece: Piece): void {
    const idx = this.pieces.indexOf(piece);
    if (idx >= 0) {
      this.pieces.splice(idx, 1);
    }
  }
}
