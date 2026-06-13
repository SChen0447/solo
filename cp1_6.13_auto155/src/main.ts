import * as THREE from 'three';
import { createCave } from './cave';
import { StalactiteSystem } from './stalactites';
import { InteractionManager } from './interaction';
import { ParticleSystem } from './particles';

class CaveScene {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private container: HTMLElement;

  private stalactiteSystem: StalactiteSystem;
  private interactionManager: InteractionManager;
  private particleSystem: ParticleSystem;

  private clock: THREE.Clock;
  private animationId: number = 0;
  private time: number = 0;

  constructor() {
    this.container = document.getElementById('canvas-container')!;
    this.clock = new THREE.Clock();

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      100
    );
    this.camera.position.set(0, 0, 3);

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;
    this.container.appendChild(this.renderer.domElement);

    this.setupLights();

    createCave(this.scene);

    this.stalactiteSystem = new StalactiteSystem(this.scene, 5.5);
    this.stalactiteSystem.generate(60);

    this.particleSystem = new ParticleSystem(this.scene, 5.5);

    this.interactionManager = new InteractionManager(
      this.scene,
      this.camera,
      this.renderer,
      this.stalactiteSystem
    );

    this.setupResize();
    this.fadeHintPanel();
    this.animate();
  }

  private setupLights(): void {
    const ambientLight = new THREE.AmbientLight(0x404060, 0.4);
    this.scene.add(ambientLight);

    const topLight = new THREE.PointLight(0x6666ff, 0.8, 15);
    topLight.position.set(0, 4, 0);
    this.scene.add(topLight);

    const bottomLight = new THREE.PointLight(0xff66ff, 0.6, 12);
    bottomLight.position.set(0, -4, 0);
    this.scene.add(bottomLight);

    const fillLight1 = new THREE.PointLight(0x00ffff, 0.4, 10);
    fillLight1.position.set(3, 0, 0);
    this.scene.add(fillLight1);

    const fillLight2 = new THREE.PointLight(0xff00ff, 0.4, 10);
    fillLight2.position.set(-3, 0, 0);
    this.scene.add(fillLight2);
  }

  private setupResize(): void {
    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
      this.interactionManager.resize();
    });
  }

  private fadeHintPanel(): void {
    setTimeout(() => {
      const hintPanel = document.getElementById('hint-panel');
      if (hintPanel) {
        hintPanel.classList.add('fade-out');
      }
    }, 2000);
  }

  private animate = (): void => {
    this.animationId = requestAnimationFrame(this.animate);

    const delta = this.clock.getDelta();
    this.time += delta;

    this.interactionManager.update(delta);

    const cameraRotation = this.interactionManager.getCameraRotation();

    this.stalactiteSystem.update(this.time, delta);
    this.stalactiteSystem.updateParallax(cameraRotation);

    this.particleSystem.update(this.time, delta, cameraRotation);

    this.renderer.render(this.scene, this.camera);
  };

  public dispose(): void {
    cancelAnimationFrame(this.animationId);
    this.interactionManager.dispose();
    this.renderer.dispose();
  }
}

function init(): void {
  new CaveScene();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

export { CaveScene };
