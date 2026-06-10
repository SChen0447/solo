import { UIController, type UIState } from './uiController';
import {
  generateGradientCSS,
  generateFullCSS,
  renderGradientToCanvas,
  DEFAULT_GRADIENT_CONFIG
} from './gradientEngine';
import { NoiseLayer, DEFAULT_NOISE_CONFIG } from './noiseLayer';

const PREVIEW_WIDTH = 400;
const PREVIEW_HEIGHT = 300;
const MOBILE_PREVIEW_HEIGHT = 250;

function initApp(): void {
  const controlsContainer = document.querySelector('#controls') as HTMLElement;
  const previewContainer = document.querySelector('#previewContainer') as HTMLElement;
  const gradientCanvas = document.querySelector('#gradientCanvas') as HTMLCanvasElement;
  const noiseCanvas = document.querySelector('#noiseCanvas') as HTMLCanvasElement;

  gradientCanvas.width = PREVIEW_WIDTH;
  gradientCanvas.height = PREVIEW_HEIGHT;
  noiseCanvas.width = PREVIEW_WIDTH;
  noiseCanvas.height = PREVIEW_HEIGHT;

  const noiseLayer = new NoiseLayer(PREVIEW_WIDTH, PREVIEW_HEIGHT);

  const initialState: UIState = {
    gradient: { ...DEFAULT_GRADIENT_CONFIG },
    noise: { ...DEFAULT_NOISE_CONFIG }
  };

  const uiController = new UIController(controlsContainer, (state: UIState) => {
    updatePreview(state);
    updateExportCode(state);
  }, initialState);

  uiController.setupResponsiveLayout();

  function updatePreview(state: UIState): void {
    previewContainer.style.opacity = '0';

    requestAnimationFrame(() => {
      renderGradientToCanvas(gradientCanvas, state.gradient);

      const noiseCtx = noiseCanvas.getContext('2d');
      if (noiseCtx) {
        noiseCtx.clearRect(0, 0, noiseCanvas.width, noiseCanvas.height);
        const noiseData = noiseLayer.generate(state.noise);
        if (noiseData) {
          noiseCtx.putImageData(noiseData, 0, 0);
        }
      }

      previewContainer.style.opacity = '1';
    });
  }

  function updateExportCode(state: UIState): void {
    let css = generateFullCSS(state.gradient);
    if (state.noise.enabled) {
      const gradientCSS = generateGradientCSS(state.gradient);
      css += `\n/* 噪点叠加: 使用 SVG 或 Canvas data URL 实现 */\n`;
      css += `/* background-image: url('data:image/svg+xml,...'), ${gradientCSS}; */`;
    }
    uiController.updateCSSCode(css);
  }

  const copyButton = uiController.getCopyButton();
  copyButton.addEventListener('click', async () => {
    const code = uiController.getState();
    const cssCode = generateFullCSS(code.gradient);

    try {
      await navigator.clipboard.writeText(cssCode);
      copyButton.classList.add('copied');
      copyButton.querySelector('.copy-text')!.textContent = '✓ 已复制';
      copyButton.style.backgroundColor = '#22c55e';

      setTimeout(() => {
        copyButton.classList.remove('copied');
        copyButton.querySelector('.copy-text')!.textContent = '复制代码';
        copyButton.style.backgroundColor = '';
      }, 1500);
    } catch {
      copyButton.querySelector('.copy-text')!.textContent = '复制失败';
      setTimeout(() => {
        copyButton.querySelector('.copy-text')!.textContent = '复制代码';
      }, 1500);
    }
  });

  updatePreview(initialState);
  updateExportCode(initialState);

  window.addEventListener('resize', () => {
    const isMobile = window.innerWidth <= 700;
    const height = isMobile ? MOBILE_PREVIEW_HEIGHT : PREVIEW_HEIGHT;

    if (gradientCanvas.height !== height) {
      gradientCanvas.width = PREVIEW_WIDTH;
      gradientCanvas.height = height;
      noiseCanvas.width = PREVIEW_WIDTH;
      noiseCanvas.height = height;
      noiseLayer.resize(PREVIEW_WIDTH, height);
      updatePreview(uiController.getState());
    }
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}
