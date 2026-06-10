import * as THREE from 'three';
import { ParticleSystem, ColorScheme } from './particleSystem';

interface UIControllerConfig {
  canvas: HTMLCanvasElement;
  camera: THREE.PerspectiveCamera;
  particleSystem: ParticleSystem;
  renderer: THREE.WebGLRenderer;
}

interface CameraState {
  position: THREE.Vector3;
  target: THREE.Vector3;
}

export class UIController {
  private canvas: HTMLCanvasElement;
  private camera: THREE.PerspectiveCamera;
  private particleSystem: ParticleSystem;
  private renderer: THREE.WebGLRenderer;

  private isDragging: boolean = false;
  private previousMouseX: number = 0;
  private previousMouseY: number = 0;

  private targetRotationX: number = 0.3;
  private targetRotationY: number = 0;
  private currentRotationX: number = 0.3;
  private currentRotationY: number = 0;
  private angularVelocityX: number = 0;
  private angularVelocityY: number = 0;

  private targetDistance: number = 60;
  private currentDistance: number = 60;

  private cameraTarget: THREE.Vector3 = new THREE.Vector3(0, 0, 0);

  private initialState: CameraState = {
    position: new THREE.Vector3(0, 0, 60),
    target: new THREE.Vector3(0, 0, 0)
  };

  private isResetting: boolean = false;
  private resetStartTime: number = 0;
  private resetFromState: CameraState = {
    position: new THREE.Vector3(),
    target: new THREE.Vector3()
  };

  private isPaused: boolean = false;

  private panelVisible: boolean = false;
  private controlsPanel: HTMLElement | null = null;
  private pausedWatermark: HTMLElement | null = null;

  private isClick: boolean = false;
  private clickStartTime: number = 0;
  private clickStartX: number = 0;
  private clickStartY: number = 0;

  private raycaster: THREE.Raycaster = new THREE.Raycaster();
  private mouseVector: THREE.Vector2 = new THREE.Vector2();

  private debounceTimers: Record<string, NodeJS.Timeout | null> = {};

  constructor(config: UIControllerConfig) {
    this.canvas = config.canvas;
    this.camera = config.camera;
    this.particleSystem = config.particleSystem;
    this.renderer = config.renderer;

    this.initDOMReferences();
    this.bindEvents();
    this.updateCamera();
  }

  private initDOMReferences(): void {
    this.controlsPanel = document.getElementById('controls-panel');
    this.pausedWatermark = document.getElementById('paused-watermark');
  }

  private bindEvents(): void {
    this.canvas.addEventListener('mousedown', this.onMouseDown.bind(this));
    window.addEventListener('mousemove', this.onMouseMove.bind(this));
    window.addEventListener('mouseup', this.onMouseUp.bind(this));
    this.canvas.addEventListener('wheel', this.onWheel.bind(this), { passive: false });
    this.canvas.addEventListener('contextmenu', this.onContextMenu.bind(this));

    window.addEventListener('keydown', this.onKeyDown.bind(this));
    window.addEventListener('resize', this.onResize.bind(this));

    this.bindPanelEvents();
  }

  private bindPanelEvents(): void {
    const closeBtn = document.getElementById('close-controls');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => this.hidePanel());
    }

    const countSlider = document.getElementById('count-slider') as HTMLInputElement;
    const countValue = document.getElementById('count-value');
    if (countSlider && countValue) {
      countSlider.addEventListener('input', (e) => {
        const value = parseInt((e.target as HTMLInputElement).value);
        countValue.textContent = value.toString();
        this.debouncedSetCount(value);
      });
    }

    const turbulenceSlider = document.getElementById('turbulence-slider') as HTMLInputElement;
    const turbulenceValue = document.getElementById('turbulence-value');
    if (turbulenceSlider && turbulenceValue) {
      turbulenceSlider.addEventListener('input', (e) => {
        const value = parseFloat((e.target as HTMLInputElement).value);
        turbulenceValue.textContent = value.toFixed(2);
        this.particleSystem.setTurbulence(value);
      });
    }

    const colorButtons = document.querySelectorAll('.color-btn');
    colorButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        const scheme = (btn as HTMLElement).dataset.scheme as ColorScheme;
        if (scheme) {
          colorButtons.forEach((b) => b.classList.remove('active'));
          btn.classList.add('active');
          this.particleSystem.setColorScheme(scheme);
        }
      });
    });
  }

  private debouncedSetCount(value: number): void {
    if (this.debounceTimers.count) {
      clearTimeout(this.debounceTimers.count);
    }
    this.debounceTimers.count = setTimeout(() => {
      this.particleSystem.setParticleCount(value);
    }, 200);
  }

  private onMouseDown(e: MouseEvent): void {
    if (e.button === 2) return;

    this.isDragging = true;
    this.previousMouseX = e.clientX;
    this.previousMouseY = e.clientY;

    this.isClick = true;
    this.clickStartTime = performance.now();
    this.clickStartX = e.clientX;
    this.clickStartY = e.clientY;
  }

  private onMouseMove(e: MouseEvent): void {
    if (!this.isDragging) return;

    const dx = e.clientX - this.previousMouseX;
    const dy = e.clientY - this.previousMouseY;

    const moveDist = Math.sqrt(
      (e.clientX - this.clickStartX) ** 2 +
      (e.clientY - this.clickStartY) ** 2
    );
    if (moveDist > 5) {
      this.isClick = false;
    }

    this.angularVelocityY = dx * 0.005;
    this.angularVelocityX = dy * 0.005;

    this.targetRotationY += this.angularVelocityY;
    this.targetRotationX += this.angularVelocityX;

    this.targetRotationX = Math.max(
      -Math.PI / 2 + 0.1,
      Math.min(Math.PI / 2 - 0.1, this.targetRotationX)
    );

    this.previousMouseX = e.clientX;
    this.previousMouseY = e.clientY;
  }

  private onMouseUp(e: MouseEvent): void {
    if (e.button === 0 && this.isDragging && this.isClick) {
      const elapsed = performance.now() - this.clickStartTime;
      const moveDist = Math.sqrt(
        (e.clientX - this.clickStartX) ** 2 +
        (e.clientY - this.clickStartY) ** 2
      );
      if (elapsed < 300 && moveDist < 10) {
        this.handleParticleClick(e);
      }
    }

    this.isDragging = false;
  }

  private handleParticleClick(e: MouseEvent): void {
    const rect = this.canvas.getBoundingClientRect();
    this.mouseVector.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouseVector.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouseVector, this.camera);
    const intersects = this.raycaster.intersectObject(this.particleSystem.points);

    if (intersects.length > 0) {
      const point = intersects[0].point;
      this.particleSystem.triggerExplosion(point);
    }
  }

  private onWheel(e: WheelEvent): void {
    e.preventDefault();
    e.stopPropagation();

    const scale = e.deltaY > 0 ? 1.1 : 0.9;
    this.targetDistance *= scale;
    this.targetDistance = Math.max(30, Math.min(300, this.targetDistance));
  }

  private onContextMenu(e: MouseEvent): void {
    e.preventDefault();
    this.togglePanel();
  }

  private onKeyDown(e: KeyboardEvent): void {
    if (e.code === 'KeyR') {
      this.resetCamera();
    } else if (e.code === 'Space') {
      e.preventDefault();
      this.togglePause();
    } else if (e.code === 'Escape') {
      if (this.panelVisible) {
        this.hidePanel();
      }
    }
  }

  private onResize(): void {
    const width = window.innerWidth;
    const height = window.innerHeight;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();

    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  }

  private showPanel(): void {
    if (this.controlsPanel) {
      this.controlsPanel.classList.add('visible');
      this.panelVisible = true;
    }
  }

  private hidePanel(): void {
    if (this.controlsPanel) {
      this.controlsPanel.classList.remove('visible');
      this.panelVisible = false;
    }
  }

  private togglePanel(): void {
    if (this.panelVisible) {
      this.hidePanel();
    } else {
      this.showPanel();
    }
  }

  private resetCamera(): void {
    this.isResetting = true;
    this.resetStartTime = performance.now();
    this.resetFromState.position.copy(this.camera.position);
    this.resetFromState.target.copy(this.cameraTarget);
  }

  private togglePause(): void {
    this.isPaused = !this.isPaused;
    this.particleSystem.setPaused(this.isPaused);

    if (this.pausedWatermark) {
      this.pausedWatermark.style.display = this.isPaused ? 'block' : 'none';
    }
  }

  updateCamera(): void {
    if (this.isResetting) {
      const elapsed = performance.now() - this.resetStartTime;
      const t = Math.min(1, elapsed / 2000);
      const easeT = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

      if (t >= 1) {
        this.isResetting = false;
        this.currentRotationX = 0.3;
        this.currentRotationY = 0;
        this.targetRotationX = 0.3;
        this.targetRotationY = 0;
        this.currentDistance = 60;
        this.targetDistance = 60;
        this.angularVelocityX = 0;
        this.angularVelocityY = 0;
        this.camera.position.copy(this.initialState.position);
        this.cameraTarget.copy(this.initialState.target);
      } else {
        const fromSpherical = new THREE.Spherical().setFromVector3(
          this.resetFromState.position.clone().sub(this.resetFromState.target)
        );
        const toSpherical = new THREE.Spherical().setFromVector3(
          this.initialState.position.clone().sub(this.initialState.target)
        );

        const radius = fromSpherical.radius + (toSpherical.radius - fromSpherical.radius) * easeT;
        const phi = fromSpherical.phi + (toSpherical.phi - fromSpherical.phi) * easeT;
        const theta = fromSpherical.theta + (toSpherical.theta - fromSpherical.theta) * easeT;

        const offset = new THREE.Vector3().setFromSphericalCoords(radius, phi, theta);
        this.camera.position.copy(
          this.resetFromState.target.clone().lerp(this.initialState.target, easeT).add(offset)
        );
        this.cameraTarget.copy(this.resetFromState.target.clone().lerp(this.initialState.target, easeT));
      }
    } else {
      this.angularVelocityX *= 0.9;
      this.angularVelocityY *= 0.9;

      this.currentRotationX += (this.targetRotationX - this.currentRotationX) * 0.1;
      this.currentRotationY += (this.targetRotationY - this.currentRotationY) * 0.1;

      this.currentDistance += (this.targetDistance - this.currentDistance) * 0.08;

      const cosX = Math.cos(this.currentRotationX);
      const x = this.currentDistance * cosX * Math.sin(this.currentRotationY);
      const y = this.currentDistance * Math.sin(this.currentRotationX);
      const z = this.currentDistance * cosX * Math.cos(this.currentRotationY);

      this.camera.position.set(
        x + this.cameraTarget.x,
        y + this.cameraTarget.y,
        z + this.cameraTarget.z
      );
    }

    this.camera.lookAt(this.cameraTarget);
  }

  update(delta: number): void {
    this.updateCamera();
  }

  getPaused(): boolean {
    return this.isPaused;
  }
}
