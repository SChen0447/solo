import * as THREE from 'three';
import { BeeSwarmManager } from './BeeSwarmManager';

interface FlowerData {
  active: boolean;
  collectCount: number;
  status: string;
  cooldownTimer: number;
  originalColor: THREE.Color;
  originalMaterial: THREE.MeshLambertMaterial | null;
}

export class Environment {
  scene: THREE.Scene;
  flowers: THREE.Object3D[] = [];
  obstacles: THREE.Object3D[] = [];
  swarmManager: BeeSwarmManager;
  ground: THREE.Mesh | null = null;
  hive: THREE.Group | null = null;

  private flowerCount: number = 30;
  private obstacleCount: number = 6;
  private gardenRadius: number = 20;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.swarmManager = new BeeSwarmManager(scene);
  }

  init(flowerCount: number, obstacleCount: number): void {
    this.flowerCount = flowerCount;
    this.obstacleCount = obstacleCount;
    this.clear();
    this.createGround();
    this.createHive();
    this.createFlowers();
    this.createObstacles();
    this.swarmManager.init(25);
  }

  private clear(): void {
    this.swarmManager.dispose();

    for (const f of this.flowers) {
      this.scene.remove(f);
      f.traverse((child) => {
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
    this.flowers = [];

    for (const o of this.obstacles) {
      this.scene.remove(o);
      o.traverse((child) => {
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
    this.obstacles = [];

    if (this.ground) {
      this.scene.remove(this.ground);
      this.ground.geometry.dispose();
      (this.ground.material as THREE.Material).dispose();
      this.ground = null;
    }

    if (this.hive) {
      this.scene.remove(this.hive);
      this.hive.traverse((child) => {
        if ((child as any).geometry) (child as any).geometry.dispose();
        if ((child as any).material) (child as any).material.dispose();
      });
      this.hive = null;
    }
  }

  private createGround(): void {
    const geometry = new THREE.CircleGeometry(this.gardenRadius, 64);
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;
    const gradient = ctx.createRadialGradient(256, 256, 0, 256, 256, 256);
    gradient.addColorStop(0, '#4a7c3f');
    gradient.addColorStop(1, '#2d5a27');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 512, 512);

    for (let i = 0; i < 300; i++) {
      ctx.fillStyle = `rgba(${60 + Math.random() * 40}, ${100 + Math.random() * 60}, ${40 + Math.random() * 30}, 0.3)`;
      const x = Math.random() * 512;
      const y = Math.random() * 512;
      ctx.beginPath();
      ctx.arc(x, y, 1 + Math.random() * 3, 0, Math.PI * 2);
      ctx.fill();
    }

    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.MeshLambertMaterial({ map: texture });
    this.ground = new THREE.Mesh(geometry, material);
    this.ground.rotation.x = -Math.PI / 2;
    this.ground.receiveShadow = true;
    this.scene.add(this.ground);
  }

  private createHive(): void {
    this.hive = new THREE.Group();

    const bodyGeom = new THREE.SphereGeometry(0.8, 12, 12);
    const bodyMat = new THREE.MeshLambertMaterial({ color: 0xd4a017 });
    const body = new THREE.Mesh(bodyGeom, bodyMat);
    body.scale.set(1, 1.2, 1);
    this.hive.add(body);

    const topGeom = new THREE.ConeGeometry(0.6, 0.5, 8);
    const topMat = new THREE.MeshLambertMaterial({ color: 0xb8860b });
    const top = new THREE.Mesh(topGeom, topMat);
    top.position.y = 1.1;
    this.hive.add(top);

    const entranceGeom = new THREE.CircleGeometry(0.2, 8);
    const entranceMat = new THREE.MeshLambertMaterial({ color: 0x1a1a00 });
    const entrance = new THREE.Mesh(entranceGeom, entranceMat);
    entrance.position.set(0, -0.2, 0.81);
    this.hive.add(entrance);

    this.hive.position.set(0, 1.5, 0);
    this.scene.add(this.hive);
  }

  private createFlowers(): void {
    for (let i = 0; i < this.flowerCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = 3 + Math.random() * (this.gardenRadius - 4);
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;

      const flower = this.createSingleFlower(x, z);
      this.flowers.push(flower);
      this.scene.add(flower);
    }
  }

  private createSingleFlower(x: number, z: number): THREE.Object3D {
    const group = new THREE.Group();
    group.position.set(x, 0, z);

    const stemGeom = new THREE.CylinderGeometry(0.03, 0.04, 0.8, 6);
    const stemMat = new THREE.MeshLambertMaterial({ color: 0x2e7d32 });
    const stem = new THREE.Mesh(stemGeom, stemMat);
    stem.position.y = 0.4;
    group.add(stem);

    const petalGeom = new THREE.CircleGeometry(0.3, 6);
    const hue = Math.random() * 0.2 + 0.1;
    const saturation = 0.7 + Math.random() * 0.3;
    const color = new THREE.Color().setHSL(hue > 0.2 ? 0.75 + Math.random() * 0.1 : hue, saturation, 0.5 + Math.random() * 0.2);
    const petalMat = new THREE.MeshLambertMaterial({
      color: color,
      side: THREE.DoubleSide,
    });
    const petals = new THREE.Mesh(petalGeom, petalMat);
    petals.name = 'petals';
    petals.rotation.x = -Math.PI / 2;
    petals.position.y = 0.85;
    group.add(petals);

    const centerGeom = new THREE.SphereGeometry(0.08, 8, 8);
    const centerMat = new THREE.MeshLambertMaterial({ color: 0xffffff, emissive: 0x444444 });
    const center = new THREE.Mesh(centerGeom, centerMat);
    center.name = 'nectarMarker';
    center.position.y = 0.88;
    group.add(center);

    (group as any).userData = {
      active: true,
      collectCount: 0,
      status: '可用',
      cooldownTimer: 0,
      originalColor: color.clone(),
      originalMaterial: petalMat,
      swayPhase: Math.random() * Math.PI * 2,
      swaySpeed: (2 * Math.PI) / (2 + Math.random()),
      swayAmplitude: THREE.MathUtils.degToRad(5),
    } as FlowerData;

    return group;
  }

  private createObstacles(): void {
    for (let i = 0; i < this.obstacleCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = 4 + Math.random() * (this.gardenRadius - 6);
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;

      const height = 1 + Math.random() * 2;
      const obsRadius = 0.4 + Math.random() * 0.4;

      const geometry = new THREE.CylinderGeometry(obsRadius, obsRadius, height, 12);
      const material = new THREE.MeshLambertMaterial({
        color: 0x5a7a5a,
        transparent: true,
        opacity: 0.6,
      });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(x, height / 2, z);
      (mesh as any).userData = { radius: obsRadius };

      const topGeom = new THREE.SphereGeometry(obsRadius, 8, 8);
      const topMat = new THREE.MeshLambertMaterial({
        color: 0x3a5a3a,
        transparent: true,
        opacity: 0.5,
      });
      const top = new THREE.Mesh(topGeom, topMat);
      top.position.y = height / 2;
      mesh.add(top);

      this.obstacles.push(mesh);
      this.scene.add(mesh);
    }
  }

  update(dt: number, time: number): void {
    for (const flower of this.flowers) {
      const data = (flower as any).userData as FlowerData;

      if (!data.active) {
        data.cooldownTimer += dt;
        if (data.cooldownTimer >= 10.0) {
          data.active = true;
          data.status = '可用';
          data.cooldownTimer = 0;

          const petalGroup = flower.getObjectByName('petals');
          if (petalGroup && data.originalMaterial) {
            (petalGroup as any).material = data.originalMaterial.clone();
          }

          const marker = flower.getObjectByName('nectarMarker');
          if (marker) {
            (marker as any).visible = true;
          }
        }
      }

      flower.rotation.y =
        Math.sin(time * data.swaySpeed + data.swayPhase) * data.swayAmplitude;
    }

    this.swarmManager.update(dt, this.flowers, this.obstacles, time);
  }

  regenerate(flowerCount: number, obstacleCount: number, evaporationRate: number): void {
    this.swarmManager.setEvaporationRate(evaporationRate);
    this.init(flowerCount, obstacleCount);
  }

  getFlowerAtPosition(point: THREE.Vector3): THREE.Object3D | null {
    let closest: THREE.Object3D | null = null;
    let closestDist = 1.5;
    for (const f of this.flowers) {
      const d = f.position.distanceTo(point);
      if (d < closestDist) {
        closestDist = d;
        closest = f;
      }
    }
    return closest;
  }
}
