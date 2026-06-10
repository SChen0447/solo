import * as THREE from 'three';
import { RiverSystem, RiverParams } from './riverSystem';
import { InteractionManager } from './interaction';

class App {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private container: HTMLElement;

  private riverSystem: RiverSystem;
  private interaction: InteractionManager;

  private clock: THREE.Clock;
  private animationId: number = 0;

  private currentParams: RiverParams = {
    flowSpeed: 1.0,
    meander: 0.5,
    tributaryCount: 2,
    waterLevel: 0
  };

  constructor() {
    this.container = document.getElementById('canvas-container')!;
    this.clock = new THREE.Clock();

    this.scene = this.createScene();
    this.camera = this.createCamera();
    this.renderer = this.createRenderer();
    this.container.appendChild(this.renderer.domElement);

    this.setupLighting();
    this.setupGround();

    this.riverSystem = new RiverSystem(this.scene);
    this.interaction = new InteractionManager(
      this.scene,
      this.camera,
      this.renderer,
      this.riverSystem,
      this.container
    );

    this.setupUI();
    this.onResize();

    window.addEventListener('resize', this.onResize.bind(this));

    this.animate();
  }

  private createScene(): THREE.Scene {
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0d1b2a);
    scene.fog = new THREE.FogExp2(0x0d1b2a, 0.004);
    return scene;
  }

  private createCamera(): THREE.PerspectiveCamera {
    const camera = new THREE.PerspectiveCamera(
      60,
      this.container.clientWidth / this.container.clientHeight,
      0.1,
      1000
    );
    camera.position.set(20, 45, 65);
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
    renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    return renderer;
  }

  private setupLighting(): void {
    const ambient = new THREE.AmbientLight(0x404d6b, 0.6);
    this.scene.add(ambient);

    const directional = new THREE.DirectionalLight(0xffffff, 0.8);
    directional.position.set(30, 60, 20);
    this.scene.add(directional);

    const rimLight = new THREE.DirectionalLight(0x00b4d8, 0.3);
    rimLight.position.set(-30, 20, -40);
    this.scene.add(rimLight);
  }

  private setupGround(): void {
    const groundGeometry = new THREE.PlaneGeometry(300, 300, 60, 60);
    const positions = groundGeometry.attributes.position as THREE.BufferAttribute;

    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i);
      const y = positions.getY(i);
      const noise = this.fbm(x * 0.02, y * 0.02) * 2.5;
      positions.setZ(i, noise);
    }

    groundGeometry.computeVertexNormals();

    const groundMaterial = new THREE.MeshStandardMaterial({
      color: 0x1b2838,
      roughness: 0.9,
      metalness: 0.05,
      flatShading: true
    });

    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -3;
    this.scene.add(ground);

    const gridHelper = new THREE.GridHelper(300, 60, 0x2a3f5a, 0x1a2538);
    gridHelper.position.y = -2.9;
    this.scene.add(gridHelper);
  }

  private fbm(x: number, y: number): number {
    let value = 0;
    let amplitude = 1;
    let frequency = 1;
    for (let i = 0; i < 4; i++) {
      value += amplitude * (Math.sin(x * frequency * 3.1) * Math.cos(y * frequency * 2.7));
      amplitude *= 0.5;
      frequency *= 2;
    }
    return value;
  }

  private setupUI(): void {
    const generateBtn = document.getElementById('btn-generate') as HTMLButtonElement;
    generateBtn.addEventListener('click', () => {
      this.riverSystem.params = { ...this.currentParams };
      this.riverSystem.generate();
      this.interaction.clearAllLockedCards();
    });

    const exportBtn = document.getElementById('btn-export') as HTMLButtonElement;
    exportBtn.addEventListener('click', () => this.exportToJSON());

    const sliderGroups = document.querySelectorAll('.slider-group');
    sliderGroups.forEach(group => {
      this.setupSlider(group as HTMLElement);
    });
  }

  private setupSlider(group: HTMLElement): void {
    const param = group.dataset.param as keyof RiverParams;
    const input = group.querySelector('.slider-input') as HTMLInputElement;
    const progress = group.querySelector('.slider-progress') as HTMLElement;
    const thumb = group.querySelector('.slider-thumb') as HTMLElement;
    const valueLabel = group.querySelector('.slider-value') as HTMLElement;
    const wrapper = group.querySelector('.slider-wrapper') as HTMLElement;

    const updateUI = () => {
      const min = parseFloat(input.min);
      const max = parseFloat(input.max);
      const val = parseFloat(input.value);
      const percent = ((val - min) / (max - min)) * 100;

      progress.style.width = `${percent}%`;
      thumb.style.left = `${percent}%`;

      if (param === 'tributaryCount') {
        valueLabel.textContent = val.toFixed(0);
      } else if (param === 'waterLevel') {
        valueLabel.textContent = val >= 0 ? `+${val.toFixed(2)}` : val.toFixed(2);
      } else {
        valueLabel.textContent = val.toFixed(1);
      }
    };

    updateUI();

    input.addEventListener('input', () => {
      const val = parseFloat(input.value);
      this.currentParams[param] = val;
      this.riverSystem.updateParams({ [param]: val });
      updateUI();

      wrapper.classList.add('active');
      setTimeout(() => wrapper.classList.remove('active'), 300);
    });
  }

  private exportToJSON(): void {
    const data = this.riverSystem.exportData();
    const jsonStr = JSON.stringify(data, null, 2);

    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `basin_${data.exportTime}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    this.showToast();
  }

  private showToast(): void {
    const toast = document.getElementById('toast')!;
    toast.classList.add('show');

    setTimeout(() => {
      toast.classList.remove('show');
    }, 1500);
  }

  private onResize(): void {
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();

    this.renderer.setSize(width, height);
  }

  private animate(): void {
    this.animationId = requestAnimationFrame(this.animate.bind(this));

    const deltaTime = Math.min(this.clock.getDelta(), 0.05);
    const elapsedTime = this.clock.getElapsedTime();

    this.interaction.update(deltaTime);
    this.riverSystem.update(deltaTime, elapsedTime);

    this.renderer.render(this.scene, this.camera);
  }

  public dispose(): void {
    cancelAnimationFrame(this.animationId);
    this.interaction.dispose();
    this.riverSystem.clear();
    this.renderer.dispose();
    window.removeEventListener('resize', this.onResize.bind(this));
  }
}

let app: App | null = null;

window.addEventListener('DOMContentLoaded', () => {
  app = new App();
});

window.addEventListener('beforeunload', () => {
  if (app) {
    app.dispose();
  }
});
