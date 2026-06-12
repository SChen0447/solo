import * as THREE from 'three';
import { ParticleSystem } from './ParticleSystem';
import { InputHandler, MouseState, KeyboardCommand } from './inputHandler';

class AuroraScene {
  private container: HTMLElement;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private clock: THREE.Clock;

  private inputHandler: InputHandler;
  private particleSystem: ParticleSystem;

  private stars: THREE.Points;

  private animationId: number | null = null;
  private lastMouseState: MouseState;

  constructor() {
    this.container = document.getElementById('app') as HTMLElement;
    if (!this.container) {
      throw new Error('Container #app not found');
    }

    this.scene = new THREE.Scene();
    this.clock = new THREE.Clock();

    this.lastMouseState = {
      isDragging: false,
      position: new THREE.Vector3(0, 0, 0),
      velocity: 0,
      screenX: 0,
      screenY: 0
    };

    this.initCamera();
    this.initRenderer();
    this.initStars();

    this.particleSystem = new ParticleSystem(this.scene);
    this.inputHandler = new InputHandler(this.container);

    this.bindInputEvents();
    this.handleResize();
    window.addEventListener('resize', this.handleResize);

    this.start();
  }

  private initCamera(): void {
    this.camera = new THREE.PerspectiveCamera(
      60,
      this.container.clientWidth / this.container.clientHeight,
      0.1,
      1000
    );
    this.camera.position.set(0, 0, 15);
    this.camera.lookAt(0, 0, 0);
  }

  private initRenderer(): void {
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    this.renderer.setClearColor(0x000000, 0);
    this.container.appendChild(this.renderer.domElement);
  }

  private initStars(): void {
    const starCount = 1500;
    const positions = new Float32Array(starCount * 3);
    const colors = new Float32Array(starCount * 3);

    for (let i = 0; i < starCount; i++) {
      const i3 = i * 3;
      const radius = 50 + Math.random() * 100;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);

      positions[i3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      positions[i3 + 2] = radius * Math.cos(phi) - 30;

      const brightness = 0.5 + Math.random() * 0.5;
      const tint = Math.random();
      colors[i3] = brightness * (0.8 + tint * 0.2);
      colors[i3 + 1] = brightness * (0.85 + tint * 0.15);
      colors[i3 + 2] = brightness;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
      size: 0.3,
      vertexColors: true,
      transparent: true,
      opacity: 0.8,
      sizeAttenuation: true
    });

    this.stars = new THREE.Points(geometry, material);
    this.scene.add(this.stars);
  }

  private bindInputEvents(): void {
    this.inputHandler.onMouseUpdate((state: MouseState) => {
      this.lastMouseState = state;
    });

    this.inputHandler.onCommand((cmd: KeyboardCommand) => {
      this.handleCommand(cmd);
    });
  }

  private handleCommand(cmd: KeyboardCommand): void {
    switch (cmd.type) {
      case 'reset':
        this.particleSystem.reset();
        break;
      case 'toggleColor':
        this.particleSystem.toggleColorTheme();
        break;
      case 'togglePause':
        this.particleSystem.togglePause();
        break;
    }
  }

  private handleResize = (): void => {
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();

    this.renderer.setSize(width, height);
  };

  private start(): void {
    this.animate();
  }

  private animate = (): void => {
    this.animationId = requestAnimationFrame(this.animate);

    const deltaTime = Math.min(this.clock.getDelta(), 0.05);
    const elapsed = this.clock.getElapsedTime();

    this.stars.rotation.y = elapsed * 0.01;
    this.stars.rotation.x = Math.sin(elapsed * 0.005) * 0.05;

    if (this.lastMouseState.isDragging) {
      this.particleSystem.spawnParticles(
        this.lastMouseState.position,
        this.lastMouseState.velocity
      );
    } else {
      this.particleSystem.startFadeOut();
    }

    this.particleSystem.update(deltaTime);

    this.renderer.render(this.scene, this.camera);
  };

  public dispose(): void {
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
    }
    window.removeEventListener('resize', this.handleResize);
    this.inputHandler.dispose();
    this.particleSystem.dispose();

    this.stars.geometry.dispose();
    (this.stars.material as THREE.Material).dispose();

    this.renderer.dispose();
    if (this.renderer.domElement.parentNode) {
      this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
    }
  }
}

new AuroraScene();
