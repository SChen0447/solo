import { Player } from './player';

export class Obstacle {
  public x: number;
  public y: number;
  public radius: number;
  public initialRadius: number;
  public growthRate: number;
  public vx: number;
  public vy: number;
  public readonly speed: number = 50;
  public rotation: number = 0;
  public hitPlayer: boolean = false;
  public timeAfterHit: number = 0;
  public readonly disappearAfterHit: number = 1;

  private constructor(x: number, y: number, vx: number, vy: number) {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.radius = 15 + Math.random() * 10;
    this.initialRadius = this.radius;
    this.growthRate = 2 + Math.random() * 3;
  }

  public static spawn(canvasWidth: number, canvasHeight: number): Obstacle {
    const edge = Math.floor(Math.random() * 4);
    let x: number, y: number, vx: number, vy: number;
    const targetX = canvasWidth / 2 + (Math.random() - 0.5) * canvasWidth * 0.5;
    const targetY = canvasHeight / 2 + (Math.random() - 0.5) * canvasHeight * 0.5;

    switch (edge) {
      case 0:
        x = Math.random() * canvasWidth;
        y = -30;
        break;
      case 1:
        x = canvasWidth + 30;
        y = Math.random() * canvasHeight;
        break;
      case 2:
        x = Math.random() * canvasWidth;
        y = canvasHeight + 30;
        break;
      default:
        x = -30;
        y = Math.random() * canvasHeight;
        break;
    }

    const dx = targetX - x;
    const dy = targetY - y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    vx = (dx / dist) * 50;
    vy = (dy / dist) * 50;

    return new Obstacle(x, y, vx, vy);
  }

  public update(deltaTime: number): void {
    this.x += this.vx * deltaTime;
    this.y += this.vy * deltaTime;
    this.radius = this.initialRadius + this.growthRate * Math.sin(Date.now() / 500);
    this.radius = Math.max(this.initialRadius - 3, Math.min(this.initialRadius + 3, this.radius));
    this.rotation += deltaTime * 3;

    if (this.hitPlayer) {
      this.timeAfterHit += deltaTime;
    }
  }

  public hitTest(player: Player): boolean {
    if (this.hitPlayer) return false;
    const dx = this.x - player.x;
    const dy = this.y - player.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    return dist < this.radius + player.radius;
  }

  public shouldRemove(canvasWidth: number, canvasHeight: number): boolean {
    if (this.hitPlayer && this.timeAfterHit >= this.disappearAfterHit) {
      return true;
    }
    const margin = 100;
    return (
      this.x < -margin ||
      this.x > canvasWidth + margin ||
      this.y < -margin ||
      this.y > canvasHeight + margin
    );
  }
}
