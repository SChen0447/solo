import * as THREE from 'three';

export interface GalaxyOptions {
  particleCount: number;
  startHue: number;
  endHue: number;
  radius: number;
}

export class ParticleGalaxy {
  public points: THREE.Points;
  public geometry: THREE.BufferGeometry;
  public material: THREE.PointsMaterial;

  private particleCount: number;
  private startHue: number;
  private endHue: number;
  private radius: number;

  private basePositions: Float32Array;
  private offsets: Float32Array;
  private frequencies: Float32Array;
  private phases: Float32Array;

  private rotationSpeed: number = 0.15;

  constructor(options: GalaxyOptions) {
    this.particleCount = options.particleCount;
    this.startHue = options.startHue;
    this.endHue = options.endHue;
    this.radius = options.radius;

    this.geometry = new THREE.BufferGeometry();
    this.basePositions = new Float32Array(this.particleCount * 3);
    this.offsets = new Float32Array(this.particleCount * 3);
    this.frequencies = new Float32Array(this.particleCount);
    this.phases = new Float32Array(this.particleCount);

    this.generateParticles();

    const texture = this.createGlowTexture();

    this.material = new THREE.PointsMaterial({
      size: 0.05,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.9,
      vertexColors: true,
      map: texture,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    this.points = new THREE.Points(this.geometry, this.material);
  }

  private createGlowTexture(): THREE.Texture {
    const size = 64;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;

    const gradient = ctx.createRadialGradient(
      size / 2, size / 2, 0,
      size / 2, size / 2, size / 2
    );
    gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
    gradient.addColorStop(0.2, 'rgba(255, 255, 255, 0.8)');
    gradient.addColorStop(0.4, 'rgba(255, 255, 255, 0.4)');
    gradient.addColorStop(0.7, 'rgba(255, 255, 255, 0.1)');
    gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
  }

  private generateParticles(): void {
    const positions = new Float32Array(this.particleCount * 3);
    const colors = new Float32Array(this.particleCount * 3);
    const sizes = new Float32Array(this.particleCount);

    const color = new THREE.Color();

    for (let i = 0; i < this.particleCount; i++) {
      const i3 = i * 3;

      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = this.radius * Math.cbrt(Math.random());

      const x = r * Math.sin(phi) * Math.cos(theta);
      const y = r * Math.sin(phi) * Math.sin(theta);
      const z = r * Math.cos(phi);

      this.basePositions[i3] = x;
      this.basePositions[i3 + 1] = y;
      this.basePositions[i3 + 2] = z;

      positions[i3] = x;
      positions[i3 + 1] = y;
      positions[i3 + 2] = z;

      this.offsets[i3] = (Math.random() - 0.5) * 0.08;
      this.offsets[i3 + 1] = (Math.random() - 0.5) * 0.08;
      this.offsets[i3 + 2] = (Math.random() - 0.5) * 0.08;

      this.frequencies[i] = 0.5 + Math.random() * 1.5;
      this.phases[i] = Math.random() * Math.PI * 2;

      const distance = Math.sqrt(x * x + y * y + z * z);
      const t = distance / this.radius;
      const hue = this.startHue + (this.endHue - this.startHue) * t;
      color.setHSL(hue / 360, 0.8, 0.6 + Math.random() * 0.2);

      colors[i3] = color.r;
      colors[i3 + 1] = color.g;
      colors[i3 + 2] = color.b;

      sizes[i] = 0.02 + Math.random() * 0.06;
    }

    this.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    this.geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
  }

  public setRotationSpeed(speed: number): void {
    this.rotationSpeed = speed;
  }

  public setParticleCount(count: number): void {
    this.particleCount = count;
    this.basePositions = new Float32Array(this.particleCount * 3);
    this.offsets = new Float32Array(this.particleCount * 3);
    this.frequencies = new Float32Array(this.particleCount);
    this.phases = new Float32Array(this.particleCount);

    this.geometry.dispose();
    this.geometry = new THREE.BufferGeometry();
    this.generateParticles();
    this.points.geometry = this.geometry;
  }

  public setColorRange(startHue: number, endHue: number): void {
    this.startHue = startHue;
    this.endHue = endHue;

    const colors = this.geometry.getAttribute('color') as THREE.BufferAttribute;
    const positions = this.geometry.getAttribute('position') as THREE.BufferAttribute;
    const color = new THREE.Color();

    for (let i = 0; i < this.particleCount; i++) {
      const i3 = i * 3;
      const x = positions.array[i3] as number;
      const y = positions.array[i3 + 1] as number;
      const z = positions.array[i3 + 2] as number;
      const distance = Math.sqrt(x * x + y * y + z * z);
      const t = distance / this.radius;
      const hue = this.startHue + (this.endHue - this.startHue) * t;
      color.setHSL(hue / 360, 0.8, 0.6 + Math.random() * 0.2);

      colors.array[i3] = color.r;
      colors.array[i3 + 1] = color.g;
      colors.array[i3 + 2] = color.b;
    }

    colors.needsUpdate = true;
  }

  public update(elapsedTime: number, deltaTime: number): void {
    this.points.rotation.y += this.rotationSpeed * deltaTime;
    this.points.rotation.x += this.rotationSpeed * 0.3 * deltaTime;

    const positions = this.geometry.getAttribute('position') as THREE.BufferAttribute;

    for (let i = 0; i < this.particleCount; i++) {
      const i3 = i * 3;
      const phase = this.phases[i];
      const freq = this.frequencies[i];
      const time = elapsedTime * freq + phase;

      const offsetX = Math.sin(time) * this.offsets[i3];
      const offsetY = Math.cos(time * 0.7) * this.offsets[i3 + 1];
      const offsetZ = Math.sin(time * 1.3) * this.offsets[i3 + 2];

      positions.array[i3] = this.basePositions[i3] + offsetX;
      positions.array[i3 + 1] = this.basePositions[i3 + 1] + offsetY;
      positions.array[i3 + 2] = this.basePositions[i3 + 2] + offsetZ;
    }

    positions.needsUpdate = true;
  }

  public dispose(): void {
    this.geometry.dispose();
    this.material.dispose();
    if (this.material.map) {
      this.material.map.dispose();
    }
  }
}
