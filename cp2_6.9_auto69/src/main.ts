import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { LensSystem } from './LensSystem';
import { createLightRays, createScreenSpots, updateRays, disposeRays } from './LightRay';
import { ControlPanel } from './ControlPanel';

const SCREEN_POSITION = 3;

class App {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;
  private container: HTMLElement;

  private lensSystem: LensSystem;
  private controlPanel: ControlPanel;

  private platform!: THREE.Mesh;
  private gridHelper!: THREE.GridHelper;
  private screen!: THREE.Mesh;
  private screenGrid!: THREE.GridHelper;

  private clock: THREE.Clock;
  private frameCount: number = 0;
  private fpsTime: number = 0;

  private animationId: number = 0;

  constructor() {
    this.container = document.getElementById('canvas-container') as HTMLElement;
    this.clock = new THREE.Clock();

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0D0D1A);

    this.camera = new THREE.PerspectiveCamera(
      50,
      this.container.clientWidth / this.container.clientHeight,
      0.1,
      1000
    );
    this.camera.position.set(0, 8, 8);

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance'
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;
    this.container.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.minDistance = 5;
    this.controls.maxDistance = 20;
    this.controls.target.set(0, 0, 0);
    this.controls.update();

    this.setupLighting();
    this.setupPlatform();
    this.setupScreen();

    this.lensSystem = new LensSystem(this.scene);

    createLightRays(this.scene);
    createScreenSpots(this.scene);

    this.controlPanel = new ControlPanel(this.lensSystem, {
      onParamsChange: () => {
        const result = updateRays(this.lensSystem);
        this.controlPanel.updateFlux(result.totalFlux);
        this.controlPanel.updateFocalInfo(
          this.lensSystem.getFocalLength(),
          result.focalPos
        );
      }
    });

    const initialResult = updateRays(this.lensSystem);
    this.controlPanel.updateFlux(initialResult.totalFlux);
    this.controlPanel.updateFocalInfo(
      this.lensSystem.getFocalLength(),
      initialResult.focalPos
    );

    window.addEventListener('resize', this.onWindowResize.bind(this));

    this.animate();
  }

  private setupLighting(): void {
    const ambientLight = new THREE.AmbientLight(0x404060, 0.6);
    this.scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 10, 5);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    directionalLight.shadow.camera.near = 0.5;
    directionalLight.shadow.camera.far = 50;
    directionalLight.shadow.camera.left = -10;
    directionalLight.shadow.camera.right = 10;
    directionalLight.shadow.camera.top = 10;
    directionalLight.shadow.camera.bottom = -10;
    this.scene.add(directionalLight);

    const fillLight = new THREE.DirectionalLight(0x6C63FF, 0.3);
    fillLight.position.set(-5, 5, -5);
    this.scene.add(fillLight);
  }

  private setupPlatform(): void {
    const platformGeo = new THREE.PlaneGeometry(20, 15);
    const platformMat = new THREE.MeshStandardMaterial({
      color: 0x2A2A2A,
      roughness: 0.9,
      metalness: 0.1,
      transparent: true,
      opacity: 0.95
    });
    this.platform = new THREE.Mesh(platformGeo, platformMat);
    this.platform.rotation.x = -Math.PI / 2;
    this.platform.position.y = -1.5;
    this.platform.receiveShadow = true;
    this.scene.add(this.platform);

    this.gridHelper = new THREE.GridHelper(20, 40, 0x444444, 0x444444);
    (this.gridHelper.material as THREE.Material).transparent = true;
    (this.gridHelper.material as THREE.Material).opacity = 0.3;
    this.gridHelper.position.y = -1.49;
    this.scene.add(this.gridHelper);
  }

  private setupScreen(): void {
    const screenGeo = new THREE.PlaneGeometry(2, 2);
    const screenMat = new THREE.MeshStandardMaterial({
      color: 0xFFFFFF,
      transparent: true,
      opacity: 0.15,
      side: THREE.DoubleSide,
      roughness: 0.5
    });
    this.screen = new THREE.Mesh(screenGeo, screenMat);
    this.screen.position.set(SCREEN_POSITION, 0, 0);
    this.screen.rotation.y = -Math.PI / 2;
    this.scene.add(this.screen);

    this.screenGrid = new THREE.GridHelper(2, 10, 0x6C63FF, 0x6C63FF);
    (this.screenGrid.material as THREE.Material).transparent = true;
    (this.screenGrid.material as THREE.Material).opacity = 0.4;
    this.screenGrid.rotation.y = Math.PI / 2;
    this.screenGrid.position.set(SCREEN_POSITION, 0, 0);
    this.scene.add(this.screenGrid);

    const screenFrameGeo = new THREE.EdgesGeometry(new THREE.BoxGeometry(0.02, 2, 2));
    const screenFrameMat = new THREE.LineBasicMaterial({
      color: 0x6C63FF,
      transparent: true,
      opacity: 0.6
    });
    const screenFrame = new THREE.LineSegments(screenFrameGeo, screenFrameMat);
    screenFrame.position.set(SCREEN_POSITION, 0, 0);
    this.scene.add(screenFrame);
  }

  private onWindowResize(): void {
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  private animate(): void {
    this.animationId = requestAnimationFrame(this.animate.bind(this));

    const delta = this.clock.getDelta();
    this.frameCount++;
    this.fpsTime += delta;

    if (this.fpsTime >= 0.5) {
      const fps = this.frameCount / this.fpsTime;
      this.controlPanel.updateFPS(fps);
      this.frameCount = 0;
      this.fpsTime = 0;
    }

    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }

  public dispose(): void {
    cancelAnimationFrame(this.animationId);
    window.removeEventListener('resize', this.onWindowResize.bind(this));
    disposeRays();
    this.lensSystem.dispose();
    this.controls.dispose();
    this.renderer.dispose();

    this.platform.geometry.dispose();
    (this.platform.material as THREE.Material).dispose();
    this.gridHelper.geometry.dispose();
    (this.gridHelper.material as THREE.Material).dispose();
    this.screen.geometry.dispose();
    (this.screen.material as THREE.Material).dispose();
    this.screenGrid.geometry.dispose();
    (this.screenGrid.material as THREE.Material).dispose();

    if (this.container.contains(this.renderer.domElement)) {
      this.container.removeChild(this.renderer.domElement);
    }
  }
}

let app: App | null = null;

window.addEventListener('DOMContentLoaded', () => {
  app = new App();
});

window.addEventListener('beforeunload', () => {
  if (app) {
    app.dispose();
    app = null;
  }
});
