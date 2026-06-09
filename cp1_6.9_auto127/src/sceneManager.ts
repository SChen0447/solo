import * as THREE from 'three';

export class SceneManager {
  public scene: THREE.Scene;
  public camera: THREE.PerspectiveCamera;
  public renderer: THREE.WebGLRenderer;

  private starPoints: THREE.Points;
  private starTwinkleData: { phase: number; speed: number }[] = [];
  private vortex: THREE.Mesh;
  private vortexParticles: THREE.Points;
  private vortexParticleData: { velocity: THREE.Vector3; life: number; maxLife: number }[] = [];
  private nebulaBackground: THREE.Mesh;

  private vortexRotationSpeed = 0.01;
  private vortexColorCycleTime = 0;
  private vortexColorCycling = false;
  private vortexBaseColorA = new THREE.Color(0x8833ff);
  private vortexBaseColorB = new THREE.Color(0xff3388);
  private rainbowColors = [
    new THREE.Color(0xff3366),
    new THREE.Color(0xff8833),
    new THREE.Color(0xffee33),
    new THREE.Color(0x33ff66),
    new THREE.Color(0x33ccff),
    new THREE.Color(0x6633ff),
    new THREE.Color(0xff33cc),
  ];

  constructor(container: HTMLElement) {
    this.scene = new THREE.Scene();

    this.camera = new THREE.PerspectiveCamera(
      60,
      container.clientWidth / container.clientHeight,
      0.1,
      1000
    );
    this.camera.position.z = 12;

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.setClearColor(0x000000, 0);
    container.appendChild(this.renderer.domElement);

    this.nebulaBackground = this.createNebulaBackground();
    this.scene.add(this.nebulaBackground);

    this.starPoints = this.createStars();
    this.scene.add(this.starPoints);

    this.vortex = this.createVortex();
    this.scene.add(this.vortex);

    this.vortexParticles = this.createVortexParticleSystem();
    this.scene.add(this.vortexParticles);

    window.addEventListener('resize', () => this.onResize(container));
  }

  private createNebulaBackground(): THREE.Mesh {
    const geometry = new THREE.PlaneGeometry(40, 30);
    const material = new THREE.ShaderMaterial({
      uniforms: {
        colorA: { value: new THREE.Color(0x180a2a) },
        colorB: { value: new THREE.Color(0x0a0a0a) },
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 colorA;
        uniform vec3 colorB;
        varying vec2 vUv;
        void main() {
          vec2 center = vUv - 0.5;
          float dist = length(center);
          float gradient = smoothstep(0.0, 0.9, dist);
          vec3 color = mix(colorA, colorB, gradient);
          gl_FragColor = vec4(color, 1.0);
        }
      `,
      depthWrite: false,
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.z = -5;
    return mesh;
  }

  private createStars(): THREE.Points {
    const starCount = 300;
    const positions = new Float32Array(starCount * 3);
    const sizes = new Float32Array(starCount);
    const colors = new Float32Array(starCount * 3);

    for (let i = 0; i < starCount; i++) {
      const i3 = i * 3;
      positions[i3] = (Math.random() - 0.5) * 30;
      positions[i3 + 1] = (Math.random() - 0.5) * 20;
      positions[i3 + 2] = (Math.random() - 0.5) * 10 - 2;

      sizes[i] = Math.random() * 2 + 1;

      const brightness = 0.7 + Math.random() * 0.3;
      colors[i3] = brightness;
      colors[i3 + 1] = brightness;
      colors[i3 + 2] = brightness;

      this.starTwinkleData.push({
        phase: Math.random() * Math.PI * 2,
        speed: (Math.random() * 2 + 1) / (2 * Math.PI),
      });
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
      },
      vertexShader: `
        attribute float size;
        attribute vec3 color;
        varying vec3 vColor;
        varying float vSize;
        void main() {
          vColor = color;
          vSize = size;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = size * (300.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        varying float vSize;
        uniform float time;
        void main() {
          vec2 center = gl_PointCoord - 0.5;
          float dist = length(center);
          if (dist > 0.5) discard;
          float alpha = smoothstep(0.5, 0.0, dist);
          float twinkle = 0.5 + 0.5 * sin(time * 2.0 + vSize * 10.0);
          gl_FragColor = vec4(vColor, alpha * (0.5 + 0.5 * twinkle));
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    return new THREE.Points(geometry, material);
  }

  private createVortex(): THREE.Mesh {
    const geometry = new THREE.SphereGeometry(5, 64, 64);
    const material = new THREE.ShaderMaterial({
      uniforms: {
        colorA: { value: this.vortexBaseColorA.clone() },
        colorB: { value: this.vortexBaseColorB.clone() },
        time: { value: 0 },
      },
      vertexShader: `
        varying vec2 vUv;
        varying vec3 vNormal;
        varying vec3 vPosition;
        void main() {
          vUv = uv;
          vNormal = normal;
          vPosition = position;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 colorA;
        uniform vec3 colorB;
        uniform float time;
        varying vec2 vUv;
        varying vec3 vNormal;
        varying vec3 vPosition;

        float hash(vec3 p) {
          p = fract(p * 0.3183099 + 0.1);
          p *= 17.0;
          return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
        }

        float noise(vec3 p) {
          vec3 i = floor(p);
          vec3 f = fract(p);
          f = f * f * (3.0 - 2.0 * f);
          return mix(mix(mix(hash(i + vec3(0,0,0)), hash(i + vec3(1,0,0)), f.x),
                         mix(hash(i + vec3(0,1,0)), hash(i + vec3(1,1,0)), f.x), f.y),
                     mix(mix(hash(i + vec3(0,0,1)), hash(i + vec3(1,0,1)), f.x),
                         mix(hash(i + vec3(0,1,1)), hash(i + vec3(1,1,1)), f.x), f.y), f.z);
        }

        float fbm(vec3 p) {
          float v = 0.0;
          float a = 0.5;
          for (int i = 0; i < 4; i++) {
            v += a * noise(p);
            p *= 2.0;
            a *= 0.5;
          }
          return v;
        }

        void main() {
          float dist = length(vPosition) / 5.0;
          float alpha = smoothstep(1.0, 0.2, dist) * 0.5;
          vec3 p1 = vPosition * 0.5 + vec3(time * 0.3, time * 0.2, time * 0.1);
          vec3 p2 = vPosition * 1.5 + vec3(-time * 0.2, time * 0.4, -time * 0.15);
          float n = fbm(p1);
          float swirl = fbm(p2);
          float pattern = (n + swirl * 0.5) * 0.5 + 0.2;
          vec3 color = mix(colorA, colorB, clamp(pattern, 0.0, 1.0));
          float intensity = smoothstep(0.0, 0.7, dist);
          color *= intensity;
          gl_FragColor = vec4(color, alpha * clamp(pattern, 0.2, 1.0));
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false,
    });

    return new THREE.Mesh(geometry, material);
  }

  private createVortexParticleSystem(): THREE.Points {
    const maxParticles = 200;
    const positions = new Float32Array(maxParticles * 3);
    const colors = new Float32Array(maxParticles * 3);
    const sizes = new Float32Array(maxParticles);
    const alphas = new Float32Array(maxParticles);

    for (let i = 0; i < maxParticles; i++) {
      const i3 = i * 3;
      positions[i3] = 0;
      positions[i3 + 1] = 0;
      positions[i3 + 2] = 0;

      const color = Math.random() > 0.5 ? this.vortexBaseColorA : this.vortexBaseColorB;
      colors[i3] = color.r;
      colors[i3 + 1] = color.g;
      colors[i3 + 2] = color.b;

      sizes[i] = 0;
      alphas[i] = 0;

      this.vortexParticleData.push({
        velocity: new THREE.Vector3(),
        life: 0,
        maxLife: 0,
      });
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    geometry.setAttribute('alpha', new THREE.BufferAttribute(alphas, 1));

    const material = new THREE.ShaderMaterial({
      uniforms: {},
      vertexShader: `
        attribute float size;
        attribute float alpha;
        attribute vec3 color;
        varying vec3 vColor;
        varying float vAlpha;
        void main() {
          vColor = color;
          vAlpha = alpha;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = size * (300.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        varying float vAlpha;
        void main() {
          vec2 center = gl_PointCoord - 0.5;
          float dist = length(center);
          if (dist > 0.5) discard;
          float alpha = smoothstep(0.5, 0.0, dist) * vAlpha;
          gl_FragColor = vec4(vColor, alpha);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    return new THREE.Points(geometry, material);
  }

  public updateEntanglementState(pairCount: number): void {
    const t = Math.min(pairCount, 10);
    this.vortexRotationSpeed = 0.01 + (t / 10) * 0.02;
    this.vortexColorCycling = pairCount >= 3;
  }

  public reset(): void {
    this.vortexRotationSpeed = 0.01;
    this.vortexColorCycling = false;
    this.vortexColorCycleTime = 0;
    const mat = this.vortex.material as THREE.ShaderMaterial;
    mat.uniforms.colorA.value.copy(this.vortexBaseColorA);
    mat.uniforms.colorB.value.copy(this.vortexBaseColorB);
  }

  private emitVortexParticle(): void {
    const positions = this.vortexParticles.geometry.attributes.position as THREE.BufferAttribute;
    const colors = this.vortexParticles.geometry.attributes.color as THREE.BufferAttribute;
    const sizes = this.vortexParticles.geometry.attributes.size as THREE.BufferAttribute;
    const alphas = this.vortexParticles.geometry.attributes.alpha as THREE.BufferAttribute;

    for (let i = 0; i < this.vortexParticleData.length; i++) {
      if (this.vortexParticleData[i].life <= 0) {
        const angle = Math.random() * Math.PI * 2;
        const radius = Math.random() * 1.5;
        const i3 = i * 3;
        positions.array[i3] = Math.cos(angle) * radius;
        positions.array[i3 + 1] = Math.sin(angle) * radius;
        positions.array[i3 + 2] = (Math.random() - 0.5) * 1;

        const dir = new THREE.Vector3(
          Math.cos(angle) * 0.5 + (Math.random() - 0.5) * 0.2,
          Math.sin(angle) * 0.5 + (Math.random() - 0.5) * 0.2,
          (Math.random() - 0.5) * 0.3
        ).normalize();
        this.vortexParticleData[i].velocity.copy(dir).multiplyScalar(0.01 + Math.random() * 0.01);
        this.vortexParticleData[i].life = 3 + Math.random() * 2;
        this.vortexParticleData[i].maxLife = this.vortexParticleData[i].life;

        const colorMix = Math.random();
        const vortexMat = this.vortex.material as THREE.ShaderMaterial;
        const colA = vortexMat.uniforms.colorA.value;
        const colB = vortexMat.uniforms.colorB.value;
        colors.array[i3] = colA.r * (1 - colorMix) + colB.r * colorMix;
        colors.array[i3 + 1] = colA.g * (1 - colorMix) + colB.g * colorMix;
        colors.array[i3 + 2] = colA.b * (1 - colorMix) + colB.b * colorMix;

        sizes.array[i] = 0.5 + Math.random() * 0.5;
        alphas.array[i] = 1;
        break;
      }
    }
    positions.needsUpdate = true;
    colors.needsUpdate = true;
    sizes.needsUpdate = true;
    alphas.needsUpdate = true;
  }

  public update(delta: number, time: number): void {
    const starMat = this.starPoints.material as THREE.ShaderMaterial;
    starMat.uniforms.time.value = time;

    this.vortex.rotation.y += this.vortexRotationSpeed * delta * 60;
    this.vortex.rotation.z += this.vortexRotationSpeed * 0.3 * delta * 60;

    const vortexMat = this.vortex.material as THREE.ShaderMaterial;
    vortexMat.uniforms.time.value = time;

    if (this.vortexColorCycling) {
      this.vortexColorCycleTime += delta;
      const cyclePos = (this.vortexColorCycleTime % 8) / 8;
      const colorIndexA = Math.floor(cyclePos * this.rainbowColors.length);
      const colorIndexB = (colorIndexA + 1) % this.rainbowColors.length;
      const t = (cyclePos * this.rainbowColors.length) % 1;
      const colorA = this.rainbowColors[colorIndexA];
      const colorB = this.rainbowColors[colorIndexB];
      vortexMat.uniforms.colorA.value.lerpColors(colorA, colorB, t);
      const colorA2 = this.rainbowColors[(colorIndexA + 3) % this.rainbowColors.length];
      const colorB2 = this.rainbowColors[(colorIndexB + 3) % this.rainbowColors.length];
      vortexMat.uniforms.colorB.value.lerpColors(colorA2, colorB2, t);
    }

    if (Math.random() < 0.3) {
      this.emitVortexParticle();
    }

    const positions = this.vortexParticles.geometry.attributes.position as THREE.BufferAttribute;
    const alphas = this.vortexParticles.geometry.attributes.alpha as THREE.BufferAttribute;
    const sizes = this.vortexParticles.geometry.attributes.size as THREE.BufferAttribute;

    for (let i = 0; i < this.vortexParticleData.length; i++) {
      const data = this.vortexParticleData[i];
      if (data.life > 0) {
        data.life -= delta;
        const i3 = i * 3;
        positions.array[i3] += data.velocity.x * delta * 60;
        positions.array[i3 + 1] += data.velocity.y * delta * 60;
        positions.array[i3 + 2] += data.velocity.z * delta * 60;
        const lifeRatio = data.life / data.maxLife;
        alphas.array[i] = lifeRatio;
        sizes.array[i] *= 0.995;
        if (data.life <= 0) {
          alphas.array[i] = 0;
          sizes.array[i] = 0;
        }
      }
    }
    positions.needsUpdate = true;
    alphas.needsUpdate = true;
    sizes.needsUpdate = true;
  }

  private onResize(container: HTMLElement): void {
    this.camera.aspect = container.clientWidth / container.clientHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(container.clientWidth, container.clientHeight);
  }

  public render(): void {
    this.renderer.render(this.scene, this.camera);
  }

  public dispose(): void {
    this.renderer.dispose();
  }
}
