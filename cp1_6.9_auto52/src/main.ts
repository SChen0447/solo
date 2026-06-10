import * as THREE from 'three';
import { SceneManager, StoneLantern } from './scene';
import { SandManager } from './sand';

class Game {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private sceneManager: SceneManager;
  private sandManager: SandManager;
  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;
  private clock: number;
  private lastTime: number;
  private isDragging: boolean;
  private animationId: number | null = null;
  private container: HTMLElement;
  private hueSlider: HTMLInputElement | null = null;
  private resetButton: HTMLButtonElement | null = null;

  constructor() {
    this.container = document.getElementById('app') || document.body;
    this.scene = new THREE.Scene();
    this.clock = performance.now();
    this.lastTime = this.clock;
    this.isDragging = false;
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();

    this.camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 100);
    this.camera.position.set(0, 6, 8);
    this.camera.lookAt(0, 0, 0);

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.container.appendChild(this.renderer.domElement);

    this.setupBackground();
    this.setupLights();

    this.sceneManager = new SceneManager(this.scene);
    this.sceneManager.createGround();
    this.sceneManager.createStoneLanterns();

    this.sandManager = new SandManager(this.scene);

    this.setupUI();
    this.setupEvents();
  }

  private setupBackground(): void {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;

    const gradient = ctx.createLinearGradient(0, 0, 0, 512);
    gradient.addColorStop(0, '#1a1a1a');
    gradient.addColorStop(1, '#3a3a2a');

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 512, 512);

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;

    this.scene.background = texture;
  }

  private setupLights(): void {
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    this.scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 10, 5);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    directionalLight.shadow.camera.near = 0.5;
    directionalLight.shadow.camera.far = 50;
    directionalLight.shadow.camera.left = -10;
    directionalLight.shadow.camera.right = 10;
    directionalLight.shadow.camera.top = 10;
    directionalLight.shadow.camera.bottom = -10;
    this.scene.add(directionalLight);
  }

  private setupUI(): void {
    const controlsDiv = document.createElement('div');
    controlsDiv.style.position = 'absolute';
    controlsDiv.style.top = '20px';
    controlsDiv.style.left = '20px';
    controlsDiv.style.zIndex = '100';
    controlsDiv.style.display = 'flex';
    controlsDiv.style.flexDirection = 'column';
    controlsDiv.style.gap = '12px';
    controlsDiv.style.padding = '16px';
    controlsDiv.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
    controlsDiv.style.borderRadius = '8px';
    controlsDiv.style.color = '#fff';
    controlsDiv.style.fontFamily = 'sans-serif';

    const resetButton = document.createElement('button');
    resetButton.textContent = '重置光晕';
    resetButton.style.padding = '8px 16px';
    resetButton.style.fontSize = '14px';
    resetButton.style.cursor = 'pointer';
    resetButton.style.border = 'none';
    resetButton.style.borderRadius = '4px';
    resetButton.style.backgroundColor = '#5a6a6a';
    resetButton.style.color = '#fff';
    this.resetButton = resetButton;

    const sliderContainer = document.createElement('div');
    sliderContainer.style.display = 'flex';
    sliderContainer.style.flexDirection = 'column';
    sliderContainer.style.gap = '6px';

    const sliderLabel = document.createElement('label');
    sliderLabel.textContent = '色调偏移';
    sliderLabel.style.fontSize = '12px';

    const hueSlider = document.createElement('input');
    hueSlider.type = 'range';
    hueSlider.min = '-30';
    hueSlider.max = '30';
    hueSlider.value = '0';
    hueSlider.step = '1';
    hueSlider.style.width = '150px';
    this.hueSlider = hueSlider;

    sliderContainer.appendChild(sliderLabel);
    sliderContainer.appendChild(hueSlider);

    controlsDiv.appendChild(resetButton);
    controlsDiv.appendChild(sliderContainer);

    this.container.appendChild(controlsDiv);
  }

  private setupEvents(): void {
    window.addEventListener('resize', this.onWindowResize.bind(this));
    this.renderer.domElement.addEventListener('mousedown', this.onMouseDown.bind(this));
    this.renderer.domElement.addEventListener('mousemove', this.onMouseMove.bind(this));
    this.renderer.domElement.addEventListener('mouseup', this.onMouseUp.bind(this));
    this.renderer.domElement.addEventListener('mouseleave', this.onMouseUp.bind(this));
    this.renderer.domElement.addEventListener('click', this.onClick.bind(this));

    this.resetButton?.addEventListener('click', () => {
      this.sceneManager.resetHalos();
    });

    this.hueSlider?.addEventListener('input', (e: Event) => {
      const target = e.target as HTMLInputElement;
      this.sceneManager.setHueOffset(parseFloat(target.value));
    });
  }

  private onWindowResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  private updateMouse(event: MouseEvent): void {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  }

  private getGroundPoint(event: MouseEvent): THREE.Vector3 | null {
    this.updateMouse(event);
    this.raycaster.setFromCamera(this.mouse, this.camera);

    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const intersectPoint = new THREE.Vector3();
    this.raycaster.ray.intersectPlane(plane, intersectPoint);

    if (intersectPoint && Math.abs(intersectPoint.x) < 4 && Math.abs(intersectPoint.z) < 4) {
      return intersectPoint;
    }
    return null;
  }

  private onMouseDown(event: MouseEvent): void {
    if (event.button === 0) {
      this.isDragging = true;
      const point = this.getGroundPoint(event);
      if (point) {
        this.sandManager.addRakePoint(point.x, point.z);
      }
    }
  }

  private onMouseMove(event: MouseEvent): void {
    if (this.isDragging && event.buttons === 1) {
      const point = this.getGroundPoint(event);
      if (point) {
        this.sandManager.addRakePoint(point.x, point.z);
      }
    }
  }

  private onMouseUp(): void {
    if (this.isDragging) {
      this.isDragging = false;
      this.sandManager.endRake();
    }
  }

  private onClick(event: MouseEvent): void {
    if (this.isDragging) return;

    this.updateMouse(event);
    this.raycaster.setFromCamera(this.mouse, this.camera);

    const lanterns = this.sceneManager.getLanterns();
    const lanternGroups = lanterns.map((l) => l.group);

    const intersects = this.raycaster.intersectObjects(lanternGroups, true);

    if (intersects.length > 0) {
      let obj = intersects[0].object;
      while (obj.parent && !obj.userData.isLantern) {
        obj = obj.parent;
      }
      if (obj.userData.isLantern) {
        const lantern = lanterns.find((l) => l.group === obj);
        if (lantern) {
          this.sceneManager.clickLantern(lantern as StoneLantern);
        }
      }
    }
  }

  public start(): void {
    this.animate();
  }

  private animate(): void {
    this.animationId = requestAnimationFrame(this.animate.bind(this));

    const currentTime = performance.now();
    const deltaTime = Math.min((currentTime - this.lastTime) / 1000, 0.1);
    this.lastTime = currentTime;

    const fps = 1 / deltaTime;
    if (fps >= 30) {
      this.sceneManager.update(deltaTime);
      this.sandManager.update(deltaTime);
      this.renderer.render(this.scene, this.camera);
    }
  }

  public dispose(): void {
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
    }

    this.sceneManager.dispose();
    this.sandManager.dispose();

    if (this.scene.background instanceof THREE.CanvasTexture) {
      this.scene.background.dispose();
    }

    this.renderer.dispose();
    this.container.removeChild(this.renderer.domElement);
  }
}

const game = new Game();
game.start();
