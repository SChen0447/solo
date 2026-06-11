import type { Direction } from './trafficLight';
import type { VehicleManager } from './vehicle';

export interface StatsData {
  totalVehicles: number;
  averageWaitTimes: Record<Direction, number>;
  congestionIndex: number;
  currentVehicleCount: number;
  waitingVehicleCount: number;
}

export interface StatsCallbacks {
  onTotalVehiclesChange?: (value: number) => void;
  onWaitTimeChange?: (direction: Direction, value: number) => void;
  onCongestionChange?: (value: number) => void;
}

export class StatsTracker {
  private totalPassedVehicles: number = 0;
  private lastPassedIds: Set<number> = new Set();
  private waitTimeHistory: Record<Direction, number[]> = {
    east: [],
    south: [],
    west: [],
    north: []
  };
  private maxHistorySize: number = 50;
  private lastUpdateTime: number = 0;
  private updateInterval: number = 1;
  private callbacks: StatsCallbacks = {};
  private previousValues: {
    totalVehicles: number;
    waitTimes: Record<Direction, number>;
    congestion: number;
  } = {
    totalVehicles: 0,
    waitTimes: { east: 0, south: 0, west: 0, north: 0 },
    congestion: 0
  };

  constructor(callbacks: StatsCallbacks = {}) {
    this.callbacks = callbacks;
  }

  update(currentTime: number, vehicleManager: VehicleManager): void {
    if (currentTime - this.lastUpdateTime < this.updateInterval) return;
    this.lastUpdateTime = currentTime;

    this.updatePassedVehicles(vehicleManager);
    this.updateWaitTimes(vehicleManager);
    this.notifyCallbacks();
  }

  private updatePassedVehicles(vehicleManager: VehicleManager): void {
    const vehicles = vehicleManager.getVehicles();
    const currentPassedIds = new Set<number>();

    for (const vehicle of vehicles) {
      if (vehicle.hasPassedIntersection) {
        currentPassedIds.add(vehicle.id);
        if (!this.lastPassedIds.has(vehicle.id)) {
          this.totalPassedVehicles++;
          this.waitTimeHistory[vehicle.direction].push(vehicle.getTotalWaitTime());
          if (this.waitTimeHistory[vehicle.direction].length > this.maxHistorySize) {
            this.waitTimeHistory[vehicle.direction].shift();
          }
        }
      }
    }

    this.lastPassedIds = currentPassedIds;
  }

  private updateWaitTimes(vehicleManager: VehicleManager): void {
    const activeVehicles = vehicleManager.getVehicles();
    for (const vehicle of activeVehicles) {
      if (vehicle.isWaiting) {
        const waitTime = vehicle.getTotalWaitTime();
        const history = this.waitTimeHistory[vehicle.direction];
        if (history.length > 0) {
          history[history.length - 1] = waitTime;
        }
      }
    }
  }

  private notifyCallbacks(): void {
    const data = this.getStatsData();

    if (this.callbacks.onTotalVehiclesChange && data.totalVehicles !== this.previousValues.totalVehicles) {
      this.callbacks.onTotalVehiclesChange(data.totalVehicles);
      this.previousValues.totalVehicles = data.totalVehicles;
    }

    (['east', 'south', 'west', 'north'] as Direction[]).forEach(direction => {
      const waitTime = data.averageWaitTimes[direction];
      const prevWaitTime = this.previousValues.waitTimes[direction];
      if (this.callbacks.onWaitTimeChange && Math.abs(waitTime - prevWaitTime) > 0.1) {
        this.callbacks.onWaitTimeChange(direction, waitTime);
        this.previousValues.waitTimes[direction] = waitTime;
      }
    });

    if (this.callbacks.onCongestionChange && data.congestionIndex !== this.previousValues.congestion) {
      this.callbacks.onCongestionChange(data.congestionIndex);
      this.previousValues.congestion = data.congestionIndex;
    }
  }

  getStatsData(vehicleManager?: VehicleManager): StatsData {
    const averageWaitTimes = this.calculateAverageWaitTimes();
    const congestionIndex = vehicleManager 
      ? this.calculateCongestionIndex(vehicleManager, averageWaitTimes)
      : this.previousValues.congestion;

    return {
      totalVehicles: this.totalPassedVehicles,
      averageWaitTimes,
      congestionIndex,
      currentVehicleCount: vehicleManager?.getVehicleCount() ?? 0,
      waitingVehicleCount: vehicleManager?.getWaitingVehicles().length ?? 0
    };
  }

  private calculateAverageWaitTimes(): Record<Direction, number> {
    const result: Record<Direction, number> = {
      east: 0,
      south: 0,
      west: 0,
      north: 0
    };

    (['east', 'south', 'west', 'north'] as Direction[]).forEach(direction => {
      const history = this.waitTimeHistory[direction];
      if (history.length > 0) {
        const sum = history.reduce((acc, val) => acc + val, 0);
        result[direction] = Math.round((sum / history.length) * 10) / 10;
      }
    });

    return result;
  }

  private calculateCongestionIndex(
    vehicleManager: VehicleManager,
    averageWaitTimes: Record<Direction, number>
  ): number {
    const totalVehicles = vehicleManager.getVehicleCount();
    const waitingVehicles = vehicleManager.getWaitingVehicles().length;
    const maxVehicles = 50;

    const vehicleRatio = Math.min(totalVehicles / maxVehicles, 1);
    const waitingRatio = totalVehicles > 0 ? waitingVehicles / totalVehicles : 0;
    
    const avgWaitTime = Object.values(averageWaitTimes).reduce((acc, val) => acc + val, 0) / 4;
    const waitTimeFactor = Math.min(avgWaitTime / 30, 1);

    const congestion = (vehicleRatio * 0.3 + waitingRatio * 0.4 + waitTimeFactor * 0.3) * 100;
    
    return Math.min(Math.round(congestion), 100);
  }

  reset(): void {
    this.totalPassedVehicles = 0;
    this.lastPassedIds.clear();
    this.waitTimeHistory = {
      east: [],
      south: [],
      west: [],
      north: []
    };
    this.lastUpdateTime = 0;
    this.previousValues = {
      totalVehicles: 0,
      waitTimes: { east: 0, south: 0, west: 0, north: 0 },
      congestion: 0
    };
  }
}

export class StatsUIUpdater {
  private elements: {
    totalVehicles: HTMLElement;
    eastWait: HTMLElement;
    southWait: HTMLElement;
    westWait: HTMLElement;
    northWait: HTMLElement;
    congestionIndex: HTMLElement;
    fps: HTMLElement;
  };

  constructor() {
    this.elements = {
      totalVehicles: document.getElementById('totalVehicles') as HTMLElement,
      eastWait: document.getElementById('eastWait') as HTMLElement,
      southWait: document.getElementById('southWait') as HTMLElement,
      westWait: document.getElementById('westWait') as HTMLElement,
      northWait: document.getElementById('northWait') as HTMLElement,
      congestionIndex: document.getElementById('congestionIndex') as HTMLElement,
      fps: document.getElementById('fps') as HTMLElement
    };
  }

  updateTotalVehicles(value: number): void {
    if (!this.elements.totalVehicles) return;
    this.animateValueChange(this.elements.totalVehicles, value.toString());
  }

  updateWaitTime(direction: Direction, value: number): void {
    const elementMap: Record<Direction, HTMLElement> = {
      east: this.elements.eastWait,
      south: this.elements.southWait,
      west: this.elements.westWait,
      north: this.elements.northWait
    };
    
    const element = elementMap[direction];
    if (!element) return;
    
    this.animateValueChange(element, `${value.toFixed(1)}s`);
  }

  updateCongestionIndex(value: number): void {
    if (!this.elements.congestionIndex) return;
    
    const element = this.elements.congestionIndex;
    this.animateValueChange(element, value.toString());
    
    if (value >= 80) {
      element.style.color = '#ff4757';
    } else if (value >= 50) {
      element.style.color = '#ffd93d';
    } else {
      element.style.color = '#00ff88';
    }
  }

  updateFPS(fps: number): void {
    if (!this.elements.fps) return;
    this.elements.fps.textContent = `${Math.round(fps)} FPS`;
    
    if (fps >= 50) {
      this.elements.fps.style.color = '#00ff88';
    } else if (fps >= 30) {
      this.elements.fps.style.color = '#ffd93d';
    } else {
      this.elements.fps.style.color = '#ff4757';
    }
  }

  private animateValueChange(element: HTMLElement, newValue: string): void {
    const parent = element.parentElement;
    if (!parent) {
      element.textContent = newValue;
      return;
    }

    parent.classList.add('fade');
    element.textContent = newValue;

    setTimeout(() => {
      parent.classList.remove('fade');
    }, 300);
  }

  updateAll(data: StatsData): void {
    this.updateTotalVehicles(data.totalVehicles);
    this.updateWaitTime('east', data.averageWaitTimes.east);
    this.updateWaitTime('south', data.averageWaitTimes.south);
    this.updateWaitTime('west', data.averageWaitTimes.west);
    this.updateWaitTime('north', data.averageWaitTimes.north);
    this.updateCongestionIndex(data.congestionIndex);
  }
}
