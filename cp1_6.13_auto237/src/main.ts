import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { Maze } from './maze';
import { CoreSystem, Core } from './core';
import { ParticleSystem } from './particle';

const STAR_COUNT = 150;
const MIN_ZOOM = 1;
const MAX_ZOOM = 15;
const INITIAL_CAMERA_DISTANCE = 10;

interface Star {
  mesh: THREE.Mesh;
  baseOpacity: number;
  pulsePhase: number;
  pulseSpeed: number;
}

class Game {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;
  private composer: EffectComposer;
  private maze: Maze;
  private coreSystem: CoreSystem;
  private particleSystem: ParticleSystem;
  private stars: Star[] = [];
  private container: HTMLElement;
  private clock: THREE.Clock;
  private frameCount = 0;
  private lastFpsUpdate = 0;
  private fps = 0;
  private fpsElement: HTMLElement;
  private hitCountElement: HTMLElement;
  private hoveredCore: Core | null = null;
  private animationId: number | null = null;

  constructor() {
    this.container = document.getElementById('canvas-container')!;
    this.fpsElement = document.getElementById('fps')!;
    this.hitCountElement = document.getElementById('hit-count')!;
    this.clock = new THREE.Clock();

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true
    });
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.composer = new EffectComposer(this.renderer);

    this.particleSystem = new ParticleSystem(this.scene);
    this.coreSystem = new CoreSystem(this.scene, this.particleSystem);
    this.maze = new Maze(this.scene);
  }

  public async init(): Promise<void> {
    this.setupRenderer();
    this.setupCamera();
    this.setupControls();
    this.setupLighting();
    this.setupPostProcessing();
    this.createStars();

    this.maze.generateGrid();
    this.coreSystem.setMaze(this.maze);
    this.coreSystem.init();

    this.bindEvents();
    this.hideLoading();

    this.animate();
  }

  private setupRenderer(): void {
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setClearColor(0x0f0c29, 1);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;
    this.container.appendChild(this.renderer.domElement);
  }

  private setupCamera(): void {
    this.camera.position.set(
      INITIAL_CAMERA_DISTANCE,
      INITIAL_CAMERA_DISTANCE * 0.5,
      INITIAL_CAMERA_DISTANCE
    );
    this.camera.lookAt(0, 0, 0);
  }

  private setupControls(): void {
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.enablePan = false;
    this.controls.minDistance = MIN_ZOOM;
    this.controls.maxDistance = MAX_ZOOM;
    this.controls.zoomSpeed = 0.8;
    this.controls.rotateSpeed = 0.6;
    this.controls.autoRotate = false;
  }

  private setupLighting(): void {
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.3);
    this.scene.add(ambientLight);

    const fillLight = new THREE.DirectionalLight(0x48dbfb, 0.3);
    fillLight.position.set(5, 10, 5);
    this.scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0xff6b6b, 0.2);
    rimLight.position.set(-5, -5, -5);
    this.scene.add(rimLight);
  }

  private setupPostProcessing(): void {
    const renderPass = new RenderPass(this.scene, this.camera);
    this.composer.addPass(renderPass);

    const bloomPass = new UnrealBloomPass(
      new THREE.Vector2(window.innerWidth, window.innerHeight),
      1.5,
      0.5,
      0.1
    );
    this.composer.addPass(bloomPass);
  }

  private createStars(): void {
    for (let i = 0; i < STAR_COUNT; i++) {
      const size = 0.01 + Math.random() * 0.03;
      const geometry = new THREE.SphereGeometry(size, 8, 8);
      const opacity = 0.2 + Math.random() * 0.4;

      const material = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity
      });

      const mesh = new THREE.Mesh(geometry, material);
      
      const radius = 30 + Math.random() * 20;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI;
      
      mesh.position.set(
        radius * Math.sin(phi) * Math.cos(theta),
        radius * Math.sin(phi) * Math.sin(theta),
        radius * Math.cos(phi)
      );

      const star: Star = {
        mesh,
        baseOpacity: opacity,
        pulsePhase: Math.random() * Math.PI * 2,
        pulseSpeed: (3 + Math.random() * 2) / 1000
      };

      this.stars.push(star);
      this.scene.add(mesh);
    }
  }

  private updateStars(delta: number): void {
    const now = performance.now();
    for (const star of this.stars) {
      const pulse = Math.sin(now * star.pulseSpeed + star.pulsePhase);
      const opacity = star.baseOpacity * (0.7 + pulse * 0.3);
      (star.mesh.material as THREE.MeshBasicMaterial).opacity = opacity;
    }
  }

  private bindEvents(): void {
    window.addEventListener('resize', this.onResize.bind(this));
    this.renderer.domElement.addEventListener('mousemove', this.onMouseMove.bind(this));
    this.renderer.domElement.addEventListener('click', this.onClick.bind(this));
  }

  private onMouseMove(event: MouseEvent): void {
    const hoveredCore = this.coreSystem.isHoveringCore(event, this.camera);
    if (hoveredCore !== this.hoveredCore) {
      this.hoveredCore = hoveredCore;
      this.coreSystem.setCoreHover(hoveredCore);
      this.renderer.domElement.style.cursor = hoveredCore ? 'pointer' : 'default';
    }
  }

  private onClick(event: MouseEvent): void {
    const clickedCore = this.coreSystem.isHoveringCore(event, this.camera);
    if (clickedCore) {
      this.coreSystem.onClickCore(clickedCore);
    }
  }

  private onResize(): void {
    const width = window.innerWidth;
    const height = window.innerHeight;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();

    this.renderer.setSize(width, height);
    this.composer.setSize(width, height);

    const aspectRatio = width / height;
    const scale = Math.min(1, aspectRatio / 1.77);
    this.maze.recalculatePositions(scale);
    this.coreSystem.recalculatePositions(scale);
  }

  private hideLoading(): void {
    const loadingElement = document.querySelector('.loading');
    if (loadingElement) {
      loadingElement.remove();
    }
  }

  private calculateFPS(delta: number): void {
    this.frameCount++;
    const now = performance.now();

    if (now - this.lastFpsUpdate >= 1000) {
      this.fps = Math.round(this.frameCount * 1000 / (now - this.lastFpsUpdate));
      this.fpsElement.textContent = this.fps.toString();
      this.frameCount = 0;
      this.lastFpsUpdate = now;
    }
  }

  private updateHUD(): void {
    this.hitCountElement.textContent = this.coreSystem.hitCount.toString();
  }

  private animate(): void {
    this.animationId = requestAnimationFrame(this.animate.bind(this));

    const delta = this.clock.getDelta();

    this.controls.update();
    this.maze.updateRotation(delta);
    this.coreSystem.update(this.camera, delta);
    this.particleSystem.update(delta);
    this.updateStars(delta);

    this.calculateFPS(delta);
    this.updateHUD();

    this.composer.render();
  }

  public dispose(): void {
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
    }

    window.removeEventListener('resize', this.onResize.bind(this));
    this.renderer.domElement.removeEventListener('mousemove', this.onMouseMove.bind(this));
    this.renderer.domElement.removeEventListener('click', this.onClick.bind(this));

    this.maze.dispose();
    this.coreSystem.dispose();
    this.particleSystem.dispose();

    for (const star of this.stars) {
      this.scene.remove(star.mesh);
      star.mesh.geometry.dispose();
      (star.mesh.material as THREE.Material).dispose();
    }
    this.stars = [];

    this.renderer.dispose();
    this.controls.dispose();
  }
}

const game = new Game();
game.init().catch((error) => {
  console.error('Failed to initialize game:', error);
});

declare global {
  interface ImportMeta {
    hot?: {
      dispose(callback: () => void): void;
    };
  }
}

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    game.dispose();
  });
}
