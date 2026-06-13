import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { Bridge } from './Bridge';
import { Interaction } from './Interaction';
import { UI } from './UI';

class App {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;
  private bridge: Bridge;
  private interaction: Interaction;
  private ui: UI;
  private container: HTMLElement;
  private clock: THREE.Clock;
  private animationId: number | null = null;

  constructor(container: HTMLElement) {
    this.container = container;
    this.clock = new THREE.Clock();

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x000000);

    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.camera.position.z = 6;

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setClearColor(0x000000, 1);
    this.container.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.enablePan = false;
    this.controls.minDistance = 3;
    this.controls.maxDistance = 15;
    this.controls.autoRotate = false;

    this.bridge = new Bridge();
    this.scene.add(this.bridge.group);

    this.interaction = new Interaction(this.renderer.domElement);

    this.ui = new UI(this.container, this.bridge.totalLines, (show: boolean) => {
      this.bridge.toggleGrid(show);
    });

    this.bindEvents();
    this.animate();
  }

  private bindEvents(): void {
    window.addEventListener('resize', this.onWindowResize.bind(this));
  }

  private onWindowResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  private animate(): void {
    this.animationId = requestAnimationFrame(this.animate.bind(this));

    const deltaTime = this.clock.getDelta();

    this.interaction.update(deltaTime);

    this.bridge.setMousePosition(this.interaction.mouseX, this.interaction.mouseY);

    const pulseEvent = this.interaction.consumePulse();
    if (pulseEvent) {
      this.bridge.triggerPulse(pulseEvent.x, pulseEvent.y);
    }

    const strength = this.interaction.getInteractionStrength();
    this.bridge.update(deltaTime, strength);

    this.controls.update();

    this.renderer.render(this.scene, this.camera);

    this.ui.updateFps();
    this.ui.updateInteractionStrength(strength);
  }

  public dispose(): void {
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
    }
    window.removeEventListener('resize', this.onWindowResize.bind(this));
    this.controls.dispose();
    this.bridge.dispose();
    this.interaction.dispose();
    this.ui.dispose();
    this.renderer.dispose();
  }
}

const container = document.getElementById('canvas-container');
if (container) {
  new App(container);
}
