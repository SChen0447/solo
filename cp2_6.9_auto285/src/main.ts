import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { CoralManager } from './CoralManager';
import { EnvironmentPanel, EnvironmentParams } from './EnvironmentPanel';
import { ParticleSystem } from './ParticleSystem';

class CoralSimulationApp {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;
  private container: HTMLElement;

  private coralManager: CoralManager;
  private environmentPanel: EnvironmentPanel;
  private particleSystem: ParticleSystem;
  private planktonParticles: THREE.Points;

  private currentParams: EnvironmentParams = {
    light: 60,
    flow: 3,
    nutrients: 30
  };

  private clock: THREE.Clock;
  private ambientLight: THREE.AmbientLight;
  private directionalLight: THREE.DirectionalLight;
  private pointLight: THREE.PointLight;

  constructor() {
    this.clock = new THREE.Clock();

    const canvasContainer = document.getElementById('canvas-container');
    const panelAnchor = document.getElementById('control-panel-anchor');

    if (!canvasContainer || !panelAnchor) {
      throw new Error('Required DOM elements not found');
    }

    this.container = canvasContainer;

    this.scene = new THREE.Scene();
    this.setupBackground();

    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.camera.position.set(0, 4, 8);
    this.camera.lookAt(0, 1.5, 0);

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;
    this.container.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.1;
    this.controls.minDistance = 3;
    this.controls.maxDistance = 20;
    this.controls.maxPolarAngle = Math.PI / 2.1;
    this.controls.target.set(0, 1, 0);

    this.setupLights();
    this.createSeabed();
    this.createPlankton();

    this.particleSystem = new ParticleSystem(this.scene);
    this.coralManager = new CoralManager(this.scene, this.particleSystem);

    this.environmentPanel = new EnvironmentPanel(
      panelAnchor,
      (params: EnvironmentParams) => {
        this.currentParams = params;
        this.updateLighting(params.light);
      }
    );

    window.addEventListener('resize', this.onResize.bind(this));

    this.animate();
  }

  private setupBackground(): void {
    const canvas = document.createElement('canvas');
    canvas.width = 2;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;
    const gradient = ctx.createLinearGradient(0, 0, 0, 256);
    gradient.addColorStop(0, '#0D2B45');
    gradient.addColorStop(1, '#0A1A2A');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 2, 256);

    const texture = new THREE.CanvasTexture(canvas);
    this.scene.background = texture;

    this.scene.fog = new THREE.Fog(0x0A1A2A, 8, 25);
  }

  private setupLights(): void {
    this.ambientLight = new THREE.AmbientLight(0x4A6A8A, 0.5);
    this.scene.add(this.ambientLight);

    this.directionalLight = new THREE.DirectionalLight(0xFFF4D6, 0.8);
    this.directionalLight.position.set(5, 10, 5);
    this.scene.add(this.directionalLight);

    this.pointLight = new THREE.PointLight(0x6CB4EE, 0.6, 20);
    this.pointLight.position.set(-3, 5, -3);
    this.scene.add(this.pointLight);
  }

  private updateLighting(lightIntensity: number): void {
    const factor = lightIntensity / 100;
    this.ambientLight.intensity = 0.2 + factor * 0.5;
    this.directionalLight.intensity = 0.3 + factor * 0.9;
    this.pointLight.intensity = 0.2 + factor * 0.6;
  }

  private createSeabed(): void {
    const geometry = new THREE.PlaneGeometry(40, 40, 80, 80);
    const positions = geometry.attributes.position;

    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i);
      const y = positions.getY(i);
      const noise1 = Math.sin(x * 0.3) * Math.cos(y * 0.3) * 0.3;
      const noise2 = Math.sin(x * 0.8 + 1.5) * Math.cos(y * 0.6 + 0.8) * 0.15;
      const noise3 = (Math.random() - 0.5) * 0.05;
      positions.setZ(i, noise1 + noise2 + noise3);
    }

    geometry.computeVertexNormals();

    const material = new THREE.MeshStandardMaterial({
      color: 0xC4A47A,
      roughness: 0.95,
      metalness: 0.0
    });

    const seabed = new THREE.Mesh(geometry, material);
    seabed.rotation.x = -Math.PI / 2;
    seabed.position.y = -0.2;
    this.scene.add(seabed);

    this.addSandParticles();
  }

  private addSandParticles(): void {
    const count = 200;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = 1 + Math.random() * 15;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      const noise = Math.sin(x * 0.3) * Math.cos(z * 0.3) * 0.3
        + Math.sin(x * 0.8 + 1.5) * Math.cos(z * 0.6 + 0.8) * 0.15;

      positions[i * 3] = x;
      positions[i * 3 + 1] = noise - 0.15 + Math.random() * 0.05;
      positions[i * 3 + 2] = z;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const material = new THREE.PointsMaterial({
      color: 0xB8956E,
      size: 0.04,
      transparent: true,
      opacity: 0.7
    });

    const points = new THREE.Points(geometry, material);
    this.scene.add(points);
  }

  private createPlankton(): void {
    const count = 400;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 30;
      positions[i * 3 + 1] = Math.random() * 10;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 30;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const material = new THREE.PointsMaterial({
      color: 0xA8D8FF,
      size: 0.025,
      transparent: true,
      opacity: 0.4,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    this.planktonParticles = new THREE.Points(geometry, material);
    this.scene.add(this.planktonParticles);
  }

  private updatePlankton(time: number, flowSpeed: number): void {
    const positions = this.planktonParticles.geometry.attributes.position as THREE.BufferAttribute;
    const arr = positions.array as Float32Array;
    const flowFactor = flowSpeed * 0.002;

    for (let i = 0; i < positions.count; i++) {
      const idx = i * 3;
      arr[idx] += Math.sin(time * 0.5 + i * 0.1) * flowFactor + flowFactor * 0.3;
      arr[idx + 1] += Math.sin(time * 0.3 + i * 0.05) * 0.001;
      arr[idx + 2] += Math.cos(time * 0.4 + i * 0.08) * flowFactor * 0.5;

      if (arr[idx] > 15) arr[idx] = -15;
      if (arr[idx] < -15) arr[idx] = 15;
      if (arr[idx + 1] > 10) arr[idx + 1] = 0;
      if (arr[idx + 1] < 0) arr[idx + 1] = 10;
      if (arr[idx + 2] > 15) arr[idx + 2] = -15;
      if (arr[idx + 2] < -15) arr[idx + 2] = 15;
    }

    positions.needsUpdate = true;
  }

  private onResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  private animate(): void {
    requestAnimationFrame(this.animate.bind(this));

    const deltaTime = Math.min(this.clock.getDelta(), 0.1);
    const elapsedTime = this.clock.getElapsedTime();

    this.controls.update();
    this.updatePlankton(elapsedTime, this.currentParams.flow);

    this.coralManager.update(
      this.currentParams.light,
      this.currentParams.flow,
      this.currentParams.nutrients,
      deltaTime
    );

    this.renderer.render(this.scene, this.camera);
  }

  dispose(): void {
    window.removeEventListener('resize', this.onResize.bind(this));
    this.coralManager.dispose();
    this.environmentPanel.dispose();
    this.particleSystem.dispose();
    this.controls.dispose();
    this.renderer.dispose();
  }
}

document.addEventListener('DOMContentLoaded', () => {
  try {
    new CoralSimulationApp();
  } catch (error) {
    console.error('Failed to initialize Coral Simulation:', error);
  }
});
