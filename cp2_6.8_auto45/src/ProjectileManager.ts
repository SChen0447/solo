import { Projectile, Monster, Particle, FloatingText, Vector2, GameConfig, DEFAULT_CONFIG } from './types';

export interface ProjectileHitEvent {
  monsterId: number;
  damage: number;
  position: Vector2;
}

export class ProjectileManager {
  private projectiles: Projectile[] = [];
  private particles: Particle[] = [];
  private floatingTexts: FloatingText[] = [];
  private nextProjectileId: number = 1;
  private nextParticleId: number = 1;
  private nextFloatingTextId: number = 1;
  private config: GameConfig;
  private groundY: number;
  private onHitCallback: ((event: ProjectileHitEvent) => void) | null = null;

  constructor(config: GameConfig = DEFAULT_CONFIG) {
    this.config = config;
    this.groundY = config.canvasHeight - 20;
  }

  public createProjectile(
    startPosition: Vector2,
    velocity: Vector2,
    damage: number
  ): void {
    if (this.projectiles.length >= this.config.maxProjectiles) {
      this.projectiles.shift();
    }

    const projectile: Projectile = {
      id: this.nextProjectileId++,
      position: { ...startPosition },
      velocity: { ...velocity },
      gravity: 0.15,
      radius: 4,
      damage,
      trail: [],
      isActive: true,
      hitGround: false
    };

    this.projectiles.push(projectile);
  }

  public update(deltaTime: number, speedMultiplier: number, monsters: Monster[]): void {
    const dt = deltaTime * speedMultiplier;
    const timeScale = dt / 16.67;

    for (const proj of this.projectiles) {
      if (!proj.isActive) continue;

      proj.trail.unshift({ ...proj.position });
      if (proj.trail.length > 3) {
        proj.trail.pop();
      }

      proj.velocity.y += proj.gravity * timeScale;
      proj.position.x += proj.velocity.x * timeScale;
      proj.position.y += proj.velocity.y * timeScale;

      if (proj.position.y >= this.groundY) {
        proj.position.y = this.groundY;
        proj.isActive = false;
        proj.hitGround = true;
        this.createSplashParticles(proj.position);
        continue;
      }

      if (proj.position.x < 0 || proj.position.x > this.config.canvasWidth) {
        proj.isActive = false;
        continue;
      }

      for (const monster of monsters) {
        if (monster.isDead) continue;

        const dx = proj.position.x - monster.position.x;
        const dy = proj.position.y - monster.position.y;
        const dist = Math.hypot(dx, dy);

        if (dist < proj.radius + 12) {
          proj.isActive = false;
          this.createExplosionParticles(proj.position);
          this.createFloatingText(
            { x: monster.position.x, y: monster.position.y - 20 },
            `-${proj.damage}`,
            '#ff4444'
          );

          if (this.onHitCallback) {
            this.onHitCallback({
              monsterId: monster.id,
              damage: proj.damage,
              position: { ...proj.position }
            });
          }
          break;
        }
      }
    }

    for (const particle of this.particles) {
      particle.life -= dt;
      particle.position.x += particle.velocity.x * timeScale;
      particle.position.y += particle.velocity.y * timeScale;
      particle.velocity.y += 0.1 * timeScale;
      particle.size *= 0.98;
    }

    for (const text of this.floatingTexts) {
      text.life -= dt;
      text.position.x += text.velocity.x * timeScale;
      text.position.y += text.velocity.y * timeScale;
    }

    this.projectiles = this.projectiles.filter(p => p.isActive);
    this.particles = this.particles.filter(p => p.life > 0);
    this.floatingTexts = this.floatingTexts.filter(t => t.life > 0);

    if (this.particles.length > this.config.maxParticles) {
      this.particles = this.particles.slice(-this.config.maxParticles);
    }
  }

  private createExplosionParticles(position: Vector2): void {
    for (let i = 0; i < 8; i++) {
      const angle = (Math.PI * 2 * i) / 8 + Math.random() * 0.5;
      const speed = 2 + Math.random() * 3;
      this.particles.push({
        id: this.nextParticleId++,
        position: { ...position },
        velocity: {
          x: Math.cos(angle) * speed,
          y: Math.sin(angle) * speed
        },
        life: 400,
        maxLife: 400,
        size: 4 + Math.random() * 3,
        color: '#ffdd44',
        type: 'explosion'
      });
    }
  }

  private createSplashParticles(position: Vector2): void {
    for (let i = 0; i < 4; i++) {
      const angle = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 0.8;
      const speed = 1 + Math.random() * 2;
      this.particles.push({
        id: this.nextParticleId++,
        position: { ...position },
        velocity: {
          x: Math.cos(angle) * speed,
          y: Math.sin(angle) * speed
        },
        life: 300,
        maxLife: 300,
        size: 3 + Math.random() * 2,
        color: '#aaaaaa',
        type: 'splash'
      });
    }
  }

  private createFloatingText(position: Vector2, text: string, color: string): void {
    this.floatingTexts.push({
      id: this.nextFloatingTextId++,
      position: { ...position },
      text,
      color,
      life: 800,
      maxLife: 800,
      velocity: { x: 0, y: -1 }
    });
  }

  public createVictoryParticles(centerX: number, centerY: number): void {
    const colors = ['#ff6b6b', '#4ecdc4', '#ffe66d', '#95e1d3', '#f38181', '#aa96da', '#fcbad3'];
    for (let i = 0; i < 50; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 2 + Math.random() * 6;
      this.particles.push({
        id: this.nextParticleId++,
        position: { x: centerX, y: centerY },
        velocity: {
          x: Math.cos(angle) * speed,
          y: Math.sin(angle) * speed
        },
        life: 2000 + Math.random() * 1000,
        maxLife: 3000,
        size: 4 + Math.random() * 6,
        color: colors[Math.floor(Math.random() * colors.length)],
        type: 'victory'
      });
    }
  }

  public getProjectiles(): Projectile[] {
    return this.projectiles;
  }

  public getParticles(): Particle[] {
    return this.particles;
  }

  public getFloatingTexts(): FloatingText[] {
    return this.floatingTexts;
  }

  public setOnHitCallback(callback: (event: ProjectileHitEvent) => void): void {
    this.onHitCallback = callback;
  }

  public reset(): void {
    this.projectiles = [];
    this.particles = [];
    this.floatingTexts = [];
    this.nextProjectileId = 1;
    this.nextParticleId = 1;
    this.nextFloatingTextId = 1;
  }
}
