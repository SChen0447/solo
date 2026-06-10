import { MazeGenerator, MazeGrid } from './mazeGenerator';
import { PathFinder, Point } from './pathFinder';
import { Renderer, CharacterData } from './renderer';

const MAZE_WIDTH = 15;
const MAZE_HEIGHT = 15;
const CELL_SIZE = 32;
const MAX_CHARACTERS = 5;
const MOVE_SPEED = 2;

const CHARACTER_COLORS = [
  '#e74c3c',
  '#e67e22',
  '#3498db',
  '#9b59b6',
  '#1abc9c'
];

class Application {
  private mazeGenerator: MazeGenerator;
  private pathFinder: PathFinder;
  private renderer: Renderer;
  private grid: MazeGrid;
  private characters: CharacterData[] = [];
  private activePaths: Map<number, Point[]> = new Map();
  private selectedCharacterId: number | null = null;
  private nextCharacterId: number = 1;
  private nextColorIndex: number = 0;
  private canvas: HTMLCanvasElement;

  private statCellsEl: HTMLElement;
  private statTimeEl: HTMLElement;
  private statLengthEl: HTMLElement;
  private statCoordsEl: HTMLElement;
  private regenBtn: HTMLButtonElement;
  private startBtn: HTMLButtonElement;
  private deleteBtn: HTMLButtonElement;

  private lastPathfindingTime: number = 0;
  private lastPathLength: number = 0;
  private isPathfindingRunning: boolean = false;

  constructor() {
    this.mazeGenerator = new MazeGenerator();
    this.pathFinder = new PathFinder();

    this.canvas = document.getElementById('mazeCanvas') as HTMLCanvasElement;
    if (!this.canvas) {
      throw new Error('找不到Canvas元素');
    }
    this.renderer = new Renderer(this.canvas, CELL_SIZE);

    this.statCellsEl = document.getElementById('statCells')!;
    this.statTimeEl = document.getElementById('statTime')!;
    this.statLengthEl = document.getElementById('statLength')!;
    this.statCoordsEl = document.getElementById('statCoords')!;
    this.regenBtn = document.getElementById('regenBtn') as HTMLButtonElement;
    this.startBtn = document.getElementById('startBtn') as HTMLButtonElement;
    this.deleteBtn = document.getElementById('deleteBtn') as HTMLButtonElement;

    this.grid = this.mazeGenerator.generate({ width: MAZE_WIDTH, height: MAZE_HEIGHT });
    this.renderer.resize(MAZE_WIDTH, MAZE_HEIGHT);

    this.bindEvents();
    this.updateStats();
    this.animate();
  }

  private bindEvents(): void {
    this.canvas.addEventListener('click', (e) => this.handleCanvasClick(e));

    this.regenBtn.addEventListener('click', () => this.regenerateMaze());

    this.startBtn.addEventListener('click', () => this.startPathfinding());

    this.deleteBtn.addEventListener('click', () => this.deleteSelectedCharacter());

    document.addEventListener('keydown', (e) => {
      if (e.key === 'd' || e.key === 'D') {
        this.deleteSelectedCharacter();
      }
    });
  }

  private handleCanvasClick(e: MouseEvent): void {
    const hitChar = this.renderer.hitTestCharacter(e.clientX, e.clientY, this.characters);
    if (hitChar) {
      this.selectCharacter(hitChar.id);
      return;
    }

    const { x, y } = this.renderer.getGridCoords(e.clientX, e.clientY);
    if (!this.mazeGenerator.isWalkable(this.grid, x, y)) {
      return;
    }

    const selected = this.getSelectedCharacter();
    if (selected) {
      selected.targetGridX = x;
      selected.targetGridY = y;
      this.activePaths.delete(selected.id);
      return;
    }

    if (this.characters.length >= MAX_CHARACTERS) {
      return;
    }

    this.createCharacter(x, y);
  }

  private createCharacter(gridX: number, gridY: number): void {
    const pixelCenter = this.renderer.getPixelCenter(gridX, gridY);
    const id = this.nextCharacterId++;
    const color = CHARACTER_COLORS[this.nextColorIndex % CHARACTER_COLORS.length];
    this.nextColorIndex++;

    const char: CharacterData = {
      id,
      gridX,
      gridY,
      pixelX: pixelCenter.x,
      pixelY: pixelCenter.y,
      color,
      targetGridX: null,
      targetGridY: null,
      isSelected: true,
      path: [],
      pathIndex: 0,
      isMoving: false,
      name: `角色${this.characters.length + 1}`
    };

    for (const c of this.characters) {
      c.isSelected = false;
    }
    this.characters.push(char);
    this.selectedCharacterId = id;
    this.updateStats();
  }

  private selectCharacter(id: number): void {
    for (const c of this.characters) {
      c.isSelected = c.id === id;
    }
    this.selectedCharacterId = id;
    this.updateStats();
  }

  private getSelectedCharacter(): CharacterData | null {
    return this.characters.find((c) => c.isSelected) || null;
  }

  private deleteSelectedCharacter(): void {
    if (this.selectedCharacterId === null) return;
    const idx = this.characters.findIndex((c) => c.id === this.selectedCharacterId);
    if (idx !== -1) {
      this.activePaths.delete(this.selectedCharacterId);
      this.characters.splice(idx, 1);
      this.selectedCharacterId = null;
      for (let i = 0; i < this.characters.length; i++) {
        this.characters[i].name = `角色${i + 1}`;
      }
      this.updateStats();
    }
  }

  private regenerateMaze(): void {
    this.grid = this.mazeGenerator.generate({ width: MAZE_WIDTH, height: MAZE_HEIGHT });
    this.characters = [];
    this.activePaths.clear();
    this.selectedCharacterId = null;
    this.nextCharacterId = 1;
    this.nextColorIndex = 0;
    this.lastPathfindingTime = 0;
    this.lastPathLength = 0;
    this.updateStats();
  }

  private startPathfinding(): void {
    const charsToPath: CharacterData[] = [];
    for (const c of this.characters) {
      if (c.targetGridX !== null && c.targetGridY !== null && !c.isMoving) {
        charsToPath.push(c);
      }
    }

    if (charsToPath.length === 0) return;

    this.isPathfindingRunning = true;
    this.startBtn.disabled = true;
    const originalText = this.startBtn.innerHTML;
    this.startBtn.innerHTML = '<span class="spinner"></span>计算中...';

    requestAnimationFrame(() => {
      let totalTime = 0;
      let maxLength = 0;

      for (const char of charsToPath) {
        if (char.targetGridX === null || char.targetGridY === null) continue;

        const t0 = performance.now();
        const path = this.pathFinder.findPath(
          this.grid,
          { x: char.gridX, y: char.gridY },
          { x: char.targetGridX, y: char.targetGridY }
        );
        const t1 = performance.now();
        totalTime += t1 - t0;

        if (path && path.length > 0) {
          char.path = path;
          char.pathIndex = 0;
          char.isMoving = true;
          this.activePaths.set(char.id, path);
          maxLength = Math.max(maxLength, path.length - 1);
        }
      }

      this.lastPathfindingTime = totalTime;
      this.lastPathLength = maxLength;
      this.updateStats();

      setTimeout(() => {
        this.isPathfindingRunning = false;
        this.startBtn.disabled = false;
        this.startBtn.innerHTML = originalText;
      }, 200);
    });
  }

  private updateStats(): void {
    this.statCellsEl.textContent = String(MAZE_WIDTH * MAZE_HEIGHT);
    this.statTimeEl.textContent = this.lastPathfindingTime.toFixed(1);
    this.statLengthEl.textContent = String(this.lastPathLength);

    const selected = this.getSelectedCharacter();
    if (selected) {
      this.statCoordsEl.textContent = `${selected.gridX}, ${selected.gridY}`;
    } else {
      this.statCoordsEl.textContent = '-, -';
    }
  }

  private updateCharacterMovement(deltaTime: number): void {
    for (const char of this.characters) {
      if (!char.isMoving || char.path.length === 0) continue;
      if (char.pathIndex >= char.path.length) {
        char.isMoving = false;
        char.gridX = char.path[char.path.length - 1].x;
        char.gridY = char.path[char.path.length - 1].y;
        continue;
      }

      const targetPoint = char.path[char.pathIndex];
      const targetPixel = this.renderer.getPixelCenter(targetPoint.x, targetPoint.y);

      const dx = targetPixel.x - char.pixelX;
      const dy = targetPixel.y - char.pixelY;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist <= MOVE_SPEED) {
        char.pixelX = targetPixel.x;
        char.pixelY = targetPixel.y;
        char.gridX = targetPoint.x;
        char.gridY = targetPoint.y;
        char.pathIndex++;

        if (char.pathIndex >= char.path.length) {
          char.isMoving = false;
          char.targetGridX = null;
          char.targetGridY = null;
          this.activePaths.delete(char.id);
        }
        this.updateStats();
      } else {
        const moveX = (dx / dist) * MOVE_SPEED;
        const moveY = (dy / dist) * MOVE_SPEED;
        char.pixelX += moveX;
        char.pixelY += moveY;
      }
    }
  }

  private lastTime: number = 0;

  private animate = (): void => {
    const now = performance.now();
    const deltaTime = now - this.lastTime;
    this.lastTime = now;

    this.updateCharacterMovement(deltaTime);
    this.renderer.render(this.grid, this.characters, this.activePaths, now);

    requestAnimationFrame(this.animate);
  };
}

window.addEventListener('DOMContentLoaded', () => {
  new Application();
});
