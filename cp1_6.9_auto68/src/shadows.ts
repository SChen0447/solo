import * as THREE from 'three';
import { BLIND_COUNT, BLIND_GAP } from './blinds';

export const GROUND_SIZE = 5;
export const GROUND_Y = -2.5;

interface OverlapParticle {
  mesh: THREE.Mesh;
  velocity: THREE.Vector3;
  life: number;
  maxLife: number;
  active: boolean;
}

interface AtmosphereParticle {
  mesh: THREE.Mesh;
  velocity: THREE.Vector3;
  life: number;
  maxLife: number;
}

export interface ShadowsConfig {
  ground: THREE.Mesh;
  spotMeshes: THREE.Mesh[];
  overlapGroup: THREE.Group;
  atmosphereGroup: THREE.Group;
  spotCount: number;
}

export class ShadowsManager {
  public ground: THREE.Mesh;
  public group: THREE.Group = new THREE.Group();
  public spotGroup: THREE.Group = new THREE.Group();
  public overlapGroup: THREE.Group = new THREE.Group();
  public atmosphereGroup: THREE.Group = new THREE.Group();

  private spotMeshes: THREE.Mesh[] = [];
  private overlapParticles: OverlapParticle[] = [];
  private maxOverlapParticles: number = 150;
  private atmosphereParticles: AtmosphereParticle[] = [];
  private maxAtmosphereParticles: number = 200;
  private lastOverlapSpawn: number = 0;
  private atmosphereResetTimer: number = 0;
  private groundY: number = GROUND_Y;

  constructor() {
    const groundGeom = new THREE.PlaneGeometry(GROUND_SIZE, GROUND_SIZE);
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x2a2a2a,
      transparent: true,
      opacity: 0.6,
      roughness: 0.8,
      metalness: 0.1,
      side: THREE.DoubleSide
    });
    this.ground = new THREE.Mesh(groundGeom, groundMat);
    this.ground.rotation.x = -Math.PI / 2;
    this.ground.position.y = this.groundY;
    this.ground.receiveShadow = true;

    this.group.add(this.ground);
    this.group.add(this.spotGroup);
    this.group.add(this.overlapGroup);
    this.group.add(this.atmosphereGroup);

    this.initSpots();
    this.initAtmosphereParticles();
    this.initOverlapParticlePool();
  }

  private initSpots(): void {
    for (let i = 0; i < BLIND_COUNT; i++) {
      const geom = new THREE.CircleGeometry(0.3, 32);
      const mat = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      });
      const mesh = new THREE.Mesh(geom, mat);
      mesh.rotation.x = -Math.PI / 2;
      mesh.position.y = this.groundY + 0.01;
      this.spotGroup.add(mesh);
      this.spotMeshes.push(mesh);
    }
  }

  private initAtmosphereParticles(): void {
    for (let i = 0; i < this.maxAtmosphereParticles; i++) {
      const radius = THREE.MathUtils.randFloat(0.005, 0.02);
      const geom = new THREE.SphereGeometry(radius, 6, 6);
      const isPink = Math.random() > 0.5;
      const color = isPink
        ? new THREE.Color().setHSL(THREE.MathUtils.randFloat(0.85, 0.95), 0.6, 0.8)
        : new THREE.Color().setHSL(THREE.MathUtils.randFloat(0.55, 0.65), 0.6, 0.8);
      const mat = new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: THREE.MathUtils.randFloat(0.1, 0.3),
        depthWrite: false
      });
      const mesh = new THREE.Mesh(geom, mat);
      this.resetAtmosphereParticle(mesh);

      const velocity = new THREE.Vector3(
        THREE.MathUtils.randFloat(-0.05, 0.05),
        THREE.MathUtils.randFloat(-0.03, 0.03),
        THREE.MathUtils.randFloat(-0.05, 0.05)
      );

      this.atmosphereGroup.add(mesh);
      this.atmosphereParticles.push({
        mesh,
        velocity,
        life: 0,
        maxLife: THREE.MathUtils.randFloat(2, 4)
      });
    }
  }

  private resetAtmosphereParticle(mesh: THREE.Mesh): void {
    mesh.position.set(
      THREE.MathUtils.randFloat(-3, 3),
      THREE.MathUtils.randFloat(-2, 2),
      THREE.MathUtils.randFloat(-2, 2)
    );
  }

  private initOverlapParticlePool(): void {
    for (let i = 0; i < this.maxOverlapParticles; i++) {
      const geom = new THREE.SphereGeometry(0.03, 8, 8);
      const mat = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0,
        depthWrite: false
      });
      const mesh = new THREE.Mesh(geom, mat);
      mesh.visible = false;
      this.overlapGroup.add(mesh);
      this.overlapParticles.push({
        mesh,
        velocity: new THREE.Vector3(),
        life: 0,
        maxLife: 2,
        active: false
      });
    }
  }

  public setMaxOverlapParticles(count: number): void {
    this.maxOverlapParticles = Math.min(count, this.overlapParticles.length);
  }

  public updateSpots(
    lightPos: THREE.Vector3,
    spotSize: number,
    blindColors: THREE.Color[],
    blindAngleRad: number
  ): void {
    for (let i = 0; i < this.spotMeshes.length; i++) {
      const mesh = this.spotMeshes[i];
      const blindY = ((BLIND_COUNT - 1) * BLIND_GAP) / 2 - i * BLIND_GAP;

      const dz = lightPos.z - 0;
      const ratio = (0 - this.groundY) / (lightPos.y - blindY + 0.001);
      const targetX = lightPos.x + (0 - lightPos.x) * ratio * 0.5;
      const spotY = blindY + (this.groundY - blindY) * 0.3;

      const distFactor = Math.max(0.2, 1 - Math.abs(dz - 4) / 8);
      const angleOpen = Math.abs(Math.cos(blindAngleRad));

      mesh.position.x = THREE.MathUtils.lerp(mesh.position.x, targetX, 0.15);
      mesh.position.z = THREE.MathUtils.lerp(mesh.position.z, spotY * 0.1, 0.15);
      mesh.scale.setScalar(THREE.MathUtils.lerp(mesh.scale.x, spotSize * distFactor, 0.15));

      const mat = mesh.material as THREE.MeshBasicMaterial;
      if (blindColors[i]) {
        mat.color.copy(blindColors[i]);
      }
      mat.opacity = THREE.MathUtils.lerp(mat.opacity, 0.35 * angleOpen * distFactor, 0.1);
    }
  }

  private spawnOverlapParticles(blindColors: THREE.Color[]): void {
    const now = performance.now();
    if (now - this.lastOverlapSpawn < 200) return;
    this.lastOverlapSpawn = now;

    const activePositions: THREE.Vector3[] = [];
    const activeColors: THREE.Color[] = [];

    for (let i = 0; i < this.spotMeshes.length; i++) {
      const mat = this.spotMeshes[i].material as THREE.MeshBasicMaterial;
      if (mat.opacity > 0.1) {
        activePositions.push(this.spotMeshes[i].position.clone());
        if (blindColors[i]) activeColors.push(blindColors[i].clone());
      }
    }

    if (activePositions.length < 2) return;

    let spawnCount = 0;
    const maxSpawnPerFrame = 12;

    for (let i = 0; i < activePositions.length && spawnCount < maxSpawnPerFrame; i++) {
      for (let j = i + 1; j < activePositions.length && spawnCount < maxSpawnPerFrame; j++) {
        const dist = activePositions[i].distanceTo(activePositions[j]);
        if (dist < 0.6) {
          const mid = new THREE.Vector3().addVectors(activePositions[i], activePositions[j]).multiplyScalar(0.5);
          const mixColor = new THREE.Color().addColors(activeColors[i], activeColors[j]).multiplyScalar(0.5);
          this.spawnParticleAt(mid, mixColor);
          spawnCount++;
        }
      }
    }
  }

  private spawnParticleAt(pos: THREE.Vector3, color: THREE.Color): void {
    for (const p of this.overlapParticles) {
      if (!p.active) {
        p.active = true;
        p.life = p.maxLife;
        p.mesh.visible = true;
        p.mesh.position.copy(pos);
        p.mesh.position.y = this.groundY + 0.02;
        const mat = p.mesh.material as THREE.MeshBasicMaterial;
        mat.color.copy(color);
        mat.opacity = THREE.MathUtils.randFloat(0.5, 1.0);
        const angle = Math.random() * Math.PI * 2;
        const speed = THREE.MathUtils.randFloat(0.1, 0.4);
        p.velocity.set(
          Math.cos(angle) * speed,
          THREE.MathUtils.randFloat(0.05, 0.2),
          Math.sin(angle) * speed
        );
        break;
      }
    }
  }

  public updateOverlapParticles(deltaTime: number, blindColors: THREE.Color[]): void {
    this.spawnOverlapParticles(blindColors);

    for (const p of this.overlapParticles) {
      if (!p.active) continue;
      p.life -= deltaTime;
      if (p.life <= 0) {
        p.active = false;
        p.mesh.visible = false;
        continue;
      }
      p.mesh.position.addScaledVector(p.velocity, deltaTime);
      p.velocity.y -= 0.3 * deltaTime;
      const mat = p.mesh.material as THREE.MeshBasicMaterial;
      mat.opacity = (p.life / p.maxLife) * THREE.MathUtils.randFloat(0.5, 1.0);
    }
  }

  public updateAtmosphereParticles(deltaTime: number): void {
    this.atmosphereResetTimer += deltaTime;

    if (this.atmosphereResetTimer >= 3) {
      this.atmosphereResetTimer = 0;
      for (const p of this.atmosphereParticles) {
        if (Math.random() < 0.3) {
          this.resetAtmosphereParticle(p.mesh);
        }
      }
    }

    for (const p of this.atmosphereParticles) {
      p.mesh.position.addScaledVector(p.velocity, deltaTime);
      p.life += deltaTime;
      if (p.life > p.maxLife) {
        p.life = 0;
        this.resetAtmosphereParticle(p.mesh);
      }
    }
  }

  public getActiveSpotCount(): number {
    let count = 0;
    for (const m of this.spotMeshes) {
      const mat = m.material as THREE.MeshBasicMaterial;
      if (mat.opacity > 0.08) count++;
    }
    return count;
  }

  public getConfig(): ShadowsConfig {
    return {
      ground: this.ground,
      spotMeshes: this.spotMeshes,
      overlapGroup: this.overlapGroup,
      atmosphereGroup: this.atmosphereGroup,
      spotCount: this.getActiveSpotCount()
    };
  }

  public dispose(): void {
    (this.ground.geometry as THREE.BufferGeometry).dispose();
    (this.ground.material as THREE.Material).dispose();
    for (const m of this.spotMeshes) {
      (m.geometry as THREE.BufferGeometry).dispose();
      (m.material as THREE.Material).dispose();
    }
    for (const p of this.overlapParticles) {
      (p.mesh.geometry as THREE.BufferGeometry).dispose();
      (p.mesh.material as THREE.Material).dispose();
    }
    for (const p of this.atmosphereParticles) {
      (p.mesh.geometry as THREE.BufferGeometry).dispose();
      (p.mesh.material as THREE.Material).dispose();
    }
  }
}
