export interface AtomData {
  symbol: string;
  position: [number, number, number];
  radius: number;
  color: string;
}

export interface BondData {
  atomIndex1: number;
  atomIndex2: number;
  order: number;
}

export interface MoleculeData {
  name: string;
  formula: string;
  atoms: AtomData[];
  bonds: BondData[];
}

const ELEMENT_PROPERTIES: Record<string, { radius: number; color: string }> = {
  O: { radius: 0.4, color: '#ff3333' },
  H: { radius: 0.25, color: '#ffffff' },
  C: { radius: 0.3, color: '#666666' },
};

function createAtom(symbol: string, position: [number, number, number]): AtomData {
  const props = ELEMENT_PROPERTIES[symbol] || { radius: 0.3, color: '#888888' };
  return {
    symbol,
    position,
    radius: props.radius,
    color: props.color,
  };
}

function buildWater(): MoleculeData {
  const bondLength = 0.8;
  const angle = (104.5 * Math.PI) / 180;
  const halfAngle = angle / 2;

  const z = bondLength * Math.cos(halfAngle);
  const x = bondLength * Math.sin(halfAngle);

  const atoms: AtomData[] = [
    createAtom('O', [0, 0, 0]),
    createAtom('H', [x, 0, z]),
    createAtom('H', [-x, 0, z]),
  ];

  const bonds: BondData[] = [
    { atomIndex1: 0, atomIndex2: 1, order: 1 },
    { atomIndex1: 0, atomIndex2: 2, order: 1 },
  ];

  return { name: '水', formula: 'H₂O', atoms, bonds };
}

function buildCO2(): MoleculeData {
  const bondLength = 1.16;

  const atoms: AtomData[] = [
    createAtom('C', [0, 0, 0]),
    createAtom('O', [bondLength, 0, 0]),
    createAtom('O', [-bondLength, 0, 0]),
  ];

  const bonds: BondData[] = [
    { atomIndex1: 0, atomIndex2: 1, order: 2 },
    { atomIndex1: 0, atomIndex2: 2, order: 2 },
  ];

  return { name: '二氧化碳', formula: 'CO₂', atoms, bonds };
}

function buildBenzene(): MoleculeData {
  const ccBondLength = 0.6;
  const chBondLength = 0.6;
  const radius = ccBondLength / (2 * Math.sin(Math.PI / 6));

  const atoms: AtomData[] = [];
  const bonds: BondData[] = [];

  for (let i = 0; i < 6; i++) {
    const angle = (i * 2 * Math.PI) / 6;
    const cx = radius * Math.cos(angle);
    const cy = radius * Math.sin(angle);

    atoms.push(createAtom('C', [cx, cy, 0]));

    const hx = (radius + chBondLength) * Math.cos(angle);
    const hy = (radius + chBondLength) * Math.sin(angle);
    atoms.push(createAtom('H', [hx, hy, 0]));
  }

  for (let i = 0; i < 6; i++) {
    const cIndex = i * 2;
    const nextCIndex = ((i + 1) % 6) * 2;
    const hIndex = i * 2 + 1;

    const order = i % 2 === 0 ? 2 : 1;
    bonds.push({ atomIndex1: cIndex, atomIndex2: nextCIndex, order });
    bonds.push({ atomIndex1: cIndex, atomIndex2: hIndex, order: 1 });
  }

  return { name: '苯环', formula: 'C₆H₆', atoms, bonds };
}

const MOLECULE_BUILDERS: Record<string, () => MoleculeData> = {
  H2O: buildWater,
  CO2: buildCO2,
  C6H6: buildBenzene,
};

export function parseMolecule(moleculeId: string): MoleculeData {
  const builder = MOLECULE_BUILDERS[moleculeId];
  if (!builder) {
    throw new Error(`Unknown molecule: ${moleculeId}`);
  }
  return builder();
}

export function getAvailableMolecules(): string[] {
  return Object.keys(MOLECULE_BUILDERS);
}
