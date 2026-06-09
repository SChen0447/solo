import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { Galaxy } from './Galaxy';
import { createUI, UIControls } from './ui';

export class InteractionControls {
  private orbitControls: OrbitControls;
  private galaxy: Galaxy;

  constructor(camera: THREE.PerspectiveCamera, domElement: HTMLElement, galaxy: Galaxy, controlPanelContainer: HTMLElement) {
    this.galaxy = galaxy;

    this.orbitControls = new OrbitControls(camera, domElement);
    this.orbitControls.enableDamping = true;
    this.orbitControls.dampingFactor = 0.05;
    this.orbitControls.minDistance = 5;
    this.orbitControls.maxDistance = 80;
    this.orbitControls.enablePan = false;

    const uiControls: UIControls = {
      onTwistChange: (value: number) => {
        this.galaxy.setTwist(value);
      },
      onThicknessChange: (value: number) => {
        this.galaxy.setThickness(value);
      },
      onSizeChange: (value: number) => {
        this.galaxy.setParticleSize(value);
      }
    };

    createUI(controlPanelContainer, uiControls, {
      twist: 2,
      thickness: 0.5,
      particleSize: 0.05
    });
  }

  public update(): void {
    this.orbitControls.update();
  }

  public dispose(): void {
    this.orbitControls.dispose();
  }
}
