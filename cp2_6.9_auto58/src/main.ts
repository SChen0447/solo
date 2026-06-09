import * as THREE from 'three';
import { HandTracker, HandLandmark } from './handTracker';
import { HandPointCloud } from './pointCloud';
import { GestureController, GestureState, GestureType } from './gestureController';
import { ParticleEffects } from './particleEffects';

class App {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private container: HTMLElement;
  private clock: THREE.Clock;

  private handTracker: HandTracker | null = null;
  private handPointCloud: HandPointCloud;
  private gestureController: GestureController;
  private particleEffects: ParticleEffects;

  private videoElement: HTMLVideoElement;
  private btnCamera: HTMLButtonElement;
  private btnReset: HTMLButtonElement;
  private statusIndicator: HTMLElement;
  private gestureDisplay: HTMLElement;
  private fpsDisplay: HTMLElement;

  private isTracking: boolean = false;
  private lastLandmarkTime: number = 0;
  private frameCount: number = 0;
  private fpsTime: number = 0;
  private currentLandmarksV3: THREE.Vector3[] = [];
  private currentGesture: GestureType = 'none';

  constructor() {
    this.container = document.getElementById('canvas-container')!;
    this.videoElement = document.getElementById('video-feed') as HTMLVideoElement;
    this.btnCamera = document.getElementById('btn-camera') as HTMLButtonElement;
    this.btnReset = document.getElementById('btn-reset') as HTMLButtonElement;
    this.statusIndicator = document.getElementById('status-indicator') as HTMLElement;
    this.gestureDisplay = document.getElementById('gesture-display') as HTMLElement;
    this.fpsDisplay = document.getElementById('fps-display') as HTMLElement;

    this.clock = new THREE.Clock();

    this.scene = this.createScene();
    this.camera = this.createCamera();
    this.renderer = this.createRenderer();
    this.container.appendChild(this.renderer.domElement);

    this.createGrid();
    this.createStars();

    this.handPointCloud = new HandPointCloud();
    this.scene.add(this.handPointCloud.group);

    this.particleEffects = new ParticleEffects(this.scene);

    this.gestureController = new GestureController((state: GestureState) => {
      this.onGestureChanged(state);
    });

    this.setupEventListeners();
    this.onWindowResize();
    window.addEventListener('resize', () => this.onWindowResize());

    this.animate();
  }

  private createScene(): THREE.Scene {
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0D0D2B);
    scene.fog = new THREE.Fog(0x0D0D2B, 5, 20);
    return scene;
  }

  private createCamera(): THREE.PerspectiveCamera {
    const camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      100
    );
    camera.position.set(0, 0, 5);
    camera.lookAt(0, 0, 0);
    return camera;
  }

  private createRenderer(): THREE.WebGLRenderer {
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0x0D0D2B, 1);
    return renderer;
  }

  private createGrid(): void {
    const gridHelper = new THREE.GridHelper(20, 40, 0x4A90D9, 0x4A90D9);
    gridHelper.material.transparent = true;
    (gridHelper.material as THREE.Material).opacity = 0.2;
    gridHelper.position.y = -1.5;
    this.scene.add(gridHelper);
  }

  private createStars(): void {
    const starGeometry = new THREE.BufferGeometry();
    const starCount = 2000;
    const positions = new Float32Array(starCount * 3);
    const colors = new Float32Array(starCount * 3);

    for (let i = 0; i < starCount; i++) {
      const radius = 10 + Math.random() * 20;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI;
      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = radius * Math.cos(phi);

      const intensity = 0.5 + Math.random() * 0.5;
      colors[i * 3] = intensity * 0.7;
      colors[i * 3 + 1] = intensity * 0.8;
      colors[i * 3 + 2] = intensity;
    }

    starGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    starGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const starMaterial = new THREE.PointsMaterial({
      size: 0.05,
      vertexColors: true,
      transparent: true,
      opacity: 0.8,
      depthWrite: false
    });

    const stars = new THREE.Points(starGeometry, starMaterial);
    this.scene.add(stars);
  }

  private setupEventListeners(): void {
    this.btnCamera.addEventListener('click', () => this.toggleCamera());
    this.btnReset.addEventListener('click', () => this.resetPose());
  }

  private async toggleCamera(): Promise<void> {
    if (this.handTracker && this.handTracker.getIsRunning()) {
      this.handTracker.stop();
      this.handTracker = null;
      this.isTracking = false;
      this.btnCamera.textContent = '开启摄像头';
      this.setTrackingStatus(false);
      this.handPointCloud.reset();
      this.gestureController.resetState();
      this.currentLandmarksV3 = [];
    } else {
      this.btnCamera.disabled = true;
      this.btnCamera.textContent = '启动中...';
      try {
        this.handTracker = new HandTracker(
          this.videoElement,
          (landmarks: HandLandmark[]) => this.onHandLandmarks(landmarks)
        );
        await this.handTracker.start();
        this.isTracking = true;
        this.btnCamera.textContent = '关闭摄像头';
      } catch (err) {
        console.error('摄像头启动失败:', err);
        this.btnCamera.textContent = '开启摄像头';
        alert('无法访问摄像头，请检查权限设置。');
      } finally {
        this.btnCamera.disabled = false;
      }
    }
  }

  private onHandLandmarks(landmarks: HandLandmark[]): void {
    this.lastLandmarkTime = performance.now();
    if (landmarks.length >= 21) {
      this.currentLandmarksV3 = HandTracker.landmarksToVector3(landmarks);
      this.handPointCloud.updateLandmarks(this.currentLandmarksV3);
      this.setTrackingStatus(true);
    } else {
      this.currentLandmarksV3 = [];
      this.handPointCloud.updateLandmarks([]);
      this.setTrackingStatus(false);
    }
  }

  private setTrackingStatus(tracking: boolean): void {
    if (tracking) {
      this.statusIndicator.classList.add('tracking');
    } else {
      this.statusIndicator.classList.remove('tracking');
    }
  }

  private onGestureChanged(state: GestureState): void {
    this.currentGesture = state.gesture;

    const gestureNames: Record<GestureType, string> = {
      'none': '等待手势输入...',
      'open': '✋ 张开手掌',
      'fist': '✊ 握拳',
      'wave': '👋 挥手'
    };
    this.gestureDisplay.textContent = gestureNames[state.gesture];

    if (state.gesture === 'fist') {
      this.handPointCloud.setFistState(true);
    } else {
      this.handPointCloud.setFistState(false);
    }

    if (state.gesture === 'open') {
      const palmPos = this.handPointCloud.getPalmPosition();
      if (palmPos) {
        this.particleEffects.spawnOpenPalmBurst(palmPos);
      }
    }
  }

  private resetPose(): void {
    this.handPointCloud.reset();
    this.gestureController.resetState();
    this.currentLandmarksV3 = [];
    this.currentGesture = 'none';
    this.particleEffects.clearAll();
    this.gestureDisplay.textContent = '等待手势输入...';
  }

  private onWindowResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  private animate = (): void => {
    requestAnimationFrame(this.animate);

    const deltaTime = Math.min(this.clock.getDelta(), 0.1);
    const elapsed = this.clock.getElapsedTime();

    if (this.currentLandmarksV3.length >= 21) {
      this.gestureController.analyze(this.currentLandmarksV3);
      const isFist = this.gestureController.getIsFist(this.currentLandmarksV3);
      this.handPointCloud.setFistState(isFist);
    }

    this.handPointCloud.update(deltaTime);
    this.particleEffects.update(deltaTime);

    this.camera.position.x = Math.sin(elapsed * 0.1) * 0.3;
    this.camera.lookAt(0, 0, 0);

    this.renderer.render(this.scene, this.camera);

    this.frameCount++;
    this.fpsTime += deltaTime;
    if (this.fpsTime >= 0.5) {
      const fps = Math.round(this.frameCount / this.fpsTime);
      this.fpsDisplay.textContent = `FPS: ${fps}`;
      this.frameCount = 0;
      this.fpsTime = 0;
    }
  };
}

window.addEventListener('DOMContentLoaded', () => {
  new App();
});
