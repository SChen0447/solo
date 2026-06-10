import * as THREE from 'three';
import { DataStream, MouseInteractionParams } from './dataStream';
import { NetworkNodes } from './networkNodes';

const STAR_COUNT = 400;
const CAMERA_MIN_DISTANCE = 5;
const CAMERA_MAX_DISTANCE = 30;
const CAMERA_INITIAL_DISTANCE = 15;

class Application {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private container: HTMLElement;

  private dataStream: DataStream;
  private networkNodes: NetworkNodes;

  private stars!: THREE.Points;
  private starData: { blinkTimer: number; blinkPeriod: number }[] = [];
  private starPositions!: Float32Array;
  private starColors!: Float32Array;

  private cameraDistance: number = CAMERA_INITIAL_DISTANCE;
  private cameraTheta: number = 0;
  private cameraPhi: number = Math.PI / 3;

  private isDragging: boolean = false;
  private lastMouseX: number = 0;
  private lastMouseY: number = 0;
  private rotationVelocity = new THREE.Vector2();
  private rotationAxis = new THREE.Vector3();
  private rotationAngle: number = 0;

  private clock: THREE.Clock;

  private statParticles: HTMLElement;
  private statBreathing: HTMLElement;
  private statDistance: HTMLElement;

  private workingVector = new THREE.Vector3();

  constructor() {
    this.container = document.getElementById('app')!;

    this.statParticles = document.getElementById('stat-particles')!;
    this.statBreathing = document.getElementById('stat-breathing')!;
    this.statDistance = document.getElementById('stat-distance')!;

    this.scene = new THREE.Scene();

    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.updateCameraPosition();

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setClearColor(0x000000, 0);
    this.container.appendChild(this.renderer.domElement);

    this.createStars();

    this.dataStream = new DataStream(this.scene);
    this.networkNodes = new NetworkNodes(this.scene);

    this.clock = new THREE.Clock();

    this.setupEventListeners();
    this.updateUI();

    this.animate();
  }

  private createStars(): void {
    const geometry = new THREE.BufferGeometry();
    const material = new THREE.PointsMaterial({
      size: 1.0,
      color: 0xffffff,
      transparent: true,
      opacity: 0.4,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: false
    });

    this.starPositions = new Float32Array(STAR_COUNT * 3);
    this.starColors = new Float32Array(STAR_COUNT * 3);

    for (let i = 0; i < STAR_COUNT; i++) {
      const radius = 50 + Math.random() * 50;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);

      this.starPositions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      this.starPositions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      this.starPositions[i * 3 + 2] = radius * Math.cos(phi);

      const blinkPeriod = 0.5 + Math.random() * 1.5;
      this.starData.push({
        blinkTimer: Math.random() * blinkPeriod,
        blinkPeriod
      });

      const brightness = 0.2 + Math.random() * 0.25;
      this.starColors[i * 3] = brightness;
      this.starColors[i * 3 + 1] = brightness;
      this.starColors[i * 3 + 2] = brightness;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(this.starPositions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(this.starColors, 3));
    material.vertexColors = true;

    this.stars = new THREE.Points(geometry, material);
    this.scene.add(this.stars);
  }

  private updateCameraPosition(): void {
    this.workingVector.set(
      this.cameraDistance * Math.sin(this.cameraPhi) * Math.cos(this.cameraTheta),
      this.cameraDistance * Math.cos(this.cameraPhi),
      this.cameraDistance * Math.sin(this.cameraPhi) * Math.sin(this.cameraTheta)
    );
    this.camera.position.copy(this.workingVector);
    this.camera.lookAt(0, 0, 0);
  }

  private setupEventListeners(): void {
    const canvas = this.renderer.domElement;

    canvas.addEventListener('mousedown', (e: MouseEvent) => {
      this.isDragging = true;
      this.lastMouseX = e.clientX;
      this.lastMouseY = e.clientY;
      this.rotationVelocity.set(0, 0);
    });

    window.addEventListener('mousemove', (e: MouseEvent) => {
      if (this.isDragging) {
        const deltaX = e.clientX - this.lastMouseX;
        const deltaY = e.clientY - this.lastMouseY;

        this.cameraTheta -= deltaX * 0.005;
        this.cameraPhi = Math.max(
          0.1,
          Math.min(Math.PI - 0.1, this.cameraPhi - deltaY * 0.005)
        );

        this.rotationVelocity.set(deltaX, deltaY);

        const dragDistance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
        this.rotationAngle = Math.min(dragDistance * 0.003, Math.PI / 6);

        this.rotationAxis.set(deltaY, deltaX, 0).normalize();

        this.lastMouseX = e.clientX;
        this.lastMouseY = e.clientY;
      }
    });

    window.addEventListener('mouseup', () => {
      this.isDragging = false;
    });

    canvas.addEventListener('wheel', (e: WheelEvent) => {
      e.preventDefault();
      this.cameraDistance = Math.max(
        CAMERA_MIN_DISTANCE,
        Math.min(CAMERA_MAX_DISTANCE, this.cameraDistance + e.deltaY * 0.01)
      );
    }, { passive: false });

    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    });
  }

  private updateStars(deltaTime: number): void {
    for (let i = 0; i < STAR_COUNT; i++) {
      const star = this.starData[i];
      star.blinkTimer += deltaTime;
      if (star.blinkTimer >= star.blinkPeriod) {
        star.blinkTimer = 0;
        star.blinkPeriod = 0.5 + Math.random() * 1.5;
      }
      const progress = (star.blinkTimer / star.blinkPeriod) * Math.PI * 2;
      const brightness = 0.1 + (Math.sin(progress) + 1) * 0.15;
      this.starColors[i * 3] = brightness;
      this.starColors[i * 3 + 1] = brightness;
      this.starColors[i * 3 + 2] = brightness;
    }
    (this.stars.geometry.attributes.color as THREE.BufferAttribute).needsUpdate = true;
  }

  private updateUI(): void {
    this.statParticles.textContent = this.dataStream.getParticleCount().toString();

    const breathingState = this.dataStream.getBreathingState();
    if (breathingState === 'expanding') {
      this.statBreathing.textContent = '膨胀';
      this.statBreathing.className = 'stat-value breathing-expanding';
    } else {
      this.statBreathing.textContent = '收缩';
      this.statBreathing.className = 'stat-value breathing-contracting';
    }

    this.statDistance.textContent = this.cameraDistance.toFixed(1);
  }

  private animate = (): void => {
    requestAnimationFrame(this.animate);

    const deltaTime = Math.min(this.clock.getDelta(), 0.1);

    this.updateCameraPosition();
    this.updateStars(deltaTime);

    const params: MouseInteractionParams = {
      cameraDistance: this.cameraDistance,
      rotationAngle: this.rotationAngle,
      rotationAxis: this.rotationAxis,
      isDragging: this.isDragging
    };

    this.dataStream.update(deltaTime, params);
    this.networkNodes.update(
      deltaTime,
      this.dataStream.getCurrentRadius(),
      this.dataStream.getMaxRadius(),
      this.dataStream.getMinRadius()
    );

    if (!this.isDragging && this.rotationAngle > 0) {
      this.rotationAngle = Math.max(0, this.rotationAngle - deltaTime * 0.5);
    }

    this.updateUI();

    this.renderer.render(this.scene, this.camera);
  };

  public dispose(): void {
    this.dataStream.dispose();
    this.networkNodes.dispose();
    this.stars.geometry.dispose();
    (this.stars.material as THREE.Material).dispose();
    this.scene.remove(this.stars);
    this.renderer.dispose();
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new Application();
});
