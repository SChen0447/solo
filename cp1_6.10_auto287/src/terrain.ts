import * as THREE from 'three';

class PerlinNoise {
  private permutation: number[];

  constructor(seed: number = Math.random() * 10000) {
    this.permutation = this.generatePermutation(seed);
  }

  private generatePermutation(seed: number): number[] {
    const p: number[] = [];
    for (let i = 0; i < 256; i++) p[i] = i;
    let s = seed;
    for (let i = 255; i > 0; i--) {
      s = (s * 9301 + 49297) % 233280;
      const j = Math.floor((s / 233280) * (i + 1));
      [p[i], p[j]] = [p[j], p[i]];
    }
    return [...p, ...p];
  }

  private fade(t: number): number {
    return t * t * t * (t * (t * 6 - 15) + 10);
  }

  private lerp(a: number, b: number, t: number): number {
    return a + t * (b - a);
  }

  private grad(hash: number, x: number, y: number): number {
    const h = hash & 3;
    const u = h < 2 ? x : y;
    const v = h < 2 ? y : x;
    return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v);
  }

  noise2D(x: number, y: number): number {
    const X = Math.floor(x) & 255;
    const Y = Math.floor(y) & 255;
    const xf = x - Math.floor(x);
    const yf = y - Math.floor(y);
    const u = this.fade(xf);
    const v = this.fade(yf);
    const p = this.permutation;
    const aa = p[p[X] + Y];
    const ab = p[p[X] + Y + 1];
    const ba = p[p[X + 1] + Y];
    const bb = p[p[X + 1] + Y + 1];
    return this.lerp(
      this.lerp(this.grad(aa, xf, yf), this.grad(ba, xf - 1, yf), u),
      this.lerp(this.grad(ab, xf, yf - 1), this.grad(bb, xf - 1, yf - 1), u),
      v
    );
  }

  fbm(x: number, y: number, octaves: number = 5): number {
    let value = 0;
    let amplitude = 1;
    let frequency = 1;
    let maxValue = 0;
    for (let i = 0; i < octaves; i++) {
      value += this.noise2D(x * frequency, y * frequency) * amplitude;
      maxValue += amplitude;
      amplitude *= 0.5;
      frequency *= 2;
    }
    return value / maxValue;
  }
}

type Pulse = {
  x: number;
  z: number;
  time: number;
  duration: number;
  amplitude: number;
  radius: number;
};

type TerrainStyle = 'hills' | 'canyon' | 'plateau';

export class Terrain {
  public mesh: THREE.Mesh;
  public cursorMesh: THREE.Mesh;
  private geometry: THREE.PlaneGeometry;
  private size: number = 60;
  private segments: number = 255;
  private baseHeights: Float32Array;
  private targetHeights: Float32Array;
  private currentElevation: number = 0;
  private targetElevation: number = 0;
  private perlin: PerlinNoise;
  private pulses: Pulse[] = [];
  private morphProgress: number = 1;
  private morphing: boolean = false;
  private morphStartHeights: Float32Array | null = null;
  private morphTargetHeights: Float32Array | null = null;
  private morphDuration: number = 1.5;
  private morphTime: number = 0;

  constructor(scene: THREE.Scene) {
    this.perlin = new PerlinNoise();
    this.geometry = new THREE.PlaneGeometry(this.size, this.size, this.segments, this.segments);
    this.geometry.rotateX(-Math.PI / 2);

    this.baseHeights = new Float32Array((this.segments + 1) * (this.segments + 1));
    this.targetHeights = new Float32Array((this.segments + 1) * (this.segments + 1));

    this.generateHeights('hills', 2);

    const material = new THREE.MeshStandardMaterial({
      color: 0x3a5a40,
      flatShading: true,
      roughness: 0.8,
      metalness: 0.1,
      emissive: 0x0a1a15,
      emissiveIntensity: 0.2
    });

    this.mesh = new THREE.Mesh(this.geometry, material);
    this.mesh.castShadow = true;
    this.mesh.receiveShadow = true;
    this.mesh.position.y = 0;
    scene.add(this.mesh);

    this.cursorMesh = this.createCursor();
    this.cursorMesh.visible = false;
    scene.add(this.cursorMesh);
  }

  private createCursor(): THREE.Mesh {
    const ringGeo = new THREE.RingGeometry(1.9, 2.1, 32);
    ringGeo.rotateX(-Math.PI / 2);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.6,
      side: THREE.DoubleSide
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);

    const discGeo = new THREE.CircleGeometry(2, 32);
    discGeo.rotateX(-Math.PI / 2);
    const discMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.1,
      side: THREE.DoubleSide
    });
    const disc = new THREE.Mesh(discGeo, discMat);

    const group = new THREE.Group();
    group.add(ring);
    group.add(disc);

    const glowGeo = new THREE.RingGeometry(1.5, 2.5, 32);
    glowGeo.rotateX(-Math.PI / 2);
    const glowMat = new THREE.MeshBasicMaterial({
      color: 0x88ccff,
      transparent: true,
      opacity: 0.15,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending
    });
    const glow = new THREE.Mesh(glowGeo, glowMat);
    group.add(glow);

    return group as unknown as THREE.Mesh;
  }

  private generateHeights(style: TerrainStyle, heightRange: number): void {
    const styleConfig = {
      hills: { scale: 0.05, octaves: 5, power: 1.2, heightMult: 1 },
      canyon: { scale: 0.03, octaves: 6, power: 2.5, heightMult: 1.5 },
      plateau: { scale: 0.07, octaves: 3, power: 4, heightMult: 1 }
    };
    const config = styleConfig[style];

    for (let i = 0; i <= this.segments; i++) {
      for (let j = 0; j <= this.segments; j++) {
        const idx = i * (this.segments + 1) + j;
        const nx = i * config.scale;
        const ny = j * config.scale;
        let h = this.perlin.fbm(nx, ny, config.octaves);
        h = Math.sign(h) * Math.pow(Math.abs(h), config.power);
        h = h * heightRange * config.heightMult;
        this.baseHeights[idx] = h;
        this.targetHeights[idx] = h;
      }
    }
    this.applyHeights();
  }

  private applyHeights(): void {
    const positions = this.geometry.attributes.position;
    for (let i = 0; i < positions.count; i++) {
      const y = this.targetHeights[i] + this.targetElevation;
      positions.setY(i, y);
    }
    positions.needsUpdate = true;
    this.geometry.computeVertexNormals();
  }

  public setElevation(value: number): void {
    this.targetElevation = value;
  }

  public randomize(): Promise<void> {
    return new Promise((resolve) => {
      const styles: TerrainStyle[] = ['hills', 'canyon', 'plateau'];
      const style = styles[Math.floor(Math.random() * styles.length)];
      this.perlin = new PerlinNoise(Math.random() * 10000);

      this.morphStartHeights = new Float32Array(this.baseHeights);

      const styleConfig = {
        hills: { scale: 0.05, octaves: 5, power: 1.2, heightMult: 1 },
        canyon: { scale: 0.03, octaves: 6, power: 2.5, heightMult: 1.5 },
        plateau: { scale: 0.07, octaves: 3, power: 4, heightMult: 1 }
      };
      const config = styleConfig[style];
      const heightRange = 5;

      this.morphTargetHeights = new Float32Array(this.baseHeights.length);
      for (let i = 0; i <= this.segments; i++) {
        for (let j = 0; j <= this.segments; j++) {
          const idx = i * (this.segments + 1) + j;
          const nx = i * config.scale;
          const ny = j * config.scale;
          let h = this.perlin.fbm(nx, ny, config.octaves);
          h = Math.sign(h) * Math.pow(Math.abs(h), config.power);
          h = h * heightRange * config.heightMult;
          this.morphTargetHeights[idx] = h;
        }
      }

      this.morphing = true;
      this.morphTime = 0;

      const checkComplete = () => {
        if (!this.morphing) resolve();
        else setTimeout(checkComplete, 50);
      };
      checkComplete();
    });
  }

  public addPulse(worldX: number, worldZ: number): void {
    this.pulses.push({
      x: worldX,
      z: worldZ,
      time: 0,
      duration: 1.0,
      amplitude: 1,
      radius: 4
    });
  }

  public getHeightAt(worldX: number, worldZ: number): number {
    const half = this.size / 2;
    if (worldX < -half || worldX > half || worldZ < -half || worldZ > half) {
      return -10;
    }
    const u = (worldX + half) / this.size;
    const v = (worldZ + half) / this.size;
    const i = Math.floor(u * this.segments);
    const j = Math.floor(v * this.segments);
    const idx = j * (this.segments + 1) + i;
    return this.targetHeights[idx] + this.currentElevation;
  }

  public updateCursor(worldX: number, worldZ: number, visible: boolean): void {
    this.cursorMesh.visible = visible;
    if (visible) {
      const y = this.getHeightAt(worldX, worldZ) + 0.1;
      this.cursorMesh.position.set(worldX, y, worldZ);
    }
  }

  public update(dt: number): void {
    if (this.morphing && this.morphStartHeights && this.morphTargetHeights) {
      this.morphTime += dt;
      const t = Math.min(this.morphTime / this.morphDuration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      for (let i = 0; i < this.baseHeights.length; i++) {
        this.baseHeights[i] = this.morphStartHeights[i] + (this.morphTargetHeights[i] - this.morphStartHeights[i]) * eased;
        this.targetHeights[i] = this.baseHeights[i];
      }
      if (t >= 1) {
        this.morphing = false;
        this.morphStartHeights = null;
        this.morphTargetHeights = null;
      }
    }

    const elevationDiff = this.targetElevation - this.currentElevation;
    if (Math.abs(elevationDiff) > 0.001) {
      this.currentElevation += elevationDiff * Math.min(dt * 4, 1);
    }

    const positions = this.geometry.attributes.position;
    const pulseOffsets = new Float32Array(positions.count);

    for (let p = this.pulses.length - 1; p >= 0; p--) {
      const pulse = this.pulses[p];
      pulse.time += dt;
      if (pulse.time >= pulse.duration) {
        this.pulses.splice(p, 1);
        continue;
      }
      const t = pulse.time / pulse.duration;
      const wavePhase = t * Math.PI * 2;
      for (let i = 0; i <= this.segments; i++) {
        for (let j = 0; j <= this.segments; j++) {
          const idx = i * (this.segments + 1) + j;
          const x = (j / this.segments - 0.5) * this.size;
          const z = (i / this.segments - 0.5) * this.size;
          const dx = x - pulse.x;
          const dz = z - pulse.z;
          const dist = Math.sqrt(dx * dx + dz * dz);
          if (dist < pulse.radius) {
            const falloff = 1 - dist / pulse.radius;
            const wave = Math.sin(wavePhase - dist * 1.5) * 0.5 + 0.5;
            pulseOffsets[idx] += pulse.amplitude * falloff * wave * Math.sin(Math.PI * t);
          }
        }
      }
    }

    for (let i = 0; i < positions.count; i++) {
      const y = this.baseHeights[i] + this.currentElevation + pulseOffsets[i];
      positions.setY(i, y);
    }
    positions.needsUpdate = true;
    this.geometry.computeVertexNormals();
  }

  public getSize(): number {
    return this.size;
  }
}
