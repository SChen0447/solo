export interface ControlPanelEvents {
  onPulseChange: (freq: number) => void;
  onDistanceChange: (dist: number) => void;
  onThresholdChange: (threshold: number) => void;
}

export class ControlPanel {
  private container: HTMLElement;
  private events: ControlPanelEvents;

  constructor(containerId: string, events: ControlPanelEvents) {
    this.container = document.getElementById(containerId) as HTMLElement;
    this.events = events;
    this.build();
  }

  private build(): void {
    this.container.innerHTML = `
      <div style="padding: 20px; min-width: 240px;">
        <div style="color: #fff; font-size: 16px; font-weight: 600; margin-bottom: 18px; letter-spacing: 2px; text-shadow: 0 0 10px rgba(255,255,255,0.3);">
          ✦ 幻境织影
        </div>

        <div style="margin-bottom: 18px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
            <label style="color: #e0e0e0; font-size: 13px;">脉动频率</label>
            <span id="pulse-value" style="color: #ffd93d; font-size: 13px; font-weight: 600; text-shadow: 0 0 8px #ffd93d;">1.0 Hz</span>
          </div>
          <input type="range" id="pulse-slider" min="0.5" max="3" step="0.1" value="1"
            style="width: 100%; height: 4px; -webkit-appearance: none; appearance: none; background: linear-gradient(to right, #ff6b6b, #ffd93d, #6bcb77, #4d96ff, #ff6bcb, #c084fc); border-radius: 2px; outline: none; cursor: pointer;">
        </div>

        <div style="margin-bottom: 18px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
            <label style="color: #e0e0e0; font-size: 13px;">连线距离</label>
            <span id="distance-value" style="color: #4d96ff; font-size: 13px; font-weight: 600; text-shadow: 0 0 8px #4d96ff;">120 px</span>
          </div>
          <input type="range" id="distance-slider" min="50" max="200" step="5" value="120"
            style="width: 100%; height: 4px; -webkit-appearance: none; appearance: none; background: linear-gradient(to right, #ff6b6b, #ffd93d, #6bcb77, #4d96ff, #ff6bcb, #c084fc); border-radius: 2px; outline: none; cursor: pointer;">
        </div>

        <div>
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
            <label style="color: #e0e0e0; font-size: 13px;">星芒阈值</label>
            <span id="threshold-value" style="color: #c084fc; font-size: 13px; font-weight: 600; text-shadow: 0 0 8px #c084fc;">30 px</span>
          </div>
          <input type="range" id="threshold-slider" min="15" max="80" step="1" value="30"
            style="width: 100%; height: 4px; -webkit-appearance: none; appearance: none; background: linear-gradient(to right, #ff6b6b, #ffd93d, #6bcb77, #4d96ff, #ff6bcb, #c084fc); border-radius: 2px; outline: none; cursor: pointer;">
        </div>

        <div style="margin-top: 20px; padding-top: 15px; border-top: 1px solid rgba(255,255,255,0.1); color: #888; font-size: 11px; line-height: 1.6;">
          💫 拖拽画布生成光点<br>
          ✨ 点击光点触发爆炸
        </div>
      </div>
    `;

    this.bindEvents();
    this.injectSliderStyles();
  }

  private injectSliderStyles(): void {
    const styleId = 'control-panel-slider-styles';
    if (document.getElementById(styleId)) return;

    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      input[type="range"]::-webkit-slider-thumb {
        -webkit-appearance: none;
        appearance: none;
        width: 16px;
        height: 16px;
        border-radius: 50%;
        background: #fff;
        cursor: pointer;
        box-shadow: 0 0 10px rgba(255,255,255,0.8), 0 0 20px rgba(255,255,255,0.4);
        transition: transform 0.15s ease, box-shadow 0.15s ease;
      }
      input[type="range"]::-webkit-slider-thumb:hover {
        transform: scale(1.2);
        box-shadow: 0 0 15px rgba(255,255,255,1), 0 0 30px rgba(255,255,255,0.6);
      }
      input[type="range"]::-moz-range-thumb {
        width: 16px;
        height: 16px;
        border-radius: 50%;
        background: #fff;
        cursor: pointer;
        border: none;
        box-shadow: 0 0 10px rgba(255,255,255,0.8);
      }
    `;
    document.head.appendChild(style);
  }

  private bindEvents(): void {
    const pulseSlider = this.container.querySelector('#pulse-slider') as HTMLInputElement;
    const pulseValue = this.container.querySelector('#pulse-value') as HTMLElement;

    pulseSlider.addEventListener('input', (e) => {
      const value = parseFloat((e.target as HTMLInputElement).value);
      pulseValue.textContent = value.toFixed(1) + ' Hz';
      pulseValue.style.color = this.getFrequencyColor(value);
      pulseValue.style.textShadow = `0 0 8px ${this.getFrequencyColor(value)}`;
      this.events.onPulseChange(value);
    });

    const distanceSlider = this.container.querySelector('#distance-slider') as HTMLInputElement;
    const distanceValue = this.container.querySelector('#distance-value') as HTMLElement;

    distanceSlider.addEventListener('input', (e) => {
      const value = parseInt((e.target as HTMLInputElement).value, 10);
      distanceValue.textContent = value + ' px';
      distanceValue.style.color = this.getDistanceColor(value);
      distanceValue.style.textShadow = `0 0 8px ${this.getDistanceColor(value)}`;
      this.events.onDistanceChange(value);
    });

    const thresholdSlider = this.container.querySelector('#threshold-slider') as HTMLInputElement;
    const thresholdValue = this.container.querySelector('#threshold-value') as HTMLElement;

    thresholdSlider.addEventListener('input', (e) => {
      const value = parseInt((e.target as HTMLInputElement).value, 10);
      thresholdValue.textContent = value + ' px';
      thresholdValue.style.color = this.getThresholdColor(value);
      thresholdValue.style.textShadow = `0 0 8px ${this.getThresholdColor(value)}`;
      this.events.onThresholdChange(value);
    });
  }

  private getFrequencyColor(v: number): string {
    const t = (v - 0.5) / 2.5;
    return this.lerpColorHex('#ff6b6b', '#c084fc', t);
  }

  private getDistanceColor(v: number): string {
    const t = (v - 50) / 150;
    return this.lerpColorHex('#4d96ff', '#6bcb77', t);
  }

  private getThresholdColor(v: number): string {
    const t = (v - 15) / 65;
    return this.lerpColorHex('#ff6bcb', '#ffd93d', t);
  }

  private lerpColorHex(c1: string, c2: string, t: number): string {
    const hex = (s: string) => parseInt(s, 16);
    const r1 = hex(c1.slice(1, 3)), g1 = hex(c1.slice(3, 5)), b1 = hex(c1.slice(5, 7));
    const r2 = hex(c2.slice(1, 3)), g2 = hex(c2.slice(3, 5)), b2 = hex(c2.slice(5, 7));
    const r = Math.round(r1 + (r2 - r1) * t);
    const g = Math.round(g1 + (g2 - g1) * t);
    const b = Math.round(b1 + (b2 - b1) * t);
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  }
}
