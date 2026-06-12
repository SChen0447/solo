export interface BrailleCell {
  dots: boolean[];
  text: string;
  index: number;
}

export interface RenderCell extends BrailleCell {
  x: number;
  y: number;
  width: number;
  height: number;
  highlighted: boolean;
  highlightProgress: number;
  glowAlpha: number;
}

export type RenderCallback = (cells: RenderCell[]) => void;

const COLOR_DOT_RAISED = '#D4A843';
const COLOR_DOT_FLAT = '#3D3D5C';
const COLOR_DOT_HIGHLIGHT = '#FFD700';
const DOT_SIZE = 12;
const DOT_SIZE_HIGHLIGHT = 14;
const DOT_GAP = 6;
const CHAR_GAP = 16;
const GLOW_RADIUS = 20;
const COLS = 2;
const ROWS_PER_CELL = 3;

export class BrailleRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private cells: RenderCell[] = [];
  private brailleData: BrailleCell[] = [];
  private colsCount: number = 0;
  private rowsCount: number = 0;
  private animationFrameId: number | null = null;
  private highlightedIndex: number = -1;
  private previousHighlightIndex: number = -1;
  private dpr: number = 1;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Canvas 2D context not available');
    }
    this.ctx = ctx;
    this.dpr = window.devicePixelRatio || 1;
    this.setupCanvas();
    window.addEventListener('resize', this.handleResize);
  }

  private setupCanvas(): void {
    const rect = this.canvas.getBoundingClientRect();
    this.canvas.width = rect.width * this.dpr;
    this.canvas.height = rect.height * this.dpr;
    this.ctx.scale(this.dpr, this.dpr);
    this.calculateLayout();
  }

  private handleResize = (): void => {
    this.dpr = window.devicePixelRatio || 1;
    this.setupCanvas();
    if (this.brailleData.length > 0) {
      this.setData(this.brailleData);
    }
    this.render();
  };

  get cellWidth(): number {
    return 3 * DOT_SIZE + 2 * DOT_GAP;
  }

  get cellHeight(): number {
    return 2 * DOT_SIZE + DOT_GAP;
  }

  private calculateLayout(): void {
    const rect = this.canvas.getBoundingClientRect();
    const totalCellWidth = this.cellWidth + CHAR_GAP;
    const totalCellHeight = this.cellHeight + CHAR_GAP;
    this.colsCount = Math.max(1, Math.floor((rect.width + CHAR_GAP) / totalCellWidth));
    this.rowsCount = Math.max(1, Math.floor((rect.height + CHAR_GAP) / totalCellHeight));
  }

  setData(data: BrailleCell[]): void {
    this.brailleData = data;
    this.highlightedIndex = -1;
    this.previousHighlightIndex = -1;
    this.buildRenderCells();
    this.render();
  }

  private buildRenderCells(): void {
    const rect = this.canvas.getBoundingClientRect();
    const totalCellWidth = this.cellWidth + CHAR_GAP;
    const totalCellHeight = this.cellHeight + CHAR_GAP;

    const totalWidth = this.colsCount * this.cellWidth + (this.colsCount - 1) * CHAR_GAP;
    const totalHeight = this.rowsCount * this.cellHeight + (this.rowsCount - 1) * CHAR_GAP;
    const offsetX = (rect.width - totalWidth) / 2;
    const offsetY = (rect.height - totalHeight) / 2;

    this.cells = this.brailleData.map((cell, idx) => {
      const col = idx % this.colsCount;
      const row = Math.floor(idx / this.colsCount);
      return {
        ...cell,
        index: idx,
        x: offsetX + col * totalCellWidth,
        y: offsetY + row * totalCellHeight,
        width: this.cellWidth,
        height: this.cellHeight,
        highlighted: false,
        highlightProgress: 0,
        glowAlpha: 0
      };
    });
  }

  getCellAtPoint(px: number, py: number): number {
    const rect = this.canvas.getBoundingClientRect();
    const x = px - rect.left;
    const y = py - rect.top;

    for (let i = 0; i < this.cells.length; i++) {
      const cell = this.cells[i];
      if (
        x >= cell.x - CHAR_GAP / 2 &&
        x <= cell.x + cell.width + CHAR_GAP / 2 &&
        y >= cell.y - CHAR_GAP / 2 &&
        y <= cell.y + cell.height + CHAR_GAP / 2
      ) {
        return i;
      }
    }
    return -1;
  }

  getCellByIndex(index: number): RenderCell | null {
    if (index < 0 || index >= this.cells.length) return null;
    return this.cells[index];
  }

  setHighlighted(index: number): void {
    if (index === this.highlightedIndex) return;

    if (this.highlightedIndex >= 0 && this.highlightedIndex < this.cells.length) {
      this.cells[this.highlightedIndex].highlighted = false;
      this.previousHighlightIndex = this.highlightedIndex;
    }

    this.highlightedIndex = index;

    if (index >= 0 && index < this.cells.length) {
      this.cells[index].highlighted = true;
    }

    this.startAnimation();
  }

  getHighlightedIndex(): number {
    return this.highlightedIndex;
  }

  getTotalCells(): number {
    return this.cells.length;
  }

  private startAnimation(): void {
    if (this.animationFrameId !== null) return;

    let lastTime = performance.now();

    const animate = (time: number) => {
      const delta = (time - lastTime) / 1000;
      lastTime = time;

      let needsRender = false;

      for (const cell of this.cells) {
        const targetProgress = cell.highlighted ? 1 : 0;
        const targetGlow = cell.highlighted ? 1 : 0;

        if (cell.highlightProgress !== targetProgress) {
          const speed = cell.highlighted ? 2.0 : 3.33;
          const diff = targetProgress - cell.highlightProgress;
          const step = Math.sign(diff) * Math.min(Math.abs(diff), speed * delta);
          cell.highlightProgress += step;
          if (Math.abs(targetProgress - cell.highlightProgress) < 0.001) {
            cell.highlightProgress = targetProgress;
          }
          needsRender = true;
        }

        if (cell.glowAlpha !== targetGlow) {
          const speed = cell.highlighted ? 2.0 : 3.33;
          const diff = targetGlow - cell.glowAlpha;
          const step = Math.sign(diff) * Math.min(Math.abs(diff), speed * delta);
          cell.glowAlpha += step;
          if (Math.abs(targetGlow - cell.glowAlpha) < 0.001) {
            cell.glowAlpha = targetGlow;
          }
          needsRender = true;
        }
      }

      if (needsRender) {
        this.render();
        this.animationFrameId = requestAnimationFrame(animate);
      } else {
        this.animationFrameId = null;
      }
    };

    this.animationFrameId = requestAnimationFrame(animate);
  }

  render(): void {
    const rect = this.canvas.getBoundingClientRect();
    this.ctx.clearRect(0, 0, rect.width, rect.height);

    for (const cell of this.cells) {
      this.drawCell(cell);
    }
  }

  private drawCell(cell: RenderCell): void {
    const progress = cell.highlightProgress;
    const glowAlpha = cell.glowAlpha;

    if (glowAlpha > 0.01) {
      this.ctx.save();
      const centerX = cell.x + cell.width / 2;
      const centerY = cell.y + cell.height / 2;
      const gradient = this.ctx.createRadialGradient(
        centerX, centerY, 0,
        centerX, centerY, GLOW_RADIUS * (1 + progress * 0.5)
      );
      gradient.addColorStop(0, `rgba(255, 215, 0, ${0.4 * glowAlpha})`);
      gradient.addColorStop(0.5, `rgba(255, 215, 0, ${0.15 * glowAlpha})`);
      gradient.addColorStop(1, 'rgba(255, 215, 0, 0)');
      this.ctx.fillStyle = gradient;
      this.ctx.beginPath();
      this.ctx.arc(centerX, centerY, GLOW_RADIUS * (1 + progress * 0.5), 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.restore();
    }

    for (let row = 0; row < 2; row++) {
      for (let col = 0; col < 3; col++) {
        const dotIndex = row * 3 + col;
        const isRaised = cell.dots[dotIndex] || false;

        const dotX = cell.x + col * (DOT_SIZE + DOT_GAP) + DOT_SIZE / 2;
        const dotY = cell.y + row * (DOT_SIZE + DOT_GAP) + DOT_SIZE / 2;

        const currentSize = DOT_SIZE + (DOT_SIZE_HIGHLIGHT - DOT_SIZE) * progress;
        const radius = currentSize / 2;

        this.ctx.save();

        if (progress > 0.01) {
          this.ctx.shadowColor = COLOR_DOT_HIGHLIGHT;
          this.ctx.shadowBlur = 12 * progress;
        }

        const dotColor = isRaised
          ? this.lerpColor(COLOR_DOT_RAISED, COLOR_DOT_HIGHLIGHT, progress)
          : COLOR_DOT_FLAT;

        if (isRaised || progress > 0.5) {
          const highlightColor = progress > 0.5
            ? this.lerpColor(COLOR_DOT_RAISED, COLOR_DOT_HIGHLIGHT, Math.min(1, (progress - 0.5) * 2))
            : '#FFF4C2';
          const innerGrad = this.ctx.createRadialGradient(
            dotX - radius * 0.3, dotY - radius * 0.3, 0,
            dotX, dotY, radius
          );
          innerGrad.addColorStop(0, highlightColor);
          innerGrad.addColorStop(1, dotColor);
          this.ctx.fillStyle = innerGrad;
        } else {
          this.ctx.fillStyle = dotColor;
        }

        this.ctx.beginPath();
        this.ctx.arc(dotX, dotY, radius, 0, Math.PI * 2);
        this.ctx.fill();

        if (isRaised || progress > 0.01) {
          this.ctx.strokeStyle = `rgba(0, 0, 0, ${0.2 - 0.1 * progress})`;
          this.ctx.lineWidth = 0.5;
          this.ctx.stroke();
        }

        this.ctx.restore();
      }
    }
  }

  private lerpColor(color1: string, color2: string, t: number): string {
    const r1 = parseInt(color1.slice(1, 3), 16);
    const g1 = parseInt(color1.slice(3, 5), 16);
    const b1 = parseInt(color1.slice(5, 7), 16);
    const r2 = parseInt(color2.slice(1, 3), 16);
    const g2 = parseInt(color2.slice(3, 5), 16);
    const b2 = parseInt(color2.slice(5, 7), 16);

    const r = Math.round(r1 + (r2 - r1) * t);
    const g = Math.round(g1 + (g2 - g1) * t);
    const b = Math.round(b1 + (b2 - b1) * t);

    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  }

  destroy(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    window.removeEventListener('resize', this.handleResize);
  }
}

export { COLS as BRAILLE_COLS, ROWS_PER_CELL as BRAILLE_ROWS };
