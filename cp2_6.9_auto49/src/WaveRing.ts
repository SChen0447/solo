import * as THREE from 'three';

class WaveRing {
  public readonly mesh: THREE.Mesh;
  public alive: boolean = false;

  private readonly material: THREE.MeshBasicMaterial;
  private currentRadius: number = 0;
  private currentWidth: number = 0;
  private maxRadius: number = 10;
  private life: number = 0;
  private maxLife: number = 3.0;
  private expansionSpeed: number = 3;

  constructor() {
    this.material = new THREE.MeshBasicMaterial({
      color: 0x00FFFF,
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });
    const geometry = this.createGeometry(0.5, 0.2);
    this.mesh = new THREE.Mesh(geometry, this.material);
    this.mesh.rotation.x = -Math.PI / 2;
    this.mesh.visible = false;
  }

  private createGeometry(innerRadius: number, width: number): THREE.RingGeometry {
    const outerRadius = innerRadius + width;
    return new THREE.RingGeometry(innerRadius, outerRadius, 96, 1);
  }

  private updateGeometry(innerRadius: number, width: number): void {
    this.mesh.geometry.dispose();
    this.mesh.geometry = this.createGeometry(innerRadius, Math.max(width, 0.001));
  }

  public reset(position: THREE.Vector3, sourceSpeed: number): void {
    this.alive = true;
    this.mesh.visible = true;
    this.mesh.position.copy(position);

    const speedFactor = Math.min(sourceSpeed / 10, 1);
    this.currentRadius = 0.5;
    this.currentWidth = 0.2;
    this.maxRadius = 8 + speedFactor * 8;
    this.expansionSpeed = 2.5 + speedFactor * 4;
    this.maxLife = 3.0;
    this.life = this.maxLife;

    this.material.color.setHex(0x00FFFF);
    this.material.opacity = 0.9;
    this.updateGeometry(this.currentRadius, this.currentWidth);
  }

  public update(delta: number): void {
    if (!this.alive) return;

    this.life -= delta;
    if (this.life <= 0) {
      this.alive = false;
      this.mesh.visible = false;
      this.material.opacity = 0;
      return;
    }

    this.currentRadius += this.expansionSpeed * delta;
    const lifeRatio = Math.max(this.life / this.maxLife, 0);
    this.currentWidth = 0.2 * lifeRatio;
    this.material.opacity = 0.9 * lifeRatio;

    const cyan = new THREE.Color(0x00FFFF);
    const transparentColor = new THREE.Color(0x004455);
    this.material.color.copy(cyan.lerp(transparentColor, 1 - lifeRatio));

    this.updateGeometry(this.currentRadius, this.currentWidth);
  }

  public dispose(): void {
    this.mesh.geometry.dispose();
    this.material.dispose();
  }
}

export class WaveRingManager {
  public readonly group: THREE.Group;
  private readonly rings: WaveRing[] = [];
  private readonly maxRings: number = 6;
  private emitTimer: number = 0;
  private readonly emitInterval: number = 0.5;

  constructor() {
    this.group = new THREE.Group();
    for (let i = 0; i < this.maxRings; i++) {
      const ring = new WaveRing();
      this.rings.push(ring);
      this.group.add(ring.mesh);
    }
  }

  private findOldestRingIndex(): number {
    let oldestIndex = -1;
    let minLife = Infinity;
    for (let i = 0; i < this.rings.length; i++) {
      if (!this.rings[i].alive) return i;
      if (this.rings[i].life < minLife) {
        minLife = this.rings[i].life;
        oldestIndex = i;
      }
    }
    return oldestIndex;
  }

  private emitRing(position: THREE.Vector3, sourceSpeed: number): void {
    const index = this.findOldestRingIndex();
    if (index === -1) return;
    this.rings[index].reset(position.clone(), sourceSpeed);
  }

  public update(delta: number, sourcePos: THREE.Vector3, sourceSpeed: number): void {
    this.emitTimer += delta;
    if (this.emitTimer >= this.emitInterval) {
      this.emitTimer = 0;
      this.emitRing(sourcePos, sourceSpeed);
    }

    for (const ring of this.rings) {
      ring.update(delta);
    }
  }

  public dispose(): void {
    for (const ring of this.rings) {
      ring.dispose();
    }
  }
}
