import { GUI } from 'dat.gui';
import * as THREE from 'three';
import { Atom } from './atom';

export interface ControlParams {
  orbital: string;
  opacity: number;
}

export class ControlPanel {
  private gui: GUI;
  private atom: Atom;
  private camera: THREE.PerspectiveCamera;
  private controls: THREE.OrbitControls;
  private params: ControlParams;
  private quantumLabel: HTMLElement;
  private onOrbitalChangeCallback?: (n: number, l: number, name: string) => void;

  constructor(
    container: HTMLElement,
    atom: Atom,
    camera: THREE.PerspectiveCamera,
    controls: THREE.OrbitControls
  ) {
    this.atom = atom;
    this.camera = camera;
    this.controls = controls;

    this.params = {
      orbital: '1s (n=1, l=0)',
      opacity: 0.8,
    };

    const labelElement = document.getElementById('quantum-label');
    this.quantumLabel = labelElement || document.createElement('div');

    this.gui = new GUI({ autoPlace: false, width: 280 });
    container.appendChild(this.gui.domElement);

    this.initGUI();
    this.setupMobileToggle();
  }

  private initGUI(): void {
    const orbitalFolder = this.gui.addFolder('量子态选择');
    orbitalFolder.open();

    const orbitalOptions: Record<string, [number, number]> = {
      '1s (n=1, l=0)': [1, 0],
      '2s (n=2, l=0)': [2, 0],
      '2p (n=2, l=1)': [2, 1],
      '3s (n=3, l=0)': [3, 0],
      '3p (n=3, l=1)': [3, 1],
      '3d (n=3, l=2)': [3, 2],
    };

    orbitalFolder
      .add(this.params, 'orbital', Object.keys(orbitalOptions))
      .name('轨道类型')
      .onChange((value: string) => {
        const [n, l] = orbitalOptions[value];
        this.atom.update({ n, l, opacity: this.params.opacity });
        this.updateQuantumLabel(n, l, this.atom.getOrbitalName(n, l));
        if (this.onOrbitalChangeCallback) {
          this.onOrbitalChangeCallback(n, l, this.atom.getOrbitalName(n, l));
        }
      });

    const displayFolder = this.gui.addFolder('显示设置');
    displayFolder.open();

    displayFolder
      .add(this.params, 'opacity', 0.1, 1.0, 0.05)
      .name('粒子不透明度')
      .onChange((value: number) => {
        this.atom.updateOpacity(value);
      });

    const viewFolder = this.gui.addFolder('视角控制');
    viewFolder.open();

    const resetCamera = {
      reset: () => {
        this.resetCameraView();
      },
    };

    viewFolder.add(resetCamera, 'reset').name('重置视角');
  }

  private resetCameraView(): void {
    const startPosition = this.camera.position.clone();
    const startTarget = this.controls.target.clone();
    const endPosition = new THREE.Vector3(0, 0, 15);
    const endTarget = new THREE.Vector3(0, 0, 0);
    const duration = 600;
    const startTime = performance.now();

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1.0);
      const eased = 1 - Math.pow(1 - progress, 3);

      this.camera.position.lerpVectors(startPosition, endPosition, eased);
      this.controls.target.lerpVectors(startTarget, endTarget, eased);
      this.controls.update();

      if (progress < 1.0) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }

  private updateQuantumLabel(n: number, l: number, name: string): void {
    const valueElement = this.quantumLabel.querySelector('.label-value');
    if (valueElement) {
      valueElement.textContent = `${name} (n=${n}, l=${l})`;
    }
  }

  public setOnOrbitalChange(callback: (n: number, l: number, name: string) => void): void {
    this.onOrbitalChangeCallback = callback;
  }

  private setupMobileToggle(): void {
    const mobileToggle = document.getElementById('mobile-toggle');
    const guiContainer = document.getElementById('gui-container');

    if (mobileToggle && guiContainer) {
      mobileToggle.addEventListener('click', () => {
        guiContainer.classList.toggle('mobile-open');
      });
    }
  }

  public getParams(): ControlParams {
    return { ...this.params };
  }

  public dispose(): void {
    this.gui.destroy();
  }
}
