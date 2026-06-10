import * as THREE from 'three';

export interface GuardianData {
  group: THREE.Group;
  particles: THREE.Points;
  startTime: number;
  spiralPhase: number;
  spiralRadius: number;
  startPos: THREE.Vector3;
  isFading: boolean;
  fadeStartTime: number;
  gatheredToPortal: boolean;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16) / 255,
        g: parseInt(result[2], 16) / 255,
        b: parseInt(result[3], 16) / 255,
      }
    : { r: 0, g: 0, b: 0 };
}

function lerpColor(
  c1: { r: number; g: number; b: number },
  c2: { r: number; g: number; b: number },
  t: number
): { r: number; g: number; b: number } {
  return {
    r: c1.r + (c2.r - c1.r) * t,
    g: c1.g + (c2.g - c1.g) * t,
    b: c1.b + (c2.b - c1.b) * t,
  };
}

const GUARDIAN_COLOR_START = hexToRgb('#ffcc00');
const GUARDIAN_COLOR_END = hexToRgb('#ff66cc');
const PARTICLES_PER_GUARDIAN = 20;
const INITIAL_RADIUS = 0.2;
const FLIGHT_DURATION = 3;
const TARGET_HEIGHT = 5;
const FADE_INTERVAL = 0.1;

export class GuardianManager {
  public guardians: GuardianData[] = [];
  private scene: THREE.Scene;
  private portalActive: boolean = false;
  private portalPosition: THREE.Vector3 = new THREE.Vector3(0, 2, 0);

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  public spawnGuardian(position: THREE.Vector3): void {
    const group = new THREE.Group();
    const positions = new Float32Array(PARTICLES_PER_GUARDIAN * 3);
    const colors = new Float32Array(PARTICLES_PER_GUARDIAN * 3);
    const originalOffsets = new Float32Array(PARTICLES_PER_GUARDIAN * 3);

    for (let i = 0; i < PARTICLES_PER_GUARDIAN; i++) {
      const idx = i * 3;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI;
      const r = INITIAL_RADIUS * (0.5 + Math.random() * 0.5);

      const ox = r * Math.sin(phi) * Math.cos(theta);
      const oy = r * Math.sin(phi) * Math.sin(theta);
      const oz = r * Math.cos(phi);

      originalOffsets[idx] = ox;
      originalOffsets[idx + 1] = oy;
      originalOffsets[idx + 2] = oz;

      positions[idx] = position.x + ox;
      positions[idx + 1] = position.y + oy;
      positions[idx + 2] = position.z + oz;

      const t = i / (PARTICLES_PER_GUARDIAN - 1);
      const c = lerpColor(GUARDIAN_COLOR_START, GUARDIAN_COLOR_END, t);
      colors[idx] = c.r;
      colors[idx + 1] = c.g;
      colors[idx + 2] = c.b;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    (geometry as any).setAttribute('originalOffset', new THREE.BufferAttribute(originalOffsets, 3));

    const material = new THREE.PointsMaterial({
      size: 0.12,
      vertexColors: true,
      transparent: true,
      opacity: 1,
      sizeAttenuation: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    const particles = new THREE.Points(geometry, material);
    group.add(particles);
    group.position.copy(position);
    this.scene.add(group);

    this.guardians.push({
      group,
      particles,
      startTime: performance.now(),
      spiralPhase: Math.random() * Math.PI * 2,
      spiralRadius: 0.3,
      startPos: position.clone(),
      isFading: false,
      fadeStartTime: 0,
      gatheredToPortal: false,
    });
  }

  public activatePortal(pos: THREE.Vector3): void {
    this.portalActive = true;
    this.portalPosition.copy(pos);
  }

  public update(delta: number, currentTime: number): void {
    for (let i = this.guardians.length - 1; i >= 0; i--) {
      const g = this.guardians[i];
      const elapsed = (currentTime - g.startTime) / 1000;

      if (elapsed < FLIGHT_DURATION) {
        this.updateSpiralFlight(g, elapsed);
      } else {
        if (this.portalActive && !g.gatheredToPortal) {
          this.updateGatherToPortal(g, delta, elapsed);
        } else if (!g.isFading) {
          g.isFading = true;
          g.fadeStartTime = currentTime;
        } else {
          const fadeElapsed = (currentTime - g.fadeStartTime) / 1000;
          const fadeSteps = Math.floor(fadeElapsed / FADE_INTERVAL);
          const material = g.particles.material as THREE.PointsMaterial;
          material.opacity = Math.max(0, 1 - fadeSteps * 0.1);

          if (material.opacity <= 0) {
            this.scene.remove(g.group);
            g.particles.geometry.dispose();
            (g.particles.material as THREE.Material).dispose();
            this.guardians.splice(i, 1);
          }
        }
      }
    }
  }

  private updateSpiralFlight(g: GuardianData, elapsed: number): void {
    const t = elapsed / FLIGHT_DURATION;
    const baseY = g.startPos.y + t * (TARGET_HEIGHT - g.startPos.y + 2);
    const angle = g.spiralPhase + t * Math.PI * 4;
    const radius = g.spiralRadius * (1 + t * 1.5);

    const centerX = g.startPos.x + Math.cos(angle) * radius;
    const centerZ = g.startPos.z + Math.sin(angle) * radius;
    const centerY = baseY + Math.sin(t * Math.PI * 2) * 0.2;

    const positions = g.particles.geometry.attributes.position.array as Float32Array;
    const originalOffsets = (g.particles.geometry.attributes as any).originalOffset.array as Float32Array;

    for (let i = 0; i < PARTICLES_PER_GUARDIAN; i++) {
      const idx = i * 3;
      const pulseScale = 1 + Math.sin(elapsed * 8 + i * 0.5) * 0.15;
      positions[idx] = centerX + originalOffsets[idx] * pulseScale;
      positions[idx + 1] = centerY + originalOffsets[idx + 1] * pulseScale;
      positions[idx + 2] = centerZ + originalOffsets[idx + 2] * pulseScale;
    }

    g.particles.geometry.attributes.position.needsUpdate = true;
  }

  private updateGatherToPortal(g: GuardianData, delta: number, elapsed: number): void {
    const positions = g.particles.geometry.attributes.position.array as Float32Array;
    const originalOffsets = (g.particles.geometry.attributes as any).originalOffset.array as Float32Array;

    for (let i = 0; i < PARTICLES_PER_GUARDIAN; i++) {
      const idx = i * 3;
      const currentPos = new THREE.Vector3(positions[idx], positions[idx + 1], positions[idx + 2]);
      const targetPos = this.portalPosition.clone().add(
        new THREE.Vector3(originalOffsets[idx], originalOffsets[idx + 1], originalOffsets[idx + 2])
      );
      currentPos.lerp(targetPos, delta * 2);
      positions[idx] = currentPos.x;
      positions[idx + 1] = currentPos.y;
      positions[idx + 2] = currentPos.z;
    }

    g.particles.geometry.attributes.position.needsUpdate = true;

    const dist = g.group.position.distanceTo(this.portalPosition);
    if (dist < 0.5) {
      const material = g.particles.material as THREE.PointsMaterial;
      material.opacity = Math.max(0, material.opacity - delta * 0.5);
      if (material.opacity <= 0) {
        g.gatheredToPortal = true;
      }
    }
  }

  public getActiveCount(): number {
    return this.guardians.length;
  }
}

export class Portal {
  public group: THREE.Group;
  private particles: THREE.Points;
  private startTime: number;
  private scene: THREE.Scene;
  private active: boolean = false;

  constructor(scene: THREE.Scene, position: THREE.Vector3) {
    this.scene = scene;
    this.group = new THREE.Group();
    this.startTime = 0;

    const particleCount = 80;
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    const ringRadius = 2;

    const portalColorStart = hexToRgb('#00ccff');
    const portalColorEnd = hexToRgb('#0055ff');

    for (let i = 0; i < particleCount; i++) {
      const idx = i * 3;
      const angle = (i / particleCount) * Math.PI * 2;
      const r = ringRadius + (Math.random() - 0.5) * 0.1;

      positions[idx] = Math.cos(angle) * r;
      positions[idx + 1] = Math.sin(angle) * 0.1;
      positions[idx + 2] = Math.sin(angle) * r;

      const t = i / (particleCount - 1);
      const c = lerpColor(portalColorStart, portalColorEnd, t);
      colors[idx] = c.r;
      colors[idx + 1] = c.g;
      colors[idx + 2] = c.b;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
      size: 0.15,
      vertexColors: true,
      transparent: true,
      opacity: 0,
      sizeAttenuation: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    this.particles = new THREE.Points(geometry, material);
    this.group.add(this.particles);
    this.group.position.copy(position);
  }

  public activate(): void {
    this.scene.add(this.group);
    this.active = true;
    this.startTime = performance.now();
  }

  public update(currentTime: number): void {
    if (!this.active) return;

    const elapsed = (currentTime - this.startTime) / 1000;
    const material = this.particles.material as THREE.PointsMaterial;

    const targetOpacity = 0.6 + Math.sin(elapsed * 3) * 0.4;
    material.opacity += (targetOpacity - material.opacity) * 0.1;

    this.particles.rotation.y += 0.015;
    this.particles.rotation.x = Math.sin(elapsed * 0.5) * 0.2;
  }
}
