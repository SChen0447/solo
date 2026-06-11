import * as THREE from 'three';
import { PheromoneManager, Pheromone } from './Pheromone';

export enum BeeMode {
  Exploring = '探索',
  Foraging = '采集',
}

export enum BeeStatus {
  Flying = '正在飞行',
  Collecting = '正在采集',
  Returning = '返回中',
}

export class Bee {
  id: number;
  mode: BeeMode = BeeMode.Exploring;
  status: BeeStatus = BeeStatus.Flying;
  collectCount: number = 0;
  mesh: THREE.Group;
  bodyMesh: THREE.Mesh;
  wingMesh: THREE.Mesh;

  position: THREE.Vector3;
  velocity: THREE.Vector3 = new THREE.Vector3();
  targetPosition: THREE.Vector3 | null = null;
  targetFlower: THREE.Object3D | null = null;

  private explorationAngle: number;
  private explorationTimer: number = 0;
  private collectTimer: number = 0;
  private collectDuration: number = 1.0;
  private collectAngle: number = 0;
  private collectCenter: THREE.Vector3 = new THREE.Vector3();

  returning: boolean = false;
  returnPath: THREE.Vector3[] = [];
  returnPathIndex: number = 0;
  pheromoneReleaseTimer: number = 0;
  pheromoneReleaseInterval: number = 0.15;

  discoverTime: number = 0;
  totalTimeToCollect: number = 0;

  private floatPhase: number;
  private wingPhase: number = 0;
  private speed: number = 3.0;
  private scene: THREE.Scene;
  private pheromoneManager: PheromoneManager;
  private evaporationRate: number = 1.0;

  constructor(
    id: number,
    position: THREE.Vector3,
    scene: THREE.Scene,
    pheromoneManager: PheromoneManager,
    evaporationRate: number
  ) {
    this.id = id;
    this.position = position.clone();
    this.scene = scene;
    this.pheromoneManager = pheromoneManager;
    this.evaporationRate = evaporationRate;
    this.explorationAngle = Math.random() * Math.PI * 2;
    this.floatPhase = Math.random() * Math.PI * 2;

    this.mesh = new THREE.Group();

    const bodyGeom = new THREE.SphereGeometry(0.2, 8, 8);
    const bodyMat = new THREE.MeshLambertMaterial({ color: 0xffc107 });
    this.bodyMesh = new THREE.Mesh(bodyGeom, bodyMat);
    this.bodyMesh.scale.set(1, 0.7, 1.3);
    this.mesh.add(this.bodyMesh);

    const stripeGeom = new THREE.SphereGeometry(0.21, 8, 8);
    const stripeMat = new THREE.MeshLambertMaterial({ color: 0x1a1a1a });
    const stripe1 = new THREE.Mesh(stripeGeom, stripeMat);
    stripe1.scale.set(1.1, 0.5, 0.3);
    stripe1.position.z = 0.05;
    this.bodyMesh.add(stripe1);
    const stripe2 = new THREE.Mesh(stripeGeom, stripeMat);
    stripe2.scale.set(1.1, 0.5, 0.3);
    stripe2.position.z = -0.1;
    this.bodyMesh.add(stripe2);

    const wingGeom = new THREE.CircleGeometry(0.25, 6);
    const wingMat = new THREE.MeshLambertMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.4,
      side: THREE.DoubleSide,
    });
    this.wingMesh = new THREE.Mesh(wingGeom, wingMat);
    this.wingMesh.rotation.x = -Math.PI / 2;
    this.wingMesh.position.y = 0.15;
    this.mesh.add(this.wingMesh);

    this.mesh.position.copy(this.position);
    this.scene.add(this.mesh);
  }

  setEvaporationRate(rate: number): void {
    this.evaporationRate = rate;
  }

  update(
    dt: number,
    flowers: THREE.Object3D[],
    obstacles: THREE.Object3D[],
    allBees: Bee[],
    time: number
  ): void {
    if (this.status === BeeStatus.Collecting) {
      this.updateCollecting(dt, time);
      return;
    }

    this.floatPhase += dt * Math.PI * 4;
    this.wingPhase += dt * Math.PI * 16;

    const floatOffset = Math.sin(this.floatPhase) * 0.05;
    const wingScale = 0.2 + (Math.sin(this.wingPhase) * 0.5 + 0.5) * 0.8;
    this.wingMesh.scale.x = wingScale;

    if (this.returning) {
      this.updateReturning(dt, time);
    } else if (this.mode === BeeMode.Exploring) {
      this.updateExploring(dt, flowers, obstacles, allBees, time);
    } else {
      this.updateForaging(dt, flowers, obstacles, allBees, time);
    }

    this.mesh.position.set(this.position.x, this.position.y + floatOffset, this.position.z);
    if (this.velocity.lengthSq() > 0.001) {
      const angle = Math.atan2(this.velocity.x, this.velocity.z);
      this.mesh.rotation.y = angle;
    }
  }

  private updateExploring(
    dt: number,
    flowers: THREE.Object3D[],
    obstacles: THREE.Object3D[],
    allBees: Bee[],
    time: number
  ): void {
    this.explorationTimer += dt;
    if (this.explorationTimer > 2 + Math.random() * 2) {
      this.explorationTimer = 0;
      this.explorationAngle += (Math.random() - 0.5) * Math.PI;
    }

    const nearestFlower = this.findNearestActiveFlower(flowers, 2.0);
    if (nearestFlower) {
      this.targetFlower = nearestFlower;
      this.mode = BeeMode.Foraging;
      this.status = BeeStatus.Flying;
      this.discoverTime = time;
      return;
    }

    const nearbyPheromone = this.findNearbyPheromone(1.5);
    if (nearbyPheromone) {
      this.mode = BeeMode.Foraging;
      this.status = BeeStatus.Flying;
      return;
    }

    const dir = new THREE.Vector3(
      Math.sin(this.explorationAngle),
      0,
      Math.cos(this.explorationAngle)
    );

    this.avoidObstacles(dir, obstacles);
    this.separateFromBees(dir, allBees);
    this.stayInBounds(dir);

    dir.normalize().multiplyScalar(this.speed);
    this.velocity.lerp(dir, 0.1);
    this.position.add(this.velocity.clone().multiplyScalar(dt));
    this.position.y = 1.0;
  }

  private updateForaging(
    dt: number,
    flowers: THREE.Object3D[],
    obstacles: THREE.Object3D[],
    allBees: Bee[],
    time: number
  ): void {
    let target: THREE.Vector3 | null = null;

    const nearestFlower = this.findNearestActiveFlower(flowers, 5.0);
    if (nearestFlower) {
      this.targetFlower = nearestFlower;
      target = nearestFlower.position.clone();
      target.y = 1.0;
    }

    if (!target) {
      const pheromoneTarget = this.findPheromoneGradientTarget();
      if (pheromoneTarget) {
        target = pheromoneTarget;
      }
    }

    if (!target) {
      this.mode = BeeMode.Exploring;
      this.status = BeeStatus.Flying;
      this.explorationAngle = Math.random() * Math.PI * 2;
      return;
    }

    const dir = target.clone().sub(this.position).normalize();
    this.avoidObstacles(dir, obstacles);
    this.separateFromBees(dir, allBees);

    dir.normalize().multiplyScalar(this.speed);
    this.velocity.lerp(dir, 0.15);
    this.position.add(this.velocity.clone().multiplyScalar(dt));
    this.position.y = 1.0;

    if (this.targetFlower) {
      const dist = this.position.distanceTo(this.targetFlower.position);
      if (dist < 0.5) {
        const flowerData = (this.targetFlower as any).userData;
        if (flowerData && flowerData.active) {
          this.startCollecting(this.targetFlower, time);
        } else {
          this.targetFlower = null;
          this.mode = BeeMode.Exploring;
          this.status = BeeStatus.Flying;
        }
      }
    }
  }

  private updateCollecting(dt: number, time: number): void {
    this.collectTimer += dt;
    this.collectAngle += dt * Math.PI * 2;

    const radius = 0.5;
    this.position.x = this.collectCenter.x + Math.cos(this.collectAngle) * radius;
    this.position.z = this.collectCenter.z + Math.sin(this.collectAngle) * radius;
    this.position.y = 1.0;

    this.mesh.position.copy(this.position);

    if (this.collectTimer >= this.collectDuration) {
      this.collectCount++;
      this.status = BeeStatus.Returning;
      this.returning = true;
      this.returnPath = [];
      this.returnPathIndex = 0;
      this.pheromoneReleaseTimer = 0;

      this.totalTimeToCollect = time - this.discoverTime;

      this.deactivateFlower(this.targetFlower);
      this.targetFlower = null;
    }
  }

  private startCollecting(flower: THREE.Object3D, time: number): void {
    this.status = BeeStatus.Collecting;
    this.collectTimer = 0;
    this.collectAngle = 0;
    this.collectCenter.copy(flower.position);
    this.collectCenter.y = 1.0;
  }

  private updateReturning(dt: number, time: number): void {
    this.returnPath.push(this.position.clone());

    this.pheromoneReleaseTimer += dt;
    if (this.pheromoneReleaseTimer >= this.pheromoneReleaseInterval) {
      this.pheromoneReleaseTimer = 0;
      this.pheromoneManager.addPheromone(this.position, this.evaporationRate);
    }

    const hivePos = new THREE.Vector3(0, 1.0, 0);
    const toHive = hivePos.clone().sub(this.position);
    const dist = toHive.length();

    if (dist < 1.5) {
      this.returning = false;
      this.mode = BeeMode.Exploring;
      this.status = BeeStatus.Flying;
      this.explorationAngle = Math.random() * Math.PI * 2;
      return;
    }

    const dir = toHive.normalize();
    this.velocity.lerp(dir.clone().multiplyScalar(this.speed), 0.1);
    this.position.add(this.velocity.clone().multiplyScalar(dt));
    this.position.y = 1.0;
  }

  private findNearestActiveFlower(flowers: THREE.Object3D[], maxDist: number): THREE.Object3D | null {
    let nearest: THREE.Object3D | null = null;
    let nearestDist = maxDist;
    for (const f of flowers) {
      const data = (f as any).userData;
      if (!data || !data.active) continue;
      const d = this.position.distanceTo(f.position);
      if (d < nearestDist) {
        nearestDist = d;
        nearest = f;
      }
    }
    return nearest;
  }

  private findNearbyPheromone(maxDist: number): Pheromone | null {
    let best: Pheromone | null = null;
    let bestDist = maxDist;
    for (const p of this.pheromoneManager.pheromones) {
      if (p.isDead || p.fadingOut) continue;
      const d = this.position.distanceTo(p.mesh.position);
      if (d < bestDist) {
        bestDist = d;
        best = p;
      }
    }
    if (best) {
      best.onDetected();
    }
    return best;
  }

  private findPheromoneGradientTarget(): THREE.Vector3 | null {
    let bestPos: THREE.Vector3 | null = null;
    let bestScore = -1;
    for (const p of this.pheromoneManager.pheromones) {
      if (p.isDead || p.fadingOut) continue;
      const d = this.position.distanceTo(p.mesh.position);
      if (d > 5.0) continue;
      const score = p.currentOpacity / (d + 0.1);
      if (score > bestScore) {
        bestScore = score;
        bestPos = p.mesh.position.clone();
      }
    }
    return bestPos;
  }

  private avoidObstacles(dir: THREE.Vector3, obstacles: THREE.Object3D[]): void {
    for (const obs of obstacles) {
      const toObs = obs.position.clone().sub(this.position);
      toObs.y = 0;
      const dist = toObs.length();
      const obsRadius = (obs as any).userData?.radius ?? 1.0;

      if (dist < 3.0) {
        const forward = this.velocity.clone().normalize();
        const angle = forward.angleTo(toObs.normalize());
        if (angle < Math.PI / 4 && dist < 5.0) {
          const avoid = this.position.clone().sub(obs.position).normalize();
          dir.add(avoid.multiplyScalar(2.0 / (dist + 0.1)));
        }
      }

      if (dist < obsRadius + 0.5) {
        const push = this.position.clone().sub(obs.position).normalize();
        dir.add(push.multiplyScalar(5.0));
      }
    }
  }

  private separateFromBees(dir: THREE.Vector3, allBees: Bee[]): void {
    for (const other of allBees) {
      if (other.id === this.id) continue;
      const d = this.position.distanceTo(other.position);
      if (d < 0.5 && d > 0.001) {
        const away = this.position.clone().sub(other.position).normalize();
        dir.add(away.multiplyScalar(1.0 / d));
      }
    }
  }

  private stayInBounds(dir: THREE.Vector3): void {
    const boundRadius = 19.0;
    const dist = Math.sqrt(this.position.x ** 2 + this.position.z ** 2);
    if (dist > boundRadius) {
      const toCenter = new THREE.Vector3(-this.position.x, 0, -this.position.z).normalize();
      dir.add(toCenter.multiplyScalar(3.0));
    }
  }

  private deactivateFlower(flower: THREE.Object3D | null): void {
    if (!flower) return;
    const data = (flower as any).userData;
    if (!data) return;
    data.active = false;
    data.collectCount = (data.collectCount || 0) + 1;
    data.cooldownTimer = 0;
    data.status = '被采集';

    const petalGroup = flower.getObjectByName('petals');
    if (petalGroup) {
      (petalGroup as any).material = new THREE.MeshLambertMaterial({
        color: 0x888888,
        transparent: true,
        opacity: 0.5,
      });
    }

    const marker = flower.getObjectByName('nectarMarker');
    if (marker) {
      (marker as any).visible = false;
    }
  }

  reset(): void {
    this.mode = BeeMode.Exploring;
    this.status = BeeStatus.Flying;
    this.collectCount = 0;
    this.returning = false;
    this.returnPath = [];
    this.returnPathIndex = 0;
    this.targetFlower = null;
    this.explorationAngle = Math.random() * Math.PI * 2;
    this.explorationTimer = 0;
    this.totalTimeToCollect = 0;

    const angle = Math.random() * Math.PI * 2;
    const radius = 1 + Math.random() * 3;
    this.position.set(Math.cos(angle) * radius, 1.0, Math.sin(angle) * radius);
    this.velocity.set(0, 0, 0);
    this.mesh.position.copy(this.position);
  }

  dispose(): void {
    this.scene.remove(this.mesh);
    this.mesh.traverse((child) => {
      if ((child as any).geometry) (child as any).geometry.dispose();
      if ((child as any).material) {
        if (Array.isArray((child as any).material)) {
          (child as any).material.forEach((m: any) => m.dispose());
        } else {
          (child as any).material.dispose();
        }
      }
    });
  }
}
