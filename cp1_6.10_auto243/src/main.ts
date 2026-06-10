import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { Prism } from './prism';
import { LightSystem, LightConfig } from './lightBeam';
import { InteractionManager } from './interaction';

class App {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;
  private prisms: Prism[] = [];
  private lightSystem: LightSystem;
  private interaction: InteractionManager;
  private isDarkBg: boolean = true;
  private darkBg: number = 0x0a0a1a;
  private lightBg: number = 0xf0f0f0;
  private dirty: boolean = true;
  private debounceTimer: number | null = null;

  constructor() {
    const appDiv = document.getElementById('app');
    if (!appDiv) throw new Error('#app container not found');

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(this.darkBg);

    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.camera.position.set(0, 2, 8);
    this.camera.lookAt(0, 0, 0);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;
    appDiv.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.minDistance = 3;
    this.controls.maxDistance = 20;
    this.controls.target.set(0, 0, 0);

    this.addLights();
    this.createPrisms();

    const initialConfig: LightConfig = {
      intensity: 1.0,
      refractionIndex: 1.5,
      maxBeams: 4
    };

    this.lightSystem = new LightSystem(
      this.scene,
      new THREE.Vector3(0, 4, 0),
      initialConfig
    );
    this.lightSystem.setPrisms(this.prisms);

    this.interaction = new InteractionManager(this.camera, this.renderer, {
      onPrismRotated: () => this.scheduleRecompute()
    });
    this.interaction.setPrisms(this.prisms);

    this.bindKeyboard();
    this.bindUI();
    this.bindResize();

    this.recomputeLight();
    this.animate();
  }

  private addLights(): void {
    const ambient = new THREE.AmbientLight(0xffffff, 0.6);
    this.scene.add(ambient);

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(5, 10, 7);
    this.scene.add(dirLight);

    const pointLight = new THREE.PointLight(0xffffff, 0.5, 50);
    pointLight.position.set(0, 4, 0);
    this.scene.add(pointLight);
  }

  private createPrisms(): void {
    const p1 = new Prism(
      'triangle',
      new THREE.Vector3(0, 2, 0),
      '#ff6b6b',
      1.2,
      0.8
    );

    const p2 = new Prism(
      'quad',
      new THREE.Vector3(-2.5, 0, 0.5),
      '#48dbfb',
      1.0,
      0.8
    );

    const p3 = new Prism(
      'hexagon',
      new THREE.Vector3(2.5, -0.5, -0.5),
      '#feca57',
      1.1,
      0.8
    );

    this.prisms = [p1, p2, p3];
    this.prisms.forEach((p) => p.addToScene(this.scene));
  }

  private scheduleRecompute(): void {
    this.dirty = true;
    if (this.debounceTimer !== null) {
      window.clearTimeout(this.debounceTimer);
    }
    this.debounceTimer = window.setTimeout(() => {
      if (this.dirty) {
        this.recomputeLight();
      }
    }, 16);
  }

  private recomputeLight(): void {
    this.dirty = false;
    this.prisms.forEach((p) => p.update());
    this.lightSystem.compute();
  }

  private bindKeyboard(): void {
    window.addEventListener('keydown', (e) => {
      if (e.code === 'Space') {
        e.preventDefault();
        this.toggleBackground();
      } else if (e.code === 'KeyR') {
        this.resetPrismRotations();
      }
    });
  }

  private toggleBackground(): void {
    this.isDarkBg = !this.isDarkBg;
    this.scene.background = new THREE.Color(
      this.isDarkBg ? this.darkBg : this.lightBg
    );
  }

  private resetPrismRotations(): void {
    this.prisms.forEach((p) => p.resetRotation());
    this.scheduleRecompute();
  }

  private bindUI(): void {
    const intensitySlider = document.getElementById(
      'intensity'
    ) as HTMLInputElement | null;
    const refractionSlider = document.getElementById(
      'refraction'
    ) as HTMLInputElement | null;
    const beamsSlider = document.getElementById(
      'beams'
    ) as HTMLInputElement | null;

    const intensityVal = document.getElementById('intensity-val');
    const refractionVal = document.getElementById('refraction-val');
    const beamsVal = document.getElementById('beams-val');

    if (intensitySlider && intensityVal) {
      intensitySlider.addEventListener('input', () => {
        const v = parseFloat(intensitySlider.value);
        intensityVal.textContent = v.toFixed(2);
        this.lightSystem.updateConfig({ intensity: v });
        this.scheduleRecompute();
      });
    }

    if (refractionSlider && refractionVal) {
      refractionSlider.addEventListener('input', () => {
        const v = parseFloat(refractionSlider.value);
        refractionVal.textContent = v.toFixed(2);
        this.lightSystem.updateConfig({ refractionIndex: v });
        this.scheduleRecompute();
      });
    }

    if (beamsSlider && beamsVal) {
      beamsSlider.addEventListener('input', () => {
        const v = parseInt(beamsSlider.value, 10);
        beamsVal.textContent = v.toString();
        this.lightSystem.updateConfig({ maxBeams: v });
        this.scheduleRecompute();
      });
    }
  }

  private bindResize(): void {
    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    });
  }

  private animate(): void {
    requestAnimationFrame(() => this.animate());

    this.controls.update();
    this.prisms.forEach((p) => p.update());

    if (this.dirty) {
      this.recomputeLight();
    }

    this.renderer.render(this.scene, this.camera);
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new App();
});
