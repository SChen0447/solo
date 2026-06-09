import * as THREE from 'three';

export enum FlowerType {
  Lavender = 'lavender',
  Rose = 'rose',
  Sunflower = 'sunflower',
}

export const FLOWER_INFO: Record<FlowerType, { name: string; color: number; lightColor: number }> = {
  [FlowerType.Lavender]: { name: '薰衣草', color: 0x7b68ee, lightColor: 0xb39dff },
  [FlowerType.Rose]: { name: '玫瑰', color: 0xdc143c, lightColor: 0xff6b8a },
  [FlowerType.Sunflower]: { name: '向日葵', color: 0xffd700, lightColor: 0xfff080 },
};

interface FlowerBed {
  id: number;
  position: THREE.Vector3;
  mesh: THREE.Mesh;
  planted: FlowerType | null;
  flowerGroup: THREE.Group | null;
  swayOffset: number;
}

interface Flower {
  bedId: number;
  type: FlowerType;
  position: THREE.Vector3;
  color: THREE.Color;
}

interface PollenEmitter {
  flowerPos: THREE.Vector3;
  timeLeft: number;
  spawnTimer: number;
}

export class Garden {
  scene: THREE.Scene;
  ground: THREE.Mesh;
  flowerBeds: FlowerBed[] = [];
  flowers: Map<number, Flower> = new Map();
  pollenEmitters: PollenEmitter[] = [];
  pollenParticles: THREE.Points;
  pollenPositions: Float32Array;
  pollenVelocities: THREE.Vector3[] = [];
  pollenLives: number[] = [];
  maxPollen: number = 300;
  activePollenCount: number = 0;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.ground = this.createGround();
    this.scene.add(this.ground);

    this.createFlowerBeds(10);

    const { positions, points } = this.createPollenSystem();
    this.pollenPositions = positions;
    this.pollenParticles = points;
    this.scene.add(this.pollenParticles);
  }

  createGround(): THREE.Mesh {
    const geo = new THREE.PlaneGeometry(40, 40, 60, 60);
    geo.rotateX(-Math.PI / 2);

    const pos = geo.attributes.position as THREE.BufferAttribute;
    const colors: number[] = [];
    const c1 = new THREE.Color(0x6b8e23);
    const c2 = new THREE.Color(0x8fbc8f);

    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      const noise = Math.sin(x * 0.35) * 0.25 + Math.cos(z * 0.4) * 0.2 + Math.sin((x + z) * 0.2) * 0.15;
      pos.setY(i, noise);

      const t = (noise + 0.5) / 1.2;
      const col = c1.clone().lerp(c2, THREE.MathUtils.clamp(t, 0, 1));
      colors.push(col.r, col.g, col.b);
    }

    geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geo.computeVertexNormals();

    const mat = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.95,
      metalness: 0.0,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.receiveShadow = true;
    return mesh;
  }

  createFlowerBeds(count: number) {
    const bedGeo = new THREE.BoxGeometry(1, 0.3, 1);
    const bedMat = new THREE.MeshStandardMaterial({ color: 0x8b5a2b, roughness: 0.9 });

    const placed: THREE.Vector3[] = [];
    for (let i = 0; i < count; i++) {
      let pos: THREE.Vector3;
      let attempts = 0;
      do {
        pos = new THREE.Vector3(
          (Math.random() - 0.5) * 14,
          0.15,
          (Math.random() - 0.5) * 14
        );
        attempts++;
      } while (placed.some(p => p.distanceTo(pos) < 2) && attempts < 50);
      placed.push(pos);

      const mesh = new THREE.Mesh(bedGeo, bedMat.clone());
      mesh.position.copy(pos);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.userData = { bedId: i, isFlowerBed: true };
      this.scene.add(mesh);

      this.flowerBeds.push({
        id: i,
        position: pos.clone(),
        mesh,
        planted: null,
        flowerGroup: null,
        swayOffset: Math.random() * Math.PI * 2,
      });
    }
  }

  createFlower(type: FlowerType): THREE.Group {
    const group = new THREE.Group();
    const info = FLOWER_INFO[type];

    const stemMat = new THREE.MeshStandardMaterial({ color: 0x228b22, roughness: 0.8 });
    const stemGeo = new THREE.CylinderGeometry(0.03, 0.04, 0.7, 6);
    const stem = new THREE.Mesh(stemGeo, stemMat);
    stem.position.y = 0.35 + 0.15;
    stem.castShadow = true;
    group.add(stem);

    const petalMat = new THREE.MeshStandardMaterial({
      color: info.color,
      roughness: 0.5,
      emissive: info.color,
      emissiveIntensity: 0.15,
    });

    if (type === FlowerType.Lavender) {
      for (let i = 0; i < 3; i++) {
        const spikeGeo = new THREE.ConeGeometry(0.08, 0.4, 8);
        const spike = new THREE.Mesh(spikeGeo, petalMat);
        spike.position.set((i - 1) * 0.15, 0.9 + 0.15, 0);
        spike.castShadow = true;
        group.add(spike);
      }
    } else if (type === FlowerType.Rose) {
      for (let layer = 0; layer < 3; layer++) {
        const radius = 0.22 - layer * 0.06;
        const petals = layer === 0 ? 6 : 5;
        for (let p = 0; p < petals; p++) {
          const angle = (p / petals) * Math.PI * 2 + layer * 0.3;
          const petalGeo = new THREE.SphereGeometry(radius, 8, 6);
          const petal = new THREE.Mesh(petalGeo, petalMat);
          petal.scale.set(1, 0.5, 1);
          petal.position.set(Math.cos(angle) * radius * 0.5, 0.9 + 0.15 + layer * 0.05, Math.sin(angle) * radius * 0.5);
          petal.castShadow = true;
          group.add(petal);
        }
      }
      const center = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 6), new THREE.MeshStandardMaterial({ color: 0xffd700 }));
      center.position.y = 0.9 + 0.15 + 0.1;
      group.add(center);
    } else {
      const discGeo = new THREE.CylinderGeometry(0.32, 0.32, 0.04, 16);
      const disc = new THREE.Mesh(discGeo, new THREE.MeshStandardMaterial({ color: 0x5c3d00, roughness: 0.6 }));
      disc.position.y = 0.9 + 0.15;
      disc.rotation.x = Math.PI / 2;
      disc.castShadow = true;
      group.add(disc);

      for (let i = 0; i < 14; i++) {
        const angle = (i / 14) * Math.PI * 2;
        const petalGeo = new THREE.SphereGeometry(0.12, 8, 6);
        const petal = new THREE.Mesh(petalGeo, petalMat);
        petal.scale.set(1, 0.4, 1.6);
        petal.position.set(Math.cos(angle) * 0.28, 0.9 + 0.15, Math.sin(angle) * 0.28);
        petal.lookAt(new THREE.Vector3(Math.cos(angle) * 2, 0.9 + 0.15, Math.sin(angle) * 2));
        petal.castShadow = true;
        group.add(petal);
      }
    }

    return group;
  }

  plantFlower(bedId: number, type: FlowerType): boolean {
    const bed = this.flowerBeds[bedId];
    if (!bed || bed.planted !== null) return false;

    const flowerGroup = this.createFlower(type);
    flowerGroup.position.copy(bed.position);
    flowerGroup.position.y = 0;
    this.scene.add(flowerGroup);

    bed.planted = type;
    bed.flowerGroup = flowerGroup;

    const info = FLOWER_INFO[type];
    this.flowers.set(bedId, {
      bedId,
      type,
      position: bed.position.clone().setY(1.0 + 0.15),
      color: new THREE.Color(info.color),
    });

    return true;
  }

  intersectFlowerBed(raycaster: THREE.Raycaster): number | null {
    const bedMeshes = this.flowerBeds.map(b => b.mesh);
    const hits = raycaster.intersectObjects(bedMeshes, false);
    if (hits.length > 0) {
      const bedId = (hits[0].object as THREE.Mesh).userData.bedId;
      const bed = this.flowerBeds[bedId];
      if (bed && bed.planted === null) return bedId;
    }
    return null;
  }

  getFlowers(): Flower[] {
    return Array.from(this.flowers.values());
  }

  startPollenEmitter(flowerPos: THREE.Vector3, duration: number = 2) {
    this.pollenEmitters.push({
      flowerPos: flowerPos.clone(),
      timeLeft: duration,
      spawnTimer: 0,
    });
  }

  createPollenSystem(): { positions: Float32Array; points: THREE.Points } {
    const positions = new Float32Array(this.maxPollen * 3);
    const colors = new Float32Array(this.maxPollen * 3);
    const pCol = new THREE.Color(0xfffacd);

    for (let i = 0; i < this.maxPollen; i++) {
      positions[i * 3] = 0;
      positions[i * 3 + 1] = -100;
      positions[i * 3 + 2] = 0;
      colors[i * 3] = pCol.r;
      colors[i * 3 + 1] = pCol.g;
      colors[i * 3 + 2] = pCol.b;
      this.pollenVelocities.push(new THREE.Vector3());
      this.pollenLives.push(0);
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const mat = new THREE.PointsMaterial({
      size: 0.05,
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      emissive: pCol,
      emissiveIntensity: 0.8,
    });

    const points = new THREE.Points(geo, mat);
    return { positions, points };
  }

  spawnPollen(pos: THREE.Vector3) {
    for (let i = 0; i < this.maxPollen; i++) {
      if (this.pollenLives[i] <= 0) {
        this.pollenPositions[i * 3] = pos.x + (Math.random() - 0.5) * 0.2;
        this.pollenPositions[i * 3 + 1] = pos.y + (Math.random() - 0.5) * 0.1;
        this.pollenPositions[i * 3 + 2] = pos.z + (Math.random() - 0.5) * 0.2;
        this.pollenVelocities[i].set(
          (Math.random() - 0.5) * 0.4,
          0.5 + Math.random() * 0.6,
          (Math.random() - 0.5) * 0.4
        );
        this.pollenLives[i] = 1.2 + Math.random() * 0.6;
        if (i + 1 > this.activePollenCount) this.activePollenCount = i + 1;
        break;
      }
    }
  }

  update(dt: number, elapsed: number) {
    for (const bed of this.flowerBeds) {
      if (bed.flowerGroup) {
        const sway = Math.sin(elapsed * Math.PI + bed.swayOffset) * 0.1;
        bed.flowerGroup.rotation.z = sway * 0.3;
        bed.flowerGroup.rotation.x = sway * 0.2;
      }
    }

    for (let i = this.pollenEmitters.length - 1; i >= 0; i--) {
      const em = this.pollenEmitters[i];
      em.timeLeft -= dt;
      em.spawnTimer -= dt;
      if (em.spawnTimer <= 0) {
        const count = Math.max(1, Math.floor(30 * dt));
        for (let j = 0; j < count; j++) this.spawnPollen(em.flowerPos);
        em.spawnTimer = 1 / 30;
      }
      if (em.timeLeft <= 0) this.pollenEmitters.splice(i, 1);
    }

    const posAttr = this.pollenParticles.geometry.attributes.position as THREE.BufferAttribute;
    let stillAlive = 0;
    for (let i = 0; i < this.maxPollen; i++) {
      if (this.pollenLives[i] > 0) {
        this.pollenLives[i] -= dt;
        this.pollenPositions[i * 3] += this.pollenVelocities[i].x * dt;
        this.pollenPositions[i * 3 + 1] += this.pollenVelocities[i].y * dt;
        this.pollenPositions[i * 3 + 2] += this.pollenVelocities[i].z * dt;
        this.pollenVelocities[i].y -= 0.3 * dt;
        if (i + 1 > stillAlive) stillAlive = i + 1;
      } else {
        this.pollenPositions[i * 3 + 1] = -100;
      }
    }
    this.activePollenCount = stillAlive;
    posAttr.needsUpdate = true;
    this.pollenParticles.geometry.setDrawRange(0, Math.max(this.activePollenCount, 1));
  }
}
