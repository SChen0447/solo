import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { Particle } from './cloudSystem';

export class CloudRenderer {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;
  private particles: THREE.Points;
  private geometry: THREE.BufferGeometry;
  private material: THREE.PointsMaterial;
  private positions: Float32Array;
  private colors: Float32Array;
  private sizes: Float32Array;
  private cloudGroup: THREE.Group;
  private container: HTMLElement;
  private particleTexture: THREE.Texture;

  constructor(containerId: string) {
    this.container = document.getElementById(containerId) as HTMLElement;
    if (!this.container) {
      throw new Error(`Container with id "${containerId}" not found`);
    }

    this.scene = new THREE.Scene();
    this.cloudGroup = new THREE.Group();
    this.scene.add(this.cloudGroup);

    this.camera = new THREE.PerspectiveCamera(
      60,
      this.container.clientWidth / this.container.clientHeight,
      0.1,
      100
    );
    this.camera.position.set(0, 7.5, 18);

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    this.renderer.setClearColor(0x0a0a2e, 1);
    this.container.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.minDistance = 2;
    this.controls.maxDistance = 20;
    this.controls.enablePan = false;
    this.controls.target.set(0, 7.5, 0);

    this.particleTexture = this.createCircleTexture();

    this.positions = new Float32Array(2500 * 3);
    this.colors = new Float32Array(2500 * 3);
    this.sizes = new Float32Array(2500);

    this.geometry = new THREE.BufferGeometry();
    this.geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    this.geometry.setAttribute('color', new THREE.BufferAttribute(this.colors, 3));
    this.geometry.setAttribute('size', new THREE.BufferAttribute(this.sizes, 1));
    this.geometry.setDrawRange(0, 2500);

    this.material = new THREE.PointsMaterial({
      size: 0.5,
      vertexColors: true,
      transparent: true,
      opacity: 1.0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      map: this.particleTexture,
      alphaTest: 0.01
    });

    this.particles = new THREE.Points(this.geometry, this.material);
    this.cloudGroup.add(this.particles);

    this.setupLights();
    this.setupBackground();
    this.setupEventListeners();
  }

  private createCircleTexture(): THREE.Texture {
    const size = 128;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;

    const gradient = ctx.createRadialGradient(
      size / 2, size / 2, 0,
      size / 2, size / 2, size / 2
    );
    gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
    gradient.addColorStop(0.3, 'rgba(255, 255, 255, 0.8)');
    gradient.addColorStop(0.6, 'rgba(255, 255, 255, 0.3)');
    gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
  }

  private setupLights(): void {
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.3);
    this.scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(-10, 15, -5);
    this.scene.add(directionalLight);
  }

  private setupBackground(): void {
    const canvas = document.createElement('canvas');
    canvas.width = 2;
    canvas.height = 512;
    const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;

    const gradient = ctx.createLinearGradient(0, 0, 0, 512);
    gradient.addColorStop(0, '#0a0a2e');
    gradient.addColorStop(1, '#1a1a4e');

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 2, 512);

    const texture = new THREE.CanvasTexture(canvas);
    this.scene.background = texture;
  }

  private setupEventListeners(): void {
    window.addEventListener('resize', () => this.onResize());
  }

  private onResize(): void {
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();

    this.renderer.setSize(width, height);
  }

  public updateParticles(particleData: Particle[]): void {
    for (let i = 0; i < particleData.length; i++) {
      const p = particleData[i];
      const i3 = i * 3;

      this.positions[i3] = p.x + p.driftOffsetX;
      this.positions[i3 + 1] = p.y + p.driftOffsetY;
      this.positions[i3 + 2] = p.z + p.driftOffsetZ;

      this.colors[i3] = p.color.r * p.opacity;
      this.colors[i3 + 1] = p.color.g * p.opacity;
      this.colors[i3 + 2] = p.color.b * p.opacity;

      this.sizes[i] = p.size;
    }

    this.geometry.attributes.position.needsUpdate = true;
    this.geometry.attributes.color.needsUpdate = true;
    (this.geometry.attributes.size as THREE.BufferAttribute).needsUpdate = true;
  }

  public render(deltaTime: number): void {
    this.cloudGroup.rotation.y += (0.5 * Math.PI / 180) * deltaTime;

    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }

  public dispose(): void {
    this.geometry.dispose();
    this.material.dispose();
    this.particleTexture.dispose();
    this.renderer.dispose();
    this.controls.dispose();
    window.removeEventListener('resize', () => this.onResize());
  }
}
