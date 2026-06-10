import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { HouseManager } from './HouseManager';
import { LightController } from './LightController';
import { UIController } from './ui';

class DaylightSimulator {
  private container: HTMLElement;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;
  private houseManager: HouseManager;
  private lightController: LightController;
  private uiController: UIController;
  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;
  private hoveredLightId: string | null = null;
  private clock: THREE.Clock;
  private animationFrameId: number = 0;

  constructor() {
    const container = document.getElementById('scene-container');
    if (!container) {
      throw new Error('Scene container not found');
    }
    this.container = container;
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    this.clock = new THREE.Clock();

    this.scene = this.initScene();
    this.camera = this.initCamera();
    this.renderer = this.initRenderer();
    this.controls = this.initControls();
    this.houseManager = new HouseManager(this.scene);
    this.lightController = new LightController(this.scene);
    this.uiController = new UIController({
      panelContainer: document.getElementById('control-panel')!,
      heatmapCanvas: document.getElementById('heatmap-canvas') as HTMLCanvasElement,
      lightController: this.lightController,
      houseManager: this.houseManager
    });

    this.setupEventListeners();
    this.onWindowResize();
    this.animate();
  }

  private initScene(): THREE.Scene {
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf5f0eb);
    scene.fog = new THREE.Fog(0xf5f0eb, 20, 50);
    return scene;
  }

  private initCamera(): THREE.PerspectiveCamera {
    const camera = new THREE.PerspectiveCamera(
      50,
      this.container.clientWidth / this.container.clientHeight,
      0.1,
      1000
    );
    camera.position.set(5, 4, 8);
    camera.lookAt(0, 0, 0);
    return camera;
  }

  private initRenderer(): THREE.WebGLRenderer {
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance'
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.container.appendChild(renderer.domElement);
    return renderer;
  }

  private initControls(): OrbitControls {
    const controls = new OrbitControls(this.camera, this.renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.screenSpacePanning = false;
    controls.minDistance = 3;
    controls.maxDistance = 25;
    controls.maxPolarAngle = Math.PI / 2.1;
    controls.target.set(0, 0, 0);
    controls.update();
    return controls;
  }

  private setupEventListeners(): void {
    window.addEventListener('resize', this.onWindowResize.bind(this));
    this.renderer.domElement.addEventListener('mousemove', this.onMouseMove.bind(this));
    this.renderer.domElement.addEventListener('click', this.onMouseClick.bind(this));
    this.renderer.domElement.addEventListener('mouseleave', this.onMouseLeave.bind(this));
  }

  private onWindowResize(): void {
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  private updateMouse(event: MouseEvent): void {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  }

  private pickLightMarker(): THREE.Mesh | null {
    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObjects(this.scene.children, false);

    for (const intersect of intersects) {
      if (intersect.object instanceof THREE.Mesh) {
        const lightId = this.lightController.getLightMarkerByMesh(intersect.object);
        if (lightId !== null) {
          return intersect.object;
        }
      }
    }
    return null;
  }

  private onMouseMove(event: MouseEvent): void {
    this.updateMouse(event);
    const picked = this.pickLightMarker();

    if (picked) {
      const lightId = this.lightController.getLightMarkerByMesh(picked);
      if (lightId !== this.hoveredLightId) {
        if (this.hoveredLightId) {
          this.lightController.showGlow(this.hoveredLightId, false);
        }
        this.hoveredLightId = lightId;
        if (lightId) {
          this.lightController.showGlow(lightId, true);
          this.renderer.domElement.style.cursor = 'pointer';
          this.uiController.showLightTooltip(lightId, event.clientX, event.clientY);
        }
      } else if (lightId) {
        this.uiController.showLightTooltip(lightId, event.clientX, event.clientY);
      }
    } else {
      if (this.hoveredLightId) {
        this.lightController.showGlow(this.hoveredLightId, false);
        this.hoveredLightId = null;
        this.renderer.domElement.style.cursor = 'default';
        this.uiController.hideLightTooltip();
      }
    }
  }

  private onMouseClick(event: MouseEvent): void {
    this.updateMouse(event);
    const picked = this.pickLightMarker();
    if (picked) {
      const lightId = this.lightController.getLightMarkerByMesh(picked);
      if (lightId) {
        this.lightController.toggleArtificialLight(lightId);
        this.uiController.updateHeatmap(true);
      }
    }
  }

  private onMouseLeave(): void {
    if (this.hoveredLightId) {
      this.lightController.showGlow(this.hoveredLightId, false);
      this.hoveredLightId = null;
      this.renderer.domElement.style.cursor = 'default';
      this.uiController.hideLightTooltip();
    }
  }

  private animate(): void {
    this.animationFrameId = requestAnimationFrame(this.animate.bind(this));

    const delta = this.clock.getDelta();

    this.controls.update();
    this.lightController.update(delta);
    this.uiController.updateHeatmap(false);

    this.renderer.render(this.scene, this.camera);
  }

  public dispose(): void {
    cancelAnimationFrame(this.animationFrameId);
    window.removeEventListener('resize', this.onWindowResize.bind(this));
    this.renderer.domElement.removeEventListener('mousemove', this.onMouseMove.bind(this));
    this.renderer.domElement.removeEventListener('click', this.onMouseClick.bind(this));
    this.renderer.domElement.removeEventListener('mouseleave', this.onMouseLeave.bind(this));

    this.controls.dispose();
    this.houseManager.dispose();
    this.lightController.dispose();
    this.uiController.dispose();

    this.renderer.dispose();
    if (this.renderer.domElement.parentNode) {
      this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  try {
    new DaylightSimulator();
  } catch (error) {
    console.error('Failed to initialize DaylightSimulator:', error);
  }
});
