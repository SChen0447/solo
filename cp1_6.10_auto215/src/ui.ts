export interface UIState {
  score: number;
  beamSpeed: number;
  rotationSensitivity: number;
  maxSplits: number;
}

export interface UICallbacks {
  onBeamSpeedChange: (v: number) => void;
  onRotationSensitivityChange: (v: number) => void;
  onMaxSplitsChange: (v: number) => void;
  onReset: () => void;
}

export class UIController {
  private container: HTMLDivElement;
  private scoreEl: HTMLDivElement;
  private callbacks: UICallbacks;
  public scoreAnim: number;
  public scoreTarget: number;
  public scoreDisplay: number;

  constructor(parent: HTMLElement, initialState: UIState, callbacks: UICallbacks) {
    this.callbacks = callbacks;
    this.scoreAnim = 0;
    this.scoreTarget = initialState.score;
    this.scoreDisplay = initialState.score;

    this.container = document.createElement('div');
    this.applyPanelStyle(this.container);
    parent.appendChild(this.container);

    this.scoreEl = this.createScoreDisplay(initialState.score);
    this.container.appendChild(this.scoreEl);

    this.container.appendChild(
      this.createSlider(
        '光束速度',
        initialState.beamSpeed,
        50,
        200,
        1,
        callbacks.onBeamSpeedChange
      )
    );

    this.container.appendChild(
      this.createSlider(
        '旋转灵敏度',
        initialState.rotationSensitivity,
        1,
        5,
        1,
        callbacks.onRotationSensitivityChange
      )
    );

    this.container.appendChild(
      this.createSlider(
        '最大分裂次数',
        initialState.maxSplits,
        1,
        3,
        1,
        callbacks.onMaxSplitsChange
      )
    );

    this.container.appendChild(this.createResetButton(callbacks.onReset));
  }

  private applyPanelStyle(el: HTMLDivElement): void {
    el.style.position = 'absolute';
    el.style.left = '12px';
    el.style.top = '12px';
    el.style.width = '180px';
    el.style.padding = '16px';
    el.style.background = 'rgba(26, 26, 46, 0.8)';
    el.style.borderRadius = '12px';
    el.style.color = '#fff';
    el.style.fontFamily = '"Segoe UI", Arial, sans-serif';
    el.style.backdropFilter = 'blur(8px)';
    el.style.zIndex = '10';
    el.style.userSelect = 'none';
  }

  private createScoreDisplay(initial: number): HTMLDivElement {
    const wrap = document.createElement('div');
    wrap.style.marginBottom = '20px';
    wrap.style.textAlign = 'center';

    const label = document.createElement('div');
    label.textContent = '得分';
    label.style.fontSize = '13px';
    label.style.color = '#aaa';
    label.style.marginBottom = '4px';
    wrap.appendChild(label);

    const val = document.createElement('div');
    val.textContent = String(initial);
    val.style.fontSize = '28px';
    val.style.fontWeight = 'bold';
    val.style.color = '#ffffff';
    val.style.textShadow = '0 0 12px #ff6b8a, 0 0 24px #ff6b8a';
    val.style.transition = 'transform 0.15s ease-out';
    wrap.appendChild(val);

    return wrap;
  }

  private createSlider(
    label: string,
    value: number,
    min: number,
    max: number,
    step: number,
    onChange: (v: number) => void
  ): HTMLDivElement {
    const wrap = document.createElement('div');
    wrap.style.marginBottom = '16px';

    const head = document.createElement('div');
    head.style.display = 'flex';
    head.style.justifyContent = 'space-between';
    head.style.alignItems = 'center';
    head.style.marginBottom = '6px';

    const labelEl = document.createElement('span');
    labelEl.textContent = label;
    labelEl.style.fontSize = '12px';
    labelEl.style.color = '#ccc';

    const valEl = document.createElement('span');
    valEl.textContent = String(value);
    valEl.style.fontSize = '12px';
    valEl.style.color = '#4fc3f7';
    valEl.style.fontWeight = 'bold';

    head.appendChild(labelEl);
    head.appendChild(valEl);
    wrap.appendChild(head);

    const input = document.createElement('input');
    input.type = 'range';
    input.min = String(min);
    input.max = String(max);
    input.step = String(step);
    input.value = String(value);
    input.style.width = '100%';
    input.style.height = '6px';
    input.style.appearance = 'none';
    input.style.background = '#333';
    input.style.borderRadius = '3px';
    input.style.outline = 'none';
    input.style.cursor = 'pointer';
    input.style.accentColor = '#4fc3f7';

    const styleSheet = document.createElement('style');
    styleSheet.textContent = `
      input[type="range"]::-webkit-slider-thumb {
        -webkit-appearance: none;
        appearance: none;
        width: 16px;
        height: 16px;
        border-radius: 50%;
        background: #4fc3f7;
        cursor: pointer;
        box-shadow: 0 0 8px #4fc3f7, 0 0 16px #4fc3f7;
      }
      input[type="range"]::-moz-range-thumb {
        width: 16px;
        height: 16px;
        border-radius: 50%;
        background: #4fc3f7;
        cursor: pointer;
        border: none;
        box-shadow: 0 0 8px #4fc3f7, 0 0 16px #4fc3f7;
      }
    `;
    document.head.appendChild(styleSheet);

    input.addEventListener('input', () => {
      const v = Number(input.value);
      valEl.textContent = String(v);
      onChange(v);
    });

    wrap.appendChild(input);
    return wrap;
  }

  private createResetButton(onClick: () => void): HTMLButtonElement {
    const btn = document.createElement('button');
    btn.textContent = '重置游戏';
    btn.style.width = '100%';
    btn.style.padding = '10px';
    btn.style.marginTop = '8px';
    btn.style.background = '#ff6b8a';
    btn.style.color = '#fff';
    btn.style.border = 'none';
    btn.style.borderRadius = '8px';
    btn.style.fontSize = '14px';
    btn.style.fontWeight = 'bold';
    btn.style.cursor = 'pointer';
    btn.style.transition = 'background 0.2s, transform 0.1s';
    btn.style.boxShadow = '0 0 10px rgba(255, 107, 138, 0.5)';

    btn.addEventListener('mouseenter', () => {
      btn.style.background = '#ff8a9e';
    });
    btn.addEventListener('mouseleave', () => {
      btn.style.background = '#ff6b8a';
    });
    btn.addEventListener('mousedown', () => {
      btn.style.transform = 'scale(0.97)';
    });
    btn.addEventListener('mouseup', () => {
      btn.style.transform = 'scale(1)';
    });
    btn.addEventListener('click', onClick);

    return btn;
  }

  public addScore(amount: number): void {
    this.scoreTarget += amount;
    this.scoreAnim = 1;
  }

  public resetScore(): void {
    this.scoreTarget = 0;
    this.scoreDisplay = 0;
    this.scoreAnim = 0;
    const val = this.scoreEl.querySelector('div:last-child') as HTMLDivElement;
    if (val) val.textContent = '0';
  }

  public update(dt: number): void {
    if (this.scoreDisplay !== this.scoreTarget) {
      const diff = this.scoreTarget - this.scoreDisplay;
      this.scoreDisplay += diff * Math.min(1, dt * 10);
      if (Math.abs(diff) < 0.5) this.scoreDisplay = this.scoreTarget;
      const val = this.scoreEl.querySelector('div:last-child') as HTMLDivElement;
      if (val) val.textContent = String(Math.round(this.scoreDisplay));
    }

    if (this.scoreAnim > 0) {
      this.scoreAnim = Math.max(0, this.scoreAnim - dt * 3);
      const val = this.scoreEl.querySelector('div:last-child') as HTMLDivElement;
      if (val) {
        const s = 1 + this.scoreAnim * 0.3;
        val.style.transform = `scale(${s})`;
      }
    }
  }

  public getScore(): number {
    return this.scoreTarget;
  }

  public destroy(): void {
    this.container.remove();
  }
}
