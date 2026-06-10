import type { CoffeeRegion } from './terrain';

const FLAVOR_AXES = [
  { key: 'acidity', label: '酸度' },
  { key: 'sweetness', label: '甜度' },
  { key: 'body', label: '醇厚度' },
  { key: 'aroma', label: '香气' },
  { key: 'aftertaste', label: '余韵' },
  { key: 'balance', label: '平衡' }
] as const;

interface UIState {
  hoveredRegion: CoffeeRegion | null;
  selectedRegion: CoffeeRegion | null;
  centerRegion: CoffeeRegion | null;
  autoRotate: boolean;
}

export class UIManager {
  private labelTag: HTMLElement;
  private radarPanel: HTMLElement;
  private radarTitle: HTMLElement;
  private radarBean: HTMLElement;
  private radarDesc: HTMLElement;
  private radarChart: SVGSVGElement;
  private closeRadarBtn: HTMLElement;
  private centerMarker: HTMLElement;
  private centerRegionLabel: HTMLElement;
  private statFps: HTMLElement;
  private statTris: HTMLElement;
  private statRegion: HTMLElement;
  private autoRotateBadge: HTMLElement;
  private autoRotateText: HTMLElement;

  private state: UIState;
  private frameCount: number = 0;
  private fpsUpdateTime: number = 0;
  private lastFps: number = 0;

  constructor() {
    this.labelTag = document.getElementById('label-tag')!;
    this.radarPanel = document.getElementById('radar-panel')!;
    this.radarTitle = document.getElementById('radar-title')!;
    this.radarBean = document.getElementById('radar-bean')!;
    this.radarDesc = document.getElementById('radar-desc')!;
    this.radarChart = document.getElementById('radar-chart') as unknown as SVGSVGElement;
    this.closeRadarBtn = document.getElementById('close-radar')!;
    this.centerMarker = document.getElementById('center-marker')!;
    this.centerRegionLabel = document.getElementById('center-region')!;
    this.statFps = document.getElementById('stat-fps')!;
    this.statTris = document.getElementById('stat-tris')!;
    this.statRegion = document.getElementById('stat-region')!;
    this.autoRotateBadge = document.getElementById('auto-rotate-badge')!;
    this.autoRotateText = document.getElementById('auto-rotate-text')!;

    this.state = {
      hoveredRegion: null,
      selectedRegion: null,
      centerRegion: null,
      autoRotate: true
    };

    this.bindEvents();
    this.initRadarChart();
  }

  private bindEvents(): void {
    this.closeRadarBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.hideRadarPanel();
    });

    this.radarPanel.addEventListener('click', (e) => {
      e.stopPropagation();
    });
  }

  private initRadarChart(): void {
    const ns = 'http://www.w3.org/2000/svg';
    const cx = 130;
    const cy = 110;
    const maxR = 85;

    for (let level = 1; level <= 5; level++) {
      const r = (maxR * level) / 5;
      const points: string[] = [];
      for (let i = 0; i < 6; i++) {
        const angle = (Math.PI * 2 * i) / 6 - Math.PI / 2;
        const x = cx + Math.cos(angle) * r;
        const y = cy + Math.sin(angle) * r;
        points.push(`${x},${y}`);
      }
      const polygon = document.createElementNS(ns, 'polygon');
      polygon.setAttribute('points', points.join(' '));
      polygon.setAttribute('fill', 'none');
      polygon.setAttribute('stroke', 'rgba(255,255,255,0.06)');
      polygon.setAttribute('stroke-width', '1');
      this.radarChart.appendChild(polygon);
    }

    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI * 2 * i) / 6 - Math.PI / 2;
      const x = cx + Math.cos(angle) * maxR;
      const y = cy + Math.sin(angle) * maxR;

      const line = document.createElementNS(ns, 'line');
      line.setAttribute('x1', String(cx));
      line.setAttribute('y1', String(cy));
      line.setAttribute('x2', String(x));
      line.setAttribute('y2', String(y));
      line.setAttribute('stroke', 'rgba(255,255,255,0.08)');
      line.setAttribute('stroke-width', '1');
      this.radarChart.appendChild(line);

      const labelX = cx + Math.cos(angle) * (maxR + 18);
      const labelY = cy + Math.sin(angle) * (maxR + 18);
      const text = document.createElementNS(ns, 'text');
      text.setAttribute('x', String(labelX));
      text.setAttribute('y', String(labelY));
      text.setAttribute('text-anchor', 'middle');
      text.setAttribute('dominant-baseline', 'middle');
      text.setAttribute('fill', '#8888a0');
      text.setAttribute('font-size', '11');
      text.textContent = FLAVOR_AXES[i].label;
      this.radarChart.appendChild(text);
    }

    const dataPolygon = document.createElementNS(ns, 'polygon');
    dataPolygon.setAttribute('id', 'radar-data');
    dataPolygon.setAttribute('fill', 'rgba(201,166,107,0.25)');
    dataPolygon.setAttribute('stroke', '#c9a66b');
    dataPolygon.setAttribute('stroke-width', '2');
    dataPolygon.style.transition = 'all 0.4s ease';
    this.radarChart.appendChild(dataPolygon);
  }

  public showLabel(region: CoffeeRegion | null, screenX: number, screenY: number): void {
    this.state.hoveredRegion = region;

    if (region) {
      this.labelTag.textContent = region.name;
      this.labelTag.style.left = `${screenX}px`;
      this.labelTag.style.top = `${screenY - 50}px`;
      this.labelTag.style.borderColor = `${region.colorHex}40`;
      this.labelTag.classList.add('visible');
    } else {
      this.labelTag.classList.remove('visible');
    }
  }

  public showRadarPanel(region: CoffeeRegion | null): void {
    if (!region) return;

    this.state.selectedRegion = region;
    this.radarTitle.textContent = region.name;
    this.radarBean.textContent = `${region.nameEn} · ${region.bean}`;
    this.radarDesc.textContent = region.description;
    this.radarPanel.classList.add('visible');

    this.updateRadarData(region);
  }

  public hideRadarPanel(): void {
    this.state.selectedRegion = null;
    this.radarPanel.classList.remove('visible');
  }

  private updateRadarData(region: CoffeeRegion): void {
    const dataPolygon = document.getElementById('radar-data') as unknown as SVGPolygonElement;
    if (!dataPolygon) return;

    const cx = 130;
    const cy = 110;
    const maxR = 85;
    const points: string[] = [];

    for (let i = 0; i < 6; i++) {
      const axis = FLAVOR_AXES[i];
      const value = region.flavor[axis.key];
      const r = (maxR * value) / 100;
      const angle = (Math.PI * 2 * i) / 6 - Math.PI / 2;
      const x = cx + Math.cos(angle) * r;
      const y = cy + Math.sin(angle) * r;
      points.push(`${x},${y}`);
    }

    dataPolygon.setAttribute('points', points.join(' '));
    dataPolygon.setAttribute('fill', `${region.colorHex}30`);
    dataPolygon.setAttribute('stroke', region.colorHex);
  }

  public updateCenterRegion(region: CoffeeRegion | null): void {
    this.state.centerRegion = region;

    if (region && this.state.autoRotate) {
      this.centerRegionLabel.textContent = region.name;
      this.centerRegionLabel.style.color = region.colorHex;
      this.centerMarker.classList.add('visible');
    } else {
      this.centerMarker.classList.remove('visible');
    }

    this.statRegion.textContent = region ? region.name.split(' ')[0] : '--';
  }

  public updateAutoRotate(enabled: boolean): void {
    this.state.autoRotate = enabled;
    if (enabled) {
      this.autoRotateBadge.classList.remove('paused');
      this.autoRotateText.textContent = '探索模式';
    } else {
      this.autoRotateBadge.classList.add('paused');
      this.autoRotateText.textContent = '已暂停';
    }

    if (!enabled) {
      this.centerMarker.classList.remove('visible');
    }
  }

  public updateStats(deltaTime: number, triangleCount: number): void {
    this.frameCount++;
    this.fpsUpdateTime += deltaTime;

    if (this.fpsUpdateTime >= 0.5) {
      this.lastFps = Math.round(this.frameCount / this.fpsUpdateTime);
      this.statFps.textContent = String(this.lastFps);
      this.statTris.textContent = triangleCount.toLocaleString();
      this.frameCount = 0;
      this.fpsUpdateTime = 0;

      if (this.lastFps >= 50) {
        this.statFps.style.color = '#81c784';
      } else if (this.lastFps >= 30) {
        this.statFps.style.color = '#ffb74d';
      } else {
        this.statFps.style.color = '#e57373';
      }
    }
  }

  public getState(): Readonly<UIState> {
    return this.state;
  }
}
