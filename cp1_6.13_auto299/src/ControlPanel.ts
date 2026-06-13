import { MusicType } from './StarNebula';

export type MusicSelectCallback = (type: MusicType) => void;

export class ControlPanel {
  private container: HTMLElement;
  private buttons: HTMLButtonElement[] = [];
  private onMusicSelect: MusicSelectCallback;
  private currentMusic: MusicType = null;

  constructor(containerId: string, onMusicSelect: MusicSelectCallback) {
    const container = document.getElementById(containerId);
    if (!container) {
      throw new Error(`Container with id "${containerId}" not found`);
    }
    this.container = container;
    this.onMusicSelect = onMusicSelect;
    
    this.initButtons();
  }

  private initButtons() {
    const buttonElements = this.container.querySelectorAll('.music-btn');
    
    buttonElements.forEach((btn) => {
      const button = btn as HTMLButtonElement;
      const musicType = button.dataset.music as MusicType;
      
      if (musicType) {
        this.buttons.push(button);
        
        button.addEventListener('click', () => {
          this.handleMusicSelect(musicType);
        });
      }
    });
  }

  private handleMusicSelect(type: MusicType) {
    if (this.currentMusic === type) {
      this.currentMusic = null;
      this.updateButtonStates();
      this.onMusicSelect(null);
    } else {
      this.currentMusic = type;
      this.updateButtonStates();
      this.onMusicSelect(type);
    }
  }

  private updateButtonStates() {
    this.buttons.forEach((btn) => {
      const musicType = btn.dataset.music as MusicType;
      if (musicType === this.currentMusic) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });
  }

  public setCurrentMusic(type: MusicType) {
    this.currentMusic = type;
    this.updateButtonStates();
  }

  public getCurrentMusic(): MusicType {
    return this.currentMusic;
  }

  public dispose() {
    this.buttons.forEach((btn) => {
      btn.removeEventListener('click', () => {});
    });
    this.buttons = [];
  }
}
