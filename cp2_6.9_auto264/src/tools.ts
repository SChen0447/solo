import type { ToolType, BrushSize } from './canvas';

const PRESET_COLORS = [
  '#FF0000', '#00FF00', '#0000FF', '#FFFF00',
  '#FF00FF', '#00FFFF', '#FFFFFF', '#000000',
  '#FF6600', '#9933FF', '#33CC99', '#FF9999'
];

export interface ToolPanelCallbacks {
  onToolChange: (tool: ToolType) => void;
  onColorChange: (color: string) => void;
  onBrushSizeChange: (size: BrushSize) => void;
  onFlipHorizontal: () => void;
  onFlipVertical: () => void;
  onRotate90: () => void;
}

export class ToolPanel {
  private callbacks: ToolPanelCallbacks;
  private currentTool: ToolType = 'pencil';
  private currentColor: string = '#FF0000';
  private currentBrushSize: BrushSize = 1;
  private toolButtons: NodeListOf<HTMLButtonElement>;
  private colorPalette: HTMLDivElement;
  private customColorInput: HTMLInputElement;
  private colorHexDisplay: HTMLSpanElement;
  private brushSizeSelect: HTMLSelectElement;

  constructor(callbacks: ToolPanelCallbacks) {
    this.callbacks = callbacks;

    this.toolButtons = document.querySelectorAll('#toolButtons .tool-btn') as NodeListOf<HTMLButtonElement>;
    this.colorPalette = document.getElementById('colorPalette') as HTMLDivElement;
    this.customColorInput = document.getElementById('customColor') as HTMLInputElement;
    this.colorHexDisplay = document.getElementById('colorHex') as HTMLSpanElement;
    this.brushSizeSelect = document.getElementById('brushSize') as HTMLSelectElement;

    this.buildColorPalette();
    this.bindEvents();
  }

  private buildColorPalette(): void {
    PRESET_COLORS.forEach(color => {
      const btn = document.createElement('button');
      btn.className = 'color-swatch';
      btn.style.backgroundColor = color;
      btn.dataset.color = color;
      if (color === this.currentColor) {
        btn.classList.add('active');
      }
      this.colorPalette.appendChild(btn);
    });
  }

  private bindEvents(): void {
    this.toolButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const tool = btn.dataset.tool as ToolType;
        this.setTool(tool);
      });
    });

    this.colorPalette.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      if (target.classList.contains('color-swatch')) {
        const color = target.dataset.color!;
        this.setColor(color);
      }
    });

    this.customColorInput.addEventListener('input', (e) => {
      const color = (e.target as HTMLInputElement).value;
      this.setColor(color);
    });

    this.brushSizeSelect.addEventListener('change', (e) => {
      const size = parseInt((e.target as HTMLSelectElement).value) as BrushSize;
      this.setBrushSize(size);
    });

    (document.getElementById('flipH') as HTMLButtonElement).addEventListener('click', () => {
      this.callbacks.onFlipHorizontal();
    });
    (document.getElementById('flipV') as HTMLButtonElement).addEventListener('click', () => {
      this.callbacks.onFlipVertical();
    });
    (document.getElementById('rotate90') as HTMLButtonElement).addEventListener('click', () => {
      this.callbacks.onRotate90();
    });
  }

  setTool(tool: ToolType): void {
    this.currentTool = tool;
    this.toolButtons.forEach(btn => {
      if (btn.dataset.tool === tool) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });
    this.callbacks.onToolChange(tool);
  }

  setColor(color: string): void {
    this.currentColor = color;
    this.customColorInput.value = color;
    this.colorHexDisplay.textContent = color.toUpperCase();

    const swatches = this.colorPalette.querySelectorAll('.color-swatch') as NodeListOf<HTMLButtonElement>;
    swatches.forEach(swatch => {
      if (swatch.dataset.color?.toLowerCase() === color.toLowerCase()) {
        swatch.classList.add('active');
      } else {
        swatch.classList.remove('active');
      }
    });

    this.callbacks.onColorChange(color);
  }

  setBrushSize(size: BrushSize): void {
    this.currentBrushSize = size;
    this.brushSizeSelect.value = String(size);
    this.callbacks.onBrushSizeChange(size);
  }

  getTool(): ToolType {
    return this.currentTool;
  }

  getColor(): string {
    return this.currentColor;
  }

  getBrushSize(): BrushSize {
    return this.currentBrushSize;
  }
}
