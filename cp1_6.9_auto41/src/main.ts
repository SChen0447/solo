import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { PipelineManager } from './PipelineManager';
import { EnergyBubble } from './EnergyBubble';

class App {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;
  private pipelineManager: PipelineManager;
  private energyBubble: EnergyBubble;
  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;
  private clock: THREE.Clock;
  private container: HTMLElement;
  private energyFill: HTMLElement;
  private energyPercent: HTMLElement;
  private resetBtn: HTMLElement;
  private fireworksParticles: THREE.Points | null = null;
  private fireworksActive: boolean = false;
  private fireworksTime: number = 0;

  constructor() {
    this.container = document.getElementById('app') as HTMLElement;
    this.energyFill = document.getElementById('energy-fill') as HTMLElement;
    this.energyPercent = document.getElementById('energy-percent') as HTMLElement;
    this.resetBtn = document.getElementById('reset-btn') as HTMLElement;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0a0000);
    this.scene.fog = new THREE.FogExp2(0x0a0000, 0.08);

    this.camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.camera.position.set(0, 0, 6);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.container.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.minDistance = 3;
    this.controls.maxDistance = 15;
    this.controls.autoRotate = true;
    this.controls.autoRotateSpeed = 0.3;

    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    this.clock = new THREE.Clock();

    this.setupLights();

    this.pipelineManager = new PipelineManager(this.scene, this.onEnergyUpdate.bind(this));
    this.energyBubble = new EnergyBubble(this.scene, this.onBubbleActivated.bind(this));

    this.setupEventListeners();

    this.animate();
  }

  private setupLights(): void {
    const ambientLight = new THREE.AmbientLight(0x331111, 0.4);
    this.scene.add(ambientLight);

    const pointLight1 = new THREE.PointLight(0xff3300, 0.8, 20);
    pointLight1.position.set(3, 3, 3);
    this.scene.add(pointLight1);

    const pointLight2 = new THREE.PointLight(0xff6600, 0.6, 15);
    pointLight2.position.set(-3, -2, 2);
    this.scene.add(pointLight2);
  }

  private setupEventListeners(): void {
    window.addEventListener('resize', this.onResize.bind(this));
    window.addEventListener('mousemove', this.onMouseMove.bind(this));
    window.addEventListener('click', this.onClick.bind(this));
    this.resetBtn.addEventListener('click', this.onReset.bind(this));
  }

  private onResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  private onMouseMove(event: MouseEvent): void {
    this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);
    this.pipelineManager.handleHover(this.raycaster);
  }

  private onClick(event: MouseEvent): void {
    this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);

    if (!this.energyBubble.isActivated) {
      this.energyBubble.handleClick(this.raycaster);
    }

    if (this.energyBubble.isActivated) {
      this.pipelineManager.handleClick(this.raycaster);
    }
  }

  private onReset(): void {
    this.resetBtn.classList.add('bounce');
    setTimeout(() => this.resetBtn.classList.remove('bounce'), 150);

    this.pipelineManager.reset();
    this.energyFill.style.width = '0%';
    this.energyPercent.textContent = '0%';
    this.removeFireworks();
  }

  private onBubbleActivated(): void {
    this.pipelineManager.activate();
    this.controls.autoRotate = false;
  }

  private onEnergyUpdate(percent: number): void {
    this.energyFill.style.width = `${percent}%`;
    this.energyPercent.textContent = `${Math.round(percent)}%`;

    if (percent >= 100 && !this.fireworksActive) {
      this.triggerFireworks();
    }
  }

  private triggerFireworks(): void {
    this.fireworksActive = true;
    this.fireworksTime = 0;

    const particleCount = 200;
    const positions = new Float32Array(particleCount * 3);
    const velocities: THREE.Vector3[] = [];
    const colors = new Float32Array(particleCount * 3);
    const colorPalette = [
      new THREE.Color(0xff4444),
      new THREE.Color(0x44ff44),
      new THREE.Color(0x4444ff),
      new THREE.Color(0xffff44),
      new THREE.Color(0xff44ff),
      new THREE.Color(0x44ffff)
    ];

    for (let i = 0; i < particleCount; i++) {
      positions[i * 3] = 0;
      positions[i * 3 + 1] = 0;
      positions[i * 3 + 2] = 0;

      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI;
      const speed = 2 + Math.random() * 3;
      velocities.push(new THREE.Vector3(
        Math.sin(phi) * Math.cos(theta) * speed,
        Math.sin(phi) * Math.sin(theta) * speed,
        Math.cos(phi) * speed
      ));

      const color = colorPalette[Math.floor(Math.random() * colorPalette.length)];
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
      size: 0.1,
      vertexColors: true,
      transparent: true,
      opacity: 1,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    this.fireworksParticles = new THREE.Points(geometry, material);
    (this.fireworksParticles.userData as any).velocities = velocities;
    this.scene.add(this.fireworksParticles);
  }

  private updateFireworks(delta: number): void {
    if (!this.fireworksParticles || !this.fireworksActive) return;

    this.fireworksTime += delta;

    if (this.fireworksTime > 3) {
      this.removeFireworks();
      return;
    }

    const positions = this.fireworksParticles.geometry.attributes.position.array as Float32Array;
    const velocities = (this.fireworksParticles.userData as any).velocities as THREE.Vector3[];
    const material = this.fireworksParticles.material as THREE.PointsMaterial;

    for (let i = 0; i < velocities.length; i++) {
      velocities[i].y -= 2 * delta;
      positions[i * 3] += velocities[i].x * delta;
      positions[i * 3 + 1] += velocities[i].y * delta;
      positions[i * 3 + 2] += velocities[i].z * delta;
    }

    this.fireworksParticles.geometry.attributes.position.needsUpdate = true;
    material.opacity = Math.max(0, 1 - this.fireworksTime / 3);
  }

  private removeFireworks(): void {
    if (this.fireworksParticles) {
      this.scene.remove(this.fireworksParticles);
      this.fireworksParticles.geometry.dispose();
      (this.fireworksParticles.material as THREE.Material).dispose();
      this.fireworksParticles = null;
    }
    this.fireworksActive = false;
  }

  private animate(): void {
    requestAnimationFrame(this.animate.bind(this));

    const delta = this.clock.getDelta();
    const elapsed = this.clock.getElapsedTime();

    this.controls.update();
    this.energyBubble.update(delta, elapsed);
    this.pipelineManager.update(delta, elapsed);
    this.updateFireworks(delta);

    this.renderer.render(this.scene, this.camera);
  }
}

new App();
