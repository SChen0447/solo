import * as THREE from 'three';
import type { ParticleData } from './textParticles';

export interface RippleEvent {
  centerIndex: number;
  worldX: number;
  worldY: number;
  worldZ: number;
}

interface RippleState {
  active: boolean;
  centerX: number;
  centerY: number;
  centerZ: number;
  startTime: number;
  duration: number;
  affected: Int32Array;
  affectedCount: number;
  normals: Float32Array;
}

interface RippleHalo {
  active: boolean;
  startTime: number;
  x: number;
  y: number;
  z: number;
}

const ROTATION_SPEED = 0.3;
const TRANSITION_DURATION = 3000;
const RIPPLE_DURATION = 500;
const RIPPLE_RADIUS = 30;
const RIPPLE_AFFECT_COUNT = 100;

export class ParticleSystem {
  public group: THREE.Group;
  public points: THREE.Points;
  public geometry: THREE.BufferGeometry;
  public material: THREE.PointsMaterial;
  private particleData: ParticleData;
  private transitionStart: number = 0;
  private isTransitioning: boolean = false;
  private ripples: RippleState[] = [];
  private haloMeshes: THREE.Mesh[] = [];
  private halos: RippleHalo[] = [];
  public baseSize: number = 0.06;

  constructor(particleData: ParticleData) {
    this.particleData = particleData;
    this.group = new THREE.Group();
    this.geometry = new THREE.BufferGeometry();
    this.material = new THREE.PointsMaterial({
      size: this.baseSize,
      vertexColors: true,
      transparent: true,
      opacity: 1.0,
      sizeAttenuation: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    this.buildGeometry();
    this.points = new THREE.Points(this.geometry, this.material);
    this.group.add(this.points);

    this.startTransition();
  }

  private buildGeometry(): void {
    const { positions, colors, sizes, totalParticles } = this.particleData;
    this.geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(positions), 3));
    this.geometry.setAttribute('color', new THREE.BufferAttribute(new Float32Array(colors), 3));
    this.geometry.setAttribute('size', new THREE.BufferAttribute(new Float32Array(sizes), 1));
    this.geometry.setDrawRange(0, totalParticles);
  }

  public updateData(particleData: ParticleData): void {
    this.particleData = particleData;
    const posAttr = this.geometry.getAttribute('position') as THREE.BufferAttribute;
    const colAttr = this.geometry.getAttribute('color') as THREE.BufferAttribute;
    const sizeAttr = this.geometry.getAttribute('size') as THREE.BufferAttribute;

    if (posAttr.count !== particleData.totalParticles) {
      this.geometry.dispose();
      this.buildGeometry();
      this.points.geometry = this.geometry;
    } else {
      posAttr.array.set(particleData.positions);
      colAttr.array.set(particleData.colors);
      sizeAttr.array.set(particleData.sizes);
      posAttr.needsUpdate = true;
      colAttr.needsUpdate = true;
      sizeAttr.needsUpdate = true;
    }

    this.geometry.setDrawRange(0, particleData.totalParticles);
    this.geometry.computeBoundingSphere();
    this.startTransition();
  }

  public startTransition(): void {
    this.isTransitioning = true;
    this.transitionStart = performance.now();
  }

  public triggerRipple(centerIndex: number): void {
    const { targetPositions, totalParticles } = this.particleData;
    if (centerIndex < 0 || centerIndex >= totalParticles) return;

    const cx = targetPositions[centerIndex * 3];
    const cy = targetPositions[centerIndex * 3 + 1];
    const cz = targetPositions[centerIndex * 3 + 2];

    const distances: Array<{ idx: number; dist: number }> = [];
    for (let i = 0; i < totalParticles; i++) {
      const dx = targetPositions[i * 3] - cx;
      const dy = targetPositions[i * 3 + 1] - cy;
      const dz = targetPositions[i * 3 + 2] - cz;
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
      if (dist < 2.5) {
        distances.push({ idx: i, dist });
      }
    }

    distances.sort((a, b) => a.dist - b.dist);
    const affectCount = Math.min(RIPPLE_AFFECT_COUNT, distances.length);
    const affected = new Int32Array(affectCount);
    const normals = new Float32Array(affectCount * 3);

    for (let i = 0; i < affectCount; i++) {
      const idx = distances[i].idx;
      affected[i] = idx;
      let dx = targetPositions[idx * 3] - cx;
      let dy = targetPositions[idx * 3 + 1] - cy;
      let dz = targetPositions[idx * 3 + 2] - cz;
      const len = Math.sqrt(dx * dx + dy * dy + dz * dz);
      if (len > 0.0001) {
        dx /= len;
        dy /= len;
        dz /= len;
      } else {
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        dx = Math.sin(phi) * Math.cos(theta);
        dy = Math.sin(phi) * Math.sin(theta);
        dz = Math.cos(phi);
      }
      normals[i * 3] = dx;
      normals[i * 3 + 1] = dy;
      normals[i * 3 + 2] = dz;
    }

    this.ripples.push({
      active: true,
      centerX: cx,
      centerY: cy,
      centerZ: cz,
      startTime: performance.now(),
      duration: RIPPLE_DURATION,
      affected,
      affectedCount: affectCount,
      normals,
    });

    this.addHalo(cx, cy, cz);
  }

  private addHalo(x: number, y: number, z: number): void {
    const haloGeo = new THREE.RingGeometry(0.01, 0.02, 48);
    const haloMat = new THREE.MeshBasicMaterial({
      color: 0x60a5fa,
      transparent: true,
      opacity: 0.8,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const mesh = new THREE.Mesh(haloGeo, haloMat);
    mesh.position.set(x, y, z);
    mesh.lookAt(0, 0, 10);
    this.group.add(mesh);
    this.haloMeshes.push(mesh);
    this.halos.push({
      active: true,
      startTime: performance.now(),
      x,
      y,
      z,
    });
  }

  public updateSizeByDistance(cameraDistance: number): void {
    this.material.size = this.baseSize * (cameraDistance / 10);
  }

  public animate(currentTime: number, deltaTime: number): void {
    this.group.rotation.y += ROTATION_SPEED * deltaTime;

    const posAttr = this.geometry.getAttribute('position') as THREE.BufferAttribute;
    const colAttr = this.geometry.getAttribute('color') as THREE.BufferAttribute;
    const posArray = posAttr.array as Float32Array;
    const colArray = colAttr.array as Float32Array;

    const { positions, targetPositions, targetColors, totalParticles } = this.particleData;

    if (this.isTransitioning) {
      const elapsed = currentTime - this.transitionStart;
      if (elapsed >= TRANSITION_DURATION) {
        this.isTransitioning = false;
        for (let i = 0; i < totalParticles; i++) {
          posArray[i * 3] = targetPositions[i * 3];
          posArray[i * 3 + 1] = targetPositions[i * 3 + 1];
          posArray[i * 3 + 2] = targetPositions[i * 3 + 2];
        }
      } else {
        const t = elapsed / TRANSITION_DURATION;
        const ease = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
        for (let i = 0; i < totalParticles; i++) {
          posArray[i * 3] = positions[i * 3] + (targetPositions[i * 3] - positions[i * 3]) * ease;
          posArray[i * 3 + 1] = positions[i * 3 + 1] + (targetPositions[i * 3 + 1] - positions[i * 3 + 1]) * ease;
          posArray[i * 3 + 2] = positions[i * 3 + 2] + (targetPositions[i * 3 + 2] - positions[i * 3 + 2]) * ease;
        }
      }
    } else {
      for (let i = 0; i < totalParticles; i++) {
        posArray[i * 3] = targetPositions[i * 3];
        posArray[i * 3 + 1] = targetPositions[i * 3 + 1];
        posArray[i * 3 + 2] = targetPositions[i * 3 + 2];
      }
    }

    for (let i = 0; i < totalParticles * 3; i++) {
      colArray[i] = targetColors[i];
    }

    for (let r = this.ripples.length - 1; r >= 0; r--) {
      const ripple = this.ripples[r];
      const elapsed = currentTime - ripple.startTime;
      if (elapsed >= ripple.duration) {
        this.ripples.splice(r, 1);
        continue;
      }
      const t = elapsed / ripple.duration;
      const pulse = Math.sin(t * Math.PI);
      const offset = (RIPPLE_RADIUS / 100) * pulse;
      const colorMix = pulse;

      for (let j = 0; j < ripple.affectedCount; j++) {
        const idx = ripple.affected[j];
        const nx = ripple.normals[j * 3];
        const ny = ripple.normals[j * 3 + 1];
        const nz = ripple.normals[j * 3 + 2];

        posArray[idx * 3] += nx * offset;
        posArray[idx * 3 + 1] += ny * offset;
        posArray[idx * 3 + 2] += nz * offset;

        colArray[idx * 3] = colArray[idx * 3] * (1 - colorMix) + 1.0 * colorMix;
        colArray[idx * 3 + 1] = colArray[idx * 3 + 1] * (1 - colorMix) + 1.0 * colorMix;
        colArray[idx * 3 + 2] = colArray[idx * 3 + 2] * (1 - colorMix) + 1.0 * colorMix;
      }
    }

    for (let h = this.halos.length - 1; h >= 0; h--) {
      const halo = this.halos[h];
      const elapsed = currentTime - halo.startTime;
      const duration = 600;
      if (elapsed >= duration) {
        this.group.remove(this.haloMeshes[h]);
        this.haloMeshes[h].geometry.dispose();
        (this.haloMeshes[h].material as THREE.Material).dispose();
        this.haloMeshes.splice(h, 1);
        this.halos.splice(h, 1);
        continue;
      }
      const t = elapsed / duration;
      const innerR = 0.05 + t * 1.0;
      const outerR = 0.08 + t * 1.2;
      const opacity = 0.8 * (1 - t);
      const mesh = this.haloMeshes[h];
      const mat = mesh.material as THREE.MeshBasicMaterial;
      mat.opacity = opacity;
      mesh.geometry.dispose();
      mesh.geometry = new THREE.RingGeometry(innerR, outerR, 48);
    }

    posAttr.needsUpdate = true;
    colAttr.needsUpdate = true;
  }

  public getWorldParticlePosition(index: number): THREE.Vector3 {
    const pos = new THREE.Vector3(
      this.particleData.targetPositions[index * 3],
      this.particleData.targetPositions[index * 3 + 1],
      this.particleData.targetPositions[index * 3 + 2]
    );
    pos.applyMatrix4(this.group.matrixWorld);
    return pos;
  }

  public getTotalParticles(): number {
    return this.particleData.totalParticles;
  }

  public dispose(): void {
    this.geometry.dispose();
    this.material.dispose();
    for (const mesh of this.haloMeshes) {
      mesh.geometry.dispose();
      (mesh.material as THREE.Material).dispose();
    }
  }
}

export function createStarfield(count: number = 500): { points: THREE.Points; update: (time: number) => void } {
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const phases = new Float32Array(count);
  const speeds = new Float32Array(count);
  const baseSizes = new Float32Array(count);

  for (let i = 0; i < count; i++) {
    const radius = 20 + Math.random() * 40;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
    positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
    positions[i * 3 + 2] = radius * Math.cos(phi) - 10;

    colors[i * 3] = 1.0;
    colors[i * 3 + 1] = 1.0;
    colors[i * 3 + 2] = 1.0;

    phases[i] = Math.random() * Math.PI * 2;
    speeds[i] = 1.0 + Math.random() * 2.0;
    baseSizes[i] = 0.02 + Math.random() * 0.03;
  }

  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

  const material = new THREE.PointsMaterial({
    size: 0.03,
    vertexColors: true,
    transparent: true,
    opacity: 0.5,
    sizeAttenuation: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });

  const points = new THREE.Points(geometry, material);

  const update = (time: number): void => {
    const colAttr = geometry.getAttribute('color') as THREE.BufferAttribute;
    const colArray = colAttr.array as Float32Array;
    for (let i = 0; i < count; i++) {
      const alpha = 0.2 + 0.5 * (0.5 + 0.5 * Math.sin(time * speeds[i] * 0.001 + phases[i]));
      colArray[i * 3] = alpha;
      colArray[i * 3 + 1] = alpha;
      colArray[i * 3 + 2] = alpha;
    }
    colAttr.needsUpdate = true;
    material.opacity = 1.0;
  };

  return { points, update };
}
