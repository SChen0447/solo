export interface UIPanelCallbacks {
  onGChange: (value: number) => void;
  onTimeScaleChange: (value: number) => void;
  onAddRandomBody: () => void;
}

export class UIPanel {
  private container: HTMLElement;
  private callbacks: UIPanelCallbacks;

  constructor(containerId: string, callbacks: UIPanelCallbacks) {
    const el = document.getElementById(containerId);
    if (!el) throw new Error(`UI Panel container #${containerId} not found`);
    this.container = el;
    this.callbacks = callbacks;
    this.build();
  }

  private build(): void {
    this.container.innerHTML = '';

    const title = document.createElement('div');
    title.style.fontSize = '18px';
    title.style.fontWeight = '600';
    title.style.marginBottom = '16px';
    title.style.color = '#E0E0FF';
    title.style.letterSpacing = '1px';
    title.textContent = '引力剧场 控制台';

    const gControl = this.createSlider({
      label: '引力常数 G',
      min: 0,
      max: 100,
      value: 50,
      step: 1,
      onChange: this.callbacks.onGChange,
      displayValue: true,
    });

    const timeControl = this.createSlider({
      label: '时间缩放',
      min: 0.1,
      max: 5,
      value: 1,
      step: 0.1,
      onChange: this.callbacks.onTimeScaleChange,
      displayValue: true,
    });

    const addBtn = document.createElement('button');
    addBtn.textContent = '+ 添加随机天体';
    addBtn.style.width = '120px';
    addBtn.style.height = '36px';
    addBtn.style.borderRadius = '8px';
    addBtn.style.border = 'none';
    addBtn.style.background = '#3D3D5C';
    addBtn.style.color = '#E0E0FF';
    addBtn.style.cursor = 'pointer';
    addBtn.style.fontSize = '13px';
    addBtn.style.transition = 'all 0.2s ease-out';
    addBtn.style.marginTop = '8px';
    addBtn.addEventListener('mouseenter', () => {
      addBtn.style.background = '#5A5A8C';
      addBtn.style.filter = 'brightness(1.2)';
    });
    addBtn.addEventListener('mouseleave', () => {
      addBtn.style.background = '#3D3D5C';
      addBtn.style.filter = 'brightness(1)';
    });
    addBtn.addEventListener('click', this.callbacks.onAddRandomBody);

    const hint = document.createElement('div');
    hint.style.marginTop = '16px';
    hint.style.fontSize = '12px';
    hint.style.color = '#8888AA';
    hint.style.lineHeight = '1.7';
    hint.innerHTML = `
      <div>• 点击空白处：添加天体</div>
      <div>• 点击天体：选中（青色光环）</div>
      <div>• 拖拽选中天体：改变位置</div>
      <div>• Shift 键：清除所有轨迹</div>
      <div>• 鼠标左键：旋转视角</div>
      <div>• 鼠标滚轮：缩放</div>
      <div>• 鼠标右键：平移</div>
    `;

    this.container.appendChild(title);
    this.container.appendChild(gControl);
    this.container.appendChild(timeControl);
    this.container.appendChild(addBtn);
    this.container.appendChild(hint);
  }

  private createSlider(opts: {
    label: string;
    min: number;
    max: number;
    value: number;
    step: number;
    onChange: (v: number) => void;
    displayValue?: boolean;
  }): HTMLElement {
    const wrap = document.createElement('div');
    wrap.style.marginBottom = '12px';

    const header = document.createElement('div');
    header.style.display = 'flex';
    header.style.justifyContent = 'space-between';
    header.style.alignItems = 'center';
    header.style.marginBottom = '6px';

    const labelEl = document.createElement('span');
    labelEl.style.fontSize = '13px';
    labelEl.style.color = '#B0B0CC';
    labelEl.textContent = opts.label;

    const valueEl = document.createElement('span');
    valueEl.style.fontSize = '13px';
    valueEl.style.color = '#6C63FF';
    valueEl.style.fontWeight = '600';
    valueEl.textContent = opts.value.toFixed(opts.step < 1 ? 1 : 0);

    header.appendChild(labelEl);
    if (opts.displayValue) header.appendChild(valueEl);

    const input = document.createElement('input');
    input.type = 'range';
    input.min = String(opts.min);
    input.max = String(opts.max);
    input.step = String(opts.step);
    input.value = String(opts.value);
    input.style.width = '100%';
    input.style.height = '4px';
    input.style.appearance = 'none';
    input.style.background = '#2A2D44';
    input.style.borderRadius = '2px';
    input.style.outline = 'none';
    input.style.cursor = 'pointer';

    const styleId = 'slider-style-' + Math.random().toString(36).slice(2, 8);
    if (!document.getElementById(styleId)) {
      const style = document.createElement('style');
      style.id = styleId;
      style.textContent = `
        input[type="range"]::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: #6C63FF;
          cursor: pointer;
          box-shadow: 0 0 8px rgba(108, 99, 255, 0.8);
          transition: transform 0.15s ease-out;
        }
        input[type="range"]::-webkit-slider-thumb:hover {
          transform: scale(1.2);
        }
        input[type="range"]::-moz-range-thumb {
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: #6C63FF;
          cursor: pointer;
          border: none;
          box-shadow: 0 0 8px rgba(108, 99, 255, 0.8);
        }
      `;
      document.head.appendChild(style);
    }

    input.addEventListener('input', () => {
      const v = parseFloat(input.value);
      if (opts.displayValue) {
        valueEl.textContent = v.toFixed(opts.step < 1 ? 1 : 0);
      }
      opts.onChange(v);
    });

    wrap.appendChild(header);
    wrap.appendChild(input);
    return wrap;
  }
}
