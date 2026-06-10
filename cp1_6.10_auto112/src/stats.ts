interface HistoryPoint {
  round: number;
  herbivores: number;
  carnivores: number;
  plants: number;
}

const MAX_HISTORY = 200;
const CHART_WIDTH = 250;
const CHART_HEIGHT = 400;
const Y_MAX = 60;

const COLOR_HERBIVORE = '#4caf50';
const COLOR_CARNIVORE = '#f44336';
const COLOR_PLANT = '#1b5e20';

export class StatsPanel {
  private container: HTMLElement;
  private roundElement: HTMLElement;
  private herbCountElement: HTMLElement;
  private carnCountElement: HTMLElement;
  private plantCountElement: HTMLElement;
  private chartCanvas: HTMLCanvasElement;
  private chartCtx: CanvasRenderingContext2D;

  private history: HistoryPoint[] = [];
  private round: number = 0;
  private startRound: number = 0;

  constructor(container: HTMLElement) {
    this.container = container;
    this.container.innerHTML = '';

    const title = document.createElement('div');
    title.style.fontSize = '18px';
    title.style.fontWeight = 'bold';
    title.style.marginBottom = '20px';
    title.style.color = '#ffffff';
    title.textContent = '生态统计面板';
    this.container.appendChild(title);

    this.roundElement = this.createStatRow('回合数: ', '0', '#ffffff');
    this.herbCountElement = this.createStatRow('食草动物: ', '0', COLOR_HERBIVORE);
    this.carnCountElement = this.createStatRow('食肉动物: ', '0', COLOR_CARNIVORE);
    this.plantCountElement = this.createStatRow('植物: ', '0', COLOR_PLANT);

    const legend = document.createElement('div');
    legend.style.marginTop = '20px';
    legend.style.marginBottom = '10px';
    legend.style.fontSize = '13px';
    legend.innerHTML = `
      <div style="display:flex;align-items:center;margin-bottom:6px;">
        <span style="display:inline-block;width:16px;height:3px;background:${COLOR_HERBIVORE};margin-right:8px;"></span>
        <span style="color:${COLOR_HERBIVORE}">食草动物</span>
      </div>
      <div style="display:flex;align-items:center;margin-bottom:6px;">
        <span style="display:inline-block;width:16px;height:3px;background:${COLOR_CARNIVORE};margin-right:8px;"></span>
        <span style="color:${COLOR_CARNIVORE}">食肉动物</span>
      </div>
      <div style="display:flex;align-items:center;">
        <span style="display:inline-block;width:16px;height:3px;background:${COLOR_PLANT};margin-right:8px;"></span>
        <span style="color:${COLOR_PLANT}">植物</span>
      </div>
    `;
    this.container.appendChild(legend);

    this.chartCanvas = document.createElement('canvas');
    this.chartCanvas.width = CHART_WIDTH;
    this.chartCanvas.height = CHART_HEIGHT;
    this.chartCanvas.style.borderRadius = '4px';
    this.chartCanvas.style.backgroundColor = '#1a1a2e';
    this.chartCanvas.style.display = 'block';
    this.chartCanvas.style.marginTop = '16px';
    this.container.appendChild(this.chartCanvas);
    this.chartCtx = this.chartCanvas.getContext('2d')!;
  }

  private createStatRow(label: string, value: string, color: string): HTMLElement {
    const row = document.createElement('div');
    row.style.fontSize = '14px';
    row.style.marginBottom = '12px';
    row.style.fontFamily = '"Courier New", monospace';
    row.innerHTML = `
      <span style="color:#ffffff">${label}</span>
      <span style="color:${color};font-weight:bold">${value}</span>
    `;
    this.container.appendChild(row);
    return row;
  }

  private updateStatRow(el: HTMLElement, label: string, value: string, color: string): void {
    el.innerHTML = `
      <span style="color:#ffffff">${label}</span>
      <span style="color:${color};font-weight:bold">${value}</span>
    `;
  }

  public update(herbivores: number, carnivores: number, plants: number): void {
    this.round++;
    const point: HistoryPoint = {
      round: this.round,
      herbivores,
      carnivores,
      plants
    };
    this.history.push(point);

    if (this.round > 0 && this.round % 100 === 0) {
      const halfLen = Math.floor(this.history.length / 2);
      this.history = this.history.slice(halfLen);
      this.startRound = this.history.length > 0 ? this.history[0].round : this.round;
    }

    if (this.history.length > MAX_HISTORY) {
      this.history.shift();
    }

    this.updateStatRow(this.roundElement, '回合数: ', String(this.round), '#b0bec5');
    this.updateStatRow(this.herbCountElement, '食草动物: ', String(herbivores), COLOR_HERBIVORE);
    this.updateStatRow(this.carnCountElement, '食肉动物: ', String(carnivores), COLOR_CARNIVORE);
    this.updateStatRow(this.plantCountElement, '植物: ', String(plants), COLOR_PLANT);

    this.renderChart();
  }

  public reset(): void {
    this.round = 0;
    this.history = [];
    this.startRound = 0;
    this.update(0, 0, 0);
  }

  private renderChart(): void {
    const ctx = this.chartCtx;
    const w = CHART_WIDTH;
    const h = CHART_HEIGHT;
    const paddingL = 32;
    const paddingR = 10;
    const paddingT = 10;
    const paddingB = 24;
    const chartW = w - paddingL - paddingR;
    const chartH = h - paddingT - paddingB;

    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, w, h);

    ctx.strokeStyle = 'rgba(120, 120, 140, 0.3)';
    ctx.lineWidth = 1;
    const gridSpacingPx = 19;
    for (let gy = paddingT; gy <= paddingT + chartH; gy += gridSpacingPx) {
      ctx.beginPath();
      ctx.moveTo(paddingL, gy);
      ctx.lineTo(paddingL + chartW, gy);
      ctx.stroke();
    }
    for (let gx = paddingL; gx <= paddingL + chartW; gx += gridSpacingPx) {
      ctx.beginPath();
      ctx.moveTo(gx, paddingT);
      ctx.lineTo(gx, paddingT + chartH);
      ctx.stroke();
    }

    ctx.strokeStyle = 'rgba(180, 180, 200, 0.6)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(paddingL, paddingT);
    ctx.lineTo(paddingL, paddingT + chartH);
    ctx.lineTo(paddingL + chartW, paddingT + chartH);
    ctx.stroke();

    ctx.fillStyle = '#b0bec5';
    ctx.font = '10px "Courier New"';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    const ySteps = 6;
    for (let i = 0; i <= ySteps; i++) {
      const val = Math.round((Y_MAX / ySteps) * i);
      const y = paddingT + chartH - (chartH / ySteps) * i;
      ctx.fillText(String(val), paddingL - 4, y);
    }

    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    if (this.history.length > 1) {
      const firstR = this.history[0].round;
      const lastR = this.history[this.history.length - 1].round;
      ctx.fillText(String(firstR), paddingL, paddingT + chartH + 6);
      ctx.fillText(String(lastR), paddingL + chartW, paddingT + chartH + 6);
    }

    const drawAreaLine = (
      getVal: (p: HistoryPoint) => number,
      lineColor: string,
      fillColor: string
    ) => {
      if (this.history.length < 2) return;
      const n = this.history.length;
      ctx.beginPath();
      for (let i = 0; i < n; i++) {
        const p = this.history[i];
        const x = paddingL + (i / (n - 1)) * chartW;
        const y = paddingT + chartH - (Math.min(getVal(p), Y_MAX) / Y_MAX) * chartH;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      const lastX = paddingL + chartW;
      const firstX = paddingL;
      const bottomY = paddingT + chartH;
      ctx.lineTo(lastX, bottomY);
      ctx.lineTo(firstX, bottomY);
      ctx.closePath();
      ctx.fillStyle = fillColor;
      ctx.fill();

      ctx.beginPath();
      for (let i = 0; i < n; i++) {
        const p = this.history[i];
        const x = paddingL + (i / (n - 1)) * chartW;
        const y = paddingT + chartH - (Math.min(getVal(p), Y_MAX) / Y_MAX) * chartH;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.strokeStyle = lineColor;
      ctx.lineWidth = 2;
      ctx.stroke();
    };

    drawAreaLine(
      p => p.plants,
      COLOR_PLANT,
      this.hexToRgba(COLOR_PLANT, 0.3)
    );
    drawAreaLine(
      p => p.herbivores,
      COLOR_HERBIVORE,
      this.hexToRgba(COLOR_HERBIVORE, 0.3)
    );
    drawAreaLine(
      p => p.carnivores,
      COLOR_CARNIVORE,
      this.hexToRgba(COLOR_CARNIVORE, 0.3)
    );
  }

  private hexToRgba(hex: string, alpha: number): string {
    const h = hex.replace('#', '');
    const r = parseInt(h.substring(0, 2), 16);
    const g = parseInt(h.substring(2, 4), 16);
    const b = parseInt(h.substring(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
}
