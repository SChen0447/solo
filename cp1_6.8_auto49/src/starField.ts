import * as THREE from 'three';

export class StarField {
  private scene: THREE.Scene;
  private stars: THREE.Points;
  private geometry: THREE.BufferGeometry;
  private material: THREE.PointsMaterial;
  private starCount: number = 2000;
  private baseSizes: Float32Array;
  private flickerSpeeds: Float32Array;
  private flickerPhases: Float32Array;
  private baseBrightness: Float32Array;
  private time: number = 0;

  constructor(scene: THREE.Scene) {
    this.scene = scene;

    this.geometry = new THREE.BufferGeometry();
    this.material = new THREE.PointsMaterial({
      size: 1,
      color: 0xffffff,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: false,
      depthWrite: false
    });

    this.stars = new THREE.Points(this.geometry, this.material);
    this.scene.add(this.stars);

    this.baseSizes = new Float32Array(this.starCount);
    this.flickerSpeeds = new Float32Array(this.starCount);
    this.flickerPhases = new Float32Array(this.starCount);
    this.baseBrightness = new Float32Array(this.starCount);

    this.initStars();
  }

  private initStars(): void {
    const positions = new Float32Array(this.starCount * 3);
    const colors = new Float32Array(this.starCount * 3);

    for (let i = 0; i < this.starCount; i++) {
      const radius = 100 + Math.random() * 100;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);

      const x = radius * Math.sin(phi) * Math.cos(theta);
      const y = radius * Math.sin(phi) * Math.sin(theta);
      const z = radius * Math.cos(phi);

      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;

      const brightness = 0.5 + Math.random() * 0.5;
      colors[i * 3] = brightness;
      colors[i * 3 + 1] = brightness;
      colors[i * 3 + 2] = brightness;

      this.baseSizes[i] = 0.5 + Math.random() * 1.0;
      this.flickerSpeeds[i] = (2 + Math.random() * 3) * 0.001;
      this.flickerPhases[i] = Math.random() * Math.PI * 2;
      this.baseBrightness[i] = brightness;
    }

    this.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  }

  public update(deltaTime: number): void {
    this.time += deltaTime;

    const colorAttribute = this.geometry.getAttribute('color') as THREE.BufferAttribute;
    const colors = colorAttribute.array as Float32Array;

    for (let i = 0; i < this.starCount; i++) {
      const flicker = Math.sin(this.time * this.flickerSpeeds[i] * 1000 + this.flickerPhases[i]);
      const brightness = this.baseBrightness[i] * (0.7 + flicker * 0.3);

      colors[i * 3] = brightness;
      colors[i * 3 + 1] = brightness;
      colors[i * 3 + 2] = brightness;
    }

    colorAttribute.needsUpdate = true;
  }

  public dispose(): void {
    this.geometry.dispose();
    this.material.dispose();
    this.scene.remove(this.stars);
  }
}
