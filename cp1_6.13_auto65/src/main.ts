import { ParticleSystem, THEMES } from './particle';
import { AudioVisualizer } from './visualizer';
import { UIManager, type UIConfig } from './ui';

class App {
  private mainCanvas: HTMLCanvasElement;
  private mainCtx: CanvasRenderingContext2D;
  private waveformCanvas: HTMLCanvasElement;
  private particleSystem: ParticleSystem;
  private visualizer: AudioVisualizer;
  private uiManager: UIManager;
  private width: number = 0;
  private height: number = 0;
  private lastFrameTime: number = 0;
  private startTime: number = 0;
  private animationId: number = 0;
  private readonly pressedKeys = new Set<string>();

  constructor() {
    this.mainCanvas = document.getElementById('mainCanvas') as HTMLCanvasElement;
    this.waveformCanvas = document.getElementById('waveformCanvas') as HTMLCanvasElement;

    const ctx = this.mainCanvas.getContext('2d', { alpha: false });
    if (!ctx) throw new Error('无法获取主 Canvas 上下文');
    this.mainCtx = ctx;

    const initialConfig: UIConfig = {
      particleConfig: {
        count: 80,
        lifetime: 2
      },
      theme: 'deepSpace'
    };

    this.resize();
    window.addEventListener('resize', () => this.resize());

    this.particleSystem = new ParticleSystem(
      this.width,
      this.height,
      initialConfig.particleConfig,
      THEMES[initialConfig.theme]
    );

    this.visualizer = new AudioVisualizer(this.waveformCanvas);

    this.uiManager = new UIManager(
      document.getElementById('app') as HTMLElement,
      initialConfig,
      (config) => this.onConfigChange(config)
    );

    this.bindEvents();
    this.start();
  }

  private resize(): void {
    const dpr = window.devicePixelRatio || 1;
    const rect = this.mainCanvas.getBoundingClientRect();

    this.width = rect.width;
    this.height = rect.height;

    this.mainCanvas.width = rect.width * dpr;
    this.mainCanvas.height = rect.height * dpr;
    this.mainCtx.setTransform(dpr, 0, 0, dpr, 0, 0);

    if (this.particleSystem) {
      this.particleSystem.resize(this.width, this.height);
    }

    if (this.visualizer) {
      this.visualizer.resizeCanvas();
    }
  }

  private onConfigChange(config: UIConfig): void {
    this.particleSystem.particleConfig = { ...config.particleConfig };
    this.particleSystem.theme = THEMES[config.theme];
    this.particleSystem.drawBackground(this.mainCtx);
  }

  private bindEvents(): void {
    window.addEventListener('keydown', (e) => {
      if (e.repeat) return;

      const key = e.key;

      if (key.length === 1 && /[a-zA-Z]/.test(key)) {
        e.preventDefault();
        this.pressedKeys.add(key);
        this.handleLetterKey(key);
      } else if (key.length === 1 && /[0-9]/.test(key)) {
        e.preventDefault();
        this.pressedKeys.add(key);
        this.handleDigitKey(key);
      } else if (key === ' ') {
        e.preventDefault();
        this.handleSpaceKey();
      }
    });

    window.addEventListener('keyup', (e) => {
      this.pressedKeys.delete(e.key);
    });
  }

  private handleLetterKey(key: string): void {
    const cx = this.width / 2;
    const cy = this.height / 2;
    const color = this.particleSystem.emit(key, cx, cy);
    this.visualizer.playKeySound(key);
    this.uiManager.addKey(key, color);
  }

  private handleDigitKey(key: string): void {
    const cx = this.width / 2;
    const cy = this.height / 2;
    const color = this.particleSystem.emit(key, cx, cy);
    this.particleSystem.addRipple(cx, cy);
    this.visualizer.playDigitSound();
    this.visualizer.playKeySound(key);
    this.uiManager.addKey(key, color);
  }

  private handleSpaceKey(): void {
    const cx = this.width / 2;
    const cy = this.height / 2;
    const color = {
      r: Math.round((THEMES[this.uiManager.getConfig().theme].colorStart.r + THEMES[this.uiManager.getConfig().theme].colorEnd.r) / 2),
      g: Math.round((THEMES[this.uiManager.getConfig().theme].colorStart.g + THEMES[this.uiManager.getConfig().theme].colorEnd.g) / 2),
      b: Math.round((THEMES[this.uiManager.getConfig().theme].colorStart.b + THEMES[this.uiManager.getConfig().theme].colorEnd.b) / 2)
    };
    this.particleSystem.emit(' ', cx, cy);
    this.particleSystem.addFlash();
    this.visualizer.playSpaceSound();
    this.uiManager.addKey(' ', color);
  }

  private start(): void {
    this.startTime = performance.now();
    this.lastFrameTime = this.startTime;

    const loading = document.getElementById('loading');
    if (loading) {
      loading.classList.add('hidden');
      setTimeout(() => {
        loading.remove();
      }, 600);
    }

    this.loop();
  }

  private loop = (): void => {
    const now = performance.now();
    const deltaTime = Math.min(now - this.lastFrameTime, 50);
    const elapsed = now - this.startTime;

    this.update(deltaTime, elapsed);
    this.draw(elapsed);

    this.lastFrameTime = now;
    this.animationId = requestAnimationFrame(this.loop);
  };

  private update(deltaTime: number, time: number): void {
    this.particleSystem.update(deltaTime, time);
  }

  private draw(time: number): void {
    this.particleSystem.draw(this.mainCtx);
    this.visualizer.draw(time);
  }

  public destroy(): void {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
  }
}

window.addEventListener('DOMContentLoaded', () => {
  try {
    new App();
  } catch (err) {
    console.error('应用初始化失败:', err);
  }
});

declare global {
  interface Window {
    webkitAudioContext?: typeof AudioContext;
  }
}
