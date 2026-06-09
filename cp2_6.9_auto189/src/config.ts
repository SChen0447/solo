export const CANVAS_WIDTH = 800;
export const CANVAS_HEIGHT = 600;
export const GRID_SIZE = 20;
export const GRID_COLS = Math.floor(CANVAS_WIDTH / GRID_SIZE);
export const GRID_ROWS = Math.floor(CANVAS_HEIGHT / GRID_SIZE);

export const COLORS = {
  bgStart: '#2D5A27',
  bgEnd: '#1A3A1A',
  grass: '#7EC850',
  tree: '#2F6B1E',
  water: '#2980B9',
  rock: '#7F8C8D',
  burnt: '#2C3E50',
  herbivore: '#2ECC71',
  carnivore: '#E74C3C',
  plant: '#7EC850',
  canvasBorder: '#1F4520',
  panelDividerStart: '#E74C3C',
  panelDividerEnd: '#F39C12',
  sliderTrack: '#34495E',
  sliderThumb: '#FFFFFF',
  disasterBtn: '#E67E22',
  disasterBtnHover: '#D35400',
  eventBorder: '#C0392B',
  appBg: '#1A1A2E',
  statusBar: 'rgba(255,255,255,0.35)',
  fpsGood: '#2ECC71',
  fpsBad: '#E74C3C'
};

export const INITIAL_POPULATION = {
  herbivores: 20,
  carnivores: 5,
  plants: 50
};

export const MAX_POPULATION = 200;

export const ATTR_RANGES = {
  speed: { min: 1, max: 5 },
  size: { min: 1, max: 3 },
  reproductionCycle: { min: 5, max: 15 },
  attackPower: { min: 1, max: 5 }
};

export const HERBIVORE_ATTR = {
  triangleSize: 12,
  senseRange: 100,
  eatGain: 20,
  maxHunger: 100,
  hungerDecay: 0.3
};

export const CARNIVORE_ATTR = {
  circleRadius: 10,
  senseRange: 150,
  eatGain: 30,
  maxHunger: 100,
  hungerDecay: 0.25
};

export const PLANT_ATTR = {
  width: 10,
  height: 10,
  growInterval: 30
};

export const ENV_DEFAULTS = {
  temperature: 20,
  humidity: 50,
  resourceRichness: 1
};

export const ENV_RANGES = {
  temperature: { min: -20, max: 50 },
  humidity: { min: 0, max: 100 },
  resourceRichness: { min: 1, max: 5 }
};

export const ENV_EFFECTS = {
  tempSpeedInfluence: 0.5,
  humidityReproductionInfluence: 0.3,
  droughtSpeedMultiplier: 0.7,
  paramApplyDelayFrames: 300
};

export const EVENTS = {
  fire: { probability: 0.5, radius: 100, recoveryFrames: 600, name: '火灾' },
  drought: { probability: 0.3, durationFrames: 900, name: '干旱' },
  plague: { probability: 0.2, durationFrames: 600, killRatio: 0.5, name: '瘟疫' }
};

export const STATS = {
  populationCheckFrames: 100,
  extinctionThreshold: 3
};

export const TERRAIN_RATIOS = {
  grass: 0.7,
  tree: 0.12,
  water: 0.08,
  rock: 0.1
};

export type TerrainType = 'grass' | 'tree' | 'water' | 'rock';
