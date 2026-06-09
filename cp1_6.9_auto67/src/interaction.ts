import * as THREE from 'three';
import { LavaLamp } from './lavaLamp';

export class InteractionManager {
  lavaLamp: LavaLamp;
  camera: THREE.Camera;
  domElement: HTMLElement;
  isDragging: boolean;
  previousMouse: { x: number; y: number };
  temperatureSlider: HTMLInputElement;
  tempValueDisplay: HTMLElement;
  resetButton: HTMLButtonElement;
  blobCountDisplay: HTMLElement;
  fpsCounter: HTMLElement;
  targetTiltX: number;
  targetTiltZ: number;
  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;
  private hitDetected: boolean;

  constructor(
    lavaLamp: LavaLamp,
    camera: THREE.Camera,
    domElement: HTMLElement
  ) {
    this.lavaLamp = lavaLamp;
    this.camera = camera;
    this.domElement = domElement;
    this.isDragging = false;
    this.previousMouse = { x: 0, y: 0 };
    this.targetTiltX = 0;
    this.targetTiltZ = 0;
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    this.hitDetected = false;

    const slider = document.getElementById('tempSlider') as HTMLInputElement | null;
    const tempValue = document.getElementById('tempValue') as HTMLElement | null;
    const resetBtn = document.getElementById('resetBtn') as HTMLButtonElement | null;
    const blobCount = document.getElementById('blobCount') as HTMLElement | null;
    const fps = document.getElementById('fpsCounter') as HTMLElement | null;

    if (!slider || !tempValue || !resetBtn || !blobCount || !fps) {
      throw new Error('Required UI elements not found');
    }

    this.temperatureSlider = slider;
    this.tempValueDisplay = tempValue;
    this.resetButton = resetBtn;
    this.blobCountDisplay = blobCount;
    this.fpsCounter = fps;

    this.setupMouseDrag();
    this.setupTemperatureSlider();
    this.setupResetButton();
  }

  private setupMouseDrag(): void {
    this.domElement.addEventListener('mousedown', (e: MouseEvent) => this.onMouseDown(e));
    window.addEventListener('mousemove', (e: MouseEvent) => this.onMouseMove(e));
    window.addEventListener('mouseup', () => this.onMouseUp());
    window.addEventListener('mouseleave', () => this.onMouseUp());
  }

  private onMouseDown(event: MouseEvent): void {
    const rect = this.domElement.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObject(this.lavaLamp.container, true);
    
    this.hitDetected = intersects.length > 0;
    this.isDragging = true;
    this.previousMouse = { x: event.clientX, y: event.clientY };
  }

  private onMouseMove(event: MouseEvent): void {
    if (!this.isDragging) return;

    const deltaX = event.clientX - this.previousMouse.x;
    const deltaY = event.clientY - this.previousMouse.y;

    if (this.hitDetected) {
      this.targetTiltZ += deltaX * 0.4;
      this.targetTiltX += deltaY * 0.4;

      const maxTilt = 30;
      this.targetTiltX = Math.max(-maxTilt, Math.min(maxTilt, this.targetTiltX));
      this.targetTiltZ = Math.max(-maxTilt, Math.min(maxTilt, this.targetTiltZ));

      this.lavaLamp.setTilt(this.targetTiltX, this.targetTiltZ);
    }

    this.previousMouse = { x: event.clientX, y: event.clientY };
  }

  private onMouseUp(): void {
    this.isDragging = false;
    this.hitDetected = false;
  }

  private setupTemperatureSlider(): void {
    this.temperatureSlider.addEventListener('input', () => {
      const value = parseInt(this.temperatureSlider.value, 10);
      this.lavaLamp.setTemperature(value);
      this.updateTemperatureDisplay(value);
    });
  }

  private updateTemperatureDisplay(value: number): void {
    const valueSpan = this.tempValueDisplay.querySelector('span');
    this.tempValueDisplay.textContent = value.toString();
    if (valueSpan) {
      this.tempValueDisplay.appendChild(valueSpan);
    }

    const hue = 200 - (value / 100) * 200;
    this.tempValueDisplay.style.color = `hsl(${hue}, 100%, 60%)`;
    this.tempValueDisplay.style.textShadow = `0 0 20px hsla(${hue}, 100%, 60%, 0.5)`;
  }

  private setupResetButton(): void {
    this.resetButton.addEventListener('click', () => {
      this.targetTiltX = 0;
      this.targetTiltZ = 0;
      this.lavaLamp.resetTilt();
    });
  }

  updateStats(fps: number): void {
    this.blobCountDisplay.textContent = this.lavaLamp.getBlobCount().toString();
    this.fpsCounter.textContent = Math.round(fps).toString();
  }
}
