import type { Person, SIRDataPoint } from './simulation';

const COLORS = {
  background: '#1B1B2F',
  grid: '#3A3A4E',
  susceptible: '#4A90D9',
  susceptibleGlow: '#4A90D980',
  infected: '#FF4444',
  infectedGlow: '#FF444480',
  recovered: '#44FF44',
  recoveredGlow: '#44FF4480',
  vaccinated: '#AAAAAA',
  vaccinatedGlow: '#AAAAAA80'
};

export interface RenderConfig {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  gridSize: number;
  cellSize: number;
  offsetX: number;
  offsetY: number;
}

export function computeRenderConfig(
  canvas: HTMLCanvasElement,
  gridSize: number,
  containerWidth: number,
  containerHeight: number
): RenderConfig {
  const ctx = canvas.getContext('2d')!;
  const dpr = window.devicePixelRatio || 1;

  canvas.width = containerWidth * dpr;
  canvas.height = containerHeight * dpr;
  canvas.style.width = `${containerWidth}px`;
  canvas.style.height = `${containerHeight}px`;
  ctx.scale(dpr, dpr);

  const maxGridWidth = containerWidth * 0.95;
  const maxGridHeight = containerHeight * 0.95;
  const cellSizeByWidth = Math.floor(maxGridWidth / gridSize);
  const cellSizeByHeight = Math.floor(maxGridHeight / gridSize);
  const cellSize = Math.max(8, Math.min(cellSizeByWidth, cellSizeByHeight));

  const gridPixelSize = cellSize * gridSize;
  const offsetX = (containerWidth - gridPixelSize) / 2;
  const offsetY = (containerHeight - gridPixelSize) / 2;

  return { canvas, ctx, gridSize, cellSize, offsetX, offsetY };
}

export function clearCanvas(config: RenderConfig): void {
  const { ctx, canvas } = config;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = COLORS.background;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}

export function drawGrid(config: RenderConfig): void {
  const { ctx, gridSize, cellSize, offsetX, offsetY } = config;
  const gridPixelSize = cellSize * gridSize;

  ctx.strokeStyle = COLORS.grid;
  ctx.lineWidth = 1;

  ctx.beginPath();
  for (let i = 0; i <= gridSize; i++) {
    const pos = offsetX + i * cellSize + 0.5;
    ctx.moveTo(pos, offsetY);
    ctx.lineTo(pos, offsetY + gridPixelSize);
  }
  for (let i = 0; i <= gridSize; i++) {
    const pos = offsetY + i * cellSize + 0.5;
    ctx.moveTo(offsetX, pos);
    ctx.lineTo(offsetX + gridPixelSize, pos);
  }
  ctx.stroke();
}

export function drawPeople(config: RenderConfig, people: Person[]): void {
  const { ctx, cellSize, offsetX, offsetY } = config;
  const personRadius = Math.max(2, Math.min(4, cellSize / 4));

  for (const person of people) {
    const cx = offsetX + person.x * cellSize + cellSize / 2;
    const cy = offsetY + person.y * cellSize + cellSize / 2;

    let color: string;
    let glow: string;

    switch (person.status) {
      case 'susceptible':
        color = COLORS.susceptible;
        glow = COLORS.susceptibleGlow;
        break;
      case 'infected':
        color = COLORS.infected;
        glow = COLORS.infectedGlow;
        break;
      case 'recovered':
        color = COLORS.recovered;
        glow = COLORS.recoveredGlow;
        break;
      case 'vaccinated':
        color = COLORS.vaccinated;
        glow = COLORS.vaccinatedGlow;
        break;
    }

    ctx.save();
    ctx.shadowColor = glow;
    ctx.shadowBlur = 8;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(cx, cy, personRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

export interface ChartConfig {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function drawSIRChart(
  ctx: CanvasRenderingContext2D,
  data: SIRDataPoint[],
  chart: ChartConfig
): void {
  const { x, y, width, height } = chart;
  const paddingTop = 10;
  const paddingBottom = 20;
  const paddingLeft = 30;
  const paddingRight = 10;

  const plotX = x + paddingLeft;
  const plotY = y + paddingTop;
  const plotW = width - paddingLeft - paddingRight;
  const plotH = height - paddingTop - paddingBottom;

  ctx.fillStyle = '#0F0F1F';
  ctx.fillRect(x, y, width, height);

  if (data.length < 2) {
    drawChartAxes(ctx, plotX, plotY, plotW, plotH, 500, 10);
    return;
  }

  const maxDay = data[data.length - 1].day;
  const xTickCount = Math.min(10, maxDay);
  const yMax = 500;

  drawChartAxes(ctx, plotX, plotY, plotW, plotH, yMax, xTickCount);

  const getX = (day: number) => plotX + (day / Math.max(maxDay, 1)) * plotW;
  const getY = (val: number) => plotY + plotH - (val / yMax) * plotH;

  drawArea(ctx, data, plotX, plotY, plotW, plotH, 'recovered', '#44FF4430', '#44FF44');
  drawArea(ctx, data, plotX, plotY, plotW, plotH, 'infected', '#FF444430', '#FF4444');
  drawLine(ctx, data, getX, getY, 'susceptible', '#4A90D9');
  drawLine(ctx, data, getX, getY, 'infected', '#FF4444');
  drawLine(ctx, data, getX, getY, 'recovered', '#44FF44');
}

function drawChartAxes(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  yMax: number,
  xTickCount: number
): void {
  ctx.strokeStyle = '#3A3A4E';
  ctx.lineWidth = 1;

  ctx.beginPath();
  ctx.moveTo(x, y + h);
  ctx.lineTo(x + w, y + h);
  ctx.moveTo(x, y);
  ctx.lineTo(x, y + h);
  ctx.stroke();

  ctx.fillStyle = '#AAAAAA';
  ctx.font = '10px sans-serif';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';

  for (let i = 0; i <= 4; i++) {
    const val = (yMax / 4) * i;
    const yy = y + h - (val / yMax) * h;
    ctx.fillText(String(Math.round(val)), x - 4, yy);

    ctx.strokeStyle = '#2A2A3E';
    ctx.beginPath();
    ctx.moveTo(x, yy);
    ctx.lineTo(x + w, yy);
    ctx.stroke();
  }

  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  for (let i = 0; i <= xTickCount; i++) {
    const day = Math.round((i / xTickCount) * 30);
    const xx = x + (i / xTickCount) * w;
    ctx.fillText(`${day}天`, xx, y + h + 4);
  }
}

function drawArea(
  ctx: CanvasRenderingContext2D,
  data: SIRDataPoint[],
  plotX: number,
  plotY: number,
  plotW: number,
  plotH: number,
  key: 'susceptible' | 'infected' | 'recovered',
  fillColor: string,
  _lineColor: string
): void {
  const maxDay = data[data.length - 1].day;
  const yMax = 500;
  const getX = (day: number) => plotX + (day / Math.max(maxDay, 1)) * plotW;
  const getY = (val: number) => plotY + plotH - (val / yMax) * plotH;

  ctx.fillStyle = fillColor;
  ctx.beginPath();
  ctx.moveTo(getX(data[0].day), plotY + plotH);
  for (let i = 0; i < data.length; i++) {
    ctx.lineTo(getX(data[i].day), getY(data[i][key]));
  }
  ctx.lineTo(getX(data[data.length - 1].day), plotY + plotH);
  ctx.closePath();
  ctx.fill();
}

function drawLine(
  ctx: CanvasRenderingContext2D,
  data: SIRDataPoint[],
  getX: (day: number) => number,
  getY: (val: number) => number,
  key: 'susceptible' | 'infected' | 'recovered',
  color: string
): void {
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(getX(data[0].day), getY(data[0][key]));
  for (let i = 1; i < data.length; i++) {
    ctx.lineTo(getX(data[i].day), getY(data[i][key]));
  }
  ctx.stroke();
}

export function updateTooltip(
  tooltip: HTMLElement,
  visible: boolean,
  mouseX: number,
  mouseY: number,
  content: string
): void {
  if (visible) {
    tooltip.textContent = content;
    tooltip.style.left = `${mouseX + 10}px`;
    tooltip.style.top = `${mouseY + 10}px`;
    tooltip.classList.add('visible');
  } else {
    tooltip.classList.remove('visible');
  }
}

export function screenToGrid(
  config: RenderConfig,
  screenX: number,
  screenY: number
): { gridX: number; gridY: number; inside: boolean } {
  const { gridSize, cellSize, offsetX, offsetY } = config;
  const gridX = Math.floor((screenX - offsetX) / cellSize);
  const gridY = Math.floor((screenY - offsetY) / cellSize);
  const inside = gridX >= 0 && gridX < gridSize && gridY >= 0 && gridY < gridSize;
  return { gridX, gridY, inside };
}
