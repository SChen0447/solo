import { Tower, TowerType, TOWER_CONFIGS, createLaser, LaserBeam } from './tower';
import { Enemy, EnemyType, Particle, createFlash, FlashEffect } from './enemy';
import { renderAll, HexCell, RenderState } from './renderer';
import { UIManager } from './ui';

const HEX_SIZE = 32;
const GRID_COLS = 17;
const GRID_ROWS = 11;
const MAX_LASERS = 20;
const MAX_PARTICLES = 200;

class Game {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private ui: UIManager;

  private hexGrid: HexCell[] = [];
  private offsetX: number = 0;
  private offsetY: number = 0;
  private hexSize: number = HEX_SIZE;

  private towers: Tower[] = [];
  private enemies: Enemy[] = [];
  private lasers: LaserBeam[] = [];
  private particles: Particle[] = [];
  private flashes: FlashEffect[] = [];

  private wave: number = 1;
  private energy: number = 100;
  private kills: number = 0;
  private time: number = 0;

  private enemyPath: { x: number; y: number }[] = [];
  private waveEnemiesRemaining: number = 0;
  private waveEnemySpawnTimer: number = 0;
  private waveEnemySpawnInterval: number = 1.2;
  private waveCooldown: number = 5;
  private waveInProgress: boolean = false;

  private selectedHex: { q: number; r: number } | null = null;
  private hoveredTower: Tower | null = null;
  private mouseCanvasX: number = 0;
  private mouseCanvasY: number = 0;

  private lastTime: number = 0;
  private animationFrameId: number = 0;

  constructor() {
    this.canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
    const ctx = this.canvas.getContext('2d');
    if (!ctx) throw new Error('Failed to get canvas context');
    this.ctx = ctx;

    this.ui = new UIManager(this.canvas, {
      onHexClick: (q, r) => this.handleHexClick(q, r),
      onTowerSelect: (tower) => this.handleTowerSelect(tower),
      onTowerDeploy: (type) => this.handleTowerDeploy(type),
      onTowerUpgrade: (towerId) => this.handleTowerUpgrade(towerId),
      onMouseMove: (x, y) => this.handleMouseMove(x, y)
    });

    this.resizeCanvas();
    window.addEventListener('resize', () => this.resizeCanvas());

    this.initHexGrid();
    this.generateEnemyPath();
    this.startWave();
    this.ui.updateStats(this.wave, this.energy, this.kills);

    this.lastTime = performance.now();
    this.loop();
  }

  private resizeCanvas(): void {
    const container = document.getElementById('game-container')!;
    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;

    const targetRatio = 16 / 9;
    let canvasWidth = containerWidth;
    let canvasHeight = containerHeight;

    if (containerWidth / containerHeight > targetRatio) {
      canvasWidth = containerHeight * targetRatio;
    } else {
      canvasHeight = containerWidth / targetRatio;
    }

    const dpr = window.devicePixelRatio || 1;
    this.canvas.style.width = canvasWidth + 'px';
    this.canvas.style.height = canvasHeight + 'px';
    this.canvas.width = Math.floor(canvasWidth * dpr);
    this.canvas.height = Math.floor(canvasHeight * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const cssWidth = canvasWidth;
    const cssHeight = canvasHeight;

    const gridPixelWidth = (GRID_COLS + 0.5) * HEX_SIZE * Math.sqrt(3);
    const gridPixelHeight = GRID_ROWS * HEX_SIZE * 1.5 + HEX_SIZE * 0.5;
    const scaleX = cssWidth / gridPixelWidth;
    const scaleY = cssHeight / gridPixelHeight;
    const scale = Math.min(scaleX, scaleY) * 0.95;

    this.hexSize = HEX_SIZE * scale;
    this.offsetX = (cssWidth - (GRID_COLS + 0.5) * this.hexSize * Math.sqrt(3)) / 2 + this.hexSize * Math.sqrt(3);
    this.offsetY = (cssHeight - GRID_ROWS * this.hexSize * 1.5) / 2 + this.hexSize;

    this.initHexGrid();
    this.generateEnemyPath();
  }

  private hexToPixel(q: number, r: number): { x: number; y: number } {
    const x = this.hexSize * Math.sqrt(3) * (q + r / 2);
    const y = this.hexSize * 1.5 * r;
    return { x: x + this.offsetX, y: y + this.offsetY };
  }

  private pixelToHex(x: number, y: number): { q: number; r: number } {
    const px = x - this.offsetX;
    const py = y - this.offsetY;
    const q = (Math.sqrt(3) / 3 * px - 1 / 3 * py) / this.hexSize;
    const r = (2 / 3 * py) / this.hexSize;
    return this.hexRound(q, r);
  }

  private hexRound(q: number, r: number): { q: number; r: number } {
    const s = -q - r;
    let rq = Math.round(q);
    let rr = Math.round(r);
    let rs = Math.round(s);

    const qDiff = Math.abs(rq - q);
    const rDiff = Math.abs(rr - r);
    const sDiff = Math.abs(rs - s);

    if (qDiff > rDiff && qDiff > sDiff) {
      rq = -rr - rs;
    } else if (rDiff > sDiff) {
      rr = -rq - rs;
    }

    return { q: rq, r: rr };
  }

  private isInGrid(q: number, r: number): boolean {
    return q >= 0 && q < GRID_COLS && r >= 0 && r < GRID_ROWS;
  }

  private initHexGrid(): void {
    this.hexGrid = [];
    for (let r = 0; r < GRID_ROWS; r++) {
      for (let q = 0; q < GRID_COLS; q++) {
        const { x, y } = this.hexToPixel(q, r);
        this.hexGrid.push({ q, r, x, y });
      }
    }
  }

  private generateEnemyPath(): void {
    this.enemyPath = [];
    const pathCells: { q: number; r: number }[] = [];

    let q = 0;
    let r = Math.floor(GRID_ROWS / 2);
    pathCells.push({ q, r });

    const directions: { dq: number; dr: number }[] = [
      { dq: 1, dr: 0 },
      { dq: 1, dr: 0 },
      { dq: 0, dr: -1 },
      { dq: 1, dr: 0 },
      { dq: 1, dr: 1 },
      { dq: 0, dr: 1 },
      { dq: 1, dr: 1 },
      { dq: 1, dr: 0 },
      { dq: 0, dr: -1 },
      { dq: 1, dr: -1 },
      { dq: 1, dr: 0 },
      { dq: 0, dr: -1 },
      { dq: 1, dr: 0 },
      { dq: 1, dr: 1 },
      { dq: 1, dr: 0 },
      { dq: 0, dr: 1 },
      { dq: 1, dr: 0 },
    ];

    for (const dir of directions) {
      const nq = q + dir.dq;
      const nr = r + dir.dr;
      if (this.isInGrid(nq, nr)) {
        q = nq;
        r = nr;
        pathCells.push({ q, r });
      }
    }

    for (let i = 0; i < pathCells.length; i++) {
      const cell = pathCells[i];
      const { x, y } = this.hexToPixel(cell.q, cell.r);
      this.enemyPath.push({ x, y });
    }

    const first = this.enemyPath[0];
    if (first) {
      this.enemyPath.unshift({ x: first.x - this.hexSize * 3, y: first.y });
    }
    const last = this.enemyPath[this.enemyPath.length - 1];
    if (last) {
      this.enemyPath.push({ x: last.x + this.hexSize * 3, y: last.y });
    }
  }

  private isPathHex(q: number, r: number): boolean {
    for (let i = 1; i < this.enemyPath.length - 1; i++) {
      const point = this.enemyPath[i];
      const hex = this.pixelToHex(point.x, point.y);
      if (hex.q === q && hex.r === r) return true;
    }
    return false;
  }

  private hasTowerAt(q: number, r: number): boolean {
    return this.towers.some(t => t.hexQ === q && t.hexR === r);
  }

  private startWave(): void {
    this.waveInProgress = true;
    this.waveEnemiesRemaining = 5 + Math.min(7, Math.floor(this.wave * 1.2));
    this.waveEnemySpawnTimer = 0;
    this.waveEnemySpawnInterval = Math.max(0.5, 1.2 - this.wave * 0.05);
    this.ui.showWaveAnnouncement(this.wave);
  }

  private spawnEnemy(): void {
    const types: EnemyType[] = ['triangle', 'triangle', 'diamond', 'circle'];
    const weights: number[] = [];
    for (let i = 0; i < types.length; i++) {
      if (types[i] === 'triangle') weights.push(0.5);
      else if (types[i] === 'diamond') weights.push(0.3 + Math.min(0.2, this.wave * 0.02));
      else weights.push(0.1 + Math.min(0.3, this.wave * 0.03));
    }

    let total = weights.reduce((a, b) => a + b, 0);
    let rand = Math.random() * total;
    let type: EnemyType = 'triangle';
    for (let i = 0; i < types.length; i++) {
      rand -= weights[i];
      if (rand <= 0) {
        type = types[i];
        break;
      }
    }

    const waveMultiplier = 1 + (this.wave - 1) * 0.25;
    const start = this.enemyPath[0];
    const enemy = new Enemy(type, start.x, start.y, this.enemyPath, waveMultiplier);
    this.enemies.push(enemy);
    this.waveEnemiesRemaining--;
  }

  private handleHexClick(q: number, r: number): void {
    if (!this.isInGrid(q, r)) return;
    if (this.isPathHex(q, r)) return;
    if (this.hasTowerAt(q, r)) {
      const tower = this.towers.find(t => t.hexQ === q && t.hexR === r);
      if (tower) {
        this.handleTowerSelect(tower);
      }
      return;
    }

    this.selectedHex = { q, r };
    const { x, y } = this.hexToPixel(q, r);
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = rect.width / (this.canvas.width / (window.devicePixelRatio || 1));
    const scaleY = rect.height / (this.canvas.height / (window.devicePixelRatio || 1));
    const screenX = rect.left + x * scaleX;
    const screenY = rect.top + y * scaleY;
    this.ui.showTowerMenu(screenX, screenY, this.energy);
  }

  private handleTowerSelect(tower: Tower | null): void {
    this.hoveredTower = tower;
    if (!tower) {
      this.ui.hideTowerTooltip();
    }
  }

  private handleTowerDeploy(type: TowerType): void {
    if (!this.selectedHex) return;
    const { q, r } = this.selectedHex;
    const cost = TOWER_CONFIGS[type].baseCost;
    if (this.energy < cost) return;

    const { x, y } = this.hexToPixel(q, r);
    const tower = new Tower(type, q, r, x, y);
    this.towers.push(tower);
    this.energy -= cost;
    this.ui.updateStats(this.wave, this.energy, this.kills);
    this.selectedHex = null;
  }

  private handleTowerUpgrade(towerId: number): void {
    const tower = this.towers.find(t => t.id === towerId);
    if (!tower || !tower.canUpgrade()) return;

    const cost = tower.getUpgradeCost();
    if (this.energy < cost) return;

    tower.upgrade();
    this.energy -= cost;
    this.ui.updateStats(this.wave, this.energy, this.kills);

    if (this.hoveredTower && this.hoveredTower.id === towerId) {
      const rect = this.canvas.getBoundingClientRect();
      const scaleX = rect.width / (this.canvas.width / (window.devicePixelRatio || 1));
      const scaleY = rect.height / (this.canvas.height / (window.devicePixelRatio || 1));
      const screenX = rect.left + tower.pixelX * scaleX;
      const screenY = rect.top + tower.pixelY * scaleY;
      this.ui.showTowerTooltip(tower, screenX, screenY, this.energy);
    }
  }

  private handleMouseMove(x: number, y: number): void {
    this.mouseCanvasX = x;
    this.mouseCanvasY = y;

    const hex = this.pixelToHex(x, y);
    if (this.isInGrid(hex.q, hex.r) && this.hasTowerAt(hex.q, hex.r)) {
      const tower = this.towers.find(t => t.hexQ === hex.q && t.hexR === hex.r);
      if (tower) {
        this.hoveredTower = tower;
        const rect = this.canvas.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;
        const scaleX = rect.width / (this.canvas.width / dpr);
        const scaleY = rect.height / (this.canvas.height / dpr);
        const screenX = rect.left + tower.pixelX * scaleX;
        const screenY = rect.top + tower.pixelY * scaleY;
        this.ui.showTowerTooltip(tower, screenX, screenY, this.energy);
      }
    } else {
      if (!this.selectedHex) {
        this.hoveredTower = null;
        this.ui.hideTowerTooltip();
      }
    }
  }

  private findTarget(tower: Tower): Enemy | null {
    const rangePixels = tower.getRangePixels(this.hexSize);
    let closest: Enemy | null = null;
    let closestDist = Infinity;

    for (const enemy of this.enemies) {
      const dx = enemy.x - tower.pixelX;
      const dy = enemy.y - tower.pixelY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist <= rangePixels && dist < closestDist) {
        closest = enemy;
        closestDist = dist;
      }
    }

    return closest;
  }

  private fireTower(tower: Tower, target: Enemy): void {
    tower.fire(this.time);
    const cfg = tower.config;
    const color = tower.getColor();

    const dx = target.x - tower.pixelX;
    const dy = target.y - tower.pixelY;
    const angle = Math.atan2(dy, dx);
    tower.setTargetAngle(angle + Math.PI / 2);

    if (tower.type === 'split') {
      const splitAngle = Math.PI / 8;
      for (const offset of [-splitAngle, splitAngle]) {
        const a = angle + offset;
        const endX = target.x + Math.cos(a) * 20;
        const endY = target.y + Math.sin(a) * 20;
        this.addLaser(createLaser(
          tower.pixelX, tower.pixelY,
          endX, endY,
          color, cfg.laserWidth, cfg.hasLaserTrail
        ));
        this.hitEnemy(target, tower.damage * 0.5, endX, endY);
      }
    } else {
      this.addLaser(createLaser(
        tower.pixelX, tower.pixelY,
        target.x, target.y,
        color, cfg.laserWidth, cfg.hasLaserTrail
      ));
      this.hitEnemy(target, tower.damage, target.x, target.y);
    }
  }

  private hitEnemy(enemy: Enemy, damage: number, hitX: number, hitY: number): void {
    const killed = enemy.takeDamage(damage);

    this.addFlash(createFlash(hitX, hitY, 20));

    const hitParticles = enemy.createHitParticles();
    for (const p of hitParticles) {
      this.addParticle(p);
    }

    if (killed) {
      this.energy += enemy.config.energyReward;
      this.kills++;
      this.ui.updateStats(this.wave, this.energy, this.kills);

      const deathParticles = enemy.createDeathParticles();
      for (const p of deathParticles) {
        this.addParticle(p);
      }
    }
  }

  private addLaser(laser: LaserBeam): void {
    if (this.lasers.length >= MAX_LASERS) {
      this.lasers.shift();
    }
    this.lasers.push(laser);
  }

  private addParticle(particle: Particle): void {
    if (this.particles.length >= MAX_PARTICLES) {
      this.particles.shift();
    }
    this.particles.push(particle);
  }

  private addFlash(flash: FlashEffect): void {
    this.flashes.push(flash);
  }

  private update(dt: number): void {
    this.time += dt;

    if (this.waveInProgress && this.waveEnemiesRemaining > 0) {
      this.waveEnemySpawnTimer += dt;
      if (this.waveEnemySpawnTimer >= this.waveEnemySpawnInterval) {
        this.waveEnemySpawnTimer = 0;
        this.spawnEnemy();
      }
    }

    if (this.waveInProgress && this.waveEnemiesRemaining <= 0 && this.enemies.length === 0) {
      this.waveInProgress = false;
      this.waveCooldown = 5;
    }

    if (!this.waveInProgress) {
      this.waveCooldown -= dt;
      if (this.waveCooldown <= 0) {
        this.wave++;
        this.startWave();
      }
    }

    for (const tower of this.towers) {
      tower.update(dt);
      if (tower.canFire(this.time)) {
        const target = this.findTarget(tower);
        if (target) {
          this.fireTower(tower, target);
        }
      }
    }

    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const enemy = this.enemies[i];
      const reachedEnd = enemy.update(dt);
      if (enemy.dead || reachedEnd) {
        this.enemies.splice(i, 1);
      }
    }

    for (let i = this.lasers.length - 1; i >= 0; i--) {
      this.lasers[i].life -= dt;
      if (this.lasers[i].life <= 0) {
        this.lasers.splice(i, 1);
      }
    }

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= 0.98;
      p.vy *= 0.98;
      p.life -= dt;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }

    for (let i = this.flashes.length - 1; i >= 0; i--) {
      this.flashes[i].life -= dt;
      if (this.flashes[i].life <= 0) {
        this.flashes.splice(i, 1);
      }
    }
  }

  private render(): void {
    const dpr = window.devicePixelRatio || 1;
    const cssWidth = this.canvas.width / dpr;
    const cssHeight = this.canvas.height / dpr;

    const state: RenderState = {
      canvas: { width: cssWidth, height: cssHeight } as HTMLCanvasElement,
      ctx: this.ctx,
      hexSize: this.hexSize,
      hexGrid: this.hexGrid,
      offsetX: this.offsetX,
      offsetY: this.offsetY,
      gridCols: GRID_COLS,
      gridRows: GRID_ROWS,
      towers: this.towers,
      enemies: this.enemies,
      lasers: this.lasers,
      particles: this.particles,
      flashes: this.flashes,
      selectedHex: this.selectedHex,
      hoveredTower: this.hoveredTower,
      time: this.time
    };

    renderAll(state);
  }

  private loop = (): void => {
    const now = performance.now();
    let dt = (now - this.lastTime) / 1000;
    this.lastTime = now;

    if (dt > 0.1) dt = 0.1;

    this.update(dt);
    this.render();

    this.animationFrameId = requestAnimationFrame(this.loop);
  };

  public destroy(): void {
    cancelAnimationFrame(this.animationFrameId);
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new Game();
});
