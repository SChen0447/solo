import * as THREE from 'three';
import { EngineCore } from './engine';
import { UIController } from './ui';

class App {
  private container: HTMLElement;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private clock: THREE.Clock;
  private engineCore: EngineCore;
  private uiController: UIController;
  private mouse: THREE.Vector2;
  private mouseWorld: THREE.Vector3;
  private raycaster: THREE.Raycaster;
  private animationId: number | null;

  constructor() {
    this.container = document.getElementById('app')!;
    this.scene = new THREE.Scene();
    this.clock = new THREE.Clock();
    this.mouse = new THREE.Vector2(-9999, -9999);
    this.mouseWorld = new THREE.Vector3(0, 0, 0);
    this.raycaster = new THREE.Raycaster();
    this.animationId = null;

    this.camera = this.createCamera();
    this.renderer = this.createRenderer();
    this.container.appendChild(this.renderer.domElement);

    this.setupLights();

    this.engineCore = new EngineCore(this.scene);

    this.uiController = new UIController(this.container, {
      onEnergyChange: (value: number) => {
        this.engineCore.setParams({ energy: value });
      },
      onTemperatureChange: (value: number) => {
        this.engineCore.setParams({ temperature: value });
      },
      onParticleCountChange: (value: number) => {
        this.engineCore.setParams({ particleCount: value });
      }
    });

    this.bindEvents();
    this.animate = this.animate.bind(this);
    this.start();
  }

  private createCamera(): THREE.PerspectiveCamera {
    const camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    camera.position.set(0, 0, 9);
    camera.lookAt(0, 0, 0);
    return camera;
  }

  private createRenderer(): THREE.WebGLRenderer {
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0x000000, 0);
    return renderer;
  }

  private setupLights(): void {
    const ambientLight = new THREE.AmbientLight(0x404060, 0.5);
    this.scene.add(ambientLight);

    const pointLight1 = new THREE.PointLight(0xFFD700, 1, 30);
    pointLight1.position.set(5, 5, 5);
    this.scene.add(pointLight1);

    const pointLight2 = new THREE.PointLight(0x00BFFF, 0.6, 30);
    pointLight2.position.set(-5, -3, 3);
    this.scene.add(pointLight2);
  }

  private bindEvents(): void {
    window.addEventListener('resize', () => this.onResize());
    this.renderer.domElement.addEventListener('mousemove', (e) => this.onMouseMove(e));
    this.renderer.domElement.addEventListener('mouseleave', () => {
      this.mouse.set(-9999, -9999);
    });
  }

  private onResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  private onMouseMove(event: MouseEvent): void {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  }

  private updateMouseWorld(): void {
    if (this.mouse.x < -1000) {
      this.mouseWorld.set(9999, 9999, 9999);
      return;
    }

    this.raycaster.setFromCamera(this.mouse, this.camera);
    const planeNormal = new THREE.Vector3(0, 0, 1);
    const planePoint = new THREE.Vector3(0, 0, 0);
    const plane = new THREE.Plane().setFromNormalAndCoplanarPoint(planeNormal, planePoint);
    this.raycaster.ray.intersectPlane(plane, this.mouseWorld);
  }

  private animate(): void {
    this.animationId = requestAnimationFrame(this.animate);

    const delta = Math.min(this.clock.getDelta(), 0.1);

    this.updateMouseWorld();
    this.engineCore.update(delta, this.mouseWorld);
    this.uiController.updateStatus(this.engineCore.getParams());

    this.camera.position.x = Math.sin(Date.now() * 0.0003) * 0.5;
    this.camera.position.y = Math.cos(Date.now() * 0.0002) * 0.3;
    this.camera.lookAt(0, 0, 0);

    this.renderer.render(this.scene, this.camera);
  }

  private start(): void {
    this.animate();
  }

  public dispose(): void {
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
    }
    this.engineCore.dispose();
    this.renderer.dispose();
    window.removeEventListener('resize', () => this.onResize());
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new App();
});
