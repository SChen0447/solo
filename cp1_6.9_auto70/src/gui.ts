import * as THREE from 'three';

export interface GUICallbacks {
  onWindChange: (value: number) => void;
  onColorChange: (color: THREE.Color) => void;
  onReset: () => void;
}

export class GUIManager {
  private panel: HTMLDivElement;
  private callbacks: GUICallbacks;

  constructor(callbacks: GUICallbacks) {
    this.callbacks = callbacks;
    this.panel = this.createPanel();
    document.body.appendChild(this.panel);
  }

  private createPanel(): HTMLDivElement {
    const panel = document.createElement('div');
    panel.style.cssText = `
      position: fixed;
      top: 50%;
      right: 20px;
      transform: translateY(-50%);
      width: 200px;
      background: rgba(26, 26, 46, 0.7);
      backdrop-filter: blur(10px);
      -webkit-backdrop-filter: blur(10px);
      border-radius: 12px;
      padding: 20px;
      color: #ffffff;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      z-index: 1000;
      border: 1px solid rgba(255, 255, 255, 0.1);
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
      user-select: none;
    `;

    const title = document.createElement('div');
    title.textContent = '控制面板';
    title.style.cssText = `
      font-size: 14px;
      font-weight: 600;
      margin-bottom: 20px;
      text-align: center;
      letter-spacing: 1px;
      opacity: 0.9;
    `;
    panel.appendChild(title);

    const windLabel = document.createElement('div');
    windLabel.textContent = '风力强度';
    windLabel.style.cssText = `
      font-size: 12px;
      margin-bottom: 8px;
      opacity: 0.8;
    `;
    panel.appendChild(windLabel);

    const windSlider = document.createElement('input');
    windSlider.type = 'range';
    windSlider.min = '0.5';
    windSlider.max = '3.0';
    windSlider.step = '0.1';
    windSlider.value = '1.0';
    windSlider.style.cssText = `
      width: 100%;
      height: 6px;
      border-radius: 3px;
      background: linear-gradient(to right, #00d2ff 0%, #00d2ff 33%, rgba(255,255,255,0.2) 33%, rgba(255,255,255,0.2) 100%);
      outline: none;
      -webkit-appearance: none;
      appearance: none;
      margin-bottom: 20px;
      cursor: pointer;
      transition: all 0.2s ease;
    `;

    const sliderStyle = document.createElement('style');
    sliderStyle.textContent = `
      input[type="range"]::-webkit-slider-thumb {
        -webkit-appearance: none;
        appearance: none;
        width: 16px;
        height: 16px;
        border-radius: 50%;
        background: #00d2ff;
        cursor: pointer;
        box-shadow: 0 0 10px rgba(0, 210, 255, 0.5);
        transition: all 0.2s ease;
      }
      input[type="range"]::-webkit-slider-thumb:hover {
        transform: scale(1.2);
        box-shadow: 0 0 15px rgba(0, 210, 255, 0.8);
      }
      input[type="range"]::-moz-range-thumb {
        width: 16px;
        height: 16px;
        border-radius: 50%;
        background: #00d2ff;
        cursor: pointer;
        border: none;
        box-shadow: 0 0 10px rgba(0, 210, 255, 0.5);
      }
    `;
    document.head.appendChild(sliderStyle);

    windSlider.addEventListener('input', (e) => {
      const value = parseFloat((e.target as HTMLInputElement).value);
      const percent = ((value - 0.5) / 2.5) * 100;
      windSlider.style.background = `linear-gradient(to right, #00d2ff 0%, #00d2ff ${percent}%, rgba(255,255,255,0.2) ${percent}%, rgba(255,255,255,0.2) 100%)`;
      this.callbacks.onWindChange(value);
    });
    panel.appendChild(windSlider);

    const colorLabel = document.createElement('div');
    colorLabel.textContent = '色调偏移';
    colorLabel.style.cssText = `
      font-size: 12px;
      margin-bottom: 8px;
      opacity: 0.8;
    `;
    panel.appendChild(colorLabel);

    const colorWrapper = document.createElement('div');
    colorWrapper.style.cssText = `
      width: 100%;
      height: 36px;
      margin-bottom: 20px;
      border-radius: 8px;
      overflow: hidden;
      background: rgba(255,255,255,0.1);
      transition: all 0.3s ease;
    `;
    colorWrapper.addEventListener('mouseenter', () => {
      colorWrapper.style.background = 'rgba(255,255,255,0.15)';
    });
    colorWrapper.addEventListener('mouseleave', () => {
      colorWrapper.style.background = 'rgba(255,255,255,0.1)';
    });

    const colorPicker = document.createElement('input');
    colorPicker.type = 'color';
    colorPicker.value = '#ffffff';
    colorPicker.style.cssText = `
      width: 100%;
      height: 100%;
      border: none;
      background: transparent;
      cursor: pointer;
      padding: 0;
    `;
    colorPicker.addEventListener('input', (e) => {
      const color = new THREE.Color((e.target as HTMLInputElement).value);
      this.callbacks.onColorChange(color);
    });
    colorWrapper.appendChild(colorPicker);
    panel.appendChild(colorWrapper);

    const resetLabel = document.createElement('div');
    resetLabel.textContent = '重置风铃';
    resetLabel.style.cssText = `
      font-size: 12px;
      margin-bottom: 8px;
      opacity: 0.8;
    `;
    panel.appendChild(resetLabel);

    const btnWrapper = document.createElement('div');
    btnWrapper.style.cssText = `
      display: flex;
      justify-content: center;
    `;

    const resetBtn = document.createElement('button');
    resetBtn.style.cssText = `
      width: 40px;
      height: 40px;
      border-radius: 50%;
      border: none;
      background: rgba(255, 255, 255, 0.15);
      color: #fff;
      font-size: 18px;
      cursor: pointer;
      transition: all 0.2s ease;
      display: flex;
      align-items: center;
      justify-content: center;
      backdrop-filter: blur(5px);
    `;
    resetBtn.innerHTML = '↻';
    resetBtn.title = '重置风铃';

    const resetBtnAnim = (btn: HTMLButtonElement) => {
      btn.style.transform = 'scale(1.3)';
      btn.style.background = 'rgba(0, 210, 255, 0.4)';
      setTimeout(() => {
        btn.style.transform = 'scale(1)';
        btn.style.background = 'rgba(255, 255, 255, 0.15)';
      }, 200);
    };

    resetBtn.addEventListener('mouseenter', () => {
      resetBtn.style.background = 'rgba(255, 255, 255, 0.25)';
      resetBtn.style.transform = 'scale(1.1)';
    });
    resetBtn.addEventListener('mouseleave', () => {
      resetBtn.style.background = 'rgba(255, 255, 255, 0.15)';
      resetBtn.style.transform = 'scale(1)';
    });
    resetBtn.addEventListener('click', () => {
      resetBtnAnim(resetBtn);
      this.callbacks.onReset();
    });

    btnWrapper.appendChild(resetBtn);
    panel.appendChild(btnWrapper);

    return panel;
  }
}
