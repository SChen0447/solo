export interface EraData {
  id: number;
  name: string;
  nameEn: string;
  particleColor: string;
  particleColors: string[];
  soundFreqs: number[];
}

export interface FragmentData {
  id: number;
  eraId: number;
  name: string;
  iconType: string;
}

export const ERAS: EraData[] = [
  {
    id: 0, name: '远古时代', nameEn: 'Ancient',
    particleColor: '#ff6b35',
    particleColors: ['#ff6b35', '#ff8c42', '#ffa62b', '#e85d04'],
    soundFreqs: [110, 146.83, 164.81],
  },
  {
    id: 1, name: '古埃及', nameEn: 'Egypt',
    particleColor: '#daa520',
    particleColors: ['#daa520', '#e6c35c', '#c4991c', '#f0d060'],
    soundFreqs: [220, 261.63, 329.63],
  },
  {
    id: 2, name: '中世纪', nameEn: 'Medieval',
    particleColor: '#1e3a5f',
    particleColors: ['#1e3a5f', '#2a5298', '#3b6cb5', '#4a7fd4'],
    soundFreqs: [196, 246.94, 293.66],
  },
  {
    id: 3, name: '文艺复兴', nameEn: 'Renaissance',
    particleColor: '#ffd700',
    particleColors: ['#ffd700', '#ffec8b', '#f0c040', '#ffe066'],
    soundFreqs: [261.63, 329.63, 392],
  },
  {
    id: 4, name: '工业革命', nameEn: 'Industrial',
    particleColor: '#708090',
    particleColors: ['#708090', '#8899aa', '#5a6a7a', '#9aabb8'],
    soundFreqs: [146.83, 185, 220],
  },
  {
    id: 5, name: '现代', nameEn: 'Modern',
    particleColor: '#c0c0c0',
    particleColors: ['#c0c0c0', '#e0e0e0', '#a8a8a8', '#f0f0f0'],
    soundFreqs: [329.63, 440, 523.25],
  },
];

export const FRAGMENTS: FragmentData[] = [
  { id: 0,  eraId: 0, name: '火焰',   iconType: 'fire' },
  { id: 1,  eraId: 0, name: '石器',   iconType: 'stone_axe' },
  { id: 2,  eraId: 0, name: '弓箭',   iconType: 'bow_arrow' },
  { id: 3,  eraId: 1, name: '金字塔', iconType: 'pyramid' },
  { id: 4,  eraId: 1, name: '象形文字', iconType: 'hieroglyph' },
  { id: 5,  eraId: 1, name: '木乃伊', iconType: 'mummy' },
  { id: 6,  eraId: 1, name: '纸莎草', iconType: 'papyrus' },
  { id: 7,  eraId: 2, name: '城堡',   iconType: 'castle' },
  { id: 8,  eraId: 2, name: '骑士',   iconType: 'knight_shield' },
  { id: 9,  eraId: 2, name: '十字军', iconType: 'crusade_cross' },
  { id: 10, eraId: 3, name: '名画',   iconType: 'painting' },
  { id: 11, eraId: 3, name: '印刷术', iconType: 'printing_press' },
  { id: 12, eraId: 3, name: '望远镜', iconType: 'telescope' },
  { id: 13, eraId: 3, name: '圆顶',   iconType: 'dome' },
  { id: 14, eraId: 4, name: '蒸汽机', iconType: 'steam_engine' },
  { id: 15, eraId: 4, name: '火车',   iconType: 'train' },
  { id: 16, eraId: 4, name: '纺纱机', iconType: 'spinning_wheel' },
  { id: 17, eraId: 5, name: '火箭',   iconType: 'rocket' },
  { id: 18, eraId: 5, name: '电脑',   iconType: 'computer' },
  { id: 19, eraId: 5, name: '原子',   iconType: 'atom' },
];

const FRAG_SIZE = 50;
const P = 4;

type DrawFn = (ctx: CanvasRenderingContext2D) => void;

function createOffscreen(draw: DrawFn): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = FRAG_SIZE;
  c.height = FRAG_SIZE;
  const ctx = c.getContext('2d')!;
  draw(ctx);
  return c;
}

function drawFire(ctx: CanvasRenderingContext2D): void {
  ctx.fillStyle = '#ff6b35';
  ctx.fillRect(6 * P, 8 * P, 2 * P, 3 * P);
  ctx.fillRect(4 * P, 6 * P, 2 * P, 2 * P);
  ctx.fillRect(8 * P, 6 * P, 2 * P, 2 * P);
  ctx.fillRect(5 * P, 4 * P, 2 * P, 2 * P);
  ctx.fillRect(7 * P, 4 * P, 2 * P, 2 * P);
  ctx.fillStyle = '#ffa62b';
  ctx.fillRect(6 * P, 5 * P, 2 * P, 2 * P);
  ctx.fillRect(5 * P, 6 * P, 2 * P, 2 * P);
  ctx.fillRect(7 * P, 6 * P, 2 * P, 2 * P);
  ctx.fillStyle = '#ffe066';
  ctx.fillRect(6 * P, 6 * P, 2 * P, 2 * P);
  ctx.fillStyle = '#8b4513';
  ctx.fillRect(4 * P, 10 * P, 6 * P, 1 * P);
  ctx.fillRect(3 * P, 11 * P, 8 * P, 1 * P);
}

function drawStoneAxe(ctx: CanvasRenderingContext2D): void {
  ctx.fillStyle = '#8b7355';
  ctx.fillRect(5 * P, 2 * P, 5 * P, 3 * P);
  ctx.fillRect(4 * P, 3 * P, 1 * P, 1 * P);
  ctx.fillRect(10 * P, 3 * P, 1 * P, 1 * P);
  ctx.fillStyle = '#6b5b45';
  ctx.fillRect(5 * P, 2 * P, 5 * P, 1 * P);
  ctx.fillStyle = '#5c3a1e';
  ctx.fillRect(6 * P, 5 * P, 2 * P, 5 * P);
  ctx.fillRect(7 * P, 5 * P, 1 * P, 6 * P);
}

function drawBowArrow(ctx: CanvasRenderingContext2D): void {
  ctx.fillStyle = '#8b4513';
  ctx.fillRect(3 * P, 2 * P, 1 * P, 1 * P);
  ctx.fillRect(2 * P, 3 * P, 1 * P, 1 * P);
  ctx.fillRect(2 * P, 4 * P, 1 * P, 1 * P);
  ctx.fillRect(2 * P, 5 * P, 1 * P, 1 * P);
  ctx.fillRect(2 * P, 6 * P, 1 * P, 1 * P);
  ctx.fillRect(2 * P, 7 * P, 1 * P, 1 * P);
  ctx.fillRect(3 * P, 8 * P, 1 * P, 1 * P);
  ctx.fillStyle = '#c0c0c0';
  ctx.fillRect(4 * P, 5 * P, 7 * P, 1 * P);
  ctx.fillRect(10 * P, 4 * P, 1 * P, 1 * P);
  ctx.fillStyle = '#daa520';
  ctx.fillRect(11 * P, 5 * P, 1 * P, 1 * P);
  ctx.fillStyle = '#f5f5dc';
  ctx.fillRect(3 * P, 5 * P, 1 * P, 1 * P);
}

function drawPyramid(ctx: CanvasRenderingContext2D): void {
  ctx.fillStyle = '#daa520';
  ctx.fillRect(6 * P, 2 * P, 2 * P, 1 * P);
  ctx.fillRect(5 * P, 3 * P, 4 * P, 1 * P);
  ctx.fillRect(4 * P, 4 * P, 6 * P, 1 * P);
  ctx.fillRect(3 * P, 5 * P, 8 * P, 1 * P);
  ctx.fillRect(2 * P, 6 * P, 10 * P, 1 * P);
  ctx.fillRect(1 * P, 7 * P, 12 * P, 1 * P);
  ctx.fillStyle = '#c4991c';
  ctx.fillRect(2 * P, 7 * P, 5 * P, 1 * P);
  ctx.fillRect(3 * P, 6 * P, 3 * P, 1 * P);
  ctx.fillStyle = '#5c3a1e';
  ctx.fillRect(7 * P, 7 * P, 2 * P, 2 * P);
  ctx.fillRect(8 * P, 9 * P, 2 * P, 1 * P);
}

function drawHieroglyph(ctx: CanvasRenderingContext2D): void {
  ctx.fillStyle = '#daa520';
  ctx.fillRect(1 * P, 1 * P, 11 * P, 11 * P);
  ctx.fillStyle = '#5c3a1e';
  ctx.fillRect(2 * P, 2 * P, 9 * P, 9 * P);
  ctx.fillStyle = '#daa520';
  ctx.fillRect(3 * P, 3 * P, 2 * P, 1 * P);
  ctx.fillRect(7 * P, 3 * P, 2 * P, 1 * P);
  ctx.fillRect(4 * P, 5 * P, 1 * P, 1 * P);
  ctx.fillRect(8 * P, 5 * P, 1 * P, 1 * P);
  ctx.fillRect(5 * P, 4 * P, 3 * P, 1 * P);
  ctx.fillRect(4 * P, 7 * P, 5 * P, 1 * P);
  ctx.fillRect(6 * P, 8 * P, 1 * P, 2 * P);
  ctx.fillRect(4 * P, 9 * P, 1 * P, 1 * P);
  ctx.fillRect(8 * P, 9 * P, 1 * P, 1 * P);
}

function drawMummy(ctx: CanvasRenderingContext2D): void {
  ctx.fillStyle = '#e8d5a8';
  ctx.fillRect(4 * P, 1 * P, 4 * P, 10 * P);
  ctx.fillRect(3 * P, 3 * P, 6 * P, 7 * P);
  ctx.fillStyle = '#8b7355';
  ctx.fillRect(4 * P, 2 * P, 4 * P, 1 * P);
  ctx.fillRect(5 * P, 4 * P, 2 * P, 1 * P);
  ctx.fillRect(4 * P, 6 * P, 4 * P, 1 * P);
  ctx.fillRect(5 * P, 8 * P, 2 * P, 1 * P);
  ctx.fillStyle = '#1e3a5f';
  ctx.fillRect(5 * P, 2 * P, 1 * P, 1 * P);
  ctx.fillRect(7 * P, 2 * P, 1 * P, 1 * P);
}

function drawPapyrus(ctx: CanvasRenderingContext2D): void {
  ctx.fillStyle = '#f5e6c8';
  ctx.fillRect(2 * P, 1 * P, 9 * P, 11 * P);
  ctx.fillStyle = '#daa520';
  ctx.fillRect(2 * P, 1 * P, 9 * P, 1 * P);
  ctx.fillRect(2 * P, 11 * P, 9 * P, 1 * P);
  ctx.fillStyle = '#5c3a1e';
  ctx.fillRect(4 * P, 3 * P, 5 * P, 1 * P);
  ctx.fillRect(4 * P, 5 * P, 5 * P, 1 * P);
  ctx.fillRect(4 * P, 7 * P, 5 * P, 1 * P);
  ctx.fillRect(4 * P, 9 * P, 3 * P, 1 * P);
  ctx.fillStyle = '#8b6914';
  ctx.fillRect(1 * P, 1 * P, 1 * P, 11 * P);
  ctx.fillRect(11 * P, 1 * P, 1 * P, 11 * P);
}

function drawCastle(ctx: CanvasRenderingContext2D): void {
  ctx.fillStyle = '#808080';
  ctx.fillRect(2 * P, 4 * P, 3 * P, 7 * P);
  ctx.fillRect(8 * P, 4 * P, 3 * P, 7 * P);
  ctx.fillRect(4 * P, 6 * P, 5 * P, 5 * P);
  ctx.fillStyle = '#606060';
  ctx.fillRect(2 * P, 3 * P, 1 * P, 1 * P);
  ctx.fillRect(4 * P, 3 * P, 1 * P, 1 * P);
  ctx.fillRect(8 * P, 3 * P, 1 * P, 1 * P);
  ctx.fillRect(10 * P, 3 * P, 1 * P, 1 * P);
  ctx.fillStyle = '#1e3a5f';
  ctx.fillRect(5 * P, 9 * P, 3 * P, 2 * P);
  ctx.fillStyle = '#daa520';
  ctx.fillRect(6 * P, 7 * P, 1 * P, 1 * P);
}

function drawKnightShield(ctx: CanvasRenderingContext2D): void {
  ctx.fillStyle = '#c0c0c0';
  ctx.fillRect(3 * P, 2 * P, 6 * P, 1 * P);
  ctx.fillRect(2 * P, 3 * P, 8 * P, 1 * P);
  ctx.fillRect(2 * P, 4 * P, 8 * P, 2 * P);
  ctx.fillRect(3 * P, 6 * P, 6 * P, 2 * P);
  ctx.fillRect(4 * P, 8 * P, 4 * P, 2 * P);
  ctx.fillRect(5 * P, 10 * P, 2 * P, 1 * P);
  ctx.fillStyle = '#8b0000';
  ctx.fillRect(5 * P, 4 * P, 2 * P, 1 * P);
  ctx.fillRect(4 * P, 5 * P, 1 * P, 2 * P);
  ctx.fillRect(7 * P, 5 * P, 1 * P, 2 * P);
  ctx.fillStyle = '#daa520';
  ctx.fillRect(5 * P, 5 * P, 2 * P, 2 * P);
}

function drawCrusadeCross(ctx: CanvasRenderingContext2D): void {
  ctx.fillStyle = '#c0c0c0';
  ctx.fillRect(2 * P, 1 * P, 8 * P, 1 * P);
  ctx.fillRect(1 * P, 2 * P, 10 * P, 1 * P);
  ctx.fillRect(1 * P, 3 * P, 10 * P, 5 * P);
  ctx.fillRect(2 * P, 8 * P, 8 * P, 1 * P);
  ctx.fillRect(3 * P, 9 * P, 6 * P, 1 * P);
  ctx.fillStyle = '#8b0000';
  ctx.fillRect(5 * P, 3 * P, 2 * P, 5 * P);
  ctx.fillRect(3 * P, 5 * P, 6 * P, 1 * P);
  ctx.fillStyle = '#daa520';
  ctx.fillRect(5 * P, 4 * P, 2 * P, 1 * P);
  ctx.fillRect(4 * P, 5 * P, 1 * P, 1 * P);
  ctx.fillRect(7 * P, 5 * P, 1 * P, 1 * P);
}

function drawPainting(ctx: CanvasRenderingContext2D): void {
  ctx.fillStyle = '#8b4513';
  ctx.fillRect(1 * P, 1 * P, 11 * P, 11 * P);
  ctx.fillStyle = '#5c3a1e';
  ctx.fillRect(2 * P, 2 * P, 9 * P, 9 * P);
  ctx.fillStyle = '#4a7fd4';
  ctx.fillRect(3 * P, 3 * P, 7 * P, 4 * P);
  ctx.fillStyle = '#2d8b2d';
  ctx.fillRect(3 * P, 7 * P, 7 * P, 3 * P);
  ctx.fillStyle = '#ffd700';
  ctx.fillRect(5 * P, 4 * P, 3 * P, 2 * P);
  ctx.fillStyle = '#daa520';
  ctx.fillRect(2 * P, 1 * P, 9 * P, 1 * P);
}

function drawPrintingPress(ctx: CanvasRenderingContext2D): void {
  ctx.fillStyle = '#5c3a1e';
  ctx.fillRect(1 * P, 1 * P, 11 * P, 3 * P);
  ctx.fillRect(1 * P, 8 * P, 11 * P, 3 * P);
  ctx.fillStyle = '#8b4513';
  ctx.fillRect(3 * P, 4 * P, 1 * P, 4 * P);
  ctx.fillRect(9 * P, 4 * P, 1 * P, 4 * P);
  ctx.fillStyle = '#1a1a1a';
  ctx.fillRect(2 * P, 5 * P, 8 * P, 2 * P);
  ctx.fillStyle = '#f5f5dc';
  ctx.fillRect(4 * P, 2 * P, 4 * P, 1 * P);
  ctx.fillStyle = '#333';
  ctx.fillRect(4 * P, 5 * P, 1 * P, 1 * P);
  ctx.fillRect(6 * P, 5 * P, 1 * P, 1 * P);
  ctx.fillRect(4 * P, 6 * P, 1 * P, 1 * P);
  ctx.fillRect(6 * P, 6 * P, 1 * P, 1 * P);
}

function drawTelescope(ctx: CanvasRenderingContext2D): void {
  ctx.fillStyle = '#8b4513';
  ctx.fillRect(2 * P, 5 * P, 8 * P, 2 * P);
  ctx.fillStyle = '#daa520';
  ctx.fillRect(1 * P, 4 * P, 3 * P, 3 * P);
  ctx.fillRect(1 * P, 4 * P, 1 * P, 1 * P);
  ctx.fillRect(1 * P, 6 * P, 1 * P, 1 * P);
  ctx.fillStyle = '#c0c0c0';
  ctx.fillRect(9 * P, 4 * P, 2 * P, 3 * P);
  ctx.fillStyle = '#5c3a1e';
  ctx.fillRect(7 * P, 7 * P, 1 * P, 3 * P);
  ctx.fillRect(8 * P, 9 * P, 1 * P, 1 * P);
  ctx.fillStyle = '#4a7fd4';
  ctx.fillRect(1 * P, 5 * P, 1 * P, 1 * P);
}

function drawDome(ctx: CanvasRenderingContext2D): void {
  ctx.fillStyle = '#c0c0c0';
  ctx.fillRect(5 * P, 1 * P, 2 * P, 1 * P);
  ctx.fillRect(4 * P, 2 * P, 4 * P, 1 * P);
  ctx.fillRect(3 * P, 3 * P, 6 * P, 1 * P);
  ctx.fillRect(2 * P, 4 * P, 8 * P, 1 * P);
  ctx.fillStyle = '#daa520';
  ctx.fillRect(5 * P, 0, 2 * P, 1 * P);
  ctx.fillStyle = '#e8d5a8';
  ctx.fillRect(1 * P, 5 * P, 10 * P, 5 * P);
  ctx.fillStyle = '#8b4513';
  ctx.fillRect(1 * P, 10 * P, 10 * P, 1 * P);
  ctx.fillStyle = '#5c3a1e';
  ctx.fillRect(4 * P, 6 * P, 4 * P, 4 * P);
  ctx.fillRect(3 * P, 7 * P, 1 * P, 2 * P);
  ctx.fillRect(8 * P, 7 * P, 1 * P, 2 * P);
}

function drawSteamEngine(ctx: CanvasRenderingContext2D): void {
  ctx.fillStyle = '#708090';
  ctx.fillRect(2 * P, 6 * P, 8 * P, 4 * P);
  ctx.fillStyle = '#5a6a7a';
  ctx.fillRect(3 * P, 4 * P, 3 * P, 2 * P);
  ctx.fillRect(4 * P, 3 * P, 1 * P, 1 * P);
  ctx.fillStyle = '#8b0000';
  ctx.fillRect(8 * P, 3 * P, 3 * P, 3 * P);
  ctx.fillRect(7 * P, 4 * P, 1 * P, 1 * P);
  ctx.fillStyle = '#333';
  ctx.fillRect(2 * P, 10 * P, 2 * P, 1 * P);
  ctx.fillRect(8 * P, 10 * P, 2 * P, 1 * P);
  ctx.fillStyle = '#c0c0c0';
  ctx.fillRect(3 * P, 5 * P, 1 * P, 1 * P);
}

function drawTrain(ctx: CanvasRenderingContext2D): void {
  ctx.fillStyle = '#708090';
  ctx.fillRect(1 * P, 5 * P, 10 * P, 4 * P);
  ctx.fillStyle = '#8b0000';
  ctx.fillRect(3 * P, 3 * P, 4 * P, 2 * P);
  ctx.fillRect(8 * P, 4 * P, 3 * P, 1 * P);
  ctx.fillStyle = '#333';
  ctx.fillRect(2 * P, 9 * P, 2 * P, 2 * P);
  ctx.fillRect(7 * P, 9 * P, 2 * P, 2 * P);
  ctx.fillStyle = '#daa520';
  ctx.fillRect(1 * P, 3 * P, 1 * P, 2 * P);
  ctx.fillRect(0, 2 * P, 1 * P, 1 * P);
  ctx.fillStyle = '#87ceeb';
  ctx.fillRect(4 * P, 4 * P, 2 * P, 1 * P);
}

function drawSpinningWheel(ctx: CanvasRenderingContext2D): void {
  ctx.fillStyle = '#8b4513';
  ctx.fillRect(6 * P, 2 * P, 1 * P, 8 * P);
  ctx.fillRect(5 * P, 9 * P, 3 * P, 1 * P);
  ctx.fillStyle = '#daa520';
  ctx.fillRect(3 * P, 2 * P, 7 * P, 1 * P);
  ctx.fillStyle = '#c0c0c0';
  ctx.fillRect(3 * P, 3 * P, 7 * P, 1 * P);
  ctx.fillStyle = '#5c3a1e';
  ctx.fillRect(4 * P, 4 * P, 1 * P, 1 * P);
  ctx.fillRect(8 * P, 4 * P, 1 * P, 1 * P);
  ctx.fillRect(3 * P, 5 * P, 1 * P, 1 * P);
  ctx.fillRect(9 * P, 5 * P, 1 * P, 1 * P);
  ctx.fillStyle = '#f5f5dc';
  ctx.fillRect(6 * P, 1 * P, 1 * P, 1 * P);
}

function drawRocket(ctx: CanvasRenderingContext2D): void {
  ctx.fillStyle = '#c0c0c0';
  ctx.fillRect(5 * P, 3 * P, 3 * P, 6 * P);
  ctx.fillStyle = '#e0e0e0';
  ctx.fillRect(6 * P, 1 * P, 1 * P, 2 * P);
  ctx.fillRect(5 * P, 2 * P, 3 * P, 1 * P);
  ctx.fillStyle = '#8b0000';
  ctx.fillRect(5 * P, 9 * P, 3 * P, 1 * P);
  ctx.fillStyle = '#ff6b35';
  ctx.fillRect(5 * P, 10 * P, 3 * P, 1 * P);
  ctx.fillStyle = '#ffd700';
  ctx.fillRect(6 * P, 11 * P, 1 * P, 1 * P);
  ctx.fillStyle = '#4a7fd4';
  ctx.fillRect(5 * P, 5 * P, 1 * P, 1 * P);
  ctx.fillStyle = '#c0c0c0';
  ctx.fillRect(4 * P, 7 * P, 1 * P, 2 * P);
  ctx.fillRect(8 * P, 7 * P, 1 * P, 2 * P);
}

function drawComputer(ctx: CanvasRenderingContext2D): void {
  ctx.fillStyle = '#c0c0c0';
  ctx.fillRect(2 * P, 1 * P, 8 * P, 6 * P);
  ctx.fillStyle = '#1a1a2e';
  ctx.fillRect(3 * P, 2 * P, 6 * P, 4 * P);
  ctx.fillStyle = '#4a7fd4';
  ctx.fillRect(4 * P, 3 * P, 1 * P, 1 * P);
  ctx.fillRect(6 * P, 3 * P, 1 * P, 1 * P);
  ctx.fillRect(4 * P, 4 * P, 3 * P, 1 * P);
  ctx.fillRect(5 * P, 5 * P, 1 * P, 1 * P);
  ctx.fillStyle = '#708090';
  ctx.fillRect(4 * P, 7 * P, 4 * P, 1 * P);
  ctx.fillRect(3 * P, 8 * P, 6 * P, 2 * P);
  ctx.fillStyle = '#333';
  ctx.fillRect(5 * P, 10 * P, 2 * P, 1 * P);
}

function drawAtom(ctx: CanvasRenderingContext2D): void {
  ctx.fillStyle = '#ff4444';
  ctx.fillRect(6 * P, 5 * P, 1 * P, 1 * P);
  ctx.fillStyle = '#4a7fd4';
  ctx.fillRect(3 * P, 4 * P, 1 * P, 1 * P);
  ctx.fillRect(9 * P, 6 * P, 1 * P, 1 * P);
  ctx.fillRect(6 * P, 2 * P, 1 * P, 1 * P);
  ctx.fillRect(6 * P, 8 * P, 1 * P, 1 * P);
  ctx.fillRect(4 * P, 7 * P, 1 * P, 1 * P);
  ctx.fillRect(8 * P, 3 * P, 1 * P, 1 * P);
  ctx.fillStyle = '#c0c0c0';
  ctx.fillRect(4 * P, 3 * P, 1 * P, 1 * P);
  ctx.fillRect(8 * P, 7 * P, 1 * P, 1 * P);
  ctx.fillRect(3 * P, 6 * P, 1 * P, 1 * P);
  ctx.fillRect(9 * P, 4 * P, 1 * P, 1 * P);
  ctx.fillRect(5 * P, 2 * P, 1 * P, 1 * P);
  ctx.fillRect(5 * P, 8 * P, 1 * P, 1 * P);
  ctx.fillRect(7 * P, 2 * P, 1 * P, 1 * P);
  ctx.fillRect(7 * P, 8 * P, 1 * P, 1 * P);
}

const DRAW_MAP: Record<string, DrawFn> = {
  fire: drawFire,
  stone_axe: drawStoneAxe,
  bow_arrow: drawBowArrow,
  pyramid: drawPyramid,
  hieroglyph: drawHieroglyph,
  mummy: drawMummy,
  papyrus: drawPapyrus,
  castle: drawCastle,
  knight_shield: drawKnightShield,
  crusade_cross: drawCrusadeCross,
  painting: drawPainting,
  printing_press: drawPrintingPress,
  telescope: drawTelescope,
  dome: drawDome,
  steam_engine: drawSteamEngine,
  train: drawTrain,
  spinning_wheel: drawSpinningWheel,
  rocket: drawRocket,
  computer: drawComputer,
  atom: drawAtom,
};

export class AssetManager {
  private fragmentCanvases: Map<number, HTMLCanvasElement> = new Map();
  private glowCanvases: Map<number, HTMLCanvasElement> = new Map();
  private audioCtx: AudioContext | null = null;

  init(): void {
    for (const frag of FRAGMENTS) {
      this.fragmentCanvases.set(frag.id, createOffscreen(DRAW_MAP[frag.iconType]));
      this.glowCanvases.set(frag.id, this.createGlowCanvas(frag.id));
    }
  }

  private createGlowCanvas(fragId: number): HTMLCanvasElement {
    const size = FRAG_SIZE + 16;
    const c = document.createElement('canvas');
    c.width = size;
    c.height = size;
    const ctx = c.getContext('2d')!;
    const src = this.fragmentCanvases.get(fragId)!;
    ctx.shadowColor = 'rgba(218, 165, 32, 0.5)';
    ctx.shadowBlur = 8;
    ctx.drawImage(src, 8, 8);
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    return c;
  }

  getFragmentCanvas(id: number): HTMLCanvasElement {
    return this.fragmentCanvases.get(id)!;
  }

  getGlowCanvas(id: number): HTMLCanvasElement {
    return this.glowCanvases.get(id)!;
  }

  getAudioContext(): AudioContext {
    if (!this.audioCtx) {
      this.audioCtx = new AudioContext();
    }
    return this.audioCtx;
  }

  playEraSound(eraId: number): void {
    const ctx = this.getAudioContext();
    if (ctx.state === 'suspended') {
      ctx.resume();
    }
    const era = ERAS[eraId];
    const now = ctx.currentTime;

    for (let i = 0; i < era.soundFreqs.length; i++) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = eraId <= 1 ? 'triangle' : eraId <= 3 ? 'sine' : 'square';
      osc.frequency.setValueAtTime(era.soundFreqs[i], now);
      osc.frequency.exponentialRampToValueAtTime(
        era.soundFreqs[i] * 1.2,
        now + 0.1
      );
      gain.gain.setValueAtTime(0.15, now + i * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 0.5);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + i * 0.08);
      osc.stop(now + i * 0.08 + 0.5);
    }
  }

  playErrorSound(): void {
    const ctx = this.getAudioContext();
    if (ctx.state === 'suspended') {
      ctx.resume();
    }
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(150, now);
    osc.frequency.linearRampToValueAtTime(80, now + 0.3);
    gain.gain.setValueAtTime(0.1, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.3);
  }

  playVictorySound(): void {
    const ctx = this.getAudioContext();
    if (ctx.state === 'suspended') {
      ctx.resume();
    }
    const now = ctx.currentTime;
    const notes = [261.63, 329.63, 392, 523.25];
    for (let i = 0; i < notes.length; i++) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(notes[i], now + i * 0.15);
      gain.gain.setValueAtTime(0.12, now + i * 0.15);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.15 + 0.8);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + i * 0.15);
      osc.stop(now + i * 0.15 + 0.8);
    }
  }
}
