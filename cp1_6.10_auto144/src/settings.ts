export interface GameSettings {
  minCells: number;
  maxCells: number;
  showDuration: number;
  soundEnabled: boolean;
}

const DEFAULT_SETTINGS: GameSettings = {
  minCells: 4,
  maxCells: 7,
  showDuration: 2,
  soundEnabled: true
};

const STORAGE_KEY = 'memoryGrid_settings';

export class SettingsManager {
  private settings: GameSettings;
  private button: HTMLButtonElement;
  private overlay: HTMLElement;
  private panel: HTMLElement;
  private isOpen: boolean = false;
  private onChange?: (settings: GameSettings) => void;

  constructor(parent: HTMLElement) {
    this.settings = this.loadSettings();
    this.button = this.createButton(parent);
    this.overlay = this.createOverlay();
    this.panel = this.createPanel();
    this.overlay.appendChild(this.panel);
    document.body.appendChild(this.overlay);
  }

  private loadSettings(): GameSettings {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return { ...DEFAULT_SETTINGS, ...parsed };
      }
    } catch {
      // use defaults
    }
    return { ...DEFAULT_SETTINGS };
  }

  private saveSettings(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.settings));
    } catch {
      // silently fail
    }
  }

  private createButton(parent: HTMLElement): HTMLButtonElement {
    const btn = document.createElement('button');
    btn.style.position = 'absolute';
    btn.style.top = '20px';
    btn.style.left = '20px';
    btn.style.width = '40px';
    btn.style.height = '40px';
    btn.style.borderRadius = '50%';
    btn.style.backgroundColor = '#383838';
    btn.style.border = 'none';
    btn.style.cursor = 'pointer';
    btn.style.display = 'flex';
    btn.style.alignItems = 'center';
    btn.style.justifyContent = 'center';
    btn.style.color = '#e0e0e0';
    btn.style.fontSize = '20px';
    btn.style.zIndex = '10';
    btn.style.transition = 'background-color 0.2s ease, transform 0.2s ease';
    btn.innerHTML = '&#9881;';

    btn.addEventListener('mouseenter', () => {
      btn.style.backgroundColor = '#4a4a4a';
    });
    btn.addEventListener('mouseleave', () => {
      btn.style.backgroundColor = '#383838';
    });
    btn.addEventListener('mousedown', () => {
      btn.style.transform = 'scale(0.95)';
    });
    btn.addEventListener('mouseup', () => {
      btn.style.transform = '';
    });
    btn.addEventListener('click', () => this.toggle());

    parent.appendChild(btn);
    return btn;
  }

  private createOverlay(): HTMLElement {
    const overlay = document.createElement('div');
    overlay.style.position = 'fixed';
    overlay.style.inset = '0';
    overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.67)';
    overlay.style.display = 'none';
    overlay.style.alignItems = 'center';
    overlay.style.justifyContent = 'center';
    overlay.style.zIndex = '100';
    overlay.style.backdropFilter = 'blur(4px)';

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) this.close();
    });

    return overlay;
  }

  private createPanel(): HTMLElement {
    const panel = document.createElement('div');
    panel.style.backgroundColor = '#1e1e24';
    panel.style.borderRadius = '12px';
    panel.style.padding = '28px';
    panel.style.width = '360px';
    panel.style.maxWidth = '90vw';
    panel.style.boxShadow = '0 10px 40px rgba(0,0,0,0.5), 0 0 30px #7c4dff30';
    panel.style.border = '1px solid #3a3a45';

    panel.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:24px;">
        <h2 style="font-size:18px;color:#e0e0e0;font-weight:600;">游戏设置</h2>
        <button id="settings-close" style="background:none;border:none;color:#888;font-size:22px;cursor:pointer;padding:4px;line-height:1;transition:color 0.2s ease;">&times;</button>
      </div>

      <div style="display:flex;flex-direction:column;gap:24px;">
        <div>
          <div style="display:flex;justify-content:space-between;margin-bottom:8px;">
            <label style="font-size:14px;color:#ccc;">最少亮起格子数</label>
            <span id="min-val" style="font-size:14px;color:#7c4dff;font-weight:600;">4</span>
          </div>
          <input type="range" id="min-cells" min="1" max="12" step="1" value="4"
            style="width:100%;height:6px;background:#444;border-radius:3px;appearance:none;cursor:pointer;outline:none;">
        </div>

        <div>
          <div style="display:flex;justify-content:space-between;margin-bottom:8px;">
            <label style="font-size:14px;color:#ccc;">最多亮起格子数</label>
            <span id="max-val" style="font-size:14px;color:#7c4dff;font-weight:600;">7</span>
          </div>
          <input type="range" id="max-cells" min="1" max="12" step="1" value="7"
            style="width:100%;height:6px;background:#444;border-radius:3px;appearance:none;cursor:pointer;outline:none;">
        </div>

        <div>
          <div style="display:flex;justify-content:space-between;margin-bottom:8px;">
            <label style="font-size:14px;color:#ccc;">亮起持续时间 (秒)</label>
            <span id="duration-val" style="font-size:14px;color:#7c4dff;font-weight:600;">2.0</span>
          </div>
          <input type="range" id="show-duration" min="1" max="3" step="0.5" value="2"
            style="width:100%;height:6px;background:#444;border-radius:3px;appearance:none;cursor:pointer;outline:none;">
        </div>

        <div style="display:flex;justify-content:space-between;align-items:center;">
          <label style="font-size:14px;color:#ccc;">声音反馈</label>
          <button id="sound-toggle" style="width:48px;height:26px;border-radius:13px;border:none;cursor:pointer;position:relative;transition:background-color 0.2s ease;">
            <span id="sound-knob" style="position:absolute;top:3px;width:20px;height:20px;border-radius:50%;background:#fff;transition:left 0.2s ease;"></span>
          </button>
        </div>
      </div>
    `;

    this.bindPanelEvents(panel);
    this.updatePanelValues(panel);
    return panel;
  }

  private bindPanelEvents(panel: HTMLElement): void {
    const closeBtn = panel.querySelector('#settings-close') as HTMLElement;
    closeBtn.addEventListener('click', () => this.close());
    closeBtn.addEventListener('mouseenter', () => {
      closeBtn.style.color = '#e0e0e0';
    });
    closeBtn.addEventListener('mouseleave', () => {
      closeBtn.style.color = '#888';
    });

    const minSlider = panel.querySelector('#min-cells') as HTMLInputElement;
    const maxSlider = panel.querySelector('#max-cells') as HTMLInputElement;
    const durationSlider = panel.querySelector('#show-duration') as HTMLInputElement;
    const soundToggle = panel.querySelector('#sound-toggle') as HTMLButtonElement;

    minSlider.addEventListener('input', () => {
      let val = parseInt(minSlider.value, 10);
      if (val > this.settings.maxCells) {
        val = this.settings.maxCells;
        minSlider.value = String(val);
      }
      this.settings.minCells = val;
      (panel.querySelector('#min-val') as HTMLElement).textContent = String(val);
      this.emitChange();
    });

    maxSlider.addEventListener('input', () => {
      let val = parseInt(maxSlider.value, 10);
      if (val < this.settings.minCells) {
        val = this.settings.minCells;
        maxSlider.value = String(val);
      }
      this.settings.maxCells = val;
      (panel.querySelector('#max-val') as HTMLElement).textContent = String(val);
      this.emitChange();
    });

    durationSlider.addEventListener('input', () => {
      const val = parseFloat(durationSlider.value);
      this.settings.showDuration = val;
      (panel.querySelector('#duration-val') as HTMLElement).textContent = val.toFixed(1);
      this.emitChange();
    });

    soundToggle.addEventListener('click', () => {
      this.settings.soundEnabled = !this.settings.soundEnabled;
      this.updateSoundToggle(panel);
      this.emitChange();
    });
  }

  private updatePanelValues(panel: HTMLElement): void {
    (panel.querySelector('#min-cells') as HTMLInputElement).value = String(this.settings.minCells);
    (panel.querySelector('#max-cells') as HTMLInputElement).value = String(this.settings.maxCells);
    (panel.querySelector('#show-duration') as HTMLInputElement).value = String(this.settings.showDuration);
    (panel.querySelector('#min-val') as HTMLElement).textContent = String(this.settings.minCells);
    (panel.querySelector('#max-val') as HTMLElement).textContent = String(this.settings.maxCells);
    (panel.querySelector('#duration-val') as HTMLElement).textContent = this.settings.showDuration.toFixed(1);
    this.updateSoundToggle(panel);
  }

  private updateSoundToggle(panel: HTMLElement): void {
    const toggle = panel.querySelector('#sound-toggle') as HTMLButtonElement;
    const knob = panel.querySelector('#sound-knob') as HTMLElement;
    if (this.settings.soundEnabled) {
      toggle.style.backgroundColor = '#4caf50';
      knob.style.left = '25px';
    } else {
      toggle.style.backgroundColor = '#666';
      knob.style.left = '3px';
    }
  }

  private emitChange(): void {
    this.saveSettings();
    this.onChange?.(this.getSettings());
  }

  public toggle(): void {
    if (this.isOpen) this.close();
    else this.open();
  }

  public open(): void {
    this.isOpen = true;
    this.overlay.style.display = 'flex';
  }

  public close(): void {
    this.isOpen = false;
    this.overlay.style.display = 'none';
  }

  public getSettings(): GameSettings {
    return { ...this.settings };
  }

  public setOnChange(callback: (settings: GameSettings) => void): void {
    this.onChange = callback;
  }

  public destroy(): void {
    this.button.remove();
    this.overlay.remove();
  }
}

const sliderStyle = document.createElement('style');
sliderStyle.textContent = `
  input[type="range"]::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 18px;
    height: 18px;
    border-radius: 50%;
    background: #7c4dff;
    cursor: pointer;
    border: 2px solid #fff;
    transition: transform 0.15s ease, box-shadow 0.15s ease;
  }
  input[type="range"]::-webkit-slider-thumb:hover {
    transform: scale(1.15);
    box-shadow: 0 0 10px #7c4dff80;
  }
  input[type="range"]::-moz-range-thumb {
    width: 18px;
    height: 18px;
    border-radius: 50%;
    background: #7c4dff;
    cursor: pointer;
    border: 2px solid #fff;
  }
  input[type="range"]:focus {
    outline: none;
  }
`;
document.head.appendChild(sliderStyle);
