import * as THREE from 'three';
import { Sandglass } from './sandglass';

const PARTICLE_COLORS = [
  new THREE.Color(0xffaa88),
  new THREE.Color(0x88ccff),
  new THREE.Color(0xddaaff),
  new THREE.Color(0xaaff88),
  new THREE.Color(0xffdd88)
];

interface SandParticle {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  color: THREE.Color;
  mesh: THREE.Mesh;
  inLocal: THREE.Vector3;
  prevInLocal: THREE.Vector3;
}

interface GlowParticle {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  life: number;
  maxLife: number;
  mesh: THREE.Mesh;
  active: boolean;
}

export class ParticleSystem {
  public group: THREE.Group;
  public sandParticles: SandParticle[] = [];
  public glowParticles: GlowParticle[] = [];
  public readonly totalSandCount: number = 2000;
  private readonly maxGlowCount: number = 200;
  private glowPool: GlowParticle[] = [];

  private readonly particleRadius: number = 0.04;
  private readonly glowRadius: number = 0.08;
  private readonly glowMaxLife: number = 0.5;

  private topDepositHeight: number = 0;
  private bottomDepositHeight: number = 0;
  private frameCounter: number = 0;
  private depositAccumulator: number = 0;
  private readonly depositCheckInterval: number = 10;
  private readonly maxDepositPerSecond: number = 0.05;

  private tempVecA: THREE.Vector3 = new THREE.Vector3();
  private tempVecB: THREE.Vector3 = new THREE.Vector3();

  constructor() {
    this.group = new THREE.Group();
    this.initSandParticles();
    this.initGlowPool();
  }

  private randomColor(): THREE.Color {
    const idx = Math.floor(Math.random() * PARTICLE_COLORS.length);
    return PARTICLE_COLORS[idx].clone();
  }

  private randomPointInTopHemisphere(): THREE.Vector3 {
    const p = new THREE.Vector3();
    while (true) {
      p.set(
        (Math.random() * 2 - 1) * 1.8,
        0.5 + Math.random() * 1.8,
        (Math.random() * 2 - 1) * 1.8
      );
      const dy = p.y - 0.5;
      if (p.x * p.x + p.z * p.z + dy * dy < 3.2) return p;
    }
  }

  private initSandParticles(): void {
    const geo = new THREE.SphereGeometry(this.particleRadius, 8, 8);

    for (let i = 0; i < this.totalSandCount; i++) {
      const color = this.randomColor();
      const mat = new THREE.MeshStandardMaterial({
        color: color,
        emissive: color,
        emissiveIntensity: 0.6,
        metalness: 0.2,
        roughness: 0.3
      });
      const mesh = new THREE.Mesh(geo, mat);
      const pos = this.randomPointInTopHemisphere();
      mesh.position.copy(pos);

      const particle: SandParticle = {
        position: pos.clone(),
        velocity: new THREE.Vector3(
          (Math.random() - 0.5) * 0.005,
          0,
          (Math.random() - 0.5) * 0.005
        ),
        color: color,
        mesh: mesh,
        inLocal: pos.clone(),
        prevInLocal: pos.clone()
      };

      this.sandParticles.push(particle);
      this.group.add(mesh);
    }
  }

  private initGlowPool(): void {
    const geo = new THREE.SphereGeometry(this.glowRadius, 8, 8);
    for (let i = 0; i < this.maxGlowCount; i++) {
      const mat = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.visible = false;
      const glow: GlowParticle = {
        position: new THREE.Vector3(),
        velocity: new THREE.Vector3(),
        life: 0,
        maxLife: this.glowMaxLife,
        mesh: mesh,
        active: false
      };
      this.glowPool.push(glow);
      this.glowParticles.push(glow);
      this.group.add(mesh);
    }
  }

  public resetAllColors(): void {
    for (const p of this.sandParticles) {
      const newColor = this.randomColor();
      p.color.copy(newColor);
      const mat = p.mesh.material as THREE.MeshStandardMaterial;
      mat.color.copy(newColor);
      mat.emissive.copy(newColor);
    }
    this.clearGlowParticles();
  }

  public clearGlowParticles(): void {
    for (const g of this.glowPool) {
      g.active = false;
      g.life = 0;
      g.mesh.visible = false;
      (g.mesh.material as THREE.MeshBasicMaterial).opacity = 0;
    }
  }

  private spawnGlowParticle(worldPos: THREE.Vector3, baseColor: THREE.Color): void {
    let glow: GlowParticle | null = null;

    for (const g of this.glowPool) {
      if (!g.active) {
        glow = g;
        break;
      }
    }

    if (!glow) {
      let oldestTime = Infinity;
      for (const g of this.glowPool) {
        const age = g.maxLife - g.life;
        if (age < oldestTime) {
          oldestTime = age;
          glow = g;
        }
      }
    }

    if (!glow) return;

    glow.active = true;
    glow.life = glow.maxLife;
    glow.position.copy(worldPos);
    const angle = Math.random() * Math.PI * 2;
    const speed = 0.3 / glow.maxLife * (0.5 + Math.random() * 0.5);
    glow.velocity.set(
      Math.cos(angle) * speed * (Math.random() * 0.5 + 0.5),
      (Math.random() - 0.5) * speed,
      Math.sin(angle) * speed * (Math.random() * 0.5 + 0.5)
    );

    const glowColor = baseColor.clone().lerp(new THREE.Color(0xffffff), 0.5);
    const mat = glow.mesh.material as THREE.MeshBasicMaterial;
    mat.color.copy(glowColor);
    mat.opacity = 0.8;
    glow.mesh.visible = true;
    glow.mesh.position.copy(worldPos);
  }

  public update(dt: number, sandglass: Sandglass): void {
    this.updateGlowParticles(dt);
    this.updateSandParticles(dt, sandglass);
    this.updateDepositHeights(dt, sandglass);
  }

  private updateGlowParticles(dt: number): void {
    for (const g of this.glowPool) {
      if (!g.active) continue;

      g.life -= dt;
      if (g.life <= 0) {
        g.active = false;
        g.mesh.visible = false;
        (g.mesh.material as THREE.MeshBasicMaterial).opacity = 0;
        continue;
      }

      g.position.addScaledVector(g.velocity, dt);
      g.mesh.position.copy(g.position);
      const t = g.life / g.maxLife;
      (g.mesh.material as THREE.MeshBasicMaterial).opacity = 0.8 * t;
      const scale = 1 + (1 - t) * 0.5;
      g.mesh.scale.setScalar(scale);
    }
  }

  private updateSandParticles(dt: number, sandglass: Sandglass): void {
    const worldGravity = sandglass.getWorldGravity();
    const invQuat = sandglass.group.quaternion.clone().invert();
    const objQuat = sandglass.group.quaternion.clone();

    for (let i = 0; i < this.sandParticles.length; i++) {
      const p = this.sandParticles[i];

      p.velocity.add(worldGravity);
      p.velocity.multiplyScalar(0.985);

      const speed2 = p.velocity.lengthSq();
      const maxSpeed2 = 0.0016;
      if (speed2 > maxSpeed2) {
        p.velocity.multiplyScalar(Math.sqrt(maxSpeed2 / speed2));
      }

      p.position.addScaledVector(p.velocity, 1);

      this.tempVecA.copy(p.position);
      this.tempVecA.applyQuaternion(invQuat);

      const { collided, normal } = sandglass.constrainToSandglass(this.tempVecA, this.tempVecB.copy(p.velocity).applyQuaternion(invQuat));

      if (collided && normal) {
        const worldNormal = normal.clone().applyQuaternion(objQuat);
        const vn = p.velocity.dot(worldNormal);
        if (vn > 0) {
          p.velocity.sub(worldNormal.multiplyScalar(vn * 1.3));
        }
        p.velocity.addScaledVector(worldNormal, (Math.random() - 0.5) * 0.002);
        p.velocity.addScaledVector(new THREE.Vector3(
          (Math.random() - 0.5),
          (Math.random() - 0.5),
          (Math.random() - 0.5)
        ).normalize(), 0.001);

        if (Math.random() < 0.3 && vn > 0.01) {
          const worldPos = this.tempVecA.clone().applyQuaternion(objQuat);
          this.spawnGlowParticle(worldPos, p.color);
        }
      }

      this.tempVecA.applyQuaternion(objQuat);
      p.position.copy(this.tempVecA);
      p.mesh.position.copy(p.position);
    }
  }

  private updateDepositHeights(dt: number, sandglass: Sandglass): void {
    this.frameCounter++;
    this.depositAccumulator += dt;

    if (this.frameCounter % this.depositCheckInterval === 0) {
      let topCount = 0;
      let bottomCount = 0;
      const invQuat = sandglass.group.quaternion.clone().invert();

      for (const p of this.sandParticles) {
        this.tempVecA.copy(p.position).applyQuaternion(invQuat);
        if (this.tempVecA.y > 0) {
          topCount++;
        } else {
          bottomCount++;
        }
      }

      const maxDeposit = 1.8;
      const targetTop = Math.min(maxDeposit, (topCount / this.totalSandCount) * maxDeposit);
      const targetBottom = Math.min(maxDeposit, (bottomCount / this.totalSandCount) * maxDeposit);

      const maxDelta = this.maxDepositPerSecond * this.depositAccumulator;

      if (Math.abs(targetTop - this.topDepositHeight) > maxDelta) {
        this.topDepositHeight += Math.sign(targetTop - this.topDepositHeight) * maxDelta;
      } else {
        this.topDepositHeight = targetTop;
      }
      if (Math.abs(targetBottom - this.bottomDepositHeight) > maxDelta) {
        this.bottomDepositHeight += Math.sign(targetBottom - this.bottomDepositHeight) * maxDelta;
      } else {
        this.bottomDepositHeight = targetBottom;
      }

      this.depositAccumulator = 0;
    }
  }

  public getActiveGlowCount(): number {
    let count = 0;
    for (const g of this.glowPool) {
      if (g.active) count++;
    }
    return count;
  }
}
