import * as THREE from 'three';

export class ARController {
  private videoElement: HTMLVideoElement | null = null;
  private videoTexture: THREE.VideoTexture | null = null;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private stream: MediaStream | null = null;

  constructor(scene: THREE.Scene, camera: THREE.PerspectiveCamera, renderer: THREE.WebGLRenderer) {
    this.scene = scene;
    this.camera = camera;
    this.renderer = renderer;
  }

  async initCamera(): Promise<boolean> {
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'environment'
        },
        audio: false
      });

      this.videoElement = document.createElement('video');
      this.videoElement.srcObject = this.stream;
      this.videoElement.setAttribute('playsinline', '');
      this.videoElement.setAttribute('autoplay', '');
      this.videoElement.muted = true;
      await this.videoElement.play();

      this.videoTexture = new THREE.VideoTexture(this.videoElement);
      this.videoTexture.colorSpace = THREE.SRGBColorSpace;
      this.videoTexture.minFilter = THREE.LinearFilter;
      this.videoTexture.magFilter = THREE.LinearFilter;

      this.scene.background = this.videoTexture;

      this.updateCameraAspect();
      window.addEventListener('resize', () => this.updateCameraAspect());

      return true;
    } catch (error) {
      console.error('摄像头初始化失败:', error);
      return false;
    }
  }

  private updateCameraAspect(): void {
    const container = this.renderer.domElement.parentElement;
    if (!container) return;

    const width = container.clientWidth;
    const height = container.clientHeight;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();

    this.renderer.setSize(width, height, false);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  }

  getVideoTexture(): THREE.VideoTexture | null {
    return this.videoTexture;
  }

  getVideoElement(): HTMLVideoElement | null {
    return this.videoElement;
  }

  screenToWorld(screenX: number, screenY: number): THREE.Vector3 {
    const rect = this.renderer.domElement.getBoundingClientRect();
    const x = ((screenX - rect.left) / rect.width) * 2 - 1;
    const y = -((screenY - rect.top) / rect.height) * 2 + 1;

    const vector = new THREE.Vector3(x, y, 0.5);
    vector.unproject(this.camera);

    const direction = vector.sub(this.camera.position).normalize();
    const distance = -this.camera.position.z / direction.z;
    const pos = this.camera.position.clone().add(direction.multiplyScalar(distance));
    pos.z = 0;

    return pos;
  }

  dispose(): void {
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
    }
    if (this.videoTexture) {
      this.videoTexture.dispose();
    }
  }
}
