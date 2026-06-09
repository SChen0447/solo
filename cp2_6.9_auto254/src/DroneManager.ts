import type { Planet } from './PlanetNetwork';

export interface TrailPoint {
  x: number;
  y: number;
  alpha: number;
  isSuccess?: boolean;
}

export type DroneState = 'idle' | 'toPickup' | 'loading' | 'toDeliver' | 'unloading' | 'returning';

export interface Drone {
  id: string;
  x: number;
  y: number;
  baseSpeed: number;
  path: string[];
  currentPathIndex: number;
  hasCargo: boolean;
  cargoColor: string;
  state: DroneState;
  trail: TrailPoint[];
  startPlanetId?: string;
  endPlanetId?: string;
  gateStartId?: string;
  rotation: number;
}

const CARGO_COLORS = ['#FF6B9D', '#C084FC', '#FBBF24', '#34D399', '#60A5FA', '#F472B6'];

export class DroneManager {
  drones: Drone[] = [];
  private baseSpeed: number = 3;
  private speedUpgradeLevel: number = 0;
  private maxDrones: number = 5;
  private initialDroneCount: number = 3;
  private maxSpeedUpgrades: number = 3;
  maxExtraDrones: number = 2;

  onCargoDelivered?: () => void;

  constructor(initialX: number, initialY: number) {
    for (let i = 0; i < this.initialDroneCount; i++) {
      this.drones.push(this.createDrone(
        initialX + (i - 1) * 30,
        initialY,
        i
      ));
    }
  }

  private createDrone(x: number, y: number, index: number): Drone {
    return {
      id: `drone-${index}-${Date.now()}`,
      x,
      y,
      baseSpeed: this.baseSpeed,
      path: [],
      currentPathIndex: 0,
      hasCargo: false,
      cargoColor: '#FFFFFF',
      state: 'idle',
      trail: [],
      rotation: 0
    };
  }

  getCurrentSpeed(): number {
    return this.baseSpeed + this.speedUpgradeLevel;
  }

  getSpeedUpgradeLevel(): number {
    return this.speedUpgradeLevel;
  }

  getMaxSpeedUpgrades(): number {
    return this.maxSpeedUpgrades;
  }

  canUpgradeSpeed(): boolean {
    return this.speedUpgradeLevel < this.maxSpeedUpgrades;
  }

  upgradeSpeed(): boolean {
    if (!this.canUpgradeSpeed()) return false;
    this.speedUpgradeLevel++;
    for (const drone of this.drones) {
      drone.baseSpeed = this.baseSpeed + this.speedUpgradeLevel;
    }
    return true;
  }

  getDroneCount(): number {
    return this.drones.length;
  }

  getMaxDroneCount(): number {
    return this.maxDrones;
  }

  canAddDrone(): boolean {
    return this.drones.length < this.maxDrones;
  }

  addDrone(x: number, y: number): boolean {
    if (!this.canAddDrone()) return false;
    this.drones.push(this.createDrone(x, y, this.drones.length));
    return true;
  }

  getIdleDrone(): Drone | null {
    return this.drones.find(d => d.state === 'idle') || null;
  }

  dispatchDrone(
    drone: Drone,
    gateStartId: string,
    startPlanetId: string,
    endPlanetId: string,
    pathFromGateToStart: string[],
    pathFromStartToEnd: string[]
  ): boolean {
    if (drone.state !== 'idle') return false;

    drone.gateStartId = gateStartId;
    drone.startPlanetId = startPlanetId;
    drone.endPlanetId = endPlanetId;
    drone.path = [...pathFromGateToStart];
    drone.currentPathIndex = 0;
    drone.state = 'toPickup';
    drone.hasCargo = false;
    drone.trail = [];
    drone.cargoColor = CARGO_COLORS[Math.floor(Math.random() * CARGO_COLORS.length)];

    return true;
  }

  update(
    planets: Planet[],
    getPlanet: (id: string) => Planet | undefined,
    dt: number
  ): void {
    for (const drone of this.drones) {
      this.updateDrone(drone, planets, getPlanet, dt);
    }
  }

  private updateDrone(
    drone: Drone,
    planets: Planet[],
    getPlanet: (id: string) => Planet | undefined,
    dt: number
  ): void {
    this.updateTrail(drone);

    if (drone.state === 'idle') return;

    if (drone.state === 'loading' || drone.state === 'unloading') {
      return;
    }

    if (drone.path.length === 0 || drone.currentPathIndex >= drone.path.length) {
      this.reachedPathEnd(drone, getPlanet);
      return;
    }

    const nextPlanetId = drone.path[drone.currentPathIndex];
    const nextPlanet = getPlanet(nextPlanetId);
    if (!nextPlanet) return;

    const dx = nextPlanet.x - drone.x;
    const dy = nextPlanet.y - drone.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < 2) {
      drone.x = nextPlanet.x;
      drone.y = nextPlanet.y;
      drone.currentPathIndex++;
      this.reachedPathEnd(drone, getPlanet);
      return;
    }

    const speed = drone.hasCargo ? (drone.baseSpeed * 0.5) : drone.baseSpeed;
    const adjustedSpeed = speed * (dt / 16.67);
    const moveX = (dx / dist) * adjustedSpeed;
    const moveY = (dy / dist) * adjustedSpeed;

    drone.x += moveX;
    drone.y += moveY;
    drone.rotation = Math.atan2(dy, dx);

    if (drone.trail.length === 0 ||
        Math.abs(drone.trail[drone.trail.length - 1].x - drone.x) > 3 ||
        Math.abs(drone.trail[drone.trail.length - 1].y - drone.y) > 3) {
      drone.trail.push({ x: drone.x, y: drone.y, alpha: 1 });
      if (drone.trail.length > 30) drone.trail.shift();
    }
  }

  private updateTrail(drone: Drone): void {
    for (const t of drone.trail) {
      t.alpha -= 0.02;
    }
    drone.trail = drone.trail.filter(t => t.alpha > 0);
  }

  private reachedPathEnd(
    drone: Drone,
    getPlanet: (id: string) => Planet | undefined
  ): void {
    if (drone.state === 'toPickup') {
      drone.state = 'loading';
      setTimeout(() => {
        drone.hasCargo = true;
        if (drone.startPlanetId && drone.endPlanetId) {
          const pickupPlanet = getPlanet(drone.startPlanetId);
          const endPlanet = getPlanet(drone.endPlanetId);
          if (pickupPlanet && endPlanet && pickupPlanet.cargoBacklog > 0) {
            pickupPlanet.cargoBacklog--;
          }
          drone.state = 'toDeliver';
          const fullPath = this.buildPathFromTo(drone.startPlanetId, drone.endPlanetId, getPlanet);
          if (fullPath) {
            drone.path = fullPath;
            drone.currentPathIndex = 1;
          }
        }
      }, 200);
    } else if (drone.state === 'toDeliver') {
      drone.state = 'unloading';
      setTimeout(() => {
        drone.hasCargo = false;
        const deliveredPlanet = getPlanet(drone.endPlanetId!);
        if (deliveredPlanet) {
          deliveredPlanet.cargoBacklog = Math.min(
            deliveredPlanet.cargoBacklog + 1,
            deliveredPlanet.maxBacklog
          );
        }
        this.onCargoDelivered?.();
        if (drone.gateStartId) {
          drone.state = 'returning';
          const returnPath = this.buildPathFromTo(drone.endPlanetId!, drone.gateStartId, getPlanet);
          if (returnPath) {
            drone.path = returnPath;
            drone.currentPathIndex = 1;
          }
        } else {
          this.resetDrone(drone);
        }
      }, 200);
    } else if (drone.state === 'returning') {
      this.resetDrone(drone);
    }
  }

  private buildPathFromTo(
    fromId: string,
    toId: string,
    _getPlanet: (id: string) => Planet | undefined
  ): string[] | null {
    return [fromId, toId];
  }

  resetDrone(drone: Drone): void {
    drone.state = 'idle';
    drone.path = [];
    drone.currentPathIndex = 0;
    drone.hasCargo = false;
    drone.startPlanetId = undefined;
    drone.endPlanetId = undefined;
    drone.gateStartId = undefined;
  }

  resetAll(centralX: number, centralY: number): void {
    this.drones = [];
    this.speedUpgradeLevel = 0;
    for (let i = 0; i < this.initialDroneCount; i++) {
      this.drones.push(this.createDrone(
        centralX + (i - 1) * 30,
        centralY,
        i
      ));
    }
  }
}
