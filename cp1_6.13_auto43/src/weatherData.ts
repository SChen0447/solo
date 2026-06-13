export type WeatherCondition =
  | 'sunny'
  | 'cloudy'
  | 'rainy'
  | 'snowy'
  | 'thunder'
  | 'foggy';

export interface WeatherData {
  city: string;
  temperature: number;
  humidity: number;
  windSpeed: number;
  condition: WeatherCondition;
  description: string;
  timestamp: number;
}

interface GeoLocation {
  latitude: number;
  longitude: number;
}

interface GeocodingResult {
  name: string;
  latitude: number;
  longitude: number;
  country?: string;
  admin1?: string;
}

const CACHE_KEY = 'weather_palette_cache_v1';
const CACHE_DURATION = 3600000;

interface WeatherCache {
  [key: string]: { data: WeatherData; timestamp: number };
}

const WEATHER_CODE_MAP: Array<{ codes: number[]; condition: WeatherCondition; description: string }> = [
  { codes: [0], condition: 'sunny', description: '晴朗' },
  { codes: [1, 2], condition: 'sunny', description: '晴间多云' },
  { codes: [3], condition: 'cloudy', description: '多云' },
  { codes: [45, 48], condition: 'foggy', description: '雾天' },
  { codes: [51, 53, 55, 56, 57], condition: 'rainy', description: '毛毛雨' },
  { codes: [61, 63, 65, 66, 67, 80, 81, 82], condition: 'rainy', description: '小雨' },
  { codes: [71, 73, 75, 77, 85, 86], condition: 'snowy', description: '小雪' },
  { codes: [95, 96, 99], condition: 'thunder', description: '雷阵雨' },
];

function mapWeatherCode(code: number): { condition: WeatherCondition; description: string } {
  for (const entry of WEATHER_CODE_MAP) {
    if (entry.codes.includes(code)) {
      return { condition: entry.condition, description: entry.description };
    }
  }
  return { condition: 'cloudy', description: '阴晴不定' };
}

function readCache(): WeatherCache {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (raw) return JSON.parse(raw) as WeatherCache;
  } catch {
    // ignore
  }
  return {};
}

function writeCache(cache: WeatherCache): void {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch {
    // ignore
  }
}

export function getCachedWeather(key: string): WeatherData | null {
  const cache = readCache();
  const entry = cache[key];
  if (entry && Date.now() - entry.timestamp < CACHE_DURATION) {
    return entry.data;
  }
  return null;
}

export function setCachedWeather(key: string, data: WeatherData): void {
  const cache = readCache();
  cache[key] = { data, timestamp: Date.now() };
  writeCache(cache);
}

export function isFreshEnough(data: WeatherData): boolean {
  return Date.now() - data.timestamp < CACHE_DURATION;
}

export async function getCurrentPosition(): Promise<GeoLocation> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('浏览器不支持地理位置功能'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        resolve({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        });
      },
      (err) => {
        let msg = '无法获取位置信息';
        switch (err.code) {
          case 1:
            msg = '用户拒绝了位置请求';
            break;
          case 2:
            msg = '位置信息不可用';
            break;
          case 3:
            msg = '获取位置超时';
            break;
        }
        reject(new Error(msg));
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  });
}

export async function geocodeCity(cityName: string): Promise<GeocodingResult> {
  const url =
    'https://geocoding-api.open-meteo.com/v1/search' +
    `?name=${encodeURIComponent(cityName)}&count=1&language=zh&format=json`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error('地理编码请求失败');
  }
  const data = await response.json();
  if (!data.results || data.results.length === 0) {
    throw new Error(`未找到城市：${cityName}`);
  }
  const r = data.results[0];
  return {
    name: r.admin1 ? `${r.name}${r.admin1 ? ', ' + r.admin1 : ''}` : r.name,
    latitude: r.latitude,
    longitude: r.longitude,
    country: r.country,
    admin1: r.admin1,
  };
}

export async function fetchWeatherByCoords(
  latitude: number,
  longitude: number,
  cityName?: string
): Promise<WeatherData> {
  const cacheKey = `coord:${latitude.toFixed(2)},${longitude.toFixed(2)}`;
  const cached = getCachedWeather(cacheKey);
  if (cached) return cached;

  const url =
    'https://api.open-meteo.com/v1/forecast' +
    `?latitude=${latitude}&longitude=${longitude}` +
    '&current=temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code' +
    '&timezone=auto';

  const response = await fetch(url);
  if (!response.ok) throw new Error('天气API请求失败');
  const json = await response.json();

  const current = json.current;
  const { condition, description } = mapWeatherCode(current.weather_code);

  let resolvedCity = cityName || `(${latitude.toFixed(1)}, ${longitude.toFixed(1)}`;

  const data: WeatherData = {
    city: resolvedCity,
    temperature: Math.round(current.temperature_2m),
    humidity: Math.round(current.relative_humidity_2m),
    windSpeed: Math.round(current.wind_speed_10m * 10) / 10,
    condition,
    description,
    timestamp: Date.now(),
  };

  setCachedWeather(cacheKey, data);
  return data;
}

export async function fetchWeatherByCity(cityName: string): Promise<WeatherData> {
  const cacheKey = `city:${cityName.trim().toLowerCase()}`;
  const cached = getCachedWeather(cacheKey);
  if (cached) return cached;

  const geo = await geocodeCity(cityName);
  const data = await fetchWeatherByCoords(geo.latitude, geo.longitude, geo.name);

  setCachedWeather(cacheKey, data);
  return data;
}

export async function fetchWeatherByLocation(): Promise<WeatherData> {
  const pos = await getCurrentPosition();
  return fetchWeatherByCoords(pos.latitude, pos.longitude);
}
