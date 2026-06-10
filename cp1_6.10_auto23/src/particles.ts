import * as THREE from 'three';
import { ButterflySwarm } from './butterfly';

const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

const colorTemperature = (t: number): THREE.Color => {
  const clamped = Math.max(0, Math.min(1, t));
  if (clamped < 0.5) {
    const k = clamped * 2;
    return new THREE.Color().setRGB(
      1.0,
      lerp(0.6, 0.8, k),
      lerp(0.3, 0.5, k)
    );
  } else {
    const k = (clamped - 0.5) * 2;
    return new THREE.Color().setRGB(
      lerp(0.8, 0.4, k),
      lerp(0.8, 0.7, k),
      lerp(0.6, 1.0, k)
    );
  }
};

export class ParticleSystem {
  points: THREE.Points;
  private geometry: THREE.BufferGeometry;
  private material: THREE.PointsMaterial;
  private positions: Float32Array;
  private colors: Float32Array;
  private velocities: THREE.Vector3[];
  private particleCount: number;
  private baseCount: number;

  constructor(scene: THREE.Scene, count: number = 60) {
    this.baseCount = count;
    this.particleCount = count;
    this.velocities = [];

    this.geometry = new THREE.BufferGeometry();
    this.positions = new Float32Array(count * 3);
    this.colors = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      this.initParticle(i);
    }

    this.geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    this.geometry.setAttribute('color', new THREE.BufferAttribute(this.colors, 3));

    this.material = new THREE.PointsMaterial({
      size: 0.12,
      vertexColors: true,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true
    });

    this.points = new THREE.Points(this.geometry, this.material);
    scene.add(this.points);
  }

  private initParticle(index: number): void {
    const radius = 4 + Math.random() * 4;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.random() * Math.PI;

    this.positions[index * 3] = radius * Math.sin(phi) * Math.cos(theta);
    this.positions[index * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
    this.positions[index * 3 + 2] = radius * Math.cos(phi);

    const color = colorTemperature(Math.random());
    this.colors[index * 3] = color.r;
    this.colors[index * 3 + 1] = color.g;
    this.colors[index * 3 + 2] = color.b;

    this.velocities[index] = new THREE.Vector3(
      (Math.random() - 0.5) * 0.5,
      (Math.random() - 0.5) * 0.5,
      (Math.random() - 0.5) * 0.5
    );
  }

  setDensityMultiplier(multiplier: number): void {
    const targetCount = Math.max(10, Math.floor(this.baseCount * multiplier));
    if (targetCount === this.particleCount) return;

    this.particleCount = targetCount;
    this.geometry.setDrawRange(0, targetCount);
  }

  update(
    deltaTime: number,
    elapsedTime: number,
    swarm: ButterflySwarm,
    handTracked: boolean
  ): void {
    const swarmCenter = swarm.getAveragePosition();
    const avgSpeed = swarm.getAverageSpeed();
    const speedFactor = Math.min(avgSpeed / 4, 1);
    const warmColor = colorTemperature(1 - speedFactor);
    const coolColor = colorTemperature(speedFactor);

    for (let i = 0; i < this.particleCount; i++) {
      const ix = i * 3;

      let nearestBfly: THREE.Vector3 | null = null;
      let nearestDist = Infinity;
      for (let j = 0; j < Math.min(swarm.butterflies.length, 10); j++) {
        const bfly = swarm.butterflies[(i + j) % swarm.butterflies.length];
        const dist = bfly.mesh.position.distanceTo(
          new THREE.Vector3(this.positions[ix], this.positions[ix + 1], this.positions[ix + 2])
        );
        if (dist < nearestDist) {
          nearestDist = dist;
          nearestBfly = bfly.mesh.position;
        }
      }

      if (nearestBfly) {
        const attraction = nearestBfly.clone()
          .sub(new THREE.Vector3(this.positions[ix], this.positions[ix + 1], this.positions[ix + 2]))
          .multiplyScalar(0.8);
        this.velocities[i].add(attraction.multiplyScalar(deltaTime));
      }

      const wander = new THREE.Vector3(
        Math.sin(elapsedTime * 0.7 + i * 0.5) * 0.3,
        Math.cos(elapsedTime * 0.5 + i * 0.3) * 0.3,
        Math.sin(elapsedTime * 0.6 + i * 0.7) * 0.3
      );
      this.velocities[i].add(wander.multiplyScalar(deltaTime * 2));

      this.velocities[i].multiplyScalar(0.96);
      this.velocities[i].clampLength(0, 3.0);

      this.positions[ix] += this.velocities[i].x * deltaTime;
      this.positions[ix + 1] += this.velocities[i].y * deltaTime;
      this.positions[ix + 2] += this.velocities[i].z * deltaTime;

      const distFromCenter = new THREE.Vector3(
        this.positions[ix],
        this.positions[ix + 1],
        this.positions[ix + 2]
      ).distanceTo(swarmCenter);

      if (distFromCenter > 10) {
        const backToCenter = swarmCenter.clone()
          .sub(new THREE.Vector3(this.positions[ix], this.positions[ix + 1], this.positions[ix + 2]))
          .normalize()
          .multiplyScalar(2);
        this.velocities[i].add(backToCenter.multiplyScalar(deltaTime));
      }

      const particleColor = new THREE.Color();
      const t = 0.5 + Math.sin(elapsedTime * 2 + i * 0.3) * 0.5;
      particleColor.lerpColors(warmColor, coolColor, t * 0.5 + speedFactor * 0.5);

      this.colors[ix] = lerp(this.colors[ix], particleColor.r, deltaTime * 3);
      this.colors[ix + 1] = lerp(this.colors[ix + 1], particleColor.g, deltaTime * 3);
      this.colors[ix + 2] = lerp(this.colors[ix + 2], particleColor.b, deltaTime * 3);
    }

    (this.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
    (this.geometry.attributes.color as THREE.BufferAttribute).needsUpdate = true;

    this.material.size = handTracked ? 0.12 : 0.08;
  }
}
