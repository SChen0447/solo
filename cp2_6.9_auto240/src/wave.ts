import * as THREE from 'three';

export interface WaveParams {
  frequency: number;
  amplitude: number;
  wavelength: number;
  incidentAngle: number;
}

export interface WaveFrontData {
  position: THREE.Vector3;
  direction: THREE.Vector3;
  amplitude: number;
  wavelength: number;
  phase: number;
  inMedium: boolean;
}

const GRID_SIZE = 10;
const GRID_SPACING = 0.5;
const TRAIL_COUNT = 3;
const TRAIL_DELAY = 0.5;

export class WaveSystem {
  private scene: THREE.Scene;
  private params: WaveParams;
  private geometry: THREE.BufferGeometry;
  private material: THREE.ShaderMaterial;
  private mesh: THREE.Points;
  private trailPositions: Float32Array[];
  private trailMeshes: THREE.Points[];
  private startTime: number;
  private waveFronts: WaveFrontData[];
  private isReflection: boolean;
  private baseColor: THREE.Color;

  constructor(
    scene: THREE.Scene,
    params: WaveParams,
    isReflection: boolean = false,
    baseColor: THREE.Color = new THREE.Color(0x2196F3)
  ) {
    this.scene = scene;
    this.params = { ...params };
    this.startTime = performance.now();
    this.waveFronts = [];
    this.isReflection = isReflection;
    this.baseColor = baseColor.clone();

    this.geometry = new THREE.BufferGeometry();
    this.setupGeometry();
    this.material = this.createShaderMaterial();
    this.mesh = new THREE.Points(this.geometry, this.material);
    this.mesh.frustumCulled = false;
    this.scene.add(this.mesh);

    this.trailPositions = [];
    this.trailMeshes = [];
    this.setupTrails();
  }

  private setupGeometry(): void {
    const vertexCount = GRID_SIZE * GRID_SIZE;
    const positions = new Float32Array(vertexCount * 3);
    const colors = new Float32Array(vertexCount * 3);
    const phases = new Float32Array(vertexCount);

    let idx = 0;
    for (let i = 0; i < GRID_SIZE; i++) {
      for (let j = 0; j < GRID_SIZE; j++) {
        const x = (j - GRID_SIZE / 2) * GRID_SPACING;
        const z = (i - GRID_SIZE / 2) * GRID_SPACING;
        positions[idx * 3] = x;
        positions[idx * 3 + 1] = 0;
        positions[idx * 3 + 2] = z;

        const t = (j / (GRID_SIZE - 1));
        colors[idx * 3] = 0.13 + t * 0.83;
        colors[idx * 3 + 1] = 0.59 - t * 0.33;
        colors[idx * 3 + 2] = 0.95 - t * 0.58;

        phases[idx] = (j / GRID_SIZE) * Math.PI * 2;
        idx++;
      }
    }

    this.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    this.geometry.setAttribute('aPhase', new THREE.BufferAttribute(phases, 1));
  }

  private createShaderMaterial(): THREE.ShaderMaterial {
    const uniforms = {
      uTime: { value: 0 },
      uFrequency: { value: this.params.frequency },
      uAmplitude: { value: this.params.amplitude },
      uWavelength: { value: this.params.wavelength },
      uBaseColor: { value: this.baseColor.clone() },
      uPointSize: { value: 0.15 }
    };

    return new THREE.ShaderMaterial({
      uniforms,
      vertexShader: `
        attribute float aPhase;
        uniform float uTime;
        uniform float uFrequency;
        uniform float uAmplitude;
        uniform float uWavelength;
        uniform float uPointSize;
        varying float vIntensity;
        varying vec3 vColor;
        void main() {
          float wave = sin(2.0 * 3.14159 * (uFrequency * uTime - position.x / uWavelength) + aPhase);
          float y = wave * uAmplitude;
          vIntensity = (wave + 1.0) * 0.5;
          vec3 newPos = position;
          newPos.y = y;
          vec4 mvPosition = modelViewMatrix * vec4(newPos, 1.0);
          gl_PointSize = uPointSize * (300.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        uniform vec3 uBaseColor;
        varying float vIntensity;
        void main() {
          float dist = length(gl_PointCoord - vec2(0.5));
          if (dist > 0.5) discard;
          float glow = 1.0 - smoothstep(0.0, 0.5, dist);
          vec3 hotColor = vec3(0.96, 0.26, 0.21);
          vec3 color = mix(uBaseColor, hotColor, vIntensity);
          gl_FragColor = vec4(color * glow, glow * 0.9);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
  }

  private setupTrails(): void {
    const vertexCount = GRID_SIZE * GRID_SIZE;
    for (let t = 0; t < TRAIL_COUNT; t++) {
      const positions = new Float32Array(vertexCount * 3);
      this.trailPositions.push(positions);

      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

      const scale = 1.0 - (t + 1) * 0.25;
      const opacity = 1.0 - (t + 1) * 0.3;

      const mat = new THREE.ShaderMaterial({
        uniforms: {
          uTime: { value: 0 },
          uScale: { value: scale },
          uOpacity: { value: opacity },
          uColor: { value: this.baseColor.clone() }
        },
        vertexShader: `
          uniform float uScale;
          varying float vAlpha;
          void main() {
            vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
            gl_PointSize = uScale * 0.1 * (300.0 / -mvPosition.z);
            gl_Position = projectionMatrix * mvPosition;
            vAlpha = uScale;
          }
        `,
        fragmentShader: `
          uniform vec3 uColor;
          uniform float uOpacity;
          varying float vAlpha;
          void main() {
            float dist = length(gl_PointCoord - vec2(0.5));
            if (dist > 0.5) discard;
            float glow = 1.0 - smoothstep(0.0, 0.5, dist);
            gl_FragColor = vec4(uColor, glow * uOpacity * vAlpha);
          }
        `,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      });

      const points = new THREE.Points(geo, mat);
      points.frustumCulled = false;
      this.trailMeshes.push(points);
      this.scene.add(points);
    }
  }

  public updateParams(params: Partial<WaveParams>): void {
    Object.assign(this.params, params);
    if (this.material.uniforms) {
      if (params.frequency !== undefined) this.material.uniforms.uFrequency.value = params.frequency;
      if (params.amplitude !== undefined) this.material.uniforms.uAmplitude.value = params.amplitude;
      if (params.wavelength !== undefined) this.material.uniforms.uWavelength.value = params.wavelength;
    }
  }

  public update(_time: number, mediumData?: {
    boundaryX: number;
    wavelengthScale: number;
    amplitudeScale: number;
    incidentAngle: number;
  }): void {
    const elapsed = (performance.now() - this.startTime) / 1000;
    if (this.material.uniforms) {
      this.material.uniforms.uTime.value = elapsed;
    }

    const positions = this.geometry.attributes.position.array as Float32Array;
    const colors = this.geometry.attributes.color.array as Float32Array;
    const len = positions.length / 3;

    for (let i = 0; i < len; i++) {
      const baseX = positions[i * 3];
      const baseZ = positions[i * 3 + 2];

      let effectiveWavelength = this.params.wavelength;
      let effectiveAmplitude = this.params.amplitude;
      let colorMix = 0;

      if (mediumData && baseX > mediumData.boundaryX - 0.5 && baseX < mediumData.boundaryX + 2) {
        const progress = Math.min(1, Math.max(0, (baseX - mediumData.boundaryX + 0.5) / 2.5));
        effectiveWavelength = this.params.wavelength * (1 - progress * (1 - mediumData.wavelengthScale));
        effectiveAmplitude = this.params.amplitude * (1 - progress * (1 - mediumData.amplitudeScale));
        colorMix = progress;
        if (this.isReflection) {
          effectiveWavelength = this.params.wavelength;
          effectiveAmplitude = this.params.amplitude;
        }
      } else if (mediumData && baseX >= mediumData.boundaryX + 2) {
        effectiveWavelength = this.params.wavelength * mediumData.wavelengthScale;
        effectiveAmplitude = this.params.amplitude * mediumData.amplitudeScale;
        colorMix = 1;
        if (this.isReflection) {
          effectiveWavelength = this.params.wavelength;
          effectiveAmplitude = this.params.amplitude;
          colorMix = 0;
        }
      }

      const phaseShift = this.isReflection ? Math.PI : 0;
      let dirX = Math.cos((this.params.incidentAngle * Math.PI) / 180);
      let dirZ = Math.sin((this.params.incidentAngle * Math.PI) / 180);

      if (mediumData && baseX > mediumData.boundaryX && !this.isReflection) {
        const n1 = 1.0;
        const n2 = 1.5;
        const theta1 = (this.params.incidentAngle * Math.PI) / 180;
        const sinTheta2 = (n1 / n2) * Math.sin(theta1);
        const theta2 = Math.asin(Math.min(1, sinTheta2));
        dirX = Math.cos(theta2);
        dirZ = Math.sin(theta2);
      }

      const waveX = baseX * dirX + baseZ * dirZ;
      const y = Math.sin(
        2 * Math.PI * (this.params.frequency * elapsed - waveX / effectiveWavelength) + phaseShift
      ) * effectiveAmplitude;

      positions[i * 3 + 1] = y;

      const intensity = (y / effectiveAmplitude + 1) * 0.5;
      const r = 0.13 + intensity * 0.83 + colorMix * 0.1;
      const g = 0.59 - intensity * 0.33 - colorMix * 0.1;
      const b = 0.95 - intensity * 0.58 - colorMix * 0.1;

      if (this.isReflection) {
        colors[i * 3] = 0.55 + intensity * 0.2;
        colors[i * 3 + 1] = 0.76 + intensity * 0.2;
        colors[i * 3 + 2] = 0.29 + intensity * 0.1;
      } else {
        colors[i * 3] = Math.min(1, r);
        colors[i * 3 + 1] = Math.max(0, g);
        colors[i * 3 + 2] = Math.max(0, b);
      }
    }

    this.geometry.attributes.position.needsUpdate = true;
    this.geometry.attributes.color.needsUpdate = true;

    this.updateTrails();
  }

  private updateTrails(): void {
    const mainPositions = this.geometry.attributes.position.array as Float32Array;
    for (let t = 0; t < TRAIL_COUNT; t++) {
      const delay = (t + 1) * TRAIL_DELAY / TRAIL_COUNT;
      const trailPos = this.trailPositions[t];
      for (let i = 0; i < mainPositions.length; i += 3) {
        trailPos[i] = mainPositions[i] - delay * 0.5;
        trailPos[i + 1] = mainPositions[i + 1];
        trailPos[i + 2] = mainPositions[i + 2];
      }
      (this.trailMeshes[t].geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
    }
  }

  public getMesh(): THREE.Points {
    return this.mesh;
  }

  public setVisible(visible: boolean): void {
    this.mesh.visible = visible;
    this.trailMeshes.forEach(m => m.visible = visible);
  }

  public getWaveFronts(): WaveFrontData[] {
    return this.waveFronts;
  }

  public dispose(): void {
    this.geometry.dispose();
    this.material.dispose();
    this.trailMeshes.forEach(m => {
      m.geometry.dispose();
      (m.material as THREE.Material).dispose();
    });
    this.scene.remove(this.mesh);
    this.trailMeshes.forEach(m => this.scene.remove(m));
  }
}

export class ParticleSystem {
  private scene: THREE.Scene;
  private maxParticles: number;
  private geometry: THREE.BufferGeometry;
  private material: THREE.PointsMaterial;
  private mesh: THREE.Points;
  private particles: Array<{
    position: THREE.Vector3;
    velocity: THREE.Vector3;
    life: number;
    maxLife: number;
    color: THREE.Color;
  }>;
  private positions: Float32Array;
  private colors: Float32Array;
  private sizes: Float32Array;

  constructor(scene: THREE.Scene, maxParticles: number = 500) {
    this.scene = scene;
    this.maxParticles = maxParticles;
    this.particles = [];

    this.positions = new Float32Array(maxParticles * 3);
    this.colors = new Float32Array(maxParticles * 3);
    this.sizes = new Float32Array(maxParticles);

    this.geometry = new THREE.BufferGeometry();
    this.geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    this.geometry.setAttribute('color', new THREE.BufferAttribute(this.colors, 3));
    this.geometry.setAttribute('size', new THREE.BufferAttribute(this.sizes, 1));

    this.material = new THREE.PointsMaterial({
      size: 0.1,
      vertexColors: true,
      transparent: true,
      opacity: 0.7,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true
    });

    this.mesh = new THREE.Points(this.geometry, this.material);
    this.mesh.frustumCulled = false;
    this.scene.add(this.mesh);
  }

  public spawn(position: THREE.Vector3, color: THREE.Color): void {
    if (this.particles.length >= this.maxParticles) {
      this.particles.shift();
    }
    this.particles.push({
      position: position.clone(),
      velocity: new THREE.Vector3(
        (Math.random() - 0.5) * 0.02,
        (Math.random() - 0.5) * 0.05,
        (Math.random() - 0.5) * 0.02
      ),
      life: 1.0,
      maxLife: 2.0,
      color: color.clone()
    });
  }

  public update(deltaTime: number): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= deltaTime;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
        continue;
      }
      p.position.add(p.velocity);
      p.velocity.y -= 0.01;
    }

    for (let i = 0; i < this.maxParticles; i++) {
      if (i < this.particles.length) {
        const p = this.particles[i];
        const alpha = p.life / p.maxLife;
        this.positions[i * 3] = p.position.x;
        this.positions[i * 3 + 1] = p.position.y;
        this.positions[i * 3 + 2] = p.position.z;
        this.colors[i * 3] = p.color.r;
        this.colors[i * 3 + 1] = p.color.g;
        this.colors[i * 3 + 2] = p.color.b;
        this.sizes[i] = 0.1 * alpha;
      } else {
        this.positions[i * 3] = 0;
        this.positions[i * 3 + 1] = -1000;
        this.positions[i * 3 + 2] = 0;
        this.sizes[i] = 0;
      }
    }

    (this.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
    (this.geometry.attributes.color as THREE.BufferAttribute).needsUpdate = true;
    (this.geometry.attributes.size as THREE.BufferAttribute).needsUpdate = true;
  }

  public dispose(): void {
    this.geometry.dispose();
    this.material.dispose();
    this.scene.remove(this.mesh);
  }
}
