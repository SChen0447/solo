import * as THREE from 'three';

export interface SeedData {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  rotation: THREE.Euler;
  angularVelocity: THREE.Vector3;
  alive: boolean;
  landed: boolean;
  parachuteTriangles: number;
}

export class Dandelion {
  public group: THREE.Group;
  public stems: THREE.Mesh[] = [];
  public filaments: THREE.Line[] = [];
  public puffballGroup: THREE.Group;
  public seeds: SeedData[] = [];
  public seedsMesh: THREE.InstancedMesh | null = null;
  public parachuteMesh: THREE.InstancedMesh | null = null;

  private maxSeeds: number;
  private dandelionHeight: number = 1.8;
  private puffballRadius: number = 0.75;
  private centerPos: THREE.Vector3 = new THREE.Vector3(0, 0, 0);
  private filamentCount: number = 200;

  constructor(maxSeeds: number = 200) {
    this.maxSeeds = maxSeeds;
    this.group = new THREE.Group();
    this.puffballGroup = new THREE.Group();
    this.build();
  }

  private build(): void {
    this.createStems();
    this.createPuffball();
    this.createSeedGeometry();
    this.group.add(this.puffballGroup);
  }

  private createStems(): void {
    const stemMaterial = new THREE.MeshLambertMaterial({
      color: 0x4CAF50,
      side: THREE.DoubleSide
    });

    for (let i = 0; i < 10; i++) {
      const angle = (i / 10) * Math.PI * 2;
      const radius = 0.03;
      const height = this.dandelionHeight + (Math.random() - 0.5) * 0.1;

      const geometry = new THREE.CylinderGeometry(radius, radius * 1.5, height, 6);
      geometry.translate(0, height / 2, 0);
      geometry.rotateZ(Math.sin(angle) * 0.05);
      geometry.rotateX(Math.cos(angle) * 0.05);

      const stem = new THREE.Mesh(geometry, stemMaterial);
      stem.position.x = Math.sin(angle) * 0.05;
      stem.position.z = Math.cos(angle) * 0.05;
      this.stems.push(stem);
      this.group.add(stem);
    }
  }

  private createPuffball(): void {
    const filamentMaterial = new THREE.LineBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.85
    });

    for (let i = 0; i < this.filamentCount; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = this.puffballRadius;

      const endX = r * Math.sin(phi) * Math.cos(theta);
      const endY = r * Math.cos(phi) + this.dandelionHeight;
      const endZ = r * Math.sin(phi) * Math.sin(theta);

      const startX = endX * 0.1;
      const startY = this.dandelionHeight;
      const startZ = endZ * 0.1;

      const points = [
        new THREE.Vector3(startX, startY, startZ),
        new THREE.Vector3(endX, endY, endZ)
      ];

      const geometry = new THREE.BufferGeometry().setFromPoints(points);
      const line = new THREE.Line(geometry, filamentMaterial);
      line.userData = {
        seedIndex: i,
        endPos: new THREE.Vector3(endX, endY, endZ),
        startPos: new THREE.Vector3(startX, startY, startZ)
      };
      this.filaments.push(line);
      this.puffballGroup.add(line);
    }
  }

  private createSeedGeometry(): void {
    const seedGeometry = new THREE.ConeGeometry(0.035, 0.12, 6);
    seedGeometry.translate(0, -0.06, 0);

    const seedMaterial = new THREE.MeshLambertMaterial({
      color: 0xffcc66,
      transparent: true,
      opacity: 1.0
    });

    this.seedsMesh = new THREE.InstancedMesh(seedGeometry, seedMaterial, this.maxSeeds);
    this.seedsMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.seedsMesh.count = 0;
    this.seedsMesh.visible = false;
    this.group.add(this.seedsMesh);

    const parachuteShape = new THREE.Shape();
    parachuteShape.moveTo(0, 0);
    parachuteShape.lineTo(-0.1, 0.18);
    parachuteShape.lineTo(0, 0.26);
    parachuteShape.lineTo(0.1, 0.18);
    parachuteShape.lineTo(0, 0);

    const parachuteGeo = new THREE.ShapeGeometry(parachuteShape);
    parachuteGeo.translate(0, 0.08, 0);

    const parachuteMat = new THREE.MeshBasicMaterial({
      color: 0xffffee,
      transparent: true,
      opacity: 0.85,
      side: THREE.DoubleSide,
      depthWrite: false
    });

    this.parachuteMesh = new THREE.InstancedMesh(parachuteGeo, parachuteMat, this.maxSeeds);
    this.parachuteMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.parachuteMesh.count = 0;
    this.parachuteMesh.visible = false;
    this.group.add(this.parachuteMesh);
  }

  public initSeeds(count: number): SeedData[] {
    count = Math.min(count, this.maxSeeds);
    this.seeds = [];

    for (let i = 0; i < count; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const speed = 0.8 + Math.random() * 0.8;

      const dir = new THREE.Vector3(
        Math.sin(phi) * Math.cos(theta),
        Math.abs(Math.cos(phi)) * 0.5 + 0.2,
        Math.sin(phi) * Math.sin(theta)
      ).normalize();

      const seedPos = new THREE.Vector3(
        this.centerPos.x,
        this.centerPos.y + this.dandelionHeight,
        this.centerPos.z
      );

      const r = this.puffballRadius * 0.9;
      seedPos.x += dir.x * r * 0.3;
      seedPos.y += dir.y * r * 0.3;
      seedPos.z += dir.z * r * 0.3;

      this.seeds.push({
        position: seedPos,
        velocity: dir.multiplyScalar(speed),
        rotation: new THREE.Euler(
          Math.random() * Math.PI,
          Math.random() * Math.PI * 2,
          Math.random() * Math.PI
        ),
        angularVelocity: new THREE.Vector3(
          (Math.random() - 0.5) * 0.5,
          1 + Math.random() * 2,
          (Math.random() - 0.5) * 0.5
        ),
        alive: true,
        landed: false,
        parachuteTriangles: 3 + Math.floor(Math.random() * 3)
      });
    }

    if (this.seedsMesh) {
      this.seedsMesh.count = count;
      this.seedsMesh.visible = true;
    }
    if (this.parachuteMesh) {
      this.parachuteMesh.count = count;
      this.parachuteMesh.visible = true;
    }

    this.hidePuffball();
    return this.seeds;
  }

  public hidePuffball(): void {
    this.puffballGroup.visible = false;
  }

  public showPuffball(): void {
    this.puffballGroup.visible = true;
  }

  public reset(): void {
    this.seeds = [];
    if (this.seedsMesh) {
      this.seedsMesh.count = 0;
      this.seedsMesh.visible = false;
    }
    if (this.parachuteMesh) {
      this.parachuteMesh.count = 0;
      this.parachuteMesh.visible = false;
    }
    this.showPuffball();
    this.group.scale.set(0, 0, 0);
  }

  public playGrowthAnimation(duration: number = 0.5): Promise<void> {
    return new Promise((resolve) => {
      const startTime = performance.now();
      const animate = () => {
        const elapsed = (performance.now() - startTime) / 1000;
        const t = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - t, 3);
        this.group.scale.setScalar(eased);
        if (t < 1) {
          requestAnimationFrame(animate);
        } else {
          this.group.scale.setScalar(1);
          resolve();
        }
      };
      animate();
    });
  }

  public getPuffballWorldPosition(): THREE.Vector3 {
    const pos = new THREE.Vector3();
    this.puffballGroup.getWorldPosition(pos);
    pos.y += this.dandelionHeight;
    return pos;
  }

  public isPointOnPuffball(point: THREE.Vector3): boolean {
    const center = this.getPuffballWorldPosition();
    const dist = point.distanceTo(center);
    return dist < this.puffballRadius * 1.2;
  }
}
