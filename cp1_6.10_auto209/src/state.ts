export type RGBA = [number, number, number, number];
export type Frame = RGBA[][];
export type Speed = 0.5 | 0.3 | 0.15;

export interface AnimationData {
  frames: Frame[];
  speed: number;
}

export type StateEvent =
  | 'pixelChanged'
  | 'frameAdded'
  | 'frameRemoved'
  | 'frameChanged'
  | 'colorChanged'
  | 'speedChanged'
  | 'playingChanged'
  | 'previewChanged'
  | 'dataLoaded';

type Listener = () => void;

const GRID_SIZE = 16;
const MAX_FRAMES = 6;
const MIN_FRAMES = 1;

const DEFAULT_PALETTE: string[] = [
  '#000000', '#2d2b26', '#55514b', '#807b73', '#a9a298',
  '#d6cec3', '#ffffff', '#be2633', '#e06f8b', '#f4b4b9',
  '#f4a93a', '#f7d88a', '#3a8549', '#6abe30', '#9bd077',
  '#2776ea', '#58b6f7', '#9ae3ff', '#68386c'
];

function hexToRgba(hex: string): RGBA {
  const h = hex.replace('#', '');
  return [
    parseInt(h.substring(0, 2), 16),
    parseInt(h.substring(2, 4), 16),
    parseInt(h.substring(4, 6), 16),
    255
  ];
}

function createEmptyFrame(): Frame {
  const frame: Frame = [];
  for (let y = 0; y < GRID_SIZE; y++) {
    const row: RGBA[] = [];
    for (let x = 0; x < GRID_SIZE; x++) {
      row.push([0, 0, 0, 0]);
    }
    frame.push(row);
  }
  return frame;
}

function cloneFrame(frame: Frame): Frame {
  return frame.map(row => row.map(cell => [...cell] as RGBA));
}

function cloneFrames(frames: Frame[]): Frame[] {
  return frames.map(frame => cloneFrame(frame));
}

class EventEmitter {
  private listeners: Map<StateEvent, Set<Listener>> = new Map();

  on(event: StateEvent, listener: Listener): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(listener);
  }

  off(event: StateEvent, listener: Listener): void {
    this.listeners.get(event)?.delete(listener);
  }

  emit(event: StateEvent): void {
    this.listeners.get(event)?.forEach(fn => fn());
  }
}

class AppState extends EventEmitter {
  private _frames: Frame[];
  private _currentFrame: number;
  private _speed: Speed;
  private _palette: string[];
  private _currentColor: string;
  private _isPlaying: boolean;
  private _isPreview: boolean;

  constructor() {
    super();
    this._frames = [createEmptyFrame()];
    this._currentFrame = 0;
    this._speed = 0.3;
    this._palette = [...DEFAULT_PALETTE];
    this._currentColor = DEFAULT_PALETTE[0];
    this._isPlaying = false;
    this._isPreview = false;
  }

  get frames(): Frame[] {
    return cloneFrames(this._frames);
  }

  get currentFrame(): number {
    return this._currentFrame;
  }

  get speed(): Speed {
    return this._speed;
  }

  get palette(): string[] {
    return [...this._palette];
  }

  get currentColor(): string {
    return this._currentColor;
  }

  get isPlaying(): boolean {
    return this._isPlaying;
  }

  get isPreview(): boolean {
    return this._isPreview;
  }

  get gridSize(): number {
    return GRID_SIZE;
  }

  get maxFrames(): number {
    return MAX_FRAMES;
  }

  get minFrames(): number {
    return MIN_FRAMES;
  }

  getFrame(index: number): Frame | null {
    if (index < 0 || index >= this._frames.length) return null;
    return cloneFrame(this._frames[index]);
  }

  setPixel(x: number, y: number, color: RGBA | null): boolean {
    if (x < 0 || x >= GRID_SIZE || y < 0 || y >= GRID_SIZE) return false;
    const frame = this._frames[this._currentFrame];
    const prev = frame[y][x];
    if (color === null) {
      frame[y][x] = [0, 0, 0, 0];
    } else {
      frame[y][x] = [...color] as RGBA;
    }
    if (prev[0] === frame[y][x][0] &&
        prev[1] === frame[y][x][1] &&
        prev[2] === frame[y][x][2] &&
        prev[3] === frame[y][x][3]) {
      return false;
    }
    this.emit('pixelChanged');
    return true;
  }

  getPixel(x: number, y: number): RGBA | null {
    if (x < 0 || x >= GRID_SIZE || y < 0 || y >= GRID_SIZE) return null;
    return [...this._frames[this._currentFrame][y][x]] as RGBA;
  }

  addFrame(): boolean {
    if (this._frames.length >= MAX_FRAMES) return false;
    const newFrame = cloneFrame(this._frames[this._currentFrame]);
    this._frames.splice(this._currentFrame + 1, 0, newFrame);
    this._currentFrame = this._currentFrame + 1;
    this.emit('frameAdded');
    return true;
  }

  removeFrame(index: number): boolean {
    if (this._frames.length <= MIN_FRAMES) return false;
    if (index < 0 || index >= this._frames.length) return false;
    this._frames.splice(index, 1);
    if (this._currentFrame >= this._frames.length) {
      this._currentFrame = this._frames.length - 1;
    }
    this.emit('frameRemoved');
    return true;
  }

  goToFrame(index: number): boolean {
    if (index < 0 || index >= this._frames.length) return false;
    if (index === this._currentFrame) return false;
    this._currentFrame = index;
    this.emit('frameChanged');
    return true;
  }

  nextFrame(): number {
    this._currentFrame = (this._currentFrame + 1) % this._frames.length;
    this.emit('frameChanged');
    return this._currentFrame;
  }

  setColor(hex: string): boolean {
    if (!this._palette.includes(hex)) return false;
    if (hex === this._currentColor) return false;
    this._currentColor = hex;
    this.emit('colorChanged');
    return true;
  }

  getCurrentColorRGBA(): RGBA {
    return hexToRgba(this._currentColor);
  }

  setSpeed(speed: Speed): boolean {
    if (speed !== 0.5 && speed !== 0.3 && speed !== 0.15) return false;
    if (speed === this._speed) return false;
    this._speed = speed;
    this.emit('speedChanged');
    return true;
  }

  setPlaying(playing: boolean): boolean {
    if (playing === this._isPlaying) return false;
    this._isPlaying = playing;
    this.emit('playingChanged');
    return true;
  }

  setPreview(preview: boolean): boolean {
    if (preview === this._isPreview) return false;
    this._isPreview = preview;
    this.emit('previewChanged');
    return true;
  }

  exportData(): AnimationData {
    return {
      frames: cloneFrames(this._frames),
      speed: this._speed
    };
  }

  loadData(data: AnimationData): boolean {
    if (!data || !Array.isArray(data.frames) || data.frames.length === 0) return false;
    if (typeof data.speed !== 'number') return false;

    const validFrames: Frame[] = [];
    for (const frame of data.frames) {
      if (!Array.isArray(frame) || frame.length !== GRID_SIZE) return false;
      const newFrame: Frame = [];
      for (let y = 0; y < GRID_SIZE; y++) {
        if (!Array.isArray(frame[y]) || frame[y].length !== GRID_SIZE) return false;
        const row: RGBA[] = [];
        for (let x = 0; x < GRID_SIZE; x++) {
          const cell = frame[y][x];
          if (!Array.isArray(cell) || cell.length < 3) return false;
          const r = Math.max(0, Math.min(255, Math.floor(cell[0])));
          const g = Math.max(0, Math.min(255, Math.floor(cell[1])));
          const b = Math.max(0, Math.min(255, Math.floor(cell[2])));
          const a = cell.length >= 4 ? Math.max(0, Math.min(255, Math.floor(cell[3]))) : 255;
          row.push([r, g, b, a]);
        }
        newFrame.push(row);
      }
      validFrames.push(newFrame);
    }

    if (validFrames.length > MAX_FRAMES) {
      validFrames.length = MAX_FRAMES;
    }

    let speed: Speed = 0.3;
    if (data.speed <= 0.15) speed = 0.15;
    else if (data.speed >= 0.5) speed = 0.5;
    else speed = 0.3;

    this._frames = validFrames;
    this._currentFrame = 0;
    this._speed = speed;
    this.emit('dataLoaded');
    return true;
  }
}

export const state = new AppState();
