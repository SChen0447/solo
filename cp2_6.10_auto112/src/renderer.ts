import type { LayoutData, GridItem, GridConfig } from './gridEngine';

const BASE_WIDTH = 600;
const BASE_HEIGHT = 400;

export interface RendererCallbacks {
  onItemSelect: (itemId: string | null) => void;
}

export class Renderer {
  private container: HTMLElement;
  private gridContainer: HTMLElement;
  private callbacks: RendererCallbacks;
  private items: Map<string, HTMLElement> = new Map();
  private selectedItemId: string | null = null;
  private animationFrameId: number | null = null;
  private scale: number = 1;
  private viewportWidth: number = 1200;
  private currentBreakpointConfig: Partial<GridConfig> | null = null;
  private fadeTransition: boolean = false;

  constructor(container: HTMLElement, callbacks: RendererCallbacks) {
    this.container = container;
    this.callbacks = callbacks;
    this.gridContainer = this.createGridContainer();
    this.container.appendChild(this.gridContainer);
  }

  private createGridContainer(): HTMLElement {
    const el = document.createElement('div');
    el.className = 'grid-container';
    el.style.width = `${BASE_WIDTH}px`;
    el.style.height = `${BASE_HEIGHT}px`;
    el.style.backgroundColor = '#EAEAEA';
    el.style.border = '1px solid #333';
    el.style.position = 'relative';
    el.style.transition = 'opacity 0.5s ease-in-out';
    return el;
  }

  private createItemElement(item: GridItem): HTMLElement {
    const el = document.createElement('div');
    el.className = 'grid-item';
    el.dataset.id = item.id;
    el.style.width = '40px';
    el.style.height = '40px';
    el.style.minWidth = '40px';
    el.style.minHeight = '40px';
    el.style.color = '#fff';
    el.style.display = 'flex';
    el.style.flexDirection = 'column';
    el.style.alignItems = 'center';
    el.style.justifyContent = 'center';
    el.style.cursor = 'pointer';
    el.style.position = 'relative';
    el.style.transition =
      'grid-column 0.4s cubic-bezier(0.68,-0.55,0.27,1.55), grid-row 0.4s cubic-bezier(0.68,-0.55,0.27,1.55), transform 0.3s ease-in-out, border 0.2s ease-in-out, box-shadow 0.2s ease-in-out, background-color 0.3s ease-in-out';
    el.style.borderRadius = '4px';
    el.style.userSelect = 'none';
    el.style.boxShadow = '0 2px 4px rgba(0,0,0,0.2)';

    const numberSpan = document.createElement('span');
    numberSpan.className = 'item-number';
    numberSpan.textContent = String(item.number);
    numberSpan.style.fontSize = '16px';
    numberSpan.style.fontWeight = 'bold';
    numberSpan.style.textShadow = '0 1px 2px rgba(0,0,0,0.3)';
    el.appendChild(numberSpan);

    const areaSpan = document.createElement('span');
    areaSpan.className = 'item-area-name';
    areaSpan.style.fontSize = '12px';
    areaSpan.style.color = '#fff';
    areaSpan.style.position = 'absolute';
    areaSpan.style.top = '4px';
    areaSpan.style.left = '0';
    areaSpan.style.right = '0';
    areaSpan.style.textAlign = 'center';
    areaSpan.style.textShadow = '0 1px 2px rgba(0,0,0,0.5)';
    areaSpan.style.pointerEvents = 'none';
    el.appendChild(areaSpan);

    el.addEventListener('click', (e) => {
      e.stopPropagation();
      this.selectItem(item.id);
    });

    return el;
  }

  selectItem(itemId: string | null): void {
    if (this.selectedItemId === itemId) {
      this.selectedItemId = null;
    } else {
      this.selectedItemId = itemId;
    }

    this.items.forEach((el, id) => {
      if (id === this.selectedItemId) {
        el.style.border = '3px solid #3B82F6';
        el.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.3), 0 4px 8px rgba(0,0,0,0.3)';
        el.style.transform = 'scale(1.02)';
      } else {
        el.style.border = 'none';
        el.style.boxShadow = '0 2px 4px rgba(0,0,0,0.2)';
        el.style.transform = 'scale(1)';
      }
    });

    this.callbacks.onItemSelect(this.selectedItemId);
  }

  getSelectedItemId(): string | null {
    return this.selectedItemId;
  }

  addItem(item: GridItem): void {
    const el = this.createItemElement(item);
    this.items.set(item.id, el);
    this.gridContainer.appendChild(el);
  }

  removeItem(itemId: string): void {
    const el = this.items.get(itemId);
    if (el) {
      el.remove();
      this.items.delete(itemId);
    }
    if (this.selectedItemId === itemId) {
      this.selectedItemId = null;
    }
  }

  clearItems(): void {
    this.items.forEach((el) => el.remove());
    this.items.clear();
    this.selectedItemId = null;
  }

  applyLayout(layout: LayoutData, itemsData: GridItem[]): void {
    Object.entries(layout.gridContainerStyle).forEach(([key, value]) => {
      const cssKey = key.replace(/([A-Z])/g, '-$1').toLowerCase();
      this.gridContainer.style.setProperty(cssKey, value);
    });

    layout.items.forEach((layoutItem) => {
      const el = this.items.get(layoutItem.id);
      const itemData = itemsData.find((d) => d.id === layoutItem.id);
      if (!el || !itemData) return;

      Object.entries(layoutItem.style).forEach(([key, value]) => {
        const cssKey = key.replace(/([A-Z])/g, '-$1').toLowerCase();
        el.style.setProperty(cssKey, value);
      });

      if (layoutItem.areaColor) {
        el.style.backgroundColor = layoutItem.areaColor;
      }

      const areaSpan = el.querySelector('.item-area-name') as HTMLElement;
      if (areaSpan) {
        areaSpan.textContent = layoutItem.areaName || '';
      }

      const numberSpan = el.querySelector('.item-number') as HTMLElement;
      if (numberSpan) {
        numberSpan.textContent = String(itemData.number);
      }
    });
  }

  setViewportWidth(width: number): void {
    this.viewportWidth = width;
    this.updateScale();
  }

  private updateScale(): void {
    const baseViewport = 1200;
    this.scale = Math.min(this.viewportWidth / baseViewport, 1);
    this.scale = Math.max(0.2, this.scale);
    this.applyScale();
  }

  private applyScale(): void {
    this.gridContainer.style.transformOrigin = 'center center';
    this.gridContainer.style.transform = `scale(${this.scale})`;
    this.gridContainer.style.fontSize = `${16 * this.scale}px`;
  }

  setBreakpointConfig(config: Partial<GridConfig> | null, animate: boolean = true): void {
    if (animate && this.fadeTransition) {
      this.gridContainer.style.opacity = '0';
      setTimeout(() => {
        this.currentBreakpointConfig = config;
        this.gridContainer.style.opacity = '1';
      }, 250);
    } else {
      this.currentBreakpointConfig = config;
    }
  }

  setFadeTransition(enabled: boolean): void {
    this.fadeTransition = enabled;
  }

  startAnimationLoop(): void {
    if (this.animationFrameId !== null) return;

    const tick = () => {
      this.animationFrameId = requestAnimationFrame(tick);
    };
    this.animationFrameId = requestAnimationFrame(tick);
  }

  stopAnimationLoop(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  getGridContainer(): HTMLElement {
    return this.gridContainer;
  }

  getItemElement(itemId: string): HTMLElement | undefined {
    return this.items.get(itemId);
  }

  destroy(): void {
    this.stopAnimationLoop();
    this.clearItems();
    this.gridContainer.remove();
  }
}
