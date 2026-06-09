import * as THREE from 'three';
import type { PathData } from './CurrentPath';

export class PlanktonSystem {
  public readonly points: THREE.Points;
  private positions: Float32Array;
  private colors: Float32Array;
  private sizes: Float32Array;
  private particleData: {
    position: THREE.Vector3;
    velocity: THREE.Vector3;
    baseSize: number;
    pathIndex: number;
    pathOffset: number;
    phase: number;
    speed: number;
  }[] = [];
  private paths: PathData[] = [];
  private readonly PARTICLE_COUNT = 2000;

  constructor(paths: PathData[]) {
    this.paths = paths;
    const result = this.createParticleSystem();
    this.points = result.points;
    this.positions = result.positions;
    this.colors = result.colors;
    this.sizes = result.sizes;
  }

  private createParticleSystem(): {
    points: THREE.Points;
    positions: Float32Array;
    colors: Float32Array;
    sizes: Float32Array;
  } {
    const positions = new Float32Array(this.PARTICLE_COUNT * 3);
    const colors = new Float32Array(this.PARTICLE_COUNT * 3);
    const sizes = new Float32Array(this.PARTICLE_COUNT);

    const colorStart = new THREE.Color(0xaaffaa);
    const colorEnd = new THREE.Color(0xffffaa);

    for (let i = 0; i < this.PARTICLE_COUNT; i++) {
      const pathIndex = Math.floor(Math.random() * this.paths.length);
      const path = this.paths[pathIndex];
      const pathProgress = Math.random();
      const pathPoint = path.curve.getPointAt(pathProgress);

      const offsetRadius = Math.random() * 4;
      const offsetAngle = Math.random() * Math.PI * 2;
      const offsetY = (Math.random() - 0.5) * 4;

      const position = new THREE.Vector3(
        pathPoint.x + Math.cos(offsetAngle) * offsetRadius,
        Math.max(-9, Math.min(9, pathPoint.y + offsetY)),
        pathPoint.z + Math.sin(offsetAngle) * offsetRadius
      );

      positions[i * 3] = position.x;
      positions[i * 3 + 1] = position.y;
      positions[i * 3 + 2] = position.z;

      const colorT = Math.random();
      const color = colorStart.clone().lerp(colorEnd, colorT);
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;

      const baseSize = 0.02 + Math.random() * 0.03;
      sizes[i] = baseSize;

      this.particleData.push({
        position,
        velocity: new THREE.Vector3(),
        baseSize,
        pathIndex,
        pathOffset: pathProgress,
        phase: Math.random() * Math.PI * 2,
        speed: 0.1 + Math.random() * 0.4
      });
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
      size: 0.04,
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true,
      depthWrite: false
    });

    const points = new THREE.Points(geometry, material);
    return { points, positions, colors, sizes };
  }

  public getDensityAtPosition(position: THREE.Vector3, radius: number = 2): number {
    let count = 0;
    const radiusSq = radius * radius;
    for (const data of this.particleData) {
      if (data.position.distanceToSquared(position) < radiusSq) {
        count++;
      }
    }
    const volume = (4 / 3) * Math.PI * radius * radius * radius;
    return count / volume;
  }

  public update(deltaTime: number, time: number): void {
    const sineAmplitude = 0.1;
    const sineFrequency = 0.2;

    for (let i = 0; i < this.PARTICLE_COUNT; i++) {
      const data = this.particleData[i];
      const path = this.paths[data.pathIndex];

      data.pathOffset += (data.speed / path.curve.getLength()) * deltaTime;
      if (data.pathOffset > 1) data.pathOffset -= 1;
      if (data.pathOffset < 0) data.pathOffset += 1;

      const pathPoint = path.curve.getPointAt(data.pathOffset);
      const pathTangent = path.curve.getTangentAt(data.pathOffset).normalize();

      const perpX = new THREE.Vector3(0, 1, 0).cross(pathTangent).normalize();
      if (perpX.lengthSq() < 0.01) {
        perpX.set(1, 0, 0);
      }
      const perpY = pathTangent.clone().cross(perpX).normalize();

      const distToPath = 1 + Math.sin(data.phase + time * 0.5) * 0.5;
      const angle = data.phase + time * 0.3;

      const sineOffsetX = sineAmplitude * Math.sin(time * sineFrequency + data.phase);
      const sineOffsetY = sineAmplitude * Math.cos(time * sineFrequency * 1.3 + data.phase * 0.7);
      const sineOffsetZ = sineAmplitude * Math.sin(time * sineFrequency * 0.7 + data.phase * 1.1);

      data.position.set(
        pathPoint.x + perpX.x * distToPath * Math.cos(angle) + perpY.x * distToPath * Math.sin(angle) + sineOffsetX,
        pathPoint.y + perpX.y * distToPath * Math.cos(angle) + perpY.y * distToPath * Math.sin(angle) + sineOffsetY,
        pathPoint.z + perpX.z * distToPath * Math.cos(angle) + perpY.z * distToPath * Math.sin(angle) + sineOffsetZ
      );

      data.position.x = Math.max(-9.8, Math.min(9.8, data.position.x));
      data.position.y = Math.max(-9.8, Math.min(9.8, data.position.y));
      data.position.z = Math.max(-9.8, Math.min(9.8, data.position.z));

      this.positions[i * 3] = data.position.x;
      this.positions[i * 3 + 1] = data.position.y;
      this.positions[i * 3 + 2] = data.position.z;
    }

    this.updateParticleSizes();

    this.points.geometry.attributes.position.needsUpdate = true;
  }

  private updateParticleSizes(): void {
    const gridSize = 2;
    const cellSize = 1;
    const grid: Map<string, number[]> = new Map();

    for (let i = 0; i < this.PARTICLE_COUNT; i++) {
      const data = this.particleData[i];
      const gx = Math.floor(data.position.x / gridSize);
      const gy = Math.floor(data.position.y / gridSize);
      const gz = Math.floor(data.position.z / gridSize);
      const key = `${gx},${gy},${gz}`;
      if (!grid.has(key)) grid.set(key, []);
      grid.get(key)!.push(i);
    }

    for (let i = 0; i < this.PARTICLE_COUNT; i++) {
      const data = this.particleData[i];
      const gx = Math.floor(data.position.x / gridSize);
      const gy = Math.floor(data.position.y / gridSize);
      const gz = Math.floor(data.position.z / gridSize);

      let neighborCount = 0;
      for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
          for (let dz = -1; dz <= 1; dz++) {
            const key = `${gx + dx},${gy + dy},${gz + dz}`;
            const cell = grid.get(key);
            if (!cell) continue;
            for (const j of cell) {
              if (i === j) continue;
              const distSq = data.position.distanceToSquared(this.particleData[j].position);
              if (distSq < cellSize * cellSize) {
                neighborCount++;
              }
            }
          }
        }
      }

      const sizeMultiplier = neighborCount > 10 ? 1.5 : 1.0;
      this.sizes[i] = data.baseSize * sizeMultiplier;
    }

    const avgSize = this.sizes.reduce((a, b) => a + b, 0) / this.PARTICLE_COUNT;
    (this.points.material as THREE.PointsMaterial).size = Math.max(0.03, Math.min(0.06, avgSize * 1.2));
  }
}
