import * as THREE from 'three';
import { StarNetwork } from './starNetwork';
import { StarTrail } from './starTrail';

export interface UIState {
  totalLength: number;
  intersectionCount: number;
  colorProgress: number;
  dragSpeed: number;
}

export class UIManager {
  private container: HTMLElement;
  private panel: HTMLDivElement;
  private lengthElement: HTMLSpanElement;
  private intersectionsElement: HTMLSpanElement;
  private progressElement: HTMLSpanElement;
  private speedElement: HTMLSpanElement;

  private network: StarNetwork;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;

  private isDragging: boolean = false;
  private activeTrail: StarTrail | null = null;
  private lastMousePos: THREE.Vector2 = new THREE.Vector2();
  private currentMousePos: THREE.Vector2 = new THREE.Vector2();
  private dragSpeed: number = 0;
  private raycaster: THREE.Raycaster = new THREE.Raycaster();
  private referencePlane: THREE.Plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
  private startFromNode: THREE.Vector3 | null = null;

  private readonly particleLimit: number = 2000;

  constructor(
    container: HTMLElement,
    network: StarNetwork,
    camera: THREE.PerspectiveCamera,
    renderer: THREE.WebGLRenderer
  ) {
    this.container = container;
    this.network = network;
    this.camera = camera;
    this.renderer = renderer;

    this.panel = this.createPanel();
    this.lengthElement = this.panel.querySelector('[data-length]')!;
    this.intersectionsElement = this.panel.querySelector('[data-intersections]')!;
    this.progressElement = this.panel.querySelector('[data-progress]')!;
    this.speedElement = this.panel.querySelector('[data-speed]')!;

    this.setupEventListeners();
  }

  private createPanel(): HTMLDivElement {
    const panel = document.createElement('div');
    panel.style.cssText = `
      position: fixed;
      right: 20px;
      bottom: 20px;
      background: rgba(17, 17, 34, 0.6);
      backdrop-filter: blur(10px);
      border-radius: 8px;
      padding: 16px 20px;
      color: #ffffff;
      font-family: 'Segoe UI', 'Microsoft YaHei', sans-serif;
      font-size: 13px;
      z-index: 1000;
      transition: transform 0.2s ease;
      min-width: 180px;
      border: 1px solid rgba(136, 170, 255, 0.2);
      user-select: none;
    `;

    panel.innerHTML = `
      <div style="margin-bottom: 8px; font-weight: 600; color: #88aaff; font-size: 14px; border-bottom: 1px solid rgba(136, 170, 255, 0.2); padding-bottom: 6px;">
        ✦ 星轨信息
      </div>
      <div style="margin: 6px 0; display: flex; justify-content: space-between; align-items: center;">
        <span style="color: rgba(255,255,255,0.7);">丝线总长:</span>
        <span data-length style="color: #88ffaa; font-weight: 500; font-variant-numeric: tabular-nums;">0.0</span>
        <span style="color: rgba(255,255,255,0.5); font-size: 11px;">单位</span>
      </div>
      <div style="margin: 6px 0; display: flex; justify-content: space-between; align-items: center;">
        <span style="color: rgba(255,255,255,0.7);">交叉点数:</span>
        <span data-intersections style="color: #ff88aa; font-weight: 500; font-variant-numeric: tabular-nums;">0</span>
        <span style="color: rgba(255,255,255,0.5); font-size: 11px;">个</span>
      </div>
      <div style="margin: 6px 0; display: flex; justify-content: space-between; align-items: center;">
        <span style="color: rgba(255,255,255,0.7);">渐变进度:</span>
        <span data-progress style="color: #cc88ff; font-weight: 500; font-variant-numeric: tabular-nums;">0%</span>
      </div>
      <div style="margin: 6px 0; display: flex; justify-content: space-between; align-items: center;">
        <span style="color: rgba(255,255,255,0.7);">拖拽速度:</span>
        <span data-speed style="color: #ffaa88; font-weight: 500; font-variant-numeric: tabular-nums;">0</span>
        <span style="color: rgba(255,255,255,0.5); font-size: 11px;">px/帧</span>
      </div>
      <div style="margin-top: 10px; font-size: 11px; color: rgba(255,255,255,0.4); line-height: 1.5;">
        左键拖拽编织星轨<br/>
        右键节点开始新织线
      </div>
    `;

    panel.addEventListener('mouseenter', () => {
      panel.style.transform = 'scale(1.05)';
    });
    panel.addEventListener('mouseleave', () => {
      panel.style.transform = 'scale(1)';
    });

    this.container.appendChild(panel);
    return panel;
  }

  private setupEventListeners(): void {
    const domElement = this.renderer.domElement;

    domElement.addEventListener('contextmenu', (e) => {
      e.preventDefault();
    });

    domElement.addEventListener('mousedown', (e) => {
      if (e.button === 0) {
        this.handleLeftMouseDown(e);
      } else if (e.button === 2) {
        this.handleRightMouseDown(e);
      }
    });

    domElement.addEventListener('mousemove', (e) => {
      this.handleMouseMove(e);
    });

    domElement.addEventListener('mouseup', (e) => {
      if (e.button === 0) {
        this.handleLeftMouseUp();
      }
    });

    domElement.addEventListener('mouseleave', () => {
      this.handleLeftMouseUp();
    });
  }

  private handleLeftMouseDown(e: MouseEvent): void {
    const totalParticles = this.network.getTotalParticleCount();
    if (totalParticles >= this.particleLimit) return;

    this.isDragging = true;
    this.updateMousePosition(e);
    this.lastMousePos.copy(this.currentMousePos);
    this.dragSpeed = 0;

    const worldPos = this.getWorldPosition();
    if (worldPos) {
      this.activeTrail = this.network.createTrail();
      const startPos = this.startFromNode || worldPos;
      this.activeTrail.startTrail(startPos);
      this.activeTrail.updateColor(this.network.getCurrentColor());
      this.startFromNode = null;
    }
  }

  private handleRightMouseDown(e: MouseEvent): void {
    this.updateMousePosition(e);
    const screenPos = new THREE.Vector2(
      (e.clientX / window.innerWidth) * 2 - 1,
      -(e.clientY / window.innerHeight) * 2 + 1
    );

    const node = this.network.findNearestNode(screenPos, this.camera);
    if (node) {
      this.startFromNode = node.position.clone();
      this.network.createShockWave(node.position, this.network.getCurrentColor());
    }
  }

  private handleMouseMove(e: MouseEvent): void {
    this.updateMousePosition(e);

    if (this.isDragging) {
      const dx = this.currentMousePos.x - this.lastMousePos.x;
      const dy = this.currentMousePos.y - this.lastMousePos.y;
      this.dragSpeed = Math.sqrt(dx * dx + dy * dy);
      this.lastMousePos.copy(this.currentMousePos);

      const worldPos = this.getWorldPosition();
      if (worldPos && this.activeTrail) {
        this.activeTrail.extendTrail(worldPos, this.dragSpeed);
      }
    }
  }

  private handleLeftMouseUp(): void {
    if (this.isDragging && this.activeTrail) {
      this.activeTrail.endTrail();
      this.network.checkIntersections(this.activeTrail);
      this.activeTrail = null;
    }
    this.isDragging = false;
    this.dragSpeed = 0;
  }

  private updateMousePosition(e: MouseEvent): void {
    this.currentMousePos.set(e.clientX, e.clientY);
  }

  private getWorldPosition(): THREE.Vector3 | null {
    const screenPos = new THREE.Vector2(
      (this.currentMousePos.x / window.innerWidth) * 2 - 1,
      -(this.currentMousePos.y / window.innerHeight) * 2 + 1
    );

    this.raycaster.setFromCamera(screenPos, this.camera);
    this.referencePlane.normal.copy(this.camera.position).normalize();

    const intersection = new THREE.Vector3();
    const result = this.raycaster.ray.intersectPlane(this.referencePlane, intersection);

    if (result) {
      const distance = this.camera.position.length();
      const direction = intersection.clone().sub(this.camera.position).normalize();
      return this.camera.position.clone().add(direction.multiplyScalar(distance * 0.5));
    }
    return null;
  }

  public update(): void {
    const state: UIState = {
      totalLength: this.network.totalLength,
      intersectionCount: this.network.intersectionCount,
      colorProgress: this.network.getColorProgress(),
      dragSpeed: this.dragSpeed
    };

    this.lengthElement.textContent = state.totalLength.toFixed(1);
    this.intersectionsElement.textContent = state.intersectionCount.toString();
    this.progressElement.textContent = Math.round(state.colorProgress * 100) + '%';
    this.speedElement.textContent = state.dragSpeed.toFixed(1);
  }
}
