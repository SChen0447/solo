import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GUI } from 'dat.gui';
import { CityGenerator } from './CityGenerator';
import { LightingController, PresetName, PRESET_NAMES } from './LightingController';

class App {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;
  private cityGenerator: CityGenerator;
  private lightingController: LightingController;
  private gui!: GUI;
  private container: HTMLElement;
  private isMobile: boolean;
  private frameId: number | null = null;

  private guiParams = {
    density: 60,
    maxHeight: 15,
    clustering: 0.3,
    regenerate: () => this.regenerateCity()
  };

  constructor() {
    this.container = document.getElementById('canvas-container')!;
    this.isMobile = window.innerWidth < 768;

    this.scene = new THREE.Scene();

    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.camera.position.set(80, 60, 80);

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    this.container.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.maxPolarAngle = Math.PI / 2.1;
    this.controls.minDistance = 30;
    this.controls.maxDistance = 200;
    this.controls.target.set(0, 5, 0);

    this.createGround();

    this.cityGenerator = new CityGenerator(this.scene);
    this.lightingController = new LightingController(this.scene);

    this.lightingController.setEmissiveCallback((intensity: number) => {
      this.cityGenerator.updateEmissiveIntensity(intensity);
    });

    this.setupGUI();
    this.setupUI();
    this.regenerateCity();

    window.addEventListener('resize', this.onResize.bind(this));

    this.animate = this.animate.bind(this);
    this.animate();
  }

  private createGround(): void {
    const groundGeometry = new THREE.PlaneGeometry(400, 400);
    const groundMaterial = new THREE.MeshStandardMaterial({
      color: 0x1A1A2E,
      roughness: 0.9,
      metalness: 0.1
    });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    this.scene.add(ground);

    const gridHelper = new THREE.GridHelper(400, 80, 0x2A2A4E, 0x222244);
    gridHelper.position.y = 0.01;
    (gridHelper.material as THREE.Material).transparent = true;
    (gridHelper.material as THREE.Material).opacity = 0.4;
    this.scene.add(gridHelper);
  }

  private setupGUI(): void {
    this.gui = new GUI();
    this.gui.domElement.classList.add('custom-dat-gui');
    const titleEl = this.gui.domElement.querySelector('.title');
    if (titleEl) {
      titleEl.textContent = '城市参数';
    }

    this.gui.add(this.guiParams, 'density', 30, 100)
      .name('建筑密度 (%)')
      .onChange(() => this.onCityParamChange());

    this.gui.add(this.guiParams, 'maxHeight', 5, 30)
      .name('最大高度')
      .onChange(() => this.onCityParamChange());

    this.gui.add(this.guiParams, 'clustering', 0, 1)
      .name('群聚程度')
      .step(0.05)
      .onChange(() => this.onCityParamChange());

    this.gui.add(this.guiParams, 'regenerate')
      .name('重新生成');
  }

  private setupUI(): void {
    const presetButtons = document.querySelectorAll('.preset-btn');
    presetButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const target = e.currentTarget as HTMLElement;
        const preset = target.dataset.preset as PresetName;
        this.setPreset(preset);
      });
    });

    const drawerToggle = document.getElementById('drawer-toggle');
    if (drawerToggle) {
      const guiContainer = document.querySelector('.dg.ac');
      drawerToggle.addEventListener('click', () => {
        guiContainer?.classList.toggle('open');
      });
    }

    this.updateToolbarDisplay();
  }

  private setPreset(preset: PresetName): void {
    this.lightingController.setPreset(preset);

    const buttons = document.querySelectorAll('.preset-btn');
    buttons.forEach(btn => {
      const btnEl = btn as HTMLElement;
      if (btnEl.dataset.preset === preset) {
        btnEl.classList.add('active');
      } else {
        btnEl.classList.remove('active');
      }
    });

    this.updateToolbarDisplay();
  }

  private onCityParamChange(): void {
    const gridSize = this.isMobile ? 15 : 20;
    this.cityGenerator.setParams({
      density: this.guiParams.density,
      maxHeight: this.guiParams.maxHeight,
      clustering: this.guiParams.clustering,
      gridSize: gridSize
    });
    this.updateToolbarDisplay();
  }

  private regenerateCity(): void {
    const gridSize = this.isMobile ? 15 : 20;
    this.cityGenerator.setParams({
      density: this.guiParams.density,
      maxHeight: this.guiParams.maxHeight,
      clustering: this.guiParams.clustering,
      gridSize: gridSize
    });
    this.updateToolbarDisplay();
  }

  private updateToolbarDisplay(): void {
    const presetNameEl = document.getElementById('preset-name');
    const densityEl = document.getElementById('param-density');
    const heightEl = document.getElementById('param-height');
    const clusteringEl = document.getElementById('param-clustering');

    if (presetNameEl) {
      presetNameEl.textContent = this.lightingController.getPresetDisplayName();
    }
    if (densityEl) {
      densityEl.textContent = `${Math.round(this.guiParams.density)}%`;
    }
    if (heightEl) {
      heightEl.textContent = Math.round(this.guiParams.maxHeight).toString();
    }
    if (clusteringEl) {
      clusteringEl.textContent = this.guiParams.clustering.toFixed(2);
    }
  }

  private onResize(): void {
    const width = window.innerWidth;
    const height = window.innerHeight;
    const wasMobile = this.isMobile;
    this.isMobile = width < 768;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);

    if (wasMobile !== this.isMobile) {
      this.regenerateCity();
    }
  }

  private animate(): void {
    this.frameId = requestAnimationFrame(this.animate);

    const now = performance.now();

    this.controls.update();
    this.cityGenerator.animate(now);
    this.lightingController.update(now);

    this.renderer.render(this.scene, this.camera);
  }

  public dispose(): void {
    if (this.frameId !== null) {
      cancelAnimationFrame(this.frameId);
    }
    window.removeEventListener('resize', this.onResize.bind(this));
    this.gui.destroy();
    this.controls.dispose();
    this.renderer.dispose();
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new App();
});
