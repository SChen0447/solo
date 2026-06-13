import * as THREE from 'three';
import { OceanParticles, type OceanState } from './particles';
import { ControlsManager } from './controls';

const SPHERE_RADIUS = 200;
const RING_RADIUS = 210;
const CAMERA_NEAR = 1;
const CAMERA_FAR = 2000;
const CRYSTAL_OPACITY = 0.12;

class OceanSimulation {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private canvasContainer: HTMLElement;

  private oceanParticles: OceanParticles;
  private controls: ControlsManager;

  private crystalSphere: THREE.Mesh;
  private outerRing: THREE.Mesh;
  private innerGlow: THREE.Mesh;

  private clock: THREE.Clock;
  private animationId: number = 0;

  private stateLabel: HTMLElement;
  private fpsLabel: HTMLElement;
  private frameCount = 0;
  private lastFpsTime = 0;

  constructor() {
    this.canvasContainer = document.getElementById('canvas-container') as HTMLElement;
    this.stateLabel = document.getElementById('state-label') as HTMLElement;
    this.fpsLabel = document.getElementById('fps-label') as HTMLElement;

    this.clock = new THREE.Clock();

    this.scene = this.createScene();
    this.camera = this.createCamera();
    this.renderer = this.createRenderer();

    this.crystalSphere = this.createCrystalSphere();
    this.outerRing = this.createOuterRing();
    this.innerGlow = this.createInnerGlow();

    this.oceanParticles = new OceanParticles();

    this.oceanParticles.onStateChange = (state: OceanState) => {
      this.updateStateLabel(state);
    };

    this.scene.add(this.oceanParticles.points);
    this.scene.add(this.crystalSphere);
    this.scene.add(this.outerRing);
    this.scene.add(this.innerGlow);

    this.addLights();

    this.controls = new ControlsManager(
      this.canvasContainer,
      this.camera,
      new THREE.Vector3(0, 0, 0),
      (params) => {
        this.oceanParticles.setParams(params);
      }
    );

    this.initParams();
    window.addEventListener('resize', () => this.onResize());

    this.start();
  }

  private createScene(): THREE.Scene {
    const scene = new THREE.Scene();
    return scene;
  }

  private createCamera(): THREE.PerspectiveCamera {
    const container = this.canvasContainer;
    const aspect = container.clientWidth / container.clientHeight;
    const camera = new THREE.PerspectiveCamera(50, aspect, CAMERA_NEAR, CAMERA_FAR);
    return camera;
  }

  private createRenderer(): THREE.WebGLRenderer {
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });

    const container = this.canvasContainer;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;

    container.appendChild(renderer.domElement);

    return renderer;
  }

  private createCrystalSphere(): THREE.Mesh {
    const geometry = new THREE.SphereGeometry(SPHERE_RADIUS, 64, 64);
    const material = new THREE.MeshPhysicalMaterial({
      color: 0x88ccff,
      transparent: true,
      opacity: CRYSTAL_OPACITY,
      roughness: 0.05,
      metalness: 0.1,
      transmission: 0.8,
      thickness: 2,
      ior: 1.33,
      clearcoat: 1,
      clearcoatRoughness: 0.1,
      side: THREE.FrontSide,
    });

    const mesh = new THREE.Mesh(geometry, material);
    return mesh;
  }

  private createOuterRing(): THREE.Mesh {
    const geometry = new THREE.RingGeometry(RING_RADIUS - 3, RING_RADIUS + 3, 128, 1);
    const material = new THREE.MeshBasicMaterial({
      color: 0x00BFFF,
      transparent: true,
      opacity: 0.2,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.rotation.x = Math.PI / 2;
    return mesh;
  }

  private createInnerGlow(): THREE.Mesh {
    const geometry = new THREE.SphereGeometry(SPHERE_RADIUS * 0.95, 32, 32);
    const material = new THREE.MeshBasicMaterial({
      color: 0x00BFFF,
      transparent: true,
      opacity: 0.03,
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    const mesh = new THREE.Mesh(geometry, material);
    return mesh;
  }

  private addLights(): void {
    const ambientLight = new THREE.AmbientLight(0x4080a0, 0.6);
    this.scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0x88ccff, 0.8);
    directionalLight.position.set(150, 250, 150);
    this.scene.add(directionalLight);

    const pointLight1 = new THREE.PointLight(0x00BFFF, 0.6, 800);
    pointLight1.position.set(-200, 150, -200);
    this.scene.add(pointLight1);

    const pointLight2 = new THREE.PointLight(0x4682B4, 0.4, 600);
    pointLight2.position.set(200, -100, 200);
    this.scene.add(pointLight2);
  }

  private initParams(): void {
    const initialParams = this.controls.getParams();
    this.oceanParticles.setParams(initialParams);
  }

  private updateStateLabel(state: OceanState): void {
    const stateTexts: Record<OceanState, { text: string; dotClass: string }> = {
      calm: { text: '风平浪静', dotClass: 'dot-calm' },
      wave: { text: '波涛汹涌', dotClass: 'dot-wave' },
      tornado: { text: '龙卷水龙', dotClass: 'dot-tornado' },
    };

    const { text, dotClass } = stateTexts[state];
    this.stateLabel.textContent = text;

    const statusItems = document.querySelectorAll('#status-bar .status-item .status-dot');
    statusItems.forEach((dot) => {
      dot.className = `status-dot ${dotClass}`;
    });
  }

  private onResize(): void {
    const container = this.canvasContainer;
    const width = container.clientWidth;
    const height = container.clientHeight;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();

    this.renderer.setSize(width, height);
  }

  private animate(): void {
    this.animationId = requestAnimationFrame(() => this.animate());

    const deltaTime = Math.min(this.clock.getDelta(), 0.1);

    this.oceanParticles.update(deltaTime);

    this.outerRing.rotation.z += 0.003 * deltaTime * 60;
    this.innerGlow.rotation.y += 0.001 * deltaTime * 60;

    this.renderer.render(this.scene, this.camera);

    this.updateFPS();
  }

  private updateFPS(): void {
    this.frameCount++;
    const now = performance.now();

    if (now - this.lastFpsTime >= 500) {
      const fps = Math.round(this.frameCount * 1000 / (now - this.lastFpsTime));
      this.fpsLabel.textContent = `FPS: ${fps}`;
      this.frameCount = 0;
      this.lastFpsTime = now;
    }
  }

  private start(): void {
    this.lastFpsTime = performance.now();
    this.animate();
  }

  public dispose(): void {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }

    this.oceanParticles.dispose();
    this.renderer.dispose();
  }
}

window.addEventListener('DOMContentLoaded', () => {
  try {
    new OceanSimulation();
  } catch (error) {
    console.error('Failed to initialize Ocean Simulation:', error);
  }
});
