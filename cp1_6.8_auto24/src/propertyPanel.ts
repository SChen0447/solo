import { Shape, PALETTE, FONTS, TextShape } from './shape';
import { CanvasController } from './canvasController';

export class PropertyPanel {
  private container: HTMLElement;
  private canvasController: CanvasController;
  private content: HTMLElement;
  private selectedShapes: Shape[] = [];

  constructor(container: HTMLElement, canvasController: CanvasController) {
    this.container = container;
    this.canvasController = canvasController;
    this.content = container.querySelector('#propertyContent') as HTMLElement;
    this.bindEvents();
  }

  private bindEvents(): void {
    this.canvasController.setOnSelectionChange((shapes) => {
      this.selectedShapes = shapes;
      this.render();
    });

    this.canvasController.setOnShapesChange(() => {
      if (this.selectedShapes.length > 0) {
        this.selectedShapes = this.canvasController.getSelectedShapes();
      }
    });
  }

  private render(): void {
    if (this.selectedShapes.length === 0) {
      this.renderEmpty();
      return;
    }

    if (this.selectedShapes.length > 1) {
      this.renderMultipleSelection();
      return;
    }

    const shape = this.selectedShapes[0];
    if (shape.type === 'text') {
      this.renderTextProperties(shape as TextShape);
    } else {
      this.renderShapeProperties(shape);
    }
  }

  private renderEmpty(): void {
    this.content.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">✏️</div>
        <p class="empty-tip">选择一个形状或文字<br/>以编辑属性</p>
      </div>
      <div class="panel-section">
        <h4 class="section-title">导出</h4>
        <div class="export-buttons">
          <button class="btn btn-primary" id="exportSvgBtn">导出 SVG</button>
          <button class="btn" id="exportPngBtn">导出 PNG</button>
        </div>
      </div>
    `;
    this.bindExportButtons();
  }

  private renderMultipleSelection(): void {
    this.content.innerHTML = `
      <div class="selection-info">
        <span class="selection-count">已选中 ${this.selectedShapes.length} 个元素</span>
      </div>
      
      <div class="panel-section">
        <h4 class="section-title">对齐</h4>
        <div class="align-buttons">
          <button class="align-btn" data-align="left" title="左对齐">⬅</button>
          <button class="align-btn" data-align="center-h" title="水平居中">↔</button>
          <button class="align-btn" data-align="right" title="右对齐">➡</button>
          <button class="align-btn" data-align="top" title="顶部对齐">⬆</button>
          <button class="align-btn" data-align="center-v" title="垂直居中">↕</button>
          <button class="align-btn" data-align="bottom" title="底部对齐">⬇</button>
        </div>
      </div>

      <div class="panel-section">
        <h4 class="section-title">操作</h4>
        <button class="btn btn-danger" id="deleteBtn">
          <span class="btn-icon">🗑</span> 删除选中
        </button>
      </div>
    `;
    this.bindMultipleSelectionEvents();
  }

  private renderShapeProperties(shape: Shape): void {
    this.content.innerHTML = `
      <div class="panel-section">
        <h4 class="section-title">颜色</h4>
        <div class="color-picker">
          <div class="color-palette" id="colorPalette">
            ${this.renderPalette(shape.fill)}
          </div>
          <div class="color-input-row">
            <label>自定义颜色</label>
            <input type="color" id="colorInput" value="${shape.fill}" />
          </div>
        </div>
      </div>

      <div class="panel-section">
        <h4 class="section-title">尺寸</h4>
        <div class="size-inputs">
          <div class="input-group">
            <label>宽度</label>
            <input type="number" id="widthInput" value="${Math.round(shape.width)}" min="10" />
          </div>
          <div class="input-group">
            <label>高度</label>
            <input type="number" id="heightInput" value="${Math.round(shape.height)}" min="10" />
          </div>
        </div>
      </div>

      <div class="panel-section">
        <h4 class="section-title">旋转</h4>
        <div class="rotation-control">
          <input type="range" id="rotationSlider" min="0" max="360" value="${shape.rotation}" />
          <span class="rotation-value">${Math.round(shape.rotation)}°</span>
        </div>
      </div>

      <div class="panel-section">
        <h4 class="section-title">层级</h4>
        <div class="layer-buttons">
          <button class="btn" data-layer="top">置顶</button>
          <button class="btn" data-layer="up">上移</button>
          <button class="btn" data-layer="down">下移</button>
          <button class="btn" data-layer="bottom">置底</button>
        </div>
      </div>

      <div class="panel-section">
        <button class="btn btn-danger btn-block" id="deleteBtn">
          <span class="btn-icon">🗑</span> 删除形状
        </button>
      </div>

      <div class="panel-section">
        <h4 class="section-title">导出</h4>
        <div class="export-buttons">
          <button class="btn btn-primary" id="exportSvgBtn">导出 SVG</button>
          <button class="btn" id="exportPngBtn">导出 PNG</button>
        </div>
      </div>
    `;
    this.bindShapePropertyEvents(shape);
  }

  private renderTextProperties(shape: TextShape): void {
    this.content.innerHTML = `
      <div class="panel-section">
        <h4 class="section-title">文字内容</h4>
        <div class="input-group">
          <input type="text" id="textContentInput" value="${shape.text}" placeholder="输入文字" />
        </div>
      </div>

      <div class="panel-section">
        <h4 class="section-title">字体</h4>
        <div class="input-group">
          <select id="fontFamilySelect">
            ${FONTS.map((f) => `<option value="${f.value}" ${shape.fontFamily === f.value ? 'selected' : ''}>${f.name}</option>`).join('')}
          </select>
        </div>
      </div>

      <div class="panel-section">
        <h4 class="section-title">字号</h4>
        <div class="slider-control">
          <input type="range" id="fontSizeSlider" min="12" max="120" value="${shape.fontSize}" />
          <span class="slider-value">${shape.fontSize}px</span>
        </div>
      </div>

      <div class="panel-section">
        <h4 class="section-title">颜色</h4>
        <div class="color-picker">
          <div class="color-palette" id="colorPalette">
            ${this.renderPalette(shape.fill)}
          </div>
          <div class="color-input-row">
            <label>自定义颜色</label>
            <input type="color" id="colorInput" value="${shape.fill}" />
          </div>
        </div>
      </div>

      <div class="panel-section">
        <h4 class="section-title">文字阴影</h4>
        <div class="shadow-controls">
          <label class="toggle-row">
            <input type="checkbox" id="shadowEnabled" ${shape.shadow.enabled ? 'checked' : ''} />
            <span>启用阴影</span>
          </label>
          <div class="shadow-options" style="display: ${shape.shadow.enabled ? 'block' : 'none'};">
            <div class="input-group">
              <label>X 偏移</label>
              <input type="number" id="shadowOffsetX" value="${shape.shadow.offsetX}" min="0" max="20" />
            </div>
            <div class="input-group">
              <label>Y 偏移</label>
              <input type="number" id="shadowOffsetY" value="${shape.shadow.offsetY}" min="0" max="20" />
            </div>
            <div class="input-group">
              <label>模糊度</label>
              <input type="number" id="shadowBlur" value="${shape.shadow.blur}" min="0" max="20" />
            </div>
            <div class="input-group">
              <label>阴影颜色</label>
              <input type="color" id="shadowColor" value="${this.rgbaToHex(shape.shadow.color)}" />
            </div>
          </div>
        </div>
      </div>

      <div class="panel-section">
        <h4 class="section-title">旋转</h4>
        <div class="rotation-control">
          <input type="range" id="rotationSlider" min="0" max="360" value="${shape.rotation}" />
          <span class="rotation-value">${Math.round(shape.rotation)}°</span>
        </div>
      </div>

      <div class="panel-section">
        <h4 class="section-title">层级</h4>
        <div class="layer-buttons">
          <button class="btn" data-layer="top">置顶</button>
          <button class="btn" data-layer="up">上移</button>
          <button class="btn" data-layer="down">下移</button>
          <button class="btn" data-layer="bottom">置底</button>
        </div>
      </div>

      <div class="panel-section">
        <button class="btn btn-danger btn-block" id="deleteBtn">
          <span class="btn-icon">🗑</span> 删除文字
        </button>
      </div>

      <div class="panel-section">
        <h4 class="section-title">导出</h4>
        <div class="export-buttons">
          <button class="btn btn-primary" id="exportSvgBtn">导出 SVG</button>
          <button class="btn" id="exportPngBtn">导出 PNG</button>
        </div>
      </div>
    `;
    this.bindTextPropertyEvents(shape);
  }

  private renderPalette(selectedColor: string): string {
    return PALETTE.map((color) => {
      const isSelected = color.toLowerCase() === selectedColor.toLowerCase();
      return `<div class="color-swatch ${isSelected ? 'selected' : ''}" style="background-color: ${color};" data-color="${color}"></div>`;
    }).join('');
  }

  private rgbaToHex(rgba: string): string {
    if (rgba.startsWith('#')) return rgba;
    const match = rgba.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
    if (match) {
      const r = parseInt(match[1]);
      const g = parseInt(match[2]);
      const b = parseInt(match[3]);
      return '#' + [r, g, b].map((x) => x.toString(16).padStart(2, '0')).join('');
    }
    return '#000000';
  }

  private bindShapePropertyEvents(shape: Shape): void {
    const palette = this.content.querySelector('#colorPalette');
    if (palette) {
      palette.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;
        if (target.classList.contains('color-swatch')) {
          const color = target.dataset.color;
          if (color) {
            this.canvasController.updateShapeColor(shape.id, color);
            this.updatePaletteSelection(color);
            const colorInput = this.content.querySelector('#colorInput') as HTMLInputElement;
            if (colorInput) colorInput.value = color;
          }
        }
      });
    }

    const colorInput = this.content.querySelector('#colorInput') as HTMLInputElement;
    if (colorInput) {
      colorInput.addEventListener('input', (e) => {
        const color = (e.target as HTMLInputElement).value;
        this.canvasController.updateShapeColor(shape.id, color);
        this.updatePaletteSelection(color);
      });
    }

    const widthInput = this.content.querySelector('#widthInput') as HTMLInputElement;
    const heightInput = this.content.querySelector('#heightInput') as HTMLInputElement;

    if (widthInput) {
      widthInput.addEventListener('change', (e) => {
        const value = parseInt((e.target as HTMLInputElement).value);
        if (!isNaN(value)) {
          this.canvasController.updateShapeSize(shape.id, value, shape.height);
        }
      });
    }

    if (heightInput) {
      heightInput.addEventListener('change', (e) => {
        const value = parseInt((e.target as HTMLInputElement).value);
        if (!isNaN(value)) {
          this.canvasController.updateShapeSize(shape.id, shape.width, value);
        }
      });
    }

    const rotationSlider = this.content.querySelector('#rotationSlider') as HTMLInputElement;
    const rotationValue = this.content.querySelector('.rotation-value') as HTMLElement;
    if (rotationSlider) {
      rotationSlider.addEventListener('input', (e) => {
        const value = parseInt((e.target as HTMLInputElement).value);
        if (rotationValue) rotationValue.textContent = value + '°';
        this.canvasController.updateShapeRotation(shape.id, value);
      });
    }

    this.bindLayerButtons(shape.id);
    this.bindDeleteButton(shape.id);
    this.bindExportButtons();
  }

  private bindTextPropertyEvents(shape: TextShape): void {
    const textInput = this.content.querySelector('#textContentInput') as HTMLInputElement;
    if (textInput) {
      textInput.addEventListener('input', (e) => {
        const value = (e.target as HTMLInputElement).value;
        this.canvasController.updateTextContent(shape.id, value);
      });
    }

    const fontSelect = this.content.querySelector('#fontFamilySelect') as HTMLSelectElement;
    if (fontSelect) {
      fontSelect.addEventListener('change', (e) => {
        const value = (e.target as HTMLSelectElement).value;
        this.canvasController.updateFontFamily(shape.id, value);
      });
    }

    const fontSizeSlider = this.content.querySelector('#fontSizeSlider') as HTMLInputElement;
    const fontSizeValue = this.content.querySelector('.slider-value') as HTMLElement;
    if (fontSizeSlider) {
      fontSizeSlider.addEventListener('input', (e) => {
        const value = parseInt((e.target as HTMLInputElement).value);
        if (fontSizeValue) fontSizeValue.textContent = value + 'px';
        this.canvasController.updateFontSize(shape.id, value);
      });
    }

    const palette = this.content.querySelector('#colorPalette');
    if (palette) {
      palette.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;
        if (target.classList.contains('color-swatch')) {
          const color = target.dataset.color;
          if (color) {
            this.canvasController.updateShapeColor(shape.id, color);
            this.updatePaletteSelection(color);
            const colorInput = this.content.querySelector('#colorInput') as HTMLInputElement;
            if (colorInput) colorInput.value = color;
          }
        }
      });
    }

    const colorInput = this.content.querySelector('#colorInput') as HTMLInputElement;
    if (colorInput) {
      colorInput.addEventListener('input', (e) => {
        const color = (e.target as HTMLInputElement).value;
        this.canvasController.updateShapeColor(shape.id, color);
        this.updatePaletteSelection(color);
      });
    }

    const shadowEnabled = this.content.querySelector('#shadowEnabled') as HTMLInputElement;
    const shadowOptions = this.content.querySelector('.shadow-options') as HTMLElement;
    if (shadowEnabled && shadowOptions) {
      shadowEnabled.addEventListener('change', (e) => {
        const enabled = (e.target as HTMLInputElement).checked;
        shadowOptions.style.display = enabled ? 'block' : 'none';
        this.updateShadow(shape);
      });
    }

    ['shadowOffsetX', 'shadowOffsetY', 'shadowBlur'].forEach((id) => {
      const input = this.content.querySelector('#' + id) as HTMLInputElement;
      if (input) {
        input.addEventListener('input', () => this.updateShadow(shape));
      }
    });

    const shadowColorInput = this.content.querySelector('#shadowColor') as HTMLInputElement;
    if (shadowColorInput) {
      shadowColorInput.addEventListener('input', () => this.updateShadow(shape));
    }

    const rotationSlider = this.content.querySelector('#rotationSlider') as HTMLInputElement;
    const rotationValue = this.content.querySelector('.rotation-value') as HTMLElement;
    if (rotationSlider) {
      rotationSlider.addEventListener('input', (e) => {
        const value = parseInt((e.target as HTMLInputElement).value);
        if (rotationValue) rotationValue.textContent = value + '°';
        this.canvasController.updateShapeRotation(shape.id, value);
      });
    }

    this.bindLayerButtons(shape.id);
    this.bindDeleteButton(shape.id);
    this.bindExportButtons();
  }

  private updateShadow(shape: TextShape): void {
    const enabled = (this.content.querySelector('#shadowEnabled') as HTMLInputElement)?.checked || false;
    const offsetX = parseInt((this.content.querySelector('#shadowOffsetX') as HTMLInputElement)?.value || '2');
    const offsetY = parseInt((this.content.querySelector('#shadowOffsetY') as HTMLInputElement)?.value || '2');
    const blur = parseInt((this.content.querySelector('#shadowBlur') as HTMLInputElement)?.value || '4');
    const colorHex = (this.content.querySelector('#shadowColor') as HTMLInputElement)?.value || '#000000';

    const r = parseInt(colorHex.slice(1, 3), 16);
    const g = parseInt(colorHex.slice(3, 5), 16);
    const b = parseInt(colorHex.slice(5, 7), 16);
    const color = `rgba(${r}, ${g}, ${b}, 0.3)`;

    this.canvasController.updateTextShadow(shape.id, {
      enabled,
      offsetX,
      offsetY,
      blur,
      color,
    });
  }

  private updatePaletteSelection(color: string): void {
    const swatches = this.content.querySelectorAll('.color-swatch');
    swatches.forEach((swatch) => {
      const swatchColor = (swatch as HTMLElement).dataset.color?.toLowerCase();
      if (swatchColor === color.toLowerCase()) {
        swatch.classList.add('selected');
      } else {
        swatch.classList.remove('selected');
      }
    });
  }

  private bindLayerButtons(shapeId: string): void {
    const buttons = this.content.querySelectorAll('[data-layer]');
    buttons.forEach((btn) => {
      btn.addEventListener('click', () => {
        const action = (btn as HTMLElement).dataset.layer;
        switch (action) {
          case 'top':
            this.canvasController.bringToFrontLayer(shapeId);
            break;
          case 'up':
            this.canvasController.moveLayerUp(shapeId);
            break;
          case 'down':
            this.canvasController.moveLayerDown(shapeId);
            break;
          case 'bottom':
            this.canvasController.sendToBackLayer(shapeId);
            break;
        }
      });
    });
  }

  private bindDeleteButton(shapeId: string): void {
    const deleteBtn = this.content.querySelector('#deleteBtn');
    if (deleteBtn) {
      deleteBtn.addEventListener('click', () => {
        this.canvasController.deleteShape(shapeId);
      });
    }
  }

  private bindMultipleSelectionEvents(): void {
    const alignButtons = this.content.querySelectorAll('.align-btn');
    alignButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        const alignType = (btn as HTMLElement).dataset.align;
        if (alignType) {
          this.canvasController.alignShapes(alignType as any);
        }
      });
    });

    const deleteBtn = this.content.querySelector('#deleteBtn');
    if (deleteBtn) {
      deleteBtn.addEventListener('click', () => {
        this.canvasController.deleteSelectedShapes();
      });
    }
  }

  private bindExportButtons(): void {
    const svgBtn = this.content.querySelector('#exportSvgBtn');
    const pngBtn = this.content.querySelector('#exportPngBtn');

    if (svgBtn) {
      svgBtn.addEventListener('click', () => {
        const svgContent = this.canvasController.exportSVG();
        const blob = new Blob([svgContent], { type: 'image/svg+xml' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'logo.svg';
        a.click();
        URL.revokeObjectURL(url);
      });
    }

    if (pngBtn) {
      pngBtn.addEventListener('click', () => {
        const pngData = this.canvasController.exportPNG();
        const a = document.createElement('a');
        a.href = pngData;
        a.download = 'logo.png';
        a.click();
      });
    }
  }

  destroy(): void {
  }
}
