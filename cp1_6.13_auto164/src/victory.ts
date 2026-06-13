import type { Piece, PieceColor, BoardConfig } from './board.js';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  life: number;
  maxLife: number;
  gravity: number;
}

interface BoardGlow {
  radius: number;
  maxRadius: number;
  alpha: number;
  startTime: number;
  duration: number;
  color: string;
}

export class VictoryManager {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private particles: Particle[] = [];
  private boardGlows: BoardGlow[] = [];
  private isVictory: boolean = false;
  private winner: PieceColor | null = null;
  private victoryTime: number = 0;
  private liftProgress: number = 0;
  private tintProgress: number = 0;
  private particleEmitTimer: number = 0;
  private totalParticlesEmitted: number = 0;
  private targetParticleCount: number = 80;
  private pieces: Piece[] = [];
  private boardConfig: BoardConfig | null = null;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('无法获取Canvas上下文');
    this.ctx = ctx;
  }

  public checkVictory(
    gridCells: (PieceColor | null)[][],
    gridSize: number,
    lastMoveX: number,
    lastMoveY: number
  ): PieceColor | null {
    const color = gridCells[lastMoveX][lastMoveY];
    if (!color) return null;

    const directions = [
      [1, 0],
      [0, 1],
      [1, 1],
      [1, -1]
    ];

    for (const [dx, dy] of directions) {
      let count = 1;

      for (let i = 1; i < 5; i++) {
        const nx = lastMoveX + dx * i;
        const ny = lastMoveY + dy * i;
        if (nx < 0 || nx >= gridSize || ny < 0 || ny >= gridSize) break;
        if (gridCells[nx][ny] !== color) break;
        count++;
      }

      for (let i = 1; i < 5; i++) {
        const nx = lastMoveX - dx * i;
        const ny = lastMoveY - dy * i;
        if (nx < 0 || nx >= gridSize || ny < 0 || ny >= gridSize) break;
        if (gridCells[nx][ny] !== color) break;
        count++;
      }

      if (count >= 5) {
        return color;
      }
    }

    return null;
  }

  public triggerVictory(winner: PieceColor, pieces: Piece[], boardConfig: BoardConfig): void {
    this.isVictory = true;
    this.winner = winner;
    this.pieces = pieces.filter(p => p.color === winner);
    this.boardConfig = boardConfig;
    this.victoryTime = performance.now();
    this.liftProgress = 0;
    this.tintProgress = 0;
    this.totalParticlesEmitted = 0;
    this.particles = [];
    this.boardGlows = [];

    const glowColor = winner === 'black' ? '#443322' : '#aaccff';
    const { boardX, boardY, boardWidth, boardHeight } = boardConfig;
    const centerX = boardX + boardWidth / 2;
    const centerY = boardY + boardHeight / 2;

    this.boardGlows.push({
      radius: 50,
      maxRadius: 250,
      alpha: 0.8,
      startTime: performance.now(),
      duration: 3000,
      color: glowColor
    });
  }

  public update(deltaTime: number): void {
    if (!this.isVictory || !this.winner) return;

    const elapsed = performance.now() - this.victoryTime;

    const liftDuration = 1000;
    if (elapsed < liftDuration) {
      const progress = elapsed / liftDuration;
      this.liftProgress = this.easeOutCubic(progress);
    } else {
      this.liftProgress = 1;
    }

    const tintDelay = 1500;
    const tintDuration = 1500;
    if (elapsed > tintDelay) {
      const tintElapsed = elapsed - tintDelay;
      if (tintElapsed < tintDuration) {
        this.tintProgress = tintElapsed / tintDuration;
      } else {
        this.tintProgress = 1;
      }
    }

    this.particleEmitTimer += deltaTime;
    if (this.totalParticlesEmitted < this.targetParticleCount && this.particleEmitTimer > 30) {
      this.particleEmitTimer = 0;
      this.emitParticles(2);
    }

    this.particles = this.particles.filter(p => {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += p.gravity;
      p.life -= deltaTime / 1000;
      return p.life > 0;
    });

    this.boardGlows = this.boardGlows.filter(glow => {
      const glowElapsed = performance.now() - glow.startTime;
      if (glowElapsed >= glow.duration) return false;
      
      const progress = glowElapsed / glow.duration;
      glow.radius = 50 + (glow.maxRadius - 50) * progress;
      glow.alpha = 0.8 * (1 - progress);
      return true;
    });

    if (this.pieces.length > 0) {
      const liftHeight = 50 * this.liftProgress;
      for (const piece of this.pieces) {
        piece.liftY = liftHeight;
        piece.glowIntensity = this.liftProgress * 0.8;
      }
    }
  }

  private emitParticles(count: number): void {
    if (!this.winner || this.pieces.length === 0) return;

    for (let i = 0; i < count && this.totalParticlesEmitted < this.targetParticleCount; i++) {
      const piece = this.pieces[Math.floor(Math.random() * this.pieces.length)];
      const angle = Math.random() * Math.PI * 2;
      const speed = 0.5 + Math.random() * 1;
      const life = 2 + Math.random() * 1;

      const colorVar = Math.random();
      const color = colorVar > 0.5 ? '#ffaa00' : '#ffdd66';

      this.particles.push({
        x: piece.x + (Math.random() - 0.5) * 20,
        y: piece.y - piece.liftY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 0.5,
        size: 1 + Math.random(),
        color,
        life,
        maxLife: life,
        gravity: 0.02
      });

      this.totalParticlesEmitted++;
    }
  }

  public renderBackground(): void {
    if (!this.isVictory || !this.boardConfig) return;

    const ctx = this.ctx;
    const { boardX, boardY, boardWidth, boardHeight } = this.boardConfig;
    const centerX = boardX + boardWidth / 2;
    const centerY = boardY + boardHeight / 2;

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';

    for (const glow of this.boardGlows) {
      const gradient = ctx.createRadialGradient(
        centerX, centerY, 0,
        centerX, centerY, glow.radius
      );
      
      const alpha = glow.alpha;
      gradient.addColorStop(0, this.hexToRgba(glow.color, alpha * 0.3));
      gradient.addColorStop(0.5, this.hexToRgba(glow.color, alpha * 0.2));
      gradient.addColorStop(1, this.hexToRgba(glow.color, 0));

      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(centerX, centerY, glow.radius, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  public renderParticles(): void {
    if (!this.isVictory) return;

    const ctx = this.ctx;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';

    for (const particle of this.particles) {
      const alpha = particle.life / particle.maxLife;
      ctx.fillStyle = this.hexToRgba(particle.color, alpha);
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, particle.size * alpha, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  public getWinner(): PieceColor | null {
    return this.winner;
  }

  public getVictoryTint(): { color: string; alpha: number } | null {
    if (!this.isVictory || !this.winner || this.tintProgress <= 0) {
      return null;
    }

    const baseColor = this.winner === 'black' ? '#443322' : '#aaccff';
    return {
      color: baseColor,
      alpha: this.tintProgress * 0.5
    };
  }

  public isVictoryActive(): boolean {
    return this.isVictory;
  }

  public reset(): void {
    this.isVictory = false;
    this.winner = null;
    this.particles = [];
    this.boardGlows = [];
    this.liftProgress = 0;
    this.tintProgress = 0;
    this.totalParticlesEmitted = 0;
    this.pieces = [];
  }

  private easeOutCubic(t: number): number {
    return 1 - Math.pow(1 - t, 3);
  }

  private hexToRgba(hex: string, alpha: number): string {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  public getWinningPieces(): Piece[] {
    return this.pieces;
  }
}
