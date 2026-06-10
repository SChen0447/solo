import * as THREE from 'three';
import { Instrument, MarkerInfo } from './Instrument';
import { AudioEngine } from './AudioEngine';
import { InteractionManager } from './Interaction';

class App {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private container: HTMLElement;

  private instrument: Instrument;
  private audioEngine: AudioEngine;
  private interaction: InteractionManager;

  private tooltip: HTMLElement;
  private tooltipName: HTMLElement;
  private tooltipNote: HTMLElement;
  private rotateBtn: HTMLElement;
  private autoRotateHandle: { cancel: () => void } | null = null;

  private clock: THREE.Clock;

  constructor() {
    this.container = document.getElementById('canvas-container')!;
    this.tooltip = document.getElementById('tooltip')!;
    this.tooltipName = this.tooltip.querySelector('.marker-name')!;
    this.tooltipNote = this.tooltip.querySelector('.marker-note')!;
    this.rotateBtn = document.getElementById('rotate-btn')!;

    this.clock = new THREE.Clock();

    this.scene = this.createScene();
    this.camera = this.createCamera();
    this.renderer = this.createRenderer();
    this.container.appendChild(this.renderer.domElement);

    this.setupLights();

    this.instrument = new Instrument();
    this.scene.add(this.instrument.group);

    this.audioEngine = new AudioEngine();

    this.interaction = new InteractionManager(
      this.camera,
      this.renderer,
      this.instrument,
      this.audioEngine,
      {
        onMarkerHover: this.onMarkerHover.bind(this),
        onMarkerClick: this.onMarkerClick.bind(this)
      }
    );

    this.setupUIListeners();
    this.setupResizeHandler();

    this.animate = this.animate.bind(this);
    this.animate();
  }

  private createScene(): THREE.Scene {
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x2b1b0e);
    scene.fog = new THREE.Fog(0x2b1b0e, 20, 60);
    return scene;
  }

  private createCamera(): THREE.PerspectiveCamera {
    const aspect = this.container.clientWidth / this.container.clientHeight;
    const camera = new THREE.PerspectiveCamera(45, aspect, 0.1, 1000);
    camera.position.set(0, 12, 18);
    camera.lookAt(0, 1, 0);
    return camera;
  }

  private createRenderer(): THREE.WebGLRenderer {
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;
    return renderer;
  }

  private setupLights(): void {
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    this.scene.add(ambientLight);

    const spotLight = new THREE.SpotLight(0xffffff, 0.8, 50, Math.PI / 5, 0.5, 1);
    spotLight.position.set(-10, 15, 10);
    spotLight.target.position.set(0, 1, 0);
    spotLight.castShadow = true;
    spotLight.shadow.mapSize.width = 1024;
    spotLight.shadow.mapSize.height = 1024;
    spotLight.shadow.camera.near = 0.5;
    spotLight.shadow.camera.far = 50;
    this.scene.add(spotLight);
    this.scene.add(spotLight.target);

    const fillLight = new THREE.DirectionalLight(0xffffff, 0.2);
    fillLight.position.set(5, 5, -5);
    this.scene.add(fillLight);
  }

  private setupUIListeners(): void {
    this.rotateBtn.addEventListener('click', () => {
      if (this.autoRotateHandle) {
        this.autoRotateHandle.cancel();
        this.autoRotateHandle = null;
        this.rotateBtn.textContent = '自动旋转';
      } else {
        this.autoRotateHandle = this.interaction.startAutoRotation();
        this.rotateBtn.textContent = '停止旋转';
      }
    });
  }

  private setupResizeHandler(): void {
    window.addEventListener('resize', () => {
      const width = this.container.clientWidth;
      const height = this.container.clientHeight;
      this.camera.aspect = width / height;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(width, height);
      this.interaction.onResize();
    });
  }

  private onMarkerHover(info: MarkerInfo | null, clientX: number, clientY: number): void {
    if (info) {
      this.tooltipName.textContent = info.name;
      this.tooltipNote.textContent = info.note;
      this.tooltip.style.left = `${clientX + 15}px`;
      this.tooltip.style.top = `${clientY + 15}px`;
      this.tooltip.classList.add('visible');
    } else {
      this.tooltip.classList.remove('visible');
    }
  }

  private onMarkerClick(info: MarkerInfo): void {
    console.log(`Clicked: ${info.name} (${info.note})`);
  }

  private animate(): void {
    requestAnimationFrame(this.animate);
    const currentTime = performance.now();
    this.interaction.update();
    this.instrument.updateAnimation(currentTime);
    this.renderer.render(this.scene, this.camera);
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new App();
});
