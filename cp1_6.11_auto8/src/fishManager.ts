import * as THREE from 'three';

export type FishSpecies = 'clownfish' | 'angelfish' | 'butterflyfish';

export interface FishConfig {
  species: FishSpecies;
  color: number;
  accentColor: number;
  size: number;
  speed: number;
}

const SPECIES_CONFIGS: Record<FishSpecies, FishConfig> = {
  clownfish: {
    species: 'clownfish',
    color: 0xff6b35,
    accentColor: 0xffffff,
    size: 0.5,
    speed: 1.2
  },
  angelfish: {
    species: 'angelfish',
    color: 0x4fc3f7,
    accentColor: 0xffd700,
    size: 0.7,
    speed: 0.9
  },
  butterflyfish: {
    species: 'butterflyfish',
    color: 0xffd700,
    accentColor: 0x1a237e,
    size: 0.45,
    speed: 1.5
  }
};

const SPECIES_LIST: FishSpecies[] = ['clownfish', 'angelfish', 'butterflyfish'];

export interface Fish {
  id: number;
  mesh: THREE.Group;
  config: FishConfig;
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  targetPoint: THREE.Vector3;
  curvePoints: THREE.Vector3[];
  curveProgress: number;
  curveSpeed: number;
  isSelected: boolean;
  originalMaterials: THREE.Material[];
  highlightMesh?: THREE.Mesh;
  dropTarget: THREE.Vector3 | null;
  dropProgress: number;
  flashTime: number;
}

export class FishManager {
  private fishes: Map<number, Fish> = new Map();
  private nextId = 1;
  private scene: THREE.Scene;
  private tankBounds: { minX: number; maxX: number; minY: number; maxY: number; minZ: number; maxZ: number };
  private raycaster: THREE.Raycaster;
  private coralPositions: THREE.Vector3[] = [];

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.tankBounds = { minX: -8, maxX: 8, minY: -3.5, maxY: 3.5, minZ: -5, maxZ: 5 };
    this.raycaster = new THREE.Raycaster();
  }

  public setCoralPositions(positions: THREE.Vector3[]): void {
    this.coralPositions = positions;
  }

  private randomSpecies(): FishSpecies {
    return SPECIES_LIST[Math.floor(Math.random() * SPECIES_LIST.length)];
  }

  private randomSize(): number {
    return 0.7 + Math.random() * 0.6;
  }

  private createFishMesh(config: FishConfig, scale: number): { group: THREE.Group; materials: THREE.Material[] } {
    const group = new THREE.Group();
    const materials: THREE.Material[] = [];
    const s = config.size * scale;

    const bodyGeo = new THREE.SphereGeometry(s, 16, 12);
    bodyGeo.scale(1.8, 1, 1);
    const bodyMat = new THREE.MeshStandardMaterial({
      color: config.color,
      metalness: 0.15,
      roughness: 0.55,
      emissive: config.color,
      emissiveIntensity: 0.08
    });
    materials.push(bodyMat);
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    group.add(body);

    const stripeMat = new THREE.MeshStandardMaterial({
      color: config.accentColor,
      metalness: 0.2,
      roughness: 0.45
    });
    materials.push(stripeMat);

    if (config.species === 'clownfish') {
      for (let i = 0; i < 2; i++) {
        const stripeGeo = new THREE.TorusGeometry(s * 0.7, s * 0.1, 6, 16);
        const stripe = new THREE.Mesh(stripeGeo, stripeMat);
        stripe.rotation.y = Math.PI / 2;
        stripe.position.x = (i === 0 ? -0.25 : 0.25) * s * 1.8;
        group.add(stripe);
      }
    } else if (config.species === 'butterflyfish') {
      const spotGeo = new THREE.CircleGeometry(s * 0.25, 16);
      const spot = new THREE.Mesh(spotGeo, stripeMat);
      spot.position.set(s * 0.6, s * 0.15, s * 0.99);
      group.add(spot);
      const spot2 = spot.clone();
      spot2.position.z = -s * 0.99;
      spot2.rotation.y = Math.PI;
      group.add(spot2);
    }

    const tailGeo = new THREE.ConeGeometry(s * 0.8, s * 1.0, 4);
    const tailMat = new THREE.MeshStandardMaterial({
      color: config.color,
      metalness: 0.15,
      roughness: 0.55,
      transparent: true,
      opacity: 0.9
    });
    materials.push(tailMat);
    const tail = new THREE.Mesh(tailGeo, tailMat);
    tail.rotation.z = Math.PI / 2;
    tail.position.x = -s * 1.4;
    group.add(tail);

    const topFinGeo = new THREE.ConeGeometry(s * 0.4, s * 0.8, 3);
    const topFin = new THREE.Mesh(topFinGeo, tailMat);
    topFin.rotation.z = -Math.PI / 2;
    topFin.position.set(0, s * 0.8, 0);
    topFin.scale.set(1, 1.5, 0.3);
    group.add(topFin);

    const eyeGeo = new THREE.SphereGeometry(s * 0.08, 8, 8);
    const eyeMat = new THREE.MeshStandardMaterial({
      color: 0x000000,
      roughness: 0.2,
      metalness: 0.8
    });
    materials.push(eyeMat);
    const eye1 = new THREE.Mesh(eyeGeo, eyeMat);
    eye1.position.set(s * 1.0, s * 0.15, s * 0.45);
    group.add(eye1);
    const eye2 = eye1.clone();
    eye2.position.z = -s * 0.45;
    group.add(eye2);

    return { group, materials };
  }

  public spawnFish(dropPosition: THREE.Vector3): Fish | null {
    if (this.fishes.size >= 40) return null;

    const species = this.randomSpecies();
    const baseConfig = SPECIES_CONFIGS[species];
    const sizeScale = this.randomSize();
    const config: FishConfig = {
      ...baseConfig,
      size: baseConfig.size * sizeScale,
      speed: baseConfig.speed * (0.8 + Math.random() * 0.4)
    };

    const { group, materials } = this.createFishMesh(config, sizeScale);

    const spawnPos = new THREE.Vector3(
      dropPosition.x + (Math.random() - 0.5) * 0.5,
      this.tankBounds.maxY - 0.3,
      dropPosition.z + (Math.random() - 0.5) * 0.5
    );
    group.position.copy(spawnPos);

    this.scene.add(group);

    const fish: Fish = {
      id: this.nextId++,
      mesh: group,
      config,
      position: spawnPos.clone(),
      velocity: new THREE.Vector3(),
      targetPoint: dropPosition.clone(),
      curvePoints: this.generateCurvePoints(spawnPos),
      curveProgress: 0,
      curveSpeed: 0.3 + Math.random() * 0.3,
      isSelected: false,
      originalMaterials: materials,
      dropTarget: dropPosition.clone(),
      dropProgress: 0,
      flashTime: 0
    };

    this.fishes.set(fish.id, fish);
    return fish;
  }

  private generateCurvePoints(start: THREE.Vector3): THREE.Vector3[] {
    const points: THREE.Vector3[] = [start.clone()];
    for (let i = 0; i < 3; i++) {
      points.push(this.getRandomPoint());
    }
    return points;
  }

  private getRandomPoint(): THREE.Vector3 {
    return new THREE.Vector3(
      this.tankBounds.minX + Math.random() * (this.tankBounds.maxX - this.tankBounds.minX),
      this.tankBounds.minY + Math.random() * (this.tankBounds.maxY - this.tankBounds.minY),
      this.tankBounds.minZ + Math.random() * (this.tankBounds.maxZ - this.tankBounds.minZ)
    );
  }

  public removeFish(id: number): void {
    const fish = this.fishes.get(id);
    if (fish) {
      this.scene.remove(fish.mesh);
      fish.mesh.traverse((child) => {
        if ((child as THREE.Mesh).geometry) (child as THREE.Mesh).geometry.dispose();
        const mat = (child as THREE.Mesh).material;
        if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
        else if (mat) (mat as THREE.Material).dispose();
      });
      this.fishes.delete(id);
    }
  }

  public getFishCount(): number {
    return this.fishes.size;
  }

  public getAllFishes(): Fish[] {
    return Array.from(this.fishes.values());
  }

  public selectFish(id: number): boolean {
    const fish = this.fishes.get(id);
    if (!fish) return false;

    if (fish.isSelected) {
      this.removeFish(id);
      return true;
    }

    fish.isSelected = true;
    this.applyHighlight(fish);
    fish.flashTime = 0.2;
    return false;
  }

  public deselectAll(): void {
    this.fishes.forEach((fish) => {
      if (fish.isSelected) {
        fish.isSelected = false;
        this.removeHighlight(fish);
      }
    });
  }

  private applyHighlight(fish: Fish): void {
    const bbox = new THREE.Box3().setFromObject(fish.mesh);
    const size = new THREE.Vector3();
    bbox.getSize(size);
    const maxDim = Math.max(size.x, size.y, size.z);

    const haloGeo = new THREE.SphereGeometry(maxDim * 0.7, 16, 12);
    const haloMat = new THREE.MeshBasicMaterial({
      color: 0xffd700,
      transparent: true,
      opacity: 0.25,
      side: THREE.BackSide
    });
    const halo = new THREE.Mesh(haloGeo, haloMat);
    fish.mesh.add(halo);
    fish.highlightMesh = halo;
  }

  private removeHighlight(fish: Fish): void {
    if (fish.highlightMesh) {
      fish.mesh.remove(fish.highlightMesh);
      fish.highlightMesh.geometry.dispose();
      (fish.highlightMesh.material as THREE.Material).dispose();
      fish.highlightMesh = undefined;
    }
  }

  public raycastFishes(pointer: THREE.Vector2, camera: THREE.Camera): Fish | null {
    this.raycaster.setFromCamera(pointer, camera);
    const meshes: THREE.Object3D[] = [];
    const meshToFish = new Map<THREE.Object3D, Fish>();

    this.fishes.forEach((fish) => {
      fish.mesh.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          meshes.push(child);
          meshToFish.set(child, fish);
        }
      });
    });

    const intersects = this.raycaster.intersectObjects(meshes, false);
    if (intersects.length > 0) {
      let obj: THREE.Object3D | null = intersects[0].object;
      while (obj && !meshToFish.has(obj)) obj = obj.parent;
      return obj ? meshToFish.get(obj) || null : null;
    }
    return null;
  }

  public clearAll(): void {
    const ids = Array.from(this.fishes.keys());
    ids.forEach((id) => this.removeFish(id));
  }

  public update(deltaTime: number): void {
    this.fishes.forEach((fish) => {
      if (fish.flashTime > 0) {
        fish.flashTime -= deltaTime;
        const intensity = fish.flashTime > 0 ? 0.6 : 0.08;
        fish.originalMaterials.forEach((m) => {
          if ((m as THREE.MeshStandardMaterial).emissive) {
            (m as THREE.MeshStandardMaterial).emissiveIntensity = intensity;
          }
        });
      }

      if (fish.dropTarget && fish.dropProgress < 1) {
        fish.dropProgress += deltaTime * 1.5;
        const t = Math.min(fish.dropProgress, 1);
        const easeT = t * t * (3 - 2 * t);
        const startY = this.tankBounds.maxY - 0.3;
        fish.position.y = startY + (fish.dropTarget.y - startY) * easeT;
        fish.position.x += (fish.dropTarget.x - fish.position.x) * deltaTime * 2;
        fish.position.z += (fish.dropTarget.z - fish.position.z) * deltaTime * 2;

        if (t >= 1) {
          fish.dropTarget = null;
          fish.curvePoints = this.generateCurvePoints(fish.position.clone());
          fish.curveProgress = 0;
        }
      } else {
        this.updateSwimming(fish, deltaTime);
      }

      fish.mesh.position.copy(fish.position);

      if (fish.velocity.lengthSq() > 0.0001) {
        const targetRotY = Math.atan2(fish.velocity.x, fish.velocity.z);
        fish.mesh.rotation.y = targetRotY + Math.PI / 2;
        fish.mesh.rotation.z = Math.sin(Date.now() * 0.005 + fish.id) * 0.08;
      }

      const tail = fish.mesh.children[3];
      if (tail) {
        tail.rotation.y = Math.sin(Date.now() * 0.01 + fish.id) * 0.4;
      }
    });
  }

  private updateSwimming(fish: Fish, deltaTime: number): void {
    fish.curveProgress += fish.curveSpeed * deltaTime * fish.config.speed;

    if (fish.curveProgress >= 1) {
      fish.curveProgress = 0;
      const last = fish.curvePoints[fish.curvePoints.length - 1];
      fish.curvePoints = this.generateCurvePoints(last);
    }

    const curve = new THREE.CatmullRomCurve3(fish.curvePoints, false, 'catmullrom', 0.5);
    const desiredPos = curve.getPoint(fish.curveProgress);

    let avoid = new THREE.Vector3();
    const margin = 1.5;
    if (desiredPos.x < this.tankBounds.minX + margin) avoid.x = 1;
    if (desiredPos.x > this.tankBounds.maxX - margin) avoid.x = -1;
    if (desiredPos.y < this.tankBounds.minY + margin) avoid.y = 1;
    if (desiredPos.y > this.tankBounds.maxY - margin) avoid.y = -1;
    if (desiredPos.z < this.tankBounds.minZ + margin) avoid.z = 1;
    if (desiredPos.z > this.tankBounds.maxZ - margin) avoid.z = -1;

    for (const coralPos of this.coralPositions) {
      const diff = fish.position.clone().sub(coralPos);
      diff.y = 0;
      const dist = diff.length();
      if (dist < 1.5) {
        avoid.add(diff.normalize().multiplyScalar((1.5 - dist) / 1.5));
      }
    }

    const moveDir = desiredPos.clone().sub(fish.position);
    if (avoid.lengthSq() > 0) {
      moveDir.add(avoid.normalize().multiplyScalar(2));
    }

    moveDir.normalize().multiplyScalar(fish.config.speed * deltaTime);
    fish.velocity.copy(moveDir);
    fish.position.add(moveDir);

    fish.position.x = THREE.MathUtils.clamp(fish.position.x, this.tankBounds.minX + 0.3, this.tankBounds.maxX - 0.3);
    fish.position.y = THREE.MathUtils.clamp(fish.position.y, this.tankBounds.minY + 0.3, this.tankBounds.maxY - 0.3);
    fish.position.z = THREE.MathUtils.clamp(fish.position.z, this.tankBounds.minZ + 0.3, this.tankBounds.maxZ - 0.3);
  }
}
