import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { BrickManager } from './brickManager';
import { PanelManager } from './panel';
import { InteractionManager } from './interaction';
import { GRID_SIZE } from './types';

class App {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;
  private brickManager: BrickManager;
  private panelManager: PanelManager;
  private interactionManager: InteractionManager;

  constructor() {
    this.scene = new THREE.Scene();
    this.setupBackground();
    this.setupCamera();
    this.setupRenderer();
    this.setupLighting();
    this.setupGrid();
    this.setupControls();
    this.setupManagers();
    this.animate();
    this.onResize();
    window.addEventListener('resize', () => this.onResize());
  }

  private setupBackground(): void {
    const canvas = document.createElement('canvas');
    canvas.width = 2;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;
    const gradient = ctx.createLinearGradient(0, 0, 0, 512);
    gradient.addColorStop(0, '#E8E8E8');
    gradient.addColorStop(1, '#F5F5F5');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 2, 512);

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    this.scene.background = texture;
  }

  private setupCamera(): void {
    const container = document.getElementById('scene-container')!;
    this.camera = new THREE.PerspectiveCamera(
      45,
      container.clientWidth / container.clientHeight,
      0.1,
      1000
    );
    this.camera.position.set(12, 12, 12);
    this.camera.lookAt(0, 0, 0);
  }

  private setupRenderer(): void {
    const container = document.getElementById('scene-container')!;
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    container.appendChild(this.renderer.domElement);
  }

  private setupLighting(): void {
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    this.scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(10, 20, 10);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    directionalLight.shadow.camera.near = 0.5;
    directionalLight.shadow.camera.far = 100;
    directionalLight.shadow.camera.left = -15;
    directionalLight.shadow.camera.right = 15;
    directionalLight.shadow.camera.top = 15;
    directionalLight.shadow.camera.bottom = -15;
    directionalLight.shadow.bias = -0.0005;
    this.scene.add(directionalLight);

    const fillLight = new THREE.DirectionalLight(0xffffff, 0.3);
    fillLight.position.set(-10, 10, -10);
    this.scene.add(fillLight);
  }

  private setupGrid(): void {
    const gridHelper = new THREE.GridHelper(
      GRID_SIZE,
      GRID_SIZE,
      0xA0C4FF,
      0xA0C4FF
    );
    gridHelper.position.y = 0.01;
    const gridMaterial = gridHelper.material as THREE.Material;
    gridMaterial.transparent = true;
    gridMaterial.opacity = 0.5;
    this.scene.add(gridHelper);

    const baseGeometry = new THREE.PlaneGeometry(GRID_SIZE, GRID_SIZE);
    const baseMaterial = new THREE.MeshStandardMaterial({
      color: 0xFFFFFF,
      transparent: true,
      opacity: 0.15,
      side: THREE.DoubleSide
    });
    const basePlane = new THREE.Mesh(baseGeometry, baseMaterial);
    basePlane.rotation.x = -Math.PI / 2;
    basePlane.position.y = 0;
    basePlane.receiveShadow = true;
    this.scene.add(basePlane);
  }

  private setupControls(): void {
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.minDistance = 5;
    this.controls.maxDistance = 30;
    this.controls.maxPolarAngle = Math.PI / 2 - 0.05;
    this.controls.target.set(0, 0, 0);
    this.controls.update();
  }

  private setupManagers(): void {
    this.brickManager = new BrickManager(this.scene);
    this.panelManager = new PanelManager(this.brickManager);
    this.interactionManager = new InteractionManager(
      this.scene,
      this.camera,
      this.renderer,
      this.brickManager,
      this.panelManager
    );
  }

  private onResize(): void {
    const container = document.getElementById('scene-container')!;
    this.camera.aspect = container.clientWidth / container.clientHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(container.clientWidth, container.clientHeight);
  }

  private animate(): void {
    requestAnimationFrame(() => this.animate());
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }
}

new App();
