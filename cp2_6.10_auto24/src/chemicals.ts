import { ChemicalType, Chemical, ReactionRule } from './types';

export const CHEMICAL_DATA: Record<ChemicalType, { name: string; formula: string; pH: number; color: string; state: 'solid' | 'liquid' | 'gas' }> = {
  HCl: { name: '盐酸', formula: 'HCl', pH: 1, color: '#e74c3c', state: 'liquid' },
  NaOH: { name: '氢氧化钠', formula: 'NaOH', pH: 13, color: '#3498db', state: 'liquid' },
  H2O: { name: '水', formula: 'H₂O', pH: 7, color: '#85c1e9', state: 'liquid' },
  Zn: { name: '锌', formula: 'Zn', pH: 7, color: '#95a5a6', state: 'solid' },
  Na2CO3: { name: '碳酸钠', formula: 'Na₂CO₃', pH: 11, color: '#ecf0f1', state: 'solid' },
  CuSO4: { name: '硫酸铜', formula: 'CuSO₄', pH: 5, color: '#3498db', state: 'liquid' },
  FeCl3: { name: '氯化铁', formula: 'FeCl₃', pH: 3, color: '#e67e22', state: 'liquid' },
  KMnO4: { name: '高锰酸钾', formula: 'KMnO₄', pH: 7, color: '#8e44ad', state: 'liquid' },
  NaCl: { name: '氯化钠', formula: 'NaCl', pH: 7, color: '#ecf0f1', state: 'solid' },
  H2: { name: '氢气', formula: 'H₂', pH: 7, color: '#ffffff', state: 'gas' },
  CO2: { name: '二氧化碳', formula: 'CO₂', pH: 4, color: '#ffffff', state: 'gas' },
  'Cu(OH)2': { name: '氢氧化铜', formula: 'Cu(OH)₂', pH: 7, color: '#2980b9', state: 'solid' },
  'Fe(OH)3': { name: '氢氧化铁', formula: 'Fe(OH)₃', pH: 7, color: '#e67e22', state: 'solid' },
  ZnCl2: { name: '氯化锌', formula: 'ZnCl₂', pH: 6, color: '#dfe6e9', state: 'liquid' },
};

export function createChemical(type: ChemicalType, amount: number = 1): Chemical {
  const data = CHEMICAL_DATA[type];
  return {
    id: `${type}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    type,
    name: data.name,
    formula: data.formula,
    pH: data.pH,
    color: data.color,
    state: data.state,
    amount,
  };
}

export const REACTION_RULES: ReactionRule[] = [
  {
    id: 'acid-base-neutralization',
    name: '酸碱中和反应',
    reactants: [['HCl', 'NaOH']],
    equation: 'HCl + NaOH → NaCl + H₂O',
    products: [
      { type: 'NaCl', amount: 1 },
      { type: 'H2O', amount: 1 },
    ],
    colorChange: { from: '#e74c3c', to: '#85c1e9' },
    producesBubbles: false,
    bubbleColor: '#ffffff',
    producesPrecipitate: false,
    precipitateColor: '#ffffff',
    temperatureChange: 5,
    duration: 2000,
    isDangerous: false,
  },
  {
    id: 'metal-acid-hydrogen',
    name: '金属与酸反应产氢气',
    reactants: [['HCl', 'Zn']],
    equation: 'Zn + 2HCl → ZnCl₂ + H₂↑',
    products: [
      { type: 'ZnCl2', amount: 1 },
      { type: 'H2', amount: 1 },
    ],
    colorChange: { from: '#e74c3c', to: '#dfe6e9' },
    producesBubbles: true,
    bubbleColor: '#ffffff',
    producesPrecipitate: false,
    precipitateColor: '#ffffff',
    temperatureChange: 3,
    duration: 3000,
    isDangerous: false,
  },
  {
    id: 'carbonate-acid-co2',
    name: '碳酸盐与酸反应产二氧化碳',
    reactants: [['HCl', 'Na2CO3']],
    equation: 'Na₂CO₃ + 2HCl → 2NaCl + H₂O + CO₂↑',
    products: [
      { type: 'NaCl', amount: 2 },
      { type: 'H2O', amount: 1 },
      { type: 'CO2', amount: 1 },
    ],
    colorChange: { from: '#e74c3c', to: '#ecf0f1' },
    producesBubbles: true,
    bubbleColor: '#ffffff',
    producesPrecipitate: false,
    precipitateColor: '#ffffff',
    temperatureChange: 2,
    duration: 2500,
    isDangerous: false,
  },
  {
    id: 'double-hydrolysis-cu',
    name: '双水解沉淀反应（铜）',
    reactants: [['CuSO4', 'NaOH']],
    equation: 'CuSO₄ + 2NaOH → Cu(OH)₂↓ + Na₂SO₄',
    products: [
      { type: 'Cu(OH)2', amount: 1 },
    ],
    colorChange: { from: '#3498db', to: '#ecf0f1' },
    producesBubbles: false,
    bubbleColor: '#ffffff',
    producesPrecipitate: true,
    precipitateColor: '#2980b9',
    temperatureChange: 1,
    duration: 2000,
    isDangerous: false,
  },
  {
    id: 'double-hydrolysis-fe',
    name: '双水解沉淀反应（铁）',
    reactants: [['FeCl3', 'NaOH']],
    equation: 'FeCl₃ + 3NaOH → Fe(OH)₃↓ + 3NaCl',
    products: [
      { type: 'Fe(OH)3', amount: 1 },
    ],
    colorChange: { from: '#e67e22', to: '#ecf0f1' },
    producesBubbles: false,
    bubbleColor: '#ffffff',
    producesPrecipitate: true,
    precipitateColor: '#d35400',
    temperatureChange: 1,
    duration: 2000,
    isDangerous: false,
  },
  {
    id: 'redox-kmno4-hcl',
    name: '氧化还原反应（高锰酸钾+盐酸）',
    reactants: [['KMnO4', 'HCl']],
    equation: '2KMnO₄ + 16HCl → 2KCl + 2MnCl₂ + 5Cl₂↑ + 8H₂O',
    products: [],
    colorChange: { from: '#8e44ad', to: '#f1c40f' },
    producesBubbles: true,
    bubbleColor: '#d4efdf',
    producesPrecipitate: false,
    precipitateColor: '#ffffff',
    temperatureChange: 4,
    duration: 3000,
    isDangerous: true,
  },
];

export const DANGEROUS_COMBINATIONS: Array<[ChemicalType, ChemicalType]> = [
  ['HCl', 'KMnO4'],
];

export function getMixedPH(chemicals: Chemical[]): number {
  if (chemicals.length === 0) return 7;
  const totalAmount = chemicals.reduce((sum, c) => sum + c.amount, 0);
  if (totalAmount === 0) return 7;
  const weightedPH = chemicals.reduce((sum, c) => sum + c.pH * c.amount, 0);
  return weightedPH / totalAmount;
}

export function getPHColor(pH: number): string {
  if (pH < 3.5) return '#e74c3c';
  if (pH < 5) return '#e67e22';
  if (pH < 6.5) return '#f1c40f';
  if (pH < 7.5) return '#2ecc71';
  if (pH < 9) return '#1abc9c';
  if (pH < 11) return '#3498db';
  return '#2980b9';
}

export function getMixedColor(chemicals: Chemical[]): string {
  if (chemicals.length === 0) return 'rgba(200, 230, 255, 0.3)';
  return getPHColor(getMixedPH(chemicals));
}

export function hexToRgba(hex: string, alpha: number = 0.7): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function interpolateColor(color1: string, color2: string, t: number): string {
  const r1 = parseInt(color1.slice(1, 3), 16);
  const g1 = parseInt(color1.slice(3, 5), 16);
  const b1 = parseInt(color1.slice(5, 7), 16);
  const r2 = parseInt(color2.slice(1, 3), 16);
  const g2 = parseInt(color2.slice(3, 5), 16);
  const b2 = parseInt(color2.slice(5, 7), 16);
  const r = Math.round(r1 + (r2 - r1) * t);
  const g = Math.round(g1 + (g2 - g1) * t);
  const b = Math.round(b1 + (b2 - b1) * t);
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}
