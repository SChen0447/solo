import * as THREE from 'three';
import { BookManager, BookData } from './book';
import { GuardianManager, Portal } from './guardian';

declare global {
  interface Window {
    gameCamera: THREE.PerspectiveCamera;
  }
}

class Game {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private clock: THREE.Clock;
  private bookManager: BookManager;
  private guardianManager: GuardianManager;
  private portal: Portal;
  private portalActivated: boolean = false;

  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;

  private counterEl: HTMLElement;
  private shakeDuration: number = 0;
  private shakeIntensity: number = 0;
  private originalCameraPos: THREE.Vector3;
  private counterFlashTimer: number = 0;
  private counterFlashState: boolean = false;
  private allBooksClicked: boolean = false;

  constructor() {
    this.scene = new THREE.Scene();
    this.scene.background = this.createGradientTexture();

    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      100
    );
    const camX = 0;
    const camY = 3;
    const camZ = -5;
    this.camera.position.set(camX, camY, camZ);
    this.camera.lookAt(0, 1, 0);
    this.originalCameraPos = new THREE.Vector3(camX, camY, camZ);
    window.gameCamera = this.camera;

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;

    const app = document.getElementById('app');
    if (app) {
      app.appendChild(this.renderer.domElement);
    }

    this.clock = new THREE.Clock();

    this.setupLights();

    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();

    this.guardianManager = new GuardianManager(this.scene);

    this.bookManager = new BookManager(
      this.scene,
      this.raycaster,
      this.mouse,
      (book: BookData) => this.onBookClick(book)
    );
    this.bookManager.createBooks();

    this.portal = new Portal(this.scene, new THREE.Vector3(0, 2, 0));

    const counter = document.getElementById('counter');
    this.counterEl = counter!;

    this.setupEventListeners();
    this.animate = this.animate.bind(this);
  }

  private createGradientTexture(): THREE.Texture {
    const canvas = document.createElement('canvas');
    canvas.width = 2;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;
    const gradient = ctx.createLinearGradient(0, 0, 0, 512);
    gradient.addColorStop(0, '#0a0a24');
    gradient.addColorStop(1, '#020210');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 2, 512);
    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
  }

  private setupLights(): void {
    const ambientLight = new THREE.AmbientLight(0x404060, 0.3);
    this.scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xaaccff, 0.6);
    directionalLight.position.set(-5, 8, 3);
    this.scene.add(directionalLight);

    const pointLight = new THREE.PointLight(0x88ddff, 0.3, 30);
    pointLight.position.set(0, 6, 0);
    this.scene.add(pointLight);
  }

  private setupEventListeners(): void {
    window.addEventListener('resize', () => this.onWindowResize());
    window.addEventListener('mousemove', (e) => this.onMouseMove(e));
    window.addEventListener('click', () => this.onClick());
  }

  private onWindowResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  private onMouseMove(event: MouseEvent): void {
    this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    this.bookManager.handleMouseMove();
  }

  private onClick(): void {
    this.bookManager.handleClick();
  }

  private onBookClick(_book: BookData): void {
    this.triggerShake(0.2, 2);
    this.guardianManager.spawnGuardian(_book.position.clone());
    this.updateCounter();
  }

  private triggerShake(duration: number, intensity: number): void {
    this.shakeDuration = duration;
    this.shakeIntensity = intensity;
  }

  private updateCounter(): void {
    const count = this.bookManager.getClickedCount();
    this.counterEl.textContent = `已唤醒精灵: ${count} / 30`;

    if (this.bookManager.isAllClicked() && !this.allBooksClicked) {
      this.allBooksClicked = true;
      this.counterEl.classList.add('golden');
      this.portalActivated = true;
      this.portal.activate();
      this.guardianManager.activatePortal(new THREE.Vector3(0, 2, 0));
    }
  }

  private updateCameraShake(delta: number): void {
    if (this.shakeDuration > 0) {
      this.shakeDuration -= delta;
      const shakeX = (Math.random() - 0.5) * this.shakeIntensity * 0.01;
      const shakeY = (Math.random() - 0.5) * this.shakeIntensity * 0.01;
      const shakeZ = (Math.random() - 0.5) * this.shakeIntensity * 0.01;
      this.camera.position.set(
        this.originalCameraPos.x + shakeX,
        this.originalCameraPos.y + shakeY,
        this.originalCameraPos.z + shakeZ
      );
    } else {
      this.camera.position.lerp(this.originalCameraPos, 0.1);
    }
  }

  private updateCounterFlash(delta: number): void {
    if (!this.allBooksClicked) return;
    this.counterFlashTimer += delta;
    if (this.counterFlashTimer >= 0.3) {
      this.counterFlashTimer = 0;
      this.counterFlashState = !this.counterFlashState;
      this.counterEl.style.opacity = this.counterFlashState ? '1.0' : '0.6';
    }
  }

  public start(): void {
    this.clock.start();
    this.animate();
  }

  private animate(): void {
    requestAnimationFrame(this.animate);
    const delta = Math.min(this.clock.getDelta(), 0.1);
    const currentTime = performance.now();

    this.bookManager.update(delta);
    this.guardianManager.update(delta, currentTime);
    if (this.portalActivated) {
      this.portal.update(currentTime);
    }
    this.updateCameraShake(delta);
    this.updateCounterFlash(delta);

    this.renderer.render(this.scene, this.camera);
  }
}

const game = new Game();
game.start();
