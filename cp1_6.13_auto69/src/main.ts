import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { clamp, lerp } from 'lodash';
import { Volcano } from './volcano';
import { UIController } from './ui';
import { VolcanoState, EruptionProgress } from './types';

class VolcanoSimulation {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;

  private volcano: Volcano;
  private ui: UIController;

  private clock: THREE.Clock;
  private animationId: number | null = null;

  private autoRotateEnabled: boolean = true;
  private autoRotateSpeed: number = (Math.PI * 2) / 30;

  private targetCameraPosition: THREE.Vector3;
  private targetCameraLookAt: THREE.Vector3;
  private cameraDamping: number = 0.1;

  private isUserInteracting: boolean = false;
  private isSliding: boolean = false;

  private defaultCameraDistance: number = 6;
  private defaultCameraHeight: number = 4;
  private defaultCameraAngle: number = Math.PI / 4;

  private currentProgress: number = 0;

  constructor() {
    this.clock = new THREE.Clock();

    this.scene = this.createScene();
    this.camera = this.createCamera();
    this.renderer = this.createRenderer();
    this.controls = this.createControls();

    this.volcano = new Volcano(this.scene);

    this.targetCameraPosition = new THREE.Vector3();
    this.targetCameraLookAt = new THREE.Vector3(0, 1.75, 0);
    this.updateDefaultCameraPosition();

    this.ui = new UIController({
      onStateChange: this.handleStateChange.bind(this),
      onProgressChange: this.handleProgressChange.bind(this),
      onResetCamera: this.resetCamera.bind(this)
    });

    this.volcano.setProgressCallback(this.handleVolcanoProgress.bind(this));
    this.volcano.setStateChangeCallback(this.handleVolcanoStateChange.bind(this));

    this.bindEvents();

    setTimeout(() => {
      this.ui.hideLoadingScreen();
    }, 1500);

    this.animate();
  }

  private createScene(): THREE.Scene {
    const scene = new THREE.Scene();

    const canvas = document.createElement('canvas');
    canvas.width = 2;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;

    const gradient = ctx.createLinearGradient(0, 0, 0, 512);
    gradient.addColorStop(0, '#ff6b35');
    gradient.addColorStop(0.5, '#8b2500');
    gradient.addColorStop(1, '#2d0a4a');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 2, 512);

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;

    scene.background = texture;

    const ambientLight = new THREE.AmbientLight(0xffeedd, 0.6);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 10, 5);
    scene.add(directionalLight);

    const pointLight = new THREE.PointLight(0xff6600, 0.5, 20);
    pointLight.position.set(0, 3.5, 0);
    scene.add(pointLight);

    return scene;
  }

  private createCamera(): THREE.PerspectiveCamera {
    const camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.updateDefaultCameraPosition();
    camera.position.copy(this.targetCameraPosition);
    camera.lookAt(0, 1.75, 0);
    return camera;
  }

  private updateDefaultCameraPosition(): void {
    const angle = Date.now() * 0.0005;
    this.targetCameraPosition.x = Math.cos(angle) * this.defaultCameraDistance;
    this.targetCameraPosition.y = this.defaultCameraHeight;
    this.targetCameraPosition.z = Math.sin(angle) * this.defaultCameraDistance;
  }

  private createRenderer(): THREE.WebGLRenderer {
    const canvas = document.getElementById('scene-canvas') as HTMLCanvasElement;
    const renderer = new THREE.WebGLRenderer({
      canvas: canvas,
      antialias: true,
      alpha: true
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    return renderer;
  }

  private createControls(): OrbitControls {
    const controls = new OrbitControls(this.camera, this.renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = this.cameraDamping;
    controls.minDistance = 2;
    controls.maxDistance = 20;
    controls.maxPolarAngle = Math.PI / 2.1;
    controls.target.set(0, 1.75, 0);
    controls.enabled = true;
    return controls;
  }

  private bindEvents(): void {
    window.addEventListener('resize', this.handleResize.bind(this));

    this.controls.addEventListener('start', () => {
      this.isUserInteracting = true;
      this.autoRotateEnabled = false;
    });

    this.controls.addEventListener('end', () => {
      setTimeout(() => {
        this.isUserInteracting = false;
      }, 2000);
    });

    document.addEventListener('mousedown', (e) => {
      if (e.target === this.renderer.domElement) {
        this.isUserInteracting = true;
        this.autoRotateEnabled = false;
      }
    });

    document.addEventListener('touchstart', (e) => {
      if (e.target === this.renderer.domElement) {
        this.isUserInteracting = true;
        this.autoRotateEnabled = false;
      }
    });
  }

  private handleStateChange(state: VolcanoState): void {
    this.volcano.setState(state);
  }

  private handleProgressChange(progress: number): void {
    this.isSliding = true;
    this.currentProgress = progress;
    this.volcano.setProgress(progress);

    const targetDistance = progress > 0 && progress < 100 
      ? lerp(6, 4.5, Math.sin(progress / 100 * Math.PI))
      : 6;

    this.defaultCameraDistance = targetDistance;
  }

  private handleVolcanoProgress(progress: EruptionProgress): void {
    this.currentProgress = progress.percentage;
    this.ui.updateSlider(progress);

    if (!this.isUserInteracting) {
      this.autoRotateEnabled = true;
    }
  }

  private handleVolcanoStateChange(state: VolcanoState): void {
    this.ui.setActiveButton(state);
    
    if (state === 'dormant') {
      this.currentProgress = 0;
      this.defaultCameraDistance = 6;
      this.isSliding = false;
    }
  }

  private resetCamera(): void {
    this.defaultCameraDistance = 6;
    this.defaultCameraHeight = 4;
    this.controls.target.set(0, 1.75, 0);
    this.targetCameraLookAt.set(0, 1.75, 0);
    this.autoRotateEnabled = true;
    this.isUserInteracting = false;
    this.updateDefaultCameraPosition();
  }

  private handleResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  private updateCamera(deltaTime: number): void {
    if (this.autoRotateEnabled && !this.isUserInteracting) {
      const angle = this.autoRotateSpeed * deltaTime;
      const rotationMatrix = new THREE.Matrix4().makeRotationY(angle);
      const offset = this.camera.position.clone().sub(this.controls.target);
      offset.applyMatrix4(rotationMatrix);
      this.camera.position.copy(this.controls.target).add(offset);
    }

    if (this.isSliding && !this.isUserInteracting) {
      const targetPos = this.targetCameraPosition.clone();
      if (this.currentProgress > 0 && this.currentProgress < 100) {
        const angle = Math.atan2(this.camera.position.z, this.camera.position.x);
        const distance = this.defaultCameraDistance;
        const height = lerp(4, 5, Math.sin(this.currentProgress / 100 * Math.PI));
        targetPos.x = Math.cos(angle) * distance;
        targetPos.y = height;
        targetPos.z = Math.sin(angle) * distance;
      }

      this.camera.position.lerp(targetPos, this.cameraDamping * 2);
      this.camera.lookAt(this.targetCameraLookAt);
    }

    this.controls.update();
  }

  private animate(): void {
    this.animationId = requestAnimationFrame(this.animate.bind(this));

    const deltaTime = Math.min(this.clock.getDelta(), 0.1);

    this.volcano.update(deltaTime);
    this.updateCamera(deltaTime);

    this.renderer.render(this.scene, this.camera);
  }

  public dispose(): void {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
    this.volcano.dispose();
    this.controls.dispose();
    this.renderer.dispose();
    window.removeEventListener('resize', this.handleResize.bind(this));
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new VolcanoSimulation();
});
