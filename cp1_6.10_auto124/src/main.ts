import { ColorPicker } from './colorPicker';
import { PaletteManager } from './paletteManager';
import { AccessibilityReport } from './accessibilityReport';
import { ColorBlindType } from './colorUtils';

function showToast(message: string, type: 'success' | 'error'): void {
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 2000);
}

function showResetModal(onConfirm: () => void): void {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal">
      <div class="modal-title">确认重置所有数据？</div>
      <div style="color: #666; font-size: 13px;">此操作将清空所有保存的颜色，无法撤销。</div>
      <div class="modal-actions">
        <button class="modal-btn modal-btn-confirm" id="modal-confirm">确认</button>
        <button class="modal-btn modal-btn-cancel" id="modal-cancel">取消</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  overlay.querySelector('#modal-cancel')?.addEventListener('click', () => overlay.remove());
  overlay.querySelector('#modal-confirm')?.addEventListener('click', () => {
    onConfirm();
    overlay.remove();
  });
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) overlay.remove();
  });
}

function initApp(): void {
  const app = document.getElementById('app');
  if (!app) return;

  app.innerHTML = `
    <nav class="navbar">
      <div class="navbar-title">Chroma Studio</div>
      <button class="reset-btn" id="reset-all-btn">重置所有</button>
    </nav>
    <div class="main-container">
      <div class="left-panel">
        <div class="module" id="color-picker-module"></div>
      </div>
      <div class="right-panel">
        <div class="module" id="palette-module"></div>
        <div class="module" id="a11y-module"></div>
      </div>
    </div>
  `;

  const colorPickerModule = app.querySelector('#color-picker-module') as HTMLElement;
  const paletteModule = app.querySelector('#palette-module') as HTMLElement;
  const a11yModule = app.querySelector('#a11y-module') as HTMLElement;

  const colorPicker = new ColorPicker(colorPickerModule);
  const paletteManager = new PaletteManager(paletteModule);
  const accessibilityReport = new AccessibilityReport(a11yModule);

  paletteManager.getCurrentColor = () => colorPicker.getCurrentColor();
  paletteManager.showToast = showToast;

  const debouncedUpdate = debounce(() => {
    accessibilityReport.updateColors(paletteManager.getColors());
  }, 50);

  paletteManager.onPaletteChange = () => {
    debouncedUpdate();
  };

  accessibilityReport.onColorBlindChange = (type: ColorBlindType) => {
    colorPicker.setColorBlindType(type);
    paletteManager.setColorBlindType(type);
  };

  accessibilityReport.updateColors(paletteManager.getColors());

  const resetBtn = app.querySelector('#reset-all-btn');
  resetBtn?.addEventListener('click', () => {
    showResetModal(() => {
      paletteManager.reset();
      showToast('已重置', 'success');
    });
  });
}

function debounce<T extends (...args: any[]) => void>(fn: T, delay: number): T {
  let timer: number | null = null;
  return ((...args: any[]) => {
    if (timer !== null) clearTimeout(timer);
    timer = window.setTimeout(() => fn(...args), delay);
  }) as T;
}

document.addEventListener('DOMContentLoaded', initApp);
