import { DatasetType } from './data/climateData';

export interface UICallbacks {
  onDatasetChange: (dataset: DatasetType) => void;
  onYearChange: (year: number) => void;
  onPlayToggle: () => void;
  onReset: () => void;
  onRotationSpeedChange: (speed: number) => void;
}

export interface UIHandle {
  setYear: (year: number) => void;
  setPlaying: (playing: boolean) => void;
  setDataset: (dataset: DatasetType) => void;
  setFPS: (fps: number) => void;
  showPopup: (data: {
    lat: number;
    lng: number;
    value: number;
    year: number;
    dataset: DatasetType;
    screenX: number;
    screenY: number;
    name?: string;
  }) => void;
  hidePopup: () => void;
  isPanelExpanded: () => boolean;
}

export function createUI(callbacks: UICallbacks): UIHandle {
  const panel = document.getElementById('ui-panel') as HTMLDivElement;
  const panelToggle = document.getElementById('panel-toggle') as HTMLButtonElement;
  const datasetSelect = document.getElementById('dataset-select') as HTMLSelectElement;
  const yearSlider = document.getElementById('year-slider') as HTMLInputElement;
  const yearDisplay = document.getElementById('year-display') as HTMLSpanElement;
  const playBtn = document.getElementById('play-btn') as HTMLButtonElement;
  const resetBtn = document.getElementById('reset-btn') as HTMLButtonElement;
  const speedSlider = document.getElementById('speed-slider') as HTMLInputElement;
  const speedValue = document.getElementById('speed-value') as HTMLSpanElement;
  const fpsValue = document.getElementById('fps-value') as HTMLSpanElement;
  const legendBar = document.getElementById('legend-bar') as HTMLDivElement;
  const legendMin = document.getElementById('legend-min') as HTMLSpanElement;
  const legendMax = document.getElementById('legend-max') as HTMLSpanElement;
  const popup = document.getElementById('data-popup') as HTMLDivElement;
  const popupClose = document.getElementById('popup-close') as HTMLButtonElement;
  const popupYear = document.getElementById('popup-year') as HTMLSpanElement;
  const popupLat = document.getElementById('popup-lat') as HTMLSpanElement;
  const popupLng = document.getElementById('popup-lng') as HTMLSpanElement;
  const popupTypeLabel = document.getElementById('popup-type-label') as HTMLSpanElement;
  const popupValue = document.getElementById('popup-value') as HTMLSpanElement;

  const playBtnIcon = playBtn.querySelector('.btn-icon') as HTMLSpanElement;
  const playBtnText = playBtn.querySelector('.btn-text') as HTMLSpanElement;

  let panelExpanded = false;
  let isPlaying = false;

  function togglePanel(): void {
    panelExpanded = !panelExpanded;
    if (panelExpanded) {
      panel.classList.remove('collapsed');
    } else {
      panel.classList.add('collapsed');
    }
  }

  function autoExpandPanel(): void {
    if (window.innerWidth > 1200 && !panelExpanded) {
      panelExpanded = true;
      panel.classList.remove('collapsed');
    } else if (window.innerWidth <= 1200 && panelExpanded) {
      panelExpanded = false;
      panel.classList.add('collapsed');
    }
  }

  panelToggle.addEventListener('click', togglePanel);

  window.addEventListener('resize', autoExpandPanel);
  autoExpandPanel();

  datasetSelect.addEventListener('change', () => {
    const value = datasetSelect.value as DatasetType;
    callbacks.onDatasetChange(value);
    updateLegend(value);
    popupTypeLabel.textContent = value === 'temperature' ? '温度' : '降水';
  });

  yearSlider.addEventListener('input', () => {
    const year = parseInt(yearSlider.value, 10);
    yearDisplay.textContent = String(year);
    callbacks.onYearChange(year);
  });

  playBtn.addEventListener('click', () => {
    callbacks.onPlayToggle();
  });

  resetBtn.addEventListener('click', () => {
    callbacks.onReset();
  });

  speedSlider.addEventListener('input', () => {
    const speed = parseFloat(speedSlider.value);
    speedValue.textContent = `${speed.toFixed(1)}x`;
    callbacks.onRotationSpeedChange(speed);
  });

  popupClose.addEventListener('click', () => {
    popup.classList.add('hidden');
  });

  function updateLegend(dataset: DatasetType): void {
    legendBar.classList.remove('temperature-legend', 'precipitation-legend');
    if (dataset === 'temperature') {
      legendBar.classList.add('temperature-legend');
      legendMin.textContent = '-30°C';
      legendMax.textContent = '50°C';
    } else {
      legendBar.classList.add('precipitation-legend');
      legendMin.textContent = '0mm';
      legendMax.textContent = '500mm';
    }
  }

  updateLegend('temperature');

  return {
    setYear(year: number): void {
      const clamped = Math.max(2000, Math.min(2020, year));
      yearSlider.value = String(clamped);
      yearDisplay.textContent = String(clamped);
    },

    setPlaying(playing: boolean): void {
      isPlaying = playing;
      if (playing) {
        playBtn.classList.add('playing');
        playBtnIcon.textContent = '⏸';
        playBtnText.textContent = '暂停';
      } else {
        playBtn.classList.remove('playing');
        playBtnIcon.textContent = '▶';
        playBtnText.textContent = '播放';
      }
    },

    setDataset(dataset: DatasetType): void {
      datasetSelect.value = dataset;
      updateLegend(dataset);
    },

    setFPS(fps: number): void {
      fpsValue.textContent = String(Math.round(fps));
      if (fps >= 50) {
        fpsValue.style.color = 'var(--success)';
      } else if (fps >= 30) {
        fpsValue.style.color = 'var(--warning)';
      } else {
        fpsValue.style.color = 'var(--danger)';
      }
    },

    showPopup(data): void {
      popupYear.textContent = String(data.year);
      popupLat.textContent = `${data.lat.toFixed(2)}°`;
      popupLng.textContent = `${data.lng.toFixed(2)}°`;
      popupTypeLabel.textContent = data.dataset === 'temperature' ? '温度' : '降水';
      const unit = data.dataset === 'temperature' ? '°C' : 'mm';
      popupValue.textContent = `${data.value.toFixed(2)}${unit}`;

      const popupWidth = 220;
      const popupHeight = 140;
      let left = data.screenX + 16;
      let top = data.screenY - popupHeight / 2;

      if (left + popupWidth > window.innerWidth - 12) {
        left = data.screenX - popupWidth - 16;
      }
      if (top < 12) top = 12;
      if (top + popupHeight > window.innerHeight - 12) {
        top = window.innerHeight - popupHeight - 12;
      }

      popup.style.left = `${left}px`;
      popup.style.top = `${top}px`;
      popup.classList.remove('hidden');
    },

    hidePopup(): void {
      popup.classList.add('hidden');
    },

    isPanelExpanded(): boolean {
      return panelExpanded;
    }
  };
}
