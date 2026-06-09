import * as THREE from 'three';

export interface ParticleParams {
  gravityStrength: number;
  particleLifetime: number;
}

const PALETTE: number[] = [
  0xff0077,
  0x00d4ff,
  0xff8800,
  0xaaff00,
  0xaa00ff
];

const CONTAINER_RADIUS = 8;
const CONTAINER_HEIGHT = 12;
const CONTAINER_HALF_HEIGHT = CONTAINER_HEIGHT / 2;

export class ParticleSystem {
  public points: THREE.Points;
  public geometry: THREE.BufferGeometry;
  public material: THREE.PointsMaterial;

  private maxParticles: number;
  private count: number;

  private positions: Float32Array;
  private velocities: Float32Array;
  private colors: Float32Array;
  private sizes: Float32Array;
  private lifetimes: Float32Array;
  private maxLifetimes: Float32Array;

  private params: ParticleParams;

  constructor(maxParticles: number = 8000, params: ParticleParams) {
    this.maxParticles = maxParticles;
    this.count = 0;
    this.params = { ...params };

    this.positions = new Float32Array(maxParticles * 3);
    this.velocities = new Float32Array(maxParticles * 3);
    this.colors = new Float32Array(maxParticles * 3);
    this.sizes = new Float32Array(maxParticles);
    this.lifetimes = new Float32Array(maxParticles);
    this.maxLifetimes = new Float32Array(maxParticles);

    this.geometry = new THREE.BufferGeometry();
    this.geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    this.geometry.setAttribute('color', new THREE.BufferAttribute(this.colors, 3));
    this.geometry.setAttribute('size', new THREE.BufferAttribute(this.sizes, 1));

    this.geometry.setDrawRange(0, 0);

    const sprite = this.createSpriteTexture();

    this.material = new THREE.PointsMaterial({
      size: 6,
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      map: sprite,
      sizeAttenuation: true
    });

    this.points = new THREE.Points(this.geometry, this.material);
  }

  private createSpriteTexture(): THREE.Texture {
    const size = 64;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;
    const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
    gradient.addColorStop(0.2, 'rgba(255, 255, 255, 0.9)');
    gradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.4)');
    gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);
    const tex = new THREE.CanvasTexture(canvas);
    tex.needsUpdate = true;
    return tex;
  }

  public getCount(): number {
    return this.count;
  }

  public updateParams(params: Partial<ParticleParams>): void {
    Object.assign(this.params, params);
  }

  public addParticles(x: number, y: number, z: number, count: number = 0): void {
    const num = count || (200 + Math.floor(Math.random() * 301));
    const added = Math.min(num, this.maxParticles - this.count);

    for (let i = 0; i < added; i++) {
      const idx = this.count + i;
      const pi3 = idx * 3;

      this.positions[pi3] = x;
      this.positions[pi3 + 1] = y;
      this.positions[pi3 + 2] = z;

      const speed = 3 + Math.random() * 5;
      const coneAngle = Math.random() * Math.PI / 3;
      const coneRot = Math.random() * Math.PI * 2;
      const upY = Math.cos(coneAngle);
      const horiz = Math.sin(coneAngle);
      const vx = horiz * Math.cos(coneRot) * speed;
      const vy = upY * speed;
      const vz = horiz * Math.sin(coneRot) * speed;

      this.velocities[pi3] = vx;
      this.velocities[pi3 + 1] = vy;
      this.velocities[pi3 + 2] = vz;

      const colorIdx = Math.floor(Math.random() * PALETTE.length);
      const color = new THREE.Color(PALETTE[colorIdx]);
      this.colors[pi3] = color.r;
      this.colors[pi3 + 1] = color.g;
      this.colors[pi3 + 2] = color.b;

      this.sizes[idx] = 3 + Math.random() * 5;
      this.lifetimes[idx] = 0;
      this.maxLifetimes[idx] = this.params.particleLifetime;
    }

    this.count += added;
    this.geometry.setDrawRange(0, this.count);
  }

  public reset(): void {
    this.count = 0;
    this.geometry.setDrawRange(0, 0);
    this.positions.fill(0);
    this.velocities.fill(0);
    this.colors.fill(0);
    this.sizes.fill(0);
    this.lifetimes.fill(0);
    this.maxLifetimes.fill(0);
    this.markAttributesUpdated();
  }

  private swapParticles(i: number, j: number): void {
    const i3 = i * 3;
    const j3 = j * 3;

    for (let k = 0; k < 3; k++) {
      let t = this.positions[i3 + k];
      this.positions[i3 + k] = this.positions[j3 + k];
      this.positions[j3 + k] = t;

      t = this.velocities[i3 + k];
      this.velocities[i3 + k] = this.velocities[j3 + k];
      this.velocities[j3 + k] = t;

      t = this.colors[i3 + k];
      this.colors[i3 + k] = this.colors[j3 + k];
      this.colors[j3 + k] = t;
    }

    let t = this.sizes[i];
    this.sizes[i] = this.sizes[j];
    this.sizes[j] = t;

    t = this.lifetimes[i];
    this.lifetimes[i] = this.lifetimes[j];
    this.lifetimes[j] = t;

    t = this.maxLifetimes[i];
    this.maxLifetimes[i] = this.maxLifetimes[j];
    this.maxLifetimes[j] = t;
  }

  public update(dt: number, getForce: (x: number, y: number, z: number, vx: number, vy: number, vz: number) => { fx: number; fy: number; fz: number }): void {
    const damping = 0.95;
    const gravity = this.params.gravityStrength;
    const containerRadiusSq = CONTAINER_RADIUS * CONTAINER_RADIUS;
    const bottomY = -CONTAINER_HALF_HEIGHT;
    const topY = CONTAINER_HALF_HEIGHT;

    for (let i = 0; i < this.count; i++) {
      const i3 = i * 3;

      const px = this.positions[i3];
      const py = this.positions[i3 + 1];
      const pz = this.positions[i3 + 2];

      let vx = this.velocities[i3];
      let vy = this.velocities[i3 + 1];
      let vz = this.velocities[i3 + 2];

      const force = getForce(px, py, pz, vx, vy, vz);
      vx += force.fx * dt;
      vy += (force.fy - gravity) * dt;
      vz += force.fz * dt;

      vx *= damping;
      vy *= damping;
      vz *= damping;

      let nx = px + vx * dt;
      let ny = py + vy * dt;
      let nz = pz + vz * dt;

      const horizDistSq = nx * nx + nz * nz;
      if (horizDistSq > containerRadiusSq) {
        const horizDist = Math.sqrt(horizDistSq);
        const nxN = nx / horizDist;
        const nzN = nz / horizDist;
        nx = nxN * CONTAINER_RADIUS;
        nz = nzN * CONTAINER_RADIUS;
        const dot = vx * nxN + vz * nzN;
        vx -= 2 * dot * nxN * 0.6;
        vz -= 2 * dot * nzN * 0.6;
      }

      if (ny < bottomY) {
        ny = bottomY;
        vy = -vy * 0.3;
        vx *= 0.85;
        vz *= 0.85;
      }
      if (ny > topY) {
        ny = topY;
        vy = -vy * 0.5;
      }

      this.positions[i3] = nx;
      this.positions[i3 + 1] = ny;
      this.positions[i3 + 2] = nz;

      this.velocities[i3] = vx;
      this.velocities[i3 + 1] = vy;
      this.velocities[i3 + 2] = vz;

      this.lifetimes[i] += dt;
    }

    this.handleCollisions();
    this.removeDeadParticles();
    this.markAttributesUpdated();
  }

  private handleCollisions(): void {
    const cellSize = 1.2;
    const grid = new Map<string, number[]>();

    for (let i = 0; i < this.count; i++) {
      const i3 = i * 3;
      const cx = Math.floor(this.positions[i3] / cellSize);
      const cy = Math.floor(this.positions[i3 + 1] / cellSize);
      const cz = Math.floor(this.positions[i3 + 2] / cellSize);
      const key = `${cx},${cy},${cz}`;
      let arr = grid.get(key);
      if (!arr) {
        arr = [];
        grid.set(key, arr);
      }
      arr.push(i);
    }

    const minDistSq = 0.6 * 0.6;

    for (let i = 0; i < this.count; i++) {
      const i3 = i * 3;
      const px = this.positions[i3];
      const py = this.positions[i3 + 1];
      const pz = this.positions[i3 + 2];

      const cx = Math.floor(px / cellSize);
      const cy = Math.floor(py / cellSize);
      const cz = Math.floor(pz / cellSize);

      for (let ox = -1; ox <= 1; ox++) {
        for (let oy = -1; oy <= 1; oy++) {
          for (let oz = -1; oz <= 1; oz++) {
            const key = `${cx + ox},${cy + oy},${cz + oz}`;
            const arr = grid.get(key);
            if (!arr) continue;

            for (const j of arr) {
              if (j <= i) continue;
              const j3 = j * 3;
              const dx = this.positions[j3] - px;
              const dy = this.positions[j3 + 1] - py;
              const dz = this.positions[j3 + 2] - pz;
              const distSq = dx * dx + dy * dy + dz * dz;
              if (distSq < minDistSq && distSq > 0.0001) {
                this.resolveCollision(i, j, dx, dy, dz, distSq);
              }
            }
          }
        }
      }
    }
  }

  private resolveCollision(i: number, j: number, dx: number, dy: number, dz: number, distSq: number): void {
    const dist = Math.sqrt(distSq);
    const nx = dx / dist;
    const ny = dy / dist;
    const nz = dz / dist;

    const i3 = i * 3;
    const j3 = j * 3;

    const ivx = this.velocities[i3];
    const ivy = this.velocities[i3 + 1];
    const ivz = this.velocities[i3 + 2];
    const jvx = this.velocities[j3];
    const jvy = this.velocities[j3 + 1];
    const jvz = this.velocities[j3 + 2];

    const relVx = jvx - ivx;
    const relVy = jvy - ivy;
    const relVz = jvz - ivz;
    const relDot = relVx * nx + relVy * ny + relVz * nz;

    if (relDot < 0) {
      const impulse = relDot * 0.5;
      this.velocities[i3] = ivx + impulse * nx;
      this.velocities[i3 + 1] = ivy + impulse * ny;
      this.velocities[i3 + 2] = ivz + impulse * nz;
      this.velocities[j3] = jvx - impulse * nx;
      this.velocities[j3 + 1] = jvy - impulse * ny;
      this.velocities[j3 + 2] = jvz - impulse * nz;
    }

    const ir = this.colors[i3];
    const ig = this.colors[i3 + 1];
    const ib = this.colors[i3 + 2];
    const jr = this.colors[j3];
    const jg = this.colors[j3 + 1];
    const jb = this.colors[j3 + 2];

    this.colors[i3] = ir * 0.7 + jr * 0.3;
    this.colors[i3 + 1] = ig * 0.7 + jg * 0.3;
    this.colors[i3 + 2] = ib * 0.7 + jb * 0.3;
    this.colors[j3] = jr * 0.7 + ir * 0.3;
    this.colors[j3 + 1] = jg * 0.7 + ig * 0.3;
    this.colors[j3 + 2] = jb * 0.7 + ib * 0.3;
  }

  private removeDeadParticles(): void {
    let write = 0;
    for (let read = 0; read < this.count; read++) {
      if (this.lifetimes[read] < this.maxLifetimes[read]) {
        if (write !== read) {
          this.swapParticles(write, read);
        }

        const remaining = this.maxLifetimes[write] - this.lifetimes[write];
        if (remaining < 1.0) {
          this.sizes[write] *= 0.95;
        }

        write++;
      }
    }
    this.count = write;
    this.geometry.setDrawRange(0, this.count);
  }

  private markAttributesUpdated(): void {
    (this.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
    (this.geometry.attributes.color as THREE.BufferAttribute).needsUpdate = true;
    (this.geometry.attributes.size as THREE.BufferAttribute).needsUpdate = true;
  }

  public dispose(): void {
    this.geometry.dispose();
    this.material.dispose();
    if (this.material.map) this.material.map.dispose();
  }
}
