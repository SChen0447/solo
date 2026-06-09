import * as THREE from 'three';
import { loadClimateData, type GeoPoint } from './dataLoader';
import { EarthRenderer } from './earthRenderer';
import { HeatmapBuilder } from './heatmapBuilder';
import { InteractionManager, type DisplayMode } from './interaction';

const ROTATION_PERIOD = 120;
const DEFAULT_CAMERA_DISTANCE = 14;

class App {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private container: HTMLElement;

  private earthRenderer: EarthRenderer;
  private heatmapBuilder: HeatmapBuilder;
  private interactionManager: InteractionManager;

  private clock: THREE.Clock;
  private elapsedTime = 0;
  private autoRotateAngle = 0;

  private currentMode: DisplayMode = 'bars';

  private initialCameraPosition = new THREE.Vector3(0, 2, DEFAULT_CAMERA_DISTANCE);

  constructor() {
    this.container = document.getElementById('app')!;
    this.clock = new THREE.Clock();

    this.scene = this.createScene();
    this.camera = this.createCamera();
    this.renderer = this.createRenderer();
    this.container.appendChild(this.renderer.domElement);

    this.earthRenderer = new EarthRenderer();
    this.heatmapBuilder = new HeatmapBuilder();

    const geoPoints = loadClimateData();
    this.earthRenderer.createBars(geoPoints);
    this.heatmapBuilder.build(geoPoints);

    this.scene.add(this.earthRenderer.earthGroup);
    this.scene.add(this.earthRenderer.stars);
    this.scene.add(this.heatmapBuilder.group);

    this.applyMode(this.currentMode);

    this.interactionManager = new InteractionManager(
      this.camera,
      this.renderer,
      this.earthRenderer,
      this.container,
      {
        onModeChange: (mode) => this.applyMode(mode),
        onResetView: () => this.resetCamera(),
        onOpacityAdjust: (delta) => this.heatmapBuilder.adjustOpacity(delta),
        onCountrySelect: () => {}
      }
    );

    this.setupLights();

    window.addEventListener('resize', this.onResize.bind(this));
    this.onResize();

    setTimeout(() => {
      document.getElementById('loading')?.classList.add('hidden');
    }, 600);

    this.animate();
  }

  private createScene(): THREE.Scene {
    const scene = new THREE.Scene();
    scene.background = null;
    return scene;
  }

  private createCamera(): THREE.PerspectiveCamera {
    const camera = new THREE.PerspectiveCamera(
      45,
      this.container.clientWidth / this.container.clientHeight,
      0.1,
      500
    );
    camera.position.copy(this.initialCameraPosition);
    camera.lookAt(0, 0, 0);
    return camera;
  }

  private createRenderer(): THREE.WebGLRenderer {
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance'
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    return renderer;
  }

  private setupLights(): void {
    const ambient = new THREE.AmbientLight(0xffffff, 0.55);
    this.scene.add(ambient);

    const sun = new THREE.DirectionalLight(0xffffff, 1.1);
    sun.position.set(15, 10, 15);
    this.scene.add(sun);

    const fill = new THREE.DirectionalLight(0x4A90D9, 0.35);
    fill.position.set(-10, -5, -10);
    this.scene.add(fill);

    const rim = new THREE.PointLight(0xFF6B4A, 0.6, 60);
    rim.position.set(-12, 4, -8);
    this.scene.add(rim);
  }

  private applyMode(mode: DisplayMode): void {
    this.currentMode = mode;
    switch (mode) {
      case 'bars':
        this.earthRenderer.setBarsVisible(true);
        this.heatmapBuilder.setVisible(false);
        break;
      case 'heatmap':
        this.earthRenderer.setBarsVisible(false);
        this.heatmapBuilder.setVisible(true);
        break;
      case 'both':
        this.earthRenderer.setBarsVisible(true);
        this.heatmapBuilder.setVisible(true);
        break;
    }
  }

  private resetCamera(): void {
    this.camera.position.copy(this.initialCameraPosition);
    this.camera.lookAt(0, 0, 0);
  }

  private onResize(): void {
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  }

  private easeInOut(t: number): number {
    return t < 0.5
      ? 2 * t * t
      : 1 - Math.pow(-2 * t + 2, 2) / 2;
  }

  private animate(): void {
    requestAnimationFrame(() => this.animate());

    const delta = this.clock.getDelta();
    this.elapsedTime += delta;

    if (this.interactionManager.isAutoRotateEnabled()) {
      this.autoRotateAngle += (delta / ROTATION_PERIOD) * Math.PI * 2;
    }

    const manualRotation = this.interactionManager.getRotation();

    const easedAuto = this.easeInOut((this.autoRotateAngle % (Math.PI * 2)) / (Math.PI * 2));
    this.earthRenderer.earthGroup.rotation.y = easedAuto * Math.PI * 2 + manualRotation.y;
    this.earthRenderer.earthGroup.rotation.x = manualRotation.x;

    this.heatmapBuilder.group.rotation.copy(this.earthRenderer.earthGroup.rotation);

    this.earthRenderer.update(delta, this.elapsedTime);
    this.heatmapBuilder.update(delta, this.elapsedTime);

    this.renderer.render(this.scene, this.camera);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new App();
});
