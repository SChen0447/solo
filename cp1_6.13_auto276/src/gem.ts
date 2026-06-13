import type { TrackNode } from './track';

interface Gem {
  x: number;
  y: number;
  createdAt: number;
  alive: boolean;
  opacity: number;
}

const MIN_SPAWN_INTERVAL = 2000;
const MAX_SPAWN_INTERVAL = 4000;
const GEM_LIFETIME = 3000;
const GEM_SIDE_LENGTH = 10;
const GEM_NEAR_DISTANCE = 50;
const SCORE_PER_GEM = 100;

export class GemManager {
  gems: Gem[] = [];
  score: number = 0;
  private lastSpawnTime: number = 0;
  private nextSpawnInterval: number = MIN_SPAWN_INTERVAL;
  private collected: boolean = false;

  update(now: number, _dt: number, trackNodes: TrackNode[], shipX: number, shipY: number): boolean {
    if (now - this.lastSpawnTime >= this.nextSpawnInterval && trackNodes.length > 2) {
      this.spawn(trackNodes);
      this.lastSpawnTime = now;
      this.nextSpawnInterval = MIN_SPAWN_INTERVAL + Math.random() * (MAX_SPAWN_INTERVAL - MIN_SPAWN_INTERVAL);
    }

    for (const gem of this.gems) {
      if (!gem.alive) continue;
      const age = now - gem.createdAt;
      if (age > GEM_LIFETIME) {
        gem.alive = false;
      } else {
        gem.opacity = age < 300 ? age / 300 : age > GEM_LIFETIME - 300 ? (GEM_LIFETIME - age) / 300 : 1;
      }
    }

    this.collected = false;
    for (const gem of this.gems) {
      if (!gem.alive) continue;
      const dx = shipX - gem.x;
      const dy = shipY - gem.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < GEM_SIDE_LENGTH + 10) {
        gem.alive = false;
        this.score += SCORE_PER_GEM;
        this.collected = true;
      }
    }

    this.gems = this.gems.filter(g => g.alive);

    return this.collected;
  }

  private spawn(trackNodes: TrackNode[]): void {
    const idx = Math.floor(Math.random() * trackNodes.length);
    const node = trackNodes[idx];
    const offsetX = (Math.random() - 0.5) * GEM_NEAR_DISTANCE * 2;
    const offsetY = (Math.random() - 0.5) * GEM_NEAR_DISTANCE * 2;

    this.gems.push({
      x: node.x + offsetX,
      y: node.y + offsetY,
      createdAt: performance.now(),
      alive: true,
      opacity: 0,
    });
  }

  render(ctx: CanvasRenderingContext2D): void {
    ctx.save();

    for (const gem of this.gems) {
      if (gem.opacity <= 0) continue;

      ctx.globalAlpha = gem.opacity;
      ctx.shadowColor = '#feca57';
      ctx.shadowBlur = 6;

      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const angle = (Math.PI / 3) * i - Math.PI / 6;
        const px = gem.x + Math.cos(angle) * GEM_SIDE_LENGTH;
        const py = gem.y + Math.sin(angle) * GEM_SIDE_LENGTH;
        if (i === 0) {
          ctx.moveTo(px, py);
        } else {
          ctx.lineTo(px, py);
        }
      }
      ctx.closePath();
      ctx.fillStyle = '#feca57';
      ctx.fill();

      ctx.strokeStyle = 'rgba(254,202,87,0.8)';
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    ctx.restore();
  }

  renderScore(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.globalAlpha = 1;
    ctx.font = '24px "Courier New", monospace';
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = '#48dbfb';
    ctx.shadowBlur = 2;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(`得分: ${this.score}`, 20, 20);
    ctx.restore();
  }

  reset(): void {
    this.gems = [];
    this.score = 0;
    this.lastSpawnTime = 0;
  }
}
