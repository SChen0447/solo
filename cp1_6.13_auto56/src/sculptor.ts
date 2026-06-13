import * as THREE from 'three';

export interface SculptParams {
  radius: number;
  strength: number;
  direction: 'dent' | 'bulge';
}

export class Sculptor {
  private geometry: THREE.BufferGeometry;
  private originalPositions: Float32Array;
  private currentPositions: Float32Array;
  private positionAttribute: THREE.BufferAttribute;
  private vertexCount: number;

  constructor(geometry: THREE.BufferGeometry) {
    this.geometry = geometry;
    this.positionAttribute = geometry.getAttribute('position') as THREE.BufferAttribute;
    this.vertexCount = this.positionAttribute.count;
    this.originalPositions = new Float32Array(this.positionAttribute.array as Float32Array);
    this.currentPositions = new Float32Array(this.positionAttribute.array as Float32Array);
  }

  public sculpt(
    hitPoint: THREE.Vector3,
    params: SculptParams
  ): void {
    const { radius, strength, direction } = params;
    const radiusSq = radius * radius;
    const sign = direction === 'dent' ? -1 : 1;
    const sigma = radius / 3;
    const twoSigmaSq = 2 * sigma * sigma;
    const maxDisplacement = 0.3 * strength;

    const ox = this.originalPositions;
    const cp = this.currentPositions;
    const hx = hitPoint.x;
    const hy = hitPoint.y;
    const hz = hitPoint.z;

    for (let i = 0; i < this.vertexCount; i++) {
      const ix = i * 3;
      const vx = cp[ix];
      const vy = cp[ix + 1];
      const vz = cp[ix + 2];

      const dx = vx - hx;
      const dy = vy - hy;
      const dz = vz - hz;
      const distSq = dx * dx + dy * dy + dz * dz;

      if (distSq < radiusSq) {
        const falloff = Math.exp(-distSq / twoSigmaSq);
        const displacement = sign * maxDisplacement * falloff;

        const nvx = ox[ix];
        const nvy = ox[ix + 1];
        const nvz = ox[ix + 2];
        const len = Math.sqrt(nvx * nvx + nvy * nvy + nvz * nvz);
        if (len > 0) {
          const nx = nvx / len;
          const ny = nvy / len;
          const nz = nvz / len;

          cp[ix] = nvx + nx * displacement;
          cp[ix + 1] = nvy + ny * displacement;
          cp[ix + 2] = nvz + nz * displacement;
        }
      }
    }

    this.updateGeometry();
  }

  public applyNoise(hitPoint: THREE.Vector3, radius: number, intensity: number = 0.015): void {
    const radiusSq = radius * radius;
    const sigma = radius / 3;
    const twoSigmaSq = 2 * sigma * sigma;

    const cp = this.currentPositions;
    const ox = this.originalPositions;
    const hx = hitPoint.x;
    const hy = hitPoint.y;
    const hz = hitPoint.z;

    for (let i = 0; i < this.vertexCount; i++) {
      const ix = i * 3;
      const vx = cp[ix];
      const vy = cp[ix + 1];
      const vz = cp[ix + 2];

      const dx = vx - hx;
      const dy = vy - hy;
      const dz = vz - hz;
      const distSq = dx * dx + dy * dy + dz * dz;

      if (distSq < radiusSq) {
        const falloff = Math.exp(-distSq / twoSigmaSq);
        const noise = (Math.random() - 0.5) * 2 * intensity * falloff;

        const nvx = ox[ix];
        const nvy = ox[ix + 1];
        const nvz = ox[ix + 2];
        const len = Math.sqrt(nvx * nvx + nvy * nvy + nvz * nvz);
        if (len > 0) {
          const nx = nvx / len;
          const ny = nvy / len;
          const nz = nvz / len;

          cp[ix] += nx * noise;
          cp[ix + 1] += ny * noise;
          cp[ix + 2] += nz * noise;
        }
      }
    }

    this.updateGeometry();
  }

  public resetAnimated(progress: number): void {
    const cp = this.currentPositions;
    const ox = this.originalPositions;

    for (let i = 0; i < this.vertexCount; i++) {
      const ix = i * 3;
      const x = ox[ix];
      const y = ox[ix + 1];
      const z = ox[ix + 2];

      const distFromCenter = Math.sqrt(x * x + y * y + z * z);
      const waveProgress = (progress * 2 - distFromCenter);
      const waveFactor = Math.max(0, Math.min(1, waveProgress));
      const eased = waveFactor * waveFactor * (3 - 2 * waveFactor);

      cp[ix] = cp[ix] + (x - cp[ix]) * eased;
      cp[ix + 1] = cp[ix + 1] + (y - cp[ix + 1]) * eased;
      cp[ix + 2] = cp[ix + 2] + (z - cp[ix + 2]) * eased;
    }

    this.updateGeometry();
  }

  public reset(): void {
    this.currentPositions.set(this.originalPositions);
    this.updateGeometry();
  }

  private updateGeometry(): void {
    const attr = this.positionAttribute;
    (attr.array as Float32Array).set(this.currentPositions);
    attr.needsUpdate = true;
    this.geometry.computeVertexNormals();
  }

  public getGeometry(): THREE.BufferGeometry {
    return this.geometry;
  }

  public getOriginalPositions(): Float32Array {
    return this.originalPositions;
  }
}
