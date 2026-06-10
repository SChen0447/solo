import { CssGradientPreview } from './cssGradientPreview';

interface SliderElements {
  input: HTMLInputElement;
  valueDisplay: HTMLElement;
  unit: string;
}

export class Controls {
  private preview: CssGradientPreview;
  private radialSliders: {
    hue: SliderElements;
    saturation: SliderElements;
    lightness: SliderElements;
    contrast: SliderElements;
  };
  private conicSliders: {
    hue: SliderElements;
    saturation: SliderElements;
    lightness: SliderElements;
    angle: SliderElements;
  };
  private radialCodeEl: HTMLElement;
  private conicCodeEl: HTMLElement;
  private divider: HTMLElement;
  private radialPanel: HTMLElement;
  private conicPanel: HTMLElement;
  private toast: HTMLElement;

  private isDraggingDivider = false;
  private lastToastTimeout: number | null = null;

  constructor(
    preview: CssGradientPreview,
    elements: {
      radialHue: HTMLInputElement;
      radialSat: HTMLInputElement;
      radialLight: HTMLInputElement;
      radialContrast: HTMLInputElement;
      radialHueValue: HTMLElement;
      radialSatValue: HTMLElement;
      radialLightValue: HTMLElement;
      radialContrastValue: HTMLElement;
      conicHue: HTMLInputElement;
      conicSat: HTMLInputElement;
      conicLight: HTMLInputElement;
      conicAngle: HTMLInputElement;
      conicHueValue: HTMLElement;
      conicSatValue: HTMLElement;
      conicLightValue: HTMLElement;
      conicAngleValue: HTMLElement;
      radialCodeEl: HTMLElement;
      conicCodeEl: HTMLElement;
      divider: HTMLElement;
      radialPanel: HTMLElement;
      conicPanel: HTMLElement;
      toast: HTMLElement;
    }
  ) {
    this.preview = preview;
    this.radialSliders = {
      hue: { input: elements.radialHue, valueDisplay: elements.radialHueValue, unit: '°' },
      saturation: { input: elements.radialSat, valueDisplay: elements.radialSatValue, unit: '%' },
      lightness: { input: elements.radialLight, valueDisplay: elements.radialLightValue, unit: '%' },
      contrast: { input: elements.radialContrast, valueDisplay: elements.radialContrastValue, unit: '%' }
    };
    this.conicSliders = {
      hue: { input: elements.conicHue, valueDisplay: elements.conicHueValue, unit: '°' },
      saturation: { input: elements.conicSat, valueDisplay: elements.conicSatValue, unit: '%' },
      lightness: { input: elements.conicLight, valueDisplay: elements.conicLightValue, unit: '%' },
      angle: { input: elements.conicAngle, valueDisplay: elements.conicAngleValue, unit: '°' }
    };
    this.radialCodeEl = elements.radialCodeEl;
    this.conicCodeEl = elements.conicCodeEl;
    this.divider = elements.divider;
    this.radialPanel = elements.radialPanel;
    this.conicPanel = elements.conicPanel;
    this.toast = elements.toast;

    this.bindSliderEvents();
    this.bindCopyEvents();
    this.bindDividerEvents();
  }

  private bindSliderEvents(): void {
    const bindRadial = (
      slider: SliderElements,
      key: 'hue' | 'saturation' | 'lightness' | 'contrast'
    ) => {
      const handler = () => {
        const value = Number(slider.input.value);
        slider.valueDisplay.textContent = `${value}${slider.unit}`;
        this.preview.updateRadial({ [key]: value });
      };
      slider.input.addEventListener('input', handler);
    };

    const bindConic = (
      slider: SliderElements,
      key: 'hue' | 'saturation' | 'lightness' | 'angle'
    ) => {
      const handler = () => {
        const value = Number(slider.input.value);
        slider.valueDisplay.textContent = `${value}${slider.unit}`;
        this.preview.updateConic({ [key]: value });
      };
      slider.input.addEventListener('input', handler);
    };

    bindRadial(this.radialSliders.hue, 'hue');
    bindRadial(this.radialSliders.saturation, 'saturation');
    bindRadial(this.radialSliders.lightness, 'lightness');
    bindRadial(this.radialSliders.contrast, 'contrast');

    bindConic(this.conicSliders.hue, 'hue');
    bindConic(this.conicSliders.saturation, 'saturation');
    bindConic(this.conicSliders.lightness, 'lightness');
    bindConic(this.conicSliders.angle, 'angle');
  }

  private bindCopyEvents(): void {
    this.radialCodeEl.addEventListener('click', () => {
      this.copyToClipboard(this.preview.getRadialCss(), this.radialCodeEl);
    });

    this.conicCodeEl.addEventListener('click', () => {
      this.copyToClipboard(this.preview.getConicCss(), this.conicCodeEl);
    });
  }

  private copyToClipboard(text: string, element: HTMLElement): void {
    const fullCss = `background: ${text};`;
    navigator.clipboard.writeText(fullCss).then(() => {
      element.classList.remove('copy-flash');
      void element.offsetWidth;
      element.classList.add('copy-flash');
      this.showToast('CSS 代码已复制到剪贴板');
    }).catch(() => {
      this.showToast('复制失败，请手动复制');
    });
  }

  private showToast(message: string): void {
    this.toast.textContent = message;
    this.toast.classList.add('show');

    if (this.lastToastTimeout !== null) {
      window.clearTimeout(this.lastToastTimeout);
    }

    this.lastToastTimeout = window.setTimeout(() => {
      this.toast.classList.remove('show');
      this.lastToastTimeout = null;
    }, 2000);
  }

  private bindDividerEvents(): void {
    const onMouseDown = (e: MouseEvent) => {
      e.preventDefault();
      this.isDraggingDivider = true;
      this.divider.classList.add('dragging');
      document.body.style.cursor = window.innerWidth <= 768 ? 'row-resize' : 'col-resize';
      document.body.style.userSelect = 'none';
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!this.isDraggingDivider) return;

      const container = this.divider.parentElement;
      if (!container) return;

      const rect = container.getBoundingClientRect();

      if (window.innerWidth <= 768) {
        const totalHeight = rect.height - 48 - 6;
        const relativeY = e.clientY - rect.top - 24;
        const clampedY = Math.max(120, Math.min(totalHeight - 120, relativeY));
        const topRatio = clampedY / totalHeight;
        const bottomRatio = 1 - topRatio;
        this.radialPanel.style.flex = `${topRatio}`;
        this.conicPanel.style.flex = `${bottomRatio}`;
      } else {
        const totalWidth = rect.width - 48 - 6;
        const relativeX = e.clientX - rect.left - 24;
        const clampedX = Math.max(200, Math.min(totalWidth - 200, relativeX));
        const leftRatio = clampedX / totalWidth;
        const rightRatio = 1 - leftRatio;
        this.radialPanel.style.flex = `${leftRatio}`;
        this.conicPanel.style.flex = `${rightRatio}`;
      }
    };

    const onMouseUp = () => {
      if (!this.isDraggingDivider) return;
      this.isDraggingDivider = false;
      this.divider.classList.remove('dragging');
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    this.divider.addEventListener('mousedown', onMouseDown);
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  }

  public destroy(): void {
    if (this.lastToastTimeout !== null) {
      window.clearTimeout(this.lastToastTimeout);
    }
  }
}
