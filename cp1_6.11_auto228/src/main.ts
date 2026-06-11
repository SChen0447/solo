import * as THREE from 'three';
import gsap from 'gsap';
import { AuroraSystem, type AuroraParams } from './aurora';
import { ControlPanel, type ControlState } from './controls';
import { Recorder } from './recorder';

class AuroraApp {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private auroraSystem: AuroraSystem;
  private controlPanel: ControlPanel;
  private recorder: Recorder;
  private clock: THREE.Clock;
  private isPaused = false;
  private params: ControlState = {
    geomagneticIntensity: 1.0,
    solarWindSpeed: 3.0,
    observationTilt: 15,
    isPaused: false,
    playbackSpeed: 1.0
  };

  constructor() {
    this.scene = new THREE.Scene();
    this.scene.background = null;
    this.scene.fog = new THREE.FogExp2(0x0a0e1a, 0.002);

    this.camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      2000
    );
    this.camera.position.set(0, 0, 100);
    this.camera.rotation.x = THREE.MathUtils.degToRad(this.params.observationTilt);

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance'
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setClearColor(0x000000, 0);

    const app = document.getElementById('app');
    if (app) {
      app.appendChild(this.renderer.domElement);
    }

    this.auroraSystem = new AuroraSystem(this.scene);
    this.recorder = new Recorder(this.auroraSystem);
    this.clock = new THREE.Clock();

    this.controlPanel = new ControlPanel(
      document.body,
      this.params,
      {
        onParamsChange: (state) => this.handleParamsChange(state),
        onTogglePause: (paused) => this.handleTogglePause(paused)
      },
      this.recorder
    );

    this.setupEventListeners();
    this.animateIn();
    this.animate();
  }

  private setupEventListeners(): void {
    window.addEventListener('resize', () => this.handleResize());

    const canvas = this.renderer.domElement;
    canvas.style.transition = 'transform 0.1s ease';

    canvas.addEventListener('pointerdown', () => {
      canvas.style.transform = 'scale(0.995)';
    });

    canvas.addEventListener('pointerup', () => {
      canvas.style.transform = 'scale(1)';
    });

    canvas.addEventListener('pointerleave', () => {
      canvas.style.transform = 'scale(1)';
    });
  }

  private handleResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  private handleParamsChange(state: ControlState): void {
    const oldTilt = this.params.observationTilt;
    this.params = { ...state };

    if (Math.abs(state.observationTilt - oldTilt) > 0.01) {
      gsap.to(this.camera.rotation, {
        x: THREE.MathUtils.degToRad(state.observationTilt),
        duration: 0.5,
        ease: 'power2.out'
      });
    }
  }

  private handleTogglePause(paused: boolean): void {
    this.isPaused = paused;
  }

  private animateIn(): void {
    this.camera.position.z = 150;
    this.camera.rotation.x = THREE.MathUtils.degToRad(-5);

    gsap.to(this.camera.position, {
      z: 100,
      duration: 2,
      ease: 'power3.out'
    });

    gsap.to(this.camera.rotation, {
      x: THREE.MathUtils.degToRad(this.params.observationTilt),
      duration: 2,
      ease: 'power3.out',
      delay: 0.3
    });

    const auroraMat = this.auroraSystem.auroraPoints.material as THREE.ShaderMaterial;
    auroraMat.transparent = true;
    auroraMat.opacity = 0;
    gsap.to(auroraMat, {
      opacity: 1,
      duration: 2.5,
      ease: 'power2.out',
      delay: 0.5
    });
  }

  private animate(): void {
    requestAnimationFrame(() => this.animate());

    const delta = Math.min(this.clock.getDelta(), 0.1);

    const isPlaybackActive = this.recorder.update(delta);

    if (!this.isPaused && !isPlaybackActive) {
      const auroraParams: AuroraParams = {
        geomagneticIntensity: this.params.geomagneticIntensity,
        solarWindSpeed: this.params.solarWindSpeed
      };
      this.auroraSystem.update(delta, auroraParams);
    }

    this.renderer.render(this.scene, this.camera);
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new AuroraApp();
});
