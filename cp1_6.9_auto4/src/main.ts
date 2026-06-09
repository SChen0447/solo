import * as THREE from 'three';
import { DataManager, type CosmicEvent } from './dataManager';
import { TimelineRenderer } from './timelineRenderer';
import { InteractionController } from './interactionController';

class CosmicTimelineApp {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private container: HTMLElement;

  private dataManager: DataManager;
  private timelineRenderer: TimelineRenderer;
  private interactionController: InteractionController;

  private clock: THREE.Clock;
  private frameCount: number = 0;
  private fpsTime: number = 0;
  private currentFPS: number = 60;
  private performanceReduced: boolean = false;

  private loadPhase: 'loading' | 'intro' | 'interactive' = 'loading';
  private loadTimer: number = 0;
  private introRotation: number = 0;
  private introDuration: number = 10;

  private timelineProgressEl: HTMLElement | null = null;
  private timelineCursorEl: HTMLElement | null = null;
  private loadingOverlay: HTMLElement | null = null;

  private starField: THREE.Points | null = null;

  constructor() {
    this.container = document.getElementById('canvas-container')!;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0a0a1a);
    this.scene.fog = new THREE.FogExp2(0x0a0a1a, 0.015);

    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.camera.position.set(
      Math.sin(Math.PI / 3) * Math.cos(Math.PI / 4) * 30,
      Math.cos(Math.PI / 3) * 30,
      Math.sin(Math.PI / 3) * Math.sin(Math.PI / 4) * 30
    );
    this.camera.lookAt(0, 0, 0);

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance'
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;
    this.container.appendChild(this.renderer.domElement);

    this.clock = new THREE.Clock();

    this.setupLights();
    this.createStarField();

    this.dataManager = new DataManager();
    this.timelineRenderer = new TimelineRenderer(this.scene);
    this.timelineRenderer.render(this.dataManager.getEvents());

    this.interactionController = new InteractionController(
      this.camera,
      this.renderer,
      this.timelineRenderer,
      {
        getEventById: (id: number) => this.dataManager.getEventById(id),
        getTotalTimespan: () => this.dataManager.getTotalTimespan()
      },
      {
        onFocus: (_event: CosmicEvent | null) => {},
        onTimelineUpdate: (progress: number) => this.updateTimelineUI(progress)
      }
    );
    this.interactionController.setInitialCamera(30, Math.PI / 4, Math.PI / 3);

    this.setupUIReferences();
    this.setupWindowEvents();
    this.hideLoading();
  }

  private setupLights(): void {
    const ambientLight = new THREE.AmbientLight(0x6a5acd, 0.4);
    this.scene.add(ambientLight);

    const ambientLight2 = new THREE.AmbientLight(0x4169e1, 0.2);
    this.scene.add(ambientLight2);

    const directionalLight = new THREE.DirectionalLight(0x9370db, 0.6);
    directionalLight.position.set(10, 20, 10);
    this.scene.add(directionalLight);

    const pointLight1 = new THREE.PointLight(0xff4500, 1.5, 50);
    pointLight1.position.set(-15, 5, -15);
    this.scene.add(pointLight1);

    const pointLight2 = new THREE.PointLight(0x00bfff, 1.5, 50);
    pointLight2.position.set(15, -5, 15);
    this.scene.add(pointLight2);
  }

  private createStarField(): void {
    const starCount = 2000;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(starCount * 3);
    const colors = new Float32Array(starCount * 3);

    for (let i = 0; i < starCount; i++) {
      const radius = 80 + Math.random() * 120;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);

      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = radius * Math.cos(phi);

      const colorChoice = Math.random();
      if (colorChoice < 0.33) {
        colors[i * 3] = 1.0;
        colors[i * 3 + 1] = 0.9;
        colors[i * 3 + 2] = 0.8;
      } else if (colorChoice < 0.66) {
        colors[i * 3] = 0.8;
        colors[i * 3 + 1] = 0.9;
        colors[i * 3 + 2] = 1.0;
      } else {
        colors[i * 3] = 1.0;
        colors[i * 3 + 1] = 1.0;
        colors[i * 3 + 2] = 1.0;
      }
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
      size: 0.15,
      vertexColors: true,
      transparent: true,
      opacity: 0.8,
      sizeAttenuation: false
    });

    this.starField = new THREE.Points(geometry, material);
    this.scene.add(this.starField);
  }

  private setupUIReferences(): void {
    this.timelineProgressEl = document.getElementById('timeline-progress');
    this.timelineCursorEl = document.getElementById('timeline-cursor');
    this.loadingOverlay = document.getElementById('loading-overlay');
  }

  private setupWindowEvents(): void {
    window.addEventListener('resize', () => this.onResize());
    this.renderer.domElement.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  private hideLoading(): void {
    setTimeout(() => {
      if (this.loadingOverlay) {
        this.loadingOverlay.classList.add('hidden');
        this.loadPhase = 'intro';
        setTimeout(() => {
          if (this.loadingOverlay) {
            this.loadingOverlay.style.display = 'none';
          }
        }, 600);
      }
    }, 2000);
  }

  private updateTimelineUI(progress: number): void {
    const pct = Math.max(0, Math.min(100, progress * 100));
    if (this.timelineProgressEl) {
      this.timelineProgressEl.style.width = `${pct}%`;
    }
    if (this.timelineCursorEl) {
      this.timelineCursorEl.style.left = `${pct}%`;
    }
  }

  private onResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  }

  private updateFPS(deltaTime: number): void {
    this.frameCount++;
    this.fpsTime += deltaTime;

    if (this.fpsTime >= 0.5) {
      this.currentFPS = this.frameCount / this.fpsTime;
      this.frameCount = 0;
      this.fpsTime = 0;

      if (this.currentFPS < 30 && !this.performanceReduced) {
        this.timelineRenderer.reduceParticles();
        this.performanceReduced = true;
      }
    }
  }

  private animate(): void {
    requestAnimationFrame(() => this.animate());

    const deltaTime = Math.min(this.clock.getDelta(), 0.1);

    this.updateFPS(deltaTime);

    if (this.loadPhase === 'intro') {
      this.loadTimer += deltaTime;
      const angleSpeed = (Math.PI * 2) / this.introDuration;
      this.introRotation += angleSpeed * deltaTime;
      this.interactionController.rotateCamera(angleSpeed * deltaTime);

      if (this.loadTimer >= this.introDuration) {
        this.loadPhase = 'interactive';
        this.interactionController.setInteractive(true);
      }
    }

    if (this.starField) {
      this.starField.rotation.y += deltaTime * 0.005;
    }

    this.timelineRenderer.update(deltaTime);
    this.interactionController.update(deltaTime);

    this.renderer.render(this.scene, this.camera);
  }

  start(): void {
    this.animate();
  }

  dispose(): void {
    this.timelineRenderer.dispose();
    if (this.starField) {
      this.starField.geometry.dispose();
      (this.starField.material as THREE.Material).dispose();
    }
    this.renderer.dispose();
  }
}

let app: CosmicTimelineApp | null = null;

function init(): void {
  app = new CosmicTimelineApp();
  app.start();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
