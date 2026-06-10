import _ from 'lodash';
import {
  CoffeeRecord,
  Origin,
  ORIGIN_COLORS,
  ORIGIN_LIST,
  FLAVOR_LABELS,
  getScoreColor,
  getTastingStatus,
  getDaysSinceRoast,
  getBrewTip,
  generateMockData,
  flavorsToArray
} from './data';
import { initRadar, updateRadar } from './radar';

let records: CoffeeRecord[] = generateMockData();
let selectedId: string | null = records[0]?.id ?? null;
let activeOrigin: Origin | null = null;
let sortBy: 'score-desc' | 'score-asc' | 'date-desc' | 'date-asc' = 'score-desc';

const app = document.getElementById('app')!;

function render(): void {
  app.innerHTML = '';
  app.appendChild(renderHeader());
  app.appendChild(renderMain());
  const canvas = document.getElementById('radar-canvas') as HTMLCanvasElement;
  if (canvas) {
    initRadar(canvas);
    const selected = records.find((r) => r.id === selectedId);
    if (selected) {
      updateRadar(canvas, flavorsToArray(selected.flavors));
    }
  }
  bindGlobalEvents();
}

function renderHeader(): HTMLElement {
  const header = document.createElement('header');
  header.className = 'header';

  const left = document.createElement('div');
  left.className = 'header-left';

  const svgNS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(svgNS, 'svg');
  svg.setAttribute('width', '32');
  svg.setAttribute('height', '32');
  svg.setAttribute('viewBox', '0 0 64 64');
  svg.setAttribute('fill', '#e9c46a');

  const path1 = document.createElementNS(svgNS, 'path');
  path1.setAttribute(
    'd',
    'M32 8C22 8 14 16 14 26c0 8 4 14 10 18 0 0-2 4-6 6 0 0 8 4 14 4s14-4 14-4c-4-2-6-6-6-6 6-4 10-10 10-18C50 16 42 8 32 8zm0 6c6 0 10 4 10 10s-4 10-10 10-10-4-10-10 4-10 10-10z'
  );
  svg.appendChild(path1);

  const path2 = document.createElementNS(svgNS, 'path');
  path2.setAttribute('d', 'M34 4c0-2-2-4-2-4s-2 2-2 4v4h4V4z');
  svg.appendChild(path2);

  left.appendChild(svg);

  const title = document.createElement('span');
  title.className = 'header-title';
  title.textContent = '风味雷达 · Flavor Radar';
  left.appendChild(title);

  const exportBtn = document.createElement('button');
  exportBtn.className = 'export-btn';
  exportBtn.textContent = '导出数据为JSON';
  exportBtn.id = 'export-btn';

  header.appendChild(left);
  header.appendChild(exportBtn);

  return header;
}

function renderMain(): HTMLElement {
  const main = document.createElement('div');
  main.className = 'main-container';
  main.appendChild(renderSidebar());
  main.appendChild(renderRightPanel());
  return main;
}

function renderSidebar(): HTMLElement {
  const sidebar = document.createElement('aside');
  sidebar.className = 'sidebar';

  const filterSection = document.createElement('div');
  filterSection.className = 'filter-section';

  const tags = document.createElement('div');
  tags.className = 'origin-tags';
  ORIGIN_LIST.forEach((origin) => {
    const btn = document.createElement('button');
    btn.className = 'origin-tag' + (activeOrigin === origin ? ' active' : '');
    btn.style.backgroundColor = ORIGIN_COLORS[origin];
    btn.textContent = origin;
    btn.dataset.origin = origin;
    if (activeOrigin === origin) {
      btn.classList.add('active');
    }
    tags.appendChild(btn);
  });

  const allTag = document.createElement('button');
  allTag.className = 'origin-tag' + (activeOrigin === null ? ' active' : '');
  allTag.style.backgroundColor = '#4a4e69';
  allTag.textContent = '全部';
  allTag.dataset.origin = '__all__';
  if (activeOrigin === null) {
    allTag.classList.add('active');
  }
  tags.insertBefore(allTag, tags.firstChild);

  filterSection.appendChild(tags);

  const sortSelect = document.createElement('select');
  sortSelect.className = 'sort-select';
  sortSelect.id = 'sort-select';
  const sortOptions: Array<{ value: string; label: string }> = [
    { value: 'score-desc', label: '综合评分 高→低' },
    { value: 'score-asc', label: '综合评分 低→高' },
    { value: 'date-desc', label: '烘焙日期 最近→最远' },
    { value: 'date-asc', label: '烘焙日期 最远→最近' }
  ];
  sortOptions.forEach((opt) => {
    const o = document.createElement('option');
    o.value = opt.value;
    o.textContent = opt.label;
    if (opt.value === sortBy) o.selected = true;
    sortSelect.appendChild(o);
  });
  filterSection.appendChild(sortSelect);

  sidebar.appendChild(filterSection);

  const list = document.createElement('div');
  list.className = 'record-list fade-in';
  list.id = 'record-list';

  const filtered = getFilteredSortedRecords();
  if (filtered.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'empty-state';
    empty.textContent = '暂无记录';
    list.appendChild(empty);
  } else {
    filtered.forEach((record) => {
      const item = document.createElement('div');
      item.className = 'record-item' + (record.id === selectedId ? ' active' : '');
      item.dataset.id = record.id;

      const name = document.createElement('div');
      name.className = 'record-name';
      name.textContent = record.name;

      const meta = document.createElement('div');
      meta.className = 'record-meta';

      const date = document.createElement('span');
      date.textContent = record.roastDate;

      const score = document.createElement('span');
      score.className = 'record-score';
      score.style.color = getScoreColor(record.overallScore);
      score.textContent = record.overallScore.toFixed(1) + ' 分';

      meta.appendChild(date);
      meta.appendChild(score);

      item.appendChild(name);
      item.appendChild(meta);
      list.appendChild(item);
    });
  }

  sidebar.appendChild(list);
  return sidebar;
}

function renderRightPanel(): HTMLElement {
  const panel = document.createElement('div');
  panel.className = 'right-panel';

  const radarSection = document.createElement('div');
  radarSection.className = 'radar-section';

  const addWrapper = document.createElement('div');
  addWrapper.className = 'add-btn-wrapper';
  const addBtn = document.createElement('button');
  addBtn.className = 'add-btn';
  addBtn.id = 'add-btn';
  addBtn.textContent = '＋ 添加记录';
  addWrapper.appendChild(addBtn);

  const canvasWrapper = document.createElement('div');
  canvasWrapper.className = 'radar-canvas-wrapper';
  const canvas = document.createElement('canvas');
  canvas.id = 'radar-canvas';
  canvasWrapper.appendChild(canvas);

  radarSection.appendChild(addWrapper);
  radarSection.appendChild(canvasWrapper);

  const selected = records.find((r) => r.id === selectedId);
  const brewCard = renderBrewCard(selected);

  panel.appendChild(radarSection);
  panel.appendChild(brewCard);

  return panel;
}

function renderBrewCard(record: CoffeeRecord | undefined): HTMLElement {
  const card = document.createElement('div');
  card.className = 'brew-card';
  card.id = 'brew-card';

  const title = document.createElement('div');
  title.className = 'brew-card-title';
  title.textContent = record ? `${record.name} · 冲煮方案` : '冲煮方案';
  card.appendChild(title);

  if (!record) {
    const empty = document.createElement('div');
    empty.className = 'empty-state';
    empty.textContent = '选择一条记录查看冲煮方案';
    card.appendChild(empty);
    return card;
  }

  const info = document.createElement('div');
  info.className = 'brew-info';

  const tempItem = document.createElement('div');
  tempItem.className = 'brew-info-item';
  const tempLabel = document.createElement('span');
  tempLabel.className = 'brew-label';
  tempLabel.textContent = '冲煮水温';
  const tempValue = document.createElement('span');
  tempValue.className = 'brew-value';
  tempValue.textContent = `${record.brewTemp} °C`;
  tempItem.appendChild(tempLabel);
  tempItem.appendChild(tempValue);

  const ratioItem = document.createElement('div');
  ratioItem.className = 'brew-info-item';
  const ratioLabel = document.createElement('span');
  ratioLabel.className = 'brew-label';
  ratioLabel.textContent = '粉水比';
  const ratioValue = document.createElement('span');
  ratioValue.className = 'brew-value';
  ratioValue.textContent = record.ratio;
  ratioItem.appendChild(ratioLabel);
  ratioItem.appendChild(ratioValue);

  const statusItem = document.createElement('div');
  statusItem.className = 'brew-info-item';
  const statusLabel = document.createElement('span');
  statusLabel.className = 'brew-label';
  statusLabel.textContent = '赏味期状态';
  const statusValue = document.createElement('span');
  const days = getDaysSinceRoast(record.roastDate);
  const status = getTastingStatus(days);
  statusValue.className = 'status-badge';
  statusValue.style.backgroundColor = status.bgColor;
  statusValue.textContent = `${status.label}（${days}天）`;
  statusItem.appendChild(statusLabel);
  statusItem.appendChild(statusValue);

  info.appendChild(tempItem);
  info.appendChild(ratioItem);
  info.appendChild(statusItem);
  card.appendChild(info);

  const tip = document.createElement('div');
  tip.className = 'brew-tip';
  tip.innerHTML = `<strong>冲煮小贴士：</strong>${getBrewTip(record.flavors)}`;
  card.appendChild(tip);

  if (record.notes) {
    const notes = document.createElement('div');
    notes.className = 'brew-tip';
    notes.style.marginTop = '12px';
    notes.innerHTML = `<strong>杯测备注：</strong>${record.notes}`;
    card.appendChild(notes);
  }

  return card;
}

function getFilteredSortedRecords(): CoffeeRecord[] {
  let result = [...records];
  if (activeOrigin) {
    result = result.filter((r) => r.origin === activeOrigin);
  }
  result = _.orderBy(
    result,
    [
      (r) => (sortBy.startsWith('date') ? new Date(r.roastDate).getTime() : r.overallScore)
    ],
    [sortBy.endsWith('asc') ? 'asc' : 'desc']
  );
  return result;
}

function refreshListAndBrew(): void {
  const filtered = getFilteredSortedRecords();
  if (selectedId && !filtered.some((r) => r.id === selectedId)) {
    selectedId = filtered[0]?.id ?? null;
  }

  const oldList = document.getElementById('record-list');
  const parent = oldList?.parentElement;
  if (oldList && parent) {
    const newList = renderSidebar().querySelector('#record-list')!;
    parent.replaceChild(newList, oldList);
    bindListEvents();
  }

  const oldCard = document.getElementById('brew-card');
  const cardParent = oldCard?.parentElement;
  if (oldCard && cardParent) {
    const selected = records.find((r) => r.id === selectedId);
    const newCard = renderBrewCard(selected);
    cardParent.replaceChild(newCard, oldCard);
  }

  const canvas = document.getElementById('radar-canvas') as HTMLCanvasElement;
  const selected = records.find((r) => r.id === selectedId);
  if (canvas && selected) {
    updateRadar(canvas, flavorsToArray(selected.flavors));
  }
}

function bindGlobalEvents(): void {
  document.getElementById('export-btn')?.addEventListener('click', handleExport);
  document.getElementById('add-btn')?.addEventListener('click', openModal);
  document.getElementById('sort-select')?.addEventListener('change', handleSortChange);

  document.querySelectorAll('.origin-tag').forEach((tag) => {
    tag.addEventListener('click', (e) => {
      const origin = (e.currentTarget as HTMLElement).dataset.origin;
      if (origin === '__all__') {
        activeOrigin = null;
      } else {
        activeOrigin = origin as Origin;
      }
      refreshListAndBrew();
      document.querySelectorAll('.origin-tag').forEach((t) => t.classList.remove('active'));
      (e.currentTarget as HTMLElement).classList.add('active');
    });
  });

  bindListEvents();
  bindModalBackdrop();
}

function bindListEvents(): void {
  document.querySelectorAll('.record-item').forEach((item) => {
    item.addEventListener('click', () => {
      const id = (item as HTMLElement).dataset.id;
      if (id) {
        selectedId = id;
        document.querySelectorAll('.record-item').forEach((i) => i.classList.remove('active'));
        item.classList.add('active');

        const record = records.find((r) => r.id === id);
        const canvas = document.getElementById('radar-canvas') as HTMLCanvasElement;
        if (record && canvas) {
          updateRadar(canvas, flavorsToArray(record.flavors));
        }

        const oldCard = document.getElementById('brew-card');
        if (oldCard && oldCard.parentElement) {
          const newCard = renderBrewCard(record);
          oldCard.parentElement.replaceChild(newCard, oldCard);
        }
      }
    });
  });
}

function bindModalBackdrop(): void {
  const overlay = document.getElementById('modal-overlay');
  if (overlay) {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closeModal();
    });
  }
}

function handleSortChange(e: Event): void {
  sortBy = (e.target as HTMLSelectElement).value as typeof sortBy;
  refreshListAndBrew();
}

function handleExport(): void {
  const json = JSON.stringify(records, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `coffee-records-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function openModal(): void {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.id = 'modal-overlay';

  const modal = document.createElement('div');
  modal.className = 'modal';

  const title = document.createElement('div');
  title.className = 'modal-title';
  title.textContent = '添加咖啡记录';
  modal.appendChild(title);

  const form = buildForm();
  modal.appendChild(form);

  overlay.appendChild(modal);
  document.body.appendChild(overlay);

  requestAnimationFrame(() => overlay.classList.add('visible'));

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeModal();
  });
}

function closeModal(): void {
  const overlay = document.getElementById('modal-overlay');
  if (!overlay) return;
  overlay.classList.remove('visible');
  setTimeout(() => overlay.remove(), 250);
}

interface FormState {
  name: string;
  origin: Origin;
  roastDate: string;
  brewTemp: number;
  ratio: string;
  acidity: number;
  bitterness: number;
  sweetness: number;
  body: number;
  aftertaste: number;
  notes: string;
}

function buildForm(): HTMLElement {
  const frag = document.createDocumentFragment();
  const today = new Date().toISOString().slice(0, 10);

  const state: FormState = {
    name: '',
    origin: '埃塞俄比亚',
    roastDate: today,
    brewTemp: 92,
    ratio: '1:15',
    acidity: 5,
    bitterness: 5,
    sweetness: 5,
    body: 5,
    aftertaste: 5,
    notes: ''
  };

  const fields: Array<{ key: keyof FormState; label: string; type: string }> = [
    { key: 'name', label: '豆子名称', type: 'text' },
    { key: 'roastDate', label: '烘焙日期', type: 'date' },
    { key: 'ratio', label: '粉水比（如 1:15）', type: 'text' }
  ];

  fields.forEach(({ key, label, type }) => {
    const group = document.createElement('div');
    group.className = 'form-group';
    const lab = document.createElement('label');
    lab.className = 'form-label';
    lab.textContent = label;
    const input = document.createElement('input');
    input.className = 'form-input';
    input.type = type;
    input.value = String(state[key]);
    input.addEventListener('input', (e) => {
      (state as Record<string, unknown>)[key] = (e.target as HTMLInputElement).value;
    });
    group.appendChild(lab);
    group.appendChild(input);
    frag.appendChild(group);
  });

  const originGroup = document.createElement('div');
  originGroup.className = 'form-group';
  const originLab = document.createElement('label');
  originLab.className = 'form-label';
  originLab.textContent = '产地';
  const originSelect = document.createElement('select');
  originSelect.className = 'form-select';
  ORIGIN_LIST.forEach((o) => {
    const opt = document.createElement('option');
    opt.value = o;
    opt.textContent = o;
    if (o === state.origin) opt.selected = true;
    originSelect.appendChild(opt);
  });
  originSelect.addEventListener('change', (e) => {
    state.origin = (e.target as HTMLSelectElement).value as Origin;
  });
  originGroup.appendChild(originLab);
  originGroup.appendChild(originSelect);
  frag.appendChild(originGroup);

  frag.appendChild(buildSliderGroup('冲煮水温', 'brewTemp', 85, 96, 1, '°C', state));

  const flavorSection = document.createElement('div');
  flavorSection.className = 'form-group';
  const flavorLab = document.createElement('label');
  flavorLab.className = 'form-label';
  flavorLab.textContent = '风味评分';
  flavorSection.appendChild(flavorLab);

  const flavorGrid = document.createElement('div');
  flavorGrid.className = 'flavor-sliders';
  const flavorKeys: Array<{ key: 'acidity' | 'bitterness' | 'sweetness' | 'body' | 'aftertaste'; label: string }> = [
    { key: 'acidity', label: '酸度' },
    { key: 'bitterness', label: '苦度' },
    { key: 'sweetness', label: '甜度' },
    { key: 'body', label: '醇厚度' },
    { key: 'aftertaste', label: '余韵' }
  ];
  flavorKeys.forEach(({ key, label }) => {
    flavorGrid.appendChild(buildSlider(label, key, 0, 10, 0.5, '', state));
  });
  flavorSection.appendChild(flavorGrid);
  frag.appendChild(flavorSection);

  const notesGroup = document.createElement('div');
  notesGroup.className = 'form-group';
  const notesLab = document.createElement('label');
  notesLab.className = 'form-label';
  notesLab.textContent = '综合备注';
  const notesTa = document.createElement('textarea');
  notesTa.className = 'form-textarea';
  notesTa.placeholder = '记录杯测感受、风味描述等';
  notesTa.addEventListener('input', (e) => {
    state.notes = (e.target as HTMLTextAreaElement).value;
  });
  notesGroup.appendChild(notesLab);
  notesGroup.appendChild(notesTa);
  frag.appendChild(notesGroup);

  const actions = document.createElement('div');
  actions.className = 'modal-actions';
  const cancelBtn = document.createElement('button');
  cancelBtn.className = 'btn-cancel';
  cancelBtn.textContent = '取消';
  cancelBtn.addEventListener('click', closeModal);
  const saveBtn = document.createElement('button');
  saveBtn.className = 'btn-save';
  saveBtn.textContent = '保存';
  saveBtn.addEventListener('click', () => handleSave(state));
  actions.appendChild(cancelBtn);
  actions.appendChild(saveBtn);
  frag.appendChild(actions);

  const container = document.createElement('div');
  container.appendChild(frag);
  return container;
}

function buildSliderGroup(label: string, key: keyof FormState, min: number, max: number, step: number, unit: string, state: FormState): HTMLElement {
  const group = document.createElement('div');
  group.className = 'form-group';
  const lab = document.createElement('label');
  lab.className = 'form-label';
  lab.textContent = label;
  group.appendChild(lab);
  group.appendChild(buildSlider('', key, min, max, step, unit, state));
  return group;
}

function buildSlider<K extends keyof FormState>(
  label: string,
  key: K,
  min: number,
  max: number,
  step: number,
  unit: string,
  state: FormState
): HTMLElement {
  const wrap = document.createElement('div');
  if (label) {
    const lab = document.createElement('label');
    lab.className = 'form-label';
    lab.textContent = label;
    wrap.appendChild(lab);
  }
  const row = document.createElement('div');
  row.className = 'slider-row';
  const slider = document.createElement('input');
  slider.type = 'range';
  slider.className = 'slider';
  slider.min = String(min);
  slider.max = String(max);
  slider.step = String(step);
  slider.value = String(state[key]);
  const valueEl = document.createElement('span');
  valueEl.className = 'slider-value';
  valueEl.textContent = `${state[key]}${unit}`;
  slider.addEventListener('input', (e) => {
    const v = parseFloat((e.target as HTMLInputElement).value);
    (state as Record<string, unknown>)[key] = v;
    valueEl.textContent = `${v}${unit}`;
  });
  row.appendChild(slider);
  row.appendChild(valueEl);
  wrap.appendChild(row);
  return wrap;
}

function handleSave(state: FormState): void {
  if (!state.name.trim()) {
    alert('请填写豆子名称');
    return;
  }
  const flavors = {
    acidity: state.acidity,
    bitterness: state.bitterness,
    sweetness: state.sweetness,
    body: state.body,
    aftertaste: state.aftertaste
  };
  const overallScore =
    Math.round(
      ((flavors.acidity + flavors.bitterness + flavors.sweetness + flavors.body + flavors.aftertaste) / 5) * 10
    ) / 10;

  const newRecord: CoffeeRecord = {
    id: String(Date.now()),
    name: state.name.trim(),
    origin: state.origin,
    roastDate: state.roastDate,
    brewTemp: state.brewTemp,
    ratio: state.ratio || '1:15',
    flavors,
    overallScore,
    notes: state.notes.trim()
  };

  records = [newRecord, ...records];
  selectedId = newRecord.id;
  closeModal();
  render();
}

render();
