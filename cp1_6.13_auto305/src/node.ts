import * as THREE from 'three';

const NODE_COLORS = [0xff6b6b, 0xfeca57, 0x48dbfb, 0xa29bfe];

export class Node {
  public mesh: THREE.Mesh;
  public glowMesh: THREE.Mesh;
  public position: THREE.Vector3;
  public baseRadius: number;
  public color: number;
  public isSelected: boolean = false;
  public isHovered: boolean = false;

  private pulsePeriod: number;
  private pulsePhase: number;
  private pulseStartTime: number;
  private scaleMultiplier: number = 1;

  private rippleMesh: THREE.Mesh | null = null;
  private rippleStartTime: number = 0;
  private rippleDuration: number = 1.5;

  constructor(position: THREE.Vector3, mobileScale: number = 1) {
    this.position = position.clone();
    this.baseRadius = (8 + Math.random() * 8) * mobileScale;
    this.color = NODE_COLORS[Math.floor(Math.random() * NODE_COLORS.length)];
    this.pulsePeriod = 3 + Math.random() * 5;
    this.pulsePhase = Math.random() * Math.PI * 2;
    this.pulseStartTime = performance.now();

    const geometry = new THREE.SphereGeometry(this.baseRadius, 32, 32);
    const material = new THREE.MeshBasicMaterial({
      color: this.color,
      transparent: true,
      opacity: 0.9
    });
    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.position.copy(this.position);
    this.mesh.userData.node = this;

    const glowGeometry = new THREE.SphereGeometry(this.baseRadius * 1.5, 32, 32);
    const glowMaterial = new THREE.MeshBasicMaterial({
      color: this.color,
      transparent: true,
      opacity: 0.25
    });
    this.glowMesh = new THREE.Mesh(glowGeometry, glowMaterial);
    this.glowMesh.position.copy(this.position);
  }

  public update(time: number, mobileScale: number = 1): void {
    const elapsed = (time - this.pulseStartTime) / 1000;
    const pulseFactor = 0.9 + 0.1 * (0.5 + 0.5 * Math.sin(elapsed * (Math.PI * 2 / this.pulsePeriod) + this.pulsePhase));
    
    let targetScale = this.isHovered ? 1.5 : 1;
    this.scaleMultiplier += (targetScale - this.scaleMultiplier) * 0.15;
    
    const finalScale = pulseFactor * this.scaleMultiplier * mobileScale;
    this.mesh.scale.setScalar(finalScale);
    this.glowMesh.scale.setScalar(finalScale * 1.5);

    this.mesh.position.copy(this.position);
    this.glowMesh.position.copy(this.position);

    this.updateRipple(time);
  }

  public triggerHover(): void {
    if (this.isHovered) return;
    this.isHovered = true;
    this.spawnRipple();
  }

  public triggerUnhover(): void {
    this.isHovered = false;
  }

  private spawnRipple(): void {
    if (this.rippleMesh) {
      this.rippleMesh.parent?.remove(this.rippleMesh);
    }

    const rippleGeometry = new THREE.RingGeometry(this.baseRadius, this.baseRadius + 2, 64);
    const rippleMaterial = new THREE.MeshBasicMaterial({
      color: this.color,
      transparent: true,
      opacity: 0.5,
      side: THREE.DoubleSide
    });
    this.rippleMesh = new THREE.Mesh(rippleGeometry, rippleMaterial);
    this.rippleMesh.position.copy(this.position);
    this.rippleStartTime = performance.now();
  }

  private updateRipple(time: number): void {
    if (!this.rippleMesh) return;

    const elapsed = (time - this.rippleStartTime) / 1000;
    const progress = elapsed / this.rippleDuration;

    if (progress >= 1) {
      this.rippleMesh.parent?.remove(this.rippleMesh);
      this.rippleMesh = null;
      return;
    }

    const currentRadius = this.baseRadius + progress * (120 - this.baseRadius);
    const newGeometry = new THREE.RingGeometry(currentRadius - 3, currentRadius, 64);
    this.rippleMesh.geometry.dispose();
    this.rippleMesh.geometry = newGeometry;

    const material = this.rippleMesh.material as THREE.MeshBasicMaterial;
    material.opacity = 0.5 * (1 - progress);
  }

  public getRippleMesh(): THREE.Mesh | null {
    return this.rippleMesh;
  }

  public dispose(): void {
    this.mesh.geometry.dispose();
    (this.mesh.material as THREE.Material).dispose();
    this.glowMesh.geometry.dispose();
    (this.glowMesh.material as THREE.Material).dispose();
    if (this.rippleMesh) {
      this.rippleMesh.geometry.dispose();
      (this.rippleMesh.material as THREE.Material).dispose();
    }
  }
}
