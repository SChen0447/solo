import * as THREE from 'three';

export type ElementalType = 'fire' | 'water' | 'wind' | 'earth';

export interface ElementalClickEvent {
  type: ElementalType;
  position: THREE.Vector3;
  color: THREE.Color;
}

const ELEMENTAL_CONFIG: Record<ElementalType, { color: number; position: THREE.Vector3; frequency: number; stringIndex: number }> = {
  fire:  { color: 0xff3344, position: new THREE.Vector3(0,  4, 0),  frequency: 523.25, stringIndex: 10 },
  water: { color: 0x3388ff, position: new THREE.Vector3(0, -4, 0),  frequency: 587.33, stringIndex: 8 },
  wind:  { color: 0x33cc66, position: new THREE.Vector3(-4, 0, 0),  frequency: 659.25, stringIndex: 6 },
  earth: { color: 0xffcc33, position: new THREE.Vector3(4,  0, 0),  frequency: 783.99, stringIndex: 4 }
};

export { ELEMENTAL_CONFIG };

export class Elemental {
  private scene: THREE.Scene;
  public type: ElementalType;
  private group: THREE.Group;
  private sphereMesh: THREE.Mesh;
  private haloMesh: THREE.Mesh;
  private config: typeof ELEMENTAL_CONFIG[ElementalType];
  private time: number = 0;
  private orbitOffset: number;
  private isClicked: boolean = false;
  private clickTime: number = 0;
  private baseScale: number = 1;

  constructor(scene: THREE.Scene, type: ElementalType, orbitOffset: number) {
    this.scene = scene;
    this.type = type;
    this.config = ELEMENTAL_CONFIG[type];
    this.orbitOffset = orbitOffset;

    this.group = new THREE.Group();

    const sphereGeo = new THREE.SphereGeometry(0.4, 24, 24);
    const sphereMat = new THREE.MeshBasicMaterial({
      color: this.config.color,
      transparent: true,
      opacity: 0.7
    });
    this.sphereMesh = new THREE.Mesh(sphereGeo, sphereMat);
    this.group.add(this.sphereMesh);

    const haloGeo = new THREE.RingGeometry(0.45, 0.6, 32);
    const haloMat = new THREE.MeshBasicMaterial({
      color: this.config.color,
      transparent: true,
      opacity: 0.4,
      side: THREE.DoubleSide
    });
    this.haloMesh = new THREE.Mesh(haloGeo, haloMat);
    this.group.add(this.haloMesh);

    this.group.position.copy(this.config.position);
    this.scene.add(this.group);
  }

  public update(delta: number): void {
    this.time += delta;

    const a = 4;
    const b = 2;
    const speed = 0.4;
    const angle = this.time * speed + this.orbitOffset;

    const baseX = this.config.position.x;
    const baseY = this.config.position.y;

    this.group.position.x = baseX + Math.cos(angle) * a * (Math.abs(baseX) < 0.1 ? 0.5 : 0.3);
    this.group.position.y = baseY + Math.sin(angle) * b * (Math.abs(baseY) < 0.1 ? 0.5 : 0.3);
    this.group.position.z = Math.sin(angle * 2) * 0.5;

    const pulse = 0.6 + 0.4 * Math.abs(Math.sin(this.time * Math.PI * 2 / 1.5));
    (this.sphereMesh.material as THREE.MeshBasicMaterial).opacity = 0.5 + 0.3 * pulse;
    (this.haloMesh.material as THREE.MeshBasicMaterial).opacity = 0.3 + 0.3 * pulse;
    this.haloMesh.scale.setScalar(1 + 0.15 * pulse);
    this.haloMesh.rotation.z = this.time;
    this.sphereMesh.rotation.y = this.time * 0.5;

    if (this.isClicked) {
      this.clickTime += delta;
      const clickDuration = 0.3;
      const t = Math.min(1, this.clickTime / clickDuration);
      const pulseScale = 1 + 0.5 * Math.sin(t * Math.PI * 4) * (1 - t);
      this.group.scale.setScalar(this.baseScale * pulseScale);

      if (t >= 1) {
        this.isClicked = false;
        this.group.scale.setScalar(this.baseScale);
      }
    }
  }

  public onClick(): ElementalClickEvent | null {
    if (this.isClicked) return null;
    this.isClicked = true;
    this.clickTime = 0;

    return {
      type: this.type,
      position: this.group.position.clone(),
      color: new THREE.Color(this.config.color)
    };
  }

  public getMesh(): THREE.Object3D {
    return this.group;
  }

  public getFrequency(): number {
    return this.config.frequency;
  }

  public getStringIndex(): number {
    return this.config.stringIndex;
  }

  public getColor(): THREE.Color {
    return new THREE.Color(this.config.color);
  }

  public setScale(scale: number): void {
    this.baseScale = scale;
    if (!this.isClicked) {
      this.group.scale.setScalar(scale);
    }
  }

  public dispose(): void {
    this.scene.remove(this.group);
    this.sphereMesh.geometry.dispose();
    (this.sphereMesh.material as THREE.Material).dispose();
    this.haloMesh.geometry.dispose();
    (this.haloMesh.material as THREE.Material).dispose();
  }
}
