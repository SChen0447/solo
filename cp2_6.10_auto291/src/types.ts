export type Tool = 'pencil1' | 'pencil3' | 'eraser' | 'picker' | 'fill';

export type LoopMode = 'once' | 'pingpong' | 'loop';

export interface Frame {
  id: string;
  data: Uint8ClampedArray;
  duration: number;
}

export interface Palette {
  colors: string[];
}

export interface ProjectData {
  version: string;
  canvasSize: number;
  palette: string[];
  frames: {
    id: string;
    data: number[];
    duration: number;
  }[];
  currentFrameIndex: number;
  loopMode: LoopMode;
}

export const PICO8_PALETTE: string[] = [
  '#000000',
  '#1D2B53',
  '#7E2553',
  '#008751',
  '#AB5236',
  '#5F574F',
  '#C2C3C7',
  '#FFF1E8',
  '#FF004D',
  '#FFA300',
  '#FFEC27',
  '#00E436',
  '#29ADFF',
  '#83769C',
  '#FF77A8',
  '#FFCCAA'
];

export function generateId(): string {
  return Math.random().toString(36).substring(2, 11);
}

export function hexToRgba(hex: string, alpha: number = 255): [number, number, number, number] {
  const h = hex.replace('#', '');
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  return [r, g, b, alpha];
}

export function rgbaToHex(r: number, g: number, b: number): string {
  const toHex = (n: number) => n.toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase();
}
