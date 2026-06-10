import * as THREE from 'three';
import { v4 as uuidv4 } from 'uuid';

export interface FlowerData {
  id: string;
  position: THREE.Vector3;
  stemHeight: number;
  petalColor: THREE.Color;
  colorName: 'red' | 'yellow' | 'purple' | 'blue';
  center: THREE.Vector3;
  attractionLevel: 'normal' | 'high' | 'low';
  highAttractionUntil: number;
  visitedCount: number;
  lastVisitedAt: number;
}

export interface TrailPoint {
  position: THREE.Vector3;
  timestamp: number;
}

export interface VisitRecord {
  flowerId: string;
  timestamp: number;
  duration: number;
}

export interface InsectParams {
  speed: number;
  straightProbability: number;
  turnSensitivity: number;
}

export type InsectType = 'bee' | 'butterfly' | 'beetle';

export abstract class InsectBase {
  public id: string;
  public type: InsectType;
  public position: THREE.Vector3;
  public velocity: THREE.Vector3;
  public color: THREE.Color;
  public trailColor: string;
  public mesh: THREE.Group;
  public trailPoints: TrailPoint[] = [];
  public visitHistory: VisitRecord[] = [];
  public params: InsectParams;
  public currentTarget: FlowerData | null = null;
  public isOnFlower: boolean = false;
  public onFlowerUntil: number = 0;
  public baseSpeed: number = 2;
  public maxTrailPoints: number = 300;
  public trailLine: THREE.Line | null = null;
  public trailGeometry: THREE.BufferGeometry | null = null;
  public alive: boolean = true;
  protected windOffset: THREE.Vector3 = new THREE.Vector3();
  protected wanderAngle: number = 0;
  protected searchRadius: number = 5;

  constructor(
    type: InsectType,
    startPosition: THREE.Vector3,
    trailColor: string,
    params: InsectParams,
    scene: THREE.Scene
  ) {
    this.id = uuidv4();
    this.type = type;
    this.position = startPosition.clone();
    this.velocity = new THREE.Vector3();
    this.trailColor = trailColor;
    this.color = new THREE.Color(trailColor);
    this.params = { ...params };
    this.mesh = this.createMesh();
    this.mesh.position.copy(this.position);
    scene.add(this.mesh);
    this.createTrailLine(scene);
  }

  protected abstract createMesh(): THREE.Group;

  protected createTrailLine(scene: THREE.Scene) {
    this.trailGeometry = new THREE.BufferGeometry();
    const positions = new Float32Array(this.maxTrailPoints * 3);
    this.trailGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.trailGeometry.setDrawRange(0, 0);

    const material = new THREE.LineBasicMaterial({
      color: this.trailColor,
      transparent: true,
      opacity: 0.7,
      linewidth: 2
    });
    this.trailLine = new THREE.Line(this.trailGeometry, material);
    scene.add(this.trailLine);
  }

  public addTrailPoint() {
    const point: TrailPoint = {
      position: this.position.clone(),
      timestamp: performance.now()
    };
    this.trailPoints.push(point);
    if (this.trailPoints.length > this.maxTrailPoints) {
      this.trailPoints.shift();
    }
    this.updateTrailGeometry(false);
  }

  public updateTrailGeometry(downsample: boolean) {
    if (!this.trailGeometry) return;
    const positions = this.trailGeometry.attributes.position.array as Float32Array;
    const step = downsample ? 3 : 1;
    let count = 0;
    for (let i = 0; i < this.trailPoints.length; i += step) {
      const p = this.trailPoints[i].position;
      positions[count * 3] = p.x;
      positions[count * 3 + 1] = p.y;
      positions[count * 3 + 2] = p.z;
      count++;
    }
    this.trailGeometry.setDrawRange(0, count);
    this.trailGeometry.attributes.position.needsUpdate = true;

    const ageFactor = Math.max(0.2, 1 - this.trailPoints.length / this.maxTrailPoints);
    if (this.trailLine) {
      (this.trailLine.material as THREE.LineBasicMaterial).opacity = 0.7 * ageFactor;
    }
  }

  public setParams(params: Partial<InsectParams>) {
    Object.assign(this.params, params);
  }

  public setSearchRadius(radius: number) {
    this.searchRadius = radius;
  }

  public abstract step(
    dt: number,
    flowers: FlowerData[],
    windStrength: number,
    windDirection: THREE.Vector3
  ): void;

  protected findNearbyFlowers(flowers: FlowerData[]): FlowerData[] {
    return flowers.filter(f => {
      if (f.attractionLevel === 'low') return false;
      const dist = this.position.distanceTo(f.center);
      return dist < this.searchRadius;
    }).sort((a, b) => {
      const distA = this.position.distanceTo(a.center);
      const distB = this.position.distanceTo(b.center);
      if (a.attractionLevel === 'high' && b.attractionLevel !== 'high') return -1;
      if (b.attractionLevel === 'high' && a.attractionLevel !== 'high') return 1;
      return distA - distB;
    });
  }

  protected moveTowards(target: THREE.Vector3, dt: number, speedMult: number = 1) {
    const direction = new THREE.Vector3().subVectors(target, this.position);
    const distance = direction.length();
    if (distance < 0.01) return;
    direction.normalize();

    const speed = this.baseSpeed * this.params.speed * speedMult;
    const desiredVelocity = direction.multiplyScalar(speed);

    this.velocity.lerp(desiredVelocity, this.params.turnSensitivity);
    const moveAmount = this.velocity.clone().multiplyScalar(dt);

    if (moveAmount.length() > distance) {
      this.position.copy(target);
      this.velocity.set(0, 0, 0);
    } else {
      this.position.add(moveAmount);
    }
    this.mesh.position.copy(this.position);
    this.mesh.lookAt(this.position.clone().add(this.velocity));
  }

  protected applyWind(windStrength: number, windDirection: THREE.Vector3, dt: number) {
    if (windStrength > 0) {
      const windForce = windDirection.clone().multiplyScalar(windStrength * 0.3 * dt);
      this.position.add(windForce);
    }
  }

  protected checkArrival(flower: FlowerData): boolean {
    const dist = this.position.distanceTo(flower.center);
    return dist < 0.4;
  }

  protected recordVisit(flower: FlowerData) {
    const now = performance.now();
    if (this.visitHistory.length > 0) {
      const last = this.visitHistory[this.visitHistory.length - 1];
      if (last.flowerId === flower.id && now - last.timestamp < 1000) return;
    }
    this.visitHistory.push({
      flowerId: flower.id,
      timestamp: now,
      duration: 0
    });
    flower.visitedCount++;
    flower.lastVisitedAt = now;
  }

  public dispose(scene: THREE.Scene) {
    this.alive = false;
    scene.remove(this.mesh);
    this.mesh.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        obj.geometry.dispose();
        if (Array.isArray(obj.material)) {
          obj.material.forEach(m => m.dispose());
        } else {
          obj.material.dispose();
        }
      }
    });
    if (this.trailLine) {
      scene.remove(this.trailLine);
      this.trailGeometry?.dispose();
      (this.trailLine.material as THREE.Material).dispose();
    }
  }
}
