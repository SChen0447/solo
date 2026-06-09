import { LensSystem, LensType } from './LensSystem';

const LENS_TYPE_NAMES: Record<LensType, string> = {
  'biconvex': '双凸透镜',
  'biconcave': '双凹透镜',
  'plano-convex': '平凸透镜',
  'plano-concave': '平凹透镜'
};

export interface ControlPanelCallbacks {
  onParamsChange: () => void;
}

export class ControlPanel {
  private lensSystem: LensSystem;
  private callbacks: ControlPanelCallbacks;

  private radiusSlider: HTMLInputElement;
  private iorSlider: HTMLInputElement;
  private thicknessSlider: HTMLInputElement;

  private radiusValue: HTMLElement;
  private iorValue: HTMLElement;
  private thicknessValue: HTMLElement;

  private lensTypeDisplay: HTMLElement;
  private fluxDisplay: HTMLElement;
  private focalLengthDisplay: HTMLElement;
  private focalPositionDisplay: HTMLElement;
  private fpsDisplay: HTMLElement;

  private lensButtons: NodeListOf<HTMLButtonElement>;

  constructor(lensSystem: LensSystem, callbacks: ControlPanelCallbacks) {
    this.lensSystem = lensSystem;
    this.callbacks = callbacks;

    this.radiusSlider = document.getElementById('radius-slider') as HTMLInputElement;
    this.iorSlider = document.getElementById('ior-slider') as HTMLInputElement;
    this.thicknessSlider = document.getElementById('thickness-slider') as HTMLInputElement;

    this.radiusValue = document.getElementById('radius-value') as HTMLElement;
    this.iorValue = document.getElementById('ior-value') as HTMLElement;
    this.thicknessValue = document.getElementById('thickness-value') as HTMLElement;

    this.lensTypeDisplay = document.getElementById('lens-type-display') as HTMLElement;
    this.fluxDisplay = document.getElementById('flux-display') as HTMLElement;
    this.focalLengthDisplay = document.getElementById('focal-length') as HTMLElement;
    this.focalPositionDisplay = document.getElementById('focal-position') as HTMLElement;
    this.fpsDisplay = document.getElementById('fps-display') as HTMLElement;

    this.lensButtons = document.querySelectorAll('.lens-btn') as NodeListOf<HTMLButtonElement>;

    this.bindEvents();
    this.updateSliderBackgrounds();
  }

  private bindEvents(): void {
    this.radiusSlider.addEventListener('input', () => {
      const value = parseFloat(this.radiusSlider.value);
      this.lensSystem.setParams({ radius: value });
      this.radiusValue.textContent = value.toFixed(2);
      this.updateSliderBackground(this.radiusSlider);
      this.callbacks.onParamsChange();
    });

    this.iorSlider.addEventListener('input', () => {
      const value = parseFloat(this.iorSlider.value);
      this.lensSystem.setParams({ ior: value });
      this.iorValue.textContent = value.toFixed(2);
      this.updateSliderBackground(this.iorSlider);
      this.callbacks.onParamsChange();
    });

    this.thicknessSlider.addEventListener('input', () => {
      const value = parseFloat(this.thicknessSlider.value);
      this.lensSystem.setParams({ thickness: value });
      this.thicknessValue.textContent = value.toFixed(2);
      this.updateSliderBackground(this.thicknessSlider);
      this.callbacks.onParamsChange();
    });

    this.lensButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        const type = btn.dataset.type as LensType;
        this.lensSystem.setParams({ type });
        this.lensButtons.forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        this.lensTypeDisplay.textContent = LENS_TYPE_NAMES[type];
        this.callbacks.onParamsChange();
      });
    });
  }

  private updateSliderBackground(slider: HTMLInputElement): void {
    const min = parseFloat(slider.min);
    const max = parseFloat(slider.max);
    const value = parseFloat(slider.value);
    const percent = ((value - min) / (max - min)) * 100;
    slider.style.backgroundSize = `${percent}% 100%`;
  }

  private updateSliderBackgrounds(): void {
    this.updateSliderBackground(this.radiusSlider);
    this.updateSliderBackground(this.iorSlider);
    this.updateSliderBackground(this.thicknessSlider);
  }

  public updateFlux(flux: number): void {
    this.fluxDisplay.textContent = `${flux.toFixed(1)}%`;
  }

  public updateFocalInfo(focalLength: number, focalPos: { x: number; y: number; z: number }): void {
    if (isFinite(focalLength) && Math.abs(focalLength) < 100) {
      this.focalLengthDisplay.textContent = `${focalLength.toFixed(2)}`;
    } else {
      this.focalLengthDisplay.textContent = '∞';
    }

    if (isFinite(focalPos.x) && Math.abs(focalPos.x) < 100) {
      this.focalPositionDisplay.textContent = `(${focalPos.x.toFixed(2)}, ${focalPos.y.toFixed(2)}, ${focalPos.z.toFixed(2)})`;
    } else {
      this.focalPositionDisplay.textContent = '-';
    }
  }

  public updateFPS(fps: number): void {
    this.fpsDisplay.textContent = `${fps.toFixed(0)}`;
  }
}
