export interface PassData {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  description: string;
}

export interface RoadData {
  id: string;
  from: string;
  to: string;
  distanceKm: number;
  riskLevel: number;
}

export interface BeaconSetting {
  passId: string;
  igniteTiming: "immediate" | "delayed" | "disabled";
  fuelType: "hay" | "wood" | "pitch";
  windCorrection: number;
}

export interface RoutePlanRequest {
  waypoints: string[];
  speeds: ("walk" | "horse" | "fast_horse")[];
  fuelType: "hay" | "wood" | "pitch";
  beaconSettings: BeaconSetting[];
}

export interface RouteSegment {
  from: string;
  to: string;
  distance: number;
  speed: number;
  timeMinutes: number;
}

export interface BeaconResult {
  passId: string;
  visible: boolean;
  misreportProbability: number;
}

export interface RiskSegment {
  from: string;
  to: string;
  type: "broken" | "misreport";
  probability?: number;
}

export interface RoutePlanResponse {
  path: {
    nodes: string[];
    segments: RouteSegment[];
  };
  totalTimeMinutes: number;
  beaconResults: BeaconResult[];
  riskSegments: RiskSegment[];
}

export interface HistoryRecord {
  id: string;
  timestamp: number;
  waypoints: string[];
  speeds: ("walk" | "horse" | "fast_horse")[];
  fuelType: "hay" | "wood" | "pitch";
  beaconSettings: BeaconSetting[];
  totalTimeMinutes: number;
  misreportProbability: number;
  status: "success" | "partial" | "failed";
  riskSegments: RiskSegment[];
}

export const SPEED_MAP: Record<string, number> = {
  walk: 3,
  horse: 12,
  fast_horse: 25,
};

export const FUEL_CONFIG: Record<
  string,
  { duration: number; visibility: number; particlesPerSec: number; color: string }
> = {
  hay: { duration: 5, visibility: 3, particlesPerSec: 30, color: "#FFD700" },
  wood: { duration: 10, visibility: 5, particlesPerSec: 20, color: "#FF8C00" },
  pitch: { duration: 20, visibility: 8, particlesPerSec: 10, color: "#DC143C" },
};

export const PASSES: PassData[] = [
  { id: "jiayuguan", name: "嘉峪关", latitude: 39.7732, longitude: 98.2894, description: "西陲第一关" },
  { id: "yumenguan", name: "玉门关", latitude: 40.3485, longitude: 93.7446, description: "丝路咽喉" },
  { id: "yangguan", name: "阳关", latitude: 39.885, longitude: 94.02, description: "西域门户" },
  { id: "dunhuang", name: "敦煌", latitude: 40.142, longitude: 94.662, description: "沙漠绿洲" },
  { id: "lanzhou", name: "兰州", latitude: 36.0611, longitude: 103.8343, description: "陇上要塞" },
  { id: "changan", name: "长安", latitude: 34.2637, longitude: 108.9423, description: "帝都" },
  { id: "datong", name: "大同", latitude: 40.0769, longitude: 113.3001, description: "北疆锁钥" },
];

export const ROADS: RoadData[] = [
  { id: "road1", from: "jiayuguan", to: "yumenguan", distanceKm: 220, riskLevel: 2 },
  { id: "road2", from: "yumenguan", to: "dunhuang", distanceKm: 160, riskLevel: 1 },
  { id: "road3", from: "dunhuang", to: "lanzhou", distanceKm: 800, riskLevel: 4 },
  { id: "road4", from: "lanzhou", to: "changan", distanceKm: 620, riskLevel: 3 },
  { id: "road5", from: "changan", to: "datong", distanceKm: 560, riskLevel: 3 },
  { id: "road6", from: "yangguan", to: "dunhuang", distanceKm: 70, riskLevel: 1 },
  { id: "road7", from: "jiayuguan", to: "yangguan", distanceKm: 180, riskLevel: 2 },
  { id: "road8", from: "lanzhou", to: "datong", distanceKm: 860, riskLevel: 5 },
];
