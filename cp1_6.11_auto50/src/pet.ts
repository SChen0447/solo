import {
  StateValues,
  StateKey,
  InteractionType,
  NegativeState,
  DECAY_CONFIG,
  INTERACTION_EFFECTS,
  NEGATIVE_STATE_MAP,
} from './types';

export function createInitialStates(): StateValues {
  return {
    hunger: 100,
    happiness: 100,
    cleanliness: 100,
    energy: 100,
  };
}

export function createInitialLastDecay(): Record<StateKey, number> {
  return {
    [StateKey.HUNGER]: 0,
    [StateKey.HAPPINESS]: 0,
    [StateKey.CLEANLINESS]: 0,
    [StateKey.ENERGY]: 0,
  };
}

export function clampState(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value * 10) / 10));
}

export function decayStates(
  states: StateValues,
  elapsedMs: number,
  lastDecay: Record<StateKey, number>,
  recoveryStates: Set<StateKey>
): {
  newStates: StateValues;
  newLastDecay: Record<StateKey, number>;
  decayedKeys: StateKey[];
} {
  const newStates = { ...states };
  const newLastDecay = { ...lastDecay };
  const decayedKeys: StateKey[] = [];

  (Object.keys(DECAY_CONFIG) as StateKey[]).forEach((key) => {
    if (recoveryStates.has(key)) {
      return;
    }

    const config = DECAY_CONFIG[key];
    newLastDecay[key] += elapsedMs;

    while (newLastDecay[key] >= config.interval) {
      newStates[key] = clampState(newStates[key] - config.amount);
      newLastDecay[key] -= config.interval;
      if (!decayedKeys.includes(key)) {
        decayedKeys.push(key);
      }
    }
  });

  return { newStates, newLastDecay, decayedKeys };
}

export function handleInteraction(
  states: StateValues,
  interaction: InteractionType
): { newStates: StateValues; changes: Partial<StateValues> } {
  const effects = INTERACTION_EFFECTS[interaction];
  const newStates = { ...states };
  const changes: Partial<StateValues> = {};

  (Object.keys(effects) as StateKey[]).forEach((key) => {
    const delta = effects[key] || 0;
    const oldValue = newStates[key];
    newStates[key] = clampState(oldValue + delta);
    changes[key] = newStates[key] - oldValue;
  });

  return { newStates, changes };
}

export function checkNegativeStates(states: StateValues): Set<NegativeState> {
  const negativeStates = new Set<NegativeState>();

  (Object.keys(NEGATIVE_STATE_MAP) as StateKey[]).forEach((key) => {
    if (states[key] <= 0) {
      negativeStates.add(NEGATIVE_STATE_MAP[key]);
    }
  });

  return negativeStates;
}

export function getStateFromNegative(negativeState: NegativeState): StateKey {
  const entries = Object.entries(NEGATIVE_STATE_MAP) as [StateKey, NegativeState][];
  const entry = entries.find(([, value]) => value === negativeState);
  return entry ? entry[0] : StateKey.HUNGER;
}

export function interpolateColor(color1: string, color2: string, ratio: number): string {
  const hex = (x: string) => parseInt(x, 16);
  const r1 = hex(color1.slice(1, 3));
  const g1 = hex(color1.slice(3, 5));
  const b1 = hex(color1.slice(5, 7));
  const r2 = hex(color2.slice(1, 3));
  const g2 = hex(color2.slice(3, 5));
  const b2 = hex(color2.slice(5, 7));

  const r = Math.round(r1 + (r2 - r1) * ratio);
  const g = Math.round(g1 + (g2 - g1) * ratio);
  const b = Math.round(b1 + (b2 - b1) * ratio);

  return `rgb(${r}, ${g}, ${b})`;
}

export function getBarColor(value: number): string {
  if (value >= 50) {
    const ratio = (value - 50) / 50;
    return interpolateColor('#FFEB3B', '#8BC34A', ratio);
  } else {
    const ratio = value / 50;
    return interpolateColor('#FF5252', '#FFEB3B', ratio);
  }
}
