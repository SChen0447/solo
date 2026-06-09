import { Kaleidoscope, Palette, PALETTES } from './kaleidoscope';

export function initUI(
  container: HTMLElement,
  kaleidoscope: Kaleidoscope
): void {
  container.innerHTML = '';

  const mirrorGroup = createControlGroup(
    '镜面数量',
    '6',
    createSlider({
      min: 3,
      max: 12,
      step: 1,
      value: 6,
      onChange: (value) => {
        kaleidoscope.setMirrorCount(value);
        kaleidoscope.regenerate();
        updateValueDisplay(mirrorGroup, String(Math.round(value)));
      }
    })
  );

  const speedGroup = createControlGroup(
    '旋转速度',
    '0.5',
    createSlider({
      min: 0,
      max: 3,
      step: 0.1,
      value: 0.5,
      onChange: (value) => {
        kaleidoscope.setRotationSpeed(value);
        updateValueDisplay(speedGroup, value.toFixed(1));
      }
    })
  );

  const paletteGroup = createPaletteSelector(kaleidoscope);

  container.appendChild(mirrorGroup);
  container.appendChild(speedGroup);
  container.appendChild(paletteGroup);
}

interface SliderOptions {
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (value: number) => void;
}

function createSlider(options: SliderOptions): HTMLInputElement {
  const slider = document.createElement('input');
  slider.type = 'range';
  slider.min = String(options.min);
  slider.max = String(options.max);
  slider.step = String(options.step);
  slider.value = String(options.value);

  slider.addEventListener('input', (e) => {
    const target = e.target as HTMLInputElement;
    options.onChange(parseFloat(target.value));
  });

  return slider;
}

function createControlGroup(
  label: string,
  initialValue: string,
  control: HTMLElement
): HTMLElement {
  const group = document.createElement('div');
  group.className = 'control-group';

  const labelRow = document.createElement('div');
  labelRow.className = 'control-label';

  const labelText = document.createElement('span');
  labelText.textContent = label;

  const valueDisplay = document.createElement('span');
  valueDisplay.className = 'control-value';
  valueDisplay.textContent = initialValue;
  valueDisplay.dataset.role = 'value-display';

  labelRow.appendChild(labelText);
  labelRow.appendChild(valueDisplay);

  group.appendChild(labelRow);
  group.appendChild(control);

  return group;
}

function updateValueDisplay(group: HTMLElement, value: string): void {
  const display = group.querySelector<HTMLElement>('[data-role="value-display"]');
  if (display) display.textContent = value;
}

function createPaletteSelector(kaleidoscope: Kaleidoscope): HTMLElement {
  const group = document.createElement('div');
  group.className = 'control-group';

  const label = document.createElement('div');
  label.className = 'control-label';
  label.innerHTML = '<span>调色板方案</span>';
  group.appendChild(label);

  const options = document.createElement('div');
  options.className = 'palette-options';

  let activeOption: HTMLElement | null = null;

  PALETTES.forEach((palette, index) => {
    const option = createPaletteOption(palette, index === 0);
    if (index === 0) activeOption = option;

    option.addEventListener('click', () => {
      if (activeOption) activeOption.classList.remove('active');
      option.classList.add('active');
      activeOption = option;
      kaleidoscope.setPalette(palette);
    });

    options.appendChild(option);
  });

  group.appendChild(options);
  return group;
}

function createPaletteOption(palette: Palette, active: boolean): HTMLElement {
  const option = document.createElement('div');
  option.className = 'palette-option' + (active ? ' active' : '');

  const colors = document.createElement('div');
  colors.className = 'palette-colors';

  palette.colors.forEach((color) => {
    const dot = document.createElement('div');
    dot.className = 'palette-color-dot';
    dot.style.background = color;
    colors.appendChild(dot);
  });

  const name = document.createElement('span');
  name.className = 'palette-name';
  name.textContent = palette.name;

  option.appendChild(name);
  option.appendChild(colors);

  return option;
}

export function updateFpsDisplay(element: HTMLElement, fps: number): void {
  element.textContent = `${fps} FPS`;
}
