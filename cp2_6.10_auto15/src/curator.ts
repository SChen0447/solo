import { Artwork, Exhibition, STORAGE_KEYS } from './types.js';

type CuratorListeners = {
  getArtworkById: (id: string) => Artwork | undefined;
  onArtworkClick: (artwork: Artwork, el: HTMLElement) => void;
  onRequestCreate: () => void;
  onBackToList: () => void;
};

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 9);
}

function loadExhibitions(): Exhibition[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.EXHIBITIONS);
    if (raw) {
      const parsed = JSON.parse(raw) as Exhibition[];
      return parsed.sort((a, b) => a.order - b.order);
    }
  } catch (e) {
    console.error('Failed to load exhibitions:', e);
  }
  return getDefaultExhibitions();
}

function getDefaultExhibitions(): Exhibition[] {
  const now = Date.now();
  return [
    {
      id: 'ex-1',
      theme: '夏日印象',
      description: '光影交织的印象派杰作，捕捉夏日转瞬即逝的美好瞬间。',
      artworkIds: ['demo-1', 'demo-2'],
      order: 0,
      createdAt: now - 2000
    },
    {
      id: 'ex-2',
      theme: '抽象探索',
      description: '从形式到色彩，探索20世纪抽象艺术的无限可能。',
      artworkIds: ['demo-3', 'demo-5', 'demo-6'],
      order: 1,
      createdAt: now - 1000
    }
  ];
}

function saveExhibitions(exhibitions: Exhibition[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.EXHIBITIONS, JSON.stringify(exhibitions));
  } catch (e) {
    console.error('Failed to save exhibitions:', e);
  }
}

export class CuratorModule {
  private container: HTMLElement;
  private exhibitions: Exhibition[];
  private listeners: CuratorListeners;
  private currentExhibitionId: string | null = null;

  constructor(container: HTMLElement, listeners: CuratorListeners) {
    this.container = container;
    this.listeners = listeners;
    this.exhibitions = loadExhibitions();
  }

  createExhibition(theme: string, description: string): Exhibition {
    const exhibition: Exhibition = {
      id: generateId(),
      theme,
      description,
      artworkIds: [],
      order: this.exhibitions.length,
      createdAt: Date.now()
    };
    this.exhibitions.push(exhibition);
    saveExhibitions(this.exhibitions);
    return exhibition;
  }

  deleteExhibition(id: string): void {
    this.exhibitions = this.exhibitions.filter((e) => e.id !== id);
    this.exhibitions.forEach((e, i) => (e.order = i));
    saveExhibitions(this.exhibitions);
    if (this.currentExhibitionId === id) {
      this.currentExhibitionId = null;
    }
    this.render();
  }

  addArtworkToExhibition(exhibitionId: string, artworkId: string): void {
    const ex = this.exhibitions.find((e) => e.id === exhibitionId);
    if (!ex) return;
    if (!ex.artworkIds.includes(artworkId)) {
      ex.artworkIds.push(artworkId);
      saveExhibitions(this.exhibitions);
      if (this.currentExhibitionId === exhibitionId) {
        this.renderExhibitionView(ex);
      }
    }
  }

  removeArtworkFromExhibition(exhibitionId: string, artworkId: string): void {
    const ex = this.exhibitions.find((e) => e.id === exhibitionId);
    if (!ex) return;
    ex.artworkIds = ex.artworkIds.filter((id) => id !== artworkId);
    saveExhibitions(this.exhibitions);
    if (this.currentExhibitionId === exhibitionId) {
      this.renderExhibitionView(ex);
    }
  }

  openExhibition(id: string): void {
    this.currentExhibitionId = id;
    this.render();
  }

  goBack(): void {
    this.currentExhibitionId = null;
    this.render();
  }

  render(): void {
    this.container.innerHTML = '';

    if (this.currentExhibitionId) {
      const ex = this.exhibitions.find((e) => e.id === this.currentExhibitionId);
      if (ex) {
        this.renderExhibitionView(ex);
        return;
      }
      this.currentExhibitionId = null;
    }

    this.renderListView();
  }

  private renderListView(): void {
    const header = document.createElement('div');
    header.className = 'curator-header';

    const title = document.createElement('div');
    title.className = 'curator-title';
    title.textContent = '主题展览';

    const createBtn = document.createElement('button');
    createBtn.className = 'btn';
    createBtn.textContent = '+ 创建展览';
    createBtn.addEventListener('click', () => this.listeners.onRequestCreate());

    header.appendChild(title);
    header.appendChild(createBtn);
    this.container.appendChild(header);

    const grid = document.createElement('div');
    grid.className = 'exhibitions-grid';

    const createCard = document.createElement('div');
    createCard.className = 'exhibition-card create-card';
    createCard.innerHTML = `
      <div class="create-icon">+</div>
      <div class="create-text">创建新展览</div>
    `;
    createCard.addEventListener('click', () => this.listeners.onRequestCreate());
    grid.appendChild(createCard);

    this.exhibitions.forEach((ex) => {
      const card = document.createElement('div');
      card.className = 'exhibition-card';

      const theme = document.createElement('div');
      theme.className = 'exhibition-theme';
      theme.textContent = ex.theme;

      const desc = document.createElement('div');
      desc.className = 'exhibition-desc';
      desc.textContent = ex.description;

      const count = document.createElement('div');
      count.className = 'exhibition-count';
      count.textContent = `${ex.artworkIds.length} 件作品`;

      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'card-action-btn';
      deleteBtn.style.cssText = 'position:absolute;top:12px;right:12px;opacity:0;transition:opacity 0.2s;';
      deleteBtn.innerHTML = '✕';
      deleteBtn.title = '删除展览';
      deleteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (confirm(`确定要删除展览"${ex.theme}"吗？`)) {
          this.deleteExhibition(ex.id);
        }
      });

      card.addEventListener('mouseenter', () => (deleteBtn.style.opacity = '1'));
      card.addEventListener('mouseleave', () => (deleteBtn.style.opacity = '0'));

      card.appendChild(theme);
      card.appendChild(desc);
      card.appendChild(count);
      card.appendChild(deleteBtn);

      card.addEventListener('click', () => this.openExhibition(ex.id));

      grid.appendChild(card);
    });

    this.container.appendChild(grid);
  }

  private renderExhibitionView(exhibition: Exhibition): void {
    const view = document.createElement('div');
    view.className = 'exhibition-view';

    const header = document.createElement('div');
    header.className = 'exhibition-view-header';

    const titleWrap = document.createElement('div');
    titleWrap.className = 'exhibition-view-title';

    const backBtn = document.createElement('button');
    backBtn.className = 'back-btn';
    backBtn.innerHTML = '← 返回展览列表';
    backBtn.addEventListener('click', () => {
      this.listeners.onBackToList();
      this.goBack();
    });

    const theme = document.createElement('span');
    theme.className = 'exhibition-view-theme';
    theme.textContent = exhibition.theme;

    titleWrap.appendChild(backBtn);
    titleWrap.appendChild(theme);

    const actions = document.createElement('div');
    actions.style.cssText = 'display:flex;gap:12px;';

    const hint = document.createElement('span');
    hint.style.cssText = 'font-size:12px;color:var(--color-text-muted);align-self:center;';
    hint.textContent = '提示：切换到画廊视图拖拽作品到此处';

    actions.appendChild(hint);
    header.appendChild(titleWrap);
    header.appendChild(actions);
    view.appendChild(header);

    const dropZone = document.createElement('div');
    dropZone.className = 'drop-zone';
    const dropText = document.createElement('div');
    dropText.className = 'drop-zone-text';
    dropText.textContent = '从画廊视图拖拽作品卡片到这里，将其加入展览';
    dropZone.appendChild(dropText);

    dropZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy';
      dropZone.classList.add('drag-active');
    });

    dropZone.addEventListener('dragleave', () => {
      dropZone.classList.remove('drag-active');
    });

    dropZone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropZone.classList.remove('drag-active');
      const artworkId = e.dataTransfer?.getData('application/artwork-id') || e.dataTransfer?.getData('text/plain');
      if (artworkId) {
        this.addArtworkToExhibition(exhibition.id, artworkId);
      }
    });

    view.appendChild(dropZone);

    const horizontal = document.createElement('div');
    horizontal.className = 'exhibition-horizontal';

    const track = document.createElement('div');
    track.className = 'exhibition-track';

    if (exhibition.artworkIds.length === 0) {
      const emptyMsg = document.createElement('div');
      emptyMsg.style.cssText = 'padding:60px;text-align:center;color:var(--color-text-muted);font-family:var(--font-display);font-size:20px;';
      emptyMsg.textContent = '展览中还没有作品，拖拽艺术品卡片到上方区域来添加。';
      view.appendChild(emptyMsg);
      this.container.appendChild(view);
      return;
    }

    exhibition.artworkIds.forEach((artworkId, index) => {
      const artwork = this.listeners.getArtworkById(artworkId);
      if (!artwork) return;

      const item = document.createElement('div');
      item.className = 'exhibition-item';
      item.style.opacity = '0';
      item.dataset.index = String(index);

      setTimeout(() => {
        item.style.transition = 'opacity 0.5s var(--ease-in-out)';
        item.style.opacity = '1';
      }, index * 80);

      const artworkWrap = document.createElement('div');
      artworkWrap.className = 'exhibition-artwork';

      const removeBtn = document.createElement('button');
      removeBtn.className = 'card-action-btn';
      removeBtn.style.cssText = 'position:absolute;top:12px;right:12px;z-index:5;width:34px;height:34px;font-size:16px;';
      removeBtn.innerHTML = '✕';
      removeBtn.title = '从展览中移除';
      removeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        item.style.opacity = '0';
        setTimeout(() => {
          this.removeArtworkFromExhibition(exhibition.id, artworkId);
        }, 300);
      });

      const img = document.createElement('img');
      img.className = 'exhibition-artwork-img';
      img.src = artwork.fullImage || artwork.thumbnail;
      img.alt = artwork.title;
      img.style.cursor = 'pointer';
      img.addEventListener('click', () => this.listeners.onArtworkClick(artwork, item));

      const info = document.createElement('div');
      info.className = 'exhibition-artwork-info';

      const title = document.createElement('div');
      title.className = 'exhibition-artwork-title';
      title.textContent = artwork.title;

      const meta = document.createElement('div');
      meta.className = 'exhibition-artwork-meta';
      meta.textContent = `${artwork.artist}${artwork.year ? '，' + artwork.year : ''}${artwork.genre ? ' · ' + artwork.genre : ''}`;

      info.appendChild(title);
      info.appendChild(meta);

      artworkWrap.appendChild(removeBtn);
      artworkWrap.appendChild(img);
      artworkWrap.appendChild(info);

      item.appendChild(artworkWrap);
      track.appendChild(item);
    });

    horizontal.appendChild(track);
    view.appendChild(horizontal);
    this.container.appendChild(view);

    requestAnimationFrame(() => {
      horizontal.scrollLeft = 0;
    });
  }
}
