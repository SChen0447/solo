import { Rabbit } from './entities';

const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;
const HEATMAP_COLS = 20;
const HEATMAP_ROWS = 15;
const CELL_WIDTH = CANVAS_WIDTH / HEATMAP_COLS;
const CELL_HEIGHT = CANVAS_HEIGHT / HEATMAP_ROWS;

export interface FoodSource {
  x: number;
  y: number;
  amount: number;
  active: boolean;
  respawnTimer: number;
  pulsePhase: number;
}

export class World {
  public foodSources: FoodSource[];
  public grassTexture: { x: number; y: number; shade: number }[];
  public heatmapData: number[][];
  public rabbitHeatmapData: number[][];
  public heatmapRefreshTimer: number;
  private readonly totalFoodCount: number = 15;

  constructor() {
    this.foodSources = [];
    this.grassTexture = [];
    this.heatmapData = Array.from({ length: HEATMAP_ROWS }, () => new Array(HEATMAP_COLS).fill(0));
    this.rabbitHeatmapData = Array.from({ length: HEATMAP_ROWS }, () => new Array(HEATMAP_COLS).fill(0));
    this.heatmapRefreshTimer = 0;
    this.generateGrassTexture();
    this.generateInitialFood();
  }

  private generateGrassTexture(): void {
    this.grassTexture = [];
    const count = Math.floor(CANVAS_WIDTH * CANVAS_HEIGHT / 80);
    for (let i = 0; i < count; i++) {
      this.grassTexture.push({
        x: Math.random() * CANVAS_WIDTH,
        y: Math.random() * CANVAS_HEIGHT,
        shade: Math.random()
      });
    }
  }

  private generateInitialFood(): void {
    this.foodSources = [];
    for (let i = 0; i < this.totalFoodCount; i++) {
      this.foodSources.push({
        x: 40 + Math.random() * (CANVAS_WIDTH - 80),
        y: 40 + Math.random() * (CANVAS_HEIGHT - 80),
        amount: 50 + Math.random() * 100,
        active: true,
        respawnTimer: 0,
        pulsePhase: Math.random() * Math.PI * 2
      });
    }
  }

  public reset(): void {
    this.generateInitialFood();
    this.heatmapData = Array.from({ length: HEATMAP_ROWS }, () => new Array(HEATMAP_COLS).fill(0));
    this.rabbitHeatmapData = Array.from({ length: HEATMAP_ROWS }, () => new Array(HEATMAP_COLS).fill(0));
    this.heatmapRefreshTimer = 0;
  }

  public update(dt: number, rabbits: Rabbit[]): void {
    for (const food of this.foodSources) {
      food.pulsePhase += dt * Math.PI * 2;
      if (!food.active) {
        food.respawnTimer -= dt;
        if (food.respawnTimer <= 0) {
          food.active = true;
          food.amount = 50 + Math.random() * 100;
          food.x = 40 + Math.random() * (CANVAS_WIDTH - 80);
          food.y = 40 + Math.random() * (CANVAS_HEIGHT - 80);
        }
      }
    }

    this.heatmapRefreshTimer += dt;
    if (this.heatmapRefreshTimer >= 5) {
      this.heatmapRefreshTimer = 0;
      this.computeHeatmaps(rabbits);
    }
  }

  private computeHeatmaps(rabbits: Rabbit[]): void {
    for (let r = 0; r < HEATMAP_ROWS; r++) {
      for (let c = 0; c < HEATMAP_COLS; c++) {
        this.heatmapData[r][c] = 0;
        this.rabbitHeatmapData[r][c] = 0;
      }
    }

    for (const food of this.foodSources) {
      if (!food.active) continue;
      const col = Math.min(HEATMAP_COLS - 1, Math.max(0, Math.floor(food.x / CELL_WIDTH)));
      const row = Math.min(HEATMAP_ROWS - 1, Math.max(0, Math.floor(food.y / CELL_HEIGHT)));
      this.heatmapData[row][col] += food.amount;
    }

    let maxFood = 1;
    for (let r = 0; r < HEATMAP_ROWS; r++) {
      for (let c = 0; c < HEATMAP_COLS; c++) {
        if (this.heatmapData[r][c] > maxFood) maxFood = this.heatmapData[r][c];
      }
    }
    for (let r = 0; r < HEATMAP_ROWS; r++) {
      for (let c = 0; c < HEATMAP_COLS; c++) {
        this.heatmapData[r][c] /= maxFood;
      }
    }

    for (const rabbit of rabbits) {
      if (!rabbit.alive) continue;
      const col = Math.min(HEATMAP_COLS - 1, Math.max(0, Math.floor(rabbit.x / CELL_WIDTH)));
      const row = Math.min(HEATMAP_ROWS - 1, Math.max(0, Math.floor(rabbit.y / CELL_HEIGHT)));
      this.rabbitHeatmapData[row][col] += 1;
    }

    let maxRabbit = 1;
    for (let r = 0; r < HEATMAP_ROWS; r++) {
      for (let c = 0; c < HEATMAP_COLS; c++) {
        if (this.rabbitHeatmapData[r][c] > maxRabbit) maxRabbit = this.rabbitHeatmapData[r][c];
      }
    }
    for (let r = 0; r < HEATMAP_ROWS; r++) {
      for (let c = 0; c < HEATMAP_COLS; c++) {
        this.rabbitHeatmapData[r][c] /= maxRabbit;
      }
    }
  }

  public getActiveFoodCount(): number {
    return this.foodSources.filter(f => f.active).length;
  }

  public drawGround(ctx: CanvasRenderingContext2D): void {
    ctx.fillStyle = '#4A7C3F';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    for (const dot of this.grassTexture) {
      const alpha = 0.05 + dot.shade * 0.15;
      ctx.fillStyle = dot.shade > 0.5
        ? `rgba(90, 140, 75, ${alpha})`
        : `rgba(60, 100, 55, ${alpha})`;
      ctx.fillRect(dot.x, dot.y, 2, 2);
    }
  }

  public drawFood(ctx: CanvasRenderingContext2D): void {
    for (const food of this.foodSources) {
      if (!food.active) continue;
      const pulse = 1 + Math.sin(food.pulsePhase) * 0.15;
      const radius = 8 * pulse;

      const gradient = ctx.createRadialGradient(food.x, food.y, 0, food.x, food.y, radius * 2);
      gradient.addColorStop(0, 'rgba(255, 248, 180, 0.6)');
      gradient.addColorStop(0.5, 'rgba(255, 240, 150, 0.3)');
      gradient.addColorStop(1, 'rgba(255, 240, 150, 0)');
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(food.x, food.y, radius * 2, 0, Math.PI * 2);
      ctx.fill();

      ctx.save();
      ctx.translate(food.x, food.y);
      ctx.fillStyle = 'rgba(255, 245, 157, 0.9)';
      for (let i = 0; i < 4; i++) {
        ctx.save();
        ctx.rotate((i * Math.PI) / 2);
        ctx.beginPath();
        ctx.ellipse(0, -radius * 0.5, radius * 0.45, radius * 0.6, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
      ctx.fillStyle = 'rgba(255, 255, 200, 0.95)';
      ctx.beginPath();
      ctx.arc(0, 0, radius * 0.35, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  public drawHeatmap(ctx: CanvasRenderingContext2D): void {
    const imageData = ctx.createImageData(HEATMAP_COLS, HEATMAP_ROWS);
    for (let r = 0; r < HEATMAP_ROWS; r++) {
      for (let c = 0; c < HEATMAP_COLS; c++) {
        const idx = (r * HEATMAP_COLS + c) * 4;
        const val = this.heatmapData[r][c];
        const { r: rr, g: gg, b: bb } = this.heatmapColor(val);
        imageData.data[idx] = rr;
        imageData.data[idx + 1] = gg;
        imageData.data[idx + 2] = bb;
        imageData.data[idx + 3] = 255;
      }
    }
    ctx.putImageData(imageData, 0, 0);
  }

  public drawRabbitHeatmap(ctx: CanvasRenderingContext2D): void {
    const imageData = ctx.createImageData(HEATMAP_COLS, HEATMAP_ROWS);
    for (let r = 0; r < HEATMAP_ROWS; r++) {
      for (let c = 0; c < HEATMAP_COLS; c++) {
        const idx = (r * HEATMAP_COLS + c) * 4;
        const val = this.rabbitHeatmapData[r][c];
        const { r: rr, g: gg, b: bb } = this.heatmapColor(val);
        imageData.data[idx] = rr;
        imageData.data[idx + 1] = gg;
        imageData.data[idx + 2] = bb;
        imageData.data[idx + 3] = Math.floor(val * 200 + 55);
      }
    }
    ctx.putImageData(imageData, 0, 0);
  }

  private heatmapColor(t: number): { r: number; g: number; b: number } {
    t = Math.max(0, Math.min(1, t));
    if (t < 0.5) {
      const k = t * 2;
      return {
        r: Math.floor(34 + (255 - 34) * k),
        g: Math.floor(139 + (200 - 139) * k),
        b: Math.floor(34 + (0 - 34) * k)
      };
    } else {
      const k = (t - 0.5) * 2;
      return {
        r: 255,
        g: Math.floor(200 - 200 * k),
        b: 0
      };
    }
  }
}
