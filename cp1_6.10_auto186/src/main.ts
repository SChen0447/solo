import * as THREE from 'three';
import { AuroraManager } from './aurora';
import { OrbitControls } from './orbitControls';

class App {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private container: HTMLElement;
  private clock: THREE.Clock;
  private auroraManager: AuroraManager;
  private controls: OrbitControls;
  private stars: THREE.Points | null = null;
  private starTime: number = 0;

  private solarWindIntensity: number = 50;

  constructor() {
    this.container = document.getElementById('canvas-container')!;
    this.clock = new THREE.Clock();

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true
    });

    this.setupRenderer();
    this.setupBackground();
    this.createStars();
    this.createGround();

    this.auroraManager = new AuroraManager(this.scene);
    this.auroraManager.init();

    this.controls = new OrbitControls(this.camera, this.container);

    this.setupUI();
    this.setupResizeHandler();

    this.animate = this.animate.bind(this);
    this.animate();
  }

  private setupRenderer(): void {
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setClearColor(0x000011, 1);
    this.container.appendChild(this.renderer.domElement);
  }

  private setupBackground(): void {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;

    const gradient = ctx.createRadialGradient(
      256, 256, 0,
      256, 256, 350
    );
    gradient.addColorStop(0, '#0a0a2e');
    gradient.addColorStop(1, '#000011');

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 512, 512);

    const texture = new THREE.CanvasTexture(canvas);
    this.scene.background = texture;
  }

  private createStars(): void {
    const starCount = 300;
    const positions = new Float32Array(starCount * 3);
    const colors = new Float32Array(starCount * 3);
    const sizes = new Float32Array(starCount);
    const phases = new Float32Array(starCount);

    for (let i = 0; i < starCount; i++) {
      const i3 = i * 3;
      const radius = 80 + Math.random() * 40;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);

      positions[i3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i3 + 1] = radius * Math.cos(phi) * 0.5 + 20;
      positions[i3 + 2] = radius * Math.sin(phi) * Math.sin(theta);

      const brightness = 0.7 + Math.random() * 0.3;
      colors[i3] = brightness;
      colors[i3 + 1] = brightness;
      colors[i3 + 2] = brightness;

      sizes[i] = 2 + Math.random() * 3;
      phases[i] = Math.random() * Math.PI * 2;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
    geometry.setAttribute('aPhase', new THREE.BufferAttribute(phases, 1));

    const material = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 }
      },
      vertexShader: `
        attribute float aSize;
        attribute float aPhase;
        uniform float uTime;
        varying vec3 vColor;
        varying float vAlpha;
        void main() {
          vColor = color;
          float twinkle = 0.5 + 0.5 * sin(uTime * 4.0 + aPhase);
          vAlpha = 0.7 + 0.3 * twinkle;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = aSize * (300.0 / -mvPosition.z) * (0.8 + 0.2 * twinkle);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        varying float vAlpha;
        void main() {
          float dist = length(gl_PointCoord - vec2(0.5));
          if (dist > 0.5) discard;
          float alpha = (1.0 - smoothstep(0.0, 0.5, dist)) * vAlpha;
          gl_FragColor = vec4(vColor, alpha);
        }
      `,
      transparent: true,
      vertexColors: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    this.stars = new THREE.Points(geometry, material);
    this.scene.add(this.stars);
  }

  private createGround(): void {
    const geometry = new THREE.PlaneGeometry(60, 30);
    const material = new THREE.MeshBasicMaterial({
      color: 0x001a33,
      transparent: true,
      opacity: 0.3,
      side: THREE.DoubleSide,
      depthWrite: false
    });

    const ground = new THREE.Mesh(geometry, material);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -12;
    this.scene.add(ground);
  }

  private setupUI(): void {
    const speedSlider = document.getElementById('speed-slider') as HTMLInputElement;
    const speedValue = document.getElementById('speed-value')!;
    const opacitySlider = document.getElementById('opacity-slider') as HTMLInputElement;
    const opacityValue = document.getElementById('opacity-value')!;
    const solarSlider = document.getElementById('solar-slider') as HTMLInputElement;
    const solarValue = document.getElementById('solar-value')!;
    const resetBtn = document.getElementById('reset-btn')!;

    speedSlider.addEventListener('input', (e) => {
      const value = parseFloat((e.target as HTMLInputElement).value);
      this.auroraManager.setSpeedMultiplier(value);
      speedValue.textContent = value.toFixed(2) + 'x';
    });

    opacitySlider.addEventListener('input', (e) => {
      const value = parseFloat((e.target as HTMLInputElement).value);
      this.auroraManager.setGlobalOpacity(value);
      opacityValue.textContent = value.toFixed(2);
    });

    solarSlider.addEventListener('input', (e) => {
      const value = parseInt((e.target as HTMLInputElement).value);
      this.solarWindIntensity = value;
      solarValue.textContent = value.toString();
    });

    resetBtn.addEventListener('click', () => {
      this.controls.reset();
    });
  }

  private setupResizeHandler(): void {
    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    });
  }

  private animate(): void {
    requestAnimationFrame(this.animate);

    const delta = this.clock.getDelta();
    this.starTime += delta;

    if (this.stars) {
      const material = this.stars.material as THREE.ShaderMaterial;
      material.uniforms.uTime.value = this.starTime;
      this.stars.rotation.y += delta * 0.01;
    }

    this.auroraManager.update(delta, this.solarWindIntensity);
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }

  dispose(): void {
    this.auroraManager.dispose();
    this.controls.dispose();
    if (this.stars) {
      this.stars.geometry.dispose();
      (this.stars.material as THREE.Material).dispose();
    }
    this.renderer.dispose();
  }
}

const app = new App();
