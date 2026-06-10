import { GUI } from 'dat.gui';
import { AudioAnalyzer } from './audioAnalyzer';
import { ParticleRenderer, VisualizationMode, ColorTheme } from './particleRenderer';

interface Settings {
  mode: VisualizationMode;
  particleCount: number;
  theme: ColorTheme;
}

export class UIController {
  private gui: GUI;
  private audioAnalyzer: AudioAnalyzer;
  private particleRenderer: ParticleRenderer;
  private settings: Settings;

  private uploadArea: HTMLElement | null;
  private fileInput: HTMLInputElement | null;
  private urlInput: HTMLInputElement | null;
  private playBtn: HTMLElement | null;
  private progressBar: HTMLInputElement | null;
  private volumeSlider: HTMLInputElement | null;
  private timeDisplay: HTMLElement | null;
  private timeText: HTMLElement | null;
  private volumeBar: HTMLElement | null;
  private bpmDisplay: HTMLElement | null;
  private isSeeking: boolean = false;

  constructor(audioAnalyzer: AudioAnalyzer, particleRenderer: ParticleRenderer) {
    this.audioAnalyzer = audioAnalyzer;
    this.particleRenderer = particleRenderer;

    this.settings = {
      mode: 'sphere',
      particleCount: 1024,
      theme: 'default'
    };

    this.gui = new GUI({ autoPlace: false, width: 280 });
    this.gui.domElement.style.borderRadius = '8px';
    this.gui.domElement.style.background = 'rgba(30, 30, 46, 0.8)';

    const container = document.getElementById('gui-container');
    if (container) {
      container.appendChild(this.gui.domElement);
    }

    this.uploadArea = document.getElementById('upload-area');
    this.fileInput = document.getElementById('file-input') as HTMLInputElement;
    this.urlInput = document.getElementById('url-input') as HTMLInputElement;
    this.playBtn = document.getElementById('play-btn');
    this.progressBar = document.getElementById('progress-bar') as HTMLInputElement;
    this.volumeSlider = document.getElementById('volume-slider') as HTMLInputElement;
    this.timeDisplay = document.getElementById('time-display');
    this.timeText = document.getElementById('time-text');
    this.volumeBar = document.getElementById('volume-bar');
    this.bpmDisplay = document.getElementById('bpm-display');
  }

  public init(): void {
    this.buildGUI();
    this.setupEventListeners();
    this.audioAnalyzer.setOnEndedCallback(() => {
      if (this.playBtn) {
        this.playBtn.textContent = '▶';
      }
    });
  }

  private buildGUI(): void {
    const visFolder = this.gui.addFolder('可视化');

    const modes: Record<string, VisualizationMode> = {
      '球状粒子': 'sphere',
      '柱状频谱': 'bars',
      '波形环绕': 'waveform'
    };
    visFolder.add(this.settings, 'mode', modes).name('模式').onChange((v: VisualizationMode) => {
      this.particleRenderer.setMode(v);
    });

    visFolder.add(this.settings, 'particleCount', 512, 4096, 512)
      .name('粒子数量')
      .onChange((v: number) => {
        this.particleRenderer.createParticles(v);
      });

    const themes: Record<string, ColorTheme> = {
      '暖冷渐变': 'default',
      '单色青色': 'cyan',
      '霓虹粉绿': 'neon'
    };
    visFolder.add(this.settings, 'theme', themes).name('颜色主题').onChange((v: ColorTheme) => {
      this.particleRenderer.setColorTheme(v);
    });

    visFolder.open();
  }

  private formatTime(seconds: number): string {
    if (!isFinite(seconds) || seconds < 0) seconds = 0;
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }

  private setupEventListeners(): void {
    if (this.uploadArea && this.fileInput) {
      this.uploadArea.addEventListener('click', (e) => {
        if ((e.target as HTMLElement).id !== 'url-input') {
          this.fileInput!.click();
        }
      });

      this.uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        this.uploadArea!.classList.add('dragover');
      });

      this.uploadArea.addEventListener('dragleave', () => {
        this.uploadArea!.classList.remove('dragover');
      });

      this.uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        this.uploadArea!.classList.remove('dragover');
        if (e.dataTransfer && e.dataTransfer.files.length > 0) {
          const file = e.dataTransfer.files[0];
          if (file.type.startsWith('audio/')) {
            this.loadFile(file);
          }
        }
      });
    }

    if (this.fileInput) {
      this.fileInput.addEventListener('change', (e) => {
        const target = e.target as HTMLInputElement;
        if (target.files && target.files.length > 0) {
          this.loadFile(target.files[0]);
        }
      });
    }

    if (this.urlInput) {
      this.urlInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          const url = this.urlInput!.value.trim();
          if (url) {
            this.loadUrl(url);
          }
        }
      });
    }

    if (this.playBtn) {
      this.playBtn.addEventListener('click', () => {
        this.togglePlay();
      });
    }

    if (this.progressBar) {
      this.progressBar.addEventListener('mousedown', () => {
        this.isSeeking = true;
      });
      this.progressBar.addEventListener('mouseup', () => {
        this.isSeeking = false;
      });
      this.progressBar.addEventListener('input', (e) => {
        const target = e.target as HTMLInputElement;
        const duration = this.audioAnalyzer.getDuration();
        if (duration > 0) {
          const seekTime = (parseFloat(target.value) / 100) * duration;
          this.audioAnalyzer.seek(seekTime);
        }
      });
    }

    if (this.volumeSlider) {
      this.volumeSlider.addEventListener('input', (e) => {
        const target = e.target as HTMLInputElement;
        this.audioAnalyzer.setVolume(parseFloat(target.value) / 100);
      });
      this.audioAnalyzer.setVolume(parseFloat(this.volumeSlider.value) / 100);
    }

    window.addEventListener('keydown', (e) => {
      if (e.code === 'Space') {
        e.preventDefault();
        this.togglePlay();
      }
    });
  }

  private loadFile(file: File): void {
    this.audioAnalyzer.loadFromFile(file).then(() => {
      this.hideUploadArea();
      if (this.playBtn) this.playBtn.textContent = '❚❚';
    }).catch((err) => {
      console.error('加载音频失败:', err);
      alert('加载音频失败，请尝试其他文件');
    });
  }

  private loadUrl(url: string): void {
    this.audioAnalyzer.loadFromUrl(url).then(() => {
      this.hideUploadArea();
      if (this.playBtn) this.playBtn.textContent = '❚❚';
    }).catch((err) => {
      console.error('加载音频失败:', err);
      alert('加载音频失败，请检查URL是否正确或是否支持CORS');
    });
  }

  private hideUploadArea(): void {
    if (this.uploadArea) {
      this.uploadArea.style.display = 'none';
    }
  }

  private togglePlay(): void {
    if (this.audioAnalyzer.getIsPlaying()) {
      this.audioAnalyzer.pause();
      if (this.playBtn) this.playBtn.textContent = '▶';
    } else {
      this.audioAnalyzer.play();
      if (this.playBtn) this.playBtn.textContent = '❚❚';
    }
  }

  public updateStats(): void {
    const currentTime = this.audioAnalyzer.getCurrentTime();
    const duration = this.audioAnalyzer.getDuration();
    const timeStr = `${this.formatTime(currentTime)}/${this.formatTime(duration)}`;

    if (this.timeDisplay) this.timeDisplay.textContent = timeStr;
    if (this.timeText) this.timeText.textContent = timeStr;

    if (this.progressBar && !this.isSeeking && duration > 0) {
      this.progressBar.value = ((currentTime / duration) * 100).toString();
    }

    const volume = this.audioAnalyzer.getAverageVolume();
    if (this.volumeBar) {
      this.volumeBar.style.width = `${Math.min(100, volume)}%`;
    }

    const bpm = this.audioAnalyzer.getBPM();
    if (this.bpmDisplay) {
      this.bpmDisplay.textContent = bpm > 0 ? bpm.toString() : '--';
    }
  }
}
