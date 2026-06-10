import {
  TodoItem,
  Quadrant,
  Priority,
  storage,
  debouncedStorage,
  uid,
  $,
  $$,
  el,
  bus,
  priorityLabel,
  formatDate,
  isToday,
  isOverdue,
  formatRelative
} from './utils';

const STORAGE_KEY = 'board_items';
const COMPLETION_LOG_KEY = 'completion_log';

class BoardModule {
  private items: TodoItem[] = [];
  private dragId: string | null = null;
  private editingId: string | null = null;
  private rafPending = false;

  init(): void {
    this.items = storage<TodoItem[]>(STORAGE_KEY) || this.getDefaultItems();
    this.bindEvents();
    this.render();
  }

  private getDefaultItems(): TodoItem[] {
    const now = Date.now();
    const today = formatDate(new Date(), 'YYYY-MM-DD');
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = formatDate(tomorrow, 'YYYY-MM-DD');
    return [
      {
        id: uid(),
        title: '完成项目原型设计',
        description: '梳理核心功能并输出交互原型',
        quadrant: 'Q1',
        priority: 'high',
        dueDate: today,
        completed: false,
        createdAt: now - 3600000,
        updatedAt: now - 3600000
      },
      {
        id: uid(),
        title: '阅读技术文档',
        description: '学习 TypeScript 高级特性',
        quadrant: 'Q2',
        priority: 'medium',
        dueDate: tomorrowStr,
        completed: false,
        createdAt: now - 7200000,
        updatedAt: now - 7200000
      },
      {
        id: uid(),
        title: '回复客户邮件',
        description: '',
        quadrant: 'Q3',
        priority: 'low',
        dueDate: today,
        completed: false,
        createdAt: now - 1800000,
        updatedAt: now - 1800000
      }
    ];
  }

  getItems(): TodoItem[] {
    return [...this.items];
  }

  addItem(data: Partial<TodoItem> & { title: string; quadrant: Quadrant }): TodoItem {
    const now = Date.now();
    const item: TodoItem = {
      id: uid(),
      title: data.title,
      description: data.description || '',
      quadrant: data.quadrant,
      priority: data.priority || 'medium',
      dueDate: data.dueDate || '',
      completed: false,
      createdAt: now,
      updatedAt: now
    };
    this.items.push(item);
    this.persist();
    this.render();
    bus.emit('items:changed', this.getItems());
    return item;
  }

  updateItem(id: string, patch: Partial<TodoItem>): TodoItem | null {
    const idx = this.items.findIndex((i) => i.id === id);
    if (idx === -1) return null;
    const wasCompleted = this.items[idx].completed;
    this.items[idx] = { ...this.items[idx], ...patch, updatedAt: Date.now() };
    if (patch.completed !== undefined && patch.completed !== wasCompleted) {
      this.updateCompletionLog(this.items[idx]);
      bus.emit('item:completed', { id, completed: patch.completed });
    }
    this.persist();
    this.render();
    bus.emit('items:changed', this.getItems());
    return this.items[idx];
  }

  moveItem(id: string, quadrant: Quadrant): void {
    const item = this.items.find((i) => i.id === id);
    if (!item || item.quadrant === quadrant) return;
    item.quadrant = quadrant;
    item.updatedAt = Date.now();
    this.persist();
    this.render();
    bus.emit('items:changed', this.getItems());
  }

  deleteItem(id: string): void {
    const before = this.items.length;
    this.items = this.items.filter((i) => i.id !== id);
    if (this.items.length === before) return;
    this.persist();
    this.render();
    bus.emit('items:changed', this.getItems());
  }

  private updateCompletionLog(item: TodoItem): void {
    const log = storage<Record<string, number>>(COMPLETION_LOG_KEY) || {};
    const today = formatDate(new Date(), 'YYYY-MM-DD');
    if (item.completed) {
      log[today] = (log[today] || 0) + 1;
    } else {
      log[today] = Math.max(0, (log[today] || 0) - 1);
    }
    storage(COMPLETION_LOG_KEY, log);
  }

  private persist(): void {
    debouncedStorage(STORAGE_KEY, this.items, 150);
  }

  private bindEvents(): void {
    $$<HTMLButtonElement>('.add-item-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const q = btn.dataset.quadrant as Quadrant;
        this.openModal(q);
      });
    });

    const backdrop = $('#modalBackdrop')!;
    $('#modalClose')!.addEventListener('click', () => this.closeModal());
    $('#modalCancel')!.addEventListener('click', () => this.closeModal());
    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop) this.closeModal();
    });
    $('#modalSave')!.addEventListener('click', () => this.saveFromModal());

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !backdrop.hasAttribute('hidden')) this.closeModal();
    });
  }

  openModal(quadrant: Quadrant, itemId?: string): void {
    this.editingId = itemId || null;
    const modal = $('#modalBackdrop')!;
    const titleInput = $('#taskTitleInput') as HTMLInputElement;
    const descInput = $('#taskDescInput') as HTMLTextAreaElement;
    const prioritySel = $('#taskPriority') as HTMLSelectElement;
    const quadrantSel = $('#taskQuadrant') as HTMLSelectElement;
    const dueInput = $('#taskDueDate') as HTMLInputElement;
    const modalTitle = $('#modalTitle')!;

    if (itemId) {
      const item = this.items.find((i) => i.id === itemId);
      if (item) {
        modalTitle.textContent = '编辑任务';
        titleInput.value = item.title;
        descInput.value = item.description;
        prioritySel.value = item.priority;
        quadrantSel.value = item.quadrant;
        dueInput.value = item.dueDate;
      }
    } else {
      modalTitle.textContent = '新建任务';
      titleInput.value = '';
      descInput.value = '';
      prioritySel.value = 'medium';
      quadrantSel.value = quadrant;
      dueInput.value = formatDate(new Date(), 'YYYY-MM-DD');
    }
    modal.removeAttribute('hidden');
    requestAnimationFrame(() => {
      modal.classList.add('visible');
      titleInput.focus();
    });
  }

  private closeModal(): void {
    const modal = $('#modalBackdrop')!;
    modal.classList.remove('visible');
    setTimeout(() => modal.setAttribute('hidden', ''), 200);
    this.editingId = null;
  }

  private saveFromModal(): void {
    const titleInput = $('#taskTitleInput') as HTMLInputElement;
    const title = titleInput.value.trim();
    if (!title) {
      titleInput.classList.add('input-error');
      setTimeout(() => titleInput.classList.remove('input-error'), 800);
      return;
    }
    const desc = ($('#taskDescInput') as HTMLTextAreaElement).value.trim();
    const priority = ($('#taskPriority') as HTMLSelectElement).value as Priority;
    const quadrant = ($('#taskQuadrant') as HTMLSelectElement).value as Quadrant;
    const dueDate = ($('#taskDueDate') as HTMLInputElement).value;

    if (this.editingId) {
      this.updateItem(this.editingId, { title, description: desc, priority, quadrant, dueDate });
    } else {
      this.addItem({ title, description: desc, priority, quadrant, dueDate });
    }
    this.closeModal();
  }

  render(): void {
    if (this.rafPending) return;
    this.rafPending = true;
    requestAnimationFrame(() => {
      this.rafPending = false;
      this.doRender();
    });
  }

  private doRender(): void {
    const quadrants: Quadrant[] = ['Q1', 'Q2', 'Q3', 'Q4'];
    quadrants.forEach((q) => {
      const container = $(`.quadrant-items[data-quadrant="${q}"]`)!;
      const countEl = $(`#count${q.toUpperCase()}`)!;
      const list = this.items.filter((i) => i.quadrant === q);
      countEl.textContent = String(list.length);
      const frag = document.createDocumentFragment();
      list
        .sort((a, b) => Number(b.updatedAt) - Number(a.updatedAt))
        .forEach((item) => frag.appendChild(this.renderItem(item)));
      container.innerHTML = '';
      container.appendChild(frag);
      this.bindQuadrantDrop(container, q);
    });
  }

  private bindQuadrantDrop(container: HTMLElement, quadrant: Quadrant): void {
    container.ondragover = (e) => {
      e.preventDefault();
      e.dataTransfer!.dropEffect = 'move';
      container.classList.add('drag-over');
    };
    container.ondragleave = () => container.classList.remove('drag-over');
    container.ondrop = (e) => {
      e.preventDefault();
      container.classList.remove('drag-over');
      const id = e.dataTransfer!.getData('text/plain');
      if (id) this.moveItem(id, quadrant);
    };
  }

  private renderItem(item: TodoItem): HTMLElement {
    const card = el('div', {
      class: `task-card priority-${item.priority}${item.completed ? ' completed' : ''}`,
      draggable: 'true',
      'data-id': item.id
    });

    card.addEventListener('dragstart', (e) => {
      this.dragId = item.id;
      card.classList.add('dragging');
      e.dataTransfer!.setData('text/plain', item.id);
      e.dataTransfer!.effectAllowed = 'move';
    });
    card.addEventListener('dragend', () => {
      this.dragId = null;
      card.classList.remove('dragging');
    });

    const checkWrap = el('div', { class: 'task-check' });
    const check = el('input', { type: 'checkbox', class: 'task-checkbox' }) as HTMLInputElement;
    check.checked = item.completed;
    check.addEventListener('change', () => this.updateItem(item.id, { completed: check.checked }));
    checkWrap.appendChild(check);

    const body = el('div', { class: 'task-body' });
    const titleEl = el('div', { class: 'task-title' }, item.title);
    titleEl.addEventListener('click', () => this.openModal(item.quadrant, item.id));
    body.appendChild(titleEl);

    if (item.description) {
      body.appendChild(el('div', { class: 'task-desc' }, item.description));
    }

    const meta = el('div', { class: 'task-meta' });
    const badge = el('span', { class: `priority-badge ${item.priority}` }, priorityLabel(item.priority) + '优先');
    meta.appendChild(badge);
    if (item.dueDate) {
      let dueClass = 'task-due';
      if (item.completed) dueClass += ' task-due-ok';
      else if (isOverdue(item.dueDate)) dueClass += ' task-due-overdue';
      else if (isToday(item.dueDate)) dueClass += ' task-due-today';
      const dueText = isToday(item.dueDate) ? '今天' : item.dueDate;
      meta.appendChild(el('span', { class: dueClass }, '📅 ' + dueText));
    }
    meta.appendChild(el('span', { class: 'task-time' }, formatRelative(item.updatedAt)));
    body.appendChild(meta);

    const actions = el('div', { class: 'task-actions' });
    const editBtn = el('button', { class: 'task-btn', title: '编辑', 'aria-label': '编辑' });
    editBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>';
    editBtn.addEventListener('click', () => this.openModal(item.quadrant, item.id));
    const delBtn = el('button', { class: 'task-btn', title: '删除', 'aria-label': '删除' });
    delBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-2 14a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/></svg>';
    delBtn.addEventListener('click', () => {
      if (confirm(`确认删除任务"${item.title}"？`)) this.deleteItem(item.id);
    });
    actions.appendChild(editBtn);
    actions.appendChild(delBtn);

    card.appendChild(checkWrap);
    card.appendChild(body);
    card.appendChild(actions);
    return card;
  }
}

export const board = new BoardModule();
