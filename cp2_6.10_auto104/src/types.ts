export interface Atom {
  element: 'C' | 'H' | 'O';
  position: { x: number; y: number; z: number };
}

export type BondType = 'single' | 'double' | 'triple';

export interface Bond {
  from: number;
  to: number;
  type: BondType;
  length: number;
}

export interface Molecule {
  id: string;
  name: string;
  formula: string;
  atoms: Atom[];
  bonds: Bond[];
}

export interface BondEnergyPoint {
  bondOrder: number;
  energy: number;
}

export interface BondEnergyCurve {
  label: string;
  color: string;
  bondType: BondType;
  data: BondEnergyPoint[];
}

export interface SelectedBondInfo {
  molecule: Molecule;
  bondIndex: number;
  bond: Bond;
  energy: number;
}
