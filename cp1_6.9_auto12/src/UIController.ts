import { DataManager, ProcessedBuilding } from './DataManager';
import { ViewMode, BuildingData } from './data/buildingData';
import { BuildingSystem } from './BuildingSystem';

export interface UIControllerParams {
  dataManager: DataManager;
  buildingSystem: BuildingSystem;
}

type YearChangeCallback = (year: number) => void;
type ModeChangeCallback = (mode: ViewMode) => void;

export class UIController {
  private dataManager: DataManager;
  private buildingSystem: BuildingSystem;

  private yearSlider: HTMLInputElement;
  private yearDisplay: HTMLElement;
  private carbonValue: HTMLElement;
  private carbonTrend: HTMLElement;
  private legendContainer: HTMLElement;
  private infoCard: HTMLElement;
  private controlBtns: NodeListOf<HTMLButtonElement>;
  private particleContainer: HTMLElement;

  private animatedCarbonValue = 0;
  private targetCarbonValue = 0;
  private carbonAnimStart = 0;
  private carbonAnimStartValue = 0;
  private carbonAnimating = false;

  private yearChangeCallbacks: YearChangeCallback[] = [];
  private modeChangeCallbacks: ModeChangeCallback[] = [];

  constructor(params: UIControllerParams) {
    this.dataManager = params.dataManager;
    this.buildingSystem = params.buildingSystem;

    this.yearSlider = document.getElementById('year-slider') as HTMLInputElement;
    this.yearDisplay = document.getElementById('year-display') as HTMLElement;
    this.carbonValue = document.getElementById('carbon-value') as HTMLElement;
    this.carbonTrend = document.getElementById('carbon-trend') as HTMLElement;
    this.legendContainer = document.getElementById('legend-items') as HTMLElement;
    this.infoCard = document.getElementById('info-card') as HTMLElement;
    this.controlBtns = document.querySelectorAll('.control-btn') as NodeListOf<HTMLButtonElement>;
    this.particleContainer = document.getElementById('particle-container') as HTMLElement;

    this.setupEvents();
    this.renderLegend();
    this.updateCarbonDisplay(true);
  }

  private setupEvents(): void {
    this.yearSlider.addEventListener('input', (e) => {
      const year = parseInt((e.target as HTMLInputElement).value, 10);
      this.yearDisplay.textContent = String(year);
      this.dataManager.setYear(year);
      this.updateCarbonDisplay();
      this.yearChangeCallbacks.forEach(cb => cb(year));
      this.refreshInfoCard();
    });

    this.controlBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const target = e.currentTarget as HTMLButtonElement;
        const mode = target.dataset.mode as ViewMode;
        if (!mode) return;

        this.controlBtns.forEach(b => b.classList.remove('active'));
        target.classList.add('active');

        this.dataManager.setMode(mode);
        this.modeChangeCallbacks.forEach(cb => cb(mode));
        this.spawnParticles(target);
        this.renderLegend(mode);
      });

      btn.addEventListener('mouseenter', (e) => {
        this.spawnParticles(e.currentTarget as HTMLElement, 8);
      });
    });

    document.getElementById('info-close')?.addEventListener('click', () => {
      this.hideInfoCard();
      this.buildingSystem.clearHighlight();
    });
  }

  private spawnParticles(element: HTMLElement, count = 12): void {
    const rect = element.getBoundingClientRect();
    const colors = ['#00d4ff', '#7b61ff', '#51cf66', '#ffd43b'];

    for (let i = 0; i < count; i++) {
      const particle = document.createElement('div');
      particle.className = 'particle';
      const size = 4 + Math.random() * 6;
      particle.style.width = `${size}px`;
      particle.style.height = `${size}px`;
      particle.style.background = colors[Math.floor(Math.random() * colors.length)];
      particle.style.left = `${rect.left + rect.width / 2 + (Math.random() - 0.5) * rect.width * 0.6}px`;
      particle.style.top = `${rect.top + rect.height / 2 + (Math.random() - 0.5) * rect.height * 0.6}px`;
      particle.style.setProperty('--dx', `${(Math.random() - 0.5) * 80}px`);
      particle.style.setProperty('--dy', `${(Math.random() - 0.5) * 80}px`);
      particle.style.boxShadow = `0 0 ${6 + Math.random() * 6}px ${particle.style.background}`;
      this.particleContainer.appendChild(particle);

      setTimeout(() => particle.remove(), 800);
    }
  }

  public renderLegend(mode?: ViewMode): void {
    const actualMode = mode || this.dataManager.getMode();
    const labels: Record<ViewMode, { low: string; high: string; title: string }> = {
      energy: { low: '低能耗', high: '高能耗', title: '能耗等级' },
      carbon: { low: '低碳排', high: '高碳排', title: '碳排放等级' },
      composite: { low: '优', high: '差', title: '综合指数' }
    };
    const cfg = labels[actualMode];

    const steps = 10;
    let html = `<div class="legend-title" style="margin-top:0;">${cfg.title}</div>`;

    for (let i = steps - 1; i >= 0; i--) {
      const level = i / (steps - 1);
      const color = BuildingSystem.getStaticColorScale(level);
      const rangeLabel = i === steps - 1 ? cfg.high : i === 0 ? cfg.low : '';
      html += `
        <div class="legend-item">
          <div class="legend-color" style="background:${color}; color:${color};"></div>
          <span>${rangeLabel || `${Math.round(level * 100)}%`}</span>
        </div>
      `;
    }
    this.legendContainer.innerHTML = html;
  }

  public updateCarbonDisplay(immediate = false): void {
    const total = this.dataManager.getTotalCarbon();
    const prev = this.dataManager.getPreviousYearTotalCarbon();

    this.targetCarbonValue = total;
    this.carbonAnimStart = performance.now();
    this.carbonAnimStartValue = this.animatedCarbonValue;
    this.carbonAnimating = true;

    if (immediate) {
      this.animatedCarbonValue = total;
      this.carbonValue.textContent = this.formatNumber(total);
      this.carbonAnimating = false;
    }

    const delta = total - prev;
    if (delta > 0) {
      this.carbonTrend.textContent = `↑ ${this.formatNumber(delta)}`;
      this.carbonTrend.className = 'trend up';
    } else if (delta < 0) {
      this.carbonTrend.textContent = `↓ ${this.formatNumber(Math.abs(delta))}`;
      this.carbonTrend.className = 'trend down';
    } else {
      this.carbonTrend.textContent = '→';
      this.carbonTrend.className = 'trend';
    }
  }

  private formatNumber(n: number): string {
    if (n >= 10000) {
      return (n / 10000).toFixed(2) + '万';
    }
    return Math.round(n).toLocaleString('zh-CN');
  }

  public animate(now: number): void {
    if (this.carbonAnimating) {
      const dur = 800;
      const t = Math.min(1, (now - this.carbonAnimStart) / dur);
      const ease = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      this.animatedCarbonValue =
        this.carbonAnimStartValue + (this.targetCarbonValue - this.carbonAnimStartValue) * ease;
      this.carbonValue.textContent = this.formatNumber(this.animatedCarbonValue);
      if (t >= 1) this.carbonAnimating = false;
    }
  }

  public showInfoCard(
    buildingId: string,
    screenPos: { x: number; y: number }
  ): void {
    if (!buildingId) {
      this.hideInfoCard();
      return;
    }

    const building = this.dataManager.getBuildingById(buildingId);
    const year = this.dataManager.getYear();
    const yearly = this.dataManager.getYearlyData(buildingId, year);
    if (!building || !yearly) return;

    document.getElementById('info-title')!.textContent = building.name;
    document.getElementById('info-area')!.textContent = `${building.area.toLocaleString('zh-CN')} m²`;
    document.getElementById('info-floors')!.textContent = `${building.floors} 层`;
    document.getElementById('info-energy')!.textContent =
      `${Math.round(yearly.yearlyEnergy / 12).toLocaleString('zh-CN')} kWh`;
    document.getElementById('info-carbon')!.textContent =
      `${yearly.yearlyCarbon.toLocaleString('zh-CN')} 吨CO₂`;
    document.getElementById('info-pv')!.textContent = `${building.pvArea.toLocaleString('zh-CN')} m²`;

    const cardW = 280;
    const cardH = 220;
    let x = screenPos.x + 20;
    let y = screenPos.y - 20;
    if (x + cardW > window.innerWidth) x = screenPos.x - cardW - 20;
    if (y + cardH > window.innerHeight) y = window.innerHeight - cardH - 10;
    if (y < 10) y = 10;

    this.infoCard.style.left = `${x}px`;
    this.infoCard.style.top = `${y}px`;
    this.infoCard.style.display = 'block';
  }

  public hideInfoCard(): void {
    this.infoCard.style.display = 'none';
  }

  private refreshInfoCard(): void {
    const highlighted = this.buildingSystem.getHighlightedId();
    if (highlighted && this.infoCard.style.display === 'block') {
      const rect = this.infoCard.getBoundingClientRect();
      this.showInfoCard(highlighted, { x: rect.left - 20, y: rect.top + 20 });
    }
  }

  public onYearChange(cb: YearChangeCallback): () => void {
    this.yearChangeCallbacks.push(cb);
    return () => {
      this.yearChangeCallbacks = this.yearChangeCallbacks.filter(c => c !== cb);
    };
  }

  public onModeChange(cb: ModeChangeCallback): () => void {
    this.modeChangeCallbacks.push(cb);
    return () => {
      this.modeChangeCallbacks = this.modeChangeCallbacks.filter(c => c !== cb);
    };
  }

  public handleResize(): void {
  }
}
