import * as THREE from 'three';
import { SolarSystem } from './solarSystem';
import { UIManager } from './ui';

class App {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private container: HTMLElement;
  private solarSystem: SolarSystem;
  private ui: UIManager;
  private clock: THREE.Clock;

  private isDragging: boolean = false;
  private previousMouse: { x: number; y: number } = { x: 0, y: 0 };
  private spherical: { radius: number; theta: number; phi: number };
  private targetSpherical: { radius: number; theta: number; phi: number };
  private cameraTarget: THREE.Vector3;

  constructor() {
    this.container = document.getElementById('canvas-container')!;

    this.scene = new THREE.Scene();
    this.scene.background = null;

    const width = this.container.clientWidth;
    const height = this.container.clientHeight;

    this.camera = new THREE.PerspectiveCamera(55, width / height, 0.1, 2000);
    this.cameraTarget = new THREE.Vector3(0, 0, 0);

    this.spherical = { radius: 120, theta: Math.PI * 0.25, phi: Math.PI * 0.35 };
    this.targetSpherical = { ...this.spherical };
    this.updateCameraPosition();

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(width, height);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;
    this.container.appendChild(this.renderer.domElement);

    const ambientLight = new THREE.AmbientLight(0x404050, 0.4);
    this.scene.add(ambientLight);

    this.solarSystem = new SolarSystem(this.scene);
    this.ui = new UIManager(this.solarSystem);

    this.solarSystem.onBodyClick = (body) => {
      this.ui.showBodyInfo(body);
    };

    this.clock = new THREE.Clock();

    this.bindEvents();
    this.animate();
  }

  private updateCameraPosition(): void {
    const sinPhiRadius = this.spherical.radius * Math.sin(this.spherical.phi);
    this.camera.position.x = sinPhiRadius * Math.sin(this.spherical.theta) + this.cameraTarget.x;
    this.camera.position.y = this.spherical.radius * Math.cos(this.spherical.phi) + this.cameraTarget.y;
    this.camera.position.z = sinPhiRadius * Math.cos(this.spherical.theta) + this.cameraTarget.z;
    this.camera.lookAt(this.cameraTarget);
  }

  private bindEvents(): void {
    const canvas = this.renderer.domElement;

    canvas.addEventListener('mousedown', (e) => {
      this.isDragging = true;
      this.previousMouse = { x: e.clientX, y: e.clientY };
    });

    window.addEventListener('mousemove', (e) => {
      if (!this.isDragging) return;

      const deltaX = e.clientX - this.previousMouse.x;
      const deltaY = e.clientY - this.previousMouse.y;

      this.targetSpherical.theta -= deltaX * 0.005;
      this.targetSpherical.phi = Math.max(
        0.08,
        Math.min(Math.PI - 0.08, this.targetSpherical.phi - deltaY * 0.005)
      );

      this.previousMouse = { x: e.clientX, y: e.clientY };
    });

    window.addEventListener('mouseup', () => {
      this.isDragging = false;
    });

    canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      const zoomSpeed = 0.0015;
      this.targetSpherical.radius = Math.max(
        10,
        Math.min(350, this.targetSpherical.radius * (1 + e.deltaY * zoomSpeed))
      );
    }, { passive: false });

    let touchStartDistance = 0;
    let touchStartSphericalRadius = 0;

    canvas.addEventListener('touchstart', (e) => {
      if (e.touches.length === 1) {
        this.isDragging = true;
        this.previousMouse = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      } else if (e.touches.length === 2) {
        touchStartDistance = this.getTouchDistance(e.touches);
        touchStartSphericalRadius = this.targetSpherical.radius;
      }
    }, { passive: true });

    canvas.addEventListener('touchmove', (e) => {
      if (e.touches.length === 1 && this.isDragging) {
        const deltaX = e.touches[0].clientX - this.previousMouse.x;
        const deltaY = e.touches[0].clientY - this.previousMouse.y;

        this.targetSpherical.theta -= deltaX * 0.005;
        this.targetSpherical.phi = Math.max(
          0.08,
          Math.min(Math.PI - 0.08, this.targetSpherical.phi - deltaY * 0.005)
        );

        this.previousMouse = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      } else if (e.touches.length === 2) {
        const currentDistance = this.getTouchDistance(e.touches);
        const scale = touchStartDistance / currentDistance;
        this.targetSpherical.radius = Math.max(
          10,
          Math.min(350, touchStartSphericalRadius * scale)
        );
      }
    }, { passive: true });

    canvas.addEventListener('touchend', () => {
      this.isDragging = false;
    });

    canvas.addEventListener('click', (e) => {
      this.solarSystem.handleClick(e, this.camera, this.container);
    });

    window.addEventListener('resize', () => {
      this.onResize();
    });
  }

  private getTouchDistance(touches: TouchList): number {
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }

  private onResize(): void {
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();

    this.renderer.setSize(width, height);
  }

  private animate = (): void => {
    requestAnimationFrame(this.animate);

    const delta = Math.min(this.clock.getDelta(), 0.05);

    this.spherical.radius += (this.targetSpherical.radius - this.spherical.radius) * 0.1;
    this.spherical.theta += (this.targetSpherical.theta - this.spherical.theta) * 0.1;
    this.spherical.phi += (this.targetSpherical.phi - this.spherical.phi) * 0.1;
    this.updateCameraPosition();

    this.solarSystem.update(delta);

    this.renderer.render(this.scene, this.camera);
  };
}

window.addEventListener('DOMContentLoaded', () => {
  new App();
});
