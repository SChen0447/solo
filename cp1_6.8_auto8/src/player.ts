import { Timeline } from './timeline';
import { TimelineCard } from './card';

export interface PlayerEvents {
  onPlay?: () => void;
  onPause?: () => void;
  onStop?: () => void;
  onCardChange?: (card: TimelineCard, index: number) => void;
  onProgress?: (percent: number) => void;
  onFullscreenChange?: (isFullscreen: boolean) => void;
}

export class Player {
  private timeline: Timeline;
  private playBtn: HTMLElement;
  private fullscreenBtn: HTMLElement;
  private progressBarContainer: HTMLElement;
  private progressBar: HTMLElement;
  private events: PlayerEvents;

  private isPlaying = false;
  private currentIndex = 0;
  private currentCardStartTime = 0;
  private currentCardProgress = 0;
  private animationFrameId: number | null = null;
  private isFullscreen = false;

  private fullscreenOverlay: HTMLElement | null = null;
  private fullscreenCardEl: HTMLElement | null = null;
  private audioElement: HTMLAudioElement | null = null;

  constructor(
    timeline: Timeline,
    playBtnId: string,
    fullscreenBtnId: string,
    progressBarContainerId: string,
    progressBarId: string,
    events: PlayerEvents = {}
  ) {
    this.timeline = timeline;
    this.playBtn = document.getElementById(playBtnId) as HTMLElement;
    this.fullscreenBtn = document.getElementById(fullscreenBtnId) as HTMLElement;
    this.progressBarContainer = document.getElementById(progressBarContainerId) as HTMLElement;
    this.progressBar = document.getElementById(progressBarId) as HTMLElement;
    this.events = events;

    this.init();
  }

  private init(): void {
    this.playBtn.addEventListener('click', () => this.togglePlay());
    this.fullscreenBtn.addEventListener('click', () => this.toggleFullscreen());

    document.addEventListener('fullscreenchange', () => {
      this.isFullscreen = !!document.fullscreenElement;
      this.updateFullscreenBtn();
      this.events.onFullscreenChange?.(this.isFullscreen);
    });

    this.createFullscreenOverlay();
  }

  private createFullscreenOverlay(): void {
    const overlay = document.createElement('div');
    overlay.className = 'fullscreen-overlay';
    overlay.id = 'fullscreenOverlay';

    const closeBtn = document.createElement('button');
    closeBtn.className = 'fullscreen-close';
    closeBtn.innerHTML = '<i class="fas fa-times"></i>';
    closeBtn.onclick = () => this.exitFullscreen();

    const progressContainer = document.createElement('div');
    progressContainer.className = 'fullscreen-progress';

    const prevBtn = document.createElement('button');
    prevBtn.innerHTML = '<i class="fas fa-chevron-left"></i>';
    prevBtn.onclick = () => this.prevCard();

    const playPauseBtn = document.createElement('button');
    playPauseBtn.id = 'fullscreenPlayBtn';
    playPauseBtn.innerHTML = '<i class="fas fa-play"></i>';
    playPauseBtn.onclick = () => this.togglePlay();

    const nextBtn = document.createElement('button');
    nextBtn.innerHTML = '<i class="fas fa-chevron-right"></i>';
    nextBtn.onclick = () => this.nextCard();

    const progressInfo = document.createElement('div');
    progressInfo.className = 'fullscreen-progress-info';
    progressInfo.id = 'fullscreenProgressInfo';
    progressInfo.textContent = '0 / 0';

    progressContainer.appendChild(prevBtn);
    progressContainer.appendChild(playPauseBtn);
    progressContainer.appendChild(nextBtn);
    progressContainer.appendChild(progressInfo);

    overlay.appendChild(closeBtn);
    overlay.appendChild(progressContainer);

    document.body.appendChild(overlay);
    this.fullscreenOverlay = overlay;
  }

  public togglePlay(): void {
    if (this.isPlaying) {
      this.pause();
    } else {
      this.play();
    }
  }

  public play(): void {
    const cards = this.timeline.getCards();
    if (cards.length === 0) return;

    if (this.currentIndex >= cards.length) {
      this.currentIndex = 0;
      this.currentCardProgress = 0;
    }

    this.isPlaying = true;
    this.playBtn.classList.add('playing');
    this.progressBarContainer.classList.add('visible');

    const fullscreenPlayBtn = document.getElementById('fullscreenPlayBtn');
    if (fullscreenPlayBtn) {
      fullscreenPlayBtn.innerHTML = '<i class="fas fa-pause"></i>';
    }

    this.currentCardStartTime = performance.now() - this.currentCardProgress;
    this.showCard(cards[this.currentIndex]);
    this.playCardAudio(cards[this.currentIndex]);
    this.animateProgress();
    this.events.onPlay?.();
  }

  public pause(): void {
    this.isPlaying = false;
    this.playBtn.classList.remove('playing');

    const fullscreenPlayBtn = document.getElementById('fullscreenPlayBtn');
    if (fullscreenPlayBtn) {
      fullscreenPlayBtn.innerHTML = '<i class="fas fa-play"></i>';
    }

    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    if (this.audioElement) {
      this.audioElement.pause();
    }

    this.events.onPause?.();
  }

  public stop(): void {
    this.pause();
    this.currentIndex = 0;
    this.currentCardProgress = 0;
    this.progressBar.style.width = '0%';
    this.progressBarContainer.classList.remove('visible');

    const cards = this.timeline.getCards();
    cards.forEach(card => card.setActive(false));

    if (this.fullscreenOverlay && this.fullscreenCardEl) {
      this.fullscreenCardEl.remove();
      this.fullscreenCardEl = null;
    }

    if (this.audioElement) {
      this.audioElement.pause();
      this.audioElement = null;
    }

    this.updateFullscreenProgressInfo();
    this.events.onStop?.();
  }

  private animateProgress = (): void => {
    if (!this.isPlaying) return;

    const now = performance.now();
    const cards = this.timeline.getCards();
    const currentCard = cards[this.currentIndex];

    if (!currentCard) {
      this.stop();
      return;
    }

    const elapsed = now - this.currentCardStartTime;
    const duration = currentCard.data.duration;

    if (elapsed >= duration) {
      this.nextCard();
      return;
    }

    this.currentCardProgress = elapsed;

    const totalDuration = cards.reduce((sum, c) => sum + c.data.duration, 0);
    const elapsedTotal = cards.slice(0, this.currentIndex).reduce((sum, c) => sum + c.data.duration, 0) + elapsed;
    const percent = (elapsedTotal / totalDuration) * 100;

    this.progressBar.style.width = percent + '%';
    this.events.onProgress?.(percent);

    this.animationFrameId = requestAnimationFrame(this.animateProgress);
  };

  private showCard(card: TimelineCard): void {
    const cards = this.timeline.getCards();
    cards.forEach(c => c.setActive(false));
    card.setActive(true);
    this.timeline.scrollToCard(card);
    this.events.onCardChange?.(card, this.currentIndex);
    this.updateFullscreenProgressInfo();

    if (this.isFullscreen && this.fullscreenOverlay) {
      this.renderFullscreenCard(card);
    }
  }

  private playCardAudio(card: TimelineCard): void {
    if (this.audioElement) {
      this.audioElement.pause();
      this.audioElement = null;
    }

    if (card.data.audioUrl) {
      const audio = new Audio(card.data.audioUrl);
      audio.volume = 0.8;
      audio.play().catch(() => {});
      this.audioElement = audio;
    }
  }

  public nextCard(): void {
    const cards = this.timeline.getCards();
    if (cards.length === 0) return;

    this.currentIndex++;
    this.currentCardProgress = 0;

    if (this.currentIndex >= cards.length) {
      this.stop();
      return;
    }

    this.currentCardStartTime = performance.now();
    this.showCard(cards[this.currentIndex]);
    this.playCardAudio(cards[this.currentIndex]);
  }

  public prevCard(): void {
    const cards = this.timeline.getCards();
    if (cards.length === 0) return;

    this.currentIndex = Math.max(0, this.currentIndex - 1);
    this.currentCardProgress = 0;
    this.currentCardStartTime = performance.now();
    this.showCard(cards[this.currentIndex]);
    this.playCardAudio(cards[this.currentIndex]);
  }

  public toggleFullscreen(): void {
    if (this.isFullscreen) {
      this.exitFullscreen();
    } else {
      this.enterFullscreen();
    }
  }

  private enterFullscreen(): void {
    if (this.fullscreenOverlay) {
      this.fullscreenOverlay.classList.add('active');
      this.isFullscreen = true;

      const cards = this.timeline.getCards();
      if (cards[this.currentIndex]) {
        this.renderFullscreenCard(cards[this.currentIndex]);
      }

      this.updateFullscreenBtn();
      this.updateFullscreenProgressInfo();
      this.events.onFullscreenChange?.(true);
    }
  }

  private exitFullscreen(): void {
    if (this.fullscreenOverlay) {
      this.fullscreenOverlay.classList.remove('active');
      this.isFullscreen = false;

      if (this.fullscreenCardEl) {
        this.fullscreenCardEl.remove();
        this.fullscreenCardEl = null;
      }

      if (this.audioElement) {
        this.audioElement.pause();
        this.audioElement = null;
      }

      this.updateFullscreenBtn();
      this.events.onFullscreenChange?.(false);
    }
  }

  private updateFullscreenBtn(): void {
    const icon = this.fullscreenBtn.querySelector('i');
    if (icon) {
      icon.className = this.isFullscreen ? 'fas fa-compress' : 'fas fa-expand';
    }
  }

  private renderFullscreenCard(card: TimelineCard): void {
    if (!this.fullscreenOverlay) return;

    if (this.fullscreenCardEl) {
      this.fullscreenCardEl.remove();
    }

    const cardEl = document.createElement('div');
    cardEl.className = 'fullscreen-card';

    if (card.data.imageUrl) {
      const img = document.createElement('img');
      img.src = card.data.imageUrl;
      img.alt = 'Card image';
      img.style.width = '100%';
      img.style.height = '100%';
      img.style.objectFit = 'cover';
      cardEl.appendChild(img);
    } else {
      cardEl.style.background = 'linear-gradient(135deg, #6c5ce7 0%, #a29bfe 100%)';
      cardEl.style.display = 'flex';
      cardEl.style.alignItems = 'center';
      cardEl.style.justifyContent = 'center';
      cardEl.style.padding = '40px';

      const textEl = document.createElement('div');
      textEl.innerHTML = card.data.text || '无内容';
      textEl.style.color = '#fff';
      textEl.style.fontSize = '24px';
      textEl.style.lineHeight = '1.6';
      textEl.style.textAlign = 'center';
      cardEl.appendChild(textEl);
    }

    const progressInfo = document.getElementById('fullscreenProgressInfo');
    if (progressInfo) {
      this.fullscreenOverlay.insertBefore(cardEl, progressInfo.parentElement);
    } else {
      this.fullscreenOverlay.appendChild(cardEl);
    }

    this.fullscreenCardEl = cardEl;

    if (this.isPlaying && card.data.audioUrl) {
      this.playCardAudio(card);
    }
  }

  private updateFullscreenProgressInfo(): void {
    const progressInfo = document.getElementById('fullscreenProgressInfo');
    const cards = this.timeline.getCards();
    if (progressInfo && cards.length > 0) {
      progressInfo.textContent = `${this.currentIndex + 1} / ${cards.length}`;
    } else if (progressInfo) {
      progressInfo.textContent = '0 / 0';
    }
  }

  public getCurrentIndex(): number {
    return this.currentIndex;
  }

  public getIsPlaying(): boolean {
    return this.isPlaying;
  }

  public destroy(): void {
    this.stop();
    if (this.fullscreenOverlay) {
      this.fullscreenOverlay.remove();
      this.fullscreenOverlay = null;
    }
  }
}
