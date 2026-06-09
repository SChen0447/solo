import { VisualEffect } from './visualizer.js';

export interface UICallbacks {
  onFileSelected: (file: File) => void;
  onPlayToggle: () => void;
  onEffectChange: (effect: VisualEffect) => void;
  onVolumeChange: (volume: number) => void;
}

export class UIController {
  private fileInput: HTMLInputElement;
  private fileBtn: HTMLButtonElement;
  private mobileFileBtn: HTMLButtonElement;
  private fileName: HTMLSpanElement;
  private mobileFileName: HTMLSpanElement;
  private playBtn: HTMLButtonElement;
  private mobilePlayBtn: HTMLButtonElement;
  private playIcon: HTMLSpanElement;
  private mobilePlayIcon: HTMLSpanElement;
  private effectSelect: HTMLSelectElement;
  private mobileEffectSelect: HTMLSelectElement;
  private volumeSlider: HTMLInputElement;
  private mobileVolumeSlider: HTMLInputElement;
  private volumeTooltip: HTMLSpanElement;
  private menuToggle: HTMLButtonElement;
  private mobileMenu: HTMLDivElement;
  private blurOverlay: HTMLDivElement;
  private callbacks: UICallbacks;
  private isPlaying = false;

  constructor(callbacks: UICallbacks) {
    this.callbacks = callbacks;

    this.fileInput = document.getElementById('fileInput') as HTMLInputElement;
    this.fileBtn = document.getElementById('fileBtn') as HTMLButtonElement;
    this.mobileFileBtn = document.getElementById('mobileFileBtn') as HTMLButtonElement;
    this.fileName = document.getElementById('fileName') as HTMLSpanElement;
    this.mobileFileName = document.getElementById('mobileFileName') as HTMLSpanElement;
    this.playBtn = document.getElementById('playBtn') as HTMLButtonElement;
    this.mobilePlayBtn = document.getElementById('mobilePlayBtn') as HTMLButtonElement;
    this.playIcon = document.getElementById('playIcon') as HTMLSpanElement;
    this.mobilePlayIcon = document.getElementById('mobilePlayIcon') as HTMLSpanElement;
    this.effectSelect = document.getElementById('effectSelect') as HTMLSelectElement;
    this.mobileEffectSelect = document.getElementById('mobileEffectSelect') as HTMLSelectElement;
    this.volumeSlider = document.getElementById('volumeSlider') as HTMLInputElement;
    this.mobileVolumeSlider = document.getElementById('mobileVolumeSlider') as HTMLInputElement;
    this.volumeTooltip = document.getElementById('volumeTooltip') as HTMLSpanElement;
    this.menuToggle = document.getElementById('menuToggle') as HTMLButtonElement;
    this.mobileMenu = document.getElementById('mobileMenu') as HTMLDivElement;
    this.blurOverlay = document.getElementById('blurOverlay') as HTMLDivElement;

    this.bindEvents();
  }

  private bindEvents(): void {
    this.fileBtn.addEventListener('click', () => this.fileInput.click());
    this.mobileFileBtn.addEventListener('click', () => this.fileInput.click());

    this.fileInput.addEventListener('change', (e) => {
      const target = e.target as HTMLInputElement;
      const file = target.files?.[0];
      if (file) {
        this.setFileName(file.name);
        this.enablePlayButton();
        this.callbacks.onFileSelected(file);
      }
    });

    this.playBtn.addEventListener('click', () => this.handlePlayToggle());
    this.mobilePlayBtn.addEventListener('click', () => this.handlePlayToggle());

    this.effectSelect.addEventListener('change', (e) => {
      const value = (e.target as HTMLSelectElement).value as VisualEffect;
      this.mobileEffectSelect.value = value;
      this.triggerBlurTransition();
      this.callbacks.onEffectChange(value);
    });

    this.mobileEffectSelect.addEventListener('change', (e) => {
      const value = (e.target as HTMLSelectElement).value as VisualEffect;
      this.effectSelect.value = value;
      this.triggerBlurTransition();
      this.callbacks.onEffectChange(value);
    });

    this.volumeSlider.addEventListener('input', (e) => {
      const value = parseInt((e.target as HTMLInputElement).value);
      this.mobileVolumeSlider.value = value.toString();
      this.updateVolumeTooltip(value);
      this.callbacks.onVolumeChange(value / 100);
    });

    this.mobileVolumeSlider.addEventListener('input', (e) => {
      const value = parseInt((e.target as HTMLInputElement).value);
      this.volumeSlider.value = value.toString();
      this.callbacks.onVolumeChange(value / 100);
    });

    this.menuToggle.addEventListener('click', () => {
      this.menuToggle.classList.toggle('open');
      this.mobileMenu.classList.toggle('open');
    });

    document.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      if (
        !this.mobileMenu.contains(target) &&
        !this.menuToggle.contains(target)
      ) {
        this.menuToggle.classList.remove('open');
        this.mobileMenu.classList.remove('open');
      }
    });

    this.updateVolumeTooltip(parseInt(this.volumeSlider.value));
  }

  private handlePlayToggle(): void {
    this.isPlaying = !this.isPlaying;
    this.updatePlayButtonState();
    this.callbacks.onPlayToggle();
  }

  private updatePlayButtonState(): void {
    if (this.isPlaying) {
      this.playIcon.textContent = '‖';
      this.mobilePlayIcon.textContent = '‖';
      this.playBtn.classList.add('playing');
      this.mobilePlayBtn.classList.add('playing');
    } else {
      this.playIcon.textContent = '▶';
      this.mobilePlayIcon.textContent = '▶';
      this.playBtn.classList.remove('playing');
      this.mobilePlayBtn.classList.remove('playing');
    }
  }

  setPlayingState(isPlaying: boolean): void {
    this.isPlaying = isPlaying;
    this.updatePlayButtonState();
  }

  setFileName(name: string): void {
    this.fileName.textContent = name;
    this.mobileFileName.textContent = name;
  }

  enablePlayButton(): void {
    this.playBtn.disabled = false;
    this.mobilePlayBtn.disabled = false;
  }

  disablePlayButton(): void {
    this.playBtn.disabled = true;
    this.mobilePlayBtn.disabled = true;
    this.isPlaying = false;
    this.updatePlayButtonState();
  }

  getVolume(): number {
    return parseInt(this.volumeSlider.value) / 100;
  }

  getCurrentEffect(): VisualEffect {
    return this.effectSelect.value as VisualEffect;
  }

  private updateVolumeTooltip(value: number): void {
    this.volumeTooltip.textContent = `${value}%`;
  }

  private triggerBlurTransition(): void {
    this.blurOverlay.classList.add('active');
    setTimeout(() => {
      this.blurOverlay.classList.remove('active');
    }, 500);
  }

  setEffect(effect: VisualEffect): void {
    this.effectSelect.value = effect;
    this.mobileEffectSelect.value = effect;
    this.triggerBlurTransition();
  }
}
