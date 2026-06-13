export interface PanelData {
  altitude: number;
  longitude: number;
  latitude: number;
  depthPercent: number;
}

interface AnimatedValue {
  current: number;
  target: number;
  velocity: number;
}

export class InfoPanel {
  private panelEl: HTMLElement;
  private toggleBtn: HTMLElement;
  private collapseBtn: HTMLElement;
  private altitudeEl: HTMLElement;
  private lonEl: HTMLElement;
  private latEl: HTMLElement;
  private depthPercentEl: HTMLElement;
  private depthBarFillEl: HTMLElement;
  private isCollapsed: boolean;
  private isMobile: boolean;
  private animatedValues: {
    altitude: AnimatedValue;
    longitude: AnimatedValue;
    latitude: AnimatedValue;
    depthPercent: AnimatedValue;
  };

  constructor() {
    const panel = document.getElementById('info-panel');
    const toggle = document.getElementById('panel-toggle');
    const collapseBtn = document.querySelector('#info-panel .collapse-btn');

    if (!panel || !toggle || !collapseBtn) {
      throw new Error('Panel elements not found');
    }

    this.panelEl = panel;
    this.toggleBtn = toggle;
    this.collapseBtn = collapseBtn as HTMLElement;
    this.isCollapsed = false;
    this.isMobile = this.checkMobile();

    const altitudeEl = document.getElementById('altitude-value');
    const lonEl = document.getElementById('lon-value');
    const latEl = document.getElementById('lat-value');
    const depthPercentEl = document.getElementById('depth-percent');
    const depthBarFillEl = document.getElementById('depth-bar-fill');

    if (!altitudeEl || !lonEl || !latEl || !depthPercentEl || !depthBarFillEl) {
      throw new Error('Panel value elements not found');
    }

    this.altitudeEl = altitudeEl;
    this.lonEl = lonEl;
    this.latEl = latEl;
    this.depthPercentEl = depthPercentEl;
    this.depthBarFillEl = depthBarFillEl;

    this.animatedValues = {
      altitude: { current: -500, target: -500, velocity: 0 },
      longitude: { current: 0, target: 0, velocity: 0 },
      latitude: { current: 0, target: 0, velocity: 0 },
      depthPercent: { current: 50, target: 50, velocity: 0 }
    };

    this.bindEvents();
    this.updateResponsiveLayout();
  }

  private checkMobile(): boolean {
    return window.innerWidth <= 768 || 'ontouchstart' in window;
  }

  private bindEvents(): void {
    this.collapseBtn.addEventListener('click', () => {
      this.toggle();
    });

    this.toggleBtn.addEventListener('click', () => {
      if (this.isCollapsed) {
        this.expand();
      }
    });

    window.addEventListener('resize', () => {
      this.isMobile = this.checkMobile();
      this.updateResponsiveLayout();
    });
  }

  private updateResponsiveLayout(): void {
    const isMobile = window.innerWidth <= 768;
    const isLandscapeMobile = isMobile && window.innerWidth > window.innerHeight;

    if (isMobile && !isLandscapeMobile) {
      this.toggleBtn.style.display = 'none';
    } else if (isLandscapeMobile) {
      this.toggleBtn.style.display = this.isCollapsed ? 'flex' : 'none';
    } else {
      this.toggleBtn.style.display = 'none';
    }
  }

  toggle(): void {
    if (this.isCollapsed) {
      this.expand();
    } else {
      this.collapse();
    }
  }

  collapse(): void {
    if (this.isCollapsed) return;
    this.isCollapsed = true;
    this.panelEl.classList.add('collapsed');

    if (this.isMobile && window.innerWidth > window.innerHeight) {
      this.toggleBtn.classList.remove('hidden');
    }
  }

  expand(): void {
    if (!this.isCollapsed) return;
    this.isCollapsed = false;
    this.panelEl.classList.remove('collapsed');
    this.toggleBtn.classList.add('hidden');
  }

  setData(data: PanelData): void {
    this.animatedValues.altitude.target = data.altitude;
    this.animatedValues.longitude.target = data.longitude;
    this.animatedValues.latitude.target = data.latitude;
    this.animatedValues.depthPercent.target = data.depthPercent;
  }

  update(deltaTime: number): void {
    const springStrength = 8;
    const damping = 0.7;

    for (const key of Object.keys(this.animatedValues) as Array<keyof typeof this.animatedValues>) {
      const value = this.animatedValues[key];
      const force = (value.target - value.current) * springStrength;
      value.velocity += force * deltaTime;
      value.velocity *= damping;
      value.current += value.velocity * deltaTime;
    }

    this.altitudeEl.textContent = `${this.animatedValues.altitude.current.toFixed(0)} m`;
    this.altitudeEl.classList.remove('positive', 'negative');
    if (this.animatedValues.altitude.current > 0) {
      this.altitudeEl.classList.add('positive');
    } else {
      this.altitudeEl.classList.add('negative');
    }

    this.lonEl.textContent = this.formatLonLat(this.animatedValues.longitude.current, true);
    this.latEl.textContent = this.formatLonLat(this.animatedValues.latitude.current, false);

    const depthPct = Math.max(0, Math.min(100, this.animatedValues.depthPercent.current));
    this.depthPercentEl.textContent = `${depthPct.toFixed(1)}%`;
    this.depthBarFillEl.style.width = `${depthPct}%`;
  }

  private formatLonLat(value: number, isLongitude: boolean): string {
    const abs = Math.abs(value);
    const degrees = Math.floor(abs);
    const minutes = Math.floor((abs - degrees) * 60);
    const seconds = ((abs - degrees) * 60 - minutes) * 60;

    const dir = isLongitude
      ? (value >= 0 ? 'E' : 'W')
      : (value >= 0 ? 'N' : 'S');

    return `${degrees}°${minutes}'${seconds.toFixed(1)}"${dir}`;
  }

  show(): void {
    this.panelEl.style.display = 'block';
  }

  hide(): void {
    this.panelEl.style.display = 'none';
  }

  setCollapsed(collapsed: boolean): void {
    if (collapsed) {
      this.collapse();
    } else {
      this.expand();
    }
  }

  getIsCollapsed(): boolean {
    return this.isCollapsed;
  }
}
