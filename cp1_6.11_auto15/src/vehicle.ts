import type { Direction } from './trafficLight';
import type { TrafficLightController } from './trafficLight';

export type LaneType = 'straight' | 'left';

export interface VehicleConfig {
  maxSpeed: number;
  acceleration: number;
  deceleration: number;
  width: number;
  height: number;
}

const VEHICLE_COLORS = [
  '#ff8c42',
  '#ff6b35',
  '#ffa62b',
  '#ff7f50',
  '#f7931e',
  '#ff9f43',
  '#ee5a24',
  '#fa8231'
];

const DEFAULT_CONFIG: VehicleConfig = {
  maxSpeed: 120,
  acceleration: 80,
  deceleration: 150,
  width: 24,
  height: 36
};

export interface Point {
  x: number;
  y: number;
}

export class Vehicle {
  id: number;
  direction: Direction;
  lane: LaneType;
  x: number;
  y: number;
  speed: number;
  maxSpeed: number;
  acceleration: number;
  deceleration: number;
  width: number;
  height: number;
  color: string;
  angle: number;
  path: Point[];
  pathIndex: number;
  isWaiting: boolean;
  waitStartTime: number;
  totalWaitTime: number;
  hasPassedIntersection: boolean;
  isActive: boolean;
  config: VehicleConfig;

  private static nextId = 0;

  constructor(
    direction: Direction,
    lane: LaneType,
    startX: number,
    startY: number,
    path: Point[],
    config: Partial<VehicleConfig> = {}
  ) {
    this.id = Vehicle.nextId++;
    this.direction = direction;
    this.lane = lane;
    this.x = startX;
    this.y = startY;
    this.speed = 0;
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.maxSpeed = this.config.maxSpeed;
    this.acceleration = this.config.acceleration;
    this.deceleration = this.config.deceleration;
    this.width = this.config.width;
    this.height = this.config.height;
    this.color = VEHICLE_COLORS[Math.floor(Math.random() * VEHICLE_COLORS.length)];
    this.angle = this.getInitialAngle(direction);
    this.path = path;
    this.pathIndex = 0;
    this.isWaiting = false;
    this.waitStartTime = 0;
    this.totalWaitTime = 0;
    this.hasPassedIntersection = false;
    this.isActive = true;
  }

  private getInitialAngle(direction: Direction): number {
    switch (direction) {
      case 'east': return 0;
      case 'south': return Math.PI / 2;
      case 'west': return Math.PI;
      case 'north': return -Math.PI / 2;
    }
  }

  update(
    deltaTime: number,
    lightController: TrafficLightController,
    vehicles: Vehicle[],
    intersectionCenter: Point,
    intersectionSize: number
  ): void {
    if (!this.isActive) return;

    const shouldStop = this.shouldStop(lightController, vehicles, intersectionCenter, intersectionSize);

    if (shouldStop) {
      this.decelerate(deltaTime);
      if (!this.isWaiting && this.speed < 5) {
        this.isWaiting = true;
        this.waitStartTime = performance.now() / 1000;
      }
    } else {
      if (this.isWaiting) {
        const waitEndTime = performance.now() / 1000;
        this.totalWaitTime += waitEndTime - this.waitStartTime;
        this.isWaiting = false;
      }
      this.accelerate(deltaTime);
    }

    this.moveAlongPath(deltaTime);
    this.checkIntersectionPassed(intersectionCenter, intersectionSize);
  }

  private shouldStop(
    lightController: TrafficLightController,
    vehicles: Vehicle[],
    intersectionCenter: Point,
    intersectionSize: number
  ): boolean {
    if (this.hasPassedIntersection) {
      return this.checkCollisionWithFrontVehicle(vehicles);
    }

    const canPass = lightController.canPass(this.direction);
    const distToIntersection = this.getDistanceToIntersection(intersectionCenter, intersectionSize);

    if (!canPass && distToIntersection < 100 && distToIntersection >= 0) {
      return true;
    }

    return this.checkCollisionWithFrontVehicle(vehicles);
  }

  private getDistanceToIntersection(intersectionCenter: Point, intersectionSize: number): number {
    const halfSize = intersectionSize / 2;

    switch (this.direction) {
      case 'east':
        return (intersectionCenter.x - halfSize) - this.x;
      case 'west':
        return this.x - (intersectionCenter.x + halfSize);
      case 'south':
        return (intersectionCenter.y - halfSize) - this.y;
      case 'north':
        return this.y - (intersectionCenter.y + halfSize);
    }
  }

  private checkCollisionWithFrontVehicle(vehicles: Vehicle[]): boolean {
    const safeDistance = this.height + 15;
    let minDistance = Infinity;

    for (const other of vehicles) {
      if (other.id === this.id || !other.isActive) continue;
      if (other.direction !== this.direction || other.lane !== this.lane) continue;
      if (other.pathIndex < this.pathIndex) continue;

      const distance = this.getDistanceTo(other);
      if (distance >= 0 && distance < minDistance) {
        minDistance = distance;
      }
    }

    return minDistance < safeDistance;
  }

  private getDistanceTo(other: Vehicle): number {
    switch (this.direction) {
      case 'east':
        return other.x - this.x;
      case 'west':
        return this.x - other.x;
      case 'south':
        return other.y - this.y;
      case 'north':
        return this.y - other.y;
    }
  }

  private accelerate(deltaTime: number): void {
    this.speed = Math.min(this.speed + this.acceleration * deltaTime, this.maxSpeed);
  }

  private decelerate(deltaTime: number): void {
    this.speed = Math.max(this.speed - this.deceleration * deltaTime, 0);
  }

  private moveAlongPath(deltaTime: number): void {
    if (this.pathIndex >= this.path.length - 1) {
      this.isActive = false;
      return;
    }

    const currentTarget = this.path[this.pathIndex + 1];
    const dx = currentTarget.x - this.x;
    const dy = currentTarget.y - this.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance < 5) {
      this.pathIndex++;
      if (this.pathIndex < this.path.length - 1) {
        this.updateAngle(this.path[this.pathIndex], this.path[this.pathIndex + 1]);
      }
      return;
    }

    const moveDistance = this.speed * deltaTime;
    const ratio = Math.min(moveDistance / distance, 1);

    this.x += dx * ratio;
    this.y += dy * ratio;

    if (this.lane === 'left') {
      this.updateAngle(this.path[this.pathIndex], currentTarget);
    }
  }

  private updateAngle(from: Point, to: Point): void {
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    this.angle = Math.atan2(dy, dx);
  }

  private checkIntersectionPassed(intersectionCenter: Point, intersectionSize: number): void {
    if (this.hasPassedIntersection) return;

    const halfSize = intersectionSize / 2;
    const left = intersectionCenter.x - halfSize;
    const right = intersectionCenter.x + halfSize;
    const top = intersectionCenter.y - halfSize;
    const bottom = intersectionCenter.y + halfSize;

    let passed = false;
    switch (this.direction) {
      case 'east':
        passed = this.x > right;
        break;
      case 'west':
        passed = this.x < left;
        break;
      case 'south':
        passed = this.y > bottom;
        break;
      case 'north':
        passed = this.y < top;
        break;
    }

    if (passed) {
      this.hasPassedIntersection = true;
    }
  }

  getTotalWaitTime(): number {
    if (this.isWaiting) {
      const currentTime = performance.now() / 1000;
      return this.totalWaitTime + (currentTime - this.waitStartTime);
    }
    return this.totalWaitTime;
  }

  render(ctx: CanvasRenderingContext2D, scale: number): void {
    if (!this.isActive) return;

    ctx.save();
    ctx.translate(this.x * scale, this.y * scale);
    ctx.rotate(this.angle);

    const w = this.width * scale;
    const h = this.height * scale;

    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.roundRect(-w / 2, -h / 2, w, h, 4 * scale);
    ctx.fill();

    ctx.shadowColor = this.color;
    ctx.shadowBlur = 8 * scale;
    ctx.beginPath();
    ctx.roundRect(-w / 2, -h / 2, w, h, 4 * scale);
    ctx.fill();
    ctx.shadowBlur = 0;

    ctx.fillStyle = '#1a1f2e';
    const windowW = w * 0.7;
    const windowH = h * 0.25;
    ctx.fillRect(-windowW / 2, -h / 2 + h * 0.15, windowW, windowH);
    ctx.fillRect(-windowW / 2, h / 2 - h * 0.35, windowW, windowH);

    ctx.fillStyle = '#ffd93d';
    const lightSize = 4 * scale;
    ctx.fillRect(-w / 2 + 2 * scale, -h / 2 + 2 * scale, lightSize, lightSize);
    ctx.fillRect(w / 2 - 2 * scale - lightSize, -h / 2 + 2 * scale, lightSize, lightSize);

    if (this.speed < 5) {
      ctx.fillStyle = '#ff4757';
      ctx.fillRect(-w / 2 + 2 * scale, h / 2 - 2 * scale - lightSize, lightSize, lightSize);
      ctx.fillRect(w / 2 - 2 * scale - lightSize, h / 2 - 2 * scale - lightSize, lightSize, lightSize);
    }

    ctx.restore();
  }
}

export class VehicleManager {
  private vehicles: Vehicle[] = [];
  private spawnTimers: Record<string, number> = {};
  private readonly maxVehicles: number = 50;

  constructor() {
    this.initializeSpawnTimers();
  }

  private initializeSpawnTimers(): void {
    const directions: Direction[] = ['east', 'south', 'west', 'north'];
    const lanes: LaneType[] = ['straight', 'left'];
    
    directions.forEach(dir => {
      lanes.forEach(lane => {
        this.spawnTimers[`${dir}-${lane}`] = Math.random() * 2;
      });
    });
  }

  update(
    deltaTime: number,
    lightController: TrafficLightController,
    intersectionCenter: Point,
    intersectionSize: number,
    canvasSize: number
  ): void {
    this.spawnVehicles(deltaTime, intersectionCenter, intersectionSize, canvasSize);

    for (const vehicle of this.vehicles) {
      vehicle.update(deltaTime, lightController, this.vehicles, intersectionCenter, intersectionSize);
    }

    this.vehicles = this.vehicles.filter(v => v.isActive);
  }

  private spawnVehicles(
    deltaTime: number,
    intersectionCenter: Point,
    intersectionSize: number,
    canvasSize: number
  ): void {
    if (this.vehicles.length >= this.maxVehicles) return;

    const directions: Direction[] = ['east', 'south', 'west', 'north'];
    const lanes: LaneType[] = ['straight', 'left'];

    directions.forEach(dir => {
      lanes.forEach(lane => {
        const key = `${dir}-${lane}`;
        this.spawnTimers[key] -= deltaTime;

        if (this.spawnTimers[key] <= 0) {
          if (this.canSpawn(dir, lane, intersectionCenter, intersectionSize, canvasSize)) {
            const vehicle = this.createVehicle(dir, lane, intersectionCenter, intersectionSize, canvasSize);
            this.vehicles.push(vehicle);
          }
          this.spawnTimers[key] = 1 + Math.random() * 3;
        }
      });
    });
  }

  private canSpawn(
    direction: Direction,
    lane: LaneType,
    intersectionCenter: Point,
    intersectionSize: number,
    canvasSize: number
  ): boolean {
    const spawnPos = this.getSpawnPosition(direction, lane, intersectionCenter, intersectionSize, canvasSize);
    const safeDistance = 60;

    for (const vehicle of this.vehicles) {
      if (vehicle.direction !== direction || vehicle.lane !== lane) continue;
      
      const dx = vehicle.x - spawnPos.x;
      const dy = vehicle.y - spawnPos.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      if (distance < safeDistance) return false;
    }

    return true;
  }

  private getSpawnPosition(
    direction: Direction,
    lane: LaneType,
    intersectionCenter: Point,
    intersectionSize: number,
    canvasSize: number
  ): Point {
    const laneOffset = intersectionSize / 4;
    const edgeOffset = 50;

    switch (direction) {
      case 'east':
        return {
          x: -edgeOffset,
          y: intersectionCenter.y + (lane === 'straight' ? -laneOffset : laneOffset)
        };
      case 'west':
        return {
          x: canvasSize + edgeOffset,
          y: intersectionCenter.y + (lane === 'straight' ? laneOffset : -laneOffset)
        };
      case 'south':
        return {
          x: intersectionCenter.x + (lane === 'straight' ? -laneOffset : laneOffset),
          y: -edgeOffset
        };
      case 'north':
        return {
          x: intersectionCenter.x + (lane === 'straight' ? laneOffset : -laneOffset),
          y: canvasSize + edgeOffset
        };
    }
  }

  private createVehicle(
    direction: Direction,
    lane: LaneType,
    intersectionCenter: Point,
    intersectionSize: number,
    canvasSize: number
  ): Vehicle {
    const spawnPos = this.getSpawnPosition(direction, lane, intersectionCenter, intersectionSize, canvasSize);
    const path = this.generatePath(direction, lane, intersectionCenter, intersectionSize, canvasSize);
    
    return new Vehicle(direction, lane, spawnPos.x, spawnPos.y, path);
  }

  private generatePath(
    direction: Direction,
    lane: LaneType,
    intersectionCenter: Point,
    intersectionSize: number,
    canvasSize: number
  ): Point[] {
    const laneOffset = intersectionSize / 4;
    const halfSize = intersectionSize / 2;
    const edgeOffset = 50;

    if (lane === 'straight') {
      switch (direction) {
        case 'east':
          return [
            { x: -edgeOffset, y: intersectionCenter.y - laneOffset },
            { x: canvasSize + edgeOffset, y: intersectionCenter.y - laneOffset }
          ];
        case 'west':
          return [
            { x: canvasSize + edgeOffset, y: intersectionCenter.y + laneOffset },
            { x: -edgeOffset, y: intersectionCenter.y + laneOffset }
          ];
        case 'south':
          return [
            { x: intersectionCenter.x - laneOffset, y: -edgeOffset },
            { x: intersectionCenter.x - laneOffset, y: canvasSize + edgeOffset }
          ];
        case 'north':
          return [
            { x: intersectionCenter.x + laneOffset, y: canvasSize + edgeOffset },
            { x: intersectionCenter.x + laneOffset, y: -edgeOffset }
          ];
      }
    } else {
      const turnRadius = intersectionSize / 3;
      
      switch (direction) {
        case 'east':
          return [
            { x: -edgeOffset, y: intersectionCenter.y + laneOffset },
            { x: intersectionCenter.x - halfSize, y: intersectionCenter.y + laneOffset },
            { x: intersectionCenter.x + turnRadius, y: intersectionCenter.y + laneOffset },
            { x: intersectionCenter.x + laneOffset, y: intersectionCenter.y + turnRadius },
            { x: intersectionCenter.x + laneOffset, y: canvasSize + edgeOffset }
          ];
        case 'west':
          return [
            { x: canvasSize + edgeOffset, y: intersectionCenter.y - laneOffset },
            { x: intersectionCenter.x + halfSize, y: intersectionCenter.y - laneOffset },
            { x: intersectionCenter.x - turnRadius, y: intersectionCenter.y - laneOffset },
            { x: intersectionCenter.x - laneOffset, y: intersectionCenter.y - turnRadius },
            { x: intersectionCenter.x - laneOffset, y: -edgeOffset }
          ];
        case 'south':
          return [
            { x: intersectionCenter.x + laneOffset, y: -edgeOffset },
            { x: intersectionCenter.x + laneOffset, y: intersectionCenter.y - halfSize },
            { x: intersectionCenter.x + laneOffset, y: intersectionCenter.y + turnRadius },
            { x: intersectionCenter.x - turnRadius, y: intersectionCenter.y + laneOffset },
            { x: -edgeOffset, y: intersectionCenter.y + laneOffset }
          ];
        case 'north':
          return [
            { x: intersectionCenter.x - laneOffset, y: canvasSize + edgeOffset },
            { x: intersectionCenter.x - laneOffset, y: intersectionCenter.y + halfSize },
            { x: intersectionCenter.x - laneOffset, y: intersectionCenter.y - turnRadius },
            { x: intersectionCenter.x + turnRadius, y: intersectionCenter.y - laneOffset },
            { x: canvasSize + edgeOffset, y: intersectionCenter.y - laneOffset }
          ];
      }
    }
  }

  getVehicles(): Vehicle[] {
    return this.vehicles;
  }

  getVehicleCount(): number {
    return this.vehicles.length;
  }

  getWaitingVehicles(): Vehicle[] {
    return this.vehicles.filter(v => v.isWaiting);
  }

  getVehiclesByDirection(direction: Direction): Vehicle[] {
    return this.vehicles.filter(v => v.direction === direction);
  }

  render(ctx: CanvasRenderingContext2D, scale: number): void {
    for (const vehicle of this.vehicles) {
      vehicle.render(ctx, scale);
    }
  }

  clear(): void {
    this.vehicles = [];
    this.initializeSpawnTimers();
  }
}
