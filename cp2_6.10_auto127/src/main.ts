import { TransformController, TransformParams } from './TransformController';
import { PanelManager } from './PanelManager';
import { Renderer } from './Renderer';
import './styles.css';

function buildLayout(app: HTMLElement): {
  controlPanel: HTMLElement;
  previewContainer: HTMLElement;
  perspectiveContainer: HTMLElement;
  card: HTMLElement;
  canvas: HTMLCanvasElement;
  bottomPanel: HTMLElement;
} {
  app.innerHTML = '';

  const layout = document.createElement('div');
  layout.className = 'app-layout';

  const controlPanel = document.createElement('div');
  controlPanel.className = 'control-panel';
  layout.appendChild(controlPanel);

  const mainContent = document.createElement('div');
  mainContent.className = 'main-content';

  const previewSection = document.createElement('div');
  previewSection.className = 'preview-section';

  const previewContainer = document.createElement('div');
  previewContainer.className = 'preview-container';

  const canvas = document.createElement('canvas');
  canvas.className = 'preview-canvas';
  previewContainer.appendChild(canvas);

  const perspectiveContainer = document.createElement('div');
  perspectiveContainer.className = 'perspective-container';

  const card = document.createElement('div');
  card.className = 'card-3d';

  const cardFront = document.createElement('div');
  cardFront.className = 'card-face card-front';
  cardFront.textContent = '3D';
  card.appendChild(cardFront);

  const cardBack = document.createElement('div');
  cardBack.className = 'card-face card-back';
  cardBack.textContent = 'BACK';
  card.appendChild(cardBack);

  perspectiveContainer.appendChild(card);
  previewContainer.appendChild(perspectiveContainer);
  previewSection.appendChild(previewContainer);
  mainContent.appendChild(previewSection);

  const bottomPanel = document.createElement('div');
  bottomPanel.className = 'bottom-panel';
  mainContent.appendChild(bottomPanel);

  layout.appendChild(mainContent);
  app.appendChild(layout);

  return {
    controlPanel,
    previewContainer,
    perspectiveContainer,
    card,
    canvas,
    bottomPanel
  };
}

function init(): void {
  const app = document.getElementById('app');
  if (!app) {
    console.error('Mount point #app not found');
    return;
  }

  const elements = buildLayout(app);

  const controller = new TransformController();

  const renderer = new Renderer({
    card: elements.card,
    perspectiveContainer: elements.perspectiveContainer,
    canvas: elements.canvas
  });

  const panelManager = new PanelManager(
    {
      controlPanel: elements.controlPanel,
      previewContainer: elements.previewContainer,
      bottomPanel: elements.bottomPanel
    },
    controller
  );

  controller.onChange((params: TransformParams) => {
    renderer.update(params);
    panelManager.updateSnapshotActiveState();
  });

  renderer.update(controller.getParams());

  let resizeTimeout: number | null = null;
  window.addEventListener('resize', () => {
    if (resizeTimeout !== null) {
      window.clearTimeout(resizeTimeout);
    }
    resizeTimeout = window.setTimeout(() => {
      renderer.resize();
      renderer.update(controller.getParams());
    }, 100);
  });

  panelManager.onPlay(() => {
  });

  panelManager.onStop(() => {
    panelManager.updateAllParamDisplays();
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
