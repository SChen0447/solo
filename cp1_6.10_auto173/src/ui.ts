export interface UIState {
  elasticity: number;
  particlesPerFrame: number;
  particleLife: number;
  backgroundBrightness: number;
  frozen: boolean;
  coloringMode: 'random' | 'mouse';
}

type ChangeCallback = (state: UIState) => void;
type ClearCallback = () => void;

export class ControlPanel {
  state: UIState;
  onChange: ChangeCallback;
  onClearTrail: ClearCallback;
  private container: HTMLElement | null = null;
  private buttonsContainer: HTMLElement | null = null;
  private frozenBtn: HTMLButtonElement | null = null;
  private coloringBtn: HTMLButtonElement | null = null;

  constructor(
    initialState: UIState,
    onChange: ChangeCallback,
    onClearTrail: ClearCallback
  ) {
    this.state = { ...initialState };
    this.onChange = onChange;
    this.onClearTrail = onClearTrail;
  }

  mount(overlay: HTMLElement): void {
    this.container = this.createPanel();
    this.buttonsContainer = this.createButtons();
    overlay.appendChild(this.container);
    overlay.appendChild(this.buttonsContainer);
  }

  private createPanel(): HTMLElement {
    const panel = document.createElement('div');
    panel.className = 'control-panel';

    const title = document.createElement('div');
    title.className = 'panel-title';
    title.textContent = '控制面板';
    panel.appendChild(title);

    panel.appendChild(this.createSlider(
      '弹性系数',
      this.state.elasticity,
      0.5, 1.0, 0.01,
      (v) => {
        this.state.elasticity = v;
        this.onChange(this.state);
      },
      (v) => v.toFixed(2)
    ));

    panel.appendChild(this.createSlider(
      '粒子数量',
      this.state.particlesPerFrame,
      2, 15, 1,
      (v) => {
        this.state.particlesPerFrame = Math.round(v);
        this.onChange(this.state);
      },
      (v) => Math.round(v).toString()
    ));

    panel.appendChild(this.createSlider(
      '粒子寿命',
      this.state.particleLife,
      0.5, 4.0, 0.1,
      (v) => {
        this.state.particleLife = v;
        this.onChange(this.state);
      },
      (v) => v.toFixed(1)
    ));

    panel.appendChild(this.createSlider(
      '背景亮度',
      this.state.backgroundBrightness,
      0.3, 1.0, 0.01,
      (v) => {
        this.state.backgroundBrightness = v;
        this.onChange(this.state);
      },
      (v) => v.toFixed(2)
    ));

    return panel;
  }

  private createSlider(
    label: string,
    initialValue: number,
    min: number,
    max: number,
    step: number,
    onChange: (value: number) => void,
    format: (v: number) => string
  ): HTMLElement {
    const group = document.createElement('div');
    group.className = 'slider-group';

    const labelRow = document.createElement('div');
    labelRow.className = 'slider-label';

    const nameSpan = document.createElement('span');
    nameSpan.textContent = label;

    const valueSpan = document.createElement('span');
    valueSpan.textContent = format(initialValue);

    labelRow.appendChild(nameSpan);
    labelRow.appendChild(valueSpan);

    const input = document.createElement('input');
    input.type = 'range';
    input.min = min.toString();
    input.max = max.toString();
    input.step = step.toString();
    input.value = initialValue.toString();

    input.addEventListener('input', (e) => {
      const val = parseFloat((e.target as HTMLInputElement).value);
      valueSpan.textContent = format(val);
      onChange(val);
    });

    group.appendChild(labelRow);
    group.appendChild(input);

    return group;
  }

  private createButtons(): HTMLElement {
    const wrapper = document.createElement('div');
    wrapper.className = 'button-group';

    const clearBtn = this.createIconButton(
      `<svg viewBox="0 0 24 24"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>`,
      '清除轨迹'
    );
    clearBtn.addEventListener('click', () => {
      this.animatePress(clearBtn);
      this.onClearTrail();
    });

    this.frozenBtn = this.createIconButton(
      `<svg viewBox="0 0 24 24"><rect x="6" y="6" width="12" height="12" rx="2"/><path d="M12 6v12M6 12h12"/></svg>`,
      '速度冻结'
    );
    this.frozenBtn.addEventListener('click', () => {
      this.animatePress(this.frozenBtn!);
      this.state.frozen = !this.state.frozen;
      this.frozenBtn!.classList.toggle('active', this.state.frozen);
      this.onChange(this.state);
    });

    this.coloringBtn = this.createIconButton(
      `<svg viewBox="0 0 24 24"><circle cx="13.5" cy="6.5" r="1.5"/><circle cx="17.5" cy="10.5" r="1.5"/><circle cx="8.5" cy="7.5" r="1.5"/><circle cx="6.5" cy="12.5" r="1.5"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c1.1 0 2-.9 2-2 0-.5-.2-1-.5-1.4-.3-.4-.5-.9-.5-1.4 0-1.1.9-2 2-2h1.4c2.5 0 4.6-2.1 4.6-4.6C21 6.3 17 2 12 2z"/></svg>`,
      '染色模式'
    );
    this.coloringBtn.addEventListener('click', () => {
      this.animatePress(this.coloringBtn!);
      this.state.coloringMode = this.state.coloringMode === 'random' ? 'mouse' : 'random';
      this.coloringBtn!.classList.toggle('active', this.state.coloringMode === 'mouse');
      this.onChange(this.state);
    });

    wrapper.appendChild(clearBtn);
    wrapper.appendChild(this.frozenBtn);
    wrapper.appendChild(this.coloringBtn);

    return wrapper;
  }

  private createIconButton(svgContent: string, title: string): HTMLButtonElement {
    const btn = document.createElement('button');
    btn.className = 'icon-btn';
    btn.title = title;
    btn.innerHTML = svgContent;
    return btn;
  }

  private animatePress(btn: HTMLElement): void {
    btn.style.transform = 'scale(0.9)';
    setTimeout(() => {
      btn.style.transform = '';
    }, 100);
  }
}
