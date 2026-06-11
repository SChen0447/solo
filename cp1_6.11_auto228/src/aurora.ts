import * as THREE from 'three';

export interface AuroraParams {
  geomagneticIntensity: number;
  solarWindSpeed: number;
}

export interface ParticleState {
  positions: Float32Array;
  colors: Float32Array;
  alphas: Float32Array;
}

interface FallingParticle {
  mesh: THREE.Mesh;
  velocity: THREE.Vector3;
  life: number;
}

const COLOR_BOTTOM = new THREE.Color('#00ff88');
const COLOR_MIDDLE = new THREE.Color('#00ddff');
const COLOR_TOP = new THREE.Color('#ff00ee');
const RAIN_COLOR = new THREE.Color('#00ffcc');

export class AuroraSystem {
  public scene: THREE.Scene;
  public auroraPoints: THREE.Points;
  public starPoints: THREE.Points;
  public mountainMesh: THREE.Mesh;
  public rainParticles: FallingParticle[] = [];

  private particleCount = 8000;
  private starCount = 3000;
  private bandCount = 8;
  private positions: Float32Array;
  private colors: Float32Array;
  private alphas: Float32Array;
  private basePositions: Float32Array;
  private phases: Float32Array;
  private starAlphas: Float32Array;
  private starPhases: Float32Array;
  private time = 0;
  private rainTimer = 0;
  private lastRainSpawn = 0;

  constructor(scene: THREE.Scene) {
    this.scene = scene;

    this.positions = new Float32Array(this.particleCount * 3);
    this.colors = new Float32Array(this.particleCount * 3);
    this.alphas = new Float32Array(this.particleCount);
    this.basePositions = new Float32Array(this.particleCount * 3);
    this.phases = new Float32Array(this.particleCount);
    this.starAlphas = new Float32Array(this.starCount);
    this.starPhases = new Float32Array(this.starCount);

    this.auroraPoints = this.createAuroraParticles();
    this.starPoints = this.createStars();
    this.mountainMesh = this.createMountains();

    this.scene.add(this.auroraPoints);
    this.scene.add(this.starPoints);
    this.scene.add(this.mountainMesh);
  }

  private bezierPoint(
    t: number,
    p0: THREE.Vector3,
    p1: THREE.Vector3,
    p2: THREE.Vector3,
    p3: THREE.Vector3
  ): THREE.Vector3 {
    const mt = 1 - t;
    const mt2 = mt * mt;
    const mt3 = mt2 * mt;
    const t2 = t * t;
    const t3 = t2 * t;

    return new THREE.Vector3(
      mt3 * p0.x + 3 * mt2 * t * p1.x + 3 * mt * t2 * p2.x + t3 * p3.x,
      mt3 * p0.y + 3 * mt2 * t * p1.y + 3 * mt * t2 * p2.y + t3 * p3.y,
      mt3 * p0.z + 3 * mt2 * t * p1.z + 3 * mt * t2 * p2.z + t3 * p3.z
    );
  }

  private getColorByHeight(y: number): THREE.Color {
    const normalizedY = (y + 50) / 100;
    const color = new THREE.Color();

    if (normalizedY <= 0.5) {
      const t = normalizedY * 2;
      color.copy(COLOR_BOTTOM).lerp(COLOR_MIDDLE, t);
    } else {
      const t = (normalizedY - 0.5) * 2;
      color.copy(COLOR_MIDDLE).lerp(COLOR_TOP, t);
    }

    return color;
  }

  private createAuroraParticles(): THREE.Points {
    const particlesPerBand = Math.floor(this.particleCount / this.bandCount);

    for (let band = 0; band < this.bandCount; band++) {
      const bandOffset = (band - this.bandCount / 2 + 0.5) * 12;
      const bandHeight = 80 + Math.random() * 40;
      const bandY = -10 + (Math.random() - 0.5) * 20;

      const curveStart = new THREE.Vector3(-300, bandY - bandHeight / 2, bandOffset);
      const curveCP1 = new THREE.Vector3(-100, bandY + bandHeight * 0.3 + Math.random() * 20, bandOffset + (Math.random() - 0.5) * 30);
      const curveCP2 = new THREE.Vector3(100, bandY + bandHeight * 0.3 + Math.random() * 20, bandOffset + (Math.random() - 0.5) * 30);
      const curveEnd = new THREE.Vector3(300, bandY - bandHeight / 2, bandOffset);

      for (let i = 0; i < particlesPerBand; i++) {
        const idx = band * particlesPerBand + i;
        if (idx >= this.particleCount) break;

        const tX = i / particlesPerBand;
        const bezierPoint = this.bezierPoint(tX, curveStart, curveCP1, curveCP2, curveEnd);

        const yJitter = (Math.random() - 0.5) * bandHeight * 0.8;
        const zJitter = (Math.random() - 0.5) * 15;
        const xJitter = (Math.random() - 0.5) * 8;

        const x = bezierPoint.x + xJitter;
        const y = THREE.MathUtils.clamp(bezierPoint.y + yJitter, -50, 50);
        const z = bezierPoint.z + zJitter;

        this.basePositions[idx * 3] = x;
        this.basePositions[idx * 3 + 1] = y;
        this.basePositions[idx * 3 + 2] = z;

        this.positions[idx * 3] = x;
        this.positions[idx * 3 + 1] = y;
        this.positions[idx * 3 + 2] = z;

        const color = this.getColorByHeight(y);
        this.colors[idx * 3] = color.r;
        this.colors[idx * 3 + 1] = color.g;
        this.colors[idx * 3 + 2] = color.b;

        this.alphas[idx] = 0.3 + Math.random() * 0.6;
        this.phases[idx] = Math.random() * Math.PI * 2;
      }
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(this.colors, 3));
    geometry.setAttribute('alpha', new THREE.BufferAttribute(this.alphas, 1));

    const vertexShader = `
      attribute float alpha;
      varying vec3 vColor;
      varying float vAlpha;
      uniform float uTime;

      void main() {
        vColor = color;
        vAlpha = alpha;
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = 3.0 * (300.0 / -mvPosition.z);
        gl_Position = projectionMatrix * mvPosition;
      }
    `;

    const fragmentShader = `
      varying vec3 vColor;
      varying float vAlpha;

      void main() {
        float dist = length(gl_PointCoord - vec2(0.5));
        if (dist > 0.5) discard;
        float glow = 1.0 - smoothstep(0.0, 0.5, dist);
        gl_FragColor = vec4(vColor, vAlpha * glow);
      }
    `;

    const material = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 }
      },
      vertexShader,
      fragmentShader,
      transparent: true,
      vertexColors: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    return new THREE.Points(geometry, material);
  }

  private createStars(): THREE.Points {
    const positions = new Float32Array(this.starCount * 3);
    const colors = new Float32Array(this.starCount * 3);

    for (let i = 0; i < this.starCount; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random() * 0.6 + 0.1);
      const r = 400 + Math.random() * 100;

      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.cos(phi) - 50;
      positions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta) - 100;

      const t = Math.random();
      const color = new THREE.Color();
      color.setRGB(0.8 + t * 0.2, 0.9 + t * 0.1, 1.0);
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;

      this.starAlphas[i] = 0.4 + Math.random() * 0.6;
      this.starPhases[i] = Math.random() * Math.PI * 2;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('alpha', new THREE.BufferAttribute(this.starAlphas, 1));

    const vertexShader = `
      attribute float alpha;
      varying vec3 vColor;
      varying float vAlpha;

      void main() {
        vColor = color;
        vAlpha = alpha;
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = 1.5 * (300.0 / -mvPosition.z);
        gl_Position = projectionMatrix * mvPosition;
      }
    `;

    const fragmentShader = `
      varying vec3 vColor;
      varying float vAlpha;

      void main() {
        float dist = length(gl_PointCoord - vec2(0.5));
        if (dist > 0.5) discard;
        float glow = 1.0 - smoothstep(0.1, 0.5, dist);
        gl_FragColor = vec4(vColor, vAlpha * glow);
      }
    `;

    const material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      transparent: true,
      vertexColors: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    return new THREE.Points(geometry, material);
  }

  private createMountains(): THREE.Mesh {
    const width = 1200;
    const height = 120;
    const segments = 120;

    const geometry = new THREE.PlaneGeometry(width, height, segments, 1);
    const positions = geometry.attributes.position.array as Float32Array;

    for (let i = 0; i <= segments; i++) {
      const x = (i / segments - 0.5) * width;
      const noise =
        Math.sin(x * 0.01) * 20 +
        Math.sin(x * 0.03 + 1.5) * 15 +
        Math.sin(x * 0.07 + 3) * 10 +
        Math.sin(x * 0.15 + 2) * 5;

      positions[(i * 2 + 1) * 3 + 1] = noise;
      positions[(i * 2) * 3 + 1] = -height / 2;
    }

    geometry.computeVertexNormals();

    const material = new THREE.MeshBasicMaterial({
      color: 0x1a2a3a,
      transparent: true,
      opacity: 0.9,
      side: THREE.DoubleSide
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(0, -60, -50);
    mesh.rotation.x = 0;

    return mesh;
  }

  private spawnRainParticles(): void {
    const count = 10 + Math.floor(Math.random() * 6);

    for (let i = 0; i < count; i++) {
      const size = 2 + Math.random() * 2;
      const geometry = new THREE.SphereGeometry(size * 0.5, 6, 6);
      const material = new THREE.MeshBasicMaterial({
        color: RAIN_COLOR,
        transparent: true,
        opacity: 0.9,
        blending: THREE.AdditiveBlending
      });

      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(
        (Math.random() - 0.5) * 400,
        30 + Math.random() * 10,
        (Math.random() - 0.5) * 50 - 20
      );

      this.rainParticles.push({
        mesh,
        velocity: new THREE.Vector3(
          (Math.random() - 0.5) * 0.3,
          -(0.3 + Math.random() * 0.5),
          (Math.random() - 0.5) * 0.2
        ),
        life: 1.0
      });

      this.scene.add(mesh);
    }
  }

  public update(delta: number, params: AuroraParams): void {
    this.time += delta;

    const { geomagneticIntensity, solarWindSpeed } = params;
    const swingAmplitude = 5 + geomagneticIntensity * 15;
    const fallSpeed = 0.2 + geomagneticIntensity * 0.75;
    const driftSpeed = 0.1 + solarWindSpeed * 0.1;
    const solarWindBias = (solarWindSpeed - 1) / 4;

    const posAttr = this.auroraPoints.geometry.getAttribute('position') as THREE.BufferAttribute;
    const colorAttr = this.auroraPoints.geometry.getAttribute('color') as THREE.BufferAttribute;
    const alphaAttr = this.auroraPoints.geometry.getAttribute('alpha') as THREE.BufferAttribute;

    for (let i = 0; i < this.particleCount; i++) {
      const i3 = i * 3;
      const phase = this.phases[i];

      const baseX = this.basePositions[i3];
      const baseY = this.basePositions[i3 + 1];
      const baseZ = this.basePositions[i3 + 2];

      const swingX = Math.sin(this.time * driftSpeed + phase) * swingAmplitude;
      const swingZ = Math.cos(this.time * driftSpeed * 0.7 + phase * 1.3) * swingAmplitude * 0.3;

      let newY = baseY - (this.time * fallSpeed * 60) % 100;
      if (newY < -50) newY += 100;

      (posAttr.array as Float32Array)[i3] = baseX + swingX;
      (posAttr.array as Float32Array)[i3 + 1] = newY;
      (posAttr.array as Float32Array)[i3 + 2] = baseZ + swingZ;

      const baseColor = this.getColorByHeight(newY);
      let r = baseColor.r;
      let g = baseColor.g;
      let b = baseColor.b;

      g = Math.max(0, g - solarWindBias * 0.2);
      r = Math.min(1, r + solarWindBias * 0.15);
      b = Math.min(1, b + solarWindBias * 0.15);

      (colorAttr.array as Float32Array)[i3] = r;
      (colorAttr.array as Float32Array)[i3 + 1] = g;
      (colorAttr.array as Float32Array)[i3 + 2] = b;

      const pulse = 0.3 + 0.6 * (0.5 + 0.5 * Math.sin(this.time * 1.5 + phase));
      (alphaAttr.array as Float32Array)[i] = pulse;
    }

    posAttr.needsUpdate = true;
    colorAttr.needsUpdate = true;
    alphaAttr.needsUpdate = true;

    const starAlphaAttr = this.starPoints.geometry.getAttribute('alpha') as THREE.BufferAttribute;
    for (let i = 0; i < this.starCount; i++) {
      const period = 1 + Math.random() * 2;
      const twinkle = 0.4 + 0.6 * (0.5 + 0.5 * Math.sin(this.time * (Math.PI * 2 / period) + this.starPhases[i]));
      (starAlphaAttr.array as Float32Array)[i] = twinkle;
    }
    starAlphaAttr.needsUpdate = true;

    this.rainTimer += delta;
    if (this.rainTimer - this.lastRainSpawn >= 2) {
      this.spawnRainParticles();
      this.lastRainSpawn = this.rainTimer;
    }

    for (let i = this.rainParticles.length - 1; i >= 0; i--) {
      const p = this.rainParticles[i];
      p.velocity.y -= delta * 0.2;
      p.mesh.position.addScaledVector(p.velocity, delta * 60);
      p.life -= delta * 0.3;

      const mat = p.mesh.material as THREE.MeshBasicMaterial;
      mat.opacity = Math.max(0, p.life) * 0.9;

      if (p.mesh.position.y < -60 || p.life <= 0) {
        this.scene.remove(p.mesh);
        p.mesh.geometry.dispose();
        (p.mesh.material as THREE.Material).dispose();
        this.rainParticles.splice(i, 1);
      }
    }
  }

  public getParticleState(): ParticleState {
    return {
      positions: new Float32Array(this.positions),
      colors: new Float32Array(this.colors),
      alphas: new Float32Array(this.alphas)
    };
  }

  public restoreParticleState(state: ParticleState): void {
    const posAttr = this.auroraPoints.geometry.getAttribute('position') as THREE.BufferAttribute;
    const colorAttr = this.auroraPoints.geometry.getAttribute('color') as THREE.BufferAttribute;
    const alphaAttr = this.auroraPoints.geometry.getAttribute('alpha') as THREE.BufferAttribute;

    (posAttr.array as Float32Array).set(state.positions);
    (colorAttr.array as Float32Array).set(state.colors);
    (alphaAttr.array as Float32Array).set(state.alphas);

    posAttr.needsUpdate = true;
    colorAttr.needsUpdate = true;
    alphaAttr.needsUpdate = true;

    this.positions.set(state.positions);
    this.colors.set(state.colors);
    this.alphas.set(state.alphas);
  }
}
