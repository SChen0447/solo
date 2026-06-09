import * as THREE from 'three';
import { ARController } from './arController';
import { FurnitureManager, FURNITURE_LIST, MAX_FURNITURE } from './furnitureManager';
import { InteractionManager } from './interactionManager';

class ARApp {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private arController: ARController;
  private furnitureManager: FurnitureManager;
  private interactionManager: InteractionManager;
  private container: HTMLElement;
  private animationId: number = 0;
  private lastFrameTime: number = 0;
  private readonly TARGET_FPS: number = 30;
  private readonly FRAME_INTERVAL: number = 1000 / this.TARGET_FPS;

  private guidePanel: HTMLElement | null = null;
  private toolbar: HTMLElement | null = null;
  private toast: HTMLElement | null = null;
  private loading: HTMLElement | null = null;
  private selectedFurnitureId: string | null = null;
  private guidePanelTimer: number | null = null;
  private activeTouchPoints: Map<number, { x: number; y: number }> = new Map();

  constructor() {
    this.container = document.getElementById('canvas-container')!;

    this.scene = new THREE.Scene();

    this.camera = new THREE.PerspectiveCamera(
      60,
      this.container.clientWidth / this.container.clientHeight,
      0.1,
      1000
    );
    this.camera.position.set(0, 0, 5);
    this.camera.lookAt(0, 0, 0);

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      preserveDrawingBuffer: true
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight, false);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.container.appendChild(this.renderer.domElement);

    this.setupLighting();

    this.arController = new ARController(this.scene, this.camera, this.renderer);
    this.furnitureManager = new FurnitureManager(this.scene);
    this.interactionManager = new InteractionManager(
      this.renderer,
      this.camera,
      this.scene,
      this.arController,
      this.furnitureManager
    );

    this.interactionManager.setCanvasClickCallback(() => {
      this.showGuidePanelTemporarily();
    });

    this.setupUIElements();
    this.setupTouchEvents();
  }

  private setupLighting(): void {
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    this.scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 10, 5);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 1024;
    directionalLight.shadow.mapSize.height = 1024;
    directionalLight.shadow.camera.near = 0.5;
    directionalLight.shadow.camera.far = 50;
    directionalLight.shadow.camera.left = -10;
    directionalLight.shadow.camera.right = 10;
    directionalLight.shadow.camera.top = 10;
    directionalLight.shadow.camera.bottom = -10;
    this.scene.add(directionalLight);

    const fillLight = new THREE.DirectionalLight(0xffffff, 0.3);
    fillLight.position.set(-5, 3, -5);
    this.scene.add(fillLight);
  }

  private setupUIElements(): void {
    this.guidePanel = document.getElementById('guide-panel');
    this.toolbar = document.getElementById('furniture-toolbar');
    this.toast = document.getElementById('toast');
    this.loading = document.getElementById('loading');

    if (this.toolbar) {
      this.buildFurnitureToolbar();
    }

    this.showGuidePanelTemporarily(5000);
  }

  private buildFurnitureToolbar(): void {
    if (!this.toolbar) return;
    this.toolbar.innerHTML = '';

    FURNITURE_LIST.forEach(furniture => {
      const item = document.createElement('div');
      item.className = 'furniture-item';
      item.dataset.id = furniture.id;

      const icon = document.createElement('span');
      icon.className = 'furniture-icon';
      icon.textContent = furniture.icon;

      const label = document.createElement('span');
      label.className = 'furniture-label';
      label.textContent = furniture.name;

      item.appendChild(icon);
      item.appendChild(label);

      item.addEventListener('click', () => {
        this.handleFurnitureSelect(furniture.id, item);
      });

      this.toolbar!.appendChild(item);
    });
  }

  private handleFurnitureSelect(id: string, element: HTMLElement): void {
    if (this.furnitureManager.getCount() >= MAX_FURNITURE) {
      this.showToast('请先移除已有家具');
      return;
    }

    const rect = this.renderer.domElement.getBoundingClientRect();
    const centerX = rect.left + rect.width * 0.5;
    const centerY = rect.top + rect.height * 0.6;
    const worldPos = this.arController.screenToWorld(centerX, centerY);

    const placed = this.furnitureManager.addFurniture(id, worldPos);
    if (placed) {
      this.furnitureManager.selectFurniture(placed.id);

      document.querySelectorAll('.furniture-item').forEach(el => {
        el.classList.remove('selected');
      });
      element.classList.add('selected');
      this.selectedFurnitureId = id;

      setTimeout(() => {
        element.classList.remove('selected');
        this.selectedFurnitureId = null;
      }, 500);
    } else {
      this.showToast('请先移除已有家具');
    }
  }

  private showToast(message: string): void {
    if (!this.toast) return;
    this.toast.textContent = message;
    this.toast.classList.add('show');
    setTimeout(() => {
      this.toast?.classList.remove('show');
    }, 2000);
  }

  private showGuidePanelTemporarily(duration: number = 3000): void {
    if (!this.guidePanel) return;

    this.guidePanel.classList.remove('hidden');

    if (this.guidePanelTimer) {
      window.clearTimeout(this.guidePanelTimer);
    }

    this.guidePanelTimer = window.setTimeout(() => {
      this.guidePanel?.classList.add('hidden');
      this.guidePanelTimer = null;
    }, duration);
  }

  private setupTouchEvents(): void {
    const canvas = this.renderer.domElement;

    canvas.addEventListener('touchstart', (e) => {
      for (const touch of e.changedTouches) {
        this.activeTouchPoints.set(touch.identifier, {
          x: touch.clientX,
          y: touch.clientY
        });
      }

      if (this.activeTouchPoints.size === 2) {
        const points = Array.from(this.activeTouchPoints.values());
        this.interactionManager.handleTwoFingerTouch(points[0], points[1], true);
      }
    }, { passive: true });

    canvas.addEventListener('touchmove', (e) => {
      e.preventDefault();

      for (const touch of e.changedTouches) {
        if (this.activeTouchPoints.has(touch.identifier)) {
          this.activeTouchPoints.set(touch.identifier, {
            x: touch.clientX,
            y: touch.clientY
          });
        }
      }

      if (this.activeTouchPoints.size === 2) {
        const points = Array.from(this.activeTouchPoints.values());
        this.interactionManager.handleTwoFingerTouch(points[0], points[1], false);
      }
    }, { passive: false });

    canvas.addEventListener('touchend', (e) => {
      for (const touch of e.changedTouches) {
        this.activeTouchPoints.delete(touch.identifier);
      }
    }, { passive: true });

    canvas.addEventListener('touchcancel', (e) => {
      for (const touch of e.changedTouches) {
        this.activeTouchPoints.delete(touch.identifier);
      }
    }, { passive: true });
  }

  async start(): Promise<void> {
    const success = await this.arController.initCamera();

    if (this.loading) {
      this.loading.style.display = 'none';
    }

    if (!success) {
      this.showToast('无法访问摄像头，请检查权限设置');
      this.scene.background = new THREE.Color(0x1a1a2e);
    }

    this.animate();
  }

  private animate(): void {
    this.animationId = requestAnimationFrame(() => this.animate());

    const now = performance.now();
    if (now - this.lastFrameTime < this.FRAME_INTERVAL) {
      return;
    }
    this.lastFrameTime = now - (now % this.FRAME_INTERVAL);

    this.renderer.render(this.scene, this.camera);
  }

  dispose(): void {
    cancelAnimationFrame(this.animationId);
    this.arController.dispose();
    this.interactionManager.dispose();
    this.renderer.dispose();
    if (this.guidePanelTimer) {
      window.clearTimeout(this.guidePanelTimer);
    }
    if (this.renderer.domElement.parentNode) {
      this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
    }
  }
}

let app: ARApp | null = null;

window.addEventListener('DOMContentLoaded', async () => {
  app = new ARApp();
  await app.start();
});

window.addEventListener('beforeunload', () => {
  if (app) {
    app.dispose();
  }
});
