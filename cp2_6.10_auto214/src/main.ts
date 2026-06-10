import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { LayersManager } from './LayersManager';
import { GuiController } from './GuiController';
import { LayerProfile } from './profiles';

class AtmosphereApp {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;
  private layersManager: LayersManager;
  private guiController: GuiController;
  private raycaster: THREE.Raycaster;
  private pointer: THREE.Vector2;
  private clock: THREE.Clock;

  private container: HTMLElement;
  private popupEl: HTMLElement;
  private popupNameEl: HTMLElement;
  private popupHeightEl: HTMLElement;
  private popupTempEl: HTMLElement;
  private popupCompEl: HTMLElement;
  private mobileToggleEl: HTMLElement;
  private panelContainerEl: HTMLElement;

  private rotationSpeed: number = 1;
  private hoveredLayerId: string | null = null;
  private pinnedLayerId: string | null = null;
  private animatingReset: boolean = false;
  private resetStartTime: number = 0;
  private resetFromPos: THREE.Vector3 = new THREE.Vector3();
  private resetFromTarget: THREE.Vector3 = new THREE.Vector3();
  private readonly RESET_POS = new THREE.Vector3(21.2, 21.2, 21.2);
  private readonly RESET_TARGET = new THREE.Vector3(0, 0, 0);
  private readonly RESET_DURATION = 1000;

  private onResizeBound: () => void;
  private onPointerMoveBound: (e: PointerEvent) => void;
  private onClickBound: () => void;
  private onKeyDownBound: (e: KeyboardEvent) => void;
  private onPopupClickBound: (e: MouseEvent) => void;
  private onMobileToggleBound: () => void;

  private userIsInteracting: boolean = false;

  constructor() {
    this.container = document.getElementById('canvas-container')!;
    this.popupEl = document.getElementById('info-popup')!;
    this.popupNameEl = document.getElementById('popup-name')!;
    this.popupHeightEl = document.getElementById('popup-height')!;
    this.popupTempEl = document.getElementById('popup-temp')!;
    this.popupCompEl = document.getElementById('popup-composition')!;
    this.mobileToggleEl = document.getElementById('mobile-panel-toggle')!;
    this.panelContainerEl = document.getElementById('panel-container')!;

    this.raycaster = new THREE.Raycaster();
    this.pointer = new THREE.Vector2(-10, -10);
    this.clock = new THREE.Clock();

    this.onResizeBound = this.onResize.bind(this);
    this.onPointerMoveBound = this.onPointerMove.bind(this);
    this.onClickBound = this.onClick.bind(this);
    this.onKeyDownBound = this.onKeyDown.bind(this);
    this.onPopupClickBound = this.onPopupClick.bind(this);
    this.onMobileToggleBound = this.onMobileToggle.bind(this);

    this.scene = this.createScene();
    this.camera = this.createCamera();
    this.renderer = this.createRenderer();
    this.controls = this.createControls();
    this.layersManager = new LayersManager(this.scene);
    this.layersManager.build();

    this.guiController = new GuiController(
      this.panelContainerEl,
      this.layersManager,
      (speed) => { this.rotationSpeed = speed; }
    );

    this.setupLights();
    this.addStarfield();
    this.bindEvents();
    this.animate = this.animate.bind(this);
    this.animate();
  }

  private createScene(): THREE.Scene {
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x0b1026, 0.015);
    return scene;
  }

  private createCamera(): THREE.PerspectiveCamera {
    const camera = new THREE.PerspectiveCamera(
      50,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    camera.position.copy(this.RESET_POS);
    camera.lookAt(this.RESET_TARGET);
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
    this.container.appendChild(renderer.domElement);
    return renderer;
  }

  private createControls(): OrbitControls {
    const controls = new OrbitControls(this.camera, this.renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.minDistance = 8;
    controls.maxDistance = 60;
    controls.minPolarAngle = Math.PI / 6;
    controls.maxPolarAngle = Math.PI / 2.2;
    controls.rotateSpeed = 0.8;
    controls.zoomSpeed = 0.9;
    controls.target.copy(this.RESET_TARGET);

    controls.addEventListener('start', () => { this.userIsInteracting = true; });
    controls.addEventListener('end', () => { this.userIsInteracting = false; });

    return controls;
  }

  private setupLights(): void {
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    this.scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(10, 20, 10);
    this.scene.add(dirLight);

    const pointLight = new THREE.PointLight(0x87CEEB, 0.4, 50);
    pointLight.position.set(-10, 10, -10);
    this.scene.add(pointLight);
  }

  private addStarfield(): void {
    const starCount = 300;
    const positions = new Float32Array(starCount * 3);

    for (let i = 0; i < starCount; i++) {
      const r = 80 + Math.random() * 40;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI;
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.cos(phi);
      positions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const material = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.25,
      transparent: true,
      opacity: 0.7,
      sizeAttenuation: true
    });

    const stars = new THREE.Points(geometry, material);
    this.scene.add(stars);
  }

  private bindEvents(): void {
    window.addEventListener('resize', this.onResizeBound);
    window.addEventListener('pointermove', this.onPointerMoveBound);
    window.addEventListener('click', this.onClickBound);
    window.addEventListener('keydown', this.onKeyDownBound);
    this.popupEl.addEventListener('click', this.onPopupClickBound);
    this.mobileToggleEl.addEventListener('click', this.onMobileToggleBound);
  }

  private onPopupClick(e: MouseEvent): void {
    e.stopPropagation();
    if (this.pinnedLayerId && this.hoveredLayerId === this.pinnedLayerId) {
      this.pinnedLayerId = null;
      this.popupEl.classList.remove('pinned');
      if (!this.hoveredLayerId || this.hoveredLayerId !== this.pinnedLayerId) {
        this.layersManager.highlightLayer(this.hoveredLayerId!, false);
        this.hoveredLayerId = null;
        this.hidePopup();
      }
    } else if (this.hoveredLayerId) {
      this.pinnedLayerId = this.hoveredLayerId;
      this.popupEl.classList.add('pinned');
    }
  }

  private onMobileToggle(): void {
    this.panelContainerEl.classList.toggle('expanded');
  }

  private onResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  private onPointerMove(event: PointerEvent): void {
    this.pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
    this.pointer.y = -(event.clientY / window.innerHeight) * 2 + 1;
  }

  private onClick(): void {
    // placeholder for potential future click logic
  }

  private onKeyDown(event: KeyboardEvent): void {
    if (event.code === 'Space') {
      event.preventDefault();
      this.startCameraReset();
    }
  }

  private startCameraReset(): void {
    if (this.animatingReset) return;
    this.animatingReset = true;
    this.resetStartTime = performance.now();
    this.resetFromPos.copy(this.camera.position);
    this.resetFromTarget.copy(this.controls.target);
  }

  private easeInOutCubic(t: number): number {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  private updateCameraReset(): void {
    if (!this.animatingReset) return;

    const elapsed = performance.now() - this.resetStartTime;
    const t = Math.min(elapsed / this.RESET_DURATION, 1);
    const eased = this.easeInOutCubic(t);

    this.camera.position.lerpVectors(this.resetFromPos, this.RESET_POS, eased);
    this.controls.target.lerpVectors(this.resetFromTarget, this.RESET_TARGET, eased);

    if (t >= 1) {
      this.animatingReset = false;
      this.camera.position.copy(this.RESET_POS);
      this.controls.target.copy(this.RESET_TARGET);
    }
  }

  private updateHover(): void {
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const layerMeshes = this.layersManager.getLayerObjects()
      .filter((lo) => lo.mesh.visible)
      .map((lo) => lo.mesh);
    const intersects = this.raycaster.intersectObjects(layerMeshes, false);

    let newHoveredId: string | null = null;
    if (intersects.length > 0) {
      newHoveredId = intersects[0].object.userData.layerId as string;
    }

    const activeId = this.pinnedLayerId || newHoveredId;

    if (activeId !== this.hoveredLayerId) {
      if (this.hoveredLayerId && this.hoveredLayerId !== this.pinnedLayerId) {
        this.layersManager.highlightLayer(this.hoveredLayerId, false);
      }

      this.hoveredLayerId = activeId;

      if (activeId) {
        this.layersManager.highlightLayer(activeId, true);
        this.showPopup(activeId);
      } else if (!this.pinnedLayerId) {
        this.hidePopup();
      }
    }

    if (activeId && !this.pinnedLayerId) {
      const mouseX = (this.pointer.x + 1) / 2 * window.innerWidth;
      const mouseY = (this.pointer.y + 1) / -2 * window.innerHeight;
      this.positionPopup(mouseX, mouseY);
    }
  }

  private showPopup(layerId: string): void {
    const layer = this.layersManager.getLayerObjects().find((l) => l.id === layerId);
    if (!layer) return;

    const profile: LayerProfile = layer.profile;
    this.popupNameEl.textContent = profile.name;
    this.popupHeightEl.textContent = `${profile.minAltitude} - ${Math.min(profile.maxAltitude, 80)} km`;
    this.popupTempEl.textContent = profile.avgTemp;
    this.popupCompEl.textContent = '主要成分：' + profile.composition.join(' · ');

    this.popupEl.classList.add('visible');
  }

  private hidePopup(): void {
    this.popupEl.classList.remove('visible');
    this.popupEl.classList.remove('pinned');
  }

  private positionPopup(x: number, y: number): void {
    const popupRect = this.popupEl.getBoundingClientRect();
    let px = x + 15;
    let py = y + 15;

    if (px + popupRect.width > window.innerWidth - 10) {
      px = x - popupRect.width - 15;
    }
    if (py + popupRect.height > window.innerHeight - 10) {
      py = y - popupRect.height - 15;
    }
    if (px < 10) px = 10;
    if (py < 10) py = 10;

    this.popupEl.style.left = px + 'px';
    this.popupEl.style.top = py + 'px';
  }

  private updateRotation(delta: number): void {
    if (this.animatingReset || this.userIsInteracting) return;

    const rotDelta = delta * 0.15 * this.rotationSpeed;
    const group = this.layersManager.getGroup();
    group.rotation.y += rotDelta;
  }

  private animate(): void {
    requestAnimationFrame(this.animate);
    const delta = this.clock.getDelta();
    const elapsed = this.clock.getElapsedTime();

    this.updateCameraReset();
    this.updateHover();
    this.updateRotation(delta);
    this.layersManager.updateTemperaturePulse(elapsed / 2);

    if (!this.animatingReset) {
      this.controls.update();
    }

    this.renderer.render(this.scene, this.camera);
  }

  dispose(): void {
    window.removeEventListener('resize', this.onResizeBound);
    window.removeEventListener('pointermove', this.onPointerMoveBound);
    window.removeEventListener('click', this.onClickBound);
    window.removeEventListener('keydown', this.onKeyDownBound);
    this.popupEl.removeEventListener('click', this.onPopupClickBound);
    this.mobileToggleEl.removeEventListener('click', this.onMobileToggleBound);
    this.controls.dispose();
    this.renderer.dispose();
    this.layersManager.dispose();
    this.guiController.dispose();
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new AtmosphereApp();
});
