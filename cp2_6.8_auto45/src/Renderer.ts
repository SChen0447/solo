import { GameEngine } from './GameEngine';
import { GameConfig, DEFAULT_CONFIG, Monster, Tower, Projectile } from './types';

export class Renderer {
  private ctx: CanvasRenderingContext2D;
  private config: GameConfig;
  private animationFrameId: number | null = null;
  private isRendering: boolean = false;

  constructor(
    private canvas: HTMLCanvasElement,
    private engine: GameEngine,
    config: GameConfig = DEFAULT_CONFIG
  ) {
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('无法获取Canvas 2D上下文');
    this.ctx = ctx;
    this.config = config;

    this.resize();
  }

  public resize(): void {
    const container = this.canvas.parentElement;
    if (container) {
      this.canvas.width = container.clientWidth;
      this.canvas.height = container.clientHeight;
    }
  }

  public start(): void {
    if (this.isRendering) return;
    this.isRendering = true;
    this.renderLoop();
  }

  public stop(): void {
    this.isRendering = false;
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  private renderLoop = (): void => {
    if (!this.isRendering) return;

    this.render();
    this.animationFrameId = requestAnimationFrame(this.renderLoop);
  };

  public render(): void {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    ctx.clearRect(0, 0, w, h);

    this.drawBackground();
    this.drawGrid();
    this.drawPath();
    this.drawTowers();
    this.drawMonsters();
    this.drawProjectiles();
    this.drawParticles();
    this.drawFloatingTexts();
  }

  private drawBackground(): void {
    const ctx = this.ctx;
    const gradient = ctx.createLinearGradient(0, 0, 0, this.canvas.height);
    gradient.addColorStop(0, '#1a1a2e');
    gradient.addColorStop(1, '#16213e');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
  }

  private drawGrid(): void {
    const ctx = this.ctx;
    const gridSize = this.config.gridSize;

    ctx.strokeStyle = '#2d2d44';
    ctx.lineWidth = 1;

    for (let x = 0; x <= this.canvas.width; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, this.canvas.height);
      ctx.stroke();
    }

    for (let y = 0; y <= this.canvas.height; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(this.canvas.width, y);
      ctx.stroke();
    }
  }

  private drawPath(): void {
    const ctx = this.ctx;
    const curves = this.engine.monsterManager.getPathCurves();

    ctx.strokeStyle = 'rgba(100, 150, 200, 0.3)';
    ctx.lineWidth = 30;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    for (const curve of curves) {
      ctx.beginPath();
      ctx.moveTo(curve.start.x, curve.start.y);
      ctx.bezierCurveTo(
        curve.control1.x, curve.control1.y,
        curve.control2.x, curve.control2.y,
        curve.end.x, curve.end.y
      );
      ctx.stroke();
    }

    ctx.strokeStyle = 'rgba(150, 200, 255, 0.5)';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);

    for (const curve of curves) {
      ctx.beginPath();
      ctx.moveTo(curve.start.x, curve.start.y);
      ctx.bezierCurveTo(
        curve.control1.x, curve.control1.y,
        curve.control2.x, curve.control2.y,
        curve.end.x, curve.end.y
      );
      ctx.stroke();
    }

    ctx.setLineDash([]);
  }

  private drawTowers(): void {
    const towers = this.engine.towerManager.getTowers();

    for (const tower of towers) {
      this.drawTowerBase(tower);

      if (tower.isPlaced && tower.targetId !== null) {
        this.drawAimLine(tower);
      }

      this.drawTowerBarrel(tower);
    }
  }

  private drawTowerBase(tower: Tower): void {
    const ctx = this.ctx;
    const { x, y } = tower.position;

    if (tower.isPlaced && tower.targetId !== null) {
      ctx.beginPath();
      ctx.arc(x, y, tower.range, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(100, 200, 255, 0.2)';
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    if (tower.isDragging) {
      ctx.beginPath();
      ctx.arc(x, y, 45, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(100, 200, 255, 0.2)';
      ctx.fill();
    }

    if (tower.isPlaced) {
      ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
      ctx.shadowBlur = 10;
      ctx.shadowOffsetY = 5;
    }

    const outerGradient = ctx.createRadialGradient(x, y, 20, x, y, 40);
    outerGradient.addColorStop(0, '#5a5a7a');
    outerGradient.addColorStop(0.5, '#3a3a5a');
    outerGradient.addColorStop(1, '#2a2a4a');

    ctx.beginPath();
    ctx.arc(x, y, 40, 0, Math.PI * 2);
    ctx.fillStyle = outerGradient;
    ctx.fill();

    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;

    const innerGradient = ctx.createRadialGradient(x - 5, y - 5, 5, x, y, 20);
    innerGradient.addColorStop(0, 'rgba(255, 255, 255, 0.3)');
    innerGradient.addColorStop(0.5, 'rgba(100, 100, 140, 0.5)');
    innerGradient.addColorStop(1, 'rgba(40, 40, 70, 0.8)');

    ctx.beginPath();
    ctx.arc(x, y, 20, 0, Math.PI * 2);
    ctx.fillStyle = innerGradient;
    ctx.fill();

    ctx.strokeStyle = '#8888aa';
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  private drawAimLine(tower: Tower): void {
    const ctx = this.ctx;
    const { x, y } = tower.position;

    const endX = x + Math.cos(tower.currentAngle) * tower.range;
    const endY = y + Math.sin(tower.currentAngle) * tower.range;

    const gradient = ctx.createLinearGradient(x, y, endX, endY);
    gradient.addColorStop(0, 'rgba(100, 200, 255, 0.8)');
    gradient.addColorStop(1, 'rgba(100, 200, 255, 0)');

    ctx.strokeStyle = gradient;
    ctx.lineWidth = 2;
    ctx.setLineDash([10, 5]);

    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(endX, endY);
    ctx.stroke();

    ctx.setLineDash([]);
  }

  private drawTowerBarrel(tower: Tower): void {
    const ctx = this.ctx;
    const { x, y } = tower.position;
    const barrelLength = 40;
    const barrelWidth = 10;

    const endX = x + Math.cos(tower.currentAngle) * barrelLength;
    const endY = y + Math.sin(tower.currentAngle) * barrelLength;

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(tower.currentAngle);

    const barrelGradient = ctx.createLinearGradient(0, -barrelWidth / 2, 0, barrelWidth / 2);
    barrelGradient.addColorStop(0, '#666688');
    barrelGradient.addColorStop(0.5, '#444466');
    barrelGradient.addColorStop(1, '#333355');

    ctx.fillStyle = barrelGradient;
    ctx.fillRect(0, -barrelWidth / 2, barrelLength, barrelWidth);

    ctx.strokeStyle = '#8888aa';
    ctx.lineWidth = 1;
    ctx.strokeRect(0, -barrelWidth / 2, barrelLength, barrelWidth);

    ctx.fillStyle = '#222244';
    ctx.beginPath();
    ctx.arc(barrelLength, 0, barrelWidth / 2 + 2, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  private drawMonsters(): void {
    const monsters = this.engine.monsterManager.getMonsters();

    for (const monster of monsters) {
      this.drawMonster(monster);
    }
  }

  private drawMonster(monster: Monster): void {
    const ctx = this.ctx;
    const { x, y } = monster.position;
    const size = 20;

    let alpha = 1;
    if (monster.isDead && monster.fadeOutTimer > 0) {
      alpha = monster.fadeOutTimer / 500;
    }

    ctx.globalAlpha = alpha;

    if (monster.hitFlashTimer > 0) {
      ctx.shadowColor = '#ff4444';
      ctx.shadowBlur = 15;
    }

    const hpRatio = monster.hp / monster.maxHp;
    const r = Math.floor(255 * (1 - hpRatio));
    const g = Math.floor(200 * hpRatio);
    const b = 50;
    const bodyColor = `rgb(${r}, ${g}, ${b})`;

    const ringColor = monster.hitFlashTimer > 0 ? '#ff4444' : '#44ff88';
    ctx.strokeStyle = ringColor;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(x - size / 2, y - size / 2, size, size, 4);
    ctx.stroke();

    ctx.fillStyle = bodyColor;
    ctx.beginPath();
    ctx.roundRect(x - size / 2 + 2, y - size / 2 + 2, size - 4, size - 4, 3);
    ctx.fill();

    ctx.shadowBlur = 0;

    const hpBarWidth = 24;
    const hpBarHeight = 4;
    const hpBarY = y - size / 2 - 8;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(x - hpBarWidth / 2, hpBarY, hpBarWidth, hpBarHeight);

    ctx.fillStyle = hpRatio > 0.5 ? '#44ff88' : hpRatio > 0.25 ? '#ffcc44' : '#ff4444';
    ctx.fillRect(x - hpBarWidth / 2, hpBarY, hpBarWidth * hpRatio, hpBarHeight);

    ctx.globalAlpha = 1;
  }

  private drawProjectiles(): void {
    const projectiles = this.engine.projectileManager.getProjectiles();

    for (const proj of projectiles) {
      this.drawProjectileTrail(proj);
      this.drawProjectile(proj);
    }
  }

  private drawProjectileTrail(proj: Projectile): void {
    const ctx = this.ctx;

    for (let i = 0; i < proj.trail.length; i++) {
      const point = proj.trail[i];
      const alpha = (1 - i / proj.trail.length) * 0.5;
      const size = proj.radius * (1 - i / proj.trail.length * 0.7);

      ctx.fillStyle = `rgba(255, 220, 80, ${alpha})`;
      ctx.beginPath();
      ctx.arc(point.x, point.y, size, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private drawProjectile(proj: Projectile): void {
    const ctx = this.ctx;
    const { x, y } = proj.position;

    ctx.shadowColor = '#ffdd44';
    ctx.shadowBlur = 10;

    const gradient = ctx.createRadialGradient(x - 2, y - 2, 0, x, y, proj.radius);
    gradient.addColorStop(0, '#ffffaa');
    gradient.addColorStop(0.5, '#ffdd44');
    gradient.addColorStop(1, '#ffaa00');

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(x, y, proj.radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.shadowBlur = 0;
  }

  private drawParticles(): void {
    const ctx = this.ctx;
    const particles = this.engine.projectileManager.getParticles();

    for (const particle of particles) {
      const alpha = particle.life / particle.maxLife;
      ctx.globalAlpha = alpha;
      ctx.fillStyle = particle.color;
      ctx.beginPath();
      ctx.arc(particle.position.x, particle.position.y, particle.size, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.globalAlpha = 1;
  }

  private drawFloatingTexts(): void {
    const ctx = this.ctx;
    const texts = this.engine.projectileManager.getFloatingTexts();

    ctx.font = 'bold 14px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    for (const text of texts) {
      const alpha = text.life / text.maxLife;
      const scale = 0.8 + (1 - alpha) * 0.5;

      ctx.save();
      ctx.translate(text.position.x, text.position.y);
      ctx.scale(scale, scale);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = text.color;
      ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
      ctx.shadowBlur = 2;
      ctx.fillText(text.text, 0, 0);
      ctx.restore();
    }

    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;
  }

  public drawVictoryText(): void {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    ctx.font = 'bold 48px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const gradient = ctx.createLinearGradient(0, h / 2 - 30, 0, h / 2 + 30);
    gradient.addColorStop(0, '#ffdd44');
    gradient.addColorStop(0.5, '#ff8844');
    gradient.addColorStop(1, '#ff4488');

    ctx.fillStyle = gradient;
    ctx.shadowColor = 'rgba(255, 200, 100, 0.5)';
    ctx.shadowBlur = 20;
    ctx.fillText('胜 利', w / 2, h / 2 - 20);

    ctx.shadowBlur = 0;
  }

  public drawDefeatText(): void {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    ctx.font = 'bold 48px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    ctx.fillStyle = '#ff4444';
    ctx.shadowColor = 'rgba(255, 0, 0, 0.5)';
    ctx.shadowBlur = 20;
    ctx.fillText('失 败', w / 2, h / 2 - 20);

    ctx.shadowBlur = 0;
  }
}
