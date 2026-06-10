import * as THREE from 'three';
import { ParticleSystem, EventType } from './ParticleSystem';
import { TimeController } from './TimeController';

class App {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private container: HTMLElement;
  private particleSystem: ParticleSystem;
  private timeController: TimeController;
  private clock: THREE.Clock;
  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;
  private isPointerDown: boolean = false;
  private pointerDownX: number = 0;
  private pointerDownY: number = 0;
  private pointerDownTime: number = 0;
  private isRotating: boolean = false;
  private lastMouseX: number = 0;
  private lastMouseY: number = 0;
  private cameraTheta: number = 0;
  private cameraPhi: number = Math.PI / 4;
  private cameraDistance: number = 18;
  private autoRotate: boolean = true;
  private cameraTarget: THREE.Vector3;
  private velocityX: number = 0;
  private velocityY: number = 0;
  private infoCard: HTMLElement;
  private infoCardTitle: HTMLElement;
  private infoCardYear: HTMLElement;
  private infoCardType: HTMLElement;
  private infoCardDescription: HTMLElement;
  private infoCardIcon: HTMLElement;
  private selectedEventId: number | null = null;

  constructor() {
    this.container = document.getElementById('canvas-container')!;
    this.infoCard = document.getElementById('info-card')!;
    this.infoCardTitle = document.getElementById('info-card-title')!;
    this.infoCardYear = document.getElementById('info-card-year')!;
    this.infoCardType = document.getElementById('info-card-type')!;
    this.infoCardDescription = document.getElementById('info-card-description')!;
    this.infoCardIcon = document.getElementById('info-card-icon')!;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0a0a1a);

    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      200
    );
    this.cameraTarget = new THREE.Vector3(0, 0, 0);
    this.updateCameraPosition();

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance'
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setClearColor(0x0a0a1a, 1);
    this.container.appendChild(this.renderer.domElement);

    this.clock = new THREE.Clock();
    this.raycaster = new THREE.Raycaster();
    this.raycaster.params.Points = { threshold: 0.5 };
    this.mouse = new THREE.Vector2();

    this.particleSystem = new ParticleSystem(this.scene);

    this.timeController = new TimeController({
      minYear: -500,
      maxYear: 2000,
      tickInterval: 100,
      onYearChange: (year: number, isSmooth: boolean) => {
        this.particleSystem.setCurrentYear(year, isSmooth);
      }
    });

    this.bindEvents();
    this.animate();
  }

  private updateCameraPosition(): void {
    const x = this.cameraDistance * Math.sin(this.cameraPhi) * Math.sin(this.cameraTheta);
    const y = this.cameraDistance * Math.cos(this.cameraPhi);
    const z = this.cameraDistance * Math.sin(this.cameraPhi) * Math.cos(this.cameraTheta);
    this.camera.position.set(x, y, z);
    this.camera.lookAt(this.cameraTarget);
  }

  private bindEvents(): void {
    window.addEventListener('resize', this.onResize.bind(this));

    const canvas = this.renderer.domElement;
    canvas.addEventListener('mousedown', this.onPointerDown.bind(this));
    canvas.addEventListener('touchstart', this.onPointerDown.bind(this), { passive: false });
    document.addEventListener('mousemove', this.onPointerMove.bind(this));
    document.addEventListener('touchmove', this.onPointerMove.bind(this), { passive: false });
    document.addEventListener('mouseup', this.onPointerUp.bind(this));
    document.addEventListener('touchend', this.onPointerUp.bind(this));
    canvas.addEventListener('wheel', this.onWheel.bind(this), { passive: false });

    document.addEventListener('click', this.onDocumentClick.bind(this));
  }

  private getPointerPosition(e: MouseEvent | TouchEvent): { x: number; y: number } {
    if (e instanceof TouchEvent) {
      if (e.touches.length > 0) {
        return { x: e.touches[0].clientX, y: e.touches[0].clientY };
      } else if (e.changedTouches.length > 0) {
        return { x: e.changedTouches[0].clientX, y: e.changedTouches[0].clientY };
      }
    }
    return { x: (e as MouseEvent).clientX, y: (e as MouseEvent).clientY };
  }

  private onPointerDown(e: MouseEvent | TouchEvent): void {
    if (e instanceof TouchEvent) e.preventDefault();
    const pos = this.getPointerPosition(e);

    const target = e.target as HTMLElement;
    if (target && target.closest('#timeline-container')) return;

    this.isPointerDown = true;
    this.pointerDownX = pos.x;
    this.pointerDownY = pos.y;
    this.pointerDownTime = performance.now();
    this.lastMouseX = pos.x;
    this.lastMouseY = pos.y;
    this.velocityX = 0;
    this.velocityY = 0;
    this.autoRotate = false;
  }

  private onPointerMove(e: MouseEvent | TouchEvent): void {
    const pos = this.getPointerPosition(e);

    if (this.isPointerDown) {
      if (e instanceof TouchEvent) e.preventDefault();
      const dx = pos.x - this.lastMouseX;
      const dy = pos.y - this.lastMouseY;
      const distance = Math.sqrt(
        (pos.x - this.pointerDownX) ** 2 + (pos.y - this.pointerDownY) ** 2
      );

      if (distance > 5 || this.isRotating) {
        this.isRotating = true;
        this.velocityX = dx;
        this.velocityY = dy;
        this.cameraTheta -= dx * 0.005;
        this.cameraPhi -= dy * 0.005;
        const minPhi = (Math.PI / 180) * 30;
        const maxPhi = (Math.PI / 180) * 120;
        this.cameraPhi = Math.max(minPhi, Math.min(maxPhi, this.cameraPhi));
        this.updateCameraPosition();
      }

      this.lastMouseX = pos.x;
      this.lastMouseY = pos.y;
    }

    this.mouse.x = (pos.x / window.innerWidth) * 2 - 1;
    this.mouse.y = -(pos.y / window.innerHeight) * 2 + 1;
  }

  private onPointerUp(e: MouseEvent | TouchEvent): void {
    if (!this.isPointerDown) return;

    const pos = this.getPointerPosition(e);
    const distance = Math.sqrt(
      (pos.x - this.pointerDownX) ** 2 + (pos.y - this.pointerDownY) ** 2
    );
    const elapsed = performance.now() - this.pointerDownTime;

    if (!this.isRotating && distance < 5 && elapsed < 300) {
      this.handleParticleClick(pos);
    }

    this.isPointerDown = false;
    this.isRotating = false;
  }

  private handleParticleClick(screenPos: { x: number; y: number }): void {
    this.mouse.x = (screenPos.x / window.innerWidth) * 2 - 1;
    this.mouse.y = -(screenPos.y / window.innerHeight) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObject(
      this.particleSystem.getPoints()
    );

    if (intersects.length > 0) {
      const index = intersects[0].index;
      if (index !== undefined) {
        if (this.selectedEventId === index) {
          this.hideInfoCard();
        } else {
          this.showInfoCard(index);
        }
      }
    } else {
      this.hideInfoCard();
    }
  }

  private onDocumentClick(e: MouseEvent): void {
    const target = e.target as HTMLElement;
    if (target.closest('#info-card')) return;
    if (target.closest('#timeline-container')) return;
    if (target.closest('#legend')) return;
    if (target.closest('#title')) return;
    if (target.closest('#hint')) return;

    if (
      !target.closest('#timeline-container') &&
      !target.closest('#info-card') &&
      this.isPointerDown === false &&
      this.selectedEventId !== null
    ) {
      const pos = this.getPointerPosition(e);
      this.mouse.x = (pos.x / window.innerWidth) * 2 - 1;
      this.mouse.y = -(pos.y / window.innerHeight) * 2 + 1;

      this.raycaster.setFromCamera(this.mouse, this.camera);
      const intersects = this.raycaster.intersectObject(
        this.particleSystem.getPoints()
      );

      if (intersects.length === 0) {
        this.hideInfoCard();
      }
    }
  }

  private showInfoCard(eventId: number): void {
    this.selectedEventId = eventId;
    this.particleSystem.highlightEvent(eventId);
    const event = this.particleSystem.getEventById(eventId);
    if (!event) return;

    this.infoCardTitle.textContent = event.name;
    this.infoCardYear.textContent = this.formatYear(event.year);
    this.infoCardDescription.textContent = event.description;

    this.infoCardIcon.textContent = ParticleSystem.getEventIcon(event.type);
    this.infoCardIcon.style.color = ParticleSystem.getEventColor(event.type);

    this.infoCardType.textContent = ParticleSystem.getEventTypeLabel(event.type);
    this.infoCardType.className = '';
    this.infoCardType.classList.add('type-' + event.type);

    this.infoCard.classList.add('visible');
  }

  private hideInfoCard(): void {
    this.selectedEventId = null;
    this.particleSystem.clearHighlight();
    this.infoCard.classList.remove('visible');
  }

  private formatYear(year: number): string {
    if (year < 0) {
      return `公元前 ${Math.abs(year)} 年`;
    } else if (year === 0) {
      return '公元元年';
    } else {
      return `公元 ${year} 年`;
    }
  }

  private onWheel(e: WheelEvent): void {
    e.preventDefault();
    const delta = e.deltaY * 0.01;
    this.cameraDistance += delta;
    this.cameraDistance = Math.max(5, Math.min(30, this.cameraDistance));
    this.updateCameraPosition();
  }

  private onResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  private animate(): void {
    requestAnimationFrame(this.animate.bind(this));

    const delta = Math.min(this.clock.getDelta(), 0.05);

    if (!this.isPointerDown) {
      if (Math.abs(this.velocityX) > 0.01 || Math.abs(this.velocityY) > 0.01) {
        this.cameraTheta -= this.velocityX * 0.005;
        this.cameraPhi -= this.velocityY * 0.005;
        const minPhi = (Math.PI / 180) * 30;
        const maxPhi = (Math.PI / 180) * 120;
        this.cameraPhi = Math.max(minPhi, Math.min(maxPhi, this.cameraPhi));
        this.velocityX *= 0.95;
        this.velocityY *= 0.95;
        this.updateCameraPosition();
      } else if (this.autoRotate) {
        this.cameraTheta += 0.002;
        this.updateCameraPosition();
      }
    }

    if (this.isPointerDown === false && this.selectedEventId === null) {
      const idleCheck = () => {
        if (!this.isPointerDown && this.selectedEventId === null) {
          this.autoRotate = true;
        }
      };
      if (Math.abs(this.velocityX) < 0.01 && Math.abs(this.velocityY) < 0.01) {
        setTimeout(idleCheck, 2000);
      }
    }

    this.particleSystem.update(delta, this.camera);
    this.renderer.render(this.scene, this.camera);
  }

  public dispose(): void {
    this.timeController.dispose();
    this.particleSystem.dispose();
    this.renderer.dispose();
    window.removeEventListener('resize', this.onResize.bind(this));
  }
}

let app: App | null = null;

window.addEventListener('DOMContentLoaded', () => {
  app = new App();
});

window.addEventListener('beforeunload', () => {
  if (app) {
    app.dispose();
  }
});
