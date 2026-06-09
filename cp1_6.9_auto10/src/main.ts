import * as THREE from 'three';
import { Forest } from './forest';
import { SporeSpread } from './sporeSpread';
import { initAudioOnInteraction } from './audio';

class DreamSporeForest {
  private container: HTMLElement;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private forest: Forest;
  private sporeSpread: SporeSpread;
  private clock: THREE.Clock;
  private elapsedTime = 0;

  private cameraRadius = 15;
  private cameraTheta = Math.PI / 4;
  private cameraPhi = Math.PI / 3;
  private readonly minPhi = (30 * Math.PI) / 180;
  private readonly maxPhi = (80 * Math.PI) / 180;
  private readonly minRadius = 8;
  private readonly maxRadius = 25;

  private isDragging = false;
  private lastMouseX = 0;
  private lastMouseY = 0;
  private mouseDownPos = { x: 0, y: 0 };

  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;

  private sporeCountEl: HTMLElement;
  private treeCountEl: HTMLElement;
  private statsUpdateTimer = 0;

  constructor() {
    this.container = document.getElementById('canvas-container')!;
    this.sporeCountEl = document.getElementById('spore-count')!;
    this.treeCountEl = document.getElementById('tree-count')!;

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      100
    );
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true
    });
    this.clock = new THREE.Clock();
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();

    this.forest = new Forest(this.scene);
    this.sporeSpread = new SporeSpread(this.scene, this.forest);

    this.init();
  }

  private init(): void {
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setClearColor(0x000000, 0);
    this.container.appendChild(this.renderer.domElement);

    this.updateCameraPosition();
    this.forest.init();
    this.bindEvents();
    this.animate();
  }

  private updateCameraPosition(): void {
    const x = this.cameraRadius * Math.sin(this.cameraPhi) * Math.sin(this.cameraTheta);
    const y = this.cameraRadius * Math.cos(this.cameraPhi);
    const z = this.cameraRadius * Math.sin(this.cameraPhi) * Math.cos(this.cameraTheta);
    this.camera.position.set(x, y, z);
    this.camera.lookAt(0, 0, 0);
  }

  private bindEvents(): void {
    window.addEventListener('resize', this.onWindowResize.bind(this));

    const canvas = this.renderer.domElement;
    canvas.addEventListener('mousedown', this.onMouseDown.bind(this));
    canvas.addEventListener('mousemove', this.onMouseMove.bind(this));
    window.addEventListener('mouseup', this.onMouseUp.bind(this));
    canvas.addEventListener('wheel', this.onWheel.bind(this), { passive: false });
    canvas.addEventListener('click', this.onClick.bind(this));

    canvas.addEventListener('touchstart', this.onTouchStart.bind(this), { passive: false });
    canvas.addEventListener('touchmove', this.onTouchMove.bind(this), { passive: false });
    canvas.addEventListener('touchend', this.onTouchEnd.bind(this));

    this.bindControlPanel();
  }

  private bindControlPanel(): void {
    const windSlider = document.getElementById('wind-slider') as HTMLInputElement;
    const windValue = document.getElementById('wind-value')!;
    windSlider.addEventListener('input', () => {
      const val = parseFloat(windSlider.value);
      windValue.textContent = val.toFixed(1);
      this.sporeSpread.updateParams({ windStrength: val });
    });

    const intervalSlider = document.getElementById('interval-slider') as HTMLInputElement;
    const intervalValue = document.getElementById('interval-value')!;
    intervalSlider.addEventListener('input', () => {
      const val = parseFloat(intervalSlider.value);
      intervalValue.textContent = val.toFixed(1);
      this.sporeSpread.updateParams({ spawningInterval: val });
    });

    const themeButtons = document.querySelectorAll('.theme-btn');
    themeButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        themeButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const theme = btn.getAttribute('data-theme') as 'purple' | 'green' | 'orange';
        this.forest.params.colorTheme = theme;
        initAudioOnInteraction();
      });
    });
  }

  private onWindowResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  private onMouseDown(e: MouseEvent): void {
    this.isDragging = true;
    this.lastMouseX = e.clientX;
    this.lastMouseY = e.clientY;
    this.mouseDownPos = { x: e.clientX, y: e.clientY };
    initAudioOnInteraction();
  }

  private onMouseMove(e: MouseEvent): void {
    if (!this.isDragging) return;

    const deltaX = e.clientX - this.lastMouseX;
    const deltaY = e.clientY - this.lastMouseY;

    this.cameraTheta -= deltaX * 0.005;
    this.cameraPhi -= deltaY * 0.005;
    this.cameraPhi = Math.max(this.minPhi, Math.min(this.maxPhi, this.cameraPhi));

    this.updateCameraPosition();

    this.lastMouseX = e.clientX;
    this.lastMouseY = e.clientY;
  }

  private onMouseUp(_e: MouseEvent): void {
    this.isDragging = false;
  }

  private onWheel(e: WheelEvent): void {
    e.preventDefault();
    const delta = e.deltaY * 0.01;
    this.cameraRadius += delta;
    this.cameraRadius = Math.max(this.minRadius, Math.min(this.maxRadius, this.cameraRadius));
    this.updateCameraPosition();
  }

  private onClick(e: MouseEvent): void {
    const dx = Math.abs(e.clientX - this.mouseDownPos.x);
    const dy = Math.abs(e.clientY - this.mouseDownPos.y);
    if (dx > 5 || dy > 5) return;

    this.mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
    this.mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);

    const treeMeshes: THREE.Object3D[] = [];
    this.forest.trees.forEach(tree => {
      treeMeshes.push(tree.crownMesh);
      treeMeshes.push(tree.trunkMesh);
    });

    const intersects = this.raycaster.intersectObjects(treeMeshes, false);
    if (intersects.length > 0) {
      let obj: THREE.Object3D | null = intersects[0].object;
      while (obj && obj.type !== 'Group') {
        obj = obj.parent;
      }
      if (obj) {
        for (const tree of this.forest.trees.values()) {
          if (tree.group === obj) {
            this.forest.highlightTreeAndDescendants(tree.id);
            break;
          }
        }
      }
    }
  }

  private onTouchStart(e: TouchEvent): void {
    if (e.touches.length === 1) {
      e.preventDefault();
      this.isDragging = true;
      this.lastMouseX = e.touches[0].clientX;
      this.lastMouseY = e.touches[0].clientY;
      this.mouseDownPos = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      initAudioOnInteraction();
    }
  }

  private onTouchMove(e: TouchEvent): void {
    if (!this.isDragging || e.touches.length !== 1) return;
    e.preventDefault();

    const deltaX = e.touches[0].clientX - this.lastMouseX;
    const deltaY = e.touches[0].clientY - this.lastMouseY;

    this.cameraTheta -= deltaX * 0.005;
    this.cameraPhi -= deltaY * 0.005;
    this.cameraPhi = Math.max(this.minPhi, Math.min(this.maxPhi, this.cameraPhi));

    this.updateCameraPosition();

    this.lastMouseX = e.touches[0].clientX;
    this.lastMouseY = e.touches[0].clientY;
  }

  private onTouchEnd(_e: TouchEvent): void {
    this.isDragging = false;
  }

  private animate(): void {
    requestAnimationFrame(this.animate.bind(this));

    const deltaTime = Math.min(this.clock.getDelta(), 0.1);
    this.elapsedTime += deltaTime;

    this.forest.update(deltaTime, this.elapsedTime);
    this.sporeSpread.update(deltaTime);

    this.statsUpdateTimer += deltaTime;
    if (this.statsUpdateTimer >= 0.2) {
      this.statsUpdateTimer = 0;
      this.updateStats();
    }

    this.renderer.render(this.scene, this.camera);
  }

  private updateStats(): void {
    this.sporeCountEl.textContent = this.sporeSpread.getSporeCount().toString();
    this.treeCountEl.textContent = this.forest.getTreeCount().toString();
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new DreamSporeForest();
});
