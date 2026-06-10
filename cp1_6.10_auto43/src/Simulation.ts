import * as THREE from 'three';

export interface SimulationConfig {
  containerSize: { w: number; h: number; d: number };
  particleCount: number;
  viscosity: number;
  timeStep: number;
  neighborRadius: number;
  restitution: number;
}

interface BvhNode {
  minX: number; minY: number; minZ: number;
  maxX: number; maxY: number; maxZ: number;
  left: BvhNode | null;
  right: BvhNode | null;
  start: number;
  count: number;
}

const MAX_FLASH = 200;

export class Simulation {
  private scene: THREE.Scene;
  private config: SimulationConfig;

  private positions: Float32Array;
  private velocities: Float32Array;
  private colors: Float32Array;
  private indices: Int32Array;
  private particleCount: number;

  private points: THREE.Points;
  private geometry: THREE.BufferGeometry;
  private material: THREE.PointsMaterial;

  private flashPositions: Float32Array;
  private flashColors: Float32Array;
  private flashLives: Float32Array;
  private flashCount: number = 0;
  private flashPoints: THREE.Points;
  private flashGeom: THREE.BufferGeometry;

  private bvhRoot: BvhNode | null = null;

  constructor(config: SimulationConfig, scene: THREE.Scene) {
    this.scene = scene;
    this.config = { ...config };
    this.particleCount = config.particleCount;

    this.positions = new Float32Array(this.particleCount * 3);
    this.velocities = new Float32Array(this.particleCount * 3);
    this.colors = new Float32Array(this.particleCount * 3);
    this.indices = new Int32Array(this.particleCount);

    this.initParticles();

    this.geometry = new THREE.BufferGeometry();
    this.geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    this.geometry.setAttribute('color', new THREE.BufferAttribute(this.colors, 3));

    this.material = new THREE.PointsMaterial({
      size: 0.08,
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
      sizeAttenuation: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    this.points = new THREE.Points(this.geometry, this.material);
    this.scene.add(this.points);

    this.flashPositions = new Float32Array(MAX_FLASH * 3);
    this.flashColors = new Float32Array(MAX_FLASH * 3);
    this.flashLives = new Float32Array(MAX_FLASH);
    this.flashGeom = new THREE.BufferGeometry();
    this.flashGeom.setAttribute('position', new THREE.BufferAttribute(this.flashPositions, 3));
    this.flashGeom.setAttribute('color', new THREE.BufferAttribute(this.flashColors, 3));
    const flashMat = new THREE.PointsMaterial({
      size: 0.18,
      vertexColors: true,
      transparent: true,
      opacity: 1,
      sizeAttenuation: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.flashPoints = new THREE.Points(this.flashGeom, flashMat);
    this.scene.add(this.flashPoints);
  }

  private initParticles(): void {
    const { w, h, d } = this.config.containerSize;
    for (let i = 0; i < this.particleCount; i++) {
      this.positions[i * 3] = (Math.random() - 0.5) * w;
      this.positions[i * 3 + 1] = (Math.random() - 0.5) * h;
      this.positions[i * 3 + 2] = (Math.random() - 0.5) * d;
      this.velocities[i * 3] = (Math.random() - 0.5) * 2;
      this.velocities[i * 3 + 1] = (Math.random() - 0.5) * 2;
      this.velocities[i * 3 + 2] = (Math.random() - 0.5) * 2;
      this.indices[i] = i;
      this.colors[i * 3] = 0.3;
      this.colors[i * 3 + 1] = 0.5;
      this.colors[i * 3 + 2] = 1.0;
    }
  }

  private buildBvh(start: number, count: number): BvhNode {
    let minX = Infinity, minY = Infinity, minZ = Infinity;
    let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
    for (let i = start; i < start + count; i++) {
      const idx = this.indices[i] * 3;
      const x = this.positions[idx];
      const y = this.positions[idx + 1];
      const z = this.positions[idx + 2];
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (z < minZ) minZ = z;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
      if (z > maxZ) maxZ = z;
    }
    const node: BvhNode = {
      minX, minY, minZ, maxX, maxY, maxZ,
      left: null, right: null, start, count,
    };
    if (count <= 8) return node;

    const dx = maxX - minX, dy = maxY - minY, dz = maxZ - minZ;
    let axis: 0 | 1 | 2 = 0;
    if (dy >= dx && dy >= dz) axis = 1;
    else if (dz >= dx && dz >= dy) axis = 2;

    const mid = start + (count >> 1);
    this.partition(start, count, axis, mid);

    node.left = this.buildBvh(start, mid - start);
    node.right = this.buildBvh(mid, count - (mid - start));
    return node;
  }

  private partition(start: number, count: number, axis: 0 | 1 | 2, mid: number): void {
    let lo = start, hi = start + count - 1;
    while (lo < hi) {
      const pivotIdx = this.indices[(lo + hi) >> 1] * 3 + axis;
      const pivot = this.positions[pivotIdx];
      let i = lo - 1, j = hi + 1;
      while (true) {
        do { i++; } while (this.positions[this.indices[i] * 3 + axis] < pivot);
        do { j--; } while (this.positions[this.indices[j] * 3 + axis] > pivot);
        if (i >= j) break;
        const tmp = this.indices[i];
        this.indices[i] = this.indices[j];
        this.indices[j] = tmp;
      }
      if (mid <= j) hi = j;
      else lo = j + 1;
    }
  }

  private queryNeighbors(px: number, py: number, pz: number, r: number, out: number[]): void {
    out.length = 0;
    const r2 = r * r;
    const stack: (BvhNode | null)[] = [this.bvhRoot];
    while (stack.length) {
      const node = stack.pop();
      if (!node) continue;
      if (px - r > node.maxX || px + r < node.minX ||
          py - r > node.maxY || py + r < node.minY ||
          pz - r > node.maxZ || pz + r < node.minZ) continue;
      if (node.left || node.right) {
        stack.push(node.left, node.right);
      } else {
        for (let i = node.start; i < node.start + node.count; i++) {
          const idx = this.indices[i];
          const base = idx * 3;
          const dx = this.positions[base] - px;
          const dy = this.positions[base + 1] - py;
          const dz = this.positions[base + 2] - pz;
          if (dx * dx + dy * dy + dz * dz <= r2) out.push(idx);
        }
      }
    }
  }

  setViscosity(v: number): void { this.config.viscosity = v; }
  setTimeStep(dt: number): void { this.config.timeStep = dt; }

  getParticleCount(): number { return this.particleCount; }

  setParticleCount(n: number): void {
    if (n === this.particleCount) return;
    n = Math.max(500, Math.min(20000, n));
    const oldN = this.particleCount;
    const newPos = new Float32Array(n * 3);
    const newVel = new Float32Array(n * 3);
    const newCol = new Float32Array(n * 3);
    const newIdx = new Int32Array(n);
    const copyN = Math.min(oldN, n);
    newPos.set(this.positions.subarray(0, copyN * 3));
    newVel.set(this.velocities.subarray(0, copyN * 3));
    newCol.set(this.colors.subarray(0, copyN * 3));
    const { w, h, d } = this.config.containerSize;
    for (let i = copyN; i < n; i++) {
      newPos[i * 3] = (Math.random() - 0.5) * w;
      newPos[i * 3 + 1] = (Math.random() - 0.5) * h;
      newPos[i * 3 + 2] = (Math.random() - 0.5) * d;
      newVel[i * 3] = (Math.random() - 0.5) * 2;
      newVel[i * 3 + 1] = (Math.random() - 0.5) * 2;
      newVel[i * 3 + 2] = (Math.random() - 0.5) * 2;
      newCol[i * 3] = 0.3; newCol[i * 3 + 1] = 0.5; newCol[i * 3 + 2] = 1;
      newIdx[i] = i;
    }
    for (let i = 0; i < copyN; i++) newIdx[i] = i;
    this.positions = newPos;
    this.velocities = newVel;
    this.colors = newCol;
    this.indices = newIdx;
    this.particleCount = n;

    this.geometry.dispose();
    this.geometry = new THREE.BufferGeometry();
    this.geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    this.geometry.setAttribute('color', new THREE.BufferAttribute(this.colors, 3));
    this.points.geometry = this.geometry;
  }

  injectShockwave(speed: number = 8): void {
    const { w, h, d } = this.config.containerSize;
    const cx = 0, cy = 0, cz = 0;
    const maxR = Math.min(w, h, d) * 0.5;
    for (let i = 0; i < this.particleCount; i++) {
      const base = i * 3;
      const dx = this.positions[base] - cx;
      const dy = this.positions[base + 1] - cy;
      const dz = this.positions[base + 2] - cz;
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz) + 0.0001;
      const falloff = Math.max(0, 1 - dist / maxR);
      const s = speed * falloff;
      this.velocities[base] += (dx / dist) * s;
      this.velocities[base + 1] += (dy / dist) * s;
      this.velocities[base + 2] += (dz / dist) * s;
    }
  }

  getAverageSpeed(): number {
    let sum = 0;
    for (let i = 0; i < this.particleCount; i++) {
      const base = i * 3;
      const vx = this.velocities[base];
      const vy = this.velocities[base + 1];
      const vz = this.velocities[base + 2];
      sum += Math.sqrt(vx * vx + vy * vy + vz * vz);
    }
    return sum / this.particleCount;
  }

  private spawnFlash(x: number, y: number, z: number): void {
    if (this.flashCount >= MAX_FLASH) return;
    const i = this.flashCount;
    this.flashPositions[i * 3] = x;
    this.flashPositions[i * 3 + 1] = y;
    this.flashPositions[i * 3 + 2] = z;
    this.flashColors[i * 3] = 1;
    this.flashColors[i * 3 + 1] = 1;
    this.flashColors[i * 3 + 2] = 0.8;
    this.flashLives[i] = 1;
    this.flashCount++;
  }

  update(): void {
    const dt = this.config.timeStep;
    const visc = this.config.viscosity * 0.2;
    const r = this.config.neighborRadius;
    const { w, h, d } = this.config.containerSize;
    const halfW = w / 2, halfH = h / 2, halfD = d / 2;
    const rest = this.config.restitution;

    this.bvhRoot = this.buildBvh(0, this.particleCount);

    const neighbors: number[] = [];

    for (let i = 0; i < this.particleCount; i++) {
      const base = i * 3;
      const px = this.positions[base];
      const py = this.positions[base + 1];
      const pz = this.positions[base + 2];
      this.queryNeighbors(px, py, pz, r, neighbors);

      let avgVx = 0, avgVy = 0, avgVz = 0;
      let avgPx = 0, avgPy = 0, avgPz = 0;
      let count = 0;
      for (let k = 0; k < neighbors.length; k++) {
        const j = neighbors[k];
        if (j === i) continue;
        const jb = j * 3;
        avgVx += this.velocities[jb];
        avgVy += this.velocities[jb + 1];
        avgVz += this.velocities[jb + 2];
        avgPx += this.positions[jb];
        avgPy += this.positions[jb + 1];
        avgPz += this.positions[jb + 2];
        count++;
      }
      if (count > 0) {
        avgVx /= count; avgVy /= count; avgVz /= count;
        avgPx /= count; avgPy /= count; avgPz /= count;
        this.velocities[base] += (avgVx - this.velocities[base]) * visc;
        this.velocities[base + 1] += (avgVy - this.velocities[base + 1]) * visc;
        this.velocities[base + 2] += (avgVz - this.velocities[base + 2]) * visc;
        const pressure = 0.05;
        this.velocities[base] += (avgPx - px) * pressure;
        this.velocities[base + 1] += (avgPy - py) * pressure;
        this.velocities[base + 2] += (avgPz - pz) * pressure;
      }
    }

    for (let i = 0; i < this.particleCount; i++) {
      const base = i * 3;
      this.positions[base] += this.velocities[base] * dt;
      this.positions[base + 1] += this.velocities[base + 1] * dt;
      this.positions[base + 2] += this.velocities[base + 2] * dt;

      let collided = false;
      if (this.positions[base] > halfW) {
        this.positions[base] = halfW;
        this.velocities[base] = -this.velocities[base] * rest;
        collided = true;
      } else if (this.positions[base] < -halfW) {
        this.positions[base] = -halfW;
        this.velocities[base] = -this.velocities[base] * rest;
        collided = true;
      }
      if (this.positions[base + 1] > halfH) {
        this.positions[base + 1] = halfH;
        this.velocities[base + 1] = -this.velocities[base + 1] * rest;
        collided = true;
      } else if (this.positions[base + 1] < -halfH) {
        this.positions[base + 1] = -halfH;
        this.velocities[base + 1] = -this.velocities[base + 1] * rest;
        collided = true;
      }
      if (this.positions[base + 2] > halfD) {
        this.positions[base + 2] = halfD;
        this.velocities[base + 2] = -this.velocities[base + 2] * rest;
        collided = true;
      } else if (this.positions[base + 2] < -halfD) {
        this.positions[base + 2] = -halfD;
        this.velocities[base + 2] = -this.velocities[base + 2] * rest;
        collided = true;
      }
      if (collided && Math.random() < 0.15) {
        this.spawnFlash(this.positions[base], this.positions[base + 1], this.positions[base + 2]);
      }

      const vx = this.velocities[base];
      const vy = this.velocities[base + 1];
      const vz = this.velocities[base + 2];
      const sp = Math.sqrt(vx * vx + vy * vy + vz * vz);
      const t = Math.min(1, sp / 8);
      this.colors[base] = 0.3 + t * 0.7;
      this.colors[base + 1] = 0.3 + (1 - Math.abs(t - 0.5) * 2) * 0.4;
      this.colors[base + 2] = 1 - t * 0.8;
    }

    (this.geometry.getAttribute('position') as THREE.BufferAttribute).needsUpdate = true;
    (this.geometry.getAttribute('color') as THREE.BufferAttribute).needsUpdate = true;

    this.updateFlashes(dt);
  }

  private updateFlashes(dt: number): void {
    let writeIdx = 0;
    for (let i = 0; i < this.flashCount; i++) {
      this.flashLives[i] -= dt * 2.5;
      if (this.flashLives[i] > 0) {
        if (writeIdx !== i) {
          this.flashPositions[writeIdx * 3] = this.flashPositions[i * 3];
          this.flashPositions[writeIdx * 3 + 1] = this.flashPositions[i * 3 + 1];
          this.flashPositions[writeIdx * 3 + 2] = this.flashPositions[i * 3 + 2];
        }
        const a = Math.max(0, this.flashLives[i]);
        this.flashColors[writeIdx * 3] = a;
        this.flashColors[writeIdx * 3 + 1] = a;
        this.flashColors[writeIdx * 3 + 2] = a * 0.8;
        this.flashLives[writeIdx] = a;
        writeIdx++;
      }
    }
    this.flashCount = writeIdx;
    this.flashGeom.setDrawRange(0, this.flashCount);
    (this.flashGeom.getAttribute('position') as THREE.BufferAttribute).needsUpdate = true;
    (this.flashGeom.getAttribute('color') as THREE.BufferAttribute).needsUpdate = true;
  }

  dispose(): void {
    this.geometry.dispose();
    this.material.dispose();
    this.flashGeom.dispose();
    this.scene.remove(this.points);
    this.scene.remove(this.flashPoints);
  }
}
