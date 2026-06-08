import * as THREE from 'three';
import { PlantSimulator } from './PlantSimulator';
import { UIPanel } from './UIPanel';

export class MainApp {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private plantSimulator: PlantSimulator;
  private uiPanel: UIPanel;
  private container: HTMLElement;
  private isDragging: boolean = false;
  private previousMouseX: number = 0;
  private cameraAngle: number = 0.5;
  private targetCameraAngle: number = 0.5;
  private cameraDistance: number = 12;
  private targetCameraDistance: number = 12;
  private cameraHeight: number = 4;
  private targetCameraHeight: number = 4;
  private clock: THREE.Clock;
  private animationId: number = 0;

  constructor(containerId: string) {
    this.container = document.getElementById(containerId) || document.body;
    this.clock = new THREE.Clock();

    this.scene = new THREE.Scene();
    this.scene.background = null;

    this.camera = new THREE.PerspectiveCamera(
      45,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;
    this.container.appendChild(this.renderer.domElement);

    this.setupLighting();
    this.setupGround();

    this.plantSimulator = new PlantSimulator(this.scene);

    this.uiPanel = new UIPanel({
      onLightChange: (value: number) => this.plantSimulator.setLight(value),
      onWaterChange: (value: number) => this.plantSimulator.setWater(value),
      onTemperatureChange: (value: number) => this.plantSimulator.setTemperature(value)
    });

    this.setupCameraControls();
    this.updateCameraPosition();

    window.addEventListener('resize', this.onWindowResize.bind(this));

    this.animate();

    setTimeout(() => {
      const loading = document.getElementById('loading');
      if (loading) {
        loading.classList.add('hidden');
      }
    }, 800);
  }

  private setupLighting(): void {
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    this.scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.2);
    directionalLight.position.set(5, 10, 5);
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

    const fillLight = new THREE.DirectionalLight(0xaaccff, 0.3);
    fillLight.position.set(-5, 3, -5);
    this.scene.add(fillLight);
  }

  private setupGround(): void {
    const soilGeometry = new THREE.CylinderGeometry(6, 6.5, 1, 64);
    const soilMaterial = new THREE.MeshStandardMaterial({
      color: 0x5d4037,
      roughness: 0.9,
      metalness: 0.1
    });
    const soil = new THREE.Mesh(soilGeometry, soilMaterial);
    soil.position.y = -0.5;
    soil.receiveShadow = true;
    this.scene.add(soil);

    const soilTopGeometry = new THREE.CircleGeometry(6, 64);
    const soilTopMaterial = new THREE.MeshStandardMaterial({
      color: 0x6d4c41,
      roughness: 0.95
    });
    const soilTop = new THREE.Mesh(soilTopGeometry, soilTopMaterial);
    soilTop.rotation.x = -Math.PI / 2;
    soilTop.position.y = 0.01;
    soilTop.receiveShadow = true;
    this.scene.add(soilTop);
  }

  private setupCameraControls(): void {
    const canvas = this.renderer.domElement;

    canvas.addEventListener('mousedown', (e) => {
      this.isDragging = true;
      this.previousMouseX = e.clientX;
    });

    window.addEventListener('mousemove', (e) => {
      if (!this.isDragging) return;
      const deltaX = e.clientX - this.previousMouseX;
      this.targetCameraAngle -= deltaX * 0.005;
      this.previousMouseX = e.clientX;
    });

    window.addEventListener('mouseup', () => {
      this.isDragging = false;
    });

    canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      const zoomSpeed = 0.003;
      this.targetCameraDistance += e.deltaY * zoomSpeed;
      this.targetCameraDistance = Math.max(5, Math.min(25, this.targetCameraDistance));
      this.targetCameraHeight = 2 + (this.targetCameraDistance - 5) * 0.3;
    }, { passive: false });

    canvas.addEventListener('touchstart', (e) => {
      if (e.touches.length === 1) {
        this.isDragging = true;
        this.previousMouseX = e.touches[0].clientX;
      }
    });

    canvas.addEventListener('touchmove', (e) => {
      if (!this.isDragging || e.touches.length !== 1) return;
      const deltaX = e.touches[0].clientX - this.previousMouseX;
      this.targetCameraAngle -= deltaX * 0.005;
      this.previousMouseX = e.touches[0].clientX;
    });

    canvas.addEventListener('touchend', () => {
      this.isDragging = false;
    });
  }

  private easeOut(t: number): number {
    return 1 - Math.pow(1 - t, 3);
  }

  private updateCameraPosition(): void {
    this.cameraAngle += (this.targetCameraAngle - this.cameraAngle) * 0.08;
    this.cameraDistance += (this.targetCameraDistance - this.cameraDistance) * 0.08;
    this.cameraHeight += (this.targetCameraHeight - this.cameraHeight) * 0.08;

    const x = Math.sin(this.cameraAngle) * this.cameraDistance;
    const z = Math.cos(this.cameraAngle) * this.cameraDistance;

    this.camera.position.set(x, this.cameraHeight, z);
    this.camera.lookAt(0, 2.5, 0);
  }

  private onWindowResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  private animate(): void {
    this.animationId = requestAnimationFrame(this.animate.bind(this));

    const delta = this.clock.getDelta();
    const time = this.clock.getElapsedTime();

    this.updateCameraPosition();
    this.plantSimulator.update(delta, time);

    this.renderer.render(this.scene, this.camera);
  }

  public dispose(): void {
    cancelAnimationFrame(this.animationId);
    this.renderer.dispose();
    this.plantSimulator.dispose();
    window.removeEventListener('resize', this.onWindowResize.bind(this));
  }
}

new MainApp('app');
