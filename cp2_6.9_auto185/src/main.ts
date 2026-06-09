import * as THREE from 'three';
import { DataLoader, type DatasetType, type VolumeData } from './DataLoader';
import { VolumeRenderer, type RenderMode } from './VolumeRenderer';
import { AnnotationManager, type Annotation } from './AnnotationManager';

const INITIAL_CAMERA_POSITION = new THREE.Vector3(3, 2, 4);

class CTViewerApp {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private canvas: HTMLCanvasElement;

  private dataLoader: DataLoader;
  private volumeRenderer: VolumeRenderer;
  private annotationManager: AnnotationManager;

  private currentVolume: VolumeData | null = null;
  private currentDataset: DatasetType = 'heart';

  private isDragging: boolean = false;
  private previousMouse: { x: number; y: number } = { x: 0, y: 0 };
  private spherical: { radius: number; theta: number; phi: number };
  private target: THREE.Vector3 = new THREE.Vector3(0, 0, 0);

  private isDraggingBubble: boolean = false;
  private bubbleDragOffset: { x: number; y: number } = { x: 0, y: 0 };

  private thresholdUpdateTimer: number | null = null;
  private readonly THROTTLE_DELAY: number = 300;

  private currentScale: number = 1.0;

  private infoBubble: HTMLDivElement;
  private bubbleContent: HTMLDivElement;
  private closeBubbleBtn: HTMLButtonElement;

  constructor() {
    this.canvas = document.getElementById('three-canvas') as HTMLCanvasElement;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0D0D1A);

    this.camera = new THREE.PerspectiveCamera(
      45,
      window.innerWidth / window.innerHeight,
      0.01,
      1000
    );
    this.camera.position.copy(INITIAL_CAMERA_POSITION);
    this.camera.lookAt(this.target);

    this.spherical = this.calculateSpherical(this.camera.position);

    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance'
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);

    this.dataLoader = new DataLoader();
    this.volumeRenderer = new VolumeRenderer(this.scene);
    this.annotationManager = new AnnotationManager(this.scene, this.camera);

    this.setupLights();
    this.setupUI();
    this.setupEventListeners();

    this.infoBubble = document.getElementById('info-bubble') as HTMLDivElement;
    this.bubbleContent = document.getElementById('bubble-content') as HTMLDivElement;
    this.closeBubbleBtn = document.getElementById('close-bubble') as HTMLButtonElement;

    this.loadDataset(this.currentDataset);
    this.animate();
  }

  private calculateSpherical(position: THREE.Vector3): { radius: number; theta: number; phi: number } {
    const offset = position.clone().sub(this.target);
    return {
      radius: offset.length(),
      theta: Math.atan2(offset.x, offset.z),
      phi: Math.acos(Math.max(-1, Math.min(1, offset.y / offset.length())))
    };
  }

  private updateCameraFromSpherical(): void {
    const { radius, theta, phi } = this.spherical;
    const sinPhi = Math.sin(phi);
    const x = radius * sinPhi * Math.sin(theta);
    const y = radius * Math.cos(phi);
    const z = radius * sinPhi * Math.cos(theta);
    this.camera.position.set(x, y, z).add(this.target);
    this.camera.lookAt(this.target);
  }

  private setupLights(): void {
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    this.scene.add(ambientLight);

    const directionalLight1 = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight1.position.set(5, 5, 5);
    this.scene.add(directionalLight1);

    const directionalLight2 = new THREE.DirectionalLight(0xffffff, 0.4);
    directionalLight2.position.set(-5, -3, -5);
    this.scene.add(directionalLight2);
  }

  private setupUI(): void {
    const datasetSelect = document.getElementById('dataset-select') as HTMLSelectElement;
    if (datasetSelect) {
      datasetSelect.value = this.currentDataset;
    }
  }

  private setupEventListeners(): void {
    window.addEventListener('resize', () => this.onWindowResize());

    this.canvas.addEventListener('mousedown', (e) => this.onMouseDown(e));
    window.addEventListener('mouseup', (e) => this.onMouseUp(e));
    window.addEventListener('mousemove', (e) => this.onMouseMove(e));
    this.canvas.addEventListener('wheel', (e) => this.onWheel(e), { passive: false });
    this.canvas.addEventListener('click', (e) => this.onCanvasClick(e));

    const datasetSelect = document.getElementById('dataset-select') as HTMLSelectElement;
    if (datasetSelect) {
      datasetSelect.addEventListener('change', (e) => {
        const target = e.target as HTMLSelectElement;
        this.loadDataset(target.value as DatasetType);
      });
    }

    const thresholdSlider = document.getElementById('threshold-slider') as HTMLInputElement;
    const thresholdValue = document.getElementById('threshold-value') as HTMLSpanElement;
    if (thresholdSlider && thresholdValue) {
      thresholdSlider.addEventListener('input', (e) => {
        const target = e.target as HTMLInputElement;
        const value = parseInt(target.value, 10);
        thresholdValue.textContent = value.toString();
        this.scheduleThresholdUpdate(value);
      });
    }

    const scaleSlider = document.getElementById('scale-slider') as HTMLInputElement;
    const scaleValue = document.getElementById('scale-value') as HTMLSpanElement;
    if (scaleSlider && scaleValue) {
      scaleSlider.addEventListener('input', (e) => {
        const target = e.target as HTMLInputElement;
        const value = parseFloat(target.value);
        scaleValue.textContent = value.toFixed(1);
        this.currentScale = value;
        this.volumeRenderer.setScale(value);
        this.annotationManager.setScale(value);
      });
    }

    const renderModeBtns = document.querySelectorAll('.render-mode-btn');
    renderModeBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        renderModeBtns.forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        const mode = (btn as HTMLElement).dataset.mode as RenderMode;
        this.volumeRenderer.setRenderMode(mode);
      });
    });

    const resetViewBtn = document.getElementById('reset-view-btn') as HTMLButtonElement;
    if (resetViewBtn) {
      resetViewBtn.addEventListener('click', () => this.resetView());
    }

    const toggleAnnotationsBtn = document.getElementById('toggle-annotations-btn') as HTMLButtonElement;
    if (toggleAnnotationsBtn) {
      toggleAnnotationsBtn.addEventListener('click', () => {
        const isVisible = this.annotationManager.toggleVisibility();
        toggleAnnotationsBtn.textContent = isVisible ? '隐藏标注' : '显示标注';
        toggleAnnotationsBtn.classList.toggle('active', isVisible);
      });
    }

    const panelHeader = document.querySelector('.panel-header') as HTMLDivElement;
    const togglePanelBtn = document.getElementById('toggle-panel') as HTMLButtonElement;
    const controlPanel = document.getElementById('control-panel') as HTMLDivElement;
    if (panelHeader && togglePanelBtn && controlPanel) {
      panelHeader.addEventListener('click', (e) => {
        if (e.target !== togglePanelBtn) {
          controlPanel.classList.toggle('collapsed');
        }
      });
      togglePanelBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        controlPanel.classList.toggle('collapsed');
      });
    }

    ['sagittal', 'coronal', 'axial'].forEach((plane) => {
      const slider = document.getElementById(`${plane}-slider`) as HTMLInputElement;
      const valueSpan = document.getElementById(`${plane}-value`) as HTMLSpanElement;
      if (slider && valueSpan) {
        slider.addEventListener('input', (e) => {
          const target = e.target as HTMLInputElement;
          const value = parseInt(target.value, 10);
          valueSpan.textContent = value.toString();
          if (this.currentVolume) {
            this.volumeRenderer.updateSlicePlane(
              plane as 'sagittal' | 'coronal' | 'axial',
              value,
              this.currentVolume
            );
          }
        });
      }
    });

    if (this.closeBubbleBtn) {
      this.closeBubbleBtn.addEventListener('click', () => {
        this.hideInfoBubble();
      });
    }

    if (this.infoBubble) {
      this.infoBubble.addEventListener('mousedown', (e) => this.onBubbleMouseDown(e));
    }

    this.annotationManager.setOnAnnotationClick((annotation, screenPos) => {
      this.showAnnotationBubble(annotation, screenPos);
    });
  }

  private async loadDataset(type: DatasetType): Promise<void> {
    this.currentDataset = type;
    const volume = await this.dataLoader.loadVolumeData(type);
    this.currentVolume = volume;
    await this.volumeRenderer.setVolume(volume, true);
    this.volumeRenderer.setScale(this.currentScale);
    this.annotationManager.loadAnnotations(type);
    this.annotationManager.setScale(this.currentScale);

    ['sagittal', 'coronal', 'axial'].forEach((plane) => {
      const slider = document.getElementById(`${plane}-slider`) as HTMLInputElement;
      if (slider) {
        const value = parseInt(slider.value, 10);
        this.volumeRenderer.updateSlicePlane(
          plane as 'sagittal' | 'coronal' | 'axial',
          value,
          volume
        );
      }
    });
  }

  private scheduleThresholdUpdate(value: number): void {
    if (this.thresholdUpdateTimer) {
      window.clearTimeout(this.thresholdUpdateTimer);
    }
    this.thresholdUpdateTimer = window.setTimeout(() => {
      this.volumeRenderer.setThreshold(value);
      this.thresholdUpdateTimer = null;
    }, this.THROTTLE_DELAY);
  }

  private resetView(): void {
    this.target.set(0, 0, 0);
    this.camera.position.copy(INITIAL_CAMERA_POSITION);
    this.camera.lookAt(this.target);
    this.spherical = this.calculateSpherical(this.camera.position);
  }

  private onWindowResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  private onMouseDown(event: MouseEvent): void {
    if (event.target !== this.canvas) return;
    this.isDragging = true;
    this.previousMouse = { x: event.clientX, y: event.clientY };
  }

  private onMouseUp(_event: MouseEvent): void {
    this.isDragging = false;
    this.isDraggingBubble = false;
  }

  private onMouseMove(event: MouseEvent): void {
    if (this.isDragging) {
      const deltaX = event.clientX - this.previousMouse.x;
      const deltaY = event.clientY - this.previousMouse.y;

      this.spherical.theta -= deltaX * 0.005;
      this.spherical.phi = Math.max(0.05, Math.min(Math.PI - 0.05, this.spherical.phi + deltaY * 0.005));

      this.updateCameraFromSpherical();
      this.previousMouse = { x: event.clientX, y: event.clientY };
    }

    if (this.isDraggingBubble) {
      const x = event.clientX + this.bubbleDragOffset.x;
      const y = event.clientY + this.bubbleDragOffset.y;
      this.positionBubble(x, y);
    }
  }

  private onWheel(event: WheelEvent): void {
    event.preventDefault();

    const zoomSpeed = 0.001;
    const delta = event.deltaY * zoomSpeed;
    this.spherical.radius = Math.max(1, Math.min(15, this.spherical.radius + delta * this.spherical.radius));
    this.updateCameraFromSpherical();
  }

  private onCanvasClick(event: MouseEvent): void {
    if (this.isDragging) return;

    const rect = this.canvas.getBoundingClientRect();
    const mouse = new THREE.Vector2(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -((event.clientY - rect.top) / rect.height) * 2 + 1
    );

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, this.camera);

    const screenPos = { x: event.clientX, y: event.clientY };
    const handled = this.annotationManager.handleClick(mouse, raycaster, screenPos);

    if (!handled && this.currentVolume) {
      const volumeMesh = this.volumeRenderer.getVolumeMesh();
      if (volumeMesh) {
        const intersects = raycaster.intersectObject(volumeMesh, false);
        if (intersects.length > 0) {
          const point = intersects[0].point;
          this.showVoxelInfoBubble(point, screenPos);
        }
      }
    }
  }

  private onBubbleMouseDown(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (target === this.closeBubbleBtn || target.closest('.close-btn')) return;

    this.isDraggingBubble = true;
    const rect = this.infoBubble.getBoundingClientRect();
    this.bubbleDragOffset = {
      x: rect.left - event.clientX,
      y: rect.top - event.clientY
    };
    event.preventDefault();
  }

  private positionBubble(x: number, y: number): void {
    const bubbleWidth = this.infoBubble.offsetWidth;
    const bubbleHeight = this.infoBubble.offsetHeight;
    const padding = 10;

    const clampedX = Math.max(padding, Math.min(window.innerWidth - bubbleWidth - padding, x));
    const clampedY = Math.max(padding, Math.min(window.innerHeight - bubbleHeight - padding, y));

    this.infoBubble.style.left = `${clampedX}px`;
    this.infoBubble.style.top = `${clampedY}px`;
    this.infoBubble.style.right = 'auto';
    this.infoBubble.style.bottom = 'auto';
  }

  private showVoxelInfoBubble(worldPoint: THREE.Vector3, screenPos: { x: number; y: number }): void {
    if (!this.currentVolume) return;

    const scale = this.currentScale;
    const localPoint = worldPoint.clone().divideScalar(scale).addScalar(0.5);

    const voxelX = Math.round(localPoint.x * (this.currentVolume.width - 1));
    const voxelY = Math.round(localPoint.y * (this.currentVolume.height - 1));
    const voxelZ = Math.round(localPoint.z * (this.currentVolume.depth - 1));

    const density = this.dataLoader.getVoxelValue(this.currentVolume, voxelX, voxelY, voxelZ);

    const scaledPoint = worldPoint.clone().divideScalar(this.currentScale);
    const nearestAnnotation = this.annotationManager.findNearestAnnotation(scaledPoint);
    const nearestName = nearestAnnotation ? nearestAnnotation.name : '未知区域';

    this.bubbleContent.innerHTML = `
      <div class="info-row">
        <span class="info-label">坐标:</span>
        <span class="info-value">(${voxelX}, ${voxelY}, ${voxelZ})</span>
      </div>
      <div class="info-row">
        <span class="info-label">密度值:</span>
        <span class="info-value">${density} HU</span>
      </div>
      <div class="info-row">
        <span class="info-label">最近器官:</span>
        <span class="info-value">${nearestName}</span>
      </div>
    `;

    this.infoBubble.classList.remove('hidden');
    this.positionBubble(screenPos.x + 15, screenPos.y + 15);
  }

  private showAnnotationBubble(annotation: Annotation, screenPos: { x: number; y: number }): void {
    this.bubbleContent.innerHTML = `
      <div class="info-row">
        <span class="info-label">器官名称:</span>
        <span class="info-value">${annotation.name}</span>
      </div>
      <div class="info-row">
        <span class="info-label">类型:</span>
        <span class="info-value">${annotation.organType}</span>
      </div>
      <div class="info-row" style="margin-top: 8px;">
        <span class="info-label" style="min-width: 100%; color: #aaaacc;">${annotation.description}</span>
      </div>
    `;

    this.infoBubble.classList.remove('hidden');
    this.positionBubble(screenPos.x + 15, screenPos.y + 15);
  }

  private hideInfoBubble(): void {
    this.infoBubble.classList.add('hidden');
  }

  private animate(): void {
    requestAnimationFrame(() => this.animate());

    this.volumeRenderer.renderVolume(this.camera);
    this.annotationManager.update(this.camera);

    this.renderer.render(this.scene, this.camera);
  }

  public dispose(): void {
    this.volumeRenderer.dispose();
    this.annotationManager.dispose();
    this.renderer.dispose();
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new CTViewerApp();
});
