import * as THREE from 'three';
import gsap from 'gsap';
import { clamp } from 'lodash';

export interface ColorTheme {
  name: string;
  centerHue: [number, number];
  outerHue: [number, number];
  saturation: number;
  lightness: number;
}

export const COLOR_THEMES: ColorTheme[] = [
  { name: '暖橙渐变', centerHue: [10, 30], outerHue: [20, 45], saturation: 0.9, lightness: 0.6 },
  { name: '冰蓝渐变', centerHue: [190, 210], outerHue: [200, 230], saturation: 0.85, lightness: 0.65 },
  { name: '紫粉渐变', centerHue: [280, 310], outerHue: [300, 330], saturation: 0.9, lightness: 0.6 },
  { name: '绿黄渐变', centerHue: [60, 90], outerHue: [100, 140], saturation: 0.85, lightness: 0.6 },
  { name: '红白渐变', centerHue: [0, 10], outerHue: [340, 360], saturation: 0.9, lightness: 0.6 },
  { name: '彩虹多色', centerHue: [0, 60], outerHue: [180, 300], saturation: 0.95, lightness: 0.6 }
];

interface ParticleData {
  basePosition: THREE.Vector3;
  currentPosition: THREE.Vector3;
  velocity: THREE.Vector3;
  armIndex: number;
  radius: number;
  angle: number;
  height: number;
}

export class ParticleSystem {
  public points: THREE.Points;
  public geometry: THREE.BufferGeometry;
  public material: THREE.PointsMaterial;

  private maxParticles: number = 5000;
  private currentCount: number = 2000;
  private targetCount: number = 2000;
  private particleData: ParticleData[] = [];

  private positionAttr: THREE.Float32BufferAttribute;
  private colorAttr: THREE.Float32BufferAttribute;
  private sizeAttr: THREE.Float32BufferAttribute;

  private particleSize: number = 1.5;
  private gravityStrength: number = 0.5;
  private rotationSpeed: number = 0.002;
  private rotationAngle: number = 0;

  private currentTheme: ColorTheme = COLOR_THEMES[1];
  private targetTheme: ColorTheme = COLOR_THEMES[1];
  private themeTransition: number = 1;

  private hoverScale: number = 1;
  private hoveredParticleIndex: number = -1;

  constructor() {
    this.geometry = new THREE.BufferGeometry();
    this.material = this.createMaterial();

    const positions = new Float32Array(this.maxParticles * 3);
    const colors = new Float32Array(this.maxParticles * 3);
    const sizes = new Float32Array(this.maxParticles);

    this.positionAttr = new THREE.Float32BufferAttribute(positions, 3);
    this.colorAttr = new THREE.Float32BufferAttribute(colors, 3);
    this.sizeAttr = new THREE.Float32BufferAttribute(sizes, 1);

    this.geometry.setAttribute('position', this.positionAttr);
    this.geometry.setAttribute('color', this.colorAttr);
    this.geometry.setAttribute('size', this.sizeAttr);

    this.generateGalaxy(this.currentCount);
    this.updateDrawRange();

    this.points = new THREE.Points(this.geometry, this.material);
    this.points.frustumCulled = false;
  }

  private createMaterial(): THREE.PointsMaterial {
    const texture = this.createGlowTexture();
    return new THREE.PointsMaterial({
      size: this.particleSize,
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true,
      map: texture
    });
  }

  private createGlowTexture(): THREE.Texture {
    const size = 64;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;

    const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
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

  private generateGalaxy(count: number): void {
    const arms = 3;
    const armSpread = 0.5;
    const radiusMax = 8;

    for (let i = 0; i < count; i++) {
      const armIndex = i % arms;
      const radius = Math.pow(Math.random(), 0.6) * radiusMax;
      const armAngle = (armIndex / arms) * Math.PI * 2;
      const spiralAngle = radius * 0.6;
      const randomOffset = (Math.random() - 0.5) * armSpread * radius * 0.5;

      const angle = armAngle + spiralAngle + randomOffset;
      const height = (Math.random() - 0.5) * 0.8 * (1 - radius / radiusMax);

      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      const y = height;

      const basePosition = new THREE.Vector3(x, y, z);

      this.particleData[i] = {
        basePosition: basePosition.clone(),
        currentPosition: basePosition.clone(),
        velocity: new THREE.Vector3(0, 0, 0),
        armIndex,
        radius,
        angle,
        height
      };

      this.setParticlePosition(i, x, y, z);
      this.updateParticleColor(i, radius);
      this.setParticleSizeAtIndex(i, this.particleSize);
    }

    for (let i = count; i < this.maxParticles; i++) {
      this.setParticlePosition(i, 0, -1000, 0);
      this.setParticleSizeAtIndex(i, 0);
    }
  }

  private setParticlePosition(index: number, x: number, y: number, z: number): void {
    this.positionAttr.setXYZ(index, x, y, z);
  }

  private setParticleSizeAtIndex(index: number, size: number): void {
    (this.sizeAttr.array as Float32Array)[index] = size;
  }

  private updateParticleColor(index: number, radius: number): void {
    const t = clamp(radius / 8, 0, 1);
    const theme = this.lerpTheme(this.currentTheme, this.targetTheme, this.themeTransition);

    const centerHue = THREE.MathUtils.lerp(theme.centerHue[0], theme.centerHue[1], Math.random());
    const outerHue = THREE.MathUtils.lerp(theme.outerHue[0], theme.outerHue[1], Math.random());
    const hue = THREE.MathUtils.lerp(centerHue, outerHue, t);

    const saturation = theme.saturation + (Math.random() - 0.5) * 0.1;
    const lightness = theme.lightness + (Math.random() - 0.5) * 0.15 - t * 0.1;

    const color = new THREE.Color().setHSL(hue / 360, clamp(saturation, 0, 1), clamp(lightness, 0, 1));
    this.colorAttr.setXYZ(index, color.r, color.g, color.b);
  }

  private lerpTheme(a: ColorTheme, b: ColorTheme, t: number): ColorTheme {
    return {
      name: b.name,
      centerHue: [
        THREE.MathUtils.lerp(a.centerHue[0], b.centerHue[0], t),
        THREE.MathUtils.lerp(a.centerHue[1], b.centerHue[1], t)
      ],
      outerHue: [
        THREE.MathUtils.lerp(a.outerHue[0], b.outerHue[0], t),
        THREE.MathUtils.lerp(a.outerHue[1], b.outerHue[1], t)
      ],
      saturation: THREE.MathUtils.lerp(a.saturation, b.saturation, t),
      lightness: THREE.MathUtils.lerp(a.lightness, b.lightness, t)
    };
  }

  private updateDrawRange(): void {
    this.geometry.setDrawRange(0, this.currentCount);
  }

  public setParticleCount(target: number): void {
    this.targetCount = clamp(Math.round(target / 100) * 100, 500, 5000);

    const startCount = this.currentCount;
    const endCount = this.targetCount;

    if (startCount === endCount) return;

    if (endCount > startCount) {
      this.generateIncremental(startCount, endCount);
    }

    gsap.to(this, {
      currentCount: endCount,
      duration: 3,
      ease: 'power2.out',
      onUpdate: () => {
        const count = Math.round(this.currentCount);
        for (let i = 0; i < this.maxParticles; i++) {
          if (i < count) {
            if (this.particleData[i]) {
              const size = this.particleData[i].radius < 8 ? this.particleSize : 0;
              this.setParticleSizeAtIndex(i, size);
            }
          } else {
            this.setParticleSizeAtIndex(i, 0);
          }
        }
        this.sizeAttr.needsUpdate = true;
        this.updateDrawRange();
      }
    });
  }

  private generateIncremental(from: number, to: number): void {
    const arms = 3;
    const armSpread = 0.5;
    const radiusMax = 8;

    for (let i = from; i < to; i++) {
      const armIndex = i % arms;
      const radius = Math.pow(Math.random(), 0.6) * radiusMax;
      const armAngle = (armIndex / arms) * Math.PI * 2;
      const spiralAngle = radius * 0.6;
      const randomOffset = (Math.random() - 0.5) * armSpread * radius * 0.5;

      const angle = armAngle + spiralAngle + randomOffset;
      const height = (Math.random() - 0.5) * 0.8 * (1 - radius / radiusMax);

      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      const y = height;

      const basePosition = new THREE.Vector3(x, y, z);

      this.particleData[i] = {
        basePosition: basePosition.clone(),
        currentPosition: basePosition.clone(),
        velocity: new THREE.Vector3(0, 0, 0),
        armIndex,
        radius,
        angle,
        height
      };

      this.setParticlePosition(i, x, y, z);
      this.updateParticleColor(i, radius);
      this.setParticleSizeAtIndex(i, 0);
    }
  }

  public setParticleSize(size: number): void {
    this.particleSize = clamp(size, 0.5, 4.0);
    gsap.to(this.material, {
      size: this.particleSize,
      duration: 0.3,
      ease: 'power2.out'
    });
  }

  public setColorTheme(theme: ColorTheme): void {
    if (theme.name === this.targetTheme.name) return;

    this.currentTheme = this.lerpTheme(this.currentTheme, this.targetTheme, this.themeTransition);
    this.targetTheme = theme;
    this.themeTransition = 0;

    gsap.to(this, {
      themeTransition: 1,
      duration: 1.5,
      ease: 'power2.inOut',
      onUpdate: () => {
        for (let i = 0; i < this.currentCount; i++) {
          if (this.particleData[i]) {
            this.updateParticleColor(i, this.particleData[i].radius);
          }
        }
        this.colorAttr.needsUpdate = true;
      }
    });
  }

  public setGravityStrength(strength: number): void {
    this.gravityStrength = clamp(strength, 0, 2.0);
  }

  public setRotationSpeed(speed: number): void {
    this.rotationSpeed = clamp(speed, 0, 0.01);
  }

  public reset(): void {
    for (let i = 0; i < this.maxParticles; i++) {
      if (this.particleData[i]) {
        const data = this.particleData[i];
        data.velocity.set(0, 0, 0);

        gsap.to(data.currentPosition, {
          x: data.basePosition.x,
          y: data.basePosition.y,
          z: data.basePosition.z,
          duration: 2,
          ease: 'power2.out',
          onUpdate: () => {
            this.setParticlePosition(i, data.currentPosition.x, data.currentPosition.y, data.currentPosition.z);
            if (i < this.currentCount) {
              this.positionAttr.needsUpdate = true;
            }
          }
        });
      }
    }

    this.rotationAngle = 0;
  }

  public getParticleCount(): number {
    return this.currentCount;
  }

  public setHoveredParticle(index: number): void {
    if (this.hoveredParticleIndex >= 0 && this.hoveredParticleIndex < this.maxParticles) {
      const data = this.particleData[this.hoveredParticleIndex];
      if (data) {
        this.setParticleSizeAtIndex(this.hoveredParticleIndex, this.particleSize);
      }
    }

    this.hoveredParticleIndex = index;

    if (index >= 0 && index < this.maxParticles) {
      const data = this.particleData[index];
      if (data) {
        this.setParticleSizeAtIndex(index, this.particleSize * 1.2);
      }
    }
    this.sizeAttr.needsUpdate = true;
  }

  public getParticlePosition(index: number): THREE.Vector3 | null {
    if (index >= 0 && index < this.maxParticles && this.particleData[index]) {
      return this.particleData[index].currentPosition.clone();
    }
    return null;
  }

  public update(deltaTime: number): void {
    this.rotationAngle += this.rotationSpeed;

    for (let i = 0; i < this.currentCount; i++) {
      const data = this.particleData[i];
      if (!data) continue;

      const gravityDir = new THREE.Vector3(0, 0, 0).sub(data.currentPosition);
      const dist = gravityDir.length() + 0.1;
      gravityDir.normalize();

      const gravityForce = (this.gravityStrength * 0.01) / (dist * dist) * 50;
      data.velocity.add(gravityDir.multiplyScalar(gravityForce));

      data.velocity.multiplyScalar(0.98);

      data.currentPosition.add(data.velocity.clone().multiplyScalar(deltaTime * 60));

      const cosR = Math.cos(this.rotationSpeed);
      const sinR = Math.sin(this.rotationSpeed);
      const px = data.currentPosition.x;
      const pz = data.currentPosition.z;
      data.currentPosition.x = px * cosR - pz * sinR;
      data.currentPosition.z = px * sinR + pz * cosR;

      this.setParticlePosition(i, data.currentPosition.x, data.currentPosition.y, data.currentPosition.z);
    }

    this.positionAttr.needsUpdate = true;
  }

  public dispose(): void {
    this.geometry.dispose();
    this.material.dispose();
    if (this.material.map) {
      this.material.map.dispose();
    }
  }
}
