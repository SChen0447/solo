import { BrushType, LightEffectType } from './CanvasRender';

export interface ToolbarCallbacks {
  onBrushChange: (type: BrushType) => void;
  onColorChange: (color: string) => void;
  onLightEffectChange: (effect: LightEffectType) => void;
}

const SAND_COLORS: { name: string; value: string }[] = [
  { name: '金色', value: '#FFD700' },
  { name: '银白', value: '#C0C0C0' },
  { name: '沙漠黄', value: '#D4A76A' },
  { name: '熔岩红', value: '#E04A3A' },
  { name: '海蓝', value: '#1E90FF' },
  { name: '森林绿', value: '#228B22' },
  { name: '薰衣草紫', value: '#967BB6' },
  { name: '珊瑚粉', value: '#FF7F7F' },
  { name: '石墨灰', value: '#4A4A4A' },
  { name: '象牙白', value: '#FFFFF0' }
];

const BRUSH_CONFIGS: { type: BrushType; name: string; icon: string }[] = [
  { type: 'sand', name: '沙画笔', icon: '●' },
  { type: 'spray', name: '喷沙枪', icon: '✦' },
  { type: 'scraper', name: '刮沙器', icon: '▬' }
];

const LIGHT_EFFECTS: { type: LightEffectType; name: string }[] = [
  { type: 'sunrise', name: '日出' },
  { type: 'moonlight', name: '月光' },
  { type: 'aurora', name: '极光' },
  { type: 'none', name: '无' }
];

export class Toolbar {
  private container: HTMLElement;
  private callbacks: ToolbarCallbacks;
  private currentBrush: BrushType = 'sand';
  private currentColor: string = '#FFD700';
  private currentLightEffect: LightEffectType = 'none';
  private lightEffectPanel: HTMLElement | null = null;
  private isLightPanelOpen: boolean = false;

  constructor(container: HTMLElement, callbacks: ToolbarCallbacks) {
    this.container = container;
    this.callbacks = callbacks;
    this.createLeftToolbar();
    this.createBottomToolbar();
    this.createLightEffectButton();
  }

  private createLeftToolbar(): void {
    const toolbar = document.createElement('div');
    toolbar.style.cssText = `
      position: fixed;
      left: 20px;
      top: 50%;
      transform: translateY(-50%);
      width: 240px;
      background: rgba(255, 255, 255, 0.08);
      backdrop-filter: blur(10px);
      -webkit-backdrop-filter: blur(10px);
      border-radius: 16px;
      padding: 20px 16px;
      z-index: 100;
      border: 1px solid rgba(255, 255, 255, 0.1);
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
    `;

    const title = document.createElement('div');
    title.textContent = '画笔工具';
    title.style.cssText = `
      color: rgba(255, 255, 255, 0.9);
      font-size: 14px;
      font-weight: 600;
      margin-bottom: 16px;
      text-align: center;
      letter-spacing: 1px;
    `;
    toolbar.appendChild(title);

    for (const brush of BRUSH_CONFIGS) {
      const btn = document.createElement('div');
      btn.dataset.brush = brush.type;
      btn.style.cssText = `
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 12px 16px;
        margin-bottom: 10px;
        background: rgba(255, 255, 255, 0.05);
        border-radius: 10px;
        cursor: pointer;
        color: rgba(255, 255, 255, 0.8);
        font-size: 14px;
        transition: all 0.2s ease;
        border: 1px solid transparent;
      `;

      if (brush.type === this.currentBrush) {
        btn.style.background = 'rgba(255, 255, 255, 0.18)';
        btn.style.borderColor = 'rgba(255, 255, 255, 0.3)';
        btn.style.boxShadow = '0 0 12px rgba(255, 255, 255, 0.1)';
      }

      const icon = document.createElement('span');
      icon.textContent = brush.icon;
      icon.style.cssText = `
        font-size: 18px;
        width: 24px;
        text-align: center;
      `;
      btn.appendChild(icon);

      const label = document.createElement('span');
      label.textContent = brush.name;
      btn.appendChild(label);

      btn.addEventListener('mouseenter', () => {
        if (brush.type !== this.currentBrush) {
          btn.style.background = 'rgba(255, 255, 255, 0.1)';
        }
      });
      btn.addEventListener('mouseleave', () => {
        if (brush.type !== this.currentBrush) {
          btn.style.background = 'rgba(255, 255, 255, 0.05)';
        }
      });

      btn.addEventListener('click', () => this.selectBrush(brush.type));

      toolbar.appendChild(btn);
    }

    this.container.appendChild(toolbar);
  }

  private selectBrush(type: BrushType): void {
    if (this.currentBrush === type) return;
    this.currentBrush = type;
    this.callbacks.onBrushChange(type);

    const buttons = this.container.querySelectorAll<HTMLElement>('[data-brush]');
    buttons.forEach(btn => {
      if (btn.dataset.brush === type) {
        btn.style.background = 'rgba(255, 255, 255, 0.18)';
        btn.style.borderColor = 'rgba(255, 255, 255, 0.3)';
        btn.style.boxShadow = '0 0 12px rgba(255, 255, 255, 0.1)';
      } else {
        btn.style.background = 'rgba(255, 255, 255, 0.05)';
        btn.style.borderColor = 'transparent';
        btn.style.boxShadow = 'none';
      }
    });
  }

  private createBottomToolbar(): void {
    const toolbar = document.createElement('div');
    toolbar.style.cssText = `
      position: fixed;
      bottom: 20px;
      left: 50%;
      transform: translateX(-50%);
      height: 80px;
      background: rgba(255, 255, 255, 0.08);
      backdrop-filter: blur(10px);
      -webkit-backdrop-filter: blur(10px);
      border-radius: 16px;
      padding: 0 24px;
      z-index: 100;
      border: 1px solid rgba(255, 255, 255, 0.1);
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
      display: flex;
      align-items: center;
      gap: 12px;
    `;

    for (const color of SAND_COLORS) {
      const btn = document.createElement('div');
      btn.dataset.color = color.value;
      btn.title = color.name;
      btn.style.cssText = `
        width: 40px;
        height: 40px;
        border-radius: 10px;
        background: ${color.value};
        cursor: pointer;
        transition: all 0.2s ease;
        border: 2px solid transparent;
      `;

      if (color.value === this.currentColor) {
        btn.style.borderColor = '#ffffff';
        btn.style.boxShadow = '0 0 0 4px rgba(255, 255, 255, 0.2), 0 4px 12px rgba(0, 0, 0, 0.3)';
        btn.style.transform = 'translateY(-4px)';
      }

      btn.addEventListener('mouseenter', () => {
        if (btn.dataset.color !== this.currentColor) {
          btn.style.transform = 'translateY(-2px)';
        }
      });
      btn.addEventListener('mouseleave', () => {
        if (btn.dataset.color !== this.currentColor) {
          btn.style.transform = 'translateY(0)';
        }
      });

      btn.addEventListener('click', () => this.selectColor(color.value));

      toolbar.appendChild(btn);
    }

    this.container.appendChild(toolbar);
  }

  private selectColor(color: string): void {
    if (this.currentColor === color) return;
    this.currentColor = color;
    this.callbacks.onColorChange(color);

    const buttons = this.container.querySelectorAll<HTMLElement>('[data-color]');
    buttons.forEach(btn => {
      if (btn.dataset.color === color) {
        btn.style.borderColor = '#ffffff';
        btn.style.boxShadow = '0 0 0 4px rgba(255, 255, 255, 0.2), 0 4px 12px rgba(0, 0, 0, 0.3)';
        btn.style.transform = 'translateY(-4px)';
      } else {
        btn.style.borderColor = 'transparent';
        btn.style.boxShadow = 'none';
        btn.style.transform = 'translateY(0)';
      }
    });
  }

  private createLightEffectButton(): void {
    const btn = document.createElement('div');
    btn.id = 'light-effect-btn';
    btn.textContent = '光效';
    btn.style.cssText = `
      position: fixed;
      right: 20px;
      bottom: 20px;
      width: 64px;
      height: 64px;
      background: rgba(255, 255, 255, 0.08);
      backdrop-filter: blur(10px);
      -webkit-backdrop-filter: blur(10px);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      color: rgba(255, 255, 255, 0.9);
      font-size: 14px;
      cursor: pointer;
      z-index: 100;
      border: 1px solid rgba(255, 255, 255, 0.15);
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
      transition: all 0.2s ease;
      user-select: none;
    `;

    btn.addEventListener('mouseenter', () => {
      btn.style.background = 'rgba(255, 255, 255, 0.15)';
      btn.style.transform = 'scale(1.05)';
    });
    btn.addEventListener('mouseleave', () => {
      btn.style.background = 'rgba(255, 255, 255, 0.08)';
      btn.style.transform = 'scale(1)';
    });

    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.toggleLightEffectPanel();
    });

    this.container.appendChild(btn);

    document.addEventListener('click', (e) => {
      if (this.isLightPanelOpen && this.lightEffectPanel && !this.lightEffectPanel.contains(e.target as Node) && e.target !== btn) {
        this.closeLightEffectPanel();
      }
    });
  }

  private toggleLightEffectPanel(): void {
    if (this.isLightPanelOpen) {
      this.closeLightEffectPanel();
    } else {
      this.openLightEffectPanel();
    }
  }

  private openLightEffectPanel(): void {
    if (this.lightEffectPanel) return;

    this.isLightPanelOpen = true;

    const panel = document.createElement('div');
    panel.style.cssText = `
      position: fixed;
      right: 20px;
      bottom: 96px;
      background: rgba(255, 255, 255, 0.08);
      backdrop-filter: blur(10px);
      -webkit-backdrop-filter: blur(10px);
      border-radius: 16px;
      padding: 12px;
      z-index: 100;
      border: 1px solid rgba(255, 255, 255, 0.1);
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
      display: flex;
      flex-direction: column;
      gap: 8px;
      opacity: 0;
      transform: translateY(10px);
      transition: opacity 0.2s ease, transform 0.2s ease;
    `;

    for (const effect of LIGHT_EFFECTS) {
      const btn = document.createElement('div');
      btn.dataset.effect = effect.type;
      btn.textContent = effect.name;
      btn.style.cssText = `
        padding: 10px 24px;
        background: rgba(255, 255, 255, 0.05);
        border-radius: 8px;
        cursor: pointer;
        color: rgba(255, 255, 255, 0.85);
        font-size: 14px;
        text-align: center;
        transition: all 0.2s ease;
        min-width: 80px;
        border: 1px solid transparent;
      `;

      if (effect.type === this.currentLightEffect) {
        btn.style.background = 'rgba(255, 255, 255, 0.18)';
        btn.style.borderColor = 'rgba(255, 255, 255, 0.3)';
      }

      btn.addEventListener('mouseenter', () => {
        if (btn.dataset.effect !== this.currentLightEffect) {
          btn.style.background = 'rgba(255, 255, 255, 0.1)';
        }
      });
      btn.addEventListener('mouseleave', () => {
        if (btn.dataset.effect !== this.currentLightEffect) {
          btn.style.background = 'rgba(255, 255, 255, 0.05)';
        }
      });

      btn.addEventListener('click', () => {
        this.selectLightEffect(effect.type);
      });

      panel.appendChild(btn);
    }

    this.container.appendChild(panel);
    this.lightEffectPanel = panel;

    requestAnimationFrame(() => {
      panel.style.opacity = '1';
      panel.style.transform = 'translateY(0)';
    });
  }

  private closeLightEffectPanel(): void {
    if (!this.lightEffectPanel) return;
    this.isLightPanelOpen = false;

    const panel = this.lightEffectPanel;
    panel.style.opacity = '0';
    panel.style.transform = 'translateY(10px)';

    setTimeout(() => {
      if (panel.parentNode) {
        panel.parentNode.removeChild(panel);
      }
      this.lightEffectPanel = null;
    }, 200);
  }

  private selectLightEffect(effect: LightEffectType): void {
    this.currentLightEffect = effect;
    this.callbacks.onLightEffectChange(effect);

    if (this.lightEffectPanel) {
      const buttons = this.lightEffectPanel.querySelectorAll<HTMLElement>('[data-effect]');
      buttons.forEach(btn => {
        if (btn.dataset.effect === effect) {
          btn.style.background = 'rgba(255, 255, 255, 0.18)';
          btn.style.borderColor = 'rgba(255, 255, 255, 0.3)';
        } else {
          btn.style.background = 'rgba(255, 255, 255, 0.05)';
          btn.style.borderColor = 'transparent';
        }
      });
    }
  }
}
