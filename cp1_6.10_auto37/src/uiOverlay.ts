import type { GlobalStats, NodeStats } from './dataSimulator';

export class UIOverlay {
  private avgLatencyEl: HTMLElement;
  private throughputEl: HTMLElement;
  private activeConnsEl: HTMLElement;
  private congestionEl: HTMLElement;
  private fpsEl: HTMLElement;
  private timerEl: HTMLElement;

  private lastValues: Map<string, number> = new Map();
  private flashTimeouts: Map<string, number> = new Map();

  private fpsFrames: number = 0;
  private fpsLastTime: number = performance.now();
  private currentFps: number = 60;

  private startTime: number = 0;
  private isRunning: boolean = false;

  constructor() {
    this.avgLatencyEl = document.getElementById('avg-latency')!;
    this.throughputEl = document.getElementById('throughput')!;
    this.activeConnsEl = document.getElementById('active-conns')!;
    this.congestionEl = document.getElementById('congestion')!;
    this.fpsEl = document.getElementById('fps-val')!;
    this.timerEl = document.getElementById('timer-val')!;
  }

  start(): void {
    this.isRunning = true;
    this.startTime = performance.now();
    this.updateTimer();
  }

  updateStats(stats: GlobalStats): void {
    this.updateValue(this.avgLatencyEl, 'avg-latency', stats.avgLatency, ' ms', 1);
    this.updateValue(this.throughputEl, 'throughput', stats.throughput, ' MB/s', 2);
    this.updateValue(this.activeConnsEl, 'active-conns', stats.activeConnections, '', 0);
    this.updateValue(this.congestionEl, 'congestion', stats.congestionRatio * 100, '%', 1);
  }

  private updateValue(
    el: HTMLElement,
    key: string,
    value: number,
    suffix: string,
    decimals: number
  ): void {
    const last = this.lastValues.get(key);
    const rounded = Number(value.toFixed(decimals));

    if (last === undefined || Math.abs(rounded - last) > 0.001) {
      this.flash(el, key);
      this.lastValues.set(key, rounded);
    }

    el.textContent = `${rounded.toFixed(decimals)}${suffix}`;
  }

  private flash(el: HTMLElement, key: string): void {
    el.classList.add('flash');

    const existing = this.flashTimeouts.get(key);
    if (existing !== undefined) {
      window.clearTimeout(existing);
    }

    const timeout = window.setTimeout(() => {
      el.classList.remove('flash');
      this.flashTimeouts.delete(key);
    }, 300);

    this.flashTimeouts.set(key, timeout);
  }

  updateFps(): void {
    this.fpsFrames++;
    const now = performance.now();
    if (now - this.fpsLastTime >= 1000) {
      this.currentFps = Math.round(this.fpsFrames * 1000 / (now - this.fpsLastTime));
      this.fpsEl.textContent = String(this.currentFps);
      this.fpsFrames = 0;
      this.fpsLastTime = now;
    }
  }

  getCurrentFps(): number {
    return this.currentFps;
  }

  private updateTimer(): void {
    if (!this.isRunning) return;

    const elapsed = Math.floor((performance.now() - this.startTime) / 1000);
    const minutes = Math.floor(elapsed / 60).toString().padStart(2, '0');
    const seconds = (elapsed % 60).toString().padStart(2, '0');
    this.timerEl.textContent = `${minutes}:${seconds}`;

    requestAnimationFrame(() => this.updateTimer());
  }

  createTooltip(nodeId: number, stats: NodeStats): HTMLDivElement {
    const tooltip = document.createElement('div');
    tooltip.className = 'tooltip';
    tooltip.innerHTML = `
      <div class="tooltip-title">◈ NODE-${nodeId.toString().padStart(3, '0')}</div>
      <div class="tooltip-row">
        <span class="tooltip-label">Connections</span>
        <span class="tooltip-val">${stats.connectionCount}</span>
      </div>
      <div class="tooltip-row">
        <span class="tooltip-label">Total Traffic</span>
        <span class="tooltip-val">${stats.totalTraffic.toFixed(2)} MB</span>
      </div>
      <div class="tooltip-row">
        <span class="tooltip-label">Avg Latency</span>
        <span class="tooltip-val">${stats.avgLatency.toFixed(1)} ms</span>
      </div>
    `;
    return tooltip;
  }

  destroy(): void {
    this.isRunning = false;
    this.flashTimeouts.forEach((t) => window.clearTimeout(t));
    this.flashTimeouts.clear();
  }
}
