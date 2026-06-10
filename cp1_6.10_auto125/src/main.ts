import { searchPoems, getRandomCouplet, type PoemLine, type CoupletPair } from './poemDB';
import {
  loadStorage,
  addSearchHistory,
  addFavoritePoem,
  removeFavoritePoem,
  isPoemFavorited,
  addFavoriteCouplet,
  removeFavoriteCouplet,
  isCoupletFavorited,
  addRecentCouplet,
  sortFavoritesByTime,
  type AppStorage,
  type FavoritePoem,
  type FavoriteCouplet
} from './storage';
import {
  fadeInUp,
  slideOutRight,
  slideInLeft,
  slideDrawerIn,
  slideDrawerOut,
  heartPulse
} from './animation';

let currentCouplet: CoupletPair | null = null;
let sortAscending = false;

const $ = (id: string): HTMLElement => {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Element #${id} not found`);
  return el;
};

function showToast(msg: string, duration = 1600): void {
  const toast = $('toast');
  toast.textContent = msg;
  toast.classList.add('show');
  window.setTimeout(() => toast.classList.remove('show'), duration);
}

function formatTime(ts: number): string {
  const d = new Date(ts);
  const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function extractKeyword(text: string): string {
  const chars = text.replace(/[，。、！？；：""''（）\s]/g, '');
  return chars.charAt(Math.floor(Math.random() * chars.length)) || chars.charAt(0);
}

function renderSearchResults(poems: PoemLine[]): void {
  const container = $('searchResults');
  container.innerHTML = '';

  if (poems.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'poem-empty';
    empty.textContent = '未找到包含该关键字的诗词';
    container.appendChild(empty);
    return;
  }

  poems.forEach((poem, idx) => {
    const item = document.createElement('div');
    item.className = 'poem-item';
    item.style.opacity = '0';
    item.style.transform = 'translateY(10px)';

    const tag = document.createElement('span');
    tag.className = 'poem-tag';
    tag.textContent = `${poem.dynasty}·${poem.author}`;

    const text = document.createElement('div');
    text.className = 'poem-text';
    text.textContent = poem.text;

    item.appendChild(tag);
    item.appendChild(text);

    item.addEventListener('click', () => {
      const kw = extractKeyword(poem.text);
      ($('searchInput') as HTMLInputElement).value = kw;
      performSearch(kw);
    });

    container.appendChild(item);

    window.setTimeout(() => {
      item.style.transition = 'opacity 0.25s ease-out, transform 0.25s ease-out';
      item.style.opacity = '1';
      item.style.transform = 'translateY(0)';
    }, idx * 30);
  });
}

function performSearch(keyword: string): void {
  const kw = keyword.trim();
  if (!kw) {
    renderSearchResults([]);
    return;
  }
  const results = searchPoems(kw);
  addSearchHistory(kw);
  renderSearchResults(results);
}

function updateCoupletHeartIcon(): void {
  const icon = document.querySelector('#favCoupletBtn .heart-icon') as SVGElement | null;
  if (!icon || !currentCouplet) return;
  const faved = isCoupletFavorited(currentCouplet.upper, currentCouplet.lower);
  if (faved) {
    icon.classList.remove('heart-outline');
    icon.classList.add('heart-filled');
  } else {
    icon.classList.remove('heart-filled');
    icon.classList.add('heart-outline');
  }
}

async function showCoupletCard(isFirst: boolean): Promise<void> {
  const content = $('coupletContent');
  const newCouplet = getRandomCouplet();

  addRecentCouplet(newCouplet);

  if (isFirst) {
    content.innerHTML = buildCoupletHTML(newCouplet);
    currentCouplet = newCouplet;
    updateCoupletHeartIcon();
    await fadeInUp($('coupletCard'), 20, 400);
    return;
  }

  await slideOutRight(content, 120, 300);
  content.innerHTML = buildCoupletHTML(newCouplet);
  currentCouplet = newCouplet;
  updateCoupletHeartIcon();
  await slideInLeft(content, 120, 300);
}

function buildCoupletHTML(c: CoupletPair): string {
  return `
    <p class="couplet-upper">${c.upper}</p>
    <div class="couplet-divider"></div>
    <p class="couplet-lower">${c.lower}</p>
  `;
}

function renderFavorites(): void {
  const data = loadStorage();
  renderFavoritePoems(data.favoritePoems);
  renderFavoriteCouplets(data.favoriteCouplets);
}

function renderFavoritePoems(list: FavoritePoem[]): void {
  const container = $('favPoemsList');
  container.innerHTML = '';
  if (list.length === 0) {
    container.innerHTML = '<div class="fav-empty">还没有收藏的诗词</div>';
    return;
  }
  list.forEach((p) => {
    const item = document.createElement('div');
    item.className = 'fav-item';
    item.innerHTML = `
      <span class="fav-item-tag">${p.dynasty}·${p.author}</span>
      <div class="fav-item-text">${p.text}</div>
      <div class="fav-item-time">${formatTime(p.createdAt)}</div>
      <button class="fav-item-del" aria-label="删除">
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="3 6 5 6 21 6"></polyline>
          <path d="M19 6l-2 14a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2L5 6m5 0V4a2 2 0 0 1 2-2h0a2 2 0 0 1 2 2v2"></path>
        </svg>
      </button>
    `;
    const delBtn = item.querySelector('.fav-item-del') as HTMLElement;
    delBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      removeFavoritePoem(p.id);
      renderFavorites();
      showToast('已删除');
    });
    container.appendChild(item);
  });
}

function renderFavoriteCouplets(list: FavoriteCouplet[]): void {
  const container = $('favCoupletsList');
  container.innerHTML = '';
  if (list.length === 0) {
    container.innerHTML = '<div class="fav-empty">还没有收藏的对联</div>';
    return;
  }
  list.forEach((c) => {
    const item = document.createElement('div');
    item.className = 'fav-item';
    item.innerHTML = `
      <div class="couplet-fav-upper">${c.upper}</div>
      <div class="couplet-fav-divider"></div>
      <div class="couplet-fav-lower">${c.lower}</div>
      <div class="fav-item-time">${formatTime(c.createdAt)}</div>
      <button class="fav-item-del" aria-label="删除">
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="3 6 5 6 21 6"></polyline>
          <path d="M19 6l-2 14a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2L5 6m5 0V4a2 2 0 0 1 2-2h0a2 2 0 0 1 2 2v2"></path>
        </svg>
      </button>
    `;
    const delBtn = item.querySelector('.fav-item-del') as HTMLElement;
    delBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      removeFavoriteCouplet(c.id);
      renderFavorites();
      showToast('已删除');
    });
    container.appendChild(item);
  });
}

async function openDrawer(): Promise<void> {
  renderFavorites();
  const mask = $('drawerMask');
  const drawer = $('favDrawer');
  mask.classList.add('open');
  await slideDrawerIn(drawer, 300);
}

async function closeDrawer(): Promise<void> {
  const mask = $('drawerMask');
  const drawer = $('favDrawer');
  mask.classList.remove('open');
  await slideDrawerOut(drawer, 300);
}

function bindEvents(): void {
  const searchInput = $('searchInput') as HTMLInputElement;
  let searchTimer: number | null = null;

  searchInput.addEventListener('input', () => {
    if (searchTimer) window.clearTimeout(searchTimer);
    searchTimer = window.setTimeout(() => {
      performSearch(searchInput.value);
    }, 80);
  });

  searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      performSearch(searchInput.value);
    }
  });

  let firstCouplet = true;
  $('generateBtn').addEventListener('click', async () => {
    const btn = $('generateBtn') as HTMLButtonElement;
    btn.disabled = true;
    await showCoupletCard(firstCouplet);
    firstCouplet = false;
    btn.disabled = false;
  });

  $('favCoupletBtn').addEventListener('click', async () => {
    if (!currentCouplet) {
      showToast('请先生成一副对联');
      return;
    }
    const icon = document.querySelector('#favCoupletBtn .heart-icon') as SVGElement;
    const faved = isCoupletFavorited(currentCouplet.upper, currentCouplet.lower);
    if (faved) {
      showToast('已取消收藏');
    } else {
      addFavoriteCouplet(currentCouplet);
      await heartPulse(icon, 250);
      showToast('已收藏');
    }
    updateCoupletHeartIcon();
  });

  $('favToggleBtn').addEventListener('click', openDrawer);
  $('closeDrawerBtn').addEventListener('click', closeDrawer);
  $('drawerMask').addEventListener('click', closeDrawer);

  const tabs = document.querySelectorAll('.drawer-tab');
  tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      const target = (tab as HTMLElement).dataset.tab;
      tabs.forEach((t) => t.classList.remove('active'));
      tab.classList.add('active');
      document.querySelectorAll('.fav-list').forEach((list) => list.classList.remove('active'));
      if (target === 'poems') {
        $('favPoemsList').classList.add('active');
      } else if (target === 'couplets') {
        $('favCoupletsList').classList.add('active');
      }
    });
  });

  $('sortBtn').addEventListener('click', () => {
    sortAscending = !sortAscending;
    sortFavoritesByTime(sortAscending);
    renderFavorites();
    showToast(sortAscending ? '已按时间升序' : '已按时间降序');
  });
}

function init(): void {
  const data: AppStorage = loadStorage();
  if (data.searchHistory.length > 0) {
    const last = data.searchHistory[0];
    ($('searchInput') as HTMLInputElement).value = last;
    performSearch(last);
  } else {
    renderSearchResults([]);
  }
  bindEvents();
}

document.addEventListener('DOMContentLoaded', init);
