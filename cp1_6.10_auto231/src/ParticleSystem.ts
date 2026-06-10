import * as THREE from 'three';

interface ParticleData {
  velocity: THREE.Vector3;
  initialAlpha: number;
}

export class ParticleSystem {
  public readonly group: THREE.Group;
  private particles: THREE.Points;
  private particleData: ParticleData[] = [];
  private readonly particleCount = 600;
  private positions: Float32Array;
  private colors: Float32Array;
  private alphas: Float32Array;
  private geometry: THREE.BufferGeometry;
  private material: THREE.PointsMaterial;
  private foliagePositions: { position: THREE.Vector3; radius: number; height: number }[] = [];
  private colorStart = new THREE.Color(0xffe066);
  private colorEnd = new THREE.Color(0xff9f43);
  private attractionStrength = 0.08;
  private texture: THREE.Texture;

  constructor() {
    this.group = new THREE.Group();

    this.texture = this.createCircleTexture();

    this.positions = new Float32Array(this.particleCount * 3);
    this.colors = new Float32Array(this.particleCount * 3);
    this.alphas = new Float32Array(this.particleCount);

    this.geometry = new THREE.BufferGeometry();
    this.geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    this.geometry.setAttribute('color', new THREE.BufferAttribute(this.colors, 3));

    this.material = new THREE.PointsMaterial({
      size: 0.1,
      vertexColors: true,
      transparent: true,
      opacity: 0.6,
      map: this.texture,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true
    });

    this.particles = new THREE.Points(this.geometry, this.material);
    this.group.add(this.particles);
  }

  private createCircleTexture(): THREE.Texture {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d')!;
    const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
    gradient.addColorStop(0.4, 'rgba(255, 255, 255, 0.8)');
    gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 64, 64);
    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
  }

  public setFoliagePositions(
    positions: { position: THREE.Vector3; radius: number; height: number }[]
  ): void {
    this.foliagePositions = positions;
    this.initializeParticles();
  }

  private initializeParticles(): void {
    for (let i = 0; i < this.particleCount; i++) {
      this.resetParticle(i);

      const color = this.colorStart.clone().lerp(this.colorEnd, Math.random());
      this.colors[i * 3] = color.r;
      this.colors[i * 3 + 1] = color.g;
      this.colors[i * 3 + 2] = color.b;

      this.alphas[i] = 0.6;
    }
    this.geometry.attributes.position.needsUpdate = true;
    this.geometry.attributes.color.needsUpdate = true;
  }

  private resetParticle(index: number): void {
    if (this.foliagePositions.length === 0) {
      const angle = Math.random() * Math.PI * 2;
      const radius = Math.random() * 15;
      this.positions[index * 3] = Math.cos(angle) * radius;
      this.positions[index * 3 + 1] = 1 + Math.random() * 4;
      this.positions[index * 3 + 2] = Math.sin(angle) * radius;
    } else {
      const foliage = this.foliagePositions[Math.floor(Math.random() * this.foliagePositions.length)];
      const angle = Math.random() * Math.PI * 2;
      const radius = Math.random() * foliage.radius;
      const heightOffset = (Math.random() - 0.5) * foliage.height;
      this.positions[index * 3] = foliage.position.x + Math.cos(angle) * radius;
      this.positions[index * 3 + 1] = foliage.position.y + heightOffset;
      this.positions[index * 3 + 2] = foliage.position.z + Math.sin(angle) * radius;
    }

    const fallSpeed = 0.01 + Math.random() * 0.02;
    this.particleData[index] = {
      velocity: new THREE.Vector3(
        (Math.random() - 0.5) * 0.005,
        -fallSpeed,
        (Math.random() - 0.5) * 0.005
      ),
      initialAlpha: 0.6
    };
  }

  private resetParticleToOpposite(index: number, mouseWorld: THREE.Vector3): void {
    const currentPos = new THREE.Vector3(
      this.positions[index * 3],
      this.positions[index * 3 + 1],
      this.positions[index * 3 + 2]
    );

    const dx = currentPos.x - mouseWorld.x;
    const dz = currentPos.z - mouseWorld.z;
    const dist = Math.sqrt(dx * dx + dz * dz);

    if (dist < 0.001) {
      this.resetParticle(index);
      return;
    }

    const oppositeX = mouseWorld.x - dx * (1 + Math.random());
    const oppositeZ = mouseWorld.z - dz * (1 + Math.random());
    const offsetY = (Math.random() - 0.5) * 2;

    if (this.foliagePositions.length > 0) {
      const foliage = this.foliagePositions[Math.floor(Math.random() * this.foliagePositions.length)];
      this.positions[index * 3] = (oppositeX + foliage.position.x) * 0.5;
      this.positions[index * 3 + 1] = foliage.position.y + offsetY;
      this.positions[index * 3 + 2] = (oppositeZ + foliage.position.z) * 0.5;
    } else {
      this.positions[index * 3] = oppositeX;
      this.positions[index * 3 + 1] = 2 + Math.random() * 3 + offsetY;
      this.positions[index * 3 + 2] = oppositeZ;
    }

    const fallSpeed = 0.01 + Math.random() * 0.02;
    this.particleData[index].velocity.set(
      (Math.random() - 0.5) * 0.005,
      -fallSpeed,
      (Math.random() - 0.5) * 0.005
    );
    this.alphas[index] = 0.6;
  }

  public update(mouseWorld: THREE.Vector3, deltaTime: number): void {
    const dt = Math.min(deltaTime, 0.033) * 60;

    for (let i = 0; i < this.particleCount; i++) {
      const idx3 = i * 3;
      const px = this.positions[idx3];
      const py = this.positions[idx3 + 1];
      const pz = this.positions[idx3 + 2];

      const data = this.particleData[i];

      const dx = mouseWorld.x - px;
      const dy = mouseWorld.y - py;
      const dz = mouseWorld.z - pz;
      const distSq = dx * dx + dy * dy + dz * dz;
      const dist = Math.sqrt(distSq);

      if (dist > 0.001) {
        const force = this.attractionStrength / Math.max(dist, 1);
        data.velocity.x += (dx / dist) * force * dt;
        data.velocity.y += (dy / dist) * force * dt * 0.5;
        data.velocity.z += (dz / dist) * force * dt;
      }

      data.velocity.x *= 0.98;
      data.velocity.y *= 0.995;
      data.velocity.z *= 0.98;

      this.positions[idx3] += data.velocity.x * dt;
      this.positions[idx3 + 1] += data.velocity.y * dt;
      this.positions[idx3 + 2] += data.velocity.z * dt;

      if (this.positions[idx3 + 1] <= 0) {
        this.positions[idx3 + 1] = 0;
        data.velocity.y = Math.abs(data.velocity.y) * 0.5;
      }

      if (this.positions[idx3 + 1] > 5) {
        this.resetParticle(i);
        continue;
      }

      if (dist < 0.5) {
        this.alphas[i] = Math.min(0.9, this.alphas[i] + 0.05 * dt);
      } else if (dist < 2) {
        const t = (dist - 0.5) / 1.5;
        this.alphas[i] = 0.9 - t * 0.3;
      } else {
        this.alphas[i] = Math.max(0.6, this.alphas[i] - 0.02 * dt);
      }

      if (dist < 0.3) {
        this.resetParticleToOpposite(i, mouseWorld);
      }
    }

    this.geometry.attributes.position.needsUpdate = true;

    let avgAlpha = 0;
    for (let i = 0; i < this.particleCount; i++) {
      avgAlpha += this.alphas[i];
    }
    this.material.opacity = avgAlpha / this.particleCount;
  }
}
