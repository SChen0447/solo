import * as THREE from 'three';
import * as TWEEN from '@tweenjs/tween.js';
import { SandClock } from './sandClock';
import { DynamicLighting } from './lighting';
import { UI } from './ui';

const MIN_WIDTH = 300;
const MIN_HEIGHT = 169;
const MAX_WIDTH = 1920;
const MAX_HEIGHT = 1080;
const ASPECT_RATIO = 16 / 9;
const LOW_FPS_THRESHOLD = 30;
const REDUCED_PARTICLE_COUNT = 3000;

class HourglassApp {
  private container: HTMLElement;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private sandClock: SandClock;
  private lighting: DynamicLighting;
  private ui: UI;
  private clock: THREE.Clock;
  private isDragging: boolean = false;
  private previousMouseX: number = 0;
  private rotationAccumulator: number = 0;
  private performanceDegraded: boolean = false;
  private chandelierLight: THREE.PointLight;
  private chandelier: THREE.Mesh;
  private stars: THREE.Points;
  private starOpacities: number[] = [];
  private starPeriods: number[] = [];

  constructor(containerId: string) {
    const containerElement = document.getElementById(containerId);
    if (!containerElement) throw new Error(`Container ${containerId} not found`);
    this.container = containerElement;

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(45, ASPECT_RATIO, 0.1, 2000);
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.clock = new THREE.Clock();

    this.setupRenderer();
    this.setupCamera();
    this.setupBackground();
    this.setupDesk();
    this.setupChandelier();
    this.setupStars();

    this.sandClock = new SandClock();
    this.scene.add(this.sandClock.group);

    this.lighting = new DynamicLighting(this.camera, this.renderer.domElement);
    this.scene.add(this.lighting.group);

    this.setupAmbientLight();
    this.setupMouseInteraction();

    this.ui = new UI(this.container, {
      onFlowRateChange: (rate: number) => {
        this.sandClock.flowRate = rate;
      },
      onLightIntensityChange: (intensity: number) => {
        this.lighting.setAllIntensities(intensity);
      },
      onReset: () => {
        this.sandClock.reset();
      }
    });

    window.addEventListener('resize', () => this.handleResize());
    this.handleResize();

    this.animate();
  }

  private setupRenderer(): void {
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.setClearColor(0x0a0a20, 1);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;
    this.container.appendChild(this.renderer.domElement);
  }

  private setupCamera(): void {
    this.camera.position.set(0, 50, 450);
    this.camera.lookAt(0, 0, 0);
  }

  private setupBackground(): void {
    const canvas = document.createElement('canvas');
    canvas.width = 2;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;
    const gradient = ctx.createLinearGradient(0, 0, 0, 256);
    gradient.addColorStop(0, '#000011');
    gradient.addColorStop(1, '#001133');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 2, 256);

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    this.scene.background = texture;
  }

  private setupDesk(): void {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = '#3d2b1f';
    ctx.fillRect(0, 0, 512, 512);

    for (let i = 0; i < 120; i++) {
      const y = Math.random() * 512;
      ctx.strokeStyle = `rgba(${60 + Math.random() * 30}, ${40 + Math.random() * 20}, ${25 + Math.random() * 15}, ${0.3 + Math.random() * 0.4})`;
      ctx.lineWidth = 0.5 + Math.random() * 2;
      ctx.beginPath();
      ctx.moveTo(0, y);
      let x = 0;
      while (x < 512) {
        x += 10 + Math.random() * 20;
        const yOffset = (Math.random() - 0.5) * 4;
        ctx.lineTo(x, y + yOffset);
      }
      ctx.stroke();
    }

    for (let i = 0; i < 30; i++) {
      const y = Math.random() * 512;
      const x = Math.random() * 512;
      const radius = 2 + Math.random() * 8;
      ctx.strokeStyle = `rgba(${50 + Math.random() * 20}, ${30 + Math.random() * 15}, ${20 + Math.random() * 10}, ${0.5 + Math.random() * 0.3})`;
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.ellipse(x, y, radius, radius * 0.3, 0, 0, Math.PI * 2);
      ctx.stroke();
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(2, 2);

    const deskGeo = new THREE.BoxGeometry(600, 20, 400);
    const deskMat = new THREE.MeshPhongMaterial({
      map: texture,
      shininess: 10,
      specular: 0x222222
    });
    const desk = new THREE.Mesh(deskGeo, deskMat);
    desk.position.y = -120;
    desk.receiveShadow = true;
    this.scene.add(desk);
  }

  private setupChandelier(): void {
    const sphereGeo = new THREE.SphereGeometry(30, 32, 32);
    const sphereMat = new THREE.MeshPhongMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.3,
      side: THREE.DoubleSide,
      emissive: 0xffffff,
      emissiveIntensity: 0.1
    });
    this.chandelier = new THREE.Mesh(sphereGeo, sphereMat);
    this.chandelier.position.set(0, 300, -50);
    this.scene.add(this.chandelier);

    this.chandelierLight = new THREE.PointLight(0xffffff, 0.3, 200);
    this.chandelierLight.position.copy(this.chandelier.position);
    this.scene.add(this.chandelierLight);

    const wireMat = new THREE.MeshBasicMaterial({ color: 0x444444 });
    const wireGeo = new THREE.CylinderGeometry(0.5, 0.5, 150, 8);
    const wire = new THREE.Mesh(wireGeo, wireMat);
    wire.position.set(0, 225, -50);
    this.scene.add(wire);
  }

  private setupStars(): void {
    const starCount = 100;
    const positions = new Float32Array(starCount * 3);
    const colors = new Float32Array(starCount * 3);

    for (let i = 0; i < starCount; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI * 0.5;
      const radius = 800 + Math.random() * 400;

      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = radius * Math.cos(phi) + 100;
      positions[i * 3 + 2] = radius * Math.sin(phi) * Math.sin(theta) - 200;

      const brightness = 0.6 + Math.random() * 0.4;
      colors[i * 3] = brightness;
      colors[i * 3 + 1] = brightness;
      colors[i * 3 + 2] = brightness * 1.05;

      this.starOpacities.push(0.2 + Math.random() * 0.8);
      this.starPeriods.push(3000 + Math.random() * 2000);
    }

    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    starGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const starMat = new THREE.PointsMaterial({
      size: 2,
      vertexColors: true,
      transparent: true,
      opacity: 0.8,
      sizeAttenuation: false
    });

    this.stars = new THREE.Points(starGeo, starMat);
    this.scene.add(this.stars);
  }

  private setupAmbientLight(): void {
    const ambient = new THREE.AmbientLight(0x404060, 0.4);
    this.scene.add(ambient);
  }

  private setupMouseInteraction(): void {
    const dom = this.renderer.domElement;

    dom.addEventListener('pointerdown', (e: PointerEvent) => {
      this.isDragging = true;
      this.previousMouseX = e.clientX;
      dom.style.cursor = 'grabbing';
    });

    dom.addEventListener('pointermove', (e: PointerEvent) => {
      if (!this.isDragging) return;
      const deltaX = e.clientX - this.previousMouseX;
      this.rotationAccumulator += deltaX * 0.005;
      this.previousMouseX = e.clientX;
    });

    const stopDrag = () => {
      this.isDragging = false;
      dom.style.cursor = 'default';
    };
    dom.addEventListener('pointerup', stopDrag);
    dom.addEventListener('pointerleave', stopDrag);
  }

  private handleResize(): void {
    let width = window.innerWidth;
    let height = window.innerHeight;

    if (width / height > ASPECT_RATIO) {
      width = height * ASPECT_RATIO;
    } else {
      height = width / ASPECT_RATIO;
    }

    width = Math.min(Math.max(width, MIN_WIDTH), MAX_WIDTH);
    height = Math.min(Math.max(height, MIN_HEIGHT), MAX_HEIGHT);

    this.renderer.setSize(width, height);
    this.camera.aspect = ASPECT_RATIO;
    this.camera.updateProjectionMatrix();
  }

  private updateStars(time: number): void {
    const colorAttr = this.stars.geometry.attributes.color as THREE.BufferAttribute;
    for (let i = 0; i < this.starOpacities.length; i++) {
      const t = (time % this.starPeriods[i]) / this.starPeriods[i];
      const brightness = 0.2 + 0.8 * (0.5 + 0.5 * Math.sin(t * Math.PI * 2));
      colorAttr.array[i * 3] = brightness;
      colorAttr.array[i * 3 + 1] = brightness;
      colorAttr.array[i * 3 + 2] = brightness * 1.05;
    }
    colorAttr.needsUpdate = true;
  }

  private checkPerformance(fps: number): void {
    if (!this.performanceDegraded && fps < LOW_FPS_THRESHOLD) {
      this.performanceDegraded = true;
      this.sandClock.setParticleCount(REDUCED_PARTICLE_COUNT);
      this.lighting.setShadowsEnabled(false);
      this.renderer.shadowMap.enabled = false;
    }
  }

  private animate = (): void => {
    requestAnimationFrame(this.animate);

    const delta = this.clock.getDelta();
    const elapsed = this.clock.getElapsedTime() * 1000;
    const fps = 1 / Math.max(delta, 0.001);

    TWEEN.update();

    if (this.isDragging) {
      this.sandClock.group.rotation.y = this.rotationAccumulator;
    }

    this.chandelier.rotation.y += 0.2 * Math.PI / 180;

    const particleTime = this.sandClock.update(delta);

    this.updateStars(elapsed);
    this.ui.updateTime(delta * (this.sandClock.flowRate / 50));
    this.ui.updatePerformance(fps, particleTime);
    this.checkPerformance(this.ui.getAverageFPS());

    this.renderer.render(this.scene, this.camera);
  };
}

window.addEventListener('DOMContentLoaded', () => {
  new HourglassApp('app');
});
