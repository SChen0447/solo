import * as THREE from 'three';
import type { StarData } from '../types/star';
import { StarFieldRenderer } from '../scene/StarFieldRenderer';

export class InteractionController {
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private starField: StarFieldRenderer;
  private stars: StarData[];
  private onHover: (star: StarData | null) => void;
  private onClick: (star: StarData | null) => void;

  private raycaster: THREE.Raycaster;
  private pointer: THREE.Vector2;
  private hoveredStar: StarData | null = null;
  private selectedStar: StarData | null = null;
  private isDragging: boolean = false;
  private pointerDownPos: { x: number; y: number } = { x: 0, y: 0 };
  private pointerDownTime: number = 0;

  private boundOnPointerMove: (e: PointerEvent) => void;
  private boundOnPointerDown: (e: PointerEvent) => void;
  private boundOnPointerUp: (e: PointerEvent) => void;

  constructor(
    camera: THREE.PerspectiveCamera,
    renderer: THREE.WebGLRenderer,
    starField: StarFieldRenderer,
    stars: StarData[],
    onHover: (star: StarData | null) => void,
    onClick: (star: StarData | null) => void
  ) {
    this.camera = camera;
    this.renderer = renderer;
    this.starField = starField;
    this.stars = stars;
    this.onHover = onHover;
    this.onClick = onClick;

    this.raycaster = new THREE.Raycaster();
    this.raycaster.params.Points.threshold = 3.0;
    this.pointer = new THREE.Vector2();

    this.boundOnPointerMove = this.onPointerMove.bind(this);
    this.boundOnPointerDown = this.onPointerDown.bind(this);
    this.boundOnPointerUp = this.onPointerUp.bind(this);

    const canvas = this.renderer.domElement;
    canvas.addEventListener('pointermove', this.boundOnPointerMove);
    canvas.addEventListener('pointerdown', this.boundOnPointerDown);
    canvas.addEventListener('pointerup', this.boundOnPointerUp);
  }

  private updatePointer(event: PointerEvent): void {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  }

  private pickStar(): StarData | null {
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const intersects = this.raycaster.intersectObject(this.starField.points, false);

    if (intersects.length > 0 && intersects[0].index !== undefined) {
      const star = this.starField.getStarByIndex(intersects[0].index);
      return star;
    }
    return null;
  }

  private onPointerMove(event: PointerEvent): void {
    this.updatePointer(event);

    if (this.isDragging) {
      const dx = event.clientX - this.pointerDownPos.x;
      const dy = event.clientY - this.pointerDownPos.y;
      if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
        return;
      }
    }

    const picked = this.pickStar();

    if (picked !== this.hoveredStar) {
      this.hoveredStar = picked;

      if (picked) {
        this.starField.highlightStar(picked.id);
        this.renderer.domElement.style.cursor = 'pointer';
      } else {
        if (this.selectedStar) {
          this.starField.highlightStar(this.selectedStar.id);
        } else {
          this.starField.highlightStar(null);
        }
        this.renderer.domElement.style.cursor = 'grab';
      }

      const displayStar = this.selectedStar || picked;
      this.onHover(displayStar);
    }
  }

  private onPointerDown(event: PointerEvent): void {
    this.isDragging = false;
    this.pointerDownPos = { x: event.clientX, y: event.clientY };
    this.pointerDownTime = performance.now();
    this.updatePointer(event);
  }

  private onPointerUp(event: PointerEvent): void {
    const dx = event.clientX - this.pointerDownPos.x;
    const dy = event.clientY - this.pointerDownPos.y;
    const dt = performance.now() - this.pointerDownTime;

    const wasClick = Math.abs(dx) < 5 && Math.abs(dy) < 5 && dt < 300;

    if (wasClick) {
      this.updatePointer(event);
      const picked = this.pickStar();

      if (picked) {
        if (this.selectedStar && this.selectedStar.id === picked.id) {
          this.selectedStar = null;
          this.starField.selectStar(null);
          this.starField.highlightStar(picked.id);
        } else {
          this.selectedStar = picked;
          this.starField.selectStar(picked.id);
        }
        this.onClick(this.selectedStar);
      } else {
        if (this.selectedStar !== null) {
          this.selectedStar = null;
          this.starField.selectStar(null);
          this.starField.highlightStar(null);
          this.onClick(null);
        }
      }
    }

    this.isDragging = false;
  }

  public update(): void {
    // placeholder - raycasting handled in event handlers
  }

  public dispose(): void {
    const canvas = this.renderer.domElement;
    canvas.removeEventListener('pointermove', this.boundOnPointerMove);
    canvas.removeEventListener('pointerdown', this.boundOnPointerDown);
    canvas.removeEventListener('pointerup', this.boundOnPointerUp);
  }
}
