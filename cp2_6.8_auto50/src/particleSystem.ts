export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  alpha: number;
  life: number;
  maxLife: number;
  angle: number;
  angularSpeed: number;
  heightOffset: number;
  radiusOffset: number;
}

export class ParticleSystem {
  private particles: Particle[] = [];
  private maxParticles = 500;
  private canvasWidth: number;
  private canvasHeight: number;

  private tornadoCenter = { x: 0, y: 0 };
  private tornadoActive = false;
  private tornadoSpeed = 0;
  private tornadoRadius = 60;
  private tornadoHeight = 200;
  private fadeOutTimer = 0;
  private fadeOutDuration = 2;

  private particlePool: Particle[] = [];

  constructor(width: number, height: number) {
    this.canvasWidth = width;
    this.canvasHeight = height;
    this.initPool();
  }

  private initPool(): void {
    for (let i = 0; i < this.maxParticles; i++) {
      this.particlePool.push({
        x: 0,
        y: 0,
        vx: 0,
        vy: 0,
        radius: 2,
        color: '#ffffff',
        alpha: 0,
        life: 0,
        maxLife: 0,
        angle: 0,
        angularSpeed: 0,
        heightOffset: 0,
        radiusOffset: 0
      });
    }
  }

  private getParticleFromPool(): Particle | null {
    for (const p of this.particlePool) {
      if (p.life <= 0) {
        return p;
      }
    }
    return null;
  }

  public resize(width: number, height: number): void {
    this.canvasWidth = width;
    this.canvasHeight = height;
  }

  public activateTornado(x: number, y: number): void {
    this.tornadoActive = true;
    this.tornadoCenter = { x, y };
    this.fadeOutTimer = 0;
  }

  public deactivateTornado(): void {
    this.tornadoActive = false;
    this.fadeOutTimer = this.fadeOutDuration;
  }

  public updateTornadoPosition(x: number, y: number, speed: number): void {
    this.tornadoCenter = { x, y };
    this.tornadoSpeed = Math.min(speed, 15);
    this.tornadoRadius = 40 + speed * 4;
  }

  public getTornadoCenter(): { x: number; y: number } {
    return { ...this.tornadoCenter };
  }

  public getTornadoRadius(): number {
    return this.tornadoRadius;
  }

  public isTornadoActive(): boolean {
    return this.tornadoActive || this.fadeOutTimer > 0;
  }

  public update(deltaTime: number): void {
    if (this.tornadoActive) {
      this.spawnTornadoParticles(deltaTime);
    }

    if (this.fadeOutTimer > 0) {
      this.fadeOutTimer -= deltaTime;
    }

    const activeCount = this.particles.filter((p) => p.life > 0).length;

    for (const p of this.particles) {
      if (p.life <= 0) continue;

      p.life -= deltaTime;

      const lifeRatio = p.life / p.maxLife;
      const heightProgress = 1 - lifeRatio;

      p.angle += p.angularSpeed * deltaTime;
      p.heightOffset += 30 * deltaTime;

      const currentRadius =
        p.radiusOffset * (0.3 + heightProgress * 0.7) +
        Math.sin(p.angle * 2 + p.heightOffset * 0.05) * 5;

      p.x = this.tornadoCenter.x + Math.cos(p.angle) * currentRadius;
      p.y =
        this.tornadoCenter.y - p.heightOffset + Math.sin(p.angle * 3) * 3;

      p.alpha = this.calculateAlpha(p, heightProgress);

      if (p.life <= 0) {
        p.alpha = 0;
      }
    }
  }

  private calculateAlpha(p: Particle, heightProgress: number): number {
    let alpha = 1;

    const fadeInDuration = 0.2;
    const lifeProgress = 1 - p.life / p.maxLife;
    if (lifeProgress < fadeInDuration / p.maxLife) {
      alpha *= lifeProgress / (fadeInDuration / p.maxLife);
    }

    if (p.life < 0.5) {
      alpha *= p.life / 0.5;
    }

    if (heightProgress > 0.7) {
      alpha *= 1 - (heightProgress - 0.7) / 0.3;
    }

    if (!this.tornadoActive && this.fadeOutTimer > 0) {
      alpha *= this.fadeOutTimer / this.fadeOutDuration;
    }

    return Math.max(0, Math.min(1, alpha));
  }

  private spawnTornadoParticles(deltaTime: number): void {
    const baseSpawnRate = 20;
    const speedMultiplier = 1 + this.tornadoSpeed * 0.15;
    const spawnCount = Math.floor(
      baseSpawnRate * speedMultiplier * deltaTime * 60
    );

    for (let i = 0; i < spawnCount; i++) {
      const particle = this.getParticleFromPool();
      if (!particle) break;
      this.initTornadoParticle(particle);
    }
  }

  private initTornadoParticle(p: Particle): void {
    const angle = Math.random() * Math.PI * 2;
    const speedFactor = 0.8 + this.tornadoSpeed * 0.05;
    const height = this.tornadoHeight * (0.5 + Math.random() * 0.5);

    p.x = this.tornadoCenter.x;
    p.y = this.tornadoCenter.y;
    p.vx = 0;
    p.vy = 0;
    p.radius = 1.5 + Math.random() * 2.5;
    p.alpha = 0;
    p.life = height / 80;
    p.maxLife = p.life;
    p.angle = angle;
    p.angularSpeed = (2 + Math.random() * 3) * speedFactor;
    p.heightOffset = Math.random() * 20;
    p.radiusOffset = 10 + Math.random() * this.tornadoRadius * 0.8;

    const grayValue = 180 + Math.floor(Math.random() * 75);
    p.color = `rgb(${grayValue}, ${grayValue}, ${grayValue + 10})`;

    if (Math.random() > 0.7) {
      p.color = '#ffffff';
    }
  }

  public render(ctx: CanvasRenderingContext2D): void {
    if (!this.isTornadoActive()) return;

    const activeParticles = this.particles.filter((p) => p.life > 0);

    activeParticles.sort((a, b) => b.heightOffset - a.heightOffset);

    for (const p of activeParticles) {
      if (p.alpha <= 0) continue;

      ctx.globalAlpha = p.alpha * 0.8;
      ctx.fillStyle = p.color;

      const size = p.radius * (1 + p.heightOffset / 200);
      ctx.fillRect(
        Math.floor(p.x - size / 2),
        Math.floor(p.y - size / 2),
        Math.ceil(size),
        Math.ceil(size)
      );
    }

    ctx.globalAlpha = 1;
    this.renderTornadoVortex(ctx);
  }

  private renderTornadoVortex(ctx: CanvasRenderingContext2D): void {
    const alpha = this.tornadoActive
      ? 0.3
      : (this.fadeOutTimer / this.fadeOutDuration) * 0.3;

    for (let i = 0; i < 5; i++) {
      const heightRatio = i / 5;
      const radius = this.tornadoRadius * (0.2 + heightRatio * 0.8);
      const y = this.tornadoCenter.y - heightRatio * this.tornadoHeight * 0.8;

      ctx.strokeStyle = `rgba(200, 200, 220, ${alpha * (1 - heightRatio * 0.5)})`;
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.ellipse(
        this.tornadoCenter.x,
        y,
        radius,
        radius * 0.3,
        0,
        0,
        Math.PI * 2
      );
      ctx.stroke();
    }
    ctx.setLineDash([]);

    const gradient = ctx.createRadialGradient(
      this.tornadoCenter.x,
      this.tornadoCenter.y,
      0,
      this.tornadoCenter.x,
      this.tornadoCenter.y,
      this.tornadoRadius
    );
    gradient.addColorStop(0, `rgba(255, 255, 255, ${alpha * 0.5})`);
    gradient.addColorStop(0.5, `rgba(180, 180, 200, ${alpha * 0.3})`);
    gradient.addColorStop(1, 'rgba(150, 150, 170, 0)');

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.ellipse(
      this.tornadoCenter.x,
      this.tornadoCenter.y,
      this.tornadoRadius,
      this.tornadoRadius * 0.35,
      0,
      0,
      Math.PI * 2
    );
    ctx.fill();
  }

  public renderMouseTrail(
    ctx: CanvasRenderingContext2D,
    trail: { x: number; y: number }[]
  ): void {
    if (trail.length < 2) return;

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 6]);

    ctx.beginPath();
    ctx.moveTo(trail[0].x, trail[0].y);

    for (let i = 1; i < trail.length; i++) {
      const alpha = i / trail.length;
      ctx.strokeStyle = `rgba(255, 255, 255, ${alpha * 0.6})`;
      ctx.lineTo(trail[i].x, trail[i].y);
    }

    ctx.stroke();
    ctx.setLineDash([]);
  }

  public getActiveParticleCount(): number {
    return this.particles.filter((p) => p.life > 0).length;
  }

  public reset(): void {
    for (const p of this.particles) {
      p.life = 0;
      p.alpha = 0;
    }
    this.tornadoActive = false;
    this.fadeOutTimer = 0;
    this.tornadoSpeed = 0;
  }
}
