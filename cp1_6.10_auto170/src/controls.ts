import * as THREE from 'three';

type EventCallback = (data?: unknown) => void;

export interface ControlParams {
  particleSize: number;
  attractionStrength: number;
  rotationSpeed: number;
}

export class Controls {
  private container: HTMLElement;
  private eventListeners: Map<string, EventCallback[]> = new Map();
  private sizeSlider!: HTMLInputElement;
  private attractionSlider!: HTMLInputElement;
  private rotationSlider!: HTMLInputElement;
  private sizeValue!: HTMLElement;
  private attractionValue!: HTMLElement;
  private rotationValue!: HTMLElement;
  private resetBtn!: HTMLButtonElement;
  private flashOverlay!: HTMLElement;
  private params: ControlParams = {
    particleSize: 0.04,
    attractionStrength: 2.0,
    rotationSpeed: 0.02,
  };
  private isMouseDown: boolean = false;
  private mouseScreenPosition: THREE.Vector2 = new THREE.Vector2();
  private raycaster: THREE.Raycaster = new THREE.Raycaster();
  private mouseWorldPosition: THREE.Vector3 = new THREE.Vector3();
  private plane: THREE.Plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
  private lastUpdateTime: number = 0;

  constructor(container: HTMLElement) {
    this.container = container;
    this.initDOM();
    this.bindEvents();
  }

  on(event: string, callback: EventCallback): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)!.push(callback);
  }

  private emit(event: string, data?: unknown): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach((cb) => cb(data));
    }
  }

  private initDOM(): void {
    this.sizeSlider = document.getElementById('size-slider') as HTMLInputElement;
    this.attractionSlider = document.getElementById('attraction-slider') as HTMLInputElement;
    this.rotationSlider = document.getElementById('rotation-slider') as HTMLInputElement;
    this.sizeValue = document.getElementById('size-value') as HTMLElement;
    this.attractionValue = document.getElementById('attraction-slider-value') as HTMLElement;
    this.rotationValue = document.getElementById('rotation-value') as HTMLElement;
    this.resetBtn = document.getElementById('reset-btn') as HTMLButtonElement;
    this.flashOverlay = document.getElementById('flash-overlay') as HTMLElement;
  }

  private bindEvents(): void {
    this.sizeSlider.addEventListener('input', this.handleSizeChange);
    this.attractionSlider.addEventListener('input', this.handleAttractionChange);
    this.rotationSlider.addEventListener('input', this.handleRotationChange);
    this.resetBtn.addEventListener('click', this.handleReset);

    this.container.addEventListener('mousedown', this.handleMouseDown);
    this.container.addEventListener('mousemove', this.handleMouseMove);
    this.container.addEventListener('mouseup', this.handleMouseUp);
    this.container.addEventListener('mouseleave', this.handleMouseUp);

    this.container.addEventListener('touchstart', this.handleTouchStart, { passive: false });
    this.container.addEventListener('touchmove', this.handleTouchMove, { passive: false });
    this.container.addEventListener('touchend', this.handleTouchEnd);
  }

  private handleSizeChange = (e: Event): void => {
    const value = parseFloat((e.target as HTMLInputElement).value);
    this.params.particleSize = value;
    this.animateValueUpdate(this.sizeValue, value.toFixed(3));
    this.emit('sizeChange', value);
  };

  private handleAttractionChange = (e: Event): void => {
    const value = parseFloat((e.target as HTMLInputElement).value);
    this.params.attractionStrength = value;
    this.animateValueUpdate(this.attractionValue, value.toFixed(1));
    this.emit('attractionChange', value);
  };

  private handleRotationChange = (e: Event): void => {
    const value = parseFloat((e.target as HTMLInputElement).value);
    this.params.rotationSpeed = value;
    this.animateValueUpdate(this.rotationValue, value.toFixed(3));
    this.emit('rotationChange', value);
  };

  private animateValueUpdate(element: HTMLElement, newValue: string): void {
    element.classList.add('updating');
    element.textContent = newValue;
    setTimeout(() => {
      element.classList.remove('updating');
    }, 200);
  }

  private handleReset = (): void => {
    this.triggerFlash();
    this.emit('reset');
  };

  private triggerFlash(): void {
    this.flashOverlay.classList.add('active');
    setTimeout(() => {
      this.flashOverlay.classList.remove('active');
    }, 300);
  }

  private handleMouseDown = (e: MouseEvent): void => {
    if (e.button === 0) {
      this.isMouseDown = true;
      this.updateMousePosition(e.clientX, e.clientY);
      this.emit('mouseDown', {
        screenPos: this.mouseScreenPosition.clone(),
        worldPos: this.mouseWorldPosition.clone(),
      });
    }
  };

  private handleMouseMove = (e: MouseEvent): void => {
    this.updateMousePosition(e.clientX, e.clientY);
    const now = performance.now();
    const deltaTime = (now - this.lastUpdateTime) / 1000;
    this.lastUpdateTime = now;

    this.emit('mouseMove', {
      screenPos: this.mouseScreenPosition.clone(),
      worldPos: this.mouseWorldPosition.clone(),
      deltaTime: deltaTime > 0 ? deltaTime : 1 / 60,
    });
  };

  private handleMouseUp = (): void => {
    if (this.isMouseDown) {
      this.isMouseDown = false;
      this.emit('mouseUp', {
        screenPos: this.mouseScreenPosition.clone(),
        worldPos: this.mouseWorldPosition.clone(),
      });
    }
  };

  private handleTouchStart = (e: TouchEvent): void => {
    e.preventDefault();
    if (e.touches.length > 0) {
      const touch = e.touches[0];
      this.isMouseDown = true;
      this.updateMousePosition(touch.clientX, touch.clientY);
      this.emit('mouseDown', {
        screenPos: this.mouseScreenPosition.clone(),
        worldPos: this.mouseWorldPosition.clone(),
      });
    }
  };

  private handleTouchMove = (e: TouchEvent): void => {
    e.preventDefault();
    if (e.touches.length > 0) {
      const touch = e.touches[0];
      this.updateMousePosition(touch.clientX, touch.clientY);
      const now = performance.now();
      const deltaTime = (now - this.lastUpdateTime) / 1000;
      this.lastUpdateTime = now;

      this.emit('mouseMove', {
        screenPos: this.mouseScreenPosition.clone(),
        worldPos: this.mouseWorldPosition.clone(),
        deltaTime: deltaTime > 0 ? deltaTime : 1 / 60,
      });
    }
  };

  private handleTouchEnd = (): void => {
    if (this.isMouseDown) {
      this.isMouseDown = false;
      this.emit('mouseUp', {
        screenPos: this.mouseScreenPosition.clone(),
        worldPos: this.mouseWorldPosition.clone(),
      });
    }
  };

  private updateMousePosition(clientX: number, clientY: number): void {
    const rect = this.container.getBoundingClientRect();
    this.mouseScreenPosition.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    this.mouseScreenPosition.y = -((clientY - rect.top) / rect.height) * 2 + 1;
  }

  updateMouseWorldPosition(camera: THREE.Camera): void {
    this.raycaster.setFromCamera(this.mouseScreenPosition, camera);
    this.raycaster.ray.intersectPlane(this.plane, this.mouseWorldPosition);
  }

  getMouseWorldPosition(): THREE.Vector3 {
    return this.mouseWorldPosition.clone();
  }

  getParams(): ControlParams {
    return { ...this.params };
  }

  dispose(): void {
    this.sizeSlider.removeEventListener('input', this.handleSizeChange);
    this.attractionSlider.removeEventListener('input', this.handleAttractionChange);
    this.rotationSlider.removeEventListener('input', this.handleRotationChange);
    this.resetBtn.removeEventListener('click', this.handleReset);

    this.container.removeEventListener('mousedown', this.handleMouseDown);
    this.container.removeEventListener('mousemove', this.handleMouseMove);
    this.container.removeEventListener('mouseup', this.handleMouseUp);
    this.container.removeEventListener('mouseleave', this.handleMouseUp);

    this.container.removeEventListener('touchstart', this.handleTouchStart);
    this.container.removeEventListener('touchmove', this.handleTouchMove);
    this.container.removeEventListener('touchend', this.handleTouchEnd);
  }
}
