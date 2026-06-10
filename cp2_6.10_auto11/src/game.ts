export const CELL_SIZE = 40;
export const MAZE_COLS = 15;
export const MAZE_ROWS = 15;
export const CANVAS_WIDTH = MAZE_COLS * CELL_SIZE;
export const CANVAS_HEIGHT = MAZE_ROWS * CELL_SIZE;

export type GameState = 'title' | 'playing' | 'victory' | 'gameover';

interface Position {
  x: number;
  y: number;
}

interface Cell {
  top: boolean;
  right: boolean;
  bottom: boolean;
  left: boolean;
  visited: boolean;
}

interface Player {
  gridX: number;
  gridY: number;
  renderX: number;
  renderY: number;
  targetX: number;
  targetY: number;
  moving: boolean;
  moveProgress: number;
  flashTimer: number;
}

interface Guard {
  gridX: number;
  gridY: number;
  renderX: number;
  renderY: number;
  targetX: number;
  targetY: number;
  moving: boolean;
  moveProgress: number;
  moveTimer: number;
  direction: Position | null;
}

interface Gem {
  gridX: number;
  gridY: number;
  collected: boolean;
  collectTimer: number;
}

interface Button {
  x: number;
  y: number;
  width: number;
  height: number;
  label: string;
  hovered: boolean;
  pressed: boolean;
}

export class Game {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private maze: Cell[][];
  private player: Player;
  private guards: Guard[];
  private gems: Gem[];
  private exit: Position;
  private score: number;
  private lives: number;
  private state: GameState;
  private breathePhase: number;
  private buttons: Button[];
  private exitBreathe: number;
  private time: number;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D context not available');
    this.ctx = ctx;
    this.maze = [];
    this.player = this.createPlayer();
    this.guards = [];
    this.gems = [];
    this.exit = { x: 0, y: 0 };
    this.score = 0;
    this.lives = 3;
    this.state = 'title';
    this.breathePhase = 0;
    this.buttons = [];
    this.exitBreathe = 0;
    this.time = 0;
    this.setupInput();
    this.initButtons();
  }

  private createPlayer(): Player {
    return {
      gridX: 0,
      gridY: 0,
      renderX: 0,
      renderY: 0,
      targetX: 0,
      targetY: 0,
      moving: false,
      moveProgress: 0,
      flashTimer: 0
    };
  }

  private createGuard(x: number, y: number): Guard {
    return {
      gridX: x,
      gridY: y,
      renderX: x * CELL_SIZE + CELL_SIZE / 2,
      renderY: y * CELL_SIZE + CELL_SIZE / 2,
      targetX: x * CELL_SIZE + CELL_SIZE / 2,
      targetY: y * CELL_SIZE + CELL_SIZE / 2,
      moving: false,
      moveProgress: 0,
      moveTimer: 0,
      direction: null
    };
  }

  private createGem(x: number, y: number): Gem {
    return {
      gridX: x,
      gridY: y,
      collected: false,
      collectTimer: 0
    };
  }

  private initButtons(): void {
    this.buttons = [
      {
        x: CANVAS_WIDTH / 2 - 80,
        y: CANVAS_HEIGHT / 2 + 60,
        width: 160,
        height: 50,
        label: '重新开始',
        hovered: false,
        pressed: false
      }
    ];
  }

  private setupInput(): void {
    window.addEventListener('keydown', (e) => this.handleKeyDown(e));
    this.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
    this.canvas.addEventListener('mousedown', (e) => this.handleMouseDown(e));
    this.canvas.addEventListener('mouseup', (e) => this.handleMouseUp(e));
    this.canvas.addEventListener('mouseleave', () => {
      for (const btn of this.buttons) {
        btn.hovered = false;
        btn.pressed = false;
      }
    });
  }

  private handleKeyDown(e: KeyboardEvent): void {
    if (this.state === 'title' && e.code === 'Space') {
      this.startGame();
      return;
    }
    if (this.state !== 'playing' || this.player.moving) return;

    let dx = 0, dy = 0;
    switch (e.code) {
      case 'ArrowUp':
      case 'KeyW':
        dy = -1;
        break;
      case 'ArrowDown':
      case 'KeyS':
        dy = 1;
        break;
      case 'ArrowLeft':
      case 'KeyA':
        dx = -1;
        break;
      case 'ArrowRight':
      case 'KeyD':
        dx = 1;
        break;
    }
    if (dx !== 0 || dy !== 0) {
      e.preventDefault();
      this.tryMovePlayer(dx, dy);
    }
  }

  private getCanvasPos(e: MouseEvent): Position {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  }

  private handleMouseMove(e: MouseEvent): void {
    const pos = this.getCanvasPos(e);
    for (const btn of this.buttons) {
      btn.hovered =
        pos.x >= btn.x && pos.x <= btn.x + btn.width &&
        pos.y >= btn.y && pos.y <= btn.y + btn.height;
    }
  }

  private handleMouseDown(e: MouseEvent): void {
    const pos = this.getCanvasPos(e);
    for (const btn of this.buttons) {
      if (pos.x >= btn.x && pos.x <= btn.x + btn.width &&
          pos.y >= btn.y && pos.y <= btn.y + btn.height) {
        btn.pressed = true;
      }
    }
  }

  private handleMouseUp(e: MouseEvent): void {
    const pos = this.getCanvasPos(e);
    for (const btn of this.buttons) {
      if (btn.pressed &&
          pos.x >= btn.x && pos.x <= btn.x + btn.width &&
          pos.y >= btn.y && pos.y <= btn.y + btn.height) {
        this.handleButtonClick(btn);
      }
      btn.pressed = false;
    }
  }

  private handleButtonClick(btn: Button): void {
    if ((this.state === 'victory' || this.state === 'gameover') && btn.label === '重新开始') {
      this.startGame();
    }
  }

  public startGame(): void {
    this.generateMaze();
    this.score = 0;
    this.lives = 3;
    this.exit = { x: MAZE_COLS - 1, y: MAZE_ROWS - 1 };
    this.player = this.createPlayer();
    this.player.gridX = 0;
    this.player.gridY = 0;
    this.player.renderX = CELL_SIZE / 2;
    this.player.renderY = CELL_SIZE / 2;
    this.player.targetX = CELL_SIZE / 2;
    this.player.targetY = CELL_SIZE / 2;
    this.placeGems();
    this.placeGuards();
    this.state = 'playing';
    this.updateUI();
  }

  private generateMaze(): void {
    this.maze = [];
    for (let y = 0; y < MAZE_ROWS; y++) {
      const row: Cell[] = [];
      for (let x = 0; x < MAZE_COLS; x++) {
        row.push({
          top: true,
          right: true,
          bottom: true,
          left: true,
          visited: false
        });
      }
      this.maze.push(row);
    }

    const stack: Position[] = [];
    const startX = 0;
    const startY = 0;
    this.maze[startY][startX].visited = true;
    stack.push({ x: startX, y: startY });

    while (stack.length > 0) {
      const current = stack[stack.length - 1];
      const neighbors = this.getUnvisitedNeighbors(current.x, current.y);

      if (neighbors.length === 0) {
        stack.pop();
      } else {
        const next = neighbors[Math.floor(Math.random() * neighbors.length)];
        this.removeWall(current, next);
        this.maze[next.y][next.x].visited = true;
        stack.push(next);
      }
    }
  }

  private getUnvisitedNeighbors(x: number, y: number): Position[] {
    const neighbors: Position[] = [];
    if (y > 0 && !this.maze[y - 1][x].visited) neighbors.push({ x, y: y - 1 });
    if (x < MAZE_COLS - 1 && !this.maze[y][x + 1].visited) neighbors.push({ x: x + 1, y });
    if (y < MAZE_ROWS - 1 && !this.maze[y + 1][x].visited) neighbors.push({ x, y: y + 1 });
    if (x > 0 && !this.maze[y][x - 1].visited) neighbors.push({ x: x - 1, y });
    return neighbors;
  }

  private removeWall(a: Position, b: Position): void {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    if (dx === 1) {
      this.maze[a.y][a.x].right = false;
      this.maze[b.y][b.x].left = false;
    } else if (dx === -1) {
      this.maze[a.y][a.x].left = false;
      this.maze[b.y][b.x].right = false;
    } else if (dy === 1) {
      this.maze[a.y][a.x].bottom = false;
      this.maze[b.y][b.x].top = false;
    } else if (dy === -1) {
      this.maze[a.y][a.x].top = false;
      this.maze[b.y][b.x].bottom = false;
    }
  }

  private canMove(x: number, y: number, dx: number, dy: number): boolean {
    if (x + dx < 0 || x + dx >= MAZE_COLS || y + dy < 0 || y + dy >= MAZE_ROWS) return false;
    const cell = this.maze[y][x];
    if (dx === 1 && cell.right) return false;
    if (dx === -1 && cell.left) return false;
    if (dy === 1 && cell.bottom) return false;
    if (dy === -1 && cell.top) return false;
    return true;
  }

  private getAvailableDirections(x: number, y: number): Position[] {
    const dirs: Position[] = [];
    if (this.canMove(x, y, 0, -1)) dirs.push({ x: 0, y: -1 });
    if (this.canMove(x, y, 1, 0)) dirs.push({ x: 1, y: 0 });
    if (this.canMove(x, y, 0, 1)) dirs.push({ x: 0, y: 1 });
    if (this.canMove(x, y, -1, 0)) dirs.push({ x: -1, y: 0 });
    return dirs;
  }

  private tryMovePlayer(dx: number, dy: number): void {
    if (!this.canMove(this.player.gridX, this.player.gridY, dx, dy)) return;
    this.player.gridX += dx;
    this.player.gridY += dy;
    this.player.targetX = this.player.gridX * CELL_SIZE + CELL_SIZE / 2;
    this.player.targetY = this.player.gridY * CELL_SIZE + CELL_SIZE / 2;
    this.player.moving = true;
    this.player.moveProgress = 0;
  }

  private placeGems(): void {
    this.gems = [];
    const positions: Position[] = [];
    for (let y = 0; y < MAZE_ROWS; y++) {
      for (let x = 0; x < MAZE_COLS; x++) {
        if ((x === 0 && y === 0) || (x === this.exit.x && y === this.exit.y)) continue;
        positions.push({ x, y });
      }
    }
    for (let i = positions.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [positions[i], positions[j]] = [positions[j], positions[i]];
    }
    for (let i = 0; i < 8 && i < positions.length; i++) {
      this.gems.push(this.createGem(positions[i].x, positions[i].y));
    }
  }

  private placeGuards(): void {
    this.guards = [];
    const usedPositions = new Set<string>();
    usedPositions.add('0,0');
    usedPositions.add(`${this.exit.x},${this.exit.y}`);
    for (const gem of this.gems) {
      usedPositions.add(`${gem.gridX},${gem.gridY}`);
    }

    let placed = 0;
    let attempts = 0;
    while (placed < 3 && attempts < 500) {
      attempts++;
      const x = Math.floor(Math.random() * MAZE_COLS);
      const y = Math.floor(Math.random() * MAZE_ROWS);
      const key = `${x},${y}`;
      if (usedPositions.has(key)) continue;
      const dist = Math.abs(x - 0) + Math.abs(y - 0);
      if (dist < 4) continue;
      usedPositions.add(key);
      this.guards.push(this.createGuard(x, y));
      placed++;
    }
  }

  private moveGuard(guard: Guard): void {
    if (guard.moving) return;

    let dirs = this.getAvailableDirections(guard.gridX, guard.gridY);
    if (guard.direction && dirs.length > 1) {
      const opposite = { x: -guard.direction.x, y: -guard.direction.y };
      dirs = dirs.filter(d => !(d.x === opposite.x && d.y === opposite.y));
    }
    if (dirs.length === 0) {
      dirs = this.getAvailableDirections(guard.gridX, guard.gridY);
    }
    if (dirs.length === 0) return;

    const dir = dirs[Math.floor(Math.random() * dirs.length)];
    guard.direction = dir;
    guard.gridX += dir.x;
    guard.gridY += dir.y;
    guard.targetX = guard.gridX * CELL_SIZE + CELL_SIZE / 2;
    guard.targetY = guard.gridY * CELL_SIZE + CELL_SIZE / 2;
    guard.moving = true;
    guard.moveProgress = 0;
  }

  private checkGemCollection(): void {
    for (const gem of this.gems) {
      if (!gem.collected && gem.collectTimer === 0 &&
          gem.gridX === this.player.gridX && gem.gridY === this.player.gridY) {
        gem.collected = true;
        gem.collectTimer = 0.3;
        this.score += 100;
        this.updateUI();
      }
    }
  }

  private checkGuardCollision(): boolean {
    if (this.player.flashTimer > 0) return false;
    for (const guard of this.guards) {
      const dx = guard.gridX - this.player.gridX;
      const dy = guard.gridY - this.player.gridY;
      if (Math.abs(dx) + Math.abs(dy) === 0) {
        return true;
      }
      const prx = this.player.renderX;
      const pry = this.player.renderY;
      const grx = guard.renderX;
      const gry = guard.renderY;
      const dist = Math.sqrt((prx - grx) ** 2 + (pry - gry) ** 2);
      if (dist < 25) {
        return true;
      }
    }
    return false;
  }

  private onPlayerHit(): void {
    this.lives--;
    this.player.flashTimer = 0.5;
    this.player.gridX = 0;
    this.player.gridY = 0;
    this.player.renderX = CELL_SIZE / 2;
    this.player.renderY = CELL_SIZE / 2;
    this.player.targetX = CELL_SIZE / 2;
    this.player.targetY = CELL_SIZE / 2;
    this.player.moving = false;
    this.updateUI();
    if (this.lives <= 0) {
      this.state = 'gameover';
    }
  }

  private checkVictory(): void {
    if (this.player.gridX === this.exit.x && this.player.gridY === this.exit.y) {
      this.state = 'victory';
    }
  }

  private updateUI(): void {
    const scoreEl = document.getElementById('score');
    if (scoreEl) scoreEl.textContent = String(this.score);
    const heartsEl = document.getElementById('hearts');
    if (heartsEl) {
      heartsEl.innerHTML = '';
      for (let i = 0; i < this.lives; i++) {
        const heart = document.createElement('span');
        heart.className = 'heart';
        heart.innerHTML = this.createHeartSVG();
        heartsEl.appendChild(heart);
      }
    }
  }

  private createHeartSVG(): string {
    return `<svg viewBox="0 0 24 24" fill="#FF4444">
      <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
    </svg>`;
  }

  public update(deltaTime: number): void {
    this.time += deltaTime;
    this.breathePhase += deltaTime * 3;
    this.exitBreathe = (Math.sin(this.time * 3) + 1) / 2;

    if (this.state !== 'playing') return;

    if (this.player.moving) {
      this.player.moveProgress += deltaTime / 0.1;
      const t = Math.min(this.player.moveProgress, 1);
      const startX = this.player.targetX - (this.player.targetX - (this.player.gridX * CELL_SIZE + CELL_SIZE / 2)) * 0;
      const prevX = this.player.targetX - ((this.player.targetX - this.player.renderX) !== 0 ?
        (this.player.targetX > this.player.renderX ? CELL_SIZE : -CELL_SIZE) : 0);
      const prevY = this.player.targetY - ((this.player.targetY - this.player.renderY) !== 0 ?
        (this.player.targetY > this.player.renderY ? CELL_SIZE : -CELL_SIZE) : 0);

      if (this.player.renderX !== this.player.targetX) {
        const fromX = this.player.targetX > this.player.renderX ?
          this.player.targetX - CELL_SIZE : this.player.targetX + CELL_SIZE;
        this.player.renderX = fromX + (this.player.targetX - fromX) * t;
      }
      if (this.player.renderY !== this.player.targetY) {
        const fromY = this.player.targetY > this.player.renderY ?
          this.player.targetY - CELL_SIZE : this.player.targetY + CELL_SIZE;
        this.player.renderY = fromY + (this.player.targetY - fromY) * t;
      }
      if (t >= 1) {
        this.player.renderX = this.player.targetX;
        this.player.renderY = this.player.targetY;
        this.player.moving = false;
        this.checkGemCollection();
        this.checkVictory();
      }
    }

    if (this.player.flashTimer > 0) {
      this.player.flashTimer -= deltaTime;
    }

    for (const gem of this.gems) {
      if (gem.collectTimer > 0) {
        gem.collectTimer -= deltaTime;
      }
    }

    for (const guard of this.guards) {
      if (guard.moving) {
        guard.moveProgress += deltaTime / 1.0;
        const t = Math.min(guard.moveProgress, 1);
        if (guard.renderX !== guard.targetX) {
          const fromX = guard.targetX > guard.renderX ?
            guard.targetX - CELL_SIZE : guard.targetX + CELL_SIZE;
          guard.renderX = fromX + (guard.targetX - fromX) * t;
        }
        if (guard.renderY !== guard.targetY) {
          const fromY = guard.targetY > guard.renderY ?
            guard.targetY - CELL_SIZE : guard.targetY + CELL_SIZE;
          guard.renderY = fromY + (guard.targetY - fromY) * t;
        }
        if (t >= 1) {
          guard.renderX = guard.targetX;
          guard.renderY = guard.targetY;
          guard.moving = false;
        }
      } else {
        guard.moveTimer += deltaTime;
        if (guard.moveTimer >= 1.0) {
          guard.moveTimer = 0;
          this.moveGuard(guard);
        }
      }
    }

    if (this.checkGuardCollision()) {
      this.onPlayerHit();
    }
  }

  public render(): void {
    this.ctx.fillStyle = '#2C2C2C';
    this.ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    if (this.state === 'title') {
      this.renderTitle();
      return;
    }

    this.renderMaze();
    this.renderExit();
    this.renderGems();
    this.renderGuards();
    this.renderPlayer();

    if (this.state === 'victory') {
      this.renderVictory();
    } else if (this.state === 'gameover') {
      this.renderGameOver();
    }
  }

  private renderTitle(): void {
    this.ctx.fillStyle = '#2C2C2C';
    this.ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    this.ctx.save();
    this.ctx.shadowColor = '#FFD700';
    this.ctx.shadowBlur = 20;
    this.ctx.fillStyle = '#FFD700';
    this.ctx.font = 'bold 64px Segoe UI, Microsoft YaHei, sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText('迷宫探险', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 40);
    this.ctx.restore();

    const alpha = (Math.sin(this.breathePhase) + 1) / 2;
    this.ctx.fillStyle = `rgba(255, 255, 255, ${0.5 + alpha * 0.5})`;
    this.ctx.font = '24px Segoe UI, Microsoft YaHei, sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.fillText('按 空格键 开始游戏', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 40);

    this.ctx.fillStyle = '#888';
    this.ctx.font = '16px Segoe UI, Microsoft YaHei, sans-serif';
    this.ctx.fillText('方向键 / WASD 移动 | 收集宝石 | 躲避守卫 | 找到出口', CANVAS_WIDTH / 2, CANVAS_HEIGHT - 40);
  }

  private renderMaze(): void {
    for (let y = 0; y < MAZE_ROWS; y++) {
      for (let x = 0; x < MAZE_COLS; x++) {
        const px = x * CELL_SIZE;
        const py = y * CELL_SIZE;
        this.ctx.fillStyle = '#F5E6C8';
        this.ctx.fillRect(px, py, CELL_SIZE, CELL_SIZE);
      }
    }

    this.ctx.strokeStyle = '#4A2C1A';
    this.ctx.lineWidth = 2;
    this.ctx.lineCap = 'square';

    for (let y = 0; y < MAZE_ROWS; y++) {
      for (let x = 0; x < MAZE_COLS; x++) {
        const cell = this.maze[y][x];
        const px = x * CELL_SIZE;
        const py = y * CELL_SIZE;

        if (cell.top) {
          this.ctx.beginPath();
          this.ctx.moveTo(px, py);
          this.ctx.lineTo(px + CELL_SIZE, py);
          this.ctx.stroke();
        }
        if (cell.right) {
          this.ctx.beginPath();
          this.ctx.moveTo(px + CELL_SIZE, py);
          this.ctx.lineTo(px + CELL_SIZE, py + CELL_SIZE);
          this.ctx.stroke();
        }
        if (cell.bottom) {
          this.ctx.beginPath();
          this.ctx.moveTo(px, py + CELL_SIZE);
          this.ctx.lineTo(px + CELL_SIZE, py + CELL_SIZE);
          this.ctx.stroke();
        }
        if (cell.left) {
          this.ctx.beginPath();
          this.ctx.moveTo(px, py);
          this.ctx.lineTo(px, py + CELL_SIZE);
          this.ctx.stroke();
        }
      }
    }
  }

  private renderExit(): void {
    const px = this.exit.x * CELL_SIZE;
    const py = this.exit.y * CELL_SIZE;
    const size = CELL_SIZE;
    const padding = 4 + this.exitBreathe * 3;

    this.ctx.save();
    this.ctx.shadowColor = '#00FF00';
    this.ctx.shadowBlur = 10 + this.exitBreathe * 10;
    this.ctx.fillStyle = '#00CC00';
    this.ctx.fillRect(px + padding, py + padding, size - padding * 2, size - padding * 2);
    this.ctx.restore();

    this.ctx.fillStyle = '#00FF66';
    this.ctx.fillRect(px + 8, py + 8, size - 16, size - 16);
  }

  private renderGems(): void {
    for (const gem of this.gems) {
      if (gem.collected && gem.collectTimer <= 0) continue;
      const cx = gem.gridX * CELL_SIZE + CELL_SIZE / 2;
      const cy = gem.gridY * CELL_SIZE + CELL_SIZE / 2;

      let scale = 1;
      let alpha = 1;
      if (gem.collectTimer > 0) {
        const t = 1 - gem.collectTimer / 0.3;
        scale = 1 - t;
        alpha = 1 - t;
      }

      if (scale <= 0) continue;

      this.ctx.save();
      this.ctx.globalAlpha = alpha;
      this.ctx.translate(cx, cy);
      this.ctx.scale(scale, scale);
      this.drawStar(0, 0, 5, 14, 6, '#FFD700', '#FFA500');
      this.ctx.restore();
    }
  }

  private drawStar(cx: number, cy: number, spikes: number, outerRadius: number, innerRadius: number, fill: string, stroke: string): void {
    let rot = Math.PI / 2 * 3;
    let x = cx;
    let y = cy;
    const step = Math.PI / spikes;

    this.ctx.beginPath();
    this.ctx.moveTo(cx, cy - outerRadius);
    for (let i = 0; i < spikes; i++) {
      x = cx + Math.cos(rot) * outerRadius;
      y = cy + Math.sin(rot) * outerRadius;
      this.ctx.lineTo(x, y);
      rot += step;

      x = cx + Math.cos(rot) * innerRadius;
      y = cy + Math.sin(rot) * innerRadius;
      this.ctx.lineTo(x, y);
      rot += step;
    }
    this.ctx.lineTo(cx, cy - outerRadius);
    this.ctx.closePath();

    this.ctx.fillStyle = fill;
    this.ctx.fill();
    this.ctx.strokeStyle = stroke;
    this.ctx.lineWidth = 2;
    this.ctx.stroke();
  }

  private renderGuards(): void {
    for (const guard of this.guards) {
      const cx = guard.renderX;
      const cy = guard.renderY;
      const size = 30;
      const h = size * Math.sqrt(3) / 2;

      this.ctx.save();
      this.ctx.translate(cx, cy);
      this.ctx.beginPath();
      this.ctx.moveTo(0, -h * 2 / 3);
      this.ctx.lineTo(-size / 2, h / 3);
      this.ctx.lineTo(size / 2, h / 3);
      this.ctx.closePath();
      this.ctx.fillStyle = '#FF3333';
      this.ctx.fill();
      this.ctx.strokeStyle = '#CC0000';
      this.ctx.lineWidth = 2;
      this.ctx.stroke();
      this.ctx.restore();
    }
  }

  private renderPlayer(): void {
    const cx = this.player.renderX;
    const cy = this.player.renderY;
    const radius = 15;

    this.ctx.save();
    if (this.player.flashTimer > 0) {
      const flash = Math.floor(this.player.flashTimer * 10) % 2 === 0;
      this.ctx.fillStyle = flash ? '#FF4444' : '#4488FF';
    } else {
      this.ctx.fillStyle = '#4488FF';
    }
    this.ctx.shadowColor = '#4488FF';
    this.ctx.shadowBlur = 8;
    this.ctx.beginPath();
    this.ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.shadowBlur = 0;
    this.ctx.strokeStyle = '#2255CC';
    this.ctx.lineWidth = 2;
    this.ctx.stroke();
    this.ctx.restore();
  }

  private renderVictory(): void {
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    this.ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    this.ctx.save();
    this.ctx.shadowColor = '#FFD700';
    this.ctx.shadowBlur = 30;
    this.ctx.fillStyle = '#FFD700';
    this.ctx.font = 'bold 56px Segoe UI, Microsoft YaHei, sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText('🎉 胜利！', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 80);
    this.ctx.restore();

    this.ctx.fillStyle = '#FFFFFF';
    this.ctx.font = '28px Segoe UI, Microsoft YaHei, sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.fillText(`总得分: ${this.score}`, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 20);

    this.renderButton(this.buttons[0]);
  }

  private renderGameOver(): void {
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
    this.ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    this.ctx.save();
    this.ctx.shadowColor = '#FF4444';
    this.ctx.shadowBlur = 20;
    this.ctx.fillStyle = '#FF4444';
    this.ctx.font = 'bold 56px Segoe UI, Microsoft YaHei, sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText('游戏结束', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 80);
    this.ctx.restore();

    this.ctx.fillStyle = '#FFFFFF';
    this.ctx.font = '24px Segoe UI, Microsoft YaHei, sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.fillText(`最终得分: ${this.score}`, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 20);

    this.renderButton(this.buttons[0]);
  }

  private renderButton(btn: Button): void {
    this.ctx.save();
    let scale = 1;
    if (btn.pressed) scale = 0.95;

    const centerX = btn.x + btn.width / 2;
    const centerY = btn.y + btn.height / 2;
    this.ctx.translate(centerX, centerY);
    this.ctx.scale(scale, scale);
    this.ctx.translate(-centerX, -centerY);

    const color = btn.hovered ? '#FFA500' : '#FFD700';
    this.ctx.shadowColor = color;
    this.ctx.shadowBlur = 15;
    this.ctx.fillStyle = color;
    this.roundRect(btn.x, btn.y, btn.width, btn.height, 8);
    this.ctx.fill();

    this.ctx.shadowBlur = 0;
    this.ctx.fillStyle = '#1A1A2E';
    this.ctx.font = 'bold 20px Segoe UI, Microsoft YaHei, sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText(btn.label, btn.x + btn.width / 2, btn.y + btn.height / 2);
    this.ctx.restore();
  }

  private roundRect(x: number, y: number, w: number, h: number, r: number): void {
    this.ctx.beginPath();
    this.ctx.moveTo(x + r, y);
    this.ctx.lineTo(x + w - r, y);
    this.ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    this.ctx.lineTo(x + w, y + h - r);
    this.ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    this.ctx.lineTo(x + r, y + h);
    this.ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    this.ctx.lineTo(x, y + r);
    this.ctx.quadraticCurveTo(x, y, x + r, y);
    this.ctx.closePath();
  }
}
