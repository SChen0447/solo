import { Pane, FolderApi } from 'tweakpane';
import { ControlParams, StratumMesh } from './types';

export interface PanelCallbacks {
  onParamsChange: (params: ControlParams) => void;
  onResetView: () => void;
  onAutoTour: () => void;
}

export function createControlPanel(
  containerId: string,
  strata: StratumMesh[],
  callbacks: PanelCallbacks
): { pane: Pane; params: ControlParams } {
  const container = document.getElementById(containerId);
  if (!container) {
    throw new Error(`Container ${containerId} not found`);
  }

  const stratumVisibility: Record<number, boolean> = {};
  strata.forEach(s => {
    stratumVisibility[s.id] = true;
  });

  const params: ControlParams = {
    depthSlice: 100,
    opacity: 0.6,
    stratumVisibility,
    sliceMode: false,
    sliceZ: 0,
    autoRotate: false
  };

  const pane = new Pane({
    title: '勘探控制',
    container,
    expanded: true
  });

  const notifyChange = () => {
    callbacks.onParamsChange({
      ...params,
      stratumVisibility: { ...params.stratumVisibility }
    });
  };

  const depthFolder = (pane as any).addFolder({
    title: '深度剖切',
    expanded: true
  }) as FolderApi;

  depthFolder.addBinding(params, 'depthSlice', {
    label: '剖切深度',
    min: 0,
    max: 100,
    step: 1
  }).on('change', notifyChange);

  depthFolder.addBinding(params, 'opacity', {
    label: '地层透明度',
    min: 0.1,
    max: 1.0,
    step: 0.05
  }).on('change', notifyChange);

  const visibilityFolder = (pane as any).addFolder({
    title: '地层可见性',
    expanded: true
  }) as FolderApi;

  for (const stratum of strata) {
    visibilityFolder.addBinding(params.stratumVisibility, String(stratum.id), {
      label: stratum.config.name,
    }).on('change', notifyChange);
  }

  const sliceFolder = (pane as any).addFolder({
    title: '横截面切片',
    expanded: false
  }) as FolderApi;

  sliceFolder.addBinding(params, 'sliceMode', {
    label: '启用切片'
  }).on('change', notifyChange);

  sliceFolder.addBinding(params, 'sliceZ', {
    label: '切片Z位置',
    min: -100,
    max: 100,
    step: 1
  }).on('change', notifyChange);

  const viewFolder = (pane as any).addFolder({
    title: '视角控制',
    expanded: true
  }) as FolderApi;

  viewFolder.addButton({
    title: '重置视角'
  }).on('click', () => {
    callbacks.onResetView();
  });

  viewFolder.addButton({
    title: '自动漫游'
  }).on('click', () => {
    callbacks.onAutoTour();
  });

  return { pane, params };
}
