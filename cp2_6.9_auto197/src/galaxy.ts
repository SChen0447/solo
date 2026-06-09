import * as THREE from 'three';

export interface GalaxyParams {
  particleCount: number;
  gravityStrength: number;
  rotationSpeed: number;
  colorScheme: string;
}

export type ColorPreset = 'warm-cool' | 'green-purple' | 'red-yellow' | 'white-blue' | 'rainbow';

const COLOR_PRESETS: Record<ColorPreset, [string, string]> = {
  'warm-cool': ['#FFAA00', '#5566FF'],
  'green-purple': ['#00FF88', '#AA44FF'],
  'red-yellow': ['#FF3344', '#FFDD44'],
  'white-blue': ['#FFFFFF', '#3388FF'],
  'rainbow': ['#FF0000', '#9900FF']
};

export class Galaxy {
  public points: THREE.Points;
  public geometry: THREE.BufferGeometry;
  public material: THREE.PointsMaterial;

  private positions: Float32Array;
  private velocities: Float32Array;
  private colors: Float32Array;
  private sizes: Float32Array;
  private initialPositions: Float32Array;
  private initialVelocities: Float32Array;

  private radius = 5;
  private currentCount: number;
  private maxCount: number;
  private isEvolving = false;
  private evolutionTime = 0;
  private colorScheme: ColorPreset = 'warm-cool';
  private baseSize = 0.05;
  private minSize = 0.02;

  constructor(params: GalaxyParams) {
    this.maxCount = 5000;
    this.currentCount = params.particleCount;
    this.colorScheme = params.colorScheme as ColorPreset;

    this.positions = new Float32Array(this.maxCount * 3);
    this.velocities = new Float32Array(this.maxCount * 3);
    this.colors = new Float32Array(this.maxCount * 3);
    this.sizes = new Float32Array(this.maxCount);
    this.initialPositions = new Float32Array(this.maxCount * 3);
    this.initialVelocities = new Float32Array(this.maxCount * 3);

    this.geometry = new THREE.BufferGeometry();
    this.geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3).setUsage(THREE.DynamicDrawUsage));
    this.geometry.setAttribute('color', new THREE.BufferAttribute(this.colors, 3).setUsage(THREE.DynamicDrawUsage));
    this.geometry.setAttribute('size', new THREE.BufferAttribute(this.sizes, 1).setUsage(THREE.DynamicDrawUsage));

    this.material = new THREE.PointsMaterial({
      size: this.baseSize,
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true
    });

    this.points = new THREE.Points(this.geometry, this.material);

    this.initializeParticles();
    this.updateDrawRange();
  }

  private randomInUnitSphere(): THREE.Vector3 {
    const v = new THREE.Vector3();
    do {
      v.set(
        Math.random() * 2 - 1,
        Math.random() * 2 - 1,
        Math.random() * 2 - 1
      );
    } while (v.lengthSq() > 1);
    return v.multiplyScalar(this.radius);
  }

  private lerpColor(color1: string, color2: string, t: number): THREE.Color {
    const c1 = new THREE.Color(color1);
    const c2 = new THREE.Color(color2);
    return c1.lerp(c2, t);
  }

  private getRainbowColor(t: number): THREE.Color {
    const hue = t;
    return new THREE.Color().setHSL(hue, 1.0, 0.6);
  }

  private getColorForDistance(normalizedDist: number): THREE.Color {
    if (this.colorScheme === 'rainbow') {
      return this.getRainbowColor(normalizedDist);
    }
    const preset = COLOR_PRESETS[this.colorScheme];
    return this.lerpColor(preset[0], preset[1], normalizedDist);
  }

  private initializeParticles(): void {
    for (let i = 0; i < this.maxCount; i++) {
      const pos = this.randomInUnitSphere();
      const dist = pos.length();
      const normalizedDist = dist / this.radius;

      this.positions[i * 3] = pos.x;
      this.positions[i * 3 + 1] = pos.y;
      this.positions[i * 3 + 2] = pos.z;

      this.initialPositions[i * 3] = pos.x;
      this.initialPositions[i * 3 + 1] = pos.y;
      this.initialPositions[i * 3 + 2] = pos.z;

      if (dist > 0.01) {
        const angularSpeed = 1.0 / (0.5 + dist * 0.5);
        const up = new THREE.Vector3(0, 1, 0);
        const tangent = new THREE.Vector3().crossVectors(up, pos).normalize();
        const speed = angularSpeed * 0.5 + Math.random() * 0.2;

        this.velocities[i * 3] = tangent.x * speed + (Math.random() - 0.5) * 0.05;
        this.velocities[i * 3 + 1] = (Math.random() - 0.5) * 0.05;
        this.velocities[i * 3 + 2] = tangent.z * speed + (Math.random() - 0.5) * 0.05;
      } else {
        this.velocities[i * 3] = 0;
        this.velocities[i * 3 + 1] = 0;
        this.velocities[i * 3 + 2] = 0;
      }

      this.initialVelocities[i * 3] = this.velocities[i * 3];
      this.initialVelocities[i * 3 + 1] = this.velocities[i * 3 + 1];
      this.initialVelocities[i * 3 + 2] = this.velocities[i * 3 + 2];

      const color = this.getColorForDistance(normalizedDist);
      this.colors[i * 3] = color.r;
      this.colors[i * 3 + 1] = color.g;
      this.colors[i * 3 + 2] = color.b;

      this.sizes[i] = this.baseSize - normalizedDist * (this.baseSize - this.minSize);
    }

    this.geometry.attributes.position.needsUpdate = true;
    this.geometry.attributes.color.needsUpdate = true;
    this.geometry.attributes.size.needsUpdate = true;
  }

  private updateDrawRange(): void {
    this.geometry.setDrawRange(0, this.currentCount);
  }

  public setParticleCount(count: number): void {
    const newCount = Math.max(500, Math.min(5000, Math.floor(count / 100) * 100));
    if (newCount === this.currentCount) return;
    this.currentCount = newCount;
    this.updateDrawRange();
    this.updateGeometryAttributes();
  }

  public setColorScheme(scheme: string): void {
    this.colorScheme = scheme as ColorPreset;
    for (let i = 0; i < this.maxCount; i++) {
      const x = this.positions[i * 3];
      const y = this.positions[i * 3 + 1];
      const z = this.positions[i * 3 + 2];
      const dist = Math.sqrt(x * x + y * y + z * z);
      const normalizedDist = Math.min(dist / this.radius, 1.0);
      const color = this.getColorForDistance(normalizedDist);
      this.colors[i * 3] = color.r;
      this.colors[i * 3 + 1] = color.g;
      this.colors[i * 3 + 2] = color.b;
    }
    this.geometry.attributes.color.needsUpdate = true;
  }

  public setBaseSize(size: number): void {
    this.baseSize = size;
    this.minSize = size * 0.4;
    for (let i = 0; i < this.maxCount; i++) {
      const x = this.positions[i * 3];
      const y = this.positions[i * 3 + 1];
      const z = this.positions[i * 3 + 2];
      const dist = Math.sqrt(x * x + y * y + z * z);
      const normalizedDist = Math.min(dist / this.radius, 1.0);
      this.sizes[i] = this.baseSize - normalizedDist * (this.baseSize - this.minSize);
    }
    this.material.size = this.baseSize;
    this.geometry.attributes.size.needsUpdate = true;
  }

  public reset(): void {
    for (let i = 0; i < this.maxCount * 3; i++) {
      this.positions[i] = this.initialPositions[i];
      this.velocities[i] = this.initialVelocities[i];
    }
    this.evolutionTime = 0;
    this.updateGeometryAttributes();
  }

  public toggleEvolution(): boolean {
    this.isEvolving = !this.isEvolving;
    return this.isEvolving;
  }

  public setEvolving(evolving: boolean): void {
    this.isEvolving = evolving;
  }

  public getIsEvolving(): boolean {
    return this.isEvolving;
  }

  public getEvolutionTime(): number {
    return this.evolutionTime;
  }

  private updateGeometryAttributes(): void {
    this.geometry.attributes.position.needsUpdate = true;
    this.geometry.attributes.color.needsUpdate = true;
    this.geometry.attributes.size.needsUpdate = true;
  }

  public update(delta: number, gravityStrength: number, rotationSpeed: number): void {
    if (!this.isEvolving) return;

    this.evolutionTime += delta;

    const count = this.currentCount;
    const softening = 0.5;

    for (let i = 0; i < count; i++) {
      const ix = i * 3;
      const iy = ix + 1;
      const iz = ix + 2;

      const px = this.positions[ix];
      const py = this.positions[iy];
      const pz = this.positions[iz];

      const distSq = px * px + py * py + pz * pz;
      const dist = Math.sqrt(distSq);

      if (dist > 0.01) {
        const invDist = 1.0 / Math.max(dist, softening);
        const invDistCubed = invDist * invDist * invDist;
        const accelMag = -gravityStrength * invDistCubed;

        this.velocities[ix] += px * accelMag * delta;
        this.velocities[iy] += py * accelMag * delta;
        this.velocities[iz] += pz * accelMag * delta;

        const upY = 1.0;
        const tangentX = -pz;
        const tangentZ = px;
        const tangentLen = Math.sqrt(tangentX * tangentX + tangentZ * tangentZ);
        if (tangentLen > 0.01) {
          const orbitSpeed = rotationSpeed * (0.8 / (0.5 + dist * 0.3)) * delta;
          this.velocities[ix] += (tangentX / tangentLen) * orbitSpeed * 0.1;
          this.velocities[iz] += (tangentZ / tangentLen) * orbitSpeed * 0.1;
        }

        const spiralPhase = Math.atan2(pz, px) + this.evolutionTime * 0.3;
        const spiralMod = Math.sin(spiralPhase * 2) * 0.02;
        this.velocities[iy] += (upY - py * 0.5) * spiralMod * delta;
      }

      this.velocities[ix] += (Math.random() - 0.5) * 0.005 * delta;
      this.velocities[iy] += (Math.random() - 0.5) * 0.005 * delta;
      this.velocities[iz] += (Math.random() - 0.5) * 0.005 * delta;

      this.positions[ix] += this.velocities[ix] * delta;
      this.positions[iy] += this.velocities[iy] * delta;
      this.positions[iz] += this.velocities[iz] * delta;

      const newDist = Math.sqrt(
        this.positions[ix] * this.positions[ix] +
        this.positions[iy] * this.positions[iy] +
        this.positions[iz] * this.positions[iz]
      );

      if (newDist > this.radius * 2.5) {
        const scale = (this.radius * 2.5) / newDist;
        this.positions[ix] *= scale;
        this.positions[iy] *= scale;
        this.positions[iz] *= scale;
        this.velocities[ix] *= 0.5;
        this.velocities[iy] *= 0.5;
        this.velocities[iz] *= 0.5;
      }

      const normalizedDist = Math.min(newDist / this.radius, 1.0);
      this.sizes[i] = this.baseSize - normalizedDist * (this.baseSize - this.minSize);
    }

    this.updateGeometryAttributes();
  }

  public dispose(): void {
    this.geometry.dispose();
    this.material.dispose();
  }
}
