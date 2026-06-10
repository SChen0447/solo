import { App } from './app';

export interface PollutantRatio {
  pm25: number;
  pm10: number;
  o3: number;
  no2: number;
}

export interface HourlyData {
  aqi: number;
  pollutants: PollutantRatio;
}

export interface StationData {
  id: number;
  name: string;
  x: number;
  y: number;
  today: HourlyData[];
  yesterday: HourlyData[];
}

export type DateType = 'today' | 'yesterday';

export interface GlobalState {
  stations: StationData[];
  selectedStationId: number;
  currentHour: number;
  selectedDate: DateType;
  listeners: Set<() => void>;
}

export const AQI_COLORS: Record<string, string> = {
  good: '#2ecc71',
  moderate: '#f1c40f',
  unhealthySensitive: '#e67e22',
  unhealthy: '#e74c3c',
  veryUnhealthy: '#8e44ad',
  hazardous: '#7f2b1a'
};

export const POLLUTANT_COLORS = {
  pm25: '#e74c3c',
  pm10: '#3498db',
  o3: '#2ecc71',
  no2: '#f39c12'
};

export const POLLUTANT_NAMES: Record<string, string> = {
  pm25: 'PM2.5',
  pm10: 'PM10',
  o3: 'O3',
  no2: 'NO2'
};

export function getAQILevel(aqi: number): string {
  if (aqi <= 50) return 'good';
  if (aqi <= 100) return 'moderate';
  if (aqi <= 150) return 'unhealthySensitive';
  if (aqi <= 200) return 'unhealthy';
  if (aqi <= 300) return 'veryUnhealthy';
  return 'hazardous';
}

export function getAQIColor(aqi: number): string {
  return AQI_COLORS[getAQILevel(aqi)];
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generatePollutants(): PollutantRatio {
  const vals = [
    Math.random(),
    Math.random(),
    Math.random(),
    Math.random()
  ];
  const sum = vals.reduce((a, b) => a + b, 0);
  return {
    pm25: Math.round((vals[0] / sum) * 100),
    pm10: Math.round((vals[1] / sum) * 100),
    o3: Math.round((vals[2] / sum) * 100),
    no2: Math.round((vals[3] / sum) * 100)
  };
}

function generateHourlyData(): HourlyData[] {
  const data: HourlyData[] = [];
  for (let i = 0; i < 24; i++) {
    data.push({
      aqi: randomInt(20, 400),
      pollutants: generatePollutants()
    });
  }
  return data;
}

const STATION_NAMES = [
  '市中心监测站',
  '工业园区监测站',
  '大学城监测站',
  '滨江公园监测站',
  '商业中心监测站',
  '居民新区监测站',
  '老城区监测站',
  '交通枢纽监测站',
  '科技园区监测站',
  '郊区林场监测站'
];

function generateStations(): StationData[] {
  const positions = [
    { x: 1, y: 1 }, { x: 3, y: 1 }, { x: 5, y: 1 }, { x: 7, y: 1 },
    { x: 2, y: 3 }, { x: 4, y: 3 }, { x: 6, y: 3 },
    { x: 1, y: 5 }, { x: 3, y: 5 }, { x: 6, y: 5 }
  ];
  return STATION_NAMES.map((name, i) => ({
    id: i,
    name,
    x: positions[i].x,
    y: positions[i].y,
    today: generateHourlyData(),
    yesterday: generateHourlyData()
  }));
}

function createGlobalState(): GlobalState {
  return {
    stations: generateStations(),
    selectedStationId: 0,
    currentHour: new Date().getHours(),
    selectedDate: 'today',
    listeners: new Set()
  };
}

export function getPrimaryPollutant(pollutants: PollutantRatio): string {
  const entries = Object.entries(pollutants) as [keyof PollutantRatio, number][];
  let max: [keyof PollutantRatio, number] = ['pm25', 0];
  for (const [key, val] of entries) {
    if (val > max[1]) max = [key, val];
  }
  return POLLUTANT_NAMES[max[0]];
}

export function getStationById(state: GlobalState, id: number): StationData | undefined {
  return state.stations.find(s => s.id === id);
}

export function getCurrentHourlyData(station: StationData, date: DateType, hour: number): HourlyData {
  const data = date === 'today' ? station.today : station.yesterday;
  return data[hour];
}

export function get24HourRange(station: StationData, date: DateType): { min: number; max: number } {
  const data = date === 'today' ? station.today : station.yesterday;
  const aqiVals = data.map(d => d.aqi);
  return { min: Math.min(...aqiVals), max: Math.max(...aqiVals) };
}

const state = createGlobalState();

export function getState(): GlobalState {
  return state;
}

export function subscribe(listener: () => void): () => void {
  state.listeners.add(listener);
  return () => state.listeners.delete(listener);
}

export function notify(): void {
  state.listeners.forEach(l => l());
}

export function setSelectedStation(id: number): void {
  state.selectedStationId = id;
  notify();
}

export function setCurrentHour(hour: number): void {
  state.currentHour = Math.max(0, Math.min(23, hour));
  notify();
}

export function setSelectedDate(date: DateType): void {
  state.selectedDate = date;
  notify();
}

function startApp(): void {
  const app = new App();
  app.mount();
  app.startAnimationLoop();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', startApp);
} else {
  startApp();
}
