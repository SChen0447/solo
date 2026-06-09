import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { PlantManager } from './PlantManager';
import { LightController } from './LightController';
import { ControlPanel, ControlPanelState } from './ControlPanel';

class App {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;
  private plantManager: PlantManager;
  private lightController: LightController;
  private controlPanel: ControlPanel;
  private clock: THREE.Clock;
  private animationId: number;

  constructor() {
    this.scene = new THREE.Scene();
    this.clock = new THREE.Clock();
    this.animationId = 0;

    this.initRenderer();
    this.initCamera();
    this.initControls();
    this.initSceneLighting();
    this.initGround();

    this.plantManager = new PlantManager(this.scene);
    this.lightController = new LightController(this.scene, this.renderer, this.camera);

    const initialState: ControlPanelState = {
      lightX: 8,
      lightY: 20,
      lightZ: 5,
      intensity: 1.5,
      growthSpeed: 1.0
    };

    this.controlPanel = new ControlPanel(
      'controls-container',
      initialState,
      this.onControlChange.bind(this),
      this.onReset.bind(this)
    );

    this.lightController.setPosition(
      initialState.lightX,
      initialState.lightY,
      initialState.lightZ
    );
    this.lightController.setIntensity(initialState.intensity);

    window.addEventListener('resize', this.onResize.bind(this));

    this.animate();
  }

  private initRenderer() {
    const container = document.getElementById('canvas-container');
    if (!container) {
      throw new Error('Canvas container not found');
    }

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    container.appendChild(this.renderer.domElement);
  }

  private initCamera() {
    const container = document.getElementById('canvas-container');
    const width = container ? container.clientWidth : window.innerWidth * 0.85;
    const height = container ? container.clientHeight : window.innerHeight;

    this.camera = new THREE.PerspectiveCamera(
      50,
      width / height,
      0.1,
      1000
    );
    this.camera.position.set(25, 35, 35);
    this.camera.lookAt(0, 30, 0);
  }

  private initControls() {
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.target.set(0, 30, 0);
    this.controls.minDistance = 15;
    this.controls.maxDistance = 100;
    this.controls.maxPolarAngle = Math.PI / 2 + 0.1;
    this.controls.update();
  }

  private initSceneLighting() {
    const ambientLight = new THREE.AmbientLight(0x404060, 0.4);
    this.scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.3);
    directionalLight.position.set(-10, 20, -10);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    directionalLight.shadow.camera.near = 0.5;
    directionalLight.shadow.camera.far = 100;
    directionalLight.shadow.camera.left = -50;
    directionalLight.shadow.camera.right = 50;
    directionalLight.shadow.camera.top = 50;
    directionalLight.shadow.camera.bottom = -50;
    this.scene.add(directionalLight);
  }

  private initGround() {
    const groundGeometry = new THREE.CircleGeometry(40, 64);
    const groundMaterial = new THREE.MeshStandardMaterial({
      color: 0x1a3a1a,
      roughness: 0.9,
      metalness: 0.0,
      transparent: true,
      opacity: 0.6
    });

    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.01;
    ground.receiveShadow = true;
    this.scene.add(ground);

    const gridHelper = new THREE.GridHelper(80, 40, 0x334455, 0x223344);
    (gridHelper.material as THREE.Material).transparent = true;
    (gridHelper.material as THREE.Material).opacity = 0.3;
    this.scene.add(gridHelper);
  }

  private onControlChange(state: ControlPanelState) {
    this.lightController.setPosition(state.lightX, state.lightY, state.lightZ);
    this.lightController.setIntensity(state.intensity);
  }

  private onReset() {
    this.plantManager.resetPlant();
  }

  private onResize() {
    const container = document.getElementById('canvas-container');
    if (!container) return;

    const width = container.clientWidth;
    const height = container.clientHeight;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();

    this.renderer.setSize(width, height);
    this.lightController.onResize();
  }

  private animate() {
    this.animationId = requestAnimationFrame(this.animate.bind(this));

    const deltaTime = Math.min(this.clock.getDelta(), 0.1);

    this.controls.update();
    this.lightController.update(deltaTime);

    const state = this.controlPanel.getState();
    const lightPos = this.lightController.getLightPosition();

    this.plantManager.updateDirection(
      lightPos,
      state.intensity,
      state.growthSpeed,
      deltaTime
    );

    this.lightController.render();
  }

  public dispose() {
    cancelAnimationFrame(this.animationId);
    window.removeEventListener('resize', this.onResize.bind(this));
    this.plantManager.dispose();
    this.lightController.dispose();
    this.controls.dispose();
    this.renderer.dispose();
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new App();
});
