import * as THREE from 'three';
import { ParticleData, DisplayMode, OrbitColors, getOrbitColors } from './orbitGenerator';

export class ParticleSystem {
  private container: THREE.Object3D;
  private particleCount: number;
  private points: THREE.Points | null = null;
  private glowSprites: THREE.Sprite[] = [];
  private geometry: THREE.BufferGeometry | null = null;
  private material: THREE.PointsMaterial | null = null;
  private currentPositions: Float32Array | null = null;
  private targetPositions: Float32Array | null = null;
  private baseSize: number = 1.0;
  private displayMode: DisplayMode = 'pointcloud';
  private sliceThickness: number = 0.2;
  private isWireframe: boolean = false;

  constructor(container: THREE.Object3D, particleCount: number) {
    this.container = container;
    this.particleCount = particleCount;
    this.initGeometry();
  }

  private initGeometry(): void {
    this.geometry = new THREE.BufferGeometry();

    const positions = new Float32Array(this.particleCount * 3);
    const colors = new Float32Array(this.particleCount * 3);
    const alphas = new Float32Array(this.particleCount);
    const sizes = new Float32Array(this.particleCount);

    this.currentPositions = new Float32Array(this.particleCount * 3);
    this.targetPositions = new Float32Array(this.particleCount * 3);

    this.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    this.geometry.setAttribute('alpha', new THREE.BufferAttribute(alphas, 1));
    this.geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
  }

  private createParticleTexture(): THREE.Texture {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d')!;

    const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
    gradient.addColorStop(0.3, 'rgba(255, 255, 255, 0.8)');
    gradient.addColorStop(0.6, 'rgba(255, 255, 255, 0.3)');
    gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 64, 64);

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
  }

  private createGlowTexture(): THREE.Texture {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d')!;

    const gradient = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    gradient.addColorStop(0, 'rgba(200, 220, 255, 0.15)');
    gradient.addColorStop(0.4, 'rgba(150, 180, 255, 0.08)');
    gradient.addColorStop(0.7, 'rgba(100, 140, 255, 0.03)');
    gradient.addColorStop(1, 'rgba(80, 120, 255, 0)');

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 128, 128);

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
  }

  public updateData(particles: ParticleData[], l: number): void {
    if (!this.geometry) return;

    const orbitColors = getOrbitColors(l);

    const positionAttr = this.geometry.getAttribute('position') as THREE.BufferAttribute;
    const colorAttr = this.geometry.getAttribute('color') as THREE.BufferAttribute;
    const alphaAttr = this.geometry.getAttribute('alpha') as THREE.BufferAttribute;
    const sizeAttr = this.geometry.getAttribute('size') as THREE.BufferAttribute;

    const positions = positionAttr.array as Float32Array;
    const colors = colorAttr.array as Float32Array;
    const alphas = alphaAttr.array as Float32Array;
    const sizes = sizeAttr.array as Float32Array;

    for (let i = 0; i < this.particleCount; i++) {
      const p = particles[i];
      const idx = i * 3;

      if (this.currentPositions && this.targetPositions) {
        this.currentPositions[idx] = positions[idx];
        this.currentPositions[idx + 1] = positions[idx + 1];
        this.currentPositions[idx + 2] = positions[idx + 2];

        this.targetPositions[idx] = p.position.x;
        this.targetPositions[idx + 1] = p.position.y;
        this.targetPositions[idx + 2] = p.position.z;
      }

      positions[idx] = p.position.x;
      positions[idx + 1] = p.position.y;
      positions[idx + 2] = p.position.z;

      const t = p.probability;
      const r = orbitColors.colorStart.r * (1 - t) + orbitColors.colorEnd.r * t;
      const g = orbitColors.colorStart.g * (1 - t) + orbitColors.colorEnd.g * t;
      const b = orbitColors.colorStart.b * (1 - t) + orbitColors.colorEnd.b * t;

      colors[idx] = r;
      colors[idx + 1] = g;
      colors[idx + 2] = b;

      alphas[i] = p.alpha;
      sizes[i] = this.baseSize;
    }

    positionAttr.needsUpdate = true;
    colorAttr.needsUpdate = true;
    alphaAttr.needsUpdate = true;
    sizeAttr.needsUpdate = true;

    this.updateGlowSprites(orbitColors);
    this.applyDisplayMode();
  }

  private updateGlowSprites(orbitColors: OrbitColors): void {
    const spriteCount = 3;
    const glowTexture = this.createGlowTexture();

    while (this.glowSprites.length < spriteCount) {
      const material = new THREE.SpriteMaterial({
        map: glowTexture,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending
      });
      const sprite = new THREE.Sprite(material);
      sprite.scale.set(8, 8, 8);
      this.container.add(sprite);
      this.glowSprites.push(sprite);
    }

    const avgColor = new THREE.Color().lerpColors(
      orbitColors.colorStart,
      orbitColors.colorEnd,
      0.5
    );

    for (let i = 0; i < this.glowSprites.length; i++) {
      const sprite = this.glowSprites[i];
      const material = sprite.material as THREE.SpriteMaterial;
      material.color.copy(avgColor);
      material.opacity = 0.6 - i * 0.15;
      sprite.scale.setScalar(8 - i * 1.5);
    }
  }

  public createOrUpdate(): void {
    if (this.points) {
      this.container.remove(this.points);
      if (this.material) this.material.dispose();
    }

    const texture = this.createParticleTexture();

    this.material = new THREE.PointsMaterial({
      size: this.baseSize * 0.08,
      map: texture,
      vertexColors: true,
      transparent: true,
      opacity: 0.8,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true
    });

    if (this.geometry) {
      this.points = new THREE.Points(this.geometry, this.material);
      this.container.add(this.points);
    }
  }

  public getCurrentPositions(): Float32Array | null {
    return this.currentPositions;
  }

  public getTargetPositions(): Float32Array | null {
    return this.targetPositions;
  }

  public setPositions(positions: Float32Array): void {
    if (!this.geometry) return;
    const attr = this.geometry.getAttribute('position') as THREE.BufferAttribute;
    const arr = attr.array as Float32Array;
    arr.set(positions);
    attr.needsUpdate = true;
  }

  public setDisplayMode(mode: DisplayMode): void {
    this.displayMode = mode;
    this.applyDisplayMode();
  }

  private applyDisplayMode(): void {
    if (!this.geometry) return;

    const positionAttr = this.geometry.getAttribute('position') as THREE.BufferAttribute;
    const sizeAttr = this.geometry.getAttribute('size') as THREE.BufferAttribute;
    const alphaAttr = this.geometry.getAttribute('alpha') as THREE.BufferAttribute;

    const positions = positionAttr.array as Float32Array;
    const sizes = sizeAttr.array as Float32Array;
    const alphas = alphaAttr.array as Float32Array;

    switch (this.displayMode) {
      case 'pointcloud':
        for (let i = 0; i < this.particleCount; i++) {
          sizes[i] = this.baseSize;
        }
        break;

      case 'density':
        this.applyDensitySizes(positions, sizes);
        break;

      case 'slice':
        this.applySliceFilter(positions, sizes, alphas);
        break;
    }

    sizeAttr.needsUpdate = true;
    alphaAttr.needsUpdate = true;
  }

  private applyDensitySizes(positions: Float32Array, sizes: Float32Array): void {
    const sampleSize = Math.min(this.particleCount, 200);
    const sampleStep = Math.floor(this.particleCount / sampleSize);

    for (let i = 0; i < this.particleCount; i++) {
      const idx = i * 3;
      const px = positions[idx];
      const py = positions[idx + 1];
      const pz = positions[idx + 2];

      let localDensity = 0;
      const radius = 1.0;
      const radiusSq = radius * radius;

      for (let j = 0; j < sampleSize; j++) {
        const sidx = (j * sampleStep) * 3;
        const dx = positions[sidx] - px;
        const dy = positions[sidx + 1] - py;
        const dz = positions[sidx + 2] - pz;
        const distSq = dx * dx + dy * dy + dz * dz;
        if (distSq < radiusSq && distSq > 0.0001) {
          localDensity += 1.0 - distSq / radiusSq;
        }
      }

      const normalizedDensity = Math.min(localDensity / (sampleSize * 0.05), 1);
      sizes[i] = this.baseSize * (2.0 + normalizedDensity * 3.0);
    }
  }

  private applySliceFilter(
    positions: Float32Array,
    sizes: Float32Array,
    alphas: Float32Array
  ): void {
    const thickness = this.sliceThickness;

    for (let i = 0; i < this.particleCount; i++) {
      const idx = i * 3;
      const x = positions[idx];
      const y = positions[idx + 1];
      const z = positions[idx + 2];

      const onXY = Math.abs(z) < thickness;
      const onXZ = Math.abs(y) < thickness;
      const onYZ = Math.abs(x) < thickness;

      if (onXY || onXZ || onYZ) {
        let distToPlane = Infinity;
        if (onXY) distToPlane = Math.min(distToPlane, Math.abs(z));
        if (onXZ) distToPlane = Math.min(distToPlane, Math.abs(y));
        if (onYZ) distToPlane = Math.min(distToPlane, Math.abs(x));

        const falloff = 1 - distToPlane / thickness;
        sizes[i] = this.baseSize * (0.8 + falloff * 0.6);
        alphas[i] = Math.max(0.3, alphas[i] * falloff);
      } else {
        sizes[i] = 0;
        alphas[i] = 0;
      }
    }
  }

  public toggleWireframe(): boolean {
    this.isWireframe = !this.isWireframe;
    if (this.material) {
      if (this.isWireframe) {
        this.material.size = this.baseSize * 0.03;
        this.material.opacity = Math.max(0.2, this.material.opacity * 0.5);
        this.material.blending = THREE.NormalBlending;
      } else {
        this.material.size = this.baseSize * 0.08;
        this.material.opacity = 0.8;
        this.material.blending = THREE.AdditiveBlending;
      }
      this.material.needsUpdate = true;
    }
    return this.isWireframe;
  }

  public setBaseSize(size: number): void {
    this.baseSize = size;
    if (this.material) {
      this.material.size = size * 0.08;
      this.material.needsUpdate = true;
    }
    this.applyDisplayMode();
  }

  public setOpacity(opacity: number): void {
    if (this.material) {
      this.material.opacity = opacity;
      this.material.needsUpdate = true;
    }
  }

  public dispose(): void {
    if (this.points) {
      this.container.remove(this.points);
      this.points = null;
    }
    if (this.geometry) {
      this.geometry.dispose();
      this.geometry = null;
    }
    if (this.material) {
      this.material.dispose();
      this.material = null;
    }
    for (const sprite of this.glowSprites) {
      this.container.remove(sprite);
      if (sprite.material instanceof THREE.SpriteMaterial) {
        sprite.material.dispose();
      }
    }
    this.glowSprites = [];
  }
}
