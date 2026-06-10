import type { ColorScheme } from './building';

export interface UICallbacks {
  onGrowthSpeedChange: (speed: number) => void;
  onMaxFloorsChange: (floors: number) => void;
  onColorSchemeChange: (scheme: ColorScheme) => void;
  onGrowAll: () => void;
  onClearAll: () => void;
  onPopupBuild: () => void;
  onPopupDelete: () => void;
  onPopupCancel: () => void;
}

export class UIManager {
  private speedSlider: HTMLInputElement;
  private floorSlider: HTMLInputElement;
  private speedValue: HTMLElement;
  private floorValue: HTMLElement;
  private schemeButtons: NodeListOf<HTMLButtonElement>;
  private btnGrow: HTMLButtonElement;
  private btnClear: HTMLButtonElement;
  private popup: HTMLElement;
  private popupBuild: HTMLButtonElement;
  private popupDelete: HTMLButtonElement;
  private popupCancel: HTMLButtonElement;
  private hintText: HTMLElement;
  private hintTimer: number | null = null;
  private callbacks: UICallbacks;
  private currentScheme: ColorScheme = 'gray';

  constructor(callbacks: UICallbacks) {
    this.callbacks = callbacks;

    this.speedSlider = document.getElementById('speed-slider') as HTMLInputElement;
    this.floorSlider = document.getElementById('floor-slider') as HTMLInputElement;
    this.speedValue = document.getElementById('speed-value') as HTMLElement;
    this.floorValue = document.getElementById('floor-value') as HTMLElement;
    this.schemeButtons = document.querySelectorAll('.scheme-btn') as NodeListOf<HTMLButtonElement>;
    this.btnGrow = document.getElementById('btn-grow') as HTMLButtonElement;
    this.btnClear = document.getElementById('btn-clear') as HTMLButtonElement;
    this.popup = document.getElementById('marker-popup') as HTMLElement;
    this.popupBuild = document.getElementById('popup-build') as HTMLButtonElement;
    this.popupDelete = document.getElementById('popup-delete') as HTMLButtonElement;
    this.popupCancel = document.getElementById('popup-cancel') as HTMLButtonElement;
    this.hintText = document.getElementById('hint-text') as HTMLElement;

    this.bindEvents();
  }

  private bindEvents(): void {
    this.speedSlider.addEventListener('input', () => {
      const speed = parseFloat(this.speedSlider.value);
      this.speedValue.textContent = `${speed.toFixed(1)}s/层`;
      this.animatePanelTransition();
      this.callbacks.onGrowthSpeedChange(speed);
    });

    this.floorSlider.addEventListener('input', () => {
      const floors = parseInt(this.floorSlider.value, 10);
      this.floorValue.textContent = `${floors}层`;
      this.animatePanelTransition();
      this.callbacks.onMaxFloorsChange(floors);
    });

    this.schemeButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        const scheme = btn.dataset.scheme as ColorScheme;
        if (scheme && scheme !== this.currentScheme) {
          this.currentScheme = scheme;
          this.schemeButtons.forEach((b) => b.classList.remove('active'));
          btn.classList.add('active');
          this.animatePanelTransition();
          this.callbacks.onColorSchemeChange(scheme);
        }
      });
    });

    this.btnGrow.addEventListener('click', () => {
      this.callbacks.onGrowAll();
    });

    this.btnClear.addEventListener('click', () => {
      this.callbacks.onClearAll();
    });

    this.popupBuild.addEventListener('click', () => {
      this.hidePopup();
      this.callbacks.onPopupBuild();
    });

    this.popupDelete.addEventListener('click', () => {
      this.hidePopup();
      this.callbacks.onPopupDelete();
    });

    this.popupCancel.addEventListener('click', () => {
      this.hidePopup();
      this.callbacks.onPopupCancel();
    });
  }

  private animatePanelTransition(): void {
    const panel = document.querySelector('.panel') as HTMLElement;
    if (panel) {
      panel.style.transition = 'background-color 0.3s ease-out';
      panel.style.backgroundColor = 'rgba(52, 73, 94, 0.85)';
      setTimeout(() => {
        panel.style.backgroundColor = 'rgba(26, 26, 46, 0.85)';
      }, 150);
    }
  }

  public showPopup(screenX: number, screenY: number): void {
    const app = document.getElementById('app') as HTMLElement;
    const appRect = app.getBoundingClientRect();

    let left = screenX - appRect.left + 12;
    let top = screenY - appRect.top + 12;

    const popupWidth = 184;
    const popupHeight = 140;
    if (left + popupWidth > appRect.width) {
      left = screenX - appRect.left - popupWidth - 12;
    }
    if (top + popupHeight > appRect.height) {
      top = screenY - appRect.top - popupHeight - 12;
    }

    this.popup.style.left = `${left}px`;
    this.popup.style.top = `${top}px`;
    this.popup.classList.add('visible');
  }

  public hidePopup(): void {
    this.popup.classList.remove('visible');
  }

  public isPopupVisible(): boolean {
    return this.popup.classList.contains('visible');
  }

  public showHint(message: string, duration: number = 3000): void {
    this.hintText.textContent = message;
    this.hintText.classList.add('visible');

    if (this.hintTimer !== null) {
      clearTimeout(this.hintTimer);
    }

    this.hintTimer = window.setTimeout(() => {
      this.hintText.classList.remove('visible');
      this.hintTimer = null;
    }, duration);
  }
}
