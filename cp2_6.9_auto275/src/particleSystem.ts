import * as THREE from 'three';

export interface ParticleSystemParams {
  rotationSpeed: number;
  collapseStrength: number;
  sizeMultiplier: number;
  colorOffset: number;
}

interface ParticleData {
  velocity: THREE.Vector3;
  angularSpeed: number;
  isCollapsing: boolean;
  collapseSpeed: number;
  birthTime: number;
  lifetime: number;
  baseSize: number;
  isStar: boolean;
}

export class ParticleSystem {
  public points: THREE.Points;
  public geometry: THREE.BufferGeometry;
  public material: THREE.Material;
  public gammaBurstPoints: THREE.Points;

  private particleCount: number;
  private positions: Float32Array;
  private colors: Float32Array;
  private sizes: Float32Array;
  private particleData: ParticleData[];

  private params: ParticleSystemParams;
  private colorInner = new THREE.Color(0x3B1F6E);
  private colorOuter = new THREE.Color(0x7EC8E3);
  private colorStar = new THREE.Color(0xFFD700);

  private innerRadius = 6;
  private outerRadius = 12;
  private starRadius = 1;
  private denseRadius = 1.5;

  private gammaBurstCount = 50;
  private gammaBurstPositions: Float32Array;
  private gammaBurstColors: Float32Array;
  private gammaBurstSizes: Float32Array;
  private gammaBurstActive: boolean[];
  private gammaBurstTimers: number[];
  private nextGammaBurstTime: number = 0;

  constructor(count: number = 8000) {
    this.particleCount = count;
    this.params = {
      rotationSpeed: 0.003,
      collapseStrength: 0.002,
      sizeMultiplier: 1.0,
      colorOffset: 0
    };

    this.positions = new Float32Array(count * 3);
    this.colors = new Float32Array(count * 3);
    this.sizes = new Float32Array(count);
    this.particleData = new Array(count);

    this.geometry = new THREE.BufferGeometry();
    this.geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    this.geometry.setAttribute('color', new THREE.BufferAttribute(this.colors, 3));
    this.geometry.setAttribute('particleSize', new THREE.BufferAttribute(this.sizes, 1));

    const vertexShader = `
      attribute float particleSize;
      varying vec3 vColor;
      void main() {
        vColor = color;
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = particleSize * (300.0 / -mvPosition.z);
        gl_Position = projectionMatrix * mvPosition;
      }
    `;

    const fragmentShader = `
      varying vec3 vColor;
      void main() {
        vec2 center = gl_PointCoord - vec2(0.5);
        float dist = length(center);
        if (dist > 0.5) discard;
        float alpha = smoothstep(0.5, 0.0, dist);
        alpha = pow(alpha, 1.5);
        gl_FragColor = vec4(vColor, alpha);
      }
    `;

    this.material = new THREE.ShaderMaterial({
      uniforms: {},
      vertexShader,
      fragmentShader,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      vertexColors: true
    });

    this.points = new THREE.Points(this.geometry, this.material);

    this.gammaBurstCount = 50;
    this.gammaBurstPositions = new Float32Array(this.gammaBurstCount * 3);
    this.gammaBurstColors = new Float32Array(this.gammaBurstCount * 3);
    this.gammaBurstSizes = new Float32Array(this.gammaBurstCount);
    this.gammaBurstActive = new Array(this.gammaBurstCount).fill(false);
    this.gammaBurstTimers = new Array(this.gammaBurstCount).fill(0);

    const gammaBurstGeometry = new THREE.BufferGeometry();
    gammaBurstGeometry.setAttribute('position', new THREE.BufferAttribute(this.gammaBurstPositions, 3));
    gammaBurstGeometry.setAttribute('color', new THREE.BufferAttribute(this.gammaBurstColors, 3));
    gammaBurstGeometry.setAttribute('particleSize', new THREE.BufferAttribute(this.gammaBurstSizes, 1));

    const gammaBurstVertexShader = `
      attribute float particleSize;
      varying vec3 vColor;
      void main() {
        vColor = color;
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = particleSize * (300.0 / -mvPosition.z);
        gl_Position = projectionMatrix * mvPosition;
      }
    `;

    const gammaBurstFragmentShader = `
      varying vec3 vColor;
      void main() {
        vec2 center = gl_PointCoord - vec2(0.5);
        float dist = length(center);
        if (dist > 0.5) discard;
        float alpha = smoothstep(0.5, 0.0, dist);
        alpha = pow(alpha, 1.2);
        gl_FragColor = vec4(vColor, alpha);
      }
    `;

    const gammaBurstMaterial = new THREE.ShaderMaterial({
      uniforms: {},
      vertexShader: gammaBurstVertexShader,
      fragmentShader: gammaBurstFragmentShader,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      vertexColors: true
    });

    this.gammaBurstPoints = new THREE.Points(gammaBurstGeometry, gammaBurstMaterial);

    this.initParticles();
  }

  private initParticles(): void {
    for (let i = 0; i < this.particleCount; i++) {
      this.resetParticle(i);
    }
    this.geometry.attributes.position.needsUpdate = true;
    this.geometry.attributes.color.needsUpdate = true;
    (this.geometry.attributes.particleSize as THREE.BufferAttribute).needsUpdate = true;
  }

  private resetParticle(index: number): void {
    const i3 = index * 3;
    const inDenseRegion = Math.random() < 0.3;
    const phi = Math.random() * Math.PI * 2;
    const theta = Math.acos(2 * Math.random() - 1);

    let radius: number;
    if (inDenseRegion) {
      radius = 0.5 + Math.random() * this.denseRadius;
    } else {
      radius = this.innerRadius + Math.random() * (this.outerRadius - this.innerRadius);
    }

    const x = radius * Math.sin(theta) * Math.cos(phi);
    const y = radius * Math.sin(theta) * Math.sin(phi);
    const z = radius * Math.cos(theta);

    this.positions[i3] = x;
    this.positions[i3 + 1] = y;
    this.positions[i3 + 2] = z;

    this.updateParticleColor(index, radius, inDenseRegion);

    const baseSize = 0.02 + Math.random() * 0.13;
    this.sizes[index] = baseSize;

    const isCollapsing = Math.random() < 0.1;

    this.particleData[index] = {
      velocity: new THREE.Vector3(0, 0, 0),
      angularSpeed: 0.002 + Math.random() * 0.003,
      isCollapsing,
      collapseSpeed: 0.001 + Math.random() * 0.002,
      birthTime: performance.now() / 1000,
      lifetime: 20 + Math.random() * 20,
      baseSize,
      isStar: false
    };
  }

  private updateParticleColor(index: number, radius: number, inDenseRegion: boolean): void {
    const i3 = index * 3;
    const t = Math.min(1, Math.max(0, (radius - 0) / this.outerRadius));
    const color = new THREE.Color().lerpColors(this.colorInner, this.colorOuter, t);

    if (this.params.colorOffset !== 0) {
      const hsl = { h: 0, s: 0, l: 0 };
      color.getHSL(hsl);
      hsl.h = (hsl.h + this.params.colorOffset + 1) % 1;
      color.setHSL(hsl.h, hsl.s, hsl.l);
    }

    if (inDenseRegion && radius < this.denseRadius) {
      color.r = Math.min(1, color.r * 1.15);
      color.g = Math.min(1, color.g * 1.15);
    }

    this.colors[i3] = color.r;
    this.colors[i3 + 1] = color.g;
    this.colors[i3 + 2] = color.b;
  }

  public update(camera: THREE.Camera, currentTime: number): void {
    const timeInSeconds = currentTime / 1000;

    for (let i = 0; i < this.particleCount; i++) {
      const i3 = i * 3;
      const data = this.particleData[i];

      if (timeInSeconds - data.birthTime > data.lifetime) {
        this.resetParticle(i);
        continue;
      }

      let x = this.positions[i3];
      let y = this.positions[i3 + 1];
      let z = this.positions[i3 + 2];

      const angle = data.angularSpeed * (0.6 + this.params.rotationSpeed * 100);
      const cosA = Math.cos(angle);
      const sinA = Math.sin(angle);
      const newX = x * cosA - z * sinA;
      const newZ = x * sinA + z * cosA;
      x = newX;
      z = newZ;

      if (data.isCollapsing) {
        const collapseSpeed = data.collapseSpeed * (0.5 + this.params.collapseStrength * 200);
        const dist = Math.sqrt(x * x + y * y + z * z);
        if (dist > 0.1) {
          x -= (x / dist) * collapseSpeed;
          y -= (y / dist) * collapseSpeed;
          z -= (z / dist) * collapseSpeed;
        }
      }

      const currentRadius = Math.sqrt(x * x + y * y + z * z);

      if (currentRadius < this.starRadius && !data.isStar) {
        data.isStar = true;
        data.baseSize = 0.3;
        this.colors[i3] = this.colorStar.r;
        this.colors[i3 + 1] = this.colorStar.g;
        this.colors[i3 + 2] = this.colorStar.b;
      } else if (currentRadius >= this.starRadius && data.isStar) {
        data.isStar = false;
        this.updateParticleColor(i, currentRadius, currentRadius < this.denseRadius);
      }

      let size = data.baseSize * this.params.sizeMultiplier;

      const dx = x - camera.position.x;
      const dy = y - camera.position.y;
      const dz = z - camera.position.z;
      const distanceToCamera = Math.sqrt(dx * dx + dy * dy + dz * dz);
      const distanceFactor = 1 + (1 / Math.max(1, distanceToCamera)) * 0.3;
      size *= distanceFactor;

      this.positions[i3] = x;
      this.positions[i3 + 1] = y;
      this.positions[i3 + 2] = z;
      this.sizes[i] = size;
    }

    this.geometry.attributes.position.needsUpdate = true;
    this.geometry.attributes.color.needsUpdate = true;
    (this.geometry.attributes.particleSize as THREE.BufferAttribute).needsUpdate = true;

    this.updateGammaBursts(currentTime);
  }

  private updateGammaBursts(currentTime: number): void {
    for (let i = 0; i < this.gammaBurstCount; i++) {
      if (this.gammaBurstActive[i]) {
        this.gammaBurstTimers[i] -= 16;
        if (this.gammaBurstTimers[i] <= 0) {
          this.gammaBurstActive[i] = false;
          this.gammaBurstSizes[i] = 0;
        }
      }
    }

    if (currentTime >= this.nextGammaBurstTime) {
      const inactiveIndex = this.gammaBurstActive.findIndex((active) => !active);
      if (inactiveIndex !== -1) {
        this.triggerGammaBurst(inactiveIndex);
      }
      this.nextGammaBurstTime = currentTime + (1000 + Math.random() * 2000);
    }

    const posAttr = this.gammaBurstPoints.geometry.attributes.position as THREE.BufferAttribute;
    const colorAttr = this.gammaBurstPoints.geometry.attributes.color as THREE.BufferAttribute;
    const sizeAttr = this.gammaBurstPoints.geometry.attributes.particleSize as THREE.BufferAttribute;
    posAttr.needsUpdate = true;
    colorAttr.needsUpdate = true;
    sizeAttr.needsUpdate = true;
  }

  private triggerGammaBurst(index: number): void {
    const i3 = index * 3;
    const phi = Math.random() * Math.PI * 2;
    const theta = Math.acos(2 * Math.random() - 1);
    const radius = this.innerRadius + Math.random() * (this.outerRadius - this.innerRadius);

    this.gammaBurstPositions[i3] = radius * Math.sin(theta) * Math.cos(phi);
    this.gammaBurstPositions[i3 + 1] = radius * Math.sin(theta) * Math.sin(phi);
    this.gammaBurstPositions[i3 + 2] = radius * Math.cos(theta);

    this.gammaBurstColors[i3] = 1;
    this.gammaBurstColors[i3 + 1] = 1;
    this.gammaBurstColors[i3 + 2] = 1;

    this.gammaBurstSizes[index] = 0.08;
    this.gammaBurstActive[index] = true;
    this.gammaBurstTimers[index] = 100;
  }

  public setParams(params: Partial<ParticleSystemParams>): void {
    Object.assign(this.params, params);

    for (let i = 0; i < this.particleCount; i++) {
      const i3 = i * 3;
      const data = this.particleData[i];
      const radius = Math.sqrt(
        this.positions[i3] ** 2 +
        this.positions[i3 + 1] ** 2 +
        this.positions[i3 + 2] ** 2
      );
      if (!data.isStar) {
        this.updateParticleColor(i, radius, radius < this.denseRadius);
      }
    }
    this.geometry.attributes.color.needsUpdate = true;
  }

  public reset(): void {
    this.initParticles();
  }

  public getParams(): ParticleSystemParams {
    return { ...this.params };
  }
}
