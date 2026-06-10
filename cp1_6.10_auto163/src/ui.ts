import {
  type Note,
  COLOR_PALETTE,
  generateId,
  loadNotes,
  addNote,
  removeNote,
  sortNotes,
  formatCountdown,
  isNoteExpired,
  updateNoteExpired
} from './data';
import { sendDesktopNotification } from './notify';

const EASE = 'cubic-bezier(0.25, 0.46, 0.45, 0.94)';
const BANNER_DURATION = 5000;

let appContainer: HTMLElement;
let leftPanel: HTMLElement;
let timelineArea: HTMLElement;
let notesContainer: HTMLElement;
let titleInput: HTMLInputElement;
let contentInput: HTMLTextAreaElement;
let datetimeInput: HTMLInputElement;
let colorSwatchesContainer: HTMLElement;
let saveButton: HTMLButtonElement;
let selectedColor: string = COLOR_PALETTE[0];
let notes: Note[] = [];
let countdownTimer: number | null = null;
let reminderCheckTimer: number | null = null;
const notifiedIds = new Set<string>();

export function initUI(container: HTMLElement): void {
  appContainer = container;
  notes = sortNotes(loadNotes());
  renderStyles();
  renderLayout();
  bindEvents();
  startTimers();
  renderNotes();
}

function renderStyles(): void {
  const style = document.createElement('style');
  style.textContent = `
    .fmb-app {
      display: flex;
      flex-direction: row;
      min-height: 100vh;
      gap: 1rem;
      padding: 1rem;
      box-sizing: border-box;
      background-color: #1a1a1a;
    }
    .fmb-left-panel {
      width: 30%;
      min-width: 220px;
      background-color: #2b2b2b;
      border-radius: 12px;
      padding: 1.25rem;
      box-sizing: border-box;
      box-shadow: inset 0 2px 8px rgba(0,0,0,0.3), inset 0 -1px 3px rgba(255,255,255,0.05);
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }
    .fmb-left-panel h2 {
      margin: 0 0 0.5rem 0;
      font-size: 1.1rem;
      color: #e0e0e0;
      font-weight: 600;
    }
    .fmb-form-group {
      display: flex;
      flex-direction: column;
      gap: 0.4rem;
    }
    .fmb-form-group label {
      font-size: 0.85rem;
      color: #b0b0b0;
    }
    .fmb-input {
      background-color: #1e1e1e;
      border: 1px solid #444;
      border-radius: 6px;
      padding: 0.6rem 0.8rem;
      color: #e0e0e0;
      font-size: 0.9rem;
      font-family: inherit;
      outline: none;
      transition: border-color 0.2s ${EASE};
    }
    .fmb-input:focus {
      border-color: #3498db;
    }
    .fmb-textarea {
      resize: vertical;
      min-height: 80px;
      max-height: 160px;
    }
    .fmb-color-swatches {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }
    .fmb-color-swatch {
      width: 28px;
      height: 28px;
      border-radius: 6px;
      cursor: pointer;
      border: 2px solid transparent;
      transition: transform 0.2s ${EASE}, box-shadow 0.2s ${EASE}, border-color 0.2s ${EASE};
      box-sizing: border-box;
    }
    .fmb-color-swatch:hover {
      transform: scale(1.1);
    }
    .fmb-color-swatch.active {
      box-shadow: 0 0 0 3px rgba(52,152,219,0.6);
    }
    .fmb-btn {
      background-color: #3498db;
      color: #fff;
      border: none;
      border-radius: 6px;
      padding: 0.7rem 1rem;
      font-size: 0.95rem;
      font-weight: 500;
      cursor: pointer;
      font-family: inherit;
      transition: background-color 0.2s ${EASE}, transform 0.1s ${EASE};
    }
    .fmb-btn:hover {
      background-color: #5dade2;
    }
    .fmb-btn:active {
      transform: scale(0.97);
    }
    .fmb-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
      transform: none;
    }
    .fmb-right-panel {
      flex: 1;
      width: 70%;
      background-color: #f5f5dc;
      border-radius: 12px;
      padding: 1.5rem;
      box-sizing: border-box;
      overflow-y: auto;
      background-image:
        repeating-linear-gradient(0deg, transparent, transparent 40px, rgba(0,0,0,0.015) 40px, rgba(0,0,0,0.015) 41px),
        repeating-linear-gradient(90deg, transparent, transparent 40px, rgba(0,0,0,0.015) 40px, rgba(0,0,0,0.015) 41px);
    }
    .fmb-right-panel h2 {
      margin: 0 0 1.2rem 0;
      font-size: 1.2rem;
      color: #333;
      font-weight: 600;
    }
    .fmb-notes-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, 160px);
      gap: 1rem;
    }
    .fmb-note-card {
      width: 160px;
      height: 120px;
      border-radius: 10px;
      border: 2px solid #fff;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      padding: 0.6rem 0.75rem;
      box-sizing: border-box;
      position: relative;
      cursor: pointer;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      overflow: hidden;
      animation: fmb-slide-in 0.3s ${EASE};
      transition: opacity 0.3s ${EASE}, transform 0.3s ${EASE}, border-width 0.3s ${EASE};
    }
    .fmb-note-card.expired {
      opacity: 0.5;
    }
    .fmb-note-card.removing {
      transform: scale(0);
      opacity: 0;
    }
    .fmb-note-card.highlight {
      border-width: 4px;
      animation: fmb-highlight-blink 0.5s ${EASE} 3;
    }
    @keyframes fmb-highlight-blink {
      0%, 100% { box-shadow: 0 4px 12px rgba(0,0,0,0.15), 0 0 0 0 rgba(52,152,219,0.8); }
      50% { box-shadow: 0 4px 12px rgba(0,0,0,0.15), 0 0 0 8px rgba(52,152,219,0); }
    }
    .fmb-note-title {
      color: #fff;
      font-size: 0.95rem;
      font-weight: 600;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      margin: 0;
      padding-right: 1.2rem;
      text-shadow: 0 1px 2px rgba(0,0,0,0.3);
    }
    .fmb-note-countdown {
      color: rgba(255,255,255,0.9);
      font-size: 0.8rem;
      font-weight: 500;
      margin: 0;
      text-shadow: 0 1px 2px rgba(0,0,0,0.3);
    }
    .fmb-delete-btn {
      position: absolute;
      top: 4px;
      right: 6px;
      width: 20px;
      height: 20px;
      border: none;
      background: rgba(0,0,0,0.3);
      color: #fff;
      border-radius: 50%;
      cursor: pointer;
      font-size: 0.75rem;
      line-height: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0;
      opacity: 0;
      transition: opacity 0.2s ${EASE}, background-color 0.2s ${EASE};
    }
    .fmb-note-card:hover .fmb-delete-btn {
      opacity: 1;
    }
    .fmb-delete-btn:hover {
      background: rgba(0,0,0,0.5);
    }
    .fmb-note-detail {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0,0,0,0.6);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
      animation: fmb-fade-in 0.2s ${EASE};
    }
    .fmb-note-detail-content {
      background: #2b2b2b;
      border-radius: 12px;
      padding: 1.5rem;
      max-width: 400px;
      width: 90%;
      box-shadow: 0 10px 40px rgba(0,0,0,0.5);
      animation: fmb-scale-in 0.25s ${EASE};
    }
    .fmb-note-detail h3 {
      margin: 0 0 1rem 0;
      color: #fff;
      font-size: 1.2rem;
    }
    .fmb-note-detail p {
      color: #d0d0d0;
      font-size: 0.95rem;
      line-height: 1.6;
      margin: 0 0 1rem 0;
      white-space: pre-wrap;
      word-break: break-word;
    }
    .fmb-note-detail-meta {
      color: #888;
      font-size: 0.8rem;
      margin: 0 0 1rem 0;
    }
    .fmb-banner-container {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      z-index: 2000;
      pointer-events: none;
    }
    .fmb-banner {
      height: 60px;
      background: #1e3a5f;
      color: #fff;
      display: flex;
      align-items: center;
      padding: 0 1.5rem;
      gap: 1rem;
      border-left: 4px solid #87ceeb;
      box-shadow: 0 4px 16px rgba(0,0,0,0.3);
      animation: fmb-banner-slide-in 0.4s ${EASE};
      pointer-events: auto;
    }
    .fmb-banner.leaving {
      animation: fmb-banner-slide-out 0.4s ${EASE} forwards;
    }
    .fmb-banner-title {
      font-weight: 600;
      font-size: 0.95rem;
      flex: 1;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .fmb-banner-btn {
      background: #3498db;
      color: #fff;
      border: none;
      border-radius: 4px;
      padding: 0.4rem 0.8rem;
      font-size: 0.85rem;
      cursor: pointer;
      font-family: inherit;
      transition: background-color 0.2s ${EASE};
    }
    .fmb-banner-btn:hover {
      background: #5dade2;
    }
    .fmb-empty {
      color: #999;
      font-size: 0.95rem;
      text-align: center;
      padding: 3rem 1rem;
    }
    @keyframes fmb-slide-in {
      from {
        transform: translateY(-20px);
        opacity: 0;
      }
      to {
        transform: translateY(0);
        opacity: 1;
      }
    }
    @keyframes fmb-fade-in {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    @keyframes fmb-scale-in {
      from { transform: scale(0.9); opacity: 0; }
      to { transform: scale(1); opacity: 1; }
    }
    @keyframes fmb-banner-slide-in {
      from { transform: translateY(-100%); }
      to { transform: translateY(0); }
    }
    @keyframes fmb-banner-slide-out {
      from { transform: translateY(0); }
      to { transform: translateY(-100%); }
    }
    @media (max-width: 768px) {
      .fmb-app {
        flex-direction: column;
      }
      .fmb-left-panel {
        width: 100%;
        min-width: 0;
        height: 200px;
        overflow-y: auto;
      }
      .fmb-right-panel {
        width: 100%;
        flex: 1;
      }
      .fmb-notes-grid {
        grid-template-columns: repeat(2, 1fr);
        gap: 12px;
      }
      .fmb-note-card {
        width: 100%;
      }
    }
    @media (max-width: 480px) {
      .fmb-notes-grid {
        grid-template-columns: 1fr;
      }
      .fmb-note-card {
        width: 100%;
      }
    }
  `;
  document.head.appendChild(style);
}

function renderLayout(): void {
  appContainer.innerHTML = '';
  appContainer.className = 'fmb-app';

  leftPanel = document.createElement('div');
  leftPanel.className = 'fmb-left-panel';
  leftPanel.innerHTML = `
    <h2>新建留言</h2>
    <div class="fmb-form-group">
      <label for="fmb-title">标题（最多15字）</label>
      <input type="text" id="fmb-title" class="fmb-input" maxlength="15" placeholder="给未来的留言起个标题..." />
    </div>
    <div class="fmb-form-group">
      <label for="fmb-content">正文（最多200字）</label>
      <textarea id="fmb-content" class="fmb-input fmb-textarea" maxlength="200" placeholder="写下你想对未来说的话..."></textarea>
    </div>
    <div class="fmb-form-group">
      <label>便签颜色</label>
      <div id="fmb-colors" class="fmb-color-swatches"></div>
    </div>
    <div class="fmb-form-group">
      <label for="fmb-remind">提醒时间</label>
      <input type="datetime-local" id="fmb-remind" class="fmb-input" />
    </div>
    <button id="fmb-save" class="fmb-btn">保存</button>
  `;

  timelineArea = document.createElement('div');
  timelineArea.className = 'fmb-right-panel';
  timelineArea.innerHTML = `
    <h2>时间轴</h2>
    <div id="fmb-notes" class="fmb-notes-grid"></div>
  `;

  appContainer.appendChild(leftPanel);
  appContainer.appendChild(timelineArea);

  titleInput = document.getElementById('fmb-title') as HTMLInputElement;
  contentInput = document.getElementById('fmb-content') as HTMLTextAreaElement;
  datetimeInput = document.getElementById('fmb-remind') as HTMLInputElement;
  colorSwatchesContainer = document.getElementById('fmb-colors') as HTMLElement;
  saveButton = document.getElementById('fmb-save') as HTMLButtonElement;
  notesContainer = document.getElementById('fmb-notes') as HTMLElement;

  const bannerWrap = document.createElement('div');
  bannerWrap.className = 'fmb-banner-container';
  bannerWrap.id = 'fmb-banner-container';
  document.body.appendChild(bannerWrap);

  renderColorSwatches();
  setMinDateTime();
}

function renderColorSwatches(): void {
  colorSwatchesContainer.innerHTML = '';
  COLOR_PALETTE.forEach((color, index) => {
    const swatch = document.createElement('div');
    swatch.className = `fmb-color-swatch${index === 0 ? ' active' : ''}`;
    swatch.style.backgroundColor = color;
    swatch.dataset.color = color;
    swatch.addEventListener('click', () => {
      selectedColor = color;
      document.querySelectorAll('.fmb-color-swatch').forEach((s) => s.classList.remove('active'));
      swatch.classList.add('active');
    });
    colorSwatchesContainer.appendChild(swatch);
  });
}

function setMinDateTime(): void {
  const now = new Date();
  now.setMinutes(now.getMinutes() + 1);
  const pad = (n: number) => String(n).padStart(2, '0');
  const minStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
  datetimeInput.min = minStr;
}

function bindEvents(): void {
  saveButton.addEventListener('click', handleSave);
  datetimeInput.addEventListener('change', validateDateTime);
}

function validateDateTime(): void {
  const val = datetimeInput.value;
  if (!val) return;
  const selected = new Date(val).getTime();
  if (selected <= Date.now()) {
    datetimeInput.value = '';
    alert('请选择一个未来的时间点');
  }
}

function handleSave(): void {
  const title = titleInput.value.trim();
  const content = contentInput.value.trim();
  const datetimeVal = datetimeInput.value;

  if (!title) {
    alert('请输入标题');
    titleInput.focus();
    return;
  }
  if (!content) {
    alert('请输入正文内容');
    contentInput.focus();
    return;
  }
  if (!datetimeVal) {
    alert('请选择提醒时间');
    datetimeInput.focus();
    return;
  }

  const remindAt = new Date(datetimeVal).getTime();
  if (remindAt <= Date.now()) {
    alert('请选择一个未来的时间点');
    return;
  }

  const newNote: Note = {
    id: generateId(),
    title: title.slice(0, 15),
    content: content.slice(0, 200),
    color: selectedColor,
    remindAt,
    createdAt: Date.now(),
    expired: false
  };

  notes = sortNotes(addNote(newNote));

  titleInput.value = '';
  contentInput.value = '';
  datetimeInput.value = '';
  selectedColor = COLOR_PALETTE[0];
  document.querySelectorAll('.fmb-color-swatch').forEach((s, i) => {
    s.classList.toggle('active', i === 0);
  });
  setMinDateTime();

  renderNotes(true, newNote.id);
}

function renderNotes(animateNew = false, newNoteId?: string): void {
  notesContainer.innerHTML = '';

  if (notes.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'fmb-empty';
    empty.textContent = '还没有留言，在左侧创建第一张便签吧~';
    notesContainer.appendChild(empty);
    return;
  }

  notes.forEach((note) => {
    const card = createNoteCard(note, animateNew && note.id === newNoteId);
    notesContainer.appendChild(card);
  });
}

function createNoteCard(note: Note, isNew: boolean): HTMLElement {
  const card = document.createElement('div');
  card.className = 'fmb-note-card';
  card.dataset.id = note.id;
  card.style.backgroundColor = note.color;
  if (isNoteExpired(note)) {
    card.classList.add('expired');
  }
  if (!isNew) {
    card.style.animation = 'none';
  }

  const titleEl = document.createElement('h3');
  titleEl.className = 'fmb-note-title';
  titleEl.textContent = note.title;
  card.appendChild(titleEl);

  const deleteBtn = document.createElement('button');
  deleteBtn.className = 'fmb-delete-btn';
  deleteBtn.innerHTML = '×';
  deleteBtn.title = '删除';
  deleteBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    handleDeleteNote(note.id, card);
  });
  card.appendChild(deleteBtn);

  const countdownEl = document.createElement('p');
  countdownEl.className = 'fmb-note-countdown';
  countdownEl.dataset.countdown = note.id;
  countdownEl.textContent = formatCountdown(note.remindAt, note.expired);
  card.appendChild(countdownEl);

  card.addEventListener('click', () => {
    showNoteDetail(note);
  });

  return card;
}

function handleDeleteNote(id: string, card: HTMLElement): void {
  card.classList.add('removing');
  setTimeout(() => {
    notes = sortNotes(removeNote(id));
    notifiedIds.delete(id);
    renderNotes();
  }, 300);
}

function showNoteDetail(note: Note): void {
  const existing = document.querySelector('.fmb-note-detail');
  if (existing) existing.remove();

  const overlay = document.createElement('div');
  overlay.className = 'fmb-note-detail';

  const content = document.createElement('div');
  content.className = 'fmb-note-detail-content';
  content.style.borderLeft = `4px solid ${note.color}`;

  const title = document.createElement('h3');
  title.textContent = note.title;
  content.appendChild(title);

  const meta = document.createElement('p');
  meta.className = 'fmb-note-detail-meta';
  const remindDate = new Date(note.remindAt);
  const createDate = new Date(note.createdAt);
  meta.textContent = `创建于 ${createDate.toLocaleString()} · 提醒时间 ${remindDate.toLocaleString()}`;
  content.appendChild(meta);

  const body = document.createElement('p');
  body.textContent = note.content;
  content.appendChild(body);

  const closeBtn = document.createElement('button');
  closeBtn.className = 'fmb-btn';
  closeBtn.textContent = '关闭';
  closeBtn.style.width = '100%';
  closeBtn.addEventListener('click', () => overlay.remove());
  content.appendChild(closeBtn);

  overlay.appendChild(content);
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) overlay.remove();
  });

  document.body.appendChild(overlay);
}

function startTimers(): void {
  countdownTimer = window.setInterval(updateCountdowns, 1000 * 30);
  reminderCheckTimer = window.setInterval(checkReminders, 1000 * 15);
  checkReminders();
}

function updateCountdowns(): void {
  let needsReorder = false;
  notes.forEach((note) => {
    const wasExpired = note.expired || note.remindAt <= Date.now();
    if (!note.expired && note.remindAt <= Date.now()) {
      note.expired = true;
      notes = sortNotes(updateNoteExpired(note.id, true));
      needsReorder = true;
    }
    const el = document.querySelector(`[data-countdown="${note.id}"]`);
    if (el) {
      el.textContent = formatCountdown(note.remindAt, note.expired);
    }
    const card = document.querySelector(`.fmb-note-card[data-id="${note.id}"]`);
    if (card) {
      card.classList.toggle('expired', wasExpired || note.expired);
    }
  });
  if (needsReorder) {
    renderNotes();
  }
}

function checkReminders(): void {
  const now = Date.now();
  notes.forEach((note) => {
    if (!notifiedIds.has(note.id) && note.remindAt <= now && !note.expired) {
      notifiedIds.add(note.id);
      note.expired = true;
      notes = sortNotes(updateNoteExpired(note.id, true));
      showBanner(note);
      sendDesktopNotification(note);
      renderNotes();
    }
  });
}

function showBanner(note: Note): void {
  const container = document.getElementById('fmb-banner-container');
  if (!container) return;

  const banner = document.createElement('div');
  banner.className = 'fmb-banner';

  const title = document.createElement('span');
  title.className = 'fmb-banner-title';
  title.textContent = `⏰ ${note.title}`;
  banner.appendChild(title);

  const viewBtn = document.createElement('button');
  viewBtn.className = 'fmb-banner-btn';
  viewBtn.textContent = '查看详情';
  viewBtn.addEventListener('click', () => {
    scrollToAndHighlight(note.id);
    removeBanner(banner);
  });
  banner.appendChild(viewBtn);

  container.appendChild(banner);

  setTimeout(() => {
    removeBanner(banner);
  }, BANNER_DURATION);
}

function removeBanner(banner: HTMLElement): void {
  if (!banner.parentNode) return;
  banner.classList.add('leaving');
  setTimeout(() => {
    if (banner.parentNode) banner.parentNode.removeChild(banner);
  }, 400);
}

function scrollToAndHighlight(noteId: string): void {
  const card = document.querySelector(`.fmb-note-card[data-id="${noteId}"]`) as HTMLElement | null;
  if (!card) return;

  card.scrollIntoView({ behavior: 'smooth', block: 'center' });
  setTimeout(() => {
    card.classList.add('highlight');
    setTimeout(() => {
      card.classList.remove('highlight');
    }, 1500);
  }, 500);
}

export function cleanupUI(): void {
  if (countdownTimer !== null) {
    clearInterval(countdownTimer);
    countdownTimer = null;
  }
  if (reminderCheckTimer !== null) {
    clearInterval(reminderCheckTimer);
    reminderCheckTimer = null;
  }
}
