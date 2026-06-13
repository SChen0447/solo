import type { HexCoord } from './maze';

export type EnergyLevel = 'low' | 'high';

export interface Ripple {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  startTime: number;
  duration: number;
  colorStart: string;
  colorEnd: string;
}

export interface EnergyWave {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  startTime: number;
  duration: number;
}

export class Particle {
  public coord: HexCoord;
  public energyLevel: EnergyLevel;
  public isMain: boolean;
  public isMoving: boolean = false;
  public moveProgress: number = 0;
  public moveFromCoord: HexCoord | null = null;
  public moveToCoord: HexCoord | null = null;
  public moveDuration: number = 0.3;
  public floatOffset: number = 0;
  public floatSpeed: number = Math.PI * 2 / 1.5;
  public floatPhase: number = Math.random() * Math.PI * 2;
  public isOnTarget: boolean = false;
  public id: number;

  private static nextId: number = 0;

  constructor(coord: HexCoord, energyLevel: EnergyLevel = 'low', isMain: boolean = false) {
    this.coord = coord;
    this.energyLevel = energyLevel;
    this.isMain = isMain;
    this.id = Particle.nextId++;
  }

  public startMove(targetCoord: HexCoord): void {
    if (this.isMoving) return;
    this.moveFromCoord = { ...this.coord };
    this.moveToCoord = { ...targetCoord };
    this.isMoving = true;
    this.moveProgress = 0;
  }

  public update(deltaTime: number): void {
    this.floatPhase += this.floatSpeed * deltaTime;
    this.floatOffset = Math.sin(this.floatPhase) * 2;

    if (this.isMoving && this.moveFromCoord && this.moveToCoord) {
      this.moveProgress += deltaTime / this.moveDuration;
      if (this.moveProgress >= 1) {
        this.moveProgress = 1;
        this.isMoving = false;
        this.coord = { ...this.moveToCoord };
        this.moveFromCoord = null;
        this.moveToCoord = null;
      }
    }
  }

  public getEasedProgress(): number {
    const t = Math.min(1, Math.max(0, this.moveProgress));
    return 1 - Math.pow(1 - t, 3);
  }

  public toggleEnergyLevel(): void {
    this.energyLevel = this.energyLevel === 'low' ? 'high' : 'low';
  }

  public setOnTarget(onTarget: boolean): void {
    this.isOnTarget = onTarget;
  }

  public getColor(): string {
    if (this.energyLevel === 'high') {
      return '#ffd54f';
    }
    return '#4fc3f7';
  }

  public getGlowColor(): string {
    if (this.energyLevel === 'high') {
      return 'rgba(255, 213, 79, 0.6)';
    }
    return 'rgba(79, 195, 247, 0.6)';
  }

  public resetPosition(coord: HexCoord): void {
    this.coord = coord;
    this.isMoving = false;
    this.moveProgress = 0;
    this.moveFromCoord = null;
    this.moveToCoord = null;
  }
}

export function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}
