import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { Pane } from 'tweakpane';
import { OrbitSystem, type PlanetParams } from './orbitSystem';
import { WaveSystem } from './waveSystem';

class App {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;
  private orbitSystem: OrbitSystem;
  private waveSystem: WaveSystem;
  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;
  private clock: THREE.Clock;
  private pane: Pane;
  private params: PlanetParams;
  private hoveredLine: THREE.Line | null = null;
  private animationFrameId: number | null = null;
  private container: HTMLElement;

  constructor() {
    this.container = document.getElementById('app') || document.body;
    this.clock = new THREE.Clock();
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();

    this.params = {
      mass: 3,
      eccentricity: 0.3,
      rotationSpeed: 1,
    };

    this.scene = new THREE.Scene();
    this.camera = this.createCamera();
    this.renderer = this.createRenderer();
    this.controls = this.createControls();

    this.orbitSystem = new OrbitSystem(this.scene);
    this.waveSystem = new WaveSystem(this.scene);

    this.pane = this.createGUI();

    this.setupEventListeners();
    this.animate = this.animate.bind(this);
  }

  private createCamera(): THREE.PerspectiveCamera {
    const camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      2000
    );
    camera.position.set(0, 250, 400);
    return camera;
  }

  private createRenderer(): THREE.WebGLRenderer {
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    this.container.appendChild(renderer.domElement);
    return renderer;
  }

  private createControls(): OrbitControls {
    const controls = new OrbitControls(this.camera, this.renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.minDistance = 100;
    controls.maxDistance = 800;
    controls.enablePan = false;
    return controls;
  }

  private createGUI(): Pane {
    const pane = new Pane({
      title: '行星参数控制',
      container: this.container,
    });

    const containerElement = pane.element as HTMLElement;
    containerElement.style.position = 'fixed';
    containerElement.style.top = '20px';
    containerElement.style.right = '20px';
    containerElement.style.zIndex = '1000';

    const massInput = (pane as any).addBinding(this.params, 'mass', {
      label: '行星质量',
      min: 0.5,
      max: 10,
      step: 0.1,
    });

    const eccInput = (pane as any).addBinding(this.params, 'eccentricity', {
      label: '轨道偏心率',
      min: 0,
      max: 0.9,
      step: 0.05,
    });

    const rotInput = (pane as any).addBinding(this.params, 'rotationSpeed', {
      label: '自转速度',
      min: 0.1,
      max: 5,
      step: 0.1,
    });

    massInput.on('change', (ev: { value: number }) => {
      this.orbitSystem.updateParams({ mass: ev.value });
      this.waveSystem.updateParams({ mass: ev.value });
    });

    eccInput.on('change', (ev: { value: number }) => {
      this.orbitSystem.updateParams({ eccentricity: ev.value });
      this.waveSystem.updateParams({ eccentricity: ev.value });
    });

    rotInput.on('change', (ev: { value: number }) => {
      this.orbitSystem.updateParams({ rotationSpeed: ev.value });
      this.waveSystem.updateParams({ rotationSpeed: ev.value });
    });

    return pane;
  }

  private setupEventListeners(): void {
    window.addEventListener('resize', this.onWindowResize.bind(this));
    window.addEventListener('mousemove', this.onMouseMove.bind(this));
  }

  private onWindowResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  private onMouseMove(event: MouseEvent): void {
    this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    this.checkHover();
  }

  private checkHover(): void {
    this.raycaster.setFromCamera(this.mouse, this.camera);
    const orbitLines = this.orbitSystem.getOrbitLines();
    const intersects = this.raycaster.intersectObjects(orbitLines, false);

    if (intersects.length > 0) {
      const hoveredObject = intersects[0].object as THREE.Line;
      if (this.hoveredLine !== hoveredObject) {
        if (this.hoveredLine) {
          this.orbitSystem.highlightOrbit(this.hoveredLine, 0);
        }
        this.hoveredLine = hoveredObject;
        this.orbitSystem.highlightOrbit(this.hoveredLine, 1);
        document.body.style.cursor = 'pointer';
      }
    } else if (this.hoveredLine) {
      this.orbitSystem.highlightOrbit(this.hoveredLine, 0);
      this.hoveredLine = null;
      document.body.style.cursor = 'grab';
    }
  }

  private animate(): void {
    this.animationFrameId = requestAnimationFrame(this.animate);

    const deltaTime = this.clock.getDelta();
    const currentTime = performance.now();

    this.controls.update();

    this.orbitSystem.update(deltaTime);
    this.waveSystem.updateOrbitPoints(this.orbitSystem.getOrbitPoints());
    this.waveSystem.update(deltaTime, currentTime);

    this.renderer.render(this.scene, this.camera);
  }

  public start(): void {
    this.orbitSystem.updateParams(this.params);
    this.waveSystem.updateParams(this.params);
    this.animate();
  }

  public dispose(): void {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }

    window.removeEventListener('resize', this.onWindowResize.bind(this));
    window.removeEventListener('mousemove', this.onMouseMove.bind(this));

    this.orbitSystem.dispose();
    this.waveSystem.dispose();

    this.renderer.dispose();
    this.pane.dispose();

    this.controls.dispose();
  }
}

const app = new App();
app.start();
