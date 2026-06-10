import * as THREE from 'three';

const STAR_COUNT = 400;

export class Background {
  public points: THREE.Points;
  private geometry: THREE.BufferGeometry;
  private baseOpacities: Float32Array;
  private sizes: Float32Array;
  private material: THREE.PointsMaterial;
  private twinklePhases: Float32Array;
  private currentRateFactor: number = 1;
  private targetRateFactor: number = 1;

  constructor() {
    this.geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(STAR_COUNT * 3);
    this.baseOpacities = new Float32Array(STAR_COUNT);
    this.sizes = new Float32Array(STAR_COUNT);
    this.twinklePhases = new Float32Array(STAR_COUNT);

    for (let i = 0; i < STAR_COUNT; i++) {
      const i3 = i * 3;
      const radius = 15 + Math.random() * 25;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      positions[i3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      positions[i3 + 2] = radius * Math.cos(phi);

      this.baseOpacities[i] = 0.1 + Math.random() * 0.3;
      this.sizes[i] = 1 + Math.random() * 2;
      this.twinklePhases[i] = Math.random() * Math.PI * 2;
    }

    this.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.geometry.setAttribute('size', new THREE.BufferAttribute(this.sizes, 1));

    this.material = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 1.5,
      transparent: true,
      opacity: 0.3,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true,
      depthWrite: false
    });

    this.points = new THREE.Points(this.geometry, this.material);
  }

  public setEmissionRate(rate: number): void {
    this.targetRateFactor = (rate - 50) / 150;
    this.targetRateFactor = Math.max(0, Math.min(1, this.targetRateFactor));
  }

  public update(deltaTime: number, elapsedTime: number): void {
    this.currentRateFactor += (this.targetRateFactor - this.currentRateFactor) * deltaTime * 2;

    const opacities = this.geometry.attributes.size.array as Float32Array;

    for (let i = 0; i < STAR_COUNT; i++) {
      const twinkle = 0.5 + 0.5 * Math.sin(elapsedTime * 1.5 + this.twinklePhases[i]);
      const rateBoost = 0.3 + this.currentRateFactor * 0.7;
      const flashIntensity = 0.5 + 0.5 * Math.sin(elapsedTime * 4 + this.twinklePhases[i] * 2);
      opacities[i] = (1 + twinkle * 0.5 + flashIntensity * this.currentRateFactor * 1.5) * this.sizes[i];
    }
    this.geometry.attributes.size.needsUpdate = true;

    this.material.opacity = 0.2 + this.currentRateFactor * 0.3 + 0.05 * Math.sin(elapsedTime * 2);
  }

  public dispose(): void {
    this.geometry.dispose();
    this.material.dispose();
  }
}
