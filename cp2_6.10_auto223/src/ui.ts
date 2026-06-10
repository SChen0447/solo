/**
 * UI层 - Tweakpane控制面板与数据显示
 * 负责构建右侧控制面板（深度滑块、数值显示）
 * 监听变化并回调 scene.ts 的 setDepth 方法
 * 接收 scene.ts 的数据更新回调，更新2D数据显示大屏
 */

import { Pane } from 'tweakpane';
import { SpeciesInfo } from './dataLayer';

export interface UICallbacks {
  onDepthChange: (depth: number) => void;
}

interface ControlParams {
  depth: number;
}

export class UI {
  private pane: Pane;
  private callbacks: UICallbacks;
  private params: ControlParams;

  private depthValueEl: HTMLElement;
  private tempValueEl: HTMLElement;
  private lightValueEl: HTMLElement;
  private soundValueEl: HTMLElement;
  private tooltipEl: HTMLElement;

  constructor(containerId: string, callbacks: UICallbacks) {
    this.callbacks = callbacks;
    this.params = { depth: 0 };

    this.depthValueEl = document.getElementById('depth-value')!;
    this.tempValueEl = document.getElementById('temp-value')!;
    this.lightValueEl = document.getElementById('light-value')!;
    this.soundValueEl = document.getElementById('sound-value')!;
    this.tooltipEl = document.getElementById('tooltip')!;

    const container = document.getElementById(containerId)!;
    this.pane = new Pane({
      container: container,
      title: '控制面板',
    });

    this.stylePane();
    this.buildControls();
    this.addTooltipStyles();
  }

  private stylePane(): void {
    const paneElement = this.pane.element;
    paneElement.style.background = 'rgba(26, 42, 58, 0.75)';
    paneElement.style.backdropFilter = 'blur(10px)';
    paneElement.style.borderRadius = '0 0 0 8px';
    paneElement.style.border = '1px solid rgba(0, 191, 255, 0.2)';
    paneElement.style.height = '100%';
    paneElement.style.overflowY = 'auto';
    paneElement.style.padding = '10px';
    paneElement.style.boxShadow = '-4px 0 20px rgba(0, 0, 0, 0.3)';

    const titleEl = paneElement.querySelector('.tp-txtv') as HTMLElement | null;
    if (titleEl) {
      titleEl.style.color = '#00bfff';
      titleEl.style.fontWeight = 'bold';
    }

    const style = document.createElement('style');
    style.textContent = `
      .tp-lblv_l {
        color: #88aacc !important;
        font-size: 12px !important;
      }
      .tp-lblv_v {
        color: #ffffff !important;
      }
      .tp-sldr {
        background: #2a3a4a !important;
        border-radius: 6px !important;
        height: 6px !important;
      }
      .tp-sldr_bar {
        background: linear-gradient(90deg, #00bfff, #00ff88) !important;
        border-radius: 6px !important;
      }
      .tp-sldr_thumb {
        background: #00bfff !important;
        width: 16px !important;
        height: 16px !important;
        border-radius: 50% !important;
        border: 2px solid #ffffff !important;
        transition: transform 0.15s ease, box-shadow 0.15s ease !important;
        cursor: pointer !important;
      }
      .tp-sldr_thumb:hover {
        transform: scale(1.2) !important;
        box-shadow: 0 0 15px rgba(0, 191, 255, 0.6) !important;
      }
      .tp-numv_i {
        background: #1a2a3a !important;
        color: #ffffff !important;
        border: 1px solid #2a3a4a !important;
        border-radius: 6px !important;
        padding: 4px 8px !important;
      }
      .tp-numv_i:focus {
        outline: none !important;
        border-color: #00bfff !important;
        box-shadow: 0 0 8px rgba(0, 191, 255, 0.4) !important;
      }
      .tp-lblv {
        padding: 8px 0 !important;
      }
      .tp-fld {
        border-radius: 6px !important;
        margin-bottom: 4px !important;
      }
    `;
    document.head.appendChild(style);
  }

  private buildControls(): void {
    const depthFolder = this.pane.addFolder({
      title: '深度调节',
      expanded: true,
    });

    depthFolder.addBinding(this.params, 'depth', {
      label: '深度',
      min: 0,
      max: 11000,
      step: 100,
      format: (v: number) => `${Math.round(v)} 米`,
    }).on('change', (ev) => {
      this.callbacks.onDepthChange(ev.value as number);
    });

    const dataFolder = this.pane.addFolder({
      title: '环境数据',
      expanded: true,
    });

    const tempMonitor = dataFolder.addBinding({ temp: '22.0 °C' }, 'temp', {
      label: '温度',
      readonly: true,
    });

    const lightMonitor = dataFolder.addBinding({ light: '100%' }, 'light', {
      label: '光照',
      readonly: true,
    });

    const soundMonitor = dataFolder.addBinding({ sound: '1500 m/s' }, 'sound', {
      label: '声速',
      readonly: true,
    });

    (this as any).tempMonitor = tempMonitor;
    (this as any).lightMonitor = lightMonitor;
    (this as any).soundMonitor = soundMonitor;

    const infoFolder = this.pane.addFolder({
      title: '使用说明',
      expanded: false,
    });

    infoFolder.addBlade({
      view: 'text',
      label: '提示',
      parse: () => '',
      value:
        '拖动滑块探索不同深度\n点击粒子查看物种信息\n点击空白处发射声波脉冲',
    });
  }

  private addTooltipStyles(): void {
    return;
  }

  public updateDataDisplay(
    depth: number,
    temperature: number,
    lightIntensity: number,
    soundSpeed: number
  ): void {
    this.depthValueEl.textContent = `${Math.round(depth)} 米`;
    this.tempValueEl.textContent = `${temperature.toFixed(1)} °C`;
    this.lightValueEl.textContent = `${(lightIntensity * 100).toFixed(3)}%`;
    this.soundValueEl.textContent = `${soundSpeed.toFixed(0)} m/s`;

    this.params.depth = depth;
    this.pane.refresh();

    const tempMonitor = (this as any).tempMonitor;
    const lightMonitor = (this as any).lightMonitor;
    const soundMonitor = (this as any).soundMonitor;

    if (tempMonitor) {
      tempMonitor.value = { temp: `${temperature.toFixed(1)} °C` };
    }
    if (lightMonitor) {
      lightMonitor.value = { light: `${(lightIntensity * 100).toFixed(3)}%` };
    }
    if (soundMonitor) {
      soundMonitor.value = { sound: `${soundSpeed.toFixed(0)} m/s` };
    }
  }

  public showSpeciesTooltip(info: SpeciesInfo, x: number, y: number): void {
    this.tooltipEl.innerHTML = `
      <div class="species-icon">${info.icon}</div>
      <div class="species-name">${info.name}</div>
      <div class="species-depth">栖息深度：${info.depthRange}</div>
      <div class="species-size">体长范围：${info.sizeRange}</div>
    `;

    const tooltipWidth = 200;
    const tooltipHeight = 150;
    let posX = x + 15;
    let posY = y + 15;

    if (posX + tooltipWidth > window.innerWidth) {
      posX = x - tooltipWidth - 15;
    }
    if (posY + tooltipHeight > window.innerHeight) {
      posY = y - tooltipHeight - 15;
    }

    this.tooltipEl.style.left = `${posX}px`;
    this.tooltipEl.style.top = `${posY}px`;
    this.tooltipEl.style.display = 'block';
  }

  public hideSpeciesTooltip(): void {
    this.tooltipEl.style.display = 'none';
  }

  public setDepth(depth: number): void {
    this.params.depth = depth;
    this.pane.refresh();
  }

  public dispose(): void {
    this.pane.dispose();
  }
}
