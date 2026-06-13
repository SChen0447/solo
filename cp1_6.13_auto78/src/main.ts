import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CityScene } from './scene';
import { timeManager, TimePeriod, getPeriodLabel, getAllPeriods } from './time';

class Application {
  private container: HTMLElement;
  private scene: CityScene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;
  private clock: THREE.Clock;
  private animationFrameId: number | null = null;
  private isRunning: boolean = false;

  constructor() {
    this.container = document.getElementById('canvas-container')!;
    this.clock = new THREE.Clock();

    this.scene = new CityScene(timeManager);
    this.camera = this.createCamera();
    this.renderer = this.createRenderer();
    this.controls = this.createControls();

    this.container.appendChild(this.renderer.domElement);

    this.setupEventListeners();
    this.setupUI();
  }

  private createCamera(): THREE.PerspectiveCamera {
    const camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );

    const distance = 15;
    const angle = Math.PI / 4;
    camera.position.set(
      distance * Math.cos(angle),
      distance * Math.sin(angle),
      distance * Math.cos(angle)
    );
    camera.lookAt(0, 0, 0);

    return camera;
  }

  private createRenderer(): THREE.WebGLRenderer {
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true
    });

    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0x000000, 0);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;

    return renderer;
  }

  private createControls(): OrbitControls {
    const controls = new OrbitControls(this.camera, this.renderer.domElement);

    controls.enableDamping = true;
    controls.dampingFactor = 0.1;
    controls.enableZoom = true;
    controls.minDistance = 5;
    controls.maxDistance = 30;
    controls.maxPolarAngle = Math.PI / 2.1;
    controls.minPolarAngle = 0.2;
    controls.target.set(0, 1, 0);

    return controls;
  }

  private setupEventListeners(): void {
    window.addEventListener('resize', this.onResize.bind(this));
    document.addEventListener('visibilitychange', this.onVisibilityChange.bind(this));
  }

  private onResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    this.scene.resize();
  }

  private onVisibilityChange(): void {
    if (document.hidden) {
      this.stop();
    } else {
      this.start();
    }
  }

  private setupUI(): void {
    const timeButtons = document.querySelectorAll('.time-btn');
    const currentTimeEl = document.getElementById('current-time');

    timeButtons.forEach(button => {
      button.addEventListener('click', (e) => {
        const target = e.currentTarget as HTMLElement;
        const period = target.dataset.time as TimePeriod;

        this.animateButtonClick(target);

        if (period && getAllPeriods().includes(period)) {
          timeManager.setPeriod(period);
          this.updateActiveButton(period);

          if (currentTimeEl) {
            currentTimeEl.textContent = getPeriodLabel(period);
          }
        }
      });
    });

    timeManager.subscribe((newState) => {
      if (currentTimeEl) {
        currentTimeEl.textContent = newState.label;
      }
    });
  }

  private animateButtonClick(button: HTMLElement): void {
    button.style.transform = 'scale(0.95)';
    button.style.transition = 'transform 0.15s ease';

    setTimeout(() => {
      button.style.transform = '';
    }, 150);
  }

  private updateActiveButton(activePeriod: TimePeriod): void {
    const timeButtons = document.querySelectorAll('.time-btn');
    timeButtons.forEach(button => {
      const period = button.getAttribute('data-time');
      if (period === activePeriod) {
        button.classList.add('active');
      } else {
        button.classList.remove('active');
      }
    });
  }

  public start(): void {
    if (this.isRunning) return;
    this.isRunning = true;

    setTimeout(() => {
      const loading = document.getElementById('loading');
      if (loading) {
        loading.classList.add('hidden');
        setTimeout(() => {
          loading.style.display = 'none';
        }, 500);
      }
    }, 1000);

    this.animate();
  }

  public stop(): void {
    this.isRunning = false;
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  private animate(): void {
    if (!this.isRunning) return;

    this.animationFrameId = requestAnimationFrame(this.animate.bind(this));

    const deltaTime = Math.min(this.clock.getDelta(), 0.1);
    const timeState = timeManager.getInterpolatedState();

    this.scene.update(deltaTime, timeState);
    this.controls.update();
    this.renderer.render(this.scene.scene, this.camera);
  }

  public dispose(): void {
    this.stop();
    window.removeEventListener('resize', this.onResize.bind(this));
    document.removeEventListener('visibilitychange', this.onVisibilityChange.bind(this));
    this.controls.dispose();
    this.renderer.dispose();
    this.scene.dispose();
    this.container.removeChild(this.renderer.domElement);
  }
}

let app: Application | null = null;

function init(): void {
  if (app) {
    app.dispose();
  }

  app = new Application();
  app.start();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

window.addEventListener('beforeunload', () => {
  if (app) {
    app.dispose();
    app = null;
  }
});

export { Application };
