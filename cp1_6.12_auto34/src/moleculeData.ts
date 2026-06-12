export interface AtomData {
  element: string;
  x: number;
  y: number;
  z: number;
  hybridization: string;
  atomicNumber: number;
}

export interface BondData {
  atom1: number;
  atom2: number;
  order: number;
}

export interface OrbitalData {
  atomIndex: number;
  type: 's' | 'p' | 'sp' | 'sp2' | 'sp3';
  orientation?: { x: number; y: number; z: number };
}

export interface MoleculeData {
  id: string;
  name: string;
  formula: string;
  molecularWeight: number;
  bondAngles: { label: string; value: number }[];
  atoms: AtomData[];
  bonds: BondData[];
  orbitals: OrbitalData[];
}

export const elementColors: Record<string, number> = {
  H: 0xffffff,
  C: 0x404040,
  O: 0xff3333,
  N: 0x3333ff,
  S: 0xffff33,
  P: 0xff8800
};

export const elementRadii: Record<string, number> = {
  H: 0.3,
  C: 0.5,
  O: 0.45,
  N: 0.48,
  S: 0.6,
  P: 0.55
};

const h2o: MoleculeData = {
  id: 'h2o',
  name: '水',
  formula: 'H₂O',
  molecularWeight: 18.015,
  bondAngles: [{ label: 'H-O-H', value: 104.5 }],
  atoms: [
    { element: 'O', x: 0, y: 0, z: 0, hybridization: 'sp3', atomicNumber: 8 },
    { element: 'H', x: 0.76, y: 0.59, z: 0, hybridization: '1s', atomicNumber: 1 },
    { element: 'H', x: -0.76, y: 0.59, z: 0, hybridization: '1s', atomicNumber: 1 }
  ],
  bonds: [
    { atom1: 0, atom2: 1, order: 1 },
    { atom1: 0, atom2: 2, order: 1 }
  ],
  orbitals: [
    { atomIndex: 0, type: 'sp3', orientation: { x: 0, y: 1, z: 0 } },
    { atomIndex: 0, type: 'sp3', orientation: { x: 0, y: -1, z: 0 } }
  ]
};

const ch4: MoleculeData = {
  id: 'ch4',
  name: '甲烷',
  formula: 'CH₄',
  molecularWeight: 16.04,
  bondAngles: [{ label: 'H-C-H', value: 109.5 }],
  atoms: [
    { element: 'C', x: 0, y: 0, z: 0, hybridization: 'sp3', atomicNumber: 6 },
    { element: 'H', x: 0.63, y: 0.63, z: 0.63, hybridization: '1s', atomicNumber: 1 },
    { element: 'H', x: -0.63, y: -0.63, z: 0.63, hybridization: '1s', atomicNumber: 1 },
    { element: 'H', x: -0.63, y: 0.63, z: -0.63, hybridization: '1s', atomicNumber: 1 },
    { element: 'H', x: 0.63, y: -0.63, z: -0.63, hybridization: '1s', atomicNumber: 1 }
  ],
  bonds: [
    { atom1: 0, atom2: 1, order: 1 },
    { atom1: 0, atom2: 2, order: 1 },
    { atom1: 0, atom2: 3, order: 1 },
    { atom1: 0, atom2: 4, order: 1 }
  ],
  orbitals: [
    { atomIndex: 0, type: 'sp3', orientation: { x: 1, y: 1, z: 1 } }
  ]
};

const co2: MoleculeData = {
  id: 'co2',
  name: '二氧化碳',
  formula: 'CO₂',
  molecularWeight: 44.01,
  bondAngles: [{ label: 'O-C-O', value: 180.0 }],
  atoms: [
    { element: 'C', x: 0, y: 0, z: 0, hybridization: 'sp', atomicNumber: 6 },
    { element: 'O', x: 1.16, y: 0, z: 0, hybridization: 'sp2', atomicNumber: 8 },
    { element: 'O', x: -1.16, y: 0, z: 0, hybridization: 'sp2', atomicNumber: 8 }
  ],
  bonds: [
    { atom1: 0, atom2: 1, order: 2 },
    { atom1: 0, atom2: 2, order: 2 }
  ],
  orbitals: [
    { atomIndex: 0, type: 'sp', orientation: { x: 1, y: 0, z: 0 } },
    { atomIndex: 1, type: 'sp2', orientation: { x: -1, y: 0, z: 0 } },
    { atomIndex: 2, type: 'sp2', orientation: { x: 1, y: 0, z: 0 } }
  ]
};

const c6h6: MoleculeData = {
  id: 'c6h6',
  name: '苯',
  formula: 'C₆H₆',
  molecularWeight: 78.11,
  bondAngles: [
    { label: 'C-C-C', value: 120.0 },
    { label: 'H-C-C', value: 120.0 }
  ],
  atoms: [
    { element: 'C', x: 1.4, y: 0, z: 0, hybridization: 'sp2', atomicNumber: 6 },
    { element: 'C', x: 0.7, y: 1.21, z: 0, hybridization: 'sp2', atomicNumber: 6 },
    { element: 'C', x: -0.7, y: 1.21, z: 0, hybridization: 'sp2', atomicNumber: 6 },
    { element: 'C', x: -1.4, y: 0, z: 0, hybridization: 'sp2', atomicNumber: 6 },
    { element: 'C', x: -0.7, y: -1.21, z: 0, hybridization: 'sp2', atomicNumber: 6 },
    { element: 'C', x: 0.7, y: -1.21, z: 0, hybridization: 'sp2', atomicNumber: 6 },
    { element: 'H', x: 2.48, y: 0, z: 0, hybridization: '1s', atomicNumber: 1 },
    { element: 'H', x: 1.24, y: 2.15, z: 0, hybridization: '1s', atomicNumber: 1 },
    { element: 'H', x: -1.24, y: 2.15, z: 0, hybridization: '1s', atomicNumber: 1 },
    { element: 'H', x: -2.48, y: 0, z: 0, hybridization: '1s', atomicNumber: 1 },
    { element: 'H', x: -1.24, y: -2.15, z: 0, hybridization: '1s', atomicNumber: 1 },
    { element: 'H', x: 1.24, y: -2.15, z: 0, hybridization: '1s', atomicNumber: 1 }
  ],
  bonds: [
    { atom1: 0, atom2: 1, order: 1.5 },
    { atom1: 1, atom2: 2, order: 1.5 },
    { atom1: 2, atom2: 3, order: 1.5 },
    { atom1: 3, atom2: 4, order: 1.5 },
    { atom1: 4, atom2: 5, order: 1.5 },
    { atom1: 5, atom2: 0, order: 1.5 },
    { atom1: 0, atom2: 6, order: 1 },
    { atom1: 1, atom2: 7, order: 1 },
    { atom1: 2, atom2: 8, order: 1 },
    { atom1: 3, atom2: 9, order: 1 },
    { atom1: 4, atom2: 10, order: 1 },
    { atom1: 5, atom2: 11, order: 1 }
  ],
  orbitals: [
    { atomIndex: 0, type: 'sp2', orientation: { x: 0, y: 0, z: 1 } },
    { atomIndex: 1, type: 'sp2', orientation: { x: 0, y: 0, z: 1 } },
    { atomIndex: 2, type: 'sp2', orientation: { x: 0, y: 0, z: 1 } },
    { atomIndex: 3, type: 'sp2', orientation: { x: 0, y: 0, z: 1 } },
    { atomIndex: 4, type: 'sp2', orientation: { x: 0, y: 0, z: 1 } },
    { atomIndex: 5, type: 'sp2', orientation: { x: 0, y: 0, z: 1 } }
  ]
};

const c6h12o6: MoleculeData = {
  id: 'c6h12o6',
  name: '葡萄糖',
  formula: 'C₆H₁₂O₆',
  molecularWeight: 180.16,
  bondAngles: [
    { label: 'C-C-C (环)', value: 109.5 },
    { label: 'O-C-O', value: 107.0 }
  ],
  atoms: [
    { element: 'O', x: 0, y: 0, z: 0, hybridization: 'sp3', atomicNumber: 8 },
    { element: 'C', x: 1.1, y: 0.5, z: 0.2, hybridization: 'sp3', atomicNumber: 6 },
    { element: 'C', x: 2.0, y: -0.3, z: 0.8, hybridization: 'sp3', atomicNumber: 6 },
    { element: 'C', x: 3.1, y: 0.2, z: 0.3, hybridization: 'sp3', atomicNumber: 6 },
    { element: 'C', x: 3.9, y: -0.6, z: 0.9, hybridization: 'sp3', atomicNumber: 6 },
    { element: 'C', x: 4.2, y: 0.2, z: 1.8, hybridization: 'sp3', atomicNumber: 6 },
    { element: 'C', x: 3.3, y: 1.2, z: 2.0, hybridization: 'sp3', atomicNumber: 6 },
    { element: 'O', x: 0.8, y: 1.5, z: 0.6, hybridization: 'sp3', atomicNumber: 8 },
    { element: 'O', x: 1.8, y: -1.2, z: 1.4, hybridization: 'sp3', atomicNumber: 8 },
    { element: 'O', x: 3.4, y: 1.0, z: -0.4, hybridization: 'sp3', atomicNumber: 8 },
    { element: 'O', x: 4.9, y: -1.1, z: 0.4, hybridization: 'sp3', atomicNumber: 8 },
    { element: 'O', x: 4.6, y: 1.1, z: 2.6, hybridization: 'sp3', atomicNumber: 8 },
    { element: 'O', x: 2.9, y: 2.2, z: 2.6, hybridization: 'sp3', atomicNumber: 8 },
    { element: 'H', x: -0.2, y: 0.8, z: 0.3, hybridization: '1s', atomicNumber: 1 },
    { element: 'H', x: 1.2, y: 0.8, z: -0.8, hybridization: '1s', atomicNumber: 1 },
    { element: 'H', x: 2.1, y: 0.1, z: 1.8, hybridization: '1s', atomicNumber: 1 },
    { element: 'H', x: 2.9, y: 0.5, z: -0.6, hybridization: '1s', atomicNumber: 1 },
    { element: 'H', x: 4.2, y: -1.0, z: 1.5, hybridization: '1s', atomicNumber: 1 },
    { element: 'H', x: 5.0, y: 0.6, z: 1.8, hybridization: '1s', atomicNumber: 1 },
    { element: 'H', x: 3.6, y: 1.5, z: 1.0, hybridization: '1s', atomicNumber: 1 },
    { element: 'H', x: 0.5, y: 1.9, z: 1.3, hybridization: '1s', atomicNumber: 1 },
    { element: 'H', x: 2.5, y: -1.0, z: 1.6, hybridization: '1s', atomicNumber: 1 },
    { element: 'H', x: 3.9, y: 1.4, z: -0.7, hybridization: '1s', atomicNumber: 1 },
    { element: 'H', x: 5.3, y: -1.5, z: 0.8, hybridization: '1s', atomicNumber: 1 },
    { element: 'H', x: 4.0, y: 1.5, z: 2.7, hybridization: '1s', atomicNumber: 1 },
    { element: 'H', x: 2.3, y: 2.8, z: 2.4, hybridization: '1s', atomicNumber: 1 }
  ],
  bonds: [
    { atom1: 0, atom2: 1, order: 1 },
    { atom1: 1, atom2: 2, order: 1 },
    { atom1: 2, atom2: 3, order: 1 },
    { atom1: 3, atom2: 4, order: 1 },
    { atom1: 4, atom2: 5, order: 1 },
    { atom1: 5, atom2: 6, order: 1 },
    { atom1: 6, atom2: 0, order: 1 },
    { atom1: 1, atom2: 7, order: 1 },
    { atom1: 2, atom2: 8, order: 1 },
    { atom1: 3, atom2: 9, order: 1 },
    { atom1: 4, atom2: 10, order: 1 },
    { atom1: 5, atom2: 11, order: 1 },
    { atom1: 6, atom2: 12, order: 1 },
    { atom1: 0, atom2: 13, order: 1 },
    { atom1: 1, atom2: 14, order: 1 },
    { atom1: 2, atom2: 15, order: 1 },
    { atom1: 3, atom2: 16, order: 1 },
    { atom1: 4, atom2: 17, order: 1 },
    { atom1: 5, atom2: 18, order: 1 },
    { atom1: 6, atom2: 19, order: 1 },
    { atom1: 7, atom2: 20, order: 1 },
    { atom1: 8, atom2: 21, order: 1 },
    { atom1: 9, atom2: 22, order: 1 },
    { atom1: 10, atom2: 23, order: 1 },
    { atom1: 11, atom2: 24, order: 1 },
    { atom1: 12, atom2: 25, order: 1 }
  ],
  orbitals: [
    { atomIndex: 0, type: 'sp3', orientation: { x: 0, y: 1, z: 0 } },
    { atomIndex: 1, type: 'sp3' },
    { atomIndex: 2, type: 'sp3' },
    { atomIndex: 3, type: 'sp3' },
    { atomIndex: 4, type: 'sp3' },
    { atomIndex: 5, type: 'sp3' },
    { atomIndex: 6, type: 'sp3' }
  ]
};

export const molecules: MoleculeData[] = [h2o, ch4, co2, c6h6, c6h12o6];

export function getMoleculeById(id: string): MoleculeData | undefined {
  return molecules.find(m => m.id === id);
}
