export type WeatherType = 'sunny' | 'rainy' | 'snowy' | 'cloudy';

export interface WeatherDay {
  date: string;
  weekday: string;
  temperature: number;
  tempLow: number;
  tempHigh: number;
  weatherType: WeatherType;
  windSpeed: number;
  humidity: number;
}

export type CityKey = 'beijing' | 'shanghai' | 'guangzhou' | 'chengdu';

const WEEKDAYS = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];

const CITY_BASE_TEMP: Record<CityKey, number> = {
  beijing: 18,
  shanghai: 22,
  guangzhou: 28,
  chengdu: 20,
};

const CITY_WEATHER_BIAS: Record<CityKey, WeatherType[]> = {
  beijing: ['sunny', 'sunny', 'cloudy', 'cloudy', 'rainy'],
  shanghai: ['cloudy', 'rainy', 'sunny', 'cloudy', 'rainy'],
  guangzhou: ['sunny', 'rainy', 'cloudy', 'sunny', 'rainy'],
  chengdu: ['cloudy', 'cloudy', 'rainy', 'cloudy', 'sunny'],
};

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function formatDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function formatShortDate(date: Date): string {
  const m = date.getMonth() + 1;
  const d = date.getDate();
  return `${m}/${d}`;
}

function generateWeatherForCity(city: CityKey): WeatherDay[] {
  const baseTemp = CITY_BASE_TEMP[city];
  const weatherPool = CITY_WEATHER_BIAS[city];
  const days: WeatherDay[] = [];
  const today = new Date();

  for (let i = 0; i < 7; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() + i);

    const tempOffset = randomInt(-5, 5);
    const temperature = baseTemp + tempOffset;
    const tempLow = temperature - randomInt(3, 6);
    const tempHigh = temperature + randomInt(2, 5);

    const weatherType = weatherPool[randomInt(0, weatherPool.length - 1)];
    const finalWeather: WeatherType = city === 'beijing' && i < 2 && Math.random() < 0.1
      ? 'snowy'
      : weatherType;

    days.push({
      date: formatShortDate(date),
      weekday: i === 0 ? '今天' : WEEKDAYS[date.getDay()],
      temperature,
      tempLow,
      tempHigh,
      weatherType: finalWeather,
      windSpeed: randomInt(2, 25),
      humidity: finalWeather === 'rainy' ? randomInt(70, 95) : finalWeather === 'snowy' ? randomInt(50, 75) : randomInt(30, 70),
    });
  }

  return days;
}

const CACHE: Partial<Record<CityKey, WeatherDay[]>> = {};

export function fetchWeatherData(city: CityKey): Promise<WeatherDay[]> {
  return new Promise((resolve) => {
    setTimeout(() => {
      if (!CACHE[city]) {
        CACHE[city] = generateWeatherForCity(city);
      }
      resolve(CACHE[city] as WeatherDay[]);
    }, 1000);
  });
}

export function refreshWeatherData(city: CityKey): Promise<WeatherDay[]> {
  CACHE[city] = generateWeatherForCity(city);
  return fetchWeatherData(city);
}

export function getWeatherIcon(type: WeatherType): string {
  switch (type) {
    case 'sunny': return '☀️';
    case 'rainy': return '🌧️';
    case 'snowy': return '❄️';
    case 'cloudy': return '☁️';
  }
}

export function getWeatherLabel(type: WeatherType): string {
  switch (type) {
    case 'sunny': return '晴';
    case 'rainy': return '雨';
    case 'snowy': return '雪';
    case 'cloudy': return '多云';
  }
}
