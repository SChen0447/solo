export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  baseSize: number;
  rotation: number;
  rotationSpeed: number;
  color: { r: number; g: number; b: number };
  opacity: number;
  type: 'water' | 'splash' | 'ripple' | 'steam' | 'aroma';
}

export interface ParticleState {
  particles: Particle[];
  aromaParticles: Particle[];
}

export class ParticleController {
  private particles: Particle[] = [];
  private aromaParticles: Particle[] = [];
  private canvasWidth: number = 800;
  private canvasHeight: number = 600;
  private potSpoutX: number = 0;
  private potSpoutY: number = 0;
  private cupCenterX: number = 0;
  private cupTopY: number = 0;
  private cupBottomY: number = 0;
  private cupRadius: number = 0;
  private liquidHeight: number = 0;
  private isPouring: boolean = false;
  private pourTimer: number = 0;
  private particleTimer: number = 0;
  private gravity: number = 0.3;

  constructor() {
    this.initAromaParticles();
  }

  setCanvasSize(w: number, h: number): void {
    this.canvasWidth = w;
    this.canvasHeight = h;
    this.updatePositions();
    if (this.aromaParticles.length === 0) {
      this.initAromaParticles();
    }
  }

  private updatePositions(): void {
    const centerX = this.canvasWidth / 2;
    const centerY = this.canvasHeight / 2;
    this.potSpoutX = centerX - 100;
    this.potSpoutY = centerY - 80;
    this.cupCenterX = centerX + 80;
    this.cupTopY = centerY - 20;
    this.cupBottomY = centerY + 80;
    this.cupRadius = 50;
  }

  private initAromaParticles(): void {
    this.aromaParticles = [];
    for (let i = 0; i < 30; i++) {
      this.aromaParticles.push({
        x: Math.random() * this.canvasWidth,
        y: Math.random() * this.canvasHeight,
        vx: (Math.random() - 0.5) * 0.1,
        vy: -0.05 - Math.random() * 0.05,
        life: 1,
        maxLife: 1,
        size: 1.5 + Math.random() * 2,
        baseSize: 1.5 + Math.random() * 2,
        rotation: 0,
        rotationSpeed: 0,
        color: { r: 255, g: 213, b: 79 },
        opacity: 0.15 + Math.random() * 0.2,
        type: 'aroma'
      });
    }
  }

  startPouring(): void {
    this.isPouring = true;
    this.pourTimer = 0;
    this.particleTimer = 0;
  }

  stopPouring(): void {
    this.isPouring = false;
  }

  setLiquidHeight(height: number): void {
    this.liquidHeight = height;
  }

  getState(): ParticleState {
    return {
      particles: this.particles,
      aromaParticles: this.aromaParticles
    };
  }

  update(deltaTime: number, potAngle: number): void {
    this.updateAromaParticles(deltaTime);
    this.updatePouring(deltaTime, potAngle);
    this.updateParticles(deltaTime);
  }

  private updateAromaParticles(deltaTime: number): void {
    for (const p of this.aromaParticles) {
      p.x += p.vx * deltaTime;
      p.y += p.vy * deltaTime;

      if (p.y < -10) {
        p.y = this.canvasHeight + 10;
        p.x = Math.random() * this.canvasWidth;
      }
      if (p.x < -10) p.x = this.canvasWidth + 10;
      if (p.x > this.canvasWidth + 10) p.x = -10;

      p.opacity = 0.1 + Math.sin(Date.now() / 2000 + p.x) * 0.08;
    }
  }

  private updatePouring(deltaTime: number, potAngle: number): void {
    if (!this.isPouring) return;

    this.pourTimer += deltaTime;
    this.particleTimer += deltaTime;

    const spawnRate = 8;
    const spawnInterval = 1000 / (spawnRate * 60);

    if (this.particleTimer >= spawnInterval) {
      this.particleTimer = 0;
      this.spawnWaterParticle(potAngle);
    }
  }

  private spawnWaterParticle(potAngle: number): void {
    const angleRad = (potAngle + 15) * Math.PI / 180;
    const speed = 2.5 + Math.random() * 1;

    const t = Math.random();
    const r = Math.floor(139 + (255 - 139) * t);
    const g = Math.floor(69 + (213 - 69) * t);
    const b = Math.floor(19 + (79 - 19) * t);

    this.particles.push({
      x: this.potSpoutX + Math.sin(angleRad) * 10,
      y: this.potSpoutY + Math.cos(angleRad) * 10,
      vx: Math.sin(angleRad) * speed + (Math.random() - 0.5) * 0.5,
      vy: Math.cos(angleRad) * speed + (Math.random() - 0.5) * 0.3,
      life: 1,
      maxLife: 1,
      size: 2 + Math.random() * 3,
      baseSize: 2 + Math.random() * 3,
      rotation: Math.random() * Math.PI * 2,
      rotationSpeed: (Math.random() - 0.5) * 0.2,
      color: { r, g, b },
      opacity: 0.7 + Math.random() * 0.3,
      type: 'water'
    });
  }

  private updateParticles(deltaTime: number): void {
    const dt = deltaTime / 16.67;

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];

      switch (p.type) {
        case 'water':
          this.updateWaterParticle(p, dt, i);
          break;
        case 'splash':
          this.updateSplashParticle(p, dt, i);
          break;
        case 'ripple':
          this.updateRippleParticle(p, dt, i);
          break;
        case 'steam':
          this.updateSteamParticle(p, dt, i);
          break;
      }
    }

    if (this.particles.length > 200) {
      this.particles = this.particles.slice(-200);
    }
  }

  private updateWaterParticle(p: Particle, dt: number, index: number): void {
    p.vy += this.gravity * dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.rotation += p.rotationSpeed * dt;

    const liquidSurfaceY = this.cupBottomY - this.liquidHeight;
    const distFromCenter = Math.abs(p.x - this.cupCenterX);

    if (p.y >= liquidSurfaceY && distFromCenter < this.cupRadius - 5) {
      this.spawnSplash(p.x, p.y);
      this.spawnRipple(p.x);
      this.particles.splice(index, 1);
      return;
    }

    if (p.y > this.canvasHeight + 20 || p.x < -20 || p.x > this.canvasWidth + 20) {
      this.particles.splice(index, 1);
    }
  }

  private spawnSplash(x: number, y: number): void {
    for (let i = 0; i < 5; i++) {
      const angle = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 0.8;
      const speed = 1 + Math.random() * 2;

      this.particles.push({
        x: x + (Math.random() - 0.5) * 4,
        y: y,
        vx: Math.sin(angle) * speed,
        vy: Math.cos(angle) * speed - 1,
        life: 1,
        maxLife: 1,
        size: 1 + Math.random() * 1,
        baseSize: 1 + Math.random() * 1,
        rotation: 0,
        rotationSpeed: 0,
        color: { r: 255, g: 248, b: 200 },
        opacity: 0.8,
        type: 'splash'
      });
    }
  }

  private updateSplashParticle(p: Particle, dt: number, index: number): void {
    p.vy += this.gravity * 0.5 * dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;

    p.life -= 0.03 * dt;
    p.opacity = Math.max(0, p.life);

    if (p.life <= 0 || p.y > this.cupBottomY) {
      this.particles.splice(index, 1);
    }
  }

  private spawnRipple(x: number): void {
    this.particles.push({
      x: x,
      y: this.cupBottomY - this.liquidHeight,
      vx: 0,
      vy: 0,
      life: 1,
      maxLife: 1,
      size: 2,
      baseSize: 2,
      rotation: 0,
      rotationSpeed: 0,
      color: { r: 255, g: 248, b: 200 },
      opacity: 0.6,
      type: 'ripple'
    });
  }

  private updateRippleParticle(p: Particle, dt: number, index: number): void {
    p.size += 0.3 * dt;
    p.life -= 0.025 * dt;
    p.opacity = Math.max(0, p.life * 0.5);

    if (p.life <= 0) {
      this.particles.splice(index, 1);
    }
  }

  spawnSteam(): void {
    const surfaceY = this.cupBottomY - this.liquidHeight;
    for (let i = 0; i < 20; i++) {
      const offsetX = (Math.random() - 0.5) * (this.cupRadius * 1.2);
      this.particles.push({
        x: this.cupCenterX + offsetX,
        y: surfaceY + Math.random() * 5,
        vx: (Math.random() - 0.5) * 0.3,
        vy: -0.5 - Math.random() * 0.5,
        life: 1,
        maxLife: 1,
        size: 4 + Math.random() * 6,
        baseSize: 4 + Math.random() * 6,
        rotation: 0,
        rotationSpeed: 0,
        color: { r: 255, g: 255, b: 255 },
        opacity: 0.3 + Math.random() * 0.2,
        type: 'steam'
      });
    }
  }

  private updateSteamParticle(p: Particle, dt: number, index: number): void {
    p.x += p.vx * dt + Math.sin(Date.now() / 500 + p.y) * 0.1 * dt;
    p.y += p.vy * dt;
    p.size += 0.02 * dt;

    p.life -= 0.008 * dt;
    p.opacity = Math.max(0, p.life * 0.4);

    if (p.life <= 0) {
      this.particles.splice(index, 1);
    }
  }

  getCupInfo(): { centerX: number; topY: number; bottomY: number; radius: number; liquidY: number } {
    return {
      centerX: this.cupCenterX,
      topY: this.cupTopY,
      bottomY: this.cupBottomY,
      radius: this.cupRadius,
      liquidY: this.cupBottomY - this.liquidHeight
    };
  }

  getPotSpout(): { x: number; y: number } {
    return { x: this.potSpoutX, y: this.potSpoutY };
  }
}
