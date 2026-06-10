import * as THREE from 'three';
import { CSS2DRenderer } from 'three/examples/jsm/renderers/CSS2DRenderer.js';
import Stats from 'stats.js';
import { SceneManager } from './sceneManager';
import { InteractionController, InteractionMode } from './interactionController';

class AppController {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private css2dRenderer: CSS2DRenderer;
  private sceneManager: SceneManager;
  private interactionController: InteractionController;
  private stats: Stats;

  private canvasContainer: HTMLElement;
  private labelContainer: HTMLElement;
  private annotationInputContainer: HTMLElement;
  private annotationInput: HTMLInputElement;
  private modeIndicator: HTMLElement;

  private btnReset: HTMLElement;
  private btnAnnotate: HTMLElement;
  private btnMeasure: HTMLElement;
  private btnClear: HTMLElement;

  private pendingAnnotationPosition: THREE.Vector3 | null = null;
  private clock: THREE.Clock = new THREE.Clock();

  constructor() {
    this.canvasContainer = document.getElementById('canvas-container')!;
    this.labelContainer = document.getElementById('label-container')!;
    this.annotationInputContainer = document.getElementById('annotation-input-container')!;
    this.annotationInput = document.getElementById('annotation-input') as HTMLInputElement;
    this.modeIndicator = document.getElementById('mode-indicator')!;

    this.btnReset = document.getElementById('btn-reset')!;
    this.btnAnnotate = document.getElementById('btn-annotate')!;
    this.btnMeasure = document.getElementById('btn-measure')!;
    this.btnClear = document.getElementById('btn-clear')!;

    this.scene = this.createScene();
    this.camera = this.createCamera();
    this.renderer = this.createRenderer();
    this.css2dRenderer = this.createCSS2DRenderer();
    this.stats = this.createStats();

    this.sceneManager = new SceneManager(this.scene);
    this.interactionController = new InteractionController(
      this.camera,
      this.canvasContainer,
      this.sceneManager
    );

    this.setupLights();
    this.setupGrid();
    this.bindUIEvents();
    this.bindInteractionCallbacks();
    this.handleResize();
  }

  private createScene(): THREE.Scene {
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xeef2f7);
    scene.fog = new THREE.Fog(0xeef2f7, 60, 120);
    return scene;
  }

  private createCamera(): THREE.PerspectiveCamera {
    const camera = new THREE.PerspectiveCamera(
      50,
      window.innerWidth / window.innerHeight,
      0.1,
      500
    );
    return camera;
  }

  private createRenderer(): THREE.WebGLRenderer {
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    this.canvasContainer.appendChild(renderer.domElement);
    return renderer;
  }

  private createCSS2DRenderer(): CSS2DRenderer {
    const css2dRenderer = new CSS2DRenderer();
    css2dRenderer.setSize(window.innerWidth, window.innerHeight);
    const domElement = css2dRenderer.domElement;
    domElement.style.position = 'absolute';
    domElement.style.top = '0';
    domElement.style.left = '0';
    domElement.style.pointerEvents = 'none';
    this.labelContainer.appendChild(domElement);
    return css2dRenderer;
  }

  private createStats(): Stats {
    const stats = new Stats();
    stats.showPanel(0);
    stats.dom.id = 'stats';
    document.body.appendChild(stats.dom);
    return stats;
  }

  private setupLights(): void {
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.55);
    this.scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.9);
    directionalLight.position.set(15, 25, 20);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    directionalLight.shadow.camera.near = 0.5;
    directionalLight.shadow.camera.far = 80;
    directionalLight.shadow.camera.left = -35;
    directionalLight.shadow.camera.right = 35;
    directionalLight.shadow.camera.top = 35;
    directionalLight.shadow.camera.bottom = -35;
    directionalLight.shadow.bias = -0.001;
    this.scene.add(directionalLight);

    const fillLight = new THREE.DirectionalLight(0xb0c4de, 0.25);
    fillLight.position.set(-10, 15, -10);
    this.scene.add(fillLight);
  }

  private setupGrid(): void {
    const gridHelper = new THREE.GridHelper(60, 30, 0xbfc5d0, 0xd0d5dd);
    gridHelper.position.y = -0.15;
    (gridHelper.material as THREE.Material).transparent = true;
    (gridHelper.material as THREE.Material).opacity = 0.5;
    this.scene.add(gridHelper);
  }

  private bindUIEvents(): void {
    this.btnReset.addEventListener('click', () => {
      this.interactionController.resetCamera();
      this.updateToolbarActiveState('view');
    });

    this.btnAnnotate.addEventListener('click', () => {
      const newMode: InteractionMode =
        this.interactionController.getMode() === 'annotate' ? 'view' : 'annotate';
      this.interactionController.setMode(newMode);
      this.hideAnnotationInput();
    });

    this.btnMeasure.addEventListener('click', () => {
      const newMode: InteractionMode =
        this.interactionController.getMode() === 'measure' ? 'view' : 'measure';
      this.interactionController.setMode(newMode);
    });

    this.btnClear.addEventListener('click', () => {
      this.sceneManager.clearAll();
    });

    this.annotationInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        this.confirmAnnotation();
      } else if (e.key === 'Escape') {
        this.hideAnnotationInput();
        this.pendingAnnotationPosition = null;
      }
    });

    this.annotationInput.addEventListener('blur', () => {
      setTimeout(() => {
        if (this.annotationInputContainer.classList.contains('visible')) {
          this.confirmAnnotation();
        }
      }, 150);
    });

    window.addEventListener('resize', this.handleResize.bind(this));
  }

  private bindInteractionCallbacks(): void {
    this.interactionController.onModeChange((mode) => {
      this.updateToolbarActiveState(mode);
      this.updateModeIndicator(mode);
      if (mode !== 'annotate') {
        this.hideAnnotationInput();
      }
      if (mode !== 'measure') {
        this.interactionController.resetMeasurement();
      }
    });

    this.interactionController.onAnnotationRequest((position, screenX, screenY) => {
      this.showAnnotationInput(position, screenX, screenY);
    });

    this.interactionController.onMeasurementComplete((start, end) => {
      this.sceneManager.addMeasurement(start, end);
    });
  }

  private updateToolbarActiveState(mode: InteractionMode): void {
    this.btnAnnotate.classList.toggle('active', mode === 'annotate');
    this.btnMeasure.classList.toggle('active', mode === 'measure');
  }

  private updateModeIndicator(mode: InteractionMode): void {
    if (mode === 'annotate') {
      this.modeIndicator.textContent = '标注模式 - 点击墙面或地板添加标注（ESC退出）';
      this.modeIndicator.classList.add('visible');
    } else if (mode === 'measure') {
      this.modeIndicator.textContent = '测量模式 - 依次点击两点测量距离（ESC退出）';
      this.modeIndicator.classList.add('visible');
    } else {
      this.modeIndicator.classList.remove('visible');
    }
  }

  private showAnnotationInput(position: THREE.Vector3, screenX: number, screenY: number): void {
    this.pendingAnnotationPosition = position.clone();
    const count = this.sceneManager.getAnnotationCount();
    if (count >= 20) {
      this.modeIndicator.textContent = '已达到最大标注数量（20个）';
      this.modeIndicator.classList.add('visible');
      setTimeout(() => {
        if (this.interactionController.getMode() === 'annotate') {
          this.updateModeIndicator('annotate');
        }
      }, 2000);
      return;
    }

    this.annotationInputContainer.classList.add('visible');
    this.annotationInputContainer.style.left = `${Math.min(screenX, window.innerWidth - 220)}px`;
    this.annotationInputContainer.style.top = `${Math.max(screenY - 45, 10)}px`;
    this.annotationInput.value = '';
    setTimeout(() => this.annotationInput.focus(), 50);
  }

  private hideAnnotationInput(): void {
    this.annotationInputContainer.classList.remove('visible');
    this.annotationInput.blur();
  }

  private confirmAnnotation(): void {
    const text = this.annotationInput.value.trim();
    if (text && this.pendingAnnotationPosition) {
      this.sceneManager.addAnnotation(this.pendingAnnotationPosition, text);
    }
    this.hideAnnotationInput();
    this.pendingAnnotationPosition = null;
  }

  private handleResize(): void {
    const width = window.innerWidth;
    const height = window.innerHeight;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();

    this.renderer.setSize(width, height);
    this.css2dRenderer.setSize(width, height);
  }

  loadDefaultBuilding(): void {
    this.sceneManager.generateBuilding();
  }

  start(): void {
    this.loadDefaultBuilding();
    this.animate();
  }

  private animate(): void {
    requestAnimationFrame(() => this.animate());

    this.stats.begin();

    const delta = this.clock.getDelta();
    void delta;

    this.interactionController.update();
    this.renderer.render(this.scene, this.camera);
    this.css2dRenderer.render(this.scene, this.camera);

    this.stats.end();
  }
}

window.addEventListener('DOMContentLoaded', () => {
  const app = new AppController();
  app.start();
});
