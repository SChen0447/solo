export type AtomType = 'C' | 'H' | 'O' | 'N' | 'S' | 'P';

export interface Atom {
  id: number;
  type: AtomType;
  x: number;
  y: number;
  z: number;
  bondCount: number;
}

export interface Bond {
  atom1: number;
  atom2: number;
  order: number;
}

export interface MoleculeData {
  name: string;
  formula: string;
  atoms: Atom[];
  bonds: Bond[];
}

export const ATOM_PROPERTIES: Record<AtomType, {
  color: number;
  radius: number;
  valenceElectrons: number;
  name: string;
}> = {
  C: { color: 0x606060, radius: 0.5, valenceElectrons: 4, name: '碳' },
  H: { color: 0xffffff, radius: 0.3, valenceElectrons: 1, name: '氢' },
  O: { color: 0xff4040, radius: 0.4, valenceElectrons: 6, name: '氧' },
  N: { color: 0x4060ff, radius: 0.45, valenceElectrons: 5, name: '氮' },
  S: { color: 0xffff40, radius: 0.5, valenceElectrons: 6, name: '硫' },
  P: { color: 0xff8000, radius: 0.55, valenceElectrons: 5, name: '磷' }
};

export const CAFFEINE_MOLECULE: MoleculeData = {
  name: '咖啡因',
  formula: 'C₈H₁₀N₄O₂',
  atoms: [
    { id: 1, type: 'N', x: -0.25, y: 1.55, z: 0, bondCount: 3 },
    { id: 2, type: 'C', x: -1.45, y: 1.05, z: 0, bondCount: 3 },
    { id: 3, type: 'N', x: -1.5, y: -0.3, z: 0, bondCount: 3 },
    { id: 4, type: 'C', x: -0.25, y: -0.75, z: 0, bondCount: 4 },
    { id: 5, type: 'C', x: 0.85, y: 0.1, z: 0, bondCount: 3 },
    { id: 6, type: 'C', x: 0.7, y: 1.45, z: 0, bondCount: 4 },
    { id: 7, type: 'N', x: 2.1, y: -0.25, z: 0, bondCount: 3 },
    { id: 8, type: 'C', x: -0.25, y: -2.2, z: 0, bondCount: 4 },
    { id: 9, type: 'C', x: 1.15, y: 2.75, z: 0, bondCount: 4 },
    { id: 10, type: 'C', x: 3.3, y: 0.55, z: 0, bondCount: 4 },
    { id: 11, type: 'C', x: -2.6, y: -1.05, z: 0, bondCount: 4 },
    { id: 12, type: 'O', x: -2.55, y: 1.85, z: 0, bondCount: 2 },
    { id: 13, type: 'O', x: 2.25, y: -1.6, z: 0, bondCount: 2 },
    { id: 14, type: 'H', x: -0.25, y: -2.78, z: 0.87, bondCount: 1 },
    { id: 15, type: 'H', x: -0.25, y: -2.78, z: -0.87, bondCount: 1 },
    { id: 16, type: 'H', x: 0.67, y: -2.5, z: 0, bondCount: 1 },
    { id: 17, type: 'H', x: 1.15, y: 3.33, z: 0.87, bondCount: 1 },
    { id: 18, type: 'H', x: 1.15, y: 3.33, z: -0.87, bondCount: 1 },
    { id: 19, type: 'H', x: 2.07, y: 3.0, z: 0, bondCount: 1 },
    { id: 20, type: 'H', x: 3.3, y: 1.13, z: 0.87, bondCount: 1 },
    { id: 21, type: 'H', x: 3.3, y: 1.13, z: -0.87, bondCount: 1 },
    { id: 22, type: 'H', x: 4.17, y: 0.3, z: 0, bondCount: 1 },
    { id: 23, type: 'H', x: -2.6, y: -1.63, z: 0.87, bondCount: 1 },
    { id: 24, type: 'H', x: -2.6, y: -1.63, z: -0.87, bondCount: 1 },
    { id: 25, type: 'H', x: -3.47, y: -0.8, z: 0, bondCount: 1 }
  ],
  bonds: [
    { atom1: 1, atom2: 2, order: 1 },
    { atom1: 2, atom2: 3, order: 2 },
    { atom1: 3, atom2: 4, order: 1 },
    { atom1: 4, atom2: 5, order: 1 },
    { atom1: 5, atom2: 6, order: 1 },
    { atom1: 6, atom2: 1, order: 1 },
    { atom1: 5, atom2: 7, order: 2 },
    { atom1: 4, atom2: 8, order: 1 },
    { atom1: 6, atom2: 9, order: 1 },
    { atom1: 7, atom2: 10, order: 1 },
    { atom1: 3, atom2: 11, order: 1 },
    { atom1: 2, atom2: 12, order: 2 },
    { atom1: 7, atom2: 13, order: 1 },
    { atom1: 1, atom2: 9, order: 1 },
    { atom1: 8, atom2: 14, order: 1 },
    { atom1: 8, atom2: 15, order: 1 },
    { atom1: 8, atom2: 16, order: 1 },
    { atom1: 9, atom2: 17, order: 1 },
    { atom1: 9, atom2: 18, order: 1 },
    { atom1: 9, atom2: 19, order: 1 },
    { atom1: 10, atom2: 20, order: 1 },
    { atom1: 10, atom2: 21, order: 1 },
    { atom1: 10, atom2: 22, order: 1 },
    { atom1: 11, atom2: 23, order: 1 },
    { atom1: 11, atom2: 24, order: 1 },
    { atom1: 11, atom2: 25, order: 1 }
  ]
};
