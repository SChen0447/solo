export interface Chemical {
  id: string;
  name: string;
  formula: string;
  concentration: string;
  color: string;
  type: 'acid' | 'base' | 'salt' | 'indicator' | 'other';
  drawer: number;
}

export interface Product {
  name: string;
  formula: string;
  state: 'aqueous' | 'solid' | 'gas' | 'liquid';
  color: string;
}

export interface Reaction {
  reactants: string[];
  products: Product[];
  equation: string;
  temperatureChange: number;
  precipitation: boolean;
  precipitateColor?: string;
  gasEvolution: boolean;
  colorChange: string | null;
}

export const CHEMICALS: Chemical[] = [
  { id: 'hcl', name: '盐酸', formula: 'HCl', concentration: '1mol/L', color: '#e8f4f8', type: 'acid', drawer: 1 },
  { id: 'h2so4', name: '硫酸', formula: 'H₂SO₄', concentration: '1mol/L', color: '#e8f4f8', type: 'acid', drawer: 1 },
  { id: 'hno3', name: '硝酸', formula: 'HNO₃', concentration: '1mol/L', color: '#f0f8ff', type: 'acid', drawer: 1 },
  { id: 'acetic', name: '醋酸', formula: 'CH₃COOH', concentration: '1mol/L', color: '#fef9e7', type: 'acid', drawer: 1 },

  { id: 'naoh', name: '氢氧化钠', formula: 'NaOH', concentration: '1mol/L', color: '#e8f4f8', type: 'base', drawer: 2 },
  { id: 'koh', name: '氢氧化钾', formula: 'KOH', concentration: '1mol/L', color: '#e8f4f8', type: 'base', drawer: 2 },
  { id: 'baoh2', name: '氢氧化钡', formula: 'Ba(OH)₂', concentration: '0.5mol/L', color: '#f0f8ff', type: 'base', drawer: 2 },
  { id: 'nh3h2o', name: '氨水', formula: 'NH₃·H₂O', concentration: '1mol/L', color: '#eaf2f8', type: 'base', drawer: 2 },

  { id: 'cuso4', name: '硫酸铜', formula: 'CuSO₄', concentration: '1mol/L', color: '#3498db', type: 'salt', drawer: 3 },
  { id: 'fecl3', name: '氯化铁', formula: 'FeCl₃', concentration: '1mol/L', color: '#e67e22', type: 'salt', drawer: 3 },
  { id: 'agno3', name: '硝酸银', formula: 'AgNO₃', concentration: '0.5mol/L', color: '#e8f4f8', type: 'salt', drawer: 3 },
  { id: 'bacl2', name: '氯化钡', formula: 'BaCl₂', concentration: '0.5mol/L', color: '#e8f4f8', type: 'salt', drawer: 3 },

  { id: 'phenolphthalein', name: '酚酞', formula: 'C₂₀H₁₄O₄', concentration: '指示剂', color: '#fdfefe', type: 'indicator', drawer: 3 },
  { id: 'litmus', name: '石蕊', formula: 'C₇H₇NO₄', concentration: '指示剂', color: '#a569bd', type: 'indicator', drawer: 3 }
];

export const REACTIONS: Reaction[] = [
  {
    reactants: ['hcl', 'naoh'],
    products: [
      { name: '氯化钠', formula: 'NaCl', state: 'aqueous', color: '#e8f4f8' },
      { name: '水', formula: 'H₂O', state: 'liquid', color: '#e8f4f8' }
    ],
    equation: 'HCl + NaOH → NaCl + H₂O',
    temperatureChange: 12,
    precipitation: false,
    gasEvolution: false,
    colorChange: '#e8f4f8'
  },
  {
    reactants: ['h2so4', 'naoh'],
    products: [
      { name: '硫酸钠', formula: 'Na₂SO₄', state: 'aqueous', color: '#e8f4f8' },
      { name: '水', formula: 'H₂O', state: 'liquid', color: '#e8f4f8' }
    ],
    equation: 'H₂SO₄ + 2NaOH → Na₂SO₄ + 2H₂O',
    temperatureChange: 18,
    precipitation: false,
    gasEvolution: false,
    colorChange: '#e8f4f8'
  },
  {
    reactants: ['hcl', 'koh'],
    products: [
      { name: '氯化钾', formula: 'KCl', state: 'aqueous', color: '#e8f4f8' },
      { name: '水', formula: 'H₂O', state: 'liquid', color: '#e8f4f8' }
    ],
    equation: 'HCl + KOH → KCl + H₂O',
    temperatureChange: 12,
    precipitation: false,
    gasEvolution: false,
    colorChange: '#e8f4f8'
  },
  {
    reactants: ['hno3', 'naoh'],
    products: [
      { name: '硝酸钠', formula: 'NaNO₃', state: 'aqueous', color: '#e8f4f8' },
      { name: '水', formula: 'H₂O', state: 'liquid', color: '#e8f4f8' }
    ],
    equation: 'HNO₃ + NaOH → NaNO₃ + H₂O',
    temperatureChange: 11,
    precipitation: false,
    gasEvolution: false,
    colorChange: '#e8f4f8'
  },
  {
    reactants: ['acetic', 'naoh'],
    products: [
      { name: '醋酸钠', formula: 'CH₃COONa', state: 'aqueous', color: '#e8f4f8' },
      { name: '水', formula: 'H₂O', state: 'liquid', color: '#e8f4f8' }
    ],
    equation: 'CH₃COOH + NaOH → CH₃COONa + H₂O',
    temperatureChange: 6,
    precipitation: false,
    gasEvolution: false,
    colorChange: '#e8f4f8'
  },
  {
    reactants: ['h2so4', 'baoh2'],
    products: [
      { name: '硫酸钡', formula: 'BaSO₄', state: 'solid', color: '#ffffff' },
      { name: '水', formula: 'H₂O', state: 'liquid', color: '#e8f4f8' }
    ],
    equation: 'H₂SO₄ + Ba(OH)₂ → BaSO₄↓ + 2H₂O',
    temperatureChange: 16,
    precipitation: true,
    precipitateColor: '#ffffff',
    gasEvolution: false,
    colorChange: '#e8f4f8'
  },
  {
    reactants: ['naoh', 'cuso4'],
    products: [
      { name: '氢氧化铜', formula: 'Cu(OH)₂', state: 'solid', color: '#3498db' },
      { name: '硫酸钠', formula: 'Na₂SO₄', state: 'aqueous', color: '#e8f4f8' }
    ],
    equation: '2NaOH + CuSO₄ → Cu(OH)₂↓ + Na₂SO₄',
    temperatureChange: 3,
    precipitation: true,
    precipitateColor: '#3498db',
    gasEvolution: false,
    colorChange: '#aed6f1'
  },
  {
    reactants: ['hcl', 'agno3'],
    products: [
      { name: '氯化银', formula: 'AgCl', state: 'solid', color: '#ecf0f1' },
      { name: '硝酸', formula: 'HNO₃', state: 'aqueous', color: '#e8f4f8' }
    ],
    equation: 'HCl + AgNO₃ → AgCl↓ + HNO₃',
    temperatureChange: 2,
    precipitation: true,
    precipitateColor: '#ecf0f1',
    gasEvolution: false,
    colorChange: '#e8f4f8'
  },
  {
    reactants: ['h2so4', 'bacl2'],
    products: [
      { name: '硫酸钡', formula: 'BaSO₄', state: 'solid', color: '#ffffff' },
      { name: '盐酸', formula: 'HCl', state: 'aqueous', color: '#e8f4f8' }
    ],
    equation: 'H₂SO₄ + BaCl₂ → BaSO₄↓ + 2HCl',
    temperatureChange: 2,
    precipitation: true,
    precipitateColor: '#ffffff',
    gasEvolution: false,
    colorChange: '#e8f4f8'
  },
  {
    reactants: ['naoh', 'fecl3'],
    products: [
      { name: '氢氧化铁', formula: 'Fe(OH)₃', state: 'solid', color: '#b9770e' },
      { name: '氯化钠', formula: 'NaCl', state: 'aqueous', color: '#e8f4f8' }
    ],
    equation: '3NaOH + FeCl₃ → Fe(OH)₃↓ + 3NaCl',
    temperatureChange: 3,
    precipitation: true,
    precipitateColor: '#b9770e',
    gasEvolution: false,
    colorChange: '#fad7a0'
  },
  {
    reactants: ['naoh', 'phenolphthalein'],
    products: [
      { name: '酚酞碱式盐', formula: 'C₂₀H₁₂O₄²⁻', state: 'aqueous', color: '#ff6b9d' }
    ],
    equation: 'NaOH + 酚酞 → 粉红色溶液',
    temperatureChange: 0,
    precipitation: false,
    gasEvolution: false,
    colorChange: '#ff6b9d'
  },
  {
    reactants: ['hcl', 'na2co3'],
    products: [
      { name: '氯化钠', formula: 'NaCl', state: 'aqueous', color: '#e8f4f8' },
      { name: '水', formula: 'H₂O', state: 'liquid', color: '#e8f4f8' },
      { name: '二氧化碳', formula: 'CO₂', state: 'gas', color: '#e8f4f8' }
    ],
    equation: '2HCl + Na₂CO₃ → 2NaCl + H₂O + CO₂↑',
    temperatureChange: 5,
    precipitation: false,
    gasEvolution: true,
    colorChange: '#e8f4f8'
  },
  {
    reactants: ['hcl', 'caco3'],
    products: [
      { name: '氯化钙', formula: 'CaCl₂', state: 'aqueous', color: '#e8f4f8' },
      { name: '水', formula: 'H₂O', state: 'liquid', color: '#e8f4f8' },
      { name: '二氧化碳', formula: 'CO₂', state: 'gas', color: '#e8f4f8' }
    ],
    equation: '2HCl + CaCO₃ → CaCl₂ + H₂O + CO₂↑',
    temperatureChange: 4,
    precipitation: false,
    gasEvolution: true,
    colorChange: '#e8f4f8'
  },
  {
    reactants: ['h2so4', 'na2co3'],
    products: [
      { name: '硫酸钠', formula: 'Na₂SO₄', state: 'aqueous', color: '#e8f4f8' },
      { name: '水', formula: 'H₂O', state: 'liquid', color: '#e8f4f8' },
      { name: '二氧化碳', formula: 'CO₂', state: 'gas', color: '#e8f4f8' }
    ],
    equation: 'H₂SO₄ + Na₂CO₃ → Na₂SO₄ + H₂O + CO₂↑',
    temperatureChange: 6,
    precipitation: false,
    gasEvolution: true,
    colorChange: '#e8f4f8'
  },
  {
    reactants: ['nh3h2o', 'cuso4'],
    products: [
      { name: '氢氧化铜', formula: 'Cu(OH)₂', state: 'solid', color: '#3498db' },
      { name: '硫酸铵', formula: '(NH₄)₂SO₄', state: 'aqueous', color: '#e8f4f8' }
    ],
    equation: '2NH₃·H₂O + CuSO₄ → Cu(OH)₂↓ + (NH₄)₂SO₄',
    temperatureChange: 2,
    precipitation: true,
    precipitateColor: '#3498db',
    gasEvolution: false,
    colorChange: '#aed6f1'
  },
  {
    reactants: ['hcl', 'litmus'],
    products: [
      { name: '酸式石蕊', formula: 'HLit', state: 'aqueous', color: '#e74c3c' }
    ],
    equation: 'HCl + 石蕊 → 红色溶液',
    temperatureChange: 0,
    precipitation: false,
    gasEvolution: false,
    colorChange: '#e74c3c'
  },
  {
    reactants: ['naoh', 'litmus'],
    products: [
      { name: '碱式石蕊', formula: 'Lit⁻', state: 'aqueous', color: '#3498db' }
    ],
    equation: 'NaOH + 石蕊 → 蓝色溶液',
    temperatureChange: 0,
    precipitation: false,
    gasEvolution: false,
    colorChange: '#3498db'
  }
];

export function getChemicalById(id: string): Chemical | undefined {
  return CHEMICALS.find(c => c.id === id);
}

export function getChemicalsByDrawer(drawer: number): Chemical[] {
  return CHEMICALS.filter(c => c.drawer === drawer);
}
