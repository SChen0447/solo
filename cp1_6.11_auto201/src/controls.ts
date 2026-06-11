export type TimeOfDay = 'dawn' | 'morning' | 'noon' | 'dusk' | 'night';
export type WindDirection = 'N' | 'E' | 'S' | 'W' | 'calm';

export interface ControlParams {
  timeOfDay: TimeOfDay;
  windDirection: WindDirection;
  windSpeed: number;
}

interface ControlCallbacks {
  onTimeChange: (time: TimeOfDay) => void;
  onWindChange: (direction: WindDirection, speed: number) => void;
}

const TIME_LABELS: Record<TimeOfDay, string> = {
  dawn: '清晨',
  morning: '上午',
  noon: '正午',
  dusk: '黄昏',
  night: '夜晚'
};

const TIME_VALUES: TimeOfDay[] = ['dawn', 'morning', 'noon', 'dusk', 'night'];

export class ControlPanel {
  private container: HTMLElement;
  private callbacks: ControlCallbacks;
  private currentTime: TimeOfDay = 'noon';
  private currentWind: WindDirection = 'calm';
  private windPanelVisible = false;

  constructor(containerId: string, callbacks: ControlCallbacks) {
    const el = document.getElementById(containerId);
    if (!el) throw new Error(`Container ${containerId} not found`);
    this.container = el;
    this.callbacks = callbacks;
    this.render();
  }

  private render(): void {
    this.container.innerHTML = '';

    const timeContainer = document.createElement('div');
    timeContainer.className = 'time-slider-container';

    const sunIcon = document.createElement('div');
    sunIcon.className = 'sun-icon';
    sunIcon.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="5" fill="#f4a460" stroke="#f4a460"/>
        <line x1="12" y1="1" x2="12" y2="3" stroke="#f4a460"/>
        <line x1="12" y1="21" x2="12" y2="23" stroke="#f4a460"/>
        <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" stroke="#f4a460"/>
        <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" stroke="#f4a460"/>
        <line x1="1" y1="12" x2="3" y2="12" stroke="#f4a460"/>
        <line x1="21" y1="12" x2="23" y2="12" stroke="#f4a460"/>
        <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" stroke="#f4a460"/>
        <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" stroke="#f4a460"/>
      </svg>
    `;

    const moonIcon = document.createElement('div');
    moonIcon.className = 'moon-icon';
    moonIcon.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" fill="#c9d6ff" stroke="#c9d6ff"/>
      </svg>
    `;

    const slider = document.createElement('input');
    slider.type = 'range';
    slider.min = '0';
    slider.max = '4';
    slider.step = '1';
    slider.value = '2';
    slider.className = 'time-slider';

    const timeLabel = document.createElement('div');
    timeLabel.className = 'time-label';
    timeLabel.textContent = TIME_LABELS[this.currentTime];

    slider.addEventListener('input', (e) => {
      const value = parseInt((e.target as HTMLInputElement).value);
      this.currentTime = TIME_VALUES[value];
      timeLabel.textContent = TIME_LABELS[this.currentTime];
      this.callbacks.onTimeChange(this.currentTime);
    });

    timeContainer.appendChild(sunIcon);
    timeContainer.appendChild(slider);
    timeContainer.appendChild(moonIcon);
    timeContainer.appendChild(timeLabel);

    const windContainer = document.createElement('div');
    windContainer.className = 'wind-button-container';

    const windToggleBtn = document.createElement('button');
    windToggleBtn.className = 'wind-toggle-btn';
    windToggleBtn.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M9.59 4.59A2 2 0 1 1 11 8H2m10.59 11.41A2 2 0 1 0 14 16H2m15.73-8.27A2.5 2.5 0 1 1 19.5 12H2"/>
      </svg>
    `;
    windToggleBtn.title = '选择风向';

    const windPanel = document.createElement('div');
    windPanel.className = 'wind-direction-panel';

    const directions: WindDirection[] = ['N', 'E', 'S', 'W', 'calm'];
    directions.forEach((dir) => {
      const btn = document.createElement('button');
      btn.className = 'wind-dir-btn';
      btn.textContent = dir === 'calm' ? '○' : dir;
      btn.title = dir === 'calm' ? '无风' : `风向: ${dir}`;
      if (dir === this.currentWind) {
        btn.classList.add('active');
      }
      btn.addEventListener('click', () => {
        this.setWindDirection(dir, windPanel);
      });
      windPanel.appendChild(btn);
    });

    windToggleBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.windPanelVisible = !this.windPanelVisible;
      windPanel.classList.toggle('visible', this.windPanelVisible);
    });

    document.addEventListener('click', (e) => {
      if (!windContainer.contains(e.target as Node)) {
        this.windPanelVisible = false;
        windPanel.classList.remove('visible');
      }
    });

    windContainer.appendChild(windToggleBtn);
    windContainer.appendChild(windPanel);

    this.container.appendChild(timeContainer);
    this.container.appendChild(windContainer);
  }

  private setWindDirection(dir: WindDirection, panel: HTMLElement): void {
    this.currentWind = dir;
    const buttons = panel.querySelectorAll('.wind-dir-btn');
    buttons.forEach((btn) => {
      const text = (btn as HTMLElement).textContent;
      const isActive = (text === '○' && dir === 'calm') || (text === dir);
      btn.classList.toggle('active', isActive);
    });

    let speed = 0;
    switch (dir) {
      case 'N':
      case 'S':
        speed = 0.6;
        break;
      case 'E':
      case 'W':
        speed = 0.8;
        break;
      case 'calm':
        speed = 0;
        break;
    }
    this.callbacks.onWindChange(dir, speed);
  }

  getParams(): ControlParams {
    let windSpeed = 0;
    switch (this.currentWind) {
      case 'N':
      case 'S':
        windSpeed = 0.6;
        break;
      case 'E':
      case 'W':
        windSpeed = 0.8;
        break;
      case 'calm':
        windSpeed = 0;
        break;
    }
    return {
      timeOfDay: this.currentTime,
      windDirection: this.currentWind,
      windSpeed
    };
  }
}
