import * as THREE from 'three';

export class Gear {
  public mesh: THREE.Group;
  public teeth: number;
  public radius: number;
  public speed: number = 0;
  public isInternal: boolean;
  public connectedGears: Gear[] = [];
  public rotationDirection: number = 1;
  public toothDepth: number = 0.03;
  public brassMaterial: THREE.MeshStandardMaterial;
  private _angle: number = 0;

  constructor(
    teeth: number,
    radius: number,
    isInternal: boolean = false,
    position: THREE.Vector3 = new THREE.Vector3()
  ) {
    this.teeth = teeth;
    this.radius = radius;
    this.isInternal = isInternal;

    this.brassMaterial = new THREE.MeshStandardMaterial({
      color: 0xcfa144,
      metalness: 0.85,
      roughness: 0.25,
    });

    this.mesh = new THREE.Group();
    this.mesh.position.copy(position);
    this.createGearMesh();
  }

  private createGearMesh(): void {
    const thickness = this.isInternal ? 0.15 : 0.12;
    const toothHeight = this.toothDepth;
    const segments = Math.max(this.teeth * 4, 48);

    const shape = new THREE.Shape();
    const toothAngle = (Math.PI * 2) / this.teeth;
    const innerR = this.isInternal ? this.radius - toothHeight : this.radius;
    const outerR = this.isInternal ? this.radius : this.radius + toothHeight;

    for (let i = 0; i < this.teeth; i++) {
      const baseAngle = i * toothAngle;
      const toothWidth = toothAngle * 0.45;
      const gapWidth = toothAngle * 0.1;

      if (!this.isInternal) {
        const a1 = baseAngle + gapWidth;
        const a2 = baseAngle + toothWidth / 2;
        const a3 = baseAngle + toothWidth - gapWidth;
        const a4 = baseAngle + toothAngle - gapWidth;

        if (i === 0) {
          shape.moveTo(Math.cos(a1) * innerR, Math.sin(a1) * innerR);
        } else {
          shape.lineTo(Math.cos(a1) * innerR, Math.sin(a1) * innerR);
        }
        shape.lineTo(Math.cos(a2) * outerR, Math.sin(a2) * outerR);
        shape.lineTo(Math.cos(a3) * outerR, Math.sin(a3) * outerR);
        shape.lineTo(Math.cos(a4) * innerR, Math.sin(a4) * innerR);
      } else {
        const a1 = baseAngle + gapWidth;
        const a2 = baseAngle + toothWidth / 2;
        const a3 = baseAngle + toothWidth - gapWidth;
        const a4 = baseAngle + toothAngle - gapWidth;

        if (i === 0) {
          shape.moveTo(Math.cos(a1) * outerR, Math.sin(a1) * outerR);
        } else {
          shape.lineTo(Math.cos(a1) * outerR, Math.sin(a1) * outerR);
        }
        shape.lineTo(Math.cos(a2) * innerR, Math.sin(a2) * innerR);
        shape.lineTo(Math.cos(a3) * innerR, Math.sin(a3) * innerR);
        shape.lineTo(Math.cos(a4) * outerR, Math.sin(a4) * outerR);
      }
    }
    shape.closePath();

    if (this.isInternal) {
      const holePath = new THREE.Path();
      holePath.absarc(0, 0, this.radius - toothHeight - 0.15, 0, Math.PI * 2, false);
      shape.holes.push(holePath);
    } else {
      const holePath = new THREE.Path();
      holePath.absarc(0, 0, this.radius * 0.3, 0, Math.PI * 2, false);
      shape.holes.push(holePath);
    }

    const extrudeSettings = {
      depth: thickness,
      bevelEnabled: true,
      bevelThickness: 0.01,
      bevelSize: 0.01,
      bevelSegments: 2,
      curveSegments: 2,
      steps: 1,
    };

    const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
    geometry.center();
    geometry.rotateX(Math.PI / 2);

    const gearMesh = new THREE.Mesh(geometry, this.brassMaterial);
    gearMesh.castShadow = true;
    gearMesh.receiveShadow = true;
    this.mesh.add(gearMesh);

    if (!this.isInternal) {
      const hubGeom = new THREE.CylinderGeometry(
        this.radius * 0.25,
        this.radius * 0.25,
        thickness * 1.5,
        24
      );
      const hubMat = new THREE.MeshStandardMaterial({
        color: 0x8a6a24,
        metalness: 0.9,
        roughness: 0.2,
      });
      const hub = new THREE.Mesh(hubGeom, hubMat);
      this.mesh.add(hub);

      const spokeCount = Math.min(6, Math.floor(this.teeth / 6));
      for (let i = 0; i < spokeCount; i++) {
        const angle = (i / spokeCount) * Math.PI * 2;
        const spokeGeom = new THREE.BoxGeometry(
          this.radius * 0.55,
          thickness * 0.6,
          0.04
        );
        const spoke = new THREE.Mesh(spokeGeom, this.brassMaterial);
        spoke.position.set(
          Math.cos(angle) * this.radius * 0.4,
          0,
          Math.sin(angle) * this.radius * 0.4
        );
        spoke.rotation.y = -angle;
        this.mesh.add(spoke);
      }
    } else {
      const outerRingGeom = new THREE.TorusGeometry(
        this.radius + 0.08,
        0.05,
        12,
        64
      );
      const outerRing = new THREE.Mesh(outerRingGeom, this.brassMaterial);
      outerRing.rotation.x = Math.PI / 2;
      this.mesh.add(outerRing);
    }
  }

  public updateRotation(deltaTime: number): void {
    this._angle += this.speed * this.rotationDirection * deltaTime;
    this.mesh.rotation.y = this._angle;
  }

  public getAngle(): number {
    return this._angle;
  }

  public getWorldPosition(): THREE.Vector3 {
    return this.mesh.getWorldPosition(new THREE.Vector3());
  }
}

export class GearSystem {
  public group: THREE.Group;
  public gears: Gear[] = [];
  public driveGear: Gear | null = null;
  public contactPoints: { gearA: Gear; gearB: Gear; point: THREE.Vector3 }[] = [];

  constructor() {
    this.group = new THREE.Group();
    this.createSystem();
  }

  private createSystem(): void {
    const externalPositions = [
      new THREE.Vector3(2.8, 0.8, 0),
      new THREE.Vector3(-2.8, 0.6, 0.5),
      new THREE.Vector3(0, 1.0, 2.8),
      new THREE.Vector3(2.0, -0.5, -2.5),
      new THREE.Vector3(-2.2, -0.3, -2.0),
      new THREE.Vector3(0.5, -1.0, 2.5),
    ];

    const internalPositions = [
      new THREE.Vector3(0, 1.8, 0),
      new THREE.Vector3(-2.5, 1.2, -2.0),
      new THREE.Vector3(2.5, 1.0, -1.8),
    ];

    for (let i = 0; i < 6; i++) {
      const teeth = 12 + Math.floor(Math.random() * 25);
      const radius = 0.2 + (teeth / 36) * 0.4;
      const gear = new Gear(teeth, radius, false, externalPositions[i]);
      this.gears.push(gear);
      this.group.add(gear.mesh);
    }

    for (let i = 0; i < 3; i++) {
      const gear = new Gear(48, 1.2, true, internalPositions[i]);
      this.gears.push(gear);
      this.group.add(gear.mesh);
    }

    this.driveGear = this.gears[0];

    this.setupMeshing();
  }

  private setupMeshing(): void {
    const meshPairs: [number, number][] = [
      [0, 1],
      [0, 6],
      [1, 4],
      [2, 5],
      [2, 7],
      [3, 8],
      [3, 5],
      [4, 8],
      [0, 3],
      [1, 7],
    ];

    for (const [aIdx, bIdx] of meshPairs) {
      if (aIdx >= this.gears.length || bIdx >= this.gears.length) continue;
      const gearA = this.gears[aIdx];
      const gearB = this.gears[bIdx];

      const posA = gearA.getWorldPosition();
      const posB = gearB.getWorldPosition();
      const dist = posA.distanceTo(posB);
      const expectedDist =
        gearA.radius + gearB.radius + (gearA.isInternal || gearB.isInternal ? -0.03 : 0);

      if (Math.abs(dist - expectedDist) < 0.8) {
        gearA.connectedGears.push(gearB);
        gearB.connectedGears.push(gearA);

        const contactPoint = new THREE.Vector3()
          .addVectors(posA, posB)
          .multiplyScalar(0.5);
        this.contactPoints.push({ gearA, gearB, point: contactPoint });
      }
    }
  }

  public update(driveSpeedMultiplier: number, deltaTime: number): void {
    if (!this.driveGear) return;

    const baseDriveSpeed = driveSpeedMultiplier * Math.PI * 2;
    this.driveGear.speed = baseDriveSpeed;

    this.computeSpeedsBFS();

    for (const gear of this.gears) {
      gear.updateRotation(deltaTime);
    }
  }

  private computeSpeedsBFS(): void {
    if (!this.driveGear) return;

    const visited = new Set<Gear>();
    const queue: Gear[] = [this.driveGear];
    visited.add(this.driveGear);

    while (queue.length > 0) {
      const current = queue.shift()!;

      for (const neighbor of current.connectedGears) {
        if (visited.has(neighbor)) continue;
        visited.add(neighbor);

        let ratio: number;
        if (current.isInternal !== neighbor.isInternal) {
          ratio = current.teeth / neighbor.teeth;
          neighbor.rotationDirection = current.rotationDirection;
        } else if (current.isInternal && neighbor.isInternal) {
          ratio = current.teeth / neighbor.teeth;
          neighbor.rotationDirection = -current.rotationDirection;
        } else {
          ratio = current.teeth / neighbor.teeth;
          neighbor.rotationDirection = -current.rotationDirection;
        }

        neighbor.speed = current.speed * ratio;
        queue.push(neighbor);
      }
    }
  }

  public getContactPoints(): THREE.Vector3[] {
    const points: THREE.Vector3[] = [];
    for (const cp of this.contactPoints) {
      const posA = cp.gearA.getWorldPosition();
      const posB = cp.gearB.getWorldPosition();
      const mid = new THREE.Vector3().addVectors(posA, posB).multiplyScalar(0.5);
      points.push(mid);
    }
    return points;
  }

  public getGearCount(): number {
    return this.gears.length;
  }
}
