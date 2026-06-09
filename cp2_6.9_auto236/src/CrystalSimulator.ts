import * as THREE from 'three';

type CrystalType = 'hexagon' | 'triangle' | 'diamond';

interface Seed {
  id: number;
  group: THREE.Group;
  type: CrystalType;
  layers: { mesh: THREE.Mesh; wireframe: THREE.LineSegments }[];
  layerCount: number;
  baseSize: number;
  color: THREE.Color;
  position: THREE.Vector3;
  growthProgress: number;
  spawnTime: number;
  rotationSpeed: number;
  rotationOffset: THREE.Vector3;
  hasDefects: boolean;
  irregularShape: boolean;
}

interface Particle {
  mesh: THREE.Mesh;
  velocity: THREE.Vector3;
  originalPosition: THREE.Vector3;
}

export class CrystalSimulator {
  private scene: THREE.Scene;
  private seeds: Seed[] = [];
  private particles: Particle[] = [];
  private temperature: number = 250;
  private saturation: number = 1.0;
  private stirSpeed: number = 10;
  private crystalType: CrystalType = 'hexagon';
  private maxSeeds: number = 8;
  private seedIdCounter: number = 0;
  private lastGrowthTime: number = 0;
  private growthInterval: number = 1000;
  private baseLayerThickness: number = 0.02;
  private defaultColor: THREE.Color = new THREE.Color(0xE0E0E0);

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.createParticles();
    this.addDefaultSeed();
  }

  private createParticles(): void {
    const particleGeometry = new THREE.SphereGeometry(0.02, 4, 4);
    const particleMaterial = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.3
    });

    for (let i = 0; i < 500; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const radius = 1 + Math.random() * 3.5;

      const x = radius * Math.sin(phi) * Math.cos(theta);
      const y = radius * Math.sin(phi) * Math.sin(theta);
      const z = radius * Math.cos(phi);

      const mesh = new THREE.Mesh(particleGeometry, particleMaterial);
      mesh.position.set(x, y, z);

      this.particles.push({
        mesh,
        velocity: new THREE.Vector3(
          (Math.random() - 0.5) * 0.002,
          (Math.random() - 0.5) * 0.002,
          (Math.random() - 0.5) * 0.002
        ),
        originalPosition: new THREE.Vector3(x, y, z)
      });

      this.scene.add(mesh);
    }
  }

  private addDefaultSeed(): void {
    this.addSeed(new THREE.Vector3(0, 0, 0), 'hexagon', 0.5);
  }

  public addSeed(
    position: THREE.Vector3,
    type?: CrystalType,
    fixedSize?: number
  ): boolean {
    if (this.seeds.length >= this.maxSeeds) return false;

    const seedType = type || this.crystalType;
    const size = fixedSize !== undefined ? fixedSize : 0.3 + Math.random() * 0.3;

    const group = new THREE.Group();
    group.position.copy(position);
    group.scale.set(0, 0, 0);

    const seed: Seed = {
      id: this.seedIdCounter++,
      group,
      type: seedType,
      layers: [],
      layerCount: 0,
      baseSize: size,
      color: this.defaultColor.clone(),
      position: position.clone(),
      growthProgress: 0,
      spawnTime: performance.now(),
      rotationSpeed: 0,
      rotationOffset: new THREE.Vector3(
        (Math.random() - 0.5) * 0.01,
        (Math.random() - 0.5) * 0.01,
        (Math.random() - 0.5) * 0.01
      ),
      hasDefects: false,
      irregularShape: false
    };

    this.createSeedCore(seed);
    this.scene.add(group);
    this.seeds.push(seed);

    this.animateSpawn(seed);
    return true;
  }

  private createSeedCore(seed: Seed): void {
    const { geometry } = this.createCrystalGeometry(seed.type, seed.baseSize, 0.2, 0);
    const material = new THREE.MeshStandardMaterial({
      color: seed.color,
      roughness: 0.3,
      metalness: 0.1,
      emissive: seed.color,
      emissiveIntensity: 0.15
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;

    const edges = new THREE.EdgesGeometry(geometry);
    const lineMaterial = new THREE.LineBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.6
    });
    const wireframe = new THREE.LineSegments(edges, lineMaterial);

    seed.group.add(mesh);
    seed.group.add(wireframe);
    seed.layers.push({ mesh, wireframe });
    seed.layerCount = 1;
  }

  private createCrystalGeometry(
    type: CrystalType,
    radius: number,
    height: number,
    layerIndex: number
  ): { geometry: THREE.BufferGeometry; thickness: number } {
    let geometry: THREE.BufferGeometry;
    const irregularFactor = layerIndex > 0 ? 1 + (Math.random() - 0.5) * 0.05 : 1;
    const actualRadius = radius * irregularFactor;

    switch (type) {
      case 'triangle': {
        const triangleShape = new THREE.Shape();
        for (let i = 0; i < 3; i++) {
          const angle = (i / 3) * Math.PI * 2 - Math.PI / 2;
          const x = Math.cos(angle) * actualRadius;
          const y = Math.sin(angle) * actualRadius;
          if (i === 0) triangleShape.moveTo(x, y);
          else triangleShape.lineTo(x, y);
        }
        triangleShape.closePath();

        const extrudeSettings = {
          depth: height,
          bevelEnabled: true,
          bevelThickness: height * 0.1,
          bevelSize: actualRadius * 0.05,
          bevelSegments: 2
        };
        geometry = new THREE.ExtrudeGeometry(triangleShape, extrudeSettings);
        geometry.translate(0, 0, -height / 2);
        geometry.rotateX(Math.PI / 2);
        break;
      }
      case 'diamond': {
        geometry = new THREE.OctahedronGeometry(actualRadius, 0);
        const scaleMatrix = new THREE.Matrix4().makeScale(1, height / actualRadius, 1);
        geometry.applyMatrix4(scaleMatrix);
        break;
      }
      case 'hexagon':
      default: {
        geometry = new THREE.CylinderGeometry(
          actualRadius,
          actualRadius,
          height,
          6,
          1,
          false
        );
        break;
      }
    }

    return { geometry, thickness: height };
  }

  private animateSpawn(seed: Seed): void {
    const startTime = performance.now();
    const duration = 500;
    const startColor = new THREE.Color(0xffffff);
    const endColor = seed.color.clone();

    const animate = () => {
      const elapsed = performance.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);

      seed.group.scale.setScalar(eased);

      const currentColor = startColor.clone().lerp(endColor, eased);
      if (seed.layers[0]) {
        const material = seed.layers[0].mesh.material as THREE.MeshStandardMaterial;
        material.color.copy(currentColor);
        material.emissive.copy(currentColor);
      }

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    animate();
  }

  public setTemperature(value: number): void {
    this.temperature = value;
    const baseInterval = 1500;
    this.growthInterval = Math.max(300, baseInterval - (value - 100) * 4);

    this.seeds.forEach((seed) => {
      seed.hasDefects = value > 350;
    });
  }

  public setSaturation(value: number): void {
    this.saturation = value;
    this.seeds.forEach((seed) => {
      seed.irregularShape = value > 1.8;
    });
  }

  public setStirSpeed(value: number): void {
    this.stirSpeed = value;
    this.seeds.forEach((seed) => {
      seed.rotationSpeed = value > 5 ? (value - 5) * 0.0008 : 0;
    });
  }

  public setCrystalType(type: CrystalType): void {
    this.crystalType = type;
  }

  private growLayer(seed: Seed): void {
    if (seed.layerCount >= 30) return;

    const thicknessMultiplier = 0.8 + this.saturation * 0.4;
    const layerThickness = this.baseLayerThickness * thicknessMultiplier;

    const newSize = seed.baseSize + seed.layerCount * this.baseLayerThickness * 1.5;
    const newHeight = 0.2 + seed.layerCount * layerThickness * 2;

    const { geometry } = this.createCrystalGeometry(
      seed.type,
      newSize,
      newHeight,
      seed.layerCount
    );

    const colorProgress = seed.layerCount / 30;
    const layerColor = this.getLayerColor(seed.color, colorProgress);

    if (seed.hasDefects) {
      const positions = geometry.attributes.position;
      for (let i = 0; i < positions.count; i++) {
        if (Math.random() < 0.1) {
          const defectAmount = (Math.random() - 0.5) * 0.08;
          positions.setX(i, positions.getX(i) + defectAmount);
          positions.setY(i, positions.getY(i) + defectAmount);
          positions.setZ(i, positions.getZ(i) + defectAmount);
        }
      }
      positions.needsUpdate = true;
      geometry.computeVertexNormals();
    }

    const material = new THREE.MeshStandardMaterial({
      color: layerColor,
      roughness: 0.3,
      metalness: 0.1,
      transparent: true,
      opacity: 0.95,
      emissive: layerColor,
      emissiveIntensity: 0.05
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;

    const edges = new THREE.EdgesGeometry(geometry);
    const complementaryColor = this.getComplementaryColor(layerColor);
    const lineMaterial = new THREE.LineBasicMaterial({
      color: complementaryColor,
      transparent: true,
      opacity: 0.5
    });
    const wireframe = new THREE.LineSegments(edges, lineMaterial);

    if (seed.layers.length > 0) {
      const prevLayer = seed.layers[seed.layers.length - 1];
      prevLayer.mesh.visible = true;
      const prevMaterial = prevLayer.mesh.material as THREE.MeshStandardMaterial;
      prevMaterial.opacity = 0.7;
      prevMaterial.transparent = true;
    }

    seed.group.add(mesh);
    seed.group.add(wireframe);
    seed.layers.push({ mesh, wireframe });
    seed.layerCount++;
  }

  private getLayerColor(baseColor: THREE.Color, progress: number): THREE.Color {
    const color = baseColor.clone();
    const darkenAmount = progress * 0.5;
    color.offsetHSL(0, 0, -darkenAmount);
    color.offsetHSL(progress * 0.05, 0, 0);
    return color;
  }

  private getComplementaryColor(color: THREE.Color): THREE.Color {
    const hsl = { h: 0, s: 0, l: 0 };
    color.getHSL(hsl);
    hsl.h = (hsl.h + 0.5) % 1;
    const complementary = new THREE.Color();
    complementary.setHSL(hsl.h, hsl.s, hsl.l);
    return complementary;
  }

  public update(): void {
    const now = performance.now();

    if (now - this.lastGrowthTime > this.growthInterval) {
      this.lastGrowthTime = now;
      this.seeds.forEach((seed) => {
        if (now - seed.spawnTime > 500) {
          this.growLayer(seed);
        }
      });
    }

    this.seeds.forEach((seed) => {
      if (seed.rotationSpeed > 0) {
        seed.group.rotation.y += seed.rotationSpeed;
        if (this.stirSpeed > 20) {
          seed.group.rotation.x += seed.rotationOffset.x * (this.stirSpeed / 50);
          seed.group.rotation.z += seed.rotationOffset.z * (this.stirSpeed / 50);
        }
      }
    });

    this.updateParticles();
  }

  private updateParticles(): void {
    const stirFactor = this.stirSpeed / 50;

    this.particles.forEach((particle) => {
      particle.mesh.position.add(particle.velocity);
      particle.mesh.position.x += Math.sin(now() * 0.001 + particle.originalPosition.x) * 0.001 * stirFactor;
      particle.mesh.position.y += Math.cos(now() * 0.001 + particle.originalPosition.y) * 0.001 * stirFactor;

      const distFromCenter = particle.mesh.position.length();
      if (distFromCenter > 3.8 || distFromCenter < 0.5) {
        particle.mesh.position.copy(particle.originalPosition);
      }
    });
  }
}

function now(): number {
  return performance.now();
}
