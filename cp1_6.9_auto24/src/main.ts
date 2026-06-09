import * as THREE from 'three';
import { GameWorld } from './GameWorld';

class App {
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private renderer!: THREE.WebGLRenderer;
  private gameWorld!: GameWorld;
  private raycaster!: THREE.Raycaster;
  private mouse!: THREE.Vector2;
  private clock!: THREE.Clock;
  private canvas!: HTMLCanvasElement;

  private hudEnergyText!: HTMLElement;
  private hudEnergyRing!: SVGCircleElement;
  private hudCrystalCount!: HTMLElement;

  constructor() {
    this.init();
    this.animate();
  }

  private init(): void {
    this.canvas = document.getElementById('game-canvas') as HTMLCanvasElement;

    this.scene = new THREE.Scene();

    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      200
    );
    this.camera.position.set(0, 2, 15);
    this.camera.lookAt(0, 0, 0);

    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      alpha: true
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setClearColor(0x000000, 0);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.3);
    this.scene.add(ambientLight);

    const pointLight = new THREE.PointLight(0x8e2de2, 1, 50);
    pointLight.position.set(5, 5, 5);
    this.scene.add(pointLight);

    const pointLight2 = new THREE.PointLight(0x00ffff, 0.6, 50);
    pointLight2.position.set(-5, -3, -5);
    this.scene.add(pointLight2);

    this.gameWorld = new GameWorld(this.scene);

    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    this.clock = new THREE.Clock();

    this.hudEnergyText = document.getElementById('energyText') as HTMLElement;
    this.hudEnergyRing = document.getElementById('energyRing') as SVGCircleElement;
    this.hudCrystalCount = document.getElementById('crystalCount') as HTMLElement;

    window.addEventListener('resize', this.onWindowResize.bind(this));
    window.addEventListener('click', this.onClick.bind(this));
    window.addEventListener('keydown', this.onKeyDown.bind(this));
  }

  private onWindowResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  private getWorldPointFromEvent(clientX: number, clientY: number): THREE.Vector3 {
    this.mouse.x = (clientX / window.innerWidth) * 2 - 1;
    this.mouse.y = -(clientY / window.innerHeight) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);

    const planeNormal = new THREE.Vector3(0, 0, 1);
    const planePoint = new THREE.Vector3(0, 0, 0);
    const plane = new THREE.Plane().setFromNormalAndCoplanarPoint(planeNormal, planePoint);

    const intersectPoint = new THREE.Vector3();
    this.raycaster.ray.intersectPlane(plane, intersectPoint);

    return intersectPoint;
  }

  private emitSoundWaveAt(x: number, y: number): void {
    const worldPoint = this.getWorldPointFromEvent(x, y);
    this.gameWorld.emitSoundWave(worldPoint);
  }

  private onClick(event: MouseEvent): void {
    this.emitSoundWaveAt(event.clientX, event.clientY);
  }

  private onKeyDown(event: KeyboardEvent): void {
    if (event.code === 'Space') {
      event.preventDefault();
      this.emitSoundWaveAt(window.innerWidth / 2, window.innerHeight / 2);
    }
  }

  private updateHUD(): void {
    const avgEnergy = this.gameWorld.crystals.length > 0
      ? Math.round(this.gameWorld.totalEnergy / this.gameWorld.crystals.length)
      : 0;
    this.hudEnergyText.textContent = String(avgEnergy);
    const circumference = 169.65;
    const offset = circumference * (1 - avgEnergy / 100);
    this.hudEnergyRing.style.strokeDashoffset = String(offset);

    const progress = this.gameWorld.collectedCount % 10;
    this.hudCrystalCount.textContent = `水晶 ${progress}/10`;
  }

  private animate(): void {
    requestAnimationFrame(this.animate.bind(this));
    const deltaTime = Math.min(this.clock.getDelta(), 0.1);

    this.gameWorld.update(deltaTime);

    const t = this.clock.getElapsedTime();
    this.camera.position.x = Math.sin(t * 0.1) * 0.5;
    this.camera.position.y = 2 + Math.cos(t * 0.15) * 0.3;
    this.camera.lookAt(0, 0, 0);

    this.updateHUD();
    this.renderer.render(this.scene, this.camera);
  }
}

new App();
