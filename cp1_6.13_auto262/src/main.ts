import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { ParticleButterfly } from './ParticleButterfly';
import { TrailRenderer } from './TrailRenderer';

class App {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;
  private container: HTMLElement;

  private particleButterfly: ParticleButterfly;
  private trailRenderer: TrailRenderer;

  private energyWaveMeshes: { mesh: THREE.Mesh; life: number; maxLife: number }[] = [];

  private clock: THREE.Clock;
  private animationFrameId: number = 0;

  private starField!: THREE.Points;

  constructor(containerId: string) {
    const container = document.getElementById(containerId);
    if (!container) {
      throw new Error(`Container with id "${containerId}" not found`);
    }
    this.container = container;

    this.scene = new THREE.Scene();
    this.scene.background = null;

    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.camera.position.set(0, 15 * Math.sin(THREE.MathUtils.degToRad(15)), 15 * Math.cos(THREE.MathUtils.degToRad(15)));
    this.camera.lookAt(0, 0, 0);

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setClearColor(0x000000, 0);
    this.container.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.minDistance = 3;
    this.controls.maxDistance = 20;
    this.controls.enablePan = false;

    this.clock = new THREE.Clock();

    this.createStarField();

    this.particleButterfly = new ParticleButterfly();
    this.scene.add(this.particleButterfly.points);

    this.trailRenderer = new TrailRenderer(this.particleButterfly.particles);
    this.scene.add(this.trailRenderer.mesh);

    this.setupEventListeners();
  }

  private createStarField(): void {
    const starCount = 1000;
    const positions = new Float32Array(starCount * 3);
    const colors = new Float32Array(starCount * 3);

    for (let i = 0; i < starCount; i++) {
      const i3 = i * 3;
      const radius = 50 + Math.random() * 50;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI;

      positions[i3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      positions[i3 + 2] = radius * Math.cos(phi);

      const brightness = 0.3 + Math.random() * 0.7;
      colors[i3] = brightness * 0.7;
      colors[i3 + 1] = brightness * 0.8;
      colors[i3 + 2] = brightness;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
      size: 0.15,
      vertexColors: true,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    this.starField = new THREE.Points(geometry, material);
    this.scene.add(this.starField);
  }

  private setupEventListeners(): void {
    window.addEventListener('resize', this.onWindowResize.bind(this));
    this.renderer.domElement.addEventListener('click', this.onClick.bind(this));
  }

  private onWindowResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  private onClick(event: MouseEvent): void {
    const mouse = new THREE.Vector2();
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, this.camera);

    const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
    const intersectPoint = new THREE.Vector3();
    raycaster.ray.intersectPlane(plane, intersectPoint);

    if (intersectPoint) {
      this.particleButterfly.triggerEnergyWave(intersectPoint);
      this.createEnergyWaveMesh(intersectPoint);
    }
  }

  private createEnergyWaveMesh(position: THREE.Vector3): void {
    const geometry = new THREE.SphereGeometry(1, 32, 32);
    const material = new THREE.MeshBasicMaterial({
      color: 0x48dbfb,
      transparent: true,
      opacity: 0.5,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.copy(position);
    mesh.scale.set(0.01, 0.01, 0.01);

    this.scene.add(mesh);
    this.energyWaveMeshes.push({
      mesh,
      life: 0,
      maxLife: 1.5
    });
  }

  private updateEnergyWaveMeshes(deltaTime: number): void {
    for (let i = this.energyWaveMeshes.length - 1; i >= 0; i--) {
      const wave = this.energyWaveMeshes[i];
      wave.life += deltaTime;

      const progress = wave.life / wave.maxLife;
      const radius = 10 * (1 - Math.pow(1 - progress, 3));
      wave.mesh.scale.set(radius, radius, radius);

      const material = wave.mesh.material as THREE.MeshBasicMaterial;
      material.opacity = 0.5 * (1 - progress);

      if (wave.life >= wave.maxLife) {
        this.scene.remove(wave.mesh);
        (wave.mesh.geometry as THREE.BufferGeometry).dispose();
        (wave.mesh.material as THREE.Material).dispose();
        this.energyWaveMeshes.splice(i, 1);
      }
    }
  }

  public start(): void {
    this.animate();
  }

  public stop(): void {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
  }

  private animate(): void {
    this.animationFrameId = requestAnimationFrame(this.animate.bind(this));

    const deltaTime = Math.min(this.clock.getDelta(), 0.1);

    this.controls.update();

    this.particleButterfly.update(deltaTime);
    this.trailRenderer.update(deltaTime);
    this.updateEnergyWaveMeshes(deltaTime);

    this.starField.rotation.y += deltaTime * 0.02;

    this.renderer.render(this.scene, this.camera);
  }

  public dispose(): void {
    this.stop();
    this.particleButterfly.dispose();
    this.trailRenderer.dispose();
    
    if (this.starField.geometry) {
      (this.starField.geometry as THREE.BufferGeometry).dispose();
    }
    if (this.starField.material) {
      (this.starField.material as THREE.Material).dispose();
    }

    this.renderer.dispose();
    
    window.removeEventListener('resize', this.onWindowResize.bind(this));
    this.renderer.domElement.removeEventListener('click', this.onClick.bind(this));
  }
}

const app = new App('app');
app.start();
