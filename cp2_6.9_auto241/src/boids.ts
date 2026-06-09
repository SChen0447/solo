export interface Vector2 {
  x: number;
  y: number;
}

export interface Food {
  x: number;
  y: number;
  radius: number;
  createdAt: number;
  pulsePhase: number;
}

export interface Obstacle {
  x: number;
  y: number;
  radius: number;
  avoidRadius: number;
  isDragging: boolean;
}

export interface Weights {
  separation: number;
  alignment: number;
  cohesion: number;
}

const TRAIL_LENGTH = 15;
const EAT_DURATION = 2000;

export class Boid {
  position: Vector2;
  velocity: Vector2;
  heading: number;
  speed: number;
  viewRadius: number;
  trail: Vector2[];
  isEating: boolean;
  eatTimer: number;
  targetFood: Food | null;
  neighborCount: number;

  constructor(x: number, y: number) {
    this.position = { x, y };
    this.speed = 1 + Math.random() * 2;
    this.heading = Math.random() * Math.PI * 2;
    this.velocity = {
      x: Math.cos(this.heading) * this.speed,
      y: Math.sin(this.heading) * this.speed,
    };
    this.viewRadius = 120;
    this.trail = [];
    this.isEating = false;
    this.eatTimer = 0;
    this.targetFood = null;
    this.neighborCount = 0;
  }

  private addTrailPoint(): void {
    this.trail.unshift({ x: this.position.x, y: this.position.y });
    if (this.trail.length > TRAIL_LENGTH) {
      this.trail.pop();
    }
  }

  private limitVector(v: Vector2, max: number): Vector2 {
    const mag = Math.sqrt(v.x * v.x + v.y * v.y);
    if (mag > max && mag > 0) {
      return { x: (v.x / mag) * max, y: (v.y / mag) * max };
    }
    return v;
  }

  private normalize(v: Vector2): Vector2 {
    const mag = Math.sqrt(v.x * v.x + v.y * v.y);
    if (mag === 0) return { x: 0, y: 0 };
    return { x: v.x / mag, y: v.y / mag };
  }

  private distance(a: Vector2, b: Vector2): number {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  private separation(neighbors: Boid[]): Vector2 {
    const steer: Vector2 = { x: 0, y: 0 };
    let count = 0;
    const desiredSep = this.viewRadius * 0.5;

    for (const other of neighbors) {
      const d = this.distance(this.position, other.position);
      if (d > 0 && d < desiredSep) {
        const diff = {
          x: this.position.x - other.position.x,
          y: this.position.y - other.position.y,
        };
        const norm = this.normalize(diff);
        steer.x += norm.x / d;
        steer.y += norm.y / d;
        count++;
      }
    }

    if (count > 0) {
      steer.x /= count;
      steer.y /= count;
    }

    return steer;
  }

  private alignment(neighbors: Boid[]): Vector2 {
    const avgVel: Vector2 = { x: 0, y: 0 };
    let count = 0;

    for (const other of neighbors) {
      avgVel.x += other.velocity.x;
      avgVel.y += other.velocity.y;
      count++;
    }

    if (count > 0) {
      avgVel.x /= count;
      avgVel.y /= count;
      avgVel.x -= this.velocity.x;
      avgVel.y -= this.velocity.y;
    }

    return avgVel;
  }

  private cohesion(neighbors: Boid[]): Vector2 {
    const center: Vector2 = { x: 0, y: 0 };
    let count = 0;

    for (const other of neighbors) {
      center.x += other.position.x;
      center.y += other.position.y;
      count++;
    }

    if (count > 0) {
      center.x /= count;
      center.y /= count;
      center.x -= this.position.x;
      center.y -= this.position.y;
    }

    return center;
  }

  private avoidObstacles(obstacles: Obstacle[]): Vector2 {
    const steer: Vector2 = { x: 0, y: 0 };
    const aheadDist = 30;
    const ahead = {
      x: this.position.x + this.normalize(this.velocity).x * aheadDist,
      y: this.position.y + this.normalize(this.velocity).y * aheadDist,
    };

    for (const obs of obstacles) {
      const d1 = this.distance(this.position, { x: obs.x, y: obs.y });
      const d2 = this.distance(ahead, { x: obs.x, y: obs.y });
      const threshold = obs.radius + obs.avoidRadius;

      if (d1 < threshold || d2 < threshold) {
        const angleOffset = (60 * Math.PI) / 180;
        const currentAngle = Math.atan2(this.velocity.y, this.velocity.x);

        const leftDir = {
          x: Math.cos(currentAngle - angleOffset),
          y: Math.sin(currentAngle - angleOffset),
        };
        const rightDir = {
          x: Math.cos(currentAngle + angleOffset),
          y: Math.sin(currentAngle + angleOffset),
        };

        const leftPoint = {
          x: this.position.x + leftDir.x * aheadDist * 2,
          y: this.position.y + leftDir.y * aheadDist * 2,
        };
        const rightPoint = {
          x: this.position.x + rightDir.x * aheadDist * 2,
          y: this.position.y + rightDir.y * aheadDist * 2,
        };

        const leftDist = this.distance(leftPoint, { x: obs.x, y: obs.y });
        const rightDist = this.distance(rightPoint, { x: obs.x, y: obs.y });

        const chosenDir = leftDist > rightDist ? leftDir : rightDir;
        const strength = 1 - Math.min(d1, d2) / threshold;
        steer.x += chosenDir.x * strength * 2;
        steer.y += chosenDir.y * strength * 2;
      }
    }

    return steer;
  }

  private seekFood(foods: Food[]): Vector2 {
    let nearest: Food | null = null;
    let nearestDist = Infinity;

    for (const food of foods) {
      const d = this.distance(this.position, { x: food.x, y: food.y });
      if (d < nearestDist) {
        nearestDist = d;
        nearest = food;
      }
    }

    this.targetFood = nearest;

    if (!nearest) return { x: 0, y: 0 };

    if (nearestDist < nearest.radius + 8) {
      this.isEating = true;
      this.eatTimer = EAT_DURATION;
      return { x: 0, y: 0 };
    }

    const desired = {
      x: nearest.x - this.position.x,
      y: nearest.y - this.position.y,
    };
    const norm = this.normalize(desired);
    return { x: norm.x * this.speed, y: norm.y * this.speed };
  }

  update(
    allBoids: Boid[],
    obstacles: Obstacle[],
    foods: Food[],
    weights: Weights,
    bounds: { width: number; height: number },
    dt: number
  ): void {
    if (this.isEating) {
      this.eatTimer -= dt;
      if (this.eatTimer <= 0) {
        this.isEating = false;
      }
      return;
    }

    const neighbors: Boid[] = [];
    for (const other of allBoids) {
      if (other === this) continue;
      if (this.distance(this.position, other.position) < this.viewRadius) {
        neighbors.push(other);
      }
    }
    this.neighborCount = neighbors.length;

    const foodSteer = this.seekFood(foods);
    const hasFoodTarget = foodSteer.x !== 0 || foodSteer.y !== 0;

    let accel: Vector2;

    if (hasFoodTarget || this.targetFood) {
      accel = {
        x: foodSteer.x * 2,
        y: foodSteer.y * 2,
      };
    } else {
      const sepSteer = this.separation(neighbors);
      const aliSteer = this.alignment(neighbors);
      const cohSteer = this.cohesion(neighbors);
      const obsSteer = this.avoidObstacles(obstacles);

      accel = {
        x: sepSteer.x * weights.separation +
           aliSteer.x * weights.alignment +
           cohSteer.x * weights.cohesion +
           obsSteer.x * 3,
        y: sepSteer.y * weights.separation +
           aliSteer.y * weights.alignment +
           cohSteer.y * weights.cohesion +
           obsSteer.y * 3,
      };
    }

    this.velocity.x += accel.x * 0.05;
    this.velocity.y += accel.y * 0.05;

    const limited = this.limitVector(this.velocity, this.speed * 1.5);
    const velMag = Math.sqrt(limited.x * limited.x + limited.y * limited.y);
    if (velMag < this.speed * 0.5 && velMag > 0) {
      this.velocity.x = (limited.x / velMag) * this.speed * 0.5;
      this.velocity.y = (limited.y / velMag) * this.speed * 0.5;
    } else {
      this.velocity = limited;
    }

    this.position.x += this.velocity.x;
    this.position.y += this.velocity.y;

    if (this.position.x < 0) this.position.x = bounds.width;
    if (this.position.x > bounds.width) this.position.x = 0;
    if (this.position.y < 0) this.position.y = bounds.height;
    if (this.position.y > bounds.height) this.position.y = 0;

    const vMag = Math.sqrt(this.velocity.x * this.velocity.x + this.velocity.y * this.velocity.y);
    if (vMag > 0) {
      this.heading = Math.atan2(this.velocity.y, this.velocity.x);
    }

    this.addTrailPoint();
  }

  getSpeedScalar(): number {
    return Math.sqrt(this.velocity.x * this.velocity.x + this.velocity.y * this.velocity.y);
  }
}
