import { Animator } from './animator';
import type { AnimationConfig, AnimationPreset } from './presets';
import { presets, defaultConfig } from './presets';

const HISTORY_LIMIT = 20;
const STORAGE_KEY = 'css-animation-builder-history';
const STATE_KEY = 'css-animation-builder-state';

interface HistoryState {
  config: AnimationConfig;
  speed: number;
}

export class UIController {
  private animator: Animator;
  private elements: Record<string, HTMLElement | null> = {};
  private history: HistoryState[] = [];
  private historyIndex: number = -1;
  private debounceTimer: number | null = null;
  private isDragging: boolean = false;
  private dragOffset = { x: 0, y: 0 };

  constructor(previewElement: HTMLElement) {
    this.animator = new Animator(previewElement, this.loadState() || defaultConfig);
    this.initElements();
    this.loadHistory();
    this.renderPresets();
    this.syncUIFromConfig();
    this.updateCodeDisplay();
    this.bindEvents();
    this.animator.start();
    this.saveHistory();
  }

  private initElements(): void {
    const ids = [
      'animationType', 'duration', 'durationValue', 'delay', 'delayValue',
      'easing', 'direction', 'fillMode', 'loopToggle',
      'playPauseBtn', 'playIcon', 'resetBtn', 'speedSlider', 'speedValue',
      'copyBtn', 'exportBtn', 'codeContent',
      'undoBtn', 'redoBtn', 'presetList',
      'previewElement', 'previewStage', 'toast'
    ];
    ids.forEach(id => {
      this.elements[id] = document.getElementById(id);
    });
  }

  private bindEvents(): void {
    const $ = (id: string) => this.elements[id];

    $('animationType')?.addEventListener('change', () => this.onConfigChange());
    $('easing')?.addEventListener('change', () => this.onConfigChange());
    $('direction')?.addEventListener('change', () => this.onConfigChange());
    $('fillMode')?.addEventListener('change', () => this.onConfigChange());
    $('loopToggle')?.addEventListener('change', () => this.onConfigChange());

    $('duration')?.addEventListener('input', (e) => {
      const val = (e.target as HTMLInputElement).value;
      if ($('durationValue')) $('durationValue')!.textContent = parseFloat(val).toFixed(1);
      this.throttledConfigChange();
    });

    $('delay')?.addEventListener('input', (e) => {
      const val = (e.target as HTMLInputElement).value;
      if ($('delayValue')) $('delayValue')!.textContent = parseFloat(val).toFixed(1);
      this.throttledConfigChange();
    });

    $('speedSlider')?.addEventListener('input', (e) => {
      const val = parseFloat((e.target as HTMLInputElement).value);
      if ($('speedValue')) $('speedValue')!.textContent = val.toFixed(1) + 'x';
      this.animator.setSpeed(val);
      this.saveState();
    });

    $('playPauseBtn')?.addEventListener('click', () => this.togglePlay());
    $('resetBtn')?.addEventListener('click', () => this.animator.reset());

    $('copyBtn')?.addEventListener('click', () => this.copyCSS());
    $('exportBtn')?.addEventListener('click', () => this.exportHTML());

    $('undoBtn')?.addEventListener('click', () => this.undo());
    $('redoBtn')?.addEventListener('click', () => this.redo());

    this.setupDrag();
    this.setupShapeSwitcher();
    this.setupMobileTabs();
  }

  private setupDrag(): void {
    const el = this.elements['previewElement'] as HTMLElement | null;
    const stage = this.elements['previewStage'] as HTMLElement | null;
    if (!el || !stage) return;

    const onStart = (clientX: number, clientY: number) => {
      const rect = el.getBoundingClientRect();
      this.dragOffset.x = clientX - rect.left - rect.width / 2;
      this.dragOffset.y = clientY - rect.top - rect.height / 2;
      this.isDragging = true;
      el.classList.add('dragging');
    };

    const onMove = (clientX: number, clientY: number) => {
      if (!this.isDragging) return;
      const stageRect = stage.getBoundingClientRect();
      const x = clientX - stageRect.left - stageRect.width / 2 - this.dragOffset.x;
      const y = clientY - stageRect.top - stageRect.height / 2 - this.dragOffset.y;
      el.style.left = `calc(50% + ${x}px)`;
      el.style.top = `calc(50% + ${y}px)`;
    };

    const onEnd = () => {
      this.isDragging = false;
      el.classList.remove('dragging');
    };

    el.addEventListener('mousedown', (e) => {
      e.preventDefault();
      onStart(e.clientX, e.clientY);
    });

    el.addEventListener('touchstart', (e) => {
      const touch = e.touches[0];
      onStart(touch.clientX, touch.clientY);
    }, { passive: true });

    document.addEventListener('mousemove', (e) => onMove(e.clientX, e.clientY));
    document.addEventListener('touchmove', (e) => {
      const touch = e.touches[0];
      onMove(touch.clientX, touch.clientY);
    }, { passive: true });

    document.addEventListener('mouseup', onEnd);
    document.addEventListener('touchend', onEnd);
  }

  private setupShapeSwitcher(): void {
    document.querySelectorAll('.shape-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.shape-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const el = this.elements['previewElement'];
        if (el) {
          el.classList.remove('shape-square', 'shape-circle');
          el.classList.add(`shape-${(btn as HTMLElement).dataset.shape}`);
        }
      });
    });
  }

  private setupMobileTabs(): void {
    document.querySelectorAll('.tab-btn').forEach(tab => {
      tab.addEventListener('click', () => {
        const target = (tab as HTMLElement).dataset.tab;
        document.querySelectorAll('.tab-btn').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        document.querySelectorAll('.panel').forEach(p => {
          p.classList.toggle('mobile-visible', (p as HTMLElement).dataset.panel === target);
        });
      });
    });
  }

  private readConfigFromUI(): AnimationConfig {
    const $ = (id: string) => this.elements[id];
    const loopChecked = ($('loopToggle') as HTMLInputElement | null)?.checked;
    return {
      type: ($('animationType') as HTMLSelectElement | null)?.value || 'fadeIn',
      duration: parseFloat(($('duration') as HTMLInputElement | null)?.value || '1'),
      delay: parseFloat(($('delay') as HTMLInputElement | null)?.value || '0'),
      easing: ($('easing') as HTMLSelectElement | null)?.value || 'ease-in-out',
      iterationCount: loopChecked ? 'infinite' : '1',
      direction: ($('direction') as HTMLSelectElement | null)?.value || 'normal',
      fillMode: ($('fillMode') as HTMLSelectElement | null)?.value || 'forwards'
    };
  }

  private syncUIFromConfig(): void {
    const $ = (id: string) => this.elements[id];
    const config = this.animator.getConfig();
    const speed = this.animator.getSpeed();

    if ($('animationType')) ($('animationType') as HTMLSelectElement).value = config.type;
    if ($('duration')) ($('duration') as HTMLInputElement).value = String(config.duration);
    if ($('durationValue')) $('durationValue')!.textContent = config.duration.toFixed(1);
    if ($('delay')) ($('delay') as HTMLInputElement).value = String(config.delay);
    if ($('delayValue')) $('delayValue')!.textContent = config.delay.toFixed(1);
    if ($('easing')) ($('easing') as HTMLSelectElement).value = config.easing;
    if ($('direction')) ($('direction') as HTMLSelectElement).value = config.direction;
    if ($('fillMode')) ($('fillMode') as HTMLSelectElement).value = config.fillMode;
    if ($('loopToggle')) ($('loopToggle') as HTMLInputElement).checked = config.iterationCount === 'infinite';
    if ($('speedSlider')) ($('speedSlider') as HTMLInputElement).value = String(speed);
    if ($('speedValue')) $('speedValue')!.textContent = speed.toFixed(1) + 'x';

    this.updatePlayIcon();
  }

  private onConfigChange(): void {
    const config = this.readConfigFromUI();
    this.animator.updateConfig(config);
    this.pushHistory();
    this.updateCodeDisplay();
    this.saveState();
  }

  private throttledConfigChange(): void {
    if (this.debounceTimer) {
      window.clearTimeout(this.debounceTimer);
    }
    this.debounceTimer = window.setTimeout(() => {
      this.onConfigChange();
    }, 50);
  }

  private updateCodeDisplay(): void {
    const codeEl = this.elements['codeContent'];
    if (codeEl) {
      codeEl.textContent = this.animator.getFullCSS();
      requestAnimationFrame(() => {
        codeEl.parentElement?.classList.remove('highlight-flash');
        void codeEl.parentElement?.offsetWidth;
        codeEl.parentElement?.classList.add('highlight-flash');
      });
    }
  }

  private updatePlayIcon(): void {
    const icon = this.elements['playIcon'];
    if (icon) {
      icon.textContent = this.animator.getIsPlaying() ? '⏸' : '▶';
    }
  }

  private togglePlay(): void {
    if (this.animator.getIsPlaying()) {
      this.animator.stop();
    } else {
      this.animator.start();
    }
    this.updatePlayIcon();
  }

  private renderPresets(): void {
    const list = this.elements['presetList'];
    if (!list) return;
    list.innerHTML = '';
    presets.forEach((preset: AnimationPreset) => {
      const btn = document.createElement('button');
      btn.className = 'preset-btn';
      btn.innerHTML = `<span class="preset-icon">${preset.icon}</span><span class="preset-name">${preset.name}</span>`;
      btn.addEventListener('click', () => this.applyPreset(preset));
      list.appendChild(btn);
    });
  }

  private applyPreset(preset: AnimationPreset): void {
    this.animator.updateConfig(preset.config);
    this.animator.setSpeed(1);
    this.syncUIFromConfig();
    this.pushHistory();
    this.updateCodeDisplay();
    this.saveState();
    this.showToast(`已加载预设: ${preset.name}`);
  }

  private pushHistory(): void {
    const state: HistoryState = {
      config: this.animator.getConfig(),
      speed: this.animator.getSpeed()
    };
    if (this.historyIndex < this.history.length - 1) {
      this.history = this.history.slice(0, this.historyIndex + 1);
    }
    if (this.history.length === 0 || JSON.stringify(this.history[this.history.length - 1]) !== JSON.stringify(state)) {
      this.history.push(state);
      if (this.history.length > HISTORY_LIMIT) {
        this.history.shift();
      } else {
        this.historyIndex++;
      }
    }
    this.saveHistory();
    this.updateHistoryButtons();
  }

  private undo(): void {
    if (this.historyIndex > 0) {
      this.historyIndex--;
      this.applyHistoryState();
      this.showToast('已撤销');
    }
  }

  private redo(): void {
    if (this.historyIndex < this.history.length - 1) {
      this.historyIndex++;
      this.applyHistoryState();
      this.showToast('已重做');
    }
  }

  private applyHistoryState(): void {
    const state = this.history[this.historyIndex];
    if (state) {
      this.animator.updateConfig(state.config);
      this.animator.setSpeed(state.speed);
      this.syncUIFromConfig();
      this.updateCodeDisplay();
      this.saveState();
      this.updateHistoryButtons();
    }
  }

  private updateHistoryButtons(): void {
    const undo = this.elements['undoBtn'] as HTMLButtonElement | null;
    const redo = this.elements['redoBtn'] as HTMLButtonElement | null;
    if (undo) undo.disabled = this.historyIndex <= 0;
    if (redo) redo.disabled = this.historyIndex >= this.history.length - 1;
  }

  private loadHistory(): void {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (data) {
        const parsed = JSON.parse(data) as HistoryState[];
        if (Array.isArray(parsed) && parsed.length > 0) {
          this.history = parsed;
          this.historyIndex = parsed.length - 1;
        }
      }
    } catch {
      this.history = [];
      this.historyIndex = -1;
    }
    if (this.history.length === 0) {
      this.pushHistory();
    }
    this.updateHistoryButtons();
  }

  private saveHistory(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.history));
    } catch {
    }
  }

  private saveState(): void {
    try {
      const state: HistoryState = {
        config: this.animator.getConfig(),
        speed: this.animator.getSpeed()
      };
      localStorage.setItem(STATE_KEY, JSON.stringify(state));
    } catch {
    }
  }

  private loadState(): AnimationConfig | null {
    try {
      const data = localStorage.getItem(STATE_KEY);
      if (data) {
        const parsed = JSON.parse(data) as HistoryState;
        return parsed.config;
      }
    } catch {
    }
    return null;
  }

  private async copyCSS(): Promise<void> {
    const css = this.animator.getFullCSS();
    try {
      await navigator.clipboard.writeText(css);
      this.showToast('CSS代码已复制到剪贴板');
    } catch {
      const ta = document.createElement('textarea');
      ta.value = css;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      ta.remove();
      this.showToast('CSS代码已复制');
    }
  }

  private exportHTML(): void {
    const css = this.animator.getFullCSS();
    const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>CSS动画预览</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    }
    .demo-element {
      width: 100px;
      height: 100px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-weight: bold;
      font-size: 18px;
      box-shadow: 0 8px 32px rgba(102, 126, 234, 0.4);
    }
${css}
    .animated-element { /* 应用动画的目标类 */ }
  </style>
</head>
<body>
  <div class="demo-element animated-element">Ani</div>
</body>
</html>`;

    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `css-animation-${Date.now()}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    this.showToast('HTML文件已导出');
  }

  private showToast(message: string): void {
    const toast = this.elements['toast'];
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add('show');
    window.setTimeout(() => toast.classList.remove('show'), 2000);
  }

  destroy(): void {
    this.animator.destroy();
  }
}
