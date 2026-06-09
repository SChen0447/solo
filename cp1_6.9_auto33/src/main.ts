import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { SculptureManager } from './SculptureManager';
import { SculptureGenerator, type SculptureData } from './SculptureGenerator';
import { InteractionController } from './InteractionController';

class App {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;
  private sculptureManager: SculptureManager;
  private sculptureGenerator: SculptureGenerator;
  private interactionController: InteractionController;
  private sculptures: SculptureData[] = [];
  private clock: THREE.Clock = new THREE.Clock();
  private sculptureNameEl: HTMLElement;
  private btnDisassemble: HTMLButtonElement;
  private btnAssemble: HTMLButtonElement;
  private btnReset: HTMLButtonElement;

  private readonly DEFAULT_CAMERA_POS = new THREE.Vector3(0, 12, 22);
  private readonly DEFAULT_CAMERA_TARGET = new THREE.Vector3(0, 2, 0);

  constructor() {
    this.sculptureNameEl = document.getElementById('sculptureName') as HTMLElement;
    this.btnDisassemble = document.getElementById('btnDisassemble') as HTMLButtonElement;
    this.btnAssemble = document.getElementById('btnAssemble') as HTMLButtonElement;
    this.btnReset = document.getElementById('btnReset') as HTMLButtonElement;

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(
      50,
      window.innerWidth / window.innerHeight,
      0.1,
      500
    );
    this.camera.position.copy(this.DEFAULT_CAMERA_POS);

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;

    document.getElementById('app')!.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.target.copy(this.DEFAULT_CAMERA_TARGET);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.minDistance = 6;
    this.controls.maxDistance = 60;
    this.controls.maxPolarAngle = Math.PI / 2 + 0.1;
    this.controls.minPolarAngle = 0.2;

    this.sculptureManager = new SculptureManager();
    this.sculptureGenerator = new SculptureGenerator();

    this.interactionController = new InteractionController(
      this.camera,
      this.scene,
      this.renderer.domElement
    );

    this.setupScene();
    this.setupLights();
    this.setupGround();
    this.setupSculptures();
    this.setupEvents();

    this.interactionController.setOnSculptureSelect((sculpture) => {
      this.updateUI(sculpture);
    });

    this.animate();
  }

  private setupScene(): void {
    const canvas = document.createElement('canvas');
    canvas.width = 2;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;
    const gradient = ctx.createLinearGradient(0, 0, 0, 512);
    gradient.addColorStop(0, '#87CEEB');
    gradient.addColorStop(1, '#1a3a5c');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 2, 512);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    this.scene.background = texture;
  }

  private setupLights(): void {
    const ambient = new THREE.AmbientLight(0xcccccc, 0.4);
    this.scene.add(ambient);

    const dirLightWarm = new THREE.DirectionalLight(0xFFD700, 0.6);
    dirLightWarm.position.set(-15, 15, 10);
    dirLightWarm.castShadow = true;
    dirLightWarm.shadow.mapSize.set(2048, 2048);
    dirLightWarm.shadow.camera.near = 0.5;
    dirLightWarm.shadow.camera.far = 60;
    dirLightWarm.shadow.camera.left = -30;
    dirLightWarm.shadow.camera.right = 30;
    dirLightWarm.shadow.camera.top = 30;
    dirLightWarm.shadow.camera.bottom = -30;
    dirLightWarm.shadow.bias = -0.0005;
    this.scene.add(dirLightWarm);

    const dirLightCool = new THREE.DirectionalLight(0x4A90D9, 0.6);
    dirLightCool.position.set(15, 12, -8);
    dirLightCool.castShadow = true;
    dirLightCool.shadow.mapSize.set(2048, 2048);
    dirLightCool.shadow.camera.near = 0.5;
    dirLightCool.shadow.camera.far = 60;
    dirLightCool.shadow.camera.left = -30;
    dirLightCool.shadow.camera.right = 30;
    dirLightCool.shadow.camera.top = 30;
    dirLightCool.shadow.camera.bottom = -30;
    dirLightCool.shadow.bias = -0.0005;
    this.scene.add(dirLightCool);
  }

  private setupGround(): void {
    const gridSize = 100;
    const gridDivisions = 20;

    const gridHelper = new THREE.GridHelper(gridSize, gridDivisions, 0x888888, 0xaaaaaa);
    (gridHelper.material as THREE.Material).transparent = true;
    (gridHelper.material as THREE.Material).opacity = 0.3;
    gridHelper.position.y = -0.01;
    this.scene.add(gridHelper);

    const groundGeo = new THREE.PlaneGeometry(gridSize, gridSize);
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0xd8d8d8,
      metalness: 0.3,
      roughness: 0.25,
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.02;
    ground.receiveShadow = true;
    this.scene.add(ground);
  }

  private setupSculptures(): void {
    const allConfigs = this.sculptureManager.getAllSculptures();
    const totalCount = allConfigs.length;

    allConfigs.forEach((config, index) => {
      const sculpture = this.sculptureGenerator.createSculpture(config, index, totalCount);
      this.scene.add(sculpture.group);
      this.sculptures.push(sculpture);
    });

    this.interactionController.setSculptures(this.sculptures);

    if (this.sculptures.length > 0) {
      this.interactionController.selectSculpture(this.sculptures[0]);
    }
  }

  private setupEvents(): void {
    window.addEventListener('resize', this.onResize.bind(this));
    this.renderer.domElement.addEventListener('pointerclick', (e) => {
      this.interactionController.handlePointerClick(e);
    });
    window.addEventListener('keydown', this.onKeyDown.bind(this));

    this.btnDisassemble.addEventListener('click', () => {
      this.interactionController.disassembleActive();
      this.updateButtonStates();
    });
    this.btnAssemble.addEventListener('click', () => {
      this.interactionController.assembleActive();
      this.updateButtonStates();
    });
    this.btnReset.addEventListener('click', () => {
      this.resetCamera();
    });
  }

  private onKeyDown(e: KeyboardEvent): void {
    if (e.code === 'Space') {
      e.preventDefault();
      this.interactionController.disassembleActive();
      this.updateButtonStates();
    } else if (e.code === 'Enter') {
      e.preventDefault();
      this.interactionController.assembleActive();
      this.updateButtonStates();
    } else if (e.code === 'KeyR') {
      e.preventDefault();
      this.resetCamera();
    } else if (e.code === 'Escape') {
      this.interactionController.clearSelection();
    }
  }

  private resetCamera(): void {
    const startPos = this.camera.position.clone();
    const startTarget = this.controls.target.clone();
    const startTime = performance.now();
    const duration = 800;

    const animateReset = () => {
      const elapsed = performance.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const t = progress < 0.5
        ? 4 * progress * progress * progress
        : 1 - Math.pow(-2 * progress + 2, 3) / 2;

      this.camera.position.lerpVectors(startPos, this.DEFAULT_CAMERA_POS, t);
      this.controls.target.lerpVectors(startTarget, this.DEFAULT_CAMERA_TARGET, t);
      this.controls.update();

      if (progress < 1) {
        requestAnimationFrame(animateReset);
      }
    };

    animateReset();
  }

  private onResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  private updateUI(sculpture: SculptureData | null): void {
    if (sculpture) {
      this.sculptureNameEl.textContent = sculpture.config.name;
    } else {
      this.sculptureNameEl.textContent = '虚拟雕塑园';
    }
    this.updateButtonStates();
  }

  private updateButtonStates(): void {
    const disassembled = this.interactionController.isActiveSculptureDisassembled();
    const hasSelection = this.interactionController.getActiveSculpture() !== null;

    this.btnDisassemble.classList.toggle('active', disassembled);
    this.btnDisassemble.classList.toggle('selected-active', hasSelection && !disassembled);
    this.btnAssemble.classList.toggle('selected-active', disassembled);
  }

  private animate = (): void => {
    requestAnimationFrame(this.animate);
    const time = performance.now();

    this.interactionController.update(time);

    const active = this.interactionController.getActiveSculpture();
    if (active && !active.isAnimating) {
      active.halo.rotation.z = time * 0.0003;
    }

    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  };
}

window.addEventListener('DOMContentLoaded', () => {
  new App();
});
