import * as THREE from 'three';
import { Plant } from './plant';

type Particle = {
  mesh: THREE.Mesh;
  t: number;
  speed: number;
  startTime: number;
};

type Connection = {
  line: THREE.Line;
  plantA: Plant;
  plantB: Plant;
  particles: Particle[];
  lineMaterial: THREE.LineBasicMaterial;
  pulsePhase: number;
  baseColor: THREE.Color;
  particleTimer: number;
};

const CONNECTION_DISTANCE = 3.0;
const PULSE_PERIOD = 2.0;
const PARTICLE_SPEED_PER_FRAME = 0.02;
const PARTICLE_SPAWN_INTERVAL = 0.3;

export class ConnectionManager {
  private scene: THREE.Scene;
  private connections: Map<string, Connection> = new Map();
  private globalTime: number = 0;

  private particleGeom: THREE.SphereGeometry;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.particleGeom = new THREE.SphereGeometry(1, 8, 8);
  }

  private connectionKey(a: Plant, b: Plant): string {
    return a === b ? '' :
      (a.group.id < b.group.id
        ? `${a.group.id}-${b.group.id}`
        : `${b.group.id}-${a.group.id}`);
  }

  private getConnectionKey(a: Plant, b: Plant): string {
    return this.connectionKey(a, b);
  }

  updateConnections(plants: Plant[]): void {
    const activeKeys = new Set<string>();

    for (let i = 0; i < plants.length; i++) {
      for (let j = i + 1; j < plants.length; j++) {
        const a = plants[i];
        const b = plants[j];
        const dist = a.position.distanceTo(b.position);

        if (dist < CONNECTION_DISTANCE && a.isFullyGrown() && b.isFullyGrown()) {
          const key = this.getConnectionKey(a, b);
          activeKeys.add(key);

          if (!this.connections.has(key)) {
            this.addConnection(a, b);
            this.syncPulseSpeed(a, b);
          }
        }
      }
    }

    for (const [key, conn] of this.connections) {
      if (!activeKeys.has(key)) {
        this.removeConnection(key, conn);
      }
    }
  }

  private addConnection(a: Plant, b: Plant): void {
    const key = this.getConnectionKey(a, b);
    const posA = a.getFlowerWorldPosition();
    const posB = b.getFlowerWorldPosition();

    const mixedColor = a.flowerColor.clone().lerp(b.flowerColor, 0.5);

    const points = [posA.clone(), posB.clone()];
    const geom = new THREE.BufferGeometry().setFromPoints(points);
    const mat = new THREE.LineBasicMaterial({
      color: mixedColor,
      transparent: true,
      opacity: 0.6
    });
    const line = new THREE.Line(geom, mat);
    this.scene.add(line);

    const connection: Connection = {
      line,
      plantA: a,
      plantB: b,
      particles: [],
      lineMaterial: mat,
      pulsePhase: Math.random() * Math.PI * 2,
      baseColor: mixedColor,
      particleTimer: 0
    };

    this.connections.set(key, connection);
  }

  private removeConnection(key: string, conn: Connection): void {
    this.scene.remove(conn.line);
    conn.line.geometry.dispose();
    conn.lineMaterial.dispose();

    conn.particles.forEach((p) => {
      this.scene.remove(p.mesh);
      (p.mesh.material as THREE.MeshBasicMaterial).dispose();
    });

    this.connections.delete(key);
  }

  private syncPulseSpeed(a: Plant, b: Plant): void {
    const avgSpeed = (a.pulseSpeed + b.pulseSpeed) / 2;
    a.pulseSpeed = avgSpeed;
    b.pulseSpeed = avgSpeed;
    const avgPhase = (a.pulsePhase + b.pulsePhase) / 2;
    a.pulsePhase = avgPhase;
    b.pulsePhase = avgPhase;
  }

  update(delta: number): void {
    this.globalTime += delta;

    for (const [, conn] of this.connections) {
      const posA = conn.plantA.getFlowerWorldPosition();
      const posB = conn.plantB.getFlowerWorldPosition();

      const positions = conn.line.geometry.attributes.position as THREE.BufferAttribute;
      positions.setXYZ(0, posA.x, posA.y, posA.z);
      positions.setXYZ(1, posB.x, posB.y, posB.z);
      positions.needsUpdate = true;

      conn.pulsePhase += (Math.PI * 2 / PULSE_PERIOD) * delta;
      const pulse = 0.5 + 0.5 * Math.sin(conn.pulsePhase);
      conn.lineMaterial.opacity = 0.35 + pulse * 0.45;

      const brightColor = conn.baseColor.clone().multiplyScalar(0.8 + pulse * 0.4);
      conn.lineMaterial.color.copy(brightColor);

      conn.particleTimer += delta;
      if (conn.particleTimer >= PARTICLE_SPAWN_INTERVAL && conn.particles.length < 8) {
        conn.particleTimer = 0;
        this.spawnParticle(conn);
      }

      this.updateParticles(conn, delta, posA, posB);
    }
  }

  private spawnParticle(conn: Connection): void {
    const size = 0.05 + Math.random() * 0.05;
    const mat = new THREE.MeshBasicMaterial({
      color: conn.baseColor,
      transparent: true,
      opacity: 0.8
    });
    const mesh = new THREE.Mesh(this.particleGeom, mat);
    mesh.scale.setScalar(size);

    const particle: Particle = {
      mesh,
      t: Math.random() < 0.5 ? 0 : 1,
      speed: PARTICLE_SPEED_PER_FRAME * (0.8 + Math.random() * 0.4),
      startTime: this.globalTime
    };

    conn.particles.push(particle);
    this.scene.add(mesh);
  }

  private updateParticles(
    conn: Connection,
    delta: number,
    posA: THREE.Vector3,
    posB: THREE.Vector3
  ): void {
    const alive: Particle[] = [];
    const direction = Math.random() < 0.5 ? 1 : 1;

    for (const p of conn.particles) {
      if (p.t < 0.5) {
        p.t += p.speed * delta * 60;
      } else {
        p.t += p.speed * delta * 60;
      }

      if (p.t < 0 || p.t > 1) {
        this.scene.remove(p.mesh);
        (p.mesh.material as THREE.MeshBasicMaterial).dispose();
        continue;
      }

      const pos = new THREE.Vector3().lerpVectors(posA, posB, p.t);
      p.mesh.position.copy(pos);

      const distFromCenter = Math.abs(p.t - 0.5) * 2;
      const opacity = 0.8 * (1 - distFromCenter * distFromCenter);
      (p.mesh.material as THREE.MeshBasicMaterial).opacity = opacity;

      alive.push(p);
    }

    conn.particles = alive;
  }

  getConnectionCount(): number {
    return this.connections.size;
  }

  dispose(): void {
    for (const [key, conn] of this.connections) {
      this.removeConnection(key, conn);
    }
    this.particleGeom.dispose();
  }
}
