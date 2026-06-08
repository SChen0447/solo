import { ShapeType, PALETTE } from './shape';
import { CanvasController } from './canvasController';

interface ShapeItem {
  type: ShapeType;
  name: string;
  icon: string;
}

export class Toolbar {
  private container: HTMLElement;
  private canvasController: CanvasController;
  private shapesGrid: HTMLElement;

  private shapeItems: ShapeItem[] = [
    { type: 'rect', name: '矩形', icon: '▢' },
    { type: 'circle', name: '圆形', icon: '○' },
    { type: 'triangle', name: '三角形', icon: '△' },
    { type: 'star', name: '星形', icon: '☆' },
  ];

  constructor(container: HTMLElement, canvasController: CanvasController) {
    this.container = container;
    this.canvasController = canvasController;
    this.shapesGrid = container.querySelector('#shapesGrid') as HTMLElement;
    this.render();
    this.bindEvents();
  }

  private render(): void {
    this.shapesGrid.innerHTML = '';

    for (const item of this.shapeItems) {
      const shapeEl = document.createElement('div');
      shapeEl.className = 'shape-item';
      shapeEl.dataset.type = item.type;
      shapeEl.draggable = true;

      const icon = document.createElement('div');
      icon.className = 'shape-icon';
      icon.innerHTML = this.getShapeSVG(item.type);

      const label = document.createElement('span');
      label.className = 'shape-label';
      label.textContent = item.name;

      shapeEl.appendChild(icon);
      shapeEl.appendChild(label);
      this.shapesGrid.appendChild(shapeEl);
    }
  }

  private getShapeSVG(type: ShapeType): string {
    const color = '#4A90D9';
    switch (type) {
      case 'rect':
        return `<svg width="40" height="40" viewBox="0 0 40 40">
          <rect x="6" y="10" width="28" height="20" rx="3" fill="${color}" opacity="0.8"/>
        </svg>`;
      case 'circle':
        return `<svg width="40" height="40" viewBox="0 0 40 40">
          <circle cx="20" cy="20" r="13" fill="${color}" opacity="0.8"/>
        </svg>`;
      case 'triangle':
        return `<svg width="40" height="40" viewBox="0 0 40 40">
          <polygon points="20,7 34,32 6,32" fill="${color}" opacity="0.8"/>
        </svg>`;
      case 'star':
        return `<svg width="40" height="40" viewBox="0 0 40 40">
          <polygon points="20,4 24,15 36,15 26,22 30,34 20,27 10,34 14,22 4,15 16,15" fill="${color}" opacity="0.8"/>
        </svg>`;
      default:
        return '';
    }
  }

  private bindEvents(): void {
    const shapeItems = this.shapesGrid.querySelectorAll('.shape-item') as NodeListOf<HTMLElement>;
    const textTool = this.container.querySelector('#textTool') as HTMLElement;

    shapeItems.forEach((item) => {
      item.addEventListener('dragstart', (e) => this.handleDragStart(e as DragEvent, item.dataset.type as ShapeType));
      item.addEventListener('dragend', (e) => this.handleDragEnd(e as DragEvent));
      item.addEventListener('click', (e) => this.handleClick(e as MouseEvent, item.dataset.type as ShapeType));
      item.addEventListener('mouseenter', () => this.handleHover(item, true));
      item.addEventListener('mouseleave', () => this.handleHover(item, false));
    });

    if (textTool) {
      textTool.draggable = true;
      textTool.addEventListener('dragstart', (e) => this.handleDragStart(e as DragEvent, 'text'));
      textTool.addEventListener('dragend', (e) => this.handleDragEnd(e as DragEvent));
      textTool.addEventListener('click', (e) => this.handleClick(e as MouseEvent, 'text'));
      textTool.addEventListener('mouseenter', () => this.handleHover(textTool, true));
      textTool.addEventListener('mouseleave', () => this.handleHover(textTool, false));
    }

    const canvas = document.getElementById('canvas') as HTMLCanvasElement;
    if (canvas) {
      canvas.addEventListener('dragover', this.handleDragOver);
      canvas.addEventListener('drop', this.handleDrop);
    }
  }

  private handleHover(element: Element, isHover: boolean): void {
    if (isHover) {
      (element as HTMLElement).style.backgroundColor = '#e0e8f0';
    } else {
      (element as HTMLElement).style.backgroundColor = '';
    }
  }

  private handleDragStart = (e: DragEvent, type: ShapeType): void => {
    if (!e.dataTransfer) return;
    e.dataTransfer.setData('shapeType', type);
    e.dataTransfer.effectAllowed = 'copy';

    const ghost = document.createElement('div');
    ghost.className = 'drag-ghost';
    ghost.textContent = this.getShapeName(type);
    document.body.appendChild(ghost);
    e.dataTransfer.setDragImage(ghost, 30, 20);

    setTimeout(() => {
      document.body.removeChild(ghost);
    }, 0);

    const target = e.currentTarget as HTMLElement;
    target.style.opacity = '0.5';
  };

  private handleDragEnd = (e: DragEvent): void => {
    const target = e.currentTarget as HTMLElement;
    target.style.opacity = '1';
  };

  private handleDragOver = (e: DragEvent): void => {
    e.preventDefault();
    if (e.dataTransfer) {
      e.dataTransfer.dropEffect = 'copy';
    }
  };

  private handleDrop = (e: DragEvent): void => {
    e.preventDefault();
    if (!e.dataTransfer) return;

    const type = e.dataTransfer.getData('shapeType') as ShapeType;
    if (!type) return;

    const canvas = document.getElementById('canvas') as HTMLCanvasElement;
    const rect = canvas.getBoundingClientRect();

    const offsetX = (canvas as any).offsetX || 0;
    const offsetY = (canvas as any).offsetY || 0;
    const scale = (canvas as any).scale || 1;

    const x = (e.clientX - rect.left - offsetX) / scale;
    const y = (e.clientY - rect.top - offsetY) / scale;

    this.canvasController.addShape(type, x, y);
  };

  private handleClick = (e: MouseEvent, type: ShapeType): void => {
    const target = e.currentTarget as HTMLElement;
    target.style.backgroundColor = '#4A90D9';
    target.style.color = '#ffffff';

    setTimeout(() => {
      target.style.backgroundColor = '';
      target.style.color = '';
    }, 200);

    const canvas = document.getElementById('canvas') as HTMLCanvasElement;
    const rect = canvas.getBoundingClientRect();

    const centerX = rect.width / 2 / this.getCanvasScale();
    const centerY = rect.height / 2 / this.getCanvasScale();

    this.canvasController.addShape(type, centerX, centerY);
  };

  private getCanvasScale(): number {
    const canvas = document.getElementById('canvas') as any;
    return canvas.scale || 1;
  }

  private getShapeName(type: ShapeType): string {
    const item = this.shapeItems.find((s) => s.type === type);
    return item ? item.name : '文字';
  }

  destroy(): void {
    const canvas = document.getElementById('canvas');
    if (canvas) {
      canvas.removeEventListener('dragover', this.handleDragOver);
      canvas.removeEventListener('drop', this.handleDrop);
    }
  }
}
