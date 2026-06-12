export interface Intersection {
  id: string;
  x: number;
  y: number;
  gridX: number;
  gridY: number;
}

export interface Road {
  id: string;
  from: string;
  to: string;
  direction: 'horizontal' | 'vertical';
}

export interface Network {
  intersections: Intersection[];
  roads: Road[];
}

export interface Vehicle {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  speed: number;
  currentRoad: string;
  direction: number;
  stopped: boolean;
  waitingAt: string | null;
}

export interface Signal {
  id: string;
  horizontalDuration: number;
  verticalDuration: number;
  state: 'green' | 'yellow' | 'red';
  activeDirection: 'horizontal' | 'vertical';
  remainingTime: number;
  x: number;
  y: number;
}

export interface TrafficData {
  vehicles: Vehicle[];
  avgSpeed: number;
  congestionIndex: number;
  timestamp: number;
}

export interface SignalData {
  signals: Signal[];
  timestamp: number;
}

export interface StatsPoint {
  time: string;
  avgSpeed: number;
  congestionIndex: number;
  throughput: number;
}

export interface ControlSettings {
  selectedIntersection: string;
  signalDuration: number;
  density: number;
}
