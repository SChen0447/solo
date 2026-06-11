import { useReducer, useEffect, useCallback } from 'react';
import type {
  GameState,
  GameAction,
  Port,
  PriceHistory,
  TradeResponse,
  TradeRequest,
  CargoItem,
  TradeEvent,
} from '@/types/index';
import { INITIAL_SPICES, createLogEntry } from '@/utils/game';

const initialState: GameState = {
  ports: [],
  spices: INITIAL_SPICES,
  priceHistories: [],
  currentRound: 1,
  phase: 'planning',
  departurePortId: null,
  arrivalPortId: null,
  cargo: [],
  fleetCapacity: 100,
  logs: [],
  activeEvents: [],
  currentVoyageEvents: [],
  totalProfit: 0,
  totalRevenue: 0,
  voyageCount: 0,
  successfulTrades: 0,
  quarterRounds: 12,
  isSettling: false,
  voyageResult: null,
  selectedSpiceForChart: 'cinnamon',
};

function reducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'SET_PORTS':
      return { ...state, ports: action.payload };

    case 'SET_PRICE_HISTORIES':
      return { ...state, priceHistories: action.payload };

    case 'SELECT_DEPARTURE': {
      const newDepartureId = action.payload;
      if (newDepartureId === state.arrivalPortId) {
        return { ...state, departurePortId: newDepartureId, arrivalPortId: null };
      }
      return { ...state, departurePortId: newDepartureId };
    }

    case 'SELECT_ARRIVAL': {
      const newArrivalId = action.payload;
      if (newArrivalId === state.departurePortId) {
        return { ...state, arrivalPortId: newArrivalId, departurePortId: null };
      }
      return { ...state, arrivalPortId: newArrivalId };
    }

    case 'UPDATE_CARGO': {
      const { spiceId, quantity } = action.payload;
      if (quantity <= 0) {
        return {
          ...state,
          cargo: state.cargo.filter((item) => item.spiceId !== spiceId),
        };
      }

      const departurePort = state.ports.find((p) => p.id === state.departurePortId);
      const spice = state.spices.find((s) => s.id === spiceId);
      if (!departurePort || !spice) return state;

      const inventory = departurePort.inventory.find((i) => i.spiceId === spiceId);
      const availableQuantity = inventory ? inventory.quantity : 0;
      const finalQuantity = Math.min(quantity, availableQuantity);

      const currentCargoTotal = state.cargo.reduce(
        (sum, item) => sum + (item.spiceId !== spiceId ? item.quantity : 0),
        0
      );
      const maxAllowed = state.fleetCapacity - currentCargoTotal;
      const clampedQuantity = Math.min(finalQuantity, maxAllowed);

      if (clampedQuantity <= 0) {
        return {
          ...state,
          cargo: state.cargo.filter((item) => item.spiceId !== spiceId),
        };
      }

      const existingItem = state.cargo.find((item) => item.spiceId === spiceId);
      const basePrice = spice.basePrice;

      let newCargo: CargoItem[];
      if (existingItem) {
        newCargo = state.cargo.map((item) =>
          item.spiceId === spiceId
            ? { ...item, quantity: clampedQuantity, buyPrice: basePrice }
            : item
        );
      } else {
        newCargo = [
          ...state.cargo,
          { spiceId, quantity: clampedQuantity, buyPrice: basePrice },
        ];
      }

      return { ...state, cargo: newCargo };
    }

    case 'CLEAR_CARGO':
      return { ...state, cargo: [] };

    case 'SET_SAILING':
      return {
        ...state,
        phase: 'sailing',
        activeEvents: [],
        currentVoyageEvents: [],
        voyageResult: null,
      };

    case 'ADD_ACTIVE_EVENTS': {
      const events = action.payload.filter((e) => e.type !== 'none');
      return {
        ...state,
        activeEvents: [...state.activeEvents, ...events],
        currentVoyageEvents: [...state.currentVoyageEvents, ...events],
      };
    }

    case 'RESOLVE_EVENT':
      return {
        ...state,
        activeEvents: state.activeEvents.slice(1),
      };

    case 'COMPLETE_VOYAGE': {
      const response = action.payload;
      const isSuccess = response.success;
      const newLog = createLogEntry(
        state.currentRound,
        isSuccess ? 'success' : 'warning',
        isSuccess
          ? `航次完成！利润：¥${response.totalProfit.toLocaleString()}，收入：¥${response.totalRevenue.toLocaleString()}`
          : `航次遇到问题，部分货物损失`
      );

      const eventLogs = response.events
        .filter((e) => e.type !== 'none')
        .map((event) => {
          let logType: 'info' | 'success' | 'warning' | 'danger' | 'event' = 'event';
          if (event.type === 'pirate') logType = 'danger';
          else if (event.type === 'storm') logType = 'warning';
          else if (event.type === 'demand_surge') logType = 'success';
          else if (event.type === 'port_closed') logType = 'warning';
          return createLogEntry(state.currentRound, logType, event.message);
        });

      const nextRound = state.currentRound + 1;
      const isQuarterEnd = nextRound > state.quarterRounds;

      return {
        ...state,
        phase: isQuarterEnd ? 'settlement' : 'arrived',
        totalProfit: state.totalProfit + response.totalProfit,
        totalRevenue: state.totalRevenue + response.totalRevenue,
        voyageCount: state.voyageCount + 1,
        successfulTrades: isSuccess
          ? state.successfulTrades + 1
          : state.successfulTrades,
        currentRound: Math.min(nextRound, state.quarterRounds + 1),
        voyageResult: response,
        ports: response.updatedPorts.length > 0 ? response.updatedPorts : state.ports,
        logs: [newLog, ...eventLogs, ...state.logs],
        isSettling: isQuarterEnd,
      };
    }

    case 'NEXT_ROUND': {
      const nextRound = state.currentRound + 1;
      if (nextRound > state.quarterRounds) {
        return {
          ...state,
          phase: 'settlement',
          isSettling: true,
        };
      }
      return {
        ...state,
        currentRound: nextRound,
        phase: 'planning',
        departurePortId: null,
        arrivalPortId: null,
        cargo: [],
        activeEvents: [],
        currentVoyageEvents: [],
        voyageResult: null,
      };
    }

    case 'ADD_LOG':
      return {
        ...state,
        logs: [action.payload, ...state.logs],
      };

    case 'SHOW_SETTLEMENT':
      return {
        ...state,
        phase: 'settlement',
        isSettling: true,
      };

    case 'CLOSE_SETTLEMENT':
      return {
        ...initialState,
        spices: state.spices,
        ports: state.ports,
        priceHistories: state.priceHistories,
      };

    case 'SET_CHART_SPICE':
      return { ...state, selectedSpiceForChart: action.payload };

    default:
      return state;
  }
}

export function useGameState() {
  const [state, dispatch] = useReducer(reducer, initialState);

  const loadInitialData = useCallback(async () => {
    try {
      const [portsRes, pricesRes] = await Promise.all([
        fetch('/api/ports'),
        fetch('/api/prices'),
      ]);

      if (portsRes.ok) {
        const portsData: Port[] = await portsRes.json();
        dispatch({ type: 'SET_PORTS', payload: portsData });
      }

      if (pricesRes.ok) {
        const pricesData: PriceHistory[] = await pricesRes.json();
        dispatch({ type: 'SET_PRICE_HISTORIES', payload: pricesData });
      }
    } catch (error) {
      console.error('Failed to load initial data:', error);
    }
  }, []);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  const confirmDeparture = useCallback(async () => {
    if (
      !state.departurePortId ||
      !state.arrivalPortId ||
      state.cargo.length === 0
    ) {
      return;
    }

    dispatch({ type: 'SET_SAILING' });

    const requestBody: TradeRequest = {
      departurePortId: state.departurePortId,
      arrivalPortId: state.arrivalPortId,
      cargo: state.cargo,
      round: state.currentRound,
    };

    try {
      const response = await fetch('/api/trade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        throw new Error('Trade request failed');
      }

      const result: TradeResponse = await response.json();

      if (result.events && result.events.length > 0) {
        dispatch({ type: 'ADD_ACTIVE_EVENTS', payload: result.events });
      }

      setTimeout(() => {
        dispatch({ type: 'COMPLETE_VOYAGE', payload: result });
      }, 500);
    } catch (error) {
      console.error('Trade failed:', error);
      const errorLog = createLogEntry(state.currentRound, 'danger', '航次请求失败，请重试');
      dispatch({ type: 'ADD_LOG', payload: errorLog });
      dispatch({ type: 'NEXT_ROUND' });
    }
  }, [state.departurePortId, state.arrivalPortId, state.cargo, state.currentRound]);

  const resolveEvent = useCallback(() => {
    dispatch({ type: 'RESOLVE_EVENT' });
  }, []);

  const proceedToNextRound = useCallback(() => {
    dispatch({ type: 'NEXT_ROUND' });
  }, []);

  const showSettlement = useCallback(() => {
    dispatch({ type: 'SHOW_SETTLEMENT' });
  }, []);

  const closeSettlement = useCallback(() => {
    dispatch({ type: 'CLOSE_SETTLEMENT' });
  }, []);

  return {
    state,
    dispatch,
    loadInitialData,
    confirmDeparture,
    resolveEvent,
    proceedToNextRound,
    showSettlement,
    closeSettlement,
  };
}
