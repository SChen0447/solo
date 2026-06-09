import type { Point, PathData, Tower, Enemy, Bullet, DamageNumber, GameState } from './types';

export class Renderer {
  private ctx: CanvasRenderingContext2D;
  private canvas: HTMLCanvasElement;
  private width: number;
  private height: number;
  private gridSize: number = 40;

  private colors = {
    background: '#0a0a23',
    gridLine: '#1a1a4e',
    path: '#4488ff',
    pathGlow: 'rgba(68, 136, 255, 0.3)',
    drawingPath: '#ffffff',
    tower: '#00aaff',
    towerGlow: 'rgba(0, 170, 255, 0.5)',
    towerSelected: '#ffdd00',
    towerSelectedGlow: 'rgba(255, 221, 0, 0.6)',
    enemy: '#ff3355',
    enemyGlow: 'rgba(255, 51, 85, 0.5)',
    enemyHpBarBg: '#333366',
    enemyHpBarFill: '#00ff88',
    bullet: '#ffff00',
    bulletGlow: 'rgba(255, 255, 0, 0.6)',
    damageText: '#ffffff',
  };

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Failed to get 2D context');
    this.ctx = ctx;
    this.width = canvas.width;
    this.height = canvas.height;
  }

  resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
    this.canvas.width = width;
    this.canvas.height = height;
  }

  getWidth(): number { return this.width; }
  getHeight(): number { return this.height; }

  render(
    paths: PathData[],
    currentDrawingPoints: Point[],
    isDrawing: boolean,
    towers: Tower[],
    enemies: Enemy[],
    bullets: Bullet[],
    damageNumbers: DamageNumber[],
    gameState: GameState
  ): void {
    this.clear();
    this.drawGrid();
    this.drawPaths(paths);

    if (isDrawing && currentDrawingPoints.length > 0) {
      this.drawCurrentPath(currentDrawingPoints);
    }

    this.drawTowers(towers);
    this.drawEnemies(enemies);
    this.drawBullets(bullets);
    this.drawDamageNumbers(damageNumbers);
  }

  private clear(): void {
    this.ctx.fillStyle = this.colors.background;
    this.ctx.fillRect(0, 0, this.width, this.height);
  }

  private drawGrid(): void {
    this.ctx.strokeStyle = this.colors.gridLine;
    this.ctx.lineWidth = 1;

    for (let x = 0; x <= this.width; x += this.gridSize) {
      this.ctx.beginPath();
      this.ctx.moveTo(x, 0);
      this.ctx.lineTo(x, this.height);
      this.ctx.stroke();
    }

    for (let y = 0; y <= this.height; y += this.gridSize) {
      this.ctx.beginPath();
      this.ctx.moveTo(0, y);
      this.ctx.lineTo(this.width, y);
      this.ctx.stroke();
    }
  }

  private drawPaths(paths: PathData[]): void {
    for (const path of paths) {
      this.drawPath(path.smoothedPoints, this.colors.path, 3, true);
    }
  }

  private drawCurrentPath(points: Point[]): void {
    this.drawPath(points, this.colors.drawingPath, 2, false);
  }

  private drawPath(points: Point[], color: string, lineWidth: number, glow: boolean): void {
    if (points.length < 2) return;

    if (glow) {
      this.ctx.save();
      this.ctx.shadowColor = this.colors.pathGlow;
      this.ctx.shadowBlur = 10;
      this.ctx.strokeStyle = color;
      this.ctx.lineWidth = lineWidth + 2;
      this.ctx.lineCap = 'round';
      this.ctx.lineJoin = 'round';

      this.ctx.beginPath();
      this.ctx.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length; i++) {
        this.ctx.lineTo(points[i].x, points[i].y);
      }
      this.ctx.stroke();
      this.ctx.restore();
    }

    this.ctx.strokeStyle = color;
    this.ctx.lineWidth = lineWidth;
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';

    this.ctx.beginPath();
    this.ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      this.ctx.lineTo(points[i].x, points[i].y);
    }
    this.ctx.stroke();
  }

  private drawTowers(towers: Tower[]): void {
    for (const tower of towers) {
      this.drawTower(tower);
    }
  }

  private drawTower(tower: Tower): void {
    const { x, y } = tower.position;
    const radius = 12;

    if (tower.isSelected) {
      this.ctx.save();
      this.ctx.shadowColor = this.colors.towerSelectedGlow;
      this.ctx.shadowBlur = 20;
      this.ctx.strokeStyle = this.colors.towerSelected;
      this.ctx.lineWidth = 3;

      this.ctx.beginPath();
      this.ctx.arc(x, y, radius + 8, 0, Math.PI * 2);
      this.ctx.stroke();
      this.ctx.restore();

      this.ctx.fillStyle = '#ffffff';
      this.ctx.font = '12px Inter, sans-serif';
      this.ctx.textAlign = 'center';
      this.ctx.fillText(
        `${Math.round(tower.damageBonus * 100)}%`,
        x,
        y - radius - 15
      );
    }

    this.ctx.save();
    this.ctx.shadowColor = this.colors.towerGlow;
    this.ctx.shadowBlur = 15;

    const gradient = this.ctx.createRadialGradient(x, y, 0, x, y, radius);
    gradient.addColorStop(0, '#66ccff');
    gradient.addColorStop(1, this.colors.tower);

    this.ctx.fillStyle = gradient;
    this.ctx.beginPath();
    this.ctx.arc(x, y, radius, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.restore();

    const intensity = tower.damageBonus / 0.5;
    const r = Math.floor(0 + intensity * 100);
    const g = Math.floor(170 - intensity * 70);
    const b = Math.floor(255 - intensity * 100);

    this.ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
    this.ctx.beginPath();
    this.ctx.arc(x, y, radius * 0.5, 0, Math.PI * 2);
    this.ctx.fill();
  }

  private drawEnemies(enemies: Enemy[]): void {
    for (const enemy of enemies) {
      if (!enemy.isAlive || enemy.pathDistance < 0) continue;
      this.drawEnemy(enemy);
    }
  }

  private drawEnemy(enemy: Enemy): void {
    const { x, y } = enemy.position;
    const radius = 10;

    this.ctx.save();
    this.ctx.shadowColor = this.colors.enemyGlow;
    this.ctx.shadowBlur = 12;

    const gradient = this.ctx.createRadialGradient(x, y, 0, x, y, radius);
    gradient.addColorStop(0, '#ff8899');
    gradient.addColorStop(1, this.colors.enemy);

    this.ctx.fillStyle = gradient;
    this.ctx.beginPath();
    this.ctx.arc(x, y, radius, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.restore();

    const hpPercent = enemy.hp / enemy.maxHp;
    const barWidth = 24;
    const barHeight = 4;
    const barX = x - barWidth / 2;
    const barY = y - radius - 10;

    this.ctx.fillStyle = this.colors.enemyHpBarBg;
    this.ctx.fillRect(barX, barY, barWidth, barHeight);

    this.ctx.fillStyle = hpPercent > 0.5 ? this.colors.enemyHpBarFill : hpPercent > 0.25 ? '#ffcc00' : '#ff3355';
    this.ctx.fillRect(barX, barY, barWidth * hpPercent, barHeight);
  }

  private drawBullets(bullets: Bullet[]): void {
    for (const bullet of bullets) {
      if (!bullet.isActive) continue;
      this.drawBullet(bullet);
    }
  }

  private drawBullet(bullet: Bullet): void {
    const { x, y } = bullet.position;
    const radius = 4;

    this.ctx.save();
    this.ctx.shadowColor = this.colors.bulletGlow;
    this.ctx.shadowBlur = 8;
    this.ctx.fillStyle = this.colors.bullet;
    this.ctx.beginPath();
    this.ctx.arc(x, y, radius, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.restore();
  }

  private drawDamageNumbers(damageNumbers: DamageNumber[]): void {
    const now = performance.now();

    for (const dmg of damageNumbers) {
      const elapsed = now - dmg.createdAt;
      const progress = elapsed / dmg.duration;

      if (progress >= 1) continue;

      const alpha = 1 - progress;
      const offsetY = progress * 40;

      this.ctx.save();
      this.ctx.globalAlpha = alpha;
      this.ctx.fillStyle = this.colors.damageText;
      this.ctx.font = 'bold 14px Inter, sans-serif';
      this.ctx.textAlign = 'center';
      this.ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
      this.ctx.shadowBlur = 4;
      this.ctx.fillText(
        `${dmg.damage}`,
        dmg.position.x,
        dmg.position.y - offsetY
      );
      this.ctx.restore();
    }
  }

  getCanvas(): HTMLCanvasElement {
    return this.canvas;
  }

  getContext(): CanvasRenderingContext2D {
    return this.ctx;
  }
}
