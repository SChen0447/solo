import { Game } from './game';
import {
  GRID_SIZE, TOWER_CONFIGS, ENEMY_CONFIGS
} from './types';
import type { Tower, Enemy, Projectile, Particle, FloatingText } from './types';

export class Renderer {
  private ctx: CanvasRenderingContext2D;
  private game: Game;
  private canvas: HTMLCanvasElement;

  private hoverGridX: number = -1;
  private hoverGridY: number = -1;

  constructor(canvas: HTMLCanvasElement, game: Game) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('无法获取Canvas 2D上下文');
    }
    this.ctx = ctx;
    this.game = game;
  }

  public setHoverPosition(gridX: number, gridY: number): void {
    this.hoverGridX = gridX;
    this.hoverGridY = gridY;
  }

  public render(): void {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    this.drawBackground();
    this.drawGrid();
    this.drawPath();
    this.drawPathGlow();
    this.drawHoverCell();
    this.drawTowers();
    this.drawEnemies();
    this.drawProjectiles();
    this.drawParticles();
    this.drawFloatingTexts();
    this.drawSelectedTowerRange();
  }

  private drawBackground(): void {
    const gradient = this.ctx.createRadialGradient(
      this.canvas.width / 2, this.canvas.height / 2, 0,
      this.canvas.width / 2, this.canvas.height / 2, this.canvas.width * 0.7
    );
    gradient.addColorStop(0, '#2f2f2f');
    gradient.addColorStop(1, '#252525');
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.03)';
    for (let i = 0; i < 50; i++) {
      const x = (i * 73) % this.canvas.width;
      const y = (i * 137) % this.canvas.height;
      this.ctx.beginPath();
      this.ctx.arc(x, y, 20 + (i % 3) * 10, 0, Math.PI * 2);
      this.ctx.fill();
    }
  }

  private drawGrid(): void {
    this.ctx.strokeStyle = 'rgba(100, 100, 100, 0.2)';
    this.ctx.lineWidth = 1;

    for (let x = 0; x <= this.game.gridCols; x++) {
      this.ctx.beginPath();
      this.ctx.moveTo(x * GRID_SIZE, 0);
      this.ctx.lineTo(x * GRID_SIZE, this.canvas.height);
      this.ctx.stroke();
    }

    for (let y = 0; y <= this.game.gridRows; y++) {
      this.ctx.beginPath();
      this.ctx.moveTo(0, y * GRID_SIZE);
      this.ctx.lineTo(this.canvas.width, y * GRID_SIZE);
      this.ctx.stroke();
    }
  }

  private drawPath(): void {
    if (this.game.path.length < 2) return;

    this.ctx.strokeStyle = '#3a3a3a';
    this.ctx.lineWidth = GRID_SIZE * 0.9;
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';

    this.ctx.beginPath();
    this.ctx.moveTo(this.game.path[0].x, this.game.path[0].y);
    for (let i = 1; i < this.game.path.length; i++) {
      this.ctx.lineTo(this.game.path[i].x, this.game.path[i].y);
    }
    this.ctx.stroke();

    this.ctx.strokeStyle = '#4a4a4a';
    this.ctx.lineWidth = GRID_SIZE * 0.7;

    this.ctx.beginPath();
    this.ctx.moveTo(this.game.path[0].x, this.game.path[0].y);
    for (let i = 1; i < this.game.path.length; i++) {
      this.ctx.lineTo(this.game.path[i].x, this.game.path[i].y);
    }
    this.ctx.stroke();

    this.ctx.strokeStyle = 'rgba(139, 69, 19, 0.4)';
    this.ctx.lineWidth = 2;
    this.ctx.setLineDash([8, 8]);

    this.ctx.beginPath();
    this.ctx.moveTo(this.game.path[0].x, this.game.path[0].y);
    for (let i = 1; i < this.game.path.length; i++) {
      this.ctx.lineTo(this.game.path[i].x, this.game.path[i].y);
    }
    this.ctx.stroke();
    this.ctx.setLineDash([]);
  }

  private drawPathGlow(): void {
    if (this.game.enemies.length === 0) return;
    if (this.game.path.length < 2) return;

    this.ctx.save();
    this.ctx.shadowColor = '#d4af37';
    this.ctx.shadowBlur = 15;
    this.ctx.strokeStyle = 'rgba(212, 175, 55, 0.3)';
    this.ctx.lineWidth = GRID_SIZE * 0.5;
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';

    this.ctx.beginPath();
    this.ctx.moveTo(this.game.path[0].x, this.game.path[0].y);
    for (let i = 1; i < this.game.path.length; i++) {
      this.ctx.lineTo(this.game.path[i].x, this.game.path[i].y);
    }
    this.ctx.stroke();
    this.ctx.restore();
  }

  private drawHoverCell(): void {
    if (this.hoverGridX < 0 || this.hoverGridY < 0) return;
    if (this.hoverGridX >= this.game.gridCols || this.hoverGridY >= this.game.gridRows) return;

    const x = this.hoverGridX * GRID_SIZE;
    const y = this.hoverGridY * GRID_SIZE;

    if (this.game.state.selectedTowerType) {
      const isBuildable = this.game.isCellBuildable(this.hoverGridX, this.hoverGridY);
      const config = TOWER_CONFIGS[this.game.state.selectedTowerType];
      const canAfford = this.game.state.gold >= config.cost;

      if (isBuildable && canAfford) {
        this.ctx.fillStyle = 'rgba(107, 142, 35, 0.3)';
        this.ctx.strokeStyle = 'rgba(107, 142, 35, 0.8)';
      } else {
        this.ctx.fillStyle = 'rgba(192, 57, 43, 0.3)';
        this.ctx.strokeStyle = 'rgba(192, 57, 43, 0.8)';
      }

      this.ctx.fillRect(x, y, GRID_SIZE, GRID_SIZE);
      this.ctx.lineWidth = 2;
      this.ctx.strokeRect(x, y, GRID_SIZE, GRID_SIZE);

      if (isBuildable && canAfford) {
        const centerX = x + GRID_SIZE / 2;
        const centerY = y + GRID_SIZE / 2;
        this.ctx.beginPath();
        this.ctx.arc(centerX, centerY, config.range, 0, Math.PI * 2);
        this.ctx.fillStyle = 'rgba(212, 175, 55, 0.1)';
        this.ctx.fill();
        this.ctx.strokeStyle = 'rgba(212, 175, 55, 0.5)';
        this.ctx.lineWidth = 1;
        this.ctx.stroke();
      }
    } else {
      this.ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
      this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
      this.ctx.fillRect(x, y, GRID_SIZE, GRID_SIZE);
      this.ctx.lineWidth = 1;
      this.ctx.strokeRect(x, y, GRID_SIZE, GRID_SIZE);
    }
  }

  private drawSelectedTowerRange(): void {
    const tower = this.game.state.selectedTower;
    if (!tower) return;

    this.ctx.beginPath();
    this.ctx.arc(tower.x, tower.y, tower.range, 0, Math.PI * 2);
    this.ctx.fillStyle = 'rgba(212, 175, 55, 0.1)';
    this.ctx.fill();
    this.ctx.strokeStyle = 'rgba(212, 175, 55, 0.6)';
    this.ctx.lineWidth = 2;
    this.ctx.setLineDash([5, 5]);
    this.ctx.stroke();
    this.ctx.setLineDash([]);
  }

  private drawTowers(): void {
    for (const tower of this.game.towers) {
      this.drawTower(tower);
    }
  }

  private drawTower(tower: Tower): void {
    const config = TOWER_CONFIGS[tower.type];
    let scale = 1;
    let alpha = 1;

    if (tower.isPlacing) {
      scale = 0.8 + tower.placeAnimProgress * 0.2;
      alpha = tower.placeAnimProgress;
    }

    this.ctx.save();
    this.ctx.translate(tower.x, tower.y);
    this.ctx.scale(scale, scale);
    this.ctx.globalAlpha = alpha;

    this.ctx.fillStyle = '#3a3a3a';
    this.ctx.strokeStyle = '#555';
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();
    this.ctx.arc(0, 0, GRID_SIZE * 0.4, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.stroke();

    this.ctx.fillStyle = config.color;
    this.ctx.strokeStyle = '#d4af37';
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();
    this.ctx.arc(0, 0, GRID_SIZE * 0.3, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.stroke();

    this.ctx.rotate(tower.angle);

    if (tower.type === 'arrow') {
      this.ctx.fillStyle = '#d4af37';
      this.ctx.fillRect(0, -2, GRID_SIZE * 0.35, 4);
      this.ctx.beginPath();
      this.ctx.moveTo(GRID_SIZE * 0.35, -5);
      this.ctx.lineTo(GRID_SIZE * 0.45, 0);
      this.ctx.lineTo(GRID_SIZE * 0.35, 5);
      this.ctx.closePath();
      this.ctx.fill();
    } else if (tower.type === 'slow') {
      this.ctx.fillStyle = '#87ceeb';
      this.ctx.beginPath();
      this.ctx.arc(GRID_SIZE * 0.25, 0, 6, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.fillStyle = '#add8e6';
      this.ctx.beginPath();
      this.ctx.arc(GRID_SIZE * 0.25, -4, 3, 0, Math.PI * 2);
      this.ctx.fill();
    } else if (tower.type === 'splash') {
      this.ctx.fillStyle = '#333';
      this.ctx.fillRect(0, -5, GRID_SIZE * 0.3, 10);
      this.ctx.fillStyle = '#d4af37';
      this.ctx.beginPath();
      this.ctx.arc(GRID_SIZE * 0.3, 0, 5, 0, Math.PI * 2);
      this.ctx.fill();
    }

    this.ctx.rotate(-tower.angle);

    if (tower.level > 1) {
      this.ctx.fillStyle = '#d4af37';
      this.ctx.font = 'bold 10px "Cinzel", serif';
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';
      const starY = -GRID_SIZE * 0.45;
      const stars = '★'.repeat(tower.level - 1);
      this.ctx.fillText(stars, 0, starY);
    }

    this.ctx.restore();
  }

  private drawEnemies(): void {
    for (const enemy of this.game.enemies) {
      this.drawEnemy(enemy);
    }
  }

  private drawEnemy(enemy: Enemy): void {
    this.ctx.save();
    this.ctx.translate(enemy.x, enemy.y);

    const config = ENEMY_CONFIGS[enemy.type];
    const radius = enemy.radius;

    if (enemy.isHit) {
      this.ctx.shadowColor = '#ff0000';
      this.ctx.shadowBlur = 15;
    }

    let bodyColor = config.color;
    if (enemy.isHit) {
      bodyColor = '#ff4444';
    }

    this.ctx.fillStyle = bodyColor;
    this.ctx.strokeStyle = '#1a1a1a';
    this.ctx.lineWidth = 2;

    if (enemy.type === 'normal') {
      this.ctx.beginPath();
      this.ctx.arc(0, 0, radius, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.stroke();

      this.ctx.fillStyle = '#fff';
      this.ctx.beginPath();
      this.ctx.arc(-4, -2, 3, 0, Math.PI * 2);
      this.ctx.arc(4, -2, 3, 0, Math.PI * 2);
      this.ctx.fill();

      this.ctx.fillStyle = '#000';
      this.ctx.beginPath();
      this.ctx.arc(-4, -2, 1.5, 0, Math.PI * 2);
      this.ctx.arc(4, -2, 1.5, 0, Math.PI * 2);
      this.ctx.fill();
    } else {
      this.ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const angle = (i / 6) * Math.PI * 2 - Math.PI / 2;
        const x = Math.cos(angle) * radius;
        const y = Math.sin(angle) * radius;
        if (i === 0) {
          this.ctx.moveTo(x, y);
        } else {
          this.ctx.lineTo(x, y);
        }
      }
      this.ctx.closePath();
      this.ctx.fill();
      this.ctx.stroke();

      this.ctx.fillStyle = '#d4af37';
      this.ctx.beginPath();
      this.ctx.arc(-5, -3, 4, 0, Math.PI * 2);
      this.ctx.arc(5, -3, 4, 0, Math.PI * 2);
      this.ctx.fill();

      this.ctx.fillStyle = '#ff0000';
      this.ctx.beginPath();
      this.ctx.arc(-5, -3, 2, 0, Math.PI * 2);
      this.ctx.arc(5, -3, 2, 0, Math.PI * 2);
      this.ctx.fill();

      this.ctx.fillStyle = '#d4af37';
      this.ctx.beginPath();
      this.ctx.moveTo(-radius * 0.6, -radius * 0.7);
      this.ctx.lineTo(-radius * 0.3, -radius * 1.2);
      this.ctx.lineTo(0, -radius * 0.7);
      this.ctx.lineTo(radius * 0.3, -radius * 1.2);
      this.ctx.lineTo(radius * 0.6, -radius * 0.7);
      this.ctx.closePath();
      this.ctx.fill();
      this.ctx.strokeStyle = '#b8860b';
      this.ctx.lineWidth = 1;
      this.ctx.stroke();
    }

    if (enemy.slowEffect < 1) {
      this.ctx.strokeStyle = 'rgba(65, 105, 225, 0.6)';
      this.ctx.lineWidth = 2;
      this.ctx.beginPath();
      this.ctx.arc(0, 0, radius + 4, 0, Math.PI * 2);
      this.ctx.stroke();
    }

    this.ctx.restore();
    this.drawHealthBar(enemy);
  }

  private drawHealthBar(enemy: Enemy): void {
    const barWidth = enemy.radius * 2;
    const barHeight = 4;
    const barX = enemy.x - barWidth / 2;
    const barY = enemy.y - enemy.radius - 10;

    this.ctx.fillStyle = '#1a1a1a';
    this.ctx.fillRect(barX - 1, barY - 1, barWidth + 2, barHeight + 2);

    this.ctx.fillStyle = '#333';
    this.ctx.fillRect(barX, barY, barWidth, barHeight);

    const hpPercent = enemy.hp / enemy.maxHp;
    let hpColor = '#2ecc71';
    if (hpPercent < 0.3) {
      hpColor = '#e74c3c';
    } else if (hpPercent < 0.6) {
      hpColor = '#f39c12';
    }

    this.ctx.fillStyle = hpColor;
    this.ctx.fillRect(barX, barY, barWidth * hpPercent, barHeight);
  }

  private drawProjectiles(): void {
    for (const proj of this.game.projectiles) {
      if (!proj.active) continue;
      this.drawProjectile(proj);
    }
  }

  private drawProjectile(proj: Projectile): void {
    const config = TOWER_CONFIGS[proj.type];

    this.ctx.save();
    this.ctx.translate(proj.x, proj.y);

    if (proj.type === 'arrow') {
      const angle = Math.atan2(proj.targetY - proj.y, proj.targetX - proj.x);
      this.ctx.rotate(angle);

      this.ctx.fillStyle = '#8b4513';
      this.ctx.fillRect(-12, -1.5, 20, 3);

      this.ctx.fillStyle = '#d4af37';
      this.ctx.beginPath();
      this.ctx.moveTo(8, -4);
      this.ctx.lineTo(14, 0);
      this.ctx.lineTo(8, 4);
      this.ctx.closePath();
      this.ctx.fill();

      this.ctx.fillStyle = '#fff';
      this.ctx.beginPath();
      this.ctx.moveTo(-12, -3);
      this.ctx.lineTo(-16, 0);
      this.ctx.lineTo(-12, 3);
      this.ctx.closePath();
      this.ctx.fill();
    } else if (proj.type === 'slow') {
      this.ctx.fillStyle = 'rgba(135, 206, 235, 0.8)';
      this.ctx.beginPath();
      this.ctx.arc(0, 0, 6, 0, Math.PI * 2);
      this.ctx.fill();

      this.ctx.fillStyle = '#fff';
      this.ctx.beginPath();
      this.ctx.arc(0, 0, 3, 0, Math.PI * 2);
      this.ctx.fill();

      this.ctx.strokeStyle = 'rgba(65, 105, 225, 0.5)';
      this.ctx.lineWidth = 2;
      this.ctx.beginPath();
      this.ctx.arc(0, 0, 10, 0, Math.PI * 2);
      this.ctx.stroke();
    } else if (proj.type === 'splash') {
      this.ctx.fillStyle = '#333';
      this.ctx.beginPath();
      this.ctx.arc(0, 0, 7, 0, Math.PI * 2);
      this.ctx.fill();

      this.ctx.fillStyle = '#ff6600';
      this.ctx.beginPath();
      this.ctx.arc(-2, -2, 3, 0, Math.PI * 2);
      this.ctx.fill();

      this.ctx.fillStyle = '#ffcc00';
      this.ctx.beginPath();
      this.ctx.arc(2, 2, 2, 0, Math.PI * 2);
      this.ctx.fill();
    }

    this.ctx.restore();
  }

  private drawParticles(): void {
    for (const particle of this.game.particles) {
      this.drawParticle(particle);
    }
  }

  private drawParticle(particle: Particle): void {
    this.ctx.save();
    this.ctx.globalAlpha = particle.alpha;
    this.ctx.fillStyle = particle.color;

    if (particle.type === 'explosion') {
      this.ctx.beginPath();
      this.ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
      this.ctx.fill();
    } else if (particle.type === 'dust') {
      this.ctx.globalAlpha = particle.alpha * 0.5;
      this.ctx.beginPath();
      this.ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
      this.ctx.fill();
    } else {
      this.ctx.fillRect(
        particle.x - particle.size / 2,
        particle.y - particle.size / 2,
        particle.size,
        particle.size
      );
    }

    this.ctx.restore();
  }

  private drawFloatingTexts(): void {
    for (const ft of this.game.floatingTexts) {
      this.drawFloatingText(ft);
    }
  }

  private drawFloatingText(ft: FloatingText): void {
    this.ctx.save();
    this.ctx.globalAlpha = ft.alpha;
    this.ctx.font = 'bold 16px "Cinzel", "Noto Sans SC", serif';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';

    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    this.ctx.fillText(ft.text, ft.x + 1, ft.y + 1);

    this.ctx.fillStyle = ft.color;
    this.ctx.fillText(ft.text, ft.x, ft.y);

    this.ctx.restore();
  }

  public resize(width: number, height: number): void {
    this.canvas.width = width;
    this.canvas.height = height;
  }
}
