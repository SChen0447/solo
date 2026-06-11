export type GrowthStage = 'seed' | 'root' | 'stem' | 'leaf' | 'flower';

export type OperationType = 'water' | 'fertilize' | 'sunlight';

export interface EnvironmentParams {
  temperature: number;
  humidity: number;
  lightIntensity: number;
}

export interface PlantState {
  stage: GrowthStage;
  height: number;
  leafCount: number;
  flowerProgress: number;
  health: number;
  day: number;
  lastOperation: OperationLog | null;
  operations: OperationLog[];
  rootProgress: number;
  stemProgress: number;
  leafProgress: number;
}

export interface OperationLog {
  type: OperationType;
  timestamp: number;
  day: number;
}

export interface AppearanceFactors {
  leafCurl: number;
  soilCrack: number;
  leafBleach: number;
  leafYellow: number;
}

const STAGE_TRANSITION_DAYS: Record<GrowthStage, number> = {
  seed: 0,
  root: 3,
  stem: 7,
  leaf: 12,
  flower: 18,
};

const STAGE_NAMES: Record<GrowthStage, string> = {
  seed: '种子期',
  root: '生根期',
  stem: '抽茎期',
  leaf: '长叶期',
  flower: '开花期',
};

export const getStageName = (stage: GrowthStage): string => STAGE_NAMES[stage];

export const getOperationName = (type: OperationType): string => {
  const names: Record<OperationType, string> = {
    water: '浇水',
    fertilize: '施肥',
    sunlight: '日照',
  };
  return names[type];
};

export const getOperationColor = (type: OperationType): string => {
  const colors: Record<OperationType, string> = {
    water: '#4FC3F7',
    fertilize: '#FFB74D',
    sunlight: '#FFD54F',
  };
  return colors[type];
};

export const createInitialState = (): PlantState => ({
  stage: 'seed',
  height: 0,
  leafCount: 0,
  flowerProgress: 0,
  health: 80,
  day: 0,
  lastOperation: null,
  operations: [],
  rootProgress: 0,
  stemProgress: 0,
  leafProgress: 0,
});

const clamp = (value: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, value));

export const calculateStage = (day: number): GrowthStage => {
  if (day >= STAGE_TRANSITION_DAYS.flower) return 'flower';
  if (day >= STAGE_TRANSITION_DAYS.leaf) return 'leaf';
  if (day >= STAGE_TRANSITION_DAYS.stem) return 'stem';
  if (day >= STAGE_TRANSITION_DAYS.root) return 'root';
  return 'seed';
};

export const calculateGrowth = (
  state: PlantState,
  operation: OperationType,
  env: EnvironmentParams
): PlantState => {
  let healthDelta = 0;
  let dayDelta = 0;

  switch (operation) {
    case 'water':
      healthDelta = 5;
      dayDelta = 1;
      break;
    case 'fertilize':
      healthDelta = 10;
      dayDelta = 2;
      break;
    case 'sunlight':
      healthDelta = 3;
      dayDelta = 1.5;
      break;
  }

  const envBonus = calculateEnvironmentBonus(env);
  const effectiveDayDelta = dayDelta * envBonus;
  const newDay = state.day + effectiveDayDelta;
  const newStage = calculateStage(newDay);

  const log: OperationLog = {
    type: operation,
    timestamp: Date.now(),
    day: newDay,
  };

  return {
    ...state,
    stage: newStage,
    day: newDay,
    height: calculateHeight(newDay, newStage),
    leafCount: calculateLeafCount(newDay, newStage),
    flowerProgress: calculateFlowerProgress(newDay, newStage),
    health: clamp(state.health + healthDelta, 0, 100),
    lastOperation: log,
    operations: [...state.operations, log],
    rootProgress: calculateProgress(newDay, 'root'),
    stemProgress: calculateProgress(newDay, 'stem'),
    leafProgress: calculateProgress(newDay, 'leaf'),
  };
};

const calculateEnvironmentBonus = (env: EnvironmentParams): number => {
  const tempScore = 1 - Math.abs(env.temperature - 25) / 25;
  const humidityScore = 1 - Math.abs(env.humidity - 50) / 60;
  const lightScore = 1 - Math.abs(env.lightIntensity - 5) / 10;
  return Math.max(0.3, (tempScore + humidityScore + lightScore) / 3 + 0.5);
};

const calculateProgress = (day: number, targetStage: Exclude<GrowthStage, 'seed'>): number => {
  const start = STAGE_TRANSITION_DAYS[targetStage];
  const end = targetStage === 'flower' ? 25 : STAGE_TRANSITION_DAYS[getNextStage(targetStage)];
  if (day < start) return 0;
  if (day >= end) return 1;
  return (day - start) / (end - start);
};

const getNextStage = (stage: Exclude<GrowthStage, 'seed'>): GrowthStage => {
  const order: GrowthStage[] = ['seed', 'root', 'stem', 'leaf', 'flower'];
  const idx = order.indexOf(stage);
  return order[idx + 1] || 'flower';
};

const calculateHeight = (day: number, stage: GrowthStage): number => {
  const baseHeight: Record<GrowthStage, number> = {
    seed: 0,
    root: 0.2,
    stem: 1,
    leaf: 2.5,
    flower: 4,
  };
  const progress = calculateProgress(day, stage === 'seed' ? 'root' : stage);
  const prevStage = getPreviousStage(stage);
  const base = baseHeight[prevStage];
  const target = baseHeight[stage];
  return base + (target - base) * easeInOutCubic(progress);
};

const getPreviousStage = (stage: GrowthStage): GrowthStage => {
  const order: GrowthStage[] = ['seed', 'root', 'stem', 'leaf', 'flower'];
  const idx = order.indexOf(stage);
  return idx > 0 ? order[idx - 1] : 'seed';
};

const calculateLeafCount = (day: number, stage: GrowthStage): number => {
  if (stage === 'seed' || stage === 'root' || stage === 'stem') return 0;
  if (stage === 'leaf') {
    const progress = calculateProgress(day, 'leaf');
    return Math.floor(2 + progress * 6);
  }
  const progress = calculateProgress(day, 'flower');
  return 8 + Math.floor(progress * 4);
};

const calculateFlowerProgress = (day: number, stage: GrowthStage): number => {
  if (stage !== 'flower') return 0;
  return calculateProgress(day, 'flower');
};

const easeInOutCubic = (t: number): number =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

export const decayHealth = (state: PlantState): PlantState => ({
  ...state,
  health: clamp(state.health - 1, 0, 100),
});

export const calculateAppearanceFactors = (
  env: EnvironmentParams,
  health: number
): AppearanceFactors => ({
  leafCurl: clamp((env.temperature - 35) / 5, 0, 1),
  soilCrack: clamp((40 - env.humidity) / 20, 0, 1),
  leafBleach: clamp((env.lightIntensity - 8) / 2, 0, 1),
  leafYellow: health < 20 ? clamp((20 - health) / 20, 0, 1) : 0,
});

export const interpolateState = (from: PlantState, to: PlantState, progress: number): PlantState => {
  const p = easeInOutCubic(clamp(progress, 0, 1));
  return {
    ...from,
    height: from.height + (to.height - from.height) * p,
    leafCount: from.leafCount + Math.floor((to.leafCount - from.leafCount) * p),
    flowerProgress: from.flowerProgress + (to.flowerProgress - from.flowerProgress) * p,
    health: from.health + (to.health - from.health) * p,
    day: from.day + (to.day - from.day) * p,
    rootProgress: from.rootProgress + (to.rootProgress - from.rootProgress) * p,
    stemProgress: from.stemProgress + (to.stemProgress - from.stemProgress) * p,
    leafProgress: from.leafProgress + (to.leafProgress - from.leafProgress) * p,
  };
};

export const getReplayStates = (
  currentState: PlantState,
  operations: OperationLog[],
  env: EnvironmentParams
): { state: PlantState; operation?: OperationLog }[] => {
  const states: { state: PlantState; operation?: OperationLog }[] = [];
  let state = createInitialState();
  states.push({ state });

  for (const op of operations) {
    state = calculateGrowth(state, op.type, env);
    states.push({ state, operation: op });
  }

  if (operations.length === 0) {
    states.push({ state: currentState });
  }

  return states;
};
