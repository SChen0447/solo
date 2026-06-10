export interface VintageColor {
  name: string;
  value: string;
}

export const vintagePalette: VintageColor[] = [
  { name: '泛黄', value: '#f4e4b0' },
  { name: '墨绿', value: '#3d5a3a' },
  { name: '砖红', value: '#b23a2a' },
  { name: '米黄', value: '#faf0e0' },
  { name: '深棕', value: '#4a3525' },
  { name: '暖白', value: '#fdf6e3' },
  { name: '藏青', value: '#1e3a5f' },
  { name: '赭石', value: '#a0522d' },
  { name: '淡紫', value: '#9b7b8f' },
  { name: '靛蓝', value: '#2e4a62' },
  { name: '橄榄', value: '#6b7b3a' },
  { name: '朱砂', value: '#c73e3a' },
  { name: '炭灰', value: '#3a3a3a' },
  { name: '米色', value: '#e8dcc4' },
  { name: '金棕', value: '#8b6914' },
  { name: '玫瑰', value: '#b76e79' },
  { name: '松绿', value: '#556b2f' },
  { name: '赭黄', value: '#cc7722' },
  { name: '紫灰', value: '#5c4d5c' },
  { name: '咖啡', value: '#6f4e37' },
];

export const fontFamilies = [
  { name: '打字机 Courier', value: "'Courier Prime', monospace" },
  { name: '手写 Caveat', value: "'Caveat', cursive" },
  { name: '哥特 Unifraktur', value: "'UnifrakturMaguntia', cursive" },
  { name: '衬线 Playfair', value: "'Playfair Display', serif" },
  { name: '无衬体 Montserrat', value: "'Montserrat', sans-serif" },
];

export interface PostcardState {
  frontElements: CanvasElement[];
  backElements: CanvasElement[];
  selectedSide: 'front' | 'back';
}

export interface CanvasElement {
  id: string;
  type: 'text' | 'stamp' | 'decoration';
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  opacity: number;
  zIndex: number;
  content?: string;
  fontFamily?: string;
  fontSize?: number;
  color?: string;
  textAlign?: 'left' | 'center' | 'right';
  src?: string;
  label?: string;
}

export function encodeState(state: PostcardState): string {
  try {
    const json = JSON.stringify(state);
    const compressed = encodeURIComponent(json);
    const base64 = btoa(compressed);
    return base64;
  } catch (e) {
    console.error('Failed to encode state:', e);
    return '';
  }
}

export function decodeState(hash: string): PostcardState | null {
  try {
    if (!hash || hash.startsWith('#') === false && hash.length < 10) {
      return null;
    }
    const cleanHash = hash.startsWith('#') ? hash.slice(1) : hash;
    const decoded = atob(cleanHash);
    const decompressed = decodeURIComponent(decoded);
    const state = JSON.parse(decompressed) as PostcardState;
    if (!state.frontElements || !state.backElements) {
      return null;
    }
    return state;
  } catch (e) {
    console.error('Failed to decode state:', e);
    return null;
  }
}
