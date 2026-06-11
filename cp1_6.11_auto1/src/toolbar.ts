export interface ToolbarOptions {
  currentColor: string;
  presetColors: string[];
  onColorChange: (color: string) => void;
  onUndo: () => void;
  onRedo: () => void;
}

export class Toolbar {
  private container: HTMLElement;
  private currentColor: string;
  private presetColors: string[];
  private onColorChange: (color: string) => void;
  private onUndo: () => void;
  private onRedo: () => void;

  private colorPreview!: HTMLElement;
  private undoBtn!: HTMLButtonElement;
  private redoBtn!: HTMLButtonElement;
  private colorPicker!: HTMLInputElement;

  constructor(container: HTMLElement, options: ToolbarOptions) {
    this.container = container;
    this.currentColor = options.currentColor;
    this.presetColors = options.presetColors;
    this.onColorChange = options.onColorChange;
    this.onUndo = options.onUndo;
    this.onRedo = options.onRedo;

    this.render();
  }

  private render(): void {
    this.container.style.display = 'flex';
    this.container.style.flexDirection = 'column';
    this.container.style.gap = '16px';
    this.container.style.padding = '16px';
    this.container.style.backgroundColor = '#16213e';
    this.container.style.borderRight = '2px solid #0f3460';
    this.container.style.minWidth = '180px';
    this.container.style.fontFamily = 'monospace';
    this.container.style.color = '#e0e0e0';

    const title = document.createElement('h2');
    title.textContent = '像素编辑器';
    title.style.fontSize = '16px';
    title.style.margin = '0 0 8px 0';
    title.style.letterSpacing = '1px';
    title.style.textAlign = 'center';
    title.style.borderBottom = '2px solid #0f3460';
    title.style.paddingBottom = '12px';
    this.container.appendChild(title);

    this.createColorPreview();
    this.createColorPicker();
    this.createPresetPalette();
    this.createUndoRedoButtons();
    this.createInstructions();
  }

  private createColorPreview(): void {
    const previewContainer = document.createElement('div');
    previewContainer.style.display = 'flex';
    previewContainer.style.flexDirection = 'column';
    previewContainer.style.alignItems = 'center';
    previewContainer.style.gap = '8px';

    const label = document.createElement('span');
    label.textContent = '当前颜色';
    label.style.fontSize = '12px';
    label.style.opacity = '0.8';

    this.colorPreview = document.createElement('div');
    this.colorPreview.style.width = '80px';
    this.colorPreview.style.height = '80px';
    this.colorPreview.style.backgroundColor = this.currentColor;
    this.colorPreview.style.border = '3px solid #0f3460';
    this.colorPreview.style.transition = 'background-color 0.3s ease, transform 0.2s ease';
    this.colorPreview.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.3)';

    previewContainer.appendChild(label);
    previewContainer.appendChild(this.colorPreview);
    this.container.appendChild(previewContainer);
  }

  private createColorPicker(): void {
    const pickerContainer = document.createElement('div');
    pickerContainer.style.display = 'flex';
    pickerContainer.style.flexDirection = 'column';
    pickerContainer.style.gap = '8px';

    const label = document.createElement('span');
    label.textContent = '自定义颜色';
    label.style.fontSize = '12px';
    label.style.opacity = '0.8';

    const pickerWrapper = document.createElement('div');
    pickerWrapper.style.display = 'flex';
    pickerWrapper.style.alignItems = 'center';
    pickerWrapper.style.gap = '8px';

    this.colorPicker = document.createElement('input');
    this.colorPicker.type = 'color';
    this.colorPicker.value = this.currentColor;
    this.colorPicker.style.width = '40px';
    this.colorPicker.style.height = '40px';
    this.colorPicker.style.border = '2px solid #0f3460';
    this.colorPicker.style.backgroundColor = '#1a1a2e';
    this.colorPicker.style.cursor = 'pointer';
    this.colorPicker.style.padding = '2px';

    const hexDisplay = document.createElement('span');
    hexDisplay.textContent = this.currentColor.toUpperCase();
    hexDisplay.style.fontSize = '12px';
    hexDisplay.style.fontFamily = 'monospace';
    hexDisplay.style.flex = '1';
    hexDisplay.style.textAlign = 'right';
    hexDisplay.style.textTransform = 'uppercase';

    this.colorPicker.addEventListener('input', (e) => {
      const color = (e.target as HTMLInputElement).value;
      this.setColor(color);
      hexDisplay.textContent = color.toUpperCase();
    });

    pickerWrapper.appendChild(this.colorPicker);
    pickerWrapper.appendChild(hexDisplay);
    pickerContainer.appendChild(label);
    pickerContainer.appendChild(pickerWrapper);
    this.container.appendChild(pickerContainer);
  }

  private createPresetPalette(): void {
    const paletteContainer = document.createElement('div');
    paletteContainer.style.display = 'flex';
    paletteContainer.style.flexDirection = 'column';
    paletteContainer.style.gap = '8px';

    const label = document.createElement('span');
    label.textContent = '预设色板';
    label.style.fontSize = '12px';
    label.style.opacity = '0.8';

    const colorsGrid = document.createElement('div');
    colorsGrid.style.display = 'grid';
    colorsGrid.style.gridTemplateColumns = 'repeat(4, 1fr)';
    colorsGrid.style.gap = '6px';

    this.presetColors.forEach((color) => {
      const colorBtn = document.createElement('button');
      colorBtn.type = 'button';
      colorBtn.style.width = '100%';
      colorBtn.style.aspectRatio = '1';
      colorBtn.style.backgroundColor = color;
      colorBtn.style.border = '2px solid #0f3460';
      colorBtn.style.cursor = 'pointer';
      colorBtn.style.transition = 'transform 0.15s ease, box-shadow 0.15s ease';
      colorBtn.style.padding = '0';

      if (color === this.currentColor) {
        colorBtn.style.borderColor = '#e94560';
        colorBtn.style.boxShadow = '0 0 0 2px #e94560';
      }

      colorBtn.addEventListener('mouseenter', () => {
        colorBtn.style.transform = 'translateY(-2px)';
        colorBtn.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.3)';
      });

      colorBtn.addEventListener('mouseleave', () => {
        colorBtn.style.transform = 'translateY(0)';
        if (color === this.currentColor) {
          colorBtn.style.boxShadow = '0 0 0 2px #e94560';
        } else {
          colorBtn.style.boxShadow = 'none';
        }
      });

      colorBtn.addEventListener('click', () => {
        this.setColor(color);
        this.colorPicker.value = color;
      });

      colorBtn.dataset.color = color;
      colorsGrid.appendChild(colorBtn);
    });

    paletteContainer.appendChild(label);
    paletteContainer.appendChild(colorsGrid);
    this.container.appendChild(paletteContainer);
  }

  private createUndoRedoButtons(): void {
    const btnContainer = document.createElement('div');
    btnContainer.style.display = 'flex';
    btnContainer.style.gap = '8px';
    btnContainer.style.marginTop = '8px';

    this.undoBtn = this.createActionButton('撤销', '↶', '#e94560');
    this.redoBtn = this.createActionButton('重做', '↷', '#e94560');

    this.undoBtn.addEventListener('click', () => this.onUndo());
    this.redoBtn.addEventListener('click', () => this.onRedo());

    btnContainer.appendChild(this.undoBtn);
    btnContainer.appendChild(this.redoBtn);
    this.container.appendChild(btnContainer);

    this.updateUndoRedoState(false, false);
  }

  private createActionButton(label: string, icon: string, color: string): HTMLButtonElement {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.style.flex = '1';
    btn.style.padding = '10px 8px';
    btn.style.backgroundColor = '#0f3460';
    btn.style.color = '#e0e0e0';
    btn.style.border = `2px solid ${color}`;
    btn.style.cursor = 'pointer';
    btn.style.fontFamily = 'monospace';
    btn.style.fontSize = '12px';
    btn.style.transition = 'all 0.15s ease';
    btn.style.display = 'flex';
    btn.style.flexDirection = 'column';
    btn.style.alignItems = 'center';
    btn.style.gap = '4px';

    const iconSpan = document.createElement('span');
    iconSpan.textContent = icon;
    iconSpan.style.fontSize = '18px';

    const labelSpan = document.createElement('span');
    labelSpan.textContent = label;

    btn.appendChild(iconSpan);
    btn.appendChild(labelSpan);

    btn.addEventListener('mouseenter', () => {
      if (!btn.disabled) {
        btn.style.backgroundColor = color;
        btn.style.transform = 'translateY(-2px)';
        btn.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.3)';
      }
    });

    btn.addEventListener('mouseleave', () => {
      if (!btn.disabled) {
        btn.style.backgroundColor = '#0f3460';
        btn.style.transform = 'translateY(0)';
        btn.style.boxShadow = 'none';
      }
    });

    return btn;
  }

  private createInstructions(): void {
    const instructions = document.createElement('div');
    instructions.style.marginTop = 'auto';
    instructions.style.paddingTop = '16px';
    instructions.style.borderTop = '2px solid #0f3460';
    instructions.style.fontSize = '11px';
    instructions.style.lineHeight = '1.6';
    instructions.style.opacity = '0.7';

    instructions.innerHTML = `
      <div style="margin-bottom: 6px;"><strong>操作说明</strong></div>
      <div>• 左键：绘制像素</div>
      <div>• 右键：擦除像素</div>
      <div>• Ctrl+Z：撤销</div>
      <div>• Ctrl+Y：重做</div>
    `;

    this.container.appendChild(instructions);
  }

  setColor(color: string): void {
    this.currentColor = color;

    this.colorPreview.style.transform = 'scale(1.1)';
    this.colorPreview.style.backgroundColor = color;
    
    setTimeout(() => {
      this.colorPreview.style.transform = 'scale(1)';
    }, 150);

    const colorBtns = this.container.querySelectorAll<HTMLButtonElement>('[data-color]');
    colorBtns.forEach((btn) => {
      if (btn.dataset.color === color) {
        btn.style.borderColor = '#e94560';
        btn.style.boxShadow = '0 0 0 2px #e94560';
      } else {
        btn.style.borderColor = '#0f3460';
        btn.style.boxShadow = 'none';
      }
    });

    this.onColorChange(color);
  }

  getColor(): string {
    return this.currentColor;
  }

  updateUndoRedoState(canUndo: boolean, canRedo: boolean): void {
    this.undoBtn.disabled = !canUndo;
    this.redoBtn.disabled = !canRedo;
    this.undoBtn.style.opacity = canUndo ? '1' : '0.5';
    this.redoBtn.style.opacity = canRedo ? '1' : '0.5';
    this.undoBtn.style.cursor = canUndo ? 'pointer' : 'not-allowed';
    this.redoBtn.style.cursor = canRedo ? 'pointer' : 'not-allowed';
  }

  destroy(): void {
    while (this.container.firstChild) {
      this.container.removeChild(this.container.firstChild);
    }
  }
}
