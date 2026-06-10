import {
  Player, Enemy, SupplyBox, Boss, HomingBullet, Particle,
  CROSSHAIR_SIZE, FIRE_RAY_LENGTH, BOSS_OUTER_RADIUS, BOSS_WEAKPOINT_RADIUS,
} from './entities';

export const STAR_COUNT = 120;
export const MAX_PARTICLES = 150;

export interface Star {
  x: number;
  y: number;
  size: number;
  color: string;
  alpha: number;
}

export function generateStars(w: number, h: number): Star[] {
  const stars: Star[] = [];
  const colors = ['#ffffff', '#eeeeff', '#ddddff', '#ccccff', '#bbbbcc', '#aaaacc'];
  for (let i = 0; i < STAR_COUNT; i++) {
    stars.push({
      x: Math.random() * w,
      y: Math.random() * h,
      size: 1 + Math.random() * 2,
      color: colors[Math.floor(Math.random() * colors.length)],
      alpha: 0.3 + Math.random() * 0.5,
    });
  }
  return stars;
}

export class Renderer {
  private ctx: CanvasRenderingContext2D;
  private canvas: HTMLCanvasElement;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D context unavailable');
    this.ctx = ctx;
  }

  public resize(w: number, h: number): void {
    this.canvas.width = w;
    this.canvas.height = h;
  }

  public clear(): void {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  public drawBackground(mouseX: number, mouseY: number, stars: Star[]): void {
    const w = this.canvas.width;
    const h = this.canvas.height;
    const cx = w / 2 + (mouseX - w / 2) * 0.1;
    const cy = h / 2 + (mouseY - h / 2) * 0.1;
    const gradient = this.ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(w, h) * 0.8);
    gradient.addColorStop(0, '#1a0a3e');
    gradient.addColorStop(1, '#0a0a2e');
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, w, h);

    for (const s of stars) {
      this.ctx.globalAlpha = s.alpha;
      this.ctx.fillStyle = s.color;
      this.ctx.fillRect(s.x, s.y, s.size, s.size);
    }
    this.ctx.globalAlpha = 1;
  }

  public drawPlayer(player: Player): void {
    const ctx = this.ctx;
    const size = CROSSHAIR_SIZE * player.scale;
    ctx.save();
    ctx.translate(player.x, player.y);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(-size / 2, 0); ctx.lineTo(-4, 0);
    ctx.moveTo(size / 2, 0); ctx.lineTo(4, 0);
    ctx.moveTo(0, -size / 2); ctx.lineTo(0, -4);
    ctx.moveTo(0, size / 2); ctx.lineTo(0, 4);
    ctx.stroke();

    if (player.firing) {
      ctx.globalAlpha = 0.7;
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, -FIRE_RAY_LENGTH - 4);
      ctx.lineTo(0, -4);
      ctx.moveTo(0, FIRE_RAY_LENGTH + 4);
      ctx.lineTo(0, 4);
      ctx.moveTo(-FIRE_RAY_LENGTH - 4, 0);
      ctx.lineTo(-4, 0);
      ctx.moveTo(FIRE_RAY_LENGTH + 4, 0);
      ctx.lineTo(4, 0);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
    ctx.restore();
  }

  public drawEnemy(enemy: Enemy): void {
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(enemy.x, enemy.y);
    ctx.rotate((enemy.rotation * Math.PI) / 180);
    ctx.shadowColor = enemy.color;
    ctx.shadowBlur = 12;
    ctx.fillStyle = enemy.color;
    ctx.strokeStyle = enemy.color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, -10);
    ctx.lineTo(10, 0);
    ctx.lineTo(0, 10);
    ctx.lineTo(-10, 0);
    ctx.closePath();
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.stroke();
    ctx.restore();
  }

  public drawSupplyBox(box: SupplyBox): void {
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(box.x, box.y);
    ctx.shadowColor = '#ffd700';
    ctx.shadowBlur = 10;
    ctx.fillStyle = '#ffd700';
    ctx.strokeStyle = '#ff8c00';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI / 3) * i - Math.PI / 2;
      const px = Math.cos(angle) * 12;
      const py = Math.sin(angle) * 12;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.stroke();

    ctx.fillStyle = '#ff8c00';
    ctx.font = 'bold 12px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const label = box.type === 'rapid' ? 'R' : box.type === 'shield' ? 'S' : '2x';
    ctx.fillText(label, 0, 1);
    ctx.restore();
  }

  public drawBoss(boss: Boss): void {
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(boss.x, boss.y);
    ctx.shadowColor = '#ff0000';
    ctx.shadowBlur = 20;
    ctx.fillStyle = '#ff0000';
    ctx.strokeStyle = '#800000';
    ctx.lineWidth = 3;
    ctx.beginPath();
    const outerR = BOSS_OUTER_RADIUS;
    const innerR = outerR * 0.45;
    for (let i = 0; i < 16; i++) {
      const angle = (Math.PI / 8) * i - Math.PI / 2;
      const r = i % 2 === 0 ? outerR : innerR;
      const px = Math.cos(angle) * r;
      const py = Math.sin(angle) * r;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.stroke();

    if (boss.weakpointVisible) {
      ctx.shadowColor = '#ffffff';
      ctx.shadowBlur = 15;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(0, 0, BOSS_WEAKPOINT_RADIUS, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    } else {
      ctx.fillStyle = '#ffccaa';
      ctx.beginPath();
      ctx.arc(0, 0, BOSS_WEAKPOINT_RADIUS, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  public drawHomingBullet(b: HomingBullet): void {
    const ctx = this.ctx;
    ctx.save();
    ctx.shadowColor = '#ff4500';
    ctx.shadowBlur = 8;
    ctx.fillStyle = '#ff4500';
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  public drawParticle(p: Particle): void {
    const ctx = this.ctx;
    const alpha = Math.max(0, p.life / p.maxLife);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rotation);
    ctx.fillStyle = p.color;
    if (p.shape === 'triangle') {
      ctx.beginPath();
      ctx.moveTo(0, -p.size);
      ctx.lineTo(p.size * 0.866, p.size * 0.5);
      ctx.lineTo(-p.size * 0.866, p.size * 0.5);
      ctx.closePath();
      ctx.fill();
    } else if (p.shape === 'star') {
      ctx.beginPath();
      for (let i = 0; i < 10; i++) {
        const angle = (Math.PI / 5) * i - Math.PI / 2;
        const r = i % 2 === 0 ? p.size : p.size * 0.45;
        const px = Math.cos(angle) * r;
        const py = Math.sin(angle) * r;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();
    } else {
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 4;
      ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
    }
    ctx.restore();
  }

  public drawHUD(
    score: number,
    level: number,
    hp: number,
    maxHp: number,
    hpFlashTimer: number,
    shieldActive: boolean,
    playerX: number,
    playerY: number,
  ): void {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    ctx.save();
    ctx.shadowColor = '#ffffff';
    ctx.shadowBlur = 6;
    ctx.fillStyle = '#ffffff';
    ctx.font = '20px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`SCORE: ${score}`, 20, 36);

    ctx.shadowColor = '#ffd700';
    ctx.shadowBlur = 6;
    ctx.fillStyle = '#ffd700';
    ctx.textAlign = 'right';
    ctx.fillText(`LV.${level}`, w - 20, 36);
    ctx.shadowBlur = 0;

    const barW = 300, barH = 12;
    const barX = (w - barW) / 2;
    const barY = h - 40;
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    this.roundRect(barX, barY, barW, barH, 6);
    ctx.fill();

    const hpRatio = Math.max(0, hp / maxHp);
    const flash = hpFlashTimer > 0 && Math.floor(hpFlashTimer / 0.05) % 2 === 0;
    const hpGrad = ctx.createLinearGradient(barX, barY, barX, barY + barH);
    if (flash) {
      hpGrad.addColorStop(0, '#ffffff');
      hpGrad.addColorStop(1, '#ffaaaa');
    } else {
      hpGrad.addColorStop(0, '#ff6666');
      hpGrad.addColorStop(1, '#cc0000');
    }
    ctx.fillStyle = hpGrad;
    this.roundRect(barX, barY, barW * hpRatio, barH, 6);
    ctx.fill();

    if (shieldActive) {
      ctx.strokeStyle = 'rgba(0, 200, 255, 0.5)';
      ctx.lineWidth = 3;
      ctx.shadowColor = '#00c8ff';
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.arc(playerX, playerY, 28, 0, Math.PI * 2);
      ctx.stroke();
      ctx.shadowBlur = 0;
    }
    ctx.restore();
  }

  public drawBorderFlash(color: string, alpha: number): void {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = color;
    ctx.lineWidth = 8;
    ctx.shadowColor = color;
    ctx.shadowBlur = 20;
    ctx.strokeRect(4, 4, w - 8, h - 8);
    ctx.restore();
  }

  public drawLevelUp(timer: number): void {
    const ctx = this.ctx;
    const total = 1.2;
    let alpha = 0;
    if (timer > total - 0.3) alpha = (total - timer) / 0.3;
    else if (timer < 0.3) alpha = timer / 0.3;
    else alpha = 1;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.shadowColor = '#ffd700';
    ctx.shadowBlur = 20;
    ctx.fillStyle = '#ffd700';
    ctx.font = '48px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('LEVEL UP', this.canvas.width / 2, this.canvas.height / 2);
    ctx.restore();
  }

  public drawGameOver(score: number): void {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(0, 0, w, h);

    ctx.shadowColor = '#ff0000';
    ctx.shadowBlur = 20;
    ctx.fillStyle = '#ff0000';
    ctx.font = '64px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('GAME OVER', w / 2, h / 2 - 50);

    ctx.shadowBlur = 8;
    ctx.shadowColor = '#ffffff';
    ctx.fillStyle = '#ffffff';
    ctx.font = '28px monospace';
    ctx.fillText(`FINAL SCORE: ${score}`, w / 2, h / 2 + 10);

    ctx.shadowBlur = 4;
    ctx.fillStyle = '#cccccc';
    ctx.font = '20px monospace';
    ctx.fillText('点击重新开始', w / 2, h / 2 + 60);
    ctx.restore();
  }

  private roundRect(x: number, y: number, w: number, h: number, r: number): void {
    const ctx = this.ctx;
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }
}
