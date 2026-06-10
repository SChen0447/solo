import * as THREE from 'three';
import { v4 as uuidv4 } from 'uuid';
import { FlowerData, InsectBase, InsectType, InsectParams, VisitRecord } from './InsectBase';
import { BeeInsect } from './BeeInsect';
import { ButterflyInsect } from './ButterflyInsect';
import { BeetleInsect } from './BeetleInsect';

interface FlowerMesh {
  group: THREE.Group;
  stem: THREE.Mesh;
  petals: THREE.Mesh[];
  center: THREE.Mesh;
  centerLight: THREE.PointLight;
}

export interface EnvironmentParams {
  pollenDensity: number;
  flowerCount: number;
  windStrength: number;
}

export class GardenScene {
  public scene: THREE.Scene;
  public flowers: FlowerData[] = [];
  public flowerMeshes: Map<string, FlowerMesh> = new Map();
  public insects: InsectBase[] = [];
  public maxInsectsPerType: number = 5;
  public selectedInsectType: InsectType = 'bee';
  public globalInsectParams: InsectParams = {
    speed: 1,
    straightProbability: 50,
    turnSensitivity: 0.5
  };
  public environment: EnvironmentParams = {
    pollenDensity: 1,
    flowerCount: 12,
    windStrength: 1
  };
  public windDirection: THREE.Vector3 = new THREE.Vector3(1, 0, 0.5).normalize();
  public gardenRadius: number = 6;
  private petalSwayTime: number = 0;
  private recentInsects: InsectBase[] = [];
  private maxRecentInsects: number = 10;
  private flowerFieldGroup: THREE.Group;
  private gridHelper: THREE.GridHelper;
  private downsampling: boolean = false;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.flowerFieldGroup = new THREE.Group();
    this.scene.add(this.flowerFieldGroup);

    this.gridHelper = new THREE.GridHelper(20, 20, 0x223344, 0x1a2a3a);
    (this.gridHelper.material as THREE.Material).transparent = true;
    (this.gridHelper.material as THREE.Material).opacity = 0.3;
    this.gridHelper.position.y = 0.01;
    this.scene.add(this.gridHelper);

    this.createGround();
    this.generateFlowers();
  }

  private createGround() {
    const groundGeo = new THREE.CircleGeometry(this.gardenRadius + 1, 64);
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x1a2f1a,
      roughness: 0.9,
      metalness: 0
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = 0;
    ground.receiveShadow = true;
    this.scene.add(ground);

    const outerGroundGeo = new THREE.PlaneGeometry(30, 30);
    const outerGroundMat = new THREE.MeshStandardMaterial({
      color: 0x0f1f0f,
      roughness: 1
    });
    const outerGround = new THREE.Mesh(outerGroundGeo, outerGroundMat);
    outerGround.rotation.x = -Math.PI / 2;
    outerGround.position.y = -0.01;
    this.scene.add(outerGround);
  }

  private getRandomFlowerColor(): { color: THREE.Color; name: 'red' | 'yellow' | 'purple' | 'blue'; hex: number } {
    const colors = [
      { color: new THREE.Color(0xe74c3c), name: 'red' as const, hex: 0xe74c3c },
      { color: new THREE.Color(0xf1c40f), name: 'yellow' as const, hex: 0xf1c40f },
      { color: new THREE.Color(0x9b59b6), name: 'purple' as const, hex: 0x9b59b6 },
      { color: new THREE.Color(0x3498db), name: 'blue' as const, hex: 0x3498db }
    ];
    return colors[Math.floor(Math.random() * colors.length)];
  }

  private getContrastCenterColor(petalColor: THREE.Color): number {
    const brightness = petalColor.r * 0.299 + petalColor.g * 0.587 + petalColor.b * 0.114;
    return brightness > 0.5 ? 0x222222 : 0xffee66;
  }

  public generateFlowers(count?: number) {
    this.clearFlowers();
    const targetCount = count ?? this.environment.flowerCount;

    const usedPositions: THREE.Vector2[] = [];
    for (let i = 0; i < targetCount; i++) {
      let pos: THREE.Vector2;
      let attempts = 0;
      do {
        const angle = Math.random() * Math.PI * 2;
        const radius = Math.random() * (this.gardenRadius - 1) + 0.5;
        pos = new THREE.Vector2(Math.cos(angle) * radius, Math.sin(angle) * radius);
        attempts++;
      } while (
        attempts < 30 &&
        usedPositions.some(p => p.distanceTo(pos) < 1.2)
      );
      usedPositions.push(pos);

      const stemHeight = 0.5 + Math.random() * 1.5;
      const colorInfo = this.getRandomFlowerColor();
      const id = uuidv4();

      const flowerData: FlowerData = {
        id,
        position: new THREE.Vector3(pos.x, 0, pos.y),
        stemHeight,
        petalColor: colorInfo.color,
        colorName: colorInfo.name,
        center: new THREE.Vector3(pos.x, stemHeight, pos.y),
        attractionLevel: 'normal',
        highAttractionUntil: 0,
        visitedCount: 0,
        lastVisitedAt: 0
      };
      this.flowers.push(flowerData);
      this.createFlowerMesh(flowerData, colorInfo.hex);
    }
  }

  private createFlowerMesh(data: FlowerData, petalHex: number) {
    const group = new THREE.Group();
    group.position.copy(data.position);
    group.userData.flowerId = data.id;

    const stemGeo = new THREE.CylinderGeometry(0.03, 0.04, data.stemHeight, 8);
    const stemMat = new THREE.MeshStandardMaterial({ color: 0x2d5a27, roughness: 0.8 });
    const stem = new THREE.Mesh(stemGeo, stemMat);
    stem.position.y = data.stemHeight / 2;
    stem.castShadow = true;
    group.add(stem);

    const petals: THREE.Mesh[] = [];
    const petalColor = new THREE.Color(petalHex);
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2;
      const petalGeo = new THREE.SphereGeometry(0.18, 12, 8);
      const petalMat = new THREE.MeshStandardMaterial({
        color: petalColor,
        roughness: 0.6,
        metalness: 0.1,
        side: THREE.DoubleSide
      });
      const petal = new THREE.Mesh(petalGeo, petalMat);
      petal.scale.set(0.8, 0.15, 0.5);
      petal.position.set(
        Math.cos(angle) * 0.2,
        data.stemHeight,
        Math.sin(angle) * 0.2
      );
      petal.rotation.y = -angle;
      petal.rotation.z = -0.4;
      petal.castShadow = true;
      petal.userData.baseAngle = angle;
      petals.push(petal);
      group.add(petal);
    }

    const centerColor = this.getContrastCenterColor(petalColor);
    const centerGeo = new THREE.SphereGeometry(0.1, 12, 12);
    const centerMat = new THREE.MeshStandardMaterial({
      color: centerColor,
      emissive: centerColor,
      emissiveIntensity: 0.4,
      roughness: 0.3
    });
    const center = new THREE.Mesh(centerGeo, centerMat);
    center.position.y = data.stemHeight;
    group.add(center);

    const centerLight = new THREE.PointLight(centerColor, 0.3, 2);
    centerLight.position.set(0, data.stemHeight, 0);
    group.add(centerLight);

    this.flowerMeshes.set(data.id, { group, stem, petals, center, centerLight });
    this.flowerFieldGroup.add(group);
  }

  private clearFlowers() {
    for (const flower of this.flowers) {
      const mesh = this.flowerMeshes.get(flower.id);
      if (mesh) {
        this.flowerFieldGroup.remove(mesh.group);
        mesh.group.traverse((obj) => {
          if (obj instanceof THREE.Mesh) {
            obj.geometry.dispose();
            if (Array.isArray(obj.material)) {
              obj.material.forEach(m => m.dispose());
            } else {
              obj.material.dispose();
            }
          }
        });
      }
    }
    this.flowers = [];
    this.flowerMeshes.clear();
  }

  public updateFlowerCount(count: number) {
    this.environment.flowerCount = count;
    this.generateFlowers(count);
  }

  public setSelectedInsectType(type: InsectType) {
    this.selectedInsectType = type;
  }

  public setGlobalParams(params: Partial<InsectParams>) {
    Object.assign(this.globalInsectParams, params);
    for (const insect of this.insects) {
      if (insect.type === this.selectedInsectType) {
        insect.setParams(params);
      }
    }
  }

  public setEnvironment(params: Partial<EnvironmentParams>) {
    Object.assign(this.environment, params);
    if (params.pollenDensity !== undefined) {
      const searchRadius = 5 * params.pollenDensity;
      for (const insect of this.insects) {
        insect.setSearchRadius(searchRadius);
      }
    }
    if (params.flowerCount !== undefined) {
      this.updateFlowerCount(params.flowerCount);
    }
  }

  public releaseInsect(): InsectBase | null {
    const sameTypeCount = this.insects.filter(i => i.type === this.selectedInsectType).length;
    if (sameTypeCount >= this.maxInsectsPerType) return null;

    const angle = Math.random() * Math.PI * 2;
    const edgeRadius = this.gardenRadius + 1;
    const startPos = new THREE.Vector3(
      Math.cos(angle) * edgeRadius,
      this.selectedInsectType === 'beetle' ? 0.1 : 1 + Math.random(),
      Math.sin(angle) * edgeRadius
    );

    let insect: InsectBase;
    switch (this.selectedInsectType) {
      case 'bee':
        insect = new BeeInsect(startPos, { ...this.globalInsectParams }, this.scene);
        break;
      case 'butterfly':
        const butterflyParams = { ...this.globalInsectParams };
        butterflyParams.speed = Math.max(0.3, butterflyParams.speed);
        insect = new ButterflyInsect(startPos, butterflyParams, this.scene);
        break;
      case 'beetle':
      default:
        insect = new BeetleInsect(startPos, { ...this.globalInsectParams }, this.scene);
        break;
    }
    insect.setSearchRadius(5 * this.environment.pollenDensity);
    this.insects.push(insect);
    this.recentInsects.push(insect);
    if (this.recentInsects.length > this.maxRecentInsects) {
      this.recentInsects.shift();
    }
    return insect;
  }

  public clearInsects() {
    for (const insect of this.insects) {
      insect.dispose(this.scene);
    }
    this.insects = [];
  }

  public getTotalTrailPoints(): number {
    return this.insects.reduce((sum, i) => sum + i.trailPoints.length, 0);
  }

  public getFlowerVisitStats() {
    return this.flowers.map(f => ({
      id: f.id,
      colorName: f.colorName,
      visitedCount: f.visitedCount,
      lastVisitedAt: f.lastVisitedAt,
      attractionLevel: f.attractionLevel
    }));
  }

  public getColorDistribution(): Record<string, number> {
    const dist: Record<string, number> = { red: 0, yellow: 0, purple: 0, blue: 0 };
    for (const f of this.flowers) {
      dist[f.colorName] += f.visitedCount;
    }
    return dist;
  }

  public setFlowerHighAttraction(flowerId: string) {
    const flower = this.flowers.find(f => f.id === flowerId);
    if (!flower) return;
    flower.attractionLevel = 'high';
    flower.highAttractionUntil = performance.now() + 5000;

    const mesh = this.flowerMeshes.get(flowerId);
    if (mesh) {
      (mesh.center.material as THREE.MeshStandardMaterial).color.setHex(0xff0000);
      (mesh.center.material as THREE.MeshStandardMaterial).emissive.setHex(0xff0000);
      (mesh.center.material as THREE.MeshStandardMaterial).emissiveIntensity = 1;
      mesh.centerLight.color.setHex(0xff0000);
      mesh.centerLight.intensity = 1.5;
    }
  }

  public setFlowerLowAttraction(flowerId: string) {
    const flower = this.flowers.find(f => f.id === flowerId);
    if (!flower) return;
    flower.attractionLevel = 'low';

    const mesh = this.flowerMeshes.get(flowerId);
    if (mesh) {
      (mesh.center.material as THREE.MeshStandardMaterial).color.setHex(0x666666);
      (mesh.center.material as THREE.MeshStandardMaterial).emissive.setHex(0x333333);
      (mesh.center.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.1;
      mesh.centerLight.color.setHex(0x666666);
      mesh.centerLight.intensity = 0.1;
    }
  }

  public pickFlower(intersects: THREE.Intersection[]): FlowerData | null {
    for (const hit of intersects) {
      let obj: THREE.Object3D | null = hit.object;
      while (obj) {
        if (obj.userData.flowerId) {
          return this.flowers.find(f => f.id === obj.userData.flowerId) || null;
        }
        obj = obj.parent;
      }
    }
    return null;
  }

  public getRecentInsectVisitData(): Record<string, VisitRecord[]> {
    const data: Record<string, VisitRecord[]> = {};
    for (const insect of this.recentInsects) {
      data[insect.id] = insect.visitHistory;
    }
    return data;
  }

  public replayLastVisits(type?: InsectType) {
    const candidates = type ? this.recentInsects.filter(i => i.type === type) : this.recentInsects;
    return candidates.slice(-5).map(i => ({
      insectId: i.id,
      type: i.type,
      visits: [...i.visitHistory]
    }));
  }

  public reset() {
    this.clearInsects();
    this.recentInsects = [];
    this.generateFlowers();
  }

  public update(dt: number) {
    this.petalSwayTime += dt;

    const now = performance.now();
    for (const flower of this.flowers) {
      if (flower.attractionLevel === 'high' && now > flower.highAttractionUntil) {
        flower.attractionLevel = 'normal';
        const mesh = this.flowerMeshes.get(flower.id);
        if (mesh) {
          const centerColor = this.getContrastCenterColor(flower.petalColor);
          (mesh.center.material as THREE.MeshStandardMaterial).color.setHex(centerColor);
          (mesh.center.material as THREE.MeshStandardMaterial).emissive.setHex(centerColor);
          (mesh.center.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.4;
          mesh.centerLight.color.setHex(centerColor);
          mesh.centerLight.intensity = 0.3;
        }
      }

      if (flower.attractionLevel === 'high') {
        const mesh = this.flowerMeshes.get(flower.id);
        if (mesh) {
          const flicker = 0.7 + Math.sin(this.petalSwayTime * 8) * 0.3;
          (mesh.center.material as THREE.MeshStandardMaterial).emissiveIntensity = flicker;
          mesh.centerLight.intensity = 1 + Math.sin(this.petalSwayTime * 6) * 0.5;
        }
      }

      if (flower.lastVisitedAt > 0 && now - flower.lastVisitedAt < 1000) {
        const mesh = this.flowerMeshes.get(flower.id);
        if (mesh) {
          const pulse = 1 + (1 - (now - flower.lastVisitedAt) / 1000) * 0.8;
          mesh.center.scale.setScalar(pulse);
        }
      } else {
        const mesh = this.flowerMeshes.get(flower.id);
        if (mesh) {
          mesh.center.scale.setScalar(1);
        }
      }

      const mesh = this.flowerMeshes.get(flower.id);
      if (mesh && this.environment.windStrength > 0) {
        const sway = Math.sin(this.petalSwayTime * 1.5 + flower.position.x) * this.environment.windStrength * 0.02;
        for (const petal of mesh.petals) {
          const baseAngle = petal.userData.baseAngle as number;
          petal.rotation.z = -0.4 + sway + Math.sin(this.petalSwayTime * 2 + baseAngle) * 0.05;
        }
      }
    }

    for (const insect of this.insects) {
      insect.step(dt, this.flowers, this.environment.windStrength, this.windDirection);
    }

    const totalPoints = this.getTotalTrailPoints();
    const shouldDownsample = this.insects.length >= 5 && totalPoints > 1500;
    if (shouldDownsample !== this.downsampling) {
      this.downsampling = shouldDownsample;
    }
    if (this.downsampling) {
      for (const insect of this.insects) {
        insect.updateTrailGeometry(true);
      }
    }

    this.windDirection.applyAxisAngle(new THREE.Vector3(0, 1, 0), dt * 0.05);
  }
}
