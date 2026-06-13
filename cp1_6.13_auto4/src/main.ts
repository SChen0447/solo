import * as THREE from 'three';
import { CSS2DRenderer } from 'three/addons/renderers/CSS2DRenderer.js';
import { StarNode } from './StarNode';
import { ConstellationLine } from './ConstellationLine';
import { ToolPanel } from './ToolPanel';
import { InteractionManager } from './interaction';

class ConstellationApp {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private labelRenderer: CSS2DRenderer;
  private clock: THREE.Clock;
  private stars: StarNode[] = [];
  private constellationLine: ConstellationLine;
  private toolPanel: ToolPanel;
  private interactionManager: InteractionManager;
  private container: HTMLElement;
  private toolPanelContainer: HTMLElement;
  private backgroundStars: THREE.Points | null = null;
  private animationId: number | null = null;
  private frameCount: number = 0;
  private fpsUpdateTime: number = 0;
  private currentFps: number = 0;

  constructor() {
    this.clock = new THREE.Clock();
    this.container = document.getElementById('canvas-container')!;
    this.toolPanelContainer = document.getElementById('tool-panel-container')!;

    this.scene = new THREE.Scene();
    this.scene.background = null;

    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.camera.position.z = 50;

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance'
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setClearColor(0x000000, 0);
    this.container.appendChild(this.renderer.domElement);

    this.labelRenderer = new CSS2DRenderer();
    this.labelRenderer.setSize(window.innerWidth, window.innerHeight);
    this.labelRenderer.domElement.style.position = 'absolute';
    this.labelRenderer.domElement.style.top = '0';
    this.labelRenderer.domElement.style.left = '0';
    this.labelRenderer.domElement.style.pointerEvents = 'none';

    this.constellationLine = new ConstellationLine();

    this.toolPanel = new ToolPanel({});

    this.interactionManager = new InteractionManager({
      scene: this.scene,
      camera: this.camera,
      canvas: this.renderer.domElement,
      constellationLine: this.constellationLine,
      toolPanel: this.toolPanel
    });

    this.setupScene();
    this.setupHamburgerMenu();
    this.setupResizeHandler();
    this.hideLoading();
    this.startAnimationLoop();
  }

  private setupScene(): void {
    this.createBackgroundStars();
    this.createStarNodes();
    this.scene.add(this.constellationLine.mesh);
    this.scene.add(this.constellationLine.glowMesh);

    this.container.appendChild(this.labelRenderer.domElement);
    this.toolPanelContainer.appendChild(this.toolPanel.panelElement);

    this.interactionManager.setStars(this.stars);
  }

  private createBackgroundStars(): void {
    const geometry = new THREE.BufferGeometry();
    const count = 500;
    const positions = new Float32Array(count * 3);
    const sizes = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 200;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 200;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 100 - 50;
      sizes[i] = Math.random() * 0.5 + 0.2;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    const material = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.3,
      transparent: true,
      opacity: 0.4,
      sizeAttenuation: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    this.backgroundStars = new THREE.Points(geometry, material);
    this.scene.add(this.backgroundStars);
  }

  private createStarNodes(): void {
    const count = 50;
    const padding = 8;

    for (let i = 0; i < count; i++) {
      let position: THREE.Vector3;
      let attempts = 0;

      do {
        position = new THREE.Vector3(
          (Math.random() - 0.5) * (80 - padding * 2),
          (Math.random() - 0.5) * (60 - padding * 2),
          (Math.random() - 0.5) * 20
        );
        attempts++;
      } while (this.isOverlapping(position) && attempts < 50);

      const size = Math.random() * 1 + 0.8;
      const star = new StarNode(position, size);

      this.stars.push(star);
      this.scene.add(star.mesh);
      this.scene.add(star.glowMesh);
    }
  }

  private isOverlapping(position: THREE.Vector3): boolean {
    const minDistance = 5;
    for (const star of this.stars) {
      if (position.distanceTo(star.position) < minDistance) {
        return true;
      }
    }
    return false;
  }

  private setupHamburgerMenu(): void {
    const hamburgerBtn = document.getElementById('hamburger-btn');
    const toolPanelContainer = document.getElementById('tool-panel-container');

    if (hamburgerBtn && toolPanelContainer) {
      hamburgerBtn.addEventListener('click', () => {
        hamburgerBtn.classList.toggle('active');
        toolPanelContainer.classList.toggle('open');
      });
    }
  }

  private setupResizeHandler(): void {
    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();

      this.renderer.setSize(window.innerWidth, window.innerHeight);
      this.labelRenderer.setSize(window.innerWidth, window.innerHeight);
    });
  }

  private hideLoading(): void {
    const loading = document.getElementById('loading');
    if (loading) {
      setTimeout(() => {
        loading.classList.add('hidden');
        setTimeout(() => {
          loading.style.display = 'none';
        }, 500);
      }, 500);
    }
  }

  private startAnimationLoop(): void {
    const animate = () => {
      this.animationId = requestAnimationFrame(animate);

      const deltaTime = Math.min(this.clock.getDelta(), 0.1);

      this.updateFPS(deltaTime);
      this.update(deltaTime);
      this.render();
    };

    animate();
  }

  private updateFPS(deltaTime: number): void {
    this.frameCount++;
    this.fpsUpdateTime += deltaTime;

    if (this.fpsUpdateTime >= 1) {
      this.currentFps = Math.round(this.frameCount / this.fpsUpdateTime);
      this.frameCount = 0;
      this.fpsUpdateTime = 0;

      if (this.currentFps < 30) {
        console.warn(`FPS dropped below 30: ${this.currentFps}`);
      }
    }
  }

  private update(deltaTime: number): void {
    for (const star of this.stars) {
      star.update(deltaTime);
    }

    this.constellationLine.update(deltaTime);
    this.interactionManager.update(deltaTime);

    if (this.backgroundStars) {
      this.backgroundStars.rotation.y += deltaTime * 0.005;
    }
  }

  private render(): void {
    this.renderer.render(this.scene, this.camera);
    this.labelRenderer.render(this.scene, this.camera);
  }

  public dispose(): void {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }

    for (const star of this.stars) {
      this.scene.remove(star.mesh);
      this.scene.remove(star.glowMesh);
      star.dispose();
    }

    this.scene.remove(this.constellationLine.mesh);
    this.scene.remove(this.constellationLine.glowMesh);
    this.constellationLine.dispose();

    if (this.backgroundStars) {
      this.scene.remove(this.backgroundStars);
      this.backgroundStars.geometry.dispose();
      (this.backgroundStars.material as THREE.Material).dispose();
    }

    this.interactionManager.dispose();
    this.renderer.dispose();
  }
}

let app: ConstellationApp | null = null;

window.addEventListener('DOMContentLoaded', () => {
  app = new ConstellationApp();
});

window.addEventListener('beforeunload', () => {
  if (app) {
    app.dispose();
  }
});

export { ConstellationApp };
