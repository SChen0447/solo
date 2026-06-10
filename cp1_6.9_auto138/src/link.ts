import * as THREE from 'three';
import { Seed } from './seed';

export interface LinkPair {
  seedA: Seed;
  seedB: Seed;
  line: THREE.Line;
  particles: THREE.Points;
  particlePositions: Float32Array;
  particleColors: Float32Array;
  particleProgress: Float32Array;
  particleDirections: Int8Array;
  buildProgress: number;
  isBuilt: boolean;
}

export class LinkManager {
  public links: Map<string, LinkPair> = new Map();
  public group: THREE.Group;
  private particleCountPerLink: number = 20;
  private connectionDistance: number = 2.0;
  private buildDuration: number = 0.5;
  private particleSpeed: number = 0.5;

  constructor() {
    this.group = new THREE.Group();
  }

  private getLinkKey(a: Seed, b: Seed): string {
    const idA = a.mesh.id;
    const idB = b.mesh.id;
    return idA < idB ? `${idA}_${idB}` : `${idB}_${idA}`;
  }

  public updateLinks(seeds: Seed[]): void {
    const activeKeys = new Set<string>();

    for (let i = 0; i < seeds.length; i++) {
      for (let j = i + 1; j < seeds.length; j++) {
        const a = seeds[i];
        const b = seeds[j];
        const distance = a.position.distanceTo(b.position);

        if (distance < this.connectionDistance) {
          const key = this.getLinkKey(a, b);
          activeKeys.add(key);

          if (!this.links.has(key)) {
            this.createLink(a, b);
          }
        }
      }
    }

    for (const [key] of this.links) {
      if (!activeKeys.has(key)) {
        this.removeLink(key);
      }
    }
  }

  private createLink(a: Seed, b: Seed): void {
    const key = this.getLinkKey(a, b);

    const points = [a.position.clone(), b.position.clone()];
    const geometry = new THREE.BufferGeometry().setFromPoints(points);

    const mixedColor = a.color.clone().lerp(b.color, 0.5);

    const material = new THREE.LineBasicMaterial({
      color: mixedColor,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      linewidth: 2
    });

    const line = new THREE.Line(geometry, material);
    this.group.add(line);

    const particlePositions = new Float32Array(this.particleCountPerLink * 3);
    const particleColors = new Float32Array(this.particleCountPerLink * 3);
    const particleProgress = new Float32Array(this.particleCountPerLink);
    const particleDirections = new Int8Array(this.particleCountPerLink);

    for (let i = 0; i < this.particleCountPerLink; i++) {
      particleProgress[i] = Math.random();
      particleDirections[i] = i % 2 === 0 ? 1 : -1;
    }

    const particleGeometry = new THREE.BufferGeometry();
    particleGeometry.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
    particleGeometry.setAttribute('color', new THREE.BufferAttribute(particleColors, 3));

    const particleMaterial = new THREE.PointsMaterial({
      size: 0.08,
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true
    });

    const particles = new THREE.Points(particleGeometry, particleMaterial);
    this.group.add(particles);

    const link: LinkPair = {
      seedA: a,
      seedB: b,
      line,
      particles,
      particlePositions,
      particleColors,
      particleProgress,
      particleDirections,
      buildProgress: 0,
      isBuilt: false
    };

    this.links.set(key, link);
  }

  private removeLink(key: string): void {
    const link = this.links.get(key);
    if (link) {
      this.group.remove(link.line);
      this.group.remove(link.particles);
      link.line.geometry.dispose();
      (link.line.material as THREE.Material).dispose();
      link.particles.geometry.dispose();
      (link.particles.material as THREE.Material).dispose();
      this.links.delete(key);
    }
  }

  public update(deltaTime: number): void {
    const tmpColor = new THREE.Color();

    for (const link of this.links.values()) {
      if (!link.isBuilt) {
        link.buildProgress += deltaTime;
        const t = Math.min(link.buildProgress / this.buildDuration, 1);
        const easeT = 1 - Math.pow(1 - t, 2);
        (link.line.material as THREE.LineBasicMaterial).opacity = easeT * 0.6;
        if (t >= 1) {
          link.isBuilt = true;
        }
      }

      const positions = link.line.geometry.attributes.position.array as Float32Array;
      positions[0] = link.seedA.position.x;
      positions[1] = link.seedA.position.y;
      positions[2] = link.seedA.position.z;
      positions[3] = link.seedB.position.x;
      positions[4] = link.seedB.position.y;
      positions[5] = link.seedB.position.z;
      link.line.geometry.attributes.position.needsUpdate = true;

      const mixedColor = link.seedA.color.clone().lerp(link.seedB.color, 0.5);
      (link.line.material as THREE.LineBasicMaterial).color.copy(mixedColor);

      const dx = link.seedB.position.x - link.seedA.position.x;
      const dy = link.seedB.position.y - link.seedA.position.y;
      const dz = link.seedB.position.z - link.seedA.position.z;

      for (let i = 0; i < this.particleCountPerLink; i++) {
        link.particleProgress[i] += link.particleDirections[i] * this.particleSpeed * deltaTime;

        if (link.particleProgress[i] >= 1) {
          link.particleProgress[i] = 1;
          link.particleDirections[i] = -1;
        } else if (link.particleProgress[i] <= 0) {
          link.particleProgress[i] = 0;
          link.particleDirections[i] = 1;
        }

        const t = link.particleProgress[i];
        link.particlePositions[i * 3] = link.seedA.position.x + dx * t;
        link.particlePositions[i * 3 + 1] = link.seedA.position.y + dy * t;
        link.particlePositions[i * 3 + 2] = link.seedA.position.z + dz * t;

        tmpColor.copy(link.seedA.color).lerp(link.seedB.color, t);
        link.particleColors[i * 3] = tmpColor.r;
        link.particleColors[i * 3 + 1] = tmpColor.g;
        link.particleColors[i * 3 + 2] = tmpColor.b;
      }

      link.particles.geometry.attributes.position.needsUpdate = true;
      link.particles.geometry.attributes.color.needsUpdate = true;
    }
  }

  public areLinked(a: Seed, b: Seed): boolean {
    return this.links.has(this.getLinkKey(a, b));
  }

  public getLinkedSeeds(seed: Seed): Seed[] {
    const result: Seed[] = [];
    for (const link of this.links.values()) {
      if (link.seedA === seed) result.push(link.seedB);
      if (link.seedB === seed) result.push(link.seedA);
    }
    return result;
  }

  public dispose(): void {
    for (const key of this.links.keys()) {
      this.removeLink(key);
    }
  }
}
