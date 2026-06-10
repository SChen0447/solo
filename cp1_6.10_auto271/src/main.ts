import * as THREE from 'three';
import { FaceModel, createParticleSystem, updateParticles } from './faceModel';
import { UVSimulator, Stage } from './uvSimulator';
import { UIManager } from './ui';

class App {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private faceModel: FaceModel;
  private particles: THREE.Points;
  private simulator: UVSimulator;
  private ui: UIManager;
  private clock: THREE.Clock;
  private isDragging: boolean = false;
  private lastMouseX: number = 0;
  private isPinching: boolean = false;
  private lastPinchDistance: number = 0;
  private touchStartRotation: number = 0;

  constructor() {
    this.clock = new THREE.Clock();
    this.scene = this._createScene();
    this.camera = this._createCamera();
    this.renderer = this._createRenderer();
    this._setupLights();

    this.simulator = new UVSimulator();

    this.faceModel = new FaceModel();
    this.faceModel.setSkinColor(this.simulator.currentSkinType.baseColor);
    this.scene.add(this.faceModel.group);

    this.particles = createParticleSystem();
    this.scene.add(this.particles);

    this.ui = new UIManager(this.simulator, {
      onSkinTypeChange: (id) => this._onSkinTypeChange(id),
      onUVChange: (value) => this._onUVChange(value)
    });

    this._setupInteraction();
    this._setupResize();
    this.simulator.subscribe(() => this._onStateChange());
    this._animate();
  }

  private _createScene(): THREE.Scene {
    const scene = new THREE.Scene();
    return scene;
  }

  private _createCamera(): THREE.PerspectiveCamera {
    const camera = new THREE.PerspectiveCamera(
      45,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    camera.position.set(0, 0, 5);
    camera.lookAt(0, 0, 0);
    return camera;
  }

  private _createRenderer(): THREE.WebGLRenderer {
    const container = document.getElementById('canvas-container')!;
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    container.appendChild(renderer.domElement);
    return renderer;
  }

  private _setupLights(): void {
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    this.scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 10, 7);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 1024;
    directionalLight.shadow.mapSize.height = 1024;
    this.scene.add(directionalLight);

    const fillLight = new THREE.DirectionalLight(0x8888ff, 0.3);
    fillLight.position.set(-5, 3, -5);
    this.scene.add(fillLight);
  }

  private _setupInteraction(): void {
    const canvas = this.renderer.domElement;

    canvas.addEventListener('mousedown', (e) => {
      this.isDragging = true;
      this.lastMouseX = e.clientX;
    });

    window.addEventListener('mousemove', (e) => {
      if (!this.isDragging) return;
      const deltaX = e.clientX - this.lastMouseX;
      this.lastMouseX = e.clientX;
      const currentRotation = this.faceModel.mesh.rotation.y;
      this.faceModel.setRotationY(currentRotation + deltaX * 0.005);
    });

    window.addEventListener('mouseup', () => {
      this.isDragging = false;
    });

    canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      const currentZoom = this.faceModel.getZoom();
      this.faceModel.setZoom(currentZoom + e.deltaY * 0.005);
    }, { passive: false });

    canvas.addEventListener('touchstart', (e) => {
      e.preventDefault();
      if (e.touches.length === 1) {
        this.isDragging = true;
        this.lastMouseX = e.touches[0].clientX;
        this.touchStartRotation = this.faceModel.mesh.rotation.y;
      } else if (e.touches.length === 2) {
        this.isPinching = true;
        this.isDragging = false;
        this.lastPinchDistance = this._getPinchDistance(e.touches);
      }
    }, { passive: false });

    canvas.addEventListener('touchmove', (e) => {
      e.preventDefault();
      if (this.isDragging && e.touches.length === 1) {
        const deltaX = e.touches[0].clientX - this.lastMouseX;
        this.lastMouseX = e.touches[0].clientX;
        this.faceModel.setRotationY(this.faceModel.mesh.rotation.y + deltaX * 0.005);
      } else if (this.isPinching && e.touches.length === 2) {
        const distance = this._getPinchDistance(e.touches);
        const delta = this.lastPinchDistance - distance;
        this.lastPinchDistance = distance;
        this.faceModel.setZoom(this.faceModel.getZoom() + delta * 0.01);
      }
    }, { passive: false });

    canvas.addEventListener('touchend', (e) => {
      if (e.touches.length === 0) {
        this.isDragging = false;
        this.isPinching = false;
      } else if (e.touches.length === 1) {
        this.isPinching = false;
        this.isDragging = true;
        this.lastMouseX = e.touches[0].clientX;
      }
    });
  }

  private _getPinchDistance(touches: TouchList): number {
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }

  private _setupResize(): void {
    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    });
  }

  private _onSkinTypeChange(id: number): void {
    this.simulator.setSkinType(id);
  }

  private _onUVChange(value: number): void {
    this.simulator.setUVIndex(value);
  }

  private _onStateChange(): void {
    const skinType = this.simulator.currentSkinType;
    this.faceModel.setSkinColor(skinType.baseColor);
    this.faceModel.setErythema(this.simulator.getErythemaIntensity());
    this.faceModel.setPigmentation(this.simulator.getPigmentationLevel());

    const stage = this.simulator.getCurrentStage();
    if (stage === Stage.DANGER || stage === Stage.BURN) {
      const peelLevel = stage === Stage.BURN ? 1.0 : 0.5;
      this.faceModel.setPeeling(peelLevel);
    } else {
      this.faceModel.setPeeling(0);
    }

    this.ui.update();
  }

  private _animate = (): void => {
    requestAnimationFrame(this._animate);

    const delta = this.clock.getDelta();

    this.faceModel.update(delta);
    updateParticles(this.particles);

    this.camera.position.z = this.faceModel.getZoom();
    this.camera.lookAt(0, 0, 0);

    this.ui.update();

    this.renderer.render(this.scene, this.camera);
  };
}

window.addEventListener('DOMContentLoaded', () => {
  new App();
});
