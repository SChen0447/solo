import * as THREE from 'three';
import { VolcanoState, ParticleData } from './types';

interface SmokeParticle extends ParticleData {
  driftPhase: number;
}

interface LavaParticle extends ParticleData {
  pathProgress: number;
  pathIndex: number;
}

interface SteamParticle extends ParticleData {
  swayPhase: number;
}

interface LavaFlowPath {
  points: THREE.Vector3[];
  width: number;
}

export class PlumeSystem {
  private scene: THREE.Scene;
  private getCraterPosition: () => THREE.Vector3;

  private smokeParticles: SmokeParticle[] = [];
  private lavaParticles: LavaParticle[] = [];
  private steamParticles: SteamParticle[] = [];
  private lavaTrails: ParticleData[] = [];

  private smokeMesh: THREE.Points;
  private lavaMesh: THREE.Points;
  private steamMesh: THREE.Points;
  private trailMesh: THREE.Points;

  private maxSmokeParticles = 500;
  private maxLavaParticles = 200;
  private maxSteamParticles = 50;
  private maxTrailParticles = 500;

  private lavaPaths: LavaFlowPath[] = [];
  private smokeEmitTimer = 0;
  private lavaEmitTimer = 0;
  private steamEmitTimer = 0;

  private gravity = 9.8;

  constructor(scene: THREE.Scene, getCraterPosition: () => THREE.Vector3) {
    this.scene = scene;
    this.getCraterPosition = getCraterPosition;

    this.smokeMesh = this.createParticleMesh(this.maxSmokeParticles, 0x444444, 0.6);
    this.lavaMesh = this.createParticleMesh(this.maxLavaParticles, 0xff6600, 0.9);
    this.steamMesh = this.createParticleMesh(this.maxSteamParticles, 0xffffff, 0.4);
    this.trailMesh = this.createParticleMesh(this.maxTrailParticles, 0xff4400, 0.6);

    scene.add(this.smokeMesh);
    scene.add(this.lavaMesh);
    scene.add(this.steamMesh);
    scene.add(this.trailMesh);

    this.generateLavaPaths();
    this.initParticleArrays();
  }

  private createParticleMesh(maxCount: number, color: number, opacity: number): THREE.Points {
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(maxCount * 3);
    const colors = new Float32Array(maxCount * 3);
    const sizes = new Float32Array(maxCount);
    const alphas = new Float32Array(maxCount);

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    geometry.setAttribute('alpha', new THREE.BufferAttribute(alphas, 1));

    const material = new THREE.PointsMaterial({
      size: 0.3,
      vertexColors: true,
      transparent: true,
      opacity: opacity,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    const mesh = new THREE.Points(geometry, material);
    mesh.frustumCulled = false;
    return mesh;
  }

  private initParticleArrays(): void {
    for (let i = 0; i < this.maxSmokeParticles; i++) {
      this.smokeParticles.push(this.createSmokeParticle(false));
    }
    for (let i = 0; i < this.maxLavaParticles; i++) {
      this.lavaParticles.push(this.createLavaParticle(false));
    }
    for (let i = 0; i < this.maxSteamParticles; i++) {
      this.steamParticles.push(this.createSteamParticle(false));
    }
    for (let i = 0; i < this.maxTrailParticles; i++) {
      this.lavaTrails.push(this.createTrailParticle(false));
    }
  }

  private createSmokeParticle(active: boolean = true): SmokeParticle {
    const crater = this.getCraterPosition();
    return {
      position: { x: crater.x, y: crater.y, z: crater.z },
      velocity: {
        x: (Math.random() - 0.5) * 0.3,
        y: 2 + Math.random() * 1.5,
        z: (Math.random() - 0.5) * 0.3
      },
      color: { r: 0.27, g: 0.27, b: 0.27 },
      size: 0.1,
      alpha: 0.8,
      life: 0,
      maxLife: 3,
      active: active,
      driftPhase: Math.random() * Math.PI * 2
    };
  }

  private createLavaParticle(active: boolean = true, pathIndex?: number): LavaParticle {
    const crater = this.getCraterPosition();
    const idx = pathIndex !== undefined ? pathIndex : Math.floor(Math.random() * this.lavaPaths.length);
    return {
      position: { x: crater.x, y: crater.y, z: crater.z },
      velocity: { x: 0, y: 0, z: 0 },
      color: { r: 1.0, g: 0.4, b: 0.0 },
      size: 0.15,
      alpha: 1.0,
      life: 0,
      maxLife: 6,
      active: active,
      pathProgress: 0,
      pathIndex: idx
    };
  }

  private createSteamParticle(active: boolean = true): SteamParticle {
    const crater = this.getCraterPosition();
    return {
      position: {
        x: crater.x + (Math.random() - 0.5) * 1.5,
        y: crater.y,
        z: crater.z + (Math.random() - 0.5) * 1.5
      },
      velocity: {
        x: (Math.random() - 0.5) * 0.2,
        y: 0.8 + Math.random() * 0.5,
        z: (Math.random() - 0.5) * 0.2
      },
      color: { r: 1.0, g: 1.0, b: 1.0 },
      size: 0.2,
      alpha: 0.5,
      life: 0,
      maxLife: 6,
      active: active,
      swayPhase: Math.random() * Math.PI * 2
    };
  }

  private createTrailParticle(active: boolean = true): ParticleData {
    return {
      position: { x: 0, y: 0, z: 0 },
      velocity: { x: 0, y: 0, z: 0 },
      color: { r: 1.0, g: 0.27, b: 0.0 },
      size: 0.1,
      alpha: 0.8,
      life: 0,
      maxLife: 3,
      active: active
    };
  }

  private generateLavaPaths(): void {
    this.lavaPaths = [];
    const pathCount = 5;
    const craterRadius = 1.2;

    for (let i = 0; i < pathCount; i++) {
      const startAngle = (i / pathCount) * Math.PI * 2 + (Math.random() - 0.5) * 0.5;
      const points: THREE.Vector3[] = [];
      const crater = this.getCraterPosition();

      const startX = crater.x + Math.cos(startAngle) * craterRadius * 0.8;
      const startZ = crater.z + Math.sin(startAngle) * craterRadius * 0.8;
      points.push(new THREE.Vector3(startX, crater.y - 0.1, startZ));

      let currentX = startX;
      let currentZ = startZ;
      const segments = 15;

      for (let j = 1; j <= segments; j++) {
        const t = j / segments;
        const radius = craterRadius + t * (3 - craterRadius);
        const angleOffset = (Math.random() - 0.5) * 0.6;
        const newAngle = startAngle + angleOffset * t;

        currentX = crater.x + Math.cos(newAngle) * radius;
        currentZ = crater.z + Math.sin(newAngle) * radius;

        const height = this.getVolcanoHeightAt(currentX, currentZ);
        points.push(new THREE.Vector3(currentX, height, currentZ));
      }

      this.lavaPaths.push({
        points: points,
        width: 0.2 + Math.random() * 0.3
      });
    }
  }

  private getVolcanoHeightAt(x: number, z: number): number {
    const dist = Math.sqrt(x * x + z * z);
    if (dist > 3) return 0;
    const heightFactor = 1 - dist / 3;
    return heightFactor * 3.5 * 0.95;
  }

  public resetFlowPaths(): void {
    this.generateLavaPaths();
  }

  public emitSmoke(intensity: number): void {
    this.smokeEmitTimer += intensity * 0.05;
    if (this.smokeEmitTimer >= 1) {
      this.smokeEmitTimer = 0;
      const count = Math.floor(intensity * 5) + 1;
      for (let i = 0; i < count; i++) {
        const inactive = this.smokeParticles.find(p => !p.active);
        if (inactive) {
          Object.assign(inactive, this.createSmokeParticle(true));
        }
      }
    }
  }

  public emitLava(intensity: number): void {
    this.lavaEmitTimer += intensity * 0.03;
    if (this.lavaEmitTimer >= 1) {
      this.lavaEmitTimer = 0;
      const count = Math.floor(intensity * 3) + 1;
      for (let i = 0; i < count; i++) {
        const inactive = this.lavaParticles.find(p => !p.active);
        if (inactive) {
          Object.assign(inactive, this.createLavaParticle(true));
        }
      }
    }
  }

  public emitSteam(intensity: number): void {
    this.steamEmitTimer += intensity * 0.02;
    if (this.steamEmitTimer >= 1) {
      this.steamEmitTimer = 0;
      const inactive = this.steamParticles.find(p => !p.active);
      if (inactive) {
        Object.assign(inactive, this.createSteamParticle(true));
      }
    }
  }

  public clearAll(): void {
    this.smokeParticles.forEach(p => p.active = false);
    this.lavaParticles.forEach(p => p.active = false);
    this.steamParticles.forEach(p => p.active = false);
    this.lavaTrails.forEach(p => p.active = false);
  }

  public update(deltaTime: number, state: VolcanoState, stateTimer: number): void {
    this.updateSmokeParticles(deltaTime);
    this.updateLavaParticles(deltaTime);
    this.updateSteamParticles(deltaTime);
    this.updateTrailParticles(deltaTime);

    this.updateMesh(this.smokeMesh, this.smokeParticles);
    this.updateMesh(this.lavaMesh, this.lavaParticles);
    this.updateMesh(this.steamMesh, this.steamParticles);
    this.updateMesh(this.trailMesh, this.lavaTrails);
  }

  private updateSmokeParticles(deltaTime: number): void {
    for (const p of this.smokeParticles) {
      if (!p.active) continue;

      p.life += deltaTime;
      if (p.life >= p.maxLife) {
        p.active = false;
        continue;
      }

      const lifeRatio = p.life / p.maxLife;
      p.driftPhase += deltaTime * 2;

      p.velocity.x += Math.sin(p.driftPhase) * deltaTime * 0.5;
      p.velocity.z += Math.cos(p.driftPhase) * deltaTime * 0.5;
      p.velocity.y -= this.gravity * deltaTime * 0.1;

      p.position.x += p.velocity.x * deltaTime;
      p.position.y += p.velocity.y * deltaTime;
      p.position.z += p.velocity.z * deltaTime;

      p.size = 0.1 + lifeRatio * 0.7;
      p.alpha = 0.8 * (1 - lifeRatio * 0.9);

      const grayLevel = 0.27 + lifeRatio * 0.2;
      p.color.r = grayLevel;
      p.color.g = grayLevel;
      p.color.b = grayLevel;
    }
  }

  private updateLavaParticles(deltaTime: number): void {
    const flowSpeed = 0.5;

    for (const p of this.lavaParticles) {
      if (!p.active) continue;

      p.life += deltaTime;
      if (p.life >= p.maxLife) {
        p.active = false;
        continue;
      }

      const path = this.lavaPaths[p.pathIndex];
      if (!path) {
        p.active = false;
        continue;
      }

      p.pathProgress += (deltaTime * flowSpeed) / 10;

      if (p.pathProgress >= 1) {
        p.active = false;
        continue;
      }

      const pointIndex = Math.floor(p.pathProgress * (path.points.length - 1));
      const localT = (p.pathProgress * (path.points.length - 1)) % 1;

      const p1 = path.points[Math.min(pointIndex, path.points.length - 1)];
      const p2 = path.points[Math.min(pointIndex + 1, path.points.length - 1)];

      const widthOffset = (Math.random() - 0.5) * path.width;
      const perpAngle = Math.atan2(p2.z - p1.z, p2.x - p1.x) + Math.PI / 2;

      p.position.x = THREE.MathUtils.lerp(p1.x, p2.x, localT) + Math.cos(perpAngle) * widthOffset;
      p.position.y = THREE.MathUtils.lerp(p1.y, p2.y, localT) - 0.05;
      p.position.z = THREE.MathUtils.lerp(p1.z, p2.z, localT) + Math.sin(perpAngle) * widthOffset;

      const lifeRatio = p.life / p.maxLife;
      p.color.r = 1.0 - lifeRatio * 0.5;
      p.color.g = 0.4 - lifeRatio * 0.35;
      p.color.b = 0.0;
      p.alpha = 1.0 - lifeRatio * 0.7;

      if (Math.random() < 0.3) {
        this.leaveTrail(p);
      }
    }
  }

  private leaveTrail(lavaParticle: LavaParticle): void {
    const inactive = this.lavaTrails.find(p => !p.active);
    if (inactive) {
      inactive.active = true;
      inactive.life = 0;
      inactive.position.x = lavaParticle.position.x;
      inactive.position.y = lavaParticle.position.y;
      inactive.position.z = lavaParticle.position.z;
      inactive.color.r = lavaParticle.color.r;
      inactive.color.g = lavaParticle.color.g;
      inactive.color.b = lavaParticle.color.b;
      inactive.alpha = 0.8;
    }
  }

  private updateSteamParticles(deltaTime: number): void {
    for (const p of this.steamParticles) {
      if (!p.active) continue;

      p.life += deltaTime;
      if (p.life >= p.maxLife) {
        p.active = false;
        continue;
      }

      const lifeRatio = p.life / p.maxLife;
      p.swayPhase += deltaTime * 1.5;

      p.position.x += p.velocity.x * deltaTime + Math.sin(p.swayPhase) * deltaTime * 0.3;
      p.position.y += p.velocity.y * deltaTime;
      p.position.z += p.velocity.z * deltaTime + Math.cos(p.swayPhase) * deltaTime * 0.3;

      p.size = 0.2 + lifeRatio * 0.3;
      p.alpha = 0.5 * (1 - lifeRatio * 0.8);
    }
  }

  private updateTrailParticles(deltaTime: number): void {
    for (const p of this.lavaTrails) {
      if (!p.active) continue;

      p.life += deltaTime;
      if (p.life >= p.maxLife) {
        p.active = false;
        continue;
      }

      const lifeRatio = p.life / p.maxLife;
      p.alpha = 0.8 * (1 - lifeRatio);
      p.color.r = Math.max(0.2, p.color.r - deltaTime * 0.2);
      p.color.g = Math.max(0.1, p.color.g - deltaTime * 0.15);
    }
  }

  private updateMesh(mesh: THREE.Points, particles: ParticleData[]): void {
    const positions = mesh.geometry.attributes.position.array as Float32Array;
    const colors = mesh.geometry.attributes.color.array as Float32Array;
    const sizes = mesh.geometry.attributes.size.array as Float32Array;
    const alphas = mesh.geometry.attributes.alpha.array as Float32Array;

    let activeCount = 0;

    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      if (p.active) {
        positions[i * 3] = p.position.x;
        positions[i * 3 + 1] = p.position.y;
        positions[i * 3 + 2] = p.position.z;
        colors[i * 3] = p.color.r;
        colors[i * 3 + 1] = p.color.g;
        colors[i * 3 + 2] = p.color.b;
        sizes[i] = p.size;
        alphas[i] = p.alpha;
        activeCount++;
      } else {
        alphas[i] = 0;
      }
    }

    mesh.geometry.attributes.position.needsUpdate = true;
    mesh.geometry.attributes.color.needsUpdate = true;
    mesh.geometry.attributes.size.needsUpdate = true;
    mesh.geometry.attributes.alpha.needsUpdate = true;
    mesh.geometry.setDrawRange(0, particles.length);
  }

  public dispose(): void {
    this.scene.remove(this.smokeMesh);
    this.scene.remove(this.lavaMesh);
    this.scene.remove(this.steamMesh);
    this.scene.remove(this.trailMesh);

    this.smokeMesh.geometry.dispose();
    (this.smokeMesh.material as THREE.Material).dispose();
    this.lavaMesh.geometry.dispose();
    (this.lavaMesh.material as THREE.Material).dispose();
    this.steamMesh.geometry.dispose();
    (this.steamMesh.material as THREE.Material).dispose();
    this.trailMesh.geometry.dispose();
    (this.trailMesh.material as THREE.Material).dispose();
  }
}
