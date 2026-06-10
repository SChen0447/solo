import { Grid, GRID_COLS, GRID_ROWS, CELL_SIZE } from './grid';
import { Tower, TOWER_CONFIGS, TowerType } from './tower';
import { Enemy, Particle, getWaveConfig, WaveConfig } from './enemy';

const STATUS_BAR_HEIGHT = 60;
const CANVAS_WIDTH = GRID_COLS * CELL_SIZE;
const CANVAS_HEIGHT = GRID_ROWS * CELL_SIZE + STATUS_BAR_HEIGHT;
const MAX_CANVAS_WIDTH = 1200;

interface PanelButton {
  x: number;
  y: number;
  w: number;
  h: number;
  type?: TowerType;
  action?: 'upgrade' | 'close';
  label: string;
  sublabel?: string;
  cost?: number;
}

class Game {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  grid: Grid;
  towers: Tower[] = [];
  enemies: Enemy[] = [];
  particles: Particle[] = [];
  gold: number = 200;
  lives: number = 100;
  wave: number = 0;
  maxWave: number = 10;
  waveActive: boolean = false;
  waveSpawned: number = 0;
  waveSpawnTimer: number = 0;
  waveConfig: WaveConfig | null = null;
  paused: boolean = false;
  speed: number = 1;
  selectedCell: { col: number; row: number } | null = null;
  selectedTower: Tower | null = null;
  panelButtons: PanelButton[] = [];
  gameOver: boolean = false;
  victory: boolean = false;
  lastTime: number = 0;
  scale: number = 1;
  offsetX: number = 0;
  offsetY: number = 0;
  canvasActualWidth: number = CANVAS_WIDTH;
  canvasActualHeight: number = CANVAS_HEIGHT;

  constructor() {
    this.canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
    const ctx = this.canvas.getContext('2d');
    if (!ctx) throw new Error('Could not get 2D context');
    this.ctx = ctx;
    this.grid = new Grid();
    this.setupCanvas();
    this.setupEvents();
    this.showStartWaveButton = true;
    requestAnimationFrame(this.loop.bind(this));
  }

  showStartWaveButton: boolean = true;
  startWaveButton = { x: 0, y: 0, w: 140, h: 36 };

  setupCanvas() {
    const resize = () => {
      const wrapper = document.getElementById('game-wrapper');
      if (!wrapper) return;
      const availW = wrapper.clientWidth;
      const availH = wrapper.clientHeight;

      let targetW = Math.min(availW, MAX_CANVAS_WIDTH);
      let targetH = targetW * (CANVAS_HEIGHT / CANVAS_WIDTH);
      if (targetH > availH) {
        targetH = availH;
        targetW = targetH * (CANVAS_WIDTH / CANVAS_HEIGHT);
      }

      const dpr = window.devicePixelRatio || 1;
      this.canvas.style.width = targetW + 'px';
      this.canvas.style.height = targetH + 'px';
      this.canvas.width = Math.floor(CANVAS_WIDTH * dpr);
      this.canvas.height = Math.floor(CANVAS_HEIGHT * dpr);
      this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      this.scale = targetW / CANVAS_WIDTH;
      this.canvasActualWidth = targetW;
      this.canvasActualHeight = targetH;
    };
    resize();
    window.addEventListener('resize', resize);
  }

  setupEvents() {
    const getCanvasPos = (clientX: number, clientY: number) => {
      const rect = this.canvas.getBoundingClientRect();
      const x = (clientX - rect.left) / this.scale;
      const y = (clientY - rect.top) / this.scale;
      return { x, y };
    };

    const handleClick = (x: number, y: number) => {
      if (this.gameOver || this.victory) {
        this.resetGame();
        return;
      }
      if (this.handlePanelClick(x, y)) return;
      if (this.handleStartWaveClick(x, y)) return;
      if (y < STATUS_BAR_HEIGHT) return;
      const gridY = y - STATUS_BAR_HEIGHT;
      const cell = this.grid.getCellAtPixel(x, gridY);
      if (!cell) {
        this.selectedCell = null;
        this.selectedTower = null;
        this.panelButtons = [];
        return;
      }
      const existing = this.towers.find(t => t.col === cell.col && t.row === cell.row);
      if (existing) {
        this.selectedTower = existing;
        this.selectedCell = null;
        this.buildUpgradePanel();
      } else if (this.grid.isPlaceable(cell.col, cell.row)) {
        this.selectedCell = cell;
        this.selectedTower = null;
        this.buildTowerSelectPanel();
      } else {
        this.selectedCell = null;
        this.selectedTower = null;
        this.panelButtons = [];
      }
    };

    this.canvas.addEventListener('click', (e) => {
      const pos = getCanvasPos(e.clientX, e.clientY);
      handleClick(pos.x, pos.y);
    });
    this.canvas.addEventListener('touchstart', (e) => {
      e.preventDefault();
      if (e.touches.length > 0) {
        const pos = getCanvasPos(e.touches[0].clientX, e.touches[0].clientY);
        handleClick(pos.x, pos.y);
      }
    }, { passive: false });

    window.addEventListener('keydown', (e) => {
      if (e.key === 'p' || e.key === 'P') {
        this.togglePause();
      } else if (e.key === '1') {
        this.speed = 1;
      } else if (e.key === '2') {
        this.speed = 2;
      } else if (e.key === '4') {
        this.speed = 4;
      }
    });
  }

  buildTowerSelectPanel() {
    if (!this.selectedCell) return;
    const panelX = this.selectedCell.col * CELL_SIZE;
    const panelY = this.selectedCell.row * CELL_SIZE + STATUS_BAR_HEIGHT;
    const btnW = 100, btnH = 42, gap = 6;
    this.panelButtons = [];
    const types: TowerType[] = ['rapid', 'spread', 'sniper'];
    types.forEach((t, i) => {
      const cfg = TOWER_CONFIGS[t];
      this.panelButtons.push({
        x: panelX,
        y: panelY + i * (btnH + gap) - (types.length * (btnH + gap) - gap),
        w: btnW,
        h: btnH,
        type: t,
        label: cfg.name,
        sublabel: `伤害:${cfg.baseDamage} 间隔:${cfg.baseInterval}s`,
        cost: cfg.cost
      });
    });
  }

  buildUpgradePanel() {
    if (!this.selectedTower) return;
    const panelX = this.selectedTower.col * CELL_SIZE + CELL_SIZE;
    const panelY = this.selectedTower.row * CELL_SIZE + STATUS_BAR_HEIGHT;
    this.panelButtons = [];
    const upCost = this.selectedTower.getUpgradeCost();
    if (upCost !== null) {
      this.panelButtons.push({
        x: panelX,
        y: panelY,
        w: 120,
        h: 42,
        action: 'upgrade',
        label: `升级 Lv.${this.selectedTower.level + 1}`,
        sublabel: `+20%伤害 +5%攻速`,
        cost: upCost
      });
    }
    this.panelButtons.push({
      x: panelX,
      y: panelY + 48,
      w: 120,
      h: 32,
      action: 'close',
      label: '关闭'
    });
  }

  handlePanelClick(x: number, y: number): boolean {
    for (const btn of this.panelButtons) {
      if (x >= btn.x && x <= btn.x + btn.w && y >= btn.y && y <= btn.y + btn.h) {
        if (btn.type && this.selectedCell) {
          const cfg = TOWER_CONFIGS[btn.type];
          if (this.gold >= cfg.cost && this.towers.length < 20) {
            this.gold -= cfg.cost;
            const tower = new Tower(this.selectedCell.col, this.selectedCell.row, btn.type);
            this.towers.push(tower);
            this.grid.placeTower(this.selectedCell.col, this.selectedCell.row);
          }
        } else if (btn.action === 'upgrade' && this.selectedTower) {
          const cost = this.selectedTower.getUpgradeCost();
          if (cost !== null && this.gold >= cost) {
            this.gold -= cost;
            this.selectedTower.upgrade();
            this.buildUpgradePanel();
            return true;
          }
        }
        this.selectedCell = null;
        this.selectedTower = null;
        this.panelButtons = [];
        return true;
      }
    }
    return false;
  }

  handleStartWaveClick(x: number, y: number): boolean {
    if (!this.showStartWaveButton) return false;
    const b = this.startWaveButton;
    if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) {
      this.startNextWave();
      return true;
    }
    return false;
  }

  togglePause() {
    if (this.gameOver || this.victory) return;
    this.paused = !this.paused;
  }

  startNextWave() {
    if (this.waveActive || this.gameOver || this.victory) return;
    if (this.wave >= this.maxWave) return;
    this.wave++;
    this.waveConfig = getWaveConfig(this.wave);
    this.waveSpawned = 0;
    this.waveSpawnTimer = 0;
    this.waveActive = true;
    this.showStartWaveButton = false;
  }

  remainingEnemies(): number {
    const remainingInWave = this.waveConfig ? (this.waveConfig.count - this.waveSpawned) : 0;
    return remainingInWave + this.enemies.filter(e => e.isAlive()).length;
  }

  resetGame() {
    this.grid = new Grid();
    this.towers = [];
    this.enemies = [];
    this.particles = [];
    this.gold = 200;
    this.lives = 100;
    this.wave = 0;
    this.waveActive = false;
    this.waveSpawned = 0;
    this.waveConfig = null;
    this.paused = false;
    this.speed = 1;
    this.selectedCell = null;
    this.selectedTower = null;
    this.panelButtons = [];
    this.gameOver = false;
    this.victory = false;
    this.showStartWaveButton = true;
  }

  loop(timestamp: number) {
    if (!this.lastTime) this.lastTime = timestamp;
    let dt = (timestamp - this.lastTime) / 1000;
    this.lastTime = timestamp;
    if (dt > 0.1) dt = 0.1;

    if (!this.paused && !this.gameOver && !this.victory) {
      const gameDt = dt * this.speed;
      this.update(gameDt);
    }

    this.render();
    requestAnimationFrame(this.loop.bind(this));
  }

  update(dt: number) {
    if (this.waveActive && this.waveConfig) {
      this.waveSpawnTimer += dt;
      if (this.waveSpawned < this.waveConfig.count && this.waveSpawnTimer >= this.waveConfig.spawnInterval) {
        this.waveSpawnTimer = 0;
        if (this.enemies.filter(e => e.isAlive()).length < 30) {
          const enemy = new Enemy(this.grid.getPathPixelPoints(), this.waveConfig);
          this.enemies.push(enemy);
          this.waveSpawned++;
        }
      }
    }

    for (const t of this.towers) {
      t.update(dt, this.enemies);
    }

    for (const e of this.enemies) {
      const wasAlive = e.isAlive();
      e.update(dt);
      if (wasAlive && !e.isAlive() && !e.reachedEnd) {
        if (this.particles.length < 200) {
          this.particles.push(...e.spawnDeathParticles());
        }
        this.gold += 10;
      }
      if (e.reachedEnd) {
        this.lives -= 10;
        if (this.lives <= 0) {
          this.lives = 0;
          this.gameOver = true;
        }
      }
    }
    this.enemies = this.enemies.filter(e => e.isAlive());

    for (const p of this.particles) p.update(dt);
    this.particles = this.particles.filter(p => p.alive);

    if (this.waveActive && this.waveConfig && this.waveSpawned >= this.waveConfig.count && this.enemies.length === 0) {
      this.waveActive = false;
      if (this.wave >= this.maxWave) {
        this.victory = true;
      } else {
        this.showStartWaveButton = true;
      }
    }
  }

  render() {
    const ctx = this.ctx;
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    this.grid.render(ctx, STATUS_BAR_HEIGHT);

    for (const t of this.towers) {
      t.render(ctx, STATUS_BAR_HEIGHT, t === this.selectedTower);
    }
    for (const e of this.enemies) e.render(ctx, STATUS_BAR_HEIGHT);
    for (const p of this.particles) p.render(ctx, STATUS_BAR_HEIGHT);

    if (this.selectedCell && this.grid.isPlaceable(this.selectedCell.col, this.selectedCell.row)) {
      const x = this.selectedCell.col * CELL_SIZE;
      const y = this.selectedCell.row * CELL_SIZE + STATUS_BAR_HEIGHT;
      ctx.fillStyle = 'rgba(255,255,255,0.15)';
      ctx.fillRect(x, y, CELL_SIZE, CELL_SIZE);
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.strokeRect(x, y, CELL_SIZE, CELL_SIZE);
    }

    this.renderStatusBar(ctx);
    this.renderPanel(ctx);
    this.renderPauseButton(ctx);
    this.renderSpeedIndicator(ctx);

    if (this.gameOver) this.renderGameOver(ctx);
    if (this.victory) this.renderVictory(ctx);
  }

  renderStatusBar(ctx: CanvasRenderingContext2D) {
    ctx.fillStyle = '#0f0f1e';
    ctx.fillRect(0, 0, CANVAS_WIDTH, STATUS_BAR_HEIGHT);

    ctx.font = '16px "Courier New", monospace';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    const remaining = this.remainingEnemies();
    ctx.fillText(`波次: ${this.wave}/${this.maxWave}  剩余: ${remaining}`, 15, STATUS_BAR_HEIGHT / 2);

    ctx.font = '18px "Courier New", monospace';
    ctx.fillStyle = '#ffd700';
    ctx.textAlign = 'center';
    ctx.fillText(`💰 ${this.gold}`, CANVAS_WIDTH / 2, STATUS_BAR_HEIGHT / 2);

    ctx.font = '20px "Courier New", monospace';
    ctx.fillStyle = '#ff4444';
    ctx.textAlign = 'right';
    ctx.fillText(`❤ ${this.lives}`, CANVAS_WIDTH - 15, STATUS_BAR_HEIGHT / 2);

    if (this.showStartWaveButton && !this.waveActive && !this.gameOver && !this.victory) {
      const b = this.startWaveButton;
      b.x = CANVAS_WIDTH - 170;
      b.y = 12;
      ctx.fillStyle = '#4caf50';
      ctx.fillRect(b.x, b.y, b.w, b.h);
      ctx.font = 'bold 16px "Courier New", monospace';
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.fillText(this.wave === 0 ? '开始游戏' : `开始第 ${this.wave + 1} 波`, b.x + b.w / 2, b.y + b.h / 2);
    }
  }

  renderPauseButton(ctx: CanvasRenderingContext2D) {
    const bx = 15, by = 12, bw = 36, bh = 36;
    ctx.fillStyle = this.paused ? '#4caf50' : '#555555';
    ctx.fillRect(bx, by, bw, bh);
    ctx.fillStyle = '#ffffff';
    if (this.paused) {
      ctx.beginPath();
      ctx.moveTo(bx + 11, by + 9);
      ctx.lineTo(bx + 11, by + 27);
      ctx.lineTo(bx + 27, by + 18);
      ctx.closePath();
      ctx.fill();
    } else {
      ctx.fillRect(bx + 10, by + 9, 5, 18);
      ctx.fillRect(bx + 21, by + 9, 5, 18);
    }
  }

  renderSpeedIndicator(ctx: CanvasRenderingContext2D) {
    const bx = 60, by = 12, gap = 4;
    const speeds = [1, 2, 4];
    for (let i = 0; i < speeds.length; i++) {
      const s = speeds[i];
      const bw = 36, bh = 36;
      const x = bx + i * (bw + gap);
      ctx.fillStyle = this.speed === s ? '#ff9800' : '#333333';
      ctx.fillRect(x, by, bw, bh);
      ctx.font = 'bold 14px "Courier New", monospace';
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`${s}x`, x + bw / 2, by + bh / 2);
    }
  }

  renderPanel(ctx: CanvasRenderingContext2D) {
    for (const btn of this.panelButtons) {
      let bg = '#333344';
      if (btn.cost !== undefined && this.gold < btn.cost) bg = '#553333';
      ctx.fillStyle = bg;
      ctx.fillRect(btn.x, btn.y, btn.w, btn.h);
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1;
      ctx.strokeRect(btn.x, btn.y, btn.w, btn.h);
      ctx.font = 'bold 13px "Courier New", monospace';
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText(btn.label, btn.x + 6, btn.y + 4);
      if (btn.sublabel) {
        ctx.font = '10px "Courier New", monospace';
        ctx.fillStyle = '#aaaaaa';
        ctx.fillText(btn.sublabel, btn.x + 6, btn.y + 20);
      }
      if (btn.cost !== undefined) {
        ctx.font = 'bold 12px "Courier New", monospace';
        ctx.fillStyle = '#ffd700';
        ctx.textAlign = 'right';
        ctx.fillText(`${btn.cost}💰`, btn.x + btn.w - 6, btn.y + btn.h - 16);
      }
    }
  }

  renderGameOver(ctx: CanvasRenderingContext2D) {
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    ctx.font = 'bold 48px "Courier New", monospace';
    ctx.fillStyle = '#ff4444';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('游戏结束', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 30);
    ctx.font = '20px "Courier New", monospace';
    ctx.fillStyle = '#ffffff';
    ctx.fillText('点击重新开始', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 20);
  }

  renderVictory(ctx: CanvasRenderingContext2D) {
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    ctx.font = 'bold 48px "Courier New", monospace';
    ctx.fillStyle = '#ffd700';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('胜利！', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 30);
    ctx.font = '20px "Courier New", monospace';
    ctx.fillStyle = '#ffffff';
    ctx.fillText('点击继续', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 20);
  }
}

new Game();
