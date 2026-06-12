import { PheromoneSystem } from './PheromoneSystem';

export enum AntState {
  EXPLORING = 'exploring',
  CARRYING = 'carrying',
  RETURNING = 'returning'
}

export interface FoodSource {
  x: number;
  y: number;
  radius: number;
  amount: number;
  pulsePhase: number;
}

export interface Obstacle {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface AntLogEntry {
  frame: number;
  x: number;
  y: number;
  state: AntState;
}

export class AntAgent {
  x: number;
  y: number;
  angle: number;
  state: AntState;
  speed: number = 2;
  size: number = 6;
  private nestX: number;
  private nestY: number;
  private wobblePhase: number;
  private antennaShakeTime: number = 0;
  private pathMemory: { x: number; y: number }[] = [];
  private memoryIndex: number = 0;
  private canvasWidth: number;
  private canvasHeight: number;
  private avoidTimer: number = 0;
  private avoidDirection: number = 1;

  constructor(
    nestX: number,
    nestY: number,
    canvasWidth: number,
    canvasHeight: number
  ) {
    this.x = nestX;
    this.y = nestY;
    this.nestX = nestX;
    this.nestY = nestY;
    this.angle = Math.random() * Math.PI * 2 - Math.PI;
    this.state = AntState.EXPLORING;
    this.wobblePhase = Math.random() * Math.PI * 2;
    this.canvasWidth = canvasWidth;
    this.canvasHeight = canvasHeight;
  }

  update(
    pheromoneSystem: PheromoneSystem,
    foods: FoodSource[],
    obstacles: Obstacle[],
    frame: number
  ): { collected: boolean; deposited: boolean } {
    this.wobblePhase += 0.3;

    if (this.antennaShakeTime > 0) {
      this.antennaShakeTime--;
    }

    let result = { collected: false, deposited: false };

    if (this.state === AntState.EXPLORING) {
      this.explore(pheromoneSystem, obstacles);

      for (const food of foods) {
        const dx = this.x - food.x;
        const dy = this.y - food.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < food.radius + this.size / 2) {
          if (food.amount > 0) {
            food.amount--;
            this.state = AntState.RETURNING;
            this.antennaShakeTime = 12;
            this.pathMemory = [];
            this.memoryIndex = 0;
            result.collected = true;
            this.angle = Math.atan2(this.nestY - this.y, this.nestX - this.x);
          }
          break;
        }
      }
    } else if (this.state === AntState.RETURNING) {
      this.returnToNest(pheromoneSystem, obstacles);

      const dx = this.x - this.nestX;
      const dy = this.y - this.nestY;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < 20) {
        this.state = AntState.EXPLORING;
        this.angle = Math.random() * Math.PI * 2 - Math.PI;
        this.pathMemory = [];
        result.deposited = true;
      }
    }

    if (frame % 3 === 0 && this.state !== AntState.EXPLORING) {
      const strength = this.state === AntState.RETURNING ? 0.6 : 0.3;
      pheromoneSystem.addTrail(this.x, this.y, strength);
    }

    return result;
  }

  private explore(pheromoneSystem: PheromoneSystem, obstacles: Obstacle[]): void {
    if (this.detectObstacle(obstacles)) {
      this.avoidObstacle(obstacles);
    } else {
      this.avoidTimer = 0;

      const pheromoneStrength = pheromoneSystem.sampleConcentration(
        this.x + Math.cos(this.angle) * 10,
        this.y + Math.sin(this.angle) * 10,
        20
      );

      if (pheromoneStrength > 0.05 && Math.random() < 0.7) {
        const leftStrength = pheromoneSystem.sampleConcentration(
          this.x + Math.cos(this.angle - 0.5) * 15,
          this.y + Math.sin(this.angle - 0.5) * 15,
          15
        );
        const rightStrength = pheromoneSystem.sampleConcentration(
          this.x + Math.cos(this.angle + 0.5) * 15,
          this.y + Math.sin(this.angle + 0.5) * 15,
          15
        );

        if (leftStrength > rightStrength) {
          this.angle -= 0.15;
        } else {
          this.angle += 0.15;
        }
      } else {
        this.angle += (Math.random() - 0.5) * 0.4;
      }
    }

    const wobble = Math.sin(this.wobblePhase) * 0.1;
    this.x += Math.cos(this.angle + wobble) * this.speed;
    this.y += Math.sin(this.angle + wobble) * this.speed;

    this.boundaryCheck();
  }

  private returnToNest(pheromoneSystem: PheromoneSystem, obstacles: Obstacle[]): void {
    if (this.detectObstacle(obstacles)) {
      this.avoidObstacle(obstacles);
    } else {
      this.avoidTimer = 0;
      const targetAngle = Math.atan2(this.nestY - this.y, this.nestX - this.x);
      let angleDiff = targetAngle - this.angle;

      while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
      while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

      this.angle += angleDiff * 0.1;

      const leftStrength = pheromoneSystem.sampleConcentration(
        this.x + Math.cos(this.angle - 0.5) * 15,
        this.y + Math.sin(this.angle - 0.5) * 15,
        15
      );
      const rightStrength = pheromoneSystem.sampleConcentration(
        this.x + Math.cos(this.angle + 0.5) * 15,
        this.y + Math.sin(this.angle + 0.5) * 15,
        15
      );

      if (leftStrength > 0.02 && leftStrength > rightStrength * 1.2) {
        this.angle -= 0.1;
      } else if (rightStrength > 0.02 && rightStrength > leftStrength * 1.2) {
        this.angle += 0.1;
      }
    }

    const wobble = Math.sin(this.wobblePhase) * 0.08;
    this.x += Math.cos(this.angle + wobble) * this.speed;
    this.y += Math.sin(this.angle + wobble) * this.speed;

    this.boundaryCheck();
  }

  private detectObstacle(obstacles: Obstacle[]): boolean {
    const lookAhead = 12;
    const checkX = this.x + Math.cos(this.angle) * lookAhead;
    const checkY = this.y + Math.sin(this.angle) * lookAhead;

    for (const obs of obstacles) {
      if (
        checkX > obs.x - this.size &&
        checkX < obs.x + obs.width + this.size &&
        checkY > obs.y - this.size &&
        checkY < obs.y + obs.height + this.size
      ) {
        return true;
      }
    }
    return false;
  }

  private avoidObstacle(obstacles: Obstacle[]): void {
    if (this.avoidTimer === 0) {
      this.avoidDirection = Math.random() > 0.5 ? 1 : -1;
    }
    this.avoidTimer++;

    const turnAngle = (Math.random() * 0.5 + 0.5) * this.avoidDirection;
    this.angle += turnAngle;
  }

  private boundaryCheck(): void {
    const margin = 5;

    if (this.x < margin) {
      this.x = margin;
      this.angle = Math.PI - this.angle + (Math.random() - 0.5) * 0.5;
    }
    if (this.x > this.canvasWidth - margin) {
      this.x = this.canvasWidth - margin;
      this.angle = Math.PI - this.angle + (Math.random() - 0.5) * 0.5;
    }
    if (this.y < margin) {
      this.y = margin;
      this.angle = -this.angle + (Math.random() - 0.5) * 0.5;
    }
    if (this.y > this.canvasHeight - margin) {
      this.y = this.canvasHeight - margin;
      this.angle = -this.angle + (Math.random() - 0.5) * 0.5;
    }
  }

  getAntennaShakeProgress(): number {
    return this.antennaShakeTime / 12;
  }

  getWobbleOffset(): number {
    return Math.sin(this.wobblePhase) * 1.5;
  }

  reset(): void {
    this.x = this.nestX;
    this.y = this.nestY;
    this.angle = Math.random() * Math.PI * 2 - Math.PI;
    this.state = AntState.EXPLORING;
    this.pathMemory = [];
    this.memoryIndex = 0;
  }
}
