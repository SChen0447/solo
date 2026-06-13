import * as THREE from 'three';

export class StarNode {
  public mesh: THREE.Points;
  public glowMesh: THREE.Points;
  public position: THREE.Vector3;
  public isSelected: boolean = false;
  public baseSize: number;
  public currentSize: number;
  public targetSize: number;
  public twinklePhase: number;
  public twinkleSpeed: number;
  public pulseIntensity: number = 0;
  public userData: { [key: string]: any } = {};

  private geometry: THREE.BufferGeometry;
  private material: THREE.PointsMaterial;
  private glowGeometry: THREE.BufferGeometry;
  private glowMaterial: THREE.PointsMaterial;
  private baseColor: THREE.Color;
  private selectedColor: THREE.Color;

  constructor(position: THREE.Vector3, size: number = 1) {
    this.position = position.clone();
    this.baseSize = size;
    this.currentSize = size;
    this.targetSize = size;
    this.twinklePhase = Math.random() * Math.PI * 2;
    this.twinkleSpeed = 0.5 + Math.random() * 1.5;
    this.baseColor = new THREE.Color(0xffffff);
    this.selectedColor = new THREE.Color(0x6496ff);

    this.geometry = new THREE.BufferGeometry();
    const vertices = new Float32Array([position.x, position.y, position.z]);
    this.geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));

    this.material = new THREE.PointsMaterial({
      color: this.baseColor,
      size: size,
      transparent: true,
      opacity: 0.8,
      sizeAttenuation: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    this.mesh = new THREE.Points(this.geometry, this.material);
    this.mesh.userData.starNode = this;

    this.glowGeometry = new THREE.BufferGeometry();
    this.glowGeometry.setAttribute('position', new THREE.BufferAttribute(vertices.slice(), 3));

    this.glowMaterial = new THREE.PointsMaterial({
      color: this.selectedColor,
      size: size * 3,
      transparent: true,
      opacity: 0,
      sizeAttenuation: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    this.glowMesh = new THREE.Points(this.glowGeometry, this.glowMaterial);
    this.glowMesh.userData.starNode = this;
  }

  public update(deltaTime: number): void {
    this.twinklePhase += this.twinkleSpeed * deltaTime;
    const twinkleFactor = 0.5 + Math.sin(this.twinklePhase) * 0.5;

    if (this.isSelected) {
      this.targetSize = this.baseSize * 2;
      this.pulseIntensity = 0.5 + Math.sin(this.twinklePhase * 3) * 0.3;
    } else {
      this.targetSize = this.baseSize * (0.7 + twinkleFactor * 0.5);
      this.pulseIntensity = Math.max(0, this.pulseIntensity - deltaTime * 2);
    }

    this.currentSize += (this.targetSize - this.currentSize) * 5 * deltaTime;
    this.material.size = this.currentSize;
    this.material.opacity = this.isSelected ? 1 : 0.5 + twinkleFactor * 0.4;

    if (this.isSelected) {
      this.material.color.lerpColors(this.baseColor, this.selectedColor, 0.8);
    } else {
      this.material.color.copy(this.baseColor);
    }

    this.glowMaterial.size = this.currentSize * (2.5 + this.pulseIntensity * 2);
    this.glowMaterial.opacity = this.pulseIntensity * 0.6;
    this.glowMaterial.color.copy(this.selectedColor);
  }

  public select(): void {
    this.isSelected = true;
    this.pulseIntensity = 1;
  }

  public deselect(): void {
    this.isSelected = false;
  }

  public toggle(): boolean {
    if (this.isSelected) {
      this.deselect();
      return false;
    } else {
      this.select();
      return true;
    }
  }

  public raycast(raycaster: THREE.Raycaster): THREE.Intersection | null {
    const intersects = raycaster.intersectObject(this.mesh);
    if (intersects.length > 0) {
      return intersects[0];
    }
    return null;
  }

  public dispose(): void {
    this.geometry.dispose();
    this.material.dispose();
    this.glowGeometry.dispose();
    this.glowMaterial.dispose();
  }
}
