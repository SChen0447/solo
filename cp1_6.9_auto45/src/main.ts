import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import Stats from 'three/examples/jsm/libs/stats.module.js';
import { LavaLamp } from './LavaLamp';
import { DEFAULT_PARAMETERS, LavaLampParameters, HSLColor } from './Parameters';

class LavaLampApp {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;
  private lavaLamp: LavaLamp;
  private stats: any;
  private clock: THREE.Clock;
  private parameters: LavaLampParameters;

  private tempSlider: HTMLInputElement;
  private viscSlider: HTMLInputElement;
  private lightSlider: HTMLInputElement;
  private tempValue: HTMLElement;
  private viscValue: HTMLElement;
  private lightValue: HTMLElement;
  private blobCountEl: HTMLElement;
  private bubbleCountEl: HTMLElement;
  private selectedInfoEl: HTMLElement;
  private selectedColorEl: HTMLElement;

  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;

  constructor() {
    this.parameters = { ...DEFAULT_PARAMETERS };
    this.clock = new THREE.Clock();
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();

    this.tempSlider = document.getElementById('temperature') as HTMLInputElement;
    this.viscSlider = document.getElementById('viscosity') as HTMLInputElement;
    this.lightSlider = document.getElementById('light-angle') as HTMLInputElement;
    this.tempValue = document.getElementById('temp-value')!;
    this.viscValue = document.getElementById('visc-value')!;
    this.lightValue = document.getElementById('light-value')!;
    this.blobCountEl = document.getElementById('blob-count')!;
    this.bubbleCountEl = document.getElementById('bubble-count')!;
    this.selectedInfoEl = document.getElementById('selected-info')!;
    this.selectedColorEl = document.getElementById('selected-color')!;

    this.scene = new THREE.Scene();
    this.scene.background = null;

    const container = document.getElementById('canvas-container')!;
    const width = container.clientWidth;
    const height = container.clientHeight;

    this.camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    this.camera.position.set(0, 3, 14);
    this.camera.lookAt(0, 0, 0);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(width, height);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    container.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.minDistance = 6;
    this.controls.maxDistance = 30;
    this.controls.target.set(0, 0, 0);
    this.controls.update();

    this.stats = new (Stats as any)();
    this.stats.showPanel(0);
    document.body.appendChild(this.stats.dom);
    this.stats.dom.style.position = 'absolute';
    this.stats.dom.style.top = '20px';
    this.stats.dom.style.right = '320px';

    this.lavaLamp = new LavaLamp(this.scene, this.parameters);

    this.setupEventListeners();
    this.updateParameterDisplays();
    this.animate();
  }

  private setupEventListeners(): void {
    this.tempSlider.addEventListener('input', (e) => {
      this.parameters.temperature = parseFloat((e.target as HTMLInputElement).value);
      this.lavaLamp.setParameters(this.parameters);
      this.updateParameterDisplays();
    });

    this.viscSlider.addEventListener('input', (e) => {
      this.parameters.viscosity = parseFloat((e.target as HTMLInputElement).value);
      this.lavaLamp.setParameters(this.parameters);
      this.updateParameterDisplays();
    });

    this.lightSlider.addEventListener('input', (e) => {
      this.parameters.lightAngle = parseFloat((e.target as HTMLInputElement).value);
      this.lavaLamp.setParameters(this.parameters);
      this.updateParameterDisplays();
    });

    window.addEventListener('resize', () => this.onResize());

    this.renderer.domElement.addEventListener('click', (e) => this.onCanvasClick(e));
  }

  private onCanvasClick(event: MouseEvent): void {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);
    const ray = new THREE.Ray(this.raycaster.ray.origin, this.raycaster.ray.direction);

    const hsl: HSLColor | null = this.lavaLamp.handleClick(ray);
    if (hsl) {
      this.selectedInfoEl.style.display = 'block';
      this.selectedColorEl.textContent = `色相:${hsl.h}, 饱和度:${hsl.s}, 亮度:${hsl.l}`;
    }
  }

  private updateParameterDisplays(): void {
    this.tempValue.textContent = this.parameters.temperature.toString();
    this.viscValue.textContent = this.parameters.viscosity.toString();
    this.lightValue.textContent = this.parameters.lightAngle.toString();
  }

  private onResize(): void {
    const container = document.getElementById('canvas-container')!;
    const width = container.clientWidth;
    const height = container.clientHeight;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  private animate(): void {
    requestAnimationFrame(() => this.animate());

    this.stats.begin();

    const delta = Math.min(this.clock.getDelta(), 0.05);

    this.controls.update();
    this.lavaLamp.update(delta);

    this.blobCountEl.textContent = this.lavaLamp.getBlobCount().toString();
    this.bubbleCountEl.textContent = this.lavaLamp.getBubbleCount().toString();

    this.renderer.render(this.scene, this.camera);

    this.stats.end();
  }

  public dispose(): void {
    this.lavaLamp.dispose();
    this.renderer.dispose();
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new LavaLampApp();
});
