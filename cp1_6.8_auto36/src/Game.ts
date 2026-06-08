import { Snake, SnakeData, Position, darkenColor, lightenColor, TailParticle } from './Snake';

export interface Food {
  x: number;
  y: number;
  color: string;
  id: string;
}

interface Ripple {
  x: number;
  y: number;
  radius: number;
  alpha: number;
  color: string;
}

interface SpatialHashGrid {
  cellSize: number;
  grid: Map<string, Snake[]>;
}

export class Game {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private minimapCanvas: HTMLCanvasElement;
  private minimapCtx: CanvasRenderingContext2D;
  
  public arenaWidth: number;
  public arenaHeight: number;
  public cellSize: number;
  public gridSize: number;
  
  private snakes: Map<string, Snake>;
  private foods: Food[];
  private ripples: Ripple[];
  
  private animationFrameId: number | null;
  private lastTime: number;
  public fps: number;
  
  private spatialGrid: SpatialHashGrid;
  
  private foodPulseTime: number;
  
  private playerSnakeId: string | null;

  constructor(canvas: HTMLCanvasElement, minimapCanvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.minimapCanvas = minimapCanvas;
    this.minimapCtx = minimapCanvas.getContext('2d')!;
    
    this.arenaWidth = 600;
    this.arenaHeight = 600;
    this.cellSize = 20;
    this.gridSize = 20;
    
    this.snakes = new Map();
    this.foods = [];
    this.ripples = [];
    
    this.animationFrameId = null;
    this.lastTime = 0;
    this.fps = 60;
    
    this.spatialGrid = {
      cellSize: this.cellSize * 3,
      grid: new Map()
    };
    
    this.foodPulseTime = 0;
    this.playerSnakeId = null;
  }

  public setPlayerSnakeId(id: string): void {
    this.playerSnakeId = id;
  }

  public addSnake(snakeData: SnakeData): void {
    const snake = new Snake(
      snakeData.id,
      snakeData.name,
      snakeData.body,
      snakeData.color,
      snakeData.emoji,
      snakeData.direction
    );
    snake.score = snakeData.score;
    snake.alive = snakeData.alive;
    this.snakes.set(snakeData.id, snake);
  }

  public removeSnake(id: string): void {
    this.snakes.delete(id);
  }

  public updateSnake(snakeData: SnakeData): void {
    const snake = this.snakes.get(snakeData.id);
    if (snake) {
      snake.updateFromData(snakeData);
    } else {
      this.addSnake(snakeData);
    }
  }

  public setFoods(foods: Food[]): void {
    const oldFoodIds = new Set(this.foods.map(f => f.id));
    const newFoodIds = new Set(foods.map(f => f.id));
    
    for (const food of this.foods) {
      if (!newFoodIds.has(food.id)) {
        this.addRipple(food.x + this.cellSize / 2, food.y + this.cellSize / 2, food.color);
      }
    }
    
    this.foods = foods;
  }

  private addRipple(x: number, y: number, color: string): void {
    this.ripples.push({
      x,
      y,
      radius: 5,
      alpha: 0.8,
      color
    });
  }

  private updateRipples(): void {
    for (let i = this.ripples.length - 1; i >= 0; i--) {
      const r = this.ripples[i];
      r.radius += 2;
      r.alpha -= 0.04;
      if (r.alpha <= 0) {
        this.ripples.splice(i, 1);
      }
    }
  }

  private updateSpatialGrid(): void {
    this.spatialGrid.grid.clear();
    const gridSize = this.spatialGrid.cellSize;
    
    for (const snake of this.snakes.values()) {
      if (!snake.alive) continue;
      
      for (const segment of snake.body) {
        const gridX = Math.floor(segment.x / gridSize);
        const gridY = Math.floor(segment.y / gridSize);
        const key = `${gridX},${gridY}`;
        
        if (!this.spatialGrid.grid.has(key)) {
          this.spatialGrid.grid.set(key, []);
        }
        this.spatialGrid.grid.get(key)!.push(snake);
      }
    }
  }

  public start(): void {
    this.lastTime = performance.now();
    this.gameLoop();
  }

  public stop(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  private gameLoop = (): void => {
    const currentTime = performance.now();
    const deltaTime = currentTime - this.lastTime;
    
    if (deltaTime >= 1000 / 60) {
      this.fps = 1000 / deltaTime;
      this.lastTime = currentTime;
      
      this.update(deltaTime);
      this.render();
    }
    
    this.animationFrameId = requestAnimationFrame(this.gameLoop);
  };

  private update(deltaTime: number): void {
    this.foodPulseTime += deltaTime;
    
    this.updateRipples();
    
    for (const snake of this.snakes.values()) {
      snake.updateTailParticles();
    }
    
    this.updateSpatialGrid();
  }

  private render(): void {
    const ctx = this.ctx;
    
    ctx.clearRect(0, 0, this.arenaWidth, this.arenaHeight);
    
    this.drawBackground();
    this.drawGrid();
    this.drawFoods();
    this.drawRipples();
    this.drawSnakes();
    this.drawMinimap();
  }

  private drawBackground(): void {
    const ctx = this.ctx;
    const gradient = ctx.createRadialGradient(
      this.arenaWidth / 2,
      this.arenaHeight / 2,
      0,
      this.arenaWidth / 2,
      this.arenaHeight / 2,
      this.arenaWidth / 2
    );
    gradient.addColorStop(0, '#1a1a3e');
    gradient.addColorStop(0.5, '#0f0f2d');
    gradient.addColorStop(1, '#050510');
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, this.arenaWidth, this.arenaHeight);
  }

  private drawGrid(): void {
    const ctx = this.ctx;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 8]);
    
    for (let x = 0; x <= this.arenaWidth; x += this.gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, this.arenaHeight);
      ctx.stroke();
    }
    
    for (let y = 0; y <= this.arenaHeight; y += this.gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(this.arenaWidth, y);
      ctx.stroke();
    }
    
    ctx.setLineDash([]);
  }

  private drawFoods(): void {
    const ctx = this.ctx;
    const pulse = Math.sin(this.foodPulseTime / 300) * 0.2 + 1;
    
    for (const food of this.foods) {
      const centerX = food.x + this.cellSize / 2;
      const centerY = food.y + this.cellSize / 2;
      const baseRadius = (this.cellSize / 2 - 2);
      const radius = baseRadius * pulse;
      
      const glowGradient = ctx.createRadialGradient(
        centerX, centerY, 0,
        centerX, centerY, radius * 2
      );
      glowGradient.addColorStop(0, food.color + '80');
      glowGradient.addColorStop(1, food.color + '00');
      
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius * 2, 0, Math.PI * 2);
      ctx.fillStyle = glowGradient;
      ctx.fill();
      
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
      ctx.fillStyle = food.color;
      ctx.fill();
    }
  }

  private drawRipples(): void {
    const ctx = this.ctx;
    
    for (const ripple of this.ripples) {
      ctx.beginPath();
      ctx.arc(ripple.x, ripple.y, ripple.radius, 0, Math.PI * 2);
      ctx.strokeStyle = ripple.color + Math.floor(ripple.alpha * 255).toString(16).padStart(2, '0');
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  }

  private drawSnakes(): void {
    const snakeArray = Array.from(this.snakes.values());
    
    for (const snake of snakeArray) {
      if (!snake.alive) continue;
      this.drawSnake(snake);
    }
    
    for (const snake of snakeArray) {
      if (!snake.alive) continue;
      this.drawSnakeName(snake);
    }
    
    for (const snake of snakeArray) {
      if (!snake.alive) continue;
      this.drawTailParticles(snake);
    }
  }

  private drawSnake(snake: Snake): void {
    const ctx = this.ctx;
    const body = snake.body;
    
    if (body.length === 0) return;
    
    const baseColor = snake.color;
    
    for (let i = body.length - 1; i >= 0; i--) {
      const segment = body[i];
      const progress = i / Math.max(1, body.length - 1);
      
      const darkenAmount = progress * 0.4;
      const segmentColor = darkenColor(baseColor, darkenAmount);
      
      const size = i === 0 ? this.cellSize - 2 : this.cellSize - 4;
      const offset = (this.cellSize - size) / 2;
      
      ctx.fillStyle = segmentColor;
      ctx.beginPath();
      this.roundRect(
        ctx,
        segment.x + offset,
        segment.y + offset,
        size,
        size,
        6
      );
      ctx.fill();
    }
    
    const head = body[0];
    this.drawEyes(head.x, head.y, snake);
  }

  private drawEyes(headX: number, headY: number, snake: Snake): void {
    const ctx = this.ctx;
    const cellSize = this.cellSize;
    const centerX = headX + cellSize / 2;
    const centerY = headY + cellSize / 2;
    
    let eyeOffsetX = 0;
    let eyeOffsetY = 0;
    
    switch (snake.direction) {
      case 'up':
        eyeOffsetY = -3;
        break;
      case 'down':
        eyeOffsetY = 3;
        break;
      case 'left':
        eyeOffsetX = -3;
        break;
      case 'right':
        eyeOffsetX = 3;
        break;
    }
    
    const eyeSpacing = 5;
    const eyeSize = 5;
    
    ctx.fillStyle = 'white';
    
    ctx.beginPath();
    ctx.arc(centerX - eyeSpacing + eyeOffsetX, centerY - 2 + eyeOffsetY, eyeSize, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.beginPath();
    ctx.arc(centerX + eyeSpacing + eyeOffsetX, centerY - 2 + eyeOffsetY, eyeSize, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.fillStyle = '#1a1a2e';
    const pupilSize = 2.5;
    const pupilOffsetX = snake.pupilDirection.x * 2;
    const pupilOffsetY = snake.pupilDirection.y * 2;
    
    ctx.beginPath();
    ctx.arc(
      centerX - eyeSpacing + eyeOffsetX + pupilOffsetX,
      centerY - 2 + eyeOffsetY + pupilOffsetY,
      pupilSize,
      0,
      Math.PI * 2
    );
    ctx.fill();
    
    ctx.beginPath();
    ctx.arc(
      centerX + eyeSpacing + eyeOffsetX + pupilOffsetX,
      centerY - 2 + eyeOffsetY + pupilOffsetY,
      pupilSize,
      0,
      Math.PI * 2
    );
    ctx.fill();
  }

  private drawSnakeName(snake: Snake): void {
    const ctx = this.ctx;
    const head = snake.body[0];
    if (!head) return;
    
    const text = snake.name;
    ctx.font = 'bold 12px Arial, sans-serif';
    const textWidth = ctx.measureText(text).width;
    
    const x = head.x + this.cellSize / 2 - textWidth / 2;
    const y = head.y - 18;
    
    const padding = 4;
    const bgWidth = textWidth + padding * 2;
    const bgHeight = 18;
    const bgX = x - padding;
    const bgY = y - 12;
    
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    this.roundRect(ctx, bgX, bgY, bgWidth, bgHeight, 4);
    ctx.fill();
    
    ctx.fillStyle = '#1a1a2e';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(text, x, y - 10);
  }

  private drawTailParticles(snake: Snake): void {
    const ctx = this.ctx;
    
    for (const particle of snake.tailParticles) {
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
      ctx.fillStyle = snake.color + Math.floor(particle.alpha * 255).toString(16).padStart(2, '0');
      ctx.fill();
    }
  }

  private drawMinimap(): void {
    const ctx = this.minimapCtx;
    const w = this.minimapCanvas.width;
    const h = this.minimapCanvas.height;
    
    ctx.fillStyle = 'rgba(10, 10, 30, 0.9)';
    ctx.fillRect(0, 0, w, h);
    
    ctx.strokeStyle = 'rgba(74, 144, 226, 0.5)';
    ctx.lineWidth = 1;
    ctx.strokeRect(0.5, 0.5, w - 1, h - 1);
    
    const scaleX = w / this.arenaWidth;
    const scaleY = h / this.arenaHeight;
    
    for (const food of this.foods) {
      ctx.fillStyle = food.color;
      ctx.beginPath();
      ctx.arc(food.x * scaleX, food.y * scaleY, 1.5, 0, Math.PI * 2);
      ctx.fill();
    }
    
    for (const snake of this.snakes.values()) {
      if (!snake.alive || snake.body.length === 0) continue;
      
      const head = snake.body[0];
      ctx.fillStyle = snake.color;
      ctx.beginPath();
      ctx.arc(head.x * scaleX, head.y * scaleY, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private roundRect(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    radius: number
  ): void {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
  }

  public getSnakeCount(): number {
    return this.snakes.size;
  }

  public getAliveSnakeCount(): number {
    let count = 0;
    for (const snake of this.snakes.values()) {
      if (snake.alive) count++;
    }
    return count;
  }
}

let gameInstance: Game | null = null;

export function createGame(canvas: HTMLCanvasElement, minimapCanvas: HTMLCanvasElement): Game {
  gameInstance = new Game(canvas, minimapCanvas);
  return gameInstance;
}

export function getGame(): Game | null {
  return gameInstance;
}
