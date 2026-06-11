import gsap from 'gsap';

export interface UIConfig {
  windDirection: number;
  brightness: number;
}

export interface UIControls {
  config: UIConfig;
  onWindChange: (deg: number) => void;
  onBrightnessChange: (val: number) => void;
}

export function createUI(controls: UIControls): void {
  const style = document.createElement('style');
  style.textContent = `
    .ui-panel {
      position: fixed;
      top: 50%;
      right: 24px;
      transform: translateY(-50%);
      width: 260px;
      padding: 22px 20px;
      background: rgba(255, 255, 255, 0.12);
      backdrop-filter: blur(14px);
      -webkit-backdrop-filter: blur(14px);
      border: 1px solid rgba(135, 206, 235, 0.4);
      border-radius: 18px;
      box-shadow: 0 8px 32px rgba(11, 15, 36, 0.35),
                  inset 0 1px 0 rgba(255, 255, 255, 0.15);
      z-index: 50;
      color: #e8f6ff;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    }
    .ui-panel:hover {
      background: rgba(255, 255, 255, 0.18);
      border-color: rgba(135, 206, 235, 0.6);
      box-shadow: 0 12px 40px rgba(11, 15, 36, 0.45),
                  inset 0 1px 0 rgba(255, 255, 255, 0.2);
    }
    .ui-title {
      font-size: 14px;
      font-weight: 600;
      letter-spacing: 1.5px;
      color: #ffffff;
      text-shadow: 0 1px 3px rgba(135, 206, 235, 0.5);
      margin-bottom: 18px;
      padding-bottom: 12px;
      border-bottom: 1px solid rgba(135, 206, 235, 0.25);
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .ui-title::before {
      content: '❄';
      color: #87ceeb;
      font-size: 16px;
    }
    .control-group {
      margin-bottom: 20px;
    }
    .control-group:last-child {
      margin-bottom: 0;
    }
    .control-label {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 12px;
      color: #b8d4e8;
      margin-bottom: 10px;
      letter-spacing: 0.5px;
    }
    .control-value {
      display: inline-block;
      min-width: 48px;
      text-align: right;
      font-variant-numeric: tabular-nums;
      color: #87ceeb;
      font-weight: 600;
      transition: color 0.3s ease;
    }
    .slider-wrap {
      position: relative;
      height: 24px;
      display: flex;
      align-items: center;
    }
    input[type="range"] {
      -webkit-appearance: none;
      appearance: none;
      width: 100%;
      height: 4px;
      background: linear-gradient(90deg, rgba(135, 206, 235, 0.6), rgba(221, 160, 221, 0.6));
      border-radius: 4px;
      outline: none;
      cursor: pointer;
      transition: height 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    }
    input[type="range"]:hover {
      height: 6px;
    }
    input[type="range"]::-webkit-slider-thumb {
      -webkit-appearance: none;
      appearance: none;
      width: 18px;
      height: 18px;
      border-radius: 50%;
      background: radial-gradient(circle at 30% 30%, #ffffff, #87ceeb 60%, #6ab8d8);
      border: 1px solid rgba(255, 255, 255, 0.6);
      box-shadow: 0 2px 8px rgba(135, 206, 235, 0.5),
                  inset 0 1px 0 rgba(255, 255, 255, 0.8);
      cursor: grab;
      transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1),
                  box-shadow 0.3s ease;
    }
    input[type="range"]:hover::-webkit-slider-thumb {
      transform: scale(1.15);
      box-shadow: 0 4px 12px rgba(135, 206, 235, 0.7),
                  inset 0 1px 0 rgba(255, 255, 255, 0.9);
    }
    input[type="range"]:active::-webkit-slider-thumb {
      cursor: grabbing;
      transform: scale(0.95);
    }
    input[type="range"]::-moz-range-thumb {
      width: 18px;
      height: 18px;
      border-radius: 50%;
      background: radial-gradient(circle at 30% 30%, #ffffff, #87ceeb 60%, #6ab8d8);
      border: 1px solid rgba(255, 255, 255, 0.6);
      box-shadow: 0 2px 8px rgba(135, 206, 235, 0.5);
      cursor: grab;
    }
    .wind-compass {
      width: 56px;
      height: 56px;
      border-radius: 50%;
      background: radial-gradient(circle, rgba(135, 206, 235, 0.15), rgba(135, 206, 235, 0.05));
      border: 1px solid rgba(135, 206, 235, 0.35);
      position: relative;
      margin: 0 auto 12px auto;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: inset 0 1px 3px rgba(135, 206, 235, 0.2);
    }
    .wind-arrow {
      width: 2px;
      height: 22px;
      background: linear-gradient(180deg, transparent, #87ceeb 40%, #fff);
      position: absolute;
      top: 50%;
      left: 50%;
      transform-origin: 50% 100%;
      border-radius: 2px;
      box-shadow: 0 0 6px rgba(135, 206, 235, 0.6);
    }
    .wind-arrow::after {
      content: '';
      position: absolute;
      top: -4px;
      left: 50%;
      transform: translateX(-50%);
      border-left: 5px solid transparent;
      border-right: 5px solid transparent;
      border-bottom: 7px solid #fff;
      filter: drop-shadow(0 0 3px rgba(135, 206, 235, 0.8));
    }
    .hint {
      position: fixed;
      bottom: 20px;
      left: 50%;
      transform: translateX(-50%);
      font-size: 12px;
      color: rgba(184, 212, 232, 0.7);
      letter-spacing: 1px;
      padding: 10px 20px;
      background: rgba(255, 255, 255, 0.06);
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
      border: 1px solid rgba(135, 206, 235, 0.2);
      border-radius: 30px;
      z-index: 40;
      transition: all 0.3s ease;
    }
    .hint:hover {
      background: rgba(255, 255, 255, 0.1);
      color: rgba(210, 232, 248, 0.9);
    }
    @media (max-width: 640px) {
      .ui-panel {
        right: 12px;
        width: 220px;
        padding: 16px 14px;
      }
    }
  `;
  document.head.appendChild(style);

  const panel = document.createElement('div');
  panel.className = 'ui-panel';
  panel.innerHTML = `
    <div class="ui-title">北极景观控制台</div>
    <div class="control-group">
      <div class="control-label">
        <span>风向</span>
        <span class="control-value" id="wind-val">0°</span>
      </div>
      <div class="wind-compass">
        <div class="wind-arrow" id="wind-arrow"></div>
      </div>
      <div class="slider-wrap">
        <input type="range" id="wind-slider" min="0" max="360" step="1" value="${controls.config.windDirection}" />
      </div>
    </div>
    <div class="control-group">
      <div class="control-label">
        <span>极光亮度</span>
        <span class="control-value" id="bright-val">${Math.round(controls.config.brightness * 100)}%</span>
      </div>
      <div class="slider-wrap">
        <input type="range" id="bright-slider" min="30" max="100" step="1" value="${Math.round(controls.config.brightness * 100)}" />
      </div>
    </div>
  `;
  document.getElementById('app')!.appendChild(panel);

  const hint = document.createElement('div');
  hint.className = 'hint';
  hint.textContent = '拖拽鼠标旋转视角 · 滚轮缩放景观';
  document.getElementById('app')!.appendChild(hint);

  const windSlider = document.getElementById('wind-slider') as HTMLInputElement;
  const windVal = document.getElementById('wind-val')!;
  const windArrow = document.getElementById('wind-arrow')!;

  const brightSlider = document.getElementById('bright-slider') as HTMLInputElement;
  const brightVal = document.getElementById('bright-val')!;

  const animateWind = gsap.quickTo(windArrow, 'rotation', { duration: 0.3, ease: 'power2.out' });
  animateWind(controls.config.windDirection);

  let currentWind = controls.config.windDirection;
  windSlider.addEventListener('input', (e) => {
    const v = parseInt((e.target as HTMLInputElement).value, 10);
    gsap.to({}, {
      duration: 0.3,
      ease: 'power2.out',
      onUpdate: function () {
        const tweenProgress = (this as unknown as { progress: number }).progress;
        const interpolated = currentWind + (v - currentWind) * tweenProgress;
        controls.onWindChange(interpolated);
      },
      onComplete: () => {
        currentWind = v;
      }
    });
    windVal.textContent = `${v}°`;
    animateWind(v);
  });

  let currentBright = controls.config.brightness;
  brightSlider.addEventListener('input', (e) => {
    const v = parseInt((e.target as HTMLInputElement).value, 10) / 100;
    gsap.to(controls.config, {
      brightness: v,
      duration: 0.3,
      ease: 'power2.out',
      onUpdate: () => {
        controls.onBrightnessChange(controls.config.brightness);
      },
      onComplete: () => {
        currentBright = v;
      }
    });
    brightVal.textContent = `${Math.round(v * 100)}%`;
  });

  gsap.from(panel, {
    x: 50,
    opacity: 0,
    duration: 0.8,
    ease: 'power3.out',
    delay: 0.4
  });

  gsap.from(hint, {
    y: 30,
    opacity: 0,
    duration: 0.8,
    ease: 'power3.out',
    delay: 0.8
  });
}
