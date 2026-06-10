interface FoamParticle {
  x: number;
  y: number;
  size: number;
  opacity: number;
  life: number;
  maxLife: number;
}

interface SplashParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  opacity: number;
  life: number;
  maxLife: number;
}

export class Ocean {
  private width: number;
  private height: number;
  private horizonY: number;
  private foamParticles: FoamParticle[] = [];
  private splashParticles: SplashParticle[] = [];
  private nextSplashTime: number = 3000;
  private foamSpawnTimer: number = 0;

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.horizonY = height * 0.45;
  }

  resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
    this.horizonY = height * 0.45;
  }

  update(time: number, deltaTime: number): void {
    this.foamSpawnTimer += deltaTime;
    if (this.foamSpawnTimer > 50) {
      this.spawnFoamParticles(time);
      this.foamSpawnTimer = 0;
    }

    if (time >= this.nextSplashTime) {
      this.spawnSplash();
      this.nextSplashTime = time + 2000 + Math.random() * 2000;
    }

    this.foamParticles = this.foamParticles.filter(p => {
      p.life -= deltaTime;
      p.opacity = Math.max(0, p.life / p.maxLife * 0.6);
      return p.life > 0;
    });

    this.splashParticles = this.splashParticles.filter(p => {
      p.life -= deltaTime;
      p.vy += 0.15 * (deltaTime / 16);
      p.x += p.vx * (deltaTime / 16);
      p.y += p.vy * (deltaTime / 16);
      p.opacity = Math.max(0, p.life / p.maxLife * 0.8);
      return p.life > 0 && p.y < this.height;
    });
  }

  private getWaveY(x: number, time: number, layer: number): number {
    const t = time / 1000;
    const layerOffset = layer * 0.3;
    const wave1 = Math.sin(x * 0.008 + t * 1.2 + layerOffset) * 1.2;
    const wave2 = Math.sin(x * 0.015 + t * 2.0 + layerOffset * 1.5) * 0.8;
    const wave3 = Math.sin(x * 0.025 + t * 3.0 + layerOffset * 2) * 0.5;
    return wave1 + wave2 + wave3;
  }

  private spawnFoamParticles(time: number): void {
    const spawnCount = 3;
    for (let i = 0; i < spawnCount; i++) {
      const x = Math.random() * this.width;
      const layer = Math.random();
      const baseY = this.horizonY + layer * (this.height - this.horizonY);
      const waveY = this.getWaveY(x, time, layer * 3);
      const y = baseY + waveY;

      this.foamParticles.push({
        x,
        y,
        size: 2 + Math.random() * 2,
        opacity: 0.6,
        life: 1500,
        maxLife: 1500
      });
    }
  }

  private spawnSplash(): void {
    const centerX = Math.random() * this.width;
    const layer = 0.3 + Math.random() * 0.6;
    const baseY = this.horizonY + layer * (this.height - this.horizonY);
    const particleCount = 8 + Math.floor(Math.random() * 4);

    for (let i = 0; i < particleCount; i++) {
      const angle = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 0.8;
      const speed = 1 + Math.random() * 3;
      this.splashParticles.push({
        x: centerX + (Math.random() - 0.5) * 20,
        y: baseY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 2,
        size: 1.5 + Math.random() * 2,
        opacity: 0.8,
        life: 1000 + Math.random() * 500,
        maxLife: 1500
      });
    }
  }

  draw(ctx: CanvasRenderingContext2D, time: number, scale: number, beamAngle: number, beamOrigin: { x: number; y: number }): void {
    const gradient = ctx.createLinearGradient(0, this.horizonY, 0, this.height);
    gradient.addColorStop(0, '#3a5f6d');
    gradient.addColorStop(1, '#0b2b40');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, this.horizonY, this.width, this.height - this.horizonY);

    const layerCount = Math.floor(12 * scale);
    for (let layer = 0; layer < layerCount; layer++) {
      const layerProgress = layer / layerCount;
      const baseY = this.horizonY + layerProgress * (this.height - this.horizonY);
      const layerOpacity = 0.3 + layerProgress * 0.5;

      ctx.beginPath();
      ctx.moveTo(0, baseY);

      for (let x = 0; x <= this.width; x += 2) {
        const waveY = this.getWaveY(x, time, layerProgress * 3);
        ctx.lineTo(x, baseY + waveY);
      }

      ctx.lineTo(this.width, this.height);
      ctx.lineTo(0, this.height);
      ctx.closePath();

      const r = Math.floor(11 + layerProgress * 50);
      const g = Math.floor(43 + layerProgress * 55);
      const b = Math.floor(64 + layerProgress * 45);
      ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${layerOpacity})`;
      ctx.fill();
    }

    this.drawBeamHighlight(ctx, beamAngle, beamOrigin, time);

    ctx.fillStyle = '#ffffff';
    for (const particle of this.foamParticles) {
      ctx.globalAlpha = particle.opacity;
      ctx.fillRect(
        Math.floor(particle.x),
        Math.floor(particle.y),
        Math.ceil(particle.size),
        Math.ceil(particle.size)
      );
    }

    for (const particle of this.splashParticles) {
      ctx.globalAlpha = particle.opacity;
      ctx.fillRect(
        Math.floor(particle.x),
        Math.floor(particle.y),
        Math.ceil(particle.size),
        Math.ceil(particle.size)
      );
    }
    ctx.globalAlpha = 1;
  }

  private drawBeamHighlight(
    ctx: CanvasRenderingContext2D,
    beamAngle: number,
    beamOrigin: { x: number; y: number },
    time: number
  ): void {
    if (beamOrigin.y >= this.horizonY) return;

    const beamLength = Math.max(this.width, this.height) * 1.5;
    const beamWidthRad = Math.PI / 8;
    const startAngle = beamAngle - beamWidthRad / 2;
    const endAngle = beamAngle + beamWidthRad / 2;

    ctx.save();
    ctx.beginPath();
    ctx.moveTo(beamOrigin.x, beamOrigin.y);
    ctx.arc(beamOrigin.x, beamOrigin.y, beamLength, startAngle, endAngle);
    ctx.closePath();
    ctx.clip();

    ctx.fillStyle = 'rgba(255, 230, 150, 0.15)';
    ctx.fillRect(0, this.horizonY, this.width, this.height - this.horizonY);

    for (let x = 0; x <= this.width; x += 4) {
      const layerProgress = 0.5;
      const baseY = this.horizonY + layerProgress * (this.height - this.horizonY);
      const waveY = this.getWaveY(x, time, 1.5);
      const y = baseY + waveY;

      ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.fillRect(Math.floor(x), Math.floor(y), 2, 2);
    }

    ctx.restore();
  }
}
