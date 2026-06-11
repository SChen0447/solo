import * as THREE from 'three';
import { Worm, WormInfo } from './worm';

interface PlumeParticle {
  sprite: THREE.Sprite;
  velocity: THREE.Vector3;
  life: number;
  maxLife: number;
  startSize: number;
  endSize: number;
  startOpacity: number;
  endOpacity: number;
}

interface StarParticle {
  mesh: THREE.Points;
  basePosition: THREE.Vector3;
  parallaxFactor: number;
}

export class Ecosystem {
  public scene: THREE.Scene;
  public worms: Worm[];
  public temperature: number;
  public sulfideConcentration: number;
  public currentSpeed: number;

  private terrain: THREE.Mesh;
  private vent: THREE.Group;
  private plumeParticles: PlumeParticle[];
  private plumePool: PlumeParticle[];
  private starfield: StarParticle[];
  private camera: THREE.Camera;

  private readonly PLUME_SPAWN_RATE = 30;
  private readonly PLUME_RISE_SPEED = 0.8;
  private readonly PLUME_LIFETIME = 5;
  private readonly PLUME_START_SIZE = 2;
  private readonly PLUME_END_SIZE = 0.5;
  private readonly PLUME_START_OPACITY = 0.6;
  private readonly PLUME_END_OPACITY = 0;
  private readonly VENT_RADIUS = 4;
  private readonly WORM_COUNT_MIN = 8;
  private readonly WORM_COUNT_MAX = 15;

  private plumeMaterial: THREE.SpriteMaterial;
  private time: number;

  constructor(scene: THREE.Scene, camera: THREE.Camera) {
    this.scene = scene;
    this.camera = camera;
    this.worms = [];
    this.plumeParticles = [];
    this.plumePool = [];
    this.starfield = [];
    this.temperature = 8;
    this.sulfideConcentration = 0.8;
    this.currentSpeed = 1;
    this.time = 0;

    this.plumeMaterial = new THREE.SpriteMaterial({
      color: 0x1a1a2e,
      transparent: true,
      opacity: 0.6,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
  }

  public init(): void {
    this.createTerrain();
    this.createVent();
    this.createPlumeSystem();
    this.createWormColony();
    this.createStarfield();
  }

  private createTerrain(): void {
    const size = 40;
    const segments = 128;

    const geometry = new THREE.PlaneGeometry(size, size, segments, segments);
    geometry.rotateX(-Math.PI / 2);

    const positions = geometry.attributes.position;
    const originalPositions = new Float32Array(positions.array);

    for (let i = 0; i < positions.count; i++) {
      const x = originalPositions[i * 3];
      const z = originalPositions[i * 3 + 2];

      const distFromCenter = Math.sqrt(x * x + z * z);
      const ventDepression = Math.max(0, (this.VENT_RADIUS + 2 - distFromCenter) / (this.VENT_RADIUS + 2)) * 0.5;

      const noise1 = this.noise(x * 0.2, z * 0.2) * 0.8;
      const noise2 = this.noise(x * 0.5 + 100, z * 0.5 + 100) * 0.3;
      const noise3 = this.noise(x * 1 - 50, z * 1 - 50) * 0.1;

      const height = noise1 + noise2 + noise3 - ventDepression;
      positions.setY(i, height);
    }

    geometry.computeVertexNormals();

    const material = new THREE.MeshStandardMaterial({
      color: 0x2a2a3a,
      roughness: 0.9,
      metalness: 0.1,
      side: THREE.DoubleSide
    });

    this.terrain = new THREE.Mesh(geometry, material);
    this.terrain.position.y = -0.5;
    this.terrain.receiveShadow = true;
    this.scene.add(this.terrain);
  }

  private noise(x: number, y: number): number {
    const n = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
    return n - Math.floor(n) - 0.5;
  }

  private createVent(): void {
    this.vent = new THREE.Group();

    const chimneyGeometry = new THREE.CylinderGeometry(
      this.VENT_RADIUS * 0.3,
      this.VENT_RADIUS * 0.5,
      2,
      16
    );

    const chimneyMaterial = new THREE.MeshStandardMaterial({
      color: 0x3a3a4a,
      roughness: 0.9,
      metalness: 0.2
    });

    const chimney = new THREE.Mesh(chimneyGeometry, chimneyMaterial);
    chimney.position.y = 1;
    chimney.castShadow = true;
    chimney.receiveShadow = true;
    this.vent.add(chimney);

    const craterGeometry = new THREE.CircleGeometry(this.VENT_RADIUS, 32);
    const craterMaterial = new THREE.MeshStandardMaterial({
      color: 0x1a0a0a,
      emissive: 0xff4400,
      emissiveIntensity: 0.3,
      side: THREE.DoubleSide
    });

    const crater = new THREE.Mesh(craterGeometry, craterMaterial);
    crater.rotation.x = -Math.PI / 2;
    crater.position.y = 0.01;
    this.vent.add(crater);

    const ventLight = new THREE.PointLight(0xff6600, 2, 15);
    ventLight.position.set(0, 1, 0);
    ventLight.castShadow = true;
    this.vent.add(ventLight);

    for (let i = 0; i < 5; i++) {
      const angle = (i / 5) * Math.PI * 2;
      const radius = this.VENT_RADIUS * 0.6;
      const minichimneyGeometry = new THREE.CylinderGeometry(0.2, 0.4, 1 + Math.random(), 8);
      const minichimney = new THREE.Mesh(minichimneyGeometry, chimneyMaterial);
      minichimney.position.set(
        Math.cos(angle) * radius,
        0.5 + Math.random() * 0.5,
        Math.sin(angle) * radius
      );
      minichimney.castShadow = true;
      this.vent.add(minichimney);
    }

    this.scene.add(this.vent);
  }

  private createPlumeSystem(): void {
    for (let i = 0; i < 1000; i++) {
      this.plumePool.push(this.createPlumeParticle());
    }
  }

  private createPlumeParticle(): PlumeParticle {
    const material = this.plumeMaterial.clone();
    const sprite = new THREE.Sprite(material);
    sprite.visible = false;
    this.scene.add(sprite);

    return {
      sprite,
      velocity: new THREE.Vector3(),
      life: 0,
      maxLife: this.PLUME_LIFETIME,
      startSize: this.PLUME_START_SIZE,
      endSize: this.PLUME_END_SIZE,
      startOpacity: this.PLUME_START_OPACITY,
      endOpacity: this.PLUME_END_OPACITY
    };
  }

  private spawnPlumeParticle(): void {
    if (this.plumePool.length === 0) return;

    const particle = this.plumePool.pop()!;
    const angle = Math.random() * Math.PI * 2;
    const radius = Math.random() * this.VENT_RADIUS * 0.8;

    particle.sprite.position.set(
      Math.cos(angle) * radius,
      0.5,
      Math.sin(angle) * radius
    );

    const spreadAngle = (Math.random() - 0.5) * 0.3;
    particle.velocity.set(
      Math.cos(angle) * 0.1 + Math.sin(spreadAngle) * 0.2,
      this.PLUME_RISE_SPEED,
      Math.sin(angle) * 0.1 + Math.cos(spreadAngle) * 0.2
    );

    particle.life = particle.maxLife;
    particle.sprite.scale.setScalar(particle.startSize);
    (particle.sprite.material as THREE.SpriteMaterial).opacity = particle.startOpacity;
    particle.sprite.visible = true;

    this.plumeParticles.push(particle);
  }

  private createWormColony(): void {
    const wormCount = this.WORM_COUNT_MIN + Math.floor(Math.random() * (this.WORM_COUNT_MAX - this.WORM_COUNT_MIN));

    for (let i = 0; i < wormCount; i++) {
      const angle = (i / wormCount) * Math.PI * 2 + Math.random() * 0.3;
      const distance = this.VENT_RADIUS + 1 + Math.random() * 3;
      const x = Math.cos(angle) * distance;
      const z = Math.sin(angle) * distance;

      const baseHeight = 2 + Math.random() * 2;
      const radius = 0.3 + Math.random() * 0.3;

      const terrainHeight = this.getTerrainHeight(x, z);
      const position = new THREE.Vector3(x, terrainHeight, z);

      const worm = new Worm(position, baseHeight, radius);
      this.worms.push(worm);
      this.scene.add(worm.mesh);
    }
  }

  private getTerrainHeight(x: number, z: number): number {
    const distFromCenter = Math.sqrt(x * x + z * z);
    const ventDepression = Math.max(0, (this.VENT_RADIUS + 2 - distFromCenter) / (this.VENT_RADIUS + 2)) * 0.5;

    const noise1 = this.noise(x * 0.2, z * 0.2) * 0.8;
    const noise2 = this.noise(x * 0.5 + 100, z * 0.5 + 100) * 0.3;
    const noise3 = this.noise(x * 1 - 50, z * 1 - 50) * 0.1;

    return noise1 + noise2 + noise3 - ventDepression - 0.5;
  }

  private createStarfield(): void {
    const particleCount = 2000;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    const sizes = new Float32Array(particleCount);
    const parallaxFactors = new Float32Array(particleCount);

    for (let i = 0; i < particleCount; i++) {
      const radius = 50 + Math.random() * 50;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI;

      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = radius * Math.cos(phi) * 0.5 + 10;
      positions[i * 3 + 2] = radius * Math.sin(phi) * Math.sin(theta);

      const brightness = 0.5 + Math.random() * 0.5;
      colors[i * 3] = brightness;
      colors[i * 3 + 1] = brightness;
      colors[i * 3 + 2] = brightness;

      sizes[i] = 1 + Math.random() * 2;
      parallaxFactors[i] = 0.02 + Math.random() * 0.05;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    const material = new THREE.PointsMaterial({
      size: 0.1,
      vertexColors: true,
      transparent: true,
      opacity: 0.5,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true
    });

    const stars = new THREE.Points(geometry, material);
    this.scene.add(stars);

    this.starfield.push({
      mesh: stars,
      basePosition: new THREE.Vector3(),
      parallaxFactor: 1
    });
  }

  public update(deltaTime: number): void {
    this.time += deltaTime;

    for (let i = 0; i < this.PLUME_SPAWN_RATE; i++) {
      this.spawnPlumeParticle();
    }

    this.updatePlumeParticles(deltaTime);
    this.updateWorms(deltaTime);
    this.updateStarfield();
    this.updateVentEmission();
  }

  private updatePlumeParticles(deltaTime: number): void {
    for (let i = this.plumeParticles.length - 1; i >= 0; i--) {
      const particle = this.plumeParticles[i];
      particle.life -= deltaTime;

      if (particle.life <= 0) {
        particle.sprite.visible = false;
        this.plumePool.push(particle);
        this.plumeParticles.splice(i, 1);
        continue;
      }

      const currentInfluence = this.currentSpeed * 0.3;
      particle.velocity.x += (Math.sin(this.time + particle.sprite.position.y) * currentInfluence - particle.velocity.x) * 0.1;
      particle.velocity.z += (Math.cos(this.time + particle.sprite.position.y) * currentInfluence - particle.velocity.z) * 0.1;

      particle.sprite.position.addScaledVector(particle.velocity, deltaTime);

      const lifeRatio = particle.life / particle.maxLife;
      const currentSize = particle.endSize + (particle.startSize - particle.endSize) * lifeRatio;
      const currentOpacity = particle.endOpacity + (particle.startOpacity - particle.endOpacity) * lifeRatio;

      particle.sprite.scale.setScalar(currentSize);
      (particle.sprite.material as THREE.SpriteMaterial).opacity = currentOpacity;
    }
  }

  private updateWorms(deltaTime: number): void {
    const saturation = this.calculateColorSaturation();
    const brightness = this.calculateColonyBrightness();

    for (const worm of this.worms) {
      worm.update(deltaTime, this.temperature, this.sulfideConcentration, this.currentSpeed);
      worm.setColorSaturation(saturation);
      worm.setColonyBrightness(brightness);
    }
  }

  private calculateColorSaturation(): number {
    const tempFactor = (this.temperature - 2) / 13;
    const sulfideFactor = this.sulfideConcentration / 2;
    return Math.min(1, (tempFactor + sulfideFactor) / 2);
  }

  private calculateColonyBrightness(): number {
    return 0.2 + (this.sulfideConcentration / 2) * 0.8;
  }

  private updateStarfield(): void {
    if (!this.camera) return;

    for (const star of this.starfield) {
      const parallaxX = this.camera.position.x * 0.05;
      const parallaxY = this.camera.position.y * 0.02;
      star.mesh.position.x = parallaxX;
      star.mesh.position.y = parallaxY;
    }

    const material = this.starfield[0].mesh.material as THREE.PointsMaterial;
    const flicker = 0.8 + Math.sin(this.time * 0.5) * 0.2;
    material.opacity = 0.3 * flicker + 0.2;
  }

  private updateVentEmission(): void {
    const intensity = 0.2 + (this.temperature / 15) * 0.4;
    this.vent.traverse((child) => {
      if (child instanceof THREE.Mesh && child.material instanceof THREE.MeshStandardMaterial) {
        if (child.material.emissive && child.material.emissive.r > 0) {
          child.material.emissiveIntensity = intensity;
        }
      }
      if (child instanceof THREE.PointLight) {
        child.intensity = 1 + (this.temperature / 15) * 2;
      }
    });
  }

  public setTemperature(value: number): void {
    this.temperature = Math.max(2, Math.min(15, value));
  }

  public setSulfideConcentration(value: number): void {
    this.sulfideConcentration = Math.max(0.1, Math.min(2, value));
  }

  public setCurrentSpeed(value: number): void {
    this.currentSpeed = Math.max(0, Math.min(3, value));
  }

  public getWormAtPosition(intersect: THREE.Intersection): Worm | null {
    let object: THREE.Object3D | null = intersect.object;
    while (object) {
      if (object.userData.worm instanceof Worm) {
        return object.userData.worm;
      }
      object = object.parent;
    }
    return null;
  }

  public getWormInfo(worm: Worm): WormInfo {
    return worm.getInfo();
  }

  public dispose(): void {
    for (const worm of this.worms) {
      worm.dispose();
      this.scene.remove(worm.mesh);
    }
    this.worms = [];

    for (const particle of [...this.plumeParticles, ...this.plumePool]) {
      particle.sprite.material?.dispose();
      this.scene.remove(particle.sprite);
    }
    this.plumeParticles = [];
    this.plumePool = [];

    for (const star of this.starfield) {
      star.mesh.geometry.dispose();
      (star.mesh.material as THREE.Material).dispose();
      this.scene.remove(star.mesh);
    }
    this.starfield = [];

    if (this.terrain) {
      this.terrain.geometry.dispose();
      (this.terrain.material as THREE.Material).dispose();
      this.scene.remove(this.terrain);
    }

    if (this.vent) {
      this.vent.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.geometry.dispose();
          (child.material as THREE.Material).dispose();
        }
      });
      this.scene.remove(this.vent);
    }

    this.plumeMaterial.dispose();
  }
}
