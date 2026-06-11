export interface Pigment {
  id: string;
  name: string;
  hex: string;
}

export interface RestorationParams {
  humidity: number;
  uvIntensity: number;
  brushSize: number;
  brushPressure: number;
}

export interface BrushStroke {
  pigment: Pigment;
  x: number;
  y: number;
  size: number;
  pressure: number;
  timestamp: number;
}

export interface MuralLayer {
  id: string;
  name: string;
  opacity: number;
}

export interface RestorationState {
  selectedPigment: Pigment | null;
  params: RestorationParams;
  progress: number;
  isComplete: boolean;
  isPainting: boolean;
  brushStrokes: BrushStroke[];
  peelingMap: Uint8Array;
  restoredMap: Float32Array;
  sharpenMap: Float32Array;
}

export const PIGMENTS: Pigment[] = [
  { id: 'azurite', name: '石青', hex: '#1565c0' },
  { id: 'cinnabar', name: '朱砂', hex: '#c62828' },
  { id: 'malachite', name: '石绿', hex: '#2e7d32' },
  { id: 'ochre-yellow', name: '土黄', hex: '#f9a825' },
  { id: 'sienna', name: '赭石', hex: '#6d4c41' },
  { id: 'lead-white', name: '铅白', hex: '#eceff1' },
  { id: 'gamboge', name: '藤黄', hex: '#ffcc02' },
  { id: 'ink-black', name: '墨黑', hex: '#212121' },
];

export const DEFAULT_PARAMS: RestorationParams = {
  humidity: 50,
  uvIntensity: 30,
  brushSize: 30,
  brushPressure: 0.6,
};
