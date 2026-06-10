import { ColorTheme } from './nebula';
import { ControlManager } from './controls';

interface UIOptions {
  container: HTMLElement;
  controlManager: ControlManager;
}

export class UIManager {
  private container: HTMLElement;
  private controlManager: ControlManager;
  private panel: HTMLElement;
  private toggleButton: HTMLElement;
  private panelContent: HTMLElement;
  private isExpanded: boolean = false;
  private isMobile: boolean = false;
  private fullscreenButton?: HTMLElement;
  private isFullscreen: boolean = false;
  
  private densitySlider?: HTMLInputElement;
  private rotationSlider?: HTMLInputElement;
  private densityValue?: HTMLElement;
  private rotationValue?: HTMLElement;
  
  private themeButtons: Map<ColorTheme, HTMLElement> = new Map();
  private activeTheme: ColorTheme = 'aurora';
  
  constructor(options: UIOptions) {
    this.container = options.container;
    this.controlManager = options.controlManager;
    
    this.panel = document.createElement('div');
    this.toggleButton = document.createElement('div');
    this.panelContent = document.createElement('div');
    
    this.checkMobile();
    this.createStyles();
    this.createPanel();
    
    window.addEventListener('resize', this.checkMobile);
  }
  
  private createStyles(): void {
    const style = document.createElement('style');
    style.textContent = `
      .nebula-panel {
        position: fixed;
        background: rgba(10, 10, 30, 0.75);
        border: 1px solid rgba(68, 68, 255, 0.27);
        border-radius: 12px;
        backdrop-filter: blur(10px);
        -webkit-backdrop-filter: blur(10px);
        color: #ffffff;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        z-index: 100;
        transition: all 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94);
        overflow: hidden;
        user-select: none;
      }
      
      .nebula-panel.desktop {
        top: 20px;
        left: 20px;
        height: auto;
        min-height: 60px;
      }
      
      .nebula-panel.desktop.collapsed {
        width: 40px;
      }
      
      .nebula-panel.desktop.expanded {
        width: 260px;
      }
      
      .nebula-panel.mobile {
        bottom: 0;
        left: 0;
        right: 0;
        border-radius: 16px 16px 0 0;
        border-bottom: none;
        height: auto;
      }
      
      .nebula-panel.mobile.collapsed {
        height: 50px;
      }
      
      .nebula-panel.mobile.expanded {
        height: 55vh;
      }
      
      .nebula-panel.mobile.fullscreen {
        height: 92vh;
      }
      
      .panel-toggle {
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        transition: background 0.2s ease;
      }
      
      .desktop .panel-toggle {
        width: 100%;
        height: 60px;
        border-right: none;
      }
      
      .mobile .panel-toggle {
        width: 100%;
        height: 50px;
      }
      
      .panel-toggle:hover {
        background: rgba(68, 136, 255, 0.2);
      }
      
      .toggle-arrow {
        width: 12px;
        height: 12px;
        border-right: 2px solid #4488ff;
        border-bottom: 2px solid #4488ff;
        transition: transform 0.3s ease;
      }
      
      .desktop.collapsed .toggle-arrow {
        transform: rotate(-45deg);
      }
      
      .desktop.expanded .toggle-arrow {
        transform: rotate(135deg);
      }
      
      .mobile.collapsed .toggle-arrow {
        transform: rotate(-135deg);
      }
      
      .mobile.expanded .toggle-arrow,
      .mobile.fullscreen .toggle-arrow {
        transform: rotate(45deg);
      }
      
      .panel-content {
        padding: 20px;
        opacity: 0;
        transition: opacity 0.2s ease;
        pointer-events: none;
      }
      
      .expanded .panel-content,
      .fullscreen .panel-content {
        opacity: 1;
        pointer-events: auto;
      }
      
      .panel-title {
        font-size: 16px;
        font-weight: 600;
        margin-bottom: 20px;
        color: #66aaff;
        display: flex;
        align-items: center;
        justify-content: space-between;
      }
      
      .fullscreen-btn {
        background: rgba(68, 136, 255, 0.3);
        border: none;
        color: #fff;
        width: 28px;
        height: 28px;
        border-radius: 6px;
        cursor: pointer;
        display: none;
        align-items: center;
        justify-content: center;
        font-size: 14px;
        transition: background 0.2s ease;
      }
      
      .mobile .fullscreen-btn {
        display: flex;
      }
      
      .fullscreen-btn:hover {
        background: rgba(68, 136, 255, 0.5);
      }
      
      .control-group {
        margin-bottom: 20px;
      }
      
      .control-label {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 8px;
        font-size: 13px;
        color: #aabbcc;
      }
      
      .control-value {
        color: #66aaff;
        font-weight: 600;
        font-variant-numeric: tabular-nums;
      }
      
      input[type="range"] {
        -webkit-appearance: none;
        appearance: none;
        width: 100%;
        height: 4px;
        background: #334466;
        border-radius: 2px;
        outline: none;
        cursor: pointer;
      }
      
      input[type="range"]::-webkit-slider-thumb {
        -webkit-appearance: none;
        appearance: none;
        width: 12px;
        height: 12px;
        border-radius: 50%;
        background: #4488ff;
        cursor: pointer;
        transition: background 0.2s ease;
      }
      
      input[type="range"]::-webkit-slider-thumb:hover {
        background: #88bbff;
      }
      
      input[type="range"]::-moz-range-thumb {
        width: 12px;
        height: 12px;
        border-radius: 50%;
        background: #4488ff;
        cursor: pointer;
        border: none;
        transition: background 0.2s ease;
      }
      
      input[type="range"]::-moz-range-thumb:hover {
        background: #88bbff;
      }
      
      .theme-buttons {
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
      }
      
      .theme-btn {
        flex: 1;
        min-width: 70px;
        padding: 10px 12px;
        border: 1px solid rgba(68, 136, 255, 0.4);
        border-radius: 8px;
        background: rgba(68, 136, 255, 0.1);
        color: #ffffff;
        font-size: 12px;
        cursor: pointer;
        transition: all 0.2s ease;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 4px;
      }
      
      .theme-btn:hover {
        background: rgba(68, 136, 255, 0.3);
        border-color: #4488ff;
      }
      
      .theme-btn.active {
        background: #4488ff;
        border-color: #66aaff;
      }
      
      .theme-swatch {
        width: 24px;
        height: 8px;
        border-radius: 4px;
      }
      
      .theme-btn[data-theme="aurora"] .theme-swatch {
        background: linear-gradient(90deg, #00ffaa, #0066ff);
      }
      
      .theme-btn[data-theme="nebula"] .theme-swatch {
        background: linear-gradient(90deg, #ff44aa, #8844ff);
      }
      
      .theme-btn[data-theme="solar"] .theme-swatch {
        background: linear-gradient(90deg, #ffdd44, #ff6622);
      }
      
      .reset-btn {
        width: 100%;
        padding: 12px;
        border: none;
        border-radius: 8px;
        background: #4488ff;
        color: #ffffff;
        font-size: 14px;
        font-weight: 600;
        cursor: pointer;
        transition: background 0.2s ease;
      }
      
      .reset-btn:hover {
        background: #66aaff;
      }
      
      .reset-btn:active {
        transform: scale(0.98);
      }
      
      .hint-text {
        font-size: 11px;
        color: #667788;
        text-align: center;
        margin-top: 16px;
        line-height: 1.5;
      }
    `;
    document.head.appendChild(style);
  }
  
  private checkMobile = (): void => {
    const wasMobile = this.isMobile;
    this.isMobile = window.innerWidth < 768;
    
    if (wasMobile !== this.isMobile) {
      this.updatePanelLayout();
    }
  };
  
  private createPanel(): void {
    this.panel.className = 'nebula-panel';
    this.toggleButton.className = 'panel-toggle';
    
    const arrow = document.createElement('div');
    arrow.className = 'toggle-arrow';
    this.toggleButton.appendChild(arrow);
    
    this.panel.appendChild(this.toggleButton);
    
    this.panelContent.className = 'panel-content';
    this.createPanelContent();
    this.panel.appendChild(this.panelContent);
    
    this.container.appendChild(this.panel);
    
    this.toggleButton.addEventListener('click', this.togglePanel);
    
    this.updatePanelLayout();
  }
  
  private createPanelContent(): void {
    const title = document.createElement('div');
    title.className = 'panel-title';
    title.innerHTML = '<span>星云控制台</span>';
    
    this.fullscreenButton = document.createElement('button');
    this.fullscreenButton.className = 'fullscreen-btn';
    this.fullscreenButton.innerHTML = '⛶';
    this.fullscreenButton.title = '全屏';
    this.fullscreenButton.addEventListener('click', this.toggleFullscreen);
    title.appendChild(this.fullscreenButton);
    
    this.panelContent.appendChild(title);
    
    this.createDensityControl();
    this.createRotationControl();
    this.createThemeControl();
    this.createResetButton();
    
    const hint = document.createElement('div');
    hint.className = 'hint-text';
    hint.textContent = '拖拽旋转视角 · 滚轮缩放 · 悬停粒子触发脉冲';
    this.panelContent.appendChild(hint);
  }
  
  private createDensityControl(): void {
    const group = document.createElement('div');
    group.className = 'control-group';
    
    const label = document.createElement('div');
    label.className = 'control-label';
    label.innerHTML = '<span>星云密度</span>';
    
    this.densityValue = document.createElement('span');
    this.densityValue.className = 'control-value';
    this.densityValue.textContent = '1.0';
    label.appendChild(this.densityValue);
    
    this.densitySlider = document.createElement('input');
    this.densitySlider.type = 'range';
    this.densitySlider.min = '0.5';
    this.densitySlider.max = '2.0';
    this.densitySlider.step = '0.1';
    this.densitySlider.value = '1.0';
    
    this.densitySlider.addEventListener('input', () => {
      const value = parseFloat(this.densitySlider!.value);
      this.densityValue!.textContent = value.toFixed(1);
      this.controlManager.setDensity(value);
    });
    
    group.appendChild(label);
    group.appendChild(this.densitySlider);
    this.panelContent.appendChild(group);
  }
  
  private createRotationControl(): void {
    const group = document.createElement('div');
    group.className = 'control-group';
    
    const label = document.createElement('div');
    label.className = 'control-label';
    label.innerHTML = '<span>旋转速度</span>';
    
    this.rotationValue = document.createElement('span');
    this.rotationValue.className = 'control-value';
    this.rotationValue.textContent = '1.0';
    label.appendChild(this.rotationValue);
    
    this.rotationSlider = document.createElement('input');
    this.rotationSlider.type = 'range';
    this.rotationSlider.min = '0';
    this.rotationSlider.max = '3';
    this.rotationSlider.step = '0.1';
    this.rotationSlider.value = '1.0';
    
    this.rotationSlider.addEventListener('input', () => {
      const value = parseFloat(this.rotationSlider!.value);
      this.rotationValue!.textContent = value.toFixed(1);
      this.controlManager.setRotationSpeed(value);
    });
    
    group.appendChild(label);
    group.appendChild(this.rotationSlider);
    this.panelContent.appendChild(group);
  }
  
  private createThemeControl(): void {
    const group = document.createElement('div');
    group.className = 'control-group';
    
    const label = document.createElement('div');
    label.className = 'control-label';
    label.innerHTML = '<span>颜色主题</span>';
    group.appendChild(label);
    
    const buttonContainer = document.createElement('div');
    buttonContainer.className = 'theme-buttons';
    
    const themes: { key: ColorTheme; name: string }[] = [
      { key: 'aurora', name: '极光蓝绿' },
      { key: 'nebula', name: '星云紫红' },
      { key: 'solar', name: '太阳金黄' }
    ];
    
    themes.forEach(({ key, name }) => {
      const btn = document.createElement('button');
      btn.className = 'theme-btn';
      btn.dataset.theme = key;
      
      if (key === this.activeTheme) {
        btn.classList.add('active');
      }
      
      const swatch = document.createElement('div');
      swatch.className = 'theme-swatch';
      
      const text = document.createElement('span');
      text.textContent = name;
      
      btn.appendChild(swatch);
      btn.appendChild(text);
      
      btn.addEventListener('click', () => this.setTheme(key));
      
      this.themeButtons.set(key, btn);
      buttonContainer.appendChild(btn);
    });
    
    group.appendChild(buttonContainer);
    this.panelContent.appendChild(group);
  }
  
  private createResetButton(): void {
    const btn = document.createElement('button');
    btn.className = 'reset-btn';
    btn.textContent = '重置星云';
    
    btn.addEventListener('click', () => {
      this.controlManager.reset();
      this.updateUIFromParams();
    });
    
    this.panelContent.appendChild(btn);
  }
  
  private updatePanelLayout(): void {
    this.panel.classList.remove('desktop', 'mobile', 'collapsed', 'expanded', 'fullscreen');
    
    if (this.isMobile) {
      this.panel.classList.add('mobile');
      this.panel.classList.add(this.isExpanded ? (this.isFullscreen ? 'fullscreen' : 'expanded') : 'collapsed');
    } else {
      this.panel.classList.add('desktop');
      this.panel.classList.add(this.isExpanded ? 'expanded' : 'collapsed');
      this.isFullscreen = false;
    }
  }
  
  private togglePanel = (): void => {
    this.isExpanded = !this.isExpanded;
    if (!this.isExpanded) {
      this.isFullscreen = false;
    }
    this.updatePanelLayout();
  };
  
  private toggleFullscreen = (): void => {
    this.isFullscreen = !this.isFullscreen;
    this.isExpanded = true;
    this.updatePanelLayout();
  };
  
  private setTheme(theme: ColorTheme): void {
    this.activeTheme = theme;
    
    this.themeButtons.forEach((btn, key) => {
      if (key === theme) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });
    
    this.controlManager.setColorTheme(theme);
  }
  
  private updateUIFromParams(): void {
    const params = this.controlManager.getParams();
    
    if (this.densitySlider && this.densityValue) {
      this.densitySlider.value = params.density.toString();
      this.densityValue.textContent = params.density.toFixed(1);
    }
    
    if (this.rotationSlider && this.rotationValue) {
      this.rotationSlider.value = params.rotationSpeed.toString();
      this.rotationValue.textContent = params.rotationSpeed.toFixed(1);
    }
    
    this.setTheme(params.colorTheme);
  }
  
  dispose(): void {
    window.removeEventListener('resize', this.checkMobile);
    this.toggleButton.removeEventListener('click', this.togglePanel);
    if (this.fullscreenButton) {
      this.fullscreenButton.removeEventListener('click', this.toggleFullscreen);
    }
    this.panel.remove();
  }
}
