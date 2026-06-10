import * as THREE from 'three';

export interface ParticleInfo {
  position: { x: number; y: number; z: number };
  color: { r: number; g: number; b: number; a: number };
}

interface ParticleData {
  basePosition: THREE.Vector3;
  baseSize: number;
  baseColor: THREE.Color;
  phaseOffset: number;
}

export class CloudParticleSystem {
  private scene: THREE.Scene;
  private particles: THREE.Points;
  private geometry: THREE.BufferGeometry;
  private material: THREE.PointsMaterial;
  private particleCount: number = 3000;
  private particleData: ParticleData[] = [];

  private density: number = 0.5;
  private targetDensity: number = 0.5;
  private height: number = 10;
  private flowSpeed: number = 1.0;
  private cloudColor: THREE.Color = new THREE.Color(0xffffff);

  private selectedIndex: number = -1;
  private selectedOriginalSize: number = 1;
  private selectedOriginalColor: THREE.Color = new THREE.Color();

  private startTime: number = performance.now();
  private densityTransitionStart: number = 0;
  private densityTransitionDuration: number = 800;
  private densityStartValue: number = 0.5;

  private spreadX: number = 30;
  private spreadZ: number = 30;
  private spreadY: number = 4;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.geometry = new THREE.BufferGeometry();
    this.material = this.createMaterial();
    this.particles = new THREE.Points(this.geometry, this.material);
    this.scene.add(this.particles);

    this.createParticles();
  }

  private createCircleTexture(): THREE.Texture {
    const size = 128;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;

    const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
    gradient.addColorStop(0.3, 'rgba(255, 255, 255, 0.8)');
    gradient.addColorStop(0.6, 'rgba(255, 255, 255, 0.3)');
    gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
  }

  private createMaterial(): THREE.PointsMaterial {
    return new THREE.PointsMaterial({
      size: 1.5,
      transparent: true,
      opacity: 0.5,
      vertexColors: true,
      sizeAttenuation: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      map: this.createCircleTexture(),
      alphaTest: 0.01
    });
  }

  private createParticles(): void {
    const positions = new Float32Array(this.particleCount * 3);
    const colors = new Float32Array(this.particleCount * 3);
    const sizes = new Float32Array(this.particleCount);

    this.particleData = [];

    for (let i = 0; i < this.particleCount; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = Math.pow(Math.random(), 0.6);

      const x = r * Math.sin(phi) * Math.cos(theta) * this.spreadX;
      const y = (Math.random() - 0.5) * this.spreadY;
      const z = r * Math.sin(phi) * Math.sin(theta) * this.spreadZ;

      const size = 0.5 + Math.random() * 2.5;
      const color = new THREE.Color(this.cloudColor);

      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;

      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;

      sizes[i] = size;

      this.particleData.push({
        basePosition: new THREE.Vector3(x, y, z),
        baseSize: size,
        baseColor: color.clone(),
        phaseOffset: Math.random() * Math.PI * 2
      });
    }

    this.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    this.geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
  }

  public setDensity(value: number): void {
    if (value !== this.targetDensity) {
      this.densityStartValue = this.density;
      this.targetDensity = value;
      this.densityTransitionStart = performance.now();
    }
  }

  public setHeight(value: number): void {
    this.height = value;
  }

  public setColor(hex: string): void {
    this.cloudColor = new THREE.Color(hex);
    const colors = this.geometry.getAttribute('color') as THREE.BufferAttribute;

    for (let i = 0; i < this.particleCount; i++) {
      if (i === this.selectedIndex) continue;

      this.particleData[i].baseColor.copy(this.cloudColor);
      colors.array[i * 3] = this.cloudColor.r;
      colors.array[i * 3 + 1] = this.cloudColor.g;
      colors.array[i * 3 + 2] = this.cloudColor.b;
    }
    colors.needsUpdate = true;
  }

  public setFlowSpeed(value: number): void {
    this.flowSpeed = value;
  }

  public getParticles(): THREE.Points {
    return this.particles;
  }

  public selectParticle(index: number): void {
    if (this.selectedIndex >= 0 && this.selectedIndex !== index) {
      this.deselectParticle();
    }

    if (index < 0 || index >= this.particleCount) return;

    this.selectedIndex = index;
    const sizes = this.geometry.getAttribute('size') as THREE.BufferAttribute;
    const colors = this.geometry.getAttribute('color') as THREE.BufferAttribute;

    this.selectedOriginalSize = sizes.array[index] as number;
    this.selectedOriginalColor = new THREE.Color(
      colors.array[index * 3] as number,
      colors.array[index * 3 + 1] as number,
      colors.array[index * 3 + 2] as number
    );

    sizes.array[index] = 5;
    const highlightColor = new THREE.Color(0xff6b6b);
    colors.array[index * 3] = highlightColor.r;
    colors.array[index * 3 + 1] = highlightColor.g;
    colors.array[index * 3 + 2] = highlightColor.b;

    sizes.needsUpdate = true;
    colors.needsUpdate = true;
  }

  public deselectParticle(): void {
    if (this.selectedIndex < 0) return;

    const sizes = this.geometry.getAttribute('size') as THREE.BufferAttribute;
    const colors = this.geometry.getAttribute('color') as THREE.BufferAttribute;
    const idx = this.selectedIndex;

    sizes.array[idx] = this.selectedOriginalSize;
    colors.array[idx * 3] = this.selectedOriginalColor.r;
    colors.array[idx * 3 + 1] = this.selectedOriginalColor.g;
    colors.array[idx * 3 + 2] = this.selectedOriginalColor.b;

    sizes.needsUpdate = true;
    colors.needsUpdate = true;

    this.selectedIndex = -1;
  }

  public getSelectedParticleInfo(): ParticleInfo | null {
    if (this.selectedIndex < 0) return null;

    const positions = this.geometry.getAttribute('position') as THREE.BufferAttribute;
    const colors = this.geometry.getAttribute('color') as THREE.BufferAttribute;
    const idx = this.selectedIndex;

    const baseR = colors.array[idx * 3] as number;
    const baseG = colors.array[idx * 3 + 1] as number;
    const baseB = colors.array[idx * 3 + 2] as number;

    return {
      position: {
        x: Number((positions.array[idx * 3] as number).toFixed(2)),
        y: Number((positions.array[idx * 3 + 1] as number).toFixed(2)),
        z: Number((positions.array[idx * 3 + 2] as number).toFixed(2))
      },
      color: {
        r: Math.round(baseR * 255),
        g: Math.round(baseG * 255),
        b: Math.round(baseB * 255),
        a: Number(this.material.opacity.toFixed(2))
      }
    };
  }

  private easeInOut(t: number): number {
    return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
  }

  public update(): void {
    const now = performance.now();
    const elapsed = (now - this.startTime) / 1000;

    if (this.targetDensity !== this.density) {
      const t = Math.min(1, (now - this.densityTransitionStart) / this.densityTransitionDuration);
      const eased = this.easeInOut(t);
      this.density = this.densityStartValue + (this.targetDensity - this.densityStartValue) * eased;
      this.material.opacity = this.density * 0.6;
      if (t >= 1) {
        this.density = this.targetDensity;
      }
    }

    const positions = this.geometry.getAttribute('position') as THREE.BufferAttribute;
    const sizes = this.geometry.getAttribute('size') as THREE.BufferAttribute;

    for (let i = 0; i < this.particleCount; i++) {
      const data = this.particleData[i];
      const flowOffset = (elapsed * this.flowSpeed * 2 + data.basePosition.x * 0.1) % (this.spreadX * 2);
      let newX = data.basePosition.x - this.spreadX + flowOffset;
      if (newX > this.spreadX) newX -= this.spreadX * 2;
      if (newX < -this.spreadX) newX += this.spreadX * 2;

      const waveY = Math.sin(elapsed * 0.2 + data.phaseOffset) * 0.3;
      const newY = data.basePosition.y + waveY + this.height;

      positions.array[i * 3] = newX;
      positions.array[i * 3 + 1] = newY;
      positions.array[i * 3 + 2] = data.basePosition.z;

      if (i === this.selectedIndex) {
        sizes.array[i] = 5;
      } else {
        const sizeWave = 1 + Math.sin(elapsed * 0.3 + data.phaseOffset) * 0.1;
        sizes.array[i] = data.baseSize * sizeWave;
      }
    }

    positions.needsUpdate = true;
    sizes.needsUpdate = true;
  }

  public dispose(): void {
    this.geometry.dispose();
    if (this.material.map) {
      this.material.map.dispose();
    }
    this.material.dispose();
    this.scene.remove(this.particles);
  }
}
