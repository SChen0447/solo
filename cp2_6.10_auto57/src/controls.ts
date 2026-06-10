export interface ControlCallbacks {
  onLetterSpacingChange: (value: number) => void;
  onLineHeightChange: (value: number) => void;
  onFontWeightChange: (value: number) => void;
  onFontSizeChange: (value: number) => void;
  onTextAlignChange: (value: 'left' | 'center' | 'right' | 'justify') => void;
  onFontFamilyChange: (value: string) => void;
  onThemeChange: (isDark: boolean) => void;
  onReset: () => void;
  onExport: () => void;
}

export const DEFAULT_PARAMS = {
  letterSpacing: 0,
  lineHeight: 1.5,
  fontWeight: 400,
  fontSize: 24,
  textAlign: 'left' as const,
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  isDarkMode: false
};

const FONT_OPTIONS = [
  { label: '系统无衬线', value: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', bold: false },
  { label: '系统衬线', value: 'Georgia, "Times New Roman", Times, serif', bold: false },
  { label: 'Georgia', value: 'Georgia, serif', bold: false },
  { label: 'Courier New', value: '"Courier New", Courier, monospace', bold: true }
];

const ALIGN_OPTIONS: Array<{ value: 'left' | 'center' | 'right' | 'justify'; icon: string; label: string }> = [
  { value: 'left', icon: '⬅', label: '左对齐' },
  { value: 'center', icon: '⬌', label: '居中对齐' },
  { value: 'right', icon: '➡', label: '右对齐' },
  { value: 'justify', icon: '⬍', label: '两端对齐' }
];

export class ControlPanel {
  private container: HTMLElement;
  private callbacks: ControlCallbacks;

  private letterSpacingSlider!: HTMLInputElement;
  private lineHeightSlider!: HTMLInputElement;
  private fontWeightSlider!: HTMLInputElement;
  private fontSizeSlider!: HTMLInputElement;
  private alignButtons!: HTMLElement;
  private fontFamilySelect!: HTMLSelectElement;
  private themeLightBtn!: HTMLButtonElement;
  private themeDarkBtn!: HTMLButtonElement;
  private resetBtn!: HTMLButtonElement;
  private exportBtn!: HTMLButtonElement;

  private letterSpacingValue!: HTMLElement;
  private lineHeightValue!: HTMLElement;
  private fontWeightValue!: HTMLElement;
  private fontSizeValue!: HTMLElement;

  constructor(callbacks: ControlCallbacks) {
    this.container = document.getElementById('controls-container') as HTMLElement;
    if (!this.container) {
      throw new Error('Controls container not found');
    }
    this.callbacks = callbacks;
    this.build();
    this.bindEvents();
    this.updateSliderFills();
  }

  private build(): void {
    this.letterSpacingSlider = this.createSlider(
      '字距 (Letter Spacing)',
      -5, 10, 0.5, DEFAULT_PARAMS.letterSpacing,
      'px'
    );
    this.letterSpacingValue = this.letterSpacingSlider.parentElement!.querySelector('.control-value') as HTMLElement;

    this.lineHeightSlider = this.createSlider(
      '行高 (Line Height)',
      0.8, 2.5, 0.1, DEFAULT_PARAMS.lineHeight,
      ''
    );
    this.lineHeightValue = this.lineHeightSlider.parentElement!.querySelector('.control-value') as HTMLElement;

    this.fontWeightSlider = this.createSlider(
      '字重 (Font Weight)',
      100, 900, 100, DEFAULT_PARAMS.fontWeight,
      ''
    );
    this.fontWeightValue = this.fontWeightSlider.parentElement!.querySelector('.control-value') as HTMLElement;

    this.fontSizeSlider = this.createSlider(
      '字号 (Font Size)',
      12, 72, 2, DEFAULT_PARAMS.fontSize,
      'px'
    );
    this.fontSizeValue = this.fontSizeSlider.parentElement!.querySelector('.control-value') as HTMLElement;

    this.alignButtons = this.createAlignButtons();
    this.fontFamilySelect = this.createFontSelect();

    const actionButtons = this.createActionButtons();
    this.resetBtn = actionButtons.resetBtn;
    this.exportBtn = actionButtons.exportBtn;

    const themeButtons = this.createThemeButtons();
    this.themeLightBtn = themeButtons.lightBtn;
    this.themeDarkBtn = themeButtons.darkBtn;
  }

  private createSlider(label: string, min: number, max: number, step: number, value: number, unit: string): HTMLInputElement {
    const group = document.createElement('div');
    group.className = 'control-group';

    const labelEl = document.createElement('div');
    labelEl.className = 'control-label';

    const labelText = document.createElement('span');
    labelText.textContent = label;

    const valueEl = document.createElement('span');
    valueEl.className = 'control-value';
    valueEl.textContent = `${value}${unit}`;

    labelEl.appendChild(labelText);
    labelEl.appendChild(valueEl);

    const slider = document.createElement('input');
    slider.type = 'range';
    slider.min = String(min);
    slider.max = String(max);
    slider.step = String(step);
    slider.value = String(value);
    slider.className = 'slider';
    slider.dataset.unit = unit;

    group.appendChild(labelEl);
    group.appendChild(slider);

    this.container.appendChild(group);

    return slider;
  }

  private createAlignButtons(): HTMLElement {
    const group = document.createElement('div');
    group.className = 'control-group';

    const labelEl = document.createElement('div');
    labelEl.className = 'control-label';
    const labelText = document.createElement('span');
    labelText.textContent = '对齐方式 (Text Align';
    labelEl.appendChild(labelText);
    group.appendChild(labelEl);

    const buttonsContainer = document.createElement('div');
    buttonsContainer.className = 'align-buttons';

    ALIGN_OPTIONS.forEach(opt => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'align-btn';
      btn.dataset.align = opt.value;
      btn.textContent = opt.icon;
      btn.title = opt.label;
      if (opt.value === DEFAULT_PARAMS.textAlign) {
        btn.classList.add('active');
      }
      buttonsContainer.appendChild(btn);
    });

    group.appendChild(buttonsContainer);
    this.container.appendChild(group);

    return buttonsContainer;
  }

  private createFontSelect(): HTMLSelectElement {
    const group = document.createElement('div');
    group.className = 'control-group';

    const labelEl = document.createElement('div');
    labelEl.className = 'control-label';
    const labelText = document.createElement('span');
    labelText.textContent = '字体选择 (Font Family)';
    labelEl.appendChild(labelText);
    group.appendChild(labelEl);

    const select = document.createElement('select');
    select.className = 'font-select';

    FONT_OPTIONS.forEach(opt => {
      const option = document.createElement('option');
      option.value = opt.value;
      option.textContent = opt.label;
      option.style.fontFamily = opt.value;
      if (opt.bold) {
        option.style.fontWeight = 'bold';
      }
      if (opt.value === DEFAULT_PARAMS.fontFamily) {
        option.selected = true;
      }
      select.appendChild(option);
    });

    group.appendChild(select);
    this.container.appendChild(group);

    return select;
  }

  private createActionButtons(): { resetBtn: HTMLButtonElement; exportBtn: HTMLButtonElement } {
    const container = document.createElement('div');
    container.className = 'action-buttons';

    const resetBtn = document.createElement('button');
    resetBtn.type = 'button';
    resetBtn.className = 'action-btn reset-btn';
    const resetText = document.createElement('span');
    resetText.className = 'btn-text';
    resetText.textContent = '重置';
    resetBtn.appendChild(resetText);

    const exportBtn = document.createElement('button');
    exportBtn.type = 'button';
    exportBtn.className = 'action-btn export-btn';
    const exportText = document.createElement('span');
    exportText.className = 'btn-text';
    exportText.textContent = '导出 CSS';
    exportBtn.appendChild(exportText);

    container.appendChild(resetBtn);
    container.appendChild(exportBtn);

    this.container.appendChild(container);

    return { resetBtn, exportBtn };
  }

  private createThemeButtons(): { lightBtn: HTMLButtonElement; darkBtn: HTMLButtonElement } {
    const container = document.createElement('div');
    container.className = 'theme-switch';

    const lightBtn = document.createElement('button');
    lightBtn.type = 'button';
    lightBtn.className = 'theme-btn active';
    lightBtn.dataset.theme = 'light';
    lightBtn.textContent = '☀ 日间';

    const darkBtn = document.createElement('button');
    darkBtn.type = 'button';
    darkBtn.className = 'theme-btn';
    darkBtn.dataset.theme = 'dark';
    darkBtn.textContent = '🌙 夜间';

    container.appendChild(lightBtn);
    container.appendChild(darkBtn);

    this.container.appendChild(container);

    return { lightBtn, darkBtn };
  }

  private bindEvents(): void {
    this.letterSpacingSlider.addEventListener('input', (e: Event) => {
      const target = e.target as HTMLInputElement;
      const val = parseFloat(target.value);
      this.letterSpacingValue.textContent = `${val}${target.dataset.unit || ''}`;
      this.updateSliderFill(target);
      this.callbacks.onLetterSpacingChange(val);
    });

    this.lineHeightSlider.addEventListener('input', (e: Event) => {
      const target = e.target as HTMLInputElement;
      const val = parseFloat(target.value);
      this.lineHeightValue.textContent = `${val}${target.dataset.unit || ''}`;
      this.updateSliderFill(target);
      this.callbacks.onLineHeightChange(val);
    });

    this.fontWeightSlider.addEventListener('input', (e: Event) => {
      const target = e.target as HTMLInputElement;
      const val = parseInt(target.value, 10);
      this.fontWeightValue.textContent = `${val}${target.dataset.unit || ''}`;
      this.updateSliderFill(target);
      this.callbacks.onFontWeightChange(val);
    });

    this.fontSizeSlider.addEventListener('input', (e: Event) => {
      const target = e.target as HTMLInputElement;
      const val = parseInt(target.value, 10);
      this.fontSizeValue.textContent = `${val}${target.dataset.unit || ''}`;
      this.updateSliderFill(target);
      this.callbacks.onFontSizeChange(val);
    });

    this.alignButtons.addEventListener('click', (e: Event) => {
      const target = e.target as HTMLElement;
      if (target.classList.contains('align-btn')) {
        const align = target.dataset.align as 'left' | 'center' | 'right' | 'justify';
        this.alignButtons.querySelectorAll('.align-btn').forEach(btn => {
          btn.classList.remove('active');
        });
        target.classList.add('active');
        this.callbacks.onTextAlignChange(align);
      }
    });

    this.fontFamilySelect.addEventListener('change', (e: Event) => {
      const target = e.target as HTMLSelectElement;
      this.callbacks.onFontFamilyChange(target.value);
    });

    this.themeLightBtn.addEventListener('click', () => {
      this.themeLightBtn.classList.add('active');
      this.themeDarkBtn.classList.remove('active');
      document.body.classList.remove('theme-dark');
      document.body.classList.add('theme-light');
      this.callbacks.onThemeChange(false);
    });

    this.themeDarkBtn.addEventListener('click', () => {
      this.themeDarkBtn.classList.add('active');
      this.themeLightBtn.classList.remove('active');
      document.body.classList.remove('theme-light');
      document.body.classList.add('theme-dark');
      this.callbacks.onThemeChange(true);
    });

    this.resetBtn.addEventListener('click', () => {
      this.resetToDefaults();
      this.callbacks.onReset();
    });

    this.exportBtn.addEventListener('click', () => {
      this.callbacks.onExport();
    });
  }

  private updateSliderFill(slider: HTMLInputElement): void {
    const min = parseFloat(slider.min);
    const max = parseFloat(slider.max);
    const val = parseFloat(slider.value);
    const percent = ((val - min) / (max - min)) * 100;
    const isDark = document.body.classList.contains('theme-dark');
    const fillColor = '#4A90D9';
    const trackColor = isDark ? '#2a2a4a' : '#e0e0e0';
    slider.style.background = `linear-gradient(to right, ${fillColor} 0%, ${fillColor} ${percent}%, ${trackColor} ${percent}%, ${trackColor} 100%)`;
  }

  private updateSliderFills(): void {
    [this.letterSpacingSlider, this.lineHeightSlider, this.fontWeightSlider, this.fontSizeSlider].forEach(slider => {
      this.updateSliderFill(slider);
    });
  }

  private resetToDefaults(): void {
    this.letterSpacingSlider.value = String(DEFAULT_PARAMS.letterSpacing);
    this.letterSpacingValue.textContent = `${DEFAULT_PARAMS.letterSpacing}px`;

    this.lineHeightSlider.value = String(DEFAULT_PARAMS.lineHeight);
    this.lineHeightValue.textContent = String(DEFAULT_PARAMS.lineHeight);

    this.fontWeightSlider.value = String(DEFAULT_PARAMS.fontWeight);
    this.fontWeightValue.textContent = String(DEFAULT_PARAMS.fontWeight);

    this.fontSizeSlider.value = String(DEFAULT_PARAMS.fontSize);
    this.fontSizeValue.textContent = `${DEFAULT_PARAMS.fontSize}px`;

    this.alignButtons.querySelectorAll('.align-btn').forEach(btn => {
      btn.classList.remove('active');
      if ((btn as HTMLElement).dataset.align === DEFAULT_PARAMS.textAlign) {
        btn.classList.add('active');
      }
    });

    this.fontFamilySelect.value = DEFAULT_PARAMS.fontFamily;

    this.themeLightBtn.classList.add('active');
    this.themeDarkBtn.classList.remove('active');
    document.body.classList.remove('theme-dark');
    document.body.classList.add('theme-light');

    this.updateSliderFills();

    const resetText = this.resetBtn.querySelector('.btn-text') as HTMLElement;
    if (resetText) {
      resetText.style.animation = 'none';
      void resetText.offsetWidth;
      resetText.style.animation = '';
    }
  }
}
