import * as THREE from 'three';
import { ColorPalette } from './colorPalette';
import { MirrorTunnel } from './mirrorTunnel';

class App {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private container: HTMLElement;
  private colorPalette: ColorPalette;
  private mirrorTunnel: MirrorTunnel;
  private clock: THREE.Clock;

  private isDragging: boolean = false;
  private mouseX: number = 0;
  private mouseY: number = 0;
  private targetMouseX: number = 0;
  private targetMouseY: number = 0;
  private lastMouseX: number = 0;
  private lastMouseY: number = 0;

  private targetCameraZ: number = 10;
  private currentCameraZ: number = 10;
  private minCameraZ: number = -30;
  private maxCameraZ: number = 50;

  private paletteNameEl: HTMLElement;
  private prevBtn: HTMLElement;
  private nextBtn: HTMLElement;

  private lerpFactor: number = 0.08;

  constructor() {
    this.container = document.getElementById('canvas-container')!;
    this.paletteNameEl = document.getElementById('palette-name')!;
    this.prevBtn = document.getElementById('prev-palette')!;
    this.nextBtn = document.getElementById('next-palette')!;

    this.clock = new THREE.Clock();

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x000000);
    this.scene.fog = new THREE.Fog(0x000000, 20, 80);

    this.camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.camera.position.set(0, 0, this.currentCameraZ);
    this.camera.lookAt(0, 0, 0);

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance'
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setClearColor(0x000000, 1);
    this.container.appendChild(this.renderer.domElement);

    this.colorPalette = new ColorPalette();
    this.mirrorTunnel = new MirrorTunnel(this.scene, this.colorPalette);

    this.setupLights();
    this.setupEventListeners();
    this.updatePaletteName();

    this.animate();
  }

  private setupLights(): void {
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    this.scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.6);
    directionalLight.position.set(5, 5, 5);
    this.scene.add(directionalLight);

    const pointLight1 = new THREE.PointLight(0x00ffff, 1, 30);
    pointLight1.position.set(-3, 2, 10);
    this.scene.add(pointLight1);

    const pointLight2 = new THREE.PointLight(0xff00ff, 1, 30);
    pointLight2.position.set(3, -2, -10);
    this.scene.add(pointLight2);
  }

  private setupEventListeners(): void {
    window.addEventListener('resize', this.onResize.bind(this));

    this.renderer.domElement.addEventListener('mousedown', this.onMouseDown.bind(this));
    window.addEventListener('mousemove', this.onMouseMove.bind(this));
    window.addEventListener('mouseup', this.onMouseUp.bind(this));

    this.renderer.domElement.addEventListener('touchstart', this.onTouchStart.bind(this), { passive: false });
    window.addEventListener('touchmove', this.onTouchMove.bind(this), { passive: false });
    window.addEventListener('touchend', this.onTouchEnd.bind(this));

    this.renderer.domElement.addEventListener('wheel', this.onWheel.bind(this), { passive: false });
    this.renderer.domElement.addEventListener('click', this.onClick.bind(this));

    this.prevBtn.addEventListener('click', (e: Event) => {
      e.stopPropagation();
      this.colorPalette.prevPalette();
      this.updatePaletteName();
    });

    this.nextBtn.addEventListener('click', (e: Event) => {
      e.stopPropagation();
      this.colorPalette.nextPalette();
      this.updatePaletteName();
    });
  }

  private onResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  private onMouseDown(e: MouseEvent): void {
    this.isDragging = true;
    this.lastMouseX = e.clientX;
    this.lastMouseY = e.clientY;
  }

  private onMouseMove(e: MouseEvent): void {
    if (this.isDragging) {
      const dx = e.clientX - this.lastMouseX;
      const dy = e.clientY - this.lastMouseY;
      this.targetMouseX += dx / window.innerWidth * 2;
      this.targetMouseY += dy / window.innerHeight * 2;
      this.targetMouseX = Math.max(-1, Math.min(1, this.targetMouseX));
      this.targetMouseY = Math.max(-1, Math.min(1, this.targetMouseY));
      this.lastMouseX = e.clientX;
      this.lastMouseY = e.clientY;
    } else {
      this.targetMouseX = (e.clientX / window.innerWidth) * 2 - 1;
      this.targetMouseY = -(e.clientY / window.innerHeight) * 2 + 1;
    }
  }

  private onMouseUp(): void {
    this.isDragging = false;
  }

  private onTouchStart(e: TouchEvent): void {
    if (e.touches.length === 1) {
      e.preventDefault();
      this.isDragging = true;
      this.lastMouseX = e.touches[0].clientX;
      this.lastMouseY = e.touches[0].clientY;
    }
  }

  private onTouchMove(e: TouchEvent): void {
    if (this.isDragging && e.touches.length === 1) {
      e.preventDefault();
      const dx = e.touches[0].clientX - this.lastMouseX;
      const dy = e.touches[0].clientY - this.lastMouseY;
      this.targetMouseX += dx / window.innerWidth * 2;
      this.targetMouseY += dy / window.innerHeight * 2;
      this.targetMouseX = Math.max(-1, Math.min(1, this.targetMouseX));
      this.targetMouseY = Math.max(-1, Math.min(1, this.targetMouseY));
      this.lastMouseX = e.touches[0].clientX;
      this.lastMouseY = e.touches[0].clientY;
    }
  }

  private onTouchEnd(): void {
    this.isDragging = false;
  }

  private onWheel(e: WheelEvent): void {
    e.preventDefault();
    this.targetCameraZ += e.deltaY * 0.02;
    this.targetCameraZ = Math.max(this.minCameraZ, Math.min(this.maxCameraZ, this.targetCameraZ));
  }

  private onClick(e: MouseEvent): void {
    if (e.target === this.renderer.domElement) {
      this.mirrorTunnel.triggerPulse();
    }
  }

  private updatePaletteName(): void {
    this.paletteNameEl.textContent = this.colorPalette.getCurrentPaletteName();
  }

  private animate(): void {
    requestAnimationFrame(this.animate.bind(this));

    const deltaTime = this.clock.getDelta();
    const time = this.clock.getElapsedTime();

    this.colorPalette.update(deltaTime);
    this.updatePaletteName();

    this.mouseX += (this.targetMouseX - this.mouseX) * this.lerpFactor;
    this.mouseY += (this.targetMouseY - this.mouseY) * this.lerpFactor;
    this.currentCameraZ += (this.targetCameraZ - this.currentCameraZ) * this.lerpFactor;

    this.camera.position.z = this.currentCameraZ;
    this.camera.position.x = this.mouseX * 2;
    this.camera.position.y = this.mouseY * 2;
    this.camera.lookAt(0, 0, 0);

    this.mirrorTunnel.setMouseInput(this.mouseX, this.mouseY);
    this.mirrorTunnel.update(deltaTime, time);

    this.renderer.render(this.scene, this.camera);
  }

  dispose(): void {
    this.mirrorTunnel.dispose();
    this.renderer.dispose();
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new App();
});
