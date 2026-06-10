import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { StrataScene } from './strata';
import { ControlPanel, PANEL_UPDATE_EVENT, PANEL_RESET_EVENT, type PanelValues } from './panel';

const INITIAL_CAMERA_DISTANCE = 8;
const INITIAL_CAMERA_POLAR = Math.PI / 4;
const INITIAL_CAMERA_AZIMUTH = Math.PI / 4;

class App {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;
  private strataScene: StrataScene;
  private panel: ControlPanel;
  private container: HTMLElement;
  private animationId: number | null = null;

  constructor() {
    this.container = document.getElementById('canvas-container')!;
    this.scene = this.createScene();
    this.camera = this.createCamera();
    this.renderer = this.createRenderer();
    this.controls = this.createControls();
    this.strataScene = new StrataScene();
    this.panel = new ControlPanel();

    this.scene.add(this.strataScene.group);
    this.addLights();
    this.addGround();
    this.bindEvents();
    this.handleResize();
    this.setInitialCameraPosition();
  }

  private createScene(): THREE.Scene {
    const scene = new THREE.Scene();
    return scene;
  }

  private createCamera(): THREE.PerspectiveCamera {
    const aspect = window.innerWidth / window.innerHeight;
    const camera = new THREE.PerspectiveCamera(50, aspect, 0.1, 1000);
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
    this.container.appendChild(renderer.domElement);
    return renderer;
  }

  private createControls(): OrbitControls {
    const controls = new OrbitControls(this.camera, this.renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.minDistance = 2;
    controls.maxDistance = 15;
    controls.enablePan = false;
    controls.maxPolarAngle = Math.PI / 2 + 0.3;
    controls.minPolarAngle = 0.1;
    return controls;
  }

  private setInitialCameraPosition(): void {
    const x = INITIAL_CAMERA_DISTANCE * Math.sin(INITIAL_CAMERA_POLAR) * Math.cos(INITIAL_CAMERA_AZIMUTH);
    const y = INITIAL_CAMERA_DISTANCE * Math.cos(INITIAL_CAMERA_POLAR);
    const z = INITIAL_CAMERA_DISTANCE * Math.sin(INITIAL_CAMERA_POLAR) * Math.sin(INITIAL_CAMERA_AZIMUTH);
    this.camera.position.set(x, y, z);
    this.camera.lookAt(0, 0, 0);
    this.controls.update();
  }

  private addLights(): void {
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    this.scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 8, 5);
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

    const rimLight = new THREE.DirectionalLight(0x4fc3f7, 0.3);
    rimLight.position.set(-5, 3, -5);
    this.scene.add(rimLight);
  }

  private addGround(): void {
    const gridHelper = new THREE.GridHelper(20, 40, 0x333355, 0x222244);
    gridHelper.position.y = -5;
    this.scene.add(gridHelper);
  }

  private bindEvents(): void {
    window.addEventListener('resize', () => this.handleResize());

    window.addEventListener(PANEL_UPDATE_EVENT, ((e: CustomEvent<PanelValues>) => {
      const values = e.detail;
      this.strataScene.updateTransform({
        foldAmplitude: values.foldAmplitude,
        rotationX: values.rotationX,
        offsetZ: values.offsetZ
      });
    }) as EventListener);

    window.addEventListener(PANEL_RESET_EVENT, () => {
      this.resetCamera();
      this.strataScene.reset();
    });

    this.controls.addEventListener('change', () => {
      this.onCameraChange();
    });
  }

  private onCameraChange(): void {
    const pos = this.camera.position;
    void pos;
  }

  private resetCamera(): void {
    this.setInitialCameraPosition();
  }

  private handleResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  private animate = (): void => {
    this.animationId = requestAnimationFrame(this.animate);
    this.controls.update();
    this.strataScene.animate();
    this.renderer.render(this.scene, this.camera);
  };

  public start(): void {
    this.animate();
  }

  public dispose(): void {
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
    }
    this.controls.dispose();
    this.renderer.dispose();
  }
}

const app = new App();
app.start();
