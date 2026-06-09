import { generateWeaveTexture, generateWeaveTextureHighRes } from './weaveEngine';
import type { WeaveParams, WeaveType } from './weaveEngine';
import { UIControls } from './uiControls';

const TEXTURE_SIZE = 500;
const CANVAS_SIZE = 600;
const TEXTURE_OFFSET = (CANVAS_SIZE - TEXTURE_SIZE) / 2;
const EXPORT_SIZE = 1024;
const TRANSITION_DURATION = 600;
const TRANSITION_FPS = 30;
const TRANSITION_FRAME_INTERVAL = 1000 / TRANSITION_FPS;

let mainCanvas: HTMLCanvasElement;
let mainCtx: CanvasRenderingContext2D;
let toastElement: HTMLDivElement;
let uiControls: UIControls;
let currentParams: WeaveParams;
let isTransitioning = false;

function drawBackgroundGrid(ctx: CanvasRenderingContext2D): void {
  ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

  ctx.fillStyle = '#E0E0E0';
  ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

  ctx.strokeStyle = 'rgba(192, 192, 192, 0.5)';
  ctx.lineWidth = 1;

  const gridSize = 20;
  for (let x = 0; x <= CANVAS_SIZE; x += gridSize) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, CANVAS_SIZE);
    ctx.stroke();
  }
  for (let y = 0; y <= CANVAS_SIZE; y += gridSize) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(CANVAS_SIZE, y);
    ctx.stroke();
  }
}

function renderTexture(params: WeaveParams): void {
  const imageData = generateWeaveTexture(params, TEXTURE_SIZE, TEXTURE_SIZE);

  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = TEXTURE_SIZE;
  tempCanvas.height = TEXTURE_SIZE;
  const tempCtx = tempCanvas.getContext('2d')!;
  tempCtx.putImageData(imageData, 0, 0);

  drawBackgroundGrid(mainCtx);
  mainCtx.drawImage(tempCanvas, TEXTURE_OFFSET, TEXTURE_OFFSET);
}

function renderTextureWithTransition(
  oldParams: WeaveParams,
  newParams: WeaveParams
): void {
  if (isTransitioning) return;
  isTransitioning = true;

  const oldImageData = generateWeaveTexture(oldParams, TEXTURE_SIZE, TEXTURE_SIZE);
  const newImageData = generateWeaveTexture(newParams, TEXTURE_SIZE, TEXTURE_SIZE);

  const oldCanvas = document.createElement('canvas');
  oldCanvas.width = TEXTURE_SIZE;
  oldCanvas.height = TEXTURE_SIZE;
  const oldCtx = oldCanvas.getContext('2d')!;
  oldCtx.putImageData(oldImageData, 0, 0);

  const newCanvas = document.createElement('canvas');
  newCanvas.width = TEXTURE_SIZE;
  newCanvas.height = TEXTURE_SIZE;
  const newCtx = newCanvas.getContext('2d')!;
  newCtx.putImageData(newImageData, 0, 0);

  const centerX = TEXTURE_SIZE / 2;
  const centerY = TEXTURE_SIZE / 2;
  const maxRadius = Math.sqrt(centerX * centerX + centerY * centerY);

  let startTime: number | null = null;
  let lastFrameTime = 0;

  function animate(timestamp: number): void {
    if (startTime === null) startTime = timestamp;

    const elapsed = timestamp - startTime;

    if (timestamp - lastFrameTime >= TRANSITION_FRAME_INTERVAL || elapsed >= TRANSITION_DURATION) {
      lastFrameTime = timestamp;

      const progress = Math.min(elapsed / TRANSITION_DURATION, 1);
      const currentRadius = progress * maxRadius;

      drawBackgroundGrid(mainCtx);

      mainCtx.save();
      mainCtx.beginPath();
      mainCtx.rect(TEXTURE_OFFSET, TEXTURE_OFFSET, TEXTURE_SIZE, TEXTURE_SIZE);
      mainCtx.clip();

      mainCtx.drawImage(oldCanvas, TEXTURE_OFFSET, TEXTURE_OFFSET);

      mainCtx.globalCompositeOperation = 'destination-out';
      const gradient = mainCtx.createRadialGradient(
        TEXTURE_OFFSET + centerX,
        TEXTURE_OFFSET + centerY,
        0,
        TEXTURE_OFFSET + centerX,
        TEXTURE_OFFSET + centerY,
        currentRadius
      );
      gradient.addColorStop(0, 'rgba(0, 0, 0, 1)');
      gradient.addColorStop(0.8, 'rgba(0, 0, 0, 0.8)');
      gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
      mainCtx.fillStyle = gradient;
      mainCtx.fillRect(TEXTURE_OFFSET, TEXTURE_OFFSET, TEXTURE_SIZE, TEXTURE_SIZE);
      mainCtx.globalCompositeOperation = 'source-over';

      mainCtx.save();
      mainCtx.beginPath();
      mainCtx.arc(
        TEXTURE_OFFSET + centerX,
        TEXTURE_OFFSET + centerY,
        currentRadius,
        0,
        Math.PI * 2
      );
      mainCtx.clip();
      mainCtx.drawImage(newCanvas, TEXTURE_OFFSET, TEXTURE_OFFSET);
      mainCtx.restore();

      mainCtx.restore();

      if (progress >= 1) {
        isTransitioning = false;
        return;
      }
    }

    requestAnimationFrame(animate);
  }

  requestAnimationFrame(animate);
}

function showExportToast(): void {
  toastElement.classList.add('show');
  setTimeout(() => {
    toastElement.classList.remove('show');
  }, 2000);
}

function exportPNG(): void {
  const params = uiControls.getParams();
  const imageData = generateWeaveTextureHighRes(params, EXPORT_SIZE, EXPORT_SIZE);

  const exportCanvas = document.createElement('canvas');
  exportCanvas.width = EXPORT_SIZE;
  exportCanvas.height = EXPORT_SIZE;
  const exportCtx = exportCanvas.getContext('2d')!;
  exportCtx.putImageData(imageData, 0, 0);

  const link = document.createElement('a');
  link.download = `fabric-texture-${params.weaveType}-${Date.now()}.png`;
  link.href = exportCanvas.toDataURL('image/png');
  link.click();

  showExportToast();
}

function handleParamsChange(params: WeaveParams): void {
  if (isTransitioning) return;
  currentParams = { ...params };
  renderTexture(currentParams);
}

function handleWeaveTypeChange(newType: WeaveType, oldType: WeaveType): void {
  const newParams = uiControls.getParams();
  const oldParams = { ...currentParams, weaveType: oldType };
  currentParams = { ...newParams };
  renderTextureWithTransition(oldParams, newParams);
}

function handleExport(): void {
  exportPNG();
}

function init(): void {
  mainCanvas = document.getElementById('mainCanvas') as HTMLCanvasElement;
  mainCtx = mainCanvas.getContext('2d')!;
  toastElement = document.getElementById('exportToast') as HTMLDivElement;

  uiControls = new UIControls({
    onParamsChange: handleParamsChange,
    onWeaveTypeChange: handleWeaveTypeChange,
    onExport: handleExport,
  });

  currentParams = uiControls.getParams();
  renderTexture(currentParams);
}

init();
