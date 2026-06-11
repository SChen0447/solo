import { Pane } from 'tweakpane';
import * as THREE from 'three';

export interface GUIParams {
  temperature: number;
  acidity: number;
  density: number;
}

export type GUIEventCallback = (params: Partial<GUIParams>) => void;
export type GUIActionCallback = () => void;

export class VentGUI {
  private pane: Pane;
  private params: GUIParams;
  private onParamChangeCallbacks: GUIEventCallback[] = [];
  private onResetViewCallbacks: GUIActionCallback[] = [];
  private onScreenshotCallbacks: GUIActionCallback[] = [];
  private renderer: THREE.WebGLRenderer | null = null;

  constructor(container?: HTMLElement) {
    this.params = {
      temperature: 50,
      acidity: 30,
      density: 60
    };

    const paneContainer = container || document.body;
    this.pane = new Pane({
      title: '控制面板',
      container: paneContainer
    });

    const paneElement = this.pane.element as HTMLElement;
    paneElement.style.position = 'fixed';
    paneElement.style.right = '20px';
    paneElement.style.bottom = '20px';
    paneElement.style.zIndex = '1000';
    paneElement.style.transition = 'transform 0.3s ease, box-shadow 0.3s ease';
    paneElement.style.transform = 'scale(0.95)';

    this.applyPaneStyles(paneElement);

    this.setupControls();
    this.setupHoverEffect(paneElement);
  }

  private applyPaneStyles(element: HTMLElement): void {
    const style = document.createElement('style');
    style.textContent = `
      .tp-dfwv {
        background-color: rgba(26, 26, 26, 0.85) !important;
        backdrop-filter: blur(8px);
        -webkit-backdrop-filter: blur(8px);
        border: 1px solid rgba(255, 255, 255, 0.3) !important;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
      }
      .tp-dfwv:hover {
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5);
      }
      .tp-lblv_l {
        color: #aaaaaa !important;
      }
      .tp-rotv_g {
        background: linear-gradient(to right, #003366, #ff6600) !important;
      }
    `;
    document.head.appendChild(style);
  }

  private setupControls(): void {
    const pane = this.pane as any;

    const tempFolder = pane.addFolder({
      title: '环境参数',
      expanded: true
    });

    tempFolder.addBinding(this.params, 'temperature', {
      label: '热液温度',
      min: 0,
      max: 100,
      step: 1
    }).on('change', (ev: { value: number }) => {
      this.notifyParamChange({ temperature: ev.value });
    });

    tempFolder.addBinding(this.params, 'acidity', {
      label: '酸性浓度',
      min: 0,
      max: 100,
      step: 1
    }).on('change', (ev: { value: number }) => {
      this.notifyParamChange({ acidity: ev.value });
    });

    tempFolder.addBinding(this.params, 'density', {
      label: '生物密度',
      min: 0,
      max: 100,
      step: 1
    }).on('change', (ev: { value: number }) => {
      this.notifyParamChange({ density: ev.value });
    });

    const btnFolder = pane.addFolder({
      title: '操作',
      expanded: true
    });

    btnFolder.addButton({
      title: '重置视角'
    }).on('click', () => {
      this.notifyResetView();
    });

    btnFolder.addButton({
      title: '截图'
    }).on('click', () => {
      this.notifyScreenshot();
    });
  }

  private setupHoverEffect(element: HTMLElement): void {
    element.addEventListener('mouseenter', () => {
      element.style.transform = 'scale(1.05)';
    });

    element.addEventListener('mouseleave', () => {
      element.style.transform = 'scale(0.95)';
    });
  }

  setRenderer(renderer: THREE.WebGLRenderer): void {
    this.renderer = renderer;
  }

  onParamChange(callback: GUIEventCallback): void {
    this.onParamChangeCallbacks.push(callback);
  }

  onResetView(callback: GUIActionCallback): void {
    this.onResetViewCallbacks.push(callback);
  }

  onScreenshot(callback: GUIActionCallback): void {
    this.onScreenshotCallbacks.push(callback);
  }

  private notifyParamChange(params: Partial<GUIParams>): void {
    for (const callback of this.onParamChangeCallbacks) {
      callback(params);
    }
  }

  private notifyResetView(): void {
    for (const callback of this.onResetViewCallbacks) {
      callback();
    }
  }

  private notifyScreenshot(): void {
    if (this.renderer) {
      this.takeScreenshot();
    }
    for (const callback of this.onScreenshotCallbacks) {
      callback();
    }
  }

  private takeScreenshot(): void {
    if (!this.renderer) return;

    const dataURL = this.renderer.domElement.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = `deep-sea-vent-${Date.now()}.png`;
    link.href = dataURL;
    link.click();
  }

  getParams(): GUIParams {
    return { ...this.params };
  }

  setParams(params: Partial<GUIParams>): void {
    Object.assign(this.params, params);
    (this.pane as any).refresh();
  }
}
