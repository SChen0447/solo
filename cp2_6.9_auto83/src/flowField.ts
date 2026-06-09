import * as THREE from 'three';

export interface FlowFieldParams {
  updraftStrength: number;
  turbulenceStrength: number;
  shearStrength: number;
}

export class FlowField {
  private params: FlowFieldParams;
  private time: number = 0;
  private permutation: Uint8Array;
  private cloudCenter: THREE.Vector3;
  private cloudRadius: number;

  constructor(params: FlowFieldParams) {
    this.params = { ...params };
    this.cloudCenter = new THREE.Vector3(0, 2.5, 0);
    this.cloudRadius = 4;
    this.permutation = this.generatePermutation();
  }

  private generatePermutation(): Uint8Array {
    const p = new Uint8Array(512);
    const perm = new Uint8Array(256);
    for (let i = 0; i < 256; i++) {
      perm[i] = i;
    }
    for (let i = 255; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [perm[i], perm[j]] = [perm[j], perm[i]];
    }
    for (let i = 0; i < 512; i++) {
      p[i] = perm[i & 255];
    }
    return p;
  }

  private fade(t: number): number {
    return t * t * t * (t * (t * 6 - 15) + 10);
  }

  private lerp(a: number, b: number, t: number): number {
    return a + t * (b - a);
  }

  private grad(hash: number, x: number, y: number, z: number): number {
    const h = hash & 15;
    const u = h < 8 ? x : y;
    const v = h < 4 ? y : h === 12 || h === 14 ? x : z;
    return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v);
  }

  private perlinNoise3D(x: number, y: number, z: number): number {
    const X = Math.floor(x) & 255;
    const Y = Math.floor(y) & 255;
    const Z = Math.floor(z) & 255;

    x -= Math.floor(x);
    y -= Math.floor(y);
    z -= Math.floor(z);

    const u = this.fade(x);
    const v = this.fade(y);
    const w = this.fade(z);

    const A = this.permutation[X] + Y;
    const AA = this.permutation[A] + Z;
    const AB = this.permutation[A + 1] + Z;
    const B = this.permutation[X + 1] + Y;
    const BA = this.permutation[B] + Z;
    const BB = this.permutation[B + 1] + Z;

    return this.lerp(
      this.lerp(
        this.lerp(this.grad(this.permutation[AA], x, y, z), this.grad(this.permutation[BA], x - 1, y, z), u),
        this.lerp(this.grad(this.permutation[AB], x, y - 1, z), this.grad(this.permutation[BB], x - 1, y - 1, z), u),
        v
      ),
      this.lerp(
        this.lerp(this.grad(this.permutation[AA + 1], x, y, z - 1), this.grad(this.permutation[BA + 1], x - 1, y, z - 1), u),
        this.lerp(this.grad(this.permutation[AB + 1], x, y - 1, z - 1), this.grad(this.permutation[BB + 1], x - 1, y - 1, z - 1), u),
        v
      ),
      w
    );
  }

  public updateParams(params: Partial<FlowFieldParams>): void {
    Object.assign(this.params, params);
  }

  public update(deltaTime: number): void {
    this.time += deltaTime;
  }

  private getUpdraftVelocity(x: number, y: number, z: number): THREE.Vector3 {
    const velocity = new THREE.Vector3(0, 0, 0);
    const dx = x - this.cloudCenter.x;
    const dz = z - this.cloudCenter.z;
    const distFromCenter = Math.sqrt(dx * dx + dz * dz);
    const normalizedDist = distFromCenter / this.cloudRadius;

    if (normalizedDist < 1.0) {
      const heightFactor = Math.sin(Math.PI * Math.min(y / 5.0, 1.0));
      const radialFactor = Math.pow(1.0 - normalizedDist, 2);
      const updraftSpeed = this.params.updraftStrength * heightFactor * radialFactor;
      velocity.y = updraftSpeed;

      const inwardPull = 0.3 * this.params.updraftStrength * (1.0 - normalizedDist);
      velocity.x = -dx / Math.max(distFromCenter, 0.1) * inwardPull * (1.0 - Math.min(y / 5.0, 1.0));
      velocity.z = -dz / Math.max(distFromCenter, 0.1) * inwardPull * (1.0 - Math.min(y / 5.0, 1.0));
    }

    return velocity;
  }

  private getTurbulenceVelocity(x: number, y: number, z: number): THREE.Vector3 {
    const velocity = new THREE.Vector3(0, 0, 0);
    const noiseScale = 0.8;
    const timeOffset = this.time * 0.3;

    const nx = this.perlinNoise3D(x * noiseScale + timeOffset, y * noiseScale, z * noiseScale);
    const ny = this.perlinNoise3D(x * noiseScale, y * noiseScale + timeOffset, z * noiseScale + 100);
    const nz = this.perlinNoise3D(x * noiseScale + 200, y * noiseScale + 300, z * noiseScale + timeOffset);

    const dx = x - this.cloudCenter.x;
    const dz = z - this.cloudCenter.z;
    const distFromCenter = Math.sqrt(dx * dx + dz * dz);
    const edgeFactor = Math.min(distFromCenter / this.cloudRadius, 1.0);

    const rotSpeed = (0.5 + 1.0 * edgeFactor) * this.params.turbulenceStrength;
    const vortexAxis = new THREE.Vector3(0, 1, 0);
    const posVec = new THREE.Vector3(dx, 0, dz);
    const tangent = new THREE.Vector3().crossVectors(vortexAxis, posVec).normalize();

    velocity.x = (nx * 0.6 + tangent.x * edgeFactor) * rotSpeed;
    velocity.y = ny * rotSpeed * 0.4;
    velocity.z = (nz * 0.6 + tangent.z * edgeFactor) * rotSpeed;

    return velocity;
  }

  private getShearVelocity(x: number, y: number, z: number): THREE.Vector3 {
    const velocity = new THREE.Vector3(0, 0, 0);
    const heightFactor = y / 5.0;
    const shearAngle = heightFactor * Math.PI * 0.5 * this.params.shearStrength;

    const windDirX = Math.cos(shearAngle);
    const windDirZ = Math.sin(shearAngle);
    const windSpeed = 0.5 + heightFactor * 1.5;

    const shearNoise = this.perlinNoise3D(x * 0.2 + this.time * 0.1, y * 0.3, z * 0.2);

    velocity.x = windDirX * windSpeed * this.params.shearStrength * (0.8 + shearNoise * 0.4);
    velocity.z = windDirZ * windSpeed * this.params.shearStrength * (0.8 + shearNoise * 0.4);
    velocity.y = shearNoise * 0.2 * this.params.shearStrength;

    return velocity;
  }

  public getVelocity(x: number, y: number, z: number): THREE.Vector3 {
    const velocity = new THREE.Vector3(0, 0, 0);

    const clampedY = Math.max(0, Math.min(5, y));
    const adjustedY = clampedY;

    velocity.add(this.getUpdraftVelocity(x, adjustedY, z));
    velocity.add(this.getTurbulenceVelocity(x, adjustedY, z));
    velocity.add(this.getShearVelocity(x, adjustedY, z));

    return velocity;
  }

  public getFlowModeAt(y: number): 'updraft' | 'turbulence' | 'shear' {
    const clampedY = Math.max(0, Math.min(5, y));
    if (clampedY < 1.5) return 'updraft';
    if (clampedY < 3.5) return 'turbulence';
    return 'shear';
  }
}
