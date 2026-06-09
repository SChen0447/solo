import * as THREE from 'three';

export interface NebulaParams {
  density: number;
  complexity: number;
  spread: number;
  rotation: number;
  brightness: number;
}

const MAX_PARTICLES = 1500;
const STAR_COUNT = 500;

export class NebulaSystem {
  private scene: THREE.Scene;
  private nebulaPoints: THREE.Points;
  private starPoints: THREE.Points;
  private coreSphere: THREE.Mesh;
  private nebulaGeometry: THREE.BufferGeometry;
  private starGeometry: THREE.BufferGeometry;

  private positions: Float32Array;
  private targetPositions: Float32Array;
  private velocities: Float32Array;
  private colors: Float32Array;
  private sizes: Float32Array;
  private baseSizes: Float32Array;

  private starPositions: Float32Array;
  private starColors: Float32Array;
  private starSizes: Float32Array;
  private starTwinkle: Float32Array;

  private currentParams: NebulaParams = {
    density: 50,
    complexity: 50,
    spread: 50,
    rotation: 50,
    brightness: 50
  };

  private targetParams: NebulaParams = {
    density: 50,
    complexity: 50,
    spread: 50,
    rotation: 50,
    brightness: 50
  };

  private activeCount: number = 0;
  private time: number = 0;

  constructor(scene: THREE.Scene) {
    this.scene = scene;

    this.positions = new Float32Array(MAX_PARTICLES * 3);
    this.targetPositions = new Float32Array(MAX_PARTICLES * 3);
    this.velocities = new Float32Array(MAX_PARTICLES * 3);
    this.colors = new Float32Array(MAX_PARTICLES * 3);
    this.sizes = new Float32Array(MAX_PARTICLES);
    this.baseSizes = new Float32Array(MAX_PARTICLES);

    this.starPositions = new Float32Array(STAR_COUNT * 3);
    this.starColors = new Float32Array(STAR_COUNT * 3);
    this.starSizes = new Float32Array(STAR_COUNT);
    this.starTwinkle = new Float32Array(STAR_COUNT);

    this.nebulaGeometry = new THREE.BufferGeometry();
    this.starGeometry = new THREE.BufferGeometry();

    this.initParticles();
    this.initStars();
    this.initCoreSphere();
    this.initNebulaPoints();
    this.initStarPoints();
    this.updateTargetPositions();
  }

  private createGlowTexture(): THREE.Texture {
    const size = 128;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;

    const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
    gradient.addColorStop(0.2, 'rgba(255, 255, 255, 0.8)');
    gradient.addColorStop(0.4, 'rgba(255, 255, 255, 0.4)');
    gradient.addColorStop(0.7, 'rgba(255, 255, 255, 0.1)');
    gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
  }

  private initParticles(): void {
    for (let i = 0; i < MAX_PARTICLES; i++) {
      const i3 = i * 3;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = Math.random() * 5;

      this.positions[i3] = r * Math.sin(phi) * Math.cos(theta);
      this.positions[i3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      this.positions[i3 + 2] = r * Math.cos(phi);

      this.targetPositions[i3] = this.positions[i3];
      this.targetPositions[i3 + 1] = this.positions[i3 + 1];
      this.targetPositions[i3 + 2] = this.positions[i3 + 2];

      this.velocities[i3] = 0;
      this.velocities[i3 + 1] = 0;
      this.velocities[i3 + 2] = 0;

      this.baseSizes[i] = 1 + Math.random() * 4;
      this.sizes[i] = this.baseSizes[i];

      this.colors[i3] = 0.5;
      this.colors[i3 + 1] = 0.5;
      this.colors[i3 + 2] = 0.8;
    }
  }

  private initStars(): void {
    for (let i = 0; i < STAR_COUNT; i++) {
      const i3 = i * 3;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = 80 + Math.random() * 60;

      this.starPositions[i3] = r * Math.sin(phi) * Math.cos(theta);
      this.starPositions[i3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      this.starPositions[i3 + 2] = r * Math.cos(phi);

      const brightness = 0.6 + Math.random() * 0.4;
      this.starColors[i3] = brightness;
      this.starColors[i3 + 1] = brightness;
      this.starColors[i3 + 2] = brightness * (0.9 + Math.random() * 0.1);

      this.starSizes[i] = 0.5 + Math.random() * 1.5;
      this.starTwinkle[i] = Math.random() * Math.PI * 2;
    }
  }

  private initCoreSphere(): void {
    const geometry = new THREE.SphereGeometry(2, 32, 32);
    const material = new THREE.MeshBasicMaterial({
      color: 0x6080ff,
      transparent: true,
      opacity: 0.15
    });
    this.coreSphere = new THREE.Mesh(geometry, material);
    this.scene.add(this.coreSphere);
  }

  private initNebulaPoints(): void {
    this.nebulaGeometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    this.nebulaGeometry.setAttribute('color', new THREE.BufferAttribute(this.colors, 3));
    this.nebulaGeometry.setAttribute('size', new THREE.BufferAttribute(this.sizes, 1));

    const material = new THREE.ShaderMaterial({
      uniforms: {
        pointTexture: { value: this.createGlowTexture() },
        uTime: { value: 0 }
      },
      vertexShader: `
        attribute float size;
        varying vec3 vColor;
        uniform float uTime;
        void main() {
          vColor = color;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = size * (300.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        uniform sampler2D pointTexture;
        varying vec3 vColor;
        void main() {
          vec4 texColor = texture2D(pointTexture, gl_PointCoord);
          gl_FragColor = vec4(vColor, 1.0) * texColor;
        }
      `,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      transparent: true,
      vertexColors: true
    });

    this.nebulaPoints = new THREE.Points(this.nebulaGeometry, material);
    this.scene.add(this.nebulaPoints);
  }

  private initStarPoints(): void {
    this.starGeometry.setAttribute('position', new THREE.BufferAttribute(this.starPositions, 3));
    this.starGeometry.setAttribute('color', new THREE.BufferAttribute(this.starColors, 3));
    this.starGeometry.setAttribute('size', new THREE.BufferAttribute(this.starSizes, 1));

    const material = new THREE.ShaderMaterial({
      uniforms: {
        pointTexture: { value: this.createGlowTexture() },
        uTime: { value: 0 }
      },
      vertexShader: `
        attribute float size;
        varying vec3 vColor;
        varying float vSize;
        uniform float uTime;
        void main() {
          vColor = color;
          vSize = size;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = size * (200.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        uniform sampler2D pointTexture;
        uniform float uTime;
        varying vec3 vColor;
        varying float vSize;
        void main() {
          float twinkle = 0.7 + 0.3 * sin(uTime * 2.0 + vSize * 10.0);
          vec4 texColor = texture2D(pointTexture, gl_PointCoord);
          gl_FragColor = vec4(vColor * twinkle, 1.0) * texColor;
        }
      `,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      transparent: true,
      vertexColors: true
    });

    this.starPoints = new THREE.Points(this.starGeometry, material);
    this.scene.add(this.starPoints);
  }

  private hslToRgb(h: number, s: number, l: number): THREE.Color {
    const color = new THREE.Color();
    color.setHSL(h, s, l);
    return color;
  }

  private calculateParticleColor(density: number, complexity: number, distance: number, index: number): THREE.Color {
    const dNorm = density / 100;
    const cNorm = complexity / 100;
    const distNorm = Math.min(distance / 30, 1);

    let hue: number;
    let saturation: number;
    let lightness: number;

    if (dNorm > 0.5) {
      const hueOptions = [0, 0.08, 0.6, 0.75];
      const hueIdx = Math.floor((index / MAX_PARTICLES + cNorm * 0.5) * hueOptions.length) % hueOptions.length;
      hue = hueOptions[hueIdx];
      hue += (Math.random() - 0.5) * 0.05 * cNorm;
      saturation = 0.7 + 0.3 * dNorm;
      lightness = 0.4 + 0.2 * (1 - distNorm) + 0.1 * cNorm;
    } else {
      hue = 0.6 + Math.random() * 0.15;
      saturation = 0.4 + 0.3 * dNorm;
      lightness = 0.5 + 0.3 * (1 - distNorm);
    }

    return this.hslToRgb(hue, saturation, lightness);
  }

  private updateTargetPositions(): void {
    const density = this.targetParams.density / 100;
    const spread = this.targetParams.spread / 100;
    const complexity = this.targetParams.complexity / 100;

    this.activeCount = Math.floor(MAX_PARTICLES * (0.3 + density * 0.7));
    const maxRadius = 5 + spread * 45;

    for (let i = 0; i < MAX_PARTICLES; i++) {
      const i3 = i * 3;

      if (i < this.activeCount) {
        const noiseScale = 0.3 + complexity * 0.7;
        const theta = Math.random() * Math.PI * 2 + i * 0.01 * noiseScale;
        const phi = Math.acos(2 * Math.random() - 1);
        const rFactor = Math.pow(Math.random(), 0.5 + density * 0.5);
        const r = rFactor * maxRadius;

        const offset = (Math.sin(i * 12.9898 + complexity * 43.758) * 43758.5453) % 1;
        const turbulence = offset * complexity * 8;

        this.targetPositions[i3] = r * Math.sin(phi) * Math.cos(theta) + turbulence;
        this.targetPositions[i3 + 1] = r * Math.sin(phi) * Math.sin(theta) + turbulence * 0.7;
        this.targetPositions[i3 + 2] = r * Math.cos(phi) + turbulence * 0.5;

        const dist = Math.sqrt(
          this.targetPositions[i3] ** 2 +
          this.targetPositions[i3 + 1] ** 2 +
          this.targetPositions[i3 + 2] ** 2
        );

        const color = this.calculateParticleColor(
          this.targetParams.density,
          this.targetParams.complexity,
          dist,
          i
        );

        this.colors[i3] = color.r;
        this.colors[i3 + 1] = color.g;
        this.colors[i3 + 2] = color.b;

        const sizeFactor = 1 - Math.min(dist / maxRadius, 1) * 0.5;
        this.sizes[i] = this.baseSizes[i] * sizeFactor;
      }
    }

    this.nebulaGeometry.setDrawRange(0, this.activeCount);
    (this.nebulaGeometry.attributes.color as THREE.BufferAttribute).needsUpdate = true;
    (this.nebulaGeometry.attributes.size as THREE.BufferAttribute).needsUpdate = true;
  }

  public setParams(params: Partial<NebulaParams>): void {
    this.targetParams = { ...this.targetParams, ...params };
    this.updateTargetPositions();
  }

  public reset(): void {
    this.targetParams = {
      density: 0,
      complexity: 0,
      spread: 0,
      rotation: 0,
      brightness: 0
    };
    this.currentParams = { ...this.targetParams };
    this.updateTargetPositions();

    for (let i = 0; i < MAX_PARTICLES; i++) {
      const i3 = i * 3;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = Math.random() * 3;

      this.positions[i3] = r * Math.sin(phi) * Math.cos(theta);
      this.positions[i3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      this.positions[i3 + 2] = r * Math.cos(phi);
    }
    (this.nebulaGeometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
  }

  public update(deltaTime: number): void {
    this.time += deltaTime;

    const lerpFactor = 1 - Math.pow(0.001, deltaTime);
    this.currentParams.density += (this.targetParams.density - this.currentParams.density) * lerpFactor;
    this.currentParams.complexity += (this.targetParams.complexity - this.currentParams.complexity) * lerpFactor;
    this.currentParams.spread += (this.targetParams.spread - this.currentParams.spread) * lerpFactor;
    this.currentParams.rotation += (this.targetParams.rotation - this.currentParams.rotation) * lerpFactor;
    this.currentParams.brightness += (this.targetParams.brightness - this.currentParams.brightness) * lerpFactor;

    const rotationSpeed = (this.currentParams.rotation / 100) * 0.8;
    const movementSpeed = 0.5 + (this.currentParams.spread / 100) * 1.5;
    const brightnessMult = 0.5 + (this.currentParams.brightness / 100) * 1.5;

    for (let i = 0; i < this.activeCount; i++) {
      const i3 = i * 3;

      const dx = this.targetPositions[i3] - this.positions[i3];
      const dy = this.targetPositions[i3 + 1] - this.positions[i3 + 1];
      const dz = this.targetPositions[i3 + 2] - this.positions[i3 + 2];

      this.velocities[i3] += dx * deltaTime * movementSpeed * 2;
      this.velocities[i3 + 1] += dy * deltaTime * movementSpeed * 2;
      this.velocities[i3 + 2] += dz * deltaTime * movementSpeed * 2;

      this.velocities[i3] *= 0.96;
      this.velocities[i3 + 1] *= 0.96;
      this.velocities[i3 + 2] *= 0.96;

      this.positions[i3] += this.velocities[i3];
      this.positions[i3 + 1] += this.velocities[i3 + 1];
      this.positions[i3 + 2] += this.velocities[i3 + 2];

      if (rotationSpeed > 0.001) {
        const x = this.positions[i3];
        const z = this.positions[i3 + 2];
        const cosR = Math.cos(rotationSpeed * deltaTime);
        const sinR = Math.sin(rotationSpeed * deltaTime);
        this.positions[i3] = x * cosR - z * sinR;
        this.positions[i3 + 2] = x * sinR + z * cosR;

        const y = this.positions[i3 + 1];
        const z2 = this.positions[i3 + 2];
        this.positions[i3 + 1] = y * cosR - z2 * sinR * 0.3;
        this.positions[i3 + 2] = y * sinR * 0.3 + z2 * cosR;
      }
    }

    (this.nebulaGeometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;

    const nebulaMaterial = this.nebulaPoints.material as THREE.ShaderMaterial;
    nebulaMaterial.uniforms.uTime.value = this.time;
    nebulaMaterial.opacity = brightnessMult;

    const starMaterial = this.starPoints.material as THREE.ShaderMaterial;
    starMaterial.uniforms.uTime.value = this.time;

    const coreMaterial = this.coreSphere.material as THREE.MeshBasicMaterial;
    coreMaterial.opacity = 0.08 + (this.currentParams.brightness / 100) * 0.25;
  }

  public dispose(): void {
    this.nebulaGeometry.dispose();
    this.starGeometry.dispose();
    (this.nebulaPoints.material as THREE.Material).dispose();
    (this.starPoints.material as THREE.Material).dispose();
    this.coreSphere.geometry.dispose();
    (this.coreSphere.material as THREE.Material).dispose();
    this.scene.remove(this.nebulaPoints);
    this.scene.remove(this.starPoints);
    this.scene.remove(this.coreSphere);
  }
}
