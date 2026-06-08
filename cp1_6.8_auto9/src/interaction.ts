import * as THREE from 'three';
import type { ElementMeshInfo } from './elementsLoader';
import { setElementHovered, setElementFiltered } from './elementsLoader';
import { CATEGORY_LABELS, isMetal, isNonmetal } from './elementsData';
import type { ElementData } from './elementsData';

export interface InteractionOptions {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  instancedMesh: THREE.InstancedMesh;
  elementsInfo: ElementMeshInfo[];
}

export type FilterType = 'all' | 'metal' | 'nonmetal';

export class InteractionManager {
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private instancedMesh: THREE.InstancedMesh;
  private elementsInfo: ElementMeshInfo[];
  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;
  private hoveredIndex: number | null = null;
  private tooltipEl: HTMLElement;
  private tooltipCnEl: HTMLElement;
  private tooltipEnEl: HTMLElement;
  private detailModalEl: HTMLElement;

  private isDragging: boolean = false;
  private lastMoveTime: number = 0;
  private velocityX: number = 0;
  private velocityY: number = 0;

  constructor(options: InteractionOptions) {
    this.camera = options.camera;
    this.renderer = options.renderer;
    this.instancedMesh = options.instancedMesh;
    this.elementsInfo = options.elementsInfo;
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();

    this.tooltipEl = document.getElementById('tooltip')!;
    this.tooltipCnEl = this.tooltipEl.querySelector('.tooltip-cn')!;
    this.tooltipEnEl = this.tooltipEl.querySelector('.tooltip-en')!;
    this.detailModalEl = document.getElementById('detail-modal')!;

    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    const canvas = this.renderer.domElement;

    canvas.addEventListener('mousemove', this.onMouseMove.bind(this));
    canvas.addEventListener('mousedown', this.onMouseDown.bind(this));
    canvas.addEventListener('mouseup', this.onMouseUp.bind(this));
    canvas.addEventListener('click', this.onClick.bind(this));
    canvas.addEventListener('wheel', this.onWheel.bind(this));

    canvas.addEventListener('touchstart', this.onTouchStart.bind(this), { passive: false });
    canvas.addEventListener('touchmove', this.onTouchMove.bind(this), { passive: false });
    canvas.addEventListener('touchend', this.onTouchEnd.bind(this));

    const filterButtons = document.querySelectorAll('.filter-btn');
    filterButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        const filter = btn.getAttribute('data-filter') as FilterType;
        this.setFilter(filter);
        filterButtons.forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
      });
    });

    const modalClose = document.querySelector('.modal-close');
    const modalOverlay = document.querySelector('.modal-overlay');
    modalClose?.addEventListener('click', () => this.closeDetailModal());
    modalOverlay?.addEventListener('click', () => this.closeDetailModal());

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.closeDetailModal();
      }
    });
  }

  private onMouseMove(event: MouseEvent): void {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    this.updateTooltipPosition(event.clientX, event.clientY);
    this.checkHover();
  }

  private onMouseDown(event: MouseEvent): void {
    if (event.button !== 0) return;
    this.isDragging = true;
    this.lastMoveTime = performance.now();
    this.velocityX = 0;
    this.velocityY = 0;
  }

  private onMouseUp(): void {
    this.isDragging = false;
  }

  private onClick(event: MouseEvent): void {
    if (this.isDragging) return;

    const rect = this.renderer.domElement.getBoundingClientRect();
    const clickX = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    const clickY = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(new THREE.Vector2(clickX, clickY), this.camera);
    const intersects = this.raycaster.intersectObject(this.instancedMesh);

    if (intersects.length > 0 && intersects[0].instanceId !== undefined) {
      const instanceId = intersects[0].instanceId;
      const element = this.elementsInfo[instanceId].element;
      this.showDetailModal(element);
    }
  }

  private onWheel(event: WheelEvent): void {
    event.preventDefault();
    const delta = event.deltaY * 0.01;
    const direction = new THREE.Vector3();
    this.camera.getWorldDirection(direction);

    const minDistance = 3;
    const maxDistance = 10;
    const currentDistance = this.camera.position.length();

    if ((delta > 0 && currentDistance < maxDistance) || (delta < 0 && currentDistance > minDistance)) {
      const moveAmount = delta * 0.5;
      this.camera.position.addScaledVector(direction, moveAmount);
    }
  }

  private touchStartX: number = 0;
  private touchStartY: number = 0;
  private touchStartTime: number = 0;
  private initialPinchDistance: number = 0;
  private initialCameraDistance: number = 0;

  private onTouchStart(event: TouchEvent): void {
    event.preventDefault();
    if (event.touches.length === 1) {
      const touch = event.touches[0];
      this.touchStartX = touch.clientX;
      this.touchStartY = touch.clientY;
      this.touchStartTime = performance.now();
      this.isDragging = true;
      this.velocityX = 0;
      this.velocityY = 0;
    } else if (event.touches.length === 2) {
      const dx = event.touches[0].clientX - event.touches[1].clientX;
      const dy = event.touches[0].clientY - event.touches[1].clientY;
      this.initialPinchDistance = Math.sqrt(dx * dx + dy * dy);
      this.initialCameraDistance = this.camera.position.length();
    }
  }

  private onTouchMove(event: TouchEvent): void {
    event.preventDefault();
    if (event.touches.length === 1 && this.isDragging) {
      const touch = event.touches[0];
      const deltaX = touch.clientX - this.touchStartX;
      const deltaY = touch.clientY - this.touchStartY;
      this.touchStartX = touch.clientX;
      this.touchStartY = touch.clientY;

      const now = performance.now();
      const dt = (now - this.lastMoveTime) / 1000;
      this.lastMoveTime = now;

      if (dt > 0) {
        this.velocityX = deltaX / dt * 0.0002;
        this.velocityY = deltaY / dt * 0.0002;
      }

      this.rotateCamera(deltaX * 0.003, deltaY * 0.003);
    } else if (event.touches.length === 2) {
      const dx = event.touches[0].clientX - event.touches[1].clientX;
      const dy = event.touches[0].clientY - event.touches[1].clientY;
      const distance = Math.sqrt(dx * dx + dy * dy);
      const scale = this.initialPinchDistance / distance;
      const targetDistance = this.initialCameraDistance * scale;

      const minDistance = 3;
      const maxDistance = 10;
      const clampedDistance = Math.max(minDistance, Math.min(maxDistance, targetDistance));

      const direction = this.camera.position.clone().normalize();
      this.camera.position.copy(direction.multiplyScalar(clampedDistance));
    }
  }

  private onTouchEnd(event: TouchEvent): void {
    if (event.touches.length === 0) {
      this.isDragging = false;

      const dt = (performance.now() - this.touchStartTime) / 1000;
      if (dt < 0.2 && Math.abs(this.touchStartX - this.touchStartX) < 10) {
        const touch = event.changedTouches[0];
        const rect = this.renderer.domElement.getBoundingClientRect();
        const clickX = ((touch.clientX - rect.left) / rect.width) * 2 - 1;
        const clickY = -((touch.clientY - rect.top) / rect.height) * 2 + 1;

        this.raycaster.setFromCamera(new THREE.Vector2(clickX, clickY), this.camera);
        const intersects = this.raycaster.intersectObject(this.instancedMesh);

        if (intersects.length > 0 && intersects[0].instanceId !== undefined) {
          const instanceId = intersects[0].instanceId;
          const element = this.elementsInfo[instanceId].element;
          this.showDetailModal(element);
        }
      }
    }
  }

  private rotateCamera(deltaX: number, deltaY: number): void {
    const spherical = new THREE.Spherical();
    spherical.setFromVector3(this.camera.position);

    spherical.theta -= deltaX;
    spherical.phi = Math.max(0.1, Math.min(Math.PI - 0.1, spherical.phi + deltaY));

    this.camera.position.setFromSpherical(spherical);
    this.camera.lookAt(0, 0, 0);
  }

  public updateInertia(deltaTime: number): void {
    if (!this.isDragging && (Math.abs(this.velocityX) > 0.001 || Math.abs(this.velocityY) > 0.001)) {
      this.rotateCamera(
        this.velocityX * deltaTime * 10,
        this.velocityY * deltaTime * 10
      );
      this.velocityX *= 0.95;
      this.velocityY *= 0.95;
    }
  }

  private checkHover(): void {
    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObject(this.instancedMesh);

    let newHoveredIndex: number | null = null;

    if (intersects.length > 0 && intersects[0].instanceId !== undefined) {
      newHoveredIndex = intersects[0].instanceId;
    }

    if (newHoveredIndex !== this.hoveredIndex) {
      if (this.hoveredIndex !== null) {
        setElementHovered(this.elementsInfo[this.hoveredIndex], false);
      }

      if (newHoveredIndex !== null) {
        setElementHovered(this.elementsInfo[newHoveredIndex], true);
        const element = this.elementsInfo[newHoveredIndex].element;
        this.showTooltip(element);
      } else {
        this.hideTooltip();
      }

      this.hoveredIndex = newHoveredIndex;
    }
  }

  private showTooltip(element: ElementData): void {
    this.tooltipCnEl.textContent = `${element.nameCn} (${element.symbol})`;
    this.tooltipEnEl.textContent = element.nameEn;
    this.tooltipEl.classList.remove('hidden');
    this.tooltipEl.classList.add('visible');
  }

  private hideTooltip(): void {
    this.tooltipEl.classList.remove('visible');
    this.tooltipEl.classList.add('hidden');
  }

  private updateTooltipPosition(clientX: number, clientY: number): void {
    this.tooltipEl.style.left = `${clientX}px`;
    this.tooltipEl.style.top = `${clientY - 15}px`;
  }

  private showDetailModal(element: ElementData): void {
    const modal = this.detailModalEl;
    const symbolEl = modal.querySelector('.modal-symbol') as HTMLElement;
    const nameEl = modal.querySelector('.modal-name') as HTMLElement;
    const atomicNumberEl = modal.querySelector('.atomic-number') as HTMLElement;
    const atomicMassEl = modal.querySelector('.atomic-mass') as HTMLElement;
    const electronConfigEl = modal.querySelector('.electron-config') as HTMLElement;
    const meltingPointEl = modal.querySelector('.melting-point') as HTMLElement;
    const discoveryYearEl = modal.querySelector('.discovery-year') as HTMLElement;
    const categoryEl = modal.querySelector('.category') as HTMLElement;

    const categoryColor = this.elementsInfo.find(e => e.element.atomicNumber === element.atomicNumber)?.element.category;
    if (categoryColor) {
      const colorMap: Record<string, string> = {
        'alkali-metal': '#ff6b6b',
        'alkaline-earth-metal': '#ffa94d',
        'transition-metal': '#845ef7',
        'post-transition-metal': '#339af0',
        'metalloid': '#20c997',
        'nonmetal': '#51cf66',
        'noble-gas': '#cc5de8',
        'lanthanide': '#f06595',
        'actinide': '#e03131',
      };
      symbolEl.style.color = colorMap[categoryColor] || '#ffffff';
    }

    symbolEl.textContent = element.symbol;
    nameEl.textContent = `${element.nameCn} · ${element.nameEn}`;
    atomicNumberEl.textContent = element.atomicNumber.toString();
    atomicMassEl.textContent = element.atomicMass.toFixed(2);
    electronConfigEl.textContent = element.electronConfig;
    meltingPointEl.textContent = element.meltingPoint !== null ? `${element.meltingPoint} °C` : '未知';
    discoveryYearEl.textContent = element.discoveryYear.toString();
    categoryEl.textContent = CATEGORY_LABELS[element.category];

    modal.classList.remove('hidden');
    requestAnimationFrame(() => {
      modal.classList.add('visible');
    });
  }

  private closeDetailModal(): void {
    this.detailModalEl.classList.remove('visible');
    setTimeout(() => {
      this.detailModalEl.classList.add('hidden');
    }, 200);
  }

  public setFilter(filter: FilterType): void {
    this.elementsInfo.forEach((info) => {
      let shouldFilter = false;

      switch (filter) {
        case 'metal':
          shouldFilter = !isMetal(info.element.category);
          break;
        case 'nonmetal':
          shouldFilter = !isNonmetal(info.element.category);
          break;
        case 'all':
        default:
          shouldFilter = false;
          break;
      }

      setElementFiltered(info, shouldFilter);
    });
  }

  public getHoveredElement(): ElementData | null {
    if (this.hoveredIndex !== null) {
      return this.elementsInfo[this.hoveredIndex].element;
    }
    return null;
  }
}
