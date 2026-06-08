import { TimelineCard, CardData } from './card';

export interface TimelineEvents {
  onCardSelect?: (card: TimelineCard | null) => void;
  onCardAdd?: (card: TimelineCard) => void;
  onCardDelete?: (card: TimelineCard) => void;
  onCardReorder?: (cards: TimelineCard[]) => void;
  onCardUpdate?: (card: TimelineCard) => void;
}

export class Timeline {
  private cards: TimelineCard[] = [];
  private container: HTMLElement;
  private cardsContainer: HTMLElement;
  private addBtn: HTMLElement;
  private trashZone: HTMLElement;
  private detailPanel: HTMLElement;
  private detailContent: HTMLElement;
  private events: TimelineEvents;
  private selectedCard: TimelineCard | null = null;
  private draggingCard: TimelineCard | null = null;
  private dragOverCard: TimelineCard | null = null;
  private audioElement: HTMLAudioElement | null = null;

  constructor(
    cardsContainerId: string,
    addBtnId: string,
    trashZoneId: string,
    detailPanelId: string,
    detailContentId: string,
    events: TimelineEvents = {}
  ) {
    this.cardsContainer = document.getElementById(cardsContainerId) as HTMLElement;
    this.addBtn = document.getElementById(addBtnId) as HTMLElement;
    this.trashZone = document.getElementById(trashZoneId) as HTMLElement;
    this.detailPanel = document.getElementById(detailPanelId) as HTMLElement;
    this.detailContent = document.getElementById(detailContentId) as HTMLElement;
    this.container = this.cardsContainer.parentElement as HTMLElement;
    this.events = events;

    this.init();
  }

  private init(): void {
    this.addBtn.addEventListener('click', () => this.addCard());

    this.trashZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.dataTransfer!.dropEffect = 'move';
      this.trashZone.classList.add('hover');
    });

    this.trashZone.addEventListener('dragleave', () => {
      this.trashZone.classList.remove('hover');
    });

    this.trashZone.addEventListener('drop', (e) => {
      e.preventDefault();
      this.trashZone.classList.remove('hover');
      if (this.draggingCard) {
        this.deleteCard(this.draggingCard);
      }
    });

    this.detailPanel.addEventListener('click', (e) => {
      e.stopPropagation();
    });

    this.setupHorizontalScroll();
  }

  private setupHorizontalScroll(): void {
    const track = this.container;
    let isScrolling = false;
    let startX = 0;
    let scrollLeft = 0;

    track.addEventListener('wheel', (e) => {
      if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
        e.preventDefault();
        track.scrollLeft += e.deltaY;
      }
    }, { passive: false });

    track.addEventListener('mousedown', (e) => {
      if ((e.target as HTMLElement).closest('.timeline-card') ||
          (e.target as HTMLElement).closest('.add-card-btn')) {
        return;
      }
      isScrolling = true;
      startX = e.pageX - track.offsetLeft;
      scrollLeft = track.scrollLeft;
      track.style.cursor = 'grabbing';
    });

    track.addEventListener('mouseleave', () => {
      isScrolling = false;
      track.style.cursor = '';
    });

    track.addEventListener('mouseup', () => {
      isScrolling = false;
      track.style.cursor = '';
    });

    track.addEventListener('mousemove', (e) => {
      if (!isScrolling) return;
      e.preventDefault();
      const x = e.pageX - track.offsetLeft;
      const walk = (x - startX) * 1.5;
      track.scrollLeft = scrollLeft - walk;
    });
  }

  private generateId(): string {
    return 'card_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  private formatTimestamp(): string {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  }

  public addCard(data?: Partial<CardData>): TimelineCard {
    const newData: CardData = {
      id: this.generateId(),
      index: this.cards.length,
      text: data?.text || '',
      imageUrl: data?.imageUrl || null,
      audioUrl: data?.audioUrl || null,
      audioName: data?.audioName || null,
      duration: data?.duration || 3000,
      timestamp: data?.timestamp || this.formatTimestamp()
    };

    const card = new TimelineCard(newData, {
      onSelect: (c) => this.selectCard(c),
      onDragStart: (c) => this.handleDragStart(c),
      onDragEnd: (c) => this.handleDragEnd(c),
      onDragOver: (c, e) => this.handleDragOver(c, e),
      onDragLeave: (c) => this.handleDragLeave(c),
      onDrop: (c, e) => this.handleDrop(c, e),
      onUpdate: (c) => this.events.onCardUpdate?.(c)
    });

    this.cards.push(card);
    this.cardsContainer.appendChild(card.element);
    this.events.onCardAdd?.(card);

    setTimeout(() => {
      this.container.scrollLeft = this.container.scrollWidth;
    }, 100);

    return card;
  }

  public deleteCard(card: TimelineCard): void {
    const index = this.cards.findIndex(c => c.data.id === card.data.id);
    if (index === -1) return;

    if (this.selectedCard?.data.id === card.data.id) {
      this.selectedCard = null;
      this.closeDetailPanel();
    }

    card.destroy();
    this.cards.splice(index, 1);
    this.updateCardIndices();
    this.events.onCardDelete?.(card);
    this.events.onCardReorder?.(this.cards);
  }

  private updateCardIndices(): void {
    this.cards.forEach((card, index) => {
      card.setIndex(index);
    });
  }

  public selectCard(card: TimelineCard): void {
    if (this.selectedCard?.data.id === card.data.id) {
      this.selectedCard.setActive(false);
      this.selectedCard = null;
      this.closeDetailPanel();
      this.events.onCardSelect?.(null);
      return;
    }

    if (this.selectedCard) {
      this.selectedCard.setActive(false);
    }

    this.selectedCard = card;
    card.setActive(true);
    this.openDetailPanel(card);
    this.events.onCardSelect?.(card);
  }

  private openDetailPanel(card: TimelineCard): void {
    this.renderDetailContent(card);
    this.detailPanel.classList.add('open');
  }

  public closeDetailPanel(): void {
    this.detailPanel.classList.remove('open');
    if (this.audioElement) {
      this.audioElement.pause();
      this.audioElement = null;
    }
  }

  private renderDetailContent(card: TimelineCard): void {
    this.detailContent.innerHTML = '';

    const header = document.createElement('div');
    header.className = 'detail-header';

    const title = document.createElement('div');
    title.className = 'detail-title';
    title.innerHTML = `<i class="fas fa-clone"></i> 卡片 #${card.data.index + 1}`;

    const closeBtn = document.createElement('button');
    closeBtn.className = 'detail-close-btn';
    closeBtn.innerHTML = '<i class="fas fa-times"></i>';
    closeBtn.onclick = () => {
      if (this.selectedCard) {
        this.selectedCard.setActive(false);
        this.selectedCard = null;
        this.closeDetailPanel();
        this.events.onCardSelect?.(null);
      }
    };

    header.appendChild(title);
    header.appendChild(closeBtn);

    const imageSection = document.createElement('div');
    imageSection.className = 'detail-image-upload';

    const imageContainer = document.createElement('div');
    imageContainer.className = 'detail-image';

    if (card.data.imageUrl) {
      const img = document.createElement('img');
      img.src = card.data.imageUrl;
      img.alt = 'Card image';
      imageContainer.appendChild(img);
    } else {
      const placeholder = document.createElement('div');
      placeholder.className = 'detail-image-placeholder';
      placeholder.innerHTML = '<i class="fas fa-image"></i>';
      imageContainer.appendChild(placeholder);
    }

    const uploadHint = document.createElement('div');
    uploadHint.className = 'upload-hint';
    uploadHint.innerHTML = '<i class="fas fa-upload"></i> 更换图片';

    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/*';
    fileInput.style.display = 'none';
    fileInput.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (ev) => {
          const url = ev.target?.result as string;
          card.updateImage(url);
          this.renderDetailContent(card);
        };
        reader.readAsDataURL(file);
      }
    };

    uploadHint.onclick = () => fileInput.click();

    imageSection.appendChild(imageContainer);
    imageSection.appendChild(uploadHint);
    imageSection.appendChild(fileInput);

    const editorSection = document.createElement('div');
    editorSection.className = 'detail-text-editor';

    const editorLabel = document.createElement('label');
    editorLabel.className = 'editor-label';
    editorLabel.textContent = '卡片内容';

    const toolbar = document.createElement('div');
    toolbar.className = 'editor-toolbar';

    const btnBold = document.createElement('button');
    btnBold.innerHTML = '<i class="fas fa-bold"></i>';
    btnBold.title = '加粗';
    btnBold.onclick = () => {
      document.execCommand('bold', false);
      btnBold.classList.toggle('active');
      this.syncEditorContent(card, editorContent);
    };

    const btnItalic = document.createElement('button');
    btnItalic.innerHTML = '<i class="fas fa-italic"></i>';
    btnItalic.title = '斜体';
    btnItalic.onclick = () => {
      document.execCommand('italic', false);
      this.syncEditorContent(card, editorContent);
    };

    const fontSizeSelect = document.createElement('select');
    fontSizeSelect.className = 'font-size-select';
    fontSizeSelect.innerHTML = `
      <option value="1">小</option>
      <option value="3" selected>中</option>
      <option value="5">大</option>
      <option value="7">特大</option>
    `;
    fontSizeSelect.onchange = () => {
      document.execCommand('fontSize', false, fontSizeSelect.value);
      this.syncEditorContent(card, editorContent);
    };

    const colorInput = document.createElement('input');
    colorInput.type = 'color';
    colorInput.value = '#ffffff';
    colorInput.title = '文字颜色';
    colorInput.oninput = () => {
      document.execCommand('foreColor', false, colorInput.value);
      this.syncEditorContent(card, editorContent);
    };

    toolbar.appendChild(btnBold);
    toolbar.appendChild(btnItalic);
    toolbar.appendChild(fontSizeSelect);
    toolbar.appendChild(colorInput);

    const editorContent = document.createElement('div');
    editorContent.className = 'editor-content';
    editorContent.contentEditable = 'true';
    editorContent.innerHTML = card.data.text || '点击编辑文字...';
    editorContent.oninput = () => this.syncEditorContent(card, editorContent);

    editorSection.appendChild(editorLabel);
    editorSection.appendChild(toolbar);
    editorSection.appendChild(editorContent);

    const audioSection = document.createElement('div');
    audioSection.className = 'detail-audio';

    const audioHeader = document.createElement('div');
    audioHeader.className = 'audio-header';

    const audioTitle = document.createElement('div');
    audioTitle.className = 'audio-title';
    audioTitle.innerHTML = '<i class="fas fa-music"></i> ' + (card.data.audioName || '音频片段');

    const audioUploadBtn = document.createElement('button');
    audioUploadBtn.className = 'audio-upload-btn';
    audioUploadBtn.textContent = card.data.audioUrl ? '更换' : '上传';

    const audioFileInput = document.createElement('input');
    audioFileInput.type = 'file';
    audioFileInput.accept = 'audio/*';
    audioFileInput.style.display = 'none';
    audioFileInput.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const url = URL.createObjectURL(file);
        card.updateAudio(url, file.name);
        this.renderDetailContent(card);
      }
    };

    audioUploadBtn.onclick = () => audioFileInput.click();

    audioHeader.appendChild(audioTitle);
    audioHeader.appendChild(audioUploadBtn);

    const waveform = document.createElement('div');
    waveform.className = 'audio-waveform';

    const waveformBars = document.createElement('div');
    waveformBars.className = 'waveform-bars';
    for (let i = 0; i < 40; i++) {
      const bar = document.createElement('div');
      bar.className = 'waveform-bar';
      bar.style.height = (Math.random() * 80 + 20) + '%';
      waveformBars.appendChild(bar);
    }
    waveform.appendChild(waveformBars);

    const audioControls = document.createElement('div');
    audioControls.className = 'audio-controls';

    const audioPlayBtn = document.createElement('button');
    audioPlayBtn.className = 'audio-play-btn';
    audioPlayBtn.innerHTML = '<i class="fas fa-play"></i>';

    const audioTime = document.createElement('div');
    audioTime.className = 'audio-time';
    audioTime.textContent = card.data.audioUrl ? '00:00 / 00:00' : '--:-- / --:--';

    const audioVolume = document.createElement('div');
    audioVolume.className = 'audio-volume';
    const volumeIcon = document.createElement('i');
    volumeIcon.className = 'fas fa-volume-up';
    const volumeSlider = document.createElement('input');
    volumeSlider.type = 'range';
    volumeSlider.min = '0';
    volumeSlider.max = '100';
    volumeSlider.value = '80';
    audioVolume.appendChild(volumeIcon);
    audioVolume.appendChild(volumeSlider);

    audioControls.appendChild(audioPlayBtn);
    audioControls.appendChild(audioTime);
    audioControls.appendChild(audioVolume);

    audioSection.appendChild(audioHeader);
    audioSection.appendChild(waveform);
    audioSection.appendChild(audioControls);
    audioSection.appendChild(audioFileInput);

    if (card.data.audioUrl) {
      this.setupAudioPlayer(
        card.data.audioUrl,
        audioPlayBtn,
        audioTime,
        waveformBars,
        volumeSlider
      );
    }

    const durationSection = document.createElement('div');
    durationSection.className = 'detail-duration';

    const durationLabel = document.createElement('div');
    durationLabel.className = 'duration-label';
    durationLabel.textContent = '播放时长';

    const durationSlider = document.createElement('div');
    durationSlider.className = 'duration-slider';

    const slider = document.createElement('input');
    slider.type = 'range';
    slider.min = '1000';
    slider.max = '10000';
    slider.step = '500';
    slider.value = String(card.data.duration);

    const durationValue = document.createElement('div');
    durationValue.className = 'duration-value';
    durationValue.textContent = (card.data.duration / 1000).toFixed(1) + 's';

    slider.oninput = () => {
      const val = parseInt(slider.value);
      card.updateDuration(val);
      durationValue.textContent = (val / 1000).toFixed(1) + 's';
    };

    durationSlider.appendChild(slider);
    durationSlider.appendChild(durationValue);

    durationSection.appendChild(durationLabel);
    durationSection.appendChild(durationSlider);

    this.detailContent.appendChild(header);
    this.detailContent.appendChild(imageSection);
    this.detailContent.appendChild(editorSection);
    this.detailContent.appendChild(audioSection);
    this.detailContent.appendChild(durationSection);
  }

  private syncEditorContent(card: TimelineCard, editor: HTMLElement): void {
    card.updateText(editor.innerHTML);
  }

  private setupAudioPlayer(
    url: string,
    playBtn: HTMLElement,
    timeDisplay: HTMLElement,
    waveformBars: HTMLElement,
    volumeSlider: HTMLInputElement
  ): void {
    if (this.audioElement) {
      this.audioElement.pause();
    }

    const audio = new Audio(url);
    this.audioElement = audio;
    audio.volume = parseInt(volumeSlider.value) / 100;

    const formatTime = (seconds: number): string => {
      const mins = Math.floor(seconds / 60);
      const secs = Math.floor(seconds % 60);
      return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    };

    audio.addEventListener('loadedmetadata', () => {
      timeDisplay.textContent = `00:00 / ${formatTime(audio.duration)}`;
    });

    audio.addEventListener('timeupdate', () => {
      timeDisplay.textContent = `${formatTime(audio.currentTime)} / ${formatTime(audio.duration)}`;
      const progress = audio.currentTime / audio.duration;
      const bars = waveformBars.querySelectorAll('.waveform-bar');
      const playedCount = Math.floor(progress * bars.length);
      bars.forEach((bar, i) => {
        if (i < playedCount) {
          bar.classList.add('played');
        } else {
          bar.classList.remove('played');
        }
      });
    });

    audio.addEventListener('ended', () => {
      playBtn.innerHTML = '<i class="fas fa-play"></i>';
    });

    playBtn.onclick = () => {
      if (audio.paused) {
        audio.play();
        playBtn.innerHTML = '<i class="fas fa-pause"></i>';
      } else {
        audio.pause();
        playBtn.innerHTML = '<i class="fas fa-play"></i>';
      }
    };

    volumeSlider.oninput = () => {
      audio.volume = parseInt(volumeSlider.value) / 100;
    };
  }

  private handleDragStart(card: TimelineCard): void {
    this.draggingCard = card;
    this.trashZone.classList.add('visible');
  }

  private handleDragEnd(card: TimelineCard): void {
    this.draggingCard = null;
    this.trashZone.classList.remove('visible', 'hover');
    if (this.dragOverCard) {
      this.dragOverCard.setDragOver(false);
      this.dragOverCard = null;
    }
  }

  private handleDragOver(card: TimelineCard, e: DragEvent): void {
    if (!this.draggingCard || this.draggingCard.data.id === card.data.id) return;

    if (this.dragOverCard && this.dragOverCard.data.id !== card.data.id) {
      this.dragOverCard.setDragOver(false);
    }

    this.dragOverCard = card;
    card.setDragOver(true);
  }

  private handleDragLeave(card: TimelineCard): void {
    if (this.dragOverCard?.data.id === card.data.id) {
      card.setDragOver(false);
      this.dragOverCard = null;
    }
  }

  private handleDrop(targetCard: TimelineCard, e: DragEvent): void {
    if (!this.draggingCard || this.draggingCard.data.id === targetCard.data.id) return;

    const fromIndex = this.cards.findIndex(c => c.data.id === this.draggingCard!.data.id);
    const toIndex = this.cards.findIndex(c => c.data.id === targetCard.data.id);

    if (fromIndex === -1 || toIndex === -1) return;

    const [movedCard] = this.cards.splice(fromIndex, 1);
    this.cards.splice(toIndex, 0, movedCard);

    this.updateCardIndices();
    this.reorderDomCards();

    targetCard.setDragOver(false);
    this.dragOverCard = null;

    this.events.onCardReorder?.(this.cards);
  }

  private reorderDomCards(): void {
    this.cards.forEach(card => {
      this.cardsContainer.appendChild(card.element);
    });
  }

  public getCards(): TimelineCard[] {
    return [...this.cards];
  }

  public getSelectedCard(): TimelineCard | null {
    return this.selectedCard;
  }

  public scrollToCard(card: TimelineCard): void {
    const cardRect = card.element.getBoundingClientRect();
    const containerRect = this.container.getBoundingClientRect();
    const scrollLeft = this.container.scrollLeft + cardRect.left - containerRect.left - containerRect.width / 2 + cardRect.width / 2;
    this.container.scrollTo({ left: scrollLeft, behavior: 'smooth' });
  }

  public getContainer(): HTMLElement {
    return this.container;
  }
}
