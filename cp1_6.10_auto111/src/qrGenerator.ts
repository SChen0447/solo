const SECRET_KEY = 'ART_QR_TICKET_SECRET_2024';
const MATRIX_SIZE = 25;
const CANVAS_SIZE = 200;
const CENTER_PATTERN_SIZE = 40;

function customHash(input: string): string {
  let hash = 0;
  const str = input + SECRET_KEY;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  let hex = Math.abs(hash).toString(16);
  while (hex.length < 64) {
    hex += Math.abs(((hash << 3) ^ (hash >> 5) + hex.length)).toString(16);
  }
  return hex.substring(0, 64);
}

function hexToBinary(hex: string): string {
  let binary = '';
  for (let i = 0; i < hex.length; i++) {
    binary += parseInt(hex[i], 16).toString(2).padStart(4, '0');
  }
  return binary;
}

export function encryptTicketId(ticketId: string): string {
  return customHash(ticketId);
}

export function generateMatrix(ticketId: string): boolean[][] {
  const hash = encryptTicketId(ticketId);
  const binary = hexToBinary(hash);
  const matrix: boolean[][] = [];
  let bitIndex = 0;

  const centerStart = Math.floor((MATRIX_SIZE - 7) / 2);
  const centerEnd = centerStart + 7;

  for (let row = 0; row < MATRIX_SIZE; row++) {
    matrix[row] = [];
    for (let col = 0; col < MATRIX_SIZE; col++) {
      if (row >= centerStart && row < centerEnd && col >= centerStart && col < centerEnd) {
        matrix[row][col] = false;
      } else {
        matrix[row][col] = binary[bitIndex % binary.length] === '1';
        bitIndex++;
      }
    }
  }

  addFinderPattern(matrix, 0, 0);
  addFinderPattern(matrix, 0, MATRIX_SIZE - 7);
  addFinderPattern(matrix, MATRIX_SIZE - 7, 0);

  return matrix;
}

function addFinderPattern(matrix: boolean[][], startRow: number, startCol: number): void {
  const pattern = [
    [true, true, true, true, true, true, true],
    [true, false, false, false, false, false, true],
    [true, false, true, true, true, false, true],
    [true, false, true, true, true, false, true],
    [true, false, true, true, true, false, true],
    [true, false, false, false, false, false, true],
    [true, true, true, true, true, true, true]
  ];
  for (let r = 0; r < 7; r++) {
    for (let c = 0; c < 7; c++) {
      if (startRow + r < MATRIX_SIZE && startCol + c < MATRIX_SIZE) {
        matrix[startRow + r][startCol + c] = pattern[r][c];
      }
    }
  }
}

function generateGradientColors(): { warm: string; cool: string } {
  const warmColors = ['#ff6b35', '#ff8c42', '#ffd166', '#ef476f', '#f78c6b'];
  const coolColors = ['#3f8efc', '#06d6a0', '#118ab2', '#073b4c', '#4cc9f0'];
  return {
    warm: warmColors[Math.floor(Math.random() * warmColors.length)],
    cool: coolColors[Math.floor(Math.random() * coolColors.length)]
  };
}

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
): void {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

function drawCenterPattern(ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number): void {
  const patterns = ['star', 'heart'];
  const pattern = patterns[Math.floor(Math.random() * patterns.length)];
  const halfSize = size / 2;

  ctx.save();
  ctx.translate(cx, cy);

  if (pattern === 'star') {
    const spikes = 5;
    const outerRadius = halfSize;
    const innerRadius = halfSize * 0.4;
    let rot = Math.PI / 2 * 3;
    const step = Math.PI / spikes;

    ctx.beginPath();
    ctx.moveTo(0, -outerRadius);
    for (let i = 0; i < spikes; i++) {
      let x = Math.cos(rot) * outerRadius;
      let y = Math.sin(rot) * outerRadius;
      ctx.lineTo(x, y);
      rot += step;
      x = Math.cos(rot) * innerRadius;
      y = Math.sin(rot) * innerRadius;
      ctx.lineTo(x, y);
      rot += step;
    }
    ctx.lineTo(0, -outerRadius);
    ctx.closePath();

    const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, outerRadius);
    gradient.addColorStop(0, '#ffd166');
    gradient.addColorStop(1, '#ff6b35');
    ctx.fillStyle = gradient;
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.stroke();
  } else {
    ctx.beginPath();
    const topCurveHeight = halfSize * 0.3;
    ctx.moveTo(0, halfSize * 0.8);
    ctx.bezierCurveTo(
      -halfSize, halfSize * 0.2,
      -halfSize, -topCurveHeight,
      0, -halfSize * 0.2
    );
    ctx.bezierCurveTo(
      halfSize, -topCurveHeight,
      halfSize, halfSize * 0.2,
      0, halfSize * 0.8
    );
    ctx.closePath();

    const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, halfSize);
    gradient.addColorStop(0, '#ff8fa3');
    gradient.addColorStop(1, '#ef476f');
    ctx.fillStyle = gradient;
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  ctx.restore();
}

export function drawArtQR(
  canvas: HTMLCanvasElement,
  ticketId: string,
  userInfo?: { name?: string; session?: string; seat?: string }
): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  canvas.width = CANVAS_SIZE;
  canvas.height = CANVAS_SIZE;

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

  const padding = 16;
  const drawableSize = CANVAS_SIZE - padding * 2;
  const cellSize = drawableSize / MATRIX_SIZE;

  const matrix = generateMatrix(ticketId);
  const colors = generateGradientColors();

  for (let row = 0; row < MATRIX_SIZE; row++) {
    for (let col = 0; col < MATRIX_SIZE; col++) {
      if (matrix[row][col]) {
        const x = padding + col * cellSize;
        const y = padding + row * cellSize;
        const size = cellSize - 1;

        const t = (row + col) / (MATRIX_SIZE * 2);
        const r = Math.round(
          parseInt(colors.warm.slice(1, 3), 16) * (1 - t) +
          parseInt(colors.cool.slice(1, 3), 16) * t
        );
        const g = Math.round(
          parseInt(colors.warm.slice(3, 5), 16) * (1 - t) +
          parseInt(colors.cool.slice(3, 5), 16) * t
        );
        const b = Math.round(
          parseInt(colors.warm.slice(5, 7), 16) * (1 - t) +
          parseInt(colors.cool.slice(5, 7), 16) * t
        );

        ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
        drawRoundedRect(ctx, x, y, size, size, Math.min(3, size / 3));
        ctx.fill();
      }
    }
  }

  const centerX = CANVAS_SIZE / 2;
  const centerY = CANVAS_SIZE / 2;

  ctx.fillStyle = '#ffffff';
  drawRoundedRect(
    ctx,
    centerX - CENTER_PATTERN_SIZE / 2 - 4,
    centerY - CENTER_PATTERN_SIZE / 2 - 4,
    CENTER_PATTERN_SIZE + 8,
    CENTER_PATTERN_SIZE + 8,
    8
  );
  ctx.fill();
  ctx.strokeStyle = '#e0e0e0';
  ctx.lineWidth = 1;
  ctx.stroke();

  drawCenterPattern(ctx, centerX, centerY, CENTER_PATTERN_SIZE);

  if (userInfo && userInfo.name) {
    ctx.fillStyle = '#666666';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(ticketId, CANVAS_SIZE / 2, CANVAS_SIZE - 4);
  }
}

export function downloadTicket(canvas: HTMLCanvasElement, ticketId: string): void {
  const link = document.createElement('a');
  link.download = `ticket-${ticketId}.png`;
  link.href = canvas.toDataURL('image/png');
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
