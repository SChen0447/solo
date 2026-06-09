export interface SealOptions {
  text?: string;
  size?: number;
  color?: string;
  fontFamily?: string;
  fontSize?: number;
  rotation?: number;
  marginX?: number;
  marginY?: number;
}

export function drawSeal(
  ctx: CanvasRenderingContext2D,
  options: SealOptions = {}
): void {
  const {
    text = '数字墨客',
    size = 48,
    color = '#C04040',
    fontFamily = 'KaiTi, STKaiti, serif',
    fontSize = 14,
    rotation = 3,
    marginX = 20,
    marginY = 20,
  } = options;

  const canvasWidth = ctx.canvas.width;
  const canvasHeight = ctx.canvas.height;

  const x = canvasWidth - marginX - size / 2;
  const y = canvasHeight - marginY - size / 2;

  ctx.save();

  ctx.translate(x, y);
  ctx.rotate((rotation * Math.PI) / 180);

  ctx.fillStyle = color;
  ctx.fillRect(-size / 2, -size / 2, size, size);

  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.strokeRect(-size / 2 + 2, -size / 2 + 2, size - 4, size - 4);

  ctx.fillStyle = '#FAF6EE';
  ctx.font = `bold ${fontSize}px ${fontFamily}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  const chars = text.split('');
  if (chars.length <= 2) {
    chars.forEach((char, i) => {
      const offsetY = (i - (chars.length - 1) / 2) * fontSize;
      ctx.fillText(char, 0, offsetY);
    });
  } else if (chars.length <= 4) {
    const cols = 2;
    const rows = Math.ceil(chars.length / cols);
    chars.forEach((char, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const offsetX = (col - (cols - 1) / 2) * fontSize * 0.9;
      const offsetY = (row - (rows - 1) / 2) * fontSize * 0.9;
      ctx.fillText(char, offsetX, offsetY);
    });
  } else {
    ctx.fillText(text.slice(0, 4), 0, 0);
  }

  ctx.restore();
}

export function drawSignature(
  ctx: CanvasRenderingContext2D,
  text: string,
  options?: {
    color?: string;
    fontFamily?: string;
    fontSize?: number;
    marginX?: number;
    topOffset?: number;
  }
): void {
  if (!text || text.trim() === '') return;

  const {
    color = '#7A6A5A',
    fontFamily = "'ZCOOL XiaoWei', KaiTi, serif",
    fontSize = 18,
    marginX = 15,
    topOffset = 80,
  } = options || {};

  const canvasWidth = ctx.canvas.width;
  const canvasHeight = ctx.canvas.height;

  const chars = text.split('');

  ctx.save();
  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  const x = canvasWidth - marginX - fontSize / 2;
  const startY = topOffset;
  const charSpacing = fontSize * 1.1;

  chars.forEach((char, i) => {
    ctx.font = `${fontSize}px ${fontFamily}`;
    ctx.fillText(char, x, startY + i * charSpacing);
  });

  ctx.restore();
}
