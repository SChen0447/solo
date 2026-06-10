import { v4 as uuidv4 } from 'uuid';
import {
  TerrainType, MAP_WIDTH, MAP_HEIGHT, TILE_SIZE,
  BASE_POS, SPAWN_POSITIONS, Tower, Enemy, Projectile,
  Effect, TOWER_CONFIGS, ENEMY_CONFIGS, GameState,
  TowerType, GridPos
} from './types';
import { MapGenerator } from './MapGenerator';
import { TowerManager } from './TowerManager';
import { EnemyManager } from './EnemyManager';

const TERRAIN_COLORS: Record<TerrainType, { base: string; detail: string }> = {
  [TerrainType.GRASS]: { base: '#6b4423', detail: '#7a5530' },
  [TerrainType.WATER]: { base: '#1e88e5', detail: '#42a5f5' },
  [TerrainType.FOREST]: { base: '#2e7d32', detail: '#388e3c' },
  [TerrainType.ROCK]: { base: '#757575', detail: '#9e9e9e' }
};

export class Renderer {
  private ctx: CanvasRenderingContext2D;
  private canvas: HTMLCanvasElement;
  public effects: Effect[] = [];
  private hoverPos: GridPos | null = null;
  private animTime: number = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Cannot get canvas context');
    this.ctx = ctx;
  }

  public setHoverPos(pos: GridPos | null): void {
    this.hoverPos = pos;
  }

  public spawnEffect(effect: Omit<Effect, 'id'>): void {
    this.effects.push({ ...effect, id: uuidv4() });
  }

  public update(deltaTime: number): void {
    this.animTime += deltaTime;
    for (const e of this.effects) {
      e.life -= deltaTime;
      const t = 1 - e.life / e.maxLife;
      e.radius = e.maxRadius * t;
    }
    this.effects = this.effects.filter(e => e.life > 0);
  }

  public render(
    mapGenerator: MapGenerator,
    towerManager: TowerManager,
    enemyManager: EnemyManager,
    projectiles: Projectile[],
    state: GameState
  ): void {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    this.renderTerrain(mapGenerator);
    this.renderGrid();
    this.renderSpawnPoints();
    this.renderBase();

    if (state.selectedTowerType && this.hoverPos) {
      this.renderTowerPlacementPreview(state.selectedTowerType, this.hoverPos, mapGenerator, towerManager);
    }

    if (state.selectedTowerId) {
      const tower = towerManager.towers.get(state.selectedTowerId);
      if (tower) {
        this.renderTowerRange(tower, towerManager);
      }
    }

    this.renderTowers(towerManager);
    this.renderEnemies(enemyManager.enemies);
    this.renderProjectiles(projectiles);
    this.renderEffects();

    if (state.gameOver || state.victory) {
      this.renderGameOver(state);
    }
  }

  private renderTerrain(mapGenerator: MapGenerator): void {
    for (let row = 0; row < MAP_HEIGHT; row++) {
      for (let col = 0; col < MAP_WIDTH; col++) {
        const cell = mapGenerator.grid[row][col];
        const x = col * TILE_SIZE;
        const y = row * TILE_SIZE;
        const colors = TERRAIN_COLORS[cell.type];

        this.ctx.fillStyle = colors.base;
        this.ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);

        this.ctx.fillStyle = colors.detail;
        if (cell.type === TerrainType.GRASS) {
          for (let i = 0; i < 3; i++) {
            const px = x + ((col * 7 + i * 11) % TILE_SIZE);
            const py = y + ((row * 5 + i * 13) % TILE_SIZE);
            this.ctx.fillRect(px, py, 3, 3);
          }
        } else if (cell.type === TerrainType.WATER) {
          const waveOffset = Math.sin(this.animTime * 2 + col * 0.5 + row * 0.3) * 3;
          this.ctx.fillRect(x + 4, y + 12 + waveOffset, TILE_SIZE - 8, 2);
          this.ctx.fillRect(x + 8, y + 24 - waveOffset, TILE_SIZE - 16, 2);
        } else if (cell.type === TerrainType.FOREST) {
          this.ctx.fillRect(x + 10, y + 14, 20, 20);
          this.ctx.fillRect(x + 12, y + 8, 16, 10);
          this.ctx.fillStyle = '#5d4037';
          this.ctx.fillRect(x + 17, y + 30, 6, 8);
        } else if (cell.type === TerrainType.ROCK) {
          this.ctx.fillRect(x + 8, y + 10, 24, 22);
          this.ctx.fillRect(x + 4, y + 18, 32, 14);
        }
      }
    }
  }

  private renderGrid(): void {
    this.ctx.strokeStyle = 'rgba(0,0,0,0.15)';
    this.ctx.lineWidth = 1;
    for (let col = 0; col <= MAP_WIDTH; col++) {
      this.ctx.beginPath();
      this.ctx.moveTo(col * TILE_SIZE, 0);
      this.ctx.lineTo(col * TILE_SIZE, MAP_HEIGHT * TILE_SIZE);
      this.ctx.stroke();
    }
    for (let row = 0; row <= MAP_HEIGHT; row++) {
      this.ctx.beginPath();
      this.ctx.moveTo(0, row * TILE_SIZE);
      this.ctx.lineTo(MAP_WIDTH * TILE_SIZE, row * TILE_SIZE);
      this.ctx.stroke();
    }
  }

  private renderSpawnPoints(): void {
    for (const spawn of SPAWN_POSITIONS) {
      const x = spawn.col * TILE_SIZE;
      const y = spawn.row * TILE_SIZE;
      this.ctx.fillStyle = 'rgba(255, 0, 0, 0.25)';
      this.ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
      this.ctx.fillStyle = '#ff5252';
      this.ctx.font = 'bold 20px monospace';
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';
      this.ctx.fillText('⚔', x + TILE_SIZE / 2, y + TILE_SIZE / 2);
    }
  }

  private renderBase(): void {
    const x = BASE_POS.col * TILE_SIZE;
    const y = BASE_POS.row * TILE_SIZE;
    this.ctx.fillStyle = 'rgba(255, 200, 0, 0.15)';
    this.ctx.fillRect(x - TILE_SIZE * 0.2, y - TILE_SIZE * 0.2, TILE_SIZE * 1.4, TILE_SIZE * 1.4);

    this.ctx.fillStyle = '#b71c1c';
    this.ctx.fillRect(x + 6, y + 14, 28, 22);
    this.ctx.fillStyle = '#d32f2f';
    this.ctx.fillRect(x + 4, y + 8, 8, 10);
    this.ctx.fillRect(x + 16, y + 4, 8, 14);
    this.ctx.fillRect(x + 28, y + 8, 8, 10);
    this.ctx.fillStyle = '#ffeb3b';
    this.ctx.fillRect(x + 18, y + 2, 4, 8);
    this.ctx.fillStyle = '#f44336';
    this.ctx.fillRect(x + 22, y + 0, 6, 5);
    this.ctx.fillStyle = '#1b0000';
    this.ctx.fillRect(x + 16, y + 22, 8, 14);
  }

  private renderTowerPlacementPreview(
    type: TowerType,
    pos: GridPos,
    mapGenerator: MapGenerator,
    towerManager: TowerManager
  ): void {
    const x = pos.col * TILE_SIZE;
    const y = pos.row * TILE_SIZE;
    const config = TOWER_CONFIGS[type];
    const canPlace = mapGenerator.canBuildTower(pos.col, pos.row) &&
      !towerManager.occupiedCells.has(`${pos.col},${pos.row}`);

    this.ctx.fillStyle = canPlace ? 'rgba(76, 175, 80, 0.3)' : 'rgba(244, 67, 54, 0.3)';
    this.ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);

    this.ctx.strokeStyle = canPlace ? '#4caf50' : '#f44336';
    this.ctx.lineWidth = 2;
    this.ctx.strokeRect(x + 1, y + 1, TILE_SIZE - 2, TILE_SIZE - 2);

    if (canPlace) {
      const stats = config.levels[0];
      const cx = x + TILE_SIZE / 2;
      const cy = y + TILE_SIZE / 2;
      this.ctx.strokeStyle = 'rgba(212, 180, 131, 0.6)';
      this.ctx.lineWidth = 2;
      this.ctx.setLineDash([4, 4]);
      this.ctx.beginPath();
      this.ctx.arc(cx, cy, stats.range * TILE_SIZE, 0, Math.PI * 2);
      this.ctx.stroke();
      this.ctx.setLineDash([]);
    }
  }

  private renderTowerRange(tower: Tower, towerManager: TowerManager): void {
    const center = towerManager.getTowerCenter(tower);
    const stats = towerManager.getTowerStats(tower);
    this.ctx.strokeStyle = 'rgba(212, 180, 131, 0.8)';
    this.ctx.lineWidth = 2;
    this.ctx.setLineDash([6, 4]);
    this.ctx.beginPath();
    this.ctx.arc(center.x, center.y, stats.range * TILE_SIZE, 0, Math.PI * 2);
    this.ctx.stroke();
    this.ctx.setLineDash([]);
  }

  private renderTowers(towerManager: TowerManager): void {
    for (const tower of towerManager.towers.values()) {
      const config = TOWER_CONFIGS[tower.type];
      const x = tower.pos.col * TILE_SIZE;
      const y = tower.pos.row * TILE_SIZE;
      const alpha = tower.fadeInProgress;

      this.ctx.globalAlpha = alpha;

      this.ctx.fillStyle = '#3e2723';
      this.ctx.fillRect(x + 6, y + 26, 28, 10);

      this.ctx.fillStyle = config.color;
      const levelScale = 1 + (tower.level - 1) * 0.08;
      const size = 22 * levelScale;
      const off = (TILE_SIZE - size) / 2;
      this.ctx.fillRect(x + off, y + off + 4, size, size - 4);

      const shade = this.darkenColor(config.color, 0.4);
      this.ctx.fillStyle = shade;
      this.ctx.fillRect(x + off, y + off + size - 8, size, 4);

      if (tower.level >= 2) {
        this.ctx.fillStyle = this.lightenColor(config.color, 0.3);
        this.ctx.fillRect(x + off + 2, y + off + 6, 4, 4);
      }
      if (tower.level >= 3) {
        this.ctx.fillStyle = this.lightenColor(config.color, 0.5);
        this.ctx.fillRect(x + off + size - 6, y + off + 6, 4, 4);
      }
      if (tower.level >= 4) {
        this.ctx.fillStyle = '#ffd700';
        this.ctx.fillRect(x + TILE_SIZE / 2 - 3, y + off, 6, 6);
      }

      if (tower.type === TowerType.SLOW) {
        const pulseR = TILE_SIZE * 0.3 + Math.sin(this.animTime * 3) * 3;
        this.ctx.strokeStyle = `rgba(33, 150, 243, ${0.4 + Math.sin(this.animTime * 3) * 0.2})`;
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.arc(x + TILE_SIZE / 2, y + TILE_SIZE / 2, pulseR, 0, Math.PI * 2);
        this.ctx.stroke();
      }

      this.ctx.globalAlpha = 1;
    }
  }

  private renderEnemies(enemies: Enemy[]): void {
    for (const enemy of enemies) {
      if (enemy.dead || enemy.reachedBase) continue;
      const config = ENEMY_CONFIGS[enemy.type];

      if (enemy.slowTimer > 0) {
        this.ctx.strokeStyle = 'rgba(33, 150, 243, 0.8)';
        this.ctx.lineWidth = 2;
        this.ctx.save();
        this.ctx.translate(enemy.pos.x, enemy.pos.y);
        this.ctx.rotate(this.animTime * 4);
        this.ctx.beginPath();
        for (let i = 0; i < 6; i++) {
          const angle = (i / 6) * Math.PI * 2;
          const r = enemy.size + 4;
          const px = Math.cos(angle) * r;
          const py = Math.sin(angle) * r;
          if (i === 0) this.ctx.moveTo(px, py);
          else this.ctx.lineTo(px, py);
        }
        this.ctx.closePath();
        this.ctx.stroke();
        this.ctx.restore();
      }

      this.ctx.fillStyle = '#000';
      this.ctx.fillRect(enemy.pos.x - enemy.size / 2 + 1, enemy.pos.y - enemy.size / 2 + 1, enemy.size, enemy.size);

      this.ctx.fillStyle = config.color;
      this.ctx.fillRect(enemy.pos.x - enemy.size / 2, enemy.pos.y - enemy.size / 2, enemy.size, enemy.size);

      this.ctx.fillStyle = '#fff';
      const eyeOff = enemy.size / 4;
      this.ctx.fillRect(enemy.pos.x - eyeOff - 2, enemy.pos.y - 2, 3, 3);
      this.ctx.fillRect(enemy.pos.x + eyeOff - 1, enemy.pos.y - 2, 3, 3);

      this.ctx.fillStyle = '#000';
      this.ctx.fillRect(enemy.pos.x - eyeOff - 1, enemy.pos.y - 1, 1, 2);
      this.ctx.fillRect(enemy.pos.x + eyeOff, enemy.pos.y - 1, 1, 2);

      const barW = enemy.size + 4;
      const barH = 4;
      const barX = enemy.pos.x - barW / 2;
      const barY = enemy.pos.y - enemy.size / 2 - 8;
      this.ctx.fillStyle = '#333';
      this.ctx.fillRect(barX, barY, barW, barH);
      this.ctx.fillStyle = enemy.hp / enemy.maxHp > 0.5 ? '#4caf50' : enemy.hp / enemy.maxHp > 0.25 ? '#ff9800' : '#f44336';
      this.ctx.fillRect(barX, barY, barW * (enemy.hp / enemy.maxHp), barH);
    }
  }

  private renderProjectiles(projectiles: Projectile[]): void {
    for (const p of projectiles) {
      if (p.dead) continue;

      if (p.type === TowerType.ARROW) {
        const dx = p.targetPos.x - p.pos.x;
        const dy = p.targetPos.y - p.pos.y;
        const len = Math.sqrt(dx * dx + dy * dy) || 1;
        const angle = Math.atan2(dy, dx);

        this.ctx.save();
        this.ctx.translate(p.pos.x, p.pos.y);
        this.ctx.rotate(angle);
        this.ctx.fillStyle = '#795548';
        this.ctx.fillRect(-8, -1, 14, 2);
        this.ctx.fillStyle = '#bdbdbd';
        this.ctx.beginPath();
        this.ctx.moveTo(8, 0);
        this.ctx.lineTo(4, -3);
        this.ctx.lineTo(4, 3);
        this.ctx.closePath();
        this.ctx.fill();
        this.ctx.fillStyle = '#f44336';
        this.ctx.fillRect(-10, -3, 3, 6);
        this.ctx.restore();
      } else if (p.type === TowerType.CANNON) {
        this.ctx.fillStyle = '#212121';
        this.ctx.beginPath();
        this.ctx.arc(p.pos.x, p.pos.y, 5, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.fillStyle = '#ff5722';
        this.ctx.beginPath();
        this.ctx.arc(p.pos.x - 1, p.pos.y - 1, 2, 0, Math.PI * 2);
        this.ctx.fill();
      } else if (p.type === TowerType.MAGIC) {
        this.ctx.strokeStyle = '#e040fb';
        this.ctx.lineWidth = 3;
        this.ctx.shadowColor = '#e040fb';
        this.ctx.shadowBlur = 10;
        this.ctx.beginPath();
        this.ctx.moveTo(p.pos.x, p.pos.y);
        const jitterX = (Math.random() - 0.5) * 8;
        const jitterY = (Math.random() - 0.5) * 8;
        this.ctx.lineTo(p.pos.x + jitterX, p.pos.y + jitterY);
        this.ctx.stroke();
        this.ctx.shadowBlur = 0;

        this.ctx.fillStyle = '#fff';
        this.ctx.beginPath();
        this.ctx.arc(p.pos.x, p.pos.y, 4, 0, Math.PI * 2);
        this.ctx.fill();
      }
    }
  }

  private renderEffects(): void {
    for (const e of this.effects) {
      const alpha = e.life / e.maxLife;
      if (e.type === 'explosion') {
        this.ctx.fillStyle = `rgba(255, 152, 0, ${alpha * 0.6})`;
        this.ctx.beginPath();
        this.ctx.arc(e.pos.x, e.pos.y, e.radius, 0, Math.PI * 2);
        this.ctx.fill();

        this.ctx.strokeStyle = `rgba(255, 87, 34, ${alpha})`;
        this.ctx.lineWidth = 3;
        this.ctx.beginPath();
        this.ctx.arc(e.pos.x, e.pos.y, e.radius * 0.8, 0, Math.PI * 2);
        this.ctx.stroke();
      } else if (e.type === 'magicBolt') {
        this.ctx.fillStyle = `rgba(224, 64, 251, ${alpha * 0.5})`;
        this.ctx.beginPath();
        this.ctx.arc(e.pos.x, e.pos.y, e.radius, 0, Math.PI * 2);
        this.ctx.fill();
      }
    }
  }

  private renderGameOver(state: GameState): void {
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.font = 'bold 48px monospace';

    if (state.victory) {
      this.ctx.fillStyle = '#ffd700';
      this.ctx.fillText('🏆 胜利！', this.canvas.width / 2, this.canvas.height / 2 - 30);
      this.ctx.font = '24px monospace';
      this.ctx.fillStyle = '#fff';
      this.ctx.fillText('你成功守住了虚空防线！', this.canvas.width / 2, this.canvas.height / 2 + 20);
    } else {
      this.ctx.fillStyle = '#f44336';
      this.ctx.fillText('💀 失败', this.canvas.width / 2, this.canvas.height / 2 - 30);
      this.ctx.font = '24px monospace';
      this.ctx.fillStyle = '#fff';
      this.ctx.fillText(`坚守到第 ${state.wave} 波`, this.canvas.width / 2, this.canvas.height / 2 + 20);
    }

    this.ctx.font = '16px monospace';
    this.ctx.fillStyle = '#d4b483';
    this.ctx.fillText('刷新页面重新开始', this.canvas.width / 2, this.canvas.height / 2 + 60);
  }

  private darkenColor(hex: string, amount: number): string {
    const { r, g, b } = this.hexToRgb(hex);
    return `rgb(${Math.floor(r * (1 - amount))}, ${Math.floor(g * (1 - amount))}, ${Math.floor(b * (1 - amount))})`;
  }

  private lightenColor(hex: string, amount: number): string {
    const { r, g, b } = this.hexToRgb(hex);
    return `rgb(${Math.min(255, Math.floor(r + (255 - r) * amount))}, ${Math.min(255, Math.floor(g + (255 - g) * amount))}, ${Math.min(255, Math.floor(b + (255 - b) * amount))})`;
  }

  private hexToRgb(hex: string): { r: number; g: number; b: number } {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : { r: 0, g: 0, b: 0 };
  }
}
