import * as THREE from 'three';

const PARTICLE_COUNT = 500;
const GRID_SIZE = 20;
const BASE_COLOR = new THREE.Color(0x40e0d0);
const OVERLAY_COLOR = new THREE.Color(0x7b68ee);

interface BuildingData {
  position: { x: number; z: number };
  size: { width: number; depth: number };
  height: number;
}

export class WindSimulation {
  private scene: THREE.Scene;
  private particleSystem: THREE.Points;
  private geometry: THREE.BufferGeometry;
  private material: THREE.PointsMaterial;
  private positions: Float32Array;
  private velocities: Float32Array;
  private buildings: BuildingData[] = [];
  private isOverlay: boolean = false;

  constructor(scene: THREE.Scene) {
    this.scene = scene;

    this.positions = new Float32Array(PARTICLE_COUNT * 3);
    this.velocities = new Float32Array(PARTICLE_COUNT * 2);

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      this.positions[i * 3] = (Math.random() - 0.5) * GRID_SIZE;
      this.positions[i * 3 + 1] = Math.random() * 3 + 0.5;
      this.positions[i * 3 + 2] = (Math.random() - 0.5) * GRID_SIZE;
      this.velocities[i * 2] = 0;
      this.velocities[i * 2 + 1] = 0;
    }

    this.geometry = new THREE.BufferGeometry();
    this.geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));

    this.material = new THREE.PointsMaterial({
      color: BASE_COLOR,
      size: 0.1,
      transparent: true,
      opacity: 0.7,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    this.particleSystem = new THREE.Points(this.geometry, this.material);
    this.scene.add(this.particleSystem);
  }

  initialize(buildings: BuildingData[]): void {
    this.buildings = buildings;

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      this.positions[i * 3] = (Math.random() - 0.5) * GRID_SIZE;
      this.positions[i * 3 + 1] = Math.random() * 3 + 0.5;
      this.positions[i * 3 + 2] = (Math.random() - 0.5) * GRID_SIZE;
      this.velocities[i * 2] = 0;
      this.velocities[i * 2 + 1] = 0;
    }

    this.geometry.attributes.position.needsUpdate = true;
  }

  updateParticles(windSpeed: number, buildings: BuildingData[], deltaTime: number): void {
    this.buildings = buildings;

    const cappedDt = Math.min(deltaTime, 0.05);
    const halfGrid = GRID_SIZE / 2;

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const px = this.positions[i * 3];
      const py = this.positions[i * 3 + 1];
      const pz = this.positions[i * 3 + 2];

      let vx = windSpeed;
      let vz = 0;

      for (const building of buildings) {
        const bx = building.position.x;
        const bz = building.position.z;
        const hw = building.size.width / 2;
        const hd = building.size.depth / 2;
        const influenceRadius = Math.max(hw, hd) + 1;

        const dx = px - bx;
        const dz = pz - bz;
        const dist = Math.sqrt(dx * dx + dz * dz);

        if (dist < influenceRadius && py < building.height) {
          if (dist < 0.01) continue;

          const nx = dx / dist;
          const nz = dz / dist;
          const proximity = 1 - dist / influenceRadius;

          vx += nx * windSpeed * proximity * 1.5;
          vz += nz * windSpeed * proximity * 1.5;

          const isLeeward = dx < 0 && Math.abs(dz) < hd + 0.5;
          if (isLeeward) {
            const vortexRadius = building.height * 0.3;
            const vortexDecay = Math.exp(-dist / (vortexRadius + 0.1));
            const angle = Math.atan2(dz, dx);
            const rotVx = -Math.sin(angle) * windSpeed * 0.4 * vortexDecay;
            const rotVz = Math.cos(angle) * windSpeed * 0.4 * vortexDecay;
            vx += rotVx;
            vz += rotVz;
          }
        }
      }

      const speed = Math.sqrt(vx * vx + vz * vz);
      const maxSpeed = windSpeed * 3;
      if (speed > maxSpeed) {
        vx = (vx / speed) * maxSpeed;
        vz = (vz / speed) * maxSpeed;
      }

      this.velocities[i * 2] = vx;
      this.velocities[i * 2 + 1] = vz;

      this.positions[i * 3] += vx * cappedDt;
      this.positions[i * 3 + 2] += vz * cappedDt;

      if (this.positions[i * 3] > halfGrid) {
        this.positions[i * 3] -= GRID_SIZE;
      } else if (this.positions[i * 3] < -halfGrid) {
        this.positions[i * 3] += GRID_SIZE;
      }

      if (this.positions[i * 3 + 2] > halfGrid) {
        this.positions[i * 3 + 2] -= GRID_SIZE;
      } else if (this.positions[i * 3 + 2] < -halfGrid) {
        this.positions[i * 3 + 2] += GRID_SIZE;
      }
    }

    this.geometry.attributes.position.needsUpdate = true;
  }

  setOverlayMode(isOverlay: boolean): void {
    this.isOverlay = isOverlay;
    this.material.color.set(isOverlay ? OVERLAY_COLOR : BASE_COLOR);
  }

  setVisible(visible: boolean): void {
    this.particleSystem.visible = visible;
  }

  setBuildingOpacity(_opaque: boolean): void {}

  getParticleSystem(): THREE.Points {
    return this.particleSystem;
  }

  dispose(): void {
    this.geometry.dispose();
    this.material.dispose();
    this.scene.remove(this.particleSystem);
  }
}
