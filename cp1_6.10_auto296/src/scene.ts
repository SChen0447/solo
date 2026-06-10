import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { ParticleSystem } from './particles';
import type { EmotionType } from './interaction';

const STAR_COUNT = 200;
const CAMERA_NEAR = 0.1;
const CAMERA_FAR = 100;
const MIN_DISTANCE = 3;
const MAX_DISTANCE = 20;

export class SceneManager {
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private renderer!: THREE.WebGLRenderer;
  private controls!: OrbitControls;
  private particleSystem!: ParticleSystem;
  private container: HTMLElement;
  private clock: THREE.Clock;
  private animationId: number | null = null;
  private starField!: THREE.Points;
  private starStartTime: number;

  constructor(containerId: string, initialEmotion: EmotionType = 'calm') {
    this.container = document.getElementById(containerId) as HTMLElement;
    if (!this.container) {
      throw new Error(`Container with id "${containerId}" not found`);
    }

    this.clock = new THREE.Clock();
    this.starStartTime = performance.now();

    this.scene = new THREE.Scene();
    this.setupCamera();
    this.setupRenderer();
    this.setupLights();
    this.setupControls();
    this.setupStarField();

    this.particleSystem = new ParticleSystem(initialEmotion);
    this.scene.add(this.particleSystem.points);

    this.handleResize();
    window.addEventListener('resize', () => this.handleResize());
  }

  private setupCamera(): void {
    const aspect = this.container.clientWidth / this.container.clientHeight;
    this.camera = new THREE.PerspectiveCamera(60, aspect, CAMERA_NEAR, CAMERA_FAR);
    this.camera.position.set(0, 0, 8);
    this.camera.lookAt(0, 0, 0);
  }

  private setupRenderer(): void {
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    this.renderer.setClearColor(0x000000, 0);
    this.container.appendChild(this.renderer.domElement);
  }

  private setupLights(): void {
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    this.scene.add(ambientLight);

    const pointLight1 = new THREE.PointLight(0xffffff, 0.8, 100);
    pointLight1.position.set(10, 10, 10);
    this.scene.add(pointLight1);

    const pointLight2 = new THREE.PointLight(0x4a90d9, 0.3, 100);
    pointLight2.position.set(-10, -5, -10);
    this.scene.add(pointLight2);
  }

  private setupControls(): void {
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.minDistance = MIN_DISTANCE;
    this.controls.maxDistance = MAX_DISTANCE;
    this.controls.enablePan = false;
    this.controls.rotateSpeed = 0.5;
    this.controls.zoomSpeed = 0.8;
  }

  private setupStarField(): void {
    const starGeometry = new THREE.BufferGeometry();
    const starPositions = new Float32Array(STAR_COUNT * 3);
    const starColors = new Float32Array(STAR_COUNT * 3);
    const starSizes = new Float32Array(STAR_COUNT);

    for (let i = 0; i < STAR_COUNT; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = 30 + Math.random() * 20;

      starPositions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      starPositions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      starPositions[i * 3 + 2] = r * Math.cos(phi);

      const brightness = 0.6 + Math.random() * 0.4;
      starColors[i * 3] = brightness;
      starColors[i * 3 + 1] = brightness;
      starColors[i * 3 + 2] = brightness;

      starSizes[i] = 0.5 + Math.random() * 1;
    }

    starGeometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    starGeometry.setAttribute('color', new THREE.BufferAttribute(starColors, 3));

    const starCanvas = document.createElement('canvas');
    starCanvas.width = 32;
    starCanvas.height = 32;
    const starCtx = starCanvas.getContext('2d')!;
    const starGradient = starCtx.createRadialGradient(16, 16, 0, 16, 16, 16);
    starGradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
    starGradient.addColorStop(0.4, 'rgba(255, 255, 255, 0.6)');
    starGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
    starCtx.fillStyle = starGradient;
    starCtx.fillRect(0, 0, 32, 32);

    const starTexture = new THREE.CanvasTexture(starCanvas);

    const starMaterial = new THREE.PointsMaterial({
      size: 0.3,
      map: starTexture,
      vertexColors: true,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true
    });

    this.starField = new THREE.Points(starGeometry, starMaterial);
    this.starField.frustumCulled = false;
    this.scene.add(this.starField);
  }

  private handleResize(): void {
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();

    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  }

  public setEmotion(emotion: EmotionType): void {
    this.particleSystem.setEmotion(emotion);
  }

  public start(): void {
    if (this.animationId !== null) return;
    this.clock.start();
    this.animate();
  }

  public stop(): void {
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  private animate(): void {
    this.animationId = requestAnimationFrame(() => this.animate());

    const deltaTime = this.clock.getDelta();
    const elapsed = (performance.now() - this.starStartTime) / 1000;

    this.particleSystem.update(deltaTime);

    this.starField.rotation.y = elapsed * 0.01;
    this.starField.rotation.x = Math.sin(elapsed * 0.005) * 0.1;

    this.controls.update();

    this.renderer.render(this.scene, this.camera);
  }

  public dispose(): void {
    this.stop();
    window.removeEventListener('resize', () => this.handleResize());
    this.particleSystem.dispose();
    this.controls.dispose();
    this.renderer.dispose();

    if (this.starField.geometry) {
      this.starField.geometry.dispose();
    }
    if (this.starField.material instanceof THREE.Material) {
      this.starField.material.dispose();
      if ((this.starField.material as THREE.PointsMaterial).map) {
        (this.starField.material as THREE.PointsMaterial).map!.dispose();
      }
    }

    if (this.renderer.domElement.parentNode) {
      this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
    }
  }
}
