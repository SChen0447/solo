import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { CrystalGrowth } from './crystalGrowth';

export interface InteractionHandlers {
  onParamsChange: (params: { temperature?: number; supersaturation?: number; growthRate?: number }) => void;
  onPlayPause: () => boolean;
  onReset: () => void;
  onCrystalObject: (crystal: CrystalGrowth) => void;
}

export class InteractionManager {
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private crystal: CrystalGrowth;
  private controls: OrbitControls;
  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;
  private hoveredObject: THREE.Object3D | null = null;
  private highlightLines: THREE.LineSegments | null = null;
  private tooltip: HTMLElement;
  private handlers: InteractionHandlers;
  private domElements: {
    tempSlider: HTMLInputElement;
    satSlider: HTMLInputElement;
    rateSlider: HTMLInputElement;
    tempValue: HTMLElement;
    satValue: HTMLElement;
    rateValue: HTMLElement;
    playPauseBtn: HTMLButtonElement;
    resetBtn: HTMLButtonElement;
    playIcon: SVGElement;
    pauseIcon: SVGElement;
    controlPanel: HTMLElement;
    togglePanelBtn: HTMLElement;
    phaseText: HTMLElement;
    prismCount: HTMLElement;
    radiusText: HTMLElement;
    tipNormal: HTMLElement;
    tipSize: HTMLElement;
    tipTime: HTMLElement;
  };

  constructor(
    camera: THREE.PerspectiveCamera,
    renderer: THREE.WebGLRenderer,
    crystal: CrystalGrowth,
    handlers: InteractionHandlers
  ) {
    this.camera = camera;
    this.renderer = renderer;
    this.crystal = crystal;
    this.handlers = handlers;

    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.12;
    this.controls.rotateSpeed = 1.0;
    this.controls.minDistance = 1;
    this.controls.maxDistance = 10;
    this.controls.target.set(0, 0, 0);

    this.tooltip = document.getElementById('tooltip')!;

    this.domElements = {
      tempSlider: document.getElementById('temperature') as HTMLInputElement,
      satSlider: document.getElementById('saturation') as HTMLInputElement,
      rateSlider: document.getElementById('growthRate') as HTMLInputElement,
      tempValue: document.getElementById('temp-value')!,
      satValue: document.getElementById('sat-value')!,
      rateValue: document.getElementById('rate-value')!,
      playPauseBtn: document.getElementById('playPauseBtn') as HTMLButtonElement,
      resetBtn: document.getElementById('resetBtn') as HTMLButtonElement,
      playIcon: document.getElementById('playIcon') as unknown as SVGElement,
      pauseIcon: document.getElementById('pauseIcon') as unknown as SVGElement,
      controlPanel: document.getElementById('control-panel')!,
      togglePanelBtn: document.getElementById('toggle-panel')!,
      phaseText: document.getElementById('phase-text')!,
      prismCount: document.getElementById('prism-count')!,
      radiusText: document.getElementById('radius-text')!,
      tipNormal: document.getElementById('tip-normal')!,
      tipSize: document.getElementById('tip-size')!,
      tipTime: document.getElementById('tip-time')!,
    };

    this.setupControls();
    this.setupHover();
  }

  private setupControls() {
    const { tempSlider, satSlider, rateSlider } = this.domElements;

    tempSlider.addEventListener('input', () => {
      const value = parseFloat(tempSlider.value);
      this.domElements.tempValue.textContent = value + '°C';
      this.handlers.onParamsChange({ temperature: value });
    });

    satSlider.addEventListener('input', () => {
      const value = parseFloat(satSlider.value);
      this.domElements.satValue.textContent = value.toFixed(1);
      this.handlers.onParamsChange({ supersaturation: value });
    });

    rateSlider.addEventListener('input', () => {
      const value = parseFloat(rateSlider.value);
      this.domElements.rateValue.textContent = value.toFixed(1);
      this.handlers.onParamsChange({ growthRate: value });
    });

    this.domElements.playPauseBtn.addEventListener('click', () => {
      const isPaused = this.handlers.onPlayPause();
      if (isPaused) {
        this.domElements.playIcon.classList.remove('hidden');
        this.domElements.pauseIcon.classList.add('hidden');
      } else {
        this.domElements.playIcon.classList.add('hidden');
        this.domElements.pauseIcon.classList.remove('hidden');
      }
    });

    this.domElements.resetBtn.addEventListener('click', () => {
      this.handlers.onReset();
      this.domElements.playIcon.classList.remove('hidden');
      this.domElements.pauseIcon.classList.add('hidden');
      tempSlider.value = '25';
      satSlider.value = '2.0';
      rateSlider.value = '1.0';
      this.domElements.tempValue.textContent = '25°C';
      this.domElements.satValue.textContent = '2.0';
      this.domElements.rateValue.textContent = '1.0';
    });

    this.domElements.togglePanelBtn.addEventListener('click', () => {
      this.domElements.controlPanel.classList.toggle('collapsed');
    });
  }

  private setupHover() {
    const canvas = this.renderer.domElement;

    canvas.addEventListener('mousemove', (e) => {
      const rect = canvas.getBoundingClientRect();
      this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      this.updateHover(e.clientX, e.clientY);
    });

    canvas.addEventListener('mouseleave', () => {
      this.clearHover();
    });
  }

  private updateHover(clientX: number, clientY: number) {
    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObjects(this.crystal.getInteractiveObjects(), false);

    if (intersects.length > 0) {
      const obj = intersects[0].object;
      if (this.hoveredObject !== obj) {
        this.clearHighlight();
        this.hoveredObject = obj;
        this.createHighlight(obj);
        this.showTooltip(obj, clientX, clientY);
      } else {
        this.updateTooltipPosition(clientX, clientY);
      }
    } else {
      this.clearHover();
    }
  }

  private createHighlight(obj: THREE.Object3D) {
    let geometry: THREE.BufferGeometry;

    if ((obj as THREE.Mesh).geometry) {
      geometry = (obj as THREE.Mesh).geometry;
    } else {
      geometry = new THREE.BoxGeometry(1, 1, 1);
    }

    const edges = new THREE.EdgesGeometry(geometry);
    const material = new THREE.LineBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.5,
    });
    this.highlightLines = new THREE.LineSegments(edges, material);
    this.highlightLines.scale.copy(obj.scale);
    this.highlightLines.position.copy(obj.position);

    const scaleMultiplier = 1.05;
    this.highlightLines.scale.multiplyScalar(scaleMultiplier);

    this.crystal.scene.add(this.highlightLines);
  }

  private clearHighlight() {
    if (this.highlightLines) {
      this.crystal.scene.remove(this.highlightLines);
      this.highlightLines.geometry.dispose();
      (this.highlightLines.material as THREE.Material).dispose();
      this.highlightLines = null;
    }
  }

  private showTooltip(obj: THREE.Object3D, clientX: number, clientY: number) {
    const userData = (obj as THREE.Mesh).userData;
    this.domElements.tipNormal.textContent = userData.direction || userData.normal || 'N/A';
    this.domElements.tipSize.textContent = userData.size || 'N/A';
    this.domElements.tipTime.textContent = userData.time || 'N/A';

    this.tooltip.classList.remove('hidden');
    this.updateTooltipPosition(clientX, clientY);
  }

  private updateTooltipPosition(clientX: number, clientY: number) {
    const padding = 15;
    let x = clientX + padding;
    let y = clientY + padding;

    const tooltipRect = this.tooltip.getBoundingClientRect();
    if (x + tooltipRect.width > window.innerWidth) {
      x = clientX - tooltipRect.width - padding;
    }
    if (y + tooltipRect.height > window.innerHeight) {
      y = clientY - tooltipRect.height - padding;
    }

    this.tooltip.style.left = x + 'px';
    this.tooltip.style.top = y + 'px';
  }

  private clearHover() {
    this.clearHighlight();
    this.hoveredObject = null;
    this.tooltip.classList.add('hidden');
  }

  public update() {
    this.controls.update();

    this.domElements.phaseText.textContent = this.crystal.getPhaseText();
    this.domElements.prismCount.textContent = this.crystal.getPrismCount().toString();
    this.domElements.radiusText.textContent = this.crystal.nucleusRadius.toFixed(2);

    if (this.highlightLines && this.hoveredObject) {
      this.highlightLines.position.copy(this.hoveredObject.position);
      this.highlightLines.scale.copy(this.hoveredObject.scale).multiplyScalar(1.05);
    }
  }

  public dispose() {
    this.controls.dispose();
    this.clearHighlight();
  }
}
