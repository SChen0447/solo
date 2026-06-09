import * as THREE from 'three';

export interface AtomData {
  symbol: string;
  position: THREE.Vector3;
  radius: number;
  color: number;
  bonds: number;
}

export interface BondData {
  start: THREE.Vector3;
  end: THREE.Vector3;
}

export interface MoleculeData {
  name: string;
  formula: string;
  displayFormula: string;
  atoms: AtomData[];
  bonds: BondData[];
}

const ELEMENT_INFO: Record<string, { name: string; atomicNumber: number }> = {
  H: { name: '氢', atomicNumber: 1 },
  O: { name: '氧', atomicNumber: 8 },
  C: { name: '碳', atomicNumber: 6 }
};

export function getElementInfo(symbol: string) {
  return ELEMENT_INFO[symbol] || { name: symbol, atomicNumber: 0 };
}

function createWater(): MoleculeData {
  const bondLength = 0.96;
  const angleRad = (104.5 * Math.PI) / 180;

  const oPos = new THREE.Vector3(0, 0, 0);
  const h1Pos = new THREE.Vector3(
    bondLength * Math.sin(angleRad / 2),
    bondLength * Math.cos(angleRad / 2),
    0
  );
  const h2Pos = new THREE.Vector3(
    -bondLength * Math.sin(angleRad / 2),
    bondLength * Math.cos(angleRad / 2),
    0
  );

  return {
    name: '水',
    formula: 'H2O',
    displayFormula: 'H₂O',
    atoms: [
      { symbol: 'O', position: oPos, radius: 0.35, color: 0xff3333, bonds: 2 },
      { symbol: 'H', position: h1Pos, radius: 0.22, color: 0xffffff, bonds: 1 },
      { symbol: 'H', position: h2Pos, radius: 0.22, color: 0xffffff, bonds: 1 }
    ],
    bonds: [
      { start: oPos, end: h1Pos },
      { start: oPos, end: h2Pos }
    ]
  };
}

function createCO2(): MoleculeData {
  const bondLength = 1.16;

  const cPos = new THREE.Vector3(0, 0, 0);
  const o1Pos = new THREE.Vector3(bondLength, 0, 0);
  const o2Pos = new THREE.Vector3(-bondLength, 0, 0);

  return {
    name: '二氧化碳',
    formula: 'CO2',
    displayFormula: 'CO₂',
    atoms: [
      { symbol: 'C', position: cPos, radius: 0.32, color: 0x808080, bonds: 4 },
      { symbol: 'O', position: o1Pos, radius: 0.35, color: 0xff3333, bonds: 2 },
      { symbol: 'O', position: o2Pos, radius: 0.35, color: 0xff3333, bonds: 2 }
    ],
    bonds: [
      { start: cPos, end: o1Pos },
      { start: cPos, end: o2Pos }
    ]
  };
}

function createMethane(): MoleculeData {
  const bondLength = 1.09;
  const tetraAngle = Math.acos(-1 / 3);

  const cPos = new THREE.Vector3(0, 0, 0);
  const h1Pos = new THREE.Vector3(0, bondLength, 0);
  const h2Pos = new THREE.Vector3(
    bondLength * Math.sin(tetraAngle),
    bondLength * Math.cos(tetraAngle),
    0
  );
  const h3Pos = new THREE.Vector3(
    bondLength * Math.sin(tetraAngle) * Math.cos((2 * Math.PI) / 3),
    bondLength * Math.cos(tetraAngle),
    bondLength * Math.sin(tetraAngle) * Math.sin((2 * Math.PI) / 3)
  );
  const h4Pos = new THREE.Vector3(
    bondLength * Math.sin(tetraAngle) * Math.cos((4 * Math.PI) / 3),
    bondLength * Math.cos(tetraAngle),
    bondLength * Math.sin(tetraAngle) * Math.sin((4 * Math.PI) / 3)
  );

  return {
    name: '甲烷',
    formula: 'CH4',
    displayFormula: 'CH₄',
    atoms: [
      { symbol: 'C', position: cPos, radius: 0.32, color: 0x404040, bonds: 4 },
      { symbol: 'H', position: h1Pos, radius: 0.22, color: 0xffffff, bonds: 1 },
      { symbol: 'H', position: h2Pos, radius: 0.22, color: 0xffffff, bonds: 1 },
      { symbol: 'H', position: h3Pos, radius: 0.22, color: 0xffffff, bonds: 1 },
      { symbol: 'H', position: h4Pos, radius: 0.22, color: 0xffffff, bonds: 1 }
    ],
    bonds: [
      { start: cPos, end: h1Pos },
      { start: cPos, end: h2Pos },
      { start: cPos, end: h3Pos },
      { start: cPos, end: h4Pos }
    ]
  };
}

const MOLECULE_FACTORIES: Record<string, () => MoleculeData> = {
  water: createWater,
  co2: createCO2,
  methane: createMethane
};

export function getMoleculeData(key: string): MoleculeData | null {
  const factory = MOLECULE_FACTORIES[key];
  return factory ? factory() : null;
}

export const MOLECULE_KEYS = ['water', 'co2', 'methane'];
