import * as THREE from 'three';
import { PlantModel } from './PlantModel';
import { EnvironmentController } from './EnvironmentController';
import { GrowthAnimation } from './GrowthAnimation';

class App {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private plant: PlantModel;
  private envController: EnvironmentController;
  private growthAnim: GrowthAnimation;
  private clock: THREE.Clock;
  private particles: THREE.Points;
  private particleVelocities: Float32Array;
  private particleLifetimes: Float32Array;
  private sowBtn: HTMLButtonElement | null;
  private isGrowing: boolean = false;

  constructor() {
    this.clock = new THREE.Clock();
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(
      50,
      window.innerWidth / window.innerHeight,
      0.1,
      100
    );
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });

    this.plant = new PlantModel();
    this.envController = new EnvironmentController('tweakpane-container');
    this.growthAnim = new GrowthAnimation(this.plant, this.envController.getParams());

    this.particles = new THREE.Points();
    this.particleVelocities = new Float32Array();
    this.particleLifetimes = new Float32Array();

    this.sowBtn = document.getElementById('sow-btn') as HTMLButtonElement | null;

    this.init();
  }

  private init(): void {
    this.setupRenderer();
    this.setupCamera();
    this.setupLights();
    this.setupGround();
    this.setupParticles();
    this.setupPlant();
    this.setupEvents();
    this.hideLoadingScreen();
    this.animate();
  }

  private setupRenderer(): void {
    const container = document.getElementById('canvas-container');
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.setClearColor(0x000000, 0);
    if (container) {
      container.appendChild(this.renderer.domElement);
    }
  }

  private setupCamera(): void {
    this.camera.position.set(0, 2, 5);
    this.camera.lookAt(0, 1.5, 0);
  }

  private setupLights(): void {
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    this.scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(3, 5, 2);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 1024;
    directionalLight.shadow.mapSize.height = 1024;
    directionalLight.shadow.camera.near = 0.5;
    directionalLight.shadow.camera.far = 20;
    directionalLight.shadow.camera.left = -5;
    directionalLight.shadow.camera.right = 5;
    directionalLight.shadow.camera.top = 5;
    directionalLight.shadow.camera.bottom = -5;
    this.scene.add(directionalLight);

    const fillLight = new THREE.DirectionalLight(0x88ccff, 0.3);
    fillLight.position.set(-3, 3, -2);
    this.scene.add(fillLight);
  }

  private setupGround(): void {
    const groundGeometry = new THREE.CircleGeometry(3, 32);
    const groundMaterial = new THREE.MeshStandardMaterial({
      color: 0x2d5a3d,
      roughness: 0.95,
      metalness: 0.0,
    });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.01;
    ground.receiveShadow = true;
    this.scene.add(ground);

    const groundRimGeometry = new THREE.RingGeometry(2.8, 3, 32);
    const groundRimMaterial = new THREE.MeshBasicMaterial({
      color: 0x2ecc71,
      transparent: true,
      opacity: 0.3,
      side: THREE.DoubleSide,
    });
    const groundRim = new THREE.Mesh(groundRimGeometry, groundRimMaterial);
    groundRim.rotation.x = -Math.PI / 2;
    groundRim.position.y = 0.001;
    this.scene.add(groundRim);
  }

  private setupParticles(): void {
    const particleCount = 50;
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    this.particleVelocities = new Float32Array(particleCount * 3);
    this.particleLifetimes = new Float32Array(particleCount);

    for (let i = 0; i < particleCount; i++) {
      this.resetParticle(i, positions, colors, true);
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
      size: 0.05,
      vertexColors: true,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending,
    });

    this.particles = new THREE.Points(geometry, material);
    this.scene.add(this.particles);
  }

  private resetParticle(
    index: number,
    positions: Float32Array,
    colors: Float32Array,
    randomLifetime: boolean = false
  ): void {
    const i3 = index * 3;
    const angle = Math.random() * Math.PI * 2;
    const radius = Math.random() * 0.8 + 0.2;

    positions[i3] = Math.cos(angle) * radius;
    positions[i3 + 1] = Math.random() * 0.5;
    positions[i3 + 2] = Math.sin(angle) * radius;

    this.particleVelocities[i3] = (Math.random() - 0.5) * 0.05;
    this.particleVelocities[i3 + 1] = 0.3;
    this.particleVelocities[i3 + 2] = (Math.random() - 0.5) * 0.05;

    colors[i3] = 0.18 + Math.random() * 0.1;
    colors[i3 + 1] = 0.8 + Math.random() * 0.2;
    colors[i3 + 2] = 0.45 + Math.random() * 0.1;

    this.particleLifetimes[index] = randomLifetime ? Math.random() * 2 : 0;
  }

  private updateParticles(deltaTime: number): void {
    const positions = this.particles.geometry.attributes.position.array as Float32Array;
    const colors = this.particles.geometry.attributes.color.array as Float32Array;
    const count = positions.length / 3;

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      this.particleLifetimes[i] += deltaTime;

      if (this.particleLifetimes[i] > 2) {
        this.resetParticle(i, positions, colors);
      } else {
        positions[i3] += this.particleVelocities[i3] * deltaTime;
        positions[i3 + 1] += this.particleVelocities[i3 + 1] * deltaTime;
        positions[i3 + 2] += this.particleVelocities[i3 + 2] * deltaTime;

        const lifeRatio = this.particleLifetimes[i] / 2;
        const color = colors as Float32Array;
        color[i3 + 3] = 0.8 * (1 - lifeRatio * 0.5);
      }
    }

    this.particles.geometry.attributes.position.needsUpdate = true;
    this.particles.geometry.attributes.color.needsUpdate = true;
  }

  private setupPlant(): void {
    this.plant.group.position.set(0, 0, 0);
    this.scene.add(this.plant.group);
  }

  private setupEvents(): void {
    window.addEventListener('resize', () => this.onResize());

    if (this.sowBtn) {
      this.sowBtn.addEventListener('click', () => this.handleSow());
    }

    this.envController.onChange((params, instant) => {
      this.growthAnim.updateParams(params, instant);
    });
  }

  private async handleSow(): Promise<void> {
    if (this.isGrowing) {
      this.growthAnim.reset();
      this.isGrowing = false;
      if (this.sowBtn) {
        this.sowBtn.disabled = false;
        this.sowBtn.textContent = '播种';
      }
      return;
    }

    this.isGrowing = true;
    if (this.sowBtn) {
      this.sowBtn.disabled = true;
      this.sowBtn.textContent = '重新播种';
    }

    await this.growthAnim.startGrowth();

    if (this.sowBtn) {
      this.sowBtn.disabled = false;
    }
  }

  private onResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  private hideLoadingScreen(): void {
    setTimeout(() => {
      const loadingScreen = document.getElementById('loading-screen');
      if (loadingScreen) {
        loadingScreen.classList.add('hidden');
      }
    }, 500);
  }

  private animate = (): void => {
    requestAnimationFrame(this.animate);

    const deltaTime = Math.min(this.clock.getDelta(), 0.05);
    const elapsed = this.clock.elapsedTime;

    this.camera.position.x = Math.sin(elapsed * 0.1) * 0.3;
    this.camera.lookAt(0, 1.5, 0);

    this.envController.update(deltaTime);
    this.growthAnim.update(deltaTime);
    this.updateParticles(deltaTime);

    this.renderer.render(this.scene, this.camera);
  };
}

new App();
