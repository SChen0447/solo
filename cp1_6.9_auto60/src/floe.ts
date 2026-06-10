import * as THREE from 'three';
import { EffectsManager } from './effects';
import { Iceberg } from './iceberg';
import { Ocean } from './ocean';

interface Floe {
  mesh: THREE.Mesh;
  velocity: THREE.Vector3;
  angularVelocity: THREE.Vector3;
  radius: number;
  baseY: number;
  isFlipping: boolean;
  flipProgress: number;
  flipDuration: number;
  flipAxis: THREE.Vector3;
  originalRotation: THREE.Euler;
  isBottomVisible: boolean;
  accelerationMultiplier: number;
  accelerationTimer: number;
  bobOffset: number;
  bobSpeed: number;
}

export class FloeManager {
  private scene: THREE.Scene;
  private effects: EffectsManager;
  private iceberg: Iceberg;
  private floes: Floe[] = [];
  private readonly MAX_FLOES = 100;
  private readonly OCEAN_HALF = 28;

  constructor(scene: THREE.Scene, effects: EffectsManager, iceberg: Iceberg) {
    this.scene = scene;
    this.effects = effects;
    this.iceberg = iceberg;
    this.spawnInitialFloes();
  }

  private spawnInitialFloes(): void {
    for (let i = 0; i < 20; i++) {
      this.createRandomFloe();
    }
  }

  private createRandomFloe(): void {
    const radius = 0.2 + Math.random() * 0.3;
    const geom = this.createHexahedronGeometry(radius);
    const mat = new THREE.MeshPhysicalMaterial({
      color: 0xccddee,
      transparent: true,
      opacity: 0.85,
      roughness: 0.2,
      metalness: 0.05,
      transmission: 0.08,
      thickness: 0.3,
      clearcoat: 0.25,
      emissive: 0xccddee,
      emissiveIntensity: 0.15
    });
    const mesh = new THREE.Mesh(geom, mat);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.userData.isFloe = true;
    mesh.userData.radius = radius;

    let x, z;
    do {
      x = (Math.random() - 0.5) * this.OCEAN_HALF * 1.6;
      z = (Math.random() - 0.5) * this.OCEAN_HALF * 1.6;
    } while (Math.sqrt(x * x + z * z) < 4);

    mesh.position.set(x, 0, z);
    mesh.rotation.set(
      Math.random() * Math.PI,
      Math.random() * Math.PI * 2,
      Math.random() * Math.PI
    );
    this.scene.add(mesh);

    const speed = 0.03 + Math.random() * 0.08;
    const angle = Math.random() * Math.PI * 2;
    const floe: Floe = {
      mesh,
      velocity: new THREE.Vector3(Math.cos(angle) * speed, 0, Math.sin(angle) * speed),
      angularVelocity: new THREE.Vector3(
        (Math.random() - 0.5) * 0.3,
        (Math.random() - 0.5) * 0.5,
        (Math.random() - 0.5) * 0.3
      ),
      radius,
      baseY: 0,
      isFlipping: false,
      flipProgress: 0,
      flipDuration: 0.2,
      flipAxis: new THREE.Vector3(0, 0, 1),
      originalRotation: mesh.rotation.clone(),
      isBottomVisible: false,
      accelerationMultiplier: 1,
      accelerationTimer: 0,
      bobOffset: Math.random() * Math.PI * 2,
      bobSpeed: 0.8 + Math.random() * 0.6
    };
    this.floes.push(floe);
  }

  private createHexahedronGeometry(radius: number): THREE.BufferGeometry {
    const geom = new THREE.BoxGeometry(radius * 2, radius * 1.1, radius * 2);
    const pos = geom.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < pos.count; i++) {
      pos.setX(i, pos.getX(i) * (0.85 + Math.random() * 0.3));
      pos.setY(i, pos.getY(i) * (0.8 + Math.random() * 0.4));
      pos.setZ(i, pos.getZ(i) * (0.85 + Math.random() * 0.3));
    }
    geom.computeVertexNormals();
    return geom;
  }

  public getFloeCount(): number {
    return this.floes.length;
  }

  public getClickableObjects(): THREE.Object3D[] {
    return this.floes.map(f => f.mesh);
  }

  public addFloe(mesh: THREE.Mesh, velocity: THREE.Vector3, angularVelocity: THREE.Vector3): void {
    while (this.floes.length >= this.MAX_FLOES) {
      this.removeFarthestFloe();
    }

    const radius = mesh.userData.radius || 0.3;
    const floe: Floe = {
      mesh,
      velocity: velocity.clone(),
      angularVelocity: angularVelocity.clone().multiplyScalar(0.2),
      radius,
      baseY: 0,
      isFlipping: false,
      flipProgress: 0,
      flipDuration: 0.2,
      flipAxis: new THREE.Vector3(1, 0, 0),
      originalRotation: mesh.rotation.clone(),
      isBottomVisible: false,
      accelerationMultiplier: 1,
      accelerationTimer: 0,
      bobOffset: Math.random() * Math.PI * 2,
      bobSpeed: 0.8 + Math.random() * 0.6
    };
    this.floes.push(floe);
  }

  private removeFarthestFloe(): void {
    if (this.floes.length === 0) return;
    let farthestIdx = 0;
    let farthestDist = 0;
    for (let i = 0; i < this.floes.length; i++) {
      const d = this.floes[i].mesh.position.lengthSq();
      if (d > farthestDist) {
        farthestDist = d;
        farthestIdx = i;
      }
    }
    const f = this.floes[farthestIdx];
    this.scene.remove(f.mesh);
    f.mesh.geometry.dispose();
    (f.mesh.material as THREE.Material).dispose();
    this.floes.splice(farthestIdx, 1);
  }

  public flipFloe(mesh: THREE.Object3D): void {
    for (const floe of this.floes) {
      if (floe.mesh === mesh && !floe.isFlipping) {
        floe.isFlipping = true;
        floe.flipProgress = 0;
        floe.originalRotation = floe.mesh.rotation.clone();
        floe.flipAxis = new THREE.Vector3(
          Math.random() - 0.5,
          Math.random() - 0.5,
          Math.random() - 0.5
        ).normalize();
        break;
      }
    }
  }

  public applyCurrentAcceleration(path: THREE.Vector3[]): void {
    if (path.length < 2) return;

    for (const floe of this.floes) {
      for (let i = 0; i < path.length - 1; i++) {
        const p1 = path[i];
        const p2 = path[i + 1];
        const dist = this.pointToSegmentDistance(floe.mesh.position, p1, p2);
        if (dist < 1.0) {
          floe.accelerationMultiplier = 2;
          floe.accelerationTimer = 3.0;
          const dir = p2.clone().sub(p1).normalize();
          const currentSpeed = floe.velocity.length();
          floe.velocity.lerp(dir.multiplyScalar(currentSpeed * 1.5), 0.5);
          break;
        }
      }
    }
  }

  private pointToSegmentDistance(point: THREE.Vector3, a: THREE.Vector3, b: THREE.Vector3): number {
    const ab = b.clone().sub(a);
    const ap = point.clone().sub(a);
    const abLenSq = ab.lengthSq();
    if (abLenSq === 0) return ap.length();
    let t = ap.dot(ab) / abLenSq;
    t = Math.max(0, Math.min(1, t));
    const projection = a.clone().add(ab.multiplyScalar(t));
    return point.distanceTo(projection);
  }

  public update(dt: number, elapsed: number, ocean: Ocean): void {
    for (let i = this.floes.length - 1; i >= 0; i--) {
      const floe = this.floes[i];

      if (floe.accelerationTimer > 0) {
        floe.accelerationTimer -= dt;
        if (floe.accelerationTimer <= 0) {
          floe.accelerationMultiplier = 1;
        }
      }

      if (!floe.isFlipping) {
        const speedChange = 0.3;
        const targetAngle = Math.atan2(floe.velocity.z, floe.velocity.x) + (Math.sin(elapsed * 0.3 + floe.bobOffset) * 0.15);
        const targetSpeed = (0.05 + Math.random() * 0.02) * floe.accelerationMultiplier;
        const currentSpeed = floe.velocity.length();
        const newSpeed = currentSpeed + (targetSpeed - currentSpeed) * speedChange * dt;
        floe.velocity.set(
          Math.cos(targetAngle) * newSpeed,
          0,
          Math.sin(targetAngle) * newSpeed
        );
      }

      floe.mesh.position.x += floe.velocity.x * dt;
      floe.mesh.position.z += floe.velocity.z * dt;

      const boundary = this.OCEAN_HALF;
      if (floe.mesh.position.x > boundary) floe.velocity.x = -Math.abs(floe.velocity.x);
      if (floe.mesh.position.x < -boundary) floe.velocity.x = Math.abs(floe.velocity.x);
      if (floe.mesh.position.z > boundary) floe.velocity.z = -Math.abs(floe.velocity.z);
      if (floe.mesh.position.z < -boundary) floe.velocity.z = Math.abs(floe.velocity.z);
      floe.mesh.position.x = Math.max(-boundary, Math.min(boundary, floe.mesh.position.x));
      floe.mesh.position.z = Math.max(-boundary, Math.min(boundary, floe.mesh.position.z));

      const waveHeight = ocean.getWaveHeight(
        floe.mesh.position.x,
        floe.mesh.position.z,
        elapsed
      );
      const bob = Math.sin(elapsed * floe.bobSpeed + floe.bobOffset) * 0.04;
      floe.mesh.position.y = waveHeight + bob;

      if (!floe.isFlipping) {
        floe.mesh.rotation.x += floe.angularVelocity.x * dt;
        floe.mesh.rotation.y += floe.angularVelocity.y * dt;
        floe.mesh.rotation.z += floe.angularVelocity.z * dt;
      }

      if (floe.isFlipping) {
        floe.flipProgress += dt / floe.flipDuration;
        const t = Math.min(floe.flipProgress, 1);
        const eased = 1 - Math.pow(1 - t, 3);
        const totalRotation = Math.PI;

        const qStart = new THREE.Quaternion().setFromEuler(floe.originalRotation);
        const qFlip = new THREE.Quaternion().setFromAxisAngle(floe.flipAxis, totalRotation * eased);
        floe.mesh.quaternion.copy(qStart.premultiply(qFlip));

        if (floe.flipProgress >= 1) {
          floe.isFlipping = false;
          floe.isBottomVisible = !floe.isBottomVisible;
          const mat = floe.mesh.material as THREE.MeshPhysicalMaterial;
          if (floe.isBottomVisible) {
            mat.color.setHex(0x336699);
            mat.emissive.setHex(0x336699);
            mat.emissiveIntensity = 0.1;
          } else {
            mat.color.setHex(0xccddee);
            mat.emissive.setHex(0xccddee);
            mat.emissiveIntensity = 0.15;
          }
        }
      }
    }

    this.handleCollisions(dt);
  }

  private handleCollisions(dt: number): void {
    for (let i = 0; i < this.floes.length; i++) {
      for (let j = i + 1; j < this.floes.length; j++) {
        const a = this.floes[i];
        const b = this.floes[j];
        const dx = b.mesh.position.x - a.mesh.position.x;
        const dz = b.mesh.position.z - a.mesh.position.z;
        const distSq = dx * dx + dz * dz;
        const minDist = a.radius + b.radius;

        if (distSq < minDist * minDist && distSq > 0.0001) {
          const dist = Math.sqrt(distSq);
          const nx = dx / dist;
          const nz = dz / dist;
          const overlap = (minDist - dist) * 0.5;

          a.mesh.position.x -= nx * overlap;
          a.mesh.position.z -= nz * overlap;
          b.mesh.position.x += nx * overlap;
          b.mesh.position.z += nz * overlap;

          const relVx = b.velocity.x - a.velocity.x;
          const relVz = b.velocity.z - a.velocity.z;
          const relDot = relVx * nx + relVz * nz;

          if (relDot < 0) {
            const impulse = relDot * 0.5;
            a.velocity.x += impulse * nx;
            a.velocity.z += impulse * nz;
            b.velocity.x -= impulse * nx;
            b.velocity.z -= impulse * nz;

            const midPoint = new THREE.Vector3(
              (a.mesh.position.x + b.mesh.position.x) * 0.5,
              (a.mesh.position.y + b.mesh.position.y) * 0.5,
              (a.mesh.position.z + b.mesh.position.z) * 0.5
            );
            this.effects.spawnCollisionIce(midPoint, new THREE.Vector3(nx, 0, nz));
          }
        }
      }
    }
  }
}
