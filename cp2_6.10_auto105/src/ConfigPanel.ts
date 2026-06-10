import { throttle } from 'lodash';
import { AnimationConfig, DEFAULT_CONFIG, EasingType, ExpandDirection, TriggerMode } from './types';

export class ConfigPanel {
  private container: HTMLElement;
  private config: AnimationConfig;
  private easingSelect!: HTMLSelectElement;
  private cubicBezierInput!: HTMLInputElement;
  private stepsInput!: HTMLInputElement;
  private directionSelect!: HTMLSelectElement;
  private durationSlider!: HTMLInputElement;
  private durationValue!: HTMLElement;
  private triggerRadios!: NodeListOf<HTMLInputElement>;
  private mobileToggle!: HTMLElement;

  constructor(containerId: string) {
    this.container = document.getElementById(containerId) as HTMLElement;
    if (!this.container) {
      throw new Error(`Container with id "${containerId}" not found`);
    }
    this.config = { ...DEFAULT_CONFIG };
    this.render();
    this.bindEvents();
  }

  private render(): void {
    this.container.innerHTML = `
      <div class="panel-header">
        <h2>动画配置</h2>
        <button class="mobile-toggle" id="mobileToggle" aria-label="切换面板">
          <span></span>
          <span></span>
        </button>
      </div>
      <div class="panel-content">
        <div class="control-group">
          <label for="easingSelect">缓动曲线</label>
          <select id="easingSelect" class="control-select">
            <option value="ease">ease</option>
            <option value="ease-in">ease-in</option>
            <option value="ease-out">ease-out</option>
            <option value="ease-in-out">ease-in-out</option>
            <option value="cubic-bezier">cubic-bezier 自定义</option>
            <option value="steps">steps 步进</option>
          </select>
        </div>

        <div class="control-group" id="cubicBezierGroup" style="display:none;">
          <label for="cubicBezierInput">cubic-bezier 参数 (x1, y1, x2, y2)</label>
          <input type="text" id="cubicBezierInput" class="control-input" value="0.42, 0, 0.58, 1" placeholder="0.42, 0, 0.58, 1">
        </div>

        <div class="control-group" id="stepsGroup" style="display:none;">
          <label for="stepsInput">steps 参数 (n, start|end)</label>
          <input type="text" id="stepsInput" class="control-input" value="4, end" placeholder="4, end">
        </div>

        <div class="control-group">
          <label for="directionSelect">展开方向</label>
          <select id="directionSelect" class="control-select">
            <option value="down">从上往下</option>
            <option value="right">从左往右</option>
            <option value="center">从中心向四周</option>
          </select>
        </div>

        <div class="control-group">
          <label for="durationSlider">
            动画速度
            <span class="value-display" id="durationValue">600ms</span>
          </label>
          <input type="range" id="durationSlider" class="control-slider" min="100" max="2000" step="50" value="600">
          <div class="slider-labels">
            <span>100ms 快</span>
            <span>2000ms 慢</span>
          </div>
        </div>

        <div class="control-group">
          <label>触发方式</label>
          <div class="radio-group">
            <label class="radio-label">
              <input type="radio" name="triggerMode" value="click" checked>
              <span>点击触发</span>
            </label>
            <label class="radio-label">
              <input type="radio" name="triggerMode" value="hover">
              <span>悬停触发</span>
            </label>
            <label class="radio-label">
              <input type="radio" name="triggerMode" value="both">
              <span>点击 + 悬停</span>
            </label>
          </div>
        </div>
      </div>
    `;

    this.easingSelect = this.container.querySelector('#easingSelect') as HTMLSelectElement;
    this.cubicBezierInput = this.container.querySelector('#cubicBezierInput') as HTMLInputElement;
    this.stepsInput = this.container.querySelector('#stepsInput') as HTMLInputElement;
    this.directionSelect = this.container.querySelector('#directionSelect') as HTMLSelectElement;
    this.durationSlider = this.container.querySelector('#durationSlider') as HTMLInputElement;
    this.durationValue = this.container.querySelector('#durationValue') as HTMLElement;
    this.triggerRadios = this.container.querySelectorAll('input[name="triggerMode"]');
    this.mobileToggle = this.container.querySelector('#mobileToggle') as HTMLElement;
  }

  private bindEvents(): void {
    this.easingSelect.addEventListener('change', () => {
      this.config.easing = this.easingSelect.value as EasingType;
      this.updateConditionalFields();
      this.emitChange();
    });

    this.cubicBezierInput.addEventListener('input', throttle(() => {
      this.config.cubicBezierParams = this.cubicBezierInput.value;
      this.emitChange();
    }, 16));

    this.stepsInput.addEventListener('input', throttle(() => {
      this.config.stepsParams = this.stepsInput.value;
      this.emitChange();
    }, 16));

    this.directionSelect.addEventListener('change', () => {
      this.config.direction = this.directionSelect.value as ExpandDirection;
      this.emitChange();
    });

    this.durationSlider.addEventListener('input', throttle(() => {
      const value = parseInt(this.durationSlider.value, 10);
      this.config.duration = value;
      this.durationValue.textContent = `${value}ms`;
      this.emitChange();
    }, 16));

    this.triggerRadios.forEach((radio) => {
      radio.addEventListener('change', () => {
        if (radio.checked) {
          this.config.trigger = radio.value as TriggerMode;
          this.emitChange();
        }
      });
    });

    this.mobileToggle.addEventListener('click', () => {
      this.container.classList.toggle('mobile-collapsed');
    });
  }

  private updateConditionalFields(): void {
    const cubicGroup = this.container.querySelector('#cubicBezierGroup') as HTMLElement;
    const stepsGroup = this.container.querySelector('#stepsGroup') as HTMLElement;
    cubicGroup.style.display = this.config.easing === 'cubic-bezier' ? 'block' : 'none';
    stepsGroup.style.display = this.config.easing === 'steps' ? 'block' : 'none';
  }

  private emitChange(): void {
    const event = new CustomEvent('config:change', {
      detail: { config: { ...this.config } }
    });
    this.container.dispatchEvent(event);
  }

  public getConfig(): AnimationConfig {
    return { ...this.config };
  }

  public resetToDefault(): void {
    this.config = { ...DEFAULT_CONFIG };
    this.easingSelect.value = this.config.easing;
    this.cubicBezierInput.value = this.config.cubicBezierParams || '0.42, 0, 0.58, 1';
    this.stepsInput.value = this.config.stepsParams || '4, end';
    this.directionSelect.value = this.config.direction;
    this.durationSlider.value = String(this.config.duration);
    this.durationValue.textContent = `${this.config.duration}ms`;
    this.triggerRadios.forEach((radio) => {
      radio.checked = radio.value === this.config.trigger;
    });
    this.updateConditionalFields();
    this.emitChange();
  }
}
