export interface CanvasManager {
  wallCanvas: HTMLCanvasElement;
  wallCtx: CanvasRenderingContext2D;
  paintCanvas: HTMLCanvasElement;
  paintCtx: CanvasRenderingContext2D;
  width: number;
  height: number;
  resize(): void;
  drawWall(): void;
  clearPaint(): void;
}

const BRICK_WIDTH = 40;
const BRICK_HEIGHT = 20;
const MORTAR_COLOR = '#3a3a3a';

export function createCanvasManager(
  wallCanvasId: string,
  paintCanvasId: string
): CanvasManager {
  const wallCanvas = document.getElementById(wallCanvasId) as HTMLCanvasElement;
  const paintCanvas = document.getElementById(paintCanvasId) as HTMLCanvasElement;

  if (!wallCanvas || !paintCanvas) {
    throw new Error('Canvas elements not found');
  }

  const wallCtx = wallCanvas.getContext('2d');
  const paintCtx = paintCanvas.getContext('2d');

  if (!wallCtx || !paintCtx) {
    throw new Error('Canvas 2D context not available');
  }

  const manager: CanvasManager = {
    wallCanvas,
    wallCtx,
    paintCanvas,
    paintCtx,
    width: 0,
    height: 0,

    resize() {
      const container = wallCanvas.parentElement;
      if (!container) return;

      const rect = container.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;

      this.width = rect.width;
      this.height = rect.height;

      for (const canvas of [wallCanvas, paintCanvas]) {
        canvas.width = Math.floor(rect.width * dpr);
        canvas.height = Math.floor(rect.height * dpr);
        canvas.style.width = rect.width + 'px';
        canvas.style.height = rect.height + 'px';
      }

      wallCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
      paintCtx.setTransform(dpr, 0, 0, dpr, 0, 0);

      this.drawWall();
    },

    drawWall() {
      const { width, height } = this;
      const ctx = wallCtx;

      ctx.fillStyle = MORTAR_COLOR;
      ctx.fillRect(0, 0, width, height);

      const rows = Math.ceil(height / BRICK_HEIGHT) + 1;
      const cols = Math.ceil(width / BRICK_WIDTH) + 2;

      for (let row = 0; row < rows; row++) {
        const offset = (row % 2) * (BRICK_WIDTH / 2);

        for (let col = -1; col < cols; col++) {
          const x = col * BRICK_WIDTH + offset;
          const y = row * BRICK_HEIGHT;

          const brightness = 90 + Math.random() * 10;
          const baseColor = Math.floor(74 + Math.random() * 16);
          const brickColor = `rgb(${baseColor + Math.random() * 10}, ${baseColor + Math.random() * 10}, ${baseColor + Math.random() * 10})`;

          ctx.fillStyle = brickColor;
          ctx.fillRect(x + 1, y + 1, BRICK_WIDTH - 2, BRICK_HEIGHT - 2);

          const shadowGradient = ctx.createLinearGradient(
            x, y,
            x, y + BRICK_HEIGHT
          );
          shadowGradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
          shadowGradient.addColorStop(0.5, 'rgba(0, 0, 0, 0.08)');
          shadowGradient.addColorStop(1, 'rgba(0, 0, 0, 0.18)');
          ctx.fillStyle = shadowGradient;
          ctx.fillRect(x + 1, y + 1, BRICK_WIDTH - 2, BRICK_HEIGHT - 2);

          const highlightGradient = ctx.createLinearGradient(
            x, y,
            x + BRICK_WIDTH, y
          );
          highlightGradient.addColorStop(0, `rgba(${brightness}, ${brightness}, ${brightness}, 0.15)`);
          highlightGradient.addColorStop(0.3, `rgba(${brightness}, ${brightness}, ${brightness}, 0.08)`);
          highlightGradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
          ctx.fillStyle = highlightGradient;
          ctx.fillRect(x + 1, y + 1, BRICK_WIDTH - 2, BRICK_HEIGHT - 2);

          for (let i = 0; i < 3; i++) {
            const px = x + 3 + Math.random() * (BRICK_WIDTH - 8);
            const py = y + 3 + Math.random() * (BRICK_HEIGHT - 8);
            const pr = 0.5 + Math.random() * 1.2;
            const darken = Math.random() > 0.5;
            ctx.fillStyle = darken
              ? 'rgba(0, 0, 0, 0.08)'
              : `rgba(${brightness + 10}, ${brightness + 10}, ${brightness + 10}, 0.08)`;
            ctx.beginPath();
            ctx.arc(px, py, pr, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }

      ctx.strokeStyle = MORTAR_COLOR;
      ctx.lineWidth = 1;
      for (let row = 0; row <= rows; row++) {
        ctx.beginPath();
        ctx.moveTo(0, row * BRICK_HEIGHT + 0.5);
        ctx.lineTo(width, row * BRICK_HEIGHT + 0.5);
        ctx.stroke();
      }
    },

    clearPaint() {
      paintCtx.clearRect(0, 0, this.width, this.height);
    }
  };

  return manager;
}
