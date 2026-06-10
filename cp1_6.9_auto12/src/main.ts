import * as THREE from 'three';
import { OrigamiPaper, FoldLine, CornerInfo, EdgeInfo } from './origami';
import { GoldParticles, ShowcaseAnimation, BackgroundTransition, AudioManager } from './effects';
import './styles.css';

class OrigamiStudio {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private paper: OrigamiPaper;
  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;
  private container: HTMLElement;
  private canvas: HTMLCanvasElement;

  private hoveredCorner: CornerInfo | null = null;
  private hoveredEdge: EdgeInfo | null = null;
  private isDragging = false;
  private dragStartPos = new THREE.Vector2();
  private currentFoldLine: FoldLine | null = null;
  private creasePreviewActive = false;
  private showcaseActive = false;

  private goldParticles: GoldParticles;
  private showcaseAnimation: ShowcaseAnimation;
  private backgroundTransition: BackgroundTransition;
  private audioManager: AudioManager;

  private progressBar: HTMLElement;
  private appElement: HTMLElement;

  constructor() {
    this.container = document.getElementById('workbench-container')!;
    this.canvas = document.getElementById('workbench-canvas') as HTMLCanvasElement;
    this.progressBar = document.getElementById('progress-bar')!;
    this.appElement = document.getElementById('app')!;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xf0f0f0);

    this.camera = new THREE.PerspectiveCamera(
      45,
      this.container.clientWidth / this.container.clientHeight,
      0.1,
      2000
    );
    this.camera.position.set(0, 200, 500);
    this.camera.lookAt(0, 0, 0);

    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      alpha: true
    });
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    this.paper = new OrigamiPaper();
    this.scene.add(this.paper.getGroup());

    this.setupLights();

    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();

    this.goldParticles = new GoldParticles(10);
    this.scene.add(this.goldParticles.group);

    this.showcaseAnimation = new ShowcaseAnimation(this.paper.getGroup());
    this.backgroundTransition = new BackgroundTransition(this.renderer);
    this.audioManager = new AudioManager();

    this.setupEventListeners();
    this.updateProgress();
    this.animate();
  }

  private setupLights(): void {
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    this.scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(200, 300, 200);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    directionalLight.shadow.camera.near = 0.5;
    directionalLight.shadow.camera.far = 1000;
    directionalLight.shadow.camera.left = -300;
    directionalLight.shadow.camera.right = 300;
    directionalLight.shadow.camera.top = 300;
    directionalLight.shadow.camera.bottom = -300;
    this.scene.add(directionalLight);

    const fillLight = new THREE.DirectionalLight(0xffffff, 0.3);
    fillLight.position.set(-200, 100, -200);
    this.scene.add(fillLight);
  }

  private setupEventListeners(): void {
    this.canvas.addEventListener('mousedown', this.onMouseDown.bind(this));
    this.canvas.addEventListener('mousemove', this.onMouseMove.bind(this));
    this.canvas.addEventListener('mouseup', this.onMouseUp.bind(this));
    this.canvas.addEventListener('mouseleave', this.onMouseUp.bind(this));

    this.canvas.addEventListener('touchstart', this.onTouchStart.bind(this), { passive: false });
    this.canvas.addEventListener('touchmove', this.onTouchMove.bind(this), { passive: false });
    this.canvas.addEventListener('touchend', this.onTouchEnd.bind(this));

    document.getElementById('undo-btn')!.addEventListener('click', () => {
      this.audioManager.resume();
      this.paper.undo(this.scene).then(() => this.updateProgress());
    });

    document.getElementById('preview-btn')!.addEventListener('click', () => {
      this.audioManager.resume();
      this.creasePreviewActive = !this.creasePreviewActive;
      this.paper.toggleCreasePreview(this.creasePreviewActive);
      const btn = document.getElementById('preview-btn')!;
      if (this.creasePreviewActive) {
        btn.classList.add('preview-active');
      } else {
        btn.classList.remove('preview-active');
      }
    });

    document.getElementById('reset-btn')!.addEventListener('click', () => {
      this.audioManager.resume();
      this.paper.reset();
      this.updateProgress();
      if (this.showcaseActive) {
        this.exitShowcase();
      }
    });

    document.getElementById('showcase-btn')!.addEventListener('click', () => {
      this.audioManager.resume();
      if (this.showcaseActive) {
        this.exitShowcase();
      } else {
        this.enterShowcase();
      }
    });

    window.addEventListener('resize', this.onResize.bind(this));
  }

  private getMousePosition(clientX: number, clientY: number): void {
    const rect = this.canvas.getBoundingClientRect();
    this.mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1;
  }

  private getIntersectionPoint(): THREE.Vector3 | null {
    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObject(this.paper.mesh);
    if (intersects.length > 0) {
      return intersects[0].point.clone();
    }
    return null;
  }

  private onMouseDown(event: MouseEvent): void {
    this.audioManager.resume();
    if (this.paper.isAnimating || this.showcaseActive) return;

    this.getMousePosition(event.clientX, event.clientY);
    const point = this.getIntersectionPoint();
    if (!point) return;

    this.dragStartPos.set(event.clientX, event.clientY);

    const corner = this.paper.findNearestCorner(point);
    const edge = this.paper.findNearestEdge(point);

    if (corner) {
      this.isDragging = true;
      this.currentFoldLine = this.paper.getFoldLineFromCorner(corner);
      this.paper.showPreviewFoldLine(this.currentFoldLine, this.scene);
    } else if (edge) {
      this.isDragging = true;
      this.currentFoldLine = this.paper.getMidlineFromEdge(edge);
      this.paper.showPreviewFoldLine(this.currentFoldLine, this.scene);
    }
  }

  private onMouseMove(event: MouseEvent): void {
    if (this.showcaseActive) return;

    this.getMousePosition(event.clientX, event.clientY);
    const point = this.getIntersectionPoint();

    if (!this.isDragging && point) {
      const corner = this.paper.findNearestCorner(point);
      const edge = this.paper.findNearestEdge(point);

      if (corner && corner !== this.hoveredCorner) {
        this.hoveredCorner = corner;
        this.hoveredEdge = null;
        const foldLine = this.paper.getFoldLineFromCorner(corner);
        this.paper.showPreviewFoldLine(foldLine, this.scene);
        this.canvas.style.cursor = 'pointer';
      } else if (edge && edge !== this.hoveredEdge) {
        this.hoveredEdge = edge;
        this.hoveredCorner = null;
        const foldLine = this.paper.getMidlineFromEdge(edge);
        this.paper.showPreviewFoldLine(foldLine, this.scene);
        this.canvas.style.cursor = 'pointer';
      } else if (!corner && !edge && (this.hoveredCorner || this.hoveredEdge)) {
        this.hoveredCorner = null;
        this.hoveredEdge = null;
        this.paper.clearPreviewLines(this.scene);
        this.canvas.style.cursor = 'default';
      }
    }
  }

  private onMouseUp(event: MouseEvent): void {
    if (!this.isDragging || !this.currentFoldLine) {
      this.isDragging = false;
      return;
    }

    const dx = event.clientX - this.dragStartPos.x;
    const dy = event.clientY - this.dragStartPos.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance > 30 && this.currentFoldLine) {
      this.audioManager.playFoldSound();
      this.paper.performFold(this.currentFoldLine, 800).then(() => {
        this.updateProgress();
      });
    } else {
      this.paper.clearPreviewLines(this.scene);
    }

    this.isDragging = false;
    this.currentFoldLine = null;
  }

  private onTouchStart(event: TouchEvent): void {
    event.preventDefault();
    if (event.touches.length !== 1) return;

    const touch = event.touches[0];
    const mouseEvent = new MouseEvent('mousedown', {
      clientX: touch.clientX,
      clientY: touch.clientY
    });
    this.onMouseDown(mouseEvent);
  }

  private onTouchMove(event: TouchEvent): void {
    event.preventDefault();
    if (event.touches.length !== 1) return;

    const touch = event.touches[0];
    const mouseEvent = new MouseEvent('mousemove', {
      clientX: touch.clientX,
      clientY: touch.clientY
    });
    this.onMouseMove(mouseEvent);
  }

  private onTouchEnd(event: TouchEvent): void {
    if (event.changedTouches.length !== 1) return;

    const touch = event.changedTouches[0];
    const mouseEvent = new MouseEvent('mouseup', {
      clientX: touch.clientX,
      clientY: touch.clientY
    });
    this.onMouseUp(mouseEvent);
  }

  private onResize(): void {
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  private updateProgress(): void {
    const progress = this.paper.getProgress();
    this.progressBar.style.width = `${progress}%`;
  }

  private enterShowcase(): void {
    this.showcaseActive = true;
    this.appElement.classList.add('showcase-mode');
    this.paper.clearPreviewLines(this.scene);

    this.backgroundTransition.start(true);
    this.showcaseAnimation.start();
    this.goldParticles.start();

    this.camera.position.set(0, 150, 550);
    this.camera.lookAt(0, 0, 0);
  }

  private exitShowcase(): void {
    this.showcaseActive = false;
    this.appElement.classList.remove('showcase-mode');
    this.backgroundTransition.start(false);
    this.paper.getGroup().rotation.y = 0;

    this.camera.position.set(0, 200, 500);
    this.camera.lookAt(0, 0, 0);
  }

  private animate(): void {
    requestAnimationFrame(() => this.animate());

    this.showcaseAnimation.update();
    this.backgroundTransition.update();
    this.goldParticles.update();

    if (!this.showcaseActive) {
      const time = Date.now() * 0.0005;
      this.camera.position.x = Math.sin(time) * 20;
      this.camera.lookAt(0, 0, 0);
    }

    this.renderer.render(this.scene, this.camera);
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new OrigamiStudio();
});
