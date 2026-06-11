export interface AnchorPoint {
  id: string;
  cityName: string;
  description: string;
  lat: number;
  lng: number;
}

export type TabType = 'past' | 'present' | 'future';

export interface HistoricalData {
  year: number;
  yearLabel: string;
  opacity: number;
  svgPath: string;
  description: string;
}

export interface PresentData {
  temperature: number;
  humidity: number;
  aqi: number;
  aqiLevel: string;
  weather: string;
  weatherIcon: string;
  updateTime: string;
}

export interface FutureData {
  year: number;
  temperature: number;
  seaLevel: number;
  extremeWeather: number;
}

export interface CityDetailData {
  id: string;
  cityName: string;
  country: string;
  past: HistoricalData[];
  present: PresentData;
  future: FutureData[];
}

export interface MapState {
  centerX: number;
  centerY: number;
  scale: number;
  isDragging: boolean;
}
