import { transformImage, extractDominantColors, renderExportCanvas, HalftoneParams, ExtractedColors } from './halftone';

interface UIState {
  image: HTMLImageElement | null;
  style: 'circle' | 'diamond' | 'lines' | 'wave';
  density: number;
  text: string;
  fontFamily: string;
  textAlign: CanvasTextAlign;
  textColor: string;
  textPosition: { x: number; y: number };
  borderColor: string;
  extractedColors: ExtractedColors | null;
  isDraggingText: boolean;
  textDragOffset: { x: number; y: number };
}

const state: UIState = {
  image: null,
  style: 'circle',
  density: 70,
  text: '',
  fontFamily: 'Georgia, "Times New Roman", serif',
  textAlign: 'center',
  textColor: '#FFFFFF',
  textPosition: { x: 200, y: 260 },
  borderColor: '#FF6B35',
  extractedColors: null,
  isDraggingText: false,
  textDragOffset: { x: 0, y: 0 }
};

let renderFrameId: number | null = null;
let lastRenderTime = 0;
const RENDER_THROTTLE = 16;

let elements: {
  uploadZone: HTMLElement;
  fileInput: HTMLInputElement;
  canvasPair: HTMLElement;
  originalCanvas: HTMLCanvasElement;
  halftoneCanvas: HTMLCanvasElement;
  styleSelector: HTMLElement;
  densitySlider: HTMLInputElement;
  densityValue: HTMLElement;
  textInput: HTMLInputElement;
  fontSelector: HTMLElement;
  alignSelector: HTMLElement;
  textColorPicker: HTMLInputElement;
  textColorPreview: HTMLElement;
  textColorInfo: HTMLElement;
  borderColorPicker: HTMLInputElement;
  borderColorPreview: HTMLElement;
  borderColorInfo: HTMLElement;
  exportBtn: HTMLButtonElement;
  panelToggle: HTMLElement;
  controlPanel: HTMLElement;
} | null = null;

function getFontFamily(fontKey: string): string {
  switch (fontKey) {
    case 'serif':
      return 'Georgia, "Times New Roman", serif';
    case 'sans':
      return '"Inter", "Segoe UI", -apple-system, sans-serif';
    case 'handwriting':
      return '"Brush Script MT", "Comic Sans MS", cursive';
    default:
      return 'Georgia, "Times New Roman", serif';
  }
}

function countChineseChars(text: string): number {
  return (text.match(/[\u4e00-\u9fa5]/g) || []).length;
}

function validateText(text: string): string {
  let result = '';
  let chineseCount = 0;
  let totalChars = 0;

  for (const char of text) {
    const isChinese = /[\u4e00-\u9fa5]/.test(char);
    if (isChinese) {
      if (chineseCount < 20) {
        result += char;
        chineseCount++;
      }
    } else {
      if (totalChars < 40) {
        result += char;
        totalChars++;
      }
    }
  }
  return result;
}

async function scheduleRender() {
  if (!state.image) return;

  if (renderFrameId !== null) {
    cancelAnimationFrame(renderFrameId);
  }

  renderFrameId = requestAnimationFrame(async (timestamp) => {
    if (timestamp - lastRenderTime < RENDER_THROTTLE) {
      renderFrameId = requestAnimationFrame(() => scheduleRender());
      return;
    }
    lastRenderTime = timestamp;
    await renderHalftone();
    renderFrameId = null;
  });
}

async function renderHalftone() {
  if (!state.image || !elements) return;

  const halftoneCanvas = elements.halftoneCanvas;
  const params: HalftoneParams = {
    style: state.style,
    density: state.density
  };

  halftoneCanvas.classList.add('canvas-fade');

  try {
    const resultCanvas = await transformImage(state.image, params);
    const ctx = halftoneCanvas.getContext('2d')!;

    halftoneCanvas.width = resultCanvas.width;
    halftoneCanvas.height = resultCanvas.height;
    ctx.clearRect(0, 0, halftoneCanvas.width, halftoneCanvas.height);
    ctx.drawImage(resultCanvas, 0, 0);

    if (state.text) {
      drawTextOverlay();
    }
  } catch (err) {
    console.error('Halftone render error:', err);
  }

  setTimeout(() => {
    halftoneCanvas.classList.remove('canvas-fade');
  }, 300);
}

function drawTextOverlay() {
  if (!elements || !state.text) return;

  const canvas = elements.halftoneCanvas;
  const ctx = canvas.getContext('2d')!;

  ctx.save();
  ctx.font = `bold 20px ${state.fontFamily}`;
  ctx.fillStyle = state.textColor;
  ctx.textAlign = state.textAlign;
  ctx.textBaseline = 'top';

  ctx.shadowColor = 'rgba(255,255,255,0.3)';
  ctx.shadowOffsetX = 2;
  ctx.shadowOffsetY = 2;
  ctx.shadowBlur = 0;

  ctx.fillText(state.text, state.textPosition.x, state.textPosition.y);
  ctx.restore();
}

async function handleFileUpload(file: File) {
  if (!elements) return;

  if (!['image/jpeg', 'image/png'].includes(file.type)) {
    alert('请上传 JPEG 或 PNG 格式的图片');
    return;
  }

  if (file.size > 5 * 1024 * 1024) {
    alert('图片大小不能超过 5MB');
    return;
  }

  const reader = new FileReader();
  reader.onload = (e) => {
    const img = new Image();
    img.onload = async () => {
      state.image = img;

      const extracted = extractDominantColors(img);
      state.extractedColors = extracted;
      state.textColor = extracted.contrast;
      state.borderColor = extracted.primary;

      setupCanvases(img);
      updateColorUIs();

      elements!.uploadZone.classList.add('hidden');
      elements!.canvasPair.classList.remove('hidden');
      elements!.exportBtn.disabled = false;

      await renderHalftone();
    };
    img.src = e.target?.result as string;
  };
  reader.readAsDataURL(file);
}

function setupCanvases(img: HTMLImageElement) {
  if (!elements) return;

  const maxWidth = 400;
  const maxHeight = 300;
  const aspectRatio = img.naturalWidth / img.naturalHeight;

  let displayWidth = maxWidth;
  let displayHeight = displayWidth / aspectRatio;

  if (displayHeight > maxHeight) {
    displayHeight = maxHeight;
    displayWidth = displayHeight * aspectRatio;
  }

  displayWidth = Math.floor(displayWidth);
  displayHeight = Math.floor(displayHeight);

  for (const canvas of [elements.originalCanvas, elements.halftoneCanvas]) {
    canvas.width = displayWidth;
    canvas.height = displayHeight;
  }

  const origCtx = elements.originalCanvas.getContext('2d')!;
  origCtx.fillStyle = '#1E1E1E';
  origCtx.fillRect(0, 0, displayWidth, displayHeight);
  origCtx.drawImage(img, 0, 0, displayWidth, displayHeight);

  state.textPosition = { x: displayWidth / 2, y: displayHeight - 40 };
}

function updateColorUIs() {
  if (!elements) return;

  elements.textColorPicker.value = state.textColor;
  elements.textColorPreview.style.background = state.textColor;
  elements.textColorInfo.textContent = state.textColor.toUpperCase();

  elements.borderColorPicker.value = state.borderColor;
  elements.borderColorPreview.style.background = state.borderColor;
  elements.borderColorInfo.textContent = state.borderColor.toUpperCase();
}

function setupUploadHandlers() {
  if (!elements) return;

  const { uploadZone, fileInput } = elements;

  uploadZone.addEventListener('click', () => fileInput.click());

  fileInput.addEventListener('change', (e) => {
    const target = e.target as HTMLInputElement;
    const file = target.files?.[0];
    if (file) handleFileUpload(file);
  });

  uploadZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadZone.classList.add('dragover');
  });

  uploadZone.addEventListener('dragleave', () => {
    uploadZone.classList.remove('dragover');
  });

  uploadZone.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadZone.classList.remove('dragover');
    const file = e.dataTransfer?.files?.[0];
    if (file) handleFileUpload(file);
  });
}

function setupStyleHandlers() {
  if (!elements) return;

  elements.styleSelector.addEventListener('click', (e) => {
    const btn = (e.target as HTMLElement).closest('.style-btn') as HTMLElement | null;
    if (!btn) return;

    const style = btn.dataset.style as UIState['style'];
    if (!style) return;

    state.style = style;

    elements!.styleSelector.querySelectorAll('.style-btn').forEach((el) => {
      el.classList.remove('active');
    });
    btn.classList.add('active');

    scheduleRender();
  });
}

function setupDensityHandler() {
  if (!elements) return;

  elements.densitySlider.addEventListener('input', (e) => {
    const value = parseInt((e.target as HTMLInputElement).value, 10);
    state.density = value;
    elements!.densityValue.textContent = `${value}%`;
    scheduleRender();
  });
}

function setupTextHandlers() {
  if (!elements) return;

  elements.textInput.addEventListener('input', (e) => {
    const raw = (e.target as HTMLInputElement).value;
    state.text = validateText(raw);
    if (state.text !== raw) {
      (e.target as HTMLInputElement).value = state.text;
    }
    scheduleRender();
  });

  elements.fontSelector.addEventListener('click', (e) => {
    const btn = (e.target as HTMLElement).closest('.btn') as HTMLElement | null;
    if (!btn) return;

    const fontKey = btn.dataset.font;
    if (!fontKey) return;

    state.fontFamily = getFontFamily(fontKey);

    elements!.fontSelector.querySelectorAll('.btn').forEach((el) => {
      el.classList.remove('active');
    });
    btn.classList.add('active');

    scheduleRender();
  });

  elements.alignSelector.addEventListener('click', (e) => {
    const btn = (e.target as HTMLElement).closest('.btn') as HTMLElement | null;
    if (!btn) return;

    const align = btn.dataset.align as CanvasTextAlign;
    if (!align) return;

    state.textAlign = align;

    elements!.alignSelector.querySelectorAll('.btn').forEach((el) => {
      el.classList.remove('active');
    });
    btn.classList.add('active');

    scheduleRender();
  });

  elements.textColorPicker.addEventListener('input', (e) => {
    const color = (e.target as HTMLInputElement).value;
    state.textColor = color;
    elements!.textColorPreview.style.background = color;
    elements!.textColorInfo.textContent = color.toUpperCase();
    scheduleRender();
  });

  elements.borderColorPicker.addEventListener('input', (e) => {
    const color = (e.target as HTMLInputElement).value;
    state.borderColor = color;
    elements!.borderColorPreview.style.background = color;
    elements!.borderColorInfo.textContent = color.toUpperCase();
  });
}

function setupTextDragHandlers() {
  if (!elements) return;

  const canvas = elements.halftoneCanvas;

  const getCanvasCoords = (e: MouseEvent | TouchEvent) => {
    const rect = canvas.getBoundingClientRect();
    let clientX: number, clientY: number;

    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    return {
      x: (clientX - rect.left) * (canvas.width / rect.width),
      y: (clientY - rect.top) * (canvas.height / rect.height)
    };
  };

  const isOnText = (x: number, y: number) => {
    if (!state.text) return false;

    const ctx = canvas.getContext('2d')!;
    ctx.font = `bold 20px ${state.fontFamily}`;
    const metrics = ctx.measureText(state.text);
    const textWidth = metrics.width;
    const textHeight = 24;

    let textX = state.textPosition.x;
    if (state.textAlign === 'center') textX -= textWidth / 2;
    if (state.textAlign === 'right') textX -= textWidth;

    return x >= textX - 10 && x <= textX + textWidth + 10 &&
           y >= state.textPosition.y - 10 && y <= state.textPosition.y + textHeight + 10;
  };

  const onDown = (e: MouseEvent | TouchEvent) => {
    if (!state.text) return;
    const coords = getCanvasCoords(e);
    if (isOnText(coords.x, coords.y)) {
      state.isDraggingText = true;
      state.textDragOffset = {
        x: coords.x - state.textPosition.x,
        y: coords.y - state.textPosition.y
      };
      e.preventDefault();
    }
  };

  const onMove = (e: MouseEvent | TouchEvent) => {
    if (!state.isDraggingText) return;
    const coords = getCanvasCoords(e);
    state.textPosition = {
      x: Math.max(0, Math.min(canvas.width, coords.x - state.textDragOffset.x)),
      y: Math.max(0, Math.min(canvas.height, coords.y - state.textDragOffset.y))
    };
    scheduleRender();
    e.preventDefault();
  };

  const onUp = () => {
    state.isDraggingText = false;
  };

  canvas.addEventListener('mousedown', onDown);
  window.addEventListener('mousemove', onMove);
  window.addEventListener('mouseup', onUp);

  canvas.addEventListener('touchstart', onDown, { passive: false });
  window.addEventListener('touchmove', onMove, { passive: false });
  window.addEventListener('touchend', onUp);
}

function setupExportHandler() {
  if (!elements) return;

  elements.exportBtn.addEventListener('click', async () => {
    if (!state.image) return;

    try {
      const exportCanvas = await renderExportCanvas(
        state.image,
        { style: state.style, density: state.density },
        {
          text: state.text,
          fontFamily: state.fontFamily,
          align: state.textAlign,
          color: state.textColor,
          x: state.textPosition.x,
          y: state.textPosition.y
        },
        state.borderColor
      );

      const link = document.createElement('a');
      link.download = `halftone-poster-${Date.now()}.png`;
      link.href = exportCanvas.toDataURL('image/png');
      link.click();

      elements!.exportBtn.classList.add('highlight');
      setTimeout(() => {
        elements!.exportBtn.classList.remove('highlight');
      }, 600);
    } catch (err) {
      console.error('Export error:', err);
      alert('导出失败，请重试');
    }
  });
}

function setupResponsiveHandler() {
  if (!elements) return;

  elements.panelToggle.addEventListener('click', () => {
    elements!.controlPanel.classList.toggle('open');
  });
}

export function init() {
  elements = {
    uploadZone: document.getElementById('uploadZone') as HTMLElement,
    fileInput: document.getElementById('fileInput') as HTMLInputElement,
    canvasPair: document.getElementById('canvasPair') as HTMLElement,
    originalCanvas: document.getElementById('originalCanvas') as HTMLCanvasElement,
    halftoneCanvas: document.getElementById('halftoneCanvas') as HTMLCanvasElement,
    styleSelector: document.getElementById('styleSelector') as HTMLElement,
    densitySlider: document.getElementById('densitySlider') as HTMLInputElement,
    densityValue: document.getElementById('densityValue') as HTMLElement,
    textInput: document.getElementById('textInput') as HTMLInputElement,
    fontSelector: document.getElementById('fontSelector') as HTMLElement,
    alignSelector: document.getElementById('alignSelector') as HTMLElement,
    textColorPicker: document.getElementById('textColorPicker') as HTMLInputElement,
    textColorPreview: document.getElementById('textColorPreview') as HTMLElement,
    textColorInfo: document.getElementById('textColorInfo') as HTMLElement,
    borderColorPicker: document.getElementById('borderColorPicker') as HTMLInputElement,
    borderColorPreview: document.getElementById('borderColorPreview') as HTMLElement,
    borderColorInfo: document.getElementById('borderColorInfo') as HTMLElement,
    exportBtn: document.getElementById('exportBtn') as HTMLButtonElement,
    panelToggle: document.getElementById('panelToggle') as HTMLElement,
    controlPanel: document.getElementById('controlPanel') as HTMLElement
  };

  setupUploadHandlers();
  setupStyleHandlers();
  setupDensityHandler();
  setupTextHandlers();
  setupTextDragHandlers();
  setupExportHandler();
  setupResponsiveHandler();
}
