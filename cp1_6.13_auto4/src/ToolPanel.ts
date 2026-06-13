export type ThemeColor = 'deepBlue' | 'violet' | 'teal' | 'roseGold' | 'amber' | 'galaxyWhite';
export type DoodleShape = 'circle' | 'triangle' | 'star';

export interface ToolPanelOptions {
  onColorSelect?: (color: ThemeColor) => void;
  onDoodleSelect?: (shape: DoodleShape) => void;
}

export const THEME_COLORS: Record<ThemeColor, string> = {
  deepBlue: '#1e3a5f',
  violet: '#7c3aed',
  teal: '#0d9488',
  roseGold: '#b76e79',
  amber: '#f59e0b',
  galaxyWhite: '#f0f4ff'
};

export const COLOR_NAMES: Record<ThemeColor, string> = {
  deepBlue: '深蓝',
  violet: '紫罗兰',
  teal: '青绿',
  roseGold: '玫瑰金',
  amber: '琥珀黄',
  galaxyWhite: '银河白'
};

export class ToolPanel {
  public panelElement: HTMLDivElement;
  private selectedColor: ThemeColor = 'deepBlue';
  private selectedShape: DoodleShape = 'circle';
  private options: ToolPanelOptions;
  private colorButtons: Map<ThemeColor, HTMLButtonElement> = new Map();
  private shapeButtons: Map<DoodleShape, HTMLButtonElement> = new Map();

  constructor(options: ToolPanelOptions = {}) {
    this.options = options;
    this.panelElement = this.createPanel();
  }

  private createPanel(): HTMLDivElement {
    const panel = document.createElement('div');
    panel.style.cssText = `
      width: 280px;
      padding: 24px;
      background: rgba(20, 20, 50, 0.6);
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
      border-radius: 20px;
      border: 1px solid rgba(255, 255, 255, 0.15);
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
      pointer-events: auto;
      user-select: none;
    `;

    const title = document.createElement('h3');
    title.textContent = '调色盘';
    title.style.cssText = `
      color: #ffffff;
      font-size: 18px;
      font-weight: 600;
      margin-bottom: 16px;
      text-align: center;
      letter-spacing: 2px;
    `;
    panel.appendChild(title);

    const colorSection = document.createElement('div');
    colorSection.style.cssText = `
      margin-bottom: 24px;
    `;

    const colorLabel = document.createElement('div');
    colorLabel.textContent = '主题色';
    colorLabel.style.cssText = `
      color: rgba(255, 255, 255, 0.7);
      font-size: 13px;
      margin-bottom: 12px;
    `;
    colorSection.appendChild(colorLabel);

    const colorGrid = document.createElement('div');
    colorGrid.style.cssText = `
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 12px;
    `;

    const colors: ThemeColor[] = ['deepBlue', 'violet', 'teal', 'roseGold', 'amber', 'galaxyWhite'];
    colors.forEach(color => {
      const btn = this.createColorButton(color);
      colorGrid.appendChild(btn);
      this.colorButtons.set(color, btn);
    });
    colorSection.appendChild(colorGrid);
    panel.appendChild(colorSection);

    const shapeSection = document.createElement('div');
    shapeSection.style.cssText = `
      margin-bottom: 20px;
    `;

    const shapeLabel = document.createElement('div');
    shapeLabel.textContent = '涂鸦标记';
    shapeLabel.style.cssText = `
      color: rgba(255, 255, 255, 0.7);
      font-size: 13px;
      margin-bottom: 12px;
    `;
    shapeSection.appendChild(shapeLabel);

    const shapeGrid = document.createElement('div');
    shapeGrid.style.cssText = `
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 12px;
    `;

    const shapes: DoodleShape[] = ['circle', 'triangle', 'star'];
    shapes.forEach(shape => {
      const btn = this.createShapeButton(shape);
      shapeGrid.appendChild(btn);
      this.shapeButtons.set(shape, btn);
    });
    shapeSection.appendChild(shapeGrid);
    panel.appendChild(shapeSection);

    const infoSection = document.createElement('div');
    infoSection.style.cssText = `
      padding-top: 16px;
      border-top: 1px solid rgba(255, 255, 255, 0.1);
    `;

    const hint1 = document.createElement('div');
    hint1.textContent = '• 左键点击星星连线';
    hint1.style.cssText = `
      color: rgba(255, 255, 255, 0.5);
      font-size: 11px;
      line-height: 1.8;
    `;
    infoSection.appendChild(hint1);

    const hint2 = document.createElement('div');
    hint2.textContent = '• 右键清空所有连线';
    hint2.style.cssText = `
      color: rgba(255, 255, 255, 0.5);
      font-size: 11px;
      line-height: 1.8;
    `;
    infoSection.appendChild(hint2);

    const hint3 = document.createElement('div');
    hint3.textContent = '• 双击星星添加涂鸦标记';
    hint3.style.cssText = `
      color: rgba(255, 255, 255, 0.5);
      font-size: 11px;
      line-height: 1.8;
    `;
    infoSection.appendChild(hint3);

    panel.appendChild(infoSection);

    this.updateColorSelection(this.selectedColor);
    this.updateShapeSelection(this.selectedShape);

    return panel;
  }

  private createColorButton(color: ThemeColor): HTMLButtonElement {
    const btn = document.createElement('button');
    const colorValue = THEME_COLORS[color];
    const colorName = COLOR_NAMES[color];

    btn.style.cssText = `
      width: 100%;
      aspect-ratio: 1;
      border-radius: 12px;
      border: 2px solid transparent;
      background: ${colorValue};
      cursor: pointer;
      transition: all 0.3s ease;
      position: relative;
      overflow: hidden;
    `;

    const nameLabel = document.createElement('span');
    nameLabel.textContent = colorName;
    nameLabel.style.cssText = `
      position: absolute;
      bottom: 4px;
      left: 50%;
      transform: translateX(-50%);
      font-size: 10px;
      color: ${color === 'galaxyWhite' || color === 'amber' ? '#333' : '#fff'};
      opacity: 0.9;
      white-space: nowrap;
    `;
    btn.appendChild(nameLabel);

    btn.addEventListener('mouseenter', () => {
      btn.style.transform = 'translateY(-2px)';
      btn.style.boxShadow = `0 0 20px ${colorValue}80`;
    });

    btn.addEventListener('mouseleave', () => {
      if (this.selectedColor !== color) {
        btn.style.transform = 'translateY(0)';
        btn.style.boxShadow = 'none';
      }
    });

    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.selectColor(color);
    });

    return btn;
  }

  private createShapeButton(shape: DoodleShape): HTMLButtonElement {
    const btn = document.createElement('button');
    btn.style.cssText = `
      width: 100%;
      aspect-ratio: 1;
      border-radius: 12px;
      border: 2px solid rgba(255, 255, 255, 0.2);
      background: rgba(255, 255, 255, 0.05);
      cursor: pointer;
      transition: all 0.3s ease;
      display: flex;
      align-items: center;
      justify-content: center;
    `;

    const icon = document.createElement('div');
    icon.innerHTML = this.getShapeSVG(shape);
    icon.style.cssText = `
      width: 32px;
      height: 32px;
      opacity: 0.8;
      transition: transform 0.3s ease;
    `;
    btn.appendChild(icon);

    btn.addEventListener('mouseenter', () => {
      btn.style.transform = 'translateY(-2px)';
      btn.style.boxShadow = '0 0 20px rgba(100, 150, 255, 0.5)';
      btn.style.borderColor = 'rgba(100, 150, 255, 0.6)';
      icon.style.transform = 'scale(1.1)';
    });

    btn.addEventListener('mouseleave', () => {
      if (this.selectedShape !== shape) {
        btn.style.transform = 'translateY(0)';
        btn.style.boxShadow = 'none';
        btn.style.borderColor = 'rgba(255, 255, 255, 0.2)';
        icon.style.transform = 'scale(1)';
      }
    });

    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.selectShape(shape);
    });

    return btn;
  }

  private getShapeSVG(shape: DoodleShape): string {
    const color = THEME_COLORS[this.selectedColor];
    switch (shape) {
      case 'circle':
        return `<svg viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2.5">
          <circle cx="12" cy="12" r="9"/>
        </svg>`;
      case 'triangle':
        return `<svg viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2.5">
          <polygon points="12,3 21,20 3,20"/>
        </svg>`;
      case 'star':
        return `<svg viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2.5">
          <polygon points="12,2 15,9 22,9.5 17,14.5 19,22 12,17.5 5,22 7,14.5 2,9.5 9,9"/>
        </svg>`;
    }
  }

  private selectColor(color: ThemeColor): void {
    this.selectedColor = color;
    this.updateColorSelection(color);
    this.updateShapeIcons();
    this.options.onColorSelect?.(color);
  }

  private selectShape(shape: DoodleShape): void {
    this.selectedShape = shape;
    this.updateShapeSelection(shape);
    this.options.onDoodleSelect?.(shape);
  }

  private updateColorSelection(color: ThemeColor): void {
    this.colorButtons.forEach((btn, c) => {
      if (c === color) {
        btn.style.borderColor = '#ffffff';
        btn.style.boxShadow = `0 0 25px ${THEME_COLORS[c]}ff`;
        btn.style.transform = 'translateY(-2px)';
      } else {
        btn.style.borderColor = 'transparent';
        btn.style.boxShadow = 'none';
        btn.style.transform = 'translateY(0)';
      }
    });
  }

  private updateShapeSelection(shape: DoodleShape): void {
    this.shapeButtons.forEach((btn, s) => {
      if (s === shape) {
        btn.style.borderColor = THEME_COLORS[this.selectedColor];
        btn.style.background = `${THEME_COLORS[this.selectedColor]}20`;
        btn.style.boxShadow = `0 0 20px ${THEME_COLORS[this.selectedColor]}60`;
        btn.style.transform = 'translateY(-2px)';
      } else {
        btn.style.borderColor = 'rgba(255, 255, 255, 0.2)';
        btn.style.background = 'rgba(255, 255, 255, 0.05)';
        btn.style.boxShadow = 'none';
        btn.style.transform = 'translateY(0)';
      }
    });
  }

  private updateShapeIcons(): void {
    this.shapeButtons.forEach((btn, shape) => {
      const icon = btn.querySelector('div');
      if (icon) {
        icon.innerHTML = this.getShapeSVG(shape);
      }
    });
  }

  public getSelectedColor(): ThemeColor {
    return this.selectedColor;
  }

  public getSelectedShape(): DoodleShape {
    return this.selectedShape;
  }

  public getSelectedColorHex(): string {
    return THEME_COLORS[this.selectedColor];
  }
}
