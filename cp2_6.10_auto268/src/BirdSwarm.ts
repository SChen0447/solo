import * as THREE from 'three';
import { v4 as uuidv4 } from 'uuid';
import { CityModule, TimePeriod } from './CityModule';

interface BirdParticle {
  id: string;
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  basePathProgress: number;
  flockId: number;
  speed: number;
  baseSpeed: number;
  affectedLevel: number;
  offset: THREE.Vector3;
  targetOffset: THREE.Vector3;
  featherColor: THREE.Color;
}

export class BirdSwarm {
  private scene: THREE.Scene;
  private cityModule: CityModule;
  private particles: BirdParticle[] = [];
  private points: THREE.Points | null = null;
  private trails: THREE.Points | null = null;
  private trailPositions: Float32Array | null = null;
  private geometry: THREE.BufferGeometry | null = null;
  private trailGeometry: THREE.BufferGeometry | null = null;
  private activityLevel: number = 1;
  private speedMultiplier: number = 1;
  private birdCountMultiplier: number = 1;
  private maxBirds: number = 500;
  private trailLength: number = 8;
  private flockColors: THREE.Color[] = [
    new THREE.Color(0xe8e8e8),
    new THREE.Color(0xc8c8d0),
    new THREE.Color(0xa0a8b8),
    new THREE.Color(0xd8d0c0),
    new THREE.Color(0xb8b0a0)
  ];

  private pathStart = new THREE.Vector3(-80, 25, -60);
  private pathEnd = new THREE.Vector3(80, 25, 60);
  private pathControl1 = new THREE.Vector3(-30, 35, -20);
  private pathControl2 = new THREE.Vector3(30, 30, 20);

  constructor(scene: THREE.Scene, cityModule: CityModule) {
    this.scene = scene;
    this.cityModule = cityModule;
  }

  generateFlocks(flockCount: number = 4, birdsPerFlock: number = 100): void {
    if (this.points) {
      this.scene.remove(this.points);
      this.geometry?.dispose();
    }
    if (this.trails) {
      this.scene.remove(this.trails);
      this.trailGeometry?.dispose();
    }

    this.particles = [];
    this.maxBirds = flockCount * birdsPerFlock;

    for (let flockId = 0; flockId < flockCount; flockId++) {
      const flockColor = this.flockColors[flockId % this.flockColors.length];
      const baseProgress = flockId / flockCount;

      for (let i = 0; i < birdsPerFlock; i++) {
        const progress = (baseProgress + Math.random() * 0.15) % 1;
        const pathPos = this.getPathPosition(progress);
        const flockOffset = new THREE.Vector3(
          (Math.random() - 0.5) * 15,
          (Math.random() - 0.5) * 8,
          (Math.random() - 0.5) * 15
        );

        const colorVariation = 0.85 + Math.random() * 0.3;
        const featherColor = flockColor.clone().multiplyScalar(colorVariation);

        this.particles.push({
          id: uuidv4(),
          position: pathPos.clone().add(flockOffset),
          velocity: new THREE.Vector3(0, 0, 0),
          basePathProgress: progress,
          flockId,
          speed: 0.0003 + Math.random() * 0.0002,
          baseSpeed: 0.0003 + Math.random() * 0.0002,
          affectedLevel: 0,
          offset: flockOffset,
          targetOffset: flockOffset.clone(),
          featherColor
        });
      }
    }

    this.createParticleSystem();
  }

  private createParticleSystem(): void {
    const totalCount = this.particles.length;

    this.geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(totalCount * 3);
    const colors = new Float32Array(totalCount * 3);
    const sizes = new Float32Array(totalCount);

    this.particles.forEach((p, i) => {
      positions[i * 3] = p.position.x;
      positions[i * 3 + 1] = p.position.y;
      positions[i * 3 + 2] = p.position.z;
      colors[i * 3] = p.featherColor.r;
      colors[i * 3 + 1] = p.featherColor.g;
      colors[i * 3 + 2] = p.featherColor.b;
      sizes[i] = 0.6;
    });

    this.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    this.geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    const material = new THREE.PointsMaterial({
      size: 0.8,
      vertexColors: true,
      transparent: true,
      opacity: 0.85,
      sizeAttenuation: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    this.points = new THREE.Points(this.geometry, material);
    this.scene.add(this.points);

    const trailCount = totalCount * this.trailLength;
    this.trailGeometry = new THREE.BufferGeometry();
    this.trailPositions = new Float32Array(trailCount * 3);
    const trailColors = new Float32Array(trailCount * 3);
    const trailSizes = new Float32Array(trailCount);
    const trailAlphas = new Float32Array(trailCount);

    for (let i = 0; i < totalCount; i++) {
      for (let t = 0; t < this.trailLength; t++) {
        const idx = (i * this.trailLength + t) * 3;
        this.trailPositions[idx] = this.particles[i].position.x;
        this.trailPositions[idx + 1] = this.particles[i].position.y;
        this.trailPositions[idx + 2] = this.particles[i].position.z;

        const alpha = 1 - t / this.trailLength;
        trailColors[idx] = this.particles[i].featherColor.r * alpha;
        trailColors[idx + 1] = this.particles[i].featherColor.g * alpha;
        trailColors[idx + 2] = this.particles[i].featherColor.b * alpha;
        trailSizes[i * this.trailLength + t] = 0.5 * alpha;
        trailAlphas[i * this.trailLength + t] = alpha * 0.4;
      }
    }

    this.trailGeometry.setAttribute('position', new THREE.BufferAttribute(this.trailPositions, 3));
    this.trailGeometry.setAttribute('color', new THREE.BufferAttribute(trailColors, 3));

    const trailMaterial = new THREE.PointsMaterial({
      size: 0.5,
      vertexColors: true,
      transparent: true,
      opacity: 0.35,
      sizeAttenuation: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    this.trails = new THREE.Points(this.trailGeometry, trailMaterial);
    this.scene.add(this.trails);
  }

  private getPathPosition(progress: number): THREE.Vector3 {
    const t = Math.max(0, Math.min(1, progress));
    const mt = 1 - t;

    return new THREE.Vector3(
      mt * mt * mt * this.pathStart.x + 3 * mt * mt * t * this.pathControl1.x +
      3 * mt * t * t * this.pathControl2.x + t * t * t * this.pathEnd.x,
      mt * mt * mt * this.pathStart.y + 3 * mt * mt * t * this.pathControl1.y +
      3 * mt * t * t * this.pathControl2.y + t * t * t * this.pathEnd.y,
      mt * mt * mt * this.pathStart.z + 3 * mt * mt * t * this.pathControl1.z +
      3 * mt * t * t * this.pathControl2.z + t * t * t * this.pathEnd.z
    );
  }

  private getPathTangent(progress: number): THREE.Vector3 {
    const t = Math.max(0.001, Math.min(0.999, progress));
    const p1 = this.getPathPosition(t - 0.001);
    const p2 = this.getPathPosition(t + 0.001);
    return new THREE.Vector3().subVectors(p2, p1).normalize();
  }

  private getNormal(forward: THREE.Vector3): THREE.Vector3 {
    const up = new THREE.Vector3(0, 1, 0);
    const right = new THREE.Vector3().crossVectors(forward, up).normalize();
    return new THREE.Vector3().crossVectors(right, forward).normalize();
  }

  update(deltaTime: number): void {
    if (!this.points || !this.geometry || !this.trails || !this.trailGeometry) return;

    const positions = this.geometry.attributes.position.array as Float32Array;
    const colors = this.geometry.attributes.color.array as Float32Array;

    const activeCount = Math.floor(this.particles.length * this.birdCountMultiplier);

    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      const isActive = i < activeCount;

      if (isActive) {
        p.basePathProgress += p.speed * this.speedMultiplier * this.activityLevel * deltaTime * 60;
        if (p.basePathProgress > 1.05) p.basePathProgress = -0.05;

        const basePos = this.getPathPosition(p.basePathProgress);
        const tangent = this.getPathTangent(p.basePathProgress);
        const normal = this.getNormal(tangent);
        const right = new THREE.Vector3().crossVectors(tangent, normal).normalize();

        const lightInfluence = this.cityModule.getBuildingLightInfluence(
          basePos.x + p.offset.x,
          basePos.y + p.offset.y,
          basePos.z + p.offset.z
        );
        p.affectedLevel = lightInfluence;

        if (lightInfluence > 0.1) {
          const buildings = this.cityModule.getAllBuildings();
          let repelDir = new THREE.Vector3(0, 0, 0);

          for (const b of buildings) {
            const buildingPos = new THREE.Vector3(b.position.x, b.height / 2, b.position.z);
            const toBird = new THREE.Vector3().subVectors(basePos, buildingPos);
            const dist = toBird.length();
            const influenceRadius = b.height * 1.5 + 20;

            if (dist < influenceRadius) {
              let strength = b.brightness;
              if (b.blinkMode === 'slow') strength *= 1.5;
              if (b.blinkMode === 'fast') strength *= 2;
              if (b.colorTemperature > 5000) strength *= 1.3;
              if (b.colorTemperature < 3000) strength *= 0.6;

              toBird.normalize().multiplyScalar(strength * (1 - dist / influenceRadius));
              repelDir.add(toBird);
            }
          }

          if (repelDir.length() > 0.001) {
            repelDir.normalize();
            const lateralRepel = new THREE.Vector3(
              repelDir.dot(right),
              repelDir.dot(normal),
              0
            );
            p.targetOffset.x = lateralRepel.x * 25 * lightInfluence + (Math.random() - 0.5) * 3;
            p.targetOffset.y = lateralRepel.y * 15 * lightInfluence + 5 * lightInfluence + (Math.random() - 0.5) * 2;
            p.targetOffset.z = (Math.random() - 0.5) * 5;
            p.speed = p.baseSpeed * (0.5 + 0.5 * (1 - lightInfluence * 0.5));
          }
        } else {
          p.targetOffset.x = (Math.random() - 0.5) * 10;
          p.targetOffset.y = (Math.random() - 0.5) * 5;
          p.targetOffset.z = (Math.random() - 0.5) * 8;
          p.speed = p.baseSpeed;
        }

        p.offset.lerp(p.targetOffset, 0.03);

        const finalOffset = new THREE.Vector3()
          .addScaledVector(right, p.offset.x)
          .addScaledVector(normal, p.offset.y)
          .addScaledVector(tangent, p.offset.z * 0.3);

        p.position.copy(basePos).add(finalOffset);

        p.position.x += Math.sin(Date.now() * 0.003 + i * 0.5) * 0.05;
        p.position.y += Math.cos(Date.now() * 0.004 + i * 0.7) * 0.03;
      } else {
        p.position.set(-9999, -9999, -9999);
      }

      positions[i * 3] = p.position.x;
      positions[i * 3 + 1] = p.position.y;
      positions[i * 3 + 2] = p.position.z;

      const intensity = isActive ? (1 - p.affectedLevel * 0.4) : 0;
      colors[i * 3] = p.featherColor.r * intensity;
      colors[i * 3 + 1] = p.featherColor.g * intensity;
      colors[i * 3 + 2] = p.featherColor.b * intensity;

      if (this.trailPositions) {
        for (let t = this.trailLength - 1; t > 0; t--) {
          const curIdx = (i * this.trailLength + t) * 3;
          const prevIdx = (i * this.trailLength + t - 1) * 3;
          this.trailPositions[curIdx] = this.trailPositions[prevIdx];
          this.trailPositions[curIdx + 1] = this.trailPositions[prevIdx + 1];
          this.trailPositions[curIdx + 2] = this.trailPositions[prevIdx + 2];
        }
        const firstIdx = i * this.trailLength * 3;
        this.trailPositions[firstIdx] = p.position.x;
        this.trailPositions[firstIdx + 1] = p.position.y;
        this.trailPositions[firstIdx + 2] = p.position.z;
      }
    }

    this.geometry.attributes.position.needsUpdate = true;
    this.geometry.attributes.color.needsUpdate = true;
    this.trailGeometry.attributes.position.needsUpdate = true;
  }

  getTotalCount(): number {
    return Math.floor(this.particles.length * this.birdCountMultiplier);
  }

  getAffectedPercentage(): number {
    const activeParticles = this.particles.slice(0, Math.floor(this.particles.length * this.birdCountMultiplier));
    if (activeParticles.length === 0) return 0;
    const affected = activeParticles.filter(p => p.affectedLevel > 0.2).length;
    return (affected / activeParticles.length) * 100;
  }

  getAverageSpeed(): number {
    const activeParticles = this.particles.slice(0, Math.floor(this.particles.length * this.birdCountMultiplier));
    if (activeParticles.length === 0) return 0;
    const avgSpeed = activeParticles.reduce((sum, p) => sum + p.speed / p.baseSpeed, 0) / activeParticles.length;
    return Math.max(0, Math.min(100, avgSpeed * 70 + 30));
  }

  applyTimePeriod(period: TimePeriod): void {
    this.birdCountMultiplier = period.birdCountMultiplier;
    this.speedMultiplier = period.speedMultiplier;
    this.activityLevel = period.birdActivity;
  }

  setActivityLevel(level: number): void {
    this.activityLevel = Math.max(0, Math.min(1, level));
  }
}
