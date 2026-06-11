import * as THREE from 'three';
import { Forest } from './forest';
import { FireflySystem } from './firefly';
import { EnvironmentControl } from './environment';

class FireflyForestApp {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private forest!: Forest;
  private fireflySystem!: FireflySystem;
  private environmentControl!: EnvironmentControl;
  private ambientLight!: THREE.AmbientLight;
  private moonLight!: THREE.DirectionalLight;
  private clock: THREE.Clock;
  
  private cameraAngle: { theta: number; phi: number };
  private cameraTargetAngle: { theta: number; phi: number };
  private cameraDistance: number;
  private targetCameraDistance: number;
  private cameraTarget: THREE.Vector3;
  
  private isDragging: boolean;
  private lastMousePosition: { x: number; y: number };
  private dampingFactor: number;
  
  private container: HTMLElement;
  private animationFrameId: number;

  constructor() {
    this.container = document.getElementById('app') || document.body;
    this.clock = new THREE.Clock();
    
    this.cameraAngle = { theta: Math.PI / 4, phi: Math.PI / 4 };
    this.cameraTargetAngle = { theta: Math.PI / 4, phi: Math.PI / 4 };
    this.cameraDistance = 18;
    this.targetCameraDistance = 18;
    this.cameraTarget = new THREE.Vector3(0, 3, 0);
    
    this.isDragging = false;
    this.lastMousePosition = { x: 0, y: 0 };
    this.dampingFactor = 0.08;
    
    this.animationFrameId = 0;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0a0f14);
    this.scene.fog = new THREE.FogExp2(0x0a0f14, 0.015);

    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;

    this.container.appendChild(this.renderer.domElement);

    this.init();
  }

  private init(): void {
    this.createLights();
    this.createForest();
    this.createFireflies();
    this.createEnvironmentControl();
    this.setupEventListeners();
    this.updateCameraPosition();
    this.animate();
  }

  private createLights(): void {
    this.ambientLight = new THREE.AmbientLight(0x404050, 0.05);
    this.scene.add(this.ambientLight);

    this.moonLight = new THREE.DirectionalLight(0x8899bb, 0.1);
    this.moonLight.position.set(30, 50, 30);
    this.moonLight.castShadow = true;
    this.moonLight.shadow.mapSize.width = 2048;
    this.moonLight.shadow.mapSize.height = 2048;
    this.moonLight.shadow.camera.near = 0.5;
    this.moonLight.shadow.camera.far = 150;
    this.moonLight.shadow.camera.left = -50;
    this.moonLight.shadow.camera.right = 50;
    this.moonLight.shadow.camera.top = 50;
    this.moonLight.shadow.camera.bottom = -50;
    this.scene.add(this.moonLight);

    const hemisphereLight = new THREE.HemisphereLight(0x1a2a3a, 0x2a1a1a, 0.1);
    this.scene.add(hemisphereLight);
  }

  private createForest(): void {
    this.forest = new Forest({
      treeCount: 18,
      areaSize: 40
    });
    this.scene.add(this.forest.group);
  }

  private createFireflies(): void {
    this.fireflySystem = new FireflySystem(400, 35);
    this.scene.add(this.fireflySystem.group);
  }

  private createEnvironmentControl(): void {
    this.environmentControl = new EnvironmentControl(
      this.ambientLight,
      this.moonLight,
      {
        container: this.container
      }
    );
  }

  private setupEventListeners(): void {
    window.addEventListener('resize', this.onWindowResize.bind(this));
    
    const canvas = this.renderer.domElement;
    
    canvas.addEventListener('mousedown', this.onMouseDown.bind(this));
    canvas.addEventListener('mousemove', this.onMouseMove.bind(this));
    canvas.addEventListener('mouseup', this.onMouseUp.bind(this));
    canvas.addEventListener('mouseleave', this.onMouseUp.bind(this));
    
    canvas.addEventListener('wheel', this.onWheel.bind(this), { passive: false });
    
    canvas.addEventListener('touchstart', this.onTouchStart.bind(this), { passive: false });
    canvas.addEventListener('touchmove', this.onTouchMove.bind(this), { passive: false });
    canvas.addEventListener('touchend', this.onTouchEnd.bind(this));
  }

  private onWindowResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  private onMouseDown(event: MouseEvent): void {
    this.isDragging = true;
    this.lastMousePosition.x = event.clientX;
    this.lastMousePosition.y = event.clientY;
  }

  private onMouseMove(event: MouseEvent): void {
    if (!this.isDragging) return;

    const deltaX = event.clientX - this.lastMousePosition.x;
    const deltaY = event.clientY - this.lastMousePosition.y;

    this.cameraTargetAngle.theta -= deltaX * 0.005;
    this.cameraTargetAngle.phi = Math.max(
      0.1,
      Math.min(Math.PI / 2 - 0.1, this.cameraTargetAngle.phi - deltaY * 0.005)
    );

    this.lastMousePosition.x = event.clientX;
    this.lastMousePosition.y = event.clientY;
  }

  private onMouseUp(): void {
    this.isDragging = false;
  }

  private onWheel(event: WheelEvent): void {
    event.preventDefault();
    const delta = event.deltaY * 0.01;
    this.targetCameraDistance = Math.max(
      0.5,
      Math.min(30, this.targetCameraDistance + delta)
    );
  }

  private onTouchStart(event: TouchEvent): void {
    if (event.touches.length === 1) {
      event.preventDefault();
      this.isDragging = true;
      this.lastMousePosition.x = event.touches[0].clientX;
      this.lastMousePosition.y = event.touches[0].clientY;
    }
  }

  private onTouchMove(event: TouchEvent): void {
    if (!this.isDragging || event.touches.length !== 1) return;
    event.preventDefault();

    const deltaX = event.touches[0].clientX - this.lastMousePosition.x;
    const deltaY = event.touches[0].clientY - this.lastMousePosition.y;

    this.cameraTargetAngle.theta -= deltaX * 0.005;
    this.cameraTargetAngle.phi = Math.max(
      0.1,
      Math.min(Math.PI / 2 - 0.1, this.cameraTargetAngle.phi - deltaY * 0.005)
    );

    this.lastMousePosition.x = event.touches[0].clientX;
    this.lastMousePosition.y = event.touches[0].clientY;
  }

  private onTouchEnd(): void {
    this.isDragging = false;
  }

  private updateCameraPosition(): void {
    this.cameraAngle.theta += (this.cameraTargetAngle.theta - this.cameraAngle.theta) * this.dampingFactor;
    this.cameraAngle.phi += (this.cameraTargetAngle.phi - this.cameraAngle.phi) * this.dampingFactor;
    this.cameraDistance += (this.targetCameraDistance - this.cameraDistance) * this.dampingFactor;

    const x = this.cameraTarget.x + this.cameraDistance * Math.sin(this.cameraAngle.theta) * Math.cos(this.cameraAngle.phi);
    const y = this.cameraTarget.y + this.cameraDistance * Math.sin(this.cameraAngle.phi);
    const z = this.cameraTarget.z + this.cameraDistance * Math.cos(this.cameraAngle.theta) * Math.cos(this.cameraAngle.phi);

    this.camera.position.set(x, y, z);
    this.camera.lookAt(this.cameraTarget);
  }

  private animate(): void {
    this.animationFrameId = requestAnimationFrame(this.animate.bind(this));

    const delta = Math.min(this.clock.getDelta(), 0.1);
    
    const params = this.environmentControl.getParams();
    this.fireflySystem.update(delta, params);
    
    this.updateCameraPosition();
    this.renderer.render(this.scene, this.camera);
  }

  public dispose(): void {
    cancelAnimationFrame(this.animationFrameId);
    this.environmentControl.dispose();
    this.renderer.dispose();
    
    window.removeEventListener('resize', this.onWindowResize.bind(this));
  }
}

const app = new FireflyForestApp();

(window as any).app = app;
