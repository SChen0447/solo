import * as THREE from 'three';
import { PlateSimulator } from './plateSimulator';

export type MeasurementMode = 'none' | 'distance' | 'angle' | 'height';

interface MeasurementPoint {
  worldPosition: THREE.Vector3;
  screenPosition: { x: number; y: number };
  marker: THREE.Mesh;
}

interface MeasurementResult {
  points: MeasurementPoint[];
  line: THREE.Line | null;
  label: HTMLDivElement | null;
  value: number;
  type: MeasurementMode;
}

export class UIController {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private plateSimulator: PlateSimulator;
  private container: HTMLElement;

  private timeSlider: HTMLInputElement;
  private speedSlider: HTMLInputElement;
  private timeValue: HTMLSpanElement;
  private speedValue: HTMLSpanElement;
  private playBtn: HTMLButtonElement;
  private resetTimeBtn: HTMLButtonElement;
  private triggerMagmaBtn: HTMLButtonElement;

  private distanceBtn: HTMLButtonElement;
  private angleBtn: HTMLButtonElement;
  private heightBtn: HTMLButtonElement;
  private resetViewBtn: HTMLButtonElement;

  private statusTime: HTMLSpanElement;
  private statusMode: HTMLSpanElement;
  private statusMeasurement: HTMLSpanElement;
  private statusFps: HTMLSpanElement;

  private measurementLabelsContainer: HTMLDivElement;

  private currentTime: number = 0;
  private simulationSpeed: number = 1.0;
  private isPlaying: boolean = false;

  private measurementMode: MeasurementMode = 'none';
  private measurementPoints: MeasurementPoint[] = [];
  private measurements: MeasurementResult[] = [];
  private measurementGroup: THREE.Group;

  private raycaster: THREE.Raycaster = new THREE.Raycaster();
  private mouse: THREE.Vector2 = new THREE.Vector2();

  private onTimeChangeCallback: ((time: number) => void) | null = null;
  private onSpeedChangeCallback: ((speed: number) => void) | null = null;
  private onPlayChangeCallback: ((playing: boolean) => void) | null = null;
  private onResetCallback: (() => void) | null = null;
  private onTriggerMagmaCallback: ((position: THREE.Vector3) => void) | null = null;
  private onResetViewCallback: (() => void) | null = null;

  private defaultCameraPosition: THREE.Vector3 = new THREE.Vector3(0, 300, 400);
  private defaultCameraTarget: THREE.Vector3 = new THREE.Vector3(0, 0, 0);

  constructor(
    scene: THREE.Scene,
    camera: THREE.PerspectiveCamera,
    renderer: THREE.WebGLRenderer,
    plateSimulator: PlateSimulator
  ) {
    this.scene = scene;
    this.camera = camera;
    this.renderer = renderer;
    this.plateSimulator = plateSimulator;
    this.container = document.getElementById('canvas-container')!;

    this.measurementGroup = new THREE.Group();
    this.scene.add(this.measurementGroup);

    this.timeSlider = document.getElementById('time-slider') as HTMLInputElement;
    this.speedSlider = document.getElementById('speed-slider') as HTMLInputElement;
    this.timeValue = document.getElementById('time-value') as HTMLSpanElement;
    this.speedValue = document.getElementById('speed-value') as HTMLSpanElement;
    this.playBtn = document.getElementById('btn-play') as HTMLButtonElement;
    this.resetTimeBtn = document.getElementById('btn-reset-time') as HTMLButtonElement;
    this.triggerMagmaBtn = document.getElementById('btn-trigger-magma') as HTMLButtonElement;

    this.distanceBtn = document.getElementById('btn-distance') as HTMLButtonElement;
    this.angleBtn = document.getElementById('btn-angle') as HTMLButtonElement;
    this.heightBtn = document.getElementById('btn-height') as HTMLButtonElement;
    this.resetViewBtn = document.getElementById('btn-reset') as HTMLButtonElement;

    this.statusTime = document.getElementById('status-time') as HTMLSpanElement;
    this.statusMode = document.getElementById('status-mode') as HTMLSpanElement;
    this.statusMeasurement = document.getElementById('status-measurement') as HTMLSpanElement;
    this.statusFps = document.getElementById('status-fps') as HTMLSpanElement;

    this.measurementLabelsContainer = document.getElementById('measurement-labels') as HTMLDivElement;

    this.bindEvents();
    this.updateUI();
  }

  private bindEvents(): void {
    this.timeSlider.addEventListener('input', () => {
      this.currentTime = parseFloat(this.timeSlider.value);
      this.updateUI();
      if (this.onTimeChangeCallback) {
        this.onTimeChangeCallback(this.currentTime);
      }
    });

    this.speedSlider.addEventListener('input', () => {
      this.simulationSpeed = parseFloat(this.speedSlider.value);
      this.updateUI();
      if (this.onSpeedChangeCallback) {
        this.onSpeedChangeCallback(this.simulationSpeed);
      }
    });

    this.playBtn.addEventListener('click', () => {
      this.isPlaying = !this.isPlaying;
      this.playBtn.textContent = this.isPlaying ? '⏸ 暂停' : '▶ 播放';
      this.playBtn.classList.toggle('active', this.isPlaying);
      if (this.onPlayChangeCallback) {
        this.onPlayChangeCallback(this.isPlaying);
      }
    });

    this.resetTimeBtn.addEventListener('click', () => {
      this.currentTime = 0;
      this.timeSlider.value = '0';
      this.isPlaying = false;
      this.playBtn.textContent = '▶ 播放';
      this.playBtn.classList.remove('active');
      this.clearMeasurements();
      this.updateUI();
      if (this.onResetCallback) {
        this.onResetCallback();
      }
      if (this.onPlayChangeCallback) {
        this.onPlayChangeCallback(false);
      }
    });

    this.triggerMagmaBtn.addEventListener('click', () => {
      const plateIds = this.plateSimulator.getAllPlateIds();
      if (plateIds.length > 0) {
        const crackPoints = this.plateSimulator.getCrackWorldPositions(plateIds[0]);
        if (crackPoints.length > 0) {
          const point = crackPoints[Math.floor(Math.random() * crackPoints.length)];
          if (this.onTriggerMagmaCallback) {
            this.onTriggerMagmaCallback(point);
          }
        }
      }
    });

    this.distanceBtn.addEventListener('click', () => {
      this.setMeasurementMode('distance');
    });

    this.angleBtn.addEventListener('click', () => {
      this.setMeasurementMode('angle');
    });

    this.heightBtn.addEventListener('click', () => {
      this.setMeasurementMode('height');
    });

    this.resetViewBtn.addEventListener('click', () => {
      if (this.onResetViewCallback) {
        this.onResetViewCallback();
      }
    });

    this.renderer.domElement.addEventListener('click', (e) => this.onCanvasClick(e));
    this.renderer.domElement.addEventListener('mousemove', (e) => this.onCanvasMouseMove(e));
  }

  private onCanvasClick(event: MouseEvent): void {
    if (this.measurementMode === 'none') {
      this.handleMagmaClick(event);
      return;
    }

    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);

    const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const intersectPoint = new THREE.Vector3();
    this.raycaster.ray.intersectPlane(groundPlane, intersectPoint);

    if (!intersectPoint) return;

    const point: MeasurementPoint = {
      worldPosition: intersectPoint.clone(),
      screenPosition: { x: event.clientX - rect.left, y: event.clientY - rect.top },
      marker: this.createMarker(intersectPoint)
    };

    this.measurementPoints.push(point);
    this.measurementGroup.add(point.marker);

    const requiredPoints = this.measurementMode === 'height' ? 2 : 2;

    if (this.measurementPoints.length >= requiredPoints) {
      this.completeMeasurement();
    }
  }

  private handleMagmaClick(event: MouseEvent): void {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);

    const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const intersectPoint = new THREE.Vector3();
    this.raycaster.ray.intersectPlane(groundPlane, intersectPoint);

    if (!intersectPoint) return;

    const crackPoint = this.plateSimulator.getClosestCrackPoint(intersectPoint, 25);
    if (crackPoint && this.onTriggerMagmaCallback) {
      this.onTriggerMagmaCallback(crackPoint.point);
    }
  }

  private onCanvasMouseMove(event: MouseEvent): void {
    if (this.measurementMode !== 'none') {
      this.renderer.domElement.style.cursor = 'crosshair';
    } else {
      this.renderer.domElement.style.cursor = 'pointer';
    }
  }

  private createMarker(position: THREE.Vector3): THREE.Mesh {
    const geometry = new THREE.SphereGeometry(2, 16, 16);
    const material = new THREE.MeshBasicMaterial({
      color: 0x4a9eff,
      transparent: true,
      opacity: 0.9
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.copy(position);
    mesh.position.y = 3;
    return mesh;
  }

  private completeMeasurement(): void {
    let value = 0;
    let line: THREE.Line | null = null;
    let label: HTMLDivElement | null = null;

    const p1 = this.measurementPoints[0].worldPosition;
    const p2 = this.measurementPoints[1].worldPosition;

    if (this.measurementMode === 'distance') {
      const dx = p2.x - p1.x;
      const dz = p2.z - p1.z;
      value = Math.sqrt(dx * dx + dz * dz);

      line = this.createDashedLine(p1, p2);
      this.measurementGroup.add(line);

      const midScreen = this.getMidScreenPosition();
      label = this.createLabel(`${Math.round(value)} 公里`, midScreen.x, midScreen.y);
    } else if (this.measurementMode === 'angle') {
      const dx = p2.x - p1.x;
      const dz = p2.z - p1.z;
      const dy = p2.y - p1.y;
      const horizontalDist = Math.sqrt(dx * dx + dz * dz);
      value = Math.atan2(dy, horizontalDist) * (180 / Math.PI);
      value = Math.abs(value);

      line = this.createDashedLine(p1, p2);
      this.measurementGroup.add(line);

      const midScreen = this.getMidScreenPosition();
      label = this.createLabel(`${value.toFixed(1)}°`, midScreen.x, midScreen.y);
    } else if (this.measurementMode === 'height') {
      value = Math.abs(p2.y - p1.y);

      line = this.createDashedLine(p1, p2);
      this.measurementGroup.add(line);

      const midScreen = this.getMidScreenPosition();
      label = this.createLabel(`${value.toFixed(1)} 单位`, midScreen.x, midScreen.y);
    }

    this.measurements.push({
      points: [...this.measurementPoints],
      line,
      label,
      value,
      type: this.measurementMode
    });

    this.updateStatusMeasurement();
    this.measurementPoints = [];
  }

  private createDashedLine(p1: THREE.Vector3, p2: THREE.Vector3): THREE.Line {
    const points = [
      new THREE.Vector3(p1.x, Math.max(p1.y, 3), p1.z),
      new THREE.Vector3(p2.x, Math.max(p2.y, 3), p2.z)
    ];
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const material = new THREE.LineDashedMaterial({
      color: 0xffffff,
      dashSize: 3,
      gapSize: 2,
      transparent: true,
      opacity: 0.9
    });
    const line = new THREE.Line(geometry, material);
    line.computeLineDistances();
    return line;
  }

  private createLabel(text: string, x: number, y: number): HTMLDivElement {
    const label = document.createElement('div');
    label.className = 'measurement-label';
    label.textContent = text;
    label.style.left = `${x}px`;
    label.style.top = `${y}px`;
    this.measurementLabelsContainer.appendChild(label);
    return label;
  }

  private getMidScreenPosition(): { x: number; y: number } {
    if (this.measurementPoints.length < 2) return { x: 0, y: 0 };
    const p1 = this.measurementPoints[0].screenPosition;
    const p2 = this.measurementPoints[1].screenPosition;
    return {
      x: (p1.x + p2.x) / 2,
      y: (p1.y + p2.y) / 2 - 15
    };
  }

  public setMeasurementMode(mode: MeasurementMode): void {
    this.measurementMode = mode;
    this.measurementPoints = [];

    this.distanceBtn.classList.toggle('active', mode === 'distance');
    this.angleBtn.classList.toggle('active', mode === 'angle');
    this.heightBtn.classList.toggle('active', mode === 'height');

    if (mode === 'none') {
      this.statusMode.textContent = '正常';
      this.renderer.domElement.style.cursor = 'pointer';
    } else if (mode === 'distance') {
      this.statusMode.textContent = '距离测量';
      this.renderer.domElement.style.cursor = 'crosshair';
    } else if (mode === 'angle') {
      this.statusMode.textContent = '角度测量';
      this.renderer.domElement.style.cursor = 'crosshair';
    } else if (mode === 'height') {
      this.statusMode.textContent = '高度测量';
      this.renderer.domElement.style.cursor = 'crosshair';
    }
  }

  private updateStatusMeasurement(): void {
    if (this.measurements.length === 0) {
      this.statusMeasurement.textContent = '--';
      return;
    }

    const last = this.measurements[this.measurements.length - 1];
    if (last.type === 'distance') {
      this.statusMeasurement.textContent = `${Math.round(last.value)} 公里`;
    } else if (last.type === 'angle') {
      this.statusMeasurement.textContent = `${last.value.toFixed(1)}°`;
    } else if (last.type === 'height') {
      this.statusMeasurement.textContent = `${last.value.toFixed(1)} 单位`;
    }
  }

  private clearMeasurements(): void {
    while (this.measurementGroup.children.length > 0) {
      const child = this.measurementGroup.children[0];
      this.measurementGroup.remove(child);
      if (child instanceof THREE.Mesh || child instanceof THREE.Line) {
        child.geometry.dispose();
        if (Array.isArray(child.material)) {
          child.material.forEach(m => m.dispose());
        } else {
          child.material.dispose();
        }
      }
    }

    while (this.measurementLabelsContainer.firstChild) {
      this.measurementLabelsContainer.removeChild(this.measurementLabelsContainer.firstChild);
    }

    this.measurements = [];
    this.measurementPoints = [];
    this.updateStatusMeasurement();
  }

  private updateUI(): void {
    this.timeValue.textContent = `${this.currentTime} 百万年`;
    this.speedValue.textContent = `${this.simulationSpeed.toFixed(1)}x`;

    const yearsAgo = 200 - this.currentTime;
    this.statusTime.textContent = `${yearsAgo.toFixed(0)} 百万年前`;
  }

  public setTime(time: number): void {
    this.currentTime = time;
    this.timeSlider.value = time.toString();
    this.updateUI();
  }

  public getTime(): number {
    return this.currentTime;
  }

  public getSpeed(): number {
    return this.simulationSpeed;
  }

  public isPlayMode(): boolean {
    return this.isPlaying;
  }

  public updateFPS(fps: number): void {
    this.statusFps.textContent = `${Math.round(fps)}`;
  }

  public setOnTimeChange(callback: (time: number) => void): void {
    this.onTimeChangeCallback = callback;
  }

  public setOnSpeedChange(callback: (speed: number) => void): void {
    this.onSpeedChangeCallback = callback;
  }

  public setOnPlayChange(callback: (playing: boolean) => void): void {
    this.onPlayChangeCallback = callback;
  }

  public setOnReset(callback: () => void): void {
    this.onResetCallback = callback;
  }

  public setOnTriggerMagma(callback: (position: THREE.Vector3) => void): void {
    this.onTriggerMagmaCallback = callback;
  }

  public setOnResetView(callback: () => void): void {
    this.onResetViewCallback = callback;
  }

  public getDefaultCameraPosition(): THREE.Vector3 {
    return this.defaultCameraPosition.clone();
  }

  public getDefaultCameraTarget(): THREE.Vector3 {
    return this.defaultCameraTarget.clone();
  }

  public getRaycaster(): THREE.Raycaster {
    return this.raycaster;
  }

  public getMeasurementMode(): MeasurementMode {
    return this.measurementMode;
  }
}
