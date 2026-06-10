export type PixelFrame = (string | null)[][];

export interface CharacterData {
  frames: PixelFrame[];
  currentFrameIndex: number;
}

export const PALETTE: string[] = [
  '#e63946',
  '#f4a261',
  '#e9c46a',
  '#2a9d8f',
  '#457b9d',
  '#1d3557',
  '#f1faee',
  '#a8dadc'
];

export const GRID_SIZE = 16;
export const MAX_FRAMES = 8;

function createEmptyFrame(): PixelFrame {
  return Array.from({ length: GRID_SIZE }, () =>
    Array.from({ length: GRID_SIZE }, () => null)
  );
}

const warriorFrames: PixelFrame[] = [
  (() => {
    const f = createEmptyFrame();
    const sk = '#f4a261', h = '#e63946', b = '#1d3557', s = '#457b9d', w = '#f1faee', g = '#e9c46a';
    for (let x = 5; x <= 10; x++) { for (let y = 2; y <= 5; y++) f[y][x] = h; }
    for (let x = 6; x <= 9; x++) { for (let y = 3; y <= 4; y++) f[y][x] = sk; }
    f[3][6] = b; f[3][9] = b;
    for (let x = 5; x <= 10; x++) { for (let y = 6; y <= 10; y++) f[y][x] = s; }
    f[7][5] = g; f[7][10] = g;
    for (let y = 11; y <= 13; y++) { f[y][6] = b; f[y][7] = b; f[y][8] = b; f[y][9] = b; }
    for (let y = 14; y <= 15; y++) { f[y][5] = w; f[y][6] = w; f[y][9] = w; f[y][10] = w; }
    for (let y = 5; y <= 9; y++) { f[y][3] = g; }
    f[4][3] = w; f[10][3] = w;
    return f;
  })(),
  (() => {
    const f = createEmptyFrame();
    const sk = '#f4a261', h = '#e63946', b = '#1d3557', s = '#457b9d', w = '#f1faee', g = '#e9c46a';
    for (let x = 5; x <= 10; x++) { for (let y = 2; y <= 5; y++) f[y][x] = h; }
    for (let x = 6; x <= 9; x++) { for (let y = 3; y <= 4; y++) f[y][x] = sk; }
    f[3][6] = b; f[3][9] = b;
    for (let x = 5; x <= 10; x++) { for (let y = 6; y <= 10; y++) f[y][x] = s; }
    f[7][5] = g; f[7][10] = g;
    for (let y = 11; y <= 13; y++) { f[y][5] = b; f[y][6] = b; f[y][9] = b; f[y][10] = b; }
    for (let y = 14; y <= 15; y++) { f[y][4] = w; f[y][5] = w; f[y][10] = w; f[y][11] = w; }
    for (let y = 4; y <= 8; y++) { f[y][2] = g; }
    f[3][2] = w; f[9][2] = w;
    return f;
  })(),
  (() => {
    const f = createEmptyFrame();
    const sk = '#f4a261', h = '#e63946', b = '#1d3557', s = '#457b9d', w = '#f1faee', g = '#e9c46a';
    for (let x = 5; x <= 10; x++) { for (let y = 2; y <= 5; y++) f[y][x] = h; }
    for (let x = 6; x <= 9; x++) { for (let y = 3; y <= 4; y++) f[y][x] = sk; }
    f[3][6] = b; f[3][9] = b;
    for (let x = 5; x <= 10; x++) { for (let y = 6; y <= 10; y++) f[y][x] = s; }
    f[7][5] = g; f[7][10] = g;
    for (let y = 11; y <= 13; y++) { f[y][6] = b; f[y][7] = b; f[y][8] = b; f[y][9] = b; }
    for (let y = 14; y <= 15; y++) { f[y][5] = w; f[y][6] = w; f[y][9] = w; f[y][10] = w; }
    for (let y = 5; y <= 9; y++) { f[y][12] = g; }
    f[4][12] = w; f[10][12] = w;
    return f;
  })(),
  (() => {
    const f = createEmptyFrame();
    const sk = '#f4a261', h = '#e63946', b = '#1d3557', s = '#457b9d', w = '#f1faee', g = '#e9c46a';
    for (let x = 5; x <= 10; x++) { for (let y = 2; y <= 5; y++) f[y][x] = h; }
    for (let x = 6; x <= 9; x++) { for (let y = 3; y <= 4; y++) f[y][x] = sk; }
    f[3][6] = b; f[3][9] = b;
    for (let x = 5; x <= 10; x++) { for (let y = 6; y <= 10; y++) f[y][x] = s; }
    f[7][5] = g; f[7][10] = g;
    for (let y = 11; y <= 13; y++) { f[y][5] = b; f[y][6] = b; f[y][9] = b; f[y][10] = b; }
    for (let y = 14; y <= 15; y++) { f[y][4] = w; f[y][5] = w; f[y][10] = w; f[y][11] = w; }
    for (let y = 4; y <= 8; y++) { f[y][13] = g; }
    f[3][13] = w; f[9][13] = w;
    return f;
  })()
];

const mageFrames: PixelFrame[] = [
  (() => {
    const f = createEmptyFrame();
    const sk = '#f4a261', h = '#1d3557', b = '#1d3557', r = '#457b9d', w = '#f1faee', p = '#a8dadc', st = '#e9c46a';
    for (let x = 4; x <= 11; x++) { for (let y = 0; y <= 1; y++) f[y][x] = h; }
    for (let x = 5; x <= 10; x++) { for (let y = 2; y <= 5; y++) f[y][x] = h; }
    for (let x = 6; x <= 9; x++) { for (let y = 3; y <= 4; y++) f[y][x] = sk; }
    f[3][6] = b; f[3][9] = b;
    for (let x = 4; x <= 11; x++) { for (let y = 6; y <= 12; y++) f[y][x] = r; }
    f[7][4] = p; f[7][11] = p;
    for (let y = 13; y <= 15; y++) { f[y][5] = r; f[y][6] = r; f[y][9] = r; f[y][10] = r; }
    for (let y = 4; y <= 11; y++) { f[y][2] = st; }
    f[3][2] = p; f[12][2] = w;
    return f;
  })(),
  (() => {
    const f = createEmptyFrame();
    const sk = '#f4a261', h = '#1d3557', b = '#1d3557', r = '#457b9d', w = '#f1faee', p = '#a8dadc', st = '#e9c46a';
    for (let x = 4; x <= 11; x++) { for (let y = 0; y <= 1; y++) f[y][x] = h; }
    for (let x = 5; x <= 10; x++) { for (let y = 2; y <= 5; y++) f[y][x] = h; }
    for (let x = 6; x <= 9; x++) { for (let y = 3; y <= 4; y++) f[y][x] = sk; }
    f[3][6] = b; f[3][9] = b;
    for (let x = 4; x <= 11; x++) { for (let y = 6; y <= 12; y++) f[y][x] = r; }
    f[7][4] = p; f[7][11] = p;
    for (let y = 13; y <= 15; y++) { f[y][4] = r; f[y][5] = r; f[y][10] = r; f[y][11] = r; }
    for (let y = 3; y <= 10; y++) { f[y][1] = st; }
    f[2][1] = p; f[11][1] = w;
    return f;
  })(),
  (() => {
    const f = createEmptyFrame();
    const sk = '#f4a261', h = '#1d3557', b = '#1d3557', r = '#457b9d', w = '#f1faee', p = '#a8dadc', st = '#e9c46a';
    for (let x = 4; x <= 11; x++) { for (let y = 0; y <= 1; y++) f[y][x] = h; }
    for (let x = 5; x <= 10; x++) { for (let y = 2; y <= 5; y++) f[y][x] = h; }
    for (let x = 6; x <= 9; x++) { for (let y = 3; y <= 4; y++) f[y][x] = sk; }
    f[3][6] = b; f[3][9] = b;
    for (let x = 4; x <= 11; x++) { for (let y = 6; y <= 12; y++) f[y][x] = r; }
    f[7][4] = p; f[7][11] = p;
    for (let y = 13; y <= 15; y++) { f[y][5] = r; f[y][6] = r; f[y][9] = r; f[y][10] = r; }
    for (let y = 4; y <= 11; y++) { f[y][13] = st; }
    f[3][13] = p; f[12][13] = w;
    return f;
  })(),
  (() => {
    const f = createEmptyFrame();
    const sk = '#f4a261', h = '#1d3557', b = '#1d3557', r = '#457b9d', w = '#f1faee', p = '#a8dadc', st = '#e9c46a';
    for (let x = 4; x <= 11; x++) { for (let y = 0; y <= 1; y++) f[y][x] = h; }
    for (let x = 5; x <= 10; x++) { for (let y = 2; y <= 5; y++) f[y][x] = h; }
    for (let x = 6; x <= 9; x++) { for (let y = 3; y <= 4; y++) f[y][x] = sk; }
    f[3][6] = b; f[3][9] = b;
    for (let x = 4; x <= 11; x++) { for (let y = 6; y <= 12; y++) f[y][x] = r; }
    f[7][4] = p; f[7][11] = p;
    for (let y = 13; y <= 15; y++) { f[y][4] = r; f[y][5] = r; f[y][10] = r; f[y][11] = r; }
    for (let y = 3; y <= 10; y++) { f[y][14] = st; }
    f[2][14] = p; f[11][14] = w;
    return f;
  })()
];

const archerFrames: PixelFrame[] = [
  (() => {
    const f = createEmptyFrame();
    const sk = '#f4a261', h = '#2a9d8f', b = '#1d3557', l = '#e9c46a', w = '#f1faee', bd = '#457b9d', br = '#a8dadc';
    for (let x = 5; x <= 10; x++) { for (let y = 1; y <= 5; y++) f[y][x] = h; }
    for (let x = 6; x <= 9; x++) { for (let y = 3; y <= 4; y++) f[y][x] = sk; }
    f[3][6] = b; f[3][9] = b;
    for (let x = 5; x <= 10; x++) { for (let y = 6; y <= 10; y++) f[y][x] = bd; }
    f[7][5] = l; f[7][10] = l;
    for (let y = 11; y <= 13; y++) { f[y][6] = b; f[y][7] = b; f[y][8] = b; f[y][9] = b; }
    for (let y = 14; y <= 15; y++) { f[y][5] = w; f[y][6] = w; f[y][9] = w; f[y][10] = w; }
    for (let y = 3; y <= 12; y++) { f[y][1] = br; }
    for (let x = 1; x <= 3; x++) { f[3][x] = br; f[12][x] = br; }
    f[7][3] = l;
    return f;
  })(),
  (() => {
    const f = createEmptyFrame();
    const sk = '#f4a261', h = '#2a9d8f', b = '#1d3557', l = '#e9c46a', w = '#f1faee', bd = '#457b9d', br = '#a8dadc';
    for (let x = 5; x <= 10; x++) { for (let y = 1; y <= 5; y++) f[y][x] = h; }
    for (let x = 6; x <= 9; x++) { for (let y = 3; y <= 4; y++) f[y][x] = sk; }
    f[3][6] = b; f[3][9] = b;
    for (let x = 5; x <= 10; x++) { for (let y = 6; y <= 10; y++) f[y][x] = bd; }
    f[7][5] = l; f[7][10] = l;
    for (let y = 11; y <= 13; y++) { f[y][5] = b; f[y][6] = b; f[y][9] = b; f[y][10] = b; }
    for (let y = 14; y <= 15; y++) { f[y][4] = w; f[y][5] = w; f[y][10] = w; f[y][11] = w; }
    for (let y = 2; y <= 11; y++) { f[y][0] = br; }
    for (let x = 0; x <= 2; x++) { f[2][x] = br; f[11][x] = br; }
    f[6][2] = l;
    return f;
  })(),
  (() => {
    const f = createEmptyFrame();
    const sk = '#f4a261', h = '#2a9d8f', b = '#1d3557', l = '#e9c46a', w = '#f1faee', bd = '#457b9d', br = '#a8dadc';
    for (let x = 5; x <= 10; x++) { for (let y = 1; y <= 5; y++) f[y][x] = h; }
    for (let x = 6; x <= 9; x++) { for (let y = 3; y <= 4; y++) f[y][x] = sk; }
    f[3][6] = b; f[3][9] = b;
    for (let x = 5; x <= 10; x++) { for (let y = 6; y <= 10; y++) f[y][x] = bd; }
    f[7][5] = l; f[7][10] = l;
    for (let y = 11; y <= 13; y++) { f[y][6] = b; f[y][7] = b; f[y][8] = b; f[y][9] = b; }
    for (let y = 14; y <= 15; y++) { f[y][5] = w; f[y][6] = w; f[y][9] = w; f[y][10] = w; }
    for (let y = 3; y <= 12; y++) { f[y][14] = br; }
    for (let x = 12; x <= 14; x++) { f[3][x] = br; f[12][x] = br; }
    f[7][12] = l;
    return f;
  })(),
  (() => {
    const f = createEmptyFrame();
    const sk = '#f4a261', h = '#2a9d8f', b = '#1d3557', l = '#e9c46a', w = '#f1faee', bd = '#457b9d', br = '#a8dadc';
    for (let x = 5; x <= 10; x++) { for (let y = 1; y <= 5; y++) f[y][x] = h; }
    for (let x = 6; x <= 9; x++) { for (let y = 3; y <= 4; y++) f[y][x] = sk; }
    f[3][6] = b; f[3][9] = b;
    for (let x = 5; x <= 10; x++) { for (let y = 6; y <= 10; y++) f[y][x] = bd; }
    f[7][5] = l; f[7][10] = l;
    for (let y = 11; y <= 13; y++) { f[y][5] = b; f[y][6] = b; f[y][9] = b; f[y][10] = b; }
    for (let y = 14; y <= 15; y++) { f[y][4] = w; f[y][5] = w; f[y][10] = w; f[y][11] = w; }
    for (let y = 2; y <= 11; y++) { f[y][15] = br; }
    for (let x = 13; x <= 15; x++) { f[2][x] = br; f[11][x] = br; }
    f[6][13] = l;
    return f;
  })()
];

export type TemplateName = 'warrior' | 'mage' | 'archer';

export const TEMPLATES: Record<TemplateName, { name: string; frames: PixelFrame[] }> = {
  warrior: { name: '战士', frames: warriorFrames },
  mage: { name: '法师', frames: mageFrames },
  archer: { name: '弓箭手', frames: archerFrames }
};

export class Character {
  private frames: PixelFrame[];
  private currentFrameIndex: number;

  constructor() {
    this.frames = [createEmptyFrame()];
    this.currentFrameIndex = 0;
  }

  getFrames(): PixelFrame[] {
    return this.frames;
  }

  getFrameCount(): number {
    return this.frames.length;
  }

  getCurrentFrame(): PixelFrame {
    return this.frames[this.currentFrameIndex];
  }

  getCurrentFrameIndex(): number {
    return this.currentFrameIndex;
  }

  setCurrentFrameIndex(index: number): void {
    if (index >= 0 && index < this.frames.length) {
      this.currentFrameIndex = index;
    }
  }

  setPixel(x: number, y: number, color: string | null): void {
    if (x >= 0 && x < GRID_SIZE && y >= 0 && y < GRID_SIZE) {
      this.frames[this.currentFrameIndex][y][x] = color;
    }
  }

  getPixel(x: number, y: number): string | null {
    if (x >= 0 && x < GRID_SIZE && y >= 0 && y < GRID_SIZE) {
      return this.frames[this.currentFrameIndex][y][x];
    }
    return null;
  }

  addFrame(): boolean {
    if (this.frames.length < MAX_FRAMES) {
      this.frames.push(createEmptyFrame());
      this.currentFrameIndex = this.frames.length - 1;
      return true;
    }
    return false;
  }

  deleteFrame(): boolean {
    if (this.frames.length > 1) {
      this.frames.splice(this.currentFrameIndex, 1);
      if (this.currentFrameIndex >= this.frames.length) {
        this.currentFrameIndex = this.frames.length - 1;
      }
      return true;
    }
    return false;
  }

  duplicateFrame(): boolean {
    if (this.frames.length < MAX_FRAMES) {
      const current = this.frames[this.currentFrameIndex];
      const copy = current.map(row => [...row]);
      this.frames.splice(this.currentFrameIndex + 1, 0, copy);
      this.currentFrameIndex += 1;
      return true;
    }
    return false;
  }

  clearCurrentFrame(): void {
    this.frames[this.currentFrameIndex] = createEmptyFrame();
  }

  loadTemplate(templateName: TemplateName): void {
    const template = TEMPLATES[templateName];
    this.frames = template.frames.map(frame => frame.map(row => [...row]));
    this.currentFrameIndex = 0;
  }

  exportSpriteSheet(pixelSize: number = 16): HTMLCanvasElement {
    const cols = this.frames.length;
    const canvas = document.createElement('canvas');
    canvas.width = GRID_SIZE * pixelSize * cols;
    canvas.height = GRID_SIZE * pixelSize;
    const ctx = canvas.getContext('2d')!;
    ctx.imageSmoothingEnabled = false;

    this.frames.forEach((frame, frameIndex) => {
      for (let y = 0; y < GRID_SIZE; y++) {
        for (let x = 0; x < GRID_SIZE; x++) {
          const color = frame[y][x];
          if (color) {
            ctx.fillStyle = color;
            ctx.fillRect(
              frameIndex * GRID_SIZE * pixelSize + x * pixelSize,
              y * pixelSize,
              pixelSize,
              pixelSize
            );
          }
        }
      }
    });

    return canvas;
  }
}
