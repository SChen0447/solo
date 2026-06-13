import { AudioManager, type AudioState, type PresetType } from './audio.js';
import { Visualizer, FrequencyPreview } from './visualizer.js';

function formatTime(sec: number): string {
  if (!isFinite(sec) || sec < 0) sec = 0;
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

class App {
  private audioManager: AudioManager;
  private visualizer: Visualizer;
  private freqPreview: FrequencyPreview;
  private canvas: HTMLCanvasElement;
  private freqCanvas: HTMLCanvasElement;
  private lastFrameTime: number = 0;
  private animationId: number | null = null;
  private currentPreset: PresetType | null = null;
  private currentDominantColor: string = '#48dbfb';
  private lastAudioState: AudioState | null = null;
  private ui: {
    trackName: HTMLDivElement;
    progressBar: HTMLDivElement;
    progressFill: HTMLDivElement;
    currentTime: HTMLSpanElement;
    totalTime: HTMLSpanElement;
    presetButtons: NodeListOf<HTMLButtonElement>;
    audioUpload: HTMLInputElement;
  };

  constructor() {
    this.canvas = document.getElementById('visualizer-canvas') as HTMLCanvasElement;
    this.freqCanvas = document.getElementById('freq-preview-canvas') as HTMLCanvasElement;
    if (!this.canvas || !this.freqCanvas) {
      throw new Error('无法找到Canvas元素');
    }

    this.audioManager = new AudioManager();
    this.visualizer = new Visualizer(this.canvas);
    this.freqPreview = new FrequencyPreview(this.freqCanvas);

    this.ui = {
      trackName: document.getElementById('track-name') as HTMLDivElement,
      progressBar: document.getElementById('progress-bar') as HTMLDivElement,
      progressFill: document.getElementById('progress-fill') as HTMLDivElement,
      currentTime: document.getElementById('current-time') as HTMLSpanElement,
      totalTime: document.getElementById('total-time') as HTMLSpanElement,
      presetButtons: document.querySelectorAll<HTMLButtonElement>('.preset-btn'),
      audioUpload: document.getElementById('audio-upload') as HTMLInputElement
    };

    this.bindEvents();
    this.audioManager.setStateCallback((s) => this.onAudioStateChange(s));
    this.start();
  }

  private bindEvents(): void {
    this.ui.presetButtons.forEach(btn => {
      btn.addEventListener('click', async () => {
        const preset = btn.dataset.preset as PresetType;
        if (!preset) return;
        this.setActivePresetButton(preset);
        this.currentPreset = preset;
        const bpm = this.audioManager.getBPM(preset);
        this.visualizer.setConfig({ bpm, preset });
        try {
          await this.audioManager.playPreset(preset);
        } catch (err) {
          console.error('播放预设失败:', err);
        }
      });
    });

    this.ui.audioUpload.addEventListener('change', async (e) => {
      const input = e.target as HTMLInputElement;
      const file = input.files?.[0];
      if (!file) return;
      try {
        this.currentPreset = null;
        this.setActivePresetButton(null);
        this.visualizer.setConfig({ bpm: 110, preset: null });
        await this.audioManager.playFile(file);
      } catch (err) {
        alert(err instanceof Error ? err.message : '文件加载失败');
        console.error('加载文件失败:', err);
      } finally {
        input.value = '';
      }
    });

    this.ui.progressBar.addEventListener('click', (e) => {
      const bar = this.ui.progressBar;
      const rect = bar.getBoundingClientRect();
      const progress = (e.clientX - rect.left) / rect.width;
      this.audioManager.seek(progress);
    });

    window.addEventListener('resize', () => {
      this.visualizer.resize();
      this.freqPreview.resize();
    });

    let resizeTimer: number | null = null;
    const ro = new ResizeObserver(() => {
      if (resizeTimer !== null) clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(() => {
        this.visualizer.resize();
        this.freqPreview.resize();
      }, 50);
    });
    ro.observe(this.canvas);
    ro.observe(this.freqCanvas);
  }

  private setActivePresetButton(preset: PresetType | null): void {
    this.ui.presetButtons.forEach(btn => {
      if (btn.dataset.preset === preset) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });
  }

  private onAudioStateChange(state: AudioState): void {
    this.lastAudioState = state;
    this.ui.trackName.textContent = state.trackName;
    const pct = state.duration > 0 ? (state.currentTime / state.duration) * 100 : 0;
    this.ui.progressFill.style.width = `${Math.max(0, Math.min(100, pct))}%`;
    this.ui.progressFill.style.background = this.currentDominantColor;
    this.ui.currentTime.textContent = formatTime(state.currentTime);
    this.ui.totalTime.textContent = formatTime(state.duration);
  }

  private start(): void {
    this.lastFrameTime = performance.now();
    const loop = (now: number) => {
      const dt = Math.min(0.1, (now - this.lastFrameTime) / 1000);
      this.lastFrameTime = now;
      const audioData = this.audioManager.getAudioData();
      this.visualizer.render(audioData, dt);
      if (audioData) {
        this.currentDominantColor = this.visualizer.getDominantGradient(audioData);
        this.ui.progressFill.style.background = this.currentDominantColor;
        this.freqPreview.render(audioData.frequencyData, this.currentDominantColor);
      } else {
        this.freqPreview.render(null, this.currentDominantColor);
      }
      if (this.lastAudioState) {
        this.onAudioStateChange(this.lastAudioState);
      }
      this.animationId = requestAnimationFrame(loop);
    };
    this.animationId = requestAnimationFrame(loop);
  }

  public destroy(): void {
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
    this.audioManager.stopCurrent();
  }
}

document.addEventListener('DOMContentLoaded', () => {
  try {
    (window as unknown as { __app?: App }).__app = new App();
  } catch (err) {
    console.error('应用初始化失败:', err);
  }
});
