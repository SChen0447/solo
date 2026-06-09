import * as THREE from 'three';
import { SimplexNoise } from 'simplex-noise';

export class GlacierManager {
  private scene: THREE.Scene;
  private iceMesh: THREE.Mesh | null = null;
  private iceGeometry: THREE.PlaneGeometry | null = null;
  private iceMaterial: THREE.MeshStandardMaterial | null = null;
  private currentHeight: number = 0.2;
  private baseHeights: Float32Array = new Float32Array();
  private simplex = new SimplexNoise();
  private readonly minHeight: number = 0.2;
  private readonly maxHeight: number = 2.0;
  private readonly size: number = 200;
  private readonly segments: number = 99;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  public createIceLayer(): void {
    this.iceGeometry = new THREE.PlaneGeometry(
      this.size,
      this.size,
      this.segments,
      this.segments
    );
    this.iceGeometry.rotateX(-Math.PI / 2);

    const positionCount = this.iceGeometry.attributes.position.count;
    this.baseHeights = new Float32Array(positionCount);

    const positions = this.iceGeometry.attributes.position;
    for (let i = 0; i < positionCount; i++) {
      const x = positions.getX(i);
      const z = positions.getZ(i);
      this.baseHeights[i] = this.simplex.noise2D(x * 0.08, z * 0.08) * 0.3;
      positions.setY(i, this.minHeight + this.baseHeights[i]);
    }
    this.iceGeometry.attributes.position.needsUpdate = true;
    this.iceGeometry.computeVertexNormals();

    this.iceMaterial = new THREE.MeshStandardMaterial({
      color: 0x8ab4f8,
      transparent: true,
      opacity: 0.6,
      roughness: 0.1,
      metalness: 0.1,
    });

    this.iceMesh = new THREE.Mesh(this.iceGeometry, this.iceMaterial);
    this.iceMesh.position.y = 0;
    this.iceMesh.receiveShadow = true;
    this.scene.add(this.iceMesh);
  }

  public updateIceColor(color: THREE.Color): void {
    if (this.iceMaterial) {
      this.iceMaterial.color.copy(color);
    }
  }

  private lerpColor(a: THREE.Color, b: THREE.Color, t: number): THREE.Color {
    return new THREE.Color().lerpColors(a, b, t);
  }

  public simulate(temperature: number, deltaTime: number): void {
    if (!this.iceGeometry || !this.iceMaterial || !this.iceMesh) return;

    const tempFactor = Math.max(0, Math.min(1, (0 - temperature) / 30));
    const targetHeight = this.minHeight + tempFactor * (this.maxHeight - this.minHeight);

    let growthRate: number;
    if (targetHeight > this.currentHeight) {
      growthRate = tempFactor * 0.02 * 60;
    } else {
      growthRate = -tempFactor * 0.04 * 60;
    }

    this.currentHeight += growthRate * deltaTime;
    this.currentHeight = Math.max(this.minHeight, Math.min(this.maxHeight, this.currentHeight));

    const positions = this.iceGeometry.attributes.position;
    const noiseAmplitude = 0.3 + tempFactor * 0.5;

    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i);
      const z = positions.getZ(i);
      const noiseVal = this.simplex.noise2D(x * 0.08, z * 0.08) * noiseAmplitude;
      positions.setY(i, this.currentHeight + noiseVal);
    }

    this.iceGeometry.attributes.position.needsUpdate = true;
    this.iceGeometry.computeVertexNormals();

    const lightBlue = new THREE.Color(0xb0d4f1);
    const darkBlue = new THREE.Color(0x4a6a8a);
    const iceColor = this.lerpColor(lightBlue, darkBlue, tempFactor);
    this.iceMaterial.color.copy(iceColor);
    this.iceMaterial.opacity = 0.5 + tempFactor * 0.2;
  }
}
