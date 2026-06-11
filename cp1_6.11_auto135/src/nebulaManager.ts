import * as THREE from 'three';
import gsap from 'gsap';

const NEBULA_PARTICLE_COUNT = 650;
const BASE_ROTATION_SPEED = 0.01;
const EROSION_SPEED_BONUS = 0.05;

const COLOR_START = new THREE.Color('#FF6B6B');
const COLOR_END = new THREE.Color('#4ECDC4');

export class NebulaManager {
  private scene: THREE.Scene;
  private particleSystem: THREE.Points;
  private geometry: THREE.BufferGeometry;
  private material: THREE.PointsMaterial;
  private nebulaGroup: THREE.Group;
  private currentErosion: number = 0;
  private rotationAngle: number = 0;
  private particleSizes: Float32Array;
  private particleSeeds: Float32Array;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.nebulaGroup = new THREE.Group();
    this.nebulaGroup.name = 'nebula';
    scene.add(this.nebulaGroup);

    this.geometry = new THREE.BufferGeometry();
    const count = NEBULA_PARTICLE_COUNT;

    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    this.particleSizes = new Float32Array(count);
    this.particleSeeds = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = 1.2 + Math.random() * 0.8;
      const ySpread = (Math.random() - 0.5) * 0.6;

      positions[i * 3] = Math.cos(angle) * radius;
      positions[i * 3 + 1] = ySpread;
      positions[i * 3 + 2] = Math.sin(angle) * radius;

      const t = Math.random();
      const color = new THREE.Color().lerpColors(COLOR_START, COLOR_END, t);
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;

      this.particleSizes[i] = 0.05 + Math.random() * 0.1;
      this.particleSeeds[i] = Math.random();
    }

    this.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const particleTexture = this.createParticleTexture();

    this.material = new THREE.PointsMaterial({
      size: 0.1,
      map: particleTexture,
      transparent: true,
      opacity: 0.6,
      vertexColors: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true,
    });

    this.particleSystem = new THREE.Points(this.geometry, this.material);
    this.nebulaGroup.add(this.particleSystem);
  }

  private createParticleTexture(): THREE.Texture {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d')!;

    const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    gradient.addColorStop(0, 'rgba(255,255,255,1.0)');
    gradient.addColorStop(0.2, 'rgba(255,255,255,0.8)');
    gradient.addColorStop(0.5, 'rgba(255,255,255,0.3)');
    gradient.addColorStop(1, 'rgba(255,255,255,0.0)');

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 64, 64);

    const texture = new THREE.CanvasTexture(canvas);
    return texture;
  }

  updateErosion(value: number): void {
    gsap.to(this, {
      duration: 2,
      ease: 'power2.inOut',
      currentErosion: value,
      onUpdate: () => {
        this.applyErosionEffects();
      },
    });
  }

  private applyErosionEffects(): void {
    const opacity = 0.4 + this.currentErosion * 0.5;
    this.material.opacity = opacity;

    const sizeFactor = 0.08 + this.currentErosion * 0.07;
    this.material.size = sizeFactor;

    const positions = this.geometry.attributes.position;
    const count = positions.count;
    for (let i = 0; i < count; i++) {
      const baseSize = this.particleSizes[i];
      const size = baseSize * (1 + this.currentErosion * 0.5);
      this.particleSizes[i] = size;
    }
  }

  updatePosition(): void {
    // no-op for now - could adjust particle positions based on terrain
  }

  update(delta: number): void {
    const speed = BASE_ROTATION_SPEED + this.currentErosion * EROSION_SPEED_BONUS;
    this.rotationAngle += speed * delta;

    this.nebulaGroup.rotation.y = this.rotationAngle;

    const positions = this.geometry.attributes.position;
    const count = positions.count;
    const time = performance.now() * 0.001;

    for (let i = 0; i < count; i++) {
      const seed = this.particleSeeds[i];
      const y = positions.getY(i);
      const floatY = y + Math.sin(time * 0.5 + seed * 10) * 0.001;
      positions.setY(i, floatY);
    }
    positions.needsUpdate = true;
  }
}
