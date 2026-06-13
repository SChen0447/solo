export interface ControlState {
  angle: number;
  force: number;
  weight: number;
  onFire: () => void;
  onReset: () => void;
}

export function initControls(): ControlState {
  const state: ControlState = {
    angle: 45,
    force: 300,
    weight: 25,
    onFire: () => {},
    onReset: () => {},
  };

  const angleSlider = document.getElementById('angle-slider') as HTMLInputElement;
  const forceSlider = document.getElementById('force-slider') as HTMLInputElement;
  const weightSlider = document.getElementById('weight-slider') as HTMLInputElement;
  const angleVal = document.getElementById('angle-val')!;
  const forceVal = document.getElementById('force-val')!;
  const weightVal = document.getElementById('weight-val')!;
  const fireBtn = document.getElementById('fire-btn') as HTMLButtonElement;
  const resetBtn = document.getElementById('reset-btn') as HTMLButtonElement;

  angleSlider.addEventListener('input', () => {
    state.angle = parseInt(angleSlider.value, 10);
    angleVal.textContent = `${state.angle}°`;
  });

  forceSlider.addEventListener('input', () => {
    state.force = parseInt(forceSlider.value, 10);
    forceVal.textContent = `${state.force} N`;
  });

  weightSlider.addEventListener('input', () => {
    state.weight = parseInt(weightSlider.value, 10);
    weightVal.textContent = `${state.weight} kg`;
  });

  fireBtn.addEventListener('click', () => {
    state.onFire();
  });

  resetBtn.addEventListener('click', () => {
    state.onReset();
  });

  return state;
}

export function setFireButtonEnabled(enabled: boolean): void {
  const fireBtn = document.getElementById('fire-btn') as HTMLButtonElement;
  if (fireBtn) {
    fireBtn.disabled = !enabled;
  }
}
