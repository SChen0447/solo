import * as THREE from 'three';
import { ParticleCloud } from './particleCloud';
import { Interaction } from './interaction';

class NebulaApp {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private particleCloud: ParticleCloud;
  private interaction: Interaction;
  private clock: THREE.Clock;

  constructor() {
    this.clock = new THREE.Clock();

    this.scene = new THREE.Scene();

    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      1,
      2000
    );
    this.camera.position.set(0, 100, 300);
    this.camera.lookAt(0, 0, 0);

    this.renderer = new THREE.WebGLRenderer({
      antialias: false,
      alpha: false,
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setClearColor(0x000000, 1);
    document.body.appendChild(this.renderer.domElement);

    this.particleCloud = new ParticleCloud();
    this.scene.add(this.particleCloud.mesh);

    this.interaction = new Interaction(
      this.camera,
      this.renderer,
      this.particleCloud
    );

    window.addEventListener('resize', this.onResize.bind(this));

    this.removeLoadingDot();
    this.animate();
  }

  private removeLoadingDot(): void {
    setTimeout(() => {
      const dot = document.getElementById('loading-dot');
      if (dot) {
        dot.style.display = 'none';
      }
    }, 2200);
  }

  private onResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  private animate(): void {
    requestAnimationFrame(this.animate.bind(this));

    const delta = this.clock.getDelta();
    const cameraDistance = this.camera.position.length();

    this.interaction.update();
    this.particleCloud.update(delta, cameraDistance);

    this.renderer.render(this.scene, this.camera);
  }
}

new NebulaApp();
