import * as THREE from 'three';

interface ParticleData {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  size: number;
}

interface FlashData {
  position: THREE.Vector3;
  color: THREE.Color;
  size: number;
  life: number;
  maxLife: number;
}

export interface ParticleSystemParams {
  particleCount: number;
  gravityStrength: number;
  orbitSpeed: number;
}

export class ParticleSystem {
  private scene: THREE.Scene;
  private particles: ParticleData[] = [];
  private points!: THREE.Points;
  private geometry!: THREE.BufferGeometry;
  private material!: THREE.PointsMaterial;
  private gravityCenters: { position: THREE.Vector3; color: THREE.Color; mesh: THREE.Mesh; halo: THREE.Mesh }[] = [];
  private flashes: FlashData[] = [];
  private flashMeshes: THREE.Mesh[] = [];
  private maxFlashes = 50;
  private params: ParticleSystemParams;
  private positionsArray!: Float32Array;
  private colorsArray!: Float32Array;
  private sizesArray!: Float32Array;

  private static readonly GRAVITY_CENTER_COLORS = [0xff6b6b, 0x6bcbff, 0xf0e68c];
  private static readonly SHELL_RADIUS = 80;
  private static readonly DAMPING = 0.998;
  private static readonly COLLISION_DISTANCE = 1.2;
  private static readonly FLASH_DURATION = 0.3;
  private static readonly GRID_CELL_SIZE = 2.4;

  private warmColor = new THREE.Color(0xff6b6b);
  private coolColor = new THREE.Color(0x6bcbff);
  private tempColor = new THREE.Color();

  constructor(scene: THREE.Scene, params: ParticleSystemParams) {
    this.scene = scene;
    this.params = { ...params };
    this.init();
  }

  private init(): void {
    this.createGravityCenters();
    this.createParticleGeometry();
    this.createFlashPool();
    this.generateParticles(this.params.particleCount);
  }

  private createGravityCenters(): void {
    const positions = [
      new THREE.Vector3(-25, 10, 0),
      new THREE.Vector3(25, -10, 15),
      new THREE.Vector3(0, 20, -25)
    ];

    for (let i = 0; i < 3; i++) {
      const color = new THREE.Color(ParticleSystem.GRAVITY_CENTER_COLORS[i]);
      const position = positions[i];

      const coreGeometry = new THREE.SphereGeometry(2, 32, 32);
      const coreMaterial = new THREE.MeshBasicMaterial({
        color: color,
        transparent: true,
        opacity: 0.9
      });
      const coreMesh = new THREE.Mesh(coreGeometry, coreMaterial);
      coreMesh.position.copy(position);
      this.scene.add(coreMesh);

      const haloGeometry = new THREE.SphereGeometry(2.2, 32, 32);
      const haloMaterial = new THREE.MeshBasicMaterial({
        color: color,
        transparent: true,
        opacity: 0.3,
        side: THREE.BackSide
      });
      const haloMesh = new THREE.Mesh(haloGeometry, haloMaterial);
      haloMesh.position.copy(position);
      this.scene.add(haloMesh);

      this.gravityCenters.push({ position, color, mesh: coreMesh, halo: haloMesh });
    }
  }

  private createParticleGeometry(): void {
    this.geometry = new THREE.BufferGeometry();
    this.material = new THREE.PointsMaterial({
      size: 1,
      sizeAttenuation: true,
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    this.points = new THREE.Points(this.geometry, this.material);
    this.scene.add(this.points);
  }

  private createFlashPool(): void {
    for (let i = 0; i < this.maxFlashes; i++) {
      const geometry = new THREE.SphereGeometry(1, 16, 16);
      const material = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.visible = false;
      this.scene.add(mesh);
      this.flashMeshes.push(mesh);
    }
  }

  public generateParticles(count: number): void {
    this.particles = [];

    for (let i = 0; i < count; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = Math.pow(Math.random(), 1 / 3) * ParticleSystem.SHELL_RADIUS;

      const position = new THREE.Vector3(
        r * Math.sin(phi) * Math.cos(theta),
        r * Math.sin(phi) * Math.sin(theta),
        r * Math.cos(phi)
      );

      const velocity = new THREE.Vector3(
        (Math.random() - 0.5) * 0.5,
        (Math.random() - 0.5) * 0.5,
        (Math.random() - 0.5) * 0.5
      );

      this.particles.push({
        position,
        velocity,
        size: 1.5 + Math.random() * 2.5
      });
    }

    this.positionsArray = new Float32Array(count * 3);
    this.colorsArray = new Float32Array(count * 3);
    this.sizesArray = new Float32Array(count);

    this.geometry.setAttribute('position', new THREE.BufferAttribute(this.positionsArray, 3));
    this.geometry.setAttribute('color', new THREE.BufferAttribute(this.colorsArray, 3));
    this.geometry.setAttribute('size', new THREE.BufferAttribute(this.sizesArray, 1));
  }

  private updateBufferGeometry(): void {
    const count = this.particles.length;

    for (let i = 0; i < count; i++) {
      const p = this.particles[i];
      const idx3 = i * 3;
      this.positionsArray[idx3] = p.position.x;
      this.positionsArray[idx3 + 1] = p.position.y;
      this.positionsArray[idx3 + 2] = p.position.z;

      let minDist = Infinity;
      for (let g = 0; g < this.gravityCenters.length; g++) {
        const gc = this.gravityCenters[g];
        const dx = p.position.x - gc.position.x;
        const dy = p.position.y - gc.position.y;
        const dz = p.position.z - gc.position.z;
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
        if (dist < minDist) minDist = dist;
      }
      const t = Math.min(1, minDist / ParticleSystem.SHELL_RADIUS);
      this.tempColor.copy(this.warmColor).lerp(this.coolColor, t);
      this.colorsArray[idx3] = this.tempColor.r;
      this.colorsArray[idx3 + 1] = this.tempColor.g;
      this.colorsArray[idx3 + 2] = this.tempColor.b;

      this.sizesArray[i] = p.size;
    }

    this.geometry.attributes.position.needsUpdate = true;
    this.geometry.attributes.color.needsUpdate = true;
  }

  private getColorForPosition(pos: THREE.Vector3): THREE.Color {
    let minDist = Infinity;
    for (const gc of this.gravityCenters) {
      const dx = pos.x - gc.position.x;
      const dy = pos.y - gc.position.y;
      const dz = pos.z - gc.position.z;
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
      if (dist < minDist) minDist = dist;
    }
    const t = Math.min(1, minDist / ParticleSystem.SHELL_RADIUS);
    return this.warmColor.clone().lerp(this.coolColor, t);
  }

  public update(deltaTime: number, cameraDistance: number): void {
    const dt = Math.min(deltaTime, 0.05) * this.params.orbitSpeed;
    const G = this.params.gravityStrength;
    const collisionDistSq = ParticleSystem.COLLISION_DISTANCE * ParticleSystem.COLLISION_DISTANCE;

    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      let ax = 0, ay = 0, az = 0;

      for (let g = 0; g < this.gravityCenters.length; g++) {
        const gc = this.gravityCenters[g];
        const dx = gc.position.x - p.position.x;
        const dy = gc.position.y - p.position.y;
        const dz = gc.position.z - p.position.z;
        const distSq = dx * dx + dy * dy + dz * dz;
        const dist = Math.sqrt(distSq);
        if (dist > 0.1) {
          const force = G / distSq;
          const invDist = 1.0 / dist;
          ax += dx * invDist * force;
          ay += dy * invDist * force;
          az += dz * invDist * force;
        }
      }

      p.velocity.x += ax * dt;
      p.velocity.y += ay * dt;
      p.velocity.z += az * dt;
      p.velocity.x *= ParticleSystem.DAMPING;
      p.velocity.y *= ParticleSystem.DAMPING;
      p.velocity.z *= ParticleSystem.DAMPING;
      p.position.x += p.velocity.x * dt;
      p.position.y += p.velocity.y * dt;
      p.position.z += p.velocity.z * dt;
    }

    this.handleCollisionsSpatial(collisionDistSq);
    this.updateFlashes(dt);
    this.updateGravityHaloPulse();
    this.updateBufferGeometry();

    const sizeScale = cameraDistance * 0.015;
    this.material.size = sizeScale;
  }

  private handleCollisionsSpatial(collisionDistSq: number): void {
    const cellSize = ParticleSystem.GRID_CELL_SIZE;
    const grid = new Map<string, number[]>();

    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      const cx = Math.floor(p.position.x / cellSize);
      const cy = Math.floor(p.position.y / cellSize);
      const cz = Math.floor(p.position.z / cellSize);
      const key = `${cx},${cy},${cz}`;
      if (!grid.has(key)) {
        grid.set(key, []);
      }
      grid.get(key)!.push(i);
    }

    const checked = new Set<number>();

    for (let i = 0; i < this.particles.length; i++) {
      const p1 = this.particles[i];
      const cx = Math.floor(p1.position.x / cellSize);
      const cy = Math.floor(p1.position.y / cellSize);
      const cz = Math.floor(p1.position.z / cellSize);

      for (let ox = -1; ox <= 1; ox++) {
        for (let oy = -1; oy <= 1; oy++) {
          for (let oz = -1; oz <= 1; oz++) {
            const key = `${cx + ox},${cy + oy},${cz + oz}`;
            const cell = grid.get(key);
            if (!cell) continue;

            for (const j of cell) {
              if (j <= i) continue;
              const pairKey = i * this.particles.length + j;
              if (checked.has(pairKey)) continue;
              checked.add(pairKey);

              const p2 = this.particles[j];
              const dx = p1.position.x - p2.position.x;
              const dy = p1.position.y - p2.position.y;
              const dz = p1.position.z - p2.position.z;
              const distSq = dx * dx + dy * dy + dz * dz;

              if (distSq < collisionDistSq) {
                const tvx = p1.velocity.x;
                const tvy = p1.velocity.y;
                const tvz = p1.velocity.z;
                const r1 = 0.95 + Math.random() * 0.15;
                const r2 = 0.95 + Math.random() * 0.15;
                p1.velocity.x = p2.velocity.x * r1;
                p1.velocity.y = p2.velocity.y * r1;
                p1.velocity.z = p2.velocity.z * r1;
                p2.velocity.x = tvx * r2;
                p2.velocity.y = tvy * r2;
                p2.velocity.z = tvz * r2;

                const color1 = this.getColorForPosition(p1.position);
                const color2 = this.getColorForPosition(p2.position);
                const mixedColor = color1.lerp(color2, 0.5);
                const flashPos = new THREE.Vector3(
                  (p1.position.x + p2.position.x) * 0.5,
                  (p1.position.y + p2.position.y) * 0.5,
                  (p1.position.z + p2.position.z) * 0.5
                );
                const flashSize = 8 + Math.random() * 4;

                this.addFlash(flashPos, mixedColor, flashSize);
              }
            }
          }
        }
      }
    }
  }

  private addFlash(position: THREE.Vector3, color: THREE.Color, size: number): void {
    if (this.flashes.length >= this.maxFlashes) {
      this.flashes.shift();
    }

    this.flashes.push({
      position: position.clone(),
      color: color.clone(),
      size,
      life: ParticleSystem.FLASH_DURATION,
      maxLife: ParticleSystem.FLASH_DURATION
    });
  }

  private updateFlashes(dt: number): void {
    for (let i = this.flashes.length - 1; i >= 0; i--) {
      this.flashes[i].life -= dt;
      if (this.flashes[i].life <= 0) {
        this.flashes.splice(i, 1);
      }
    }

    for (let i = 0; i < this.maxFlashes; i++) {
      const mesh = this.flashMeshes[i];
      if (i < this.flashes.length) {
        const flash = this.flashes[i];
        const progress = flash.life / flash.maxLife;
        mesh.visible = true;
        mesh.position.copy(flash.position);
        mesh.scale.setScalar(flash.size * (1 + (1 - progress) * 0.5));
        (mesh.material as THREE.MeshBasicMaterial).color.copy(flash.color);
        (mesh.material as THREE.MeshBasicMaterial).opacity = progress * 0.8;
      } else {
        mesh.visible = false;
      }
    }
  }

  private updateGravityHaloPulse(): void {
    const time = performance.now() * 0.001;
    for (const gc of this.gravityCenters) {
      const pulse = 2.2 + Math.sin(time * Math.PI) * 0.2;
      gc.halo.scale.setScalar(pulse / 2.2);
    }
  }

  public setParticleCount(count: number): void {
    this.params.particleCount = count;
    this.generateParticles(count);
  }

  public setGravityStrength(strength: number): void {
    this.params.gravityStrength = strength;
  }

  public setOrbitSpeed(speed: number): void {
    this.params.orbitSpeed = speed;
  }

  public dispose(): void {
    this.geometry.dispose();
    this.material.dispose();
    this.scene.remove(this.points);

    for (const gc of this.gravityCenters) {
      gc.mesh.geometry.dispose();
      (gc.mesh.material as THREE.Material).dispose();
      gc.halo.geometry.dispose();
      (gc.halo.material as THREE.Material).dispose();
      this.scene.remove(gc.mesh);
      this.scene.remove(gc.halo);
    }

    for (const mesh of this.flashMeshes) {
      mesh.geometry.dispose();
      (mesh.material as THREE.Material).dispose();
      this.scene.remove(mesh);
    }
  }
}
