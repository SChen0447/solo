import * as THREE from 'three';

const PARTICLE_COUNT_PER_BURST = 20;
const RING_LIFETIME = 0.5;
const PARTICLE_LIFETIME = 1.5;

interface BurstParticle {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  life: number;
  maxLife: number;
  size: number;
  color: THREE.Color;
}

interface RingEffect {
  mesh: THREE.Mesh;
  life: number;
  maxLife: number;
}

export class ParticleSystem {
  group: THREE.Group;
  private particles: BurstParticle[] = [];
  private points: THREE.Points;
  private ringEffects: RingEffect[] = [];
  private geometry: THREE.BufferGeometry;
  private positionAttr: Float32Array;
  private sizeAttr: Float32Array;
  private colorAttr: Float32Array;
  private maxParticles: number;

  constructor() {
    this.group = new THREE.Group();
    this.maxParticles = PARTICLE_COUNT_PER_BURST * 10;
    const total = this.maxParticles;

    this.positionAttr = new Float32Array(total * 3);
    this.sizeAttr = new Float32Array(total);
    this.colorAttr = new Float32Array(total * 3);

    this.geometry = new THREE.BufferGeometry();
    this.geometry.setAttribute('position', new THREE.BufferAttribute(this.positionAttr, 3));
    this.geometry.setAttribute('size', new THREE.BufferAttribute(this.sizeAttr, 1));
    this.geometry.setAttribute('color', new THREE.BufferAttribute(this.colorAttr, 3));

    const material = new THREE.PointsMaterial({
      size: 5,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.6,
      vertexColors: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    this.points = new THREE.Points(this.geometry, material);
    this.group.add(this.points);
  }

  spawn(position: THREE.Vector3, color: THREE.Color): void {
    for (let i = 0; i < PARTICLE_COUNT_PER_BURST; i++) {
      const dir = new THREE.Vector3(
        (Math.random() - 0.5) * 2,
        (Math.random() - 0.5) * 2,
        (Math.random() - 0.5) * 2,
      ).normalize();

      const speed = 30 + Math.random() * 40;
      const size = 4 + Math.random() * 2;

      this.particles.push({
        position: position.clone(),
        velocity: dir.multiplyScalar(speed),
        life: PARTICLE_LIFETIME,
        maxLife: PARTICLE_LIFETIME,
        size,
        color: color.clone(),
      });
    }

    if (this.particles.length > this.maxParticles) {
      this.particles.splice(0, this.particles.length - this.maxParticles);
    }

    this.spawnRing(position, color);
  }

  private spawnRing(position: THREE.Vector3, color: THREE.Color): void {
    const innerRadius = 20;
    const outerRadius = 40;
    const geometry = new THREE.RingGeometry(innerRadius, outerRadius, 32);
    const material = new THREE.MeshBasicMaterial({
      color: color,
      transparent: true,
      opacity: 0.4,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.copy(position);
    mesh.lookAt(position.clone().add(new THREE.Vector3(0, 0, 1)));

    this.group.add(mesh);
    this.ringEffects.push({
      mesh,
      life: RING_LIFETIME,
      maxLife: RING_LIFETIME,
    });
  }

  update(delta: number): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= delta;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
        continue;
      }
      p.position.add(p.velocity.clone().multiplyScalar(delta));
      p.velocity.multiplyScalar(1 - delta * 2);
    }

    for (let i = this.ringEffects.length - 1; i >= 0; i--) {
      const ring = this.ringEffects[i];
      ring.life -= delta;
      if (ring.life <= 0) {
        this.group.remove(ring.mesh);
        ring.mesh.geometry.dispose();
        (ring.mesh.material as THREE.Material).dispose();
        this.ringEffects.splice(i, 1);
        continue;
      }
      const progress = 1 - ring.life / ring.maxLife;
      (ring.mesh.material as THREE.MeshBasicMaterial).opacity = 0.4 * (1 - progress);
      ring.mesh.scale.setScalar(1 + progress * 0.5);
    }

    this.updatePointsGeometry();
  }

  private updatePointsGeometry(): void {
    const count = Math.min(this.particles.length, this.maxParticles);

    for (let i = 0; i < count; i++) {
      const p = this.particles[i];
      const lifeRatio = p.life / p.maxLife;

      this.positionAttr[i * 3] = p.position.x;
      this.positionAttr[i * 3 + 1] = p.position.y;
      this.positionAttr[i * 3 + 2] = p.position.z;

      this.sizeAttr[i] = p.size * lifeRatio;

      this.colorAttr[i * 3] = p.color.r * lifeRatio;
      this.colorAttr[i * 3 + 1] = p.color.g * lifeRatio;
      this.colorAttr[i * 3 + 2] = p.color.b * lifeRatio;
    }

    for (let i = count; i < this.maxParticles; i++) {
      this.positionAttr[i * 3] = 0;
      this.positionAttr[i * 3 + 1] = 0;
      this.positionAttr[i * 3 + 2] = 0;
      this.sizeAttr[i] = 0;
    }

    this.geometry.attributes.position.needsUpdate = true;
    this.geometry.attributes.size.needsUpdate = true;
    this.geometry.attributes.color.needsUpdate = true;
    this.geometry.setDrawRange(0, count);
  }

  dispose(): void {
    this.geometry.dispose();
    (this.points.material as THREE.Material).dispose();
    this.ringEffects.forEach(r => {
      r.mesh.geometry.dispose();
      (r.mesh.material as THREE.Material).dispose();
    });
  }
}
