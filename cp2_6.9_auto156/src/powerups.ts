import { Player } from './player';

export type PowerupType = 'health' | 'weapon' | 'shield' | 'speed';

export interface Powerup {
  type: PowerupType;
  x: number;
  y: number;
  size: number;
  speed: number;
  color: string;
  pickupFlash: number;
}

export class PowerupManager {
  powerups: Powerup[];
  private canvasHeight: number;
  private canvasWidth: number;

  constructor(canvasWidth: number, canvasHeight: number) {
    this.canvasWidth = canvasWidth;
    this.canvasHeight = canvasHeight;
    this.powerups = [];
  }

  spawn(x: number, y: number): void {
    if (Math.random() < 0.2) {
      const types: PowerupType[] = ['health', 'weapon', 'shield', 'speed'];
      const type = types[Math.floor(Math.random() * types.length)];
      const colorMap: Record<PowerupType, string> = {
        health: '#FF4444',
        weapon: '#00BFFF',
        shield: '#00FF00',
        speed: '#FFD700'
      };
      this.powerups.push({
        type,
        x,
        y,
        size: 18,
        speed: 0.5,
        color: colorMap[type],
        pickupFlash: 0
      });
    }
  }

  update(deltaTime: number, player: Player): void {
    const dt = deltaTime / 16.67;

    const playerBounds = player.getBounds();
    this.powerups = this.powerups.filter(p => {
      p.y += p.speed * dt;
      if (p.pickupFlash > 0) {
        p.pickupFlash -= deltaTime;
        return p.pickupFlash > 0;
      }
      if (p.y > this.canvasHeight + 30) return false;

      const px = p.x;
      const py = p.y;
      const halfS = p.size / 2;
      if (
        px + halfS > playerBounds.x &&
        px - halfS < playerBounds.x + playerBounds.width &&
        py + halfS > playerBounds.y &&
        py - halfS < playerBounds.y + playerBounds.height
      ) {
        this.applyPowerup(p.type, player);
        p.pickupFlash = 200;
        return true;
      }
      return true;
    });
  }

  private applyPowerup(type: PowerupType, player: Player): void {
    switch (type) {
      case 'health':
        player.addLife();
        break;
      case 'weapon':
        player.activateWeaponUpgrade();
        break;
      case 'shield':
        player.activateShield();
        break;
      case 'speed':
        player.activateSpeedBoost();
        break;
    }
  }

  render(ctx: CanvasRenderingContext2D, time: number): void {
    for (const p of this.powerups) {
      if (p.pickupFlash > 0) {
        const alpha = p.pickupFlash / 200;
        ctx.globalAlpha = alpha;
        const scale = 1 + (1 - alpha) * 2;
        this.drawPowerup(ctx, p, time, scale);
        ctx.globalAlpha = 1;
      } else {
        this.drawPowerup(ctx, p, time, 1);
      }
    }
  }

  private drawPowerup(ctx: CanvasRenderingContext2D, p: Powerup, time: number, scale: number): void {
    const size = p.size * scale;
    const half = size / 2;
    const float = Math.sin(time * 0.005 + p.x) * 2;

    ctx.save();
    ctx.translate(p.x, p.y + float);

    ctx.fillStyle = p.color;
    ctx.globalAlpha = 0.3;
    ctx.beginPath();
    ctx.arc(0, 0, half + 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;

    ctx.fillStyle = p.color;
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 2;

    switch (p.type) {
      case 'health':
        this.drawHeart(ctx, 0, 0, half);
        break;
      case 'weapon':
        this.drawLightning(ctx, 0, 0, half);
        break;
      case 'shield':
        this.drawShield(ctx, 0, 0, half);
        break;
      case 'speed':
        this.drawArrow(ctx, 0, 0, half);
        break;
    }

    ctx.restore();
  }

  private drawHeart(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number): void {
    ctx.beginPath();
    ctx.moveTo(cx, cy + r * 0.6);
    ctx.bezierCurveTo(cx + r * 1.2, cy - r * 0.3, cx + r * 0.5, cy - r, cx, cy - r * 0.3);
    ctx.bezierCurveTo(cx - r * 0.5, cy - r, cx - r * 1.2, cy - r * 0.3, cx, cy + r * 0.6);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#FFFFFF';
    ctx.font = `bold ${r}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('+', cx, cy - r * 0.1);
  }

  private drawLightning(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number): void {
    ctx.beginPath();
    ctx.moveTo(cx + r * 0.3, cy - r);
    ctx.lineTo(cx - r * 0.4, cy - r * 0.1);
    ctx.lineTo(cx + r * 0.1, cy - r * 0.1);
    ctx.lineTo(cx - r * 0.3, cy + r);
    ctx.lineTo(cx + r * 0.4, cy + r * 0.1);
    ctx.lineTo(cx - r * 0.1, cy + r * 0.1);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }

  private drawShield(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number): void {
    ctx.beginPath();
    ctx.moveTo(cx, cy - r);
    ctx.lineTo(cx + r * 0.85, cy - r * 0.6);
    ctx.lineTo(cx + r * 0.85, cy + r * 0.1);
    ctx.quadraticCurveTo(cx + r * 0.7, cy + r, cx, cy + r);
    ctx.quadraticCurveTo(cx - r * 0.7, cy + r, cx - r * 0.85, cy + r * 0.1);
    ctx.lineTo(cx - r * 0.85, cy - r * 0.6);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx - r * 0.3, cy);
    ctx.lineTo(cx - r * 0.05, cy + r * 0.35);
    ctx.lineTo(cx + r * 0.35, cy - r * 0.25);
    ctx.stroke();
  }

  private drawArrow(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number): void {
    ctx.beginPath();
    ctx.moveTo(cx, cy - r);
    ctx.lineTo(cx + r * 0.7, cy - r * 0.1);
    ctx.lineTo(cx + r * 0.25, cy - r * 0.1);
    ctx.lineTo(cx + r * 0.25, cy + r);
    ctx.lineTo(cx - r * 0.25, cy + r);
    ctx.lineTo(cx - r * 0.25, cy - r * 0.1);
    ctx.lineTo(cx - r * 0.7, cy - r * 0.1);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }

  reset(): void {
    this.powerups = [];
  }
}
