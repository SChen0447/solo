import * as THREE from 'three';

export interface ForceLine {
  start: THREE.Vector3;
  end: THREE.Vector3;
  tangent: THREE.Vector3;
  createdAt: number;
  lifetime: number;
}

export interface ForceFieldParams {
  vortexStrength: number;
}

const FORCE_RADIUS = 3;
const FORCE_RADIUS_SQ = FORCE_RADIUS * FORCE_RADIUS;

export class ForceField {
  public forceLines: ForceLine[] = [];
  public linesMesh: THREE.LineSegments;
  public linePositions: Float32Array;
  public lineColors: Float32Array;
  public lineGeometry: THREE.BufferGeometry;
  public lineMaterial: THREE.LineBasicMaterial;

  private maxLines: number = 200;
  private params: ForceFieldParams;

  constructor(params: ForceFieldParams) {
    this.params = { ...params };

    this.linePositions = new Float32Array(this.maxLines * 6);
    this.lineColors = new Float32Array(this.maxLines * 6);

    this.lineGeometry = new THREE.BufferGeometry();
    this.lineGeometry.setAttribute('position', new THREE.BufferAttribute(this.linePositions, 3));
    this.lineGeometry.setAttribute('color', new THREE.BufferAttribute(this.lineColors, 3));
    this.lineGeometry.setDrawRange(0, 0);

    this.lineMaterial = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.8,
      linewidth: 2
    });

    this.linesMesh = new THREE.LineSegments(this.lineGeometry, this.lineMaterial);
  }

  public updateParams(params: Partial<ForceFieldParams>): void {
    Object.assign(this.params, params);
  }

  public addForceLine(start: THREE.Vector3, end: THREE.Vector3): void {
    if (this.forceLines.length >= this.maxLines) {
      this.forceLines.shift();
    }

    const tangent = new THREE.Vector3().subVectors(end, start);
    const len = tangent.length();
    if (len > 0.001) {
      tangent.normalize();
    } else {
      tangent.set(0, 1, 0);
    }

    this.forceLines.push({
      start: start.clone(),
      end: end.clone(),
      tangent,
      createdAt: performance.now() / 1000,
      lifetime: 2
    });
  }

  public updateFields(): void {
    const now = performance.now() / 1000;
    this.forceLines = this.forceLines.filter(line => {
      const age = now - line.createdAt;
      return age < line.lifetime;
    });
    this.updateLinesMesh();
  }

  private updateLinesMesh(): void {
    const numLines = this.forceLines.length;
    for (let i = 0; i < numLines; i++) {
      const line = this.forceLines[i];
      const i6 = i * 6;
      const age = (performance.now() / 1000) - line.createdAt;
      const alpha = Math.max(0, 1 - age / line.lifetime) * 0.3;

      this.linePositions[i6] = line.start.x;
      this.linePositions[i6 + 1] = line.start.y;
      this.linePositions[i6 + 2] = line.start.z;
      this.linePositions[i6 + 3] = line.end.x;
      this.linePositions[i6 + 4] = line.end.y;
      this.linePositions[i6 + 5] = line.end.z;

      for (let j = 0; j < 2; j++) {
        const c3 = i6 + j * 3;
        this.lineColors[c3] = 0.1;
        this.lineColors[c3 + 1] = alpha;
        this.lineColors[c3 + 2] = alpha * 1.5;
      }
    }
    this.lineGeometry.setDrawRange(0, numLines * 2);
    (this.lineGeometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
    (this.lineGeometry.attributes.color as THREE.BufferAttribute).needsUpdate = true;
  }

  public getForce(x: number, y: number, z: number, _vx: number, _vy: number, _vz: number): { fx: number; fy: number; fz: number } {
    let fx = 0;
    let fy = 0;
    let fz = 0;
    const strength = this.params.vortexStrength;

    for (const line of this.forceLines) {
      const now = performance.now() / 1000;
      const age = now - line.createdAt;
      const fade = Math.max(0, 1 - age / line.lifetime);

      const ex = line.end.x - line.start.x;
      const ey = line.end.y - line.start.y;
      const ez = line.end.z - line.start.z;
      const lineLenSq = ex * ex + ey * ey + ez * ez;

      let t = 0;
      if (lineLenSq > 0.0001) {
        t = ((x - line.start.x) * ex + (y - line.start.y) * ey + (z - line.start.z) * ez) / lineLenSq;
        t = Math.max(0, Math.min(1, t));
      }

      const closestX = line.start.x + t * ex;
      const closestY = line.start.y + t * ey;
      const closestZ = line.start.z + t * ez;

      const dx = x - closestX;
      const dy = y - closestY;
      const dz = z - closestZ;
      const distSq = dx * dx + dy * dy + dz * dz;

      if (distSq < FORCE_RADIUS_SQ && distSq > 0.0001) {
        const dist = Math.sqrt(distSq);
        const falloff = 1 - dist / FORCE_RADIUS;
        const s = strength * fade * falloff;

        fx += line.tangent.x * s;
        fy += line.tangent.y * s;
        fz += line.tangent.z * s;
      }
    }

    return { fx, fy, fz };
  }

  public reset(): void {
    this.forceLines = [];
    this.lineGeometry.setDrawRange(0, 0);
    (this.lineGeometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
  }

  public dispose(): void {
    this.lineGeometry.dispose();
    this.lineMaterial.dispose();
  }
}
