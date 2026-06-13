export type FireType = 'lava' | 'ice' | 'poison';

export interface FireColors {
  core: string;
  inner: string;
  outer: string;
  glow: string;
  ambient: string;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
  alpha: number;
  type: 'fire' | 'spark' | 'snow' | 'fog' | 'meditation';
  phase: number;
  amplitude: number;
  frequency: number;
}

export interface FireState {
  isBurning: boolean;
  fireType: FireType | null;
  energy: number;
  maxEnergy: number;
  burnStartTime: number;
  isUpgraded: boolean;
  resonationCount: number;
  brightness: number;
  isMeditating: boolean;
  meditationProgress: number;
}

const FIRE_COLORS: Record<FireType, FireColors> = {
  lava: {
    core: '#fff4a0',
    inner: '#ff6a1a',
    outer: '#d4280a',
    glow: 'rgba(255, 106, 26, 0.4)',
    ambient: 'rgba(212, 40, 10, 0.15)'
  },
  ice: {
    core: '#e8f4ff',
    inner: '#5ac8ff',
    outer: '#1a6ad4',
    glow: 'rgba(90, 200, 255, 0.4)',
    ambient: 'rgba(26, 106, 212, 0.15)'
  },
  poison: {
    core: '#e8ffa8',
    inner: '#5aff5a',
    outer: '#1a8a2a',
    glow: 'rgba(90, 255, 90, 0.4)',
    ambient: 'rgba(26, 138, 42, 0.15)'
  }
};

const MAX_PARTICLES = 2000;
const BASE_PARTICLES_PER_FRAME = 3;
const UPGRADE_PARTICLE_MULTIPLIER = 2;

export class FireSystem {
  private particles: Particle[] = [];
  private state: FireState;
  private centerX: number;
  private centerY: number;

  constructor(centerX: number, centerY: number) {
    this.centerX = centerX;
    this.centerY = centerY;
    this.state = {
      isBurning: false,
      fireType: null,
      energy: 100,
      maxEnergy: 100,
      burnStartTime: 0,
      isUpgraded: false,
      resonationCount: 0,
      brightness: 0,
      isMeditating: false,
      meditationProgress: 0
    };
  }

  public getState(): FireState {
    return { ...this.state };
  }

  public getParticles(): Particle[] {
    return this.particles;
  }

  public getColors(): FireColors | null {
    if (!this.state.fireType) return null;
    return FIRE_COLORS[this.state.fireType];
  }

  public setCenter(x: number, y: number): void {
    this.centerX = x;
    this.centerY = y;
  }

  public ignite(fireType: FireType): void {
    this.state.isBurning = true;
    this.state.fireType = fireType;
    this.state.energy = 100;
    this.state.burnStartTime = performance.now();
    this.state.isUpgraded = false;
    this.state.brightness = 0;
    this.spawnIgnitionBurst();
  }

  public extinguish(): void {
    this.state.isBurning = false;
    this.state.fireType = null;
    this.state.burnStartTime = 0;
    this.state.isUpgraded = false;
    this.state.brightness = 0;
    this.state.isMeditating = false;
    this.state.meditationProgress = 0;
  }

  public upgrade(): void {
    this.state.isUpgraded = true;
    this.state.resonationCount++;
    this.spawnUpgradeBurst();
  }

  public startMeditation(): void {
    if (this.state.isBurning && this.state.energy < this.state.maxEnergy) {
      this.state.isMeditating = true;
      this.state.meditationProgress = 0;
    }
  }

  public stopMeditation(): void {
    this.state.isMeditating = false;
    this.state.meditationProgress = 0;
  }

  public getBurnDuration(): number {
    if (!this.state.isBurning) return 0;
    return (performance.now() - this.state.burnStartTime) / 1000;
  }

  public update(deltaTime: number): void {
    this.updateFireState(deltaTime);
    this.spawnParticles();
    this.updateParticles(deltaTime);
    this.cleanupParticles();
  }

  private updateFireState(deltaTime: number): void {
    if (!this.state.isBurning) {
      this.state.brightness = Math.max(0, this.state.brightness - deltaTime * 2);
      return;
    }

    if (this.state.isMeditating) {
      this.state.meditationProgress += deltaTime;
      const recoverRate = 8;
      this.state.energy = Math.min(
        this.state.maxEnergy,
        this.state.energy + recoverRate * deltaTime
      );
      this.spawnMeditationParticles();
    } else {
      const consumeRate = this.state.isUpgraded ? 4 : 3;
      this.state.energy = Math.max(0, this.state.energy - consumeRate * deltaTime);
    }

    if (this.state.energy <= 0) {
      this.extinguish();
      return;
    }

    const targetBrightness = this.state.energy / this.state.maxEnergy;
    this.state.brightness += (targetBrightness - this.state.brightness) * deltaTime * 5;
  }

  private spawnParticles(): void {
    if (!this.state.isBurning || !this.state.fireType) return;

    const colors = FIRE_COLORS[this.state.fireType];
    const baseCount = BASE_PARTICLES_PER_FRAME * (this.state.isUpgraded ? UPGRADE_PARTICLE_MULTIPLIER : 1);
    const count = Math.floor(baseCount * (0.5 + this.state.brightness * 0.5));

    for (let i = 0; i < count; i++) {
      if (this.particles.length >= MAX_PARTICLES) break;
      this.particles.push(this.createFireParticle(colors));
    }

    if (this.state.isUpgraded) {
      this.spawnSpecialEffectParticles();
    }
  }

  private createFireParticle(colors: FireColors): Particle {
    const spread = this.state.isUpgraded ? 35 : 20;
    const x = this.centerX + (Math.random() - 0.5) * spread;
    const y = this.centerY + Math.random() * 5;
    const colorChoice = Math.random();
    let color: string;
    if (colorChoice < 0.3) color = colors.core;
    else if (colorChoice < 0.7) color = colors.inner;
    else color = colors.outer;

    const baseSpeed = this.state.isUpgraded ? 90 : 70;
    const sizeMultiplier = this.state.isUpgraded ? 1.4 : 1;

    return {
      x,
      y,
      vx: (Math.random() - 0.5) * 15,
      vy: -(baseSpeed + Math.random() * 50),
      life: 0,
      maxLife: 0.8 + Math.random() * 0.6,
      size: (3 + Math.random() * 5) * sizeMultiplier,
      color,
      alpha: 1,
      type: 'fire',
      phase: Math.random() * Math.PI * 2,
      amplitude: 8 + Math.random() * 12,
      frequency: 3 + Math.random() * 3
    };
  }

  private spawnSpecialEffectParticles(): void {
    if (!this.state.fireType) return;

    switch (this.state.fireType) {
      case 'lava':
        if (Math.random() < 0.15) {
          this.particles.push(this.createSparkParticle());
        }
        break;
      case 'ice':
        if (Math.random() < 0.1) {
          this.particles.push(this.createSnowParticle());
        }
        break;
      case 'poison':
        if (Math.random() < 0.08) {
          this.particles.push(this.createFogParticle());
        }
        break;
    }
  }

  private createSparkParticle(): Particle {
    const angle = Math.random() * Math.PI * 2;
    const speed = 120 + Math.random() * 180;
    return {
      x: this.centerX + (Math.random() - 0.5) * 15,
      y: this.centerY - 20 - Math.random() * 30,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 50,
      life: 0,
      maxLife: 0.6 + Math.random() * 0.4,
      size: 1.5 + Math.random() * 2,
      color: '#ffcc44',
      alpha: 1,
      type: 'spark',
      phase: 0,
      amplitude: 0,
      frequency: 0
    };
  }

  private createSnowParticle(): Particle {
    const spread = 150;
    return {
      x: this.centerX + (Math.random() - 0.5) * spread,
      y: this.centerY - 150 - Math.random() * 100,
      vx: (Math.random() - 0.5) * 20,
      vy: 25 + Math.random() * 35,
      life: 0,
      maxLife: 4 + Math.random() * 3,
      size: 2 + Math.random() * 3,
      color: '#ccf0ff',
      alpha: 0.8,
      type: 'snow',
      phase: Math.random() * Math.PI * 2,
      amplitude: 15 + Math.random() * 20,
      frequency: 0.8 + Math.random() * 0.6
    };
  }

  private createFogParticle(): Particle {
    return {
      x: this.centerX + (Math.random() - 0.5) * 60,
      y: this.centerY - 10 - Math.random() * 40,
      vx: (Math.random() - 0.5) * 10,
      vy: -8 - Math.random() * 15,
      life: 0,
      maxLife: 2.5 + Math.random() * 2,
      size: 25 + Math.random() * 35,
      color: '#2a6a2a',
      alpha: 0.25,
      type: 'fog',
      phase: Math.random() * Math.PI * 2,
      amplitude: 20 + Math.random() * 25,
      frequency: 0.4 + Math.random() * 0.3
    };
  }

  private spawnMeditationParticles(): void {
    if (Math.random() < 0.3 && this.particles.length < MAX_PARTICLES) {
      const angle = Math.random() * Math.PI * 2;
      const dist = 60 + Math.random() * 40;
      this.particles.push({
        x: this.centerX + Math.cos(angle) * dist,
        y: this.centerY + Math.sin(angle) * dist,
        vx: -Math.cos(angle) * 20,
        vy: -Math.sin(angle) * 20 - 15,
        life: 0,
        maxLife: 1.5,
        size: 2 + Math.random() * 2,
        color: '#ffe88a',
        alpha: 1,
        type: 'meditation',
        phase: 0,
        amplitude: 0,
        frequency: 0
      });
    }
  }

  private spawnIgnitionBurst(): void {
    if (!this.state.fireType) return;
    const colors = FIRE_COLORS[this.state.fireType];
    for (let i = 0; i < 50; i++) {
      if (this.particles.length >= MAX_PARTICLES) break;
      const angle = (i / 50) * Math.PI * 2;
      const speed = 80 + Math.random() * 120;
      this.particles.push({
        x: this.centerX,
        y: this.centerY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 40,
        life: 0,
        maxLife: 0.8 + Math.random() * 0.4,
        size: 3 + Math.random() * 4,
        color: Math.random() < 0.5 ? colors.inner : colors.core,
        alpha: 1,
        type: 'spark',
        phase: 0,
        amplitude: 0,
        frequency: 0
      });
    }
  }

  private spawnUpgradeBurst(): void {
    if (!this.state.fireType) return;
    const colors = FIRE_COLORS[this.state.fireType];
    for (let i = 0; i < 80; i++) {
      if (this.particles.length >= MAX_PARTICLES) break;
      const angle = Math.random() * Math.PI * 2;
      const speed = 100 + Math.random() * 150;
      this.particles.push({
        x: this.centerX,
        y: this.centerY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0,
        maxLife: 1 + Math.random() * 0.6,
        size: 3 + Math.random() * 5,
        color: colors.core,
        alpha: 1,
        type: 'spark',
        phase: 0,
        amplitude: 0,
        frequency: 0
      });
    }
  }

  private updateParticles(deltaTime: number): void {
    for (const p of this.particles) {
      p.life += deltaTime;
      const lifeRatio = p.life / p.maxLife;

      if (p.type === 'fire' || p.type === 'snow' || p.type === 'fog') {
        p.phase += p.frequency * deltaTime;
        p.x += Math.sin(p.phase) * p.amplitude * deltaTime;
      }

      p.x += p.vx * deltaTime;
      p.y += p.vy * deltaTime;

      if (p.type === 'fire') {
        p.vy -= 30 * deltaTime;
        p.vx *= 0.98;
      } else if (p.type === 'spark') {
        p.vy += 180 * deltaTime;
      } else if (p.type === 'snow') {
        p.vx *= 0.99;
      } else if (p.type === 'meditation') {
        p.vx *= 0.97;
        p.vy *= 0.97;
      }

      if (p.type === 'fire') {
        p.alpha = Math.max(0, 1 - lifeRatio * lifeRatio);
        p.size *= 1 - 0.3 * deltaTime;
      } else if (p.type === 'spark') {
        p.alpha = Math.max(0, 1 - lifeRatio);
      } else if (p.type === 'fog') {
        p.alpha = Math.max(0, 0.25 * (1 - lifeRatio));
      } else if (p.type === 'meditation') {
        p.alpha = Math.max(0, 1 - lifeRatio);
      }
    }
  }

  private cleanupParticles(): void {
    this.particles = this.particles.filter(p => p.life < p.maxLife && p.alpha > 0.01);
  }

  public applyShockwave(centerX: number, centerY: number): void {
    for (const p of this.particles) {
      const dx = p.x - centerX;
      const dy = p.y - centerY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 250 && dist > 0) {
        const force = (250 - dist) * 3;
        p.vx += (dx / dist) * force;
        p.vy += (dy / dist) * force;
      }
    }
    this.state.energy = Math.max(0, this.state.energy - 5);
  }
}
