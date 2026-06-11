export type FragmentType = 'paper' | 'ink' | 'strip' | 'clipping' | 'foil';
export type BlendMode = 'normal' | 'multiply' | 'screen' | 'overlay' | 'darken' | 'lighten';

export interface Fragment {
  id: string;
  type: FragmentType;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  zIndex: number;
  color: string;
  blendMode: BlendMode;
  locked: boolean;
  opacity: number;
  clipPath?: string;
  removing?: boolean;
}

const INK_COLORS = ['#d65a5a', '#4a90d9', '#7ab87a', '#f0c040', '#9b59b6'];
const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;

export function generateId(): string {
  return `frag_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export function randomInRange(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function getMaxZIndex(fragments: Fragment[]): number {
  return fragments.reduce((max, f) => Math.max(max, f.zIndex), 0);
}

export function findFragmentById(fragments: Fragment[], id: string): Fragment | null {
  return fragments.find(f => f.id === id) || null;
}

export function clampPosition(
  x: number,
  y: number,
  canvasW: number,
  canvasH: number,
  fragW: number,
  fragH: number
): { x: number; y: number } {
  const clampedX = Math.max(0, Math.min(x, canvasW - fragW));
  const clampedY = Math.max(0, Math.min(y, canvasH - fragH));
  return { x: clampedX, y: clampedY };
}

export function getFragmentDefaultColor(type: FragmentType): string {
  switch (type) {
    case 'paper': return '#c4a882';
    case 'ink': return INK_COLORS[randomInRange(0, INK_COLORS.length - 1)];
    case 'strip': return '#e8dcc8';
    case 'clipping': return '#faf0dc';
    case 'foil': return '#cfb53b';
  }
}

export function getClipPathForType(type: FragmentType): string | undefined {
  switch (type) {
    case 'strip':
      return 'polygon(0% 3%, 5% 0%, 10% 4%, 15% 1%, 20% 5%, 25% 0%, 30% 3%, 35% 1%, 40% 4%, 45% 0%, 50% 5%, 55% 1%, 60% 4%, 65% 0%, 70% 3%, 75% 1%, 80% 5%, 85% 0%, 90% 4%, 95% 1%, 100% 3%, 100% 97%, 95% 100%, 90% 96%, 85% 99%, 80% 95%, 75% 100%, 70% 97%, 65% 99%, 60% 96%, 55% 100%, 50% 95%, 45% 99%, 40% 96%, 35% 100%, 30% 97%, 25% 99%, 20% 95%, 15% 100%, 10% 96%, 5% 99%, 0% 97%)';
    case 'clipping':
      return 'polygon(2% 5%, 8% 2%, 18% 0%, 30% 3%, 45% 1%, 60% 4%, 75% 0%, 88% 3%, 98% 6%, 100% 20%, 97% 40%, 100% 60%, 96% 80%, 100% 95%, 85% 98%, 70% 100%, 55% 97%, 40% 100%, 25% 98%, 10% 100%, 0% 90%, 3% 70%, 0% 50%, 2% 30%, 0% 15%)';
    case 'foil':
      return 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)';
    default:
      return undefined;
  }
}

export interface CreateFragmentOptions {
  type: FragmentType;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  rotation?: number;
  color?: string;
}

export function createFragment(options: CreateFragmentOptions): Fragment {
  const { type } = options;
  const width = options.width ?? randomInRange(50, 90);
  const height = options.height ?? (type === 'ink' ? width : type === 'strip' ? Math.floor(width * 1.8) : width);
  const rotation = options.rotation ?? (type === 'clipping' ? randomInRange(-8, 8) : 0);
  const x = options.x ?? randomInRange(0, CANVAS_WIDTH - width);
  const y = options.y ?? randomInRange(0, CANVAS_HEIGHT - height);
  const color = options.color ?? getFragmentDefaultColor(type);

  return {
    id: generateId(),
    type,
    x,
    y,
    width,
    height,
    rotation,
    zIndex: 0,
    color,
    blendMode: 'normal',
    locked: false,
    opacity: 1,
    clipPath: getClipPathForType(type),
  };
}

export function addFragment(fragments: Fragment[], fragment: Fragment): Fragment[] {
  const maxZ = getMaxZIndex(fragments);
  const newFragment = { ...fragment, zIndex: maxZ + 1 };
  return [...fragments, newFragment];
}

export function removeFragment(fragments: Fragment[], id: string): Fragment[] {
  return fragments.filter(f => f.id !== id);
}

export function markFragmentRemoving(fragments: Fragment[], id: string): Fragment[] {
  return fragments.map(f => f.id === id ? { ...f, removing: true } : f);
}

export function updateFragment(
  fragments: Fragment[],
  id: string,
  updates: Partial<Fragment>
): Fragment[] {
  return fragments.map(f => f.id === id ? { ...f, ...updates } : f);
}

export function bringToFront(fragments: Fragment[], id: string): Fragment[] {
  const maxZ = getMaxZIndex(fragments);
  return fragments.map(f => f.id === id ? { ...f, zIndex: maxZ + 1 } : f);
}

export function moveFragment(
  fragments: Fragment[],
  id: string,
  x: number,
  y: number
): Fragment[] {
  const frag = findFragmentById(fragments, id);
  if (!frag) return fragments;
  const clamped = clampPosition(x, y, CANVAS_WIDTH, CANVAS_HEIGHT, frag.width, frag.height);
  return updateFragment(fragments, id, { x: clamped.x, y: clamped.y });
}

export function rotateFragment(
  fragments: Fragment[],
  id: string,
  angle: number
): Fragment[] {
  let normalized = angle % 360;
  if (normalized < 0) normalized += 360;
  return updateFragment(fragments, id, { rotation: normalized });
}

export type ResizeCorner = 'nw' | 'ne' | 'sw' | 'se';

export function resizeFragment(
  fragments: Fragment[],
  id: string,
  newWidth: number,
  newHeight: number,
  corner: ResizeCorner
): Fragment[] {
  const frag = findFragmentById(fragments, id);
  if (!frag) return fragments;

  const width = Math.max(20, Math.min(400, newWidth));
  const height = Math.max(20, Math.min(400, newHeight));

  let { x, y } = frag;
  const dw = width - frag.width;
  const dh = height - frag.height;

  if (corner === 'nw' || corner === 'sw') {
    x -= dw;
  }
  if (corner === 'nw' || corner === 'ne') {
    y -= dh;
  }

  const clamped = clampPosition(x, y, CANVAS_WIDTH, CANVAS_HEIGHT, width, height);
  return updateFragment(fragments, id, { x: clamped.x, y: clamped.y, width, height });
}

export function getRandomFragmentType(prevTypes: FragmentType[]): FragmentType {
  const types: FragmentType[] = ['paper', 'ink', 'strip', 'clipping', 'foil'];
  const recent = prevTypes.slice(-2);
  const allSame = recent.length === 2 && recent[0] === recent[1];
  const available = allSame ? types.filter(t => t !== recent[0]) : types;
  return available[randomInRange(0, available.length - 1)];
}

export function createRandomFragment(prevTypes: FragmentType[]): Fragment {
  const type = getRandomFragmentType(prevTypes);
  const centerX = CANVAS_WIDTH / 2 + randomInRange(-100, 100);
  const centerY = CANVAS_HEIGHT / 2 + randomInRange(-100, 100);
  return createFragment({ type, x: centerX, y: centerY });
}
