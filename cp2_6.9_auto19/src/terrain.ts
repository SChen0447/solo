import * as THREE from 'three';

export interface TrackPoint {
  lat: number;
  lon: number;
  elevation: number;
  timestamp: number;
}

export interface TerrainBounds {
  minLat: number;
  maxLat: number;
  minLon: number;
  maxLon: number;
  centerLat: number;
  centerLon: number;
}

export class TerrainGenerator {
  private scene: THREE.Scene;
  private terrainMesh: THREE.Mesh | null = null;
  private terrainGeometry: THREE.PlaneGeometry | null = null;
  private amplitude: number = 50;
  private bounds: TerrainBounds | null = null;
  private baseElevations: Map<string, number> = new Map();

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  setAmplitude(value: number): void {
    this.amplitude = value;
    this.updateTerrainHeights();
  }

  getBounds(): TerrainBounds | null {
    return this.bounds;
  }

  private latLonToWorld(
    lat: number,
    lon: number,
    terrainSize: number
  ): { x: number; z: number } {
    if (!this.bounds) return { x: 0, z: 0 };

    const latRange = this.bounds.maxLat - this.bounds.minLat;
    const lonRange = this.bounds.maxLon - this.bounds.minLon;
    const range = Math.max(latRange, lonRange) * 1.5;

    const x = ((lon - this.bounds.centerLon) / range) * terrainSize;
    const z = ((lat - this.bounds.centerLat) / range) * terrainSize;

    return { x, z };
  }

  private noise(x: number, y: number): number {
    const a = Math.sin(x * 0.02 + y * 0.015) * 0.5;
    const b = Math.sin(x * 0.05 - y * 0.03) * 0.3;
    const c = Math.cos(x * 0.01 + y * 0.025) * 0.2;
    return a + b + c;
  }

  generateTerrain(trackPoints: TrackPoint[]): THREE.Mesh {
    this.clearTerrain();

    this.bounds = this.calculateBounds(trackPoints);
    this.cacheBaseElevations(trackPoints);

    const terrainSize = 400;
    const segments = 99;

    this.terrainGeometry = new THREE.PlaneGeometry(
      terrainSize,
      terrainSize,
      segments,
      segments
    );
    this.terrainGeometry.rotateX(-Math.PI / 2);

    const positions = this.terrainGeometry.attributes.position;
    const colors: number[] = [];

    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i);
      const z = positions.getZ(i);

      const noiseHeight = this.noise(x, z) * this.amplitude;
      const trackInfluence = this.getTrackElevationInfluence(x, z, trackPoints, terrainSize);
      const height = noiseHeight + trackInfluence;

      positions.setY(i, height);

      const normalizedHeight = (height + this.amplitude) / (this.amplitude * 2.5);
      const color = this.getTerrainColor(normalizedHeight);
      colors.push(color.r, color.g, color.b);
    }

    this.terrainGeometry.setAttribute(
      'color',
      new THREE.Float32BufferAttribute(colors, 3)
    );
    this.terrainGeometry.computeVertexNormals();

    const material = new THREE.MeshStandardMaterial({
      vertexColors: true,
      flatShading: false,
      side: THREE.DoubleSide,
      roughness: 0.85,
      metalness: 0.1
    });

    this.terrainMesh = new THREE.Mesh(this.terrainGeometry, material);
    this.terrainMesh.receiveShadow = true;
    this.scene.add(this.terrainMesh);

    return this.terrainMesh;
  }

  private cacheBaseElevations(trackPoints: TrackPoint[]): void {
    this.baseElevations.clear();
    trackPoints.forEach((point, index) => {
      this.baseElevations.set(`p_${index}`, point.elevation);
    });
  }

  private getTrackElevationInfluence(
    x: number,
    z: number,
    trackPoints: TrackPoint[],
    terrainSize: number
  ): number {
    if (!this.bounds || trackPoints.length === 0) return 0;

    let minDist = Infinity;
    let nearestElevation = 0;

    for (let i = 0; i < trackPoints.length; i++) {
      const point = trackPoints[i];
      const worldPos = this.latLonToWorld(point.lat, point.lon, terrainSize);
      const dx = x - worldPos.x;
      const dz = z - worldPos.z;
      const dist = Math.sqrt(dx * dx + dz * dz);

      if (dist < minDist) {
        minDist = dist;
        nearestElevation = point.elevation || 0;
      }
    }

    const influenceRadius = 60;
    const influence = Math.max(0, 1 - minDist / influenceRadius);
    const normalizedElevation = (nearestElevation - 100) / 1000;

    return normalizedElevation * this.amplitude * influence * 0.6;
  }

  private getTerrainColor(normalizedHeight: number): THREE.Color {
    const t = Math.max(0, Math.min(1, normalizedHeight));

    const lowColor = new THREE.Color(0x2d6a4f);
    const midColor = new THREE.Color(0x95d5b2);
    const highColor = new THREE.Color(0x8b6914);
    const peakColor = new THREE.Color(0x6f4518);

    if (t < 0.33) {
      const blend = t / 0.33;
      return lowColor.clone().lerp(midColor, blend);
    } else if (t < 0.66) {
      const blend = (t - 0.33) / 0.33;
      return midColor.clone().lerp(highColor, blend);
    } else {
      const blend = (t - 0.66) / 0.34;
      return highColor.clone().lerp(peakColor, blend);
    }
  }

  private calculateBounds(points: TrackPoint[]): TerrainBounds {
    let minLat = Infinity;
    let maxLat = -Infinity;
    let minLon = Infinity;
    let maxLon = -Infinity;

    points.forEach((p) => {
      minLat = Math.min(minLat, p.lat);
      maxLat = Math.max(maxLat, p.lat);
      minLon = Math.min(minLon, p.lon);
      maxLon = Math.max(maxLon, p.lon);
    });

    const padding = 0.005;
    minLat -= padding;
    maxLat += padding;
    minLon -= padding;
    maxLon += padding;

    return {
      minLat,
      maxLat,
      minLon,
      maxLon,
      centerLat: (minLat + maxLat) / 2,
      centerLon: (minLon + maxLon) / 2
    };
  }

  updateTerrainHeights(): void {
    if (!this.terrainGeometry) return;

    const positions = this.terrainGeometry.attributes.position;
    const colors = this.terrainGeometry.attributes.color as THREE.BufferAttribute;

    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i);
      const z = positions.getZ(i);
      const oldY = positions.getY(i);

      const scale = (this.amplitude / 50);
      const noiseHeight = this.noise(x, z) * this.amplitude;
      const newY = noiseHeight + (oldY - noiseHeight) * (scale * 0.5 + 0.5);

      positions.setY(i, newY);

      const normalizedHeight = (newY + this.amplitude) / (this.amplitude * 2.5);
      const color = this.getTerrainColor(normalizedHeight);
      colors.setXYZ(i, color.r, color.g, color.b);
    }

    positions.needsUpdate = true;
    colors.needsUpdate = true;
    this.terrainGeometry.computeVertexNormals();
  }

  trackPointsToWorldPositions(
    trackPoints: TrackPoint[]
  ): THREE.Vector3[] {
    if (!this.terrainGeometry || !this.bounds) return [];

    const terrainSize = 400;
    const positions: THREE.Vector3[] = [];

    trackPoints.forEach((point) => {
      const { x, z } = this.latLonToWorld(point.lat, point.lon, terrainSize);
      const y = this.getTerrainHeightAt(x, z) + 3;
      positions.push(new THREE.Vector3(x, y, z));
    });

    return positions;
  }

  private getTerrainHeightAt(x: number, z: number): number {
    if (!this.terrainGeometry) return 0;
    return this.noise(x, z) * this.amplitude;
  }

  clearTerrain(): void {
    if (this.terrainMesh) {
      this.scene.remove(this.terrainMesh);
      this.terrainMesh.geometry.dispose();
      (this.terrainMesh.material as THREE.Material).dispose();
      this.terrainMesh = null;
    }
    this.terrainGeometry = null;
  }

  getTerrainSize(): number {
    return 400;
  }
}
