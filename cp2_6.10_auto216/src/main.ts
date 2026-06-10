import { StateManager, RuneType, RUNES, SpellRecord, Spell } from './state';
import { MagicCore } from './core';
import { Renderer } from './renderer';

const state = new StateManager();
const canvas = document.getElementById('magicCanvas') as HTMLCanvasElement;
const core = new MagicCore(canvas, state);
const renderer = new Renderer(canvas, core, state);

function init(): void {
  createRunePanel();
  bindEvents();
  renderHistory();
  state.subscribe(() => {
    renderSelectedRune();
    renderHistory();
  });
  renderer.start();
}

function createRunePanel(): void {
  const container = document.getElementById('runeContainer') as HTMLDivElement;
  container.innerHTML = '';
  container.style.display = 'flex';
  container.style.flexDirection = 'column';
  container.style.alignItems = 'center';
  container.style.gap = '16px';

  const runeTypes: RuneType[] = ['fire', 'ice', 'thunder', 'heal', 'shadow'];
  runeTypes.forEach(type => {
    const rune = RUNES[type];
    const el = document.createElement('div');
    el.className = 'rune-item';
    el.style.backgroundColor = rune.color;
    el.dataset.rune = type;
    el.title = rune.name;
    el.innerHTML = getRuneSVG(type);
    el.addEventListener('click', () => handleRuneSelect(type));
    container.appendChild(el);
  });
}

function getRuneSVG(type: RuneType): string {
  switch (type) {
    case 'fire':
      return `<svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M12 2c1 4 5 5 5 9a5 5 0 1 1-10 0c0-2 1-3 2-4 0 2 1 3 2 3 0-3-1-5 1-8z"/>
      </svg>`;
    case 'ice':
      return `<svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <line x1="12" y1="2" x2="12" y2="22"/>
        <line x1="2" y1="12" x2="22" y2="12"/>
        <line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/>
        <line x1="19.07" y1="4.93" x2="4.93" y2="19.07"/>
      </svg>`;
    case 'thunder':
      return `<svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
      </svg>`;
    case 'heal':
      return `<svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <line x1="12" y1="5" x2="12" y2="19"/>
        <line x1="5" y1="12" x2="19" y2="12"/>
      </svg>`;
    case 'shadow':
      return `<svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
        <circle cx="8" cy="10" r="0.8" fill="white"/>
        <circle cx="10" cy="14" r="0.6" fill="white"/>
        <circle cx="6" cy="13" r="0.5" fill="white"/>
      </svg>`;
  }
}

function handleRuneSelect(type: RuneType): void {
  const current = state.getState().selectedRune;
  state.setSelectedRune(current === type ? null : type);
}

function renderSelectedRune(): void {
  const selected = state.getState().selectedRune;
  document.querySelectorAll('.rune-item').forEach(el => {
    const runeType = el.getAttribute('data-rune') as RuneType;
    if (runeType === selected) {
      el.classList.add('selected');
    } else {
      el.classList.remove('selected');
    }
  });
}

function bindEvents(): void {
  canvas.addEventListener('click', (e) => {
    core.handleCanvasClick(e.clientX, e.clientY);
  });

  const btnClear = document.getElementById('btnClear') as HTMLButtonElement;
  btnClear.addEventListener('click', () => {
    core.clearAllRunes();
  });

  const btnUndo = document.getElementById('btnUndo') as HTMLButtonElement;
  btnUndo.addEventListener('click', () => {
    core.undoLastRune();
  });

  state.subscribe(() => {
    const activeSpell = state.getState().activeSpell;
    if (activeSpell) {
      showSpellText(activeSpell);
    }
  });
}

let spellTextTimeout: number | null = null;

function showSpellText(spell: Spell): void {
  const el = document.getElementById('spellText') as HTMLDivElement;
  el.innerHTML = `
    <div>${spell.name}</div>
    <div class="spell-description">${spell.description}</div>
  `;
  el.classList.add('visible');

  if (spellTextTimeout) {
    window.clearTimeout(spellTextTimeout);
  }

  spellTextTimeout = window.setTimeout(() => {
    el.classList.remove('visible');
  }, spell.duration);
}

function renderHistory(): void {
  const list = document.getElementById('historyList') as HTMLDivElement;
  const records = state.getState().spellRecords;

  if (records.length === 0) {
    list.innerHTML = '<div class="empty-history">暂无施法记录</div>';
    return;
  }

  list.innerHTML = '';
  records.forEach((record, index) => {
    const item = createHistoryItem(record, index === 0);
    list.appendChild(item);
  });
}

function createHistoryItem(record: SpellRecord, isLatest: boolean): HTMLDivElement {
  const item = document.createElement('div');
  item.className = 'history-item' + (isLatest ? ' latest' : '');

  const runesRow = document.createElement('div');
  runesRow.className = 'history-runes';
  record.runes.forEach(runeType => {
    const dot = document.createElement('div');
    dot.className = 'history-rune-dot';
    dot.style.backgroundColor = RUNES[runeType].color;
    runesRow.appendChild(dot);
  });

  const name = document.createElement('div');
  name.className = 'history-name';
  name.textContent = record.spellName;

  const time = document.createElement('div');
  time.className = 'history-time';
  time.textContent = formatTime(record.timestamp);

  item.appendChild(runesRow);
  item.appendChild(name);
  item.appendChild(time);

  return item;
}

function formatTime(timestamp: number): string {
  const date = new Date(timestamp);
  const hh = String(date.getHours()).padStart(2, '0');
  const mm = String(date.getMinutes()).padStart(2, '0');
  const ss = String(date.getSeconds()).padStart(2, '0');
  return `${hh}:${mm}:${ss}`;
}

document.addEventListener('DOMContentLoaded', init);
