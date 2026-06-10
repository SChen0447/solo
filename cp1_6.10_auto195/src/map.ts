import {
  getState,
  setSelectedStation,
  getAQIColor,
  getCurrentHourlyData,
  StationData,
  HourlyData,
  POLLUTANT_COLORS,
  POLLUTANT_NAMES,
  PollutantRatio
} from './main';

interface MarkerState {
  targetColor: string;
  currentColor: string;
  colorStartTime: number;
  hovered: boolean;
  hoverTimer: number | null;
  scale: number;
  scaleStartTime: number;
  visible: boolean;
  visibleStartTime: number;
}

interface ModalState {
  open: boolean;
  stationId: number;
  fadeIn: number;
}

export class MapView {
  private container: HTMLElement;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private markers: Map<number, MarkerState> = new Map();
  private modal: ModalState = { open: false, stationId: 0, fadeIn: 0 };
  private modalEl: HTMLElement | null = null;
  private pieCanvas: HTMLCanvasElement | null = null;
  private lineCanvas: HTMLCanvasElement | null = null;
  private clockEl: HTMLElement | null = null;
  private fadeOpacity: number = 1;
  private fadeTarget: number = 1;
  private fadeStartTime: number = 0;
  private isFading: boolean = false;
  private lastDate: string = '';
  private markersAnimated: boolean = false;

  constructor(container: HTMLElement) {
    this.container = container;
    this.canvas = document.createElement('canvas');
    this.canvas.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
    `;
    this.ctx = this.canvas.getContext('2d')!;
    container.appendChild(this.canvas);

    this.createClock();
    this.initMarkers();
    this.setupEvents();
    this.handleResize();

    const state = getState();
    this.lastDate = state.selectedDate;
    setInterval(() => {
      const curState = getState();
      if (curState.selectedDate !== this.lastDate) {
        this.lastDate = curState.selectedDate;
        this.startFadeTransition();
      }
    }, 50);
  }

  private createClock(): void {
    this.clockEl = document.createElement('div');
    this.clockEl.style.cssText = `
      position: absolute;
      top: 20px;
      left: 50%;
      transform: translateX(-50%);
      font-family: 'Courier New', monospace;
      font-size: 24px;
      color: #00d2ff;
      font-weight: bold;
      letter-spacing: 3px;
      text-shadow: 0 0 15px rgba(0, 210, 255, 0.7);
      z-index: 5;
      pointer-events: none;
    `;
    this.container.appendChild(this.clockEl);
  }

  private initMarkers(): void {
    const state = getState();
    state.stations.forEach((station) => {
      const hourly = getCurrentHourlyData(station, state.selectedDate, state.currentHour);
      const color = getAQIColor(hourly.aqi);
      this.markers.set(station.id, {
        targetColor: color,
        currentColor: color,
        colorStartTime: 0,
        hovered: false,
        hoverTimer: null,
        scale: 0,
        scaleStartTime: 0,
        visible: false,
        visibleStartTime: 0
      });
    });
  }

  private setupEvents(): void {
    this.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
    this.canvas.addEventListener('mouseleave', () => this.handleMouseLeave());
    this.canvas.addEventListener('click', (e) => this.handleClick(e));
  }

  handleResize(): void {
    const rect = this.container.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = rect.width * dpr;
    this.canvas.height = rect.height * dpr;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  private getGridCellSize(): { cellW: number; cellH: number; offsetX: number; offsetY: number } {
    const rect = this.container.getBoundingClientRect();
    const padding = 60;
    const gridW = rect.width - padding * 2;
    const gridH = rect.height - padding * 2;
    return {
      cellW: gridW / 8,
      cellH: gridH / 6,
      offsetX: padding,
      offsetY: padding
    };
  }

  private getMarkerPosition(station: StationData): { x: number; y: number } {
    const { cellW, cellH, offsetX, offsetY } = this.getGridCellSize();
    return {
      x: offsetX + station.x * cellW + cellW / 2,
      y: offsetY + station.y * cellH + cellH / 2
    };
  }

  private handleMouseMove(e: MouseEvent): void {
    const rect = this.canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const state = getState();
    let found = false;

    state.stations.forEach((station) => {
      const pos = this.getMarkerPosition(station);
      const markerState = this.markers.get(station.id)!;
      const dist = Math.sqrt((mx - pos.x) ** 2 + (my - pos.y) ** 2);
      const radius = 26;

      if (dist <= radius && !found) {
        found = true;
        if (!markerState.hovered) {
          markerState.hovered = true;
          markerState.scaleStartTime = performance.now();
          if (markerState.hoverTimer) clearTimeout(markerState.hoverTimer);
          markerState.hoverTimer = window.setTimeout(() => {
            this.showTooltip(station.name, pos.x, pos.y);
          }, 500);
        }
      } else {
        if (markerState.hovered) {
          markerState.hovered = false;
          markerState.scaleStartTime = performance.now();
          if (markerState.hoverTimer) {
            clearTimeout(markerState.hoverTimer);
            markerState.hoverTimer = null;
          }
          this.hideTooltip();
        }
      }
    });
  }

  private handleMouseLeave(): void {
    this.markers.forEach((m) => {
      if (m.hovered) {
        m.hovered = false;
        m.scaleStartTime = performance.now();
        if (m.hoverTimer) {
          clearTimeout(m.hoverTimer);
          m.hoverTimer = null;
        }
      }
    });
    this.hideTooltip();
  }

  private handleClick(e: MouseEvent): void {
    const rect = this.canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const state = getState();

    state.stations.forEach((station) => {
      const pos = this.getMarkerPosition(station);
      const dist = Math.sqrt((mx - pos.x) ** 2 + (my - pos.y) ** 2);
      if (dist <= 26) {
        setSelectedStation(station.id);
        this.openModal(station.id);
      }
    });
  }

  private tooltipEl: HTMLElement | null = null;

  private showTooltip(text: string, x: number, y: number): void {
    if (!this.tooltipEl) {
      this.tooltipEl = document.createElement('div');
      this.tooltipEl.style.cssText = `
        position: absolute;
        background: rgba(26, 39, 68, 0.95);
        border: 1px solid rgba(0, 210, 255, 0.5);
        color: #ffffff;
        padding: 8px 14px;
        border-radius: 6px;
        font-size: 13px;
        pointer-events: none;
        z-index: 20;
        box-shadow: 0 0 15px rgba(0, 210, 255, 0.3);
        white-space: nowrap;
      `;
      this.container.appendChild(this.tooltipEl);
    }
    this.tooltipEl.textContent = text;
    this.tooltipEl.style.display = 'block';
    const tipW = this.tooltipEl.offsetWidth;
    this.tooltipEl.style.left = `${x - tipW / 2}px`;
    this.tooltipEl.style.top = `${y - 50}px`;
  }

  private hideTooltip(): void {
    if (this.tooltipEl) {
      this.tooltipEl.style.display = 'none';
    }
  }

  private openModal(stationId: number): void {
    this.modal = { open: true, stationId, fadeIn: 0 };
    this.renderModal();
  }

  private closeModal(): void {
    this.modal.open = false;
    if (this.modalEl) {
      this.modalEl.remove();
      this.modalEl = null;
    }
  }

  private renderModal(): void {
    if (this.modalEl) this.modalEl.remove();

    const overlay = document.createElement('div');
    overlay.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.7);
      z-index: 100;
      display: flex;
      align-items: center;
      justify-content: center;
    `;
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) this.closeModal();
    });

    const modal = document.createElement('div');
    modal.style.cssText = `
      width: 400px;
      height: 300px;
      background: linear-gradient(180deg, #1a2744 0%, #24344c 100%);
      border-radius: 12px;
      border: 1px solid rgba(0, 210, 255, 0.3);
      box-shadow: 0 0 30px rgba(0, 210, 255, 0.2);
      padding: 20px;
      position: relative;
    `;

    const state = getState();
    const station = state.stations.find(s => s.id === this.modal.stationId)!;

    const header = document.createElement('div');
    header.style.cssText = `
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 15px;
    `;
    const title = document.createElement('h3');
    title.style.cssText = `color: #00d2ff; font-size: 16px; margin: 0; font-weight: 600;`;
    title.textContent = station.name;
    const closeBtn = document.createElement('button');
    closeBtn.style.cssText = `
      background: none;
      border: none;
      color: #8fb8d4;
      font-size: 20px;
      cursor: pointer;
      line-height: 1;
      padding: 0;
    `;
    closeBtn.textContent = '×';
    closeBtn.addEventListener('click', () => this.closeModal());
    header.appendChild(title);
    header.appendChild(closeBtn);

    const charts = document.createElement('div');
    charts.style.cssText = `
      display: flex;
      gap: 15px;
      height: calc(100% - 40px);
    `;

    this.pieCanvas = document.createElement('canvas');
    this.pieCanvas.width = 140 * 2;
    this.pieCanvas.height = 140 * 2;
    this.pieCanvas.style.cssText = `width: 140px; height: 140px;`;

    this.lineCanvas = document.createElement('canvas');
    this.lineCanvas.width = 200 * 2;
    this.lineCanvas.height = 140 * 2;
    this.lineCanvas.style.cssText = `width: 200px; height: 140px;`;

    charts.appendChild(this.pieCanvas);
    charts.appendChild(this.lineCanvas);
    modal.appendChild(header);
    modal.appendChild(charts);
    overlay.appendChild(modal);
    this.container.appendChild(overlay);
    this.modalEl = overlay;

    this.drawPieChart();
    this.drawLineChart();
  }

  private hexToRgb(hex: string): { r: number; g: number; b: number } {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16)
        }
      : { r: 0, g: 0, b: 0 };
  }

  private interpolateColor(c1: string, c2: string, t: number): string {
    const rgb1 = this.hexToRgb(c1);
    const rgb2 = this.hexToRgb(c2);
    const r = Math.round(rgb1.r + (rgb2.r - rgb1.r) * t);
    const g = Math.round(rgb1.g + (rgb2.g - rgb1.g) * t);
    const b = Math.round(rgb1.b + (rgb2.b - rgb1.b) * t);
    return `rgb(${r}, ${g}, ${b})`;
  }

  private easeOut(t: number): number {
    return 1 - Math.pow(1 - t, 3);
  }

  playMarkersAnimation(): void {
    this.markersAnimated = true;
    const state = getState();
    state.stations.forEach((station, i) => {
      setTimeout(() => {
        const m = this.markers.get(station.id);
        if (m) {
          m.visible = true;
          m.visibleStartTime = performance.now();
          m.scaleStartTime = performance.now();
        }
      }, i * 150);
    });
  }

  private startFadeTransition(): void {
    this.isFading = true;
    this.fadeStartTime = performance.now();
    this.fadeTarget = 0;
  }

  render(): void {
    const state = getState();
    const now = performance.now();
    const rect = this.container.getBoundingClientRect();

    if (this.isFading) {
      const elapsed = now - this.fadeStartTime;
      const t = Math.min(elapsed / 250, 1);
      if (this.fadeTarget === 0) {
        this.fadeOpacity = 1 - this.easeOut(t);
        if (t >= 1) {
          this.fadeTarget = 1;
          this.fadeStartTime = now;
          state.stations.forEach((station) => {
            const m = this.markers.get(station.id);
            if (m) {
              const hourly = getCurrentHourlyData(station, state.selectedDate, state.currentHour);
              const newColor = getAQIColor(hourly.aqi);
              m.targetColor = newColor;
              m.currentColor = newColor;
            }
          });
        }
      } else {
        this.fadeOpacity = this.easeOut(t);
        if (t >= 1) {
          this.isFading = false;
          this.fadeOpacity = 1;
        }
      }
    }

    this.ctx.clearRect(0, 0, rect.width, rect.height);
    this.ctx.globalAlpha = this.fadeOpacity;

    this.drawGrid(rect);
    this.drawMarkers(now, state);

    this.ctx.globalAlpha = 1;

    this.updateClock(state.currentHour);
  }

  private updateClock(hour: number): void {
    if (!this.clockEl) return;
    const date = new Date();
    const state = getState();
    if (state.selectedDate === 'yesterday') {
      date.setDate(date.getDate() - 1);
    }
    const dateStr = `${date.getMonth() + 1}/${date.getDate()}`;
    const sec = Math.floor(performance.now() / 1000);
    const colon = sec % 2 === 0 ? ':' : ' ';
    this.clockEl.textContent = `${dateStr} ${String(hour).padStart(2, '0')}${colon}00`;
  }

  private drawGrid(rect: DOMRect): void {
    const { cellW, cellH, offsetX, offsetY } = this.getGridCellSize();

    const gradient = this.ctx.createLinearGradient(0, 0, 0, rect.height);
    gradient.addColorStop(0, '#1a2744');
    gradient.addColorStop(1, '#24344c');
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, rect.width, rect.height);

    this.ctx.strokeStyle = 'rgba(0, 210, 255, 0.08)';
    this.ctx.lineWidth = 1;

    for (let i = 0; i <= 8; i++) {
      this.ctx.beginPath();
      this.ctx.moveTo(offsetX + i * cellW, offsetY);
      this.ctx.lineTo(offsetX + i * cellW, offsetY + 6 * cellH);
      this.ctx.stroke();
    }
    for (let j = 0; j <= 6; j++) {
      this.ctx.beginPath();
      this.ctx.moveTo(offsetX, offsetY + j * cellH);
      this.ctx.lineTo(offsetX + 8 * cellW, offsetY + j * cellH);
      this.ctx.stroke();
    }

    this.ctx.fillStyle = 'rgba(0, 210, 255, 0.03)';
    for (let i = 0; i < 8; i++) {
      for (let j = 0; j < 6; j++) {
        if ((i + j) % 2 === 0) {
          this.ctx.fillRect(offsetX + i * cellW, offsetY + j * cellH, cellW, cellH);
        }
      }
    }
  }

  private drawMarkers(now: number, state: ReturnType<typeof getState>): void {
    state.stations.forEach((station) => {
      const m = this.markers.get(station.id);
      if (!m) return;

      const hourly = getCurrentHourlyData(station, state.selectedDate, state.currentHour);
      const newTargetColor = getAQIColor(hourly.aqi);
      if (newTargetColor !== m.targetColor) {
        m.currentColor = m.targetColor;
        m.targetColor = newTargetColor;
        m.colorStartTime = now;
      }

      let colorT = 1;
      if (m.colorStartTime > 0) {
        colorT = Math.min((now - m.colorStartTime) / 300, 1);
      }
      const displayColor = this.interpolateColor(m.currentColor, m.targetColor, this.easeOut(colorT));

      let scale = 1;
      if (this.markersAnimated && m.visible) {
        const visT = Math.min((now - m.visibleStartTime) / 400, 1);
        scale = this.easeOut(visT);
      } else if (!this.markersAnimated) {
        scale = 1;
      }

      if (m.hovered || !m.hovered && m.scaleStartTime > 0) {
        const hoverT = Math.min((now - m.scaleStartTime) / 200, 1);
        const baseR = 20;
        const targetR = m.hovered ? 26 : 20;
        const hoverScale = baseR + (targetR - baseR) * this.easeOut(hoverT);
        scale *= hoverScale / 20;
      }

      const pos = this.getMarkerPosition(station);
      this.drawMarker(pos.x, pos.y, 20 * scale, displayColor, String(hourly.aqi), station.id === state.selectedStationId);
    });
  }

  private drawMarker(x: number, y: number, r: number, color: string, text: string, selected: boolean): void {
    this.ctx.save();
    this.ctx.shadowColor = 'rgba(255, 255, 255, 0.8)';
    this.ctx.shadowBlur = selected ? 20 : 10;

    this.ctx.beginPath();
    this.ctx.arc(x, y, r, 0, Math.PI * 2);
    this.ctx.fillStyle = color;
    this.ctx.fill();

    this.ctx.lineWidth = 2;
    this.ctx.strokeStyle = '#ffffff';
    this.ctx.stroke();

    this.ctx.restore();

    this.ctx.save();
    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = 'bold 16px "Segoe UI", sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText(text, x, y);
    this.ctx.restore();

    if (selected) {
      this.ctx.save();
      this.ctx.strokeStyle = 'rgba(0, 210, 255, 0.6)';
      this.ctx.lineWidth = 2;
      this.ctx.setLineDash([5, 5]);
      this.ctx.beginPath();
      this.ctx.arc(x, y, r + 8, 0, Math.PI * 2);
      this.ctx.stroke();
      this.ctx.restore();
    }
  }

  private drawPieChart(): void {
    if (!this.pieCanvas) return;
    const ctx = this.pieCanvas.getContext('2d')!;
    const dpr = 2;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const w = 140, h = 140;
    ctx.clearRect(0, 0, w, h);

    const state = getState();
    const station = state.stations.find(s => s.id === this.modal.stationId)!;
    const hourly = getCurrentHourlyData(station, state.selectedDate, state.currentHour);

    const cx = w / 2, cy = h / 2 + 10;
    const radius = 45;

    const pollutants: PollutantRatio = hourly.pollutants;
    const entries = (Object.keys(pollutants) as (keyof PollutantRatio)[]).map(key => ({
      key,
      value: pollutants[key],
      color: POLLUTANT_COLORS[key],
      name: POLLUTANT_NAMES[key]
    }));

    let startAngle = -Math.PI / 2;
    const total = entries.reduce((sum, e) => sum + e.value, 0);

    entries.forEach((e) => {
      const sliceAngle = (e.value / total) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, radius, startAngle, startAngle + sliceAngle);
      ctx.closePath();
      ctx.fillStyle = e.color;
      ctx.fill();
      ctx.strokeStyle = 'rgba(26, 39, 68, 0.8)';
      ctx.lineWidth = 2;
      ctx.stroke();

      const midAngle = startAngle + sliceAngle / 2;
      const labelR = radius * 0.65;
      const lx = cx + Math.cos(midAngle) * labelR;
      const ly = cy + Math.sin(midAngle) * labelR;
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 10px "Segoe UI", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const pct = Math.round((e.value / total) * 100);
      ctx.fillText(`${pct}%`, lx, ly);

      startAngle += sliceAngle;
    });

    const legendY = h - 18;
    const legendItemW = w / entries.length;
    entries.forEach((e, i) => {
      const lx = i * legendItemW + 8;
      ctx.fillStyle = e.color;
      ctx.fillRect(lx, legendY, 8, 8);
      ctx.fillStyle = '#8fb8d4';
      ctx.font = '9px "Segoe UI", sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(e.name, lx + 12, legendY + 4);
    });
  }

  private drawLineChart(): void {
    if (!this.lineCanvas) return;
    const ctx = this.lineCanvas.getContext('2d')!;
    const dpr = 2;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const w = 200, h = 140;
    ctx.clearRect(0, 0, w, h);

    const state = getState();
    const station = state.stations.find(s => s.id === this.modal.stationId)!;
    const dataSource = state.selectedDate === 'today' ? station.today : station.yesterday;

    const sampleCount = 12;
    const step = Math.floor(24 / sampleCount);
    const data: HourlyData[] = [];
    for (let i = 0; i < 24; i += step) {
      data.push(dataSource[i]);
    }

    const padding = { top: 15, right: 10, bottom: 25, left: 30 };
    const chartW = w - padding.left - padding.right;
    const chartH = h - padding.top - padding.bottom;

    ctx.strokeStyle = 'rgba(0, 210, 255, 0.1)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const y = padding.top + (chartH / 4) * i;
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(w - padding.right, y);
      ctx.stroke();
    }

    ctx.fillStyle = '#6a8ca8';
    ctx.font = '8px "Segoe UI", sans-serif';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    const yLabels = [0, 125, 250, 375, 500];
    yLabels.forEach((val, i) => {
      const y = padding.top + chartH - (chartH / 4) * i;
      ctx.fillText(String(val), padding.left - 4, y);
    });

    ctx.textAlign = 'center';
    for (let i = 0; i < sampleCount; i += 3) {
      const x = padding.left + (chartW / (sampleCount - 1)) * i;
      ctx.fillText(`${String(i * step).padStart(2, '0')}h`, x, h - padding.bottom + 12);
    }

    const points = data.map((d, i) => ({
      x: padding.left + (chartW / (sampleCount - 1)) * i,
      y: padding.top + chartH - (d.aqi / 500) * chartH
    }));

    const grad = ctx.createLinearGradient(0, padding.top, 0, padding.top + chartH);
    grad.addColorStop(0, 'rgba(0, 210, 255, 0.4)');
    grad.addColorStop(1, 'rgba(0, 210, 255, 0.02)');

    ctx.beginPath();
    ctx.moveTo(points[0].x, padding.top + chartH);
    points.forEach((p, i) => {
      if (i === 0) {
        ctx.lineTo(p.x, p.y);
      } else {
        const prev = points[i - 1];
        const cpx = (prev.x + p.x) / 2;
        ctx.bezierCurveTo(cpx, prev.y, cpx, p.y, p.x, p.y);
      }
    });
    ctx.lineTo(points[points.length - 1].x, padding.top + chartH);
    ctx.closePath();
    ctx.fillStyle = grad;
    ctx.fill();

    ctx.beginPath();
    points.forEach((p, i) => {
      if (i === 0) {
        ctx.moveTo(p.x, p.y);
      } else {
        const prev = points[i - 1];
        const cpx = (prev.x + p.x) / 2;
        ctx.bezierCurveTo(cpx, prev.y, cpx, p.y, p.x, p.y);
      }
    });
    ctx.strokeStyle = '#00d2ff';
    ctx.lineWidth = 2;
    ctx.lineJoin = 'round';
    ctx.stroke();

    points.forEach((p) => {
      ctx.beginPath();
      ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
      ctx.fillStyle = '#00d2ff';
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1;
      ctx.stroke();
    });

    ctx.fillStyle = '#8fb8d4';
    ctx.font = '9px "Segoe UI", sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('24小时AQI趋势', padding.left, 8);
  }
}
