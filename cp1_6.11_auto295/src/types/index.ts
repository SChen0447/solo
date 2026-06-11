export interface Spice {
  id: string;
  name: string;
  basePrice: number;
  quality: 'A' | 'B' | 'C';
  perishIndex: number;
  icon: string;
}

export interface PortInventory {
  spiceId: string;
  quantity: number;
}

export interface Port {
  id: string;
  name: string;
  lat: number;
  lng: number;
  security: number;
  inventory: PortInventory[];
}

export interface CargoItem {
  spiceId: string;
  quantity: number;
  buyPrice: number;
}

export type GamePhase = 'planning' | 'sailing' | 'arrived' | 'settlement';

export type EventType = 'pirate' | 'storm' | 'port_closed' | 'demand_surge' | 'none';

export interface TradeEvent {
  type: EventType;
  message: string;
  cargoLost?: { spiceId: string; quantity: number }[];
  priceMultipliers?: { spiceId: string; multiplier: number }[];
  battleResult?: { won: boolean; lostCargo: CargoItem[] };
  portClosed?: boolean;
}

export interface TradeRequest {
  departurePortId: string;
  arrivalPortId: string;
  cargo: CargoItem[];
  round: number;
}

export interface TradeResponse {
  success: boolean;
  arrivalPortId: string;
  events: TradeEvent[];
  finalCargo: CargoItem[];
  sellPrices: { spiceId: string; price: number }[];
  totalRevenue: number;
  totalProfit: number;
  updatedPorts: Port[];
  currentRound: number;
}

export interface PriceHistory {
  spiceId: string;
  portId: string;
  prices: { round: number; price: number }[];
}

export type LogType = 'info' | 'success' | 'warning' | 'danger' | 'event';

export interface LogEntry {
  id: string;
  round: number;
  timestamp: number;
  type: LogType;
  message: string;
}

export type LogLevel = 'info' | 'success' | 'warning' | 'danger' | 'event';

export interface GameState {
  ports: Port[];
  spices: Spice[];
  priceHistories: PriceHistory[];
  currentRound: number;
  phase: GamePhase;
  departurePortId: string | null;
  arrivalPortId: string | null;
  cargo: CargoItem[];
  fleetCapacity: number;
  logs: LogEntry[];
  activeEvents: TradeEvent[];
  currentVoyageEvents: TradeEvent[];
  totalProfit: number;
  totalRevenue: number;
  voyageCount: number;
  successfulTrades: number;
  quarterRounds: number;
  isSettling: boolean;
  voyageResult: TradeResponse | null;
  selectedSpiceForChart: string;
}

export type GameAction =
  | { type: 'SET_PORTS'; payload: Port[] }
  | { type: 'SET_PRICE_HISTORIES'; payload: PriceHistory[] }
  | { type: 'SELECT_DEPARTURE'; payload: string }
  | { type: 'SELECT_ARRIVAL'; payload: string }
  | { type: 'UPDATE_CARGO'; payload: { spiceId: string; quantity: number } }
  | { type: 'CLEAR_CARGO' }
  | { type: 'SET_SAILING' }
  | { type: 'ADD_ACTIVE_EVENTS'; payload: TradeEvent[] }
  | { type: 'RESOLVE_EVENT' }
  | { type: 'COMPLETE_VOYAGE'; payload: TradeResponse }
  | { type: 'NEXT_ROUND' }
  | { type: 'ADD_LOG'; payload: LogEntry }
  | { type: 'SHOW_SETTLEMENT' }
  | { type: 'CLOSE_SETTLEMENT' }
  | { type: 'SET_CHART_SPICE'; payload: string };
