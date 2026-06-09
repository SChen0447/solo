import { Boid, Food, Obstacle, Weights } from './boids';

const INITIAL_BOID_COUNT = 100;
const MAX_FOOD_COUNT = 5;
const OBSTACLE_COUNT = 3;

export interface GroupStats {
  totalCount: number;
  avgSpeed: number;
  clusteringCoeff: number;
}

export class BoidsSimulator {
  boids: Boid[];
  obstacles: Obstacle[];
  foods: Food[];
  weights: Weights;
  bounds: { width: number; height: number };
  stats: GroupStats;

  constructor(width: number, height: number) {
    this.bounds = { width, height };
    this.boids = [];
    this.obstacles = [];
    this.foods = [];
    this.weights = {
      separation: 1.5,
      alignment: 1.0,
      cohesion: 1.0,
    };
    this.stats = {
      totalCount: 0,
      avgSpeed: 0,
      clusteringCoeff: 0,
    };

    this.initializeBoids();
    this.initializeObstacles();
  }

  private initializeBoids(): void {
    for (let i = 0; i < INITIAL_BOID_COUNT; i++) {
      const x = Math.random() * this.bounds.width;
      const y = Math.random() * this.bounds.height;
      this.boids.push(new Boid(x, y));
    }
  }

  private initializeObstacles(): void {
    const minRadius = 25;
    const maxRadius = 40;
    const margin = 80;

    for (let i = 0; i < OBSTACLE_COUNT; i++) {
      let attempts = 0;
      let placed = false;

      while (!placed && attempts < 100) {
        const radius = minRadius + Math.random() * (maxRadius - minRadius);
        const x = margin + Math.random() * (this.bounds.width - margin * 2);
        const y = margin + Math.random() * (this.bounds.height - margin * 2);

        let overlaps = false;
        for (const obs of this.obstacles) {
          const dx = x - obs.x;
          const dy = y - obs.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < radius + obs.radius + 60) {
            overlaps = true;
            break;
          }
        }

        if (!overlaps) {
          this.obstacles.push({
            x,
            y,
            radius,
            avoidRadius: 30,
            isDragging: false,
          });
          placed = true;
        }
        attempts++;
      }

      if (!placed) {
        const radius = minRadius + Math.random() * (maxRadius - minRadius);
        this.obstacles.push({
          x: margin + Math.random() * (this.bounds.width - margin * 2),
          y: margin + Math.random() * (this.bounds.height - margin * 2),
          radius,
          avoidRadius: 30,
          isDragging: false,
        });
      }
    }
  }

  setBounds(width: number, height: number): void {
    this.bounds = { width, height };
  }

  setWeights(weights: Partial<Weights>): void {
    this.weights = { ...this.weights, ...weights };
  }

  addFood(x: number, y: number): void {
    const food: Food = {
      x,
      y,
      radius: 6,
      createdAt: performance.now(),
      pulsePhase: Math.random() * Math.PI * 2,
    };
    this.foods.push(food);
    if (this.foods.length > MAX_FOOD_COUNT) {
      this.foods.shift();
    }
  }

  clearFoods(): void {
    this.foods = [];
    for (const boid of this.boids) {
      boid.targetFood = null;
    }
  }

  getObstacleAt(x: number, y: number): Obstacle | null {
    for (let i = this.obstacles.length - 1; i >= 0; i--) {
      const obs = this.obstacles[i];
      const dx = x - obs.x;
      const dy = y - obs.y;
      if (dx * dx + dy * dy <= obs.radius * obs.radius) {
        return obs;
      }
    }
    return null;
  }

  update(dt: number): void {
    for (const boid of this.boids) {
      boid.update(
        this.boids,
        this.obstacles,
        this.foods,
        this.weights,
        this.bounds,
        dt
      );
    }
    this.updateStats();
  }

  private updateStats(): void {
    let totalSpeed = 0;
    let totalNeighbors = 0;

    for (const boid of this.boids) {
      totalSpeed += boid.getSpeedScalar();
      totalNeighbors += boid.neighborCount;
    }

    const count = this.boids.length;
    this.stats = {
      totalCount: count,
      avgSpeed: count > 0 ? totalSpeed / count : 0,
      clusteringCoeff: count > 0 ? Math.round((totalNeighbors / count) * 100) / 100 : 0,
    };
  }

  getStats(): GroupStats {
    return this.stats;
  }
}
