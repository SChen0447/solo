export interface ControlValues {
  progress: number;
  twist: number;
  subdivision: number;
}

export interface ControlCallbacks {
  onProgressChange: (value: number) => void;
  onTwistChange: (value: number) => void;
  onSubdivisionChange: (value: number) => void;
  onResetCamera: () => void;
  onToggleWireframe: () => void;
}

export function createControls(
  sliderContainer: HTMLElement,
  buttonContainer: HTMLElement,
  initialValues: ControlValues,
  callbacks: ControlCallbacks
): { updateWireframeButton: (active: boolean) => void } {
  const sliders = [
    {
      id: 'progress',
      label: '形变进度',
      min: 0,
      max: 1,
      step: 0.01,
      value: initialValues.progress,
      onChange: callbacks.onProgressChange
    },
    {
      id: 'twist',
      label: '扭曲系数',
      min: -2,
      max: 2,
      step: 0.1,
      value: initialValues.twist,
      onChange: callbacks.onTwistChange
    },
    {
      id: 'subdivision',
      label: '细分等级',
      min: 16,
      max: 64,
      step: 1,
      value: initialValues.subdivision,
      onChange: callbacks.onSubdivisionChange
    }
  ];

  sliders.forEach(slider => {
    const group = document.createElement('div');
    group.className = 'control-group';

    const labelWrap = document.createElement('label');
    const labelText = document.createElement('span');
    labelText.textContent = slider.label;

    const valueLabel = document.createElement('span');
    valueLabel.className = 'value-label';
    valueLabel.id = `${slider.id}-value`;
    valueLabel.textContent = formatValue(slider.value, slider.step);

    labelWrap.appendChild(labelText);
    labelWrap.appendChild(valueLabel);

    const input = document.createElement('input');
    input.type = 'range';
    input.id = `${slider.id}-slider`;
    input.min = String(slider.min);
    input.max = String(slider.max);
    input.step = String(slider.step);
    input.value = String(slider.value);

    input.addEventListener('input', (e) => {
      const target = e.target as HTMLInputElement;
      const val = parseFloat(target.value);
      valueLabel.textContent = formatValue(val, slider.step);
      slider.onChange(val);
    });

    group.appendChild(labelWrap);
    group.appendChild(input);
    sliderContainer.appendChild(group);
  });

  const resetBtn = document.createElement('button');
  resetBtn.className = 'btn btn-reset';
  resetBtn.textContent = '重置视角';
  resetBtn.addEventListener('click', callbacks.onResetCamera);

  const wireframeBtn = document.createElement('button');
  wireframeBtn.className = 'btn btn-wireframe';
  wireframeBtn.textContent = '切换到线框模式';
  wireframeBtn.addEventListener('click', () => {
    callbacks.onToggleWireframe();
  });

  buttonContainer.appendChild(resetBtn);
  buttonContainer.appendChild(wireframeBtn);

  function updateWireframeButton(active: boolean): void {
    if (active) {
      wireframeBtn.classList.add('active');
      wireframeBtn.textContent = '切换到实体模式';
    } else {
      wireframeBtn.classList.remove('active');
      wireframeBtn.textContent = '切换到线框模式';
    }
  }

  return { updateWireframeButton };
}

function formatValue(value: number, step: number): string {
  if (step >= 1) {
    return String(Math.round(value));
  }
  const decimals = step < 0.01 ? 3 : step < 0.1 ? 2 : 2;
  return value.toFixed(decimals);
}
