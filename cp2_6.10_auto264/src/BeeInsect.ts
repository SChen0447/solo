import * as THREE from 'three';
import { InsectBase, FlowerData, InsectParams } from './InsectBase';

export class BeeInsect extends InsectBase {
  private wingAngle: number = 0;
  private leftWing: THREE.Mesh | null = null;
  private rightWing: THREE.Mesh | null = null;

  constructor(
    startPosition: THREE.Vector3,
    params: InsectParams,
    scene: THREE.Scene
  ) {
    super('bee', startPosition, '#FFD700', params, scene);
    this.baseSpeed = 2.5;
  }

  protected createMesh(): THREE.Group {
    const group = new THREE.Group();

    const bodyGeo = new THREE.BoxGeometry(0.25, 0.15, 0.35);
    const bodyMat = new THREE.MeshStandardMaterial({
      color: 0xFFD700,
      roughness: 0.5,
      metalness: 0.2
    });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    group.add(body);

    const stripeMat = new THREE.MeshStandardMaterial({
      color: 0x000000,
      roughness: 0.6
    });
    for (let i = -1; i <= 1; i++) {
      const stripeGeo = new THREE.BoxGeometry(0.26, 0.16, 0.05);
      const stripe = new THREE.Mesh(stripeGeo, stripeMat);
      stripe.position.z = i * 0.1;
      group.add(stripe);
    }

    const headGeo = new THREE.SphereGeometry(0.1, 12, 12);
    const headMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.7 });
    const head = new THREE.Mesh(headGeo, headMat);
    head.position.z = 0.22;
    head.position.y = 0.02;
    group.add(head);

    const wingGeo = new THREE.PlaneGeometry(0.25, 0.15);
    const wingMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.5,
      side: THREE.DoubleSide
    });
    this.leftWing = new THREE.Mesh(wingGeo, wingMat);
    this.leftWing.position.set(-0.15, 0.1, 0);
    this.leftWing.rotation.y = Math.PI / 4;
    group.add(this.leftWing);

    this.rightWing = new THREE.Mesh(wingGeo, wingMat);
    this.rightWing.position.set(0.15, 0.1, 0);
    this.rightWing.rotation.y = -Math.PI / 4;
    group.add(this.rightWing);

    return group;
  }

  public beelineToFlower(flower: FlowerData, dt: number) {
    this.moveTowards(flower.center, dt, 1);
  }

  public step(
    dt: number,
    flowers: FlowerData[],
    windStrength: number,
    windDirection: THREE.Vector3
  ): void {
    if (!this.alive) return;

    this.wingAngle += dt * 30;
    if (this.leftWing) this.leftWing.rotation.z = Math.sin(this.wingAngle) * 0.5;
    if (this.rightWing) this.rightWing.rotation.z = -Math.sin(this.wingAngle) * 0.5;

    const now = performance.now();
    if (this.isOnFlower && this.currentTarget) {
      if (now > this.onFlowerUntil) {
        this.isOnFlower = false;
        this.currentTarget = null;
      } else {
        this.position.copy(this.currentTarget.center);
        this.mesh.position.copy(this.position);
        return;
      }
    }

    const nearby = this.findNearbyFlowers(flowers);

    if (!this.currentTarget || (nearby.length > 0 && this.currentTarget.attractionLevel === 'low')) {
      if (nearby.length > 0) {
        const goStraight = Math.random() * 100 < this.params.straightProbability;
        if (goStraight && nearby.length > 0) {
          this.currentTarget = nearby[0];
        } else {
          const candidates = nearby.slice(0, Math.min(3, nearby.length));
          this.currentTarget = candidates[Math.floor(Math.random() * candidates.length)];
        }
      } else if (flowers.length > 0) {
        const sorted = [...flowers].filter(f => f.attractionLevel !== 'low')
          .sort((a, b) => this.position.distanceTo(a.center) - this.position.distanceTo(b.center));
        this.currentTarget = sorted[0] || null;
      }
    }

    if (this.currentTarget) {
      this.moveTowards(this.currentTarget.center, dt, 1.2);
      this.applyWind(windStrength, windDirection, dt);
      this.mesh.position.copy(this.position);

      if (this.checkArrival(this.currentTarget)) {
        this.recordVisit(this.currentTarget);
        this.isOnFlower = true;
        this.onFlowerUntil = now + 1500;
      }
    }

    this.addTrailPoint();
  }
}
