import type { WeatherType } from './cloudSystem';

type WeatherChangeCallback = (weather: WeatherType) => void;
type SpeedChangeCallback = (speed: number) => void;

const WEATHER_LABELS: Record<WeatherType, string> = {
  sunny: '晴天',
  cloudy: '多云',
  rainy: '暴雨',
  storm: '雷暴'
};

export class UIManager {
  private weatherLabel: HTMLElement;
  private weatherButtons: NodeListOf<HTMLElement>;
  private speedSlider: HTMLInputElement;
  private speedValue: HTMLElement;
  private onWeatherChange: WeatherChangeCallback | null;
  private onSpeedChange: SpeedChangeCallback | null;
  private currentWeather: WeatherType;

  constructor() {
    const labelElement = document.getElementById('weather-label');
    const sliderElement = document.getElementById('speed-slider');
    const speedValueElement = document.getElementById('speed-value');

    if (!labelElement || !sliderElement || !speedValueElement) {
      throw new Error('UI elements not found');
    }

    this.weatherLabel = labelElement;
    this.speedSlider = sliderElement as HTMLInputElement;
    this.speedValue = speedValueElement;
    this.weatherButtons = document.querySelectorAll('.weather-btn');
    this.onWeatherChange = null;
    this.onSpeedChange = null;
    this.currentWeather = 'sunny';

    this.initEventListeners();
  }

  private initEventListeners(): void {
    this.weatherButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        const weather = btn.getAttribute('data-weather') as WeatherType;
        if (weather && weather !== this.currentWeather) {
          this.setWeather(weather);
          if (this.onWeatherChange) {
            this.onWeatherChange(weather);
          }
        }
      });
    });

    this.speedSlider.addEventListener('input', () => {
      const speed = parseFloat(this.speedSlider.value);
      this.updateSpeedDisplay(speed);
      if (this.onSpeedChange) {
        this.onSpeedChange(speed);
      }
    });
  }

  setWeather(weather: WeatherType): void {
    if (weather === this.currentWeather) return;

    this.currentWeather = weather;
    this.weatherLabel.textContent = WEATHER_LABELS[weather];

    this.weatherLabel.classList.remove('slide-in');
    void this.weatherLabel.offsetWidth;
    this.weatherLabel.classList.add('slide-in');

    this.weatherButtons.forEach((btn) => {
      const btnWeather = btn.getAttribute('data-weather');
      if (btnWeather === weather) {
        btn.style.transform = 'scale(0.95)';
        btn.style.boxShadow = '0 0 0 2px rgba(255,255,255,0.5)';
      } else {
        btn.style.transform = '';
        btn.style.boxShadow = '';
      }
    });
  }

  setOnWeatherChange(callback: WeatherChangeCallback): void {
    this.onWeatherChange = callback;
  }

  setOnSpeedChange(callback: SpeedChangeCallback): void {
    this.onSpeedChange = callback;
  }

  private updateSpeedDisplay(speed: number): void {
    this.speedValue.textContent = speed.toFixed(1) + 'x';
  }

  getCurrentWeather(): WeatherType {
    return this.currentWeather;
  }
}
