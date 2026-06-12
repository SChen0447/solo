export interface SealData {
  text: string;
  x: number;
  y: number;
  size: number;
  rotation: number;
  canvas: HTMLCanvasElement;
}

function renderSealOffscreen(text: string, size: number): HTMLCanvasElement {
  const padding = 4;
  const canvasSize = size + padding * 2;
  const offscreen = document.createElement('canvas');
  offscreen.width = canvasSize;
  offscreen.height = canvasSize;
  const ctx = offscreen.getContext('2d')!;

  ctx.fillStyle = '#C03030';
  const borderW = 2;
  ctx.fillRect(borderW, borderW, size - borderW * 2 + padding * 2 - borderW, size - borderW * 2 + padding * 2 - borderW);

  const innerPad = 5;
  ctx.strokeStyle = '#C03030';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(innerPad, innerPad, canvasSize - innerPad * 2, canvasSize - innerPad * 2);

  ctx.fillStyle = '#C03030';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  if (text.length === 1) {
    ctx.font = `bold ${size * 0.55}px "SimSun", "STSong", "宋体", serif`;
    ctx.fillText(text, canvasSize / 2, canvasSize / 2);
  } else if (text.length === 2) {
    ctx.font = `bold ${size * 0.38}px "SimSun", "STSong", "宋体", serif`;
    ctx.fillText(text[0], canvasSize / 2, canvasSize * 0.32);
    ctx.fillText(text[1], canvasSize / 2, canvasSize * 0.72);
  }

  addSealTexture(ctx, canvasSize);

  return offscreen;
}

function addSealTexture(ctx: CanvasRenderingContext2D, size: number): void {
  const imageData = ctx.getImageData(0, 0, size, size);
  const data = imageData.data;

  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] > 0) {
      if (Math.random() < 0.08) {
        data[i + 3] = Math.floor(data[i + 3] * (0.4 + Math.random() * 0.4));
      }
    }
  }

  ctx.putImageData(imageData, 0, 0);
}

export function createSeal(text: string, x: number, y: number): SealData {
  const size = 32 + Math.floor(Math.random() * 17);
  const rotation = (Math.random() - 0.5) * 30;
  const canvas = renderSealOffscreen(text, size);

  return {
    text,
    x,
    y,
    size,
    rotation,
    canvas,
  };
}

export function drawSeal(ctx: CanvasRenderingContext2D, seal: SealData): void {
  ctx.save();

  ctx.translate(seal.x, seal.y);
  ctx.rotate((seal.rotation * Math.PI) / 180);

  ctx.shadowColor = 'rgba(200, 0, 0, 0.3)';
  ctx.shadowBlur = 6;
  ctx.shadowOffsetX = 2;
  ctx.shadowOffsetY = 2;

  ctx.drawImage(
    seal.canvas,
    -seal.canvas.width / 2,
    -seal.canvas.height / 2
  );

  ctx.restore();
}

export function hitTestSeal(seal: SealData, px: number, py: number): boolean {
  const dx = px - seal.x;
  const dy = py - seal.y;
  const halfSize = seal.size / 2 + 4;
  return Math.abs(dx) < halfSize && Math.abs(dy) < halfSize;
}
