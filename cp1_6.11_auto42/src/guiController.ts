import Pane from 'tweakpane';

export interface GUIState {
  time: number;
  season: string;
  preset: string;
  displayMode: string;
  windSpeed: number;
}

const STYLE_ID = 'gui-controller-styles';

function injectStyles(): void {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    .tp-dfwv {
      position: fixed !important;
      bottom: 16px !important;
      left: 16px !important;
      top: auto !important;
      right: auto !important;
      z-index: 9999 !important;
    }
    .tp-rotv {
      background: rgba(22, 33, 62, 0.85) !important;
      backdrop-filter: blur(12px) !important;
      -webkit-backdrop-filter: blur(12px) !important;
      border: 1px solid rgba(58, 107, 140, 0.3) !important;
      border-radius: 12px !important;
      padding: 16px !important;
      font-family: sans-serif !important;
      font-size: 14px !important;
    }
    .tp-rotv button {
      font-family: sans-serif !important;
      font-size: 14px !important;
    }
    .tp-sldtxtv .tp-sldv .tp-sldv_k {
      box-shadow: 0 0 6px rgba(58, 107, 140, 0.6) !important;
    }
    .tp-btnv_b {
      box-shadow: 0 0 6px rgba(58, 107, 140, 0.4) !important;
      background: rgba(58, 107, 140, 0.3) !important;
      border-radius: 6px !important;
    }
    .tp-btnv_b:hover {
      box-shadow: 0 0 10px rgba(58, 107, 140, 0.7) !important;
    }
    .tp-lstv .tp-lstv_s {
      box-shadow: 0 0 4px rgba(58, 107, 140, 0.4) !important;
    }
  `;
  document.head.appendChild(style);
}

export class GUIController {
  private pane: Pane;
  private onChange: (key: string, value: any) => void;
  private state: GUIState = {
    time: 12,
    season: 'summer',
    preset: '',
    displayMode: 'overlay',
    windSpeed: 1.5,
  };
  private timeInput: any;

  constructor(onChange: (key: string, value: any) => void) {
    this.onChange = onChange;
    injectStyles();

    this.pane = new Pane({
      title: '控制面板',
    });

    this.pane.addButton({ title: '视角归零' }).on('click', () => {
      this.onChange('resetCamera', true);
    });

    this.pane.addButton({ title: '重置' }).on('click', () => {
      this.onChange('reset', true);
    });

    const timeFolder = this.pane.addFolder({ title: '时间' });
    this.timeInput = timeFolder.addInput(this.state, 'time', {
      label: '时间',
      min: 6,
      max: 18,
      step: 1,
    });
    this.timeInput.on('change', (ev: any) => {
      this.state.time = ev.value;
      this.onChange('time', ev.value);
    });

    this.pane.addInput(this.state, 'season', {
      label: '季节',
      options: { 春: 'spring', 夏: 'summer', 秋: 'autumn', 冬: 'winter' },
    }).on('change', (ev: any) => {
      this.state.season = ev.value;
      this.onChange('season', ev.value);
    });

    const presetFolder = this.pane.addFolder({ title: '方案预设' });
    presetFolder.addButton({ title: '方案A' }).on('click', () => {
      this.state.preset = 'A';
      this.onChange('preset', 'A');
    });
    presetFolder.addButton({ title: '方案B' }).on('click', () => {
      this.state.preset = 'B';
      this.onChange('preset', 'B');
    });
    presetFolder.addButton({ title: '方案C' }).on('click', () => {
      this.state.preset = 'C';
      this.onChange('preset', 'C');
    });

    this.pane.addInput(this.state, 'displayMode', {
      label: '显示模式',
      options: { 遮光密度图: 'sunlight', 风道流线: 'wind', 叠加模式: 'overlay' },
    }).on('change', (ev: any) => {
      this.state.displayMode = ev.value;
      this.onChange('displayMode', ev.value);
    });

    this.pane.addInput(this.state, 'windSpeed', {
      label: '风速',
      min: 0.5,
      max: 3.0,
      step: 0.1,
    }).on('change', (ev: any) => {
      this.state.windSpeed = ev.value;
      this.onChange('windSpeed', ev.value);
    });
  }

  getState(): GUIState {
    return { ...this.state };
  }

  setTime(time: number): void {
    this.state.time = time;
    this.timeInput.controller.valueController.value.rawValue = time;
  }

  dispose(): void {
    this.pane.dispose();
    const style = document.getElementById(STYLE_ID);
    if (style) style.remove();
  }
}
