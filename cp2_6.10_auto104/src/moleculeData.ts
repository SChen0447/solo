import type { Molecule, BondEnergyCurve } from './types';

const BOND_ENERGY_MAP: Record<string, number> = {
  'C-H': 413,
  'C-C': 347,
  'C=C': 614,
  'C≡C': 839,
  'C-O': 358,
  'C=O': 745,
  'O-H': 463,
  'H-H': 436
};

const BOND_LENGTH_MAP: Record<string, number> = {
  'C-H': 1.09,
  'C-C': 1.54,
  'C=C': 1.34,
  'C≡C': 1.20,
  'C-O': 1.43,
  'C=O': 1.20,
  'O-H': 0.96,
  'H-H': 0.74
};

export function getBondKey(elem1: string, elem2: string, type: 'single' | 'double' | 'triple'): string {
  const orderMap = { single: '', double: '=', triple: '≡' };
  const order = orderMap[type];
  const sorted = [elem1, elem2].sort();
  return `${sorted[0]}${order}${sorted[1]}`;
}

export function getBondEnergy(elem1: string, elem2: string, type: 'single' | 'double' | 'triple'): number {
  const key = getBondKey(elem1, elem2, type);
  return BOND_ENERGY_MAP[key] ?? 350;
}

export function getBondLength(elem1: string, elem2: string, type: 'single' | 'double' | 'triple'): number {
  const key = getBondKey(elem1, elem2, type);
  return BOND_LENGTH_MAP[key] ?? 1.4;
}

export function getBondTypeLabel(elem1: string, elem2: string, type: 'single' | 'double' | 'triple'): string {
  const orderMap = { single: '-', double: '=', triple: '≡' };
  const sorted = [elem1, elem2].sort();
  return `${sorted[0]}${orderMap[type]}${sorted[1]}`;
}

export const ENERGY_CURVES: BondEnergyCurve[] = [
  {
    label: 'C-C 单键',
    color: '#3498db',
    bondType: 'single',
    data: [
      { bondOrder: 0.8, energy: 280 },
      { bondOrder: 0.9, energy: 310 },
      { bondOrder: 1.0, energy: 347 },
      { bondOrder: 1.1, energy: 380 },
      { bondOrder: 1.2, energy: 420 }
    ]
  },
  {
    label: 'C=C 双键',
    color: '#e74c3c',
    bondType: 'double',
    data: [
      { bondOrder: 1.8, energy: 530 },
      { bondOrder: 1.9, energy: 570 },
      { bondOrder: 2.0, energy: 614 },
      { bondOrder: 2.1, energy: 660 },
      { bondOrder: 2.2, energy: 710 }
    ]
  },
  {
    label: 'C-H 键',
    color: '#2ecc71',
    bondType: 'single',
    data: [
      { bondOrder: 0.8, energy: 340 },
      { bondOrder: 0.9, energy: 375 },
      { bondOrder: 1.0, energy: 413 },
      { bondOrder: 1.1, energy: 455 },
      { bondOrder: 1.2, energy: 500 }
    ]
  }
];

const METHANE: Molecule = {
  id: 'methane',
  name: '甲烷',
  formula: 'CH₄',
  atoms: [
    { element: 'C', position: { x: 0, y: 0, z: 0 } },
    { element: 'H', position: { x: 0.629, y: 0.629, z: 0.629 } },
    { element: 'H', position: { x: -0.629, y: -0.629, z: 0.629 } },
    { element: 'H', position: { x: -0.629, y: 0.629, z: -0.629 } },
    { element: 'H', position: { x: 0.629, y: -0.629, z: -0.629 } }
  ],
  bonds: [
    { from: 0, to: 1, type: 'single', length: 1.09 },
    { from: 0, to: 2, type: 'single', length: 1.09 },
    { from: 0, to: 3, type: 'single', length: 1.09 },
    { from: 0, to: 4, type: 'single', length: 1.09 }
  ]
};

const BENZENE: Molecule = (() => {
  const r = 1.39;
  const atoms: Molecule['atoms'] = [];
  const bonds: Molecule['bonds'] = [];
  for (let i = 0; i < 6; i++) {
    const angle = (i * Math.PI) / 3;
    atoms.push({ element: 'C', position: { x: r * Math.cos(angle), y: r * Math.sin(angle), z: 0 } });
  }
  const hR = 2.48;
  for (let i = 0; i < 6; i++) {
    const angle = (i * Math.PI) / 3;
    atoms.push({ element: 'H', position: { x: hR * Math.cos(angle), y: hR * Math.sin(angle), z: 0 } });
  }
  for (let i = 0; i < 6; i++) {
    bonds.push({ from: i, to: (i + 1) % 6, type: i % 2 === 0 ? 'double' : 'single', length: 1.39 });
  }
  for (let i = 0; i < 6; i++) {
    bonds.push({ from: i, to: i + 6, type: 'single', length: 1.09 });
  }
  return { id: 'benzene', name: '苯环', formula: 'C₆H₆', atoms, bonds };
})();

const GLUCOSE: Molecule = {
  id: 'glucose',
  name: '葡萄糖',
  formula: 'C₆H₁₂O₆',
  atoms: [
    { element: 'C', position: { x: 0, y: 0, z: 0 } },
    { element: 'C', position: { x: 1.54, y: 0, z: 0 } },
    { element: 'C', position: { x: 2.31, y: 1.33, z: 0 } },
    { element: 'C', position: { x: 1.54, y: 2.66, z: 0 } },
    { element: 'C', position: { x: 0, y: 2.66, z: 0 } },
    { element: 'C', position: { x: -0.77, y: 1.33, z: 0 } },
    { element: 'O', position: { x: 0.77, y: 1.33, z: 0 } },
    { element: 'O', position: { x: -0.77, y: -1.2, z: 0 } },
    { element: 'O', position: { x: 3.08, y: 0, z: 0 } },
    { element: 'O', position: { x: 3.08, y: 1.33, z: 1 } },
    { element: 'O', position: { x: 1.54, y: 3.86, z: 0 } },
    { element: 'O', position: { x: -1.54, y: 2.66, z: 0 } },
    { element: 'H', position: { x: 0, y: -0.8, z: 0.8 } },
    { element: 'H', position: { x: 1.54, y: -0.8, z: -0.8 } },
    { element: 'H', position: { x: 2.31, y: 1.33, z: -1 } },
    { element: 'H', position: { x: 0, y: 3.46, z: 0.8 } },
    { element: 'H', position: { x: -0.77, y: 1.33, z: -1 } },
    { element: 'H', position: { x: -0.77, y: -1.2, z: 0.9 } },
    { element: 'H', position: { x: 3.08, y: 0, z: 0.9 } },
    { element: 'H', position: { x: 3.08, y: 1.33, z: 1.9 } },
    { element: 'H', position: { x: 1.54, y: 3.86, z: 0.9 } },
    { element: 'H', position: { x: -1.54, y: 2.66, z: 0.9 } },
    { element: 'H', position: { x: -1.54, y: 0.5, z: 0 } },
    { element: 'H', position: { x: 0.77, y: 4.0, z: 0 } }
  ],
  bonds: [
    { from: 0, to: 1, type: 'single', length: 1.54 },
    { from: 1, to: 2, type: 'single', length: 1.54 },
    { from: 2, to: 3, type: 'single', length: 1.54 },
    { from: 3, to: 4, type: 'single', length: 1.54 },
    { from: 4, to: 5, type: 'single', length: 1.54 },
    { from: 5, to: 6, type: 'single', length: 1.43 },
    { from: 0, to: 6, type: 'single', length: 1.43 },
    { from: 0, to: 7, type: 'single', length: 1.43 },
    { from: 1, to: 8, type: 'single', length: 1.43 },
    { from: 2, to: 9, type: 'single', length: 1.43 },
    { from: 3, to: 10, type: 'single', length: 1.43 },
    { from: 4, to: 11, type: 'single', length: 1.43 },
    { from: 0, to: 12, type: 'single', length: 1.09 },
    { from: 1, to: 13, type: 'single', length: 1.09 },
    { from: 2, to: 14, type: 'single', length: 1.09 },
    { from: 3, to: 15, type: 'single', length: 1.09 },
    { from: 5, to: 16, type: 'single', length: 1.09 },
    { from: 7, to: 17, type: 'single', length: 0.96 },
    { from: 8, to: 18, type: 'single', length: 0.96 },
    { from: 9, to: 19, type: 'single', length: 0.96 },
    { from: 10, to: 20, type: 'single', length: 0.96 },
    { from: 11, to: 21, type: 'single', length: 0.96 },
    { from: 5, to: 22, type: 'single', length: 1.09 },
    { from: 4, to: 23, type: 'single', length: 1.09 }
  ]
};

export const MOLECULES: Record<string, Molecule> = {
  methane: METHANE,
  benzene: BENZENE,
  glucose: GLUCOSE
};
