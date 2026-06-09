import * as THREE from 'three';
import { TrackPoint } from './terrain';

export interface RideStats {
  totalDistance: number;
  averageElevation: number;
  averageSpeed: number;
  totalDuration: number;
  maxElevation: number;
  minElevation: number;
}

export interface ProgressData {
  currentIndex: number;
  progress: number;
  currentPosition: THREE.Vector3;
  currentSpeed: number;
  currentElevation: number;
}

type PlayerCallback = (data: ProgressData) => void;
type StatsCallback = (stats: RideStats) => void;

export class RidePlayer {
  private scene: THREE.Scene;
  private trackPoints: TrackPoint[] = [];
  private worldPositions: THREE.Vector3[] = [];
  private pathLine: THREE.Line | null = null;
  private playerBall: THREE.Mesh | null = null;

  private isPlaying: boolean = false;
  private currentIndex: number = 0;
  private progress: number = 0;
  private speedMultiplier: number = 1;
  private segmentProgress: number = 0;

  private stats: RideStats | null = null;
  private cumulativeDistances: number[] = [];

  private onProgressCallback: PlayerCallback | null = null;
  private onStatsCallback: StatsCallback | null = null;

  private lastTime: number = 0;
  private baseSpeed: number = 0.00008;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  async parseFile(file: File): Promise<TrackPoint[]> {
    const text = await this.readFileAsync(file);
    const extension = file.name.split('.').pop()?.toLowerCase();

    let points: TrackPoint[];
    if (extension === 'gpx') {
      points = this.parseGPX(text);
    } else if (extension === 'csv') {
      points = this.parseCSV(text);
    } else {
      throw new Error('不支持的文件格式');
    }

    if (points.length > 1000) {
      points = this.downsamplePoints(points, 1000);
    }

    if (points.length < 2) {
      throw new Error('轨迹点数量不足');
    }

    this.setTrackPoints(points);
    return points;
  }

  generateDemoTrack(): TrackPoint[] {
    const points: TrackPoint[] = [];
    const centerLat = 39.9042;
    const centerLon = 116.4074;
    const numPoints = 500;

    for (let i = 0; i < numPoints; i++) {
      const t = i / (numPoints - 1);
      const angle = t * Math.PI * 4;
      const radius = 0.005 + Math.sin(t * Math.PI * 2) * 0.002;

      const lat = centerLat + Math.cos(angle) * radius + Math.sin(t * 10) * 0.0005;
      const lon = centerLon + Math.sin(angle) * radius + Math.cos(t * 8) * 0.0005;
      const elevation = 50 + Math.sin(t * Math.PI * 4) * 80 + Math.sin(t * Math.PI * 10) * 30;
      const timestamp = i * 3000;

      points.push({ lat, lon, elevation, timestamp });
    }

    this.setTrackPoints(points);
    return points;
  }

  private readFileAsync(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(reader.error);
      reader.readAsText(file);
    });
  }

  private parseGPX(xmlText: string): TrackPoint[] {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xmlText, 'text/xml');
    const trackPoints: TrackPoint[] = [];

    const trkpts = doc.getElementsByTagName('trkpt');

    for (let i = 0; i < trkpts.length; i++) {
      const trkpt = trkpts[i];
      const lat = parseFloat(trkpt.getAttribute('lat') || '0');
      const lon = parseFloat(trkpt.getAttribute('lon') || '0');

      const eleTag = trkpt.getElementsByTagName('ele')[0];
      const elevation = eleTag ? parseFloat(eleTag.textContent || '0') : 0;

      const timeTag = trkpt.getElementsByTagName('time')[0];
      let timestamp = i * 1000;
      if (timeTag && timeTag.textContent) {
        timestamp = new Date(timeTag.textContent).getTime();
      }

      if (!isNaN(lat) && !isNaN(lon)) {
        trackPoints.push({ lat, lon, elevation, timestamp });
      }
    }

    return trackPoints;
  }

  private parseCSV(csvText: string): TrackPoint[] {
    const lines = csvText.split('\n');
    const trackPoints: TrackPoint[] = [];

    let headerLine = 0;
    const headers = lines[0].toLowerCase().split(',').map((h) => h.trim());
    const latIdx = headers.findIndex((h) => h.includes('lat'));
    const lonIdx = headers.findIndex((h) => h.includes('lon') || h.includes('lng'));
    const eleIdx = headers.findIndex((h) => h.includes('ele') || h.includes('alt'));
    const timeIdx = headers.findIndex((h) => h.includes('time') || h.includes('timestamp'));

    if (latIdx === -1 || lonIdx === -1) {
      headerLine = 0;
    } else {
      headerLine = 1;
    }

    for (let i = headerLine; i < lines.length; i++) {
      const values = lines[i].split(',').map((v) => v.trim());
      if (values.length < 2) continue;

      let lat: number, lon: number, elevation: number, timestamp: number;

      if (headerLine === 1) {
        lat = parseFloat(values[latIdx] || '0');
        lon = parseFloat(values[lonIdx] || '0');
        elevation = eleIdx >= 0 ? parseFloat(values[eleIdx] || '0') : 0;
        if (timeIdx >= 0 && values[timeIdx]) {
          const t = values[timeIdx];
          timestamp = t.includes('-') ? new Date(t).getTime() : parseFloat(t);
        } else {
          timestamp = i * 1000;
        }
      } else {
        lat = parseFloat(values[0] || '0');
        lon = parseFloat(values[1] || '0');
        elevation = values[2] ? parseFloat(values[2]) : 0;
        timestamp = values[3] ? parseFloat(values[3]) : i * 1000;
      }

      if (!isNaN(lat) && !isNaN(lon)) {
        trackPoints.push({ lat, lon, elevation, timestamp });
      }
    }

    return trackPoints;
  }

  private downsamplePoints(points: TrackPoint[], maxPoints: number): TrackPoint[] {
    if (points.length <= maxPoints) return points;

    const result: TrackPoint[] = [];
    const step = points.length / maxPoints;

    for (let i = 0; i < maxPoints; i++) {
      const idx = Math.floor(i * step);
      result.push(points[Math.min(idx, points.length - 1)]);
    }

    return result;
  }

  setTrackPoints(points: TrackPoint[]): void {
    this.trackPoints = points;
    this.currentIndex = 0;
    this.progress = 0;
    this.segmentProgress = 0;
    this.calculateStats();
    this.calculateCumulativeDistances();
  }

  getTrackPoints(): TrackPoint[] {
    return this.trackPoints;
  }

  setWorldPositions(positions: THREE.Vector3[]): void {
    this.worldPositions = positions;
    this.clearVisuals();
    this.createPathLine();
    this.createPlayerBall();
  }

  private calculateCumulativeDistances(): void {
    this.cumulativeDistances = [0];
    for (let i = 1; i < this.trackPoints.length; i++) {
      const dist = this.haversineDistance(
        this.trackPoints[i - 1],
        this.trackPoints[i]
      );
      this.cumulativeDistances.push(this.cumulativeDistances[i - 1] + dist);
    }
  }

  private haversineDistance(a: TrackPoint, b: TrackPoint): number {
    const R = 6371000;
    const dLat = this.toRad(b.lat - a.lat);
    const dLon = this.toRad(b.lon - a.lon);
    const lat1 = this.toRad(a.lat);
    const lat2 = this.toRad(b.lat);

    const h =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);
    return 2 * R * Math.asin(Math.sqrt(h));
  }

  private toRad(deg: number): number {
    return (deg * Math.PI) / 180;
  }

  private calculateStats(): void {
    if (this.trackPoints.length === 0) {
      this.stats = null;
      return;
    }

    let totalDistance = 0;
    let totalElevation = 0;
    let maxElevation = -Infinity;
    let minElevation = Infinity;

    for (let i = 0; i < this.trackPoints.length; i++) {
      totalElevation += this.trackPoints[i].elevation;
      maxElevation = Math.max(maxElevation, this.trackPoints[i].elevation);
      minElevation = Math.min(minElevation, this.trackPoints[i].elevation);

      if (i > 0) {
        totalDistance += this.haversineDistance(
          this.trackPoints[i - 1],
          this.trackPoints[i]
        );
      }
    }

    const firstTime = this.trackPoints[0].timestamp;
    const lastTime = this.trackPoints[this.trackPoints.length - 1].timestamp;
    const totalDuration = Math.max(1000, lastTime - firstTime);
    const averageSpeed = (totalDistance / 1000) / (totalDuration / 3600000);

    this.stats = {
      totalDistance: totalDistance / 1000,
      averageElevation: totalElevation / this.trackPoints.length,
      averageSpeed,
      totalDuration,
      maxElevation,
      minElevation
    };

    if (this.onStatsCallback && this.stats) {
      this.onStatsCallback(this.stats);
    }
  }

  getStats(): RideStats | null {
    return this.stats;
  }

  private createPathLine(): void {
    if (this.worldPositions.length < 2) return;

    const geometry = new THREE.BufferGeometry().setFromPoints(this.worldPositions);

    const colors: number[] = [];
    for (let i = 0; i < this.worldPositions.length; i++) {
      const t = i / (this.worldPositions.length - 1);
      const color = new THREE.Color().setHSL(0.55 + t * 0.1, 1, 0.55);
      colors.push(color.r, color.g, color.b);
    }
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

    const material = new THREE.LineBasicMaterial({
      vertexColors: true,
      linewidth: 2,
      transparent: true,
      opacity: 0.95
    });

    this.pathLine = new THREE.Line(geometry, material);
    this.scene.add(this.pathLine);
  }

  private createPlayerBall(): void {
    if (this.worldPositions.length === 0) return;

    const geometry = new THREE.SphereGeometry(5, 24, 24);
    const material = new THREE.MeshStandardMaterial({
      color: 0xff3333,
      emissive: 0xff3333,
      emissiveIntensity: 0.4,
      roughness: 0.3,
      metalness: 0.5
    });

    this.playerBall = new THREE.Mesh(geometry, material);
    this.playerBall.position.copy(this.worldPositions[0]);
    this.playerBall.castShadow = true;
    this.scene.add(this.playerBall);
  }

  setSpeedMultiplier(multiplier: number): void {
    this.speedMultiplier = Math.max(0.5, Math.min(5, multiplier));
  }

  setProgress(progress: number): void {
    this.progress = Math.max(0, Math.min(1, progress));

    if (this.worldPositions.length === 0) return;

    const totalSegments = this.worldPositions.length - 1;
    const exactIndex = this.progress * totalSegments;
    this.currentIndex = Math.floor(exactIndex);
    this.segmentProgress = exactIndex - this.currentIndex;

    if (this.currentIndex >= totalSegments) {
      this.currentIndex = totalSegments - 1;
      this.segmentProgress = 1;
    }

    this.updatePlayerPosition();
  }

  play(): void {
    if (this.worldPositions.length === 0) return;
    this.isPlaying = true;
    this.lastTime = performance.now();
  }

  pause(): void {
    this.isPlaying = false;
  }

  reset(): void {
    this.isPlaying = false;
    this.currentIndex = 0;
    this.progress = 0;
    this.segmentProgress = 0;

    if (this.playerBall && this.worldPositions.length > 0) {
      this.playerBall.position.copy(this.worldPositions[0]);
    }

    this.notifyProgress();
  }

  isPlayingState(): boolean {
    return this.isPlaying;
  }

  update(deltaTime: number): void {
    if (!this.isPlaying || this.worldPositions.length === 0) return;

    const advance = this.baseSpeed * this.speedMultiplier * deltaTime * 60;
    this.segmentProgress += advance;

    while (this.segmentProgress >= 1 && this.currentIndex < this.worldPositions.length - 1) {
      this.segmentProgress -= 1;
      this.currentIndex++;
    }

    if (this.currentIndex >= this.worldPositions.length - 1) {
      this.currentIndex = this.worldPositions.length - 1;
      this.segmentProgress = 0;
      this.isPlaying = false;
    }

    const totalSegments = this.worldPositions.length - 1;
    this.progress = (this.currentIndex + this.segmentProgress) / totalSegments;

    this.updatePlayerPosition();
    this.notifyProgress();
  }

  private updatePlayerPosition(): void {
    if (!this.playerBall || this.worldPositions.length === 0) return;

    const idx = Math.min(this.currentIndex, this.worldPositions.length - 2);
    const nextIdx = Math.min(idx + 1, this.worldPositions.length - 1);

    const start = this.worldPositions[idx];
    const end = this.worldPositions[nextIdx];

    const position = new THREE.Vector3().lerpVectors(start, end, this.segmentProgress);
    this.playerBall.position.copy(position);

    const speed = this.getCurrentSpeed();
    this.updateBallColor(speed);
  }

  private getCurrentSpeed(): number {
    if (this.stats) {
      const baseSpeed = this.stats.averageSpeed;
      const variation = Math.sin(this.progress * Math.PI * 6) * 0.3 + 1;
      return baseSpeed * variation * this.speedMultiplier;
    }
    return 10 * this.speedMultiplier;
  }

  private updateBallColor(speedKmh: number): void {
    if (!this.playerBall) return;

    const material = this.playerBall.material as THREE.MeshStandardMaterial;
    let color: THREE.Color;
    let emissiveColor: THREE.Color;

    if (speedKmh < 10) {
      const t = speedKmh / 10;
      color = new THREE.Color(0xff3333).lerp(new THREE.Color(0xffcc00), t);
    } else if (speedKmh < 25) {
      const t = (speedKmh - 10) / 15;
      color = new THREE.Color(0xffcc00).lerp(new THREE.Color(0x33cc33), t);
    } else {
      color = new THREE.Color(0x33cc33);
    }

    emissiveColor = color.clone();
    material.color.copy(color);
    material.emissive.copy(emissiveColor);
  }

  private notifyProgress(): void {
    if (!this.onProgressCallback || !this.playerBall) return;

    const data: ProgressData = {
      currentIndex: this.currentIndex,
      progress: this.progress,
      currentPosition: this.playerBall.position.clone(),
      currentSpeed: this.getCurrentSpeed(),
      currentElevation: this.getCurrentElevation()
    };

    this.onProgressCallback(data);
  }

  private getCurrentElevation(): number {
    if (this.trackPoints.length === 0) return 0;

    const idx = Math.min(this.currentIndex, this.trackPoints.length - 2);
    const nextIdx = Math.min(idx + 1, this.trackPoints.length - 1);

    const start = this.trackPoints[idx].elevation;
    const end = this.trackPoints[nextIdx].elevation;

    return start + (end - start) * this.segmentProgress;
  }

  onProgress(callback: PlayerCallback): void {
    this.onProgressCallback = callback;
  }

  onStats(callback: StatsCallback): void {
    this.onStatsCallback = callback;
  }

  getElevationProfile(): { distance: number; elevation: number }[] {
    const profile: { distance: number; elevation: number }[] = [];
    const totalDistance = this.cumulativeDistances[this.cumulativeDistances.length - 1] || 1;

    for (let i = 0; i < this.trackPoints.length; i++) {
      profile.push({
        distance: (this.cumulativeDistances[i] / totalDistance) * 100,
        elevation: this.trackPoints[i].elevation
      });
    }

    return profile;
  }

  clearVisuals(): void {
    if (this.pathLine) {
      this.scene.remove(this.pathLine);
      this.pathLine.geometry.dispose();
      (this.pathLine.material as THREE.Material).dispose();
      this.pathLine = null;
    }
    if (this.playerBall) {
      this.scene.remove(this.playerBall);
      this.playerBall.geometry.dispose();
      (this.playerBall.material as THREE.Material).dispose();
      this.playerBall = null;
    }
  }

  dispose(): void {
    this.clearVisuals();
    this.trackPoints = [];
    this.worldPositions = [];
  }
}
