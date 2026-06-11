import * as THREE from 'three';
import { StarSystem } from './starData';
import { SceneRenderer } from './SceneRenderer';

export class ConstellationManager {
  starSystem: StarSystem;
  sceneRenderer: SceneRenderer;
  lineSegments: Map<string, THREE.LineSegments>;
  constellationVisibility: Map<string, boolean>;

  constructor(starSystem: StarSystem, sceneRenderer: SceneRenderer) {
    this.starSystem = starSystem;
    this.sceneRenderer = sceneRenderer;
    this.lineSegments = new Map();
    this.constellationVisibility = new Map();
    this.createConstellationLines();
  }

  private createConstellationLines(): void {
    const lines = this.starSystem.constellationLines;

    for (const constellation of lines) {
      const points: THREE.Vector3[] = [];

      for (const starName of constellation.starNames) {
        const star = this.starSystem.getStarByName(starName);
        if (star) {
          const pos = this.starSystem.getAdjustedPosition(star, 0);
          points.push(new THREE.Vector3(pos.x, pos.y, pos.z));
        }
      }

      if (points.length < 2) continue;

      const geometry = new THREE.BufferGeometry().setFromPoints(points);
      const { r, g, b } = constellation.color;
      const material = new THREE.LineBasicMaterial({
        color: new THREE.Color(r, g, b),
        transparent: true,
        opacity: 0.35,
        linewidth: 2,
      });

      const line = new THREE.LineSegments(geometry, material);
      this.sceneRenderer.scene.add(line);
      this.lineSegments.set(constellation.name, line);
      this.constellationVisibility.set(constellation.name, true);
    }
  }

  updateConstellationLines(yearOffset: number): void {
    const lines = this.starSystem.constellationLines;

    for (const constellation of lines) {
      const line = this.lineSegments.get(constellation.name);
      if (!line) continue;

      const points: THREE.Vector3[] = [];
      for (const starName of constellation.starNames) {
        const star = this.starSystem.getStarByName(starName);
        if (star) {
          const pos = this.starSystem.getAdjustedPosition(star, yearOffset);
          points.push(new THREE.Vector3(pos.x, pos.y, pos.z));
        }
      }

      if (points.length >= 2) {
        const positions = new Float32Array(points.length * 3);
        for (let i = 0; i < points.length; i++) {
          positions[i * 3] = points[i].x;
          positions[i * 3 + 1] = points[i].y;
          positions[i * 3 + 2] = points[i].z;
        }
        line.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        line.geometry.attributes.position.needsUpdate = true;
      }
    }
  }

  toggleConstellation(name: string): boolean {
    const line = this.lineSegments.get(name);
    if (!line) return false;

    const currentVisible = this.constellationVisibility.get(name) ?? true;
    const newVisible = !currentVisible;
    line.visible = newVisible;
    this.constellationVisibility.set(name, newVisible);
    return newVisible;
  }

  setConstellationVisible(name: string, visible: boolean): void {
    const line = this.lineSegments.get(name);
    if (!line) return;
    line.visible = visible;
    this.constellationVisibility.set(name, visible);
  }

  getConstellationNames(): string[] {
    return this.starSystem.constellationLines.map((c) => c.name);
  }

  getConstellationColor(name: string): { r: number; g: number; b: number } | undefined {
    const found = this.starSystem.constellationLines.find((c) => c.name === name);
    return found ? found.color : undefined;
  }

  dispose(): void {
    this.lineSegments.forEach((line) => {
      line.geometry.dispose();
      (line.material as THREE.Material).dispose();
      this.sceneRenderer.scene.remove(line);
    });
    this.lineSegments.clear();
  }
}
