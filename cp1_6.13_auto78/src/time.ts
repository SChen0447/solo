import * as THREE from 'three';

export type TimePeriod = 'morning' | 'noon' | 'evening' | 'night';

export interface TimeState {
  currentPeriod: TimePeriod;
  particleCount: number;
  trainSpeedMultiplier: number;
  trainDensityMultiplier: number;
  indicatorColor: THREE.Color;
  particleColorStart: THREE.Color;
  particleColorEnd: THREE.Color;
  label: string;
}

type TimeCallback = (state: TimeState, prevState: TimeState) => void;

const PERIOD_CONFIGS: Record<TimePeriod, Omit<TimeState, 'currentPeriod'>> = {
  morning: {
    particleCount: 4000,
    trainSpeedMultiplier: 1.0,
    trainDensityMultiplier: 1.0,
    indicatorColor: new THREE.Color(0xff6b35),
    particleColorStart: new THREE.Color(0x00ffff),
    particleColorEnd: new THREE.Color(0xff6600),
    label: '早高峰'
  },
  noon: {
    particleCount: 2000,
    trainSpeedMultiplier: 1.0,
    trainDensityMultiplier: 1.0,
    indicatorColor: new THREE.Color(0x00d2ff),
    particleColorStart: new THREE.Color(0x00ffff),
    particleColorEnd: new THREE.Color(0x4488ff),
    label: '午间'
  },
  evening: {
    particleCount: 5000,
    trainSpeedMultiplier: 1.5,
    trainDensityMultiplier: 2.0,
    indicatorColor: new THREE.Color(0xff4757),
    particleColorStart: new THREE.Color(0xff6600),
    particleColorEnd: new THREE.Color(0xff0000),
    label: '晚高峰'
  },
  night: {
    particleCount: 500,
    trainSpeedMultiplier: 0.7,
    trainDensityMultiplier: 0.5,
    indicatorColor: new THREE.Color(0xa55eea),
    particleColorStart: new THREE.Color(0x8854d0),
    particleColorEnd: new THREE.Color(0xff00ff),
    label: '深夜'
  }
};

export class TimeManager {
  private currentPeriod: TimePeriod = 'morning';
  private prevPeriod: TimePeriod = 'morning';
  private callbacks: Set<TimeCallback> = new Set();
  private transitionProgress: number = 1;
  private transitionDuration: number = 1000;
  private isTransitioning: boolean = false;

  getState(): TimeState {
    return {
      currentPeriod: this.currentPeriod,
      ...PERIOD_CONFIGS[this.currentPeriod]
    };
  }

  getPrevState(): TimeState {
    return {
      currentPeriod: this.prevPeriod,
      ...PERIOD_CONFIGS[this.prevPeriod]
    };
  }

  getPeriod(): TimePeriod {
    return this.currentPeriod;
  }

  getTransitionProgress(): number {
    return this.transitionProgress;
  }

  isInTransition(): boolean {
    return this.isTransitioning;
  }

  setPeriod(period: TimePeriod): void {
    if (period === this.currentPeriod) return;

    this.prevPeriod = this.currentPeriod;
    this.currentPeriod = period;
    this.transitionProgress = 0;
    this.isTransitioning = true;

    const prevState = this.getPrevState();
    const newState = this.getState();
    this.callbacks.forEach(cb => cb(newState, prevState));
  }

  update(deltaTime: number): void {
    if (this.isTransitioning) {
      this.transitionProgress += (deltaTime * 1000) / this.transitionDuration;
      if (this.transitionProgress >= 1) {
        this.transitionProgress = 1;
        this.isTransitioning = false;
      }
    }
  }

  lerpColor(color1: THREE.Color, color2: THREE.Color, t: number): THREE.Color {
    const clampedT = Math.max(0, Math.min(1, t));
    return new THREE.Color().lerpColors(color1, color2, clampedT);
  }

  lerpNumber(value1: number, value2: number, t: number): number {
    const clampedT = Math.max(0, Math.min(1, t));
    return value1 + (value2 - value1) * clampedT;
  }

  getInterpolatedState(): TimeState {
    if (!this.isTransitioning || this.transitionProgress >= 1) {
      return this.getState();
    }

    const prevState = this.getPrevState();
    const currentState = this.getState();
    const t = this.smoothStep(this.transitionProgress);

    return {
      currentPeriod: this.currentPeriod,
      particleCount: Math.round(this.lerpNumber(prevState.particleCount, currentState.particleCount, t)),
      trainSpeedMultiplier: this.lerpNumber(prevState.trainSpeedMultiplier, currentState.trainSpeedMultiplier, t),
      trainDensityMultiplier: this.lerpNumber(prevState.trainDensityMultiplier, currentState.trainDensityMultiplier, t),
      indicatorColor: this.lerpColor(prevState.indicatorColor, currentState.indicatorColor, t),
      particleColorStart: this.lerpColor(prevState.particleColorStart, currentState.particleColorStart, t),
      particleColorEnd: this.lerpColor(prevState.particleColorEnd, currentState.particleColorEnd, t),
      label: currentState.label
    };
  }

  private smoothStep(t: number): number {
    return t * t * (3 - 2 * t);
  }

  subscribe(callback: TimeCallback): () => void {
    this.callbacks.add(callback);
    return () => this.callbacks.delete(callback);
  }

  unsubscribe(callback: TimeCallback): void {
    this.callbacks.delete(callback);
  }
}

export const timeManager = new TimeManager();

export function getPeriodLabel(period: TimePeriod): string {
  return PERIOD_CONFIGS[period].label;
}

export function getAllPeriods(): TimePeriod[] {
  return ['morning', 'noon', 'evening', 'night'];
}
