export type Race = 'Terran' | 'Protoss' | 'Zerg';
export type EventType = 'combat' | 'expand' | 'upgrade' | 'macro' | 'tech' | 'attack';

export interface PlayerData {
  id: string;
  name: string;
  race: Race;
  apm: number;
  minerals: number;
  gas: number;
  supply: number;
  supplyCap: number;
  unitKills: number;
  buildingKills: number;
  armyValue: number;
  workers: number;
}

export interface TimePoint {
  timestamp: number;
  player1: PlayerData;
  player2: PlayerData;
}

export interface TimelineEvent {
  uuid: string;
  timestamp: number;
  type: EventType;
  title: string;
  description: string;
  color: string;
  details: {
    resourceDiff: { minerals: number; gas: number };
    armyDiff: number;
    apmDiff: number;
    supplyDiff: number;
    p1Units: { name: string; count: number }[];
    p2Units: { name: string; count: number }[];
  };
}

export interface ChartData {
  timestamp: number;
  timeLabel: string;
  p1Minerals: number;
  p2Minerals: number;
  p1Gas: number;
  p2Gas: number;
  p1ArmyValue: number;
  p2ArmyValue: number;
  p1Apm: number;
  p2Apm: number;
}

export interface MatchSummary {
  duration: number;
  totalKillsP1: number;
  totalKillsP2: number;
  maxApmP1: number;
  maxApmP2: number;
  avgApmP1: number;
  avgApmP2: number;
  totalResourcesP1: number;
  totalResourcesP2: number;
  peakArmyP1: number;
  peakArmyP2: number;
  expoCountP1: number;
  expoCountP2: number;
  winner: 'player1' | 'player2' | 'draw';
}

export interface MatchData {
  id: string;
  mapName: string;
  duration: number;
  player1: { name: string; race: Race };
  player2: { name: string; race: Race };
  timePoints: TimePoint[];
  events: TimelineEvent[];
  chartSeries: ChartData[];
  summary: MatchSummary;
  createdAt: number;
}

export interface RawInputData {
  mapName: string;
  player1: { name: string; race: Race };
  player2: { name: string; race: Race };
  rawPoints: Array<{
    timestamp: number;
    p1Apm: number; p1Minerals: number; p1Gas: number; p1Supply: number;
    p1SupplyCap: number; p1Kills: number; p1ArmyValue: number; p1Workers: number;
    p2Apm: number; p2Minerals: number; p2Gas: number; p2Supply: number;
    p2SupplyCap: number; p2Kills: number; p2ArmyValue: number; p2Workers: number;
  }>;
}

export interface RadarStat {
  subject: string;
  value: number;
  fullMark: number;
}

export interface BarStat {
  name: string;
  match1: number;
  match2: number;
}
