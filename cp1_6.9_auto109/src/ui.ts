export interface UIControls {
  onTwistChange: (value: number) => void;
  onThicknessChange: (value: number) => void;
  onSizeChange: (value: number) => void;
}

export interface UIState {
  twist: number;
  thickness: number;
  particleSize: number;
}

export function createUI(container: HTMLElement, controls: UIControls, initialState: UIState): void {
  const title = document.createElement('h3');
  title.textContent = '🌌 星系控制面板';
  container.appendChild(title);

  createSlider(container, {
    label: '旋臂缠绕度',
    min: 1,
    max: 5,
    step: 0.1,
    value: initialState.twist,
    onChange: controls.onTwistChange,
    formatValue: (v) => v.toFixed(1)
  });

  createSlider(container, {
    label: '盘厚度',
    min: 0.1,
    max: 2,
    step: 0.05,
    value: initialState.thickness,
    onChange: controls.onThicknessChange,
    formatValue: (v) => v.toFixed(2)
  });

  createSlider(container, {
    label: '粒子大小',
    min: 0.01,
    max: 0.1,
    step: 0.005,
    value: initialState.particleSize,
    onChange: controls.onSizeChange,
    formatValue: (v) => v.toFixed(3)
  });
}

interface SliderConfig {
  label: string;
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (value: number) => void;
  formatValue: (v: number) => string;
}

function createSlider(container: HTMLElement, config: SliderConfig): void {
  const group = document.createElement('div');
  group.className = 'control-group';

  const labelRow = document.createElement('div');
  labelRow.className = 'control-label';

  const labelText = document.createElement('span');
  labelText.textContent = config.label;

  const valueLabel = document.createElement('span');
  valueLabel.className = 'control-value';
  valueLabel.textContent = config.formatValue(config.value);

  labelRow.appendChild(labelText);
  labelRow.appendChild(valueLabel);

  const slider = document.createElement('input');
  slider.type = 'range';
  slider.min = String(config.min);
  slider.max = String(config.max);
  slider.step = String(config.step);
  slider.value = String(config.value);

  slider.addEventListener('input', () => {
    const value = parseFloat(slider.value);
    config.onChange(value);
    valueLabel.textContent = config.formatValue(value);
    valueLabel.classList.remove('flash');
    void valueLabel.offsetWidth;
    valueLabel.classList.add('flash');
  });

  group.appendChild(labelRow);
  group.appendChild(slider);
  container.appendChild(group);
}
