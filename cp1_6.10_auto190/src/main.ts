import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { createFossils, type FossilGroup } from './fossilModel';
import { InteractionManager } from './interaction';

class FossilProbeApp {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;
  private container: HTMLElement;
  private fossils: FossilGroup[] = [];
  private interactionManager: InteractionManager | null = null;
  private clock: THREE.Clock;
  private targetCameraDistance: number;

  constructor() {
    this.clock = new THREE.Clock();
    this.targetCameraDistance = 8;

    const container = document.getElementById('canvas-container');
    if (!container) {
      throw new Error('Canvas container not found');
    }
    this.container = container;

    this.scene = this.createScene();
    this.camera = this.createCamera();
    this.renderer = this.createRenderer(container);
    this.controls = this.createControls();
    this.setupLights();
    this.setupEnvironment();
    this.fossils = createFossils(this.scene);

    this.interactionManager = new InteractionManager(
      this.camera,
      this.scene,
      this.fossils,
      this.renderer.domElement
    );

    this.setupWindowResize();
    this.hideLoading();
    this.animate();
  }

  private createScene(): THREE.Scene {
    const scene = new THREE.Scene();
    scene.background = null;
    return scene;
  }

  private createCamera(): THREE.PerspectiveCamera {
    const camera = new THREE.PerspectiveCamera(
      45,
      window.innerWidth / window.innerHeight,
      0.1,
      100
    );
    camera.position.set(0, 2, 8);
    camera.lookAt(0, 0, 0);
    return camera;
  }

  private createRenderer(container: HTMLElement): THREE.WebGLRenderer {
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    renderer.shadowMap.enabled = false;
    container.appendChild(renderer.domElement);
    return renderer;
  }

  private createControls(): OrbitControls {
    const controls = new OrbitControls(this.camera, this.renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.enablePan = false;
    controls.minDistance = 2;
    controls.maxDistance = 15;
    controls.minPolarAngle = 0.2;
    controls.maxPolarAngle = Math.PI / 2 + 0.1;
    controls.rotateSpeed = 0.7;
    controls.zoomSpeed = 0.8;
    return controls;
  }

  private setupLights(): void {
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    this.scene.add(ambientLight);

    const mainLight = new THREE.DirectionalLight(0xfff5e6, 1.0);
    mainLight.position.set(5, 8, 5);
    this.scene.add(mainLight);

    const fillLight = new THREE.DirectionalLight(0x88ccff, 0.3);
    fillLight.position.set(-5, 3, -5);
    this.scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0xd4af37, 0.4);
    rimLight.position.set(0, -3, -8);
    this.scene.add(rimLight);

    const spotLight = new THREE.SpotLight(0xffffff, 0.6, 20, Math.PI / 6, 0.5, 1);
    spotLight.position.set(0, 10, 0);
    spotLight.target.position.set(0, 0, 0);
    this.scene.add(spotLight);
    this.scene.add(spotLight.target);
  }

  private setupEnvironment(): void {
    const groundGeo = new THREE.CircleGeometry(12, 48);
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x1a1423,
      roughness: 0.9,
      metalness: 0.1,
      transparent: true,
      opacity: 0.8
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -1.5;
    this.scene.add(ground);

    const platformPositions = [
      { x: 5, z: 0 },
      { x: -2.5, z: 4.33 },
      { x: -2.5, z: -4.33 }
    ];

    platformPositions.forEach((pos, index) => {
      const platformGeo = new THREE.CylinderGeometry(0.7, 0.8, 0.15, 32);
      const platformMat = new THREE.MeshStandardMaterial({
        color: index % 2 === 0 ? 0x2a2040 : 0x33264a,
        roughness: 0.7,
        metalness: 0.2
      });
      const platform = new THREE.Mesh(platformGeo, platformMat);
      platform.position.set(pos.x, -0.85, pos.z);
      this.scene.add(platform);
    });
  }

  private setupWindowResize(): void {
    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    });
  }

  private hideLoading(): void {
    setTimeout(() => {
      const loadingEl = document.getElementById('loading-container');
      if (loadingEl) {
        loadingEl.classList.add('fade-out');
        setTimeout(() => {
          loadingEl.style.display = 'none';
        }, 500);
      }
    }, 1600);
  }

  private updateFossilAnimations(elapsedTime: number): void {
    this.fossils.forEach(fossil => {
      fossil.group.rotation.y += fossil.angularSpeed;
      const floatOffset = Math.sin(elapsedTime * 0.5 + fossil.floatPhase) * 0.1;
      fossil.group.position.y = fossil.baseY + floatOffset;
    });
  }

  private updateCameraZoom(): void {
    const currentDistance = this.camera.position.length();
    const lerpFactor = 0.08;
    if (Math.abs(currentDistance - this.targetCameraDistance) > 0.01) {
      const direction = new THREE.Vector3()
        .subVectors(this.camera.position, this.controls.target)
        .normalize();
      const newDistance = currentDistance + (this.targetCameraDistance - currentDistance) * lerpFactor;
      this.camera.position.copy(
        this.controls.target.clone().add(direction.multiplyScalar(newDistance))
      );
    }
  }

  private animate = (): void => {
    requestAnimationFrame(this.animate);

    const deltaTime = this.clock.getElapsedTime();
    const delta = this.clock.getDelta();

    this.updateFossilAnimations(deltaTime);
    this.updateCameraZoom();
    this.controls.update();

    if (this.interactionManager) {
      this.interactionManager.update(deltaTime);
    }

    this.renderer.render(this.scene, this.camera);
  };
}

document.addEventListener('DOMContentLoaded', () => {
  new FossilProbeApp();
});
