import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { Stars } from './stars';
import { TidalParticles, OceanSurface, RenderMode, TidalParams } from './tidalParticles';
import { ControlPanel, ControlValues } from './controls';

class App {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;
  private stars: Stars;
  private particles: TidalParticles;
  private ocean: OceanSurface;
  private controlPanel: ControlPanel;
  private fpsCounter: HTMLElement;
  private container: HTMLElement;

  private clock: THREE.Clock;
  private elapsedTime: number = 0;

  private fpsFrames: number = 0;
  private fpsLastTime: number = 0;
  private currentFps: number = 60;
  private degraded: boolean = false;

  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;
  private isAnimating: boolean = false;
  private animationStartTime: number = 0;
  private animationDuration: number = 1.2;
  private startCameraPos: THREE.Vector3 = new THREE.Vector3();
  private startTargetPos: THREE.Vector3 = new THREE.Vector3();
  private endCameraPos: THREE.Vector3 = new THREE.Vector3();
  private endTargetPos: THREE.Vector3 = new THREE.Vector3();

  constructor() {
    this.container = document.getElementById('app')!;
    this.fpsCounter = document.getElementById('fps-counter')!;
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    this.clock = new THREE.Clock();

    this.scene = this.createScene();
    this.camera = this.createCamera();
    this.renderer = this.createRenderer();
    this.container.appendChild(this.renderer.domElement);

    this.controls = this.createControls();
    this.setupLights();

    this.stars = new Stars(this.scene, 500);
    this.particles = new TidalParticles(this.scene, {
      frequency: 8,
      density: 8000,
      waveSpeed: 1
    });
    this.ocean = new OceanSurface(this.scene, 100);

    this.controlPanel = new ControlPanel();
    this.controlPanel.onChange((values) => this.onControlChange(values));

    this.setupEventListeners();
    this.onWindowResize();
    this.fpsLastTime = performance.now();

    this.animate();
  }

  private createScene(): THREE.Scene {
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000);
    scene.fog = new THREE.FogExp2(0x001f3f, 0.008);
    return scene;
  }

  private createCamera(): THREE.PerspectiveCamera {
    const camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    const initialDistance = 30;
    const angle = THREE.MathUtils.degToRad(30);
    camera.position.set(
      0,
      initialDistance * Math.sin(angle),
      initialDistance * Math.cos(angle)
    );
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
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;
    return renderer;
  }

  private createControls(): OrbitControls {
    const controls = new OrbitControls(this.camera, this.renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.15;
    controls.rotateSpeed = 0.5;
    controls.zoomSpeed = 1.0;
    controls.minDistance = 5;
    controls.maxDistance = 50;
    controls.maxPolarAngle = Math.PI / 2.05;
    controls.enablePan = false;
    controls.mouseButtons = {
      LEFT: null as unknown as THREE.MOUSE,
      MIDDLE: THREE.MOUSE.DOLLY,
      RIGHT: THREE.MOUSE.ROTATE
    };
    controls.touches = {
      ONE: THREE.TOUCH.ROTATE,
      TWO: THREE.TOUCH.DOLLY_PAN
    };
    return controls;
  }

  private setupLights(): void {
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    this.scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
    directionalLight.position.set(10, 20, 10);
    this.scene.add(directionalLight);
  }

  private setupEventListeners(): void {
    window.addEventListener('resize', () => this.onWindowResize());

    this.renderer.domElement.addEventListener('dblclick', (e) => {
      this.onDoubleClick(e);
    });
  }

  private onWindowResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  private onControlChange(values: ControlValues): void {
    const params: Partial<TidalParams> = {
      frequency: values.frequency,
      density: values.density,
      waveSpeed: values.speed
    };
    this.particles.setParams(params);
  }

  private onDoubleClick(event: MouseEvent): void {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObject(this.ocean.getMesh());

    if (intersects.length > 0 && !this.isAnimating) {
      const point = intersects[0].point;
      this.startCameraAnimation(point);
    }
  }

  private startCameraAnimation(target: THREE.Vector3): void {
    this.isAnimating = true;
    this.animationStartTime = performance.now();

    this.startCameraPos.copy(this.camera.position);
    this.startTargetPos.copy(this.controls.target);

    const lookDownHeight = 10;
    this.endCameraPos.set(target.x, lookDownHeight, target.z);
    this.endTargetPos.copy(target);

    this.controls.enabled = false;
  }

  private easeOut(t: number): number {
    return 1 - Math.pow(1 - t, 3);
  }

  private updateCameraAnimation(): void {
    if (!this.isAnimating) return;

    const now = performance.now();
    const elapsed = (now - this.animationStartTime) / 1000;
    const t = Math.min(elapsed / this.animationDuration, 1);
    const easedT = this.easeOut(t);

    this.camera.position.lerpVectors(this.startCameraPos, this.endCameraPos, easedT);
    this.controls.target.lerpVectors(this.startTargetPos, this.endTargetPos, easedT);

    if (t >= 1) {
      this.isAnimating = false;
      this.controls.enabled = true;
    }
  }

  private updateFPS(currentTime: number): void {
    this.fpsFrames++;
    if (currentTime - this.fpsLastTime >= 1000) {
      this.currentFps = this.fpsFrames;
      this.fpsFrames = 0;
      this.fpsLastTime = currentTime;
      this.fpsCounter.textContent = `FPS: ${this.currentFps}`;
      this.checkPerformanceDegradation();
    }
  }

  private checkPerformanceDegradation(): void {
    const particleCount = this.particles.getCount();
    const threshold = particleCount >= 15000 ? 30 : 45;

    if (this.currentFps < threshold && !this.degraded) {
      this.degradeRendering();
    } else if (this.currentFps >= threshold + 10 && this.degraded) {
      this.restoreRendering();
    }
  }

  private degradeRendering(): void {
    if (this.degraded) return;
    this.degraded = true;
    this.particles.setRenderMode('sprite' as RenderMode);
    this.ocean.setGridSize(60);
  }

  private restoreRendering(): void {
    if (!this.degraded) return;
    this.degraded = false;
    this.particles.setRenderMode('sphere' as RenderMode);
    this.ocean.setGridSize(100);
  }

  private animate = (): void => {
    requestAnimationFrame(this.animate);

    const currentTime = performance.now();
    this.updateFPS(currentTime);

    const deltaTime = this.clock.getDelta();
    this.elapsedTime += deltaTime;

    this.updateCameraAnimation();

    if (!this.isAnimating) {
      this.controls.update();
    }

    const values = this.controlPanel.getValues();
    this.stars.update(this.elapsedTime);
    this.particles.update(this.elapsedTime, deltaTime);
    this.ocean.update(this.elapsedTime, values.speed, values.frequency);

    this.renderer.render(this.scene, this.camera);
  };

  public dispose(): void {
    this.stars.dispose();
    this.particles.dispose();
    this.ocean.dispose();
    this.renderer.dispose();
    this.controls.dispose();
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
