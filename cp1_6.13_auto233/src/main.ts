import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { Rosette } from './Rosette';

class App {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;
  private rosette: Rosette;
  private clock: THREE.Clock;
  private container: HTMLElement;
  private fpsCounter: HTMLElement;
  private frameCount: number = 0;
  private lastFpsUpdate: number = 0;
  private elapsedTime: number = 0;

  constructor() {
    this.container = document.getElementById('app')!;
    this.fpsCounter = document.getElementById('fps-counter')!;
    this.clock = new THREE.Clock();

    this.scene = this.createScene();
    this.camera = this.createCamera();
    this.renderer = this.createRenderer();
    this.controls = this.createControls();
    this.createLights();
    this.createBackgroundParticles();

    this.rosette = new Rosette(this.camera);
    this.scene.add(this.rosette.group);

    this.setupEventListeners();
    this.animate = this.animate.bind(this);
    this.onResize = this.onResize.bind(this);

    window.addEventListener('resize', this.onResize);
    this.animate();
  }

  private createScene(): THREE.Scene {
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x0a0b16, 0.03);
    return scene;
  }

  private createCamera(): THREE.PerspectiveCamera {
    const camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    camera.position.set(0, 2, 6);
    camera.lookAt(0, 0, 0);
    return camera;
  }

  private createRenderer(): THREE.WebGLRenderer {
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0x000000, 0);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    this.container.appendChild(renderer.domElement);
    return renderer;
  }

  private createControls(): OrbitControls {
    const controls = new OrbitControls(this.camera, this.renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.enablePan = false;
    controls.minDistance = 3;
    controls.maxDistance = 15;
    controls.rotateSpeed = 0.6;
    controls.zoomSpeed = 0.8;
    return controls;
  }

  private createLights(): void {
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.3);
    this.scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xffffff, 0.8);
    keyLight.position.set(5, 10, 7);
    this.scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x48dbfb, 0.5);
    rimLight.position.set(-8, 3, -5);
    this.scene.add(rimLight);

    const fillLight = new THREE.PointLight(0xff9ff3, 0.6, 30);
    fillLight.position.set(-4, -2, 6);
    this.scene.add(fillLight);

    const topLight = new THREE.PointLight(0x54a0ff, 0.8, 25);
    topLight.position.set(0, 10, 0);
    this.scene.add(topLight);
  }

  private createBackgroundParticles(): void {
    const particleCount = 800;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    const sizes = new Float32Array(particleCount);

    const palette = [
      new THREE.Color(0xff6b6b),
      new THREE.Color(0x48dbfb),
      new THREE.Color(0xfeca57),
      new THREE.Color(0xff9ff3),
      new THREE.Color(0x54a0ff),
      new THREE.Color(0xffffff),
    ];

    for (let i = 0; i < particleCount; i++) {
      const i3 = i * 3;
      const radius = 10 + Math.random() * 30;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);

      positions[i3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      positions[i3 + 2] = radius * Math.cos(phi);

      const color = palette[Math.floor(Math.random() * palette.length)];
      colors[i3] = color.r;
      colors[i3 + 1] = color.g;
      colors[i3 + 2] = color.b;

      sizes[i] = 0.03 + Math.random() * 0.08;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    const material = new THREE.PointsMaterial({
      size: 0.06,
      vertexColors: true,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true,
    });

    const particles = new THREE.Points(geometry, material);
    particles.userData.rotationSpeed = 0.003;
    this.scene.add(particles);
  }

  private setupEventListeners(): void {
    this.renderer.domElement.addEventListener('mousemove', (e) => {
      this.rosette.handleMouseMove(e, window.innerWidth, window.innerHeight);
    });

    document.addEventListener('keydown', (e) => {
      if (e.code === 'Space') {
        e.preventDefault();
        this.rosette.triggerLightPulse();
      }
    });
  }

  private onResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  }

  private updateFPS(timestamp: number): void {
    this.frameCount++;
    if (timestamp - this.lastFpsUpdate >= 1000) {
      const fps = Math.round(
        (this.frameCount * 1000) / (timestamp - this.lastFpsUpdate)
      );
      this.fpsCounter.textContent = `FPS: ${fps}`;
      this.frameCount = 0;
      this.lastFpsUpdate = timestamp;
    }
  }

  private animate(): void {
    requestAnimationFrame(this.animate);

    const deltaTime = Math.min(this.clock.getDelta(), 0.1);
    this.elapsedTime += deltaTime;

    this.controls.update();
    this.rosette.update(deltaTime, this.elapsedTime);

    this.scene.children.forEach((child) => {
      if (child instanceof THREE.Points && child.userData.rotationSpeed) {
        child.rotation.y += child.userData.rotationSpeed;
      }
    });

    this.renderer.render(this.scene, this.camera);
    this.updateFPS(performance.now());
  }

  public dispose(): void {
    window.removeEventListener('resize', this.onResize);
    this.rosette.dispose();
    this.renderer.dispose();
    this.controls.dispose();
  }
}

const app = new App();
(window as any).__app = app;
