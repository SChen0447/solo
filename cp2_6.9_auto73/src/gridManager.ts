import type { AnalyzedImage } from './imageAnalyzer';
import { extractTitle } from './imageAnalyzer';

export interface GridItem {
  image: AnalyzedImage;
  colSpan: number;
  rowSpan: number;
  element?: HTMLElement;
}

export class GridManager {
  private container: HTMLElement;
  private gridElement: HTMLElement;
  private items: GridItem[] = [];
  private resizeObserver: ResizeObserver | null = null;
  private currentColumns: number = 3;
  private onItemClick: ((image: AnalyzedImage, el: HTMLElement) => void) | null = null;

  constructor(container: HTMLElement, gridElement: HTMLElement) {
    this.container = container;
    this.gridElement = gridElement;
    this.setupResizeObserver();
  }

  setOnItemClick(callback: (image: AnalyzedImage, el: HTMLElement) => void): void {
    this.onItemClick = callback;
  }

  private setupResizeObserver(): void {
    this.resizeObserver = new ResizeObserver(entries => {
      for (const entry of entries) {
        const width = entry.contentRect.width;
        const columns = this.getColumnsForWidth(width);
        if (columns !== this.currentColumns) {
          this.currentColumns = columns;
          this.updateGridLayout();
        }
      }
    });
    this.resizeObserver.observe(this.container);
  }

  private getColumnsForWidth(width: number): number {
    if (width > 900) return 4;
    if (width >= 600) return 3;
    return 2;
  }

  private getSpanFromWeight(weight: number): { colSpan: number; rowSpan: number } {
    if (weight >= 75) return { colSpan: 2, rowSpan: 2 };
    if (weight >= 50) return { colSpan: 2, rowSpan: 1 };
    return { colSpan: 1, rowSpan: 1 };
  }

  private updateGridLayout(): void {
    this.gridElement.style.gridTemplateColumns = `repeat(${this.currentColumns}, 1fr)`;
    this.repositionItems();
  }

  private repositionItems(): void {
    const cols = this.currentColumns;
    const occupied = new Set<string>();

    for (const item of this.items) {
      let placed = false;
      for (let row = 1; row < 100 && !placed; row++) {
        for (let col = 1; col <= cols && !placed; col++) {
          if (this.canPlace(occupied, col, row, item.colSpan, item.rowSpan, cols)) {
            this.placeItem(item, col, row);
            this.markOccupied(occupied, col, row, item.colSpan, item.rowSpan);
            placed = true;
          }
        }
      }
    }
  }

  private canPlace(
    occupied: Set<string>,
    col: number,
    row: number,
    colSpan: number,
    rowSpan: number,
    cols: number
  ): boolean {
    if (col + colSpan - 1 > cols) return false;
    for (let r = row; r < row + rowSpan; r++) {
      for (let c = col; c < col + colSpan; c++) {
        if (occupied.has(`${c},${r}`)) return false;
      }
    }
    return true;
  }

  private markOccupied(
    occupied: Set<string>,
    col: number,
    row: number,
    colSpan: number,
    rowSpan: number
  ): void {
    for (let r = row; r < row + rowSpan; r++) {
      for (let c = col; c < col + colSpan; c++) {
        occupied.add(`${c},${r}`);
      }
    }
  }

  private placeItem(item: GridItem, col: number, row: number): void {
    if (!item.element) return;
    item.element.style.gridColumn = `${col} / span ${item.colSpan}`;
    item.element.style.gridRow = `${row} / span ${item.rowSpan}`;
  }

  setImages(images: AnalyzedImage[]): void {
    this.gridElement.innerHTML = '';
    this.items = [];

    const sorted = [...images].sort((a, b) => b.weight - a.weight);

    for (const image of sorted) {
      const span = this.getSpanFromWeight(image.weight);
      const element = this.createGridItem(image);
      const item: GridItem = { image, ...span, element };
      this.items.push(item);
      this.gridElement.appendChild(element);
    }

    this.updateGridLayout();
  }

  private createGridItem(image: AnalyzedImage): HTMLElement {
    const item = document.createElement('div');
    item.className = 'grid-item';
    item.style.aspectRatio = image.width > image.height ? 'auto' : `${image.width} / ${image.height}`;

    const imgWrapper = document.createElement('div');
    imgWrapper.className = 'grid-item-inner';

    const img = document.createElement('img');
    img.src = image.url;
    img.alt = extractTitle(image.name);
    img.loading = 'lazy';

    const overlay = document.createElement('div');
    overlay.className = 'grid-item-overlay';

    const title = document.createElement('span');
    title.className = 'grid-item-title';
    title.textContent = extractTitle(image.name);

    const badge = document.createElement('span');
    badge.className = 'grid-item-badge';
    badge.textContent = `权重 ${image.weight}`;

    overlay.appendChild(title);
    overlay.appendChild(badge);
    imgWrapper.appendChild(img);
    imgWrapper.appendChild(overlay);
    item.appendChild(imgWrapper);

    item.addEventListener('click', () => {
      if (this.onItemClick) {
        this.onItemClick(image, item);
      }
    });

    return item;
  }

  clear(): void {
    this.gridElement.innerHTML = '';
    this.items = [];
  }

  destroy(): void {
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }
    this.clear();
  }
}
