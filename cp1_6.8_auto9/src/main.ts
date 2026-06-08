import * as THREE from 'three';
import { createElements, updateElementInstances } from './elementsLoader';
import type { ElementMeshInfo } from './elementsLoader';
import { InteractionManager } from './interaction';
import './style.css';

class PeriodicTableApp {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private instancedMesh!: THREE.InstancedMesh;
  private elementsInfo!: ElementMeshInfo[];
  private interactionManager!: InteractionManager;
  private clock: THREE.Clock;
  private container: HTMLElement;

  constructor() {
    this.container = document.getElementById('canvas-container')!;
    this.clock = new THREE.Clock();

    this.scene = this.createScene();
    this.camera = this.createCamera();
    this.renderer = this.createRenderer();

    this.setupLights();
    this.loadElements();
    this.setupInteraction();
    this.setupResize();

    this.animate();
  }

  private createScene(): THREE.Scene {
    const scene = new THREE.Scene();
    
    const canvas = document.createElement('canvas');
    canvas.width = 2;
    canvas.height = 2;
    const ctx = canvas.getContext('2d')!;
    const gradient = ctx.createLinearGradient(0, 0, 0, 2);
    gradient.addColorStop(0, '#0a0f2e');
    gradient.addColorStop(1, '#1a1f3e');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 2, 2);
    
    const texture = new THREE.CanvasTexture(canvas);
    scene.background = texture;
    
    const fogColor = new THREE.Color(0x0a0f2e);
    scene.fog = new THREE.Fog(fogColor, 15, 25);
    
    return scene;
  }

  private createCamera(): THREE.PerspectiveCamera {
    const isMobile = window.innerWidth < 768;
    const initialDistance = isMobile ? 14 : 18;
    
    const camera = new THREE.PerspectiveCamera(
      45,
      window.innerWidth / window.innerHeight,
      0.1,
      100
    );
    
    camera.position.set(0, 8, initialDistance);
    camera.lookAt(0, 0, -2);
    
    return camera;
  }

  private createRenderer(): THREE.WebGLRenderer {
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
    });
    
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    
    this.container.appendChild(renderer.domElement);
    
    return renderer;
  }

  private setupLights(): void {
    const ambientLight = new THREE.AmbientLight(0x404080, 0.6);
    this.scene.add(ambientLight);

    const mainLight = new THREE.DirectionalLight(0xffffff, 1);
    mainLight.position.set(5, 10, 5);
    mainLight.castShadow = false;
    this.scene.add(mainLight);

    const fillLight = new THREE.DirectionalLight(0x6688ff, 0.4);
    fillLight.position.set(-5, 5, -5);
    this.scene.add(fillLight);

    const rimLight = new THREE.PointLight(0x0088ff, 0.5, 20);
    rimLight.position.set(0, 5, -8);
    this.scene.add(rimLight);
  }

  private loadElements(): void {
    const { instancedMesh, elementsInfo, textGroup } = createElements();
    this.instancedMesh = instancedMesh;
    this.elementsInfo = elementsInfo;
    
    const group = new THREE.Group();
    group.add(instancedMesh);
    group.add(textGroup);
    group.rotation.x = -0.35;
    group.position.y = -1;
    
    this.scene.add(group);
    (this as any).elementsGroup = group;
  }

  private setupInteraction(): void {
    this.interactionManager = new InteractionManager({
      scene: this.scene,
      camera: this.camera,
      renderer: this.renderer,
      instancedMesh: this.instancedMesh,
      elementsInfo: this.elementsInfo,
    });
  }

  private setupResize(): void {
    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    });
  }

  private animate(): void {
    requestAnimationFrame(() => this.animate());

    const deltaTime = Math.min(this.clock.getDelta(), 0.1);

    updateElementInstances(
      this.instancedMesh,
      this.elementsInfo,
      deltaTime,
      6
    );

    this.interactionManager.updateInertia(deltaTime);

    const time = this.clock.elapsedTime;
    const elementsGroup = (this as any).elementsGroup;
    if (elementsGroup) {
      elementsGroup.position.y = Math.sin(time * 0.5) * 0.05;
    }

    this.renderer.render(this.scene, this.camera);
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new PeriodicTableApp();
});
