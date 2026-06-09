import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { CrystalGrowthSystem } from './crystalGrowth';
import { ParticleSystem, createIceGround } from './particleSystem';
import { UIControl, type UIParams } from './uiControl';

class SnowflakeSimulation {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;
  private crystalSystem: CrystalGrowthSystem;
  private particleSystem: ParticleSystem;
  private uiControl: UIControl;
  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;
  private clock: THREE.Clock;
  private container: HTMLElement;

  constructor() {
    this.container = document.getElementById('scene-container') as HTMLElement;
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    this.clock = new THREE.Clock();

    this.scene = this.createScene();
    this.camera = this.createCamera();
    this.renderer = this.createRenderer();
    this.controls = this.createControls();
    this.setupLighting();

    createIceGround(this.scene);

    this.crystalSystem = new CrystalGrowthSystem(this.scene);
    this.particleSystem = new ParticleSystem(this.scene);
    this.uiControl = new UIControl();

    this.init();
  }

  private createScene(): THREE.Scene {
    const scene = new THREE.Scene();
    return scene;
  }

  private createCamera(): THREE.PerspectiveCamera {
    const camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    camera.position.set(8, 8, 12);
    return camera;
  }

  private createRenderer(): THREE.WebGLRenderer {
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    this.container.appendChild(renderer.domElement);
    return renderer;
  }

  private createControls(): OrbitControls {
    const controls = new OrbitControls(this.camera, this.renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.1;
    controls.minDistance = 10;
    controls.maxDistance = 25;
    controls.target.set(0, 1, 0);
    controls.enablePan = false;
    return controls;
  }

  private setupLighting(): void {
    const ambientLight = new THREE.AmbientLight(0x6688aa, 0.6);
    this.scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
    directionalLight.position.set(5, 10, 5);
    this.scene.add(directionalLight);

    const fillLight = new THREE.DirectionalLight(0xaaccff, 0.4);
    fillLight.position.set(-5, 3, -5);
    this.scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0xddeeff, 0.3);
    rimLight.position.set(0, 5, -8);
    this.scene.add(rimLight);
  }

  private init(): void {
    this.crystalSystem.init();
    this.particleSystem.init();

    this.uiControl.init((params: UIParams) => {
      this.handleParamChange(params);
    });

    const initialParams = this.uiControl.getParams();
    this.crystalSystem.setTemperature(initialParams.temperature);
    this.crystalSystem.setHumidity(initialParams.humidity);
    this.particleSystem.setTemperature(initialParams.temperature);

    this.bindEvents();
    this.animate();
  }

  private handleParamChange(params: UIParams): void {
    this.crystalSystem.setTemperature(params.temperature);
    this.crystalSystem.setHumidity(params.humidity);
    this.particleSystem.setTemperature(params.temperature);
  }

  private bindEvents(): void {
    window.addEventListener('resize', () => this.onResize());
    this.renderer.domElement.addEventListener('click', (e) => this.onClick(e));
  }

  private onResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  private onClick(event: MouseEvent): void {
    this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);
    const branchMeshes = this.crystalSystem.getBranchMeshes();
    const intersects = this.raycaster.intersectObjects(branchMeshes);

    if (intersects.length > 0) {
      const mesh = intersects[0].object as THREE.Mesh;
      const branchId = mesh.userData.branchId as number;

      if (branchId !== undefined) {
        this.crystalSystem.highlightBranch(branchId);
        const info = this.crystalSystem.getBranchInfo(branchId);
        if (info) {
          this.uiControl.showBranchInfo(info);
        }
      }
    } else {
      this.crystalSystem.highlightBranch(null);
      this.uiControl.hideBranchInfo();
    }
  }

  private animate = (): void => {
    requestAnimationFrame(this.animate);

    const elapsedTime = this.clock.getElapsedTime();

    this.crystalSystem.update();
    this.particleSystem.update(elapsedTime);
    this.controls.update();

    this.uiControl.updateStats(
      this.crystalSystem.getTotalBranches(),
      this.crystalSystem.getAverageGrowthRate()
    );

    this.renderer.render(this.scene, this.camera);
  };
}

window.addEventListener('DOMContentLoaded', () => {
  new SnowflakeSimulation();
});
