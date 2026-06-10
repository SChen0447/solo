import './styles.css';
import { PaletteManager } from './paletteManager';
import { CanvasRenderer } from './canvasRenderer';
import { UIController } from './uiController';

function getTimestampForFilename(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return (
    `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}` +
    `_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`
  );
}

function downloadJSON(content: string, filename: string): void {
  const blob = new Blob([content], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });
}

function initApp(): void {
  const app = document.getElementById('app');
  if (!app) {
    console.error('未找到 #app 根元素');
    return;
  }

  const paletteManager = new PaletteManager();

  const ui = new UIController(app, paletteManager, {
    onApplyPalette: () => {
      const colors = paletteManager.getColors();
      if (colors.length === 0) {
        ui.showToast('色板为空，无法应用替换', 'warning');
        return;
      }
      if (renderer.isAnimating()) {
        return;
      }
      const success = renderer.replaceWithPalette(colors);
      if (!success) {
        ui.showToast('正在执行动画，请稍后再试', 'warning');
      }
    },
    onExportPalette: () => {
      const json = paletteManager.exportToJson();
      const filename = `palette_${getTimestampForFilename()}.json`;
      downloadJSON(json, filename);
      ui.showToast('色板已导出', 'info');
    },
    onImportPalette: async (file: File) => {
      try {
        const text = await readFileAsText(file);
        const result = paletteManager.importFromJson(text);
        if (result.success) {
          ui.showToast('色板导入成功', 'info');
        } else {
          ui.showToast(`导入失败：${result.error ?? '未知错误'}`, 'error');
        }
      } catch (e) {
        ui.showToast('读取文件失败', 'error');
      }
    }
  });

  const canvasWrapper = ui.getCanvasWrapper();
  if (!canvasWrapper) {
    console.error('未找到画布容器');
    return;
  }

  const renderer = new CanvasRenderer({
    container: canvasWrapper,
    baseWidth: 600,
    baseHeight: 400
  });

  renderer.onAnimationStart(() => {
    ui.setInteractionEnabled(false);
  });

  renderer.onAnimationEnd(() => {
    ui.setInteractionEnabled(true);
  });

  window.addEventListener('resize', () => {
    renderer.resize();
    renderer.render();
  });

  ui.setInteractionEnabled(true);
}

document.addEventListener('DOMContentLoaded', initApp);
