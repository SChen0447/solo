import * as THREE from 'three';
import type { Connection, LatticeNode } from './NetworkManager';

interface FlowParticle {
  mesh: THREE.Mesh;
  connection: Connection;
  progress: number;
  speed: number;
  active: boolean;
  offset: number;
}

export class ParticleSystem {
  public readonly scene: THREE.Scene;
  private readonly particleGeometry: THREE.SphereGeometry;
  private readonly particleMaterialCache: Map<string, THREE.MeshBasicMaterial> = new Map();
  private readonly particles: FlowParticle[] = [];
  private readonly particleSpacing = 0.3;
  private readonly particleSpeed = 0.5;
  private readonly maxParticlesPerConnection = 8;

  private tempVec = new THREE.Vector3();
  private tempColorA = new THREE.Color();
  private tempColorB = new THREE.Color();

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.particleGeometry = new THREE.SphereGeometry(0.06, 10, 10);
  }

  private getParticleMaterial(color: THREE.Color): THREE.MeshBasicMaterial {
    const key = color.getHexString();
    let mat = this.particleMaterialCache.get(key);
    if (!mat) {
      mat = new THREE.MeshBasicMaterial({
        color: color.clone(),
        transparent: true,
        opacity: 0.85,
      });
      this.particleMaterialCache.set(key, mat);
    }
    return mat;
  }

  private spawnParticle(connection: Connection, initialProgress: number): FlowParticle {
    const mat = this.getParticleMaterial(connection.nodeA.color);
    const mesh = new THREE.Mesh(this.particleGeometry, mat);
    this.scene.add(mesh);
    const particle: FlowParticle = {
      mesh,
      connection,
      progress: initialProgress,
      speed: this.particleSpeed,
      active: true,
      offset: Math.random() * Math.PI * 2,
    };
    this.updateParticlePosition(particle);
    return particle;
  }

  public syncWithConnections(connections: Connection[]): void {
    for (const p of this.particles) {
      if (p.active && !connections.includes(p.connection)) {
        this.recycleParticle(p);
      }
    }

    const connParticleMap = new Map<Connection, FlowParticle[]>();
    for (const p of this.particles) {
      if (p.active) {
        const arr = connParticleMap.get(p.connection) || [];
        arr.push(p);
        connParticleMap.set(p.connection, arr);
      }
    }

    for (const conn of connections) {
      const existing = connParticleMap.get(conn) || [];
      if (existing.length < this.maxParticlesPerConnection) {
        const needed = this.maxParticlesPerConnection - existing.length;
        for (let i = 0; i < needed; i++) {
          const progress = (i + 1) / this.maxParticlesPerConnection;
          this.particles.push(this.spawnParticle(conn, progress));
        }
      }
    }
  }

  private recycleParticle(particle: FlowParticle): void {
    particle.active = false;
    particle.mesh.visible = false;
  }

  private reuseParticle(connection: Connection, initialProgress: number): FlowParticle | null {
    for (const p of this.particles) {
      if (!p.active) {
        p.connection = connection;
        p.progress = initialProgress;
        p.speed = this.particleSpeed;
        p.active = true;
        p.mesh.visible = true;
        p.mesh.material = this.getParticleMaterial(connection.nodeA.color);
        this.updateParticlePosition(p);
        return p;
      }
    }
    return null;
  }

  private updateParticlePosition(particle: FlowParticle): void {
    const { connection, progress } = particle;
    this.tempVec.lerpVectors(connection.nodeA.position, connection.nodeB.position, progress);
    particle.mesh.position.copy(this.tempVec);

    this.tempColorA.copy(connection.nodeA.color);
    this.tempColorB.copy(connection.nodeB.color);
    const mat = particle.mesh.material as THREE.MeshBasicMaterial;
    mat.color.copy(this.tempColorA).lerp(this.tempColorB, progress);
    const scale = 0.7 + 0.3 * Math.sin(progress * Math.PI);
    particle.mesh.scale.setScalar(scale);
  }

  public update(delta: number, elapsed: number): void {
    for (const particle of this.particles) {
      if (!particle.active) continue;

      const dist = particle.connection.distance || particle.connection.nodeA.position.distanceTo(particle.connection.nodeB.position);
      if (dist > 0) {
        particle.progress += (particle.speed * delta) / dist;
      }

      if (particle.progress >= 1) {
        particle.progress = particle.progress % 1;
      }

      this.updateParticlePosition(particle);

      const pulse = 0.6 + 0.4 * Math.sin(elapsed * 3 + particle.offset);
      (particle.mesh.material as THREE.MeshBasicMaterial).opacity = 0.55 + 0.4 * pulse;
    }
  }

  public dispose(): void {
    this.particleGeometry.dispose();
    for (const mat of this.particleMaterialCache.values()) mat.dispose();
    for (const p of this.particles) {
      this.scene.remove(p.mesh);
    }
  }
}
