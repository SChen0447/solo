import { AudioProcessor } from './audioProcessor';
import { ParticleSystem } from './particleSystem';
import { ControlPanel } from './controlPanel';

class App {
  private canvas: HTMLCanvasElement;
  private audioProcessor: AudioProcessor;
  private particleSystem: ParticleSystem;
  private controlPanel: ControlPanel;
  private uploadOverlay: HTMLElement;
  private uploadBtn: HTMLElement;
  private fileInput: HTMLInputElement;
  private animationId: number | null = null;
  private lastTime: number = 0;

  constructor() {
    this.canvas = document.getElementById('canvas') as HTMLCanvasElement;
    this.uploadOverlay = document.getElementById('upload-overlay') as HTMLElement;
    this.uploadBtn = document.getElementById('upload-btn') as HTMLElement;
    this.fileInput = document.getElementById('file-input') as HTMLInputElement;

    this.audioProcessor = new AudioProcessor();
    this.particleSystem = new ParticleSystem(this.canvas);
    this.controlPanel = new ControlPanel('control-panel', {
      onPlayPause: () => this.togglePlayPause(),
      onSeek: (progress: number) => this.handleSeek(progress),
      onThemeChange: (theme: string) => this.handleThemeChange(theme),
      onSizeChange: (size: number) => this.handleSizeChange(size),
      onSensitivityChange: (sensitivity: number) => this.handleSensitivityChange(sensitivity)
    });

    this.bindEvents();
    this.startAnimationLoop();
  }

  private bindEvents(): void {
    this.uploadBtn.addEventListener('click', () => {
      this.fileInput.click();
    });

    this.fileInput.addEventListener('change', (e) => {
      const target = e.target as HTMLInputElement;
      const files = target.files;
      if (files && files.length > 0) {
        this.loadAudioFile(files[0]);
      }
    });

    this.uploadOverlay.addEventListener('dragover', (e) => {
      e.preventDefault();
      this.uploadOverlay.classList.add('dragover');
    });

    this.uploadOverlay.addEventListener('dragleave', () => {
      this.uploadOverlay.classList.remove('dragover');
    });

    this.uploadOverlay.addEventListener('drop', (e) => {
      e.preventDefault();
      this.uploadOverlay.classList.remove('dragover');
      
      const files = e.dataTransfer?.files;
      if (files && files.length > 0) {
        const file = files[0];
        if (file.type.startsWith('audio/')) {
          this.loadAudioFile(file);
        }
      }
    });

    document.body.addEventListener('dragover', (e) => {
      e.preventDefault();
    });

    document.body.addEventListener('drop', (e) => {
      e.preventDefault();
    });

    window.addEventListener('resize', () => {
      this.particleSystem.handleResize();
    });

    this.audioProcessor.setOnEndedCallback(() => {
      this.controlPanel.setPlaying(false);
    });
  }

  private async loadAudioFile(file: File): Promise<void> {
    try {
      await this.audioProcessor.loadAudioFile(file);
      
      this.uploadOverlay.classList.add('hidden');
      setTimeout(() => {
        this.uploadOverlay.style.display = 'none';
      }, 500);

      this.controlPanel.show();
      this.controlPanel.setTheme(this.controlPanel.getCurrentTheme());

      this.audioProcessor.play();
      this.controlPanel.setPlaying(true);
    } catch (error) {
      console.error('Failed to load audio file:', error);
      alert('无法加载音频文件，请尝试其他文件。');
    }
  }

  private togglePlayPause(): void {
    if (this.audioProcessor.getIsPlaying()) {
      this.audioProcessor.pause();
      this.controlPanel.setPlaying(false);
    } else {
      this.audioProcessor.play();
      this.controlPanel.setPlaying(true);
    }
  }

  private handleSeek(progress: number): void {
    this.audioProcessor.seek(progress);
  }

  private handleThemeChange(theme: string): void {
    this.particleSystem.setTheme(theme);
  }

  private handleSizeChange(size: number): void {
    this.particleSystem.setParticleSize(size);
  }

  private handleSensitivityChange(sensitivity: number): void {
    this.audioProcessor.setSensitivity(sensitivity);
    this.particleSystem.setSensitivity(sensitivity);
  }

  private startAnimationLoop(): void {
    this.lastTime = performance.now();
    
    const animate = () => {
      const currentTime = performance.now();
      const deltaTime = currentTime - this.lastTime;
      this.lastTime = currentTime;

      const audioData = this.audioProcessor.getAudioData();
      
      this.particleSystem.update(audioData.frequencyData, audioData.isBeat, deltaTime);
      this.particleSystem.draw();

      if (this.audioProcessor.getDuration() > 0) {
        this.controlPanel.setProgress(
          this.audioProcessor.getCurrentTime(),
          this.audioProcessor.getDuration()
        );
      }

      this.animationId = requestAnimationFrame(animate);
    };

    this.animationId = requestAnimationFrame(animate);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new App();
});
