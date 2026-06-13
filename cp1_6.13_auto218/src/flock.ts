import { Bird } from './bird';

export interface FlockConfig {
  count: number;
  centerX: number;
  centerY: number;
  spread?: number;
}

export class Flock {
  birds: Bird[] = [];
  targetX: number;
  targetY: number;
  centerX: number;
  centerY: number;

  separationDist: number = 35;
  alignmentDist: number = 60;
  cohesionDist: number = 100;

  separationWeight: number = 0.05;
  alignmentWeight: number = 0.03;
  cohesionWeight: number = 0.02;
  targetWeight: number = 0.08;

  isScattered: boolean = false;
  scatterTimer: number = 0;
  scatterDuration: number = 0.5;
  regrouping: boolean = false;

  constructor(config: FlockConfig) {
    this.targetX = config.centerX;
    this.targetY = config.centerY;
    this.centerX = config.centerX;
    this.centerY = config.centerY;
    const spread = config.spread ?? 80;

    for (let i = 0; i < config.count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const r = Math.random() * spread;
      const x = config.centerX + Math.cos(angle) * r;
      const y = config.centerY + Math.sin(angle) * r;
      this.birds.push(new Bird(x, y));
    }
  }

  setTarget(x: number, y: number): void {
    this.targetX = x;
    this.targetY = y;
  }

  scatter(): void {
    if (this.isScattered) return;
    this.isScattered = true;
    this.scatterTimer = this.scatterDuration;
    this.regrouping = false;

    for (const bird of this.birds) {
      const dx = bird.x - this.centerX;
      const dy = bird.y - this.centerY;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;
      const force = 8 + Math.random() * 6;
      bird.vx += (dx / dist) * force;
      bird.vy += (dy / dist) * force;
    }
  }

  getCenter(): { x: number; y: number } {
    return { x: this.centerX, y: this.centerY };
  }

  update(dt: number): void {
    if (this.isScattered) {
      this.scatterTimer -= dt;
      if (this.scatterTimer <= 0) {
        this.isScattered = false;
        this.regrouping = true;
      }
    }

    let sumX = 0;
    let sumY = 0;

    for (let i = 0; i < this.birds.length; i++) {
      const bird = this.birds[i];
      sumX += bird.x;
      sumY += bird.y;

      if (this.isScattered) {
        bird.update(dt, bird.x + bird.vx * 10, bird.y + bird.vy * 10, 0.01);
      } else {
        this.applyFlocking(i, dt);
      }
    }

    this.centerX = sumX / this.birds.length;
    this.centerY = sumY / this.birds.length;

    if (this.regrouping) {
      const distToTarget = Math.sqrt(
        (this.centerX - this.targetX) ** 2 + (this.centerY - this.targetY) ** 2
      );
      if (distToTarget < 50) {
        this.regrouping = false;
      }
    }
  }

  private applyFlocking(index: number, dt: number): void {
    const bird = this.birds[index];
    let sepX = 0, sepY = 0;
    let aliX = 0, aliY = 0;
    let cohX = 0, cohY = 0;
    let sepCount = 0, aliCount = 0, cohCount = 0;

    for (let j = 0; j < this.birds.length; j++) {
      if (j === index) continue;
      const other = this.birds[j];
      const dx = other.x - bird.x;
      const dy = other.y - bird.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < this.separationDist && dist > 0) {
        sepX -= dx / dist;
        sepY -= dy / dist;
        sepCount++;
      }

      if (dist < this.alignmentDist) {
        aliX += other.vx;
        aliY += other.vy;
        aliCount++;
      }

      if (dist < this.cohesionDist) {
        cohX += other.x;
        cohY += other.y;
        cohCount++;
      }
    }

    if (sepCount > 0) {
      sepX /= sepCount;
      sepY /= sepCount;
    }
    if (aliCount > 0) {
      aliX /= aliCount;
      aliY /= aliCount;
    }
    if (cohCount > 0) {
      cohX = (cohX / cohCount - bird.x) * 0.01;
      cohY = (cohY / cohCount - bird.y) * 0.01;
    }

    const tdx = this.targetX - bird.x;
    const tdy = this.targetY - bird.y;
    const tDist = Math.sqrt(tdx * tdx + tdy * tdy) || 1;
    const targetFx = (tdx / tDist) * this.targetWeight;
    const targetFy = (tdy / tDist) * this.targetWeight;

    bird.applyForce(
      sepX * this.separationWeight +
      aliX * this.alignmentWeight +
      cohX * this.cohesionWeight +
      targetFx,
      sepY * this.separationWeight +
      aliY * this.alignmentWeight +
      cohY * this.cohesionWeight +
      targetFy,
      dt
    );

    bird.update(dt, bird.x + bird.vx, bird.y + bird.vy, 0);
  }

  draw(ctx: CanvasRenderingContext2D): void {
    for (const bird of this.birds) {
      bird.draw(ctx);
    }
  }

  resize(width: number, height: number): void {
    const scaleX = width / (this.centerX * 2 || 1);
    const scaleY = height / (this.centerY * 2 || 1);
    for (const bird of this.birds) {
      bird.x *= scaleX;
      bird.y *= scaleY;
    }
    this.targetX *= scaleX;
    this.targetY *= scaleY;
    this.centerX *= scaleX;
    this.centerY *= scaleY;
  }
}
