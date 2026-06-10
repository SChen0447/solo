export type ToolType = 'testTube' | 'beaker' | 'alcoholLamp' | 'dropper';
export type ChemicalType = 'HCl' | 'NaOH' | 'H2O' | 'Zn' | 'Na2CO3' | 'CuSO4' | 'FeCl3' | 'KMnO4'
  | 'NaCl' | 'H2' | 'CO2' | 'Cu(OH)2' | 'Fe(OH)3' | 'ZnCl2';

export type ActionType = 'addChemical' | 'heat' | 'cool' | 'placeOnLamp' | 'removeFromLamp';

export interface Chemical {
  id: string;
  type: ChemicalType;
  name: string;
  formula: string;
  pH: number;
  color: string;
  state: 'solid' | 'liquid' | 'gas';
  amount: number;
}

export interface Container {
  id: string;
  type: 'testTube' | 'beaker';
  x: number;
  y: number;
  width: number;
  height: number;
  chemicals: Chemical[];
  temperature: number;
  isHeating: boolean;
  heatDuration: number;
  isBoiling: boolean;
  reactionState: ReactionState | null;
}

export interface AlcoholLamp {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  isLit: boolean;
}

export interface Dropper {
  id: string;
  x: number;
  y: number;
  chemical: ChemicalType | null;
  isCooling: boolean;
  coolStartTime: number;
}

export interface Bubble {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  alpha: number;
  life: number;
}

export interface SteamParticle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  alpha: number;
  life: number;
}

export interface Precipitate {
  id: number;
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
}

export interface ReactionState {
  type: string;
  equation: string;
  startTime: number;
  duration: number;
  startColor: string;
  endColor: string;
  producesBubbles: boolean;
  bubbleColor: string;
  producesPrecipitate: boolean;
  precipitateColor: string;
  temperatureChange: number;
  products: Array<{ type: ChemicalType; amount: number }>;
}

export interface ReactionRule {
  id: string;
  name: string;
  reactants: ChemicalType[][];
  equation: string;
  products: Array<{ type: ChemicalType; amount: number }>;
  colorChange: { from: string; to: string };
  producesBubbles: boolean;
  bubbleColor: string;
  producesPrecipitate: boolean;
  precipitateColor: string;
  temperatureChange: number;
  duration: number;
  isDangerous: boolean;
}

export interface RecordStep {
  timestamp: number;
  action: ActionType;
  containerId?: string;
  chemical?: ChemicalType;
  targetId?: string;
}

export interface ExperimentRecord {
  id: string;
  startTime: number;
  endTime: number;
  steps: RecordStep[];
  initialState: {
    containers: Container[];
    lamps: AlcoholLamp[];
  };
}

export interface LabState {
  containers: Container[];
  lamps: AlcoholLamp[];
  droppers: Dropper[];
  bubbles: Bubble[];
  steamParticles: SteamParticle[];
  precipitates: Precipitate[];
  activeReactions: ReactionState[];
  temperatureHistory: number[];
  currentEquation: string;
}

export interface DropperState {
  isActive: boolean;
  chemical: ChemicalType | null;
  x: number;
  y: number;
  isCooling: boolean;
  coolStartTime: number;
}
