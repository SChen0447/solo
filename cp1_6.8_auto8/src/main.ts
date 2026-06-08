import { Timeline } from './timeline';
import { Player } from './player';
import { TimelineCard } from './card';

class App {
  private timeline: Timeline;
  private player: Player;

  constructor() {
    this.timeline = new Timeline(
      'timelineCards',
      'addCardBtn',
      'trashZone',
      'detailPanel',
      'detailContent',
      {
        onCardSelect: (card) => this.handleCardSelect(card),
        onCardAdd: (card) => this.handleCardAdd(card),
        onCardDelete: (card) => this.handleCardDelete(card),
        onCardReorder: (cards) => this.handleCardReorder(cards)
      }
    );

    this.player = new Player(
      this.timeline,
      'btnPlay',
      'btnFullscreen',
      'progressBarContainer',
      'progressBar',
      {
        onPlay: () => console.log('Playing'),
        onPause: () => console.log('Paused'),
        onStop: () => console.log('Stopped'),
        onCardChange: (card, index) => console.log(`Card ${index + 1}:`, card.data)
      }
    );

    this.init();
  }

  private init(): void {
    this.addSampleCards();

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.timeline.closeDetailPanel();
        const selected = this.timeline.getSelectedCard();
        if (selected) {
          selected.setActive(false);
        }
      }
      if (e.key === ' ') {
        e.preventDefault();
        this.player.togglePlay();
      }
      if (e.key === 'ArrowRight' && this.player.getIsPlaying()) {
        this.player.nextCard();
      }
      if (e.key === 'ArrowLeft' && this.player.getIsPlaying()) {
        this.player.prevCard();
      }
    });

    document.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.timeline-card') &&
          !target.closest('.detail-panel') &&
          !target.closest('.add-card-btn') &&
          !target.closest('.player-controls')) {
        const selected = this.timeline.getSelectedCard();
        if (selected && !this.player.getIsPlaying()) {
          selected.setActive(false);
          this.timeline.closeDetailPanel();
        }
      }
    });
  }

  private addSampleCards(): void {
    const sampleCards = [
      {
        text: '<strong>故事的开始</strong><br>在一个遥远的星系中...',
        imageUrl: 'https://picsum.photos/seed/starry/400/520',
        duration: 3000
      },
      {
        text: '<strong>冒险启程</strong><br>勇敢的探险家踏上了征途...',
        imageUrl: 'https://picsum.photos/seed/adventure/400/520',
        duration: 4000
      },
      {
        text: '<strong>神秘发现</strong><br>一座古老的遗迹浮现在眼前...',
        imageUrl: 'https://picsum.photos/seed/ruins/400/520',
        duration: 3500
      },
      {
        text: '<strong>挑战来临</strong><br>黑暗势力正在逼近...',
        imageUrl: 'https://picsum.photos/seed/dark/400/520',
        duration: 3000
      },
      {
        text: '<strong>希望之光</strong><br>友谊与勇气是最强大的武器...',
        imageUrl: 'https://picsum.photos/seed/hope/400/520',
        duration: 4500
      }
    ];

    sampleCards.forEach((data, index) => {
      setTimeout(() => {
        this.timeline.addCard({
          text: data.text,
          imageUrl: data.imageUrl,
          duration: data.duration
        });
      }, index * 150);
    });
  }

  private handleCardSelect(card: TimelineCard | null): void {
    console.log('Selected card:', card?.data.id ?? 'none');
  }

  private handleCardAdd(card: TimelineCard): void {
    console.log('Added card:', card.data.id);
  }

  private handleCardDelete(card: TimelineCard): void {
    console.log('Deleted card:', card.data.id);
  }

  private handleCardReorder(cards: TimelineCard[]): void {
    console.log('Cards reordered:', cards.map(c => c.data.index + 1));
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new App();
});
