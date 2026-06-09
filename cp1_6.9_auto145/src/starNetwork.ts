import * as THREE from 'three';
import { StarTrail } from './starTrail';

export interface BurstParticle {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  color: THREE.Color;
  size: number;
  life: number;
  maxLife: number;
}

export interface NetworkNode {
  position: THREE.Vector3;
  mesh: THREE.Mesh;
  pulsePhase: number;
}

export interface ShockWave {
  position: THREE.Vector3;
  mesh: THREE.Mesh;
  radius: number;
  maxRadius: number;
  life: number;
  maxLife: number;
  color: THREE.Color;
}

export class StarNetwork {
  public trails: StarTrail[] = [];
  public nodes: NetworkNode[] = [];
  public burstParticles: BurstParticle[] = [];
  public shockWaves: ShockWave[] = [];
  public intersectionCount: number = 0;
  public totalLength: number = 0;

  private scene: THREE.Scene;
  private burstGeometry: THREE.BufferGeometry | null = null;
  private burstMaterial: THREE.PointsMaterial | null = null;
  private burstPoints: THREE.Points | null = null;

  private readonly startColor: THREE.Color = new THREE.Color(0x88aaff);
  private readonly endColor: THREE.Color = new THREE.Color(0xcc88ff);
  private readonly intersectionDistance: number = 0.3;
  private readonly maxBurstParticles: number = 2000;
  private readonly maxShockWaves: number = 3;
  private readonly colorShiftPerFive: number = 0.1;

  private burstColors: THREE.Color[] = [
    new THREE.Color(0xff88aa),
    new THREE.Color(0x88ffaa),
    new THREE.Color(0xffaa88)
  ];

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.initBurstParticles();
  }

  private initBurstParticles(): void {
    this.burstGeometry = new THREE.BufferGeometry();
    this.burstMaterial = new THREE.PointsMaterial({
      size: 3,
      vertexColors: true,
      transparent: true,
      opacity: 1,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true
    });
    this.burstPoints = new THREE.Points(this.burstGeometry, this.burstMaterial);
    this.scene.add(this.burstPoints);
  }

  public createTrail(): StarTrail {
    const trail = new StarTrail(this.scene);
    this.trails.push(trail);
    return trail;
  }

  public checkIntersections(newTrail: StarTrail): void {
    if (newTrail.particles.length < 2) return;

    for (const existingTrail of this.trails) {
      if (existingTrail === newTrail) continue;
      if (existingTrail.particles.length < 2) continue;

      this.checkTrailIntersection(newTrail, existingTrail);
    }
  }

  private checkTrailIntersection(trail1: StarTrail, trail2: StarTrail): void {
    for (const p1 of trail1.particles) {
      for (const p2 of trail2.particles) {
        const distance = p1.position.distanceTo(p2.position);
        if (distance < this.intersectionDistance) {
          const midPoint = new THREE.Vector3().addVectors(p1.position, p2.position).multiplyScalar(0.5);
          if (!this.nodeExistsAt(midPoint)) {
            this.createIntersection(midPoint);
          }
        }
      }
    }
  }

  private nodeExistsAt(pos: THREE.Vector3): boolean {
    for (const node of this.nodes) {
      if (node.position.distanceTo(pos) < this.intersectionDistance * 2) {
        return true;
      }
    }
    return false;
  }

  private createIntersection(position: THREE.Vector3): void {
    this.intersectionCount++;
    this.spawnBurstParticles(position);
    this.createNode(position);
    this.updateNetworkColor();
  }

  private spawnBurstParticles(position: THREE.Vector3): void {
    const count = 50;
    const actualCount = Math.min(count, this.maxBurstParticles - this.burstParticles.length);

    for (let i = 0; i < actualCount; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const speed = 0.5 + Math.random() * 1.5;

      const velocity = new THREE.Vector3(
        Math.sin(phi) * Math.cos(theta) * speed,
        Math.sin(phi) * Math.sin(theta) * speed,
        Math.cos(phi) * speed
      );

      this.burstParticles.push({
        position: position.clone(),
        velocity,
        color: this.burstColors[Math.floor(Math.random() * this.burstColors.length)].clone(),
        size: 2 + Math.random() * 2,
        life: 1.5,
        maxLife: 1.5
      });
    }
  }

  private createNode(position: THREE.Vector3): void {
    const geometry = new THREE.SphereGeometry(0.2, 16, 16);
    const material = new THREE.MeshBasicMaterial({
      color: this.getCurrentColor(),
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.copy(position);
    this.scene.add(mesh);

    this.nodes.push({
      position: position.clone(),
      mesh,
      pulsePhase: Math.random() * Math.PI * 2
    });
  }

  public getCurrentColor(): THREE.Color {
    const progress = this.getColorProgress();
    return this.startColor.clone().lerp(this.endColor, progress);
  }

  public getColorProgress(): number {
    const steps = Math.floor(this.intersectionCount / 5);
    return Math.min(steps * this.colorShiftPerFive, 1.0);
  }

  public getBloomIntensity(): number {
    return this.getColorProgress() * 0.3;
  }

  private updateNetworkColor(): void {
    const newColor = this.getCurrentColor();
    for (const trail of this.trails) {
      trail.updateColor(newColor);
    }
    for (const node of this.nodes) {
      (node.mesh.material as THREE.MeshBasicMaterial).color.copy(newColor);
    }
  }

  public updateTotalLength(): void {
    this.totalLength = 0;
    for (const trail of this.trails) {
      this.totalLength += trail.totalLength;
    }
  }

  public createShockWave(position: THREE.Vector3, color: THREE.Color): void {
    if (this.shockWaves.length >= this.maxShockWaves) {
      const oldest = this.shockWaves.shift();
      if (oldest) this.scene.remove(oldest.mesh);
    }

    const geometry = new THREE.RingGeometry(0.45, 0.5, 64);
    const material = new THREE.MeshBasicMaterial({
      color: color,
      transparent: true,
      opacity: 0.8,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.copy(position);
    mesh.lookAt(new THREE.Vector3(0, 0, 0));
    this.scene.add(mesh);

    this.shockWaves.push({
      position: position.clone(),
      mesh,
      radius: 0.5,
      maxRadius: 3.0,
      life: 2.0,
      maxLife: 2.0,
      color: color.clone()
    });

    setTimeout(() => {
      this.highlightTrailsNear(position, 3.0);
    }, 100);
  }

  private highlightTrailsNear(position: THREE.Vector3, radius: number): void {
    for (const trail of this.trails) {
      for (const p of trail.particles) {
        if (p.position.distanceTo(position) < radius) {
          trail.triggerHighlight(0.3);
          break;
        }
      }
    }
  }

  public findNearestNode(screenPos: THREE.Vector2, camera: THREE.Camera): NetworkNode | null {
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(screenPos, camera);

    const meshes = this.nodes.map(n => n.mesh);
    const intersects = raycaster.intersectObjects(meshes);

    if (intersects.length > 0) {
      const hitMesh = intersects[0].object;
      return this.nodes.find(n => n.mesh === hitMesh) || null;
    }
    return null;
  }

  public update(deltaTime: number): void {
    for (const trail of this.trails) {
      trail.update(deltaTime);
      if (trail.isActive) {
        trail.updateGeometry();
      }
    }

    this.updateBurstParticles(deltaTime);
    this.updateNodes(deltaTime);
    this.updateShockWaves(deltaTime);
    this.updateTotalLength();
  }

  private updateBurstParticles(deltaTime: number): void {
    for (let i = this.burstParticles.length - 1; i >= 0; i--) {
      const p = this.burstParticles[i];
      p.life -= deltaTime;

      if (p.life <= 0) {
        this.burstParticles.splice(i, 1);
        continue;
      }

      p.position.add(p.velocity.clone().multiplyScalar(deltaTime));
      p.velocity.multiplyScalar(0.98);
    }

    this.updateBurstGeometry();
  }

  private updateBurstGeometry(): void {
    if (!this.burstGeometry || this.burstParticles.length === 0) {
      if (this.burstGeometry) {
        this.burstGeometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(0), 3));
        this.burstGeometry.setAttribute('color', new THREE.BufferAttribute(new Float32Array(0), 3));
        this.burstGeometry.setAttribute('size', new THREE.BufferAttribute(new Float32Array(0), 1));
      }
      return;
    }

    const positions = new Float32Array(this.burstParticles.length * 3);
    const colors = new Float32Array(this.burstParticles.length * 3);
    const sizes = new Float32Array(this.burstParticles.length);

    for (let i = 0; i < this.burstParticles.length; i++) {
      const p = this.burstParticles[i];
      const lifeRatio = p.life / p.maxLife;

      positions[i * 3] = p.position.x;
      positions[i * 3 + 1] = p.position.y;
      positions[i * 3 + 2] = p.position.z;

      colors[i * 3] = p.color.r * lifeRatio;
      colors[i * 3 + 1] = p.color.g * lifeRatio;
      colors[i * 3 + 2] = p.color.b * lifeRatio;

      sizes[i] = p.size * lifeRatio;
    }

    this.burstGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.burstGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    this.burstGeometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    this.burstGeometry.attributes.position.needsUpdate = true;
    this.burstGeometry.attributes.color.needsUpdate = true;
  }

  private updateNodes(deltaTime: number): void {
    for (const node of this.nodes) {
      node.pulsePhase += deltaTime * Math.PI * 2;
      const pulse = 0.8 + 0.2 * Math.sin(node.pulsePhase);
      node.mesh.scale.setScalar(pulse);
      (node.mesh.material as THREE.MeshBasicMaterial).opacity = 0.7 + 0.2 * Math.sin(node.pulsePhase);
    }
  }

  private updateShockWaves(deltaTime: number): void {
    for (let i = this.shockWaves.length - 1; i >= 0; i--) {
      const wave = this.shockWaves[i];
      wave.life -= deltaTime;

      if (wave.life <= 0) {
        this.scene.remove(wave.mesh);
        wave.mesh.geometry.dispose();
        (wave.mesh.material as THREE.Material).dispose();
        this.shockWaves.splice(i, 1);
        continue;
      }

      const t = 1 - wave.life / wave.maxLife;
      wave.radius = 0.5 + (wave.maxRadius - 0.5) * t;

      const newGeometry = new THREE.RingGeometry(wave.radius * 0.95, wave.radius, 64);
      wave.mesh.geometry.dispose();
      wave.mesh.geometry = newGeometry;

      (wave.mesh.material as THREE.MeshBasicMaterial).opacity = 0.8 * (1 - t);
    }
  }

  public getTotalParticleCount(): number {
    let count = this.burstParticles.length;
    for (const trail of this.trails) {
      count += trail.getParticleCount();
    }
    return count;
  }
}
