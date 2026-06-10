import type { PlayerState } from './player';
import type { EnvironmentManager } from './environment';

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

export class Renderer {
  private ctx: CanvasRenderingContext2D;
  private canvas: HTMLCanvasElement;
  private particles: Particle[] = [];
  private rewindGlowRadius: number = 0;
  private rewindGlowActive: boolean = false;
  private rewindGlowFrames: number = 0;
  private readonly rewindGlowMaxFrames = 120;
  private victoryParticlesActive: boolean = false;
  private victoryFrames: number = 0;
  private readonly victoryMaxFrames = 120;
  private victoryX: number = 0;
  private victoryY: number = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Failed to get 2D context');
    this.ctx = ctx;
    this.ctx.imageSmoothingEnabled = false;
  }

  resize(width: number, height: number): void {
    this.canvas.width = width;
    this.canvas.height = height;
    this.ctx.imageSmoothingEnabled = false;
  }

  triggerRewindGlow(): void {
    this.rewindGlowActive = true;
    this.rewindGlowFrames = 0;
  }

  triggerVictory(x: number, y: number): void {
    this.victoryParticlesActive = true;
    this.victoryFrames = 0;
    this.victoryX = x;
    this.victoryY = y;
    this.spawnVictoryParticles();
  }

  resetVictory(): void {
    this.victoryParticlesActive = false;
    this.victoryFrames = 0;
    this.particles = this.particles.filter((p) => p.color !== '#ffd700');
  }

  private spawnVictoryParticles(): void {
    for (let i = 0; i < 40; i++) {
      this.particles.push({
        x: this.victoryX,
        y: this.victoryY,
        vx: (Math.random() - 0.5) * 3,
        vy: -Math.random() * 4 - 1,
        life: 1,
        maxLife: 1,
        color: '#ffd700',
        size: Math.random() * 3 + 2
      });
    }
  }

  private updateParticles(): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.05;
      p.life -= 0.015;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }

    if (this.victoryParticlesActive) {
      this.victoryFrames++;
      if (this.victoryFrames % 4 === 0 && this.victoryFrames < this.victoryMaxFrames) {
        for (let i = 0; i < 5; i++) {
          this.particles.push({
            x: this.victoryX + (Math.random() - 0.5) * 20,
            y: this.victoryY,
            vx: (Math.random() - 0.5) * 2,
            vy: -Math.random() * 3 - 1,
            life: 1,
            maxLife: 1,
            color: '#ffd700',
            size: Math.random() * 3 + 2
          });
        }
      }
      if (this.victoryFrames >= this.victoryMaxFrames) {
        this.victoryParticlesActive = false;
      }
    }
  }

  private updateRewindGlow(): void {
    if (this.rewindGlowActive) {
      this.rewindGlowFrames++;
      const maxR = Math.max(this.canvas.width, this.canvas.height);
      const t = this.rewindGlowFrames / this.rewindGlowMaxFrames;
      this.rewindGlowRadius = maxR * (1 - t);
      if (this.rewindGlowFrames >= this.rewindGlowMaxFrames) {
        this.rewindGlowActive = false;
        this.rewindGlowRadius = 0;
      }
    }
  }

  private drawBackground(): void {
    const gradient = this.ctx.createLinearGradient(0, 0, 0, this.canvas.height);
    gradient.addColorStop(0, '#0f0c29');
    gradient.addColorStop(1, '#302b63');
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
  }

  private drawGround(groundY: number): void {
    this.ctx.fillStyle = '#7f8c8d';
    this.ctx.fillRect(0, groundY, this.canvas.width, this.canvas.height - groundY);
    this.ctx.strokeStyle = '#ffffff';
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();
    this.ctx.moveTo(0, groundY);
    this.ctx.lineTo(this.canvas.width, groundY);
    this.ctx.stroke();
  }

  private drawStaticPlatforms(env: EnvironmentManager): void {
    this.ctx.fillStyle = '#7f8c8d';
    this.ctx.strokeStyle = '#ffffff';
    this.ctx.lineWidth = 1;
    for (const p of env.staticPlatforms) {
      this.ctx.fillRect(p.x, p.y, p.width, p.height);
      this.ctx.strokeRect(p.x, p.y, p.width, p.height);
    }
  }

  private drawMovingPlatforms(env: EnvironmentManager): void {
    this.ctx.fillStyle = '#e67e22';
    this.ctx.strokeStyle = '#ffffff';
    this.ctx.lineWidth = 1;
    for (const p of env.movingPlatforms) {
      this.ctx.fillRect(p.x, p.y, p.width, p.height);
      this.ctx.strokeRect(p.x, p.y, p.width, p.height);
    }
  }

  private drawTimeBarrier(env: EnvironmentManager): void {
    const b = env.timeBarrier;
    if (b.absorbing) {
      this.ctx.fillStyle = 'rgba(46, 204, 113, 0.5)';
    } else {
      this.ctx.fillStyle = 'rgba(155, 89, 182, 0.45)';
    }
    this.ctx.fillRect(b.x, b.y, b.width, b.height);
    this.ctx.strokeStyle = b.absorbing ? '#2ecc71' : '#9b59b6';
    this.ctx.lineWidth = 2;
    this.ctx.strokeRect(b.x, b.y, b.width, b.height);
  }

  private drawGoal(env: EnvironmentManager): void {
    const g = env.goal;
    this.ctx.fillStyle = 'rgba(255, 215, 0, 0.3)';
    this.ctx.fillRect(g.x - 10, g.y, g.width + 20, g.height);
    this.ctx.fillStyle = '#ffd700';
    this.ctx.fillRect(g.x, g.y, g.width, g.height);
    this.ctx.strokeStyle = '#ffffff';
    this.ctx.lineWidth = 1;
    this.ctx.strokeRect(g.x, g.y, g.width, g.height);
  }

  private drawPlayerTrail(player: PlayerState): void {
    for (let i = player.trail.length - 1; i >= 0; i--) {
      const t = player.trail[i];
      this.ctx.fillStyle = `rgba(52, 152, 219, ${t.alpha})`;
      this.ctx.fillRect(t.x, t.y, player.width, player.height);
    }
  }

  private drawPlayer(player: PlayerState): void {
    this.ctx.fillStyle = '#3498db';
    this.ctx.fillRect(player.x, player.y, player.width, player.height);
    this.ctx.strokeStyle = '#ffffff';
    this.ctx.lineWidth = 1;
    this.ctx.strokeRect(player.x, player.y, player.width, player.height);
  }

  private drawParticles(): void {
    for (const p of this.particles) {
      this.ctx.fillStyle = p.color;
      this.ctx.globalAlpha = p.life;
      this.ctx.fillRect(p.x, p.y, p.size, p.size);
    }
    this.ctx.globalAlpha = 1;
  }

  private drawRewindGlow(): void {
    if (!this.rewindGlowActive || this.rewindGlowRadius <= 0) return;
    const cx = this.canvas.width / 2;
    const cy = this.canvas.height / 2;
    const gradient = this.ctx.createRadialGradient(cx, cy, 0, cx, cy, this.rewindGlowRadius);
    const alpha = 1 - this.rewindGlowFrames / this.rewindGlowMaxFrames;
    gradient.addColorStop(0, `rgba(52, 152, 219, 0)`);
    gradient.addColorStop(0.7, `rgba(52, 152, 219, 0)`);
    gradient.addColorStop(0.85, `rgba(52, 152, 219, ${alpha * 0.5})`);
    gradient.addColorStop(1, `rgba(52, 152, 219, ${alpha * 0.8})`);
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
  }

  private drawUI(player: PlayerState, won: boolean, dead: boolean): void {
    const barWidth = 200;
    const barHeight = 12;
    const barX = this.canvas.width / 2 - barWidth / 2;
    const barY = 20;

    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    this.ctx.fillRect(barX - 4, barY - 4, barWidth + 8, barHeight + 8);

    let fillRatio = 1;
    let statusText = '就绪 - 按 R 回溯';
    let textColor = '#ffffff';

    if (won) {
      statusText = '胜利！';
      textColor = '#ffd700';
      fillRatio = 1;
    } else if (dead) {
      statusText = '失败！重置中...';
      textColor = '#e74c3c';
      fillRatio = 0;
    } else if (player.isRewinding) {
      const remaining = Math.max(0, 2 - player.rewindProgress * 2);
      statusText = `回溯中... (${remaining.toFixed(1)}s)`;
      textColor = '#3498db';
      fillRatio = 1 - player.rewindProgress;
    } else if (!player.canRewind) {
      const remaining = Math.ceil(player.cooldownRemaining / 60);
      statusText = `冷却中... (${remaining}s)`;
      textColor = '#e67e22';
      fillRatio = 1 - player.cooldownRemaining / 300;
    }

    this.ctx.fillStyle = '#2c3e50';
    this.ctx.fillRect(barX, barY, barWidth, barHeight);
    this.ctx.fillStyle = '#ffd700';
    this.ctx.fillRect(barX, barY, barWidth * fillRatio, barHeight);
    this.ctx.strokeStyle = '#ffffff';
    this.ctx.lineWidth = 1;
    this.ctx.strokeRect(barX, barY, barWidth, barHeight);

    const uiBgX = this.canvas.width / 2 - 160;
    const uiBgY = barY + barHeight + 12;
    const uiBgW = 320;
    const uiBgH = 34;
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    this.ctx.fillRect(uiBgX, uiBgY, uiBgW, uiBgH);

    this.ctx.fillStyle = textColor;
    this.ctx.font = '18px monospace';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText(statusText, this.canvas.width / 2, uiBgY + uiBgH / 2);

    this.ctx.textAlign = 'left';
    this.ctx.textBaseline = 'alphabetic';
  }

  render(
    player: PlayerState,
    env: EnvironmentManager,
    won: boolean,
    dead: boolean
  ): void {
    this.updateParticles();
    this.updateRewindGlow();

    this.drawBackground();
    this.drawGround(env.groundY);
    this.drawStaticPlatforms(env);
    this.drawMovingPlatforms(env);
    this.drawTimeBarrier(env);
    this.drawGoal(env);
    this.drawPlayerTrail(player);
    this.drawPlayer(player);
    this.drawParticles();
    this.drawRewindGlow();
    this.drawUI(player, won, dead);
  }
}
