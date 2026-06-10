import { AudioManager } from './audioManager';
import { Visualizer } from './visualizer';
import { ThemeController, ThemeName, AnimationMode } from './themeController';

export class UIController {
  audioManager: AudioManager;
  visualizer: Visualizer;
  themeController: ThemeController;

  private uploadArea: HTMLElement;
  private fileInput: HTMLInputElement;
  private playBtn: HTMLButtonElement;
  private progressBar: HTMLInputElement;
  private volumeSlider: HTMLInputElement;
  private volumeValue: HTMLElement;
  private currentTimeEl: HTMLElement;
  private totalTimeEl: HTMLElement;
  private themeSelect: HTMLSelectElement;
  private opacitySlider: HTMLInputElement;
  private opacityValue: HTMLElement;
  private fpsDisplay: HTMLElement;
  private sampleRateDisplay: HTMLElement;
  private isDragging: boolean = false;

  constructor(
    audioManager: AudioManager,
    visualizer: Visualizer,
    themeController: ThemeController
  ) {
    this.audioManager = audioManager;
    this.visualizer = visualizer;
    this.themeController = themeController;

    this.uploadArea = document.getElementById('uploadArea') as HTMLElement;
    this.fileInput = document.getElementById('fileInput') as HTMLInputElement;
    this.playBtn = document.getElementById('playBtn') as HTMLButtonElement;
    this.progressBar = document.getElementById('progressBar') as HTMLInputElement;
    this.volumeSlider = document.getElementById('volumeSlider') as HTMLInputElement;
    this.volumeValue = document.getElementById('volumeValue') as HTMLElement;
    this.currentTimeEl = document.getElementById('currentTime') as HTMLElement;
    this.totalTimeEl = document.getElementById('totalTime') as HTMLElement;
    this.themeSelect = document.getElementById('themeSelect') as HTMLSelectElement;
    this.opacitySlider = document.getElementById('opacitySlider') as HTMLInputElement;
    this.opacityValue = document.getElementById('opacityValue') as HTMLElement;
    this.fpsDisplay = document.getElementById('fpsDisplay') as HTMLElement;
    this.sampleRateDisplay = document.getElementById('sampleRateDisplay') as HTMLElement;
  }

  init(): void {
    this.bindUploadEvents();
    this.bindPlaybackControls();
    this.bindThemeControls();
    this.startStatsUpdate();
  }

  private bindUploadEvents(): void {
    this.uploadArea.addEventListener('click', () => {
      this.fileInput.click();
    });

    this.fileInput.addEventListener('change', (e) => {
      const target = e.target as HTMLInputElement;
      if (target.files && target.files[0]) {
        this.handleFile(target.files[0]);
      }
    });

    this.uploadArea.addEventListener('dragover', (e) => {
      e.preventDefault();
      this.uploadArea.classList.add('dragover');
      document.body.classList.add('drag-over');
    });

    this.uploadArea.addEventListener('dragleave', (e) => {
      e.preventDefault();
      this.uploadArea.classList.remove('dragover');
      document.body.classList.remove('drag-over');
    });

    this.uploadArea.addEventListener('drop', (e) => {
      e.preventDefault();
      this.uploadArea.classList.remove('dragover');
      document.body.classList.remove('drag-over');
      if (e.dataTransfer && e.dataTransfer.files[0]) {
        this.handleFile(e.dataTransfer.files[0]);
      }
    });

    document.addEventListener('dragover', (e) => {
      e.preventDefault();
    });

    document.addEventListener('drop', (e) => {
      e.preventDefault();
    });
  }

  private async handleFile(file: File): Promise<void> {
    const validTypes = ['audio/mpeg', 'audio/wav', 'audio/mp3'];
    const validExtensions = ['.mp3', '.wav'];
    const fileName = file.name.toLowerCase();
    const isValidType = validTypes.includes(file.type) || validExtensions.some(ext => fileName.endsWith(ext));

    if (!isValidType) {
      this.showUploadError('请上传 .mp3 或 .wav 格式的音频文件');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      this.showUploadError('文件大小不能超过 10MB');
      return;
    }

    try {
      this.uploadArea.querySelector('p')!.textContent = '正在加载...';
      await this.audioManager.loadFile(file);

      this.audioManager.onEnded(() => {
        this.playBtn.textContent = '▶';
        this.progressBar.value = '0';
        this.updateTimeDisplay(0, this.audioManager.duration);
      });

      this.updateTimeDisplay(0, this.audioManager.duration);
      this.totalTimeEl.textContent = this.formatTime(this.audioManager.duration);
      this.sampleRateDisplay.textContent = `采样率: ${this.audioManager.sampleRate} Hz`;

      this.playBtn.disabled = false;
      this.progressBar.disabled = false;

      this.uploadArea.querySelector('p')!.textContent = `已加载: ${file.name}`;
      this.uploadArea.querySelector('.hint')!.textContent = '点击可重新选择文件';

      this.audioManager.play();
      this.playBtn.textContent = '⏸';
    } catch (error) {
      console.error(error);
      this.showUploadError('音频文件加载失败，请尝试其他文件');
      this.uploadArea.querySelector('p')!.textContent = '点击或拖拽音频文件到此';
      this.uploadArea.querySelector('.hint')!.textContent = '支持 .mp3 和 .wav 格式，文件大小不超过 10MB';
    }
  }

  private bindPlaybackControls(): void {
    this.playBtn.addEventListener('click', () => {
      if (!this.audioManager.audioBuffer) return;

      if (this.audioManager.isPlaying) {
        this.audioManager.pause();
        this.playBtn.textContent = '▶';
      } else {
        this.audioManager.play();
        this.playBtn.textContent = '⏸';
      }
    });

    this.progressBar.addEventListener('mousedown', () => {
      this.isDragging = true;
    });

    this.progressBar.addEventListener('mouseup', () => {
      this.isDragging = false;
      const time = (parseFloat(this.progressBar.value) / 100) * this.audioManager.duration;
      this.audioManager.seek(time);
    });

    this.progressBar.addEventListener('input', () => {
      const time = (parseFloat(this.progressBar.value) / 100) * this.audioManager.duration;
      this.currentTimeEl.textContent = this.formatTime(time);
    });

    this.volumeSlider.addEventListener('input', () => {
      const value = parseFloat(this.volumeSlider.value);
      this.audioManager.setVolume(value / 100);
      this.volumeValue.textContent = `${Math.round(value)}%`;
    });

    this.audioManager.setVolume(parseFloat(this.volumeSlider.value) / 100);
  }

  private bindThemeControls(): void {
    this.themeSelect.addEventListener('change', () => {
      this.themeController.setTheme(this.themeSelect.value as ThemeName);
    });

    const radioButtons = document.querySelectorAll('input[name="animationMode"]');
    radioButtons.forEach((radio) => {
      radio.addEventListener('change', (e) => {
        const target = e.target as HTMLInputElement;
        this.themeController.setAnimationMode(target.value as AnimationMode);
      });
    });

    this.opacitySlider.addEventListener('input', () => {
      const value = parseFloat(this.opacitySlider.value);
      this.visualizer.setOpacity(value);
      this.opacityValue.textContent = value.toFixed(2);
    });
  }

  private startStatsUpdate(): void {
    window.setInterval(() => {
      if (this.audioManager.isPlaying || this.audioManager.audioBuffer) {
        this.audioManager.updateCurrentTime();

        if (!this.isDragging) {
          const progress = this.audioManager.duration > 0
            ? (this.audioManager.currentTime / this.audioManager.duration) * 100
            : 0;
          this.progressBar.value = String(progress);
        }

        this.updateTimeDisplay(this.audioManager.currentTime, this.audioManager.duration);
      }

      this.updateFpsDisplay();
    }, 100);
  }

  updateTimeDisplay(current: number, total: number): void {
    this.currentTimeEl.textContent = this.formatTime(current);
    this.totalTimeEl.textContent = this.formatTime(total);
  }

  updateFpsDisplay(): void {
    const fps = this.visualizer.getFps();
    this.fpsDisplay.textContent = `FPS: ${fps}`;
    this.fpsDisplay.classList.remove('good', 'warn', 'bad');

    if (fps > 55) {
      this.fpsDisplay.classList.add('good');
    } else if (fps >= 40) {
      this.fpsDisplay.classList.add('warn');
    } else {
      this.fpsDisplay.classList.add('bad');
    }
  }

  private formatTime(seconds: number): string {
    if (!isFinite(seconds) || seconds < 0) return '00:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  showUploadError(message: string): void {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.textContent = message;
    document.body.appendChild(errorDiv);

    setTimeout(() => {
      errorDiv.remove();
    }, 3000);
  }

  triggerDragFlash(): void {
    document.body.classList.add('drag-over');
    setTimeout(() => {
      document.body.classList.remove('drag-over');
    }, 600);
  }
}
