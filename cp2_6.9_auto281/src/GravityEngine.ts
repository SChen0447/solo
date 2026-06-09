import * as THREE from 'three';
import { CelestialBody, MergeParticle, BODY_COLORS } from './CelestialBody';

export interface PendingMerge {
  bodyA: CelestialBody;
  bodyB: CelestialBody;
  progress: number;
  duration: number;
  centerOfMass: THREE.Vector3;
  combinedMass: number;
  combinedVelocity: THREE.Vector3;
  combinedColor: THREE.Color;
  particles: MergeParticle[];
  particlesGroup: THREE.Group;
  scene: THREE.Scene;
}

export class GravityEngine {
  public G: number = 50;
  public timeScale: number = 1;
  public bodies: CelestialBody[] = [];
  public scene: THREE.Scene;
  private pendingMerges: PendingMerge[] = [];

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  public addBody(body: CelestialBody): void {
    this.bodies.push(body);
    this.scene.add(body.group);
  }

  public removeBody(body: CelestialBody): void {
    const idx = this.bodies.indexOf(body);
    if (idx >= 0) {
      this.bodies.splice(idx, 1);
    }
    this.scene.remove(body.group);
    body.dispose();
  }

  public clearAll(): void {
    for (const body of this.bodies) {
      this.scene.remove(body.group);
      body.dispose();
    }
    this.bodies = [];
    for (const merge of this.pendingMerges) {
      this.scene.remove(merge.particlesGroup);
      for (const p of merge.particles) p.dispose();
    }
    this.pendingMerges = [];
  }

  public step(dt: number): void {
    const scaledDt = dt * this.timeScale;
    this.updatePendingMerges(dt);
    this.integrate(scaledDt);
    this.handleCollisions();
  }

  private integrate(dt: number): void {
    if (this.bodies.length < 2) {
      for (const body of this.bodies) {
        body.data.position.addScaledVector(body.data.velocity, dt);
        body.updatePosition(body.data.position);
      }
      return;
    }

    const n = this.bodies.length;
    const accelerations: THREE.Vector3[] = [];
    for (let i = 0; i < n; i++) {
      accelerations.push(new THREE.Vector3());
    }

    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const a = this.bodies[i];
        const b = this.bodies[j];
        const diff = new THREE.Vector3().subVectors(b.data.position, a.data.position);
        const distSq = Math.max(diff.lengthSq(), 0.01);
        const dist = Math.sqrt(distSq);
        const force = this.G * a.data.mass * b.data.mass / distSq;
        const ax = force / a.data.mass / dist;
        const bx = force / b.data.mass / dist;
        accelerations[i].x += diff.x * ax;
        accelerations[i].y += diff.y * ax;
        accelerations[i].z += diff.z * ax;
        accelerations[j].x -= diff.x * bx;
        accelerations[j].y -= diff.y * bx;
        accelerations[j].z -= diff.z * bx;
      }
    }

    for (let i = 0; i < n; i++) {
      const body = this.bodies[i];
      body.data.velocity.addScaledVector(accelerations[i], dt);
      body.data.position.addScaledVector(body.data.velocity, dt);
      body.updatePosition(body.data.position);
    }
  }

  private handleCollisions(): void {
    const toRemove: Set<CelestialBody> = new Set();
    const toMerge: [CelestialBody, CelestialBody][] = [];
    const n = this.bodies.length;

    for (let i = 0; i < n; i++) {
      if (toRemove.has(this.bodies[i])) continue;
      for (let j = i + 1; j < n; j++) {
        if (toRemove.has(this.bodies[j])) continue;
        const a = this.bodies[i];
        const b = this.bodies[j];
        const dist = a.data.position.distanceTo(b.data.position);
        const minDist = a.data.radius + b.data.radius;
        if (dist < minDist) {
          toRemove.add(a);
          toRemove.add(b);
          toMerge.push([a, b]);
        }
      }
    }

    for (const [a, b] of toMerge) {
      this.startMerge(a, b);
    }
  }

  private startMerge(a: CelestialBody, b: CelestialBody): void {
    const idxA = this.bodies.indexOf(a);
    const idxB = this.bodies.indexOf(b);
    if (idxA >= 0) this.bodies.splice(idxA, 1);
    const idxB2 = this.bodies.indexOf(b);
    if (idxB2 >= 0) this.bodies.splice(idxB2, 1);

    const combinedMass = a.data.mass + b.data.mass;
    const centerOfMass = new THREE.Vector3()
      .addScaledVector(a.data.position, a.data.mass)
      .addScaledVector(b.data.position, b.data.mass)
      .divideScalar(combinedMass);

    const combinedVelocity = new THREE.Vector3()
      .addScaledVector(a.data.velocity, a.data.mass)
      .addScaledVector(b.data.velocity, b.data.mass)
      .divideScalar(combinedMass);

    const colorA = a.data.color;
    const colorB = b.data.color;
    const combinedColor = new THREE.Color(
      (colorA.r * a.data.mass + colorB.r * b.data.mass) / combinedMass,
      (colorA.g * a.data.mass + colorB.g * b.data.mass) / combinedMass,
      (colorA.b * a.data.mass + colorB.b * b.data.mass) / combinedMass
    );

    const particlesGroup = new THREE.Group();
    const particles: MergeParticle[] = [];
    for (let i = 0; i < 30; i++) {
      const p = new MergeParticle(centerOfMass.clone(), combinedColor.clone());
      particles.push(p);
      particlesGroup.add(p.mesh);
    }
    this.scene.add(particlesGroup);

    this.pendingMerges.push({
      bodyA: a,
      bodyB: b,
      progress: 0,
      duration: 0.3,
      centerOfMass,
      combinedMass,
      combinedVelocity,
      combinedColor,
      particles,
      particlesGroup,
      scene: this.scene,
    });
  }

  private updatePendingMerges(dt: number): void {
    const remaining: PendingMerge[] = [];
    for (const merge of this.pendingMerges) {
      merge.progress += dt;
      const t = Math.min(1, merge.progress / merge.duration);
      merge.bodyA.setMerging(t);
      merge.bodyB.setMerging(t);

      for (const p of merge.particles) {
        p.update(dt);
      }

      if (merge.progress >= merge.duration) {
        this.scene.remove(merge.bodyA.group);
        this.scene.remove(merge.bodyB.group);
        merge.bodyA.dispose();
        merge.bodyB.dispose();

        const newRadius = this.computeMergedRadius(merge.combinedMass);
        const merged = new CelestialBody(
          merge.centerOfMass,
          merge.combinedVelocity,
          merge.combinedMass,
          merge.combinedColor,
          newRadius
        );
        this.bodies.push(merged);
        this.scene.add(merged.group);

        setTimeout(() => {
          this.scene.remove(merge.particlesGroup);
          for (const p of merge.particles) p.dispose();
        }, 500);
      } else {
        remaining.push(merge);
      }
    }
    this.pendingMerges = remaining;
  }

  private computeMergedRadius(mass: number): number {
    const t = (Math.max(1, Math.min(10, mass)) - 1) / 9;
    return 0.3 + t * 1.7;
  }

  public clearAllTrails(): void {
    for (const body of this.bodies) {
      body.clearTrail();
    }
  }
}
