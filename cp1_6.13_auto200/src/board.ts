export interface GridPoint {
  gridX: number;
  gridY: number;
}

export interface ScreenPoint {
  x: number;
  y: number;
}

export class Board {
  public size: number = 0;
  public offsetX: number = 0;
  public offsetY: number = 0;
  public readonly gridSize: number = 8;
  public readonly diamondSize: number = 40;
  public readonly halfDiamond: number = 20;
  public centerX: number = 0;
  public centerY: number = 0;

  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Cannot get 2D context');
    this.ctx = ctx;
    this.resize();
  }

  public resize(): void {
    const container = this.canvas.parentElement;
    if (!container) return;

    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;
    
    this.size = Math.max(500, Math.min(viewportHeight * 0.7, viewportWidth * 0.9));
    this.canvas.width = this.size;
    this.canvas.height = this.size;
    
    this.offsetX = this.size / 2;
    this.offsetY = this.size / 2;
    this.centerX = this.offsetX;
    this.centerY = this.offsetY;
  }

  public gridToScreen(gridX: number, gridY: number): ScreenPoint {
    const x = this.offsetX + (gridX - gridY) * this.halfDiamond;
    const y = this.offsetY + (gridX + gridY) * this.halfDiamond * 0.5;
    return { x, y };
  }

  public screenToGrid(screenX: number, screenY: number): GridPoint {
    const dx = screenX - this.offsetX;
    const dy = screenY - this.offsetY;
    
    const gridX = Math.round((dx / this.halfDiamond + dy / (this.halfDiamond * 0.5)) / 2);
    const gridY = Math.round((dy / (this.halfDiamond * 0.5) - dx / this.halfDiamond) / 2);
    
    return { gridX, gridY };
  }

  public isValidGrid(gridX: number, gridY: number): boolean {
    return gridX >= 0 && gridX < this.gridSize && gridY >= 0 && gridY < this.gridSize;
  }

  public isAdjacent(g1: GridPoint, g2: GridPoint): boolean {
    const dx = Math.abs(g1.gridX - g2.gridX);
    const dy = Math.abs(g1.gridY - g2.gridY);
    return (dx === 1 && dy === 0) || (dx === 0 && dy === 1);
  }

  public getMirrorPosition(gridX: number, gridY: number): { horizontal: GridPoint; vertical: GridPoint } {
    const mid = (this.gridSize - 1) / 2;
    return {
      horizontal: { gridX, gridY: Math.round(mid * 2 - gridY) },
      vertical: { gridX: Math.round(mid * 2 - gridX), gridY }
    };
  }

  public checkBoundaryCollision(x: number, y: number): { hit: boolean; newVx: number; newVy: number } {
    const margin = this.halfDiamond * 2;
    const minX = this.offsetX - (this.gridSize - 1) * this.halfDiamond - margin;
    const maxX = this.offsetX + (this.gridSize - 1) * this.halfDiamond + margin;
    const minY = this.offsetY - margin;
    const maxY = this.offsetY + (this.gridSize - 1) * this.halfDiamond + margin;

    let hit = false;
    let newVx = 1;
    let newVy = 1;

    if (x <= minX || x >= maxX) {
      newVx = -1;
      hit = true;
    }
    if (y <= minY || y >= maxY) {
      newVy = -1;
      hit = true;
    }

    return { hit, newVx, newVy };
  }

  public draw(): void {
    this.drawBackground();
    this.drawGrid();
    this.drawBorderGlow();
  }

  private drawBackground(): void {
    const gradient = this.ctx.createRadialGradient(
      this.centerX, this.centerY, 0,
      this.centerX, this.centerY, this.size / 2
    );
    gradient.addColorStop(0, '#1a0030');
    gradient.addColorStop(1, '#001a14');
    
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, this.size, this.size);
  }

  private drawGrid(): void {
    this.ctx.strokeStyle = 'rgba(192, 192, 192, 0.2)';
    this.ctx.lineWidth = 1;

    for (let i = 0; i < this.gridSize; i++) {
      for (let j = 0; j < this.gridSize; j++) {
        const center = this.gridToScreen(i, j);
        const halfW = this.halfDiamond;
        const halfH = this.halfDiamond * 0.5;

        this.ctx.beginPath();
        this.ctx.moveTo(center.x, center.y - halfH);
        this.ctx.lineTo(center.x + halfW, center.y);
        this.ctx.lineTo(center.x, center.y + halfH);
        this.ctx.lineTo(center.x - halfW, center.y);
        this.ctx.closePath();
        this.ctx.stroke();
      }
    }

    for (let i = 0; i < this.gridSize; i++) {
      for (let j = 0; j < this.gridSize; j++) {
        const center = this.gridToScreen(i, j);
        this.ctx.beginPath();
        this.ctx.arc(center.x, center.y, 3, 0, Math.PI * 2);
        this.ctx.fillStyle = 'rgba(192, 192, 192, 0.5)';
        this.ctx.fill();
      }
    }

    this.ctx.strokeStyle = 'rgba(123, 104, 238, 0.3)';
    this.ctx.setLineDash([5, 5]);
    
    this.ctx.beginPath();
    this.ctx.moveTo(0, this.centerY);
    this.ctx.lineTo(this.size, this.centerY);
    this.ctx.stroke();

    this.ctx.beginPath();
    this.ctx.moveTo(this.centerX, 0);
    this.ctx.lineTo(this.centerX, this.size);
    this.ctx.stroke();

    this.ctx.setLineDash([]);
  }

  private drawBorderGlow(): void {
    const glowWidth = 8;
    const gradient = this.ctx.createLinearGradient(0, 0, this.size, this.size);
    gradient.addColorStop(0, '#7b68ee');
    gradient.addColorStop(0.5, '#00f5d4');
    gradient.addColorStop(1, '#7b68ee');

    this.ctx.strokeStyle = gradient;
    this.ctx.lineWidth = glowWidth;
    this.ctx.shadowColor = '#7b68ee';
    this.ctx.shadowBlur = 20;
    
    const inset = glowWidth / 2;
    this.ctx.strokeRect(inset, inset, this.size - inset * 2, this.size - inset * 2);
    
    this.ctx.shadowBlur = 0;
  }
}
