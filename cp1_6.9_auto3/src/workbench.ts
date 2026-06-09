import * as THREE from 'three';
import { Gear, GearConfig } from './gear';

interface SparkParticle {
  mesh: THREE.Mesh;
  life: number;
  maxLife: number;
  velocity: THREE.Vector2;
}

export class Workbench {
  public scene: THREE.Scene;
  public gears: Gear[] = [];
  public gridGroup: THREE.Group;
  public snapTolerance: number = 30;
  public gridSpacing: number = 40;

  private sparks: SparkParticle[] = [];
  private sparkTimer: number = 0;
  private sparkInterval: number = 5;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.gridGroup = new THREE.Group();
    this.scene.add(this.gridGroup);
    this.createGrid();
  }

  private createGrid(): void {
    const gridMaterial = new THREE.LineBasicMaterial({
      color: 0x404040,
      transparent: true,
      opacity: 0.35
    });
    const centerMaterial = new THREE.LineBasicMaterial({
      color: 0x605030,
      transparent: true,
      opacity: 0.6
    });

    for (let r = this.gridSpacing; r <= 1200; r += this.gridSpacing) {
      const segments = 128;
      const points: THREE.Vector3[] = [];
      for (let i = 0; i <= segments; i++) {
        const angle = (i / segments) * Math.PI * 2;
        points.push(new THREE.Vector3(
          Math.cos(angle) * r,
          Math.sin(angle) * r,
          -0.5
        ));
      }
      const geo = new THREE.BufferGeometry().setFromPoints(points);
      const mat = r % (this.gridSpacing * 4) === 0 ? centerMaterial : gridMaterial;
      const line = new THREE.Line(geo, mat);
      this.gridGroup.add(line);
    }

    const crossPoints1: THREE.Vector3[] = [
      new THREE.Vector3(-1200, 0, -0.5),
      new THREE.Vector3(1200, 0, -0.5)
    ];
    const crossPoints2: THREE.Vector3[] = [
      new THREE.Vector3(0, -1200, -0.5),
      new THREE.Vector3(0, 1200, -0.5)
    ];
    const crossGeo1 = new THREE.BufferGeometry().setFromPoints(crossPoints1);
    const crossGeo2 = new THREE.BufferGeometry().setFromPoints(crossPoints2);
    this.gridGroup.add(new THREE.Line(crossGeo1, centerMaterial));
    this.gridGroup.add(new THREE.Line(crossGeo2, centerMaterial));

    const dotGeo = new THREE.CircleGeometry(3, 16);
    const dotMat = new THREE.MeshBasicMaterial({
      color: 0x605030,
      transparent: true,
      opacity: 0.5
    });
    for (let x = -1200; x <= 1200; x += this.gridSpacing) {
      for (let y = -1200; y <= 1200; y += this.gridSpacing) {
        const dot = new THREE.Mesh(dotGeo, dotMat);
        dot.position.set(x, y, -0.4);
        this.gridGroup.add(dot);
      }
    }
  }

  public snapToGrid(x: number, y: number): { x: number; y: number } {
    const dist = Math.sqrt(x * x + y * y);
    if (dist < this.snapTolerance) {
      return { x: 0, y: 0 };
    }
    const angle = Math.atan2(y, x);
    const snappedR = Math.round(dist / this.gridSpacing) * this.gridSpacing;
    const gx = Math.cos(angle) * snappedR;
    const gy = Math.sin(angle) * snappedR;
    const gridX = Math.round(x / this.gridSpacing) * this.gridSpacing;
    const gridY = Math.round(y / this.gridSpacing) * this.gridSpacing;
    const d1 = Math.hypot(x - gx, y - gy);
    const d2 = Math.hypot(x - gridX, y - gridY);
    if (d1 < d2) {
      return { x: gx, y: gy };
    }
    return { x: gridX, y: gridY };
  }

  public addGear(config: GearConfig, x: number, y: number): Gear {
    const snapped = this.snapToGrid(x, y);
    const gear = new Gear(config);
    gear.setPosition(snapped.x, snapped.y);
    this.gears.push(gear);
    this.scene.add(gear.mesh);
    this.updateMeshing();
    this.updateDriveChain();
    return gear;
  }

  public removeGear(gear: Gear): void {
    const idx = this.gears.indexOf(gear);
    if (idx !== -1) {
      this.gears.splice(idx, 1);
      this.scene.remove(gear.mesh);
      for (const g of this.gears) {
        g.removeMesh(gear);
      }
      gear.clearMeshes();
      this.updateMeshing();
      this.updateDriveChain();
    }
  }

  public updateGearPosition(gear: Gear, x: number, y: number): void {
    const snapped = this.snapToGrid(x, y);
    gear.setPosition(snapped.x, snapped.y);
    this.updateMeshing();
    this.updateDriveChain();
  }

  public checkMeshing(g1: Gear, g2: Gear): boolean {
    const p1 = g1.getPosition();
    const p2 = g2.getPosition();
    const dist = p1.distanceTo(p2);
    const idealDist = g1.radius + g2.radius;
    const tolerance = Math.min(g1.radius, g2.radius) * 0.15;
    return Math.abs(dist - idealDist) < tolerance;
  }

  public updateMeshing(): void {
    for (const g of this.gears) {
      g.clearMeshes();
    }
    for (let i = 0; i < this.gears.length; i++) {
      for (let j = i + 1; j < this.gears.length; j++) {
        const g1 = this.gears[i];
        const g2 = this.gears[j];
        if (this.checkMeshing(g1, g2)) {
          g1.addMesh(g2);
          g2.addMesh(g1);
        }
      }
    }
  }

  public updateDriveChain(): void {
    for (const g of this.gears) {
      if (!g.isDriving) {
        g.rpm = 0;
      }
    }
    const drivingGears = this.gears.filter(g => g.isDriving);
    const visited = new Set<Gear>();
    const queue: Gear[] = [...drivingGears];
    for (const dg of drivingGears) {
      visited.add(dg);
    }
    while (queue.length > 0) {
      const current = queue.shift()!;
      for (const neighbor of current.meshedWith) {
        if (!visited.has(neighbor)) {
          visited.add(neighbor);
          const ratio = current.teeth / neighbor.teeth;
          neighbor.rpm = current.rpm * ratio;
          neighbor.direction = (current.direction * -1) as 1 | -1;
          queue.push(neighbor);
        }
      }
    }
  }

  private spawnSpark(x: number, y: number): void {
    const count = 3 + Math.floor(Math.random() * 4);
    for (let i = 0; i < count; i++) {
      const size = 1.5 + Math.random() * 2.5;
      const geo = new THREE.SphereGeometry(size, 6, 6);
      const hue = 40 + Math.random() * 20;
      const color = new THREE.Color().setHSL(hue / 360, 1, 0.5 + Math.random() * 0.3);
      const mat = new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 1
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(x, y, 2);
      const angle = Math.random() * Math.PI * 2;
      const speed = 20 + Math.random() * 40;
      this.scene.add(mesh);
      this.sparks.push({
        mesh,
        life: 0.3,
        maxLife: 0.3,
        velocity: new THREE.Vector2(
          Math.cos(angle) * speed,
          Math.sin(angle) * speed
        )
      });
    }
  }

  private getMeshPoint(g1: Gear, g2: Gear): THREE.Vector3 {
    const p1 = g1.getPosition();
    const p2 = g2.getPosition();
    const dir = new THREE.Vector3().subVectors(p2, p1).normalize();
    return p1.clone().add(dir.multiplyScalar(g1.radius));
  }

  public update(deltaTime: number, frameCount: number): void {
    for (const gear of this.gears) {
      gear.update(deltaTime, frameCount);
    }
    this.sparkTimer++;
    if (this.sparkTimer >= this.sparkInterval) {
      this.sparkTimer = 0;
      const processed = new Set<string>();
      for (const g1 of this.gears) {
        for (const g2 of g1.meshedWith) {
          const key = g1.id < g2.id ? `${g1.id}-${g2.id}` : `${g2.id}-${g1.id}`;
          if (!processed.has(key) && (g1.rpm > 0 || g2.rpm > 0)) {
            processed.add(key);
            const point = this.getMeshPoint(g1, g2);
            this.spawnSpark(point.x, point.y);
          }
        }
      }
    }
    for (let i = this.sparks.length - 1; i >= 0; i--) {
      const spark = this.sparks[i];
      spark.life -= deltaTime;
      if (spark.life <= 0) {
        this.scene.remove(spark.mesh);
        spark.mesh.geometry.dispose();
        (spark.mesh.material as THREE.Material).dispose();
        this.sparks.splice(i, 1);
        continue;
      }
      spark.mesh.position.x += spark.velocity.x * deltaTime;
      spark.mesh.position.y += spark.velocity.y * deltaTime;
      spark.velocity.x *= 0.95;
      spark.velocity.y *= 0.95;
      (spark.mesh.material as THREE.MeshBasicMaterial).opacity = spark.life / spark.maxLife;
      const scale = spark.life / spark.maxLife;
      spark.mesh.scale.setScalar(scale);
    }
  }

  public getGearAtPosition(x: number, y: number): Gear | null {
    for (let i = this.gears.length - 1; i >= 0; i--) {
      const g = this.gears[i];
      const p = g.getPosition();
      const dist = Math.hypot(x - p.x, y - p.y);
      if (dist <= g.radius * 1.05) {
        return g;
      }
    }
    return null;
  }

  public clear(): void {
    for (const g of [...this.gears]) {
      this.removeGear(g);
    }
  }
}
