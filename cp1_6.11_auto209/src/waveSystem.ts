import * as THREE from 'three';
import gsap from 'gsap';
import type { PlanetParams } from './orbitSystem';

interface RippleData {
  position: THREE.Vector3;
  startTime: number;
  duration: number;
  rings: {
    line: THREE.Line;
    geometry: THREE.BufferGeometry;
    material: THREE.LineBasicMaterial;
    targetRadius: number;
    currentRadius: number;
  }[];
}

const RIPPLE_DURATION = 1500;
const RINGS_PER_RIPPLE = 30;
const MAX_RADIUS = 80;
const COLOR_START = new THREE.Color('#7b68ee');
const COLOR_END = new THREE.Color('#00ced1');

export class WaveSystem {
  private scene: THREE.Scene;
  private ripples: RippleData[] = [];
  private lastTriggerTime = 0;
  private currentParams: PlanetParams;
  private orbitPoints: THREE.Vector3[][] = [];
  private frameCount = 0;
  private ringPool: {
    line: THREE.Line;
    geometry: THREE.BufferGeometry;
    material: THREE.LineBasicMaterial;
  }[] = [];
  private poolIndex = 0;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.currentParams = { mass: 3, eccentricity: 0.3, rotationSpeed: 1 };
    this.initializeRingPool();
  }

  private initializeRingPool(): void {
    const maxRings = RINGS_PER_RIPPLE * 3;
    for (let i = 0; i < maxRings; i++) {
      const geometry = new THREE.BufferGeometry();
      const material = new THREE.LineBasicMaterial({
        color: COLOR_START.clone(),
        transparent: true,
        opacity: 0,
      });
      const line = new THREE.Line(geometry, material);
      line.visible = false;
      this.scene.add(line);
      this.ringPool.push({ line, geometry, material });
    }
  }

  private getRingFromPool(): {
    line: THREE.Line;
    geometry: THREE.BufferGeometry;
    material: THREE.LineBasicMaterial;
  } {
    const ring = this.ringPool[this.poolIndex];
    this.poolIndex = (this.poolIndex + 1) % this.ringPool.length;
    ring.line.visible = true;
    return ring;
  }

  public updateParams(params: Partial<PlanetParams>): void {
    Object.assign(this.currentParams, params);
  }

  public updateOrbitPoints(points: THREE.Vector3[][]): void {
    this.orbitPoints = points;
  }

  public update(_deltaTime: number, currentTime: number): void {
    this.frameCount++;

    if (this.frameCount % 3 === 0 && this.orbitPoints.length >= 2) {
      this.detectIntersections(currentTime);
    }

    this.updateRipples(currentTime);
  }

  private detectIntersections(currentTime: number): void {
    const minInterval = 800 - this.currentParams.eccentricity * 700;

    if (currentTime - this.lastTriggerTime < minInterval) {
      return;
    }

    for (let i = 0; i < this.orbitPoints.length; i++) {
      for (let j = i + 1; j < this.orbitPoints.length; j++) {
        const intersection = this.findIntersection(
          this.orbitPoints[i],
          this.orbitPoints[j]
        );
        if (intersection) {
          const triggerChance = 0.3 + this.currentParams.eccentricity * 0.6;
          if (Math.random() < triggerChance) {
            this.createRipple(intersection, currentTime);
            this.lastTriggerTime = currentTime;
            return;
          }
        }
      }
    }
  }

  private findIntersection(
    points1: THREE.Vector3[],
    points2: THREE.Vector3[]
  ): THREE.Vector3 | null {
    const threshold = 8;

    for (let i = 0; i < points1.length; i += 5) {
      for (let j = 0; j < points2.length; j += 5) {
        const dist = points1[i].distanceTo(points2[j]);
        if (dist < threshold) {
          return points1[i].clone().add(points2[j]).multiplyScalar(0.5);
        }
      }
    }
    return null;
  }

  private createRipple(position: THREE.Vector3, currentTime: number): void {
    const rings: RippleData['rings'] = [];

    for (let i = 0; i < RINGS_PER_RIPPLE; i++) {
      const poolRing = this.getRingFromPool();
      const targetRadius = (i / RINGS_PER_RIPPLE) * MAX_RADIUS;

      const lineWidth = 1 + (i / RINGS_PER_RIPPLE) * 2;

      this.updateRingGeometry(poolRing.geometry, 1);
      poolRing.line.position.copy(position);
      poolRing.material.opacity = 0.6 * (1 - i / RINGS_PER_RIPPLE);

      const colorT = Math.sin(currentTime * 0.001 + i * 0.2) * 0.5 + 0.5;
      const color = COLOR_START.clone().lerp(COLOR_END, colorT);
      poolRing.material.color.copy(color);

      poolRing.line.scale.setScalar(0);

      gsap.to(poolRing.line.scale, {
        x: targetRadius,
        y: targetRadius,
        z: targetRadius,
        duration: RIPPLE_DURATION / 1000,
        ease: 'power2.out',
      });

      gsap.to(poolRing.material, {
        opacity: 0,
        duration: RIPPLE_DURATION / 1000,
        ease: 'power2.in',
      });

      if ('linewidth' in poolRing.material) {
        gsap.to(poolRing.material, {
          linewidth: lineWidth,
          duration: RIPPLE_DURATION / 1000,
          ease: 'sine.inOut',
        });
      }

      rings.push({
        line: poolRing.line,
        geometry: poolRing.geometry,
        material: poolRing.material,
        targetRadius,
        currentRadius: 0,
      });
    }

    this.ripples.push({
      position,
      startTime: currentTime,
      duration: RIPPLE_DURATION,
      rings,
    });
  }

  private updateRingGeometry(geometry: THREE.BufferGeometry, radius: number): void {
    const segments = 64;
    const positions = new Float32Array((segments + 1) * 3);

    for (let i = 0; i <= segments; i++) {
      const angle = (i / segments) * Math.PI * 2;
      positions[i * 3] = Math.cos(angle) * radius;
      positions[i * 3 + 1] = Math.sin(angle) * radius;
      positions[i * 3 + 2] = 0;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.attributes.position.needsUpdate = true;
  }

  private updateRipples(currentTime: number): void {
    this.ripples = this.ripples.filter((ripple) => {
      const elapsed = currentTime - ripple.startTime;
      const progress = elapsed / ripple.duration;

      if (progress >= 1) {
        ripple.rings.forEach((ring) => {
          ring.line.visible = false;
          ring.material.opacity = 0;
          ring.line.scale.setScalar(1);
        });
        return false;
      }

      ripple.rings.forEach((ring, i) => {
        const colorT = Math.sin(currentTime * 0.002 + i * 0.15) * 0.5 + 0.5;
        const color = COLOR_START.clone().lerp(COLOR_END, colorT);
        ring.material.color.copy(color);

        ring.currentRadius = ring.line.scale.x;
      });

      return true;
    });
  }

  public getActiveRippleCount(): number {
    return this.ripples.length;
  }

  public dispose(): void {
    this.ringPool.forEach((ring) => {
      ring.geometry.dispose();
      ring.material.dispose();
      this.scene.remove(ring.line);
    });
    this.ringPool = [];
    this.ripples = [];
  }
}
