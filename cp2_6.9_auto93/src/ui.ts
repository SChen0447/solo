import { AutomatonRule, RuleConfig, parseRuleString } from './automaton';
import { ColorTheme, ThemeColors, THEME_PRESETS } from './renderer';

export interface UIConfig {
  rule: AutomatonRule;
  customRules: RuleConfig;
  theme: ColorTheme;
  customTheme: ThemeColors;
  speed: number;
  paused: boolean;
}

export type ConfigChangeListener = (config: UIConfig) => void;
export type ActionType = 'reset' | 'pause' | 'resume';
export type ActionListener = (action: ActionType) => void;

export class UIController {
  private config: UIConfig = {
    rule: AutomatonRule.Conway,
    customRules: { survive: [2, 3], birth: [3] },
    theme: ColorTheme.Eden,
    customTheme: { primary: '#00FF88', secondary: '#FF00AA', accent: '#7BFFD4' },
    speed: 1,
    paused: false
  };

  private configListeners: Set<ConfigChangeListener> = new Set();
  private actionListeners: Set<ActionListener> = new Set();

  private ruleSelect: HTMLSelectElement;
  private themeSelect: HTMLSelectElement;
  private speedSlider: HTMLInputElement;
  private speedValue: HTMLElement;
  private resetBtn: HTMLButtonElement;
  private pauseBtn: HTMLButtonElement;
  private customRulesContainer: HTMLElement;
  private surviveInput: HTMLInputElement;
  private birthInput: HTMLInputElement;
  private customColorInputs: HTMLElement;
  private customColor1: HTMLInputElement;
  private customColor2: HTMLInputElement;

  constructor() {
    this.ruleSelect = document.getElementById('ruleSelect') as HTMLSelectElement;
    this.themeSelect = document.getElementById('themeSelect') as HTMLSelectElement;
    this.speedSlider = document.getElementById('speedSlider') as HTMLInputElement;
    this.speedValue = document.getElementById('speedValue') as HTMLElement;
    this.resetBtn = document.getElementById('resetBtn') as HTMLButtonElement;
    this.pauseBtn = document.getElementById('pauseBtn') as HTMLButtonElement;
    this.customRulesContainer = document.getElementById('customRulesContainer') as HTMLElement;
    this.surviveInput = document.getElementById('surviveRules') as HTMLInputElement;
    this.birthInput = document.getElementById('birthRules') as HTMLInputElement;
    this.customColorInputs = document.getElementById('customColorInputs') as HTMLElement;
    this.customColor1 = document.getElementById('customColor1') as HTMLInputElement;
    this.customColor2 = document.getElementById('customColor2') as HTMLInputElement;

    this.bindEvents();
  }

  private bindEvents(): void {
    this.ruleSelect.addEventListener('change', (e) => {
      const value = (e.target as HTMLSelectElement).value as AutomatonRule;
      this.config.rule = value;
      this.customRulesContainer.classList.toggle('hidden', value !== AutomatonRule.Custom);
      this.notifyConfigChange();
    });

    this.themeSelect.addEventListener('change', (e) => {
      const value = (e.target as HTMLSelectElement).value as ColorTheme;
      this.config.theme = value;
      this.customColorInputs.classList.toggle('hidden', value !== ColorTheme.Custom);
      this.notifyConfigChange();
    });

    this.speedSlider.addEventListener('input', (e) => {
      const value = parseFloat((e.target as HTMLInputElement).value);
      this.config.speed = value;
      this.speedValue.textContent = `${value.toFixed(1)}x`;
      this.notifyConfigChange();
    });

    this.resetBtn.addEventListener('click', () => {
      this.notifyAction('reset');
    });

    this.pauseBtn.addEventListener('click', () => {
      this.config.paused = !this.config.paused;
      this.pauseBtn.textContent = this.config.paused ? 'RESUME' : 'PAUSE';
      this.notifyAction(this.config.paused ? 'pause' : 'resume');
    });

    this.surviveInput.addEventListener('change', (e) => {
      const value = (e.target as HTMLInputElement).value;
      this.config.customRules.survive = parseRuleString(value);
      this.notifyConfigChange();
    });

    this.birthInput.addEventListener('change', (e) => {
      const value = (e.target as HTMLInputElement).value;
      this.config.customRules.birth = parseRuleString(value);
      this.notifyConfigChange();
    });

    this.customColor1.addEventListener('input', (e) => {
      const value = (e.target as HTMLInputElement).value;
      this.config.customTheme.primary = value;
      this.config.customTheme.accent = this.lightenColor(value, 30);
      this.notifyConfigChange();
    });

    this.customColor2.addEventListener('input', (e) => {
      const value = (e.target as HTMLInputElement).value;
      this.config.customTheme.secondary = value;
      this.notifyConfigChange();
    });
  }

  private lightenColor(hex: string, percent: number): string {
    const num = parseInt(hex.replace('#', ''), 16);
    const r = Math.min(255, (num >> 16) + Math.round(2.55 * percent));
    const g = Math.min(255, ((num >> 8) & 0x00FF) + Math.round(2.55 * percent));
    const b = Math.min(255, (num & 0x0000FF) + Math.round(2.55 * percent));
    return '#' + (1 << 24 | r << 16 | g << 8 | b).toString(16).slice(1);
  }

  public onConfigChange(listener: ConfigChangeListener): void {
    this.configListeners.add(listener);
    listener(this.config);
  }

  public offConfigChange(listener: ConfigChangeListener): void {
    this.configListeners.delete(listener);
  }

  public onAction(listener: ActionListener): void {
    this.actionListeners.add(listener);
  }

  public offAction(listener: ActionListener): void {
    this.actionListeners.delete(listener);
  }

  private notifyConfigChange(): void {
    for (const listener of this.configListeners) {
      listener(this.config);
    }
  }

  private notifyAction(action: ActionType): void {
    for (const listener of this.actionListeners) {
      listener(action);
    }
  }

  public getConfig(): UIConfig {
    return { ...this.config };
  }

  public getActiveThemeColors(): ThemeColors {
    if (this.config.theme === ColorTheme.Custom) {
      return this.config.customTheme;
    }
    return THEME_PRESETS[this.config.theme];
  }

  public getActiveRuleConfig(): RuleConfig {
    if (this.config.rule === AutomatonRule.Custom) {
      return this.config.customRules;
    }
    const preset = {
      [AutomatonRule.Conway]: { survive: [2, 3], birth: [3] },
      [AutomatonRule.HighLife]: { survive: [2, 3], birth: [3, 6] },
      [AutomatonRule.DayNight]: { survive: [3, 4, 6, 7, 8], birth: [3, 6, 7, 8] },
      [AutomatonRule.Seeds]: { survive: [], birth: [2] },
      [AutomatonRule.Life34]: { survive: [3, 4], birth: [3, 4] },
      [AutomatonRule.Custom]: this.config.customRules
    };
    return preset[this.config.rule];
  }
}
