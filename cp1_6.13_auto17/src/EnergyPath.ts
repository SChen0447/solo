import { CellState, Cell, GridManager } from './GridManager';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
}

export class EnergyPath {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private gridManager: GridManager;
  private cellSize: number = 0;
  private offsetX: number = 0;
  private offsetY: number = 0;

  private particles: Particle[] = [];
  private readonly PARTICLE_COUNT: number = 60;

  private isConnected: boolean = false;
  private connectedPath: { row: number; col: number }[] = [];
  private sweepProgress: number = 0;
  private portalRotation: number = 0;

  private stormDuration: number = 4000;
  private stormInterval: number = 15000;
  private lastStormTime: number = 0;
  private gameStartTime: number = 0;

  private onConnectCallback: (() => void) | null = null;

  constructor(canvas: HTMLCanvasElement, gridManager: GridManager) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Cannot get 2D context');
    }
    this.ctx = ctx;
    this.gridManager = gridManager;
    this.initParticles();
  }

  private initParticles(): void {
    for (let i = 0; i < this.PARTICLE_COUNT; i++) {
      this.particles.push(this.createParticle());
    }
  }

  private createParticle(): Particle {
    return {
      x: Math.random() * this.canvas.width,
      y: Math.random() * this.canvas.height,
      vx: (Math.random() - 0.5) * 0.3,
      vy: (Math.random() - 0.5) * 0.3,
      size: Math.random() * 2 + 0.5,
      alpha: Math.random() * 0.5 + 0.2,
    };
  }

  public setOnConnectCallback(callback: () => void): void {
    this.onConnectCallback = callback;
  }

  public setGameStartTime(time: number): void {
    this.gameStartTime = time;
    this.lastStormTime = time;
  }

  public resize(width: number, height: number): void {
    this.canvas.width = width;
    this.canvas.height = height;

    const gridPixelSize = Math.min(width, height) * 0.9;
    this.cellSize = gridPixelSize / this.gridManager.cols;
    this.offsetX = (width - this.cellSize * this.gridManager.cols) / 2;
    this.offsetY = (height - this.cellSize * this.gridManager.rows) / 2;

    this.gridManager.setCellSize(this.cellSize, this.offsetX, this.offsetY);

    for (const p of this.particles) {
      p.x = Math.random() * width;
      p.y = Math.random() * height;
    }
  }

  public update(currentTime: number, deltaTime: number): void {
    this.gridManager.updateAnimations(deltaTime);
    this.updateParticles(deltaTime);
    this.portalRotation += deltaTime * 0.5;

    if (currentTime - this.lastStormTime >= this.stormInterval && this.gameStartTime > 0) {
      this.generateStorm(currentTime);
      this.lastStormTime = currentTime;
    }

    this.updateStorms(currentTime);
    this.checkConnectivity();

    if (this.isConnected && this.sweepProgress < 1) {
      this.sweepProgress = Math.min(1, this.sweepProgress + deltaTime * 0.8);
    }
  }

  private updateParticles(deltaTime: number): void {
    for (const p of this.particles) {
      p.x += p.vx * deltaTime * 60;
      p.y += p.vy * deltaTime * 60;

      if (p.x < 0) p.x = this.canvas.width;
      if (p.x > this.canvas.width) p.x = 0;
      if (p.y < 0) p.y = this.canvas.height;
      if (p.y > this.canvas.height) p.y = 0;
    }
  }

  public generateStorm(currentTime: number): void {
    const idleCells = this.gridManager.getRandomIdleCells(1);
    if (idleCells.length > 0) {
      const { row, col } = idleCells[0];
      const cell = this.gridManager.getCell(row, col);
      if (cell && cell.state === CellState.IDLE) {
        cell.state = CellState.STORM;
        cell.stormEndTime = currentTime + this.stormDuration;
      }
    }
  }

  public addInitialStorms(count: number, currentTime: number): void {
    const idleCells = this.gridManager.getRandomIdleCells(count);
    for (const { row, col } of idleCells) {
      const cell = this.gridManager.getCell(row, col);
      if (cell && cell.state === CellState.IDLE) {
        cell.state = CellState.STORM;
        cell.stormEndTime = currentTime + this.stormDuration;
      }
    }
  }

  private updateStorms(currentTime: number): void {
    for (let row = 0; row < this.gridManager.rows; row++) {
      for (let col = 0; col < this.gridManager.cols; col++) {
        const cell = this.gridManager.grid[row][col];
        if (cell.state === CellState.STORM && currentTime >= cell.stormEndTime) {
          cell.state = CellState.IDLE;
          cell.stormEndTime = 0;
        }
      }
    }
  }

  public stormDestroyPath(row: number, col: number): void {
    const cell = this.gridManager.getCell(row, col);
    if (cell && cell.state === CellState.PATH) {
      cell.state = CellState.IDLE;
      cell.removeProgress = 1;
    }
  }

  public checkConnectivity(): void {
    if (!this.gridManager.startPos || !this.gridManager.endPos) {
      this.isConnected = false;
      this.connectedPath = [];
      return;
    }

    const start = this.gridManager.startPos;
    const end = this.gridManager.endPos;

    const visited: boolean[][] = [];
    const parent: ({ row: number; col: number } | null)[][] = [];

    for (let r = 0; r < this.gridManager.rows; r++) {
      visited.push(new Array(this.gridManager.cols).fill(false));
      parent.push(new Array(this.gridManager.cols).fill(null));
    }

    const queue: { row: number; col: number }[] = [{ row: start.row, col: start.col }];
    visited[start.row][start.col] = true;

    const directions = [
      [-1, -1], [-1, 0], [-1, 1],
      [0, -1],           [0, 1],
      [1, -1],  [1, 0],  [1, 1],
    ];

    let found = false;

    while (queue.length > 0) {
      const current = queue.shift()!;

      if (current.row === end.row && current.col === end.col) {
        found = true;
        break;
      }

      for (const [dr, dc] of directions) {
        const newRow = current.row + dr;
        const newCol = current.col + dc;

        if (
          newRow >= 0 && newRow < this.gridManager.rows &&
          newCol >= 0 && newCol < this.gridManager.cols &&
          !visited[newRow][newCol]
        ) {
          const cell = this.gridManager.grid[newRow][newCol];
          if (cell.state === CellState.PATH || cell.state === CellState.END) {
            visited[newRow][newCol] = true;
            parent[newRow][newCol] = current;
            queue.push({ row: newRow, col: newCol });
          }
        }
      }
    }

    if (found) {
      const path: { row: number; col: number }[] = [];
      let current: { row: number; col: number } | null = { row: end.row, col: end.col };
      while (current) {
        path.unshift(current);
        current = parent[current.row][current.col];
      }

      if (!this.isConnected) {
        this.isConnected = true;
        this.connectedPath = path;
        this.sweepProgress = 0;
        if (this.onConnectCallback) {
          this.onConnectCallback();
        }
      }
    } else {
      if (this.isConnected) {
        this.isConnected = false;
        this.connectedPath = [];
        this.sweepProgress = 0;
      }
    }
  }

  public getIsConnected(): boolean {
    return this.isConnected;
  }

  public resetSweepAnimation(): void {
    this.sweepProgress = 0;
    this.isConnected = false;
    this.connectedPath = [];
  }

  public render(currentTime: number): void {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    ctx.clearRect(0, 0, w, h);

    const bgGradient = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w * 0.7);
    bgGradient.addColorStop(0, '#0f1428');
    bgGradient.addColorStop(1, '#050810');
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, w, h);

    this.renderParticles();
    this.renderGrid(currentTime);
    this.renderGridLines();

    if (this.isConnected && this.connectedPath.length > 0) {
      this.renderSweepEffect();
    }
  }

  private renderParticles(): void {
    const ctx = this.ctx;
    for (const p of this.particles) {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(100, 180, 255, ${p.alpha})`;
      ctx.fill();
    }
  }

  private renderGrid(currentTime: number): void {
    const ctx = this.ctx;

    for (let row = 0; row < this.gridManager.rows; row++) {
      for (let col = 0; col < this.gridManager.cols; col++) {
        const cell = this.gridManager.grid[row][col];
        const x = this.offsetX + col * this.cellSize;
        const y = this.offsetY + row * this.cellSize;

        if (cell.fadeInProgress < 1) {
          ctx.globalAlpha = cell.fadeInProgress;
        }

        this.renderCellBackground(x, y, cell, currentTime);

        if (cell.state === CellState.PATH || cell.placeProgress > 0 || cell.removeProgress > 0) {
          this.renderPathCell(x, y, cell, currentTime);
        }

        if (cell.state === CellState.STORM) {
          this.renderStormCell(x, y, cell, currentTime);
        }

        if (cell.state === CellState.START || cell.state === CellState.END) {
          this.renderPortal(x, y, cell, currentTime);
        }

        ctx.globalAlpha = 1;
      }
    }
  }

  private renderCellBackground(x: number, y: number, cell: Cell, _currentTime: number): void {
    const ctx = this.ctx;
    const padding = 2;

    ctx.fillStyle = 'rgba(42, 58, 90, 0.6)';
    ctx.fillRect(
      x + padding,
      y + padding,
      this.cellSize - padding * 2,
      this.cellSize - padding * 2
    );
  }

  private renderPathCell(x: number, y: number, cell: Cell, currentTime: number): void {
    const ctx = this.ctx;
    const padding = 4;
    let scale = 1;

    if (cell.state === CellState.PATH && cell.placeProgress < 1) {
      scale = cell.placeProgress;
    } else if (cell.state === CellState.IDLE && cell.removeProgress > 0) {
      scale = cell.removeProgress;
    }

    const size = (this.cellSize - padding * 2) * scale;
    const offsetX = x + padding + (this.cellSize - padding * 2 - size) / 2;
    const offsetY = y + padding + (this.cellSize - padding * 2 - size) / 2;

    if (size <= 0) return;

    const gradient = ctx.createLinearGradient(offsetX, offsetY, offsetX + size, offsetY + size);
    const hueShift = (Math.sin(currentTime * 0.002) + 1) * 30;
    gradient.addColorStop(0, `hsl(${190 + hueShift}, 100%, 55%)`);
    gradient.addColorStop(0.5, `hsl(${180 + hueShift}, 100%, 65%)`);
    gradient.addColorStop(1, `hsl(${170 + hueShift}, 100%, 55%)`);

    ctx.fillStyle = gradient;
    ctx.fillRect(offsetX, offsetY, size, size);

    ctx.shadowColor = 'rgba(0, 212, 255, 0.6)';
    ctx.shadowBlur = 15 * scale;
    ctx.fillRect(offsetX, offsetY, size, size);
    ctx.shadowBlur = 0;
  }

  private renderStormCell(x: number, y: number, cell: Cell, currentTime: number): void {
    const ctx = this.ctx;
    const padding = 3;
    const size = this.cellSize - padding * 2;

    const pulse = Math.sin(currentTime * 0.008) * 0.3 + 0.7;
    const remaining = cell.stormEndTime - currentTime;
    const totalDuration = this.stormDuration;
    const alpha = Math.min(1, remaining / totalDuration + 0.3);

    ctx.save();
    ctx.globalAlpha = alpha;

    const gradient = ctx.createRadialGradient(
      x + this.cellSize / 2, y + this.cellSize / 2, 0,
      x + this.cellSize / 2, y + this.cellSize / 2, size / 2
    );
    gradient.addColorStop(0, `rgba(255, 80, 120, ${pulse})`);
    gradient.addColorStop(0.5, `rgba(255, 40, 80, ${pulse * 0.8})`);
    gradient.addColorStop(1, 'rgba(200, 20, 60, 0.3)');

    ctx.fillStyle = gradient;
    ctx.fillRect(x + padding, y + padding, size, size);

    ctx.strokeStyle = `rgba(255, 100, 130, ${pulse})`;
    ctx.lineWidth = 2;
    ctx.strokeRect(x + padding, y + padding, size, size);

    const lightningCount = 3;
    for (let i = 0; i < lightningCount; i++) {
      const seed = (currentTime * 0.01 + i * 100) % 1000;
      const rand = Math.sin(seed * 12.9898) * 43758.5453;
      const fx = x + padding + (rand % 1) * size;
      const fy = y + padding + ((rand * 2) % 1) * size;
      const ex = x + padding + ((rand * 3) % 1) * size;
      const ey = y + padding + ((rand * 5) % 1) * size;

      ctx.beginPath();
      ctx.moveTo(fx, fy);
      const midX = (fx + ex) / 2 + (Math.sin(seed) * 10);
      const midY = (fy + ey) / 2 + (Math.cos(seed * 1.5) * 10);
      ctx.lineTo(midX, midY);
      ctx.lineTo(ex, ey);
      ctx.strokeStyle = `rgba(255, 200, 220, ${pulse * 0.6})`;
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    ctx.shadowColor = 'rgba(255, 50, 100, 0.8)';
    ctx.shadowBlur = 20 * pulse;
    ctx.fillRect(x + padding, y + padding, size, size);
    ctx.shadowBlur = 0;

    ctx.restore();
  }

  private renderPortal(x: number, y: number, cell: Cell, currentTime: number): void {
    const ctx = this.ctx;
    const centerX = x + this.cellSize / 2;
    const centerY = y + this.cellSize / 2;
    const outerRadius = this.cellSize * 0.38;
    const innerRadius = this.cellSize * 0.15;

    ctx.save();
    ctx.translate(centerX, centerY);

    const rotation = this.portalRotation + (cell.state === CellState.START ? 0 : Math.PI);

    const glowGradient = ctx.createRadialGradient(0, 0, 0, 0, 0, outerRadius * 1.5);
    glowGradient.addColorStop(0, 'rgba(255, 215, 0, 0.4)');
    glowGradient.addColorStop(0.5, 'rgba(255, 180, 0, 0.2)');
    glowGradient.addColorStop(1, 'rgba(255, 150, 0, 0)');

    ctx.fillStyle = glowGradient;
    ctx.beginPath();
    ctx.arc(0, 0, outerRadius * 1.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.rotate(rotation);

    this.drawStar(ctx, 0, 0, 5, outerRadius, innerRadius, '#ffd700');

    ctx.rotate(-rotation * 2);
    ctx.globalAlpha = 0.5;
    this.drawStar(ctx, 0, 0, 5, outerRadius * 0.7, innerRadius * 0.5, '#fff5cc');
    ctx.globalAlpha = 1;

    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(0, 0, innerRadius * 0.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();

    const label = cell.state === CellState.START ? '起' : '终';
    ctx.fillStyle = '#fff';
    ctx.font = `bold ${Math.floor(this.cellSize * 0.18)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, centerX, centerY);
  }

  private drawStar(
    ctx: CanvasRenderingContext2D,
    cx: number, cy: number,
    spikes: number,
    outerRadius: number,
    innerRadius: number,
    color: string
  ): void {
    let rot = Math.PI / 2 * 3;
    const step = Math.PI / spikes;

    ctx.beginPath();
    ctx.moveTo(cx, cy - outerRadius);

    for (let i = 0; i < spikes; i++) {
      let x = cx + Math.cos(rot) * outerRadius;
      let y = cy + Math.sin(rot) * outerRadius;
      ctx.lineTo(x, y);
      rot += step;

      x = cx + Math.cos(rot) * innerRadius;
      y = cy + Math.sin(rot) * innerRadius;
      ctx.lineTo(x, y);
      rot += step;
    }

    ctx.lineTo(cx, cy - outerRadius);
    ctx.closePath();

    ctx.fillStyle = color;
    ctx.fill();

    ctx.shadowColor = 'rgba(255, 215, 0, 0.8)';
    ctx.shadowBlur = 15;
    ctx.fill();
    ctx.shadowBlur = 0;
  }

  private renderGridLines(): void {
    const ctx = this.ctx;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 0.5;

    for (let row = 0; row <= this.gridManager.rows; row++) {
      const y = this.offsetY + row * this.cellSize;
      ctx.beginPath();
      ctx.moveTo(this.offsetX, y);
      ctx.lineTo(this.offsetX + this.gridManager.cols * this.cellSize, y);
      ctx.stroke();
    }

    for (let col = 0; col <= this.gridManager.cols; col++) {
      const x = this.offsetX + col * this.cellSize;
      ctx.beginPath();
      ctx.moveTo(x, this.offsetY);
      ctx.lineTo(x, this.offsetY + this.gridManager.rows * this.cellSize);
      ctx.stroke();
    }
  }

  private renderSweepEffect(): void {
    if (this.connectedPath.length === 0) return;

    const ctx = this.ctx;
    const totalLength = this.connectedPath.length;
    const currentIndex = Math.floor(this.sweepProgress * totalLength);
    const progress = (this.sweepProgress * totalLength) % 1;

    for (let i = 0; i <= currentIndex && i < totalLength; i++) {
      const pos = this.connectedPath[i];
      const x = this.offsetX + pos.col * this.cellSize;
      const y = this.offsetY + pos.row * this.cellSize;
      const padding = 4;

      let alpha = 0.8;
      if (i === currentIndex) {
        alpha = 0.8 * progress;
      }

      ctx.save();
      ctx.globalAlpha = alpha;

      const size = this.cellSize - padding * 2;
      const gradient = ctx.createLinearGradient(x + padding, y + padding, x + padding + size, y + padding + size);
      gradient.addColorStop(0, '#ffd700');
      gradient.addColorStop(0.5, '#fff5cc');
      gradient.addColorStop(1, '#ffae00');

      ctx.fillStyle = gradient;
      ctx.fillRect(x + padding, y + padding, size, size);

      ctx.shadowColor = 'rgba(255, 215, 0, 0.9)';
      ctx.shadowBlur = 25;
      ctx.fillRect(x + padding, y + padding, size, size);
      ctx.shadowBlur = 0;

      ctx.restore();
    }
  }

  public resetStormTimer(currentTime: number): void {
    this.lastStormTime = currentTime;
    this.gameStartTime = currentTime;
  }
}
