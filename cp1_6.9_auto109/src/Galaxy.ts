import * as THREE from 'three';

export interface GalaxyParams {
  particleCount: number;
  armCount: number;
  coreRadius: number;
  coreParticleCount: number;
  twist: number;
  thickness: number;
  baseParticleSize: number;
  galaxyRadius: number;
}

const DEFAULT_PARAMS: GalaxyParams = {
  particleCount: 8000,
  armCount: 3,
  coreRadius: 2,
  coreParticleCount: 500,
  twist: 2,
  thickness: 0.5,
  baseParticleSize: 0.05,
  galaxyRadius: 15
};

const COLORS = {
  warmWhite: new THREE.Color('#fff5e6'),
  lightBlue: new THREE.Color('#aaccff'),
  lightPurple: new THREE.Color('#ccbbff'),
  lightRed: new THREE.Color('#ffbbcc'),
  core: new THREE.Color('#ffcc00')
};

export class Galaxy {
  public points: THREE.Points;
  private geometry: THREE.BufferGeometry;
  private material: THREE.ShaderMaterial;
  private params: GalaxyParams;

  private positions: Float32Array;
  private colors: Float32Array;
  private sizes: Float32Array;
  private baseSizeMultipliers: Float32Array;
  private radialDistances: Float32Array;
  private orbitPhases: Float32Array;
  private orbitPeriods: Float32Array;
  private orbitAmplitudes: Float32Array;
  private baseZOffsets: Float32Array;
  private armIndices: Float32Array;
  private randomAngleOffsets: Float32Array;
  private originalZSigns: Float32Array;
  private originalZFactors: Float32Array;

  private time: number = 0;
  private rotationSpeed: number = 0.05;

  constructor(customParams?: Partial<GalaxyParams>) {
    this.params = { ...DEFAULT_PARAMS, ...customParams };

    this.geometry = new THREE.BufferGeometry();
    this.material = this.createShaderMaterial();

    const total = this.params.particleCount;

    this.positions = new Float32Array(total * 3);
    this.colors = new Float32Array(total * 3);
    this.sizes = new Float32Array(total);
    this.baseSizeMultipliers = new Float32Array(total);
    this.radialDistances = new Float32Array(total);
    this.orbitPhases = new Float32Array(total);
    this.orbitPeriods = new Float32Array(total);
    this.orbitAmplitudes = new Float32Array(total);
    this.baseZOffsets = new Float32Array(total);
    this.armIndices = new Float32Array(total);
    this.randomAngleOffsets = new Float32Array(total);
    this.originalZSigns = new Float32Array(total);
    this.originalZFactors = new Float32Array(total);

    this.generateParticles();

    this.geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    this.geometry.setAttribute('color', new THREE.BufferAttribute(this.colors, 3));
    this.geometry.setAttribute('aSize', new THREE.BufferAttribute(this.sizes, 1));

    this.points = new THREE.Points(this.geometry, this.material);
  }

  private createShaderMaterial(): THREE.ShaderMaterial {
    return new THREE.ShaderMaterial({
      uniforms: {
        uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) }
      },
      vertexShader: `
        attribute float aSize;
        varying vec3 vColor;
        uniform float uPixelRatio;

        void main() {
          vColor = color;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_Position = projectionMatrix * mvPosition;
          gl_PointSize = aSize * uPixelRatio * (300.0 / -mvPosition.z);
        }
      `,
      fragmentShader: `
        varying vec3 vColor;

        void main() {
          vec2 center = gl_PointCoord - vec2(0.5);
          float dist = length(center);
          if (dist > 0.5) discard;
          float alpha = smoothstep(0.5, 0.0, dist);
          gl_FragColor = vec4(vColor, alpha * 0.95);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      vertexColors: true
    });
  }

  private generateParticles(): void {
    const { particleCount, armCount, coreRadius, coreParticleCount, twist, thickness, baseParticleSize, galaxyRadius } = this.params;
    const armParticleCount = particleCount - coreParticleCount;
    const perArmCount = Math.floor(armParticleCount / armCount);

    for (let i = 0; i < particleCount; i++) {
      const i3 = i * 3;
      let radius: number;
      let armIndex: number;
      let isCore = i < coreParticleCount;

      if (isCore) {
        radius = Math.random() * coreRadius;
        armIndex = 0;
        this.randomAngleOffsets[i] = Math.random() * Math.PI * 2;
      } else {
        const armParticleIndex = i - coreParticleCount;
        armIndex = armParticleIndex % armCount;
        const armLocalIndex = Math.floor(armParticleIndex / armCount);
        const t = armLocalIndex / perArmCount;
        const radialJitter = 1 + (Math.random() - 0.5) * 0.2;
        radius = coreRadius + t * (galaxyRadius - coreRadius) * radialJitter;
        this.randomAngleOffsets[i] = (Math.random() - 0.5) * 0.2;
      }

      this.radialDistances[i] = radius;
      this.armIndices[i] = armIndex;

      const thicknessJitter = isCore ? 0.15 : thickness;
      const zRandom = (Math.random() - 0.5) * 2;
      this.originalZSigns[i] = zRandom >= 0 ? 1 : -1;
      this.originalZFactors[i] = Math.abs(zRandom);
      const radiusFactor = 1 - radius / galaxyRadius * 0.5;
      this.baseZOffsets[i] = this.originalZSigns[i] * this.originalZFactors[i] * thicknessJitter * radiusFactor;

      this.orbitPhases[i] = Math.random() * Math.PI * 2;
      this.orbitPeriods[i] = 2 + Math.random() * 3;
      this.orbitAmplitudes[i] = 0.02;

      const sizeMultiplier = isCore ? 2 : (0.5 + Math.random());
      this.baseSizeMultipliers[i] = sizeMultiplier;
      this.sizes[i] = baseParticleSize * sizeMultiplier;

      this.assignColor(i, i3, radius, isCore);
      this.calculatePosition(i, i3, radius, armIndex, twist);
    }
  }

  private assignColor(i: number, i3: number, radius: number, isCore: boolean): void {
    let color: THREE.Color;

    if (isCore) {
      color = COLORS.core.clone();
    } else {
      const normalizedRadius = (radius - this.params.coreRadius) / (this.params.galaxyRadius - this.params.coreRadius);
      const clampedRadius = Math.max(0, Math.min(1, normalizedRadius));

      if (clampedRadius < 0.33) {
        const t = clampedRadius / 0.33;
        color = COLORS.warmWhite.clone().lerp(COLORS.lightBlue, t);
      } else if (clampedRadius < 0.66) {
        const t = (clampedRadius - 0.33) / 0.33;
        color = COLORS.lightBlue.clone().lerp(COLORS.lightPurple, t);
      } else {
        const t = (clampedRadius - 0.66) / 0.34;
        color = COLORS.lightPurple.clone().lerp(COLORS.lightRed, t);
      }

      const jitter = 0.8 + Math.random() * 0.4;
      color.r = Math.min(1, color.r * jitter);
      color.g = Math.min(1, color.g * jitter);
      color.b = Math.min(1, color.b * jitter);
    }

    this.colors[i3] = color.r;
    this.colors[i3 + 1] = color.g;
    this.colors[i3 + 2] = color.b;
  }

  private calculatePosition(i: number, i3: number, radius: number, armIndex: number, twist: number): void {
    const baseAngle = (armIndex / this.params.armCount) * Math.PI * 2;
    const angle = baseAngle + radius * twist * 0.3 + this.randomAngleOffsets[i];
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;

    this.positions[i3] = x;
    this.positions[i3 + 1] = y;
    this.positions[i3 + 2] = this.baseZOffsets[i];
  }

  public update(deltaTime: number): void {
    this.time += deltaTime;
    const globalRotation = this.time * this.rotationSpeed;

    const { twist, coreParticleCount } = this.params;

    for (let i = 0; i < this.params.particleCount; i++) {
      const i3 = i * 3;
      const radius = this.radialDistances[i];
      const isCore = i < coreParticleCount;
      const armIndex = this.armIndices[i];

      const baseAngle = (armIndex / this.params.armCount) * Math.PI * 2;
      let angle: number;

      if (isCore) {
        angle = this.randomAngleOffsets[i] + globalRotation * 1.5;
      } else {
        angle = baseAngle + radius * twist * 0.3 + this.randomAngleOffsets[i] + globalRotation;
      }

      const orbitAngle = this.orbitPhases[i] + (this.time / this.orbitPeriods[i]) * Math.PI * 2;
      const orbitOffset = this.orbitAmplitudes[i] * Math.sin(orbitAngle);
      const effectiveRadius = radius + orbitOffset;

      this.positions[i3] = Math.cos(angle) * effectiveRadius;
      this.positions[i3 + 1] = Math.sin(angle) * effectiveRadius;

      const zPulse = Math.sin(this.time * 2 + this.orbitPhases[i]) * 0.01;
      this.positions[i3 + 2] = this.baseZOffsets[i] + zPulse;
    }

    (this.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
  }

  public setTwist(twist: number): void {
    this.params.twist = twist;
    const { coreParticleCount } = this.params;

    for (let i = coreParticleCount; i < this.params.particleCount; i++) {
      const i3 = i * 3;
      const radius = this.radialDistances[i];
      const armIndex = this.armIndices[i];
      const baseAngle = (armIndex / this.params.armCount) * Math.PI * 2;
      const angle = baseAngle + radius * twist * 0.3 + this.randomAngleOffsets[i];

      this.positions[i3] = Math.cos(angle) * radius;
      this.positions[i3 + 1] = Math.sin(angle) * radius;
    }

    (this.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
  }

  public setThickness(thickness: number): void {
    this.params.thickness = thickness;
    const { coreParticleCount, galaxyRadius } = this.params;

    for (let i = 0; i < this.params.particleCount; i++) {
      const i3 = i * 3;
      const isCore = i < coreParticleCount;
      const radius = this.radialDistances[i];
      const thicknessJitter = isCore ? 0.15 : thickness;
      const radiusFactor = 1 - radius / galaxyRadius * 0.5;
      this.baseZOffsets[i] = this.originalZSigns[i] * this.originalZFactors[i] * thicknessJitter * radiusFactor;
      this.positions[i3 + 2] = this.baseZOffsets[i];
    }

    (this.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
  }

  public setParticleSize(size: number): void {
    this.params.baseParticleSize = size;

    for (let i = 0; i < this.params.particleCount; i++) {
      this.sizes[i] = size * this.baseSizeMultipliers[i];
    }

    (this.geometry.attributes.aSize as THREE.BufferAttribute).needsUpdate = true;
  }

  public dispose(): void {
    this.geometry.dispose();
    this.material.dispose();
  }
}
