import { ChartRenderer } from './chartRenderer';
import { ControlsManager } from './controlsManager';
import type { DataGroup } from './types';
import confetti from 'canvas-confetti';

const defaultGroups: DataGroup[] = [
  { id: 'group_a', label: '分组A', percentage: 30, color: '#FF6B6B' },
  { id: 'group_b', label: '分组B', percentage: 25, color: '#4ECDC4' },
  { id: 'group_c', label: '分组C', percentage: 20, color: '#45B7D1' },
  { id: 'group_d', label: '分组D', percentage: 25, color: '#96CEB4' },
];

const formatDate = (): string => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}${month}${day}`;
};

const triggerConfetti = (): void => {
  const duration = 800;
  const end = Date.now() + duration;
  const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD'];

  const frame = () => {
    confetti({
      particleCount: 3,
      angle: 60,
      spread: 55,
      origin: { x: 0 },
      colors: colors,
    });
    confetti({
      particleCount: 3,
      angle: 120,
      spread: 55,
      origin: { x: 1 },
      colors: colors,
    });

    if (Date.now() < end) {
      requestAnimationFrame(frame);
    }
  };
  frame();
};

const init = (): void => {
  const canvas = document.getElementById('chart-canvas') as HTMLCanvasElement;
  const controlsContainer = document.getElementById('controls-container') as HTMLElement;
  const exportBtn = document.getElementById('export-btn') as HTMLButtonElement;

  if (!canvas || !controlsContainer || !exportBtn) {
    console.error('Required elements not found');
    return;
  }

  const renderer = new ChartRenderer(canvas);
  renderer.setGroups(defaultGroups);

  const controlsManager = new ControlsManager(controlsContainer, {
    onGroupsChange: (groups: DataGroup[]) => {
      renderer.setGroups(groups);
    },
    onModeChange: (mode: 'pie' | 'donut') => {
      renderer.setMode(mode);
    },
    onCenterTextChange: (text: string) => {
      renderer.setCenterText(text);
    },
    onExport: () => {},
  });

  controlsManager.setGroups(defaultGroups);

  exportBtn.addEventListener('click', async () => {
    triggerConfetti();
    try {
      const blob = await renderer.exportPNG();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `chart_${formatDate()}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export failed:', err);
    }
  });

  let resizeTimeout: number | null = null;
  window.addEventListener('resize', () => {
    if (resizeTimeout !== null) {
      window.clearTimeout(resizeTimeout);
    }
    resizeTimeout = window.setTimeout(() => {
      renderer.resize();
    }, 100);
  });
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
