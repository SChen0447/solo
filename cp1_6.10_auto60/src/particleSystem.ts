import * as THREE from 'three';

export type ColorScheme = 'bluePurple' | 'redOrange' | 'greenCyan' | 'rainbow';

interface NebulaConfig {
  count: number;
  radius: number;
  colorPalette: ColorScheme;
  turbulence: number;
}

interface ExplosionState {
  active: boolean;
  center: THREE.Vector3;
  startTime: number;
  duration: number;
  affected: Float32Array;
  velocities: Float32Array;
  originalPositions: Float32Array;
}

interface ColorTransitionState {
  active: boolean;
  startTime: number;
  duration: number;
  fromColors: Float32Array;
  toColors: Float32Array;
}

const colorPalettes: Record<ColorScheme, [number, number]> = {
  bluePurple: [240, 300],
  redOrange: [0, 40],
  greenCyan: [140, 210],
  rainbow: [0, 360]
};

class SimplexNoise {
  private perm: Uint8Array;

  constructor(seed: number = Math.random()) {
    this.perm = new Uint8Array(512);
    const p = new Uint8Array(256);
    for (let i = 0; i < 256; i++) p[i] = i;

    let s = seed * 2147483647;
    for (let i = 255; i > 0; i--) {
      s = (s * 16807) % 2147483647;
      const j = s % (i + 1);
      const tmp = p[i];
      p[i] = p[j];
      p[j] = tmp;
    }

    for (let i = 0; i < 512; i++) this.perm[i] = p[i & 255];
  }

  private fade(t: number): number {
    return t * t * t * (t * (t * 6 - 15) + 10);
  }

  private grad(hash: number, x: number, y: number, z: number): number {
    const h = hash & 15;
    const u = h < 8 ? x : y;
    const v = h < 4 ? y : (h === 12 || h === 14) ? x : z;
    return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v);
  }

  noise3D(x: number, y: number, z: number): number {
    const X = Math.floor(x) & 255;
    const Y = Math.floor(y) & 255;
    const Z = Math.floor(z) & 255;

    x -= Math.floor(x);
    y -= Math.floor(y);
    z -= Math.floor(z);

    const u = this.fade(x);
    const v = this.fade(y);
    const w = this.fade(z);

    const A = this.perm[X] + Y;
    const AA = this.perm[A] + Z;
    const AB = this.perm[A + 1] + Z;
    const B = this.perm[X + 1] + Y;
    const BA = this.perm[B] + Z;
    const BB = this.perm[B + 1] + Z;

    return (
      (1 - w) * (
        (1 - v) * (
          (1 - u) * this.grad(this.perm[AA], x, y, z) +
          u * this.grad(this.perm[BA], x - 1, y, z)
        ) +
        v * (
          (1 - u) * this.grad(this.perm[AB], x, y - 1, z) +
          u * this.grad(this.perm[BB], x - 1, y - 1, z)
        )
      ) +
      w * (
        (1 - v) * (
          (1 - u) * this.grad(this.perm[AA + 1], x, y, z - 1) +
          u * this.grad(this.perm[BA + 1], x - 1, y, z - 1)
        ) +
        v * (
          (1 - u) * this.grad(this.perm[AB + 1], x, y - 1, z - 1) +
          u * this.grad(this.perm[BB + 1], x - 1, y - 1, z - 1)
        )
      )
    );
  }
}

export class ParticleSystem {
  public points: THREE.Points;
  public geometry: THREE.BufferGeometry;
  public material: THREE.ShaderMaterial;

  private count: number = 0;
  private basePositions: Float32Array = new Float32Array();
  private positions: Float32Array = new Float32Array();
  private colors: Float32Array = new Float32Array();
  private sizes: Float32Array = new Float32Array();
  private baseSizes: Float32Array = new Float32Array();
  private noise: SimplexNoise;
  private time: number = 0;
  private turbulence: number = 0.8;
  private radius: number = 20;
  private colorScheme: ColorScheme = 'bluePurple';
  private paused: boolean = false;
  private currentColor: Float32Array = new Float32Array();
  private alphas: Float32Array = new Float32Array();

  private explosion: ExplosionState = {
    active: false,
    center: new THREE.Vector3(),
    startTime: 0,
    duration: 2000,
    affected: new Float32Array(),
    velocities: new Float32Array(),
    originalPositions: new Float32Array()
  };

  private colorTransition: ColorTransitionState = {
    active: false,
    startTime: 0,
    duration: 1500,
    fromColors: new Float32Array(),
    toColors: new Float32Array()
  };

  private countTransition: {
    active: boolean;
    startTime: number;
    duration: number;
    fromCount: number;
    toCount: number;
  } = {
    active: false,
    startTime: 0,
    duration: 800,
    fromCount: 0,
    toCount: 0
  };

  constructor() {
    this.noise = new SimplexNoise(42);
    this.geometry = new THREE.BufferGeometry();
    this.material = this.createMaterial();
    this.points = new THREE.Points(this.geometry, this.material);
    this.points.frustumCulled = false;
  }

  private createMaterial(): THREE.ShaderMaterial {
    return new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) }
      },
      vertexShader: `
        attribute float aSize;
        attribute vec3 aColor;
        attribute float aAlpha;
        uniform float uPixelRatio;
        varying vec3 vColor;
        varying float vAlpha;
        void main() {
          vColor = aColor;
          vAlpha = aAlpha;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = aSize * uPixelRatio * (300.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        varying float vAlpha;
        void main() {
          vec2 center = gl_PointCoord - vec2(0.5);
          float dist = length(center);
          if (dist > 0.5) discard;
          float glow = 1.0 - smoothstep(0.0, 0.5, dist);
          glow = pow(glow, 1.5);
          gl_FragColor = vec4(vColor, vAlpha * glow);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });
  }

  createNebula(config: Partial<NebulaConfig>): void {
    const count = config.count ?? 10000;
    this.radius = config.radius ?? 20;
    this.colorScheme = config.colorPalette ?? 'bluePurple';
    this.turbulence = config.turbulence ?? 0.8;

    this.resizeBuffers(count);
    this.initParticles();
    this.updateGeometry();
  }

  private resizeBuffers(count: number): void {
    this.count = count;
    this.basePositions = new Float32Array(count * 3);
    this.positions = new Float32Array(count * 3);
    this.colors = new Float32Array(count * 3);
    this.currentColor = new Float32Array(count * 3);
    this.sizes = new Float32Array(count);
    this.baseSizes = new Float32Array(count);
    this.alphas = new Float32Array(count);

    this.explosion.affected = new Float32Array(count);
    this.explosion.velocities = new Float32Array(count * 3);
    this.explosion.originalPositions = new Float32Array(count * 3);
  }

  private initParticles(): void {
    const palette = colorPalettes[this.colorScheme];

    for (let i = 0; i < this.count; i++) {
      const i3 = i * 3;

      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = this.radius * Math.cbrt(Math.random());

      this.basePositions[i3] = r * Math.sin(phi) * Math.cos(theta);
      this.basePositions[i3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      this.basePositions[i3 + 2] = r * Math.cos(phi);

      this.positions[i3] = this.basePositions[i3];
      this.positions[i3 + 1] = this.basePositions[i3 + 1];
      this.positions[i3 + 2] = this.basePositions[i3 + 2];

      const h = palette[0] + Math.random() * (palette[1] - palette[0]);
      const color = new THREE.Color().setHSL(h / 360, 0.8, 0.6);

      this.colors[i3] = color.r;
      this.colors[i3 + 1] = color.g;
      this.colors[i3 + 2] = color.b;
      this.currentColor[i3] = color.r;
      this.currentColor[i3 + 1] = color.g;
      this.currentColor[i3 + 2] = color.b;

      const size = 0.5 + Math.random() * 1.5;
      this.sizes[i] = size;
      this.baseSizes[i] = size;
      this.alphas[i] = 1;
    }
  }

  private updateGeometry(): void {
    this.geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    this.geometry.setAttribute('aColor', new THREE.BufferAttribute(this.currentColor, 3));
    this.geometry.setAttribute('aSize', new THREE.BufferAttribute(this.sizes, 1));
    this.geometry.setAttribute('aAlpha', new THREE.BufferAttribute(this.alphas, 1));
  }

  triggerExplosion(worldPoint: THREE.Vector3): void {
    const localPoint = this.points.worldToLocal(worldPoint.clone());

    this.explosion.active = true;
    this.explosion.center.copy(localPoint);
    this.explosion.startTime = performance.now();

    for (let i = 0; i < this.count; i++) {
      const i3 = i * 3;
      const dx = this.positions[i3] - localPoint.x;
      const dy = this.positions[i3 + 1] - localPoint.y;
      const dz = this.positions[i3 + 2] - localPoint.z;
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

      if (dist < 3.0) {
        this.explosion.affected[i] = 1.0;
        const invDist = dist > 0.001 ? 1.0 / dist : 0;
        const speed = (1.0 - dist / 3.0) * 8.0;
        this.explosion.velocities[i3] = dx * invDist * speed;
        this.explosion.velocities[i3 + 1] = dy * invDist * speed;
        this.explosion.velocities[i3 + 2] = dz * invDist * speed;
      } else {
        this.explosion.affected[i] = 0;
      }

      this.explosion.originalPositions[i3] = this.basePositions[i3];
      this.explosion.originalPositions[i3 + 1] = this.basePositions[i3 + 1];
      this.explosion.originalPositions[i3 + 2] = this.basePositions[i3 + 2];
    }
  }

  setColorScheme(scheme: ColorScheme): void {
    if (scheme === this.colorScheme && !this.colorTransition.active) return;

    this.colorScheme = scheme;
    this.colorTransition.active = true;
    this.colorTransition.startTime = performance.now();

    this.colorTransition.fromColors = new Float32Array(this.currentColor);

    const palette = colorPalettes[scheme];
    this.colorTransition.toColors = new Float32Array(this.count * 3);

    for (let i = 0; i < this.count; i++) {
      const i3 = i * 3;
      const h = palette[0] + Math.random() * (palette[1] - palette[0]);
      const color = new THREE.Color().setHSL(h / 360, 0.8, 0.6);
      this.colorTransition.toColors[i3] = color.r;
      this.colorTransition.toColors[i3 + 1] = color.g;
      this.colorTransition.toColors[i3 + 2] = color.b;
    }
  }

  setParticleCount(newCount: number): void {
    if (newCount === this.count) return;

    this.countTransition.active = true;
    this.countTransition.startTime = performance.now();
    this.countTransition.fromCount = this.count;
    this.countTransition.toCount = newCount;
  }

  setTurbulence(value: number): void {
    this.turbulence = value;
  }

  setPaused(paused: boolean): void {
    this.paused = paused;
  }

  private applyCountTransition(): void {
    const targetCount = this.countTransition.toCount;
    const oldPositions = new Float32Array(this.basePositions);
    const oldColors = new Float32Array(this.colors);
    const oldSizes = new Float32Array(this.baseSizes);
    const oldCurrent = new Float32Array(this.currentColor);

    this.resizeBuffers(targetCount);
    this.initParticles();

    const minCount = Math.min(oldPositions.length / 3, targetCount);
    for (let i = 0; i < minCount; i++) {
      const i3 = i * 3;
      this.basePositions[i3] = oldPositions[i3];
      this.basePositions[i3 + 1] = oldPositions[i3 + 1];
      this.basePositions[i3 + 2] = oldPositions[i3 + 2];
      this.colors[i3] = oldColors[i3];
      this.colors[i3 + 1] = oldColors[i3 + 1];
      this.colors[i3 + 2] = oldColors[i3 + 2];
      this.currentColor[i3] = oldCurrent[i3];
      this.currentColor[i3 + 1] = oldCurrent[i3 + 1];
      this.currentColor[i3 + 2] = oldCurrent[i3 + 2];
      this.sizes[i] = oldSizes[i];
      this.baseSizes[i] = oldSizes[i];
    }
    this.updateGeometry();
  }

  update(delta: number): void {
    if (this.paused) return;

    this.time += delta;
    const now = performance.now();

    if (this.countTransition.active) {
      const t = Math.min(1, (now - this.countTransition.startTime) / this.countTransition.duration);
      if (t >= 1) {
        this.countTransition.active = false;
        this.applyCountTransition();
      }
    }

    if (this.colorTransition.active) {
      const t = Math.min(1, (now - this.colorTransition.startTime) / this.colorTransition.duration);
      const easeT = t * t * (3 - 2 * t);
      if (t >= 1) {
        this.colorTransition.active = false;
        for (let i = 0; i < this.count; i++) {
          const i3 = i * 3;
          this.colors[i3] = this.colorTransition.toColors[i3];
          this.colors[i3 + 1] = this.colorTransition.toColors[i3 + 1];
          this.colors[i3 + 2] = this.colorTransition.toColors[i3 + 2];
          this.currentColor[i3] = this.colors[i3];
          this.currentColor[i3 + 1] = this.colors[i3 + 1];
          this.currentColor[i3 + 2] = this.colors[i3 + 2];
        }
      } else {
        for (let i = 0; i < this.count; i++) {
          const i3 = i * 3;
          this.currentColor[i3] = this.colorTransition.fromColors[i3] + (this.colorTransition.toColors[i3] - this.colorTransition.fromColors[i3]) * easeT;
          this.currentColor[i3 + 1] = this.colorTransition.fromColors[i3 + 1] + (this.colorTransition.toColors[i3 + 1] - this.colorTransition.fromColors[i3 + 1]) * easeT;
          this.currentColor[i3 + 2] = this.colorTransition.fromColors[i3 + 2] + (this.colorTransition.toColors[i3 + 2] - this.colorTransition.fromColors[i3 + 2]) * easeT;
        }
      }
      (this.geometry.attributes.aColor as THREE.BufferAttribute).needsUpdate = true;
    }

    const pulse = Math.sin(this.time * 0.5) * 0.5 + 0.5;
    const scale = 1 + pulse * 0.15;

    for (let i = 0; i < this.count; i++) {
      const i3 = i * 3;

      let px = this.basePositions[i3];
      let py = this.basePositions[i3 + 1];
      let pz = this.basePositions[i3 + 2];

      const n1 = this.noise.noise3D(px * 0.05 + this.time * 0.1, py * 0.05, pz * 0.05) * this.turbulence;
      const n2 = this.noise.noise3D(py * 0.05, pz * 0.05 + this.time * 0.08, px * 0.05) * this.turbulence;
      const n3 = this.noise.noise3D(pz * 0.05, px * 0.05, py * 0.05 + this.time * 0.12) * this.turbulence;

      this.positions[i3] = px * scale + n1 * 2;
      this.positions[i3 + 1] = py * scale + n2 * 2;
      this.positions[i3 + 2] = pz * scale + n3 * 2;

      let explosionFactor = 0;
      if (this.explosion.active) {
        const elapsed = now - this.explosion.startTime;
        if (elapsed < this.explosion.duration + 1500) {
          if (this.explosion.affected[i] > 0) {
            const scatterPhase = Math.min(1, elapsed / this.explosion.duration);
            const returnPhase = elapsed > this.explosion.duration
              ? Math.min(1, (elapsed - this.explosion.duration) / 1500)
              : 0;

            const spring = 0.3;
            const damping = 0.95;

            const vx = this.explosion.velocities[i3];
            const vy = this.explosion.velocities[i3 + 1];
            const vz = this.explosion.velocities[i3 + 2];

            const ox = this.explosion.originalPositions[i3];
            const oy = this.explosion.originalPositions[i3 + 1];
            const oz = this.explosion.originalPositions[i3 + 2];

            const returnStrength = returnPhase * spring;
            this.explosion.velocities[i3] = (vx + (ox - this.basePositions[i3]) * returnStrength) * damping;
            this.explosion.velocities[i3 + 1] = (vy + (oy - this.basePositions[i3 + 1]) * returnStrength) * damping;
            this.explosion.velocities[i3 + 2] = (vz + (oz - this.basePositions[i3 + 2]) * returnStrength) * damping;

            const bouncePhase = returnPhase > 0 ? Math.sin(returnPhase * Math.PI * 4) * 0.15 * (1 - returnPhase) : 0;

            this.positions[i3] += this.explosion.velocities[i3] + bouncePhase;
            this.positions[i3 + 1] += this.explosion.velocities[i3 + 1] + bouncePhase;
            this.positions[i3 + 2] += this.explosion.velocities[i3 + 2] + bouncePhase;

            if (scatterPhase < 1) {
              explosionFactor = this.explosion.affected[i] * (1 - scatterPhase * 0.5);
            } else {
              explosionFactor = this.explosion.affected[i] * (1 - returnPhase);
            }
          }
        } else {
          this.explosion.active = false;
        }
      }

      const dist = Math.sqrt(
        this.positions[i3] ** 2 +
        this.positions[i3 + 1] ** 2 +
        this.positions[i3 + 2] ** 2
      );
      const normalizedDist = dist / (this.radius * 1.2);
      const alpha = Math.sin(Math.max(0, Math.min(1, normalizedDist)) * Math.PI);
      this.alphas[i] = Math.max(0, Math.min(1, alpha));

      if (explosionFactor > 0) {
        const whiteBlend = explosionFactor * 0.8;
        this.currentColor[i3] = this.colors[i3] * (1 - whiteBlend) + 1 * whiteBlend;
        this.currentColor[i3 + 1] = this.colors[i3 + 1] * (1 - whiteBlend) + 1 * whiteBlend;
        this.currentColor[i3 + 2] = this.colors[i3 + 2] * (1 - whiteBlend) + 1 * whiteBlend;
        this.sizes[i] = this.baseSizes[i] * (1 + explosionFactor * 2);
      } else {
        if (!this.colorTransition.active) {
          this.currentColor[i3] = this.colors[i3];
          this.currentColor[i3 + 1] = this.colors[i3 + 1];
          this.currentColor[i3 + 2] = this.colors[i3 + 2];
        }
        this.sizes[i] = this.baseSizes[i];
      }
    }

    (this.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
    (this.geometry.attributes.aAlpha as THREE.BufferAttribute).needsUpdate = true;
    (this.geometry.attributes.aSize as THREE.BufferAttribute).needsUpdate = true;
    if (!this.colorTransition.active) {
      (this.geometry.attributes.aColor as THREE.BufferAttribute).needsUpdate = true;
    }
  }
}
