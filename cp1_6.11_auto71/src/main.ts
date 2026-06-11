import * as THREE from 'three';
import * as dat from 'dat.gui';
import { StarField } from './StarField';
import { ConstellationLine } from './ConstellationLine';
import { StoryPanel } from './StoryPanel';
import type { StarMapData, StarData, ConstellationData } from './types';

class StarMapApp {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private container: HTMLElement;
  private starField: StarField | null = null;
  private constellations: ConstellationLine[] = [];
  private storyPanel: StoryPanel | null = null;
  private starMap: Map<string, StarData> = new Map();
  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;

  private isDragging: boolean = false;
  private previousMousePosition: { x: number; y: number } = { x: 0, y: 0 };
  private rotationVelocity: { x: number; y: number } = { x: 0, y: 0 };
  private dampingFactor: number = 0.7;
  private sphereRadius: number = 100;

  private cameraDistance: number = 180;
  private minDistance: number = 50;
  private maxDistance: number = 1000;

  private isAnimatingCamera: boolean = false;
  private cameraAnimationStart: number = 0;
  private cameraAnimationDuration: number = 2000;
  private cameraStartPos: THREE.Vector3 = new THREE.Vector3();
  private cameraTargetPos: THREE.Vector3 = new THREE.Vector3();

  private astronomicalRing: THREE.Mesh | null = null;
  private gui: dat.GUI | null = null;
  private clock: THREE.Clock;

  constructor(container: HTMLElement) {
    this.container = container;
    this.scene = new THREE.Scene();
    this.clock = new THREE.Clock();
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();

    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      2000
    );
    this.camera.position.z = this.cameraDistance;

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setClearColor(0x000000, 0);

    this.container.appendChild(this.renderer.domElement);

    this.setupEventListeners();
    this.createAstronomicalRing();
    this.initGUI();
  }

  private setupEventListeners(): void {
    window.addEventListener('resize', () => this.onWindowResize());

    const canvas = this.renderer.domElement;

    canvas.addEventListener('mousedown', (e) => this.onMouseDown(e));
    window.addEventListener('mousemove', (e) => this.onMouseMove(e));
    window.addEventListener('mouseup', () => this.onMouseUp());

    canvas.addEventListener('wheel', (e) => this.onWheel(e), { passive: false });

    canvas.addEventListener('click', (e) => this.onClick(e));

    canvas.addEventListener('touchstart', (e) => this.onTouchStart(e), { passive: false });
    canvas.addEventListener('touchmove', (e) => this.onTouchMove(e), { passive: false });
    canvas.addEventListener('touchend', () => this.onTouchEnd());
  }

  private createAstronomicalRing(): void {
    const ringGeometry = new THREE.TorusGeometry(this.sphereRadius * 1.02, 0.3, 8, 100);
    const ringMaterial = new THREE.MeshBasicMaterial({
      color: 0xd4af37,
      transparent: true,
      opacity: 0.3,
    });

    this.astronomicalRing = new THREE.Mesh(ringGeometry, ringMaterial);
    this.astronomicalRing.rotation.x = Math.PI / 2;
    this.scene.add(this.astronomicalRing);
  }

  private initGUI(): void {
    this.gui = new dat.GUI({ closed: false });
    this.gui.domElement.style.display = 'none';

    const settings = {
      显示星座: true,
      显示天文环: true,
      旋转速度: 1,
      自动旋转: false,
    };

    this.gui.add(settings, '显示星座').onChange((value: boolean) => {
      for (const constellation of this.constellations) {
        if (value) {
          constellation.show();
        } else {
          constellation.hide();
        }
      }
    });

    this.gui.add(settings, '显示天文环').onChange((value: boolean) => {
      if (this.astronomicalRing) {
        this.astronomicalRing.visible = value;
      }
    });

    this.gui.add(settings, '旋转速度', 0, 3).name('自转速度');
    this.gui.add(settings, '自动旋转').name('自动旋转');
  }

  public async loadData(): Promise<void> {
    try {
      const response = await fetch('./static/stars.json');
      const data: StarMapData = await response.json();

      for (const star of data.stars) {
        this.starMap.set(star.id, star);
      }

      this.starField = new StarField(data.stars, this.sphereRadius);
      this.scene.add(this.starField.getMesh());

      for (const constellationData of data.constellations) {
        const constellation = new ConstellationLine(
          constellationData,
          this.starMap,
          this.sphereRadius
        );
        this.constellations.push(constellation);
        this.scene.add(constellation.getGroup());
      }

      this.storyPanel = new StoryPanel();

      this.populateConstellationSelector(data.constellations);

      this.showAllConstellations();
    } catch (error) {
      console.error('Failed to load star data:', error);
    }
  }

  private populateConstellationSelector(constellations: ConstellationData[]): void {
    const selector = document.getElementById('constellation-selector') as HTMLSelectElement;
    if (!selector) return;

    const defaultOption = document.createElement('option');
    defaultOption.value = '';
    defaultOption.textContent = '选择星座...';
    selector.appendChild(defaultOption);

    for (const constellation of constellations) {
      const option = document.createElement('option');
      option.value = constellation.id;
      option.textContent = constellation.name;
      selector.appendChild(option);
    }

    selector.addEventListener('change', (e) => {
      const value = (e.target as HTMLSelectElement).value;
      this.focusOnConstellation(value);
    });
  }

  private showAllConstellations(): void {
    for (const constellation of this.constellations) {
      constellation.show();
    }
  }

  private focusOnConstellation(constellationId: string): void {
    if (!constellationId) {
      this.selectedConstellationId = null;
      for (const c of this.constellations) {
        c.setPulseIntensity(1);
        c.show();
      }
      return;
    }

    const constellation = this.constellations.find((c) => c.getId() === constellationId);
    if (!constellation) return;

    this.selectedConstellationId = constellationId;

    for (const c of this.constellations) {
      if (c.getId() === constellationId) {
        c.setPulseIntensity(1.5);
        c.show();
      } else {
        c.setPulseIntensity(1);
        c.hide();
      }
    }

    const centerPos = constellation.getCenterPosition();
    const targetPos = centerPos.clone().normalize().multiplyScalar(this.cameraDistance);

    this.startCameraAnimation(targetPos);
  }

  private startCameraAnimation(targetPos: THREE.Vector3): void {
    this.cameraStartPos.copy(this.camera.position);
    this.cameraTargetPos.copy(targetPos);
    this.cameraAnimationStart = performance.now();
    this.isAnimatingCamera = true;
    this.rotationVelocity = { x: 0, y: 0 };
  }

  private updateCameraAnimation(time: number): void {
    if (!this.isAnimatingCamera) return;

    const elapsed = time - this.cameraAnimationStart;
    const progress = Math.min(1, elapsed / this.cameraAnimationDuration);

    const easedProgress = this.easeInOutCubic(progress);

    this.camera.position.lerpVectors(
      this.cameraStartPos,
      this.cameraTargetPos,
      easedProgress
    );

    this.camera.lookAt(0, 0, 0);

    if (progress >= 1) {
      this.isAnimatingCamera = false;
    }
  }

  private easeInOutCubic(t: number): number {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  private onMouseDown(event: MouseEvent): void {
    if (this.isAnimatingCamera) return;
    this.isDragging = true;
    this.previousMousePosition = { x: event.clientX, y: event.clientY };
  }

  private onMouseMove(event: MouseEvent): void {
    if (this.isAnimatingCamera) return;

    if (this.isDragging) {
      const deltaX = event.clientX - this.previousMousePosition.x;
      const deltaY = event.clientY - this.previousMousePosition.y;

      this.rotationVelocity.x = deltaY * 0.005;
      this.rotationVelocity.y = deltaX * 0.005;

      this.rotateScene(deltaX, deltaY);

      this.previousMousePosition = { x: event.clientX, y: event.clientY };
    }
  }

  private onMouseUp(): void {
    this.isDragging = false;
  }

  private onTouchStart(event: TouchEvent): void {
    if (this.isAnimatingCamera) return;
    if (event.touches.length === 1) {
      event.preventDefault();
      this.isDragging = true;
      this.previousMousePosition = {
        x: event.touches[0].clientX,
        y: event.touches[0].clientY,
      };
    }
  }

  private onTouchMove(event: TouchEvent): void {
    if (this.isAnimatingCamera) return;
    if (this.isDragging && event.touches.length === 1) {
      event.preventDefault();
      const deltaX = event.touches[0].clientX - this.previousMousePosition.x;
      const deltaY = event.touches[0].clientY - this.previousMousePosition.y;

      this.rotationVelocity.x = deltaY * 0.005;
      this.rotationVelocity.y = deltaX * 0.005;

      this.rotateScene(deltaX, deltaY);

      this.previousMousePosition = {
        x: event.touches[0].clientX,
        y: event.touches[0].clientY,
      };
    }
  }

  private onTouchEnd(): void {
    this.isDragging = false;
  }

  private rotateScene(deltaX: number, deltaY: number): void {
    const rotationSpeed = 0.005;

    const spherical = new THREE.Spherical();
    spherical.setFromVector3(this.camera.position);

    spherical.theta -= deltaX * rotationSpeed;
    spherical.phi -= deltaY * rotationSpeed;

    spherical.phi = Math.max(0.1, Math.min(Math.PI - 0.1, spherical.phi));

    this.camera.position.setFromSpherical(spherical);
    this.camera.lookAt(0, 0, 0);
  }

  private applyInertia(): void {
    if (this.isDragging || this.isAnimatingCamera) return;
    if (Math.abs(this.rotationVelocity.x) < 0.0001 && Math.abs(this.rotationVelocity.y) < 0.0001) return;

    const deltaX = this.rotationVelocity.y * 100;
    const deltaY = this.rotationVelocity.x * 100;

    this.rotateScene(deltaX, deltaY);

    this.rotationVelocity.x *= this.dampingFactor;
    this.rotationVelocity.y *= this.dampingFactor;
  }

  private onWheel(event: WheelEvent): void {
    event.preventDefault();

    const zoomSpeed = 0.1;
    const zoomDirection = event.deltaY > 0 ? 1 : -1;

    this.cameraDistance *= 1 + zoomDirection * zoomSpeed;
    this.cameraDistance = Math.max(this.minDistance, Math.min(this.maxDistance, this.cameraDistance));

    const direction = this.camera.position.clone().normalize();
    this.camera.position.copy(direction.multiplyScalar(this.cameraDistance));
  }

  private onClick(event: MouseEvent): void {
    if (!this.starField || !this.storyPanel) return;

    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);

    const intersects = this.raycaster.intersectObject(this.starField.getMesh());

    if (intersects.length > 0) {
      const index = intersects[0].index;
      if (index !== undefined) {
        const starData = this.starField.getStarData(index);
        if (starData) {
          this.storyPanel.show(starData);
        }
      }
    }
  }

  private onWindowResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();

    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  public animate(): void {
    requestAnimationFrame(() => this.animate());

    const time = performance.now();
    this.clock.getDelta();

    if (this.starField) {
      this.starField.update(time * 0.001);
    }

    for (const constellation of this.constellations) {
      constellation.update(time, this.camera);
    }

    this.applyInertia();
    this.updateCameraAnimation(time);

    if (this.astronomicalRing) {
      this.astronomicalRing.rotation.z += 0.001;
    }

    this.renderer.render(this.scene, this.camera);
  }

  public dispose(): void {
    if (this.starField) {
      this.starField.dispose();
    }

    for (const constellation of this.constellations) {
      constellation.dispose();
    }

    if (this.storyPanel) {
      this.storyPanel.dispose();
    }

    if (this.astronomicalRing) {
      this.astronomicalRing.geometry.dispose();
      (this.astronomicalRing.material as THREE.Material).dispose();
    }

    if (this.gui) {
      this.gui.destroy();
    }

    this.renderer.dispose();
  }
}

const container = document.getElementById('canvas-container');
if (container) {
  const app = new StarMapApp(container);
  app.loadData().then(() => {
    app.animate();
  });
}
