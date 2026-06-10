import * as THREE from 'three';

export type ForceFieldType = 'attract' | 'repel' | 'vortex' | 'wind';

export class ForceField {
  public mesh: THREE.Group;
  public sphere: THREE.Mesh;
  public innerSphere: THREE.Mesh;
  public glow: THREE.Mesh;
  public type: ForceFieldType;
  public strength: number;
  public radius: number;
  public color: THREE.Color;
  public position: THREE.Vector3;

  private scene: THREE.Scene;
  private pulsePhase: number = 0;
  private visible: boolean = true;
  private dragVelocity: THREE.Vector3 = new THREE.Vector3();
  private targetPosition: THREE.Vector3;
  private initialRadius: number;

  constructor(
    scene: THREE.Scene,
    position: THREE.Vector3,
    type: ForceFieldType = 'attract',
    strength: number = 5,
    radius: number = 5
  ) {
    this.scene = scene;
    this.type = type;
    this.strength = strength;
    this.radius = radius;
    this.initialRadius = radius;
    this.position = position.clone();
    this.targetPosition = position.clone();

    switch (type) {
      case 'attract':
        this.color = new THREE.Color(0x00ffff);
        break;
      case 'repel':
        this.color = new THREE.Color(0xff0066);
        break;
      case 'vortex':
        this.color = new THREE.Color(0xff00ff);
        break;
      case 'wind':
        this.color = new THREE.Color(0x00ff88);
        break;
      default:
        this.color = new THREE.Color(0x00ffff);
    }

    this.mesh = new THREE.Group();
    this.mesh.position.copy(this.position);

    const sphereGeo = new THREE.SphereGeometry(radius, 32, 32);
    const sphereMat = new THREE.MeshBasicMaterial({
      color: this.color,
      transparent: true,
      opacity: 0.12,
      side: THREE.FrontSide,
      depthWrite: false,
    });
    this.sphere = new THREE.Mesh(sphereGeo, sphereMat);
    this.mesh.add(this.sphere);

    const innerGeo = new THREE.SphereGeometry(radius * 0.3, 24, 24);
    const innerMat = new THREE.MeshBasicMaterial({
      color: this.color,
      transparent: true,
      opacity: 0.6,
    });
    this.innerSphere = new THREE.Mesh(innerGeo, innerMat);
    this.mesh.add(this.innerSphere);

    const glowGeo = new THREE.SphereGeometry(radius * 0.5, 24, 24);
    const glowMat = new THREE.MeshBasicMaterial({
      color: this.color,
      transparent: true,
      opacity: 0.25,
      side: THREE.BackSide,
    });
    this.glow = new THREE.Mesh(glowGeo, glowMat);
    this.mesh.add(this.glow);

    this.scene.add(this.mesh);
  }

  setStrength(s: number): void {
    this.strength = s;
  }

  setRadius(r: number): void {
    this.radius = Math.max(1, Math.min(8, r));
    const newScale = this.radius / this.initialRadius;
    this.sphere.scale.setScalar(newScale);
    this.innerSphere.scale.setScalar(newScale);
    this.glow.scale.setScalar(newScale);
  }

  setPosition(pos: THREE.Vector3, animate: boolean = true): void {
    this.targetPosition.copy(pos);
    if (!animate) {
      this.position.copy(pos);
      this.mesh.position.copy(pos);
      this.dragVelocity.set(0, 0, 0);
    }
  }

  setVisible(v: boolean): void {
    this.visible = v;
    this.sphere.visible = v;
    this.innerSphere.visible = v;
    this.glow.visible = v;
  }

  isVisible(): boolean {
    return this.visible;
  }

  update(delta: number): void {
    this.pulsePhase += delta * 2;
    const pulse = 1 + Math.sin(this.pulsePhase) * 0.08;
    const baseScale = this.radius / this.initialRadius;
    this.sphere.scale.setScalar(pulse * baseScale);
    this.innerSphere.scale.setScalar(pulse * 0.8 * baseScale);
    this.glow.scale.setScalar(pulse * 1.1 * baseScale);

    const innerMat = this.innerSphere.material as THREE.MeshBasicMaterial;
    innerMat.opacity = 0.5 + Math.sin(this.pulsePhase * 1.5) * 0.2;

    const offset = new THREE.Vector3().subVectors(this.targetPosition, this.position);
    if (offset.lengthSq() > 0.0001) {
      this.dragVelocity.add(offset.multiplyScalar(delta * 15));
      this.dragVelocity.multiplyScalar(0.85);
      this.position.add(this.dragVelocity.clone().multiplyScalar(delta));
      this.mesh.position.copy(this.position);
    } else {
      this.dragVelocity.multiplyScalar(0.9);
    }
  }

  containsPoint(point: THREE.Vector3): boolean {
    return this.position.distanceTo(point) < this.radius * 0.5;
  }

  dispose(): void {
    this.scene.remove(this.mesh);
    (this.sphere.material as THREE.Material).dispose();
    (this.innerSphere.material as THREE.Material).dispose();
    (this.glow.material as THREE.Material).dispose();
    this.sphere.geometry.dispose();
    this.innerSphere.geometry.dispose();
    this.glow.geometry.dispose();
  }
}
