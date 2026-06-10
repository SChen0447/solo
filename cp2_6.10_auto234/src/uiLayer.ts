import * as THREE from 'three';
import { CSS2DRenderer, CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer.js';
import * as _ from 'lodash';
import { BuildingBlock } from './dataManager';
import { animateAnnotationPanel, animateFadeOutPanel } from './animations';

export interface BuildingLabel {
  id: string;
  css2dObject: CSS2DObject;
  element: HTMLElement;
  building: BuildingBlock;
}

export class UILayer {
  private labelRenderer: CSS2DRenderer;
  private container: HTMLElement;
  private labels: Map<string, BuildingLabel> = new Map();
  private activePanel: HTMLElement | null = null;
  private labelUpdateThrottle: number = 100;
  private lastLabelUpdate: number = 0;
  private cameraRef: THREE.PerspectiveCamera;

  constructor(container: HTMLElement, camera: THREE.PerspectiveCamera) {
    this.container = container;
    this.cameraRef = camera;

    this.labelRenderer = new CSS2DRenderer();
    this.labelRenderer.setSize(container.clientWidth, container.clientHeight);
    this.labelRenderer.domElement.style.position = 'absolute';
    this.labelRenderer.domElement.style.top = '0';
    this.labelRenderer.domElement.style.left = '0';
    this.labelRenderer.domElement.style.pointerEvents = 'none';
    this.labelRenderer.domElement.style.zIndex = '5';
    container.appendChild(this.labelRenderer.domElement);
  }

  public getRenderer(): CSS2DRenderer {
    return this.labelRenderer;
  }

  public resize(width: number, height: number): void {
    this.labelRenderer.setSize(width, height);
  }

  public updateLabelsForPhase(buildings: BuildingBlock[], scene: THREE.Scene): void {
    this.clearAllLabels(scene);

    _.forEach(buildings, (building) => {
      const label = this.createBuildingLabel(building);
      this.labels.set(building.id, label);
      scene.add(label.css2dObject);
    });
  }

  public clearAllLabels(scene: THREE.Scene): void {
    this.labels.forEach((label) => {
      scene.remove(label.css2dObject);
      label.element.remove();
    });
    this.labels.clear();
  }

  private createBuildingLabel(building: BuildingBlock): BuildingLabel {
    const div = document.createElement('div');
    div.className = 'building-label';
    div.textContent = building.name;
    div.dataset.buildingId = building.id;

    const labelObject = new CSS2DObject(div);
    const labelY = building.position.y + (building.geometry as any).parameters?.height
      ? (building.geometry as any).parameters.height / 2 + 0.8
      : building.position.y + 2;
    labelObject.position.set(building.position.x, labelY, building.position.z);

    div.addEventListener('click', (e) => {
      e.stopPropagation();
      this.showAnnotationPanel(building, div);
    });

    return {
      id: building.id,
      css2dObject: labelObject,
      element: div,
      building
    };
  }

  public showAnnotationPanel(building: BuildingBlock, anchorEl: HTMLElement): void {
    this.closeActivePanel();

    const panel = document.createElement('div');
    panel.className = 'annotation-panel';
    panel.innerHTML = `
      <button class="annotation-close" aria-label="关闭">&times;</button>
      <div class="annotation-title">${_.escape(building.name)}</div>
      <div class="annotation-row">
        <span class="annotation-label">年代：</span>
        <span class="annotation-value">${building.year}年</span>
      </div>
      <div class="annotation-row">
        <span class="annotation-label">材质：</span>
        <span class="annotation-value">${_.escape(building.material)}</span>
      </div>
      <div class="annotation-note">${_.escape(building.note)}</div>
    `;

    document.body.appendChild(panel);
    this.positionPanel(panel, anchorEl);
    this.activePanel = panel;

    const closeBtn = panel.querySelector('.annotation-close') as HTMLElement;
    closeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.closeActivePanel();
    });

    panel.addEventListener('click', (e) => {
      e.stopPropagation();
    });

    animateAnnotationPanel(panel);
  }

  private positionPanel(panel: HTMLElement, anchorEl: HTMLElement): void {
    const rect = anchorEl.getBoundingClientRect();
    const panelWidth = window.innerWidth < 768 ? 200 : 240;

    let left = rect.right + 12;
    let top = rect.top;

    if (left + panelWidth > window.innerWidth - 20) {
      left = rect.left - panelWidth - 12;
    }
    if (top + 200 > window.innerHeight - 20) {
      top = window.innerHeight - 220;
    }
    if (top < 20) {
      top = 20;
    }

    panel.style.left = `${left}px`;
    panel.style.top = `${top}px`;
  }

  public closeActivePanel(): void {
    if (this.activePanel) {
      const panel = this.activePanel;
      this.activePanel = null;
      animateFadeOutPanel(panel, () => {
        panel.remove();
      });
    }
  }

  public updateLabelScale(cameraDistance: number): void {
    const now = performance.now();
    if (now - this.lastLabelUpdate < this.labelUpdateThrottle) {
      return;
    }
    this.lastLabelUpdate = now;

    const minScale = 0.6;
    const maxScale = 1.2;
    const minDistance = 5;
    const maxDistance = 40;

    const t = _.clamp((cameraDistance - minDistance) / (maxDistance - minDistance), 0, 1);
    const scale = maxScale - t * (maxScale - minScale);

    this.labels.forEach((label) => {
      label.element.style.transform = `scale(${scale})`;
      label.element.style.transformOrigin = 'center bottom';
    });
  }

  public render(scene: THREE.Scene, camera: THREE.Camera): void {
    this.labelRenderer.render(scene, camera);
  }
}
