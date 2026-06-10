import { EmotionData, EMOTION_PRESETS, findEmotion, NEUTRAL_EMOTION } from './EmotionData';

export interface UICallbacks {
  onEmotionChange: (emotion: EmotionData) => void;
  onIntensityChange: (intensity: number) => void;
  onPlayPauseToggle: () => void;
}

export class UI {
  private emotionInput: HTMLInputElement;
  private presetButtonsContainer: HTMLElement;
  private intensitySlider: HTMLInputElement;
  private sliderValue: HTMLElement;
  private playPauseBtn: HTMLButtonElement;
  private playIcon: SVGElement;
  private pauseIcon: SVGElement;
  private currentEmotionLabel: HTMLElement;

  private callbacks: UICallbacks;
  private selectedPresetName: string | null = null;
  private isPlaying: boolean = true;
  private inputDebounceTimer: number | null = null;

  constructor(callbacks: UICallbacks) {
    this.callbacks = callbacks;

    this.emotionInput = document.getElementById('emotion-input') as HTMLInputElement;
    this.presetButtonsContainer = document.getElementById('preset-buttons') as HTMLElement;
    this.intensitySlider = document.getElementById('intensity-slider') as HTMLInputElement;
    this.sliderValue = document.getElementById('slider-value') as HTMLElement;
    this.playPauseBtn = document.getElementById('play-pause-btn') as HTMLButtonElement;
    this.playIcon = document.getElementById('play-icon') as unknown as SVGElement;
    this.pauseIcon = document.getElementById('pause-icon') as unknown as SVGElement;
    this.currentEmotionLabel = document.getElementById('current-emotion-label') as HTMLElement;

    this.createPresetButtons();
    this.bindEvents();
  }

  private createPresetButtons(): void {
    EMOTION_PRESETS.forEach(emotion => {
      const btn = document.createElement('button');
      btn.className = 'preset-btn';
      btn.dataset.emotion = emotion.name;
      btn.style.setProperty('--emotion-color', emotion.color);

      const dot = document.createElement('span');
      dot.className = 'color-dot';

      const label = document.createElement('span');
      label.className = 'btn-label';
      label.textContent = emotion.displayName;

      btn.appendChild(dot);
      btn.appendChild(label);

      btn.addEventListener('click', () => {
        this.selectPreset(emotion.name);
        this.emotionInput.value = '';
        this.callbacks.onEmotionChange(emotion);
      });

      this.presetButtonsContainer.appendChild(btn);
    });
  }

  private bindEvents(): void {
    this.emotionInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        this.handleEmotionInput();
      }
    });

    this.emotionInput.addEventListener('input', () => {
      if (this.inputDebounceTimer !== null) {
        clearTimeout(this.inputDebounceTimer);
      }
      this.inputDebounceTimer = window.setTimeout(() => {
        this.handleEmotionInput();
      }, 200);
    });

    this.intensitySlider.addEventListener('input', () => {
      const value = parseInt(this.intensitySlider.value, 10);
      this.sliderValue.textContent = value.toString();
      this.callbacks.onIntensityChange(value);
    });

    this.playPauseBtn.addEventListener('click', () => {
      this.togglePlayPause();
    });
  }

  private handleEmotionInput(): void {
    const value = this.emotionInput.value.trim();
    const emotion = findEmotion(value);

    if (emotion.name === NEUTRAL_EMOTION.name && value !== '') {
      this.selectPreset(null);
    } else if (emotion.name !== NEUTRAL_EMOTION.name) {
      this.selectPreset(emotion.name);
    } else {
      this.selectPreset(null);
    }

    this.callbacks.onEmotionChange(emotion);
  }

  private selectPreset(name: string | null): void {
    this.selectedPresetName = name;
    const buttons = this.presetButtonsContainer.querySelectorAll('.preset-btn');
    buttons.forEach(btn => {
      const btnEl = btn as HTMLElement;
      if (btnEl.dataset.emotion === name) {
        btnEl.classList.add('selected');
      } else {
        btnEl.classList.remove('selected');
      }
    });
  }

  private togglePlayPause(): void {
    this.isPlaying = !this.isPlaying;
    this.updatePlayPauseIcon();
    this.callbacks.onPlayPauseToggle();
  }

  private updatePlayPauseIcon(): void {
    if (this.isPlaying) {
      this.playIcon.style.display = 'none';
      this.pauseIcon.style.display = 'block';
    } else {
      this.playIcon.style.display = 'block';
      this.pauseIcon.style.display = 'none';
    }
  }

  public setCurrentEmotion(emotion: EmotionData): void {
    this.currentEmotionLabel.textContent = emotion.displayName;
    this.currentEmotionLabel.style.color = emotion.color;
  }

  public setPlaying(playing: boolean): void {
    this.isPlaying = playing;
    this.updatePlayPauseIcon();
  }

  public getIntensity(): number {
    return parseInt(this.intensitySlider.value, 10);
  }

  public dispose(): void {
    if (this.inputDebounceTimer !== null) {
      clearTimeout(this.inputDebounceTimer);
    }
  }
}
