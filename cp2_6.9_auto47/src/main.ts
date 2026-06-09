import { MazeGrid, Position, HiddenZone } from './mazeGrid';
import { GrowthEngine, VineBranch, VineSegment } from './growthEngine';
import { PuzzleGame } from './puzzleGame';

type GameState = 'menu' | 'playing' | 'puzzle' | 'won' | 'lost';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
  type: 'victory' | 'nutrition';
}

interface UIState {
  controlPanel: {
    x: number;
    y: number;
    width: number;
    height: number;
    sliderX: number;
    sliderY: number;
    sliderWidth: number;
    draggingSlider: boolean;
  };
}

class Game {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private maze!: MazeGrid;
  private growth!: GrowthEngine;
  private puzzle!: PuzzleGame;
  private state: GameState;
  private particles: Particle[];
  private ui!: UIState;
  private lastTime: number;
  private gameStartTime: number;
  private timeLimit: number;
  private remainingTime: number;
  private winTime: number;
  private winCells: number;
  private mouseX: number;
  private mouseY: number;
  private startButtonHover: boolean;
  private animFrameId: number;

  constructor() {
    this.canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
    this.ctx = this.canvas.getContext('2d')!;
    this.state = 'menu';
    this.particles = [];
    this.lastTime = 0;
    this.gameStartTime = 0;
    this.timeLimit = 120;
    this.remainingTime = this.timeLimit;
    this.winTime = 0;
    this.winCells = 0;
    this.mouseX = 0;
    this.mouseY = 0;
    this.startButtonHover = false;
    this.animFrameId = 0;

    this.initGame();
    this.bindEvents();
    this.loop(performance.now());
  }

  private initGame(): void {
    this.maze = new MazeGrid(20, 20, 40);
    this.growth = new GrowthEngine(this.maze);
    this.puzzle = new PuzzleGame(this.maze);

    this.ui = {
      controlPanel: {
        x: 0,
        y: this.canvas.height / 2 - 20,
        width: 180,
        height: 40,
        sliderX: 0,
        sliderY: 0,
        sliderWidth: 100,
        draggingSlider: false,
      },
    };

    this.ui.controlPanel.sliderX = 60;
    this.ui.controlPanel.sliderY = this.ui.controlPanel.y + 18;

    this.puzzle.onSolve = () => this.handlePuzzleSolved();
  }

  private bindEvents(): void {
    window.addEventListener('keydown', (e) => this.handleKeyDown(e));
    this.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
    this.canvas.addEventListener('mousedown', (e) => this.handleMouseDown(e));
    this.canvas.addEventListener('mouseup', () => this.handleMouseUp());
    this.canvas.addEventListener('mouseleave', () => this.handleMouseUp());
  }

  private handleKeyDown(e: KeyboardEvent): void {
    if (this.state !== 'playing') return;

    let dir: Position | null = null;
    switch (e.key.toLowerCase()) {
      case 'arrowup':
      case 'w':
        dir = { x: 0, y: -1 };
        break;
      case 'arrowdown':
      case 's':
        dir = { x: 0, y: 1 };
        break;
      case 'arrowleft':
      case 'a':
        dir = { x: -1, y: 0 };
        break;
      case 'arrowright':
      case 'd':
        dir = { x: 1, y: 0 };
        break;
    }

    if (dir) {
      e.preventDefault();
      this.growth.setPendingDirection(dir);
    }
  }

  private getCanvasMouse(e: MouseEvent): { x: number; y: number } {
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  }

  private handleMouseMove(e: MouseEvent): void {
    const pos = this.getCanvasMouse(e);
    this.mouseX = pos.x;
    this.mouseY = pos.y;

    if (this.state === 'menu') {
      const btn = this.getStartButtonRect();
      this.startButtonHover =
        pos.x >= btn.x &&
        pos.x <= btn.x + btn.w &&
        pos.y >= btn.y &&
        pos.y <= btn.y + btn.h;
    }

    if (this.state === 'puzzle' && this.puzzle.active) {
      const centerX = this.canvas.width / 2;
      const centerY = this.canvas.height / 2;
      if (this.puzzle.isPointInPuzzle(pos.x, pos.y, centerX, centerY)) {
        const offset = this.puzzle.getPuzzleOffset(centerX, centerY);
        this.puzzle.handleMouseMove(pos.x, pos.y, offset.x, offset.y);
      }
    }

    if (this.ui.controlPanel.draggingSlider) {
      this.updateSliderFromMouse(pos.x);
    }
  }

  private handleMouseDown(e: MouseEvent): void {
    const pos = this.getCanvasMouse(e);

    if (this.state === 'menu') {
      const btn = this.getStartButtonRect();
      if (
        pos.x >= btn.x &&
        pos.x <= btn.x + btn.w &&
        pos.y >= btn.y &&
        pos.y <= btn.y + btn.h
      ) {
        this.startGame();
      }
      return;
    }

    if (this.state === 'puzzle' && this.puzzle.active) {
      const centerX = this.canvas.width / 2;
      const centerY = this.canvas.height / 2;
      if (this.puzzle.isPointInPuzzle(pos.x, pos.y, centerX, centerY)) {
        const offset = this.puzzle.getPuzzleOffset(centerX, centerY);
        this.puzzle.handleMouseDown(pos.x, pos.y, offset.x, offset.y);
      }
      return;
    }

    if (this.state === 'playing') {
      if (this.isPointOnSlider(pos.x, pos.y)) {
        this.ui.controlPanel.draggingSlider = true;
        this.updateSliderFromMouse(pos.x);
        return;
      }

      const cellSize = this.maze.cellSize;
      const mazeX = Math.floor(pos.x / cellSize);
      const mazeY = Math.floor(pos.y / cellSize);
      this.growth.addLightPoint(mazeX, mazeY);
    }
  }

  private handleMouseUp(): void {
    this.ui.controlPanel.draggingSlider = false;
    if (this.puzzle.active) {
      this.puzzle.handleMouseUp();
    }
  }

  private isPointOnSlider(x: number, y: number): boolean {
    const cp = this.ui.controlPanel;
    const sliderThumbW = 16;
    const sliderTrackY = cp.sliderY;
    const sliderTrackH = 6;
    return (
      x >= cp.sliderX - sliderThumbW / 2 &&
      x <= cp.sliderX + cp.sliderWidth + sliderThumbW / 2 &&
      y >= sliderTrackY - sliderTrackH &&
      y <= sliderTrackY + sliderTrackH + 10
    );
  }

  private updateSliderFromMouse(x: number): void {
    const cp = this.ui.controlPanel;
    const rawX = x - cp.sliderX;
    const t = Math.max(0, Math.min(1, rawX / cp.sliderWidth));
    const intensity = Math.round(1 + t * 99);
    this.growth.setLightIntensity(intensity);
  }

  private getStartButtonRect(): { x: number; y: number; w: number; h: number } {
    const w = 200;
    const h = 60;
    return {
      x: this.canvas.width / 2 - w / 2,
      y: this.canvas.height / 2 - h / 2,
      w,
      h,
    };
  }

  private startGame(): void {
    this.state = 'playing';
    this.gameStartTime = Date.now();
    this.remainingTime = this.timeLimit;
    this.particles = [];
  }

  private handlePuzzleSolved(): void {
    const hiddenZone = this.maze.hiddenZones.find(z => !z.solved && z.puzzleTriggered);
    if (hiddenZone) {
      this.maze.solveHiddenZone(hiddenZone.id);
      this.spawnNutritionParticles(hiddenZone);
    }
    this.puzzle.hide();
    this.state = 'playing';
  }

  private spawnNutritionParticles(zone: HiddenZone): void {
    const cellSize = this.maze.cellSize;
    for (const cell of zone.cells) {
      for (let i = 0; i < 8; i++) {
        this.particles.push({
          x: (cell.x + 0.5) * cellSize,
          y: (cell.y + 0.5) * cellSize,
          vx: (Math.random() - 0.5) * 3,
          vy: (Math.random() - 0.5) * 3 - 2,
          life: 1,
          maxLife: 1,
          size: 3 + Math.random() * 3,
          color: '#FFD700',
          type: 'nutrition',
        });
      }
    }
  }

  private spawnVictoryParticles(): void {
    for (let i = 0; i < 150; i++) {
      const angle = (Math.PI * 2 * i) / 150;
      const speed = 2 + Math.random() * 6;
      this.particles.push({
        x: this.canvas.width / 2,
        y: this.canvas.height / 2,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 2,
        maxLife: 2,
        size: 3 + Math.random() * 5,
        color: i % 3 === 0 ? '#FFD700' : i % 3 === 1 ? '#FFA500' : '#FF6347',
        type: 'victory',
      });
    }
  }

  private updateParticles(deltaTime: number): void {
    const gravity = this.state === 'won' ? 0.05 : 0.15;
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += gravity;
      p.life -= deltaTime;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }
  }

  private update(deltaTime: number, now: number): void {
    if (this.state === 'puzzle') {
      this.puzzle.update(deltaTime);
      return;
    }

    if (this.state === 'playing') {
      this.remainingTime = Math.max(0, this.timeLimit - (now - this.gameStartTime) / 1000);
      if (this.remainingTime <= 0) {
        this.state = 'lost';
      }

      const result = this.growth.update(now);

      if (result.reachedExit) {
        this.state = 'won';
        this.winTime = this.timeLimit - this.remainingTime;
        this.winCells = this.growth.getTotalCells();
        this.spawnVictoryParticles();
      }

      if (result.hiddenZoneComplete !== null) {
        const zone = this.maze.hiddenZones.find(z => z.id === result.hiddenZoneComplete);
        if (zone && !zone.solved && !zone.puzzleTriggered) {
          zone.puzzleTriggered = true;
          this.state = 'puzzle';
          this.puzzle.show();
        }
      } else if (result.triggeredHiddenZone !== null) {
        const zone = this.maze.hiddenZones.find(z => z.id === result.triggeredHiddenZone);
        if (zone && !zone.solved && !zone.puzzleTriggered) {
          if (this.maze.isHiddenZoneComplete(zone.id)) {
            zone.puzzleTriggered = true;
            this.state = 'puzzle';
            this.puzzle.show();
          }
        }
      }
    }

    this.updateParticles(deltaTime);
  }

  private renderBackground(): void {
    const grad = this.ctx.createLinearGradient(0, 0, 0, this.canvas.height);
    grad.addColorStop(0, '#0F172A');
    grad.addColorStop(1, '#1E293B');
    this.ctx.fillStyle = grad;
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
  }

  private renderMaze(): void {
    const cellSize = this.maze.cellSize;
    const now = Date.now();

    for (let y = 0; y < this.maze.height; y++) {
      for (let x = 0; x < this.maze.width; x++) {
        const cell = this.maze.getCell(x, y)!;
        const px = x * cellSize;
        const py = y * cellSize;

        if (cell.type === 'wall') {
          if (cell.transparent) {
            const grad = this.ctx.createLinearGradient(px, py, px + cellSize, py + cellSize);
            grad.addColorStop(0, 'rgba(45, 80, 22, 0.5)');
            grad.addColorStop(1, 'rgba(107, 66, 38, 0.5)');
            this.ctx.fillStyle = grad;
          } else {
            const grad = this.ctx.createLinearGradient(px, py, px + cellSize, py + cellSize);
            grad.addColorStop(0, '#2D5016');
            grad.addColorStop(1, '#6B4226');
            this.ctx.fillStyle = grad;
          }
          this.ctx.fillRect(px, py, cellSize, cellSize);
        } else {
          this.ctx.fillStyle = '#F5F0E1';
          this.ctx.fillRect(px, py, cellSize, cellSize);

          if (cell.type === 'entrance') {
            this.ctx.fillStyle = '#7EC850';
            this.ctx.fillRect(px + 4, py + 4, cellSize - 8, cellSize - 8);
          } else if (cell.type === 'exit') {
            this.ctx.fillStyle = '#FFD700';
            this.ctx.fillRect(px + 4, py + 4, cellSize - 8, cellSize - 8);
            this.ctx.fillStyle = '#B8860B';
            this.ctx.font = 'bold 16px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('★', px + cellSize / 2, py + cellSize / 2 + 5);
          } else if (cell.type === 'hidden') {
            const zone = this.maze.hiddenZones.find(z => z.id === cell.hiddenId);
            if (zone && zone.solved) {
              const blink = Math.sin(now / 750) * 0.3 + 0.7;
              this.ctx.fillStyle = `rgba(255, 215, 0, ${blink})`;
              this.ctx.beginPath();
              this.ctx.arc(px + cellSize / 2, py + cellSize / 2, 5, 0, Math.PI * 2);
              this.ctx.fill();
              this.ctx.strokeStyle = `rgba(255, 215, 0, ${blink * 0.5})`;
              this.ctx.lineWidth = 2;
              this.ctx.stroke();
            } else {
              this.ctx.fillStyle = 'rgba(168, 85, 247, 0.4)';
              this.ctx.fillRect(px + 2, py + 2, cellSize - 4, cellSize - 4);
            }
          }

          if (cell.visited) {
            const age = now - (cell.highlightUntil ? cell.highlightUntil - 1500 : now);
            const visitedOpacity = Math.max(0.15, 0.7 - age / 5000);
            this.ctx.fillStyle = `rgba(126, 200, 80, ${visitedOpacity})`;
            this.ctx.fillRect(px, py, cellSize, cellSize);
          }

          if (cell.highlightUntil && now < cell.highlightUntil) {
            const t = (cell.highlightUntil - now) / 1500;
            this.ctx.strokeStyle = `rgba(255, 255, 255, ${t})`;
            this.ctx.lineWidth = 2;
            this.ctx.strokeRect(px + 1, py + 1, cellSize - 2, cellSize - 2);
          }
        }

        if (cell.type !== 'wall' && cell.nutrition > 0) {
          this.ctx.fillStyle = `rgba(126, 200, 80, ${cell.nutrition / 500})`;
          this.ctx.fillRect(px, py, cellSize, cellSize);
        }
      }
    }
  }

  private renderLightPoints(): void {
    const cellSize = this.maze.cellSize;
    const now = Date.now();

    for (const lp of this.growth.lightPoints) {
      const age = now - lp.createdAt;
      const fadeFactor = Math.max(0, 1 - age / lp.duration);
      const cx = (lp.x + 0.5) * cellSize;
      const cy = (lp.y + 0.5) * cellSize;
      const rPixels = lp.radius * cellSize;

      const grad = this.ctx.createRadialGradient(cx, cy, 0, cx, cy, rPixels);
      grad.addColorStop(0, `rgba(255, 221, 87, ${0.7 * fadeFactor})`);
      grad.addColorStop(0.5, `rgba(255, 159, 67, ${0.4 * fadeFactor})`);
      grad.addColorStop(1, 'rgba(255, 159, 67, 0)');

      this.ctx.fillStyle = grad;
      this.ctx.beginPath();
      this.ctx.arc(cx, cy, rPixels, 0, Math.PI * 2);
      this.ctx.fill();
    }
  }

  private renderVineBranch(branch: VineBranch): void {
    if (branch.segments.length < 1) return;

    const cellSize = this.maze.cellSize;
    const ctx = this.ctx;
    const wiltAlpha = branch.wilting ? 1 - branch.wiltProgress : 1;

    ctx.save();
    ctx.globalAlpha = wiltAlpha;

    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    for (let i = 0; i < branch.segments.length - 1; i++) {
      const seg1 = branch.segments[i];
      const seg2 = branch.segments[i + 1];
      const x1 = (seg1.x + 0.5) * cellSize;
      const y1 = (seg1.y + 0.5) * cellSize;
      const x2 = (seg2.x + 0.5) * cellSize;
      const y2 = (seg2.y + 0.5) * cellSize;

      const avgThickness = (seg1.thickness + seg2.thickness) / 2;

      if (branch.wilting) {
        ctx.strokeStyle = `rgba(200, 200, 200, ${wiltAlpha})`;
        ctx.lineWidth = avgThickness * (1 - branch.wiltProgress);
      } else {
        ctx.strokeStyle = this.growth.getSegmentColor(seg2, branch);
        ctx.lineWidth = avgThickness;
      }

      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    }

    if (!branch.wilting) {
      const tip = branch.segments[branch.segments.length - 1];
      const tipX = (tip.x + 0.5) * cellSize;
      const tipY = (tip.y + 0.5) * cellSize;
      const tipColor = tip.isBranch ? '#4ECDC4' : '#7EC850';

      ctx.fillStyle = tipColor;
      ctx.beginPath();
      ctx.arc(tipX, tipY, tip.thickness + 1, 0, Math.PI * 2);
      ctx.fill();

      ctx.shadowColor = tipColor;
      ctx.shadowBlur = 10;
      ctx.fillStyle = tipColor;
      ctx.beginPath();
      ctx.arc(tipX, tipY, tip.thickness * 0.6, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    ctx.restore();
  }

  private renderVines(): void {
    for (const branch of this.growth.branches) {
      if (!branch.isMain && !branch.active) continue;
      this.renderVineBranch(branch);
    }
  }

  private renderNotifications(): void {
    const cellSize = this.maze.cellSize;
    const now = Date.now();
    const ctx = this.ctx;

    for (let i = this.maze.notifications.length - 1; i >= 0; i--) {
      const n = this.maze.notifications[i];
      if (now >= n.until) {
        this.maze.notifications.splice(i, 1);
        continue;
      }

      const t = (n.until - now) / 3000;
      const cx = (n.x + 0.5) * cellSize;
      const cy = (n.y) * cellSize - 20 - (1 - t) * 30;

      ctx.save();
      ctx.globalAlpha = Math.min(1, t * 3);
      ctx.font = 'bold 14px "Segoe UI", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
      ctx.fillText(n.text, cx + 1, cy + 1);
      ctx.fillStyle = '#FFFFFF';
      ctx.fillText(n.text, cx, cy);
      ctx.restore();
    }
  }

  private renderParticles(): void {
    for (const p of this.particles) {
      const alpha = Math.min(1, p.life / p.maxLife);
      this.ctx.save();
      this.ctx.globalAlpha = alpha;
      this.ctx.fillStyle = p.color;
      this.ctx.shadowColor = p.color;
      this.ctx.shadowBlur = 8;
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, p.size * alpha, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.restore();
    }
  }

  private renderControlPanel(): void {
    const ctx = this.ctx;
    const cp = this.ui.controlPanel;

    ctx.save();

    ctx.fillStyle = 'rgba(15, 23, 42, 0.7)';
    ctx.backdropFilter = 'blur(10px)';
    ctx.beginPath();
    ctx.roundRect(cp.x, cp.y, cp.width, cp.height, 8);
    ctx.fill();

    ctx.strokeStyle = 'rgba(59, 130, 246, 0.3)';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.fillStyle = '#FFFFFF';
    ctx.font = '12px "Segoe UI", sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`🌿 ${this.growth.getTotalCells()}格`, 10, cp.y + 16);

    const intensity = this.growth.lightIntensity;
    const t = (intensity - 1) / 99;
    const thumbX = cp.sliderX + t * cp.sliderWidth;

    ctx.fillStyle = 'rgba(59, 130, 246, 0.3)';
    ctx.fillRect(cp.sliderX, cp.sliderY, cp.sliderWidth, 4);
    ctx.fillStyle = '#3B82F6';
    ctx.fillRect(cp.sliderX, cp.sliderY, t * cp.sliderWidth, 4);

    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 10px "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`${intensity}`, thumbX, cp.sliderY - 4);

    ctx.fillStyle = '#93C5FD';
    ctx.beginPath();
    ctx.arc(thumbX, cp.sliderY + 2, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#3B82F6';
    ctx.beginPath();
    ctx.arc(thumbX, cp.sliderY + 2, 5, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#94A3B8';
    ctx.font = '9px "Segoe UI", sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText('💡光照', cp.width - 8, cp.y + 16);

    ctx.restore();
  }

  private renderCountdown(): void {
    const ctx = this.ctx;
    const minutes = Math.floor(this.remainingTime / 60);
    const seconds = Math.floor(this.remainingTime % 60);
    const timeStr = `${minutes}:${seconds.toString().padStart(2, '0')}`;

    ctx.save();

    const lowTime = this.remainingTime <= 10;
    const pulse = lowTime ? Math.sin(Date.now() / 200) * 0.2 + 0.8 : 1;

    ctx.font = 'bold 32px "Segoe UI", monospace';
    ctx.textAlign = 'right';
    ctx.fillStyle = lowTime ? `rgba(239, 68, 68, ${pulse})` : '#FFFFFF';
    ctx.shadowColor = lowTime ? '#EF4444' : 'rgba(0,0,0,0.5)';
    ctx.shadowBlur = 10;
    ctx.fillText(`⏱ ${timeStr}`, this.canvas.width - 20, 45);

    ctx.font = '11px "Segoe UI", sans-serif';
    ctx.fillStyle = '#94A3B8';
    ctx.shadowBlur = 0;
    ctx.fillText('剩余时间', this.canvas.width - 20, 65);

    ctx.restore();
  }

  private renderMenu(): void {
    this.renderBackground();
    this.renderMaze();

    const ctx = this.ctx;
    const btn = this.getStartButtonRect();

    ctx.save();
    ctx.fillStyle = 'rgba(15, 23, 42, 0.6)';
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    const scale = this.startButtonHover ? 1.05 : 1;
    const cx = btn.x + btn.w / 2;
    const cy = btn.y + btn.h / 2;

    ctx.translate(cx, cy);
    ctx.scale(scale, scale);
    ctx.translate(-cx, -cy);

    ctx.fillStyle = 'rgba(59, 130, 246, 0.9)';
    ctx.beginPath();
    ctx.roundRect(btn.x, btn.y, btn.w, btn.h, 12);
    ctx.fill();

    ctx.strokeStyle = '#60A5FA';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.shadowColor = '#3B82F6';
    ctx.shadowBlur = this.startButtonHover ? 20 : 10;
    ctx.stroke();
    ctx.shadowBlur = 0;

    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 22px "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('点击开始', cx, cy + 8);

    ctx.restore();

    ctx.save();
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 36px "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('🌿 智能藤蔓迷宫', this.canvas.width / 2, this.canvas.height / 2 - 100);

    ctx.fillStyle = '#94A3B8';
    ctx.font = '16px "Segoe UI", sans-serif';
    ctx.fillText('光敏复合生长 · 仿生路径规划', this.canvas.width / 2, this.canvas.height / 2 - 65);

    ctx.fillStyle = '#CBD5E1';
    ctx.font = '13px "Segoe UI", sans-serif';
    const lines = [
      '🎮 WASD / 方向键控制藤蔓走向',
      '🖱️ 点击迷宫路径放置光照点引导生长',
      '💡 调节光照强度滑块影响光照半径',
      '🧩 覆盖隐藏区触发拼图解锁捷径',
      '🏆 120秒内找到金色出口即可通关！',
    ];
    lines.forEach((line, i) => {
      ctx.fillText(line, this.canvas.width / 2, this.canvas.height / 2 + 70 + i * 24);
    });
    ctx.restore();
  }

  private renderWinScreen(): void {
    const ctx = this.ctx;
    ctx.save();

    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    ctx.fillStyle = '#FFD700';
    ctx.font = 'bold 48px "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.shadowColor = '#FFD700';
    ctx.shadowBlur = 20;
    ctx.fillText('🏆 通关成功！', this.canvas.width / 2, this.canvas.height / 2 - 60);
    ctx.shadowBlur = 0;

    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 24px "Segoe UI", sans-serif';
    ctx.fillText(`⏱ 用时：${this.winTime.toFixed(1)} 秒`, this.canvas.width / 2, this.canvas.height / 2);
    ctx.fillText(`🌿 生长格子数：${this.winCells} 格`, this.canvas.width / 2, this.canvas.height / 2 + 40);

    ctx.fillStyle = '#94A3B8';
    ctx.font = '16px "Segoe UI", sans-serif';
    ctx.fillText('刷新页面重新挑战', this.canvas.width / 2, this.canvas.height / 2 + 100);

    ctx.restore();
  }

  private renderLoseScreen(): void {
    const ctx = this.ctx;
    ctx.save();

    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    ctx.fillStyle = '#EF4444';
    ctx.font = 'bold 48px "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.shadowColor = '#EF4444';
    ctx.shadowBlur = 20;
    ctx.fillText('⏰ 时间耗尽！', this.canvas.width / 2, this.canvas.height / 2 - 40);
    ctx.shadowBlur = 0;

    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 22px "Segoe UI", sans-serif';
    ctx.fillText(`🌿 生长了 ${this.growth.getTotalCells()} 格`, this.canvas.width / 2, this.canvas.height / 2 + 20);

    ctx.fillStyle = '#94A3B8';
    ctx.font = '16px "Segoe UI", sans-serif';
    ctx.fillText('刷新页面重新挑战', this.canvas.width / 2, this.canvas.height / 2 + 70);

    ctx.restore();
  }

  private render(): void {
    if (this.state === 'menu') {
      this.renderMenu();
      return;
    }

    this.renderBackground();
    this.renderMaze();
    this.renderLightPoints();
    this.renderVines();
    this.renderNotifications();
    this.renderParticles();
    this.renderControlPanel();
    this.renderCountdown();

    if (this.state === 'puzzle') {
      this.puzzle.render(this.ctx, this.canvas.width / 2, this.canvas.height / 2);
    }

    if (this.state === 'won') {
      this.renderWinScreen();
    } else if (this.state === 'lost') {
      this.renderLoseScreen();
    }
  }

  private loop = (timestamp: number): void => {
    const deltaTime = Math.min((timestamp - this.lastTime) / 1000, 0.1);
    this.lastTime = timestamp;

    const now = Date.now();
    this.update(deltaTime, now);
    this.render();

    this.animFrameId = requestAnimationFrame(this.loop);
  };
}

window.addEventListener('DOMContentLoaded', () => {
  new Game();
});
