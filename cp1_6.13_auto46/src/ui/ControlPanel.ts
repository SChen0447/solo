import { DrillManager, DrillEvent, DrillState } from '../core/DrillManager';
import { MineralNode } from '../core/StratumGenerator';

export interface MineralCount {
  gold: number;
  diamond: number;
  quartz: number;
  copper: number;
}

export class ControlPanel {
  private container: HTMLElement;
  private drillManager: DrillManager;
  private root: HTMLDivElement;
  private depthDisplay: HTMLDivElement;
  private speedSlider: HTMLInputElement;
  private speedThumb: HTMLDivElement;
  private progressFill: HTMLDivElement;
  private progressPercent: HTMLDivElement;
  private mineralItems: Map<string, { el: HTMLDivElement; countEl: HTMLSpanElement; pending: number }> = new Map();
  private resistanceDisplay: HTMLDivElement;
  private stratumDisplay: HTMLDivElement;
  private overloadBanner: HTMLDivElement;
  private isMobile: boolean = false;
  private maxDepth: number = 50;
  private currentDepth: number = 0;
  private currentResistance: number = 0;
  private mineralCounts: MineralCount = { gold: 0, diamond: 0, quartz: 0, copper: 0 };
  private bannerBlinkTimer: number | null = null;
  private bannerBlinkCount: number = 0;

  constructor(container: HTMLElement, drillManager: DrillManager) {
    this.container = container;
    this.drillManager = drillManager;
    this.root = document.createElement('div');
    this.depthDisplay = document.createElement('div');
    this.speedSlider = document.createElement('input');
    this.speedThumb = document.createElement('div');
    this.progressFill = document.createElement('div');
    this.progressPercent = document.createElement('div');
    this.resistanceDisplay = document.createElement('div');
    this.stratumDisplay = document.createElement('div');
    this.overloadBanner = document.createElement('div');
    this.checkViewport();
    this.build();
    this.bindDrillEvents();
    this.bindWindowEvents();
  }

  private checkViewport(): void {
    this.isMobile = window.innerWidth < 768;
  }

  private build(): void {
    this.root.className = 'drill-control-panel';
    this.root.id = 'drill-control-panel';
    this.applyRootStyles();
    this.buildDepthSection();
    this.buildProgressSection();
    this.buildSpeedSection();
    this.buildResistanceSection();
    this.buildStratumSection();
    this.buildMineralCounter();
    this.buildOverloadBanner();
    this.container.appendChild(this.root);
  }

  private applyRootStyles(): void {
    const s = this.root.style;
    if (this.isMobile) {
      s.position = 'fixed';
      s.bottom = '0';
      s.left = '0';
      s.right = '0';
      s.width = '100%';
      s.height = '80px';
      s.background = 'linear-gradient(to top, rgba(40,40,60,0.92), rgba(30,30,50,0.82))';
      s.backdropFilter = 'blur(12px)';
      s.webkitBackdropFilter = 'blur(12px)';
      s.borderTop = '1px solid rgba(255,255,255,0.1)';
      s.color = '#e0e0e0';
      s.fontFamily = "'Courier New', Consolas, monospace";
      s.zIndex = '100';
      s.display = 'flex';
      s.flexDirection = 'row';
      s.alignItems = 'center';
      s.justifyContent = 'space-around';
      s.padding = '0 16px';
      s.gap = '12px';
      s.boxSizing = 'border-box';
      s.transition = 'all 0.3s ease-out';
    } else {
      s.position = 'fixed';
      s.top = '0';
      s.right = '0';
      s.width = '200px';
      s.height = '100vh';
      s.background = 'linear-gradient(to left, rgba(40,40,60,0.92), rgba(30,30,50,0.82))';
      s.backdropFilter = 'blur(12px)';
      s.webkitBackdropFilter = 'blur(12px)';
      s.borderLeft = '1px solid rgba(255,255,255,0.1)';
      s.color = '#e0e0e0';
      s.fontFamily = "'Courier New', Consolas, monospace";
      s.zIndex = '100';
      s.display = 'flex';
      s.flexDirection = 'column';
      s.alignItems = 'stretch';
      s.padding = '24px 16px';
      s.gap = '20px';
      s.boxSizing = 'border-box';
      s.transition = 'all 0.3s ease-out';
      s.overflowY = 'auto';
    }
  }

  private buildDepthSection(): void {
    const section = document.createElement('div');
    section.className = 'panel-section depth-section';
    const ss = section.style;
    ss.display = 'flex';
    ss.flexDirection = 'column';
    ss.alignItems = 'center';
    ss.gap = '6px';
    if (this.isMobile) {
      ss.minWidth = '80px';
    }

    const label = document.createElement('div');
    label.textContent = '当前深度';
    label.style.cssText = `font-size: ${this.isMobile ? '10px' : '12px'}; color: #9e9e9e; letter-spacing: 1px;`;

    this.depthDisplay.textContent = '0.00 m';
    this.depthDisplay.style.cssText = `
      font-size: ${this.isMobile ? '20px' : '32px'};
      font-weight: bold;
      color: #ff5252;
      text-shadow: 0 0 8px rgba(255,82,82,0.4), 1px 1px 0 rgba(255,255,255,0.25);
      letter-spacing: 1px;
      line-height: 1;
    `;

    section.appendChild(label);
    section.appendChild(this.depthDisplay);
    this.root.appendChild(section);
  }

  private buildProgressSection(): void {
    const section = document.createElement('div');
    section.className = 'panel-section progress-section';
    const ss = section.style;
    ss.display = 'flex';
    ss.flexDirection = 'column';
    ss.alignItems = 'stretch';
    ss.gap = '6px';
    if (this.isMobile) {
      ss.minWidth = '140px';
      ss.flex = '1';
    }

    const label = document.createElement('div');
    label.textContent = '钻探进度';
    label.style.cssText = `font-size: ${this.isMobile ? '10px' : '12px'}; color: #9e9e9e; letter-spacing: 1px;`;

    const progressTrack = document.createElement('div');
    progressTrack.style.cssText = `
      position: relative;
      width: 100%;
      height: ${this.isMobile ? '12px' : '16px'};
      background: rgba(0,0,0,0.35);
      border-radius: 8px;
      overflow: hidden;
      border: 1px solid rgba(255,255,255,0.08);
      box-shadow: inset 0 1px 3px rgba(0,0,0,0.4);
    `;

    this.progressFill.style.cssText = `
      position: absolute;
      top: 0; left: 0; bottom: 0;
      width: 0%;
      background: linear-gradient(90deg, #2196f3, #64b5f6, #90caf9);
      border-radius: 8px;
      transition: width 0.25s ease-out;
      box-shadow: 0 0 12px rgba(33,150,243,0.6);
    `;

    const pulse = document.createElement('div');
    pulse.style.cssText = `
      position: absolute;
      top: 0; left: 0; bottom: 0; right: 0;
      background: linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent);
      animation: progressPulse 2s ease-in-out infinite;
      background-size: 200% 100%;
    `;
    progressTrack.appendChild(this.progressFill);
    progressTrack.appendChild(pulse);

    this.progressPercent.textContent = '0%';
    this.progressPercent.style.cssText = `
      position: absolute;
      right: 8px;
      top: 50%;
      transform: translateY(-50%);
      font-size: ${this.isMobile ? '9px' : '11px'};
      font-weight: bold;
      color: #ffffff;
      text-shadow: 0 1px 2px rgba(0,0,0,0.6);
      z-index: 2;
    `;
    progressTrack.appendChild(this.progressPercent);

    section.appendChild(label);
    section.appendChild(progressTrack);
    this.root.appendChild(section);

    this.injectProgressKeyframe();
  }

  private injectProgressKeyframe(): void {
    if (document.getElementById('progress-pulse-kf')) return;
    const style = document.createElement('style');
    style.id = 'progress-pulse-kf';
    style.textContent = `
      @keyframes progressPulse {
        0% { background-position: -200% 0; }
        100% { background-position: 200% 0; }
      }
    `;
    document.head.appendChild(style);
  }

  private buildSpeedSection(): void {
    const section = document.createElement('div');
    section.className = 'panel-section speed-section';
    const ss = section.style;
    ss.display = 'flex';
    ss.flexDirection = 'column';
    ss.alignItems = 'stretch';
    ss.gap = '8px';
    if (this.isMobile) {
      ss.minWidth = '140px';
    }

    const labelRow = document.createElement('div');
    labelRow.style.cssText = 'display: flex; justify-content: space-between; align-items: center;';
    const label = document.createElement('div');
    label.textContent = '钻速';
    label.style.cssText = `font-size: ${this.isMobile ? '10px' : '12px'}; color: #9e9e9e; letter-spacing: 1px;`;
    const speedVal = document.createElement('div');
    speedVal.className = 'speed-value';
    speedVal.textContent = '1.00x';
    speedVal.style.cssText = 'font-size: 11px; color: #ffffff; font-weight: bold;';
    labelRow.appendChild(label);
    labelRow.appendChild(speedVal);

    const sliderWrap = document.createElement('div');
    sliderWrap.style.cssText = 'position: relative; height: 24px; display: flex; align-items: center;';

    const sliderTrack = document.createElement('div');
    sliderTrack.style.cssText = `
      position: absolute;
      left: 8px; right: 8px;
      height: 6px;
      background: linear-gradient(90deg, #4caf50, #ffc107, #f44336);
      border-radius: 3px;
      opacity: 0.6;
    `;
    sliderWrap.appendChild(sliderTrack);

    this.speedSlider.type = 'range';
    this.speedSlider.min = '0.1';
    this.speedSlider.max = '2.0';
    this.speedSlider.step = '0.01';
    this.speedSlider.value = '1.0';
    this.speedSlider.style.cssText = `
      position: absolute;
      left: 0; right: 0;
      width: 100%;
      height: 24px;
      appearance: none;
      -webkit-appearance: none;
      background: transparent;
      outline: none;
      cursor: pointer;
      z-index: 2;
      margin: 0;
    `;

    const sliderStyle = document.createElement('style');
    sliderStyle.textContent = `
      #drill-control-panel input[type="range"]::-webkit-slider-thumb {
        -webkit-appearance: none;
        width: 20px; height: 20px;
        border-radius: 50%;
        background: #ffffff;
        border: 2px solid ${this.getThumbColor(1.0)};
        cursor: pointer;
        box-shadow: 0 0 8px ${this.getThumbColor(1.0)}88, 0 2px 6px rgba(0,0,0,0.3);
        transition: border-color 0.2s, box-shadow 0.2s;
      }
      #drill-control-panel input[type="range"]::-moz-range-thumb {
        width: 20px; height: 20px;
        border-radius: 50%;
        background: #ffffff;
        border: 2px solid ${this.getThumbColor(1.0)};
        cursor: pointer;
        box-shadow: 0 0 8px ${this.getThumbColor(1.0)}88, 0 2px 6px rgba(0,0,0,0.3);
      }
    `;
    document.head.appendChild(sliderStyle);

    sliderWrap.appendChild(this.speedSlider);
    section.appendChild(labelRow);
    section.appendChild(sliderWrap);
    this.root.appendChild(section);

    this.speedSlider.addEventListener('input', () => {
      const val = parseFloat(this.speedSlider.value);
      speedVal.textContent = val.toFixed(2) + 'x';
      const color = this.getThumbColor(val);
      this.updateSliderThumbColor(color);
      this.drillManager.setDrillSpeed(val);
    });
  }

  private getThumbColor(val: number): string {
    if (val < 0.75) return '#4caf50';
    if (val < 1.4) return '#ffc107';
    return '#f44336';
  }

  private updateSliderThumbColor(color: string): void {
    const selectors = [
      `#drill-control-panel input[type="range"]::-webkit-slider-thumb`,
      `#drill-control-panel input[type="range"]::-moz-range-thumb`
    ];
    let found: HTMLStyleElement | null = null;
    document.querySelectorAll('style').forEach(el => {
      if (el.textContent?.includes('::-webkit-slider-thumb')) found = el as HTMLStyleElement;
    });
    if (found) {
      found.textContent = `
        ${selectors[0]} {
          -webkit-appearance: none;
          width: 20px; height: 20px;
          border-radius: 50%;
          background: #ffffff;
          border: 2px solid ${color};
          cursor: pointer;
          box-shadow: 0 0 8px ${color}88, 0 2px 6px rgba(0,0,0,0.3);
          transition: border-color 0.2s, box-shadow 0.2s;
        }
        ${selectors[1]} {
          width: 20px; height: 20px;
          border-radius: 50%;
          background: #ffffff;
          border: 2px solid ${color};
          cursor: pointer;
          box-shadow: 0 0 8px ${color}88, 0 2px 6px rgba(0,0,0,0.3);
        }
      `;
    }
  }

  private buildResistanceSection(): void {
    const section = document.createElement('div');
    section.className = 'panel-section resistance-section';
    section.style.display = 'none';
    if (!this.isMobile) {
      section.style.display = 'flex';
      section.style.flexDirection = 'column';
      section.style.gap = '4px';
    }
    const label = document.createElement('div');
    label.className = 'resistance-label';
    label.textContent = '钻头阻力';
    label.style.cssText = 'font-size: 11px; color: #9e9e9e; letter-spacing: 1px;';
    this.resistanceDisplay.className = 'resistance-value';
    this.resistanceDisplay.textContent = '0.0';
    this.resistanceDisplay.style.cssText = `
      font-size: 20px; font-weight: bold; color: #9e9e9e;
      transition: color 0.3s;
    `;
    section.appendChild(label);
    section.appendChild(this.resistanceDisplay);
    this.root.appendChild(section);
  }

  private buildStratumSection(): void {
    const section = document.createElement('div');
    section.className = 'panel-section stratum-section';
    if (this.isMobile) {
      section.style.display = 'none';
    } else {
      section.style.display = 'flex';
      section.style.flexDirection = 'column';
      section.style.gap = '4px';
    }
    const label = document.createElement('div');
    label.textContent = '当前岩层';
    label.style.cssText = 'font-size: 11px; color: #9e9e9e; letter-spacing: 1px;';
    this.stratumDisplay.textContent = '表土层';
    this.stratumDisplay.style.cssText = `
      font-size: 14px; font-weight: bold; color: #bbdefb;
      text-shadow: 0 0 6px rgba(187,222,251,0.35);
    `;
    section.appendChild(label);
    section.appendChild(this.stratumDisplay);
    this.root.appendChild(section);
  }

  private buildMineralCounter(): void {
    const section = document.createElement('div');
    section.className = 'panel-section mineral-counter';
    const ss = section.style;
    ss.display = 'flex';
    if (this.isMobile) {
      ss.flexDirection = 'row';
      ss.gap = '10px';
      ss.minWidth = '100px';
      ss.justifyContent = 'flex-end';
    } else {
      ss.flexDirection = 'column';
      ss.gap = '10px';
    }

    if (!this.isMobile) {
      const label = document.createElement('div');
      label.textContent = '矿物收集';
      label.style.cssText = 'font-size: 12px; color: #9e9e9e; letter-spacing: 1px; margin-bottom: 4px;';
      section.appendChild(label);
    }

    const minerals = [
      { type: 'gold', name: '金块', icon: this.createGoldSvg(), bg: '#ffd54f' },
      { type: 'diamond', name: '钻石', icon: this.createDiamondSvg(), bg: '#81d4fa' }
    ];

    minerals.forEach(m => {
      const item = document.createElement('div');
      item.className = `mineral-item mineral-${m.type}`;
      const is = item.style;
      is.display = 'flex';
      is.alignItems = 'center';
      is.gap = this.isMobile ? '4px' : '8px';
      is.padding = this.isMobile ? '2px 6px' : '6px 10px';
      is.borderRadius = '14px';
      is.background = 'rgba(0,0,0,0.25)';
      is.border = `1px solid ${m.bg}44`;

      const iconWrap = document.createElement('div');
      iconWrap.style.cssText = `
        width: ${this.isMobile ? '20px' : '28px'};
        height: ${this.isMobile ? '20px' : '28px'};
        display: flex; align-items: center; justify-content: center;
        flex-shrink: 0;
      `;
      iconWrap.innerHTML = m.icon;

      const countEl = document.createElement('span');
      countEl.className = `mineral-count count-${m.type}`;
      countEl.textContent = '0';
      countEl.style.cssText = `
        font-size: ${this.isMobile ? '12px' : '16px'};
        font-weight: bold;
        color: #ffffff;
        min-width: 20px;
        text-align: left;
        transition: transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
      `;

      if (!this.isMobile) {
        const nameEl = document.createElement('span');
        nameEl.style.cssText = `font-size: 10px; color: #9e9e9e; margin-left: auto;`;
        nameEl.textContent = m.name;
        item.appendChild(nameEl);
      }

      item.appendChild(iconWrap);
      item.appendChild(countEl);
      section.appendChild(item);
      this.mineralItems.set(m.type, { el: item, countEl, pending: 0 });
    });
    this.root.appendChild(section);
  }

  private createGoldSvg(): string {
    return `<svg viewBox="0 0 32 32" width="100%" height="100%">
      <defs>
        <linearGradient id="gold-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#fff176"/>
          <stop offset="50%" style="stop-color:#ffd54f"/>
          <stop offset="100%" style="stop-color:#ff8f00"/>
        </linearGradient>
      </defs>
      <polygon points="16,3 28,12 24,28 8,28 4,12" fill="url(#gold-grad)" stroke="#e65100" stroke-width="1.2"/>
      <polygon points="16,3 24,28 16,22 8,28" fill="#ffb300" opacity="0.55"/>
      <polygon points="16,3 28,12 16,10" fill="#fff9c4" opacity="0.7"/>
    </svg>`;
  }

  private createDiamondSvg(): string {
    return `<svg viewBox="0 0 32 32" width="100%" height="100%">
      <defs>
        <linearGradient id="diam-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#e1f5fe"/>
          <stop offset="50%" style="stop-color:#81d4fa"/>
          <stop offset="100%" style="stop-color:#0288d1"/>
        </linearGradient>
      </defs>
      <polygon points="16,2 30,12 16,30 2,12" fill="url(#diam-grad)" stroke="#01579b" stroke-width="1.2"/>
      <polygon points="16,2 30,12 2,12" fill="#ffffff" opacity="0.5"/>
      <polygon points="16,2 24,12 16,30" fill="#b3e5fc" opacity="0.6"/>
      <polygon points="16,2 8,12 16,30" fill="#0288d1" opacity="0.25"/>
    </svg>`;
  }

  private buildOverloadBanner(): void {
    this.overloadBanner.className = 'overload-banner';
    const obs = this.overloadBanner.style;
    obs.position = 'fixed';
    obs.top = '50%';
    obs.left = '50%';
    obs.transform = 'translate(-50%, -50%)';
    obs.padding = '20px 40px';
    obs.background = 'rgba(255, 30, 30, 0.92)';
    obs.border = '3px solid #ffffff';
    obs.borderRadius = '14px';
    obs.fontSize = '28px';
    obs.fontWeight = 'bold';
    obs.color = '#ffffff';
    obs.fontFamily = "'Courier New', Consolas, monospace";
    obs.letterSpacing = '2px';
    obs.textShadow = '0 0 12px rgba(0,0,0,0.6), 2px 2px 0 rgba(0,0,0,0.3)';
    obs.boxShadow = '0 0 40px rgba(255, 30, 30, 0.7), inset 0 0 20px rgba(255,255,255,0.18)';
    obs.zIndex = '999';
    obs.opacity = '0';
    obs.pointerEvents = 'none';
    obs.transition = 'opacity 0.15s ease-out';
    obs.textAlign = 'center';
    this.overloadBanner.textContent = '钻头过载，请提升钻速或停止！';
    this.container.appendChild(this.overloadBanner);
  }

  private bindDrillEvents(): void {
    this.drillManager.on((event: DrillEvent) => {
      switch (event.type) {
        case 'depthChanged':
          this.currentDepth = event.depth;
          this.currentResistance = event.resistance;
          this.updateDepthDisplay(event.depth);
          this.updateProgress(event.depth);
          this.updateResistance(event.resistance, event.depth);
          this.updateStratumDisplay(event.depth);
          break;
        case 'mineralCollected':
          this.onMineralCollected(event.mineral);
          break;
        case 'overloadWarning':
          this.showOverloadBanner();
          break;
        case 'overloadCleared':
          this.hideOverloadBanner();
          break;
      }
    });
  }

  private bindWindowEvents(): void {
    let resizeTimer: number | null = null;
    window.addEventListener('resize', () => {
      if (resizeTimer) window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(() => {
        const wasMobile = this.isMobile;
        this.checkViewport();
        if (wasMobile !== this.isMobile) {
          this.rebuild();
        }
      }, 150);
    });
  }

  private rebuild(): void {
    if (this.root.parentNode) this.root.parentNode.removeChild(this.root);
    if (this.overloadBanner.parentNode) this.overloadBanner.parentNode.removeChild(this.overloadBanner);
    this.mineralItems.clear();
    this.applyRootStyles();
    this.build();
  }

  private updateDepthDisplay(depth: number): void {
    this.depthDisplay.textContent = depth.toFixed(2) + ' m';
  }

  private updateProgress(depth: number): void {
    const percent = Math.min(100, (depth / this.maxDepth) * 100);
    this.progressFill.style.width = percent.toFixed(1) + '%';
    this.progressPercent.textContent = percent.toFixed(0) + '%';
  }

  private updateResistance(resistance: number, depth: number): void {
    this.resistanceDisplay.textContent = resistance.toFixed(1);
    if (depth >= 45) {
      this.resistanceDisplay.style.color = '#ff5252';
      this.resistanceDisplay.style.textShadow = '0 0 10px rgba(255,82,82,0.7)';
    } else if (depth >= 30) {
      this.resistanceDisplay.style.color = '#ffc107';
      this.resistanceDisplay.style.textShadow = '0 0 6px rgba(255,193,7,0.5)';
    } else {
      this.resistanceDisplay.style.color = '#9e9e9e';
      this.resistanceDisplay.style.textShadow = 'none';
    }
  }

  private updateStratumDisplay(depth: number): void {
    const stratum = this.drillManager.getStratumGenerator().getStratumAtDepth(depth);
    if (stratum) {
      this.stratumDisplay.textContent = stratum.name;
    }
  }

  private onMineralCollected(mineral: MineralNode): void {
    const item = this.mineralItems.get(mineral.type);
    if (!item) return;
    this.mineralCounts[mineral.type]++;
    const finalCount = this.mineralCounts[mineral.type];
    const startCount = finalCount - 1;
    const startTime = performance.now();
    const duration = 500;

    const animateCount = (now: number) => {
      const elapsed = now - startTime;
      const t = Math.min(1, elapsed / duration);
      const ease = 1 - Math.pow(1 - t, 3);
      const current = Math.floor(startCount + (finalCount - startCount) * ease);
      item.countEl.textContent = String(current);
      if (t < 1) requestAnimationFrame(animateCount);
      else item.countEl.textContent = String(finalCount);
    };
    requestAnimationFrame(animateCount);

    item.countEl.style.transform = 'scale(1.6)';
    setTimeout(() => {
      item.countEl.style.transform = 'scale(1)';
    }, 260);

    item.el.style.transition = 'box-shadow 0.3s, border-color 0.3s';
    item.el.style.boxShadow = '0 0 18px rgba(255, 215, 0, 0.75)';
    item.el.style.borderColor = 'rgba(255, 215, 0, 0.9)';
    setTimeout(() => {
      item.el.style.boxShadow = 'none';
      item.el.style.borderColor = '';
    }, 1200);
  }

  private showOverloadBanner(): void {
    this.bannerBlinkCount = 0;
    const blink = () => {
      if (this.bannerBlinkCount >= 10) {
        this.hideOverloadBanner();
        return;
      }
      this.overloadBanner.style.opacity = (this.bannerBlinkCount % 2 === 0) ? '1' : '0.1';
      this.bannerBlinkCount++;
      this.bannerBlinkTimer = window.setTimeout(blink, 250);
    };
    blink();
  }

  private hideOverloadBanner(): void {
    if (this.bannerBlinkTimer !== null) {
      window.clearTimeout(this.bannerBlinkTimer);
      this.bannerBlinkTimer = null;
    }
    this.overloadBanner.style.opacity = '0';
  }

  public getMineralCounterScreenPosition(type: 'gold' | 'diamond'): { x: number; y: number } | null {
    const item = this.mineralItems.get(type);
    if (!item) return null;
    const rect = item.el.getBoundingClientRect();
    return {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2
    };
  }

  public getState(): Readonly<DrillState> {
    return this.drillManager.getState();
  }

  public getMineralCounts(): MineralCount {
    return { ...this.mineralCounts };
  }

  public destroy(): void {
    if (this.bannerBlinkTimer !== null) window.clearTimeout(this.bannerBlinkTimer);
    if (this.root.parentNode) this.root.parentNode.removeChild(this.root);
    if (this.overloadBanner.parentNode) this.overloadBanner.parentNode.removeChild(this.overloadBanner);
  }
}
