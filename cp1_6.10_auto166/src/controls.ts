export interface ControlValues {
  frequency: number;
  density: number;
  speed: number;
}

export type ControlChangeCallback = (values: ControlValues) => void;

interface SliderConfig {
  key: keyof ControlValues;
  min: number;
  max: number;
  step: number;
  default: number;
  format: (v: number) => string;
}

const SLIDER_CONFIGS: SliderConfig[] = [
  { key: 'frequency', min: 2, max: 20, step: 1, default: 8, format: (v) => String(v) },
  { key: 'density', min: 3000, max: 15000, step: 500, default: 8000, format: (v) => String(v) },
  { key: 'speed', min: 0.5, max: 3, step: 0.1, default: 1, format: (v) => v.toFixed(1) }
];

export class ControlPanel {
  private panel: HTMLElement;
  private toggleButton: HTMLElement | null;
  private values: ControlValues;
  private callback: ControlChangeCallback | null = null;
  private isMobile: boolean;
  private isOpen: boolean = true;

  constructor() {
    this.panel = document.getElementById('control-panel')!;
    this.toggleButton = document.getElementById('panel-toggle');
    this.values = {
      frequency: 8,
      density: 8000,
      speed: 1
    };
    this.isMobile = window.innerWidth <= 768;

    this.initSliders();
    this.initMobileToggle();
    this.initResizeHandler();
  }

  private initSliders(): void {
    const controlItems = this.panel.querySelectorAll<HTMLElement>('.control-item');

    controlItems.forEach((item) => {
      const key = item.dataset.control as keyof ControlValues;
      const config = SLIDER_CONFIGS.find((c) => c.key === key);
      if (!config) return;

      const track = item.querySelector('.slider-track') as HTMLElement;
      const fill = item.querySelector('.slider-fill') as HTMLElement;
      const thumb = item.querySelector('.slider-thumb') as HTMLElement;
      const valueEl = item.querySelector(`[data-value="${key}"]`) as HTMLElement;

      this.setValueUI(key, this.values[key], config, track, fill, thumb, valueEl);
      this.attachSliderEvents(key, config, track, fill, thumb, valueEl);
    });
  }

  private setValueUI(
    key: keyof ControlValues,
    value: number,
    config: SliderConfig,
    track: HTMLElement,
    fill: HTMLElement,
    thumb: HTMLElement,
    valueEl: HTMLElement
  ): void {
    const clampedValue = Math.max(config.min, Math.min(config.max, value));
    const percent = ((clampedValue - config.min) / (config.max - config.min)) * 100;
    thumb.style.left = `${percent}%`;
    fill.style.width = `${percent}%`;
    valueEl.textContent = config.format(clampedValue);
  }

  private attachSliderEvents(
    key: keyof ControlValues,
    config: SliderConfig,
    track: HTMLElement,
    fill: HTMLElement,
    thumb: HTMLElement,
    valueEl: HTMLElement
  ): void {
    let isDragging = false;

    const updateFromEvent = (clientX: number): void => {
      const rect = track.getBoundingClientRect();
      let percent = (clientX - rect.left) / rect.width;
      percent = Math.max(0, Math.min(1, percent));

      let value = config.min + percent * (config.max - config.min);
      value = Math.round(value / config.step) * config.step;
      value = Math.max(config.min, Math.min(config.max, value));

      if (value !== this.values[key]) {
        this.values[key] = value;
        this.setValueUI(key, value, config, track, fill, thumb, valueEl);
        if (this.callback) {
          this.callback({ ...this.values });
        }
      }
    };

    const onMouseDown = (e: MouseEvent | TouchEvent): void => {
      isDragging = true;
      thumb.classList.add('dragging');
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      updateFromEvent(clientX);

      const onMouseMove = (e: MouseEvent | TouchEvent): void => {
        if (!isDragging) return;
        const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
        updateFromEvent(clientX);
      };

      const onMouseUp = (): void => {
        isDragging = false;
        thumb.classList.remove('dragging');
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
        document.removeEventListener('touchmove', onMouseMove);
        document.removeEventListener('touchend', onMouseUp);
      };

      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
      document.addEventListener('touchmove', onMouseMove, { passive: false });
      document.addEventListener('touchend', onMouseUp);
    };

    track.addEventListener('mousedown', onMouseDown);
    thumb.addEventListener('mousedown', (e) => {
      e.stopPropagation();
      onMouseDown(e);
    });
    track.addEventListener('touchstart', onMouseDown, { passive: true });
    thumb.addEventListener('touchstart', (e) => {
      e.stopPropagation();
      onMouseDown(e);
    }, { passive: true });
  }

  private initMobileToggle(): void {
    if (!this.toggleButton) return;

    if (this.isMobile) {
      this.isOpen = false;
      this.panel.classList.remove('mobile-open');
      this.panel.classList.add('mobile-closed');
    }

    this.toggleButton.addEventListener('click', () => {
      this.toggle();
    });
  }

  private initResizeHandler(): void {
    window.addEventListener('resize', () => {
      const newIsMobile = window.innerWidth <= 768;
      if (newIsMobile !== this.isMobile) {
        this.isMobile = newIsMobile;
        if (this.isMobile) {
          this.isOpen = false;
          this.panel.classList.remove('mobile-open');
          this.panel.classList.add('mobile-closed');
        } else {
          this.isOpen = true;
          this.panel.classList.remove('mobile-open', 'mobile-closed');
        }
      }
    });
  }

  public toggle(): void {
    if (!this.isMobile) return;
    this.isOpen = !this.isOpen;
    if (this.isOpen) {
      this.panel.classList.add('mobile-open');
      this.panel.classList.remove('mobile-closed');
    } else {
      this.panel.classList.remove('mobile-open');
      this.panel.classList.add('mobile-closed');
    }
  }

  public show(): void {
    if (this.isMobile) {
      this.isOpen = true;
      this.panel.classList.add('mobile-open');
      this.panel.classList.remove('mobile-closed');
    }
  }

  public hide(): void {
    if (this.isMobile) {
      this.isOpen = false;
      this.panel.classList.remove('mobile-open');
      this.panel.classList.add('mobile-closed');
    }
  }

  public onChange(callback: ControlChangeCallback): void {
    this.callback = callback;
  }

  public getValues(): ControlValues {
    return { ...this.values };
  }
}
