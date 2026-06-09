import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { Nebula, ColorTheme } from './nebula';
import { Organism } from './organism';

class App {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;
  private container: HTMLElement;

  private nebula: Nebula;
  private organism: Organism;

  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;

  private frameCount: number = 0;
  private lastFpsCheck: number = 0;
  private currentFps: number = 60;
  private fpsReduced: boolean = false;

  private colorButtons: NodeListOf<HTMLButtonElement>;
  private pulseSlider: HTMLInputElement;
  private pulseValue: HTMLElement;

  private lastTime: number = 0;

  constructor() {
    this.container = document.getElementById('canvas-container') as HTMLElement;
    this.colorButtons = document.querySelectorAll('.color-btn');
    this.pulseSlider = document.getElementById('pulse-slider') as HTMLInputElement;
    this.pulseValue = document.getElementById('pulse-value') as HTMLElement;

    this.scene = this.createScene();
    this.camera = this.createCamera();
    this.renderer = this.createRenderer();
    this.controls = this.createControls();

    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();

    this.setupLights();
    this.setupBoundaries();

    this.nebula = new Nebula();
    this.organism = new Organism();

    this.scene.add(this.nebula.points);
    this.scene.add(this.organism.group);

    this.bindEvents();
    this.updateActiveThemeButton();
    this.updatePulseValue(parseFloat(this.pulseSlider.value));

    this.lastTime = performance.now();
    this.lastFpsCheck = this.lastTime;
    this.animate(this.lastTime);
  }

  private createScene(): THREE.Scene {
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000);
    return scene;
  }

  private createCamera(): THREE.PerspectiveCamera {
    const camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    camera.position.set(0, 5, 12);
    camera.lookAt(0, 0, 0);
    return camera;
  }

  private createRenderer(): THREE.WebGLRenderer {
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    this.container.appendChild(renderer.domElement);
    return renderer;
  }

  private createControls(): OrbitControls {
    const controls = new OrbitControls(this.camera, this.renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.1;
    controls.enablePan = false;
    controls.minDistance = 3;
    controls.maxDistance = 30;
    controls.zoomSpeed = 0.8;
    controls.rotateSpeed = 0.6;
    controls.target.set(0, 0, 0);
    return controls;
  }

  private setupLights(): void {
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.2);
    this.scene.add(ambientLight);

    const dirLight1 = new THREE.DirectionalLight(0xffffff, 0.5);
    dirLight1.position.set(-5, 8, 5);
    this.scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0xffffff, 0.3);
    dirLight2.position.set(5, -5, -8);
    this.scene.add(dirLight2);
  }

  private setupBoundaries(): void {
    const boundaryGeo = new THREE.BoxGeometry(80, 80, 80);
    const boundaryMat = new THREE.MeshBasicMaterial({
      color: 0x000000,
      side: THREE.BackSide,
      transparent: true,
      opacity: 0,
    });
    const boundary = new THREE.Mesh(boundaryGeo, boundaryMat);
    this.scene.add(boundary);
  }

  private bindEvents(): void {
    window.addEventListener('resize', this.onResize.bind(this));
    window.addEventListener('keydown', this.onKeyDown.bind(this));
    this.renderer.domElement.addEventListener('click', this.onClick.bind(this));
    this.renderer.domElement.addEventListener('mousemove', this.onMouseMove.bind(this));

    this.colorButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        const theme = btn.dataset.theme as ColorTheme;
        if (theme) {
          this.setTheme(theme);
        }
      });
    });

    this.pulseSlider.addEventListener('input', (e) => {
      const value = parseFloat((e.target as HTMLInputElement).value);
      this.updatePulseValue(value);
      this.organism.setPulseIntensity(value);
    });
  }

  private setTheme(theme: ColorTheme): void {
    this.nebula.setTheme(theme);
    this.updateActiveThemeButton();
  }

  private updateActiveThemeButton(): void {
    const currentTheme = this.nebula.getCurrentTheme();
    this.colorButtons.forEach((btn) => {
      if (btn.dataset.theme === currentTheme) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });
  }

  private updatePulseValue(value: number): void {
    this.pulseValue.textContent = value.toFixed(1);
  }

  private onResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  private onKeyDown(e: KeyboardEvent): void {
    switch (e.key) {
      case '1':
        this.setTheme('purple');
        break;
      case '2':
        this.setTheme('blue');
        break;
      case '3':
        this.setTheme('red');
        break;
    }
  }

  private updateMouse(clientX: number, clientY: number): void {
    this.mouse.x = (clientX / window.innerWidth) * 2 - 1;
    this.mouse.y = -(clientY / window.innerHeight) * 2 + 1;
  }

  private onClick(e: MouseEvent): void {
    this.updateMouse(e.clientX, e.clientY);
    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObject(this.organism.mesh, false);
    if (intersects.length > 0) {
      this.triggerOrganismReaction();
    }
  }

  private onMouseMove(e: MouseEvent): void {
    this.updateMouse(e.clientX, e.clientY);
    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObject(this.organism.mesh, false);
    if (intersects.length > 0) {
      this.renderer.domElement.style.cursor = 'crosshair';
    } else {
      this.renderer.domElement.style.cursor = 'default';
    }
  }

  private triggerOrganismReaction(): void {
    this.organism.triggerReaction();
    this.nebula.triggerShockwave();
  }

  private checkFps(currentTime: number): void {
    this.frameCount++;
    if (currentTime - this.lastFpsCheck >= 1000) {
      this.currentFps = this.frameCount;
      this.frameCount = 0;
      this.lastFpsCheck = currentTime;

      if (this.currentFps < 30 && !this.fpsReduced) {
        this.nebula.setParticleSizeMultiplier(0.8);
        this.fpsReduced = true;
      } else if (this.currentFps >= 45 && this.fpsReduced) {
        this.nebula.setParticleSizeMultiplier(1);
        this.fpsReduced = false;
      }
    }
  }

  private animate(currentTime: number): void {
    requestAnimationFrame(this.animate.bind(this));

    const deltaTime = currentTime - this.lastTime;
    this.lastTime = currentTime;

    this.controls.update();
    this.nebula.update(currentTime, deltaTime);
    this.organism.update(currentTime, deltaTime);

    this.checkFps(currentTime);

    this.renderer.render(this.scene, this.camera);
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new App();
});
