import * as THREE from 'three';
import {
  climateDataset,
  DatasetType,
  getValueRange,
  getYearIndex,
  ClimatePoint
} from './data/climateData';

export interface PointInfo {
  index: number;
  lat: number;
  lng: number;
  value: number;
  worldPosition: THREE.Vector3;
  name?: string;
}

export class DataLayer {
  public points: THREE.Points;
  private scene: THREE.Scene;
  private geometry: THREE.BufferGeometry;
  private material: THREE.PointsMaterial;
  private datasetType: DatasetType = 'temperature';
  private currentYear: number = 2010;
  private displayYear: number = 2010;
  private isPlaying: boolean = false;
  private playTimer: number = 0;
  private opacity: number = 1;
  private targetOpacity: number = 1;
  private fadeInProgress: boolean = false;
  private onYearChangeCallback?: (year: number) => void;
  private onPlayStateChangeCallback?: (playing: boolean) => void;

  private positions: Float32Array;
  private colors: Float32Array;
  private basePositions: Float32Array;
  private pointCount: number;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.pointCount = climateDataset.points.length;

    this.positions = new Float32Array(this.pointCount * 3);
    this.colors = new Float32Array(this.pointCount * 3);
    this.basePositions = new Float32Array(this.pointCount * 3);

    this.computeBasePositions();

    this.geometry = new THREE.BufferGeometry();
    this.geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    this.geometry.setAttribute('color', new THREE.BufferAttribute(this.colors, 3));

    this.material = new THREE.PointsMaterial({
      size: 0.05,
      vertexColors: true,
      transparent: true,
      opacity: 1,
      sizeAttenuation: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });

    this.points = new THREE.Points(this.geometry, this.material);
    this.points.userData.dataLayer = this;
    this.scene.add(this.points);

    this.updateParticleData(true);
  }

  private computeBasePositions(): void {
    const { points } = climateDataset;
    const radius = 1.02;

    for (let i = 0; i < this.pointCount; i++) {
      const p = points[i];
      const phi = (90 - p.lat) * (Math.PI / 180);
      const theta = (p.lng + 180) * (Math.PI / 180);

      const x = -radius * Math.sin(phi) * Math.cos(theta);
      const y = radius * Math.cos(phi);
      const z = radius * Math.sin(phi) * Math.sin(theta);

      this.basePositions[i * 3] = x;
      this.basePositions[i * 3 + 1] = y;
      this.basePositions[i * 3 + 2] = z;
    }
  }

  private interpolateValue(yearIdx: number, t: number, pointIdx: number): number {
    const { yearly } = climateDataset;
    const values = this.datasetType === 'temperature'
      ? yearly[yearIdx].temperature
      : yearly[yearIdx].precipitation;

    if (t <= 0 || yearIdx >= yearly.length - 1) {
      return values[pointIdx];
    }

    const nextValues = this.datasetType === 'temperature'
      ? yearly[yearIdx + 1].temperature
      : yearly[yearIdx + 1].precipitation;

    return values[pointIdx] + (nextValues[pointIdx] - values[pointIdx]) * t;
  }

  private temperatureColor(value: number, out: THREE.Color): void {
    const { min, max } = getValueRange('temperature');
    const t = Math.max(0, Math.min(1, (value - min) / (max - min)));

    if (t < 0.25) {
      const k = t / 0.25;
      out.setRGB(0.12 + k * 0.15, 0.56 + k * 0.1, 1.0 - k * 0.05);
    } else if (t < 0.5) {
      const k = (t - 0.25) / 0.25;
      out.setRGB(0.27 + k * 0.48, 0.66 + k * 0.22, 0.95 + k * 0.05);
    } else if (t < 0.75) {
      const k = (t - 0.5) / 0.25;
      out.setRGB(0.75 + k * 0.15, 0.88 - k * 0.38, 0.88 - k * 0.42);
    } else {
      const k = (t - 0.75) / 0.25;
      out.setRGB(0.9 + k * 0.1, 0.5 - k * 0.25, 0.46 - k * 0.2);
    }
  }

  private precipitationColor(value: number, out: THREE.Color): void {
    const { min, max } = getValueRange('precipitation');
    const t = Math.max(0, Math.min(1, (value - min) / (max - min)));

    if (t < 0.33) {
      const k = t / 0.33;
      out.setRGB(0.56 - k * 0.1, 0.93 - k * 0.15, 0.56 - k * 0.1);
    } else if (t < 0.66) {
      const k = (t - 0.33) / 0.33;
      out.setRGB(0.46 - k * 0.2, 0.78 - k * 0.2, 0.46 - k * 0.15);
    } else {
      const k = (t - 0.66) / 0.34;
      out.setRGB(0.26 - k * 0.15, 0.58 - k * 0.33, 0.31 - k * 0.1);
    }
  }

  private getParticleSize(value: number): number {
    const { min, max } = getValueRange(this.datasetType);
    const t = Math.max(0, Math.min(1, (value - min) / (max - min)));
    return 0.025 + t * 0.055;
  }

  public updateParticleData(immediate: boolean = false): void {
    const yearFloat = immediate ? this.currentYear : this.displayYear;
    const yearIdx = getYearIndex(Math.floor(yearFloat));
    const t = immediate ? 0 : yearFloat - Math.floor(yearFloat);
    const color = new THREE.Color();
    const { points } = climateDataset;

    for (let i = 0; i < this.pointCount; i++) {
      const p = points[i];
      const value = this.interpolateValue(yearIdx, t, i);
      const size = this.getParticleSize(value);
      const dir = new THREE.Vector3(
        this.basePositions[i * 3],
        this.basePositions[i * 3 + 1],
        this.basePositions[i * 3 + 2]
      ).normalize();

      this.positions[i * 3] = this.basePositions[i * 3] + dir.x * size * 0.3;
      this.positions[i * 3 + 1] = this.basePositions[i * 3 + 1] + dir.y * size * 0.3;
      this.positions[i * 3 + 2] = this.basePositions[i * 3 + 2] + dir.z * size * 0.3;

      if (this.datasetType === 'temperature') {
        this.temperatureColor(value, color);
      } else {
        this.precipitationColor(value, color);
      }

      this.colors[i * 3] = color.r;
      this.colors[i * 3 + 1] = color.g;
      this.colors[i * 3 + 2] = color.b;

      void p;
    }

    this.geometry.attributes.position.needsUpdate = true;
    this.geometry.attributes.color.needsUpdate = true;
  }

  public setDataset(type: DatasetType): void {
    if (this.datasetType === type) return;
    this.datasetType = type;
    this.fadeInProgress = true;
    this.targetOpacity = 0;
  }

  public getDataset(): DatasetType {
    return this.datasetType;
  }

  public setYear(year: number): void {
    this.currentYear = Math.max(2000, Math.min(2020, year));
    this.displayYear = this.currentYear;
    this.updateParticleData(true);
  }

  public getYear(): number {
    return Math.round(this.displayYear);
  }

  public togglePlay(): boolean {
    this.isPlaying = !this.isPlaying;
    this.playTimer = 0;
    if (this.onPlayStateChangeCallback) {
      this.onPlayStateChangeCallback(this.isPlaying);
    }
    return this.isPlaying;
  }

  public setPlaying(playing: boolean): void {
    if (this.isPlaying === playing) return;
    this.isPlaying = playing;
    this.playTimer = 0;
    if (this.onPlayStateChangeCallback) {
      this.onPlayStateChangeCallback(this.isPlaying);
    }
  }

  public isCurrentlyPlaying(): boolean {
    return this.isPlaying;
  }

  public reset(): void {
    this.currentYear = 2000;
    this.displayYear = 2000;
    this.updateParticleData(true);
    if (this.onYearChangeCallback) {
      this.onYearChangeCallback(2000);
    }
  }

  public onYearChange(callback: (year: number) => void): void {
    this.onYearChangeCallback = callback;
  }

  public onPlayStateChange(callback: (playing: boolean) => void): void {
    this.onPlayStateChangeCallback = callback;
  }

  public getPointInfo(index: number): PointInfo | null {
    if (index < 0 || index >= this.pointCount) return null;
    const p = climateDataset.points[index];
    const yearIdx = getYearIndex(Math.floor(this.displayYear));
    const t = this.displayYear - Math.floor(this.displayYear);
    const value = this.interpolateValue(yearIdx, t, index);
    const worldPos = new THREE.Vector3(
      this.positions[index * 3],
      this.positions[index * 3 + 1],
      this.positions[index * 3 + 2]
    );
    this.points.localToWorld(worldPos);
    return {
      index,
      lat: p.lat,
      lng: p.lng,
      value,
      worldPosition: worldPos,
      name: p.name
    };
  }

  public getPointCount(): number {
    return this.pointCount;
  }

  public getClimatePoints(): ClimatePoint[] {
    return climateDataset.points;
  }

  public update(delta: number): void {
    if (this.isPlaying) {
      this.playTimer += delta;
      const frameInterval = 1.0;
      while (this.playTimer >= frameInterval) {
        this.playTimer -= frameInterval;
        this.currentYear++;
        if (this.currentYear > 2020) {
          this.currentYear = 2000;
        }
        if (this.onYearChangeCallback) {
          this.onYearChangeCallback(this.currentYear);
        }
      }
    }

    this.displayYear += (this.currentYear - this.displayYear) * Math.min(delta * 5, 1);

    if (this.fadeInProgress) {
      this.opacity += (this.targetOpacity - this.opacity) * Math.min(delta * 4, 1);
      if (this.targetOpacity === 0 && this.opacity < 0.05) {
        this.opacity = 0;
        this.targetOpacity = 1;
        this.updateParticleData(true);
      } else if (this.targetOpacity === 1 && this.opacity > 0.95) {
        this.opacity = 1;
        this.fadeInProgress = false;
      }
      this.material.opacity = this.opacity;
    }

    if (!this.fadeInProgress || this.targetOpacity === 1) {
      this.updateParticleData();
    }
  }

  public dispose(): void {
    this.geometry.dispose();
    this.material.dispose();
    this.scene.remove(this.points);
  }
}
