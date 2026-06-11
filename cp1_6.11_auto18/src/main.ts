import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { ClayModel } from './clayModel';
import { ColorManager } from './colorManager';
import { ToolPanel, ToolMode } from './toolPanel';

class SculptingApp {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;
  private clayModel: ClayModel;
  private colorManager: ColorManager;
  private toolPanel: ToolPanel;
  private viewportContainer: HTMLElement;
  private clock: THREE.Clock;
  private isDragging: boolean = false;
  private currentMode: ToolMode = 'sculpt';
  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;
  private frameCount: number = 0;
  private lastFpsUpdate: number = 0;
  private fps: number = 0;

  constructor() {
    this.clock = new THREE.Clock();
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();

    const app = document.getElementById('app');
    if (!app) {
      throw new Error('App container not found');
    }

    this.viewportContainer = document.createElement('div');
    this.viewportContainer.className = 'viewport-container';
    this.viewportContainer.style.flex = '1';
    this.viewportContainer.style.position = 'relative';
    this.viewportContainer.style.overflow = 'hidden';
    
    app.appendChild(this.viewportContainer);

    this.scene = this.createScene();
    this.camera = this.createCamera();
    this.renderer = this.createRenderer();
    this.controls = this.createControls();
    
    this.clayModel = new ClayModel(1.5, 3);
    this.scene.add(this.clayModel.mesh);

    this.colorManager = new ColorManager();
    this.colorManager.setVertexCount(this.clayModel.getVertexCount());

    this.toolPanel = new ToolPanel(app, {
      onStrengthChange: (value) => this.onStrengthChange(value),
      onBrushRadiusChange: (value) => this.onBrushRadiusChange(value),
      onSymmetricToggle: (enabled) => this.onSymmetricToggle(enabled),
      onReset: () => this.onReset(),
      onColorSelect: (color) => this.onColorSelect(color),
      onToolModeChange: (mode) => this.onToolModeChange(mode)
    }, this.colorManager);

    app.insertBefore(this.toolPanel.getContainer(), this.viewportContainer);

    this.viewportContainer.appendChild(this.renderer.domElement);

    this.setupLighting();
    this.setupEventListeners();
    this.animate();
  }

  private createScene(): THREE.Scene {
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0e14);
    scene.fog = new THREE.Fog(0x0a0e14, 5, 15);
    return scene;
  }

  private createCamera(): THREE.PerspectiveCamera {
    const camera = new THREE.PerspectiveCamera(
      45,
      this.viewportContainer.clientWidth / this.viewportContainer.clientHeight,
      0.1,
      100
    );
    camera.position.set(0, 1, 4.5);
    return camera;
  }

  private createRenderer(): THREE.WebGLRenderer {
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true
    });
    renderer.setSize(this.viewportContainer.clientWidth, this.viewportContainer.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    return renderer;
  }

  private createControls(): OrbitControls {
    const controls = new OrbitControls(this.camera, this.renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.minDistance = 2;
    controls.maxDistance = 10;
    controls.enablePan = false;
    return controls;
  }

  private setupLighting(): void {
    const ambientLight = new THREE.AmbientLight(0x404858, 0.6);
    this.scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xfff0e0, 1.0);
    keyLight.position.set(3, 5, 3);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 1024;
    keyLight.shadow.mapSize.height = 1024;
    keyLight.shadow.camera.near = 0.5;
    keyLight.shadow.camera.far = 20;
    keyLight.shadow.camera.left = -3;
    keyLight.shadow.camera.right = 3;
    keyLight.shadow.camera.top = 3;
    keyLight.shadow.camera.bottom = -3;
    this.scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0x8090b0, 0.4);
    fillLight.position.set(-3, 2, -2);
    this.scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0x6080a0, 0.3);
    rimLight.position.set(0, 3, -4);
    this.scene.add(rimLight);

    const pointLight = new THREE.PointLight(0x80a0c0, 0.5, 10);
    pointLight.position.set(-2, 1, 2);
    this.scene.add(pointLight);
  }

  private setupEventListeners(): void {
    window.addEventListener('resize', () => this.onResize());
    
    const canvas = this.renderer.domElement;
    
    canvas.addEventListener('mousedown', (e) => this.onMouseDown(e));
    canvas.addEventListener('mousemove', (e) => this.onMouseMove(e));
    canvas.addEventListener('mouseup', () => this.onMouseUp());
    canvas.addEventListener('mouseleave', () => this.onMouseUp());
    
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  private onMouseDown(event: MouseEvent): void {
    if (event.button !== 0 && event.button !== 2) return;

    this.updateMousePosition(event);
    
    if (this.currentMode === 'sculpt') {
      const direction = event.button === 0 ? 1 : -1;
      const sculpted = this.clayModel.startSculpt(
        this.mouse.x,
        this.mouse.y,
        this.camera,
        direction
      );
      
      if (sculpted) {
        this.isDragging = true;
        this.controls.enabled = false;
      }
    } else if (this.currentMode === 'paint') {
      this.raycaster.setFromCamera(this.mouse, this.camera);
      const intersects = this.raycaster.intersectObject(this.clayModel.mesh);
      
      if (intersects.length > 0) {
        this.isDragging = true;
        this.controls.enabled = false;
        this.colorManager.paintAtPoint(
          intersects[0].point,
          this.clayModel.mesh,
          this.clayModel.getColorAttribute(),
          this.clayModel.getSettings().strength
        );
      }
    }
  }

  private onMouseMove(event: MouseEvent): void {
    this.updateMousePosition(event);

    if (this.isDragging) {
      if (this.currentMode === 'sculpt') {
        this.clayModel.moveSculpt(this.mouse.x, this.mouse.y, this.camera);
      } else if (this.currentMode === 'paint') {
        this.raycaster.setFromCamera(this.mouse, this.camera);
        const intersects = this.raycaster.intersectObject(this.clayModel.mesh);
        
        if (intersects.length > 0) {
          this.colorManager.paintAtPoint(
            intersects[0].point,
            this.clayModel.mesh,
            this.clayModel.getColorAttribute(),
            this.clayModel.getSettings().strength
          );
        }
      }
    }
  }

  private onMouseUp(): void {
    if (this.isDragging) {
      if (this.currentMode === 'sculpt') {
        this.clayModel.endSculpt();
      }
      this.isDragging = false;
      this.controls.enabled = true;
    }
  }

  private updateMousePosition(event: MouseEvent): void {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  }

  private onStrengthChange(value: number): void {
    this.clayModel.setStrength(value);
    this.toolPanel.updateIntensityDisplay(value);
  }

  private onBrushRadiusChange(value: number): void {
    this.clayModel.setBrushRadius(value);
    this.colorManager.setBrushRadius(value);
  }

  private onSymmetricToggle(enabled: boolean): void {
    this.clayModel.setSymmetric(enabled);
  }

  private onReset(): void {
    this.clayModel.resetWithAnimation(500);
  }

  private onColorSelect(color: THREE.Color): void {
    this.colorManager.setCurrentColor(color);
    if (this.currentMode === 'paint') {
      this.colorManager.startColorAnimation(
        color,
        this.clayModel.getColorAttribute()
      );
    }
  }

  private onToolModeChange(mode: ToolMode): void {
    this.currentMode = mode;
  }

  private onResize(): void {
    const width = this.viewportContainer.clientWidth;
    const height = this.viewportContainer.clientHeight;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();

    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  }

  private animate(): void {
    requestAnimationFrame(() => this.animate());

    const deltaTime = this.clock.getDelta();

    this.clayModel.update(deltaTime);
    this.colorManager.update(deltaTime, this.clayModel.getColorAttribute());
    
    if (!this.isDragging) {
      this.controls.update();
    }

    this.renderer.render(this.scene, this.camera);

    this.frameCount++;
    const now = performance.now();
    if (now - this.lastFpsUpdate >= 1000) {
      this.fps = this.frameCount;
      this.frameCount = 0;
      this.lastFpsUpdate = now;
    }
  }

  public getFps(): number {
    return this.fps;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new SculptingApp();
});

export { SculptingApp };
