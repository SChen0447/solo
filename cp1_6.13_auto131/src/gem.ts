import { gsap } from 'gsap';
import { Position, Cell, CELL_SIZE, COLORS } from './maze';

export interface Gem {
  position: Position;
  collected: boolean;
  collectAnimation: number;
  glowIntensity: number;
}

export class GemManager {
  private gems: Gem[] = [];
  private mazeSize: number;
  private collectedCount: number = 0;
  private victoryParticles: { x: number; y: number; vx: number; vy: number; life: number; size: number }[] = [];

  constructor(mazeSize: number) {
    this.mazeSize = mazeSize;
  }

  public spawnGem(_cells: Cell[][]): void {
    const quarterSize = Math.floor(this.mazeSize * 0.6);
    let attempts = 0;
    let x: number, y: number;

    do {
      x = quarterSize + Math.floor(Math.random() * (this.mazeSize - quarterSize));
      y = quarterSize + Math.floor(Math.random() * (this.mazeSize - quarterSize));
      attempts++;
    } while (attempts < 100 && this.isPositionOccupied(x, y));

    this.gems.push({
      position: { x, y },
      collected: false,
      collectAnimation: 0,
      glowIntensity: 0.5 + Math.random() * 0.5,
    });

    if (this.gems.length > 0 && !this.gems[this.gems.length - 1].collected) {
      gsap.to(this.gems[this.gems.length - 1], {
        glowIntensity: 1,
        duration: 1.5,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut',
      });
    }
  }

  private isPositionOccupied(x: number, y: number): boolean {
    return this.gems.some(g => g.position.x === x && g.position.y === y && !g.collected);
  }

  public checkCollision(playerPos: Position): Gem | null {
    for (const gem of this.gems) {
      if (!gem.collected &&
          gem.position.x === Math.round(playerPos.x) &&
          gem.position.y === Math.round(playerPos.y)) {
        return gem;
      }
    }
    return null;
  }

  public collectGem(gem: Gem): void {
    gem.collected = true;
    this.collectedCount++;

    gsap.to(gem, {
      collectAnimation: 1,
      duration: 0.8,
      ease: 'back.out(1.7)',
    });
  }

  public getCollectedCount(): number {
    return this.collectedCount;
  }

  public reset(mazeSize: number): void {
    this.mazeSize = mazeSize;
    this.gems = [];
    gsap.killTweensOf(this.gems);
  }

  public getActiveGem(): Gem | null {
    return this.gems.find(g => !g.collected) || null;
  }

  public spawnVictoryParticles(centerX: number, centerY: number, count: number = 50): void {
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.5;
      const speed = 2 + Math.random() * 4;
      this.victoryParticles.push({
        x: centerX,
        y: centerY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1,
        size: 2 + Math.random() * 4,
      });
    }
  }

  public updateParticles(): void {
    this.victoryParticles = this.victoryParticles.filter(p => {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.1;
      p.life -= 0.015;
      return p.life > 0;
    });
  }

  public render(ctx: CanvasRenderingContext2D, offsetX: number, offsetY: number, scale: number): void {
    const scaledCell = CELL_SIZE * scale;

    for (const gem of this.gems) {
      if (gem.collected && gem.collectAnimation >= 1) continue;

      const px = offsetX + (gem.position.x + 0.5) * scaledCell;
      const py = offsetY + (gem.position.y + 0.5) * scaledCell;

      ctx.save();

      if (gem.collected) {
        ctx.globalAlpha = 1 - gem.collectAnimation;
        const beamHeight = scaledCell * 3 * gem.collectAnimation;

        const beamGradient = ctx.createLinearGradient(px, py, px, py - beamHeight);
        beamGradient.addColorStop(0, 'rgba(255, 215, 0, 0.9)');
        beamGradient.addColorStop(0.5, 'rgba(255, 215, 0, 0.4)');
        beamGradient.addColorStop(1, 'rgba(255, 215, 0, 0)');

        ctx.fillStyle = beamGradient;
        ctx.beginPath();
        ctx.moveTo(px - scaledCell * 0.3, py);
        ctx.lineTo(px - scaledCell * 0.15, py - beamHeight);
        ctx.lineTo(px + scaledCell * 0.15, py - beamHeight);
        ctx.lineTo(px + scaledCell * 0.3, py);
        ctx.closePath();
        ctx.fill();
      }

      const gemSize = scaledCell * (0.3 + gem.collectAnimation * 0.5);
      const glowSize = gemSize * (2 + gem.glowIntensity);

      const glowGradient = ctx.createRadialGradient(px, py, 0, px, py, glowSize);
      glowGradient.addColorStop(0, `rgba(255, 215, 0, ${0.4 * gem.glowIntensity})`);
      glowGradient.addColorStop(0.5, `rgba(255, 215, 0, ${0.1 * gem.glowIntensity})`);
      glowGradient.addColorStop(1, 'rgba(255, 215, 0, 0)');

      ctx.fillStyle = glowGradient;
      ctx.beginPath();
      ctx.arc(px, py, glowSize, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = COLORS.gem;
      ctx.beginPath();
      const rotation = gem.collected ? gem.collectAnimation * Math.PI * 2 : performance.now() / 1000;
      for (let i = 0; i < 8; i++) {
        const angle = (Math.PI * 2 * i) / 8 + rotation;
        const r = i % 2 === 0 ? gemSize : gemSize * 0.5;
        const gx = px + Math.cos(angle) * r;
        const gy = py + Math.sin(angle) * r;
        if (i === 0) ctx.moveTo(gx, gy);
        else ctx.lineTo(gx, gy);
      }
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
      ctx.beginPath();
      ctx.arc(px - gemSize * 0.2, py - gemSize * 0.2, gemSize * 0.2, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    }

    this.renderParticles(ctx);
  }

  private renderParticles(ctx: CanvasRenderingContext2D): void {
    for (const particle of this.victoryParticles) {
      ctx.save();
      ctx.globalAlpha = particle.life;
      ctx.fillStyle = `rgba(255, 215, ${150 + Math.floor(particle.life * 105)}, ${particle.life})`;
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, particle.size * particle.life, 0, Math.PI * 2);
      ctx.fill();

      ctx.shadowColor = '#ffd700';
      ctx.shadowBlur = 10;
      ctx.fill();
      ctx.restore();
    }
  }
}
