export interface UIState {
  galaxyDistance: number;
  collisionSpeed: number;
}

export interface UICallbacks {
  onDistanceChange: (value: number) => void;
  onSpeedChange: (value: number) => void;
  onResetView: () => void;
  onRestart: () => void;
}

export function createUI(callbacks: UICallbacks): UIState {
  const distanceSlider = document.getElementById('distance-slider') as HTMLInputElement;
  const distanceValue = document.getElementById('distance-value') as HTMLSpanElement;
  const speedSlider = document.getElementById('speed-slider') as HTMLInputElement;
  const speedValue = document.getElementById('speed-value') as HTMLSpanElement;
  const resetBtn = document.getElementById('reset-btn') as HTMLButtonElement;
  const restartBtn = document.getElementById('restart-btn') as HTMLButtonElement;

  const state: UIState = {
    galaxyDistance: parseFloat(distanceSlider.value),
    collisionSpeed: parseFloat(speedSlider.value)
  };

  distanceSlider.addEventListener('input', () => {
    const value = parseFloat(distanceSlider.value);
    state.galaxyDistance = value;
    distanceValue.textContent = value.toFixed(1);
    callbacks.onDistanceChange(value);
  });

  speedSlider.addEventListener('input', () => {
    const value = parseFloat(speedSlider.value);
    state.collisionSpeed = value;
    speedValue.textContent = value.toFixed(1);
    callbacks.onSpeedChange(value);
  });

  resetBtn.addEventListener('click', () => {
    triggerPulse(resetBtn);
    callbacks.onResetView();
  });

  restartBtn.addEventListener('click', () => {
    triggerPulse(restartBtn);
    callbacks.onRestart();
  });

  return state;
}

function triggerPulse(btn: HTMLElement): void {
  btn.classList.remove('pulse');
  void btn.offsetWidth;
  btn.classList.add('pulse');
}

export function updateFPS(fps: number): void {
  const el = document.getElementById('fps');
  if (!el) return;
  const color = fps >= 50 ? '#a78bfa' : fps >= 30 ? '#fbbf24' : '#f87171';
  el.style.color = color;
  el.textContent = `FPS: ${Math.round(fps)}`;
}
