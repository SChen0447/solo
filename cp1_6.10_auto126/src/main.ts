import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import CaveSystem, { CaveChannel } from './cave';
import WaterParticleSystem from './particles';
import UIController, { UIState } from './ui';

class App {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;
  private container: HTMLElement;
  private caveSystem: CaveSystem;
  private particleSystem: WaterParticleSystem;
  private ui: UIController;
  private clock: THREE.Clock;
  private startTime: number;
  private selectedChannel: CaveChannel | null = null;
  private mouseVector: THREE.Vector2;
  private lastGrowthFactor: number = 0;

  constructor() {
    this.container = document.getElementById('canvas-container')!;
    this.scene = new THREE.Scene();
    this.setupScene();
    this.camera = new THREE.PerspectiveCamera(
      60,
      this.container.clientWidth / this.container.clientHeight,
      0.1,
      500
    );
    this.camera.position.set(0, 0, 0);
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance'
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    this.renderer.setClearColor(0x000000, 0);
    this.container.appendChild(this.renderer.domElement);
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.1;
    this.controls.minDistance = 10;
    this.controls.maxDistance = 100;
    this.controls.target.set(0, 0, -5);
    this.controls.update();
    this.caveSystem = new CaveSystem(this.scene);
    this.particleSystem = new WaterParticleSystem(this.scene, this.caveSystem);
    this.ui = new UIController('app');
    this.clock = new THREE.Clock();
    this.startTime = performance.now() / 1000;
    this.mouseVector = new THREE.Vector2();
    this.setupEvents();
    this.setupUI();
    this.animate();
  }

  private setupScene(): void {
    this.scene.fog = new THREE.FogExp2(0x0a0a23, 0.008);
    const ambientLight = new THREE.AmbientLight(0x2a2a4a, 0.6);
    this.scene.add(ambientLight);
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(5, 10, 5);
    this.scene.add(dirLight);
    const pointLight = new THREE.PointLight(0x00b4d8, 0.4, 80);
    pointLight.position.set(0, 0, 0);
    this.scene.add(pointLight);
    const fillLight = new THREE.DirectionalLight(0x8b5a2b, 0.25);
    fillLight.position.set(-5, -3, -5);
    this.scene.add(fillLight);
    const bgGeo = new THREE.SphereGeometry(200, 32, 32);
    const bgMat = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      uniforms: {
        topColor: { value: new THREE.Color('#0a0a23') },
        bottomColor: { value: new THREE.Color('#000010') }
      },
      vertexShader: `
        varying vec3 vWorldPosition;
        void main() {
          vec4 worldPosition = modelMatrix * vec4(position, 1.0);
          vWorldPosition = worldPosition.xyz;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 topColor;
        uniform vec3 bottomColor;
        varying vec3 vWorldPosition;
        void main() {
          float h = normalize(vWorldPosition).y;
          gl_FragColor = vec4(mix(bottomColor, topColor, max(h, 0.0)), 1.0);
        }
      `
    });
    const bgMesh = new THREE.Mesh(bgGeo, bgMat);
    this.scene.add(bgMesh);
  }

  private setupEvents(): void {
    window.addEventListener('resize', () => this.onResize());
    this.renderer.domElement.addEventListener('click', (e) => this.onClick(e));
  }

  private setupUI(): void {
    this.ui.onChange((state: Partial<UIState>) => {
      if (state.waterSpeed !== undefined) {
        this.particleSystem.setWaterSpeed(state.waterSpeed);
      }
      if (state.caveOpacity !== undefined) {
        this.caveSystem.setOpacity(state.caveOpacity);
      }
      if (state.growthFactor !== undefined) {
        const delta = this.ui.getGrowthFactorDelta();
        this.caveSystem.setGrowthFactor(delta.current, this.lastGrowthFactor);
        this.lastGrowthFactor = delta.current;
        this.particleSystem.rebuildPaths();
      }
    });
  }

  private onClick(event: MouseEvent): void {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouseVector.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouseVector.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    const channel = this.caveSystem.pickChannel(this.mouseVector, this.camera);
    if (channel) {
      this.selectedChannel = channel;
      this.caveSystem.highlightChannel(channel);
      this.ui.showChannelInfo(channel, event.clientX, event.clientY);
    } else {
      this.selectedChannel = null;
      this.caveSystem.highlightChannel(null);
      this.ui.hideChannelInfo();
    }
  }

  private onResize(): void {
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  }

  private animate(): void {
    requestAnimationFrame(() => this.animate());
    const deltaTime = Math.min(this.clock.getDelta(), 0.1);
    const time = performance.now() / 1000 - this.startTime;
    this.controls.update();
    this.ui.update(time);
    this.caveSystem.update(time);
    this.particleSystem.update(time, deltaTime);
    this.renderer.render(this.scene, this.camera);
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new App();
});
