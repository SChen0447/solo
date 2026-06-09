export type ReagentId = 'hcl' | 'naoh' | 'cuso4' | 'phenolphthalein' | 'na2co3';

export interface Reagent {
  id: ReagentId;
  name: string;
  color: string;
  label: string;
}

export const REAGENTS: Reagent[] = [
  { id: 'hcl', name: '盐酸', color: 'rgba(255, 255, 255, 0.9)', label: 'HCl' },
  { id: 'naoh', name: '氢氧化钠', color: 'rgba(245, 245, 245, 0.95)', label: 'NaOH' },
  { id: 'cuso4', name: '硫酸铜', color: 'rgba(33, 150, 243, 0.85)', label: 'CuSO₄' },
  { id: 'phenolphthalein', name: '酚酞', color: 'rgba(255, 255, 255, 0.7)', label: '酚酞' },
  { id: 'na2co3', name: '碳酸钠', color: 'rgba(255, 255, 255, 0.9)', label: 'Na₂CO₃' }
];

export interface ParticleConfig {
  minSize: number;
  maxSize: number;
  opacity: number;
  rate: number;
  duration: number;
  color?: string;
}

export interface ReactionResult {
  equation: string;
  description: string;
  hasBubbles: boolean;
  hasPrecipitate: boolean;
  precipitateColor?: string;
  colorChange?: string;
  temperatureChange: number;
  particleConfig?: ParticleConfig;
}

export interface ReactionRule {
  reactants: [ReagentId, ReagentId];
  result: ReactionResult;
}

export const REACTIONS: ReactionRule[] = [
  {
    reactants: ['hcl', 'naoh'],
    result: {
      equation: 'HCl + NaOH → NaCl + H₂O',
      description: '中和反应，产生气泡，温度升高',
      hasBubbles: true,
      hasPrecipitate: false,
      temperatureChange: 20,
      particleConfig: {
        minSize: 5,
        maxSize: 12,
        opacity: 0.6,
        rate: 10,
        duration: 3000
      }
    }
  },
  {
    reactants: ['cuso4', 'naoh'],
    result: {
      equation: 'CuSO₄ + 2NaOH → Cu(OH)₂↓ + Na₂SO₄',
      description: '生成蓝色沉淀氢氧化铜',
      hasBubbles: false,
      hasPrecipitate: true,
      precipitateColor: 'rgba(33, 90, 200, 0.8)',
      temperatureChange: 0,
      particleConfig: {
        minSize: 3,
        maxSize: 8,
        opacity: 0.7,
        rate: 15,
        duration: 3000,
        color: 'rgba(33, 90, 200, 0.8)'
      }
    }
  },
  {
    reactants: ['na2co3', 'hcl'],
    result: {
      equation: 'Na₂CO₃ + 2HCl → 2NaCl + H₂O + CO₂↑',
      description: '产生大量气泡（二氧化碳气体）',
      hasBubbles: true,
      hasPrecipitate: false,
      temperatureChange: 5,
      particleConfig: {
        minSize: 8,
        maxSize: 15,
        opacity: 0.6,
        rate: 20,
        duration: 3000
      }
    }
  },
  {
    reactants: ['phenolphthalein', 'naoh'],
    result: {
      equation: '酚酞 + NaOH → 粉红色溶液',
      description: '酚酞遇碱变粉红色',
      hasBubbles: false,
      hasPrecipitate: false,
      colorChange: 'rgba(255, 105, 180, 0.7)',
      temperatureChange: 0
    }
  }
];

export function findReaction(reg1: ReagentId, reg2: ReagentId): ReactionResult | null {
  for (const rule of REACTIONS) {
    const [a, b] = rule.reactants;
    if ((a === reg1 && b === reg2) || (a === reg2 && b === reg1)) {
      return rule.result;
    }
  }
  return null;
}
