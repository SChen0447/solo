import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { AuroraSystem } from './auroraSystem';

export class Controls {
  private controls: OrbitControls;
  private auroraSystem: AuroraSystem;
  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;
  private camera: THREE.PerspectiveCamera;

  constructor(
    camera: THREE.PerspectiveCamera,
    renderer: THREE.WebGLRenderer,
    auroraSystem: AuroraSystem
  ) {
    this.camera = camera;
    this.auroraSystem = auroraSystem;
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();

    this.controls = new OrbitControls(camera, renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.minDistance = 5;
    this.controls.maxDistance = 100;
    this.controls.minPolarAngle = THREE.MathUtils.degToRad(30);
    this.controls.maxPolarAngle = THREE.MathUtils.degToRad(120);
    this.controls.target.set(0, 25, 0);
    this.controls.enablePan = false;

    this.setupSliders();
    this.setupClickHandler(renderer);
  }

  private setupSliders(): void {
    const intensitySlider = document.getElementById('intensity-slider') as HTMLInputElement;
    const intensityValue = document.getElementById('intensity-value') as HTMLSpanElement;
    const colorSlider = document.getElementById('color-slider') as HTMLInputElement;
    const colorValue = document.getElementById('color-value') as HTMLSpanElement;
    const densitySlider = document.getElementById('density-slider') as HTMLInputElement;
    const densityValue = document.getElementById('density-value') as HTMLSpanElement;

    if (intensitySlider) {
      intensitySlider.addEventListener('input', () => {
        const val = parseInt(intensitySlider.value);
        intensityValue.textContent = val.toString();
        this.auroraSystem.setIntensity(val);
      });
    }

    if (colorSlider) {
      colorSlider.addEventListener('input', () => {
        const val = parseInt(colorSlider.value);
        colorValue.textContent = val.toString();
        this.auroraSystem.setColorShift(val);
      });
    }

    if (densitySlider) {
      densitySlider.addEventListener('input', () => {
        const val = parseInt(densitySlider.value);
        densityValue.textContent = val.toString();
        this.auroraSystem.setDensity(val);
      });
    }
  }

  private setupClickHandler(renderer: THREE.WebGLRenderer): void {
    renderer.domElement.addEventListener('click', (event: MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      this.raycaster.setFromCamera(this.mouse, this.camera);

      const auroraPoints = this.auroraSystem.getPoints();
      if (auroraPoints) {
        const intersects = this.raycaster.intersectObject(auroraPoints);
        if (intersects.length > 0) {
          const point = intersects[0].point;
          this.auroraSystem.triggerGlowAt(point);
        }
      }
    });
  }

  update(): void {
    this.controls.update();
  }

  dispose(): void {
    this.controls.dispose();
  }
}
