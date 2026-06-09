import { ParticleSystem, defaultParams, ParticleParams, AlphaCurveType, BlendMode } from './nebulaSystem';

export function setupControls(nebula: ParticleSystem): { updateFPS: (fps: number) => void } {
  const container = document.getElementById('controls-content');
  if (!container) {
    return { updateFPS: () => {} };
  }

  const params = nebula.getParams();

  container.appendChild(createGroup('粒子形态', [
    createSlider({
      label: '粒子密度',
      min: 10000,
      max: 200000,
      step: 10000,
      value: params.particleCount,
      onInput: (v) => nebula.updateParam('particleCount', v),
      formatValue: (v) => v.toLocaleString()
    }),
    createRangeSlider({
      label: '粒子大小范围',
      min: 0.02,
      max: 0.8,
      step: 0.01,
      minValue: params.sizeMin,
      maxValue: params.sizeMax,
      onMinInput: (v) => nebula.updateParam('sizeMin', v),
      onMaxInput: (v) => nebula.updateParam('sizeMax', v)
    }),
    createSelect({
      label: '透明度曲线',
      value: params.alphaCurve,
      options: [
        { label: 'Linear', value: 'linear' },
        { label: 'Sigmoid', value: 'sigmoid' },
        { label: 'Gaussian', value: 'gaussian' }
      ],
      onInput: (v) => nebula.updateParam('alphaCurve', v as AlphaCurveType)
    })
  ]));

  container.appendChild(createGroup('运动参数', [
    createSlider({
      label: '自转速度',
      min: 0,
      max: 0.01,
      step: 0.001,
      value: params.rotationSpeed,
      onInput: (v) => nebula.updateParam('rotationSpeed', v),
      formatValue: (v) => v.toFixed(3)
    }),
    createSlider({
      label: '湍流强度',
      min: 0,
      max: 0.5,
      step: 0.01,
      value: params.turbulenceStrength,
      onInput: (v) => nebula.updateParam('turbulenceStrength', v),
      formatValue: (v) => v.toFixed(2)
    }),
    createSlider({
      label: '湍流频率',
      min: 0.1,
      max: 2.0,
      step: 0.1,
      value: params.turbulenceFrequency,
      onInput: (v) => nebula.updateParam('turbulenceFrequency', v),
      formatValue: (v) => v.toFixed(1)
    })
  ]));

  container.appendChild(createGroup('颜色设置', [
    createColorPicker({
      label: '起始颜色',
      value: params.colorStart,
      onInput: (v) => nebula.updateParam('colorStart', v)
    }),
    createColorPicker({
      label: '终止颜色',
      value: params.colorEnd,
      onInput: (v) => nebula.updateParam('colorEnd', v)
    }),
    createSelect({
      label: '混合模式',
      value: params.blendMode,
      options: [
        { label: 'Additive', value: 'additive' },
        { label: 'Multiply', value: 'multiply' },
        { label: 'Normal', value: 'normal' }
      ],
      onInput: (v) => nebula.updateParam('blendMode', v as BlendMode)
    })
  ]));

  const fpsEl = document.getElementById('fps-counter');

  return {
    updateFPS(fps: number) {
      if (fpsEl) {
        fpsEl.textContent = `FPS: ${fps.toFixed(0)}`;
      }
    }
  };
}

function createGroup(title: string, children: HTMLElement[]): HTMLElement {
  const group = document.createElement('div');
  group.className = 'param-group';

  const titleEl = document.createElement('div');
  titleEl.className = 'group-title';
  titleEl.textContent = title;
  group.appendChild(titleEl);

  children.forEach(child => group.appendChild(child));

  return group;
}

interface SliderOptions {
  label: string;
  min: number;
  max: number;
  step: number;
  value: number;
  onInput: (value: number) => void;
  formatValue?: (value: number) => string;
}

function createSlider(options: SliderOptions): HTMLElement {
  const item = document.createElement('div');
  item.className = 'param-item';

  const labelRow = document.createElement('div');
  labelRow.className = 'param-label';

  const labelText = document.createElement('span');
  labelText.textContent = options.label;
  labelRow.appendChild(labelText);

  const valueText = document.createElement('span');
  valueText.className = 'param-value';
  valueText.textContent = options.formatValue ? options.formatValue(options.value) : String(options.value);
  labelRow.appendChild(valueText);

  item.appendChild(labelRow);

  const input = document.createElement('input');
  input.type = 'range';
  input.min = String(options.min);
  input.max = String(options.max);
  input.step = String(options.step);
  input.value = String(options.value);

  input.addEventListener('input', () => {
    const v = parseFloat(input.value);
    valueText.textContent = options.formatValue ? options.formatValue(v) : String(v);
    options.onInput(v);
  });

  item.appendChild(input);

  return item;
}

interface RangeSliderOptions {
  label: string;
  min: number;
  max: number;
  step: number;
  minValue: number;
  maxValue: number;
  onMinInput: (value: number) => void;
  onMaxInput: (value: number) => void;
}

function createRangeSlider(options: RangeSliderOptions): HTMLElement {
  const item = document.createElement('div');
  item.className = 'param-item';

  const labelRow = document.createElement('div');
  labelRow.className = 'param-label';

  const labelText = document.createElement('span');
  labelText.textContent = options.label;
  labelRow.appendChild(labelText);

  const valueText = document.createElement('span');
  valueText.className = 'param-value';
  valueText.textContent = `${options.minValue.toFixed(2)} - ${options.maxValue.toFixed(2)}`;
  labelRow.appendChild(valueText);

  item.appendChild(labelRow);

  const minInput = document.createElement('input');
  minInput.type = 'range';
  minInput.min = String(options.min);
  minInput.max = String(options.max);
  minInput.step = String(options.step);
  minInput.value = String(options.minValue);

  const maxInput = document.createElement('input');
  maxInput.type = 'range';
  maxInput.min = String(options.min);
  maxInput.max = String(options.max);
  maxInput.step = String(options.step);
  maxInput.value = String(options.maxValue);

  const updateText = () => {
    const mn = parseFloat(minInput.value);
    const mx = parseFloat(maxInput.value);
    valueText.textContent = `${mn.toFixed(2)} - ${mx.toFixed(2)}`;
  };

  minInput.addEventListener('input', () => {
    let v = parseFloat(minInput.value);
    const mx = parseFloat(maxInput.value);
    if (v > mx) {
      v = mx;
      minInput.value = String(v);
    }
    updateText();
    options.onMinInput(v);
  });

  maxInput.addEventListener('input', () => {
    let v = parseFloat(maxInput.value);
    const mn = parseFloat(minInput.value);
    if (v < mn) {
      v = mn;
      maxInput.value = String(v);
    }
    updateText();
    options.onMaxInput(v);
  });

  const wrapper = document.createElement('div');
  wrapper.style.cssText = 'display: flex; flex-direction: column; gap: 4px;';
  wrapper.appendChild(minInput);
  wrapper.appendChild(maxInput);
  item.appendChild(wrapper);

  return item;
}

interface SelectOptions {
  label: string;
  value: string;
  options: { label: string; value: string }[];
  onInput: (value: string) => void;
}

function createSelect(options: SelectOptions): HTMLElement {
  const item = document.createElement('div');
  item.className = 'param-item';

  const label = document.createElement('div');
  label.className = 'param-label';
  label.textContent = options.label;
  item.appendChild(label);

  const select = document.createElement('select');
  options.options.forEach(opt => {
    const o = document.createElement('option');
    o.value = opt.value;
    o.textContent = opt.label;
    if (opt.value === options.value) o.selected = true;
    select.appendChild(o);
  });

  select.addEventListener('change', () => {
    options.onInput(select.value);
  });

  item.appendChild(select);

  return item;
}

interface ColorPickerOptions {
  label: string;
  value: string;
  onInput: (value: string) => void;
}

function createColorPicker(options: ColorPickerOptions): HTMLElement {
  const item = document.createElement('div');
  item.className = 'param-item';

  const label = document.createElement('div');
  label.className = 'param-label';
  label.textContent = options.label;
  item.appendChild(label);

  const wrapper = document.createElement('div');
  wrapper.className = 'color-input-wrapper';
  wrapper.style.background = options.value;

  const input = document.createElement('input');
  input.type = 'color';
  input.value = options.value;

  input.addEventListener('input', () => {
    wrapper.style.background = input.value;
    options.onInput(input.value);
  });

  wrapper.appendChild(input);
  item.appendChild(wrapper);

  return item;
}
