import * as THREE from 'three';
import { KnowledgeGraph } from './KnowledgeGraph';
import { InteractionManager } from './InteractionManager';
import { UIOverlay } from './UIOverlay';
import { KnowledgeNode } from './data';

class App {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private container: HTMLElement;
  private graph: KnowledgeGraph;
  private interactionManager: InteractionManager;
  private uiOverlay: UIOverlay;
  private clock: THREE.Clock;

  constructor() {
    this.container = document.getElementById('canvas-container') as HTMLElement;
    this.clock = new THREE.Clock();

    this.scene = this.createScene();
    this.camera = this.createCamera();
    this.renderer = this.createRenderer();
    this.container.appendChild(this.renderer.domElement);

    this.addLights();
    this.setBackground();

    this.graph = new KnowledgeGraph(this.scene);

    this.uiOverlay = new UIOverlay();
    this.uiOverlay.setDataAccessors(
      (id: string) => this.graph.getConnectedNodeIds(id),
      (id: string) => this.graph.getNodeDataById(id)
    );

    this.interactionManager = new InteractionManager(this.camera, this.renderer, this.graph, {
      onHover: (node: KnowledgeNode | null, x: number, y: number) => {
        if (node) {
          this.uiOverlay.showTooltip(node, x, y);
        } else {
          this.uiOverlay.hideTooltip();
        }
      },
      onClick: (node: KnowledgeNode | null) => {
        if (node) {
          this.uiOverlay.showInfoPanel(node);
        } else {
          this.uiOverlay.hideInfoPanel();
        }
      }
    });

    this.uiOverlay.setInteractionManager(this.interactionManager);

    window.addEventListener('resize', this.onResize.bind(this));

    this.animate();
  }

  private createScene(): THREE.Scene {
    const scene = new THREE.Scene();
    return scene;
  }

  private createCamera(): THREE.PerspectiveCamera {
    const aspect = window.innerWidth / window.innerHeight;
    const camera = new THREE.PerspectiveCamera(60, aspect, 0.1, 1000);
    return camera;
  }

  private createRenderer(): THREE.WebGLRenderer {
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0x000000, 0);
    return renderer;
  }

  private addLights(): void {
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    this.scene.add(ambientLight);

    const directionalLight1 = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight1.position.set(5, 5, 5);
    this.scene.add(directionalLight1);

    const directionalLight2 = new THREE.DirectionalLight(0x4fc3f7, 0.3);
    directionalLight2.position.set(-5, -3, -5);
    this.scene.add(directionalLight2);
  }

  private setBackground(): void {
    const canvas = document.createElement('canvas');
    canvas.width = 2;
    canvas.height = 256;
    const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
    const gradient = ctx.createLinearGradient(0, 0, 0, 256);
    gradient.addColorStop(0, '#050510');
    gradient.addColorStop(1, '#0a0a1a');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 2, 256);

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    this.scene.background = texture;
  }

  private onResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  private animate(): void {
    requestAnimationFrame(this.animate.bind(this));

    const time = this.clock.getElapsedTime();

    this.graph.update(time);
    this.interactionManager.update();

    this.renderer.render(this.scene, this.camera);
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new App();
});
