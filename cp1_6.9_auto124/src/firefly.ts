import * as THREE from 'three';

export interface Meteor {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  active: boolean;
}

export class Firefly {
  public mesh: THREE.Group;
  public x: number = 0;
  public y: number = 0;
  public z: number = 0;
  public velocity: THREE.Vector3;
  public speed: number;
  public glowIntensity: number = 0.3;
  public isSelected: boolean = false;
  public homePosition: THREE.Vector3;

  private core: THREE.Mesh;
  private glow: THREE.Mesh;
  private baseColor: THREE.Color = new THREE.Color(0xffdd44);
  private selectedColor: THREE.Color = new THREE.Color(0x00ff88);
  private coreMaterial: THREE.MeshBasicMaterial;
  private glowMaterial: THREE.ShaderMaterial;
  private directionChangeTimer: number = 0;
  private nextDirectionChange: number;
  private socialFlashTimer: number = 0;
  private isSocialFlashing: boolean = false;
  private socialPartner: Firefly | null = null;
  private meteorFollowTimer: number = 0;
  private isFollowingMeteor: boolean = false;
  private meteorDirection: THREE.Vector3 = new THREE.Vector3();
  private selectedTarget: THREE.Vector3 | null = null;
  private targetColor: THREE.Color;
  private currentColor: THREE.Color;
  private syncFlashOverride: boolean = false;
  private envBoost: number = 1.0;
  private radius: number;

  private static readonly SOCIAL_DISTANCE = 2.0;
  private static readonly SELECTED_SPEED = 2.0;
  private static readonly SOCIAL_SPEED = 1.5;

  constructor(homePosition: THREE.Vector3) {
    this.homePosition = homePosition.clone();
    this.radius = 0.03 + Math.random() * 0.02;
    this.speed = 0.3 + Math.random() * 0.5;
    this.nextDirectionChange = 2 + Math.random() * 1;
    this.targetColor = this.baseColor.clone();
    this.currentColor = this.baseColor.clone();

    this.velocity = new THREE.Vector3(
      (Math.random() - 0.5) * 2,
      (Math.random() - 0.5) * 2,
      (Math.random() - 0.5) * 2
    ).normalize();

    this.mesh = new THREE.Group();
    this.x = homePosition.x + (Math.random() - 0.5) * 2;
    this.y = homePosition.y + (Math.random() - 0.5) * 0.8;
    this.z = homePosition.z + (Math.random() - 0.5) * 2;
    this.mesh.position.set(this.x, this.y, this.z);

    const coreGeometry = new THREE.SphereGeometry(this.radius, 12, 12);
    this.coreMaterial = new THREE.MeshBasicMaterial({
      color: this.currentColor,
      transparent: true,
      opacity: 0.95
    });
    this.core = new THREE.Mesh(coreGeometry, this.coreMaterial);
    this.mesh.add(this.core);

    const glowGeometry = new THREE.SphereGeometry(this.radius * 3.5, 16, 16);
    this.glowMaterial = new THREE.ShaderMaterial({
      uniforms: {
        uColor: { value: new THREE.Color(this.currentColor) },
        uIntensity: { value: this.glowIntensity }
      },
      vertexShader: `
        varying vec3 vNormal;
        varying vec3 vPosition;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          vPosition = position;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 uColor;
        uniform float uIntensity;
        varying vec3 vNormal;
        varying vec3 vPosition;
        void main() {
          float d = length(vPosition) / ${(this.radius * 3.5).toFixed(3)};
          float glow = pow(1.0 - d, 2.0) * uIntensity;
          float fresnel = pow(1.0 - abs(dot(vNormal, vec3(0.0, 0.0, 1.0))), 2.5);
          float alpha = (glow * 0.7 + fresnel * 0.3) * uIntensity;
          gl_FragColor = vec4(uColor, clamp(alpha, 0.0, 0.9));
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.BackSide
    });
    this.glow = new THREE.Mesh(glowGeometry, this.glowMaterial);
    this.mesh.add(this.glow);
  }

  public setEnvironmentBoost(boost: number): void {
    this.envBoost = Math.min(1.3, Math.max(1.0, boost));
  }

  public setSyncFlash(intensity: number | null): void {
    if (intensity === null) {
      this.syncFlashOverride = false;
    } else {
      this.syncFlashOverride = true;
      this.glowIntensity = intensity;
    }
  }

  public select(): void {
    this.isSelected = true;
    this.targetColor = this.selectedColor.clone();
    this.glowIntensity = 1.0;
  }

  public deselect(): void {
    this.isSelected = false;
    this.targetColor = this.baseColor.clone();
    this.selectedTarget = null;
  }

  public setSelectedTarget(target: THREE.Vector3): void {
    this.selectedTarget = target.clone();
  }

  public startMeteorFollow(direction: THREE.Vector3): void {
    this.isFollowingMeteor = true;
    this.meteorFollowTimer = 2.0;
    this.meteorDirection.copy(direction).normalize();
  }

  public triggerSocialFlash(partner: Firefly): void {
    if (this.isSocialFlashing) return;
    this.isSocialFlashing = true;
    this.socialFlashTimer = 0.2;
    this.socialPartner = partner;
    this.glowIntensity = 1.0;
  }

  public update(
    deltaTime: number,
    neighbors: Firefly[],
    meteors: Meteor[],
    bounds: { minX: number; maxX: number; minY: number; maxY: number; minZ: number; maxZ: number },
    isSyncFlashing: boolean
  ): void {
    this.currentColor.lerp(this.targetColor, deltaTime * 4);
    this.coreMaterial.color.copy(this.currentColor);
    this.glowMaterial.uniforms.uColor.value.copy(this.currentColor);

    if (!isSyncFlashing && !this.syncFlashOverride) {
      if (this.isSocialFlashing) {
        this.socialFlashTimer -= deltaTime;
        if (this.socialFlashTimer <= 0) {
          this.isSocialFlashing = false;
          this.socialPartner = null;
          this.glowIntensity = 0.3;
        }
      } else if (!this.isSelected) {
        this.glowIntensity = 0.25 + Math.sin(performance.now() * 0.001 + this.x * 3) * 0.15;
      }
    }

    this.glowMaterial.uniforms.uIntensity.value = this.glowIntensity * this.envBoost;

    let effectiveSpeed = this.speed;
    let moveDir = this.velocity.clone().normalize();

    if (isSyncFlashing && !this.isSelected) {
      effectiveSpeed *= 0.5;
    }

    if (this.isSelected && this.selectedTarget) {
      const toTarget = new THREE.Vector3().subVectors(this.selectedTarget, new THREE.Vector3(this.x, this.y, this.z));
      const dist = toTarget.length();
      if (dist > 0.05) {
        moveDir.copy(toTarget.normalize());
        effectiveSpeed = Math.min(Firefly.SELECTED_SPEED, dist * 3);
      }
    } else if (this.isFollowingMeteor) {
      this.meteorFollowTimer -= deltaTime;
      if (this.meteorFollowTimer <= 0) {
        this.isFollowingMeteor = false;
      } else {
        moveDir.lerp(this.meteorDirection, deltaTime * 3);
        effectiveSpeed = this.speed * 1.8;
      }
    } else if (this.isSocialFlashing && this.socialPartner) {
      const toPartner = new THREE.Vector3(
        this.socialPartner.x - this.x,
        this.socialPartner.y - this.y,
        this.socialPartner.z - this.z
      );
      const dist = toPartner.length();
      if (dist > 0.1) {
        moveDir.copy(toPartner.normalize());
        effectiveSpeed = Firefly.SOCIAL_SPEED;
      }
    } else {
      for (const neighbor of neighbors) {
        if (neighbor === this) continue;
        const dx = neighbor.x - this.x;
        const dy = neighbor.y - this.y;
        const dz = neighbor.z - this.z;
        const distSq = dx * dx + dy * dy + dz * dz;
        if (distSq < Firefly.SOCIAL_DISTANCE * Firefly.SOCIAL_DISTANCE && distSq > 0.01) {
          const dist = Math.sqrt(distSq);
          const influence = 1.0 - dist / Firefly.SOCIAL_DISTANCE;
          moveDir.x += (dx / dist) * influence * 0.5;
          moveDir.y += (dy / dist) * influence * 0.5;
          moveDir.z += (dz / dist) * influence * 0.5;
          effectiveSpeed = Math.max(effectiveSpeed, Firefly.SOCIAL_SPEED * influence);
        }
      }

      for (const meteor of meteors) {
        if (!meteor.active) continue;
        const dx = meteor.position.x - this.x;
        const dy = meteor.position.y - this.y;
        const dz = meteor.position.z - this.z;
        const distSq = dx * dx + dy * dy + dz * dz;
        if (distSq < 16) {
          this.startMeteorFollow(meteor.velocity);
          break;
        }
      }

      this.directionChangeTimer += deltaTime;
      if (this.directionChangeTimer >= this.nextDirectionChange) {
        this.directionChangeTimer = 0;
        this.nextDirectionChange = 2 + Math.random() * 1;
        const randomDir = new THREE.Vector3(
          (Math.random() - 0.5) * 2,
          (Math.random() - 0.5) * 1.5,
          (Math.random() - 0.5) * 2
        ).normalize();
        this.velocity.lerp(randomDir, 0.6).normalize();

        const toHome = new THREE.Vector3().subVectors(this.homePosition, new THREE.Vector3(this.x, this.y, this.z));
        const homeDist = toHome.length();
        if (homeDist > 5) {
          this.velocity.lerp(toHome.normalize(), 0.4).normalize();
        }
      }
    }

    moveDir.normalize();
    this.velocity.lerp(moveDir, Math.min(1, deltaTime * 3)).normalize();

    this.x += this.velocity.x * effectiveSpeed * deltaTime;
    this.y += this.velocity.y * effectiveSpeed * deltaTime;
    this.z += this.velocity.z * effectiveSpeed * deltaTime;

    this.x = Math.max(bounds.minX, Math.min(bounds.maxX, this.x));
    this.y = Math.max(bounds.minY, Math.min(bounds.maxY, this.y));
    this.z = Math.max(bounds.minZ, Math.min(bounds.maxZ, this.z));

    this.mesh.position.set(this.x, this.y, this.z);
  }
}

export class SpatialHash {
  private cellSize: number;
  private grid: Map<string, Firefly[]>;

  constructor(cellSize: number) {
    this.cellSize = cellSize;
    this.grid = new Map();
  }

  public clear(): void {
    this.grid.clear();
  }

  private key(x: number, y: number, z: number): string {
    const cx = Math.floor(x / this.cellSize);
    const cy = Math.floor(y / this.cellSize);
    const cz = Math.floor(z / this.cellSize);
    return `${cx},${cy},${cz}`;
  }

  public insert(firefly: Firefly): void {
    const k = this.key(firefly.x, firefly.y, firefly.z);
    if (!this.grid.has(k)) {
      this.grid.set(k, []);
    }
    this.grid.get(k)!.push(firefly);
  }

  public build(fireflies: Firefly[]): void {
    this.clear();
    for (const f of fireflies) {
      this.insert(f);
    }
  }

  public query(firefly: Firefly): Firefly[] {
    const result: Firefly[] = [];
    const cx = Math.floor(firefly.x / this.cellSize);
    const cy = Math.floor(firefly.y / this.cellSize);
    const cz = Math.floor(firefly.z / this.cellSize);

    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        for (let dz = -1; dz <= 1; dz++) {
          const k = `${cx + dx},${cy + dy},${cz + dz}`;
          const cell = this.grid.get(k);
          if (cell) {
            for (const other of cell) {
              if (other !== firefly) {
                result.push(other);
              }
            }
          }
        }
      }
    }
    return result;
  }
}
