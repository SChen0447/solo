import * as THREE from 'three';
import { InsectBase, FlowerData, InsectParams } from './InsectBase';

export class BeetleInsect extends InsectBase {
  private legPhase: number = 0;
  private currentStemFlower: FlowerData | null = null;
  private stemProgress: number = 0;
  private crawlingUp: boolean = true;

  constructor(
    startPosition: THREE.Vector3,
    params: InsectParams,
    scene: THREE.Scene
  ) {
    super('beetle', startPosition, '#8B4513', params, scene);
    this.baseSpeed = 0.6;
  }

  protected createMesh(): THREE.Group {
    const group = new THREE.Group();

    const bodyGeo = new THREE.SphereGeometry(0.12, 16, 16);
    const bodyMat = new THREE.MeshStandardMaterial({
      color: 0x8B4513,
      transparent: true,
      opacity: 0.9,
      roughness: 0.3,
      metalness: 0.4
    });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.scale.set(1, 0.7, 1.3);
    group.add(body);

    const shellGeo = new THREE.SphereGeometry(0.125, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2);
    const shellMat = new THREE.MeshStandardMaterial({
      color: 0x654321,
      transparent: true,
      opacity: 0.85,
      roughness: 0.2,
      metalness: 0.5
    });
    const shell = new THREE.Mesh(shellGeo, shellMat);
    shell.scale.set(1, 0.8, 1.3);
    shell.position.y = 0.02;
    group.add(shell);

    const splitGeo = new THREE.BoxGeometry(0.01, 0.15, 0.28);
    const splitMat = new THREE.MeshStandardMaterial({ color: 0x2c1810 });
    const split = new THREE.Mesh(splitGeo, splitMat);
    split.position.y = 0.05;
    group.add(split);

    const headGeo = new THREE.SphereGeometry(0.07, 12, 12);
    const headMat = new THREE.MeshStandardMaterial({ color: 0x1a0f0a, roughness: 0.6 });
    const head = new THREE.Mesh(headGeo, headMat);
    head.position.z = 0.15;
    head.position.y = 0.02;
    group.add(head);

    const antennaMat = new THREE.MeshStandardMaterial({ color: 0x1a0f0a });
    const antGeo = new THREE.CylinderGeometry(0.008, 0.003, 0.1, 4);
    const ant1 = new THREE.Mesh(antGeo, antennaMat);
    ant1.position.set(-0.04, 0.08, 0.2);
    ant1.rotation.x = -0.8;
    ant1.rotation.z = 0.3;
    group.add(ant1);
    const ant2 = new THREE.Mesh(antGeo, antennaMat);
    ant2.position.set(0.04, 0.08, 0.2);
    ant2.rotation.x = -0.8;
    ant2.rotation.z = -0.3;
    group.add(ant2);

    return group;
  }

  public surfaceCrawl(flower: FlowerData, dt: number) {
    if (!flower) return;
    const stemBase = new THREE.Vector3(flower.position.x, 0.05, flower.position.z);
    const stemTop = flower.center.clone();

    if (this.crawlingUp) {
      this.stemProgress += dt * 0.3 * this.params.speed;
      if (this.stemProgress >= 1) {
        this.stemProgress = 1;
        this.crawlingUp = false;
        this.recordVisit(flower);
        this.isOnFlower = true;
        this.onFlowerUntil = performance.now() + 3000;
      }
    } else {
      this.stemProgress -= dt * 0.25 * this.params.speed;
      if (this.stemProgress <= 0) {
        this.stemProgress = 0;
        this.crawlingUp = true;
        this.currentStemFlower = null;
      }
    }

    const angle = (performance.now() * 0.002) % (Math.PI * 2);
    const radius = 0.04;
    const offsetX = Math.cos(angle) * radius;
    const offsetZ = Math.sin(angle) * radius;

    const lerpPos = new THREE.Vector3().lerpVectors(stemBase, stemTop, this.stemProgress);
    lerpPos.x += offsetX;
    lerpPos.z += offsetZ;
    this.position.copy(lerpPos);
    this.mesh.position.copy(this.position);

    const lookTarget = stemTop.clone().sub(stemBase).normalize().multiplyScalar(this.crawlingUp ? 1 : -1);
    this.mesh.lookAt(this.position.clone().add(lookTarget));
  }

  public step(
    dt: number,
    flowers: FlowerData[],
    _windStrength: number,
    _windDirection: THREE.Vector3
  ): void {
    if (!this.alive) return;

    this.legPhase += dt * 6;

    const now = performance.now();
    if (this.isOnFlower && this.currentStemFlower) {
      if (now > this.onFlowerUntil) {
        this.isOnFlower = false;
        this.crawlingUp = false;
      } else {
        this.position.copy(this.currentStemFlower.center);
        this.mesh.position.copy(this.position);
        return;
      }
    }

    if (this.currentStemFlower) {
      this.surfaceCrawl(this.currentStemFlower, dt);
      this.addTrailPoint();
      return;
    }

    if (!this.currentTarget) {
      const valid = flowers.filter(f => f.attractionLevel !== 'low');
      if (valid.length > 0) {
        valid.sort((a, b) => {
          if (a.attractionLevel === 'high' && b.attractionLevel !== 'high') return -1;
          if (b.attractionLevel === 'high' && a.attractionLevel !== 'high') return 1;
          const distA = this.position.distanceTo(a.position);
          const distB = this.position.distanceTo(b.position);
          const heightA = a.stemHeight;
          const heightB = b.stemHeight;
          return (distA + heightA * 0.5) - (distB + heightB * 0.5);
        });
        this.currentTarget = valid[0];
      }
    }

    if (this.currentTarget) {
      const stemBase = new THREE.Vector3(this.currentTarget.position.x, 0.1, this.currentTarget.position.z);
      this.moveTowards(stemBase, dt, 0.8);
      this.mesh.position.copy(this.position);

      if (this.position.distanceTo(stemBase) < 0.25) {
        this.currentStemFlower = this.currentTarget;
        this.stemProgress = 0;
        this.crawlingUp = true;
        this.currentTarget = null;
      }
    }

    this.addTrailPoint();
  }
}
