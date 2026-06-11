import { create } from "zustand";
import type {
  BeaconSetting,
  RoutePlanResponse,
  HistoryRecord,
  RiskSegment,
} from "./types";

interface AppState {
  waypoints: string[];
  speeds: ("walk" | "horse" | "fast_horse")[];
  fuelType: "hay" | "wood" | "pitch";
  beaconSettings: BeaconSetting[];
  routeResult: RoutePlanResponse | null;
  history: HistoryRecord[];
  isAnimating: boolean;
  animationProgress: number;
  panelCollapsed: boolean;
  historyOpen: boolean;

  setWaypoints: (w: string[]) => void;
  setSpeeds: (s: ("walk" | "horse" | "fast_horse")[]) => void;
  setFuelType: (f: "hay" | "wood" | "pitch") => void;
  setBeaconSettings: (b: BeaconSetting[]) => void;
  setRouteResult: (r: RoutePlanResponse | null) => void;
  addHistory: (record: HistoryRecord) => void;
  setIsAnimating: (v: boolean) => void;
  setAnimationProgress: (v: number) => void;
  togglePanel: () => void;
  toggleHistory: () => void;
  restoreFromHistory: (record: HistoryRecord) => void;
  loadHistory: () => void;
}

const MAX_HISTORY = 20;

export const useStore = create<AppState>((set, get) => ({
  waypoints: [],
  speeds: ["horse"],
  fuelType: "wood",
  beaconSettings: [],
  routeResult: null,
  history: [],
  isAnimating: false,
  animationProgress: 0,
  panelCollapsed: false,
  historyOpen: false,

  setWaypoints: (w) => set({ waypoints: w }),
  setSpeeds: (s) => set({ speeds: s }),
  setFuelType: (f) => set({ fuelType: f }),
  setBeaconSettings: (b) => set({ beaconSettings: b }),
  setRouteResult: (r) => set({ routeResult: r }),
  addHistory: (record) => {
    const history = [record, ...get().history].slice(0, MAX_HISTORY);
    set({ history });
    try {
      localStorage.setItem("beacon_history", JSON.stringify(history));
    } catch {}
  },
  setIsAnimating: (v) => set({ isAnimating: v }),
  setAnimationProgress: (v) => set({ animationProgress: v }),
  togglePanel: () => set((s) => ({ panelCollapsed: !s.panelCollapsed })),
  toggleHistory: () => set((s) => ({ historyOpen: !s.historyOpen })),
  restoreFromHistory: (record) => {
    set({
      waypoints: record.waypoints,
      speeds: record.speeds,
      fuelType: record.fuelType,
      beaconSettings: record.beaconSettings,
      isAnimating: false,
      animationProgress: 0,
    });
  },
  loadHistory: () => {
    try {
      const raw = localStorage.getItem("beacon_history");
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          set({ history: parsed.slice(0, MAX_HISTORY) });
        }
      }
    } catch {}
  },
}));
