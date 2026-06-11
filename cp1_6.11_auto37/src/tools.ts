import { SignShape, AnimationMode } from './neonSign';

export interface ToolCallbacks {
  onShapeSelect: (shape: SignShape) => void;
  onColorChange: (color: string) => void;
  onBorderWidthChange: (width: number) => void;
  onAnimationModeChange: (mode: AnimationMode) => void;
  onBreathePeriodChange: (period: number) => void;
  onChaseSpeedChange: (speed: number) => void;
  onExport: () => void;
  onClear: () => void;
  onTextChange: (text: string) => void;
  onFontChange: (font: string) => void;
  onFontSizeChange: (size: number) => void;
  onDeleteSign: () => void;
}

export class ToolsPanel {
  private callbacks: Partial<ToolCallbacks> = {};
  private toolPanel: HTMLElement;
  private propPanel: HTMLElement;
  private mobileToolbar: HTMLElement;
  private currentShape: SignShape = 'rect';
  private currentColor: string = '#00ffff';
  private currentBorderWidth: number = 3;
  private currentAnimMode: AnimationMode = 'static';

  private propX: HTMLElement | null = null;
  private propY: HTMLElement | null = null;
  private propW: HTMLElement | null = null;
  private propH: HTMLElement | null = null;
  private propR: HTMLElement | null = null;
  private propAnimMode: HTMLSelectElement | null = null;
  private propBreathePeriod: HTMLInputElement | null = null;
  private propChaseSpeed: HTMLInputElement | null = null;
  private propTextSection: HTMLElement | null = null;
  private propTextInput: HTMLInputElement | null = null;
  private propFontSelect: HTMLSelectElement | null = null;
  private propFontSize: HTMLInputElement | null = null;

  constructor() {
    this.toolPanel = document.getElementById('tool-panel')!;
    this.propPanel = document.getElementById('property-panel')!;
    this.mobileToolbar = document.getElementById('mobile-toolbar')!;
    this.buildToolPanel();
    this.buildPropertyPanel();
    this.buildMobileToolbar();
    this.setupMobileToggle();
  }

  on(callbacks: Partial<ToolCallbacks>): void {
    this.callbacks = { ...this.callbacks, ...callbacks };
  }

  private buildToolPanel(): void {
    const panel = this.toolPanel;
    panel.innerHTML = '';

    const title = document.createElement('div');
    title.className = 'panel-title';
    title.textContent = '//! NEON TOOL';
    panel.appendChild(title);

    const shapeSection = document.createElement('div');
    shapeSection.className = 'panel-section';
    shapeSection.innerHTML = `<div class="panel-label">SHAPE</div>`;
    const shapeGroup = document.createElement('div');
    shapeGroup.className = 'shape-btn-group';
    const shapes: { key: SignShape; label: string }[] = [
      { key: 'rect', label: 'RECT' },
      { key: 'circle', label: 'CIRCLE' },
      { key: 'star', label: 'STAR' },
      { key: 'text', label: 'TEXT' },
    ];
    for (const s of shapes) {
      const btn = document.createElement('button');
      btn.className = 'shape-btn' + (s.key === this.currentShape ? ' active' : '');
      btn.textContent = s.label;
      btn.dataset.shape = s.key;
      btn.addEventListener('click', () => {
        this.currentShape = s.key;
        shapeGroup.querySelectorAll('.shape-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.addPulse(btn);
        this.mobileToolbar.querySelectorAll('.shape-btn').forEach(b => {
          b.classList.toggle('active', (b as HTMLElement).dataset.shape === s.key);
        });
        this.callbacks.onShapeSelect?.(s.key);
      });
      shapeGroup.appendChild(btn);
    }
    shapeSection.appendChild(shapeGroup);
    panel.appendChild(shapeSection);

    const colorSection = document.createElement('div');
    colorSection.className = 'panel-section';
    colorSection.innerHTML = `<div class="panel-label">BORDER COLOR</div>`;
    const colorPicker = document.createElement('input');
    colorPicker.type = 'color';
    colorPicker.value = this.currentColor;
    colorPicker.addEventListener('input', () => {
      this.currentColor = colorPicker.value;
      hexInput.value = colorPicker.value;
      this.callbacks.onColorChange?.(colorPicker.value);
    });
    colorSection.appendChild(colorPicker);
    const hexInput = document.createElement('input');
    hexInput.className = 'hex-input';
    hexInput.type = 'text';
    hexInput.value = this.currentColor;
    hexInput.maxLength = 7;
    hexInput.addEventListener('change', () => {
      if (/^#[0-9a-fA-F]{6}$/.test(hexInput.value)) {
        this.currentColor = hexInput.value;
        colorPicker.value = hexInput.value;
        this.callbacks.onColorChange?.(hexInput.value);
      }
    });
    colorSection.appendChild(hexInput);
    panel.appendChild(colorSection);

    const widthSection = document.createElement('div');
    widthSection.className = 'panel-section';
    widthSection.innerHTML = `<div class="panel-label">BORDER WIDTH</div>`;
    const widthSlider = document.createElement('input');
    widthSlider.type = 'range';
    widthSlider.min = '1';
    widthSlider.max = '10';
    widthSlider.value = String(this.currentBorderWidth);
    const widthValue = document.createElement('div');
    widthValue.className = 'range-value';
    widthValue.textContent = `${this.currentBorderWidth}px`;
    widthSlider.addEventListener('input', () => {
      this.currentBorderWidth = parseInt(widthSlider.value);
      widthValue.textContent = `${this.currentBorderWidth}px`;
      this.callbacks.onBorderWidthChange?.(this.currentBorderWidth);
    });
    widthSection.appendChild(widthSlider);
    widthSection.appendChild(widthValue);
    panel.appendChild(widthSection);

    const animSection = document.createElement('div');
    animSection.className = 'panel-section';
    animSection.innerHTML = `<div class="panel-label">ANIMATION MODE</div>`;
    const animSelect = document.createElement('select');
    const modes: { key: AnimationMode; label: string }[] = [
      { key: 'static', label: 'STATIC / 静态常亮' },
      { key: 'breathe', label: 'BREATHE / 呼吸闪烁' },
      { key: 'chase', label: 'CHASE / 追逐循环' },
    ];
    for (const m of modes) {
      const opt = document.createElement('option');
      opt.value = m.key;
      opt.textContent = m.label;
      animSelect.appendChild(opt);
    }
    animSelect.addEventListener('change', () => {
      this.currentAnimMode = animSelect.value as AnimationMode;
      this.callbacks.onAnimationModeChange?.(this.currentAnimMode);
    });
    animSection.appendChild(animSelect);
    panel.appendChild(animSection);

    const actionSection = document.createElement('div');
    actionSection.className = 'panel-section';
    actionSection.style.marginTop = 'auto';
    const exportBtn = document.createElement('button');
    exportBtn.className = 'action-btn export-btn';
    exportBtn.textContent = '⬇ EXPORT PNG';
    exportBtn.addEventListener('click', () => {
      this.addPulse(exportBtn);
      this.callbacks.onExport?.();
    });
    const clearBtn = document.createElement('button');
    clearBtn.className = 'action-btn clear-btn';
    clearBtn.textContent = '✕ CLEAR ALL';
    clearBtn.addEventListener('click', () => {
      this.addPulse(clearBtn);
      this.callbacks.onClear?.();
    });
    actionSection.appendChild(exportBtn);
    actionSection.appendChild(clearBtn);
    panel.appendChild(actionSection);
  }

  private buildPropertyPanel(): void {
    const panel = this.propPanel;
    panel.innerHTML = '';

    const title = document.createElement('div');
    title.className = 'panel-title';
    title.textContent = '//? PROPERTIES';
    panel.appendChild(title);

    const posSection = document.createElement('div');
    posSection.className = 'panel-section';
    posSection.innerHTML = `
      <div class="panel-label">POSITION</div>
      <div class="prop-row"><span class="prop-label">X</span><span class="prop-value" id="prop-x">0</span></div>
      <div class="prop-row"><span class="prop-label">Y</span><span class="prop-value" id="prop-y">0</span></div>
      <div class="panel-label">SIZE</div>
      <div class="prop-row"><span class="prop-label">W</span><span class="prop-value" id="prop-w">0</span></div>
      <div class="prop-row"><span class="prop-label">H</span><span class="prop-value" id="prop-h">0</span></div>
      <div class="panel-label">ROTATION</div>
      <div class="prop-row"><span class="prop-label">Angle</span><span class="prop-value" id="prop-r">0°</span></div>
    `;
    panel.appendChild(posSection);

    const animPropSection = document.createElement('div');
    animPropSection.className = 'panel-section';
    animPropSection.innerHTML = `<div class="panel-label">ANIMATION</div>`;
    const animSelect = document.createElement('select');
    const modes: { key: AnimationMode; label: string }[] = [
      { key: 'static', label: 'STATIC' },
      { key: 'breathe', label: 'BREATHE' },
      { key: 'chase', label: 'CHASE' },
    ];
    for (const m of modes) {
      const opt = document.createElement('option');
      opt.value = m.key;
      opt.textContent = m.label;
      animSelect.appendChild(opt);
    }
    animSelect.addEventListener('change', () => {
      this.callbacks.onAnimationModeChange?.(animSelect.value as AnimationMode);
    });
    this.propAnimMode = animSelect;
    animPropSection.appendChild(animSelect);

    const breatheLabel = document.createElement('div');
    breatheLabel.className = 'panel-label';
    breatheLabel.style.marginTop = '8px';
    breatheLabel.textContent = 'BREATHE PERIOD';
    animPropSection.appendChild(breatheLabel);
    const breatheSlider = document.createElement('input');
    breatheSlider.type = 'range';
    breatheSlider.min = '1';
    breatheSlider.max = '3';
    breatheSlider.step = '0.1';
    breatheSlider.value = '2';
    breatheSlider.addEventListener('input', () => {
      this.callbacks.onBreathePeriodChange?.(parseFloat(breatheSlider.value));
    });
    this.propBreathePeriod = breatheSlider;
    animPropSection.appendChild(breatheSlider);

    const chaseLabel = document.createElement('div');
    chaseLabel.className = 'panel-label';
    chaseLabel.style.marginTop = '8px';
    chaseLabel.textContent = 'CHASE SPEED';
    animPropSection.appendChild(chaseLabel);
    const chaseSlider = document.createElement('input');
    chaseSlider.type = 'range';
    chaseSlider.min = '0.5';
    chaseSlider.max = '3';
    chaseSlider.step = '0.1';
    chaseSlider.value = '1';
    chaseSlider.addEventListener('input', () => {
      this.callbacks.onChaseSpeedChange?.(parseFloat(chaseSlider.value));
    });
    this.propChaseSpeed = chaseSlider;
    animPropSection.appendChild(chaseSlider);

    panel.appendChild(animPropSection);

    const textSection = document.createElement('div');
    textSection.className = 'panel-section text-edit-section';
    textSection.innerHTML = `<div class="panel-label">TEXT</div>`;
    const textInput = document.createElement('input');
    textInput.className = 'hex-input';
    textInput.type = 'text';
    textInput.value = 'NEON';
    textInput.addEventListener('input', () => {
      this.callbacks.onTextChange?.(textInput.value);
    });
    this.propTextInput = textInput;
    textSection.appendChild(textInput);

    const fontLabel = document.createElement('div');
    fontLabel.className = 'panel-label';
    fontLabel.style.marginTop = '8px';
    fontLabel.textContent = 'FONT';
    textSection.appendChild(fontLabel);
    const fontSelect = document.createElement('select');
    const fonts = [
      { key: 'futuristic', label: 'FUTURISTIC / 未来感' },
      { key: 'pixel', label: 'PIXEL / 点阵像素' },
      { key: 'handwrite', label: 'HANDWRITE / 霓虹手写' },
    ];
    for (const f of fonts) {
      const opt = document.createElement('option');
      opt.value = f.key;
      opt.textContent = f.label;
      fontSelect.appendChild(opt);
    }
    fontSelect.addEventListener('change', () => {
      this.callbacks.onFontChange?.(fontSelect.value);
    });
    this.propFontSelect = fontSelect;
    textSection.appendChild(fontSelect);

    const sizeLabel = document.createElement('div');
    sizeLabel.className = 'panel-label';
    sizeLabel.style.marginTop = '8px';
    sizeLabel.textContent = 'FONT SIZE';
    textSection.appendChild(sizeLabel);
    const fontSizeSlider = document.createElement('input');
    fontSizeSlider.type = 'range';
    fontSizeSlider.min = '16';
    fontSizeSlider.max = '80';
    fontSizeSlider.value = '32';
    fontSizeSlider.addEventListener('input', () => {
      this.callbacks.onFontSizeChange?.(parseInt(fontSizeSlider.value));
    });
    this.propFontSize = fontSizeSlider;
    textSection.appendChild(fontSizeSlider);

    this.propTextSection = textSection;
    panel.appendChild(textSection);

    const deleteSection = document.createElement('div');
    deleteSection.className = 'panel-section';
    deleteSection.style.marginTop = '16px';
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'action-btn clear-btn';
    deleteBtn.textContent = '✕ DELETE';
    deleteBtn.addEventListener('click', () => {
      this.callbacks.onDeleteSign?.();
    });
    deleteSection.appendChild(deleteBtn);
    panel.appendChild(deleteSection);

    this.propX = document.getElementById('prop-x');
    this.propY = document.getElementById('prop-y');
    this.propW = document.getElementById('prop-w');
    this.propH = document.getElementById('prop-h');
    this.propR = document.getElementById('prop-r');
  }

  private buildMobileToolbar(): void {
    const container = this.mobileToolbar.querySelector('.mobile-shapes') as HTMLElement;
    if (!container) return;
    container.innerHTML = '';
    const shapes: { key: SignShape; label: string }[] = [
      { key: 'rect', label: 'RECT' },
      { key: 'circle', label: 'CIRCLE' },
      { key: 'star', label: 'STAR' },
      { key: 'text', label: 'TEXT' },
    ];
    for (const s of shapes) {
      const btn = document.createElement('button');
      btn.className = 'shape-btn' + (s.key === this.currentShape ? ' active' : '');
      btn.textContent = s.label;
      btn.dataset.shape = s.key;
      btn.addEventListener('click', () => {
        this.currentShape = s.key;
        container.querySelectorAll('.shape-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.toolPanel.querySelectorAll('.shape-btn').forEach(b => {
          b.classList.toggle('active', (b as HTMLElement).dataset.shape === s.key);
        });
        this.callbacks.onShapeSelect?.(s.key);
      });
      container.appendChild(btn);
    }
  }

  private setupMobileToggle(): void {
    const toggle = document.getElementById('mobile-toggle');
    if (toggle) {
      toggle.addEventListener('click', () => {
        this.toolPanel.classList.toggle('mobile-open');
      });
    }
  }

  updateProperties(sign: {
    x: number; y: number; width: number; height: number;
    rotation: number; animationMode: AnimationMode;
    breathePeriod: number; chaseSpeed: number;
    shape: SignShape; text: string; fontFamily: string; fontSize: number;
  }): void {
    if (this.propX) this.propX.textContent = Math.round(sign.x).toString();
    if (this.propY) this.propY.textContent = Math.round(sign.y).toString();
    if (this.propW) this.propW.textContent = Math.round(sign.width).toString();
    if (this.propH) this.propH.textContent = Math.round(sign.height).toString();
    if (this.propR) this.propR.textContent = `${Math.round((sign.rotation * 180) / Math.PI)}°`;
    if (this.propAnimMode) this.propAnimMode.value = sign.animationMode;
    if (this.propBreathePeriod) this.propBreathePeriod.value = String(sign.breathePeriod);
    if (this.propChaseSpeed) this.propChaseSpeed.value = String(sign.chaseSpeed);
    if (this.propTextSection) {
      this.propTextSection.classList.toggle('visible', sign.shape === 'text');
    }
    if (this.propTextInput && sign.shape === 'text') this.propTextInput.value = sign.text;
    if (this.propFontSelect) this.propFontSelect.value = sign.fontFamily;
    if (this.propFontSize) this.propFontSize.value = String(sign.fontSize);
  }

  showPropertyPanel(show: boolean): void {
    this.propPanel.classList.toggle('open', show);
  }

  getCurrentShape(): SignShape {
    return this.currentShape;
  }

  getCurrentColor(): string {
    return this.currentColor;
  }

  getCurrentBorderWidth(): number {
    return this.currentBorderWidth;
  }

  private addPulse(el: HTMLElement): void {
    el.classList.remove('pulse-effect');
    void el.offsetWidth;
    el.classList.add('pulse-effect');
    setTimeout(() => el.classList.remove('pulse-effect'), 300);
  }
}
