import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { Cell } from './Cell';
import { UI } from './UI';

class App {
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private renderer!: THREE.WebGLRenderer;
  private controls!: OrbitControls;
  private composer!: EffectComposer;
  private bloomPass!: UnrealBloomPass;

  private cell!: Cell;
  private ui!: UI;

  private clock!: THREE.Clock;
  private animationId: number | null = null;
  private isPlaying: boolean = false;
  private speed: number = 1;
  private progress: number = 0;
  private transitionDuration: number = 2;

  private container!: HTMLElement;

  constructor() {
    this.container = document.getElementById('canvas-container')!;
    this.clock = new THREE.Clock();

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0a1628);

    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.camera.position.set(0, 1, 4);

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    this.container.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.enablePan = false;
    this.controls.minDistance = 2;
    this.controls.maxDistance = 10;
    this.controls.autoRotate = false;

    this.setupLights();
    this.setupPostProcessing();

    this.cell = new Cell();
    this.scene.add(this.cell.group);

    this.ui = new UI({
      onProgressChange: (progress: number) => {
        this.progress = progress;
        this.cell.setProgress(progress);
        this.ui.setStageLabel(this.cell.getPhaseName());
      },
      onPlayPause: () => {
        this.togglePlay();
      },
      onSpeedChange: (speed: number) => {
        this.speed = speed;
      },
      onReset: () => {
        this.reset();
      }
    });

    window.addEventListener('resize', this.onResize.bind(this));

    this.hideLoadingScreen();
    this.start();
  }

  private setupLights(): void {
    const ambientLight = new THREE.AmbientLight(0x4fc3f7, 0.4);
    this.scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 5, 5);
    this.scene.add(directionalLight);

    const pointLight1 = new THREE.PointLight(0x4fc3f7, 0.5, 10);
    pointLight1.position.set(-2, 2, 2);
    this.scene.add(pointLight1);

    const pointLight2 = new THREE.PointLight(0x9c27b0, 0.3, 10);
    pointLight2.position.set(2, -1, -2);
    this.scene.add(pointLight2);
  }

  private setupPostProcessing(): void {
    this.composer = new EffectComposer(this.renderer);

    const renderPass = new RenderPass(this.scene, this.camera);
    this.composer.addPass(renderPass);

    this.bloomPass = new UnrealBloomPass(
      new THREE.Vector2(window.innerWidth, window.innerHeight),
      0.2,
      0.4,
      0.85
    );
    this.bloomPass.threshold = 0.1;
    this.bloomPass.strength = 0.2;
    this.bloomPass.radius = 0.5;
    this.composer.addPass(this.bloomPass);
  }

  private hideLoadingScreen(): void {
    setTimeout(() => {
      const loadingScreen = document.getElementById('loading-screen');
      if (loadingScreen) {
        loadingScreen.classList.add('hidden');
        setTimeout(() => {
          loadingScreen.style.display = 'none';
        }, 500);
      }
    }, 500);
  }

  private togglePlay(): void {
    this.isPlaying = !this.isPlaying;
    this.ui.setPlaying(this.isPlaying);
  }

  private reset(): void {
    this.progress = 0;
    this.isPlaying = false;
    this.cell.reset();
    this.ui.setProgress(0);
    this.ui.setPlaying(false);
    this.ui.setStageLabel(this.cell.getPhaseName());
  }

  private onResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();

    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.composer.setSize(window.innerWidth, window.innerHeight);

    this.bloomPass.resolution.set(window.innerWidth, window.innerHeight);
  }

  private start(): void {
    this.animate();
  }

  private animate(): void {
    this.animationId = requestAnimationFrame(this.animate.bind(this));

    const delta = this.clock.getDelta();

    if (this.isPlaying) {
      this.progress += (delta / this.transitionDuration) * this.speed * 0.2;
      if (this.progress >= 1) {
        this.progress = 1;
        this.isPlaying = false;
        this.ui.setPlaying(false);
      }
      this.cell.setProgress(this.progress);
      this.ui.setProgress(this.progress);
      this.ui.setStageLabel(this.cell.getPhaseName());
    }

    this.cell.update(delta, this.speed);

    this.controls.update();

    this.composer.render();
  }

  public dispose(): void {
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
    }

    window.removeEventListener('resize', this.onResize.bind(this));

    this.cell.dispose();
    this.renderer.dispose();
    this.composer.dispose();
    this.controls.dispose();
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new App();
});
