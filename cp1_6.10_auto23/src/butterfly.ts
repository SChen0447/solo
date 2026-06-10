import * as THREE from 'three';
import { HandGesture } from './handTracker';

const easeInOutCubic = (t: number): number => {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
};

class SimplexNoise {
  private perm: number[];

  constructor(seed: number = Math.random()) {
    this.perm = [];
    for (let i = 0; i < 256; i++) this.perm[i] = i;
    for (let i = 255; i > 0; i--) {
      const j = Math.floor((seed * 16807) % (i + 1));
      [this.perm[i], this.perm[j]] = [this.perm[j], this.perm[i]];
    }
    for (let i = 0; i < 256; i++) this.perm[i + 256] = this.perm[i];
  }

  noise3D(x: number, y: number, z: number): number {
    const X = Math.floor(x) & 255;
    const Y = Math.floor(y) & 255;
    const Z = Math.floor(z) & 255;
    x -= Math.floor(x);
    y -= Math.floor(y);
    z -= Math.floor(z);
    const u = this.fade(x);
    const v = this.fade(y);
    const w = this.fade(z);
    const A = this.perm[X] + Y;
    const AA = this.perm[A] + Z;
    const AB = this.perm[A + 1] + Z;
    const B = this.perm[X + 1] + Y;
    const BA = this.perm[B] + Z;
    const BB = this.perm[B + 1] + Z;
    return this.lerp(
      w,
      this.lerp(
        v,
        this.lerp(u, this.grad(this.perm[AA], x, y, z), this.grad(this.perm[BA], x - 1, y, z)),
        this.lerp(u, this.grad(this.perm[AB], x, y - 1, z), this.grad(this.perm[BB], x - 1, y - 1, z))
      ),
      this.lerp(
        v,
        this.lerp(u, this.grad(this.perm[AA + 1], x, y, z - 1), this.grad(this.perm[BA + 1], x - 1, y, z - 1)),
        this.lerp(u, this.grad(this.perm[AB + 1], x, y - 1, z - 1), this.grad(this.perm[BB + 1], x - 1, y - 1, z - 1))
      )
    );
  }

  private fade(t: number): number {
    return t * t * t * (t * (t * 6 - 15) + 10);
  }

  private lerp(t: number, a: number, b: number): number {
    return a + t * (b - a);
  }

  private grad(hash: number, x: number, y: number, z: number): number {
    const h = hash & 15;
    const u = h < 8 ? x : y;
    const v = h < 4 ? y : h === 12 || h === 14 ? x : z;
    return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v);
  }
}

export class Butterfly {
  mesh: THREE.Group;
  velocity: THREE.Vector3;
  acceleration: THREE.Vector3;
  private leftWing: THREE.Mesh;
  private rightWing: THREE.Mesh;
  private body: THREE.Mesh;
  private glowParticles: THREE.Points;

  private wingFrequency: number;
  private wingPhase: number;
  private baseScale: number;
  private noise: SimplexNoise;
  private noiseOffset: number;

  private currentGesture: HandGesture;
  private transitionProgress: number;
  private transitionDuration: number;
  private isTransitioning: boolean;
  private targetWingScale: number;
  private baseWingFrequency: number;

  private maxSpeed: number = 6;
  private minSpeed: number = 2;

  constructor(scene: THREE.Scene, position?: THREE.Vector3) {
    this.velocity = new THREE.Vector3(
      (Math.random() - 0.5) * 2,
      (Math.random() - 0.5) * 2,
      (Math.random() - 0.5) * 2
    );
    this.acceleration = new THREE.Vector3();
    this.noise = new SimplexNoise(Math.random() * 10000);
    this.noiseOffset = Math.random() * 1000;

    this.currentGesture = HandGesture.OPEN;
    this.transitionProgress = 1;
    this.transitionDuration = 0.5;
    this.isTransitioning = false;
    this.targetWingScale = 1.0;
    this.baseWingFrequency = 0.5 + Math.random() * 1.5;
    this.wingFrequency = this.baseWingFrequency;
    this.wingPhase = Math.random() * Math.PI * 2;
    this.baseScale = 0.15 + Math.random() * 0.15;

    this.mesh = new THREE.Group();
    this.leftWing = this.createWing(true);
    this.rightWing = this.createWing(false);
    this.body = this.createBody();
    this.glowParticles = this.createGlowParticles();

    this.mesh.add(this.leftWing);
    this.mesh.add(this.rightWing);
    this.mesh.add(this.body);
    this.mesh.add(this.glowParticles);

    if (position) {
      this.mesh.position.copy(position);
    } else {
      this.mesh.position.set(
        (Math.random() - 0.5) * 6,
        (Math.random() - 0.5) * 4,
        (Math.random() - 0.5) * 4
      );
    }

    this.mesh.scale.setScalar(this.baseScale);
    scene.add(this.mesh);
  }

  private createWingTexture(): THREE.Texture {
    const size = 128;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;

    const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    gradient.addColorStop(0, 'rgba(120, 180, 255, 0.95)');
    gradient.addColorStop(0.4, 'rgba(80, 140, 220, 0.8)');
    gradient.addColorStop(0.7, 'rgba(60, 100, 180, 0.5)');
    gradient.addColorStop(1, 'rgba(40, 60, 120, 0)');

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.ellipse(size / 2, size / 2 + 10, size / 2 - 5, size / 2 - 5, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = 'rgba(180, 220, 255, 0.6)';
    ctx.lineWidth = 1.5;
    for (let i = 0; i < 5; i++) {
      const angle = (-Math.PI / 3) + (i * Math.PI / 12);
      ctx.beginPath();
      ctx.moveTo(size / 2, size / 2 + 10);
      const len = size / 2 - 10 - Math.abs(i - 2) * 8;
      ctx.lineTo(
        size / 2 + Math.cos(angle) * len,
        size / 2 + 10 + Math.sin(angle) * len
      );
      ctx.stroke();
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
  }

  private createWing(isLeft: boolean): THREE.Mesh {
    const geometry = new THREE.PlaneGeometry(1.2, 1.0);
    const material = new THREE.MeshBasicMaterial({
      map: this.createWingTexture(),
      transparent: true,
      opacity: 0.85,
      side: THREE.DoubleSide,
      depthWrite: false
    });
    const wing = new THREE.Mesh(geometry, material);
    wing.position.x = isLeft ? -0.4 : 0.4;
    wing.position.y = 0.1;
    wing.rotation.y = isLeft ? -0.3 : 0.3;
    if (!isLeft) {
      wing.scale.x = -1;
    }
    return wing;
  }

  private createBody(): THREE.Mesh {
    const geometry = new THREE.CylinderGeometry(0.06, 0.08, 1.2, 8);
    const material = new THREE.MeshBasicMaterial({
      color: 0x334466,
      transparent: true,
      opacity: 0.9
    });
    const body = new THREE.Mesh(geometry, material);
    body.rotation.z = Math.PI / 2;
    return body;
  }

  private createGlowParticles(): THREE.Points {
    const particleCount = 8;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount; i++) {
      const angle = (i / particleCount) * Math.PI * 2;
      const radius = 0.6 + Math.random() * 0.3;
      positions[i * 3] = Math.cos(angle) * radius;
      positions[i * 3 + 1] = Math.sin(angle) * radius * 0.6;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 0.4;

      colors[i * 3] = 0.5 + Math.random() * 0.2;
      colors[i * 3 + 1] = 0.7 + Math.random() * 0.2;
      colors[i * 3 + 2] = 1.0;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
      size: 0.08,
      vertexColors: true,
      transparent: true,
      opacity: 0.7,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    return new THREE.Points(geometry, material);
  }

  setGesture(gesture: HandGesture): void {
    if (gesture === this.currentGesture || gesture === HandGesture.NONE) return;
    this.currentGesture = gesture;
    this.isTransitioning = true;
    this.transitionProgress = 0;
    this.targetWingScale = gesture === HandGesture.FIST ? 0.8 : 1.0;
  }

  applyForce(force: THREE.Vector3): void {
    this.acceleration.add(force);
  }

  separate(butterflies: Butterfly[]): THREE.Vector3 {
    const separation = new THREE.Vector3();
    let count = 0;
    const desiredDistance = 0.6;

    for (const other of butterflies) {
      if (other === this) continue;
      const distance = this.mesh.position.distanceTo(other.mesh.position);
      if (distance > 0 && distance < desiredDistance) {
        const diff = this.mesh.position.clone().sub(other.mesh.position);
        diff.normalize().divideScalar(distance);
        separation.add(diff);
        count++;
      }
    }

    if (count > 0) {
      separation.divideScalar(count);
    }
    return separation.multiplyScalar(2.5);
  }

  align(butterflies: Butterfly[]): THREE.Vector3 {
    const alignment = new THREE.Vector3();
    let count = 0;
    const neighborDistance = 2.0;

    for (const other of butterflies) {
      if (other === this) continue;
      const distance = this.mesh.position.distanceTo(other.mesh.position);
      if (distance > 0 && distance < neighborDistance) {
        alignment.add(other.velocity);
        count++;
      }
    }

    if (count > 0) {
      alignment.divideScalar(count).normalize();
      alignment.multiplyScalar(this.maxSpeed);
      alignment.sub(this.velocity);
      alignment.clampLength(0, 0.4);
    }
    return alignment;
  }

  cohesion(butterflies: Butterfly[]): THREE.Vector3 {
    const center = new THREE.Vector3();
    let count = 0;
    const neighborDistance = 2.5;

    for (const other of butterflies) {
      if (other === this) continue;
      const distance = this.mesh.position.distanceTo(other.mesh.position);
      if (distance > 0 && distance < neighborDistance) {
        center.add(other.mesh.position);
        count++;
      }
    }

    if (count > 0) {
      center.divideScalar(count);
      return this.seek(center).multiplyScalar(0.8);
    }
    return new THREE.Vector3();
  }

  seek(target: THREE.Vector3): THREE.Vector3 {
    const desired = target.clone().sub(this.mesh.position);
    const distance = desired.length();

    if (distance < 0.1) return new THREE.Vector3();

    desired.normalize();

    if (distance < 1.0) {
      desired.multiplyScalar(this.minSpeed + (this.maxSpeed - this.minSpeed) * (distance / 1.0));
    } else {
      desired.multiplyScalar(this.maxSpeed);
    }

    const steer = desired.sub(this.velocity);
    steer.clampLength(0, 0.5);
    return steer;
  }

  update(
    deltaTime: number,
    elapsedTime: number,
    targetPosition: THREE.Vector3,
    handVelocity: THREE.Vector3,
    isHandTracked: boolean,
    butterflies: Butterfly[]
  ): void {
    if (this.isTransitioning) {
      this.transitionProgress += deltaTime / this.transitionDuration;
      if (this.transitionProgress >= 1) {
        this.transitionProgress = 1;
        this.isTransitioning = false;
      }
    }

    const easedProgress = easeInOutCubic(this.transitionProgress);

    const noiseScale = 0.5 + (handVelocity.length() * 0.5);
    const n1 = this.noise.noise3D(
      this.mesh.position.x * 0.3 + this.noiseOffset,
      this.mesh.position.y * 0.3,
      elapsedTime * 0.5
    );
    const n2 = this.noise.noise3D(
      this.mesh.position.y * 0.3,
      this.mesh.position.z * 0.3 + this.noiseOffset,
      elapsedTime * 0.5 + 100
    );
    const n3 = this.noise.noise3D(
      this.mesh.position.z * 0.3 + this.noiseOffset,
      this.mesh.position.x * 0.3,
      elapsedTime * 0.5 + 200
    );
    const noiseForce = new THREE.Vector3(n1, n2, n3).multiplyScalar(noiseScale);

    let seekForce: THREE.Vector3;
    if (isHandTracked) {
      seekForce = this.seek(targetPosition);
    } else {
      seekForce = this.seek(new THREE.Vector3(0, 0, 0)).multiplyScalar(0.4);
    }

    const separationForce = this.separate(butterflies);
    const alignmentForce = this.align(butterflies);
    const cohesionForce = this.cohesion(butterflies);

    this.applyForce(seekForce);
    this.applyForce(noiseForce);
    this.applyForce(separationForce);
    this.applyForce(alignmentForce);
    this.applyForce(cohesionForce);

    this.velocity.add(this.acceleration.clone().multiplyScalar(deltaTime * 60));

    const handSpeed = handVelocity.length();
    const currentMaxSpeed = this.minSpeed + Math.min(handSpeed * 30, this.maxSpeed - this.minSpeed);
    this.velocity.clampLength(0, currentMaxSpeed);

    this.mesh.position.add(this.velocity.clone().multiplyScalar(deltaTime));

    this.acceleration.set(0, 0, 0);

    if (this.velocity.length() > 0.01) {
      const targetRotation = new THREE.Quaternion().setFromUnitVectors(
        new THREE.Vector3(1, 0, 0),
        this.velocity.clone().normalize()
      );
      this.mesh.quaternion.slerp(targetRotation, deltaTime * 5);
    }

    const wingMultiplier = this.currentGesture === HandGesture.FIST ? 1.5 : 1.0;
    this.wingFrequency = this.baseWingFrequency * wingMultiplier;
    this.wingPhase += deltaTime * this.wingFrequency * Math.PI * 2;

    const wingAngle = Math.sin(this.wingPhase) * 0.6;
    this.leftWing.rotation.y = -0.3 + wingAngle;
    this.rightWing.rotation.y = 0.3 - wingAngle;

    const wingScale = 1.0 + (this.targetWingScale - 1.0) * easedProgress;
    this.leftWing.scale.set(wingScale, wingScale, 1);
    this.rightWing.scale.set(wingScale, wingScale, 1);

    this.glowParticles.rotation.y = elapsedTime * 0.5;
    const positions = this.glowParticles.geometry.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < positions.count; i++) {
      const angle = (i / positions.count) * Math.PI * 2 + elapsedTime * 2;
      const radius = 0.5 + Math.sin(elapsedTime * 3 + i) * 0.15;
      positions.setXYZ(
        i,
        Math.cos(angle) * radius,
        Math.sin(angle) * radius * 0.5 + Math.sin(elapsedTime * 2 + i * 0.5) * 0.1,
        Math.sin(angle * 0.7) * 0.3
      );
    }
    positions.needsUpdate = true;

    if (this.currentGesture === HandGesture.OPEN) {
      const colors = this.glowParticles.geometry.attributes.color as THREE.BufferAttribute;
      const speedFactor = Math.min(this.velocity.length() / this.maxSpeed, 1);
      for (let i = 0; i < colors.count; i++) {
        colors.setXYZ(i, 0.4 + speedFactor * 0.2, 0.6 + speedFactor * 0.2, 1.0);
      }
      colors.needsUpdate = true;
    }
  }

  getSpeed(): number {
    return this.velocity.length();
  }
}

export class ButterflySwarm {
  butterflies: Butterfly[];
  private scene: THREE.Scene;

  constructor(scene: THREE.Scene, count: number = 30) {
    this.scene = scene;
    this.butterflies = [];

    for (let i = 0; i < count; i++) {
      const butterfly = new Butterfly(this.scene);
      this.butterflies.push(butterfly);
    }
  }

  setGesture(gesture: HandGesture): void {
    for (const butterfly of this.butterflies) {
      butterfly.setGesture(gesture);
    }
  }

  getAveragePosition(): THREE.Vector3 {
    const center = new THREE.Vector3();
    for (const butterfly of this.butterflies) {
      center.add(butterfly.mesh.position);
    }
    center.divideScalar(this.butterflies.length);
    return center;
  }

  getAverageSpeed(): number {
    let totalSpeed = 0;
    for (const butterfly of this.butterflies) {
      totalSpeed += butterfly.getSpeed();
    }
    return totalSpeed / this.butterflies.length;
  }

  update(
    deltaTime: number,
    elapsedTime: number,
    handPosition: THREE.Vector3,
    handVelocity: THREE.Vector3,
    isHandTracked: boolean
  ): void {
    for (const butterfly of this.butterflies) {
      const targetOffset = new THREE.Vector3(
        (Math.random() - 0.5) * 0.5,
        (Math.random() - 0.5) * 0.5,
        (Math.random() - 0.5) * 0.5
      );
      const target = handPosition.clone().add(targetOffset);
      butterfly.update(
        deltaTime,
        elapsedTime,
        target,
        handVelocity,
        isHandTracked,
        this.butterflies
      );
    }
  }
}
