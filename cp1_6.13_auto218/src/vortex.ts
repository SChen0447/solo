import { ParticleSystem } from './particle';
import { Bird } from './bird';

interface Orbit {
  baseRadius: number;
  rotation: number;
  rotationSpeed: number;
  targetSpeed: number;
  color: string;
  alpha: number;
  wavePhase: number;
  turnTimer: number;
}

interface CollisionEvent {
  bird: Bird;
  x: number;
  y: number;
}

export class Vortex {
  orbits: Orbit[] = [];
  centerX: number;
  centerY: number;
  layers: number;
  particleSystem: ParticleSystem;
  collisions: CollisionEvent[] = [];
  minRadius: number = 0;
  maxRadius: number = 0;

  private colorInner = { r: 255, g: 107, b: 107 };
  private colorOuter = { r: 162, g: 155, b: 254 };

  constructor(centerX: number, centerY: number, layers: number = 5) {
    this.centerX = centerX;
    this.centerY = centerY;
    this.layers = layers;
    this.particleSystem = new ParticleSystem();
    this.initOrbits();
  }

  private initOrbits(): void {
    const shortSide = Math.min(this.centerX * 2, this.centerY * 2);
    const innerRadius = shortSide * 0.18;
    this.orbits = [];

    for (let i = 0; i < this.layers; i++) {
      const radiusRatio = i / (this.layers - 1 || 1);
      const baseRadius = innerRadius * Math.pow(1.22, i);

      const r = Math.floor(this.colorInner.r + (this.colorOuter.r - this.colorInner.r) * radiusRatio);
      const g = Math.floor(this.colorInner.g + (this.colorOuter.g - this.colorInner.g) * radiusRatio);
      const b = Math.floor(this.colorInner.b + (this.colorOuter.b - this.colorInner.b) * radiusRatio);
      const color = `rgb(${r}, ${g}, ${b})`;

      const alpha = 0.9 - radiusRatio * 0.6;

      this.orbits.push({
        baseRadius,
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (0.2 + Math.random() * 0.3) * (i % 2 === 0 ? 1 : -1),
        targetSpeed: (0.2 + Math.random() * 0.3) * (i % 2 === 0 ? 1 : -1),
        color,
        alpha,
        wavePhase: Math.random() * Math.PI * 2,
        turnTimer: 3 + Math.random() * 4,
      });
    }

    this.minRadius = this.orbits[0]?.baseRadius ?? 0;
    this.maxRadius = this.orbits[this.orbits.length - 1]?.baseRadius ?? 0;
  }

  resize(centerX: number, centerY: number): void {
    this.centerX = centerX;
    this.centerY = centerY;
    this.initOrbits();
  }

  update(dt: number, birds: Bird[]): number {
    this.particleSystem.update(dt);

    for (const orbit of this.orbits) {
      orbit.turnTimer -= dt;
      if (orbit.turnTimer <= 0) {
        orbit.targetSpeed = (0.15 + Math.random() * 0.35) * (Math.random() > 0.5 ? 1 : -1);
        orbit.turnTimer = 3 + Math.random() * 5;
      }

      orbit.rotationSpeed += (orbit.targetSpeed - orbit.rotationSpeed) * 0.02 * dt * 60;
      orbit.rotation += orbit.rotationSpeed * dt;
      orbit.wavePhase += dt * Math.PI;
    }

    let score = 0;
    this.collisions = [];

    for (const bird of birds) {
      const dx = bird.x - this.centerX;
      const dy = bird.y - this.centerY;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist > this.minRadius * 0.95 && dist < this.maxRadius * 1.05) {
        for (let i = 0; i < this.orbits.length; i++) {
          const orbit = this.orbits[i];
          const waveOffset = Math.sin(orbit.wavePhase + dist * 0.05) * 3;
          const orbitRadius = orbit.baseRadius + waveOffset;

          if (Math.abs(dist - orbitRadius) < bird.size + 2) {
            const angle = Math.atan2(dy, dx);
            const nx = dx / dist;
            const ny = dy / dist;

            const reflectVel = bird.vx * nx + bird.vy * ny;
            if (reflectVel < 0) {
              bird.vx -= 2 * reflectVel * nx * 0.8;
              bird.vy -= 2 * reflectVel * ny * 0.8;
            }

            const pushDist = orbit.baseRadius + waveOffset + bird.size + 1;
            bird.x = this.centerX + Math.cos(angle) * pushDist;
            bird.y = this.centerY + Math.sin(angle) * pushDist;

            this.particleSystem.emit({
              x: bird.x,
              y: bird.y,
              color: bird.color,
              count: 12,
              speed: 4,
              life: 1.2,
              size: 3,
            });

            this.collisions.push({ bird, x: bird.x, y: bird.y });
            score += 10;
            break;
          }
        }
      }
    }

    return score;
  }

  draw(ctx: CanvasRenderingContext2D): void {
    for (let i = this.orbits.length - 1; i >= 0; i--) {
      this.drawOrbit(ctx, this.orbits[i]);
    }
    this.particleSystem.draw(ctx);
  }

  private drawOrbit(ctx: CanvasRenderingContext2D, orbit: Orbit): void {
    const segments = 120;
    const turns = 1.5;

    ctx.save();
    ctx.translate(this.centerX, this.centerY);
    ctx.rotate(orbit.rotation);

    ctx.globalAlpha = orbit.alpha;
    ctx.strokeStyle = orbit.color;
    ctx.shadowColor = orbit.color;
    ctx.shadowBlur = 15;
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';

    ctx.beginPath();
    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      const angle = t * Math.PI * 2 * turns;
      const wave = Math.sin(orbit.wavePhase + t * Math.PI * 4) * 1.5;
      const radius = orbit.baseRadius + wave;

      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius;

      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }
    ctx.stroke();

    ctx.restore();
  }

  getOuterRadius(): number {
    return this.maxRadius;
  }
}
