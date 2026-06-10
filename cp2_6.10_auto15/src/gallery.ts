import { Artwork, STORAGE_KEYS } from './types.js';

type GalleryListeners = {
  onArtworkClick: (artwork: Artwork, cardEl: HTMLElement) => void;
  onArtworkDragStart?: (artworkId: string) => void;
};

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 9);
}

function loadArtworks(): Artwork[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.ARTWORKS);
    if (raw) {
      const parsed = JSON.parse(raw) as Artwork[];
      return parsed.sort((a, b) => a.order - b.order);
    }
  } catch (e) {
    console.error('Failed to load artworks:', e);
  }
  return getDefaultArtworks();
}

function getDefaultArtworks(): Artwork[] {
  const now = Date.now();
  return [
    {
      id: 'demo-1',
      title: '睡莲池',
      artist: '克劳德·莫奈',
      year: 1906,
      genre: '印象派',
      material: '布面油画',
      dimensions: '89.9 × 94.1 cm',
      description: '莫奈晚年在吉维尼花园创作的系列作品之一，以其独特的笔触捕捉光影在水面上的瞬息变化，将观者带入一个梦幻般的水世界。',
      thumbnail: 'https://images.unsplash.com/photo-1578321272176-b7bbc0679853?w=600&q=80',
      fullImage: 'https://images.unsplash.com/photo-1578321272176-b7bbc0679853?w=1600&q=85',
      order: 0,
      createdAt: now - 5000
    },
    {
      id: 'demo-2',
      title: '星夜',
      artist: '文森特·梵高',
      year: 1889,
      genre: '后印象派',
      material: '布面油画',
      dimensions: '73.7 × 92.1 cm',
      description: '梵高在法国圣雷米精神病院期间创作的杰作，漩涡状的夜空与宁静的村庄形成鲜明对比，展现了艺术家内心的激情与苦闷。',
      thumbnail: 'https://images.unsplash.com/photo-1541961017774-22349e4a1262?w=600&q=80',
      fullImage: 'https://images.unsplash.com/photo-1541961017774-22349e4a1262?w=1600&q=85',
      order: 1,
      createdAt: now - 4000
    },
    {
      id: 'demo-3',
      title: '构成VIII',
      artist: '瓦西里·康定斯基',
      year: 1923,
      genre: '抽象艺术',
      material: '布面油画',
      dimensions: '140 × 140 cm',
      description: '包豪斯时期的重要作品，几何形状与鲜艳色彩的自由组合，体现了康定斯基对音乐与绘画相通性的深刻探索。',
      thumbnail: 'https://images.unsplash.com/photo-1549490349-8643362247b5?w=600&q=80',
      fullImage: 'https://images.unsplash.com/photo-1549490349-8643362247b5?w=1600&q=85',
      order: 2,
      createdAt: now - 3000
    },
    {
      id: 'demo-4',
      title: '戴珍珠耳环的少女',
      artist: '约翰内斯·维米尔',
      year: 1665,
      genre: '巴洛克',
      material: '布面油画',
      dimensions: '44.5 × 39 cm',
      description: '荷兰黄金时代最著名的肖像画之一，少女回眸的神情与左耳闪烁的珍珠耳环，被誉为"北方的蒙娜丽莎"。',
      thumbnail: 'https://images.unsplash.com/photo-1578926375605-eaf7559b1458?w=600&q=80',
      fullImage: 'https://images.unsplash.com/photo-1578926375605-eaf7559b1458?w=1600&q=85',
      order: 3,
      createdAt: now - 2000
    },
    {
      id: 'demo-5',
      title: '记忆的永恒',
      artist: '萨尔瓦多·达利',
      year: 1931,
      genre: '超现实主义',
      material: '布面油画',
      dimensions: '24.1 × 33 cm',
      description: '超现实主义的标志性作品，软化的时钟象征着时间的相对性，梦幻般的荒漠景观展现了达利独特的偏执批判方法。',
      thumbnail: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?w=600&q=80',
      fullImage: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?w=1600&q=85',
      order: 4,
      createdAt: now - 1000
    },
    {
      id: 'demo-6',
      title: '呐喊',
      artist: '爱德华·蒙克',
      year: 1893,
      genre: '表现主义',
      material: '蛋彩画',
      dimensions: '91 × 73.5 cm',
      description: '表现主义运动的先驱之作，扭曲的人形与血红色的天空传达出现代人内心深处的焦虑与存在的痛苦。',
      thumbnail: 'https://images.unsplash.com/photo-1577720580479-7d839d829c73?w=600&q=80',
      fullImage: 'https://images.unsplash.com/photo-1577720580479-7d839d829c73?w=1600&q=85',
      order: 5,
      createdAt: now
    }
  ];
}

function saveArtworks(artworks: Artwork[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.ARTWORKS, JSON.stringify(artworks));
  } catch (e) {
    console.error('Failed to save artworks:', e);
  }
}

async function compressImage(file: File, maxSizeKB = 200, maxWidth = 1200): Promise<{ thumbnail: string; fullImage: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          height = (maxWidth / width) * height;
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas context not available'));
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);

        let quality = 0.85;
        let result = canvas.toDataURL('image/jpeg', quality);

        while (result.length / 1024 > maxSizeKB && quality > 0.2) {
          quality -= 0.1;
          result = canvas.toDataURL('image/jpeg', quality);
        }

        const thumbCanvas = document.createElement('canvas');
        const thumbMaxWidth = 600;
        let tWidth = img.width;
        let tHeight = img.height;
        if (tWidth > thumbMaxWidth) {
          tHeight = (thumbMaxWidth / tWidth) * tHeight;
          tWidth = thumbMaxWidth;
        }
        thumbCanvas.width = tWidth;
        thumbCanvas.height = tHeight;
        const tCtx = thumbCanvas.getContext('2d');
        if (tCtx) {
          tCtx.drawImage(img, 0, 0, tWidth, tHeight);
          const thumbnail = thumbCanvas.toDataURL('image/jpeg', 0.75);
          resolve({ thumbnail, fullImage: result });
          return;
        }
        resolve({ thumbnail: result, fullImage: result });
      };
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

export class GalleryModule {
  private container: HTMLElement;
  private artworks: Artwork[];
  private listeners: GalleryListeners;
  private lazyObserver: IntersectionObserver | null = null;
  private draggingId: string | null = null;
  private dragOverId: string | null = null;

  constructor(container: HTMLElement, listeners: GalleryListeners) {
    this.container = container;
    this.listeners = listeners;
    this.artworks = loadArtworks();
    this.initLazyObserver();
  }

  private initLazyObserver(): void {
    if ('IntersectionObserver' in window) {
      this.lazyObserver = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              const img = entry.target as HTMLImageElement;
              const src = img.dataset.src;
              if (src) {
                img.src = src;
                img.addEventListener('load', () => img.classList.add('loaded'), { once: true });
              }
              this.lazyObserver?.unobserve(img);
            }
          });
        },
        { rootMargin: '100px' }
      );
    }
  }

  getArtworks(): Artwork[] {
    return [...this.artworks];
  }

  getArtworkById(id: string): Artwork | undefined {
    return this.artworks.find((a) => a.id === id);
  }

  async addArtwork(data: Omit<Artwork, 'id' | 'order' | 'createdAt' | 'thumbnail' | 'fullImage'> & { file?: File }): Promise<Artwork> {
    let thumbnail = '';
    let fullImage = '';

    if (data.file) {
      const compressed = await compressImage(data.file);
      thumbnail = compressed.thumbnail;
      fullImage = compressed.fullImage;
    }

    const newArtwork: Artwork = {
      id: generateId(),
      title: data.title,
      artist: data.artist,
      year: data.year,
      genre: data.genre,
      material: data.material,
      dimensions: data.dimensions,
      description: data.description,
      thumbnail,
      fullImage,
      order: this.artworks.length,
      createdAt: Date.now()
    };

    this.artworks.push(newArtwork);
    saveArtworks(this.artworks);
    this.render();
    return newArtwork;
  }

  async updateArtwork(id: string, data: Partial<Omit<Artwork, 'id' | 'order' | 'createdAt'>> & { file?: File }): Promise<void> {
    const idx = this.artworks.findIndex((a) => a.id === id);
    if (idx === -1) return;

    const updated = { ...this.artworks[idx], ...data };

    if (data.file) {
      const compressed = await compressImage(data.file);
      updated.thumbnail = compressed.thumbnail;
      updated.fullImage = compressed.fullImage;
    }

    delete (updated as { file?: File }).file;
    this.artworks[idx] = updated;
    saveArtworks(this.artworks);
    this.render();
  }

  deleteArtwork(id: string): void {
    this.artworks = this.artworks.filter((a) => a.id !== id);
    this.artworks.forEach((a, i) => (a.order = i));
    saveArtworks(this.artworks);
    this.render();
  }

  private reorder(draggedId: string, targetId: string): void {
    if (draggedId === targetId) return;
    const draggedIdx = this.artworks.findIndex((a) => a.id === draggedId);
    const targetIdx = this.artworks.findIndex((a) => a.id === targetId);
    if (draggedIdx === -1 || targetIdx === -1) return;

    const [dragged] = this.artworks.splice(draggedIdx, 1);
    this.artworks.splice(targetIdx, 0, dragged);
    this.artworks.forEach((a, i) => (a.order = i));
    saveArtworks(this.artworks);
    this.render();
  }

  private createCard(artwork: Artwork): HTMLElement {
    const card = document.createElement('div');
    card.className = 'artwork-card';
    card.dataset.id = artwork.id;
    card.draggable = true;

    const thumbWrap = document.createElement('div');
    thumbWrap.className = 'artwork-thumb-wrap';

    const img = document.createElement('img');
    img.className = 'artwork-thumb';
    img.alt = artwork.title;
    img.loading = 'lazy';

    if (this.lazyObserver) {
      img.dataset.src = artwork.thumbnail;
      this.lazyObserver.observe(img);
    } else {
      img.src = artwork.thumbnail;
      img.addEventListener('load', () => img.classList.add('loaded'), { once: true });
    }

    thumbWrap.appendChild(img);

    const actions = document.createElement('div');
    actions.className = 'artwork-card-actions';

    const editBtn = document.createElement('button');
    editBtn.className = 'card-action-btn';
    editBtn.innerHTML = '✎';
    editBtn.title = '编辑';
    editBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const ev = new CustomEvent('edit-artwork', { detail: artwork, bubbles: true });
      card.dispatchEvent(ev);
    });

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'card-action-btn';
    deleteBtn.innerHTML = '✕';
    deleteBtn.title = '删除';
    deleteBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (confirm(`确定要删除《${artwork.title}》吗？`)) {
        this.deleteArtwork(artwork.id);
      }
    });

    actions.appendChild(editBtn);
    actions.appendChild(deleteBtn);

    const info = document.createElement('div');
    info.className = 'artwork-card-info';

    const title = document.createElement('div');
    title.className = 'artwork-card-title';
    title.textContent = artwork.title;

    const artist = document.createElement('div');
    artist.className = 'artwork-card-artist';
    artist.textContent = artwork.artist;

    const year = document.createElement('div');
    year.className = 'artwork-card-year';
    year.textContent = artwork.year ? String(artwork.year) : '';

    const desc = document.createElement('div');
    desc.className = 'artwork-card-desc';
    desc.textContent = artwork.description;

    info.appendChild(title);
    info.appendChild(artist);
    info.appendChild(year);
    info.appendChild(desc);

    card.appendChild(thumbWrap);
    card.appendChild(actions);
    card.appendChild(info);

    card.addEventListener('click', () => {
      if (this.draggingId) return;
      this.listeners.onArtworkClick(artwork, card);
    });

    card.addEventListener('dragstart', (e) => {
      this.draggingId = artwork.id;
      card.classList.add('dragging');
      if (e.dataTransfer) {
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', artwork.id);
        e.dataTransfer.setData('application/artwork-id', artwork.id);
      }
      this.listeners.onArtworkDragStart?.(artwork.id);
    });

    card.addEventListener('dragend', () => {
      card.classList.remove('dragging');
      document.querySelectorAll('.artwork-card.drag-over').forEach((el) => el.classList.remove('drag-over'));
      this.draggingId = null;
      this.dragOverId = null;
    });

    card.addEventListener('dragover', (e) => {
      if (!this.draggingId || this.draggingId === artwork.id) return;
      e.preventDefault();
      if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
      if (this.dragOverId !== artwork.id) {
        document.querySelectorAll('.artwork-card.drag-over').forEach((el) => el.classList.remove('drag-over'));
        card.classList.add('drag-over');
        this.dragOverId = artwork.id;
      }
    });

    card.addEventListener('dragleave', (e) => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX;
      const y = e.clientY;
      if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
        card.classList.remove('drag-over');
        if (this.dragOverId === artwork.id) this.dragOverId = null;
      }
    });

    card.addEventListener('drop', (e) => {
      e.preventDefault();
      card.classList.remove('drag-over');
      if (this.draggingId && this.draggingId !== artwork.id) {
        this.reorder(this.draggingId, artwork.id);
      }
    });

    return card;
  }

  render(): void {
    this.container.innerHTML = '';

    if (this.artworks.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'empty-state';
      empty.innerHTML = `
        <div class="empty-state-title">画廊中还没有艺术品</div>
        <div class="empty-state-text">点击上方"添加作品"按钮，开始收藏你的第一件艺术作品。</div>
      `;
      this.container.appendChild(empty);
      return;
    }

    const grid = document.createElement('div');
    grid.className = 'gallery-grid';

    this.artworks.forEach((artwork) => {
      grid.appendChild(this.createCard(artwork));
    });

    this.container.appendChild(grid);
  }

  destroy(): void {
    this.lazyObserver?.disconnect();
  }
}
