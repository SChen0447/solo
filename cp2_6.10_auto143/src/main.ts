import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { TerrainModel } from './terrainModel';
import { CrossSectionManager, CutMode } from './crossSection';

const INITIAL_CAMERA_POSITION = new THREE.Vector3(15, 12, 15);
const INITIAL_CAMERA_TARGET = new THREE.Vector3(0, 0, 0);

class App {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;

  private terrainModel: TerrainModel;
  private crossSection: CrossSectionManager;

  private canvasContainer: HTMLElement;
  private cutSlider: HTMLInputElement;
  private cutValue: HTMLElement;
  private resetBtn: HTMLButtonElement;
  private exportBtn: HTMLButtonElement;
  private mobileToggle: HTMLButtonElement;
  private sidePanel: HTMLElement;

  private cameraDirection: THREE.Vector3 = new THREE.Vector3();
  private lastFrameTime: number = 0;
  private lastLODCheck: number = 0;
  private readonly LOD_CHECK_INTERVAL: number = 500;

  constructor() {
    this.canvasContainer = document.getElementById('canvas-container')!;
    this.cutSlider = document.getElementById('cut-slider') as HTMLInputElement;
    this.cutValue = document.getElementById('cut-value')!;
    this.resetBtn = document.getElementById('reset-btn') as HTMLButtonElement;
    this.exportBtn = document.getElementById('export-btn') as HTMLButtonElement;
    this.mobileToggle = document.getElementById('mobile-toggle') as HTMLButtonElement;
    this.sidePanel = document.getElementById('side-panel')!;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x1a1a2e);

    this.camera = new THREE.PerspectiveCamera(
      60,
      this.canvasContainer.clientWidth / this.canvasContainer.clientHeight,
      0.1,
      1000
    );
    this.camera.position.copy(INITIAL_CAMERA_POSITION);

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      preserveDrawingBuffer: true
    });
    this.renderer.setSize(this.canvasContainer.clientWidth, this.canvasContainer.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.canvasContainer.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.target.copy(INITIAL_CAMERA_TARGET);
    this.controls.minDistance = 2;
    this.controls.maxDistance = 30;
    this.controls.mouseButtons = {
      LEFT: THREE.MOUSE.ROTATE,
      MIDDLE: THREE.MOUSE.DOLLY,
      RIGHT: THREE.MOUSE.PAN
    };

    this.setupLights();
    this.setupGridHelper();

    this.terrainModel = new TerrainModel({
      width: 20,
      depth: 20,
      segments: 64,
      layerCount: 4
    });
    this.scene.add(this.terrainModel.group);

    this.crossSection = new CrossSectionManager(this.terrainModel);
    this.scene.add(this.crossSection.group);

    this.bindEvents();
    this.animate();
  }

  private setupLights(): void {
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    this.scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(10, 15, 10);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    directionalLight.shadow.camera.near = 0.5;
    directionalLight.shadow.camera.far = 50;
    directionalLight.shadow.camera.left = -15;
    directionalLight.shadow.camera.right = 15;
    directionalLight.shadow.camera.top = 15;
    directionalLight.shadow.camera.bottom = -15;
    this.scene.add(directionalLight);

    const hemisphereLight = new THREE.HemisphereLight(0x87ceeb, 0x362d1f, 0.3);
    this.scene.add(hemisphereLight);
  }

  private setupGridHelper(): void {
    const gridHelper = new THREE.GridHelper(30, 30, 0x2a2a4a, 0x1e1e3a);
    gridHelper.position.y = -6.1;
    this.scene.add(gridHelper);
  }

  private bindEvents(): void {
    window.addEventListener('resize', () => this.onResize());

    this.cutSlider.addEventListener('input', (e) => {
      const value = parseFloat((e.target as HTMLInputElement).value);
      this.crossSection.setCutPosition(value);
      this.cutValue.textContent = value.toFixed(1);
    });

    document.querySelectorAll('input[name="cut-mode"]').forEach(radio => {
      radio.addEventListener('change', (e) => {
        const mode = (e.target as HTMLInputElement).value as CutMode;
        this.crossSection.setCutMode(mode);
      });
    });

    this.resetBtn.addEventListener('click', () => this.resetView());

    this.exportBtn.addEventListener('click', () => this.exportImage());

    this.mobileToggle.addEventListener('click', () => {
      const isVisible = this.sidePanel.style.display !== 'none';
      this.sidePanel.style.display = isVisible ? 'none' : 'flex';
    });

    this.setupCutPlaneDrag();
  }

  private setupCutPlaneDrag(): void {
    let isDragging = false;
    let previousY = 0;

    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    this.renderer.domElement.addEventListener('mousedown', (e) => {
      if (e.button !== 0) return;

      const rect = this.renderer.domElement.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, this.camera);
      const intersects = raycaster.intersectObject(this.crossSection.cutPlane);

      if (intersects.length > 0) {
        isDragging = true;
        previousY = e.clientY;
        this.controls.enabled = false;
      }
    });

    this.renderer.domElement.addEventListener('mousemove', (e) => {
      if (!isDragging) return;

      const deltaY = previousY - e.clientY;
      previousY = e.clientY;

      const sensitivity = 0.02;
      const currentPos = this.crossSection.getCutPosition();
      const newPos = THREE.MathUtils.clamp(currentPos + deltaY * sensitivity, -5, 5);

      this.crossSection.setCutPosition(newPos);
      this.cutSlider.value = newPos.toString();
      this.cutValue.textContent = newPos.toFixed(1);
    });

    this.renderer.domElement.addEventListener('mouseup', () => {
      isDragging = false;
      this.controls.enabled = true;
    });

    this.renderer.domElement.addEventListener('mouseleave', () => {
      isDragging = false;
      this.controls.enabled = true;
    });
  }

  private onResize(): void {
    const width = this.canvasContainer.clientWidth;
    const height = this.canvasContainer.clientHeight;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  private resetView(): void {
    this.camera.position.copy(INITIAL_CAMERA_POSITION);
    this.controls.target.copy(INITIAL_CAMERA_TARGET);
    this.controls.update();

    this.crossSection.reset();
    this.cutSlider.value = '0';
    this.cutValue.textContent = '0.0';

    document.querySelectorAll('input[name="cut-mode"]').forEach(radio => {
      (radio as HTMLInputElement).checked = (radio as HTMLInputElement).value === 'view';
    });
    this.crossSection.setCutMode('view');
  }

  private exportImage(): void {
    const exportWidth = 1280;
    const exportHeight = 720;

    const originalSize = new THREE.Vector2();
    const originalPixelRatio = this.renderer.getPixelRatio();
    this.renderer.getSize(originalSize);

    this.renderer.setPixelRatio(1);
    this.renderer.setSize(exportWidth, exportHeight, false);
    this.renderer.render(this.scene, this.camera);

    const dataURL = this.renderer.domElement.toDataURL('image/png');

    const link = document.createElement('a');
    link.download = `geological-section-${Date.now()}.png`;
    link.href = dataURL;
    link.click();

    this.renderer.setPixelRatio(originalPixelRatio);
    this.renderer.setSize(originalSize.x, originalSize.y, true);
  }

  private updateLOD(): void {
    const now = performance.now();
    if (now - this.lastLODCheck < this.LOD_CHECK_INTERVAL) return;

    this.lastLODCheck = now;

    const distance = this.camera.position.distanceTo(new THREE.Vector3(0, 0, 0));
    this.terrainModel.setVegetationLOD(distance);
  }

  private animate(): void {
    requestAnimationFrame(() => this.animate());

    const currentTime = performance.now();
    const delta = currentTime - this.lastFrameTime;
    this.lastFrameTime = currentTime;

    this.controls.update();

    this.camera.getWorldDirection(this.cameraDirection);
    this.crossSection.setCameraDirection(this.cameraDirection);

    this.crossSection.checkPendingUpdate();

    this.updateLOD();

    this.renderer.render(this.scene, this.camera);
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new App();
});
