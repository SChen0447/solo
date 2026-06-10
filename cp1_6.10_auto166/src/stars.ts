import * as THREE from 'three';

export class Stars {
  private scene: THREE.Scene;
  private starGeometry: THREE.BufferGeometry;
  private starMaterial: THREE.PointsMaterial;
  private stars: THREE.Points;
  private starCount: number;
  private twinkleSpeeds: Float32Array;
  private twinkleOffsets: Float32Array;
  private initialSizes: Float32Array;

  constructor(scene: THREE.Scene, starCount: number = 500) {
    this.scene = scene;
    this.starCount = starCount;
    this.twinkleSpeeds = new Float32Array(starCount);
    this.twinkleOffsets = new Float32Array(starCount);
    this.initialSizes = new Float32Array(starCount);
    this.starGeometry = new THREE.BufferGeometry();
    this.starMaterial = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 2,
      transparent: true,
      opacity: 0.9,
      sizeAttenuation: false,
      depthWrite: false
    });
    this.stars = this.createStars();
    this.scene.add(this.stars);
  }

  private createStars(): THREE.Points {
    const positions = new Float32Array(this.starCount * 3);
    const colors = new Float32Array(this.starCount * 3);
    const sizes = new Float32Array(this.starCount);
    const radius = 500;

    for (let i = 0; i < this.starCount; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = radius * (0.9 + Math.random() * 0.1);

      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = r * Math.cos(phi);

      const brightness = 0.6 + Math.random() * 0.4;
      colors[i * 3] = brightness;
      colors[i * 3 + 1] = brightness;
      colors[i * 3 + 2] = brightness;

      const size = 1 + Math.random() * 2;
      sizes[i] = size;
      this.initialSizes[i] = size;

      this.twinkleSpeeds[i] = 0.5 + Math.random() * 1.5;
      this.twinkleOffsets[i] = Math.random() * Math.PI * 2;
    }

    this.starGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.starGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    this.starGeometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    const material = new THREE.PointsMaterial({
      size: 2,
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
      sizeAttenuation: false,
      depthWrite: false
    });

    return new THREE.Points(this.starGeometry, material);
  }

  public update(elapsedTime: number): void {
    const sizeAttribute = this.starGeometry.getAttribute('size') as THREE.BufferAttribute;
    const sizes = sizeAttribute.array as Float32Array;

    for (let i = 0; i < this.starCount; i++) {
      const twinkle = Math.sin(elapsedTime * this.twinkleSpeeds[i] + this.twinkleOffsets[i]);
      const sizeMultiplier = 0.7 + twinkle * 0.3;
      sizes[i] = this.initialSizes[i] * sizeMultiplier;
    }

    sizeAttribute.needsUpdate = true;
  }

  public dispose(): void {
    this.starGeometry.dispose();
    (this.stars.material as THREE.Material).dispose();
    this.scene.remove(this.stars);
  }
}
