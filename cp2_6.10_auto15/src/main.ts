import './style.css';
import { GalleryModule } from './gallery.js';
import { CuratorModule } from './curator.js';
import type { Artwork, GalleryState } from './types.js';

const state: GalleryState = {
  artworks: [],
  exhibitions: [],
  currentView: 'gallery',
  currentExhibitionId: null
};

let galleryModule: GalleryModule | null = null;
let curatorModule: CuratorModule | null = null;
let lastClickedCard: HTMLElement | null = null;

function createAppLayout(): void {
  const app = document.getElementById('app');
  if (!app) return;

  app.innerHTML = '';

  const header = document.createElement('header');
  header.className = 'app-header';
  header.innerHTML = `
    <div class="app-header-inner">
      <h1 class="app-title">Art Gallery</h1>
      <nav class="app-nav">
        <div class="view-tabs" role="tablist">
          <button class="view-tab active" data-view="gallery" role="tab">画廊</button>
          <button class="view-tab" data-view="curator" role="tab">策展</button>
        </div>
        <button class="btn" id="addArtworkBtn" style="display:none;">+ 添加作品</button>
      </nav>
    </div>
  `;

  const main = document.createElement('main');
  main.className = 'main-content';
  main.innerHTML = `
    <div id="galleryView" class="view-gallery"></div>
    <div id="curatorView" class="view-curator" style="display:none;"></div>
  `;

  const modalRoot = document.createElement('div');
  modalRoot.id = 'modalRoot';
  modalRoot.style.cssText = 'position:relative;';

  app.appendChild(header);
  app.appendChild(main);
  app.appendChild(modalRoot);

  setupHeaderEvents();
  initModules();
}

function setupHeaderEvents(): void {
  const tabs = document.querySelectorAll('.view-tab');
  tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      const view = (tab as HTMLElement).dataset.view as 'gallery' | 'curator';
      switchView(view);
    });
  });

  const addBtn = document.getElementById('addArtworkBtn');
  addBtn?.addEventListener('click', () => openArtworkForm());
}

function switchView(view: 'gallery' | 'curator'): void {
  state.currentView = view;
  state.currentExhibitionId = null;

  document.querySelectorAll('.view-tab').forEach((tab) => {
    const t = tab as HTMLElement;
    t.classList.toggle('active', t.dataset.view === view);
  });

  const galleryView = document.getElementById('galleryView');
  const curatorView = document.getElementById('curatorView');
  const addBtn = document.getElementById('addArtworkBtn');

  if (galleryView && curatorView && addBtn) {
    galleryView.style.display = view === 'gallery' ? '' : 'none';
    curatorView.style.display = view === 'curator' ? '' : 'none';
    addBtn.style.display = view === 'gallery' ? '' : 'none';
  }

  if (view === 'curator') {
    curatorModule?.render();
  }
}

function initModules(): void {
  const galleryView = document.getElementById('galleryView');
  const curatorView = document.getElementById('curatorView');

  if (!galleryView || !curatorView) return;

  galleryModule = new GalleryModule(galleryView, {
    onArtworkClick: (artwork, cardEl) => {
      lastClickedCard = cardEl;
      openArtworkModal(artwork, cardEl);
    },
    onArtworkDragStart: () => {}
  });

  curatorModule = new CuratorModule(curatorView, {
    getArtworkById: (id) => galleryModule?.getArtworkById(id),
    onArtworkClick: (artwork, el) => {
      lastClickedCard = el;
      openArtworkModal(artwork, el);
    },
    onRequestCreate: () => openExhibitionForm(),
    onBackToList: () => {
      state.currentExhibitionId = null;
    }
  });

  state.artworks = galleryModule.getArtworks();
  galleryModule.render();

  galleryView.addEventListener('edit-artwork', ((e: CustomEvent<Artwork>) => {
    openArtworkForm(e.detail);
  }) as EventListener);
}

function openArtworkModal(artwork: Artwork, _cardEl: HTMLElement): void {
  const root = document.getElementById('modalRoot');
  if (!root) return;

  root.innerHTML = '';

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';

  const container = document.createElement('div');
  container.className = 'modal-container';

  const imageWrap = document.createElement('div');
  imageWrap.className = 'modal-image-wrap';

  const closeBtn = document.createElement('button');
  closeBtn.className = 'modal-close';
  closeBtn.innerHTML = '×';
  closeBtn.addEventListener('click', () => closeModal(overlay, container));

  const img = document.createElement('img');
  img.className = 'modal-image';
  img.src = artwork.fullImage || artwork.thumbnail;
  img.alt = artwork.title;

  imageWrap.appendChild(closeBtn);
  imageWrap.appendChild(img);

  const content = document.createElement('div');
  content.className = 'modal-content';

  const title = document.createElement('h2');
  title.className = 'modal-title';
  title.textContent = artwork.title;

  const table = document.createElement('table');
  table.className = 'metadata-table';
  table.innerHTML = `
    <tr><th>艺术家</th><td>${artwork.artist || '—'}</td></tr>
    <tr><th>创作年份</th><td>${artwork.year || '—'}</td></tr>
    <tr><th>流派</th><td>${artwork.genre || '—'}</td></tr>
    <tr><th>材料</th><td>${artwork.material || '—'}</td></tr>
    <tr><th>尺寸</th><td>${artwork.dimensions || '—'}</td></tr>
  `;

  const descWrap = document.createElement('div');
  descWrap.className = 'modal-description';
  descWrap.innerHTML = `
    <div class="modal-description-title">作品描述</div>
    <div class="modal-description-text">${artwork.description || '暂无描述。'}</div>
  `;

  content.appendChild(title);
  content.appendChild(table);
  content.appendChild(descWrap);

  container.appendChild(imageWrap);
  container.appendChild(content);
  overlay.appendChild(container);
  root.appendChild(overlay);

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeModal(overlay, container);
  });

  document.addEventListener('keydown', onEscapeKey);

  requestAnimationFrame(() => {
    overlay.classList.add('open');
  });
}

function onEscapeKey(e: KeyboardEvent): void {
  if (e.key === 'Escape') {
    const overlay = document.querySelector('.modal-overlay.open');
    const container = document.querySelector('.modal-container');
    if (overlay && container) {
      closeModal(overlay as HTMLElement, container as HTMLElement);
    }
  }
}

function closeModal(overlay: HTMLElement, container: HTMLElement): void {
  document.removeEventListener('keydown', onEscapeKey);

  if (lastClickedCard) {
    const cardRect = lastClickedCard.getBoundingClientRect();
    const modalRect = container.getBoundingClientRect();
    const scaleX = cardRect.width / modalRect.width;
    const scaleY = cardRect.height / modalRect.height;
    const scale = Math.min(scaleX, scaleY, 1);
    const translateX = (cardRect.left + cardRect.width / 2) - (modalRect.left + modalRect.width / 2);
    const translateY = (cardRect.top + cardRect.height / 2) - (modalRect.top + modalRect.height / 2);

    container.style.transition = 'transform 0.5s var(--ease-in-out), opacity 0.5s var(--ease-in-out)';
    container.style.transform = `translate(${translateX}px, ${translateY}px) scale(${scale})`;
    container.style.opacity = '0';
  } else {
    overlay.classList.add('closing');
  }

  overlay.style.opacity = '0';
  overlay.style.visibility = 'hidden';

  setTimeout(() => {
    const root = document.getElementById('modalRoot');
    if (root) root.innerHTML = '';
  }, 500);
}

function openArtworkForm(existing?: Artwork): void {
  const root = document.getElementById('modalRoot');
  if (!root) return;

  root.innerHTML = '';

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';

  const formWrap = document.createElement('div');
  formWrap.className = 'modal-container';
  formWrap.style.maxWidth = '640px';
  formWrap.style.gridTemplateColumns = '1fr';

  const formInner = document.createElement('div');
  formInner.className = 'modal-form';
  formInner.style.padding = '40px';

  const title = document.createElement('h2');
  title.className = 'form-title';
  title.textContent = existing ? '编辑艺术品' : '添加艺术品';

  const form = document.createElement('form');
  form.innerHTML = `
    <div class="form-grid">
      <div class="form-field full-width">
        <label class="form-label">作品名称 *</label>
        <input type="text" class="form-input" name="title" value="${existing?.title || ''}" required>
      </div>
      <div class="form-field">
        <label class="form-label">艺术家 *</label>
        <input type="text" class="form-input" name="artist" value="${existing?.artist || ''}" required>
      </div>
      <div class="form-field">
        <label class="form-label">创作年份</label>
        <input type="number" class="form-input" name="year" value="${existing?.year || ''}" min="0" max="2100">
      </div>
      <div class="form-field">
        <label class="form-label">流派</label>
        <input type="text" class="form-input" name="genre" value="${existing?.genre || ''}" placeholder="印象派、抽象派...">
      </div>
      <div class="form-field">
        <label class="form-label">材料</label>
        <input type="text" class="form-input" name="material" value="${existing?.material || ''}" placeholder="布面油画、水彩...">
      </div>
      <div class="form-field full-width">
        <label class="form-label">尺寸</label>
        <input type="text" class="form-input" name="dimensions" value="${existing?.dimensions || ''}" placeholder="如：89.9 × 94.1 cm">
      </div>
      <div class="form-field full-width">
        <label class="form-label">作品描述</label>
        <textarea class="form-textarea" name="description" rows="3">${existing?.description || ''}</textarea>
      </div>
      <div class="form-field full-width">
        <label class="form-label">作品图片</label>
        <div class="form-file-upload ${existing?.thumbnail ? 'has-image' : ''}" id="fileUpload">
          ${existing?.thumbnail
            ? `<img class="upload-preview" src="${existing.thumbnail}" alt="Preview">`
            : `<div class="upload-placeholder-title">点击上传图片</div>
               <div class="upload-placeholder-hint">支持 JPG、PNG、WebP，将自动压缩至 200KB 以内</div>`}
          <input type="file" name="image" accept="image/*">
        </div>
      </div>
    </div>
    <div class="form-actions">
      <button type="button" class="btn btn-secondary" id="cancelBtn">取消</button>
      <button type="submit" class="btn">${existing ? '保存修改' : '添加作品'}</button>
    </div>
  `;

  formInner.appendChild(title);
  formInner.appendChild(form);
  formWrap.appendChild(formInner);
  overlay.appendChild(formWrap);
  root.appendChild(overlay);

  requestAnimationFrame(() => overlay.classList.add('open'));

  let selectedFile: File | undefined;
  const fileInput = form.querySelector('input[name="image"]') as HTMLInputElement;
  const fileUpload = document.getElementById('fileUpload');
  fileInput?.addEventListener('change', (e) => {
    const target = e.target as HTMLInputElement;
    const file = target.files?.[0];
    if (file && fileUpload) {
      selectedFile = file;
      const reader = new FileReader();
      reader.onload = (ev) => {
        fileUpload.classList.add('has-image');
        fileUpload.innerHTML = `
          <img class="upload-preview" src="${ev.target?.result as string}" alt="Preview">
          <input type="file" name="image" accept="image/*">
        `;
        const newInput = fileUpload.querySelector('input[name="image"]') as HTMLInputElement;
        if (newInput) {
          newInput.addEventListener('change', fileInput.onchange as EventListener);
        }
      };
      reader.readAsDataURL(file);
    }
  });

  const closeForm = () => {
    overlay.style.opacity = '0';
    overlay.style.visibility = 'hidden';
    setTimeout(() => { root.innerHTML = ''; }, 300);
  };

  form.querySelector('#cancelBtn')?.addEventListener('click', closeForm);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) closeForm(); });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(form);
    const data = {
      title: (fd.get('title') as string).trim(),
      artist: (fd.get('artist') as string).trim(),
      year: Number(fd.get('year')) || 0,
      genre: (fd.get('genre') as string).trim(),
      material: (fd.get('material') as string).trim(),
      dimensions: (fd.get('dimensions') as string).trim(),
      description: (fd.get('description') as string).trim(),
      file: selectedFile
    };

    if (existing) {
      await galleryModule?.updateArtwork(existing.id, data);
    } else {
      await galleryModule?.addArtwork(data);
    }
    closeForm();
  });
}

function openExhibitionForm(): void {
  const root = document.getElementById('modalRoot');
  if (!root) return;

  root.innerHTML = '';

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';

  const formWrap = document.createElement('div');
  formWrap.className = 'modal-container';
  formWrap.style.maxWidth = '520px';
  formWrap.style.gridTemplateColumns = '1fr';

  const formInner = document.createElement('div');
  formInner.className = 'modal-form';
  formInner.style.padding = '40px';

  const title = document.createElement('h2');
  title.className = 'form-title';
  title.textContent = '创建新展览';

  const form = document.createElement('form');
  form.innerHTML = `
    <div class="form-grid">
      <div class="form-field full-width">
        <label class="form-label">展览主题 *</label>
        <input type="text" class="form-input" name="theme" required placeholder="如：夏日印象、抽象探索">
      </div>
      <div class="form-field full-width">
        <label class="form-label">展览描述</label>
        <textarea class="form-textarea" name="description" rows="3" placeholder="描述本次展览的主题与策展理念..."></textarea>
      </div>
    </div>
    <div class="form-actions">
      <button type="button" class="btn btn-secondary" id="cancelBtn">取消</button>
      <button type="submit" class="btn">创建展览</button>
    </div>
  `;

  formInner.appendChild(title);
  formInner.appendChild(form);
  formWrap.appendChild(formInner);
  overlay.appendChild(formWrap);
  root.appendChild(overlay);

  requestAnimationFrame(() => overlay.classList.add('open'));

  const closeForm = () => {
    overlay.style.opacity = '0';
    overlay.style.visibility = 'hidden';
    setTimeout(() => { root.innerHTML = ''; }, 300);
  };

  form.querySelector('#cancelBtn')?.addEventListener('click', closeForm);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) closeForm(); });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const fd = new FormData(form);
    const theme = (fd.get('theme') as string).trim();
    const description = (fd.get('description') as string).trim();
    if (theme) {
      curatorModule?.createExhibition(theme, description);
      curatorModule?.render();
      closeForm();
    }
  });
}

document.addEventListener('DOMContentLoaded', () => {
  createAppLayout();
});
