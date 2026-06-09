import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import * as TWEEN from '@tweenjs/tween.js';
import { GUI } from 'dat.gui';
import { generateOrbitParticles, ParticleData, DisplayMode } from './orbitGenerator';
import { ParticleSystem } from './particleSystem';

interface AppState {
  n: number;
  l: number;
  m: number;
  particleCount: number;
  particleSize: number;
  opacity: number;
  displayMode: DisplayMode;
  autoRotate: boolean;
  wireframe: boolean;
}

class App {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;
  private particleSystem: ParticleSystem;
  private state: AppState;
  private gui: GUI;
  private container: HTMLElement;
  private orbitGroup: THREE.Group;
  private isAnimating: boolean = false;
  private clock: THREE.Clock;
  private animationTween: TWEEN.Tween<{ t: number }> | null = null;

  constructor() {
    this.clock = new THREE.Clock();
    this.state = {
      n: 1,
      l: 0,
      m: 0,
      particleCount: 5000,
      particleSize: 1.0,
      opacity: 0.8,
      displayMode: 'pointcloud',
      autoRotate: false,
      wireframe: false
    };

    this.container = document.getElementById('canvas-container')!;
    this.scene = this.createScene();
    this.camera = this.createCamera();
    this.renderer = this.createRenderer();
    this.controls = this.createControls();
    this.orbitGroup = new THREE.Group();
    this.scene.add(this.orbitGroup);

    this.particleSystem = new ParticleSystem(this.orbitGroup, this.state.particleCount);
    this.particleSystem.createOrUpdate();
    this.particleSystem.setBaseSize(this.state.particleSize);
    this.particleSystem.setOpacity(this.state.opacity);

    this.addEnvironment();
    this.gui = this.createGUI();
    this.setupEventListeners();
    this.updateOrbit(true);

    this.animate();
  }

  private createScene(): THREE.Scene {
    const scene = new THREE.Scene();

    const canvas = document.createElement('canvas');
    canvas.width = 2;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;
    const gradient = ctx.createLinearGradient(0, 0, 0, 512);
    gradient.addColorStop(0, '#0A0A1A');
    gradient.addColorStop(1, '#1A1A3A');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 2, 512);
    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    scene.background = texture;

    scene.fog = new THREE.FogExp2(0x0A0A1A, 0.02);
    return scene;
  }

  private createCamera(): THREE.PerspectiveCamera {
    const camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    camera.position.set(0, 3, 10);
    camera.lookAt(0, 0, 0);
    return camera;
  }

  private createRenderer(): THREE.WebGLRenderer {
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance'
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    this.container.appendChild(renderer.domElement);
    return renderer;
  }

  private createControls(): OrbitControls {
    const controls = new OrbitControls(this.camera, this.renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.minDistance = 2;
    controls.maxDistance = 30;
    controls.autoRotateSpeed = 30;
    return controls;
  }

  private addEnvironment(): void {
    const gridHelper = new THREE.GridHelper(20, 20, 0x3344AA, 0x3344AA);
    const gridMaterial = gridHelper.material as THREE.Material;
    gridMaterial.transparent = true;
    gridMaterial.opacity = 0.1;
    gridHelper.position.y = -4;
    this.scene.add(gridHelper);

    const axesHelper = new THREE.AxesHelper(2);
    (axesHelper.material as THREE.Material).opacity = 0.4;
    (axesHelper.material as THREE.Material).transparent = true;
    this.scene.add(axesHelper);

    const ambientLight = new THREE.AmbientLight(0x404060, 0.6);
    this.scene.add(ambientLight);

    const pointLight1 = new THREE.PointLight(0x8888FF, 0.8, 50);
    pointLight1.position.set(5, 5, 5);
    this.scene.add(pointLight1);

    const pointLight2 = new THREE.PointLight(0xFF8888, 0.5, 50);
    pointLight2.position.set(-5, 3, -5);
    this.scene.add(pointLight2);
  }

  private createGUI(): GUI {
    const gui = new GUI({ width: 320 });
    gui.domElement.style.marginTop = '20px';
    gui.domElement.style.marginRight = '20px';

    const quantumFolder = gui.addFolder('量子数 Quantum Numbers');
    quantumFolder.open();

    const nController = quantumFolder
      .add(this.state, 'n', 1, 4, 1)
      .name('主量子数 n')
      .onChange(() => {
        this.state.l = Math.min(this.state.l, this.state.n - 1);
        this.state.m = Math.min(Math.max(this.state.m, -this.state.l), this.state.l);
        lController.max(this.state.n - 1).updateDisplay();
        mController.min(-this.state.l).max(this.state.l).updateDisplay();
        this.updateOrbit();
      });

    const lController = quantumFolder
      .add(this.state, 'l', 0, this.state.n - 1, 1)
      .name('角量子数 l')
      .onChange(() => {
        this.state.m = Math.min(Math.max(this.state.m, -this.state.l), this.state.l);
        mController.min(-this.state.l).max(this.state.l).updateDisplay();
        this.updateOrbit();
      });

    const mController = quantumFolder
      .add(this.state, 'm', -this.state.l, this.state.l, 1)
      .name('磁量子数 m')
      .onChange(() => {
        this.updateOrbit();
      });

    const particleFolder = gui.addFolder('粒子设置 Particles');
    particleFolder.open();

    particleFolder
      .add(this.state, 'particleCount', 1000, 8000, 500)
      .name('粒子数量')
      .onFinishChange(() => {
        this.recreateParticleSystem();
      });

    particleFolder
      .add(this.state, 'particleSize', 0.2, 3.0, 0.1)
      .name('粒子大小')
      .onChange((value: number) => {
        this.particleSystem.setBaseSize(value);
      });

    particleFolder
      .add(this.state, 'opacity', 0.1, 1.0, 0.05)
      .name('透明度')
      .onChange((value: number) => {
        this.particleSystem.setOpacity(value);
      });

    const displayFolder = gui.addFolder('显示模式 Display Mode');
    displayFolder.open();

    displayFolder
      .add(this.state, 'displayMode', {
        '点云模式 Point Cloud': 'pointcloud',
        '密度模式 Density': 'density',
        '切面模式 Slice': 'slice'
      } as Record<string, DisplayMode>)
      .name('显示模式')
      .onChange((mode: DisplayMode) => {
        this.particleSystem.setDisplayMode(mode);
      });

    displayFolder
      .add(this.state, 'autoRotate')
      .name('自动旋转')
      .onChange((value: boolean) => {
        this.controls.autoRotate = value;
      });

    displayFolder
      .add(this.state, 'wireframe')
      .name('线框模式 (W)')
      .onChange(() => {
        this.particleSystem.toggleWireframe();
      });

    return gui;
  }

  private recreateParticleSystem(): void {
    this.particleSystem.dispose();
    this.particleSystem = new ParticleSystem(this.orbitGroup, this.state.particleCount);
    this.particleSystem.createOrUpdate();
    this.particleSystem.setBaseSize(this.state.particleSize);
    this.particleSystem.setOpacity(this.state.opacity);
    this.particleSystem.setDisplayMode(this.state.displayMode);
    this.updateOrbit(true);
  }

  private updateOrbit(immediate: boolean = false): void {
    const t0 = performance.now();

    const particles: ParticleData[] = generateOrbitParticles({
      n: this.state.n,
      l: this.state.l,
      m: this.state.m,
      particleCount: this.state.particleCount
    });

    this.particleSystem.updateData(particles, this.state.l);

    if (!immediate && this.animationTween) {
      this.animationTween.stop();
    }

    if (immediate) {
      const target = this.particleSystem.getTargetPositions();
      if (target) {
        this.particleSystem.setPositions(target);
      }
    } else {
      this.animatePositions();
    }

    const t1 = performance.now();
    console.log(`Orbit recalculation took ${(t1 - t0).toFixed(1)}ms`);
  }

  private animatePositions(): void {
    const current = this.particleSystem.getCurrentPositions();
    const target = this.particleSystem.getTargetPositions();

    if (!current || !target) return;

    this.isAnimating = true;
    const animState = { t: 0 };
    const tempPositions = new Float32Array(current.length);

    this.animationTween = new TWEEN.Tween(animState)
      .to({ t: 1 }, 500)
      .easing(TWEEN.Easing.Quadratic.Out)
      .onUpdate(() => {
        const t = animState.t;
        for (let i = 0; i < current.length; i++) {
          tempPositions[i] = current[i] + (target[i] - current[i]) * t;
        }
        this.particleSystem.setPositions(tempPositions);
      })
      .onComplete(() => {
        this.isAnimating = false;
        this.particleSystem.setPositions(target);
        this.animationTween = null;
      })
      .start();
  }

  private setupEventListeners(): void {
    window.addEventListener('resize', this.onWindowResize.bind(this));
    window.addEventListener('keydown', this.onKeyDown.bind(this));
  }

  private onWindowResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  private onKeyDown(event: KeyboardEvent): void {
    switch (event.key.toLowerCase()) {
      case 'w':
        this.state.wireframe = !this.state.wireframe;
        this.particleSystem.toggleWireframe();
        this.gui.updateDisplay();
        break;
      case 's':
        this.state.autoRotate = !this.state.autoRotate;
        this.controls.autoRotate = this.state.autoRotate;
        this.gui.updateDisplay();
        break;
    }
  }

  private animate = (): void => {
    requestAnimationFrame(this.animate);

    const delta = this.clock.getDelta();
    TWEEN.update();
    this.controls.update();

    if (this.state.autoRotate) {
      this.orbitGroup.rotation.y += (30 * Math.PI / 180) * delta;
    }

    this.renderer.render(this.scene, this.camera);
  };
}

window.addEventListener('DOMContentLoaded', () => {
  new App();
});
