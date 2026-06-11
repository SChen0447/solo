import { create } from 'zustand';
import type { ShipState, OceanCurrentData, LogEntry, Waypoint, RandomEvent, PortPrices, MoonPhaseData } from '../types';
import { PORTS } from '../types';

interface GameState {
  ship: ShipState;
  currentData: OceanCurrentData | null;
  logs: LogEntry[];
  waypoints: Waypoint[];
  isSailing: boolean;
  timeStep: number;
  currentMonth: number;
  moonPhase: MoonPhaseData | null;
  activeEvent: RandomEvent | null;
  activePortPrices: PortPrices | null;
  isTradeModalOpen: boolean;
  isEventModalOpen: boolean;
  routeInfo: { estimatedHours: number; riskLevel: string };

  setShip: (ship: Partial<ShipState>) => void;
  setCurrentData: (data: OceanCurrentData) => void;
  addLog: (log: LogEntry) => void;
  setLogs: (logs: LogEntry[]) => void;
  setWaypoints: (waypoints: Waypoint[]) => void;
  setIsSailing: (sailing: boolean) => void;
  incrementTimeStep: () => void;
  setCurrentMonth: (month: number) => void;
  setMoonPhase: (phase: MoonPhaseData) => void;
  setActiveEvent: (event: RandomEvent | null) => void;
  setActivePortPrices: (prices: PortPrices | null) => void;
  setIsTradeModalOpen: (open: boolean) => void;
  setIsEventModalOpen: (open: boolean) => void;
  setRouteInfo: (info: { estimatedHours: number; riskLevel: string }) => void;
  resetGame: () => void;
}

const initialShip: ShipState = {
  latitude: 12.78,
  longitude: 45.02,
  heading: 90,
  sailAngle: 45,
  speed: 0,
  food: 500,
  water: 500,
  silk: 5,
  spice: 10,
  porcelain: 3,
  crewHealth: 100,
  gold: 1000,
};

export const useGameStore = create<GameState>((set) => ({
  ship: { ...initialShip },
  currentData: null,
  logs: [],
  waypoints: [],
  isSailing: false,
  timeStep: 0,
  currentMonth: new Date().getMonth() + 1,
  moonPhase: null,
  activeEvent: null,
  activePortPrices: null,
  isTradeModalOpen: false,
  isEventModalOpen: false,
  routeInfo: { estimatedHours: 0, riskLevel: 'low' },

  setShip: (partial) => set((state) => ({ ship: { ...state.ship, ...partial } })),
  setCurrentData: (data) => set({ currentData: data }),
  addLog: (log) => set((state) => ({ logs: [log, ...state.logs] })),
  setLogs: (logs) => set({ logs }),
  setWaypoints: (waypoints) => set({ waypoints }),
  setIsSailing: (sailing) => set({ isSailing: sailing }),
  incrementTimeStep: () => set((state) => ({ timeStep: state.timeStep + 1 })),
  setCurrentMonth: (month) => set({ currentMonth: month }),
  setMoonPhase: (phase) => set({ moonPhase: phase }),
  setActiveEvent: (event) => set({ activeEvent: event }),
  setActivePortPrices: (prices) => set({ activePortPrices: prices }),
  setIsTradeModalOpen: (open) => set({ isTradeModalOpen: open }),
  setIsEventModalOpen: (open) => set({ isEventModalOpen: open }),
  setRouteInfo: (info) => set({ routeInfo: info }),
  resetGame: () => set({ ship: { ...initialShip }, logs: [], waypoints: [], isSailing: false, timeStep: 0, activeEvent: null, activePortPrices: null, isTradeModalOpen: false, isEventModalOpen: false }),
}));
