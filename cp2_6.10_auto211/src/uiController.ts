import { PlantParams, PRESETS } from './plantGen';
import { SceneManager, GrowthState, SceneStats } from './sceneManager';

export class UIController {
  private sceneManager: SceneManager;

  private angleSlider: HTMLInputElement;
  private angleValue: HTMLElement;
  private depthSlider: HTMLInputElement;
  private depthValue: HTMLElement;
  private decaySlider: HTMLInputElement;
  private decayValue: HTMLElement;
  private noiseSlider: HTMLInputElement;
  private noiseValue: HTMLElement;

  private growBtn: HTMLButtonElement;
  private resetBtn: HTMLButtonElement;
  private exportBtn: HTMLButtonElement;
  private presetBtns: NodeListOf<HTMLButtonElement>;

  private fpsCounter: HTMLElement;
  private branchCounter: HTMLElement;

  private controlPanel: HTMLElement;
  private panelToggle: HTMLElement;

  private currentParams: PlantParams;
  private activePreset: string | null = null;

  constructor(sceneManager: SceneManager) {
    this.sceneManager = sceneManager;
    this.currentParams = sceneManager.getParams();

    this.angleSlider = document.getElementById('angleSlider') as HTMLInputElement;
    this.angleValue = document.getElementById('angleValue') as HTMLElement;
    this.depthSlider = document.getElementById('depthSlider') as HTMLInputElement;
    this.depthValue = document.getElementById('depthValue') as HTMLElement;
    this.decaySlider = document.getElementById('decaySlider') as HTMLInputElement;
    this.decayValue = document.getElementById('decayValue') as HTMLElement;
    this.noiseSlider = document.getElementById('noiseSlider') as HTMLInputElement;
    this.noiseValue = document.getElementById('noiseValue') as HTMLElement;

    this.growBtn = document.getElementById('growBtn') as HTMLButtonElement;
    this.resetBtn = document.getElementById('resetBtn') as HTMLButtonElement;
    this.exportBtn = document.getElementById('exportBtn') as HTMLButtonElement;
    this.presetBtns = document.querySelectorAll('.preset-btn') as NodeListOf<HTMLButtonElement>;

    this.fpsCounter = document.getElementById('fpsCounter') as HTMLElement;
    this.branchCounter = document.getElementById('branchCounter') as HTMLElement;

    this.controlPanel = document.getElementById('controlPanel') as HTMLElement;
    this.panelToggle = document.getElementById('panelToggle') as HTMLElement;

    this.syncUIWithParams();
    this.bindEvents();
    this.setupStatsListener();
  }

  private syncUIWithParams(): void {
    this.angleSlider.value = this.currentParams.branchAngle.toString();
    this.angleValue.textContent = `${this.currentParams.branchAngle}°`;

    this.depthSlider.value = this.currentParams.branchDepth.toString();
    this.depthValue.textContent = this.currentParams.branchDepth.toString();

    this.decaySlider.value = this.currentParams.lengthDecay.toString();
    this.decayValue.textContent = this.currentParams.lengthDecay.toFixed(2);

    this.noiseSlider.value = this.currentParams.noiseStrength.toString();
    this.noiseValue.textContent = this.currentParams.noiseStrength.toFixed(2);
  }

  private updatePresetButtons(activePreset: string | null): void {
    this.activePreset = activePreset;
    this.presetBtns.forEach((btn) => {
      const preset = btn.dataset.preset || null;
      if (preset === activePreset) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });
  }

  private checkPresetMatch(): void {
    let matchedPreset: string | null = null;

    for (const [key, preset] of Object.entries(PRESETS)) {
      const p = preset.params;
      if (
        p.branchAngle === this.currentParams.branchAngle &&
        p.branchDepth === this.currentParams.branchDepth &&
        Math.abs(p.lengthDecay - this.currentParams.lengthDecay) < 0.001 &&
        Math.abs(p.noiseStrength - this.currentParams.noiseStrength) < 0.001
      ) {
        matchedPreset = key;
        break;
      }
    }

    this.updatePresetButtons(matchedPreset);
  }

  private bindEvents(): void {
    this.angleSlider.addEventListener('input', (e) => {
      const value = parseInt((e.target as HTMLInputElement).value, 10);
      this.currentParams.branchAngle = value;
      this.angleValue.textContent = `${value}°`;
      this.sceneManager.updateParams(this.currentParams);
      this.checkPresetMatch();
    });

    this.depthSlider.addEventListener('input', (e) => {
      const value = parseInt((e.target as HTMLInputElement).value, 10);
      this.currentParams.branchDepth = value;
      this.depthValue.textContent = value.toString();
      this.sceneManager.updateParams(this.currentParams);
      this.checkPresetMatch();
    });

    this.decaySlider.addEventListener('input', (e) => {
      const value = parseFloat((e.target as HTMLInputElement).value);
      this.currentParams.lengthDecay = value;
      this.decayValue.textContent = value.toFixed(2);
      this.sceneManager.updateParams(this.currentParams);
      this.checkPresetMatch();
    });

    this.noiseSlider.addEventListener('input', (e) => {
      const value = parseFloat((e.target as HTMLInputElement).value);
      this.currentParams.noiseStrength = value;
      this.noiseValue.textContent = value.toFixed(2);
      this.sceneManager.updateParams(this.currentParams);
      this.checkPresetMatch();
    });

    this.presetBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        const presetKey = btn.dataset.preset;
        if (presetKey && PRESETS[presetKey]) {
          this.applyPreset(presetKey);
        }
      });
    });

    this.growBtn.addEventListener('click', () => {
      this.handleGrowClick();
    });

    this.resetBtn.addEventListener('click', () => {
      this.sceneManager.resetPlant();
      this.updateGrowButton('idle');
    });

    this.exportBtn.addEventListener('click', () => {
      this.handleExport();
    });

    if (this.panelToggle) {
      this.panelToggle.addEventListener('click', () => {
        this.controlPanel.classList.toggle('expanded');
      });
    }
  }

  private applyPreset(presetKey: string): void {
    const preset = PRESETS[presetKey];
    if (!preset) return;

    this.currentParams = { ...preset.params };
    this.syncUIWithParams();
    this.sceneManager.updateParams(this.currentParams);
    this.updatePresetButtons(presetKey);
  }

  private handleGrowClick(): void {
    const state = this.sceneManager.getGrowthState();

    if (state === 'idle') {
      this.sceneManager.startGrowthAnimation();
      this.updateGrowButton('growing');
    } else if (state === 'growing') {
      this.sceneManager.pauseGrowthAnimation();
      this.updateGrowButton('paused');
    } else if (state === 'paused') {
      this.sceneManager.resumeGrowthAnimation();
      this.updateGrowButton('growing');
    }
  }

  private updateGrowButton(state: GrowthState): void {
    if (state === 'growing') {
      this.growBtn.textContent = '⏸ 暂停';
    } else if (state === 'paused') {
      this.growBtn.textContent = '▶ 继续';
    } else {
      this.growBtn.textContent = '▶ 生长动画';
    }
  }

  private handleExport(): void {
    const objContent = this.sceneManager.exportOBJ();
    if (!objContent) return;

    const blob = new Blob([objContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = `fractal-plant-${Date.now()}.obj`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);
  }

  private setupStatsListener(): void {
    this.sceneManager.setOnStatsChange((stats: SceneStats) => {
      this.fpsCounter.textContent = stats.fps.toString();
      this.branchCounter.textContent = stats.branchCount.toString();
    });
  }

  public getCurrentParams(): PlantParams {
    return { ...this.currentParams };
  }
}
