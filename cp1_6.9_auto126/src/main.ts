import * as THREE from 'three';
import { RootSimulator } from './rootSimulator';
import { RootRenderer } from './rootRenderer';
import { UIController } from './uiController';

interface CameraState {
  position: THREE.Vector3;
  target: THREE.Vector3;
}

const CAMERA_PRESETS: Record<number, CameraState> = {
  1: { position: new THREE.Vector3(0, 8, 0.01), target: new THREE.Vector3(0, -1.5, 0) },
  2: { position: new THREE.Vector3(5, 3, 5), target: new THREE.Vector3(0, -1.5, 0) },
  3: { position: new THREE.Vector3(6, -1, 0), target: new THREE.Vector3(0, -1.5, 0) },
  4: { position: new THREE.Vector3(2, -1, 2), target: new THREE.Vector3(0, -1.5, 0) }
};

class App {
  private rootSimulator: RootSimulator;
  private rootRenderer: RootRenderer;
  private uiController: UIController;
  private humidity: number = 50;
  private temperature: number = 22;
  private soilOpacity: number = 0.6;

  private isDragging: boolean = false;
  private isPanning: boolean = false;
  private lastMouseX: number = 0;
  private lastMouseY: number = 0;
  private cameraTheta: number = Math.PI / 4;
  private cameraPhi: number = Math.PI / 3;
  private cameraRadius: number = 7;
  private cameraTarget: THREE.Vector3 = new THREE.Vector3(0, -1.5, 0);
  private minRadius: number = 2;
  private maxRadius: number = 15;

  private animatingCamera: boolean = false;
  private cameraAnimStart: { position: THREE.Vector3; target: THREE.Vector3; time: number } | null = null;
  private cameraAnimEnd: { position: THREE.Vector3; target: THREE.Vector3 } | null = null;
  private readonly CAMERA_ANIM_DURATION: number = 1000;

  private lastFrameTime: number = 0;
  private animationId: number = 0;

  private hoverTimeout: number | null = null;

  constructor() {
    const canvasContainer = document.getElementById('canvas-container')!;
    const uiPanel = document.getElementById('ui-panel')!;

    this.rootSimulator = new RootSimulator();
    this.rootRenderer = new RootRenderer(canvasContainer);
    this.uiController = new UIController(uiPanel, {
      onHumidityChange: this.handleHumidityChange.bind(this),
      onTemperatureChange: this.handleTemperatureChange.bind(this),
      onSoilOpacityChange: this.handleSoilOpacityChange.bind(this),
      onReset: this.handleReset.bind(this)
    });

    this.rootRenderer.setSoilOpacity(this.soilOpacity);
    this.updateCameraFromSpherical();
    this.setupEventListeners();
    this.startAnimationLoop();
  }

  private setupEventListeners(): void {
    const canvas = this.rootRenderer.getRenderer().domElement;

    canvas.addEventListener('mousedown', this.onMouseDown.bind(this));
    window.addEventListener('mousemove', this.onMouseMove.bind(this));
    window.addEventListener('mouseup', this.onMouseUp.bind(this));
    canvas.addEventListener('wheel', this.onWheel.bind(this), { passive: false });
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());

    window.addEventListener('keydown', this.onKeyDown.bind(this));
    canvas.addEventListener('click', this.onClick.bind(this));
    canvas.addEventListener('dblclick', this.onDoubleClick.bind(this));

    canvas.addEventListener('mouseleave', () => {
      this.rootRenderer.updateHoverHalo(null);
    });
  }

  private handleHumidityChange(value: number): void {
    this.humidity = value;
  }

  private handleTemperatureChange(value: number): void {
    this.temperature = value;
  }

  private handleSoilOpacityChange(value: number): void {
    this.soilOpacity = value;
    this.rootRenderer.setSoilOpacity(value);
  }

  private handleReset(): void {
    this.rootSimulator.reset();
    this.uiController.setHumidity(50);
    this.uiController.setTemperature(22);
    this.uiController.setSoilOpacity(0.6);
    this.humidity = 50;
    this.temperature = 22;
    this.soilOpacity = 0.6;
    this.rootRenderer.setSoilOpacity(0.6);
  }

  private onMouseDown(e: MouseEvent): void {
    if (e.button === 0) {
      this.isDragging = true;
    } else if (e.button === 2) {
      this.isPanning = true;
    }
    this.lastMouseX = e.clientX;
    this.lastMouseY = e.clientY;
  }

  private onMouseMove(e: MouseEvent): void {
    if (this.isDragging) {
      const deltaX = e.clientX - this.lastMouseX;
      const deltaY = e.clientY - this.lastMouseY;
      this.cameraTheta -= deltaX * 0.005;
      this.cameraPhi = Math.max(0.1, Math.min(Math.PI - 0.1, this.cameraPhi - deltaY * 0.005));
      this.updateCameraFromSpherical();
      this.animatingCamera = false;
      this.lastMouseX = e.clientX;
      this.lastMouseY = e.clientY;
    } else if (this.isPanning) {
      const deltaX = e.clientX - this.lastMouseX;
      const deltaY = e.clientY - this.lastMouseY;
      const camera = this.rootRenderer.getCamera();
      const right = new THREE.Vector3();
      const up = new THREE.Vector3(0, 1, 0);
      camera.getWorldDirection(right);
      right.cross(up).normalize();
      const panSpeed = this.cameraRadius * 0.001;
      this.cameraTarget.addScaledVector(right, -deltaX * panSpeed);
      this.cameraTarget.y += deltaY * panSpeed;
      this.updateCameraFromSpherical();
      this.animatingCamera = false;
      this.lastMouseX = e.clientX;
      this.lastMouseY = e.clientY;
    }

    if (!this.isDragging && !this.isPanning) {
      this.handleHover(e.clientX, e.clientY);
    }
  }

  private onMouseUp(e: MouseEvent): void {
    if (e.button === 0) this.isDragging = false;
    if (e.button === 2) this.isPanning = false;
  }

  private onWheel(e: WheelEvent): void {
    e.preventDefault();
    const zoomSpeed = 0.001;
    this.cameraRadius = Math.max(
      this.minRadius,
      Math.min(this.maxRadius, this.cameraRadius + e.deltaY * zoomSpeed)
    );
    this.updateCameraFromSpherical();
    this.animatingCamera = false;
    this.adjustFogForCamera();
  }

  private onKeyDown(e: KeyboardEvent): void {
    if (e.code === 'Space') {
      e.preventDefault();
      const paused = this.rootSimulator.togglePause();
      const nodes = this.rootSimulator.getBranchingNodes();
      this.rootRenderer.updateBranchMarkers(nodes, paused);
      return;
    }

    const keyNum = parseInt(e.key);
    if (keyNum >= 1 && keyNum <= 4) {
      this.switchCameraView(keyNum);
    }
  }

  private switchCameraView(presetNum: number): void {
    const preset = CAMERA_PRESETS[presetNum];
    if (!preset) return;

    let endPosition = preset.position.clone();
    let endTarget = preset.target.clone();

    if (presetNum === 4) {
      const closest = this.rootSimulator.getClosestRootPoint(endTarget);
      const dir = endPosition.clone().sub(closest).normalize();
      endPosition = closest.clone().add(dir.multiplyScalar(2));
      endTarget = closest.clone();
    }

    const camera = this.rootRenderer.getCamera();
    this.cameraAnimStart = {
      position: camera.position.clone(),
      target: this.cameraTarget.clone(),
      time: performance.now()
    };
    this.cameraAnimEnd = {
      position: endPosition,
      target: endTarget
    };
    this.animatingCamera = true;
  }

  private updateCameraAnimation(): void {
    if (!this.animatingCamera || !this.cameraAnimStart || !this.cameraAnimEnd) return;

    const now = performance.now();
    const elapsed = now - this.cameraAnimStart.time;
    const t = Math.min(1, elapsed / this.CAMERA_ANIM_DURATION);
    const easeT = 1 - Math.pow(1 - t, 3);

    const camera = this.rootRenderer.getCamera();
    camera.position.lerpVectors(this.cameraAnimStart.position, this.cameraAnimEnd.position, easeT);
    this.cameraTarget.lerpVectors(this.cameraAnimStart.target, this.cameraAnimEnd.target, easeT);
    camera.lookAt(this.cameraTarget);

    this.cameraRadius = camera.position.distanceTo(this.cameraTarget);
    const dir = camera.position.clone().sub(this.cameraTarget);
    this.cameraTheta = Math.atan2(dir.x, dir.z);
    this.cameraPhi = Math.acos(Math.max(-1, Math.min(1, dir.y / this.cameraRadius)));

    this.adjustFogForCamera();

    if (t >= 1) {
      this.animatingCamera = false;
      this.cameraAnimStart = null;
      this.cameraAnimEnd = null;
    }
  }

  private updateCameraFromSpherical(): void {
    const camera = this.rootRenderer.getCamera();
    camera.position.x = this.cameraTarget.x + this.cameraRadius * Math.sin(this.cameraPhi) * Math.sin(this.cameraTheta);
    camera.position.y = this.cameraTarget.y + this.cameraRadius * Math.cos(this.cameraPhi);
    camera.position.z = this.cameraTarget.z + this.cameraRadius * Math.sin(this.cameraPhi) * Math.cos(this.cameraTheta);
    camera.lookAt(this.cameraTarget);
  }

  private adjustFogForCamera(): void {
    const baseFar = 10;
    const farDistance = THREE.MathUtils.lerp(5, 18, (this.cameraRadius - this.minRadius) / (this.maxRadius - this.minRadius));
    this.rootRenderer.setFogDensity(farDistance);
  }

  private onClick(e: MouseEvent): void {
    const soilInfo = this.rootRenderer.pickSoilLayer(e.clientX, e.clientY);
    if (soilInfo) {
      this.uiController.showSoilLabel(
        e.clientX,
        e.clientY,
        soilInfo.layer.name,
        soilInfo.layer.thickness,
        soilInfo.layer.nutrientValue
      );
    }
  }

  private onDoubleClick(e: MouseEvent): void {
    if (!this.rootSimulator.isPaused()) return;

    const markerInfo = this.rootRenderer.pickBranchMarker(e.clientX, e.clientY);
    if (markerInfo) {
      const stats = this.rootSimulator.getBranchStats(markerInfo.nodeId);
      this.uiController.showTooltip(
        e.clientX,
        e.clientY,
        '侧根分支统计',
        [
          { label: '分支数：', value: `${stats.branchCount}` },
          { label: '总长度：', value: `${stats.totalLength.toFixed(2)} 单位` },
          { label: '最大深度：', value: `${stats.maxDepth.toFixed(2)} 单位` }
        ],
        2000
      );
    }
  }

  private handleHover(x: number, y: number): void {
    if (this.hoverTimeout !== null) {
      clearTimeout(this.hoverTimeout);
    }
    this.hoverTimeout = window.setTimeout(() => {
      const hitPoint = this.rootRenderer.pickHoverObject(x, y);
      if (hitPoint) {
        this.rootRenderer.updateHoverHalo(hitPoint);
        this.uiController.showHoverHalo(x, y);
      } else {
        this.rootRenderer.updateHoverHalo(null);
      }
    }, 16);
  }

  private startAnimationLoop(): void {
    const animate = (time: number) => {
      this.animationId = requestAnimationFrame(animate);

      const deltaTime = Math.min(33, time - this.lastFrameTime);
      this.lastFrameTime = time;

      this.rootSimulator.update(this.humidity, this.temperature);

      const nodes = this.rootSimulator.getNodes();
      this.rootRenderer.updateRoots(nodes);

      const particles = this.rootSimulator.getVibrationParticles();
      this.rootRenderer.updateParticles(particles);

      if (this.rootSimulator.isPaused()) {
        const branchingNodes = this.rootSimulator.getBranchingNodes();
        this.rootRenderer.updateBranchMarkers(branchingNodes, true);
      }

      this.updateCameraAnimation();
      this.rootRenderer.render();
    };

    this.animationId = requestAnimationFrame(animate);
  }

  public dispose(): void {
    cancelAnimationFrame(this.animationId);
    this.rootRenderer.dispose();
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new App();
});
