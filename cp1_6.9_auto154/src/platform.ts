import * as THREE from 'three';

interface PlatformRing {
  group: THREE.Group;
  mesh: THREE.Mesh;
  border: THREE.Mesh;
  glowMesh: THREE.Mesh;
  diameter: number;
  y: number;
  rotationSpeed: number;
}

interface Ripple {
  mesh: THREE.Mesh;
  life: number;
  maxLife: number;
  platformIndex: number;
  startRadius: number;
  endRadius: number;
  baseScale: number;
}

const MAX_RIPPLES = 200;
const BASE_RIPPLE_INNER = 0.9;
const BASE_RIPPLE_OUTER = 1.0;

export class PlatformSystem {
  private scene: THREE.Scene;
  private platforms: PlatformRing[] = [];
  private platformYs: number[] = [];
  private platformRadii: number[] = [];
  private ripplePool: Ripple[] = [];

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.createPlatforms();
    this.createRipplePool();
  }

  private createPlatforms(): void {
    const configs = [
      { diameter: 6, y: 3, rotationSpeed: 0.003 },
      { diameter: 8, y: 0.5, rotationSpeed: 0.005 },
      { diameter: 10, y: -2, rotationSpeed: 0.007 }
    ];

    configs.forEach((cfg, index) => {
      const group = new THREE.Group();
      const radius = cfg.diameter / 2;

      const platformGeo = new THREE.RingGeometry(radius * 0.85, radius, 96, 1);
      const platformMat = new THREE.MeshBasicMaterial({
        color: 0x88ddff,
        transparent: true,
        opacity: 0.67,
        side: THREE.DoubleSide,
        depthWrite: false,
        blending: THREE.AdditiveBlending
      });
      const platformMesh = new THREE.Mesh(platformGeo, platformMat);
      platformMesh.rotation.x = -Math.PI / 2;
      group.add(platformMesh);

      const borderGeo = new THREE.TorusGeometry(radius, 0.05, 16, 128);
      const borderMat = new THREE.MeshBasicMaterial({
        color: 0xaae0ff,
        transparent: true,
        opacity: 0.9,
        depthWrite: false,
        blending: THREE.AdditiveBlending
      });
      const borderMesh = new THREE.Mesh(borderGeo, borderMat);
      borderMesh.rotation.x = -Math.PI / 2;
      group.add(borderMesh);

      const glowGeo = new THREE.RingGeometry(radius * 0.8, radius * 1.05, 96, 1);
      const glowMat = new THREE.MeshBasicMaterial({
        color: 0xaae0ff,
        transparent: true,
        opacity: 0.15,
        side: THREE.DoubleSide,
        depthWrite: false,
        blending: THREE.AdditiveBlending
      });
      const glowMesh = new THREE.Mesh(glowGeo, glowMat);
      glowMesh.rotation.x = -Math.PI / 2;
      glowMesh.position.y = 0.01;
      group.add(glowMesh);

      group.position.y = cfg.y;
      this.scene.add(group);

      this.platforms.push({
        group,
        mesh: platformMesh,
        border: borderMesh,
        glowMesh,
        diameter: cfg.diameter,
        y: cfg.y,
        rotationSpeed: cfg.rotationSpeed
      });
      this.platformYs.push(cfg.y);
      this.platformRadii.push(radius);
    });
  }

  private createRipplePool(): void {
    const baseGeo = new THREE.RingGeometry(BASE_RIPPLE_INNER, BASE_RIPPLE_OUTER, 32, 1);
    for (let i = 0; i < MAX_RIPPLES; i++) {
      const mat = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0,
        side: THREE.DoubleSide,
        depthWrite: false,
        blending: THREE.AdditiveBlending
      });
      const mesh = new THREE.Mesh(baseGeo.clone(), mat);
      mesh.rotation.x = -Math.PI / 2;
      mesh.visible = false;
      this.scene.add(mesh);
      this.ripplePool.push({
        mesh,
        life: 0,
        maxLife: 1,
        platformIndex: 0,
        startRadius: 0.2,
        endRadius: 2,
        baseScale: 1
      });
    }
  }

  private spawnRipple(x: number, z: number, platformIndex: number, baseColor: THREE.Color): void {
    const ripple = this.ripplePool.find(r => !r.mesh.visible);
    if (!ripple) return;

    const radius = this.platformRadii[platformIndex];
    const distFromCenter = Math.sqrt(x * x + z * z);
    ripple.startRadius = 0.2;
    ripple.endRadius = Math.min(1.8, radius - distFromCenter - 0.3);
    if (ripple.endRadius < 0.5) ripple.endRadius = 0.5;

    ripple.baseScale = ripple.startRadius / BASE_RIPPLE_OUTER;
    ripple.mesh.scale.set(ripple.baseScale, ripple.baseScale, ripple.baseScale);

    ripple.platformIndex = platformIndex;
    ripple.life = 0;
    ripple.maxLife = 0.5 + Math.random() * 0.3;

    const mat = ripple.mesh.material as THREE.MeshBasicMaterial;
    mat.color.copy(baseColor);
    mat.opacity = 0.8;
    ripple.mesh.position.set(x, this.platformYs[platformIndex] + 0.05, z);
    ripple.mesh.visible = true;
  }

  public checkCollision(pos: THREE.Vector3, vel: THREE.Vector3): boolean {
    if (vel.y > 0) return false;

    for (let i = 0; i < this.platformYs.length; i++) {
      const py = this.platformYs[i];
      const pr = this.platformRadii[i];
      const innerR = pr * 0.85;

      if (pos.y <= py + 0.1 && pos.y >= py - 0.15) {
        const dx = pos.x;
        const dz = pos.z;
        const dist = Math.sqrt(dx * dx + dz * dz);
        if (dist >= innerR && dist <= pr + 0.1) {
          return true;
        }
      }
    }
    return false;
  }

  public handleCollision(position: THREE.Vector3, color: THREE.Color): void {
    for (let i = 0; i < this.platformYs.length; i++) {
      const py = this.platformYs[i];
      const pr = this.platformRadii[i];
      const innerR = pr * 0.85;

      if (Math.abs(position.y - py) < 0.2) {
        const dist = Math.sqrt(position.x * position.x + position.z * position.z);
        if (dist >= innerR - 0.1 && dist <= pr + 0.2) {
          this.spawnRipple(position.x, position.z, i, color);
          break;
        }
      }
    }
  }

  public update(dt: number): void {
    for (const p of this.platforms) {
      p.group.rotation.y += p.rotationSpeed;
    }

    for (const ripple of this.ripplePool) {
      if (!ripple.mesh.visible) continue;
      ripple.life += dt;
      const t = ripple.life / ripple.maxLife;
      if (t >= 1) {
        ripple.mesh.visible = false;
        (ripple.mesh.material as THREE.MeshBasicMaterial).opacity = 0;
        continue;
      }
      const currentRadius = ripple.startRadius + (ripple.endRadius - ripple.startRadius) * t;
      const scale = currentRadius / BASE_RIPPLE_OUTER;
      ripple.mesh.scale.set(scale, scale, scale);
      const mat = ripple.mesh.material as THREE.MeshBasicMaterial;
      mat.opacity = 0.9 * (1 - t);
    }
  }

  public dispose(): void {
    for (const p of this.platforms) {
      p.mesh.geometry.dispose();
      (p.mesh.material as THREE.Material).dispose();
      p.border.geometry.dispose();
      (p.border.material as THREE.Material).dispose();
      p.glowMesh.geometry.dispose();
      (p.glowMesh.material as THREE.Material).dispose();
      this.scene.remove(p.group);
    }
    for (const r of this.ripplePool) {
      r.mesh.geometry.dispose();
      (r.mesh.material as THREE.Material).dispose();
      this.scene.remove(r.mesh);
    }
  }
}
