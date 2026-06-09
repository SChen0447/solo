import * as THREE from 'three';

export interface Building {
  position: THREE.Vector3;
  width: number;
  depth: number;
  height: number;
  mesh: THREE.Mesh | null;
}

export interface WindParams {
  speed: number;
  direction: number;
}

export class WindField {
  private buildings: Building[] = [];
  private params: WindParams = { speed: 5, direction: 90 };
  private targetParams: WindParams = { speed: 5, direction: 90 };
  private transitionStart: number = 0;
  private transitionDuration: number = 500;
  private isTransitioning: boolean = false;

  constructor() {}

  setBuildings(buildings: Building[]): void {
    this.buildings = buildings;
  }

  setParams(params: Partial<WindParams>, animate: boolean = true): void {
    this.targetParams = { ...this.params, ...params };
    if (animate) {
      this.transitionStart = performance.now();
      this.isTransitioning = true;
    } else {
      this.params = { ...this.targetParams };
    }
  }

  getParams(): WindParams {
    return { ...this.params };
  }

  update(time: number): void {
    if (this.isTransitioning) {
      const elapsed = time - this.transitionStart;
      const t = Math.min(elapsed / this.transitionDuration, 1);
      const eased = 1 - Math.pow(1 - t, 3);

      this.params.speed = this.lerp(this.params.speed, this.targetParams.speed, eased);
      const currentDir = this.params.direction;
      const targetDir = this.targetParams.direction;
      let delta = targetDir - currentDir;
      if (delta > 180) delta -= 360;
      if (delta < -180) delta += 360;
      this.params.direction = currentDir + delta * eased;

      if (t >= 1) {
        this.isTransitioning = false;
        this.params = { ...this.targetParams };
      }
    }
  }

  getWindVelocity(position: THREE.Vector3, out: THREE.Vector3): void {
    const dirRad = THREE.MathUtils.degToRad(this.params.direction);
    const baseSpeed = this.params.speed;

    out.set(
      Math.cos(dirRad) * baseSpeed,
      0,
      -Math.sin(dirRad) * baseSpeed
    );

    if (position.y < 0) {
      out.multiplyScalar(0.1);
      return;
    }

    for (const building of this.buildings) {
      const influence = this.calculateBuildingInfluence(position, building);
      if (influence.strength > 0) {
        if (influence.type === 'wake') {
          out.multiplyScalar(0.4 + 0.2 * (1 - influence.strength));
          const tangent = new THREE.Vector3(-out.z, 0, out.x).normalize();
          const swirlDir = Math.sin(position.y * 0.5 + position.x * 0.3) > 0 ? 1 : -1;
          out.addScaledVector(tangent, baseSpeed * 0.3 * influence.strength * swirlDir);
        } else if (influence.type === 'channel') {
          out.multiplyScalar(1.2 + 0.3 * influence.strength);
        } else if (influence.type === 'deflect') {
          const deflectDir = influence.direction.clone();
          out.lerp(deflectDir.multiplyScalar(baseSpeed), influence.strength * 0.7);
        }
      }
    }
  }

  private calculateBuildingInfluence(
    pos: THREE.Vector3,
    building: Building
  ): { strength: number; type: 'wake' | 'channel' | 'deflect'; direction: THREE.Vector3 } {
    const b = building;
    const dx = pos.x - b.position.x;
    const dz = pos.z - b.position.z;
    const halfW = b.width / 2;
    const halfD = b.depth / 2;
    const margin = 8;

    const withinX = dx > -halfW - margin && dx < halfW + margin;
    const withinZ = dz > -halfD - margin && dz < halfD + margin;
    const belowTop = pos.y < b.height + 5;

    if (!withinX || !withinZ || !belowTop) {
      return { strength: 0, type: 'deflect', direction: new THREE.Vector3() };
    }

    const insideBuilding =
      dx > -halfW && dx < halfW && dz > -halfD && dz < halfD && pos.y < b.height;

    if (insideBuilding) {
      const pushX = Math.abs(dx - halfW) < Math.abs(dx + halfW) ? 1 : -1;
      const pushZ = Math.abs(dz - halfD) < Math.abs(dz + halfD) ? 1 : -1;
      return {
        strength: 1,
        type: 'deflect',
        direction: new THREE.Vector3(pushX, 0, pushZ).normalize()
      };
    }

    const distX = dx > 0 ? dx - halfW : dx + halfW;
    const distZ = dz > 0 ? dz - halfD : dz + halfD;
    const minDist = Math.min(Math.abs(distX), Math.abs(distZ));
    const distFactor = 1 - Math.min(minDist / margin, 1);

    const dirRad = THREE.MathUtils.degToRad(this.params.direction);
    const windVec = new THREE.Vector3(Math.cos(dirRad), 0, -Math.sin(dirRad));

    const toBuilding = new THREE.Vector3(b.position.x - pos.x, 0, b.position.z - pos.z);
    const dot = windVec.dot(toBuilding);

    if (dot < -2) {
      const wakeStrength = distFactor * Math.max(0, -dot / 20);
      return { strength: Math.min(wakeStrength, 1), type: 'wake', direction: windVec };
    }

    let channelStrength = 0;
    for (const other of this.buildings) {
      if (other === building) continue;
      const gapVec = new THREE.Vector3(
        other.position.x - b.position.x,
        0,
        other.position.z - b.position.z
      );
      const gapDist = gapVec.length();
      if (gapDist < 40 && gapDist > 10) {
        const midPoint = new THREE.Vector3(
          (b.position.x + other.position.x) / 2,
          0,
          (b.position.z + other.position.z) / 2
        );
        const distToMid = pos.distanceTo(midPoint);
        if (distToMid < gapDist / 2 + 5) {
          const tangent = new THREE.Vector3(-gapVec.z, 0, gapVec.x).normalize();
          const parallel = Math.abs(windVec.dot(tangent));
          if (parallel > 0.3) {
            channelStrength = Math.max(channelStrength, (1 - distToMid / (gapDist / 2 + 5)) * parallel);
          }
        }
      }
    }

    if (channelStrength > 0.1) {
      return { strength: Math.min(channelStrength, 1), type: 'channel', direction: windVec };
    }

    return { strength: distFactor * 0.3, type: 'deflect', direction: new THREE.Vector3() };
  }

  getAverageSpeed(): number {
    return this.params.speed;
  }

  getMaxSpeed(): number {
    let maxSpeed = this.params.speed * 1.5;
    return maxSpeed;
  }

  private lerp(a: number, b: number, t: number): number {
    return a + (b - a) * t;
  }
}
