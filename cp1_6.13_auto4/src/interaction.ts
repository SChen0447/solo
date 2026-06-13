import * as THREE from 'three';
import { CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import { StarNode } from './StarNode';
import { ConstellationLine } from './ConstellationLine';
import { ToolPanel, DoodleShape, THEME_COLORS } from './ToolPanel';

interface InteractionOptions {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  canvas: HTMLCanvasElement;
  constellationLine: ConstellationLine;
  toolPanel: ToolPanel;
}

interface DoodleMarker {
  element: HTMLDivElement;
  cssObject: CSS2DObject;
  star: StarNode;
  shape: DoodleShape;
  color: string;
  scale: number;
  targetScale: number;
}

export class InteractionManager {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private canvas: HTMLCanvasElement;
  private constellationLine: ConstellationLine;
  private toolPanel: ToolPanel;
  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;
  private stars: StarNode[] = [];
  private doodleMarkers: DoodleMarker[] = [];
  private hoveredStar: StarNode | null = null;
  private isDoodleMode: boolean = false;

  constructor(options: InteractionOptions) {
    this.scene = options.scene;
    this.camera = options.camera;
    this.canvas = options.canvas;
    this.constellationLine = options.constellationLine;
    this.toolPanel = options.toolPanel;
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();

    this.setupEventListeners();
  }

  public setStars(stars: StarNode[]): void {
    this.stars = stars;
  }

  private setupEventListeners(): void {
    this.canvas.addEventListener('click', this.onClick.bind(this));
    this.canvas.addEventListener('dblclick', this.onDoubleClick.bind(this));
    this.canvas.addEventListener('contextmenu', this.onContextMenu.bind(this));
    this.canvas.addEventListener('mousemove', this.onMouseMove.bind(this));

    this.canvas.addEventListener('touchstart', this.onTouchStart.bind(this), { passive: false });
    this.canvas.addEventListener('touchmove', this.onTouchMove.bind(this), { passive: false });
  }

  private updateMousePosition(clientX: number, clientY: number): void {
    const rect = this.canvas.getBoundingClientRect();
    this.mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1;
  }

  private getIntersectedStar(): StarNode | null {
    this.raycaster.setFromCamera(this.mouse, this.camera);

    const meshes = this.stars.map(s => s.mesh);
    const intersects = this.raycaster.intersectObjects(meshes);

    if (intersects.length > 0) {
      const starNode = intersects[0].object.userData.starNode as StarNode;
      return starNode;
    }
    return null;
  }

  private onClick(event: MouseEvent): void {
    const startTime = performance.now();
    this.updateMousePosition(event.clientX, event.clientY);
    const star = this.getIntersectedStar();

    if (star) {
      this.toggleStarSelection(star);
    }

    const latency = performance.now() - startTime;
    if (latency > 100) {
      console.warn(`Click response latency: ${latency}ms (exceeds 100ms target)`);
    }
  }

  private onDoubleClick(event: MouseEvent): void {
    const startTime = performance.now();
    this.updateMousePosition(event.clientX, event.clientY);
    const star = this.getIntersectedStar();

    if (star) {
      this.addDoodleMarker(star);
    }

    const latency = performance.now() - startTime;
    if (latency > 100) {
      console.warn(`Double-click response latency: ${latency}ms (exceeds 100ms target)`);
    }
  }

  private lastTouchTime: number = 0;
  private lastTouchedStar: StarNode | null = null;

  private onTouchStart(event: TouchEvent): void {
    event.preventDefault();
    if (event.touches.length === 1) {
      const touch = event.touches[0];
      this.updateMousePosition(touch.clientX, touch.clientY);
      const star = this.getIntersectedStar();
      const now = Date.now();

      if (star) {
        if (now - this.lastTouchTime < 300 && this.lastTouchedStar === star) {
          this.addDoodleMarker(star);
          this.lastTouchTime = 0;
          this.lastTouchedStar = null;
        } else {
          this.toggleStarSelection(star);
          this.lastTouchTime = now;
          this.lastTouchedStar = star;
        }
      }
    }
  }

  private onTouchMove(event: TouchEvent): void {
    event.preventDefault();
    if (event.touches.length === 1) {
      const touch = event.touches[0];
      this.updateMousePosition(touch.clientX, touch.clientY);
      this.updateHoverState();
    }
  }

  private onContextMenu(event: MouseEvent): void {
    event.preventDefault();
    this.clearAll();
  }

  private onMouseMove(event: MouseEvent): void {
    this.updateMousePosition(event.clientX, event.clientY);
    this.updateHoverState();
  }

  private updateHoverState(): void {
    const star = this.getIntersectedStar();

    if (this.hoveredStar && this.hoveredStar !== star) {
      this.hoveredStar.mesh.material.size = this.hoveredStar.currentSize;
      this.hoveredStar = null;
    }

    if (star && star !== this.hoveredStar) {
      this.hoveredStar = star;
      this.canvas.style.cursor = 'pointer';
    } else if (!star) {
      this.canvas.style.cursor = 'default';
    }
  }

  private toggleStarSelection(star: StarNode): void {
    if (star.isSelected) {
      star.toggle();
      this.constellationLine.removeStarNode(star);
    } else {
      if (this.constellationLine.getSelectedCount() >= 15) {
        return;
      }
      star.toggle();
      this.constellationLine.addStarNode(star);
    }
  }

  private addDoodleMarker(star: StarNode): void {
    const existingMarker = this.doodleMarkers.find(m => m.star === star);
    if (existingMarker) {
      this.removeDoodleMarker(existingMarker);
    }

    const shape = this.toolPanel.getSelectedShape();
    const color = this.toolPanel.getSelectedColorHex();

    const marker = this.createDoodleMarker(star, shape, color);
    this.doodleMarkers.push(marker);
    this.scene.add(marker.cssObject);

    setTimeout(() => {
      marker.targetScale = 1;
    }, 16);
  }

  private createDoodleMarker(star: StarNode, shape: DoodleShape, color: string): DoodleMarker {
    const element = document.createElement('div');
    element.style.cssText = `
      width: 40px;
      height: 40px;
      pointer-events: none;
      transform: scale(0);
      transition: transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
      opacity: 0.9;
      filter: drop-shadow(0 0 8px ${color});
    `;

    element.innerHTML = this.getShapeSVG(shape, color);

    const cssObject = new CSS2DObject(element);
    cssObject.position.copy(star.position);
    cssObject.position.z += 0.5;

    return {
      element,
      cssObject,
      star,
      shape,
      color,
      scale: 0,
      targetScale: 0
    };
  }

  private getShapeSVG(shape: DoodleShape, color: string): string {
    switch (shape) {
      case 'circle':
        return `<svg viewBox="0 0 40 40" fill="none" stroke="${color}" stroke-width="2.5">
          <circle cx="20" cy="20" r="16"/>
        </svg>`;
      case 'triangle':
        return `<svg viewBox="0 0 40 40" fill="none" stroke="${color}" stroke-width="2.5">
          <polygon points="20,4 36,34 4,34"/>
        </svg>`;
      case 'star':
        return `<svg viewBox="0 0 40 40" fill="none" stroke="${color}" stroke-width="2.5">
          <polygon points="20,3 25,15 38,16 28,24 32,37 20,30 8,37 12,24 2,16 15,15"/>
        </svg>`;
    }
  }

  private removeDoodleMarker(marker: DoodleMarker): void {
    const index = this.doodleMarkers.indexOf(marker);
    if (index > -1) {
      this.scene.remove(marker.cssObject);
      this.doodleMarkers.splice(index, 1);
    }
  }

  public update(deltaTime: number): void {
    for (let i = this.doodleMarkers.length - 1; i >= 0; i--) {
      const marker = this.doodleMarkers[i];
      marker.scale += (marker.targetScale - marker.scale) * 8 * deltaTime;
      marker.element.style.transform = `scale(${marker.scale})`;
      marker.cssObject.position.copy(marker.star.position);
      marker.cssObject.position.z += 0.5;
    }
  }

  public setDoodleMode(enabled: boolean): void {
    this.isDoodleMode = enabled;
  }

  public clearAll(): void {
    this.constellationLine.clear();

    for (let i = this.doodleMarkers.length - 1; i >= 0; i--) {
      this.scene.remove(this.doodleMarkers[i].cssObject);
    }
    this.doodleMarkers = [];
  }

  public reset(): void {
    this.clearAll();
    this.isDoodleMode = false;
  }

  public dispose(): void {
    this.canvas.removeEventListener('click', this.onClick.bind(this));
    this.canvas.removeEventListener('dblclick', this.onDoubleClick.bind(this));
    this.canvas.removeEventListener('contextmenu', this.onContextMenu.bind(this));
    this.canvas.removeEventListener('mousemove', this.onMouseMove.bind(this));
    this.canvas.removeEventListener('touchstart', this.onTouchStart.bind(this));
    this.canvas.removeEventListener('touchmove', this.onTouchMove.bind(this));
  }
}
