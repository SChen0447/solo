import { Renderer, type DOMRefs } from './renderer';
import { Interactions } from './interactions';

function init(): void {
  const mainCanvas = document.getElementById('mainCanvas') as HTMLCanvasElement;
  const paletteGrid = document.getElementById('paletteGrid') as HTMLDivElement;
  const mobilePaletteGrid = document.getElementById('mobilePaletteGrid') as HTMLDivElement;
  const timelinePanel = document.getElementById('timelinePanel') as HTMLDivElement;
  const previewOverlay = document.getElementById('previewOverlay') as HTMLDivElement;
  const previewCanvas = document.getElementById('previewCanvas') as HTMLCanvasElement;
  const previewBgCanvas = document.getElementById('previewBgCanvas') as HTMLCanvasElement;
  const previewFrameNumber = document.getElementById('previewFrameNumber') as HTMLDivElement;
  const speedButtons = document.querySelectorAll('.speed-btn') as NodeListOf<HTMLButtonElement>;
  const exportModal = document.getElementById('exportModal') as HTMLDivElement;
  const exportModalCard = document.getElementById('exportModalCard') as HTMLDivElement;
  const exportTextarea = document.getElementById('exportTextarea') as HTMLTextAreaElement;
  const importModal = document.getElementById('importModal') as HTMLDivElement;
  const importModalCard = document.getElementById('importModalCard') as HTMLDivElement;
  const importTextarea = document.getElementById('importTextarea') as HTMLTextAreaElement;
  const importErrorText = document.getElementById('importErrorText') as HTMLDivElement;
  const copyBtn = document.getElementById('copyBtn') as HTMLButtonElement;

  const refs: DOMRefs = {
    mainCanvas,
    paletteGrid,
    mobilePaletteGrid,
    timelinePanel,
    previewOverlay,
    previewCanvas,
    previewBgCanvas,
    previewFrameNumber,
    speedButtons,
    exportModal,
    exportModalCard,
    exportTextarea,
    importModal,
    importModalCard,
    importTextarea,
    importErrorText,
    copyBtn
  };

  const renderer = new Renderer(refs);
  new Interactions(renderer, refs);

  renderer.redrawAll();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
