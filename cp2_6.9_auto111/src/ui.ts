import type { WeatherSystem, WeatherType } from './weatherSystem';

export function setupUI(weatherSystem: WeatherSystem): void {
  const weatherBtns = document.querySelectorAll<HTMLButtonElement>(
    '.weather-btn[data-weather]'
  );
  const densitySlider = document.getElementById(
    'density-slider'
  ) as HTMLInputElement | null;
  const densityValue = document.getElementById('density-value');

  const updateActiveButton = (weather: WeatherType): void => {
    weatherBtns.forEach((btn) => {
      const btnWeather = btn.dataset.weather as WeatherType;
      btn.classList.toggle('active', btnWeather === weather);
    });
  };

  weatherBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      const weather = btn.dataset.weather as WeatherType;
      if (weather) {
        weatherSystem.setWeather(weather);
        updateActiveButton(weather);

        btn.style.transform = 'scale(0.95)';
        setTimeout(() => {
          btn.style.transform = '';
        }, 150);
      }
    });
  });

  if (densitySlider && densityValue) {
    const updateDensity = (): void => {
      const val = parseFloat(densitySlider.value);
      weatherSystem.setParticleDensity(val);
      densityValue.textContent = `${val.toFixed(1)}x`;
    };

    densitySlider.addEventListener('input', updateDensity);
    updateDensity();
  }

  updateActiveButton(weatherSystem.getWeather());
}
