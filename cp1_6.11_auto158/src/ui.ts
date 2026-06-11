import { Pane } from 'tweakpane';
import type { AuroraParams, AuroraPreset } from './aurora';

export interface UICallbacks {
  onParamsChange: (params: Partial<AuroraParams>) => void;
  onPresetChange: (preset: AuroraPreset) => void;
  onRecordToggle: () => void;
}

export class UIController {
  private pane: Pane;
  private params: {
    solarWindIntensity: number;
    magneticInclination: number;
    atmosphereHeight: number;
  };
  
  private callbacks: UICallbacks;
  private fpsElement: HTMLElement;
  private particleCountElement: HTMLElement;
  private performanceWarning: HTMLElement;
  private recordDot: HTMLElement;
  private recordText: HTMLElement;
  private recordBtn: HTMLElement;
  private isRecording: boolean = false;
  
  private bindings: Map<string, any> = new Map();

  constructor(container: HTMLElement, callbacks: UICallbacks, initialParams: AuroraParams) {
    this.callbacks = callbacks;
    this.params = { ...initialParams };
    
    this.pane = new Pane({
      container,
      title: '极光控制面板'
    });
    
    const paneAny = this.pane as any;
    
    const paramsFolder = paneAny.addFolder({
      title: '参数调节',
      expanded: true
    });
    
    const solarWindBinding = paramsFolder.addBinding(this.params, 'solarWindIntensity', {
      label: '太阳风强度',
      min: 0,
      max: 100,
      step: 1
    });
    solarWindBinding.on('change', (ev: any) => {
      this.callbacks.onParamsChange({ solarWindIntensity: ev.value });
    });
    this.bindings.set('solarWindIntensity', solarWindBinding);
    
    const inclinationBinding = paramsFolder.addBinding(this.params, 'magneticInclination', {
      label: '地磁倾角',
      min: 0,
      max: 90,
      step: 1,
      unit: '°'
    });
    inclinationBinding.on('change', (ev: any) => {
      this.callbacks.onParamsChange({ magneticInclination: ev.value });
    });
    this.bindings.set('magneticInclination', inclinationBinding);
    
    const heightBinding = paramsFolder.addBinding(this.params, 'atmosphereHeight', {
      label: '大气层高度',
      min: 80,
      max: 400,
      step: 10,
      unit: 'km'
    });
    heightBinding.on('change', (ev: any) => {
      this.callbacks.onParamsChange({ atmosphereHeight: ev.value });
    });
    this.bindings.set('atmosphereHeight', heightBinding);
    
    const presetFolder = paneAny.addFolder({
      title: '预设模式',
      expanded: true
    });
    
    const presetOptions = {
      preset: 'curtain' as AuroraPreset
    };
    
    const presetBlade = presetFolder.addBlade({
      view: 'list',
      label: '选择预设',
      options: [
        { text: '极光爆发', value: 'burst' },
        { text: '极光帘幕', value: 'curtain' },
        { text: '极光弧', value: 'arc' }
      ],
      value: 'curtain'
    });
    presetBlade.on('change', (ev: any) => {
      this.callbacks.onPresetChange(ev.value as AuroraPreset);
    });
    this.bindings.set('preset', presetBlade);
    
    this.fpsElement = document.getElementById('fps-value')!;
    this.particleCountElement = document.getElementById('particle-count')!;
    this.performanceWarning = document.getElementById('performance-warning')!;
    this.recordDot = document.getElementById('record-dot')!;
    this.recordText = document.getElementById('record-text')!;
    this.recordBtn = document.getElementById('record-btn')!;
    
    this.setupPresetButtons();
    this.setupRecordButton();
    
    this.applyTheme();
  }

  private setupPresetButtons(): void {
    const buttons = document.querySelectorAll('.preset-btn');
    
    buttons.forEach((btn) => {
      btn.addEventListener('click', () => {
        const preset = btn.getAttribute('data-preset') as AuroraPreset;
        if (preset) {
          this.callbacks.onPresetChange(preset);
          
          this.params.solarWindIntensity = 
            preset === 'burst' ? 90 : preset === 'curtain' ? 60 : 40;
          this.params.magneticInclination = 
            preset === 'burst' ? 30 : preset === 'curtain' ? 60 : 75;
          this.params.atmosphereHeight = 
            preset === 'burst' ? 120 : preset === 'curtain' ? 200 : 280;
          
          this.refreshBindings();
        }
      });
    });
  }

  private refreshBindings(): void {
    this.bindings.forEach((binding, key) => {
      if (key === 'preset') {
        return;
      }
      if (binding && typeof binding.refresh === 'function') {
        binding.refresh();
      }
    });
  }

  private setupRecordButton(): void {
    this.recordBtn.addEventListener('click', () => {
      this.toggleRecording();
    });
  }

  private toggleRecording(): void {
    this.isRecording = !this.isRecording;
    
    if (this.isRecording) {
      this.recordDot.classList.add('recording');
      this.recordText.textContent = '录制中';
    } else {
      this.recordDot.classList.remove('recording');
      this.recordText.textContent = '录制';
    }
    
    this.callbacks.onRecordToggle();
  }

  setRecording(recording: boolean): void {
    this.isRecording = recording;
    
    if (this.isRecording) {
      this.recordDot.classList.add('recording');
      this.recordText.textContent = '录制中';
    } else {
      this.recordDot.classList.remove('recording');
      this.recordText.textContent = '录制';
    }
  }

  updateFPS(fps: number): void {
    this.fpsElement.textContent = Math.round(fps).toString();
  }

  updateParticleCount(count: number): void {
    this.particleCountElement.textContent = count.toString();
  }

  showPerformanceWarning(show: boolean): void {
    if (show) {
      this.performanceWarning.classList.add('show');
    } else {
      this.performanceWarning.classList.remove('show');
    }
  }

  private applyTheme(): void {
    const paneElement = this.pane.element as HTMLElement;
    paneElement.style.setProperty('--tp-base-background-color', 'rgba(15, 20, 40, 0.85)');
    paneElement.style.setProperty('--tp-base-shadow-color', 'rgba(0, 0, 0, 0.5)');
    paneElement.style.setProperty('--tp-button-background-color', 'rgba(0, 170, 255, 0.3)');
    paneElement.style.setProperty('--tp-button-background-color-active', 'rgba(0, 170, 255, 0.5)');
    paneElement.style.setProperty('--tp-button-background-color-hover', 'rgba(0, 170, 255, 0.4)');
    paneElement.style.setProperty('--tp-button-foreground-color', '#ffffff');
    paneElement.style.setProperty('--tp-container-background-color', 'rgba(20, 30, 50, 0.8)');
    paneElement.style.setProperty('--tp-container-background-color-active', 'rgba(30, 40, 60, 0.9)');
    paneElement.style.setProperty('--tp-container-background-color-hover', 'rgba(25, 35, 55, 0.85)');
    paneElement.style.setProperty('--tp-container-foreground-color', '#aabbcc');
    paneElement.style.setProperty('--tp-groove-foreground-color', 'rgba(40, 50, 70, 0.8)');
    paneElement.style.setProperty('--tp-input-background-color', 'rgba(30, 40, 60, 0.9)');
    paneElement.style.setProperty('--tp-input-background-color-active', 'rgba(40, 50, 70, 1)');
    paneElement.style.setProperty('--tp-input-foreground-color', '#ddeeff');
    paneElement.style.setProperty('--tp-label-foreground-color', '#88aacc');
    paneElement.style.setProperty('--tp-monitor-background-color', 'rgba(20, 30, 50, 0.8)');
    paneElement.style.setProperty('--tp-monitor-foreground-color', '#00ff88');
    
    paneElement.style.backdropFilter = 'blur(10px)';
    (paneElement.style as any).webkitBackdropFilter = 'blur(10px)';
    paneElement.style.borderRadius = '12px';
    paneElement.style.overflow = 'hidden';
  }

  setParams(params: Partial<AuroraParams>): void {
    if (params.solarWindIntensity !== undefined) {
      this.params.solarWindIntensity = params.solarWindIntensity;
    }
    if (params.magneticInclination !== undefined) {
      this.params.magneticInclination = params.magneticInclination;
    }
    if (params.atmosphereHeight !== undefined) {
      this.params.atmosphereHeight = params.atmosphereHeight;
    }
    this.refreshBindings();
  }

  dispose(): void {
    this.pane.dispose();
  }
}
