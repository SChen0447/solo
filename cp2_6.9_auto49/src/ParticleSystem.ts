import * as THREE from 'three';

interface ParticleData {
  basePosition: THREE.Vector3;
  velocity: THREE.Vector3;
  offset: THREE.Vector3;
  size: number;
  phase: number;
}

export class ParticleSystem {
  public readonly points: THREE.Points;

  private readonly particleCount: number = 1800;
  private readonly particles: ParticleData[] = [];
  private readonly positions: Float32Array;
  private readonly colors: Float32Array;
  private readonly sizes: Float32Array;
  private readonly geometry: THREE.BufferGeometry;
  private readonly material: THREE.PointsMaterial;
  private readonly boundsRadius: number = 15;

  private static readonly COLOR_DEFAULT = new THREE.Color(0xcccccc);
  private static readonly COLOR_WARM = new THREE.Color(0xFFAA00);
  private static readonly COLOR_COOL = new THREE.Color(0x3344AA);

  constructor() {
    this.positions = new Float32Array(this.particleCount * 3);
    this.colors = new Float32Array(this.particleCount * 3);
    this.sizes = new Float32Array(this.particleCount);

    this.initParticles();

    this.geometry = new THREE.BufferGeometry();
    this.geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    this.geometry.setAttribute('color', new THREE.BufferAttribute(this.colors, 3));

    this.material = new THREE.PointsMaterial({
      size: 0.3,
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true,
      map: this.createParticleTexture()
    });

    this.points = new THREE.Points(this.geometry, this.material);
  }

  private createParticleTexture(): THREE.Texture {
    const size = 64;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;
    const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    gradient.addColorStop(0.0, 'rgba(255,255,255,1)');
    gradient.addColorStop(0.3, 'rgba(255,255,255,0.7)');
    gradient.addColorStop(0.7, 'rgba(255,255,255,0.15)');
    gradient.addColorStop(1.0, 'rgba(255,255,255,0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);
    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
  }

  private initParticles(): void {
    for (let i = 0; i < this.particleCount; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = this.boundsRadius * Math.pow(Math.random(), 0.6);

      const x = r * Math.sin(phi) * Math.cos(theta);
      const y = r * Math.sin(phi) * Math.sin(theta);
      const z = r * Math.cos(phi);

      const basePos = new THREE.Vector3(x, y, z);

      this.particles.push({
        basePosition: basePos,
        velocity: new THREE.Vector3(
          (Math.random() - 0.5) * 0.5,
          (Math.random() - 0.5) * 0.5,
          (Math.random() - 0.5) * 0.5
        ),
        offset: new THREE.Vector3(),
        size: 0.1 + Math.random() * 0.3,
        phase: Math.random() * Math.PI * 2
      });

      this.positions[i * 3] = x;
      this.positions[i * 3 + 1] = y;
      this.positions[i * 3 + 2] = z;

      this.colors[i * 3] = ParticleSystem.COLOR_DEFAULT.r;
      this.colors[i * 3 + 1] = ParticleSystem.COLOR_DEFAULT.g;
      this.colors[i * 3 + 2] = ParticleSystem.COLOR_DEFAULT.b;

      this.sizes[i] = this.particles[i].size;
    }
  }

  public update(delta: number, sourcePos: THREE.Vector3, sourceVel: THREE.Vector3): void {
    const velocityDir = new THREE.Vector3();
    const speed = sourceVel.length();
    if (speed > 0.001) {
      velocityDir.copy(sourceVel).normalize();
    }
    const speedFactor = Math.min(speed / 10, 1);

    const tmpParticle = new THREE.Vector3();
    const toSource = new THREE.Vector3();
    const tmpColor = new THREE.Color();

    for (let i = 0; i < this.particleCount; i++) {
      const p = this.particles[i];

      tmpParticle.copy(p.basePosition).add(sourcePos).add(p.offset);

      toSource.copy(tmpParticle).sub(sourcePos);
      const dist = toSource.length();

      let doppler = 0;
      if (speed > 0.001 && dist > 0.001) {
        const toSourceDir = toSource.clone().normalize();
        doppler = -toSourceDir.dot(velocityDir);
      }

      const dopplerEffect = doppler * speedFactor;
      const compressionAmount = dopplerEffect * 2.0 * speedFactor;

      const springForce = p.offset.clone().negate().multiplyScalar(3.0);
      p.velocity.add(springForce.multiplyScalar(delta));

      if (dist > 0.1 && dist < this.boundsRadius * 1.5) {
        const pushDir = toSource.clone().normalize();
        const pushForce = pushDir.multiplyScalar(compressionAmount * 5 * delta);
        p.velocity.add(pushForce);
      }

      p.velocity.x += (Math.random() - 0.5) * 2 * delta;
      p.velocity.y += (Math.random() - 0.5) * 2 * delta;
      p.velocity.z += (Math.random() - 0.5) * 2 * delta;

      p.velocity.multiplyScalar(0.92);
      p.offset.add(p.velocity.clone().multiplyScalar(delta));

      const maxOffset = 4;
      if (p.offset.length() > maxOffset) {
        p.offset.normalize().multiplyScalar(maxOffset);
      }

      const finalPos = tmpParticle.copy(p.basePosition).add(sourcePos).add(p.offset);
      this.positions[i * 3] = finalPos.x;
      this.positions[i * 3 + 1] = finalPos.y;
      this.positions[i * 3 + 2] = finalPos.z;

      if (dopplerEffect > 0) {
        tmpColor.copy(ParticleSystem.COLOR_DEFAULT).lerp(ParticleSystem.COLOR_WARM, Math.min(dopplerEffect, 1));
      } else {
        tmpColor.copy(ParticleSystem.COLOR_DEFAULT).lerp(ParticleSystem.COLOR_COOL, Math.min(-dopplerEffect, 1));
      }

      const brightnessBoost = 0.3 * Math.abs(dopplerEffect) * speedFactor;
      tmpColor.r = Math.min(1, tmpColor.r + brightnessBoost);
      tmpColor.g = Math.min(1, tmpColor.g + brightnessBoost);
      tmpColor.b = Math.min(1, tmpColor.b + brightnessBoost);

      this.colors[i * 3] = tmpColor.r;
      this.colors[i * 3 + 1] = tmpColor.g;
      this.colors[i * 3 + 2] = tmpColor.b;
    }

    (this.geometry.getAttribute('position') as THREE.BufferAttribute).needsUpdate = true;
    (this.geometry.getAttribute('color') as THREE.BufferAttribute).needsUpdate = true;
  }

  public dispose(): void {
    this.geometry.dispose();
    this.material.dispose();
    if (this.material.map) this.material.map.dispose();
  }
}
