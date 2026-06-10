import * as THREE from 'three';
import type { PlateManager, PlateData } from './plateManager';

interface Particle {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  color: THREE.Color;
  size: number;
  life: number;
  maxLife: number;
  type: 'explosion' | 'magma';
}

export class EffectsSystem {
  private scene: THREE.Scene;
  private plateManager: PlateManager;
  private particles: Particle[] = [];
  private particleGeometry: THREE.BufferGeometry;
  private particleMaterial: THREE.PointsMaterial;
  private particleSystem: THREE.Points;
  private MAX_PARTICLES = 2000;
  private effectsGroup: THREE.Group;

  private lastEventFrame: Map<string, number> = new Map();
  private eventCooldown = 10;

  constructor(scene: THREE.Scene, plateManager: PlateManager) {
    this.scene = scene;
    this.plateManager = plateManager;
    this.effectsGroup = new THREE.Group();
    this.scene.add(this.effectsGroup);

    const maxParticles = this.MAX_PARTICLES;
    this.particleGeometry = new THREE.BufferGeometry();
    const positions = new Float32Array(maxParticles * 3);
    const colors = new Float32Array(maxParticles * 3);
    const sizes = new Float32Array(maxParticles);

    this.particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.particleGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    this.particleGeometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    this.particleMaterial = new THREE.PointsMaterial({
      size: 0.3,
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true,
    });

    this.particleSystem = new THREE.Points(this.particleGeometry, this.particleMaterial);
    this.particleSystem.frustumCulled = false;
    this.effectsGroup.add(this.particleSystem);
  }

  public spawnExplosion(position: THREE.Vector3): void {
    const count = 500;
    for (let i = 0; i < count; i++) {
      if (this.particles.length >= this.MAX_PARTICLES) {
        this.particles.shift();
      }

      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const speed = 0.02 + Math.random() * 0.04;

      const velocity = new THREE.Vector3(
        Math.sin(phi) * Math.cos(theta) * speed,
        Math.sin(phi) * Math.sin(theta) * speed,
        Math.cos(phi) * speed
      );

      this.particles.push({
        position: position.clone(),
        velocity,
        color: new THREE.Color('#FF4500'),
        size: 0.1 + Math.random() * 0.4,
        life: 0,
        maxLife: 2,
        type: 'explosion',
      });
    }
  }

  public spawnMagmaFlow(position: THREE.Vector3, direction: THREE.Vector3): void {
    const count = 80;
    for (let i = 0; i < count; i++) {
      if (this.particles.length >= this.MAX_PARTICLES) {
        this.particles.shift();
      }

      const offset = new THREE.Vector3(
        (Math.random() - 0.5) * 0.5,
        (Math.random() - 0.5) * 0.5,
        (Math.random() - 0.5) * 0.5
      );

      const velocity = direction.clone().normalize().multiplyScalar(0.5);
      velocity.x += (Math.random() - 0.5) * 0.1;
      velocity.y += (Math.random() - 0.5) * 0.1;
      velocity.z += (Math.random() - 0.5) * 0.1;

      const life = 1.5 + Math.random() * 1;
      this.particles.push({
        position: position.clone().add(offset),
        velocity,
        color: new THREE.Color('#FF6347'),
        size: 0.3,
        life: 0,
        maxLife: life,
        type: 'magma',
      });
    }
  }

  public update(deltaTime: number): void {
    const platesData = this.plateManager.getPlatesData();
    const currentFrame = performance.now() / 16.67;

    for (let i = 0; i < platesData.length; i++) {
      for (let j = i + 1; j < platesData.length; j++) {
        const eventKey = `${i}-${j}`;
        const lastFrame = this.lastEventFrame.get(eventKey) || -Infinity;
        if (currentFrame - lastFrame < this.eventCooldown) continue;

        const plateA = platesData[i];
        const plateB = platesData[j];
        const dist = this.getPlateDistance(plateA, plateB);

        if (dist < 1.5) {
          const contactPoint = this.getContactPoint(plateA, plateB);
          const relativeVel = plateA.velocity.clone().sub(plateB.velocity).length();

          if (relativeVel > 0.03 && dist < 0.8) {
            this.spawnExplosion(contactPoint);
            this.lastEventFrame.set(eventKey, currentFrame);
          } else if (relativeVel > 0.02 && dist < 1.2) {
            const dir = this.getPlateCenter(plateA).sub(this.getPlateCenter(plateB)).normalize();
            this.spawnMagmaFlow(contactPoint, dir);
            this.lastEventFrame.set(eventKey, currentFrame);
          }
        }
      }
    }

    const positions = this.particleGeometry.getAttribute('position') as THREE.BufferAttribute;
    const colors = this.particleGeometry.getAttribute('color') as THREE.BufferAttribute;
    const sizes = this.particleGeometry.getAttribute('size') as THREE.BufferAttribute;
    const posArr = positions.array as Float32Array;
    const colArr = colors.array as Float32Array;
    const sizeArr = sizes.array as Float32Array;

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life += deltaTime;

      if (p.life >= p.maxLife) {
        this.particles.splice(i, 1);
        continue;
      }

      p.position.add(p.velocity.clone().multiplyScalar(deltaTime * 60));

      if (p.type === 'explosion') {
        p.velocity.multiplyScalar(0.98);
        p.velocity.y -= deltaTime * 0.01;
      } else if (p.type === 'magma') {
        p.velocity.multiplyScalar(0.995);
      }

      const lifeRatio = p.life / p.maxLife;

      if (p.type === 'magma') {
        const startColor = new THREE.Color('#FF4500');
        const endColor = new THREE.Color('#8B0000');
        p.color.copy(startColor).lerp(endColor, lifeRatio);
        p.size = 0.3 * (1 - lifeRatio);
      } else {
        p.color.setHSL(0.05 + lifeRatio * 0.05, 1, 0.5 - lifeRatio * 0.3);
      }
    }

    const displayCount = Math.min(this.particles.length, this.MAX_PARTICLES);
    for (let i = 0; i < this.MAX_PARTICLES; i++) {
      if (i < displayCount) {
        const p = this.particles[i];
        posArr[i * 3] = p.position.x;
        posArr[i * 3 + 1] = p.position.y;
        posArr[i * 3 + 2] = p.position.z;
        colArr[i * 3] = p.color.r;
        colArr[i * 3 + 1] = p.color.g;
        colArr[i * 3 + 2] = p.color.b;
        sizeArr[i] = p.size;
      } else {
        posArr[i * 3] = 0;
        posArr[i * 3 + 1] = -1000;
        posArr[i * 3 + 2] = 0;
        sizeArr[i] = 0;
      }
    }

    positions.needsUpdate = true;
    colors.needsUpdate = true;
    sizes.needsUpdate = true;
    this.particleGeometry.setDrawRange(0, displayCount);
  }

  private getPlateCenter(plate: PlateData): THREE.Vector3 {
    const positions = plate.currentPositions;
    let cx = 0, cy = 0, cz = 0;
    const count = positions.length / 3;
    for (let i = 0; i < positions.length; i += 3) {
      cx += positions[i];
      cy += positions[i + 1];
      cz += positions[i + 2];
    }
    return new THREE.Vector3(cx / count, cy / count, cz / count);
  }

  private getPlateDistance(plateA: PlateData, plateB: PlateData): number {
    return this.getPlateCenter(plateA).distanceTo(this.getPlateCenter(plateB));
  }

  private getContactPoint(plateA: PlateData, plateB: PlateData): THREE.Vector3 {
    const positionsA = plateA.currentPositions;
    const positionsB = plateB.currentPositions;
    let minDist = Infinity;
    let contactPoint = new THREE.Vector3();

    for (let a = 0; a < positionsA.length; a += 3) {
      for (let b = 0; b < positionsB.length; b += 3) {
        const dx = positionsA[a] - positionsB[b];
        const dy = positionsA[a + 1] - positionsB[b + 1];
        const dz = positionsA[a + 2] - positionsB[b + 2];
        const d = Math.sqrt(dx * dx + dy * dy + dz * dz);
        if (d < minDist) {
          minDist = d;
          contactPoint.set(
            (positionsA[a] + positionsB[b]) / 2,
            (positionsA[a + 1] + positionsB[b + 1]) / 2,
            (positionsA[a + 2] + positionsB[b + 2]) / 2
          );
        }
      }
    }

    return contactPoint;
  }

  public clearAll(): void {
    this.particles = [];
    const positions = this.particleGeometry.getAttribute('position') as THREE.BufferAttribute;
    const sizes = this.particleGeometry.getAttribute('size') as THREE.BufferAttribute;
    const posArr = positions.array as Float32Array;
    const sizeArr = sizes.array as Float32Array;

    for (let i = 0; i < this.MAX_PARTICLES; i++) {
      posArr[i * 3 + 1] = -1000;
      sizeArr[i] = 0;
    }
    positions.needsUpdate = true;
    sizes.needsUpdate = true;
    this.particleGeometry.setDrawRange(0, 0);
    this.lastEventFrame.clear();
  }

  public dispose(): void {
    this.clearAll();
    this.particleGeometry.dispose();
    this.particleMaterial.dispose();
    this.scene.remove(this.effectsGroup);
  }
}
