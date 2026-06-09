import * as THREE from 'three';

export class ParticleField {
  private scene: THREE.Scene;
  private points: THREE.Points;
  private geometry: THREE.BufferGeometry;
  private material: THREE.PointsMaterial;
  private particleCount: number;

  private positions: Float32Array;
  private originalPositions: Float32Array;
  private colors: Float32Array;
  private sizes: Float32Array;
  private velocities: Float32Array;
  private phases: Float32Array;
  private periods: Float32Array;
  private baseSizes: Float32Array;

  private currentHeading: number = 0;
  private targetHeading: number = 0;
  private headingTransitionDuration: number = 0.3;
  private headingTransitionElapsed: number = 0;
  private startHeading: number = 0;

  private time: number = 0;
  private readonly sphereRadius: number = 8;
  private readonly minSize: number = 0.03;
  private readonly maxSize: number = 0.1;

  constructor(scene: THREE.Scene, count: number = 5000) {
    this.scene = scene;
    this.particleCount = count;

    this.positions = new Float32Array(count * 3);
    this.originalPositions = new Float32Array(count * 3);
    this.colors = new Float32Array(count * 3);
    this.sizes = new Float32Array(count);
    this.velocities = new Float32Array(count * 3);
    this.phases = new Float32Array(count);
    this.periods = new Float32Array(count);
    this.baseSizes = new Float32Array(count);

    this.initializeParticles();

    this.geometry = new THREE.BufferGeometry();
    this.geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    this.geometry.setAttribute('color', new THREE.BufferAttribute(this.colors, 3));
    this.geometry.setAttribute('size', new THREE.BufferAttribute(this.sizes, 1));

    const spriteMap = this.createGlowTexture();

    this.material = new THREE.PointsMaterial({
      size: 0.08,
      map: spriteMap,
      vertexColors: true,
      transparent: true,
      opacity: 0.45,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true
    });

    this.points = new THREE.Points(this.geometry, this.material);
    this.scene.add(this.points);
  }

  private createGlowTexture(): THREE.Texture {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d')!;

    const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    gradient.addColorStop(0, 'rgba(255, 255, 255, 0.6)');
    gradient.addColorStop(0.15, 'rgba(255, 255, 255, 0.4)');
    gradient.addColorStop(0.35, 'rgba(180, 220, 255, 0.25)');
    gradient.addColorStop(0.6, 'rgba(100, 180, 220, 0.1)');
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 64, 64);

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
  }

  private initializeParticles(): void {
    const colorStart = new THREE.Color('#4A90D9');
    const colorEnd = new THREE.Color('#50E3C2');
    const tempColor = new THREE.Color();

    for (let i = 0; i < this.particleCount; i++) {
      const i3 = i * 3;

      const u = Math.random();
      const radius = this.sphereRadius * Math.cbrt(u);
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);

      const x = radius * Math.sin(phi) * Math.cos(theta);
      const y = radius * Math.sin(phi) * Math.sin(theta);
      const z = radius * Math.cos(phi);

      this.positions[i3] = x;
      this.positions[i3 + 1] = y;
      this.positions[i3 + 2] = z;

      this.originalPositions[i3] = x;
      this.originalPositions[i3 + 1] = y;
      this.originalPositions[i3 + 2] = z;

      const t = Math.random();
      tempColor.copy(colorStart).lerp(colorEnd, t);
      this.colors[i3] = tempColor.r;
      this.colors[i3 + 1] = tempColor.g;
      this.colors[i3 + 2] = tempColor.b;

      const speed = 0.002 + Math.random() * 0.004;
      const vTheta = Math.random() * Math.PI * 2;
      const vPhi = Math.acos(2 * Math.random() - 1);
      this.velocities[i3] = Math.sin(vPhi) * Math.cos(vTheta) * speed;
      this.velocities[i3 + 1] = Math.sin(vPhi) * Math.sin(vTheta) * speed;
      this.velocities[i3 + 2] = Math.cos(vPhi) * speed;

      this.phases[i] = Math.random() * Math.PI * 2;
      this.periods[i] = 1 + Math.random() * 2;

      const size = this.minSize + Math.random() * (this.maxSize - this.minSize);
      this.baseSizes[i] = size;
      this.sizes[i] = size;
    }
  }

  updateHeading(targetHeading: number): void {
    while (targetHeading > 180) targetHeading -= 360;
    while (targetHeading < -180) targetHeading += 360;

    let diff = targetHeading - this.currentHeading;
    if (diff > 180) diff -= 360;
    if (diff < -180) diff += 360;

    this.startHeading = this.currentHeading;
    this.targetHeading = this.startHeading + diff;
    this.headingTransitionElapsed = 0;
  }

  update(delta: number): void {
    this.time += delta;

    if (this.headingTransitionElapsed < this.headingTransitionDuration) {
      this.headingTransitionElapsed += delta;
      const t = Math.min(this.headingTransitionElapsed / this.headingTransitionDuration, 1);
      const easeT = 1 - Math.pow(1 - t, 3);
      this.currentHeading = this.startHeading + (this.targetHeading - this.startHeading) * easeT;
    } else {
      this.currentHeading = this.targetHeading;
    }

    const headingRad = (this.currentHeading * Math.PI) / 180;
    const cosH = Math.cos(headingRad);
    const sinH = Math.sin(headingRad);

    const positionAttr = this.geometry.getAttribute('position') as THREE.BufferAttribute;
    const sizeAttr = this.geometry.getAttribute('size') as THREE.BufferAttribute;
    const positionArray = positionAttr.array as Float32Array;
    const sizeArray = sizeAttr.array as Float32Array;

    for (let i = 0; i < this.particleCount; i++) {
      const i3 = i * 3;

      this.originalPositions[i3] += this.velocities[i3];
      this.originalPositions[i3 + 1] += this.velocities[i3 + 1];
      this.originalPositions[i3 + 2] += this.velocities[i3 + 2];

      const ox = this.originalPositions[i3];
      const oy = this.originalPositions[i3 + 1];
      const oz = this.originalPositions[i3 + 2];
      const dist = Math.sqrt(ox * ox + oy * oy + oz * oz);

      if (dist > this.sphereRadius) {
        const scale = this.sphereRadius / dist;
        this.originalPositions[i3] = ox * scale;
        this.originalPositions[i3 + 1] = oy * scale;
        this.originalPositions[i3 + 2] = oz * scale;

        const vDot = (this.velocities[i3] * ox + this.velocities[i3 + 1] * oy + this.velocities[i3 + 2] * oz) / (dist * dist);
        this.velocities[i3] -= 2 * vDot * ox;
        this.velocities[i3 + 1] -= 2 * vDot * oy;
        this.velocities[i3 + 2] -= 2 * vDot * oz;
      }

      positionArray[i3] = this.originalPositions[i3] * cosH + this.originalPositions[i3 + 2] * sinH;
      positionArray[i3 + 1] = this.originalPositions[i3 + 1];
      positionArray[i3 + 2] = -this.originalPositions[i3] * sinH + this.originalPositions[i3 + 2] * cosH;

      const phase = this.phases[i];
      const period = this.periods[i];
      const flicker = Math.sin((this.time / period) * Math.PI * 2 + phase);
      const normalizedFlicker = (flicker + 1) * 0.5;
      sizeArray[i] = this.baseSizes[i] * (0.6 + normalizedFlicker * 0.4);
    }

    positionAttr.needsUpdate = true;
    sizeAttr.needsUpdate = true;
  }

  getVisibleCount(): number {
    return this.particleCount;
  }

  setParticleCount(count: number): void {
    if (count === this.particleCount) return;

    this.scene.remove(this.points);
    this.geometry.dispose();
    this.material.dispose();

    this.particleCount = count;
    this.positions = new Float32Array(count * 3);
    this.originalPositions = new Float32Array(count * 3);
    this.colors = new Float32Array(count * 3);
    this.sizes = new Float32Array(count);
    this.velocities = new Float32Array(count * 3);
    this.phases = new Float32Array(count);
    this.periods = new Float32Array(count);
    this.baseSizes = new Float32Array(count);

    this.initializeParticles();

    this.geometry = new THREE.BufferGeometry();
    this.geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    this.geometry.setAttribute('color', new THREE.BufferAttribute(this.colors, 3));
    this.geometry.setAttribute('size', new THREE.BufferAttribute(this.sizes, 1));

    this.points = new THREE.Points(this.geometry, this.material);
    this.scene.add(this.points);
  }

  dispose(): void {
    this.scene.remove(this.points);
    this.geometry.dispose();
    this.material.dispose();
    if (this.material.map) {
      this.material.map.dispose();
    }
  }
}
