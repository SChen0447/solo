import type { ChartData, ChartType } from './types';

const COLORS = [
  '#3498db',
  '#e74c3c',
  '#2ecc71',
  '#f39c12',
  '#9b59b6',
  '#1abc9c',
  '#e67e22',
  '#34495e',
];

interface ChartOptions {
  width: number;
  height: number;
  padding: { top: number; right: number; bottom: number; left: number };
  legendWidth: number;
  fontFamily: string;
  animationDuration: number;
  dpr: number;
}

const DEFAULT_OPTIONS: ChartOptions = {
  width: 700,
  height: 360,
  padding: { top: 30, right: 30, bottom: 60, left: 60 },
  legendWidth: 160,
  fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
  animationDuration: 400,
  dpr: window.devicePixelRatio || 1,
};

export class ChartGenerator {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private options: ChartOptions;
  private currentData: ChartData | null = null;
  private targetData: ChartData | null = null;
  private animationProgress: number = 1;
  private animFrame: number | null = null;
  private animStartTime: number = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D context not available');
    this.ctx = ctx;
    this.options = { ...DEFAULT_OPTIONS };
    this.resizeCanvas();
    window.addEventListener('resize', this.onResize.bind(this));
  }

  private onResize(): void {
    this.options.dpr = window.devicePixelRatio || 1;
    this.resizeCanvas();
    this.render();
  }

  private resizeCanvas(): void {
    const { width, height, dpr } = this.options;
    this.canvas.width = width * dpr;
    this.canvas.height = height * dpr;
    this.canvas.style.width = `${width}px`;
    this.canvas.style.height = `${height}px`;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  setSize(width: number, height: number): void {
    this.options.width = width;
    this.options.height = height;
    this.resizeCanvas();
    this.render();
  }

  renderChart(data: ChartData): void {
    if (!data.labels.length || !data.series.length) {
      this.targetData = null;
      this.currentData = null;
      this.renderEmpty();
      return;
    }

    this.targetData = this.cloneData(data);
    if (!this.currentData) {
      this.currentData = this.cloneData(data, true);
    }
    this.startAnimation();
  }

  private cloneData(data: ChartData, zeroed: boolean = false): ChartData {
    return {
      type: data.type,
      labels: [...data.labels],
      series: data.series.map((s) => ({
        name: s.name,
        values: zeroed ? s.values.map(() => 0) : [...s.values],
      })),
    };
  }

  private startAnimation(): void {
    if (this.animFrame) cancelAnimationFrame(this.animFrame);
    this.animStartTime = performance.now();
    this.animationProgress = 0;

    const animate = (now: number) => {
      const elapsed = now - this.animStartTime;
      this.animationProgress = Math.min(elapsed / this.options.animationDuration, 1);
      this.render();
      if (this.animationProgress < 1) {
        this.animFrame = requestAnimationFrame(animate);
      } else {
        this.currentData = this.targetData ? this.cloneData(this.targetData) : null;
        this.animFrame = null;
      }
    };

    this.animFrame = requestAnimationFrame(animate);
  }

  private easeOutCubic(t: number): number {
    return 1 - Math.pow(1 - t, 3);
  }

  private interpolateData(): ChartData | null {
    if (!this.currentData || !this.targetData) return null;

    const t = this.easeOutCubic(this.animationProgress);
    return {
      type: this.targetData.type,
      labels: this.targetData.labels,
      series: this.targetData.series.map((target, i) => {
        const current = this.currentData!.series[i];
        return {
          name: target.name,
          values: target.values.map((v, j) => {
            const cv = current?.values[j] ?? 0;
            return cv + (v - cv) * t;
          }),
        };
      }),
    };
  }

  private renderEmpty(): void {
    const { ctx, options } = this;
    const { width, height } = options;
    ctx.clearRect(0, 0, width, height);

    ctx.fillStyle = '#f8f9fa';
    ctx.fillRect(0, 0, width, height);

    ctx.fillStyle = '#95a5a6';
    ctx.font = `14px ${options.fontFamily}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('请在表格中选择数据区域来生成图表', width / 2, height / 2);
  }

  render(): void {
    const data = this.interpolateData() || this.targetData;
    if (!data) {
      this.renderEmpty();
      return;
    }

    const { ctx, options } = this;
    const { width, height, padding, fontFamily } = options;
    ctx.clearRect(0, 0, width, height);

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);

    const chartArea = {
      x: padding.left,
      y: padding.top,
      width: width - padding.left - padding.right - options.legendWidth,
      height: height - padding.top - padding.bottom,
    };

    switch (data.type) {
      case 'bar':
        this.drawBarChart(data, chartArea);
        break;
      case 'line':
        this.drawLineChart(data, chartArea);
        break;
      case 'pie':
        this.drawPieChart(data, chartArea);
        break;
    }

    this.drawLegend(data, width - options.legendWidth + 20, padding.top, fontFamily);
  }

  private drawAxes(
    chartArea: { x: number; y: number; width: number; height: number },
    maxValue: number,
    labels: string[],
    fontFamily: string
  ): void {
    const { ctx, options } = this;
    const { x, y, width, height } = chartArea;

    ctx.strokeStyle = '#d0d7de';
    ctx.lineWidth = 1;

    ctx.beginPath();
    ctx.moveTo(x + 0.5, y + 0.5);
    ctx.lineTo(x + 0.5, y + height + 0.5);
    ctx.lineTo(x + width + 0.5, y + height + 0.5);
    ctx.stroke();

    ctx.strokeStyle = '#ecf0f1';
    const gridLines = 5;
    for (let i = 0; i <= gridLines; i++) {
      const gy = y + (height * i) / gridLines;
      ctx.beginPath();
      ctx.moveTo(x, gy + 0.5);
      ctx.lineTo(x + width, gy + 0.5);
      ctx.stroke();

      const value = maxValue * (1 - i / gridLines);
      ctx.fillStyle = '#7f8c8d';
      ctx.font = `11px ${fontFamily}`;
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      ctx.fillText(value.toFixed(0), x - 8, gy);
    }

    ctx.fillStyle = '#2c3e50';
    ctx.font = `12px ${fontFamily}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';

    const labelStep = Math.max(1, Math.floor(labels.length / 10));
    labels.forEach((label, i) => {
      if (i % labelStep !== 0 && i !== labels.length - 1) return;
      const lx = x + ((i + 0.5) * width) / labels.length;
      ctx.fillText(label, lx, y + height + 8);
    });
  }

  private drawBarChart(
    data: ChartData,
    chartArea: { x: number; y: number; width: number; height: number }
  ): void {
    const { ctx, options } = this;
    const { x, y, width, height } = chartArea;
    const { fontFamily } = options;

    let maxValue = 0;
    data.series.forEach((s) => s.values.forEach((v) => (maxValue = Math.max(maxValue, v))));
    maxValue = maxValue * 1.1 || 1;

    this.drawAxes(chartArea, maxValue, data.labels, fontFamily);

    const numSeries = data.series.length;
    const numLabels = data.labels.length;
    const groupWidth = width / numLabels;
    const barPadding = 4;
    const totalBarWidth = groupWidth - barPadding * 2;
    const barWidth = (totalBarWidth - (numSeries - 1) * 2) / numSeries;

    data.series.forEach((series, si) => {
      const color = COLORS[si % COLORS.length];
      series.values.forEach((value, li) => {
        const barHeight = (value / maxValue) * height;
        const bx = x + li * groupWidth + barPadding + si * (barWidth + 2);
        const by = y + height - barHeight;

        const gradient = ctx.createLinearGradient(bx, by, bx, by + barHeight);
        gradient.addColorStop(0, color);
        gradient.addColorStop(1, this.lightenColor(color, 30));

        ctx.fillStyle = gradient;
        this.roundRect(bx, by, barWidth, barHeight, 2);
        ctx.fill();

        if (barHeight > 20) {
          ctx.fillStyle = '#ffffff';
          ctx.font = `bold 10px ${fontFamily}`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'top';
          ctx.fillText(value.toFixed(1), bx + barWidth / 2, by + 4);
        }
      });
    });
  }

  private drawLineChart(
    data: ChartData,
    chartArea: { x: number; y: number; width: number; height: number }
  ): void {
    const { ctx, options } = this;
    const { x, y, width, height } = chartArea;
    const { fontFamily } = options;

    let maxValue = 0;
    data.series.forEach((s) => s.values.forEach((v) => (maxValue = Math.max(maxValue, v))));
    maxValue = maxValue * 1.1 || 1;

    this.drawAxes(chartArea, maxValue, data.labels, fontFamily);

    const numLabels = data.labels.length;

    data.series.forEach((series, si) => {
      const color = COLORS[si % COLORS.length];
      const points: { px: number; py: number }[] = [];

      series.values.forEach((value, li) => {
        const px = x + ((li + 0.5) * width) / numLabels;
        const py = y + height - (value / maxValue) * height;
        points.push({ px, py });
      });

      if (points.length > 0) {
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(points[0].px, y + height);
        points.forEach((p) => ctx.lineTo(p.px, p.py));
        ctx.lineTo(points[points.length - 1].px, y + height);
        ctx.closePath();

        const gradient = ctx.createLinearGradient(0, y, 0, y + height);
        gradient.addColorStop(0, color + '44');
        gradient.addColorStop(1, color + '00');
        ctx.fillStyle = gradient;
        ctx.fill();
        ctx.restore();
      }

      ctx.beginPath();
      ctx.strokeStyle = color;
      ctx.lineWidth = 2.5;
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      points.forEach((p, i) => {
        if (i === 0) ctx.moveTo(p.px, p.py);
        else ctx.lineTo(p.px, p.py);
      });
      ctx.stroke();

      points.forEach((p) => {
        ctx.beginPath();
        ctx.arc(p.px, p.py, 5, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.fill();
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.fillStyle = color;
        ctx.font = `bold 10px ${fontFamily}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        ctx.fillText(series.values[points.indexOf(p)].toFixed(1), p.px, p.py - 8);
      });
    });
  }

  private drawPieChart(
    data: ChartData,
    chartArea: { x: number; y: number; width: number; height: number }
  ): void {
    const { ctx, options } = this;
    const { fontFamily } = options;

    const cx = chartArea.x + chartArea.width / 2;
    const cy = chartArea.y + chartArea.height / 2;
    const radius = Math.min(chartArea.width, chartArea.height) / 2 - 20;

    const values = data.series[0]?.values || [];
    if (values.length === 0) return;

    const total = values.reduce((a, b) => a + b, 0);
    if (total === 0) return;

    let startAngle = -Math.PI / 2;
    const labels = data.labels;

    values.forEach((value, i) => {
      const color = COLORS[i % COLORS.length];
      const sliceAngle = (value / total) * Math.PI * 2;
      const endAngle = startAngle + sliceAngle;

      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, radius, startAngle, endAngle);
      ctx.closePath();

      const gradient = ctx.createRadialGradient(cx, cy, radius * 0.3, cx, cy, radius);
      gradient.addColorStop(0, this.lightenColor(color, 20));
      gradient.addColorStop(1, color);
      ctx.fillStyle = gradient;
      ctx.fill();

      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.stroke();

      const midAngle = startAngle + sliceAngle / 2;
      const labelRadius = radius * 0.65;
      const lx = cx + Math.cos(midAngle) * labelRadius;
      const ly = cy + Math.sin(midAngle) * labelRadius;
      const percent = ((value / total) * 100).toFixed(1);

      ctx.fillStyle = '#ffffff';
      ctx.font = `bold 12px ${fontFamily}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`${percent}%`, lx, ly);

      startAngle = endAngle;
    });
  }

  private drawLegend(
    data: ChartData,
    x: number,
    y: number,
    fontFamily: string
  ): void {
    const { ctx } = this;
    const itemHeight = 28;
    const itemWidth = 140;

    const series = data.type === 'pie'
      ? data.labels.map((label, i) => ({ name: label, color: COLORS[i % COLORS.length] }))
      : data.series.map((s, i) => ({ name: s.name, color: COLORS[i % COLORS.length] }));

    ctx.fillStyle = '#2c3e50';
    ctx.font = `bold 12px ${fontFamily}`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText('图例', x, y);

    series.forEach((item, i) => {
      const ly = y + 24 + i * itemHeight;

      ctx.fillStyle = item.color;
      this.roundRect(x, ly, 16, 16, 3);
      ctx.fill();

      ctx.fillStyle = '#555555';
      ctx.font = `12px ${fontFamily}`;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      const displayName = item.name.length > 14 ? item.name.slice(0, 14) + '…' : item.name;
      ctx.fillText(displayName, x + 24, ly + 8);
    });
  }

  private roundRect(x: number, y: number, w: number, h: number, r: number): void {
    const { ctx } = this;
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  private lightenColor(hex: string, percent: number): string {
    const num = parseInt(hex.slice(1), 16);
    const amt = Math.round(2.55 * percent);
    const R = Math.min(255, (num >> 16) + amt);
    const G = Math.min(255, ((num >> 8) & 0x00ff) + amt);
    const B = Math.min(255, (num & 0x0000ff) + amt);
    return '#' + (0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1);
  }

  destroy(): void {
    if (this.animFrame) cancelAnimationFrame(this.animFrame);
    window.removeEventListener('resize', this.onResize.bind(this));
  }
}
