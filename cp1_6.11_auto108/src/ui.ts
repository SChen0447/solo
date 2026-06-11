

export interface UICallbacks {
  onDensityChange: (count: number) => void;
  onMinRadiusChange: (radius: number) => void;
  onMaxRadiusChange: (radius: number) => void;
  onSpeedChange: (speed: number) => void;
  onPresetTwilight: () => void;
  onPresetAurora: () => void;
}

export interface UIElements {
  densitySlider: HTMLInputElement;
  densityValue: HTMLSpanElement;
  minRadiusSlider: HTMLInputElement;
  minRadiusValue: HTMLSpanElement;
  maxRadiusSlider: HTMLInputElement;
  maxRadiusValue: HTMLSpanElement;
  speedSlider: HTMLInputElement;
  speedValue: HTMLSpanElement;
  presetTwilight: HTMLButtonElement;
  presetAurora: HTMLButtonElement;
  fpsValue: HTMLSpanElement;
  particleCount: HTMLSpanElement;
}

export function getUIElements(): UIElements {
  return {
    densitySlider: document.getElementById('density-slider') as HTMLInputElement,
    densityValue: document.getElementById('density-value') as HTMLSpanElement,
    minRadiusSlider: document.getElementById('min-radius-slider') as HTMLInputElement,
    minRadiusValue: document.getElementById('min-radius-value') as HTMLSpanElement,
    maxRadiusSlider: document.getElementById('max-radius-slider') as HTMLInputElement,
    maxRadiusValue: document.getElementById('max-radius-value') as HTMLSpanElement,
    speedSlider: document.getElementById('speed-slider') as HTMLInputElement,
    speedValue: document.getElementById('speed-value') as HTMLSpanElement,
    presetTwilight: document.getElementById('preset-twilight') as HTMLButtonElement,
    presetAurora: document.getElementById('preset-aurora') as HTMLButtonElement,
    fpsValue: document.getElementById('fps-value') as HTMLSpanElement,
    particleCount: document.getElementById('particle-count') as HTMLSpanElement,
  };
}

export function bindUIEvents(elements: UIElements, callbacks: UICallbacks): void {
  elements.densitySlider.addEventListener('input', (e) => {
    const value = parseInt((e.target as HTMLInputElement).value, 10);
    elements.densityValue.textContent = value.toString();
    callbacks.onDensityChange(value);
  });

  elements.minRadiusSlider.addEventListener('input', (e) => {
    const value = parseFloat((e.target as HTMLInputElement).value);
    elements.minRadiusValue.textContent = value.toString();

    const maxValue = parseFloat(elements.maxRadiusSlider.value);
    if (value > maxValue) {
      elements.maxRadiusSlider.value = value.toString();
      elements.maxRadiusValue.textContent = value.toString();
      callbacks.onMaxRadiusChange(value);
    }
    callbacks.onMinRadiusChange(value);
  });

  elements.maxRadiusSlider.addEventListener('input', (e) => {
    const value = parseFloat((e.target as HTMLInputElement).value);
    elements.maxRadiusValue.textContent = value.toString();

    const minValue = parseFloat(elements.minRadiusSlider.value);
    if (value < minValue) {
      elements.minRadiusSlider.value = value.toString();
      elements.minRadiusValue.textContent = value.toString();
      callbacks.onMinRadiusChange(value);
    }
    callbacks.onMaxRadiusChange(value);
  });

  elements.speedSlider.addEventListener('input', (e) => {
    const value = parseFloat((e.target as HTMLInputElement).value);
    elements.speedValue.textContent = value.toFixed(2);
    callbacks.onSpeedChange(value);
  });

  elements.presetTwilight.addEventListener('click', () => {
    setActivePresetButton(elements, 'twilight');
    callbacks.onPresetTwilight();
  });

  elements.presetAurora.addEventListener('click', () => {
    setActivePresetButton(elements, 'aurora');
    callbacks.onPresetAurora();
  });
}

function setActivePresetButton(elements: UIElements, activePreset: 'twilight' | 'aurora'): void {
  if (activePreset === 'twilight') {
    elements.presetTwilight.classList.add('active');
    elements.presetAurora.classList.remove('active');
  } else {
    elements.presetAurora.classList.add('active');
    elements.presetTwilight.classList.remove('active');
  }
}

export function applyPreset(
  elements: UIElements,
  preset: 'twilight' | 'aurora',
  callbacks: UICallbacks,
  transitionDuration: number = 500
): Promise<void> {
  const targetParams = preset === 'twilight'
    ? { density: 800, minRadius: 3, maxRadius: 8, speed: 0.6 }
    : { density: 1500, minRadius: 1.5, maxRadius: 4, speed: 2.2 };

  setActivePresetButton(elements, preset);

  return animateSliderValues(elements, targetParams, callbacks, transitionDuration);
}

export interface PresetTarget {
  density: number;
  minRadius: number;
  maxRadius: number;
  speed: number;
}

function animateSliderValues(
  elements: UIElements,
  target: PresetTarget,
  callbacks: UICallbacks,
  duration: number
): Promise<void> {
  return new Promise((resolve) => {
    const startValues = {
      density: parseInt(elements.densitySlider.value, 10),
      minRadius: parseFloat(elements.minRadiusSlider.value),
      maxRadius: parseFloat(elements.maxRadiusSlider.value),
      speed: parseFloat(elements.speedSlider.value),
    };

    const startTime = performance.now();

    function easeInOutCubic(t: number): number {
      return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    }

    function animate(currentTime: number): void {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = easeInOutCubic(progress);

      const density = Math.round(startValues.density + (target.density - startValues.density) * eased);
      const minRadius = parseFloat(
        (startValues.minRadius + (target.minRadius - startValues.minRadius) * eased).toFixed(2)
      );
      const maxRadius = parseFloat(
        (startValues.maxRadius + (target.maxRadius - startValues.maxRadius) * eased).toFixed(2)
      );
      const speed = parseFloat(
        (startValues.speed + (target.speed - startValues.speed) * eased).toFixed(2)
      );

      elements.densitySlider.value = density.toString();
      elements.densityValue.textContent = density.toString();
      callbacks.onDensityChange(density);

      elements.minRadiusSlider.value = minRadius.toString();
      elements.minRadiusValue.textContent = minRadius.toString();
      callbacks.onMinRadiusChange(minRadius);

      elements.maxRadiusSlider.value = maxRadius.toString();
      elements.maxRadiusValue.textContent = maxRadius.toString();
      callbacks.onMaxRadiusChange(maxRadius);

      elements.speedSlider.value = speed.toString();
      elements.speedValue.textContent = speed.toFixed(2);
      callbacks.onSpeedChange(speed);

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        resolve();
      }
    }

    requestAnimationFrame(animate);
  });
}

export function updatePerformanceDisplay(
  elements: UIElements,
  fps: number,
  particleCount: number
): void {
  elements.fpsValue.textContent = fps.toFixed(0);
  elements.particleCount.textContent = particleCount.toString();

  elements.fpsValue.classList.remove('warning', 'danger');
  if (fps < 45) {
    elements.fpsValue.classList.add('danger');
  } else if (fps < 55) {
    elements.fpsValue.classList.add('warning');
  }
}
