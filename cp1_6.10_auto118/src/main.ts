import {
  GridManager,
  GRID_COLS,
  GRID_ROWS,
  CELL_WIDTH,
  CELL_HEIGHT,
  GRID_OFFSET_Y,
  PathPoint,
} from './grid';
import { EnemyManager } from './enemy';
import { TowerManager, TowerType, TOWER_CONFIGS } from './tower';

const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 690;
const TOP_BAR_HEIGHT = 40;
const BOTTOM_BAR_HEIGHT = 50;
const GRID_BOTTOM = GRID_OFFSET_Y + GRID_ROWS * CELL_HEIGHT;

interface Button {
  x: number;
  y: number;
  width: number;
  height: number;
  hovered: boolean;
  pressed: boolean;
  pressTimer: number;
  disabled: boolean;
  disabledTimer: number;
}

interface TowerButton extends Button {
  type: TowerType;
  selected: boolean;
}

class Game {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private gridManager: GridManager;
  private enemyManager: EnemyManager;
  private towerManager: TowerManager;

  private lives = 20;
  private gold = 100;
  private wave = 0;
  private currentPath: PathPoint[] | null = null;
  private selectedTowerType: TowerType | null = 'basic';

  private mouseX = 0;
  private mouseY = 0;
  private mouseGrid: { gridX: number; gridY: number; x: number; y: number } | null = null;

  private towerButtons: TowerButton[] = [];
  private startWaveButton: Button = {
    x: 0, y: 0, width: 60, height: 30,
    hovered: false, pressed: false, pressTimer: 0,
    disabled: false, disabledTimer: 0,
  };

  private lastTime = 0;
  private waveTimer = 0;
  private waveInterval = 30000;

  constructor() {
    this.canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
    this.ctx = this.canvas.getContext('2d')!;
    this.gridManager = new GridManager();
    this.enemyManager = new EnemyManager();
    this.towerManager = new TowerManager();

    this.initUI();
    this.bindEvents();
    this.recalculatePath();
    this.lastTime = performance.now();
    requestAnimationFrame(this.loop.bind(this));
  }

  private initUI(): void {
    const bottomY = GRID_BOTTOM + 10;
    const types: TowerType[] = ['basic', 'slow', 'aoe'];
    const startX = 20;
    const gap = 15;

    for (let i = 0; i < types.length; i++) {
      this.towerButtons.push({
        type: types[i],
        x: startX + i * (40 + gap),
        y: bottomY,
        width: 40,
        height: 40,
        hovered: false,
        pressed: false,
        pressTimer: 0,
        disabled: false,
        disabledTimer: 0,
        selected: types[i] === this.selectedTowerType,
      });
    }

    this.startWaveButton.x = CANVAS_WIDTH - 80;
    this.startWaveButton.y = bottomY + 5;
  }

  private bindEvents(): void {
    this.canvas.addEventListener('mousemove', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      this.mouseX = (e.clientX - rect.left) * (this.canvas.width / rect.width);
      this.mouseY = (e.clientY - rect.top) * (this.canvas.height / rect.height);

      for (const btn of this.towerButtons) {
        btn.hovered = this.isInside(this.mouseX, this.mouseY, btn);
      }
      this.startWaveButton.hovered = this.isInside(this.mouseX, this.mouseY, this.startWaveButton);

      if (this.mouseY >= GRID_OFFSET_Y && this.mouseY < GRID_BOTTOM) {
        const grid = this.gridManager.gridFromPixel(this.mouseX, this.mouseY);
        if (grid) {
          const center = this.gridManager.getCellCenter(grid.gridX, grid.gridY);
          this.mouseGrid = { ...grid, x: center.x, y: center.y };
        } else {
          this.mouseGrid = null;
        }
      } else {
        this.mouseGrid = null;
      }
    });

    this.canvas.addEventListener('mousedown', (e) => {
      if (e.button !== 0) return;
      for (const btn of this.towerButtons) {
        if (this.isInside(this.mouseX, this.mouseY, btn)) {
          btn.pressed = true;
          btn.pressTimer = 150;
          this.selectedTowerType = btn.type;
          for (const b of this.towerButtons) b.selected = false;
          btn.selected = true;
          return;
        }
      }
      if (this.isInside(this.mouseX, this.mouseY, this.startWaveButton) && !this.startWaveButton.disabled) {
        this.startWaveButton.pressed = true;
        this.startWaveButton.pressTimer = 150;
        this.startWave();
        return;
      }
    });

    this.canvas.addEventListener('click', (e) => {
      if (this.mouseY < GRID_OFFSET_Y || this.mouseY >= GRID_BOTTOM) return;
      const grid = this.gridManager.gridFromPixel(this.mouseX, this.mouseY);
      if (!grid) return;

      const existingTower = this.towerManager.findTowerAt(grid.gridX, grid.gridY);
      if (existingTower) {
        this.towerManager.upgradeTower(existingTower.id);
        this.recalculatePath();
        return;
      }

      if (this.selectedTowerType && !this.gridManager.hasTower(grid.gridX, grid.gridY)) {
        const center = this.gridManager.getCellCenter(grid.gridX, grid.gridY);
        const cost = this.getTowerCost(this.selectedTowerType);
        if (this.gold >= cost) {
          this.gold -= cost;
          this.towerManager.placeTower(this.selectedTowerType, grid.gridX, grid.gridY, center.x, center.y);
          this.gridManager.setTower(grid.gridX, grid.gridY);
          this.recalculatePath();
        }
      }
    });

    this.canvas.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      if (this.mouseY < GRID_OFFSET_Y || this.mouseY >= GRID_BOTTOM) return;
      const tower = this.towerManager.findTowerAtPixel(this.mouseX, this.mouseY);
      if (tower) {
        const removed = this.towerManager.removeTower(tower.id);
        if (removed) {
          this.gridManager.removeTower(removed.gridX, removed.gridY);
          this.gold += Math.floor(this.getTowerCost(removed.type) * 0.5);
          this.recalculatePath();
        }
      }
    });
  }

  private getTowerCost(type: TowerType): number {
    switch (type) {
      case 'basic': return 50;
      case 'slow': return 75;
      case 'aoe': return 100;
    }
  }

  private isInside(x: number, y: number, btn: Button): boolean {
    return x >= btn.x && x <= btn.x + btn.width && y >= btn.y && y <= btn.y + btn.height;
  }

  private recalculatePath(): void {
    this.currentPath = this.gridManager.findPath(Math.floor(GRID_ROWS / 2));
  }

  private startWave(): void {
    this.wave++;
    this.enemyManager.startWave(this.wave);
    this.startWaveButton.disabled = true;
    this.startWaveButton.disabledTimer = 5000;
    this.waveTimer = 0;
  }

  private loop(time: number): void {
    const deltaMs = Math.min(50, time - this.lastTime);
    this.lastTime = time;

    this.update(deltaMs, time);
    this.render();

    requestAnimationFrame(this.loop.bind(this));
  }

  private update(deltaMs: number, now: number): void {
    for (const btn of [...this.towerButtons, this.startWaveButton]) {
      if (btn.pressTimer > 0) {
        btn.pressTimer -= deltaMs;
        if (btn.pressTimer <= 0) btn.pressed = false;
      }
      if (btn.disabledTimer > 0) {
        btn.disabledTimer -= deltaMs;
        if (btn.disabledTimer <= 0) btn.disabled = false;
      }
    }

    if (!this.enemyManager.isWaveActive()) {
      this.waveTimer += deltaMs;
      if (this.waveTimer >= this.waveInterval && this.wave > 0) {
        this.startWave();
      }
    }

    this.towerManager.update(deltaMs, this.enemyManager, now);
    const result = this.enemyManager.update(deltaMs, this.currentPath);
    this.lives -= result.livesLost;
    this.gold += result.goldEarned;
  }

  private render(): void {
    this.ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    this.renderGrid();
    this.renderPath();
    this.towerManager.render(this.ctx, this.selectedTowerType, this.mouseGrid);
    this.enemyManager.render(this.ctx);
    this.renderTopBar();
    this.renderBottomBar();
  }

  private renderGrid(): void {
    this.ctx.fillStyle = '#1a1a2e';
    this.ctx.fillRect(0, GRID_OFFSET_Y, CANVAS_WIDTH, GRID_ROWS * CELL_HEIGHT);

    this.ctx.strokeStyle = '#3a3f4b';
    this.ctx.lineWidth = 1;

    for (let x = 0; x <= GRID_COLS; x++) {
      const px = x * CELL_WIDTH + 0.5;
      this.ctx.beginPath();
      this.ctx.moveTo(px, GRID_OFFSET_Y);
      this.ctx.lineTo(px, GRID_OFFSET_Y + GRID_ROWS * CELL_HEIGHT);
      this.ctx.stroke();
    }

    for (let y = 0; y <= GRID_ROWS; y++) {
      const py = GRID_OFFSET_Y + y * CELL_HEIGHT + 0.5;
      this.ctx.beginPath();
      this.ctx.moveTo(0, py);
      this.ctx.lineTo(CANVAS_WIDTH, py);
      this.ctx.stroke();
    }

    if (this.mouseGrid && this.selectedTowerType && !this.gridManager.hasTower(this.mouseGrid.gridX, this.mouseGrid.gridY)) {
      this.ctx.fillStyle = 'rgba(255,255,255,0.05)';
      this.ctx.fillRect(
        this.mouseGrid.gridX * CELL_WIDTH,
        GRID_OFFSET_Y + this.mouseGrid.gridY * CELL_HEIGHT,
        CELL_WIDTH,
        CELL_HEIGHT
      );
    }
  }

  private renderPath(): void {
    if (!this.currentPath || this.currentPath.length < 2) return;

    this.ctx.save();
    this.ctx.globalAlpha = 0.4;
    this.ctx.strokeStyle = '#f1c40f';
    this.ctx.lineWidth = 2;
    this.ctx.setLineDash([3, 2]);
    this.ctx.beginPath();
    this.ctx.moveTo(0, this.currentPath[0].y);
    for (let i = 0; i < this.currentPath.length; i++) {
      this.ctx.lineTo(this.currentPath[i].x, this.currentPath[i].y);
    }
    this.ctx.lineTo(CANVAS_WIDTH, this.currentPath[this.currentPath.length - 1].y);
    this.ctx.stroke();
    this.ctx.setLineDash([]);
    this.ctx.restore();
  }

  private renderTopBar(): void {
    this.ctx.fillStyle = '#16213e';
    this.ctx.fillRect(0, 0, CANVAS_WIDTH, TOP_BAR_HEIGHT);

    this.ctx.font = '16px sans-serif';
    this.ctx.textBaseline = 'middle';

    this.ctx.fillStyle = '#e74c3c';
    this.drawHeart(20, TOP_BAR_HEIGHT / 2, 8);
    this.ctx.fillStyle = '#ffffff';
    this.ctx.fillText(`${this.lives}`, 38, TOP_BAR_HEIGHT / 2);

    this.ctx.fillStyle = '#ffffff';
    this.ctx.textAlign = 'center';
    this.ctx.fillText(`Wave: ${this.wave}`, CANVAS_WIDTH / 2, TOP_BAR_HEIGHT / 2);
    this.ctx.textAlign = 'left';

    this.ctx.fillStyle = '#f39c12';
    this.drawCoin(CANVAS_WIDTH - 80, TOP_BAR_HEIGHT / 2, 7);
    this.ctx.fillStyle = '#f39c12';
    this.ctx.fillText(`${this.gold}`, CANVAS_WIDTH - 65, TOP_BAR_HEIGHT / 2);
  }

  private drawHeart(x: number, y: number, size: number): void {
    this.ctx.beginPath();
    this.ctx.moveTo(x, y + size * 0.3);
    this.ctx.bezierCurveTo(x, y, x - size, y, x - size, y + size * 0.3);
    this.ctx.bezierCurveTo(x - size, y + size * 0.6, x, y + size, x, y + size * 1.2);
    this.ctx.bezierCurveTo(x, y + size, x + size, y + size * 0.6, x + size, y + size * 0.3);
    this.ctx.bezierCurveTo(x + size, y, x, y, x, y + size * 0.3);
    this.ctx.fill();
  }

  private drawCoin(x: number, y: number, r: number): void {
    this.ctx.beginPath();
    this.ctx.arc(x, y, r, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.fillStyle = '#e67e22';
    this.ctx.font = 'bold 10px sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText('$', x, y + 1);
    this.ctx.textAlign = 'left';
  }

  private renderBottomBar(): void {
    this.ctx.fillStyle = '#0f3460';
    this.ctx.fillRect(0, GRID_BOTTOM, CANVAS_WIDTH, BOTTOM_BAR_HEIGHT);

    for (const btn of this.towerButtons) {
      this.renderTowerButton(btn);
    }

    this.renderStartWaveButton();
  }

  private renderTowerButton(btn: TowerButton): void {
    this.ctx.save();

    let offsetY = 0;
    let scale = 1;
    if (btn.pressed) {
      scale = 0.95;
    } else if (btn.hovered) {
      offsetY = -3;
    }

    const cx = btn.x + btn.width / 2;
    const cy = btn.y + btn.height / 2 + offsetY;

    this.ctx.translate(cx, cy);
    this.ctx.scale(scale, scale);
    this.ctx.translate(-cx, -cy);

    if (btn.hovered && !btn.pressed) {
      this.ctx.shadowColor = '#00000040';
      this.ctx.shadowBlur = 8;
      this.ctx.shadowOffsetY = 4;
    }

    const config = TOWER_CONFIGS[btn.type];
    this.ctx.fillStyle = btn.selected ? '#ffffff33' : '#ffffff11';
    this.roundRect(btn.x, btn.y + offsetY, btn.width, btn.height, 6);
    this.ctx.fill();

    if (btn.selected) {
      this.ctx.strokeStyle = '#ffffffaa';
      this.ctx.lineWidth = 2;
      this.roundRect(btn.x, btn.y + offsetY, btn.width, btn.height, 6);
      this.ctx.stroke();
    }

    this.ctx.shadowColor = 'transparent';
    this.ctx.beginPath();
    this.ctx.arc(cx, cy + offsetY * 0, 14, 0, Math.PI * 2);
    this.ctx.fillStyle = config.color;
    this.ctx.fill();

    this.ctx.fillStyle = '#ffffff88';
    this.ctx.font = '10px sans-serif';
    this.ctx.textAlign = 'center';
    const label = btn.type === 'basic' ? 'B' : btn.type === 'slow' ? 'S' : 'A';
    this.ctx.fillText(label, cx, cy + 3);

    this.ctx.restore();
  }

  private renderStartWaveButton(): void {
    const btn = this.startWaveButton;
    this.ctx.save();

    let scale = 1;
    if (btn.pressed) scale = 0.95;

    const cx = btn.x + btn.width / 2;
    const cy = btn.y + btn.height / 2;
    this.ctx.translate(cx, cy);
    this.ctx.scale(scale, scale);
    this.ctx.translate(-cx, -cy);

    if (btn.hovered && !btn.pressed && !btn.disabled) {
      this.ctx.shadowColor = '#00000040';
      this.ctx.shadowBlur = 8;
      this.ctx.shadowOffsetY = 3;
    }

    this.ctx.fillStyle = btn.disabled ? '#7f8c8d' : '#27ae60';
    this.roundRect(btn.x, btn.y, btn.width, btn.height, 4);
    this.ctx.fill();

    this.ctx.shadowColor = 'transparent';
    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = 'bold 12px sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText('Start', cx, cy);

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

window.addEventListener('DOMContentLoaded', () => {
  new Game();
});
