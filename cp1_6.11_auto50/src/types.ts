export enum PetType {
  CAT = 'cat',
  DOG = 'dog',
}

export enum InteractionType {
  FEED = 'feed',
  PLAY = 'play',
  CLEAN = 'clean',
}

export enum StateKey {
  HUNGER = 'hunger',
  HAPPINESS = 'happiness',
  CLEANLINESS = 'cleanliness',
  ENERGY = 'energy',
}

export enum NegativeState {
  HUNGRY = 'hungry',
  UNHAPPY = 'unhappy',
  DIRTY = 'dirty',
  TIRED = 'tired',
}

export enum ThemeType {
  WARM = 'warm',
  SCIFI = 'scifi',
}

export interface StateValues {
  hunger: number;
  happiness: number;
  cleanliness: number;
  energy: number;
}

export interface LogEntry {
  id: string;
  timestamp: Date;
  message: string;
  valueChanges: Partial<StateValues>;
}

export interface PetState {
  petType: PetType | null;
  states: StateValues;
  negativeStates: Set<NegativeState>;
  logs: LogEntry[];
  theme: ThemeType;
  currentInteraction: InteractionType | null;
  recoveryStates: Set<StateKey>;
}

export type Action =
  | { type: 'SET_PET_TYPE'; payload: PetType }
  | { type: 'UPDATE_STATES'; payload: Partial<StateValues> }
  | { type: 'ADD_LOG'; payload: { message: string; changes: Partial<StateValues> } }
  | { type: 'START_INTERACTION'; payload: InteractionType }
  | { type: 'END_INTERACTION' }
  | { type: 'TOGGLE_THEME' }
  | { type: 'SET_NEGATIVE_STATES'; payload: Set<NegativeState> }
  | { type: 'START_RECOVERY'; payload: StateKey }
  | { type: 'END_RECOVERY'; payload: StateKey };

export const DECAY_CONFIG: Record<StateKey, { interval: number; amount: number }> = {
  [StateKey.HUNGER]: { interval: 5000, amount: 1 },
  [StateKey.HAPPINESS]: { interval: 8000, amount: 1 },
  [StateKey.CLEANLINESS]: { interval: 10000, amount: 1 },
  [StateKey.ENERGY]: { interval: 3000, amount: 1 },
};

export const INTERACTION_EFFECTS: Record<InteractionType, Partial<StateValues>> = {
  [InteractionType.FEED]: {
    [StateKey.HUNGER]: +10,
    [StateKey.HAPPINESS]: +5,
  },
  [InteractionType.PLAY]: {
    [StateKey.HAPPINESS]: +15,
    [StateKey.ENERGY]: -10,
  },
  [InteractionType.CLEAN]: {
    [StateKey.CLEANLINESS]: +20,
    [StateKey.HAPPINESS]: -5,
  },
};

export const NEGATIVE_STATE_MAP: Record<StateKey, NegativeState> = {
  [StateKey.HUNGER]: NegativeState.HUNGRY,
  [StateKey.HAPPINESS]: NegativeState.UNHAPPY,
  [StateKey.CLEANLINESS]: NegativeState.DIRTY,
  [StateKey.ENERGY]: NegativeState.TIRED,
};

export const STATE_KEY_TO_NAME: Record<StateKey, string> = {
  [StateKey.HUNGER]: '饥饿值',
  [StateKey.HAPPINESS]: '快乐值',
  [StateKey.CLEANLINESS]: '清洁值',
  [StateKey.ENERGY]: '活力值',
};

export const INTERACTION_NAME: Record<InteractionType, string> = {
  [InteractionType.FEED]: '喂食',
  [InteractionType.PLAY]: '玩耍',
  [InteractionType.CLEAN]: '清洁',
};
