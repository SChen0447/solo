import * as THREE from 'three';
import { CONFIG } from './config';
import { Bridge } from './bridge';
import { Platform } from './platform';
import { audioManager } from './audio';

class App {
  private container: HTMLElement;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private bridge: Bridge | null = null;
  private leftPlatform: Platform | null = null;
  private rightPlatform: Platform | null = null;
  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;
  private clock: THREE.Clock;
  private stars: THREE.Points | null = null;
  private isMobile = false;
  private bridgeWidth = 0;
  private bridgeHeight = 0;
  private hoveredPlatform: Platform | null = null;
  private animationFrameId: number | null = null;

  constructor() {
    this.container = document.getElementById('app')!;
    this.scene = new THREE.Scene();
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    this.clock = new THREE.Clock();

    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      2000
    );
    this.camera.position.z = 500;

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setClearColor(0x000000, 0);

    this.container.appendChild(this.renderer.domElement);

    this.checkMobile();
    this.calculateBridgeDimensions();
    this.createStars();
    this.createBridge();
    this.createPlatforms();
    this.bindEvents();
    this.animate();

    audioManager.init();
  }

  private checkMobile(): void {
    this.isMobile = window.innerWidth < CONFIG.responsive.mobileBreakpoint;
  }

  private calculateBridgeDimensions(): void {
    const spanRatio = this.isMobile
      ? CONFIG.bridge.spanRatioMobile
      : CONFIG.bridge.spanRatioDesktop;

    this.bridgeWidth = Math.max(
      window.innerWidth * spanRatio,
      CONFIG.bridge.minWidth
    );
    this.bridgeHeight = Math.max(
      window.innerHeight * CONFIG.bridge.heightRatio,
      CONFIG.bridge.minHeight
    );

    const vFov = (this.camera.fov * Math.PI) / 180;
    const distance = this.camera.position.z;
    const visibleHeight = 2 * Math.tan(vFov / 2) * distance;
    const scale = visibleHeight / window.innerHeight;

    this.bridgeWidth *= scale;
    this.bridgeHeight *= scale;
  }

  private createStars(): void {
    const starGeometry = new THREE.BufferGeometry();
    const starCount = 500;
    const positions = new Float32Array(starCount * 3);
    const colors = new Float32Array(starCount * 3);
    const sizes = new Float32Array(starCount);

    for (let i = 0; i < starCount; i++) {
      const i3 = i * 3;
      positions[i3] = (Math.random() - 0.5) * 2000;
      positions[i3 + 1] = (Math.random() - 0.5) * 1500;
      positions[i3 + 2] = (Math.random() - 0.5) * 1000 - 200;

      const color = new THREE.Color();
      color.setHSL(0.6 + Math.random() * 0.2, 0.5, 0.7 + Math.random() * 0.3);
      colors[i3] = color.r;
      colors[i3 + 1] = color.g;
      colors[i3 + 2] = color.b;

      sizes[i] = Math.random() * 2 + 0.5;
    }

    starGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    starGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    starGeometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    const starMaterial = new THREE.PointsMaterial({
      size: 1.5,
      vertexColors: true,
      transparent: true,
      opacity: 0.8,
      sizeAttenuation: true
    });

    this.stars = new THREE.Points(starGeometry, starMaterial);
    this.scene.add(this.stars);
  }

  private createBridge(): void {
    if (this.bridge) {
      this.scene.remove(this.bridge.getMesh());
      this.bridge.dispose();
    }

    this.bridge = new Bridge(this.bridgeWidth, this.bridgeHeight, this.isMobile);
    this.scene.add(this.bridge.getMesh());
  }

  private createPlatforms(): void {
    if (this.leftPlatform) {
      this.scene.remove(this.leftPlatform.getMesh());
      this.leftPlatform.dispose();
    }
    if (this.rightPlatform) {
      this.scene.remove(this.rightPlatform.getMesh());
      this.rightPlatform.dispose();
    }

    const leftPos = new THREE.Vector3(-this.bridgeWidth / 2 - 20, 0, 0);
    const rightPos = new THREE.Vector3(this.bridgeWidth / 2 + 20, 0, 0);

    this.leftPlatform = new Platform(leftPos);
    this.rightPlatform = new Platform(rightPos);

    this.scene.add(this.leftPlatform.getMesh());
    this.scene.add(this.rightPlatform.getMesh());
  }

  private bindEvents(): void {
    window.addEventListener('resize', this.onResize.bind(this));
    window.addEventListener('mousemove', this.onMouseMove.bind(this));
    window.addEventListener('click', this.onClick.bind(this));
    window.addEventListener('touchstart', this.onTouchStart.bind(this), { passive: false });
    window.addEventListener('touchmove', this.onTouchMove.bind(this), { passive: false });
  }

  private onResize(): void {
    const oldIsMobile = this.isMobile;
    this.checkMobile();

    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();

    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    this.calculateBridgeDimensions();

    if (this.bridge) {
      this.bridge.resize(this.bridgeWidth, this.bridgeHeight, this.isMobile);
    }

    if (oldIsMobile !== this.isMobile) {
      this.createBridge();
    }

    this.createPlatforms();
  }

  private updateMouse(clientX: number, clientY: number): void {
    this.mouse.x = (clientX / window.innerWidth) * 2 - 1;
    this.mouse.y = -(clientY / window.innerHeight) * 2 + 1;
  }

  private getIntersectedPoint(): THREE.Vector3 | null {
    this.raycaster.setFromCamera(this.mouse, this.camera);

    const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
    const intersectPoint = new THREE.Vector3();
    this.raycaster.ray.intersectPlane(plane, intersectPoint);

    return intersectPoint;
  }

  private checkPlatformHover(point: THREE.Vector3): void {
    let newHovered: Platform | null = null;

    if (this.leftPlatform && this.leftPlatform.containsPoint(point)) {
      newHovered = this.leftPlatform;
    } else if (this.rightPlatform && this.rightPlatform.containsPoint(point)) {
      newHovered = this.rightPlatform;
    }

    if (newHovered !== this.hoveredPlatform) {
      if (this.hoveredPlatform) {
        this.hoveredPlatform.onMouseLeave();
      }
      if (newHovered) {
        newHovered.onMouseEnter();
      }
      this.hoveredPlatform = newHovered;
    }
  }

  private onMouseMove(event: MouseEvent): void {
    this.updateMouse(event.clientX, event.clientY);
    const point = this.getIntersectedPoint();

    if (this.bridge) {
      this.bridge.onMouseMove(point);
    }

    if (point) {
      this.checkPlatformHover(point);
    }
  }

  private onTouchStart(event: TouchEvent): void {
    event.preventDefault();
    if (event.touches.length > 0) {
      const touch = event.touches[0];
      this.updateMouse(touch.clientX, touch.clientY);
      const point = this.getIntersectedPoint();

      if (this.bridge && point) {
        this.bridge.onClick(point);
      }

      if (point) {
        this.checkPlatformHover(point);
      }
    }
  }

  private onTouchMove(event: TouchEvent): void {
    event.preventDefault();
    if (event.touches.length > 0) {
      const touch = event.touches[0];
      this.updateMouse(touch.clientX, touch.clientY);
      const point = this.getIntersectedPoint();

      if (this.bridge) {
        this.bridge.onMouseMove(point);
      }

      if (point) {
        this.checkPlatformHover(point);
      }
    }
  }

  private onClick(event: MouseEvent): void {
    this.updateMouse(event.clientX, event.clientY);
    const point = this.getIntersectedPoint();

    if (this.bridge && point) {
      this.bridge.onClick(point);
    }
  }

  private animate(): void {
    this.animationFrameId = requestAnimationFrame(this.animate.bind(this));

    const deltaTime = Math.min(this.clock.getDelta(), 0.1);
    const time = this.clock.getElapsedTime();

    if (this.bridge) {
      this.bridge.update(time, deltaTime);
    }

    if (this.stars) {
      const positions = this.stars.geometry.attributes.position;
      const count = positions.count;
      for (let i = 0; i < count; i++) {
        const y = positions.getY(i);
        positions.setY(i, y + Math.sin(time * 0.5 + i * 0.01) * 0.1);
      }
      positions.needsUpdate = true;
      this.stars.rotation.y += 0.0001;
    }

    this.renderer.render(this.scene, this.camera);
  }

  dispose(): void {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }

    window.removeEventListener('resize', this.onResize.bind(this));
    window.removeEventListener('mousemove', this.onMouseMove.bind(this));
    window.removeEventListener('click', this.onClick.bind(this));
    window.removeEventListener('touchstart', this.onTouchStart.bind(this));
    window.removeEventListener('touchmove', this.onTouchMove.bind(this));

    if (this.bridge) {
      this.bridge.dispose();
    }
    if (this.leftPlatform) {
      this.leftPlatform.dispose();
    }
    if (this.rightPlatform) {
      this.rightPlatform.dispose();
    }
    if (this.stars) {
      this.stars.geometry.dispose();
      (this.stars.material as THREE.Material).dispose();
    }

    this.renderer.dispose();
    this.container.removeChild(this.renderer.domElement);
  }
}

const app = new App();

(window as any).app = app;
