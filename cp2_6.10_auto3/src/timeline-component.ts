import type { TimelineEvent } from './event-card';

interface NodePosition {
  event: TimelineEvent;
  x: number;
  y: number;
  timestamp: number;
}

const timelineStyles = `
  :host {
    display: block;
    width: 100%;
    height: 100%;
    position: relative;
    overflow: hidden;
  }

  .timeline-container {
    width: 100%;
    height: 100%;
    position: relative;
    cursor: grab;
  }

  .timeline-container.dragging {
    cursor: grabbing;
  }

  canvas {
    display: block;
    width: 100%;
    height: 100%;
  }

  .tooltip {
    position: absolute;
    background: rgba(10, 10, 46, 0.95);
    border: 1px solid rgba(167, 139, 250, 0.4);
    border-radius: 10px;
    padding: 0.75rem 1rem;
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4), 0 0 20px rgba(123, 104, 238, 0.2);
    pointer-events: none;
    opacity: 0;
    transition: opacity 0.2s ease;
    max-width: 260px;
    z-index: 10;
  }

  .tooltip.visible {
    opacity: 1;
  }

  .tooltip-emoji {
    font-size: 1.5rem;
    margin-bottom: 0.25rem;
  }

  .tooltip-title {
    font-size: 0.95rem;
    font-weight: 600;
    color: #f1f5f9;
    margin-bottom: 0.25rem;
  }

  .tooltip-date {
    font-size: 0.75rem;
    color: #94a3b8;
  }

  .zoom-controls {
    position: absolute;
    bottom: 1rem;
    right: 1rem;
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    background: rgba(10, 10, 46, 0.6);
    border: 1px solid rgba(255, 255, 255, 0.15);
    border-radius: 8px;
    padding: 0.25rem;
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
  }

  .zoom-btn {
    width: 36px;
    height: 36px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: transparent;
    border: none;
    border-radius: 6px;
    color: #f1f5f9;
    font-size: 1.1rem;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .zoom-btn:hover {
    background: rgba(167, 139, 250, 0.2);
  }

  .zoom-label {
    font-size: 0.7rem;
    text-align: center;
    color: #94a3b8;
    padding: 0.25rem 0;
  }

  .year-markers {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 100%;
    pointer-events: none;
  }

  @media (max-width: 768px) {
    .zoom-controls {
      bottom: 0.75rem;
      right: 0.75rem;
    }

    .zoom-btn {
      width: 32px;
      height: 32px;
    }
  }
`;

export class TimelineComponent extends HTMLElement {
  private shadow: ShadowRoot;
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private tooltip: HTMLElement | null = null;
  private events: TimelineEvent[] = [];
  private nodePositions: NodePosition[] = [];

  private offsetX: number = 0;
  private offsetY: number = 0;
  private scale: number = 1;
  private minScale: number = 0.3;
  private maxScale: number = 3;

  private isDragging: boolean = false;
  private dragStartX: number = 0;
  private dragStartY: number = 0;
  private dragOffsetX: number = 0;
  private dragOffsetY: number = 0;
  private lastMouseMove: number = 0;

  private animationFrame: number | null = null;
  private isDirty: boolean = true;
  private hoveredNode: NodePosition | null = null;

  private dpr: number = 1;
  private width: number = 0;
  private height: number = 0;

  constructor() {
    super();
    this.shadow = this.attachShadow({ mode: 'open' });
  }

  connectedCallback() {
    this.render();
    this.setupCanvas();
    this.setupEventListeners();
    this.resize();
    this.startAnimationLoop();
  }

  disconnectedCallback() {
    this.stopAnimationLoop();
    window.removeEventListener('resize', this.handleResize);
  }

  setEvents(events: TimelineEvent[]) {
    this.events = [...events].sort((a, b) =>
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );
    this.calculateNodePositions();
    this.centerView();
    this.isDirty = true;
  }

  goToYear(year: number) {
    const targetDate = new Date(year, 6, 1).getTime();
    const centerX = this.getTimelineX(targetDate);
    this.offsetX = this.width / 2 - centerX;
    this.isDirty = true;
  }

  private render() {
    this.shadow.innerHTML = `
      <style>${timelineStyles}</style>
      <div class="timeline-container">
        <canvas></canvas>
        <div class="tooltip">
          <div class="tooltip-emoji"></div>
          <div class="tooltip-title"></div>
          <div class="tooltip-date"></div>
        </div>
        <div class="zoom-controls">
          <button class="zoom-btn zoom-in" title="放大">+</button>
          <span class="zoom-label">100%</span>
          <button class="zoom-btn zoom-out" title="缩小">−</button>
          <button class="zoom-btn zoom-reset" title="重置">⟳</button>
        </div>
      </div>
    `;
    this.canvas = this.shadow.querySelector('canvas');
    this.tooltip = this.shadow.querySelector('.tooltip');
  }

  private setupCanvas() {
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext('2d');
    this.dpr = window.devicePixelRatio || 1;
  }

  private setupEventListeners() {
    const container = this.shadow.querySelector('.timeline-container') as HTMLElement;
    if (!container || !this.canvas) return;

    container.addEventListener('mousedown', (e) => this.handleMouseDown(e));
    container.addEventListener('mousemove', (e) => this.handleMouseMove(e));
    container.addEventListener('mouseup', () => this.handleMouseUp());
    container.addEventListener('mouseleave', () => this.handleMouseUp());
    container.addEventListener('wheel', (e) => this.handleWheel(e as WheelEvent), { passive: false });
    container.addEventListener('click', (e) => this.handleClick(e));

    container.addEventListener('touchstart', (e) => this.handleTouchStart(e as TouchEvent), { passive: false });
    container.addEventListener('touchmove', (e) => this.handleTouchMove(e as TouchEvent), { passive: false });
    container.addEventListener('touchend', () => this.handleTouchEnd());

    const zoomIn = this.shadow.querySelector('.zoom-in');
    const zoomOut = this.shadow.querySelector('.zoom-out');
    const zoomReset = this.shadow.querySelector('.zoom-reset');

    if (zoomIn) zoomIn.addEventListener('click', () => this.zoom(1.2));
    if (zoomOut) zoomOut.addEventListener('click', () => this.zoom(0.8));
    if (zoomReset) zoomReset.addEventListener('click', () => this.resetZoom());

    window.addEventListener('resize', this.handleResize);
  }

  private handleResize = () => {
    this.resize();
    this.isDirty = true;
  };

  private resize() {
    if (!this.canvas) return;
    const rect = this.canvas.getBoundingClientRect();
    this.width = rect.width;
    this.height = rect.height;

    this.canvas.width = this.width * this.dpr;
    this.canvas.height = this.height * this.dpr;

    if (this.ctx) {
      this.ctx.scale(this.dpr, this.dpr);
    }
  }

  private calculateNodePositions() {
    this.nodePositions = this.events.map((event) => {
      const timestamp = new Date(event.date).getTime();
      return {
        event,
        x: 0,
        y: 0,
        timestamp
      };
    });
  }

  private getTimelineX(timestamp: number): number {
    if (this.nodePositions.length < 2) return this.width / 2;

    const minTime = this.nodePositions[0].timestamp;
    const maxTime = this.nodePositions[this.nodePositions.length - 1].timestamp;
    const timeRange = maxTime - minTime || 1;

    const padding = 120 * this.scale;
    const usableWidth = this.width - padding * 2;

    return padding + ((timestamp - minTime) / timeRange) * usableWidth;
  }

  private centerView() {
    if (this.nodePositions.length === 0) {
      this.offsetX = 0;
      this.offsetY = 0;
      return;
    }

    const minTime = this.nodePositions[0].timestamp;
    const maxTime = this.nodePositions[this.nodePositions.length - 1].timestamp;
    const centerTime = (minTime + maxTime) / 2;
    const centerX = this.getTimelineX(centerTime);

    this.offsetX = this.width / 2 - centerX;
    this.offsetY = 0;
  }

  private handleMouseDown(e: MouseEvent) {
    this.isDragging = true;
    this.dragStartX = e.clientX;
    this.dragStartY = e.clientY;
    this.dragOffsetX = this.offsetX;
    this.dragOffsetY = this.offsetY;

    const container = this.shadow.querySelector('.timeline-container');
    container?.classList.add('dragging');
  }

  private handleMouseMove(e: MouseEvent) {
    const now = performance.now();
    if (now - this.lastMouseMove < 16) return;
    this.lastMouseMove = now;

    if (this.isDragging) {
      const dx = e.clientX - this.dragStartX;
      const dy = e.clientY - this.dragStartY;
      this.offsetX = this.dragOffsetX + dx;
      this.offsetY = this.dragOffsetY + dy;
      this.isDirty = true;
      this.hideTooltip();
    } else {
      const rect = this.canvas?.getBoundingClientRect();
      if (rect) {
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        this.checkHover(x, y, e.clientX, e.clientY);
      }
    }
  }

  private handleMouseUp() {
    this.isDragging = false;
    const container = this.shadow.querySelector('.timeline-container');
    container?.classList.remove('dragging');
  }

  private handleWheel(e: WheelEvent) {
    e.preventDefault();
    const rect = this.canvas?.getBoundingClientRect();
    if (!rect) return;

    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const delta = e.deltaY < 0 ? 1.1 : 0.9;
    this.zoomAt(mouseX, mouseY, delta);
  }

  private handleTouchStart(e: TouchEvent) {
    if (e.touches.length === 1) {
      this.isDragging = true;
      this.dragStartX = e.touches[0].clientX;
      this.dragStartY = e.touches[0].clientY;
      this.dragOffsetX = this.offsetX;
      this.dragOffsetY = this.offsetY;
    }
  }

  private handleTouchMove(e: TouchEvent) {
    e.preventDefault();
    if (e.touches.length === 1 && this.isDragging) {
      const dx = e.touches[0].clientX - this.dragStartX;
      const dy = e.touches[0].clientY - this.dragStartY;
      this.offsetX = this.dragOffsetX + dx;
      this.offsetY = this.dragOffsetY + dy;
      this.isDirty = true;
    }
  }

  private handleTouchEnd() {
    this.isDragging = false;
  }

  private handleClick(e: MouseEvent) {
    if (this.isDragging) return;

    const rect = this.canvas?.getBoundingClientRect();
    if (!rect) return;

    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    for (const node of this.nodePositions) {
      const nodeX = this.getTimelineX(node.timestamp) + this.offsetX;
      const nodeY = this.height / 2 + this.offsetY + (node.timestamp % 2 === 0 ? -60 : 60);
      const dx = x - nodeX;
      const dy = y - nodeY;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance < 20 * this.scale) {
        this.dispatchEvent(new CustomEvent('select', {
          detail: { event: node.event },
          bubbles: true,
          composed: true
        }));
        return;
      }
    }
  }

  private checkHover(x: number, y: number, clientX: number, clientY: number) {
    let found: NodePosition | null = null;

    for (const node of this.nodePositions) {
      const nodeX = this.getTimelineX(node.timestamp) + this.offsetX;
      const nodeY = this.height / 2 + this.offsetY + (node.timestamp % 2 === 0 ? -60 : 60);
      const dx = x - nodeX;
      const dy = y - nodeY;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance < 20 * this.scale) {
        found = node;
        break;
      }
    }

    if (found !== this.hoveredNode) {
      this.hoveredNode = found;
      this.isDirty = true;
    }

    if (found && this.tooltip) {
      this.showTooltip(found, clientX, clientY);
    } else {
      this.hideTooltip();
    }
  }

  private showTooltip(node: NodePosition, clientX: number, clientY: number) {
    if (!this.tooltip) return;

    const container = this.shadow.querySelector('.timeline-container') as HTMLElement;
    const rect = container.getBoundingClientRect();

    this.tooltip.querySelector('.tooltip-emoji')!.textContent = node.event.emoji;
    this.tooltip.querySelector('.tooltip-title')!.textContent = node.event.title;
    this.tooltip.querySelector('.tooltip-date')!.textContent = this.formatDate(node.event.date);

    let left = clientX - rect.left + 15;
    let top = clientY - rect.top + 15;

    this.tooltip.classList.add('visible');
    this.tooltip.style.left = `${left}px`;
    this.tooltip.style.top = `${top}px`;
  }

  private hideTooltip() {
    if (this.tooltip) {
      this.tooltip.classList.remove('visible');
    }
  }

  private formatDate(dateStr: string): string {
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return dateStr;
      return date.toLocaleDateString('zh-CN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch {
      return dateStr;
    }
  }

  private zoom(factor: number) {
    this.zoomAt(this.width / 2, this.height / 2, factor);
  }

  private zoomAt(x: number, y: number, factor: number) {
    const newScale = Math.max(this.minScale, Math.min(this.maxScale, this.scale * factor));
    const scaleChange = newScale / this.scale;

    this.offsetX = x - (x - this.offsetX) * scaleChange;
    this.offsetY = y - (y - this.offsetY) * scaleChange;
    this.scale = newScale;

    this.updateZoomLabel();
    this.isDirty = true;
  }

  private resetZoom() {
    this.scale = 1;
    this.centerView();
    this.updateZoomLabel();
    this.isDirty = true;
  }

  private updateZoomLabel() {
    const label = this.shadow.querySelector('.zoom-label');
    if (label) {
      label.textContent = `${Math.round(this.scale * 100)}%`;
    }
  }

  private startAnimationLoop() {
    const loop = () => {
      if (this.isDirty) {
        this.draw();
        this.isDirty = false;
      }
      this.animationFrame = requestAnimationFrame(loop);
    };
    this.animationFrame = requestAnimationFrame(loop);
  }

  private stopAnimationLoop() {
    if (this.animationFrame !== null) {
      cancelAnimationFrame(this.animationFrame);
      this.animationFrame = null;
    }
  }

  private draw() {
    if (!this.ctx || !this.canvas) return;

    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.width, this.height);

    this.drawGrid(ctx);
    this.drawTimelineLine(ctx);
    this.drawConnections(ctx);
    this.drawYearMarkers(ctx);
    this.drawNodes(ctx);
  }

  private drawGrid(ctx: CanvasRenderingContext2D) {
    ctx.save();
    ctx.strokeStyle = 'rgba(167, 139, 250, 0.05)';
    ctx.lineWidth = 1;

    const gridSize = 50 * this.scale;
    const startX = this.offsetX % gridSize;
    const startY = this.offsetY % gridSize;

    for (let x = startX; x < this.width; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, this.height);
      ctx.stroke();
    }

    for (let y = startY; y < this.height; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(this.width, y);
      ctx.stroke();
    }

    ctx.restore();
  }

  private drawTimelineLine(ctx: CanvasRenderingContext2D) {
    const centerY = this.height / 2 + this.offsetY;

    ctx.save();

    ctx.strokeStyle = 'rgba(167, 139, 250, 0.3)';
    ctx.lineWidth = 6 * this.scale;
    ctx.shadowColor = 'rgba(167, 139, 250, 0.5)';
    ctx.shadowBlur = 15;

    ctx.beginPath();
    ctx.moveTo(0, centerY);
    ctx.lineTo(this.width, centerY);
    ctx.stroke();

    ctx.shadowBlur = 0;
    ctx.strokeStyle = 'rgba(167, 139, 250, 0.8)';
    ctx.lineWidth = 2 * this.scale;

    ctx.beginPath();
    ctx.moveTo(0, centerY);
    ctx.lineTo(this.width, centerY);
    ctx.stroke();

    ctx.restore();
  }

  private drawConnections(ctx: CanvasRenderingContext2D) {
    if (this.nodePositions.length < 2) return;

    const centerY = this.height / 2 + this.offsetY;

    ctx.save();
    ctx.strokeStyle = 'rgba(167, 139, 250, 0.4)';
    ctx.lineWidth = 1.5 * this.scale;
    ctx.setLineDash([5, 5]);

    for (let i = 0; i < this.nodePositions.length; i++) {
      const node = this.nodePositions[i];
      const x = this.getTimelineX(node.timestamp) + this.offsetX;
      const yOffset = node.timestamp % 2 === 0 ? -60 : 60;
      const y = centerY + yOffset;

      ctx.beginPath();
      ctx.moveTo(x, centerY);
      ctx.lineTo(x, y);
      ctx.stroke();
    }

    ctx.restore();
  }

  private drawYearMarkers(ctx: CanvasRenderingContext2D) {
    if (this.nodePositions.length === 0) return;

    const centerY = this.height / 2 + this.offsetY;
    const minTime = this.nodePositions[0].timestamp;
    const maxTime = this.nodePositions[this.nodePositions.length - 1].timestamp;

    const minYear = new Date(minTime).getFullYear();
    const maxYear = new Date(maxTime).getFullYear();

    ctx.save();
    ctx.fillStyle = 'rgba(148, 163, 184, 0.8)';
    ctx.font = `${12 * Math.max(this.scale, 0.6)}px -apple-system, BlinkMacSystemFont, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';

    const yearStep = Math.max(1, Math.ceil((maxYear - minYear) / 10));

    for (let year = minYear; year <= maxYear; year += yearStep) {
      const yearTime = new Date(year, 0, 1).getTime();
      const x = this.getTimelineX(yearTime) + this.offsetX;

      if (x < -50 || x > this.width + 50) continue;

      ctx.fillText(String(year), x, centerY + 12 * this.scale);

      ctx.strokeStyle = 'rgba(148, 163, 184, 0.3)';
      ctx.lineWidth = 1;
      ctx.setLineDash([]);
      ctx.beginPath();
      ctx.moveTo(x, centerY - 8 * this.scale);
      ctx.lineTo(x, centerY + 8 * this.scale);
      ctx.stroke();
    }

    ctx.restore();
  }

  private drawNodes(ctx: CanvasRenderingContext2D) {
    const centerY = this.height / 2 + this.offsetY;

    for (const node of this.nodePositions) {
      const x = this.getTimelineX(node.timestamp) + this.offsetX;
      const yOffset = node.timestamp % 2 === 0 ? -60 : 60;
      const y = centerY + yOffset;

      if (x < -100 || x > this.width + 100) continue;

      const isHovered = this.hoveredNode === node;
      const nodeRadius = (isHovered ? 14 : 10) * this.scale;

      ctx.save();

      ctx.shadowColor = isHovered ? 'rgba(167, 139, 250, 0.8)' : 'rgba(167, 139, 250, 0.4)';
      ctx.shadowBlur = isHovered ? 25 : 15;

      const gradient = ctx.createRadialGradient(x, y, 0, x, y, nodeRadius);
      gradient.addColorStop(0, isHovered ? '#c4b5fd' : '#a78bfa');
      gradient.addColorStop(1, isHovered ? '#8b7cf0' : '#7b68ee');

      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(x, y, nodeRadius, 0, Math.PI * 2);
      ctx.fill();

      ctx.shadowBlur = 0;
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
      ctx.lineWidth = 2 * this.scale;
      ctx.beginPath();
      ctx.arc(x, y, nodeRadius, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.font = `${(isHovered ? 16 : 13) * this.scale}px -apple-system, BlinkMacSystemFont, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(node.event.emoji || '📌', x, y);

      ctx.restore();
    }
  }
}

customElements.define('timeline-component', TimelineComponent);
