import * as THREE from 'three';

export interface BuildingData {
  id: number;
  position: THREE.Vector3;
  height: number;
  width: number;
  depth: number;
  color: number;
  materialType: 'wood' | 'concrete';
  damage: number;
  mesh: THREE.Mesh | null;
  initialY: number;
  shakeOffset: number;
  shakeTime: number;
}

export interface Debris {
  mesh: THREE.Mesh;
  velocity: THREE.Vector3;
  angularVelocity: THREE.Vector3;
  drag: number;
  life: number;
  maxLife: number;
  active: boolean;
}

const BUILDING_COLORS = [0xc0c0c0, 0xf5f5dc, 0xb22222, 0x87ceeb];
const GRID_SIZE = 20;
const HASH_CELL = 40;

export class BuildingManager {
  private scene: THREE.Scene;
  private buildings: BuildingData[] = [];
  private debris: Debris[] = [];
  private buildingGroup: THREE.Group;
  private debrisGroup: THREE.Group;
  private spaceHash: Map<string, BuildingData[]> = new Map();
  private totalDebrisCount = 0;
  private maxDebris = 800;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.buildingGroup = new THREE.Group();
    this.debrisGroup = new THREE.Group();
    this.scene.add(this.buildingGroup);
    this.scene.add(this.debrisGroup);
    this.generateBuildings();
  }

  private generateBuildings(): void {
    const cols = 4;
    const rows = 4;
    const spacing = 45;
    let id = 0;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (id >= 16) break;
        const height = 20 + Math.random() * 60;
        const width = 14 + Math.random() * 6;
        const depth = 14 + Math.random() * 6;
        const color = BUILDING_COLORS[Math.floor(Math.random() * BUILDING_COLORS.length)];
        const materialType: 'wood' | 'concrete' = Math.random() > 0.6 ? 'wood' : 'concrete';
        const offsetX = (Math.random() - 0.5) * 8;
        const offsetZ = (Math.random() - 0.5) * 8;

        const posX = (c - cols / 2 + 0.5) * spacing + offsetX;
        const posZ = (r - rows / 2 + 0.5) * spacing + offsetZ;

        const buildingData: BuildingData = {
          id: id++,
          position: new THREE.Vector3(posX, 0, posZ),
          height,
          width,
          depth,
          color,
          materialType,
          damage: 0,
          mesh: null,
          initialY: height / 2,
          shakeOffset: 0,
          shakeTime: 0
        };

        this.createBuildingMesh(buildingData);
        this.buildings.push(buildingData);
        this.insertHash(buildingData);
      }
    }
  }

  private createBuildingMesh(data: BuildingData): void {
    const geometry = new THREE.BoxGeometry(data.width, data.height, data.depth);
    const material = new THREE.MeshStandardMaterial({
      color: data.color,
      roughness: 0.8,
      metalness: data.color === 0x87ceeb ? 0.3 : 0.1
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.copy(data.position);
    mesh.position.y = data.initialY;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    data.mesh = mesh;
    this.buildingGroup.add(mesh);
  }

  private hashKey(x: number, z: number): string {
    const gx = Math.floor(x / HASH_CELL);
    const gz = Math.floor(z / HASH_CELL);
    return `${gx},${gz}`;
  }

  private insertHash(building: BuildingData): void {
    const key = this.hashKey(building.position.x, building.position.z);
    if (!this.spaceHash.has(key)) {
      this.spaceHash.set(key, []);
    }
    this.spaceHash.get(key)!.push(building);
  }

  getBuildingsInRadius(point: THREE.Vector3, radius: number): BuildingData[] {
    const result: BuildingData[] = [];
    const minX = Math.floor((point.x - radius) / HASH_CELL);
    const maxX = Math.floor((point.x + radius) / HASH_CELL);
    const minZ = Math.floor((point.z - radius) / HASH_CELL);
    const maxZ = Math.floor((point.z + radius) / HASH_CELL);

    for (let gx = minX; gx <= maxX; gx++) {
      for (let gz = minZ; gz <= maxZ; gz++) {
        const key = `${gx},${gz}`;
        const bucket = this.spaceHash.get(key);
        if (bucket) {
          for (const b of bucket) {
            const dx = b.position.x - point.x;
            const dz = b.position.z - point.z;
            if (dx * dx + dz * dz <= radius * radius) {
              result.push(b);
            }
          }
        }
      }
    }
    return result;
  }

  checkCollision(point: THREE.Vector3, radius: number): BuildingData | null {
    const candidates = this.getBuildingsInRadius(point, radius + 20);
    for (const b of candidates) {
      if (!b.mesh || b.damage >= 100) continue;
      const halfW = b.width / 2;
      const halfD = b.depth / 2;
      const dx = Math.abs(point.x - b.position.x);
      const dz = Math.abs(point.z - b.position.z);
      if (dx < halfW + radius && dz < halfD + radius && point.y < b.height && point.y > 0) {
        return b;
      }
    }
    return null;
  }

  damageBuilding(building: BuildingData, hitPoint: THREE.Vector3, energy: number, impactDir: THREE.Vector3): Debris[] {
    const newDebris: Debris[] = [];
    const damageAmount = Math.min(100, energy * 0.005 + 40);
    building.damage = Math.min(100, building.damage + damageAmount);

    const debrisCount = Math.min(30, Math.floor(15 + energy * 0.01));

    for (let i = 0; i < debrisCount; i++) {
      if (this.totalDebrisCount >= this.maxDebris) break;

      const size = 1 + Math.random() * 4;
      const geo = new THREE.BoxGeometry(size, size, size);
      const mat = new THREE.MeshStandardMaterial({
        color: building.color,
        roughness: 0.9,
        transparent: true,
        opacity: 1
      });
      const mesh = new THREE.Mesh(geo, mat);

      const offsetX = (Math.random() - 0.5) * building.width * 0.8;
      const offsetY = hitPoint.y + (Math.random() - 0.5) * building.height * 0.5;
      const offsetZ = (Math.random() - 0.5) * building.depth * 0.8;
      mesh.position.set(
        building.position.x + offsetX,
        Math.max(1, offsetY),
        building.position.z + offsetZ
      );
      mesh.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
      mesh.castShadow = true;

      const speed = 3 + Math.random() * (energy * 0.02 + 5);
      const spread = new THREE.Vector3(
        (Math.random() - 0.5) * 2,
        Math.random() * 0.8 + 0.3,
        (Math.random() - 0.5) * 2
      ).normalize();
      const velocity = new THREE.Vector3()
        .copy(impactDir)
        .normalize()
        .multiplyScalar(speed * 0.6)
        .add(spread.multiplyScalar(speed * 0.4));

      const debris: Debris = {
        mesh,
        velocity,
        angularVelocity: new THREE.Vector3(
          (Math.random() - 0.5) * 4,
          (Math.random() - 0.5) * 4,
          (Math.random() - 0.5) * 4
        ),
        drag: 0.98,
        life: 0,
        maxLife: 6 + Math.random() * 4,
        active: true
      };

      this.debris.push(debris);
      this.debrisGroup.add(mesh);
      newDebris.push(debris);
      this.totalDebrisCount++;
    }

    if (building.damage >= 70 && building.mesh) {
      this.buildingGroup.remove(building.mesh);
      building.mesh.geometry.dispose();
      (building.mesh.material as THREE.Material).dispose();
      building.mesh = null;
    }

    return newDebris;
  }

  applyShockwave(center: THREE.Vector3, energy: number): void {
    const radius = 60 + energy * 0.05;
    const nearby = this.getBuildingsInRadius(center, radius);
    for (const b of nearby) {
      const dist = b.position.distanceTo(center);
      if (dist < 5) continue;
      const intensity = Math.max(0, 1 - dist / radius);
      b.shakeTime = intensity * 2;
      b.shakeOffset = intensity * 3;
      b.damage = Math.min(100, b.damage + intensity * energy * 0.002);
    }
  }

  update(dt: number): void {
    const gravity = -25;

    for (let i = this.debris.length - 1; i >= 0; i--) {
      const d = this.debris[i];
      if (!d.active) continue;

      d.life += dt;
      if (d.life >= d.maxLife) {
        d.active = false;
        this.debrisGroup.remove(d.mesh);
        d.mesh.geometry.dispose();
        (d.mesh.material as THREE.Material).dispose();
        this.debris.splice(i, 1);
        this.totalDebrisCount--;
        continue;
      }

      d.velocity.y += gravity * dt;
      d.velocity.multiplyScalar(Math.pow(d.drag, dt * 60));

      d.mesh.position.addScaledVector(d.velocity, dt);
      d.mesh.rotation.x += d.angularVelocity.x * dt;
      d.mesh.rotation.y += d.angularVelocity.y * dt;
      d.mesh.rotation.z += d.angularVelocity.z * dt;

      if (d.mesh.position.y <= 0.5) {
        d.mesh.position.y = 0.5;
        d.velocity.y *= -0.3;
        d.velocity.x *= 0.6;
        d.velocity.z *= 0.6;
      }

      const fadeStart = d.maxLife * 0.7;
      if (d.life > fadeStart) {
        const mat = d.mesh.material as THREE.MeshStandardMaterial;
        mat.opacity = 1 - (d.life - fadeStart) / (d.maxLife - fadeStart);
        mat.transparent = true;
      }
    }

    for (const b of this.buildings) {
      if (b.shakeTime > 0 && b.mesh) {
        b.shakeTime -= dt;
        const t = b.shakeTime;
        const shake = Math.sin(t * 30) * b.shakeOffset * t;
        b.mesh.position.x = b.position.x + shake * 0.3;
        b.mesh.position.z = b.position.z + shake * 0.2;
      } else if (b.mesh) {
        b.mesh.position.x = b.position.x;
        b.mesh.position.z = b.position.z;
      }
    }
  }

  getDebrisCount(): number {
    return this.totalDebrisCount;
  }

  getBuildingDamagePercentages(): { id: number; name: string; damage: number }[] {
    return this.buildings.map(b => ({
      id: b.id,
      name: `建筑 #${b.id + 1}`,
      damage: Math.round(b.damage)
    }));
  }

  getIntactPercentage(): number {
    if (this.buildings.length === 0) return 100;
    const intact = this.buildings.filter(b => b.damage < 10).length;
    return Math.round((intact / this.buildings.length) * 100);
  }

  getBuildings(): BuildingData[] {
    return this.buildings;
  }

  reset(): void {
    for (let i = this.debris.length - 1; i >= 0; i--) {
      const d = this.debris[i];
      this.debrisGroup.remove(d.mesh);
      d.mesh.geometry.dispose();
      (d.mesh.material as THREE.Material).dispose();
    }
    this.debris = [];
    this.totalDebrisCount = 0;

    for (const b of this.buildings) {
      if (b.mesh) {
        this.buildingGroup.remove(b.mesh);
        b.mesh.geometry.dispose();
        (b.mesh.material as THREE.Material).dispose();
      }
      b.damage = 0;
      b.shakeTime = 0;
      b.shakeOffset = 0;
      this.createBuildingMesh(b);
    }
  }

  getTotalDynamicObjects(): number {
    return this.totalDebrisCount;
  }
}
