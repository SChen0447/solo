import * as THREE from 'three';
import { Terrain } from './terrain';

const HEATMAP_COLORS = [
  { t: 0.0, r: 0.0, g: 0.0, b: 0.6 },
  { t: 0.2, r: 0.0, g: 0.2, b: 0.8 },
  { t: 0.4, r: 0.0, g: 0.6, b: 0.8 },
  { t: 0.6, r: 0.0, g: 0.9, b: 0.5 },
  { t: 0.8, r: 1.0, g: 0.8, b: 0.0 },
  { t: 1.0, r: 1.0, g: 0.2, b: 0.1 }
];

function getHeatColor(t: number): THREE.Color {
  const clampedT = Math.max(0, Math.min(1, t));

  for (let i = 0; i < HEATMAP_COLORS.length - 1; i++) {
    const c1 = HEATMAP_COLORS[i];
    const c2 = HEATMAP_COLORS[i + 1];

    if (clampedT >= c1.t && clampedT <= c2.t) {
      const range = c2.t - c1.t;
      const localT = (clampedT - c1.t) / range;

      return new THREE.Color(
        c1.r + (c2.r - c1.r) * localT,
        c1.g + (c2.g - c1.g) * localT,
        c1.b + (c2.b - c1.b) * localT
      );
    }
  }

  return new THREE.Color(HEATMAP_COLORS[HEATMAP_COLORS.length - 1].r, HEATMAP_COLORS[HEATMAP_COLORS.length - 1].g, HEATMAP_COLORS[HEATMAP_COLORS.length - 1].b);
}

export interface HeatmapOptions {
  radius: number;
  intensity: number;
  heightOffset: number;
}

export class Heatmap {
  private mesh: THREE.Mesh;
  private geometry: THREE.PlaneGeometry;
  private material: THREE.MeshBasicMaterial;
  private terrain: Terrain;
  private options: HeatmapOptions;
  private mousePosition: THREE.Vector2;
  private targetMousePosition: THREE.Vector2;
  private pulsePhase: number;
  private baseOpacity: number;

  constructor(terrain: Terrain, options: Partial<HeatmapOptions> = {}) {
    this.terrain = terrain;
    this.options = {
      radius: 40,
      intensity: 1.0,
      heightOffset: 1,
      ...options
    };

    this.mousePosition = new THREE.Vector2(0, 0);
    this.targetMousePosition = new THREE.Vector2(0, 0);
    this.pulsePhase = 0;
    this.baseOpacity = 0.6;

    const terrainOptions = terrain.getOptions();
    this.geometry = new THREE.PlaneGeometry(
      terrainOptions.width,
      terrainOptions.depth,
      terrainOptions.segmentsX,
      terrainOptions.segmentsZ
    );
    this.geometry.rotateX(-Math.PI / 2);

    const vertexCount = this.geometry.attributes.position.count;
    const colors = new Float32Array(vertexCount * 3);

    for (let i = 0; i < vertexCount; i++) {
      colors[i * 3] = 0;
      colors[i * 3 + 1] = 0;
      colors[i * 3 + 2] = 0.6;
    }

    this.geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    this.material = new THREE.MeshBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: this.baseOpacity,
      side: THREE.DoubleSide,
      depthWrite: false
    });

    this.mesh = new THREE.Mesh(this.geometry, this.material);

    this.updatePositions();
    this.updateHeatColors();
  }

  private updatePositions(): void {
    const positions = this.geometry.attributes.position;

    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i);
      const z = positions.getZ(i);
      const terrainHeight = this.terrain.getHeightAt(x, z);
      positions.setY(i, terrainHeight + this.options.heightOffset);
    }

    positions.needsUpdate = true;
    this.geometry.computeVertexNormals();
  }

  updateHeatColors(): void {
    const positions = this.geometry.attributes.position;
    const colors = this.geometry.attributes.color as THREE.BufferAttribute;
    const { radius, intensity } = this.options;
    const mx = this.mousePosition.x;
    const mz = this.mousePosition.y;

    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i);
      const z = positions.getZ(i);

      const dx = x - mx;
      const dz = z - mz;
      const distance = Math.sqrt(dx * dx + dz * dz);

      let heatValue = 0;
      if (distance < radius) {
        const normalizedDist = distance / radius;
        heatValue = (1 - normalizedDist * normalizedDist) * intensity;
      }

      const color = getHeatColor(heatValue);
      colors.setXYZ(i, color.r, color.g, color.b);
    }

    colors.needsUpdate = true;
  }

  setMousePosition(x: number, z: number): void {
    this.targetMousePosition.set(x, z);
  }

  getMousePosition(): THREE.Vector2 {
    return this.mousePosition.clone();
  }

  update(deltaTime: number): void {
    const lerpFactor = 0.15;
    this.mousePosition.x += (this.targetMousePosition.x - this.mousePosition.x) * lerpFactor;
    this.mousePosition.y += (this.targetMousePosition.y - this.mousePosition.y) * lerpFactor;

    this.pulsePhase += deltaTime * 0.8;
    const pulseAmount = Math.sin(this.pulsePhase) * 0.15;
    this.material.opacity = this.baseOpacity + pulseAmount;

    this.updateHeatColors();
  }

  getMesh(): THREE.Mesh {
    return this.mesh;
  }

  getHeatValueAt(x: number, z: number): number {
    const { radius, intensity } = this.options;
    const mx = this.mousePosition.x;
    const mz = this.mousePosition.y;

    const dx = x - mx;
    const dz = z - mz;
    const distance = Math.sqrt(dx * dx + dz * dz);

    if (distance < radius) {
      const normalizedDist = distance / radius;
      return (1 - normalizedDist * normalizedDist) * intensity;
    }

    return 0;
  }

  dispose(): void {
    this.geometry.dispose();
    this.material.dispose();
  }
}
