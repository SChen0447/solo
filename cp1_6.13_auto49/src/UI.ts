export interface UICallbacks {
  onProgressChange: (progress: number) => void;
  onPlayPause: () => void;
  onSpeedChange: (speed: number) => void;
  onReset: () => void;
}

export class UI {
  private callbacks: UICallbacks;
  private isPlaying: boolean = false;
  private currentSpeed: number = 1;
  private currentProgress: number = 0;
  private isDragging: boolean = false;

  private stageLabel: HTMLElement;
  private playPauseBtn: HTMLElement;
  private speedBtns: NodeListOf<HTMLElement>;
  private resetBtn: HTMLElement;
  private stageDots: NodeListOf<HTMLElement>;
  private timelineTrack: HTMLElement;
  private timelineFill: HTMLElement;
  private timelineThumb: HTMLElement;
  private timelineTooltip: HTMLElement;

  constructor(callbacks: UICallbacks) {
    this.callbacks = callbacks;

    this.stageLabel = document.getElementById('stage-label')!;
    this.playPauseBtn = document.getElementById('playPauseBtn')!;
    this.speedBtns = document.querySelectorAll('.speed-btn');
    this.resetBtn = document.getElementById('resetBtn')!;
    this.stageDots = document.querySelectorAll('.stage-dot');
    this.timelineTrack = document.getElementById('timelineTrack')!;
    this.timelineFill = document.getElementById('timelineFill')!;
    this.timelineThumb = document.getElementById('timelineThumb')!;
    this.timelineTooltip = document.getElementById('timelineTooltip')!;

    this.bindEvents();
  }

  private bindEvents(): void {
    this.playPauseBtn.addEventListener('click', () => {
      this.isPlaying = !this.isPlaying;
      this.updatePlayPauseButton();
      this.callbacks.onPlayPause();
    });

    this.speedBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        const speed = parseFloat(btn.dataset.speed || '1');
        this.currentSpeed = speed;
        this.updateSpeedButtons();
        this.callbacks.onSpeedChange(speed);
      });
    });

    this.resetBtn.addEventListener('click', () => {
      this.currentProgress = 0;
      this.isPlaying = false;
      this.updatePlayPauseButton();
      this.updateTimeline(0);
      this.callbacks.onReset();
    });

    this.timelineTrack.addEventListener('mousedown', (e) => {
      this.isDragging = true;
      this.updateProgressFromEvent(e);
    });

    document.addEventListener('mousemove', (e) => {
      if (this.isDragging) {
        this.updateProgressFromEvent(e);
      }
    });

    document.addEventListener('mouseup', () => {
      this.isDragging = false;
    });

    this.timelineTrack.addEventListener('touchstart', (e) => {
      this.isDragging = true;
      this.updateProgressFromTouch(e as TouchEvent);
    });

    document.addEventListener('touchmove', (e) => {
      if (this.isDragging) {
        this.updateProgressFromTouch(e as TouchEvent);
      }
    });

    document.addEventListener('touchend', () => {
      this.isDragging = false;
    });
  }

  private updateProgressFromEvent(e: MouseEvent): void {
    const rect = this.timelineTrack.getBoundingClientRect();
    let progress = (e.clientX - rect.left) / rect.width;
    progress = Math.max(0, Math.min(1, progress));
    this.currentProgress = progress;
    this.updateTimeline(progress);
    this.callbacks.onProgressChange(progress);
  }

  private updateProgressFromTouch(e: TouchEvent): void {
    if (e.touches.length > 0) {
      const rect = this.timelineTrack.getBoundingClientRect();
      let progress = (e.touches[0].clientX - rect.left) / rect.width;
      progress = Math.max(0, Math.min(1, progress));
      this.currentProgress = progress;
      this.updateTimeline(progress);
      this.callbacks.onProgressChange(progress);
    }
  }

  private updatePlayPauseButton(): void {
    if (this.isPlaying) {
      this.playPauseBtn.classList.remove('paused');
      this.playPauseBtn.classList.add('playing');
    } else {
      this.playPauseBtn.classList.remove('playing');
      this.playPauseBtn.classList.add('paused');
    }
  }

  private updateSpeedButtons(): void {
    this.speedBtns.forEach((btn) => {
      const speed = parseFloat(btn.dataset.speed || '1');
      if (speed === this.currentSpeed) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });
  }

  private updateTimeline(progress: number): void {
    const percent = progress * 100;
    this.timelineFill.style.width = `${percent}%`;
    this.timelineThumb.style.left = `${percent}%`;

    const microseconds = (progress * 100).toFixed(1);
    this.timelineTooltip.textContent = `${microseconds} μs`;

    let stageIndex = 0;
    if (progress >= 0.8) stageIndex = 4;
    else if (progress >= 0.6) stageIndex = 3;
    else if (progress >= 0.4) stageIndex = 2;
    else if (progress >= 0.2) stageIndex = 1;

    this.updateStageDots(stageIndex);
  }

  private updateStageDots(index: number): void {
    this.stageDots.forEach((dot, i) => {
      if (i === index) {
        dot.classList.add('active');
      } else {
        dot.classList.remove('active');
      }
    });
  }

  public setProgress(progress: number): void {
    if (!this.isDragging) {
      this.currentProgress = progress;
      this.updateTimeline(progress);
    }
  }

  public setStageLabel(name: string): void {
    this.stageLabel.textContent = name;
  }

  public setPlaying(playing: boolean): void {
    this.isPlaying = playing;
    this.updatePlayPauseButton();
  }

  public getSpeed(): number {
    return this.currentSpeed;
  }

  public getIsPlaying(): boolean {
    return this.isPlaying;
  }
}
