export interface AtomData {
  id: string;
  element: string;
  name: string;
  symbol: string;
  atomicNumber: number;
  color: number;
  radius: number;
  position: { x: number; y: number; z: number };
  hybridization: 'sp' | 'sp2' | 'sp3';
}

export interface BondData {
  atom1: string;
  atom2: string;
  order: 1 | 2 | 3;
}

export interface MoleculeData {
  id: string;
  name: string;
  formula: string;
  description: string;
  atoms: AtomData[];
  bonds: BondData[];
}

export const ELEMENT_COLORS: Record<string, number> = {
  H: 0xffffff,
  C: 0x404040,
  N: 0x3050f8,
  O: 0xff0d0d,
  S: 0xffff30,
  P: 0xff8000,
  Cl: 0x1ff01f,
  F: 0x90e050,
  Br: 0xa62929,
  I: 0x940094,
};

export const ELEMENT_RADII: Record<string, number> = {
  H: 0.31,
  C: 0.76,
  N: 0.71,
  O: 0.66,
  S: 1.05,
  P: 1.07,
  Cl: 1.02,
  F: 0.57,
  Br: 1.20,
  I: 1.39,
};

export const ELEMENT_NAMES: Record<string, string> = {
  H: '氢',
  C: '碳',
  N: '氮',
  O: '氧',
  S: '硫',
  P: '磷',
  Cl: '氯',
  F: '氟',
  Br: '溴',
  I: '碘',
};

export const MOLECULES: MoleculeData[] = [
  {
    id: 'water',
    name: '水',
    formula: 'H₂O',
    description: '水分子',
    atoms: [
      { id: 'O1', element: 'O', name: '氧', symbol: 'O', atomicNumber: 8, color: 0xff0d0d, radius: 0.66, position: { x: 0, y: 0, z: 0 }, hybridization: 'sp3' },
      { id: 'H1', element: 'H', name: '氢', symbol: 'H', atomicNumber: 1, color: 0xffffff, radius: 0.31, position: { x: 0.76, y: 0.58, z: 0 }, hybridization: 'sp3' },
      { id: 'H2', element: 'H', name: '氢', symbol: 'H', atomicNumber: 1, color: 0xffffff, radius: 0.31, position: { x: -0.76, y: 0.58, z: 0 }, hybridization: 'sp3' },
    ],
    bonds: [
      { atom1: 'O1', atom2: 'H1', order: 1 },
      { atom1: 'O1', atom2: 'H2', order: 1 },
    ],
  },
  {
    id: 'methane',
    name: '甲烷',
    formula: 'CH₄',
    description: '甲烷分子',
    atoms: [
      { id: 'C1', element: 'C', name: '碳', symbol: 'C', atomicNumber: 6, color: 0x404040, radius: 0.76, position: { x: 0, y: 0, z: 0 }, hybridization: 'sp3' },
      { id: 'H1', element: 'H', name: '氢', symbol: 'H', atomicNumber: 1, color: 0xffffff, radius: 0.31, position: { x: 0.63, y: 0.63, z: 0.63 }, hybridization: 'sp3' },
      { id: 'H2', element: 'H', name: '氢', symbol: 'H', atomicNumber: 1, color: 0xffffff, radius: 0.31, position: { x: -0.63, y: -0.63, z: 0.63 }, hybridization: 'sp3' },
      { id: 'H3', element: 'H', name: '氢', symbol: 'H', atomicNumber: 1, color: 0xffffff, radius: 0.31, position: { x: -0.63, y: 0.63, z: -0.63 }, hybridization: 'sp3' },
      { id: 'H4', element: 'H', name: '氢', symbol: 'H', atomicNumber: 1, color: 0xffffff, radius: 0.31, position: { x: 0.63, y: -0.63, z: -0.63 }, hybridization: 'sp3' },
    ],
    bonds: [
      { atom1: 'C1', atom2: 'H1', order: 1 },
      { atom1: 'C1', atom2: 'H2', order: 1 },
      { atom1: 'C1', atom2: 'H3', order: 1 },
      { atom1: 'C1', atom2: 'H4', order: 1 },
    ],
  },
  {
    id: 'benzene',
    name: '苯',
    formula: 'C₆H₆',
    description: '苯分子',
    atoms: [
      { id: 'C1', element: 'C', name: '碳', symbol: 'C', atomicNumber: 6, color: 0x404040, radius: 0.76, position: { x: 0, y: 1.39, z: 0 }, hybridization: 'sp2' },
      { id: 'C2', element: 'C', name: '碳', symbol: 'C', atomicNumber: 6, color: 0x404040, radius: 0.76, position: { x: 1.205, y: 0.695, z: 0 }, hybridization: 'sp2' },
      { id: 'C3', element: 'C', name: '碳', symbol: 'C', atomicNumber: 6, color: 0x404040, radius: 0.76, position: { x: 1.205, y: -0.695, z: 0 }, hybridization: 'sp2' },
      { id: 'C4', element: 'C', name: '碳', symbol: 'C', atomicNumber: 6, color: 0x404040, radius: 0.76, position: { x: 0, y: -1.39, z: 0 }, hybridization: 'sp2' },
      { id: 'C5', element: 'C', name: '碳', symbol: 'C', atomicNumber: 6, color: 0x404040, radius: 0.76, position: { x: -1.205, y: -0.695, z: 0 }, hybridization: 'sp2' },
      { id: 'C6', element: 'C', name: '碳', symbol: 'C', atomicNumber: 6, color: 0x404040, radius: 0.76, position: { x: -1.205, y: 0.695, z: 0 }, hybridization: 'sp2' },
      { id: 'H1', element: 'H', name: '氢', symbol: 'H', atomicNumber: 1, color: 0xffffff, radius: 0.31, position: { x: 0, y: 2.48, z: 0 }, hybridization: 'sp2' },
      { id: 'H2', element: 'H', name: '氢', symbol: 'H', atomicNumber: 1, color: 0xffffff, radius: 0.31, position: { x: 2.15, y: 1.24, z: 0 }, hybridization: 'sp2' },
      { id: 'H3', element: 'H', name: '氢', symbol: 'H', atomicNumber: 1, color: 0xffffff, radius: 0.31, position: { x: 2.15, y: -1.24, z: 0 }, hybridization: 'sp2' },
      { id: 'H4', element: 'H', name: '氢', symbol: 'H', atomicNumber: 1, color: 0xffffff, radius: 0.31, position: { x: 0, y: -2.48, z: 0 }, hybridization: 'sp2' },
      { id: 'H5', element: 'H', name: '氢', symbol: 'H', atomicNumber: 1, color: 0xffffff, radius: 0.31, position: { x: -2.15, y: -1.24, z: 0 }, hybridization: 'sp2' },
      { id: 'H6', element: 'H', name: '氢', symbol: 'H', atomicNumber: 1, color: 0xffffff, radius: 0.31, position: { x: -2.15, y: 1.24, z: 0 }, hybridization: 'sp2' },
    ],
    bonds: [
      { atom1: 'C1', atom2: 'C2', order: 2 },
      { atom1: 'C2', atom2: 'C3', order: 1 },
      { atom1: 'C3', atom2: 'C4', order: 2 },
      { atom1: 'C4', atom2: 'C5', order: 1 },
      { atom1: 'C5', atom2: 'C6', order: 2 },
      { atom1: 'C6', atom2: 'C1', order: 1 },
      { atom1: 'C1', atom2: 'H1', order: 1 },
      { atom1: 'C2', atom2: 'H2', order: 1 },
      { atom1: 'C3', atom2: 'H3', order: 1 },
      { atom1: 'C4', atom2: 'H4', order: 1 },
      { atom1: 'C5', atom2: 'H5', order: 1 },
      { atom1: 'C6', atom2: 'H6', order: 1 },
    ],
  },
  {
    id: 'caffeine',
    name: '咖啡因',
    formula: 'C₈H₁₀N₄O₂',
    description: '咖啡因分子',
    atoms: [
      { id: 'C1', element: 'C', name: '碳', symbol: 'C', atomicNumber: 6, color: 0x404040, radius: 0.76, position: { x: 0, y: 0, z: 0 }, hybridization: 'sp2' },
      { id: 'C2', element: 'C', name: '碳', symbol: 'C', atomicNumber: 6, color: 0x404040, radius: 0.76, position: { x: 1.5, y: 0.5, z: 0.5 }, hybridization: 'sp2' },
      { id: 'C3', element: 'C', name: '碳', symbol: 'C', atomicNumber: 6, color: 0x404040, radius: 0.76, position: { x: 2.5, y: -0.3, z: 1.2 }, hybridization: 'sp3' },
      { id: 'C4', element: 'C', name: '碳', symbol: 'C', atomicNumber: 6, color: 0x404040, radius: 0.76, position: { x: -1.5, y: 0.3, z: 0.8 }, hybridization: 'sp2' },
      { id: 'C5', element: 'C', name: '碳', symbol: 'C', atomicNumber: 6, color: 0x404040, radius: 0.76, position: { x: -2.8, y: -0.2, z: 1.5 }, hybridization: 'sp3' },
      { id: 'C6', element: 'C', name: '碳', symbol: 'C', atomicNumber: 6, color: 0x404040, radius: 0.76, position: { x: 1.0, y: 1.2, z: -1.0 }, hybridization: 'sp2' },
      { id: 'C7', element: 'C', name: '碳', symbol: 'C', atomicNumber: 6, color: 0x404040, radius: 0.76, position: { x: -1.0, y: 1.0, z: -1.2 }, hybridization: 'sp3' },
      { id: 'C8', element: 'C', name: '碳', symbol: 'C', atomicNumber: 6, color: 0x404040, radius: 0.76, position: { x: 0.5, y: -1.0, z: -0.8 }, hybridization: 'sp3' },
      { id: 'N1', element: 'N', name: '氮', symbol: 'N', atomicNumber: 7, color: 0x3050f8, radius: 0.71, position: { x: 0.8, y: -0.8, z: 0.3 }, hybridization: 'sp2' },
      { id: 'N2', element: 'N', name: '氮', symbol: 'N', atomicNumber: 7, color: 0x3050f8, radius: 0.71, position: { x: -0.8, y: -0.6, z: 0.5 }, hybridization: 'sp2' },
      { id: 'N3', element: 'N', name: '氮', symbol: 'N', atomicNumber: 7, color: 0x3050f8, radius: 0.71, position: { x: 0.5, y: 1.0, z: -0.3 }, hybridization: 'sp2' },
      { id: 'N4', element: 'N', name: '氮', symbol: 'N', atomicNumber: 7, color: 0x3050f8, radius: 0.71, position: { x: -0.5, y: 0.8, z: -0.5 }, hybridization: 'sp2' },
      { id: 'O1', element: 'O', name: '氧', symbol: 'O', atomicNumber: 8, color: 0xff0d0d, radius: 0.66, position: { x: 0.3, y: 2.0, z: -1.8 }, hybridization: 'sp2' },
      { id: 'O2', element: 'O', name: '氧', symbol: 'O', atomicNumber: 8, color: 0xff0d0d, radius: 0.66, position: { x: -2.0, y: 1.0, z: -2.0 }, hybridization: 'sp2' },
      { id: 'H1', element: 'H', name: '氢', symbol: 'H', atomicNumber: 1, color: 0xffffff, radius: 0.31, position: { x: 3.2, y: 0.2, z: 0.8 }, hybridization: 'sp3' },
      { id: 'H2', element: 'H', name: '氢', symbol: 'H', atomicNumber: 1, color: 0xffffff, radius: 0.31, position: { x: 2.3, y: -1.0, z: 1.8 }, hybridization: 'sp3' },
      { id: 'H3', element: 'H', name: '氢', symbol: 'H', atomicNumber: 1, color: 0xffffff, radius: 0.31, position: { x: 2.8, y: 0.3, z: 2.0 }, hybridization: 'sp3' },
      { id: 'H4', element: 'H', name: '氢', symbol: 'H', atomicNumber: 1, color: 0xffffff, radius: 0.31, position: { x: -3.5, y: 0.3, z: 1.0 }, hybridization: 'sp3' },
      { id: 'H5', element: 'H', name: '氢', symbol: 'H', atomicNumber: 1, color: 0xffffff, radius: 0.31, position: { x: -3.0, y: -1.0, z: 2.0 }, hybridization: 'sp3' },
      { id: 'H6', element: 'H', name: '氢', symbol: 'H', atomicNumber: 1, color: 0xffffff, radius: 0.31, position: { x: -2.5, y: 0.5, z: 2.2 }, hybridization: 'sp3' },
      { id: 'H7', element: 'H', name: '氢', symbol: 'H', atomicNumber: 1, color: 0xffffff, radius: 0.31, position: { x: -1.2, y: 1.8, z: -1.8 }, hybridization: 'sp3' },
      { id: 'H8', element: 'H', name: '氢', symbol: 'H', atomicNumber: 1, color: 0xffffff, radius: 0.31, position: { x: -0.5, y: 1.5, z: -2.0 }, hybridization: 'sp3' },
      { id: 'H9', element: 'H', name: '氢', symbol: 'H', atomicNumber: 1, color: 0xffffff, radius: 0.31, position: { x: 1.0, y: -1.8, z: -1.2 }, hybridization: 'sp3' },
      { id: 'H10', element: 'H', name: '氢', symbol: 'H', atomicNumber: 1, color: 0xffffff, radius: 0.31, position: { x: 0.0, y: -1.5, z: -1.0 }, hybridization: 'sp3' },
    ],
    bonds: [
      { atom1: 'C1', atom2: 'C2', order: 1 },
      { atom1: 'C2', atom2: 'C3', order: 1 },
      { atom1: 'C1', atom2: 'N1', order: 2 },
      { atom1: 'C1', atom2: 'N2', order: 1 },
      { atom1: 'C1', atom2: 'N3', order: 1 },
      { atom1: 'C4', atom2: 'N2', order: 2 },
      { atom1: 'C4', atom2: 'C5', order: 1 },
      { atom1: 'C4', atom2: 'N4', order: 1 },
      { atom1: 'C6', atom2: 'N3', order: 1 },
      { atom1: 'C6', atom2: 'N4', order: 2 },
      { atom1: 'C6', atom2: 'O1', order: 1 },
      { atom1: 'N1', atom2: 'C8', order: 1 },
      { atom1: 'N2', atom2: 'C7', order: 1 },
      { atom1: 'C3', atom2: 'H1', order: 1 },
      { atom1: 'C3', atom2: 'H2', order: 1 },
      { atom1: 'C3', atom2: 'H3', order: 1 },
      { atom1: 'C5', atom2: 'H4', order: 1 },
      { atom1: 'C5', atom2: 'H5', order: 1 },
      { atom1: 'C5', atom2: 'H6', order: 1 },
      { atom1: 'C7', atom2: 'H7', order: 1 },
      { atom1: 'C7', atom2: 'H8', order: 1 },
      { atom1: 'C8', atom2: 'H9', order: 1 },
      { atom1: 'C8', atom2: 'H10', order: 1 },
      { atom1: 'C6', atom2: 'O2', order: 2 },
    ],
  },
  {
    id: 'vitamin-c',
    name: '维生素C',
    formula: 'C₆H₈O₆',
    description: '维生素C (抗坏血酸)',
    atoms: [
      { id: 'C1', element: 'C', name: '碳', symbol: 'C', atomicNumber: 6, color: 0x404040, radius: 0.76, position: { x: 0, y: 0, z: 0 }, hybridization: 'sp2' },
      { id: 'C2', element: 'C', name: '碳', symbol: 'C', atomicNumber: 6, color: 0x404040, radius: 0.76, position: { x: 1.4, y: 0.5, z: 0.3 }, hybridization: 'sp2' },
      { id: 'C3', element: 'C', name: '碳', symbol: 'C', atomicNumber: 6, color: 0x404040, radius: 0.76, position: { x: 2.5, y: -0.2, z: 0.8 }, hybridization: 'sp3' },
      { id: 'C4', element: 'C', name: '碳', symbol: 'C', atomicNumber: 6, color: 0x404040, radius: 0.76, position: { x: 2.2, y: -1.5, z: 1.5 }, hybridization: 'sp3' },
      { id: 'C5', element: 'C', name: '碳', symbol: 'C', atomicNumber: 6, color: 0x404040, radius: 0.76, position: { x: 0.8, y: -2.0, z: 1.2 }, hybridization: 'sp3' },
      { id: 'C6', element: 'C', name: '碳', symbol: 'C', atomicNumber: 6, color: 0x404040, radius: 0.76, position: { x: -0.5, y: -1.5, z: 0.5 }, hybridization: 'sp3' },
      { id: 'O1', element: 'O', name: '氧', symbol: 'O', atomicNumber: 8, color: 0xff0d0d, radius: 0.66, position: { x: -1.2, y: 0.3, z: -0.3 }, hybridization: 'sp2' },
      { id: 'O2', element: 'O', name: '氧', symbol: 'O', atomicNumber: 8, color: 0xff0d0d, radius: 0.66, position: { x: 1.5, y: 1.5, z: -0.2 }, hybridization: 'sp2' },
      { id: 'O3', element: 'O', name: '氧', symbol: 'O', atomicNumber: 8, color: 0xff0d0d, radius: 0.66, position: { x: 3.5, y: 0.3, z: 1.2 }, hybridization: 'sp3' },
      { id: 'O4', element: 'O', name: '氧', symbol: 'O', atomicNumber: 8, color: 0xff0d0d, radius: 0.66, position: { x: 3.0, y: -2.2, z: 2.2 }, hybridization: 'sp3' },
      { id: 'O5', element: 'O', name: '氧', symbol: 'O', atomicNumber: 8, color: 0xff0d0d, radius: 0.66, position: { x: 0.3, y: -3.0, z: 1.8 }, hybridization: 'sp3' },
      { id: 'O6', element: 'O', name: '氧', symbol: 'O', atomicNumber: 8, color: 0xff0d0d, radius: 0.66, position: { x: -1.5, y: -2.2, z: 0.0 }, hybridization: 'sp3' },
      { id: 'H1', element: 'H', name: '氢', symbol: 'H', atomicNumber: 1, color: 0xffffff, radius: 0.31, position: { x: -1.8, y: -0.2, z: -0.8 }, hybridization: 'sp3' },
      { id: 'H2', element: 'H', name: '氢', symbol: 'H', atomicNumber: 1, color: 0xffffff, radius: 0.31, position: { x: 4.0, y: -0.2, z: 0.8 }, hybridization: 'sp3' },
      { id: 'H3', element: 'H', name: '氢', symbol: 'H', atomicNumber: 1, color: 0xffffff, radius: 0.31, position: { x: 3.5, y: -1.8, z: 2.5 }, hybridization: 'sp3' },
      { id: 'H4', element: 'H', name: '氢', symbol: 'H', atomicNumber: 1, color: 0xffffff, radius: 0.31, position: { x: 0.8, y: -3.5, z: 2.2 }, hybridization: 'sp3' },
      { id: 'H5', element: 'H', name: '氢', symbol: 'H', atomicNumber: 1, color: 0xffffff, radius: 0.31, position: { x: -2.0, y: -1.8, z: -0.3 }, hybridization: 'sp3' },
      { id: 'H6', element: 'H', name: '氢', symbol: 'H', atomicNumber: 1, color: 0xffffff, radius: 0.31, position: { x: 2.2, y: 0.5, z: -0.5 }, hybridization: 'sp3' },
      { id: 'H7', element: 'H', name: '氢', symbol: 'H', atomicNumber: 1, color: 0xffffff, radius: 0.31, position: { x: 2.0, y: -1.2, z: 0.3 }, hybridization: 'sp3' },
      { id: 'H8', element: 'H', name: '氢', symbol: 'H', atomicNumber: 1, color: 0xffffff, radius: 0.31, position: { x: 0.5, y: -1.8, z: -0.2 }, hybridization: 'sp3' },
    ],
    bonds: [
      { atom1: 'C1', atom2: 'C2', order: 2 },
      { atom1: 'C2', atom2: 'C3', order: 1 },
      { atom1: 'C3', atom2: 'C4', order: 1 },
      { atom1: 'C4', atom2: 'C5', order: 1 },
      { atom1: 'C5', atom2: 'C6', order: 1 },
      { atom1: 'C6', atom2: 'C1', order: 1 },
      { atom1: 'C1', atom2: 'O1', order: 1 },
      { atom1: 'C2', atom2: 'O2', order: 1 },
      { atom1: 'C3', atom2: 'O3', order: 1 },
      { atom1: 'C4', atom2: 'O4', order: 1 },
      { atom1: 'C5', atom2: 'O5', order: 1 },
      { atom1: 'C6', atom2: 'O6', order: 1 },
      { atom1: 'O1', atom2: 'H1', order: 1 },
      { atom1: 'O3', atom2: 'H2', order: 1 },
      { atom1: 'O4', atom2: 'H3', order: 1 },
      { atom1: 'O5', atom2: 'H4', order: 1 },
      { atom1: 'O6', atom2: 'H5', order: 1 },
      { atom1: 'O2', atom2: 'H6', order: 1 },
      { atom1: 'C3', atom2: 'H7', order: 1 },
      { atom1: 'C6', atom2: 'H8', order: 1 },
    ],
  },
  {
    id: 'ethanol',
    name: '乙醇',
    formula: 'C₂H₆O',
    description: '乙醇分子',
    atoms: [
      { id: 'C1', element: 'C', name: '碳', symbol: 'C', atomicNumber: 6, color: 0x404040, radius: 0.76, position: { x: -0.75, y: 0, z: 0 }, hybridization: 'sp3' },
      { id: 'C2', element: 'C', name: '碳', symbol: 'C', atomicNumber: 6, color: 0x404040, radius: 0.76, position: { x: 0.75, y: 0, z: 0 }, hybridization: 'sp3' },
      { id: 'O1', element: 'O', name: '氧', symbol: 'O', atomicNumber: 8, color: 0xff0d0d, radius: 0.66, position: { x: 1.8, y: 0.8, z: 0 }, hybridization: 'sp3' },
      { id: 'H1', element: 'H', name: '氢', symbol: 'H', atomicNumber: 1, color: 0xffffff, radius: 0.31, position: { x: -1.2, y: 0.9, z: 0.5 }, hybridization: 'sp3' },
      { id: 'H2', element: 'H', name: '氢', symbol: 'H', atomicNumber: 1, color: 0xffffff, radius: 0.31, position: { x: -1.2, y: -0.9, z: 0.5 }, hybridization: 'sp3' },
      { id: 'H3', element: 'H', name: '氢', symbol: 'H', atomicNumber: 1, color: 0xffffff, radius: 0.31, position: { x: -1.2, y: 0, z: -0.8 }, hybridization: 'sp3' },
      { id: 'H4', element: 'H', name: '氢', symbol: 'H', atomicNumber: 1, color: 0xffffff, radius: 0.31, position: { x: 0.75, y: -0.9, z: 0.5 }, hybridization: 'sp3' },
      { id: 'H5', element: 'H', name: '氢', symbol: 'H', atomicNumber: 1, color: 0xffffff, radius: 0.31, position: { x: 0.75, y: 0.2, z: -0.9 }, hybridization: 'sp3' },
      { id: 'H6', element: 'H', name: '氢', symbol: 'H', atomicNumber: 1, color: 0xffffff, radius: 0.31, position: { x: 2.5, y: 1.1, z: 0 }, hybridization: 'sp3' },
    ],
    bonds: [
      { atom1: 'C1', atom2: 'C2', order: 1 },
      { atom1: 'C2', atom2: 'O1', order: 1 },
      { atom1: 'C1', atom2: 'H1', order: 1 },
      { atom1: 'C1', atom2: 'H2', order: 1 },
      { atom1: 'C1', atom2: 'H3', order: 1 },
      { atom1: 'C2', atom2: 'H4', order: 1 },
      { atom1: 'C2', atom2: 'H5', order: 1 },
      { atom1: 'O1', atom2: 'H6', order: 1 },
    ],
  },
  {
    id: 'carbon-dioxide',
    name: '二氧化碳',
    formula: 'CO₂',
    description: '二氧化碳分子',
    atoms: [
      { id: 'C1', element: 'C', name: '碳', symbol: 'C', atomicNumber: 6, color: 0x404040, radius: 0.76, position: { x: 0, y: 0, z: 0 }, hybridization: 'sp' },
      { id: 'O1', element: 'O', name: '氧', symbol: 'O', atomicNumber: 8, color: 0xff0d0d, radius: 0.66, position: { x: -1.16, y: 0, z: 0 }, hybridization: 'sp' },
      { id: 'O2', element: 'O', name: '氧', symbol: 'O', atomicNumber: 8, color: 0xff0d0d, radius: 0.66, position: { x: 1.16, y: 0, z: 0 }, hybridization: 'sp' },
    ],
    bonds: [
      { atom1: 'C1', atom2: 'O1', order: 2 },
      { atom1: 'C1', atom2: 'O2', order: 2 },
    ],
  },
];

export function getAtomById(molecule: MoleculeData, id: string): AtomData | undefined {
  return molecule.atoms.find((a) => a.id === id);
}

export function getConnectedAtoms(molecule: MoleculeData, atomId: string): AtomData[] {
  const connected: AtomData[] = [];
  for (const bond of molecule.bonds) {
    let otherId: string | null = null;
    if (bond.atom1 === atomId) otherId = bond.atom2;
    if (bond.atom2 === atomId) otherId = bond.atom1;
    if (otherId) {
      const atom = getAtomById(molecule, otherId);
      if (atom) connected.push(atom);
    }
  }
  return connected;
}
