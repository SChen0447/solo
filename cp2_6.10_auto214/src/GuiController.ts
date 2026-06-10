import { Pane } from 'tweakpane';
import { LayersManager } from './LayersManager';
import { LAYER_PROFILES } from './profiles';

export interface GuiParams {
  rotationSpeed: number;
  layers: Record<string, boolean>;
  opacity: Record<string, number>;
}

export class GuiController {
  private pane: Pane;
  private layersManager: LayersManager;
  private params: GuiParams;
  private onRotationChange: (speed: number) => void;

  constructor(
    container: HTMLElement,
    layersManager: LayersManager,
    onRotationChange: (speed: number) => void
  ) {
    this.layersManager = layersManager;
    this.onRotationChange = onRotationChange;

    this.params = {
      rotationSpeed: 1,
      layers: {},
      opacity: {}
    };

    for (const profile of LAYER_PROFILES) {
      if (profile.minAltitude < 80) {
        this.params.layers[profile.id] = true;
        this.params.opacity[profile.id] = profile.color[3];
      }
    }

    this.pane = new Pane({
      container,
      title: '图层控制'
    });

    this.buildUI();
  }

  private buildUI(): void {
    const layersFolder = this.pane.addFolder({
      title: '大气图层',
      expanded: true
    });

    for (const profile of LAYER_PROFILES) {
      if (profile.minAltitude >= 80) continue;

      const binding = layersFolder.addBinding(this.params.layers, profile.id, {
        label: profile.name,
        input: 'boolean'
      });

      binding.on('change', (ev) => {
        this.layersManager.setLayerVisible(profile.id, ev.value as boolean);
      });

      const labelEl = document.createElement('span');
      labelEl.style.display = 'inline-block';
      labelEl.style.width = '10px';
      labelEl.style.height = '10px';
      labelEl.style.borderRadius = '50%';
      labelEl.style.backgroundColor = `rgba(${Math.floor(profile.color[0] * 255)}, ${Math.floor(profile.color[1] * 255)}, ${Math.floor(profile.color[2] * 255)}, ${profile.color[3]})`;
      labelEl.style.marginRight = '6px';
      labelEl.style.boxShadow = `0 0 6px rgba(${Math.floor(profile.color[0] * 255)}, ${Math.floor(profile.color[1] * 255)}, ${Math.floor(profile.color[2] * 255)}, 0.5)`;

      const inputRow = binding.element.querySelector('.tp-lblv_l');
      if (inputRow) {
        inputRow.prepend(labelEl);
      }
    }

    const rotationFolder = this.pane.addFolder({
      title: '视角设置',
      expanded: true
    });

    const rotBinding = rotationFolder.addBinding(this.params, 'rotationSpeed', {
      label: '旋转速度',
      min: 0,
      max: 5,
      step: 0.1
    });

    rotBinding.on('change', (ev) => {
      this.onRotationChange(ev.value as number);
    });
  }

  getParams(): GuiParams {
    return this.params;
  }

  getPane(): Pane {
    return this.pane;
  }

  dispose(): void {
    this.pane.dispose();
  }
}
