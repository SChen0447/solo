import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GUI } from 'dat.gui';
import { WormholeNetwork } from './network';

class App {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;
  private network: WormholeNetwork;
  private gui: GUI;
  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;
  private hoveredNodeId: number | null = null;
  private stars: THREE.Points | null = null;
  private starData: { twinkleOffset: number; twinkleSpeed: number }[] = [];
  private config = {
    distortionStrength: 1.5,
    particleDensity: 1.0,
    colorSaturation: 1.0
  };
  private clock: THREE.Clock;
  private container: HTMLElement;

  constructor() {
    this.container = document.getElementById('canvas-container')!;
    this.clock = new THREE.Clock();
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();

    this.scene = this.createScene();
    this.camera = this.createCamera();
    this.renderer = this.createRenderer();
    this.controls = this.createControls();

    this.createStars();
    this.network = new WormholeNetwork();
    this.scene.add(this.network.group);

    this.gui = this.createGUI();
    this.setupEventListeners();
    this.animate();
  }

  private createScene(): THREE.Scene {
    const scene = new THREE.Scene();
    const canvas = document.createElement('canvas');
    canvas.width = 2;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;
    const gradient = ctx.createLinearGradient(0, 0, 0, 512);
    gradient.addColorStop(0, '#0B0C10');
    gradient.addColorStop(1, '#1A1A2E');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 2, 512);
    const texture = new THREE.CanvasTexture(canvas);
    scene.background = texture;
    return scene;
  }

  private createCamera(): THREE.PerspectiveCamera {
    const camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    camera.position.set(0, 15, 30);
    return camera;
  }

  private createRenderer(): THREE.WebGLRenderer {
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0x0B0C10, 1);
    this.container.appendChild(renderer.domElement);
    return renderer;
  }

  private createControls(): OrbitControls {
    const controls = new OrbitControls(this.camera, this.renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.minDistance = 8;
    controls.maxDistance = 80;
    controls.enablePan = false;
    return controls;
  }

  private createStars(): void {
    const starCount = 1000;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(starCount * 3);
    const colors = new Float32Array(starCount * 3);
    const sizes = new Float32Array(starCount);

    this.starData = [];

    for (let i = 0; i < starCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 200;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 200;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 200;

      const brightness = 0.5 + Math.random() * 0.5;
      colors[i * 3] = brightness;
      colors[i * 3 + 1] = brightness;
      colors[i * 3 + 2] = brightness;

      sizes[i] = 1 + Math.random() * 2;

      this.starData.push({
        twinkleOffset: Math.random() * Math.PI * 2,
        twinkleSpeed: 0.3 + Math.random() * 0.5
      });
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    const material = new THREE.PointsMaterial({
      size: 1,
      vertexColors: true,
      transparent: true,
      opacity: 0.8,
      sizeAttenuation: false,
      depthWrite: false
    });

    this.stars = new THREE.Points(geometry, material);
    this.scene.add(this.stars);
  }

  private createGUI(): GUI {
    const guiContainer = document.getElementById('gui-container')!;
    const gui = new GUI({ autoPlace: false, width: 260 });
    guiContainer.appendChild(gui.domElement);

    gui.add(this.config, 'distortionStrength', 0, 3.0, 0.1)
      .name('虫洞扭曲强度')
      .onChange(() => this.updateNetworkConfig());

    gui.add(this.config, 'particleDensity', 0.5, 2.0, 0.1)
      .name('粒子密度')
      .onChange(() => this.updateNetworkConfig());

    gui.add(this.config, 'colorSaturation', 0.5, 2.0, 0.1)
      .name('颜色饱和度')
      .onChange(() => this.updateNetworkConfig());

    return gui;
  }

  private updateNetworkConfig(): void {
    this.network.updateGlobalConfig(
      this.config.distortionStrength,
      this.config.particleDensity,
      this.config.colorSaturation
    );
  }

  private setupEventListeners(): void {
    window.addEventListener('resize', this.onWindowResize.bind(this));
    this.renderer.domElement.addEventListener('mousemove', this.onMouseMove.bind(this));
    this.renderer.domElement.addEventListener('click', this.onClick.bind(this));
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

  private onClick(): void {
    if (this.hoveredNodeId !== null) {
      this.network.triggerPulse(this.hoveredNodeId);
    }
  }

  private checkHover(): void {
    this.raycaster.setFromCamera(this.mouse, this.camera);
    const nodeMeshes = this.network.getNodeMeshes();
    const intersects = this.raycaster.intersectObjects(nodeMeshes, false);

    if (intersects.length > 0) {
      const nodeId = intersects[0].object.userData.nodeId as number;
      if (this.hoveredNodeId !== nodeId) {
        this.hoveredNodeId = nodeId;
        this.network.highlightNode(nodeId);
      }
    } else if (this.hoveredNodeId !== null) {
      this.hoveredNodeId = null;
      this.network.highlightNode(null);
    }
  }

  private updateStars(elapsedTime: number): void {
    if (!this.stars) return;
    const sizes = this.stars.geometry.attributes.size.array as Float32Array;
    const colors = this.stars.geometry.attributes.color.array as Float32Array;

    for (let i = 0; i < this.starData.length; i++) {
      const data = this.starData[i];
      const twinkle = 0.5 + 0.5 * Math.sin(elapsedTime * data.twinkleSpeed + data.twinkleOffset);
      sizes[i] = (1 + twinkle * 2) * (1 + Math.random() * 0.01);
      colors[i * 3] = twinkle;
      colors[i * 3 + 1] = twinkle;
      colors[i * 3 + 2] = twinkle;
    }

    this.stars.geometry.attributes.size.needsUpdate = true;
    this.stars.geometry.attributes.color.needsUpdate = true;
  }

  private animate(): void {
    requestAnimationFrame(this.animate.bind(this));

    const deltaTime = this.clock.getDelta();
    const elapsedTime = this.clock.getElapsedTime();

    this.controls.update();

    const cameraParallax = this.camera.rotation.y;

    this.network.update(deltaTime, elapsedTime, cameraParallax);
    this.updateStars(elapsedTime);

    this.renderer.render(this.scene, this.camera);
  }

  public dispose(): void {
    this.gui.destroy();
    this.network.dispose();
    this.renderer.dispose();
    this.controls.dispose();
    if (this.stars) {
      this.stars.geometry.dispose();
      (this.stars.material as THREE.Material).dispose();
    }
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new App();
});
