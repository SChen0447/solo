export interface ShipState {
  latitude: number;
  longitude: number;
  heading: number;
  sailAngle: number;
  speed: number;
  food: number;
  water: number;
  silk: number;
  spice: number;
  porcelain: number;
  crewHealth: number;
  gold: number;
}

export interface OceanCurrentData {
  month: number;
  windDirection: number;
  windSpeed: number;
  currentSpeed: number;
  currentDirection: number;
}

export interface LogEntry {
  id: string;
  timestamp: string;
  latitude: number;
  longitude: number;
  windDirection: number;
  windSpeed: number;
  shipSpeed: number;
  sailAngle: number;
  supplies: { food: number; water: number };
  cargo: { silk: number; spice: number; porcelain: number };
  moonPhase: string;
  riskLevel: 'low' | 'medium' | 'high';
  event?: string;
}

export interface Port {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  prosperity: number;
}

export interface RandomEvent {
  id: string;
  name: string;
  description: string;
  options: EventOption[];
}

export interface EventOption {
  label: string;
  effects: {
    speed?: number;
    supplies?: number;
    cargo?: { silk?: number; spice?: number; porcelain?: number };
    gold?: number;
  };
}

export interface PortPrices {
  portId: string;
  portName: string;
  prosperity: number;
  buyPrices: { silk: number; spice: number; porcelain: number };
  sellPrices: { silk: number; spice: number; porcelain: number };
}

export interface MoonPhaseData {
  phase: string;
  illumination: number;
}

export interface SpeedCalcResult {
  effectiveSpeed: number;
  riskLevel: 'low' | 'medium' | 'high';
}

export interface Waypoint {
  lat: number;
  lng: number;
}

export const PORTS: Port[] = [
  { id: 'aden', name: '亚丁港', latitude: 12.78, longitude: 45.02, prosperity: 65 },
  { id: 'muscat', name: '马斯喀特港', latitude: 23.59, longitude: 58.54, prosperity: 70 },
  { id: 'calicut', name: '卡利卡特港', latitude: 11.26, longitude: 75.78, prosperity: 80 },
  { id: 'hormuz', name: '霍尔木兹港', latitude: 27.19, longitude: 56.28, prosperity: 75 },
];

export const REEF_ZONES: { lat: number; lng: number; radius: number; name: string }[] = [
  { lat: 15.5, lng: 52.0, radius: 15000, name: '索科特拉暗礁群' },
  { lat: 20.0, lng: 63.0, radius: 12000, name: '马斯喀特暗礁' },
  { lat: 8.0, lng: 70.0, radius: 18000, name: '马尔代夫暗礁' },
  { lat: 25.0, lng: 58.0, radius: 10000, name: '霍尔木兹海峡暗礁' },
  { lat: 18.0, lng: 55.0, radius: 8000, name: '阿拉伯海暗礁' },
  { lat: 10.0, lng: 60.0, radius: 14000, name: '拉克沙暗礁群' },
];

export const MOON_PHASES = [
  '新月', '蛾眉月', '上弦月', '盈凸月',
  '满月', '亏凸月', '下弦月', '残月',
];
