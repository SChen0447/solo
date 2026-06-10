import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

export class SceneSetup {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  controls: OrbitControls;
  private container: HTMLElement;
  private focusAnimation: { active: boolean; startTime: number; duration: number; startPos: THREE.Vector3; endPos: THREE.Vector3; startTarget: THREE.Vector3; endTarget: THREE.Vector3 } | null = null;

  constructor(container: HTMLElement) {
    this.container = container;

    this.scene = new THREE.Scene();

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    canvas.width = 512;
    canvas.height = 512;
    const gradient = ctx.createRadialGradient(256, 256, 0, 256, 256, 350);
    gradient.addColorStop(0, '#1a1a2e');
    gradient.addColorStop(1, '#0b0b1a');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 512, 512);
    const texture = new THREE.CanvasTexture(canvas);
    this.scene.background = texture;

    this.camera = new THREE.PerspectiveCamera(
      60,
      container.clientWidth / container.clientHeight,
      0.1,
      1000
    );
    this.camera.position.set(0, 0, 15);

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.setClearColor(0x0b0b1a, 1);
    container.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.enablePan = true;
    this.controls.minDistance = 5;
    this.controls.maxDistance = 50;

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    this.scene.add(ambientLight);

    const pointLight1 = new THREE.PointLight(0x3498db, 1, 100);
    pointLight1.position.set(10, 10, 10);
    this.scene.add(pointLight1);

    const pointLight2 = new THREE.PointLight(0xe74c3c, 0.8, 100);
    pointLight2.position.set(-10, -10, -10);
    this.scene.add(pointLight2);

    window.addEventListener('resize', () => this.onResize());
  }

  focusOnNode(position: THREE.Vector3, duration: number = 1500): void {
    const cameraOffset = new THREE.Vector3(0, 2, 5);
    const targetCameraPos = position.clone().add(cameraOffset);
    
    this.focusAnimation = {
      active: true,
      startTime: performance.now(),
      duration,
      startPos: this.camera.position.clone(),
      endPos: targetCameraPos,
      startTarget: this.controls.target.clone(),
      endTarget: position.clone()
    };
  }

  updateFocusAnimation(currentTime: number): void {
    if (!this.focusAnimation || !this.focusAnimation.active) return;

    const { startTime, duration, startPos, endPos, startTarget, endTarget } = this.focusAnimation;
    const elapsed = currentTime - startTime;
    const t = Math.min(elapsed / duration, 1);

    const easeT = t < 0.5
      ? 2 * t * t
      : 1 - Math.pow(-2 * t + 2, 2) / 2;

    this.camera.position.lerpVectors(startPos, endPos, easeT);
    this.controls.target.lerpVectors(startTarget, endTarget, easeT);
    this.controls.update();

    if (t >= 1) {
      this.focusAnimation.active = false;
    }
  }

  onResize(): void {
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }
}
