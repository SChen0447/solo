import * as THREE from 'three';
import type { EarthRenderer, BarData } from './earthRenderer';
import type { GeoPoint } from './dataLoader';
import { getAnalysisText } from './dataLoader';

export type DisplayMode = 'bars' | 'heatmap' | 'both';

export interface InteractionCallbacks {
  onCountrySelect?: (point: GeoPoint | null) => void;
  onModeChange?: (mode: DisplayMode) => void;
  onResetView?: () => void;
  onOpacityAdjust?: (delta: number) => void;
}

export class InteractionManager {
  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private earthRenderer: EarthRenderer;
  private container: HTMLElement;

  private hoveredBar: BarData | null = null;
  private selectedPoint: GeoPoint | null = null;

  private tooltipEl: HTMLElement;
  private detailPanelEl: HTMLElement;
  private panelCountryEl: HTMLElement;
  private panelAnalysisEl: HTMLElement;
  private tempChartEl: HTMLCanvasElement;
  private currentCountryEl: HTMLElement;
  private panelCloseEl: HTMLElement;
  private modeButtons: NodeListOf<HTMLElement>;
  private resetBtn: HTMLElement;

  private isDragging = false;
  private dragStart = { x: 0, y: 0 };
  private targetRotation = { x: 0, y: 0 };
  private currentRotation = { x: 0, y: 0 };
  private autoRotate = true;
  private userInteractionTimer: number | null = null;

  private callbacks: InteractionCallbacks;

  private chartHoverIndex: number = -1;

  constructor(
    camera: THREE.PerspectiveCamera,
    renderer: THREE.WebGLRenderer,
    earthRenderer: EarthRenderer,
    container: HTMLElement,
    callbacks: InteractionCallbacks = {}
  ) {
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    this.camera = camera;
    this.renderer = renderer;
    this.earthRenderer = earthRenderer;
    this.container = container;
    this.callbacks = callbacks;

    this.tooltipEl = document.getElementById('tooltip')!;
    this.detailPanelEl = document.getElementById('detail-panel')!;
    this.panelCountryEl = document.getElementById('panel-country')!;
    this.panelAnalysisEl = document.getElementById('panel-analysis')!;
    this.tempChartEl = document.getElementById('temp-chart') as HTMLCanvasElement;
    this.currentCountryEl = document.getElementById('current-country')!;
    this.panelCloseEl = document.getElementById('panel-close')!;
    this.modeButtons = document.querySelectorAll('.mode-btn');
    this.resetBtn = document.getElementById('reset-view')!;

    this.bindEvents();
    this.bindChartEvents();
  }

  private bindEvents(): void {
    const canvas = this.renderer.domElement;

    canvas.addEventListener('mousemove', this.onMouseMove.bind(this));
    canvas.addEventListener('mousedown', this.onMouseDown.bind(this));
    window.addEventListener('mouseup', this.onMouseUp.bind(this));
    canvas.addEventListener('click', this.onClick.bind(this));
    canvas.addEventListener('wheel', this.onWheel.bind(this), { passive: false });
    window.addEventListener('keydown', this.onKeyDown.bind(this));

    canvas.addEventListener('touchstart', this.onTouchStart.bind(this), { passive: true });
    canvas.addEventListener('touchmove', this.onTouchMove.bind(this), { passive: true });
    canvas.addEventListener('touchend', this.onTouchEnd.bind(this), { passive: true });

    this.panelCloseEl.addEventListener('click', () => this.closeDetailPanel());

    this.modeButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        this.modeButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const mode = btn.dataset.mode as DisplayMode;
        this.callbacks.onModeChange?.(mode);
      });
    });

    this.resetBtn.addEventListener('click', () => {
      this.callbacks.onResetView?.();
      this.targetRotation = { x: 0, y: 0 };
      this.currentRotation = { x: 0, y: 0 };
    });
  }

  private bindChartEvents(): void {
    this.tempChartEl.addEventListener('mousemove', (e) => {
      const rect = this.tempChartEl.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const padL = 40, padR = 10;
      if (this.selectedPoint && x >= padL && x <= rect.width - padR) {
        const dataCount = this.selectedPoint.historical.length;
        const chartWidth = rect.width - padL - padR;
        const idx = Math.round(((x - padL) / chartWidth) * (dataCount - 1));
        this.chartHoverIndex = Math.max(0, Math.min(dataCount - 1, idx));
        this.drawChart();
      }
    });

    this.tempChartEl.addEventListener('mouseleave', () => {
      this.chartHoverIndex = -1;
      this.drawChart();
    });
  }

  private onMouseMove(e: MouseEvent): void {
    this.updateMouse(e.clientX, e.clientY);
    this.updateHover();

    if (this.isDragging) {
      const dx = e.clientX - this.dragStart.x;
      const dy = e.clientY - this.dragStart.y;
      this.targetRotation.y += dx * 0.005;
      this.targetRotation.x += dy * 0.005;
      this.targetRotation.x = Math.max(-Math.PI / 3, Math.min(Math.PI / 3, this.targetRotation.x));
      this.dragStart = { x: e.clientX, y: e.clientY };
      this.disableAutoRotate();
    }

    if (this.hoveredBar) {
      this.updateTooltipPosition(e.clientX, e.clientY);
    }
  }

  private onMouseDown(e: MouseEvent): void {
    this.isDragging = true;
    this.dragStart = { x: e.clientX, y: e.clientY };
  }

  private onMouseUp(): void {
    this.isDragging = false;
  }

  private onClick(e: MouseEvent): void {
    if (this.hoveredBar) {
      this.selectCountry(this.hoveredBar.geoPoint);
    }
  }

  private onWheel(e: WheelEvent): void {
    e.preventDefault();
    const delta = e.deltaY * 0.01;
    this.camera.position.multiplyScalar(1 + delta * 0.1);
    const dist = this.camera.position.length();
    const minDist = 8;
    const maxDist = 30;
    if (dist < minDist) {
      this.camera.position.setLength(minDist);
    } else if (dist > maxDist) {
      this.camera.position.setLength(maxDist);
    }
  }

  private onKeyDown(e: KeyboardEvent): void {
    if (e.key === 'ArrowUp') {
      this.callbacks.onOpacityAdjust?.(0.1);
    } else if (e.key === 'ArrowDown') {
      this.callbacks.onOpacityAdjust?.(-0.1);
    } else if (e.key === 'Escape') {
      this.closeDetailPanel();
    }
  }

  private onTouchStart(e: TouchEvent): void {
    if (e.touches.length === 1) {
      const t = e.touches[0];
      this.isDragging = true;
      this.dragStart = { x: t.clientX, y: t.clientY };
      this.updateMouse(t.clientX, t.clientY);
      this.disableAutoRotate();
    }
  }

  private onTouchMove(e: TouchEvent): void {
    if (this.isDragging && e.touches.length === 1) {
      const t = e.touches[0];
      const dx = t.clientX - this.dragStart.x;
      const dy = t.clientY - this.dragStart.y;
      this.targetRotation.y += dx * 0.005;
      this.targetRotation.x += dy * 0.005;
      this.targetRotation.x = Math.max(-Math.PI / 3, Math.min(Math.PI / 3, this.targetRotation.x));
      this.dragStart = { x: t.clientX, y: t.clientY };
      this.updateMouse(t.clientX, t.clientY);
      this.updateHover();
    }
  }

  private onTouchEnd(e: TouchEvent): void {
    this.isDragging = false;
    if (this.hoveredBar) {
      this.selectCountry(this.hoveredBar.geoPoint);
    }
  }

  private updateMouse(clientX: number, clientY: number): void {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1;
  }

  private updateHover(): void {
    this.raycaster.setFromCamera(this.mouse, this.camera);
    const barMeshes = this.earthRenderer.bars.map(b => b.mesh);
    const intersects = this.raycaster.intersectObjects(barMeshes, false);

    let newHovered: BarData | null = null;

    if (intersects.length > 0 && !this.isDragging) {
      const hitMesh = intersects[0].object as THREE.Mesh;
      newHovered = this.earthRenderer.bars.find(b => b.mesh === hitMesh) || null;
    }

    if (newHovered !== this.hoveredBar) {
      if (this.hoveredBar) {
        this.hoveredBar.targetScale = 1;
      }
      if (newHovered) {
        newHovered.targetScale = 1.5;
        this.showTooltip(newHovered.geoPoint);
        document.body.style.cursor = 'pointer';
      } else {
        this.hideTooltip();
        document.body.style.cursor = 'grab';
      }
      this.hoveredBar = newHovered;
    }
  }

  private showTooltip(point: GeoPoint): void {
    this.tooltipEl.textContent = `${point.country} · ${point.temperature.toFixed(1)}°C`;
    this.tooltipEl.classList.add('visible');
  }

  private hideTooltip(): void {
    this.tooltipEl.classList.remove('visible');
  }

  private updateTooltipPosition(clientX: number, clientY: number): void {
    const offsetX = 14;
    const offsetY = -40;
    let x = clientX + offsetX;
    let y = clientY + offsetY;

    const rect = this.tooltipEl.getBoundingClientRect();
    if (x + rect.width > window.innerWidth - 8) {
      x = clientX - rect.width - offsetX;
    }
    if (y < 8) {
      y = clientY + 20;
    }

    this.tooltipEl.style.left = `${x}px`;
    this.tooltipEl.style.top = `${y}px`;
  }

  public selectCountry(point: GeoPoint): void {
    this.selectedPoint = point;
    this.currentCountryEl.textContent = point.country;
    this.panelCountryEl.textContent = point.country;
    this.panelAnalysisEl.textContent = getAnalysisText();
    this.detailPanelEl.classList.add('open');
    this.callbacks.onCountrySelect?.(point);
    this.drawChart();
  }

  public closeDetailPanel(): void {
    this.selectedPoint = null;
    this.currentCountryEl.textContent = '地球气候探索';
    this.detailPanelEl.classList.remove('open');
    this.callbacks.onCountrySelect?.(null);
  }

  private drawChart(): void {
    if (!this.selectedPoint) return;

    const ctx = this.tempChartEl.getContext('2d')!;
    const w = this.tempChartEl.width;
    const h = this.tempChartEl.height;
    const data = this.selectedPoint.historical;

    ctx.clearRect(0, 0, w, h);

    const padL = 40;
    const padR = 10;
    const padT = 15;
    const padB = 25;
    const chartW = w - padL - padR;
    const chartH = h - padT - padB;

    const temps = data.map(d => d.temp);
    const minT = Math.floor(Math.min(...temps) - 1);
    const maxT = Math.ceil(Math.max(...temps) + 1);

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const y = padT + (chartH * i) / 4;
      ctx.beginPath();
      ctx.moveTo(padL, y);
      ctx.lineTo(w - padR, y);
      ctx.stroke();
    }

    ctx.fillStyle = 'rgba(148, 163, 184, 0.7)';
    ctx.font = '10px Inter, sans-serif';
    ctx.textAlign = 'right';
    for (let i = 0; i <= 4; i++) {
      const t = maxT - ((maxT - minT) * i) / 4;
      const y = padT + (chartH * i) / 4 + 3;
      ctx.fillText(`${t.toFixed(0)}°`, padL - 6, y);
    }

    const firstYear = data[0].year;
    const lastYear = data[data.length - 1].year;
    ctx.textAlign = 'center';
    for (let yr = firstYear; yr <= lastYear; yr += 20) {
      const x = padL + ((yr - firstYear) / (lastYear - firstYear)) * chartW;
      ctx.fillText(String(yr), x, h - 8);
    }

    const getX = (i: number) => padL + (i / (data.length - 1)) * chartW;
    const getY = (t: number) => padT + (1 - (t - minT) / (maxT - minT)) * chartH;

    const gradient = ctx.createLinearGradient(padL, 0, w - padR, 0);
    gradient.addColorStop(0, '#0044FF');
    gradient.addColorStop(1, '#FF4400');

    ctx.beginPath();
    ctx.moveTo(getX(0), getY(data[0].temp));
    for (let i = 1; i < data.length; i++) {
      const x = getX(i);
      const y = getY(data[i].temp);
      const prevX = getX(i - 1);
      const prevY = getY(data[i - 1].temp);
      const cpx = (prevX + x) / 2;
      ctx.bezierCurveTo(cpx, prevY, cpx, y, x, y);
    }
    ctx.strokeStyle = gradient;
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.stroke();

    const fillGrad = ctx.createLinearGradient(0, padT, 0, padT + chartH);
    fillGrad.addColorStop(0, 'rgba(74, 144, 217, 0.25)');
    fillGrad.addColorStop(1, 'rgba(74, 144, 217, 0.02)');

    ctx.lineTo(getX(data.length - 1), padT + chartH);
    ctx.lineTo(getX(0), padT + chartH);
    ctx.closePath();
    ctx.fillStyle = fillGrad;
    ctx.fill();

    if (this.chartHoverIndex >= 0 && this.chartHoverIndex < data.length) {
      const idx = this.chartHoverIndex;
      const px = getX(idx);
      const py = getY(data[idx].temp);

      ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(px, padT);
      ctx.lineTo(px, padT + chartH);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.beginPath();
      ctx.arc(px, py, 5, 0, Math.PI * 2);
      ctx.fillStyle = '#4A90D9';
      ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
      const labelW = 68;
      const labelH = 32;
      let lx = px - labelW / 2;
      let ly = py - labelH - 8;
      if (lx < padL) lx = padL;
      if (lx + labelW > w - padR) lx = w - padR - labelW;
      if (ly < padT) ly = py + 8;

      this.roundRect(ctx, lx, ly, labelW, labelH, 5);
      ctx.fill();

      ctx.fillStyle = '#fff';
      ctx.font = 'bold 11px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`${data[idx].temp.toFixed(1)}°C`, lx + labelW / 2, ly + 13);
      ctx.font = '9px Inter, sans-serif';
      ctx.fillStyle = 'rgba(255,255,255,0.6)';
      ctx.fillText(String(data[idx].year), lx + labelW / 2, ly + 25);
    }
  }

  private roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
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

  private disableAutoRotate(): void {
    this.autoRotate = false;
    if (this.userInteractionTimer) {
      window.clearTimeout(this.userInteractionTimer);
    }
    this.userInteractionTimer = window.setTimeout(() => {
      this.autoRotate = true;
    }, 5000);
  }

  public getRotation(): THREE.Euler {
    const lerpFactor = 0.08;
    this.currentRotation.x += (this.targetRotation.x - this.currentRotation.x) * lerpFactor;
    this.currentRotation.y += (this.targetRotation.y - this.currentRotation.y) * lerpFactor;
    return new THREE.Euler(this.currentRotation.x, this.currentRotation.y, 0, 'YXZ');
  }

  public isAutoRotateEnabled(): boolean {
    return this.autoRotate;
  }
}
