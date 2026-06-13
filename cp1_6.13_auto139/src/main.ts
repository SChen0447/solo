import { lightGrid } from './lightGrid';
import { audioManager } from './audioManager';
import { trailEffect } from './trailEffect';

function initApp(): void {
  trailEffect.start();
  bindControlPanelEvents();
  bindMouseMoveForTrail();
}

function bindMouseMoveForTrail(): void {
  const gridElement = lightGrid.getGridElement();
  let lastTrailTime = 0;
  const trailThrottleInterval = 16;

  gridElement.addEventListener('mousemove', (e: MouseEvent) => {
    const now = performance.now();
    if (now - lastTrailTime < trailThrottleInterval) return;
    lastTrailTime = now;

    trailEffect.addPoint(e.clientX, e.clientY);
  });

  document.addEventListener('mousemove', (e: MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest('#control-panel')) {
      return;
    }
    if (!target.closest('.light-grid')) {
      const now = performance.now();
      if (now - lastTrailTime < trailThrottleInterval) return;
      lastTrailTime = now;
      trailEffect.addPoint(e.clientX, e.clientY);
    }
  });
}

function bindControlPanelEvents(): void {
  const resetBtn = document.getElementById('reset-btn') as HTMLButtonElement;
  const rhythmToggle = document.getElementById('rhythm-toggle') as HTMLInputElement;
  const frequencySlider = document.getElementById('frequency-slider') as HTMLInputElement;
  const frequencyValue = document.getElementById('frequency-value') as HTMLSpanElement;
  const volumeSlider = document.getElementById('volume-slider') as HTMLInputElement;
  const volumeValue = document.getElementById('volume-value') as HTMLSpanElement;

  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      lightGrid.reset();
      trailEffect.clear();
    });
  }

  if (rhythmToggle && frequencySlider) {
    rhythmToggle.addEventListener('change', (e) => {
      const checked = (e.target as HTMLInputElement).checked;
      lightGrid.setRhythmMode(checked);
      frequencySlider.disabled = !checked;
      if (checked) {
        trailEffect.clear();
      }
    });
  }

  if (frequencySlider && frequencyValue) {
    frequencySlider.addEventListener('input', (e) => {
      const value = parseFloat((e.target as HTMLInputElement).value);
      frequencyValue.textContent = value.toFixed(1);
      lightGrid.setRhythmFrequency(value);
    });
  }

  if (volumeSlider && volumeValue) {
    volumeSlider.addEventListener('input', (e) => {
      const value = parseInt((e.target as HTMLInputElement).value, 10);
      volumeValue.textContent = String(value);
      audioManager.setVolume(value / 100);
    });

    const initialVolume = parseInt(volumeSlider.value, 10);
    audioManager.setVolume(initialVolume / 100);
  }
}

document.addEventListener('DOMContentLoaded', initApp);

if (document.readyState !== 'loading') {
  initApp();
}
