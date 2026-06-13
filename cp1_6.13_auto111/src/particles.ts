export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  life: number;
  maxLife: number;
  color: string;
  alpha: number;
  type: 'ambient' | 'feed' | 'heart' | 'star' | 'dust';
}

export interface Star {
  x: number;
  y: number;
  size: number;
  baseAlpha: number;
  twinklePhase: number;
  twinkleSpeed: number;
}

export interface FloatingLight {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
}

export class ParticleSystem {
  private particles: Particle[] = [];
  private stars: Star[] = [];
  private floatingLights: FloatingLight[] = [];
  private maxParticles = 300;
  private canvasWidth: number = 0;
  private canvasHeight: number = 0;

  constructor(canvasWidth: number, canvasHeight: number) {
    this.canvasWidth = canvasWidth;
    this.canvasHeight = canvasHeight;
    this.initStars();
    this.initFloatingLights();
  }

  resize(width: number, height: number): void {
    this.canvasWidth = width;
    this.canvasHeight = height;
  }

  private initStars(): void {
    this.stars = [];
    for (let i = 0; i < 200; i++) {
      this.stars.push({
        x: Math.random() * this.canvasWidth,
        y: Math.random() * this.canvasHeight,
        size: 1 + Math.random() * 2,
        baseAlpha: 0.2 + Math.random() * 0.8,
        twinklePhase: Math.random() * Math.PI * 2,
        twinkleSpeed: 0.003 + Math.random() * 0.004
      });
    }
  }

  private initFloatingLights(): void {
    this.floatingLights = [];
    for (let i = 0; i < 120; i++) {
      this.floatingLights.push({
        x: Math.random() * this.canvasWidth,
        y: Math.random() * this.canvasHeight,
        vx: 0.3,
        vy: 0.3,
        size: 2 + Math.random() * 4,
        alpha: 0.1 + Math.random() * 0.3
      });
    }
  }

  getStars(): Star[] {
    return this.stars;
  }

  getFloatingLights(): FloatingLight[] {
    return this.floatingLights;
  }

  getParticles(): Particle[] {
    return this.particles;
  }

  spawnFeedParticles(x: number, y: number): void {
    for (let i = 0; i < 30; i++) {
      if (this.particles.length >= this.maxParticles) break;
      const angle = Math.random() * Math.PI * 2;
      const speed = 1 + Math.random() * 3;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.abs(Math.sin(angle)) * speed + 1,
        size: 3 + Math.random() * 3,
        life: 0,
        maxLife: 1500,
        color: '#f5a623',
        alpha: 1,
        type: 'feed'
      });
    }
  }

  spawnHeartParticles(x: number, y: number): void {
    for (let i = 0; i < 10; i++) {
      if (this.particles.length >= this.maxParticles) break;
      const angle = (Math.PI * 2 * i) / 10;
      this.particles.push({
        x: x + Math.cos(angle) * 50,
        y: y + Math.sin(angle) * 50,
        vx: Math.cos(angle) * 0.5,
        vy: Math.sin(angle) * 0.5,
        size: 4 + Math.random() * 2,
        life: 0,
        maxLife: 800,
        color: '#ff69b4',
        alpha: 0.7,
        type: 'heart'
      });
    }
  }

  spawnWakeWave(x: number, y: number): void {
    for (let i = 0; i < 20; i++) {
      if (this.particles.length >= this.maxParticles) break;
      const angle = (Math.PI * 2 * i) / 20;
      this.particles.push({
        x: x + Math.cos(angle) * 10,
        y: y + Math.sin(angle) * 10,
        vx: Math.cos(angle) * 3,
        vy: Math.sin(angle) * 3,
        size: 5,
        life: 0,
        maxLife: 500,
        color: '#fdf4e3',
        alpha: 1,
        type: 'dust'
      });
    }
  }

  spawnHatchParticles(x: number, y: number): void {
    for (let i = 0; i < 50; i++) {
      if (this.particles.length >= this.maxParticles) break;
      const angle = Math.random() * Math.PI * 2;
      const speed = 2 + Math.random() * 4;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 2 + Math.random() * 4,
        life: 0,
        maxLife: 2000,
        color: Math.random() > 0.5 ? '#87ceeb' : '#fdf4e3',
        alpha: 1,
        type: 'dust'
      });
    }
  }

  update(deltaTime: number, currentTime: number, dimStars: boolean): void {
    this.updateStars(deltaTime, currentTime, dimStars);
    this.updateFloatingLights();
    this.updateParticles(deltaTime);
  }

  private updateStars(deltaTime: number, currentTime: number, dimStars: boolean): void {
    const dimFactor = dimStars ? 0.5 : 1;
    for (const star of this.stars) {
      star.twinklePhase += star.twinkleSpeed * deltaTime;
      const twinkle = 0.5 + 0.5 * Math.sin(star.twinklePhase);
      (star as Star & { alpha: number }).alpha = star.baseAlpha * twinkle * dimFactor;
    }
  }

  private updateFloatingLights(): void {
    for (const light of this.floatingLights) {
      light.x += light.vx;
      light.y += light.vy;

      if (light.x > this.canvasWidth + 10) {
        light.x = -10;
        light.y = Math.random() * this.canvasHeight;
      }
      if (light.y > this.canvasHeight + 10) {
        light.y = -10;
        light.x = Math.random() * this.canvasWidth;
      }
    }
  }

  private updateParticles(deltaTime: number): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life += deltaTime;

      if (p.life >= p.maxLife) {
        this.particles.splice(i, 1);
        continue;
      }

      p.x += p.vx;
      p.y += p.vy;

      if (p.type === 'feed') {
        p.vy += 0.05;
      }

      const lifeRatio = 1 - p.life / p.maxLife;
      p.alpha = Math.max(0, lifeRatio);

      if (p.type === 'heart') {
        p.size = 4 + (1 - lifeRatio) * 4;
      }
    }
  }
}
