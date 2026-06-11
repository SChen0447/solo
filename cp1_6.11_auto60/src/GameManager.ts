import { Player, Direction } from './Player';
import { Obstacle } from './Obstacle';
import { Renderer, Particle, GemFlight } from './Renderer';

export const GRID_SIZE = 50;
export const CELL_SIZE = 30;
export const BASE_ORE_DENSITY = 0.15;
export const DENSITY_INCREMENT = 0.05;
export const BASE_FALL_PROBABILITY = 0.40;
export const FALL_INCREMENT = 0.05;
export const MAX_FALL_PROBABILITY = 0.80;

export type OreType = 'none' | 'stone' | 'lime' | 'copper' | 'silver' | 'gem' | 'exit';

export interface Cell {
  dug: boolean;
  ore: OreType;
  gemColor?: string;
  fragments: Fragment[];
}

export interface Fragment {
  x: number;
  y: number;
  size: number;
  opacity: number;
}

export interface FlashCell {
  row: number;
  col: number;
  startTime: number;
  duration: number;
}

export interface InventorySlot {
  color: string;
  count: number;
}

export class GameManager {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private grid: Cell[][];
  private player: Player;
  private obstacles: Obstacle[];
  private renderer: Renderer;
  private particles: Particle[];
  private gemFlights: GemFlight[];
  private flashCells: FlashCell[];

  private level: number;
  private score: number;
  private lives: number;
  private dugCount: number;
  private inventory: InventorySlot[];
  private exitRow: number;
  private exitCol: number;
  private exitVisible: boolean;

  private lastTime: number;
  private running: boolean;
  private animationFrameId: number | null;
  private gameOver: boolean;
  private gameOverTime: number;
  private levelComplete: boolean;

  private keys: Set<string>;
  private digCooldown: number;

  public get getGrid(): Cell[][] { return this.grid; }
  public get getPlayer(): Player { return this.player; }
  public get getObstacles(): Obstacle[] { return this.obstacles; }
  public get getParticles(): Particle[] { return this.particles; }
  public get getGemFlights(): GemFlight[] { return this.gemFlights; }
  public get getFlashCells(): FlashCell[] { return this.flashCells; }
  public get getLevel(): number { return this.level; }
  public get getScore(): number { return this.score; }
  public get getLives(): number { return this.lives; }
  public get getDugCount(): number { return this.dugCount; }
  public get getInventory(): InventorySlot[] { return this.inventory; }
  public get getExitRow(): number { return this.exitRow; }
  public get getExitCol(): number { return this.exitCol; }
  public get isExitVisible(): boolean { return this.exitVisible; }
  public get isGameOver(): boolean { return this.gameOver; }
  public get getGameOverTime(): number { return this.gameOverTime; }
  public get isLevelComplete(): boolean { return this.levelComplete; }

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Failed to get canvas context');
    this.ctx = ctx;

    this.grid = [];
    this.obstacles = [];
    this.particles = [];
    this.gemFlights = [];
    this.flashCells = [];
    this.level = 1;
    this.score = 0;
    this.lives = 3;
    this.dugCount = 0;
    this.inventory = [];
    this.exitVisible = false;
    this.lastTime = 0;
    this.running = false;
    this.animationFrameId = null;
    this.gameOver = false;
    this.gameOverTime = 0;
    this.levelComplete = false;
    this.keys = new Set();
    this.digCooldown = 0;
    this.exitRow = 0;
    this.exitCol = 0;

    this.resize();
    this.player = new Player(0, Math.floor(GRID_SIZE / 2));
    this.renderer = new Renderer(canvas, this);
    this.generateLevel();
    this.setupEventListeners();
  }

  public resize(): void {
    const container = this.canvas.parentElement;
    if (container) {
      this.canvas.width = container.clientWidth;
      this.canvas.height = container.clientHeight;
    }
  }

  private setupEventListeners(): void {
    window.addEventListener('keydown', (e) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' ', 'w', 'a', 's', 'd', 'W', 'A', 'S', 'D'].includes(e.key)) {
        e.preventDefault();
      }
      this.keys.add(e.key.toLowerCase());
    });

    window.addEventListener('keyup', (e) => {
      this.keys.delete(e.key.toLowerCase());
    });
  }

  private generateLevel(): void {
    const density = Math.min(BASE_ORE_DENSITY + (this.level - 1) * DENSITY_INCREMENT, 0.75);
    this.dugCount = 0;
    this.exitVisible = false;
    this.levelComplete = false;
    this.obstacles = [];
    this.particles = [];
    this.gemFlights = [];
    this.flashCells = [];

    this.grid = [];
    for (let row = 0; row < GRID_SIZE; row++) {
      const rowCells: Cell[] = [];
      for (let col = 0; col < GRID_SIZE; col++) {
        let ore: OreType = 'none';
        let gemColor: string | undefined = undefined;

        if (row <= 1) {
          ore = 'dug' as unknown as OreType;
        } else if (Math.random() < density) {
          const rand = Math.random();
          if (rand < 0.10 / density) {
            ore = 'lime';
          } else if (rand < 0.18 / density) {
            ore = 'copper';
          } else if (rand < 0.21 / density) {
            ore = 'silver';
          } else if (rand < 0.22 / density) {
            ore = 'gem';
            const hue = 180 + (this.level - 1) * 20;
            gemColor = `hsl(${Math.min(hue + Math.random() * 60, 300)}, 80%, 65%)`;
          } else {
            ore = 'stone';
          }
        }

        const fragments: Fragment[] = [];
        if (ore === ('dug' as unknown as OreType)) {
          ore = 'none';
        }

        rowCells.push({
          dug: row <= 1,
          ore,
          gemColor,
          fragments
        });
      }
      this.grid.push(rowCells);
    }

    this.exitRow = 22;
    this.exitCol = Math.floor(GRID_SIZE / 2);

    this.player.setPosition(0, Math.floor(GRID_SIZE / 2));
  }

  public start(): void {
    this.running = true;
    this.lastTime = performance.now();
    this.loop(this.lastTime);
  }

  public stop(): void {
    this.running = false;
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  private loop = (timestamp: number): void => {
    if (!this.running) return;

    const deltaTime = Math.min(timestamp - this.lastTime, 50);
    this.lastTime = timestamp;

    this.update(deltaTime);
    this.render();

    this.animationFrameId = requestAnimationFrame(this.loop);
  };

  private update(deltaTime: number): void {
    if (this.gameOver) {
      return;
    }

    if (this.levelComplete) {
      return;
    }

    if (this.digCooldown > 0) {
      this.digCooldown = Math.max(0, this.digCooldown - deltaTime);
    }

    this.player.update(deltaTime, this);

    if (this.digCooldown === 0 && !this.player.isMoving && !this.player.isDigging) {
      if (this.keys.has('arrowup') || this.keys.has('w')) {
        this.tryMove(Direction.UP);
      } else if (this.keys.has('arrowdown') || this.keys.has('s')) {
        this.tryMove(Direction.DOWN);
      } else if (this.keys.has('arrowleft') || this.keys.has('a')) {
        this.tryMove(Direction.LEFT);
      } else if (this.keys.has('arrowright') || this.keys.has('d')) {
        this.tryMove(Direction.RIGHT);
      } else if (this.keys.has(' ')) {
        this.tryDig();
      }
    }

    for (let i = this.obstacles.length - 1; i >= 0; i--) {
      const obs = this.obstacles[i];
      obs.update(deltaTime, this);
      if (obs.hitPlayer(this.player)) {
        this.handlePlayerHit();
      }
      if (obs.shouldRemove()) {
        this.obstacles.splice(i, 1);
      }
    }

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= deltaTime;
      p.x += p.vx * deltaTime / 16;
      p.y += p.vy * deltaTime / 16;
      p.vy += 0.2 * deltaTime / 16;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }

    for (let i = this.gemFlights.length - 1; i >= 0; i--) {
      const g = this.gemFlights[i];
      g.progress += deltaTime / g.duration;
      if (g.progress >= 1) {
        this.collectGem(g.color);
        this.gemFlights.splice(i, 1);
      }
    }

    const now = performance.now();
    for (let i = this.flashCells.length - 1; i >= 0; i--) {
      if (now - this.flashCells[i].startTime > this.flashCells[i].duration) {
        this.flashCells.splice(i, 1);
      }
    }

    if (this.dugCount >= 20 && !this.exitVisible) {
      this.exitVisible = true;
      this.grid[this.exitRow][this.exitCol].dug = true;
      this.grid[this.exitRow][this.exitCol].ore = 'exit';
    }

    const pr = this.player.getRow();
    const pc = this.player.getCol();
    if (this.exitVisible && pr === this.exitRow && pc === this.exitCol) {
      this.levelComplete = true;
      setTimeout(() => {
        this.level++;
        this.levelComplete = false;
        this.generateLevel();
      }, 1500);
    }
  }

  private tryMove(dir: Direction): void {
    const [dr, dc] = this.dirToOffset(dir);
    const newRow = this.player.getRow() + dr;
    const newCol = this.player.getCol() + dc;

    if (newRow < 0 || newRow >= GRID_SIZE || newCol < 0 || newCol >= GRID_SIZE) {
      return;
    }

    if (!this.grid[newRow][newCol].dug) {
      return;
    }

    this.player.setDirection(dir);
    this.player.startMove(newRow, newCol);
  }

  private tryDig(): void {
    const dir = this.player.getDirection();
    const [dr, dc] = this.dirToOffset(dir);
    const targetRow = this.player.getRow() + dr;
    const targetCol = this.player.getCol() + dc;

    if (targetRow < 0 || targetRow >= GRID_SIZE || targetCol < 0 || targetCol >= GRID_SIZE) {
      return;
    }

    if (this.grid[targetRow][targetCol].dug) {
      return;
    }

    const cell = this.grid[targetRow][targetCol];
    const oreColor = this.getOreColor(cell.ore, cell.gemColor);

    for (let i = 0; i < 4; i++) {
      if (this.particles.length < 200) {
        const angle = (Math.PI * 2 / 4) * i + Math.random() * 0.5;
        const speed = 2 + Math.random() * 3;
        this.particles.push({
          x: targetCol * CELL_SIZE + CELL_SIZE / 2,
          y: targetRow * CELL_SIZE + CELL_SIZE / 2,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          size: 2 + Math.random() * 2,
          color: oreColor,
          life: 500
        });
      }
    }

    this.flashCells.push({
      row: targetRow,
      col: targetCol,
      startTime: performance.now(),
      duration: 100
    });

    this.score += this.getOreValue(cell.ore);
    this.dugCount++;

    if (cell.ore === 'gem' && cell.gemColor) {
      this.gemFlights.push({
        fromX: targetCol * CELL_SIZE + CELL_SIZE / 2,
        fromY: targetRow * CELL_SIZE + CELL_SIZE / 2,
        toX: this.player.getPixelX() + 16,
        toY: this.player.getPixelY() + 16,
        color: cell.gemColor,
        progress: 0,
        duration: 500
      });
    }

    cell.dug = true;
    cell.ore = 'none';

    const fragments: Fragment[] = [];
    const fragCount = 3 + Math.floor(Math.random() * 4);
    for (let i = 0; i < fragCount; i++) {
      fragments.push({
        x: Math.random() * (CELL_SIZE - 4) + 2,
        y: Math.random() * (CELL_SIZE - 4) + 2,
        size: 1 + Math.random() * 2,
        opacity: 0.3
      });
    }
    cell.fragments = fragments;

    this.player.startDig();
    this.digCooldown = 500;

    this.trySpawnFallingRocks(targetRow, targetCol);
  }

  private trySpawnFallingRocks(digRow: number, digCol: number): void {
    const fallProb = Math.min(BASE_FALL_PROBABILITY + (this.level - 1) * FALL_INCREMENT, MAX_FALL_PROBABILITY);
    const positions: Array<[number, number, number]> = [
      [digRow - 1, digCol, fallProb],
      [digRow - 1, digCol - 1, fallProb * 0.75],
      [digRow - 1, digCol + 1, fallProb * 0.75]
    ];

    for (const [row, col, prob] of positions) {
      if (row < 0 || row >= GRID_SIZE || col < 0 || col >= GRID_SIZE) {
        continue;
      }
      if (!this.grid[row][col].dug && Math.random() < prob) {
        this.obstacles.push(new Obstacle(col * CELL_SIZE + (CELL_SIZE - 15) / 2, row * CELL_SIZE + (CELL_SIZE - 15) / 2));
        this.grid[row][col].dug = true;
        this.grid[row][col].ore = 'none';
      }
    }
  }

  private handlePlayerHit(): void {
    this.lives--;
    if (this.lives <= 0) {
      this.gameOver = true;
      this.gameOverTime = performance.now();
    }
  }

  private collectGem(color: string): void {
    this.player.triggerGoldenGlow();
    let added = false;
    for (const slot of this.inventory) {
      if (slot.color === color && slot.count < 3) {
        slot.count++;
        added = true;
        break;
      }
    }
    if (!added && this.inventory.length < 5) {
      this.inventory.push({ color, count: 1 });
    }
    this.score += 50;
  }

  private dirToOffset(dir: Direction): [number, number] {
    switch (dir) {
      case Direction.UP: return [-1, 0];
      case Direction.DOWN: return [1, 0];
      case Direction.LEFT: return [0, -1];
      case Direction.RIGHT: return [0, 1];
    }
  }

  private getOreValue(ore: OreType): number {
    switch (ore) {
      case 'lime': return 5;
      case 'copper': return 10;
      case 'silver': return 25;
      case 'gem': return 50;
      case 'stone': return 1;
      default: return 0;
    }
  }

  public getOreColor(ore: OreType, gemColor?: string): string {
    switch (ore) {
      case 'lime': return '#a8a8a8';
      case 'copper': return '#e67e22';
      case 'silver': return '#c0c0c0';
      case 'gem': return gemColor || '#e74c3c';
      case 'stone': return '#7f6650';
      default: return '#5a4030';
    }
  }

  public isCellDug(row: number, col: number): boolean {
    if (row < 0 || row >= GRID_SIZE || col < 0 || col >= GRID_SIZE) return false;
    return this.grid[row][col].dug;
  }

  private render(): void {
    this.renderer.render();
  }
}
