import * as THREE from 'three';
import { ParticleData, SceneConfig, DEFAULT_CONFIG } from './types';
import { InteractionManager } from './interaction';
import { PostProcessingManager } from './postprocessing';

class NebulaApp {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private config: SceneConfig;

  private particlesData: ParticleData[] = [];
  private particlePositions: Float32Array;
  private particleColors: Float32Array;
  private particleSizes: Float32Array;
  private particleGeometry: THREE.BufferGeometry;
  private particleMaterial: THREE.ShaderMaterial;
  private particleSystem: THREE.Points;

  private bgStarsGeometry: THREE.BufferGeometry;
  private bgStarsMaterial: THREE.PointsMaterial;
  private bgStars: THREE.Points;

  private interactionManager: InteractionManager;
  private postProcessingManager: PostProcessingManager;

  private clock: THREE.Clock = new THREE.Clock();
  private nebulaGroup: THREE.Group = new THREE.Group();

  private frameCount: number = 0;
  private lastFpsUpdate: number = performance.now();
  private fpsCounter: HTMLElement | null = null;

  constructor() {
    this.config = DEFAULT_CONFIG;

    this.scene = this.createScene();
    this.camera = this.createCamera();
    this.renderer = this.createRenderer();

    this.createBackground();
    this.createParticleSystem();

    this.interactionManager = new InteractionManager(this.camera, this.renderer, this.config);
    this.scene.add(this.interactionManager.getCameraPivot());

    this.postProcessingManager = new PostProcessingManager(this.renderer, this.scene, this.camera);

    this.fpsCounter = document.getElementById('fps-counter');

    window.addEventListener('resize', this.onResize.bind(this));
    this.animate();
  }

  private createScene(): THREE.Scene {
    const scene = new THREE.Scene();

    const canvas = document.createElement('canvas');
    canvas.width = 2;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;
    const gradient = ctx.createLinearGradient(0, 0, 0, 512);
    gradient.addColorStop(0, '#000022');
    gradient.addColorStop(0.5, '#000533');
    gradient.addColorStop(1, '#000011');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 2, 512);
    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;

    scene.background = texture;
    scene.fog = new THREE.FogExp2(0x000022, 0.0015);

    return scene;
  }

  private createCamera(): THREE.PerspectiveCamera {
    const camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      2000
    );
    return camera;
  }

  private createRenderer(): THREE.WebGLRenderer {
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance',
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.toneMapping = THREE.NoToneMapping;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    document.getElementById('app')!.appendChild(renderer.domElement);
    return renderer;
  }

  private createBackground(): void {
    const starCount = 2000;
    const positions = new Float32Array(starCount * 3);
    const colors = new Float32Array(starCount * 3);
    const sizes = new Float32Array(starCount);

    const palette = [
      new THREE.Color(0xffffff),
      new THREE.Color(0xaaccff),
      new THREE.Color(0xffddaa),
      new THREE.Color(0xccddff),
    ];

    for (let i = 0; i < starCount; i++) {
      const i3 = i * 3;
      const radius = 800 + Math.random() * 400;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);

      positions[i3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      positions[i3 + 2] = radius * Math.cos(phi);

      const color = palette[Math.floor(Math.random() * palette.length)];
      const brightness = 0.5 + Math.random() * 0.5;
      colors[i3] = color.r * brightness;
      colors[i3 + 1] = color.g * brightness;
      colors[i3 + 2] = color.b * brightness;

      sizes[i] = 0.5 + Math.random() * 1.5;
    }

    this.bgStarsGeometry = new THREE.BufferGeometry();
    this.bgStarsGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.bgStarsGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    this.bgStarsGeometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    this.bgStarsMaterial = new THREE.PointsMaterial({
      size: 1.5,
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
      sizeAttenuation: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    this.bgStars = new THREE.Points(this.bgStarsGeometry, this.bgStarsMaterial);
    this.scene.add(this.bgStars);
  }

  private createParticleSystem(): void {
    const count = this.config.particleCount;
    this.particlePositions = new Float32Array(count * 3);
    this.particleColors = new Float32Array(count * 3);
    this.particleSizes = new Float32Array(count);
    this.particlesData = new Array(count);

    const corePalette = [
      new THREE.Color(0xffffff),
      new THREE.Color(0xffeecc),
      new THREE.Color(0xffcc99),
      new THREE.Color(0xffaacc),
    ];

    const midPalette = [
      new THREE.Color(0x88aaff),
      new THREE.Color(0x6688dd),
      new THREE.Color(0xaa88ff),
      new THREE.Color(0x99aaff),
    ];

    const outerPalette = [
      new THREE.Color(0x4455aa),
      new THREE.Color(0x334488),
      new THREE.Color(0x554499),
      new THREE.Color(0x335599),
    ];

    const arms = 4;
    const armOffset = (Math.PI * 2) / arms;

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;

      const t = Math.random();
      const biasedT = Math.pow(t, 1.5);
      const radius = biasedT * this.config.galaxyRadius;
      const armAngle = Math.floor(Math.random() * arms) * armOffset;
      const spiralTightness = 2.5;
      const angle = armAngle + radius * 0.015 * spiralTightness + (Math.random() - 0.5) * 0.6;

      const thicknessFactor = 1 - biasedT * 0.8;
      const verticalSpread = this.config.galaxyThickness * thicknessFactor;

      const x = Math.cos(angle) * radius + (Math.random() - 0.5) * (radius * 0.08 + 5);
      const y = (Math.random() - 0.5) * verticalSpread;
      const z = Math.sin(angle) * radius + (Math.random() - 0.5) * (radius * 0.08 + 5);

      this.particlePositions[i3] = x;
      this.particlePositions[i3 + 1] = y;
      this.particlePositions[i3 + 2] = z;

      let palette: THREE.Color[];
      let brightness: number;
      let baseSize: number;

      if (biasedT < 0.25) {
        palette = corePalette;
        brightness = 0.9 + Math.random() * 0.3;
        baseSize = 2.0 + Math.random() * 2.5;
      } else if (biasedT < 0.6) {
        palette = midPalette;
        brightness = 0.6 + Math.random() * 0.4;
        baseSize = 1.2 + Math.random() * 2.0;
      } else {
        palette = outerPalette;
        brightness = 0.35 + Math.random() * 0.35;
        baseSize = 0.8 + Math.random() * 1.5;
      }

      const color = palette[Math.floor(Math.random() * palette.length)].clone();
      color.multiplyScalar(brightness);
      this.particleColors[i3] = color.r;
      this.particleColors[i3 + 1] = color.g;
      this.particleColors[i3 + 2] = color.b;

      this.particleSizes[i] = baseSize;

      this.particlesData[i] = {
        originalPosition: new THREE.Vector3(x, y, z),
        velocity: new THREE.Vector3(0, 0, 0),
        baseSize: baseSize,
        baseColor: color.clone(),
        warmColorMix: 0,
        phaseOffset: Math.random() * Math.PI * 2,
        floatAmplitude: 0.3 + Math.random() * 1.2,
        floatSpeed: 0.5 + Math.random() * 1.5,
      };
    }

    this.particleGeometry = new THREE.BufferGeometry();
    this.particleGeometry.setAttribute('position', new THREE.BufferAttribute(this.particlePositions, 3));
    this.particleGeometry.setAttribute('color', new THREE.BufferAttribute(this.particleColors, 3));
    this.particleGeometry.setAttribute('size', new THREE.BufferAttribute(this.particleSizes, 1));

    this.particleMaterial = this.createParticleShaderMaterial();

    this.particleSystem = new THREE.Points(this.particleGeometry, this.particleMaterial);
    this.nebulaGroup.add(this.particleSystem);
    this.scene.add(this.nebulaGroup);
  }

  private createParticleShaderMaterial(): THREE.ShaderMaterial {
    return new THREE.ShaderMaterial({
      uniforms: {
        pointTexture: { value: this.createParticleTexture() },
        uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) },
      },
      vertexShader: `
        attribute float size;
        varying vec3 vColor;
        varying float vSize;
        uniform float uPixelRatio;
        void main() {
          vColor = color;
          vSize = size;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = size * uPixelRatio * (300.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        uniform sampler2D pointTexture;
        varying vec3 vColor;
        varying float vSize;
        void main() {
          vec4 texColor = texture2D(pointTexture, gl_PointCoord);
          if (texColor.a < 0.05) discard;
          float alpha = texColor.a;
          vec3 finalColor = vColor * texColor.rgb;
          gl_FragColor = vec4(finalColor, alpha);
        }
      `,
      transparent: true,
      vertexColors: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
  }

  private createParticleTexture(): THREE.Texture {
    const size = 128;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;

    const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    gradient.addColorStop(0, 'rgba(255, 255, 255, 1.0)');
    gradient.addColorStop(0.2, 'rgba(255, 255, 255, 0.9)');
    gradient.addColorStop(0.4, 'rgba(200, 220, 255, 0.5)');
    gradient.addColorStop(0.6, 'rgba(150, 180, 255, 0.2)');
    gradient.addColorStop(0.8, 'rgba(100, 140, 220, 0.05)');
    gradient.addColorStop(1, 'rgba(50, 80, 150, 0.0)');

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
  }

  private onResize(): void {
    const width = window.innerWidth;
    const height = window.innerHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
    this.particleMaterial.uniforms.uPixelRatio.value = Math.min(window.devicePixelRatio, 2);
  }

  private updateFPS(): void {
    this.frameCount++;
    const now = performance.now();
    if (now - this.lastFpsUpdate >= 500) {
      const fps = Math.round((this.frameCount * 1000) / (now - this.lastFpsUpdate));
      if (this.fpsCounter) {
        this.fpsCounter.textContent = `FPS: ${fps}`;
      }
      this.frameCount = 0;
      this.lastFpsUpdate = now;
    }
  }

  private animate(): void {
    requestAnimationFrame(this.animate.bind(this));

    const deltaTime = Math.min(this.clock.getDelta(), 0.05);
    const elapsedTime = this.clock.getElapsedTime();

    this.nebulaGroup.rotation.y += this.config.rotationSpeed;

    this.interactionManager.updateCamera(deltaTime);
    this.interactionManager.updateParticles(
      this.particlesData,
      this.particlePositions,
      this.particleColors,
      this.particleSizes,
      elapsedTime,
      deltaTime
    );

    (this.particleGeometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
    (this.particleGeometry.attributes.color as THREE.BufferAttribute).needsUpdate = true;
    (this.particleGeometry.attributes.size as THREE.BufferAttribute).needsUpdate = true;

    const camDist = this.camera.position.length();
    const rotationSpeed = Math.abs(this.nebulaGroup.rotation.y) * 100;
    const bloomBoost = Math.min(0.6, rotationSpeed * 0.1 + (1 - camDist / 500) * 0.3);
    this.postProcessingManager.setBloomStrength(0.6 + bloomBoost);

    this.postProcessingManager.render();
    this.updateFPS();
  }
}

new NebulaApp();
