export interface Atom {
  id: string;
  element: string;
  position: {
    x: number;
    y: number;
    z: number;
  };
}

export interface Bond {
  from: string;
  to: string;
  order: number;
}

export interface MoleculeData {
  name: string;
  formula: string;
  atoms: Atom[];
  bonds: Bond[];
}

export const ATOM_COLORS: Record<string, number> = {
  C: 0x909090,
  H: 0xffffff,
  O: 0xff4444,
  N: 0x4488ff,
  S: 0xffff44,
  P: 0xff8844,
  Cl: 0x44ff44,
  F: 0x88ff88
};

export const ATOM_RADII: Record<string, number> = {
  C: 0.4,
  H: 0.25,
  O: 0.35,
  N: 0.38,
  S: 0.5,
  P: 0.48,
  Cl: 0.45,
  F: 0.32
};

export const BOND_RADIUS = 0.12;
export const BOND_COLOR = 0x888888;
