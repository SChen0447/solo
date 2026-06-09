export type AtomType = 'corner' | 'face' | 'body' | 'random';

export type StructureType = 'FCC' | 'BCC' | 'POLY';

export interface AtomPosition {
  x: number;
  y: number;
  z: number;
}

export interface Atom {
  position: AtomPosition;
  radius: number;
  color: string;
  type: AtomType;
}

export interface LatticeParams {
  size: number;
  opacity: number;
  lineWidth: number;
  color: string;
}

export interface ControlPanelState {
  atomRadiusScale: number;
  latticeOpacity: number;
  rotationSpeed: number;
  showCrystalPlane: boolean;
  currentStructure: StructureType;
}

export interface PolyCrystalConfig {
  gridSize: number;
  minAtomsPerGrain: number;
  maxAtomsPerGrain: number;
}

export const POLY_PALETTE: string[] = [
  '#E74C3C', '#3498DB', '#2ECC71', '#F39C12',
  '#9B59B6', '#1ABC9C', '#E67E22', '#34495E',
  '#FF6B9D', '#00D2FF', '#FFD93D', '#6BCB77'
];

export const COLORS = {
  FCC_CORNER: '#E74C3C',
  FCC_FACE: '#3498DB',
  BCC_CORNER: '#E74C3C',
  BCC_BODY: '#2ECC71',
  LATTICE: 'rgba(192, 192, 192, 1)',
  CRYSTAL_PLANE: 'rgba(180, 150, 255, 0.3)'
};
