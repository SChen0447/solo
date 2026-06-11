import { Pane } from 'tweakpane';
import { ClimateManager, ClimateZoneName } from './climateManager';

export interface UIControlsParams {
  container: HTMLElement;
  climateManager: ClimateManager;
  onTimeScaleChange?: (scale: number) => void;
  onZoneSelect?: (zone: ClimateZoneName | null) => void;
}

export class UIControls {
  private pane: Pane;
  private climateManager: ClimateManager;
  private onTimeScaleChange?: (scale: number) => void;
  private onZoneSelect?: (zone: ClimateZoneName | null) => void;

  private params = {
    tropical: {
      density: 8000,
      windSpeed: 3,
      hueOffset: 0
    },
    temperate: {
      density: 6000,
      windSpeed: 2,
      hueOffset: 0
    },
    polar: {
      density: 4000,
      windSpeed: 1.5,
      hueOffset: 0
    },
    global: {
      timeScale: 1
    }
  };

  constructor({ container, climateManager, onTimeScaleChange, onZoneSelect }: UIControlsParams) {
    this.climateManager = climateManager;
    this.onTimeScaleChange = onTimeScaleChange;
    this.onZoneSelect = onZoneSelect;

    this.pane = new Pane({
      container,
      title: '气候带控制面板'
    });

    this.initTropicalFolder();
    this.initTemperateFolder();
    this.initPolarFolder();
    this.initGlobalFolder();

    this.applyCustomStyles();
  }

  private initTropicalFolder(): void {
    const folder = this.pane.addFolder({
      title: '🌴 热带气候带',
      expanded: true
    });

    folder.addBinding(this.params.tropical, 'density', {
      label: '粒子密度',
      min: 2000,
      max: 15000,
      step: 500
    }).on('change', (ev) => {
      this.climateManager.updateWeather({
        zone: 'tropical',
        density: ev.value as number
      });
    });

    folder.addBinding(this.params.tropical, 'windSpeed', {
      label: '风速大小',
      min: 0.1,
      max: 10,
      step: 0.1
    }).on('change', (ev) => {
      this.climateManager.updateWeather({
        zone: 'tropical',
        windSpeed: ev.value as number
      });
    });

    folder.addBinding(this.params.tropical, 'hueOffset', {
      label: '主色相偏移',
      min: 0,
      max: 360,
      step: 1
    }).on('change', (ev) => {
      this.climateManager.updateWeather({
        zone: 'tropical',
        hueOffset: ev.value as number
      });
    });

    folder.addButton({ title: '飞入查看' }).on('click', () => {
      this.onZoneSelect?.('tropical');
    });
  }

  private initTemperateFolder(): void {
    const folder = this.pane.addFolder({
      title: '🌿 温带气候带',
      expanded: true
    });

    folder.addBinding(this.params.temperate, 'density', {
      label: '粒子密度',
      min: 2000,
      max: 15000,
      step: 500
    }).on('change', (ev) => {
      this.climateManager.updateWeather({
        zone: 'temperate',
        density: ev.value as number
      });
    });

    folder.addBinding(this.params.temperate, 'windSpeed', {
      label: '风速大小',
      min: 0.1,
      max: 10,
      step: 0.1
    }).on('change', (ev) => {
      this.climateManager.updateWeather({
        zone: 'temperate',
        windSpeed: ev.value as number
      });
    });

    folder.addBinding(this.params.temperate, 'hueOffset', {
      label: '主色相偏移',
      min: 0,
      max: 360,
      step: 1
    }).on('change', (ev) => {
      this.climateManager.updateWeather({
        zone: 'temperate',
        hueOffset: ev.value as number
      });
    });

    folder.addButton({ title: '飞入查看' }).on('click', () => {
      this.onZoneSelect?.('temperate');
    });
  }

  private initPolarFolder(): void {
    const folder = this.pane.addFolder({
      title: '❄️ 极地气候带',
      expanded: true
    });

    folder.addBinding(this.params.polar, 'density', {
      label: '粒子密度',
      min: 2000,
      max: 15000,
      step: 500
    }).on('change', (ev) => {
      this.climateManager.updateWeather({
        zone: 'polar',
        density: ev.value as number
      });
    });

    folder.addBinding(this.params.polar, 'windSpeed', {
      label: '风速大小',
      min: 0.1,
      max: 10,
      step: 0.1
    }).on('change', (ev) => {
      this.climateManager.updateWeather({
        zone: 'polar',
        windSpeed: ev.value as number
      });
    });

    folder.addBinding(this.params.polar, 'hueOffset', {
      label: '主色相偏移',
      min: 0,
      max: 360,
      step: 1
    }).on('change', (ev) => {
      this.climateManager.updateWeather({
        zone: 'polar',
        hueOffset: ev.value as number
      });
    });

    folder.addButton({ title: '飞入查看' }).on('click', () => {
      this.onZoneSelect?.('polar');
    });
  }

  private initGlobalFolder(): void {
    const folder = this.pane.addFolder({
      title: '⚡ 全局控制',
      expanded: true
    });

    folder.addBinding(this.params.global, 'timeScale', {
      label: '时间加速',
      min: 0.1,
      max: 10,
      step: 0.1
    }).on('change', (ev) => {
      const scale = ev.value as number;
      this.climateManager.setGlobalTimeScale(scale);
      this.onTimeScaleChange?.(scale);
    });

    folder.addButton({ title: '重置视角' }).on('click', () => {
      this.onZoneSelect?.(null);
    });
  }

  private applyCustomStyles(): void {
    const style = document.createElement('style');
    style.textContent = `
      .tp-dfwv {
        background: rgba(0, 0, 0, 0.75) !important;
        backdrop-filter: blur(10px) !important;
        -webkit-backdrop-filter: blur(10px) !important;
        border: 1px solid rgba(255, 255, 255, 0.1) !important;
        border-radius: 12px !important;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif !important;
      }

      .tp-rotv {
        color: rgba(255, 255, 255, 0.9) !important;
      }

      .tp-txtv {
        color: rgba(255, 255, 255, 0.8) !important;
      }

      .tp-brkv {
        background: rgba(255, 255, 255, 0.1) !important;
      }

      .tp-sldd {
        background: rgba(255, 255, 255, 0.15) !important;
        border-radius: 4px !important;
      }

      .tp-sldd_g {
        border-radius: 4px !important;
      }

      .tp-btnb {
        background: rgba(255, 255, 255, 0.1) !important;
        border: 1px solid rgba(255, 255, 255, 0.2) !important;
        border-radius: 6px !important;
        transition: all 0.2s ease !important;
      }

      .tp-btnb:hover {
        background: rgba(255, 255, 255, 0.2) !important;
      }

      .tp-fldv {
        border-bottom: 1px solid rgba(255, 255, 255, 0.05) !important;
      }

      .tp-tabv {
        color: rgba(255, 255, 255, 0.6) !important;
      }

      .tp-tabv.sel {
        color: #fff !important;
      }
    `;
    document.head.appendChild(style);
  }

  public updateHUD(): void {
    const zones: ClimateZoneName[] = ['tropical', 'temperate', 'polar'];
    zones.forEach((zone) => {
      const state = this.climateManager.getZoneState(zone);
      const hudEl = document.getElementById(`hud-${zone}`);
      const windEl = document.getElementById(`${zone}-wind`);
      const rainEl = document.getElementById(`${zone}-rain`);

      if (hudEl) hudEl.style.display = 'block';
      if (windEl) windEl.textContent = `${state.windSpeedKmh} km/h`;
      if (rainEl) rainEl.textContent = `${state.precipitationMmh} mm/h`;
    });
  }

  public updateTimeIndicator(scale: number): void {
    const ring = document.getElementById('time-ring') as SVGGeometryElement;
    const valueEl = document.getElementById('time-value');

    if (ring && valueEl) {
      const circumference = 2 * Math.PI * 12;
      const progress = (scale - 0.1) / (10 - 0.1);
      const offset = circumference * (1 - progress);

      ring.style.strokeDashoffset = offset.toString();

      const hue = 120 - progress * 120;
      ring.style.stroke = `hsl(${hue}, 80%, 50%)`;

      valueEl.textContent = `${scale.toFixed(1)}x`;
    }
  }

  public dispose(): void {
    this.pane.dispose();
  }
}
