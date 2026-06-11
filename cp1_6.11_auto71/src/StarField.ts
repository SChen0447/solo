import * as THREE from 'three';
import type { StarData } from './types';

const SPECTRUM_COLORS: Record<string, number> = {
  O: 0xaabbff,
  B: 0xbbddff,
  A: 0xffffff,
  K: 0xffcc88,
  M: 0xff8866,
};

export class StarField {
  private stars: StarData[];
  private mesh: THREE.Points;
  private baseSizes: Float32Array;
  private pulseSpeeds: Float32Array;
  private pulseOffsets: Float32Array;
  private radius: number;
  private geometry: THREE.BufferGeometry;
  private material: THREE.PointsMaterial;

  constructor(stars: StarData[], radius: number = 100) {
    this.stars = stars;
    this.radius = radius;
    this.baseSizes = new Float32Array(stars.length);
    this.pulseSpeeds = new Float32Array(stars.length);
    this.pulseOffsets = new Float32Array(stars.length);

    this.geometry = new THREE.BufferGeometry();
    this.material = new THREE.PointsMaterial({
      size: 1,
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true,
    });

    this.mesh = new THREE.Points(this.geometry, this.material);
    this.mesh.name = 'starField';

    this.createStarParticles();
  }

  private createStarParticles(): void {
    const positions = new Float32Array(this.stars.length * 3);
    const colors = new Float32Array(this.stars.length * 3);
    const sizes = new Float32Array(this.stars.length);

    for (let i = 0; i < this.stars.length; i++) {
      const star = this.stars[i];
      const idx = i * 3;

      const x = this.radius * Math.cos(star.dec) * Math.cos(star.ra);
      const y = this.radius * Math.sin(star.dec);
      const z = this.radius * Math.cos(star.dec) * Math.sin(star.ra);

      positions[idx] = x;
      positions[idx + 1] = y;
      positions[idx + 2] = z;

      const color = new THREE.Color(SPECTRUM_COLORS[star.spectrum] || 0xffffff);
      const brightness = Math.max(0.3, Math.min(1, 1 - (star.magnitude + 1.5) / 7.5));
      colors[idx] = color.r * brightness;
      colors[idx + 1] = color.g * brightness;
      colors[idx + 2] = color.b * brightness;

      const baseSize = Math.max(0.05, Math.min(0.15, 0.15 - star.magnitude * 0.015));
      sizes[i] = baseSize;
      this.baseSizes[i] = baseSize;

      this.pulseSpeeds[i] = 0.5 + Math.random() * 1.5;
      this.pulseOffsets[i] = Math.random() * Math.PI * 2;
    }

    this.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    this.geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
  }

  public getMesh(): THREE.Points {
    return this.mesh;
  }

  public update(time: number): void {
    const sizes = this.geometry.attributes.size.array as Float32Array;

    for (let i = 0; i < this.stars.length; i++) {
      const pulse = 1 + 0.1 * Math.sin(time * this.pulseSpeeds[i] + this.pulseOffsets[i]);
      sizes[i] = this.baseSizes[i] * pulse;
    }

    this.geometry.attributes.size.needsUpdate = true;
  }

  public getStarPosition(index: number): THREE.Vector3 {
    const positions = this.geometry.attributes.position.array as Float32Array;
    const idx = index * 3;
    return new THREE.Vector3(
      positions[idx],
      positions[idx + 1],
      positions[idx + 2]
    );
  }

  public getStarCount(): number {
    return this.stars.length;
  }

  public getStarData(index: number): StarData {
    return this.stars[index];
  }

  public dispose(): void {
    this.geometry.dispose();
    this.material.dispose();
  }
}
