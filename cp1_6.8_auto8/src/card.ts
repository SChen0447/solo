export interface CardData {
  id: string;
  index: number;
  text: string;
  imageUrl: string | null;
  audioUrl: string | null;
  audioName: string | null;
  duration: number;
  timestamp: string;
}

export interface CardEvents {
  onSelect?: (card: TimelineCard) => void;
  onDragStart?: (card: TimelineCard) => void;
  onDragEnd?: (card: TimelineCard) => void;
  onDragOver?: (card: TimelineCard, e: DragEvent) => void;
  onDragLeave?: (card: TimelineCard) => void;
  onDrop?: (card: TimelineCard, e: DragEvent) => void;
  onDelete?: (card: TimelineCard) => void;
  onUpdate?: (card: TimelineCard) => void;
}

export class TimelineCard {
  public data: CardData;
  public element: HTMLElement;
  private events: CardEvents;
  private isDragging = false;
  private dragStartX = 0;
  private dragStartY = 0;

  constructor(data: CardData, events: CardEvents = {}) {
    this.data = data;
    this.events = events;
    this.element = this.createCardElement();
    this.bindEvents();
  }

  private createCardElement(): HTMLElement {
    const card = document.createElement('div');
    card.className = 'timeline-card';
    card.dataset.cardId = this.data.id;
    card.draggable = true;

    const header = document.createElement('div');
    header.className = 'card-header';

    const indexBadge = document.createElement('div');
    indexBadge.className = 'card-index';
    indexBadge.textContent = String(this.data.index + 1);

    const timestamp = document.createElement('div');
    timestamp.className = 'card-timestamp';
    timestamp.textContent = this.data.timestamp;

    header.appendChild(indexBadge);
    header.appendChild(timestamp);

    const imagePlaceholder = document.createElement('div');
    imagePlaceholder.className = 'card-image-placeholder';
    const placeholderIcon = document.createElement('i');
    placeholderIcon.className = 'fas fa-image';
    imagePlaceholder.appendChild(placeholderIcon);

    const image = document.createElement('img');
    image.className = 'card-image';
    image.alt = 'Card image';

    if (this.data.imageUrl) {
      image.onload = () => {
        image.classList.add('loaded');
      };
      image.src = this.data.imageUrl;
    }

    const content = document.createElement('div');
    content.className = 'card-content';

    const text = document.createElement('div');
    text.className = 'card-text';
    text.innerHTML = this.data.text || '点击编辑文字...';

    content.appendChild(text);

    card.appendChild(header);
    card.appendChild(imagePlaceholder);
    card.appendChild(image);
    card.appendChild(content);

    return card;
  }

  private bindEvents(): void {
    this.element.addEventListener('click', (e) => {
      if (!this.isDragging) {
        e.stopPropagation();
        this.events.onSelect?.(this);
      }
    });

    this.element.addEventListener('dragstart', (e) => {
      this.isDragging = true;
      this.element.classList.add('dragging');
      e.dataTransfer?.setData('text/plain', this.data.id);
      e.dataTransfer!.effectAllowed = 'move';
      this.dragStartX = e.clientX;
      this.dragStartY = e.clientY;
      setTimeout(() => {
        this.events.onDragStart?.(this);
      }, 0);
    });

    this.element.addEventListener('dragend', () => {
      this.isDragging = false;
      this.element.classList.remove('dragging');
      this.events.onDragEnd?.(this);
    });

    this.element.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.dataTransfer!.dropEffect = 'move';
      this.events.onDragOver?.(this, e);
    });

    this.element.addEventListener('dragleave', () => {
      this.events.onDragLeave?.(this);
    });

    this.element.addEventListener('drop', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.events.onDrop?.(this, e);
    });
  }

  public setIndex(index: number): void {
    this.data.index = index;
    const indexEl = this.element.querySelector('.card-index');
    if (indexEl) {
      indexEl.textContent = String(index + 1);
    }
  }

  public setActive(active: boolean): void {
    if (active) {
      this.element.classList.add('active');
    } else {
      this.element.classList.remove('active');
    }
  }

  public setDragOver(isOver: boolean): void {
    if (isOver) {
      this.element.classList.add('drag-over');
    } else {
      this.element.classList.remove('drag-over');
    }
  }

  public updateText(text: string): void {
    this.data.text = text;
    const textEl = this.element.querySelector('.card-text');
    if (textEl) {
      textEl.innerHTML = text || '点击编辑文字...';
    }
    this.events.onUpdate?.(this);
  }

  public updateImage(imageUrl: string | null): void {
    this.data.imageUrl = imageUrl;
    const img = this.element.querySelector('.card-image') as HTMLImageElement;
    if (img && imageUrl) {
      img.onload = () => {
        img.classList.add('loaded');
      };
      img.src = imageUrl;
    } else if (img) {
      img.src = '';
      img.classList.remove('loaded');
    }
    this.events.onUpdate?.(this);
  }

  public updateAudio(audioUrl: string | null, audioName: string | null): void {
    this.data.audioUrl = audioUrl;
    this.data.audioName = audioName;
    this.events.onUpdate?.(this);
  }

  public updateDuration(duration: number): void {
    this.data.duration = duration;
    this.events.onUpdate?.(this);
  }

  public updateTimestamp(timestamp: string): void {
    this.data.timestamp = timestamp;
    const tsEl = this.element.querySelector('.card-timestamp');
    if (tsEl) {
      tsEl.textContent = timestamp;
    }
  }

  public destroy(): void {
    this.element.remove();
  }
}
