import type { FontEngine } from './fontEngine';

export function setupUIControls(engine: FontEngine) {
  const distortionSlider = document.getElementById('distortion') as HTMLInputElement;
  const distortionValue = document.getElementById('distortionValue') as HTMLSpanElement;
  const glowRadiusSlider = document.getElementById('glowRadius') as HTMLInputElement;
  const glowRadiusValue = document.getElementById('glowRadiusValue') as HTMLSpanElement;
  const glowColorPicker = document.getElementById('glowColor') as HTMLInputElement;
  const glowColorValue = document.getElementById('glowColorValue') as HTMLSpanElement;
  const noiseIntensitySlider = document.getElementById('noiseIntensity') as HTMLInputElement;
  const noiseIntensityValue = document.getElementById('noiseIntensityValue') as HTMLSpanElement;
  const textInput = document.getElementById('textInput') as HTMLInputElement;
  const toggleBtn = document.getElementById('togglePanel') as HTMLButtonElement;
  const panelContent = document.getElementById('panelContent') as HTMLDivElement;

  let collapsed = false;

  function updateDistortion(value: number) {
    engine.setParams({ distortion: value });
    distortionValue.textContent = String(value);
  }

  function updateGlowRadius(value: number) {
    engine.setParams({ glowRadius: value });
    glowRadiusValue.textContent = String(value);
  }

  function updateGlowColor(value: string) {
    engine.setParams({ glowColor: value });
    glowColorValue.textContent = value.toUpperCase();
  }

  function updateNoiseIntensity(value: number) {
    engine.setParams({ noiseIntensity: value });
    noiseIntensityValue.textContent = String(value);
  }

  function updateText(value: string) {
    engine.setParams({ text: value });
  }

  distortionSlider.addEventListener('input', (e) => {
    const val = parseInt((e.target as HTMLInputElement).value, 10);
    updateDistortion(val);
  });

  distortionSlider.addEventListener('change', (e) => {
    const val = parseInt((e.target as HTMLInputElement).value, 10);
    updateDistortion(val);
  });

  glowRadiusSlider.addEventListener('input', (e) => {
    const val = parseInt((e.target as HTMLInputElement).value, 10);
    updateGlowRadius(val);
  });

  glowRadiusSlider.addEventListener('change', (e) => {
    const val = parseInt((e.target as HTMLInputElement).value, 10);
    updateGlowRadius(val);
  });

  glowColorPicker.addEventListener('input', (e) => {
    const val = (e.target as HTMLInputElement).value;
    updateGlowColor(val);
  });

  glowColorPicker.addEventListener('change', (e) => {
    const val = (e.target as HTMLInputElement).value;
    updateGlowColor(val);
  });

  noiseIntensitySlider.addEventListener('input', (e) => {
    const val = parseInt((e.target as HTMLInputElement).value, 10);
    updateNoiseIntensity(val);
  });

  noiseIntensitySlider.addEventListener('change', (e) => {
    const val = parseInt((e.target as HTMLInputElement).value, 10);
    updateNoiseIntensity(val);
  });

  textInput.addEventListener('input', (e) => {
    let val = (e.target as HTMLInputElement).value;
    if (val.length > 20) {
      val = val.slice(0, 20);
      (e.target as HTMLInputElement).value = val;
    }
    updateText(val);
  });

  textInput.addEventListener('keydown', (e) => {
    if ((e.target as HTMLInputElement).value.length >= 20 &&
        !['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key) &&
        !e.ctrlKey && !e.metaKey) {
      if (e.key.length === 1) {
        e.preventDefault();
      }
    }
  });

  toggleBtn.addEventListener('click', () => {
    collapsed = !collapsed;
    if (collapsed) {
      panelContent.classList.add('collapsed');
      toggleBtn.textContent = '+';
      toggleBtn.setAttribute('aria-label', '展开面板');
    } else {
      panelContent.classList.remove('collapsed');
      toggleBtn.textContent = '–';
      toggleBtn.setAttribute('aria-label', '收起面板');
    }
  });

  updateDistortion(parseInt(distortionSlider.value, 10));
  updateGlowRadius(parseInt(glowRadiusSlider.value, 10));
  updateGlowColor(glowColorPicker.value);
  updateNoiseIntensity(parseInt(noiseIntensitySlider.value, 10));
  updateText(textInput.value);
}
