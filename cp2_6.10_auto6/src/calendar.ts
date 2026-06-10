import {
  TodoItem,
  Quadrant,
  Priority,
  $,
  el,
  bus,
  formatDate,
  getMonthMatrix,
  priorityLabel,
  isToday,
  isOverdue
} from './utils';
import { board } from './board';

type CalendarDirection = 'prev' | 'next' | 'none';

class CalendarModule {
  private year: number;
  private month: number;
  private dragId: string | null = null;
  private animating = false;

  constructor() {
    const now = new Date();
    this.year = now.getFullYear();
    this.month = now.getMonth();
  }

  init(): void {
    this.bindEvents();
    this.render();
    bus.on('items:changed', () => this.render());
  }

  setMonth(year: number, month: number): void {
    this.year = year;
    this.month = month;
    this.render();
  }

  private bindEvents(): void {
    $('#prevMonth')!.addEventListener('click', () => this.shiftMonth(-1));
    $('#nextMonth')!.addEventListener('click', () => this.shiftMonth(1));
    $('#todayBtn')!.addEventListener('click', () => {
      const now = new Date();
      this.year = now.getFullYear();
      this.month = now.getMonth();
      this.render('none');
    });
  }

  private shiftMonth(delta: number): void {
    if (this.animating) return;
    const direction: CalendarDirection = delta > 0 ? 'next' : 'prev';
    const d = new Date(this.year, this.month + delta, 1);
    this.year = d.getFullYear();
    this.month = d.getMonth();
    this.render(direction);
  }

  addItemForDate(dateStr: string): void {
    const defaultQuadrant: Quadrant = 'Q2';
    const defaultPriority: Priority = 'medium';
    const title = prompt('输入任务标题：');
    if (!title || !title.trim()) return;
    board.addItem({
      title: title.trim(),
      quadrant: defaultQuadrant,
      priority: defaultPriority,
      dueDate: dateStr,
      description: ''
    });
  }

  moveItemToDate(itemId: string, dateStr: string): void {
    board.updateItem(itemId, { dueDate: dateStr });
  }

  render(direction: CalendarDirection = 'none'): void {
    const title = $('#calTitle')!;
    title.textContent = `${this.year}年${this.month + 1}月`;

    const grid = $('#calendarGrid')!;
    const items = board.getItems();
    const matrix = getMonthMatrix(this.year, this.month);
    const frag = document.createDocumentFragment();

    matrix.forEach((week) => {
      week.forEach((date) => {
        const cell = this.renderDateCell(date, items);
        if (cell) frag.appendChild(cell);
      });
    });

    if (direction !== 'none' && !this.animating) {
      this.animating = true;
      grid.classList.add(direction === 'next' ? 'slide-out-left' : 'slide-out-right');
      setTimeout(() => {
        grid.innerHTML = '';
        grid.appendChild(frag);
        grid.classList.remove('slide-out-left', 'slide-out-right');
        grid.classList.add(direction === 'next' ? 'slide-in-right' : 'slide-in-left');
        setTimeout(() => {
          grid.classList.remove('slide-in-right', 'slide-in-left');
          this.animating = false;
        }, 400);
      }, 200);
    } else {
      grid.innerHTML = '';
      grid.appendChild(frag);
    }
  }

  private renderDateCell(date: Date | null, items: TodoItem[]): HTMLElement | null {
    if (!date) {
      return el('div', { class: 'cal-cell cal-cell-empty' });
    }
    const dateStr = formatDate(date, 'YYYY-MM-DD');
    const dayItems = items.filter((i) => i.dueDate === dateStr);
    const isCurMonth = date.getMonth() === this.month;
    const today = isToday(dateStr);

    const cell = el('div', {
      class: `cal-cell${!isCurMonth ? ' cal-cell-other' : ''}${today ? ' cal-cell-today' : ''}`,
      'data-date': dateStr
    });

    const header = el('div', { class: 'cal-cell-header' });
    header.appendChild(el('span', { class: 'cal-cell-number' }, String(date.getDate())));
    const addBtn = el('button', { class: 'cal-cell-add', title: '添加任务', 'aria-label': '添加任务' });
    addBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>';
    addBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.addItemForDate(dateStr);
    });
    header.appendChild(addBtn);
    cell.appendChild(header);

    const list = el('div', { class: 'cal-cell-items' });
    dayItems.slice(0, 3).forEach((item) => list.appendChild(this.renderCalItem(item)));
    if (dayItems.length > 3) {
      list.appendChild(el('div', { class: 'cal-cell-more' }, `+${dayItems.length - 3} 更多`));
    }
    cell.appendChild(list);

    cell.addEventListener('click', (e) => {
      if ((e.target as HTMLElement).closest('.cal-cell-add') || (e.target as HTMLElement).closest('.cal-event')) return;
      this.addItemForDate(dateStr);
    });

    cell.addEventListener('dragover', (e) => {
      if (!this.dragId) return;
      e.preventDefault();
      e.dataTransfer!.dropEffect = 'move';
      cell.classList.add('drag-over');
    });
    cell.addEventListener('dragleave', () => cell.classList.remove('drag-over'));
    cell.addEventListener('drop', (e) => {
      e.preventDefault();
      cell.classList.remove('drag-over');
      const id = e.dataTransfer!.getData('text/plain');
      if (id) this.moveItemToDate(id, dateStr);
    });

    return cell;
  }

  private renderCalItem(item: TodoItem): HTMLElement {
    const evt = el('div', {
      class: `cal-event priority-${item.priority}${item.completed ? ' completed' : ''}${isOverdue(item.dueDate) && !item.completed ? ' overdue' : ''}`,
      draggable: 'true',
      title: item.title,
      'data-id': item.id
    });
    evt.addEventListener('dragstart', (e) => {
      this.dragId = item.id;
      e.dataTransfer!.setData('text/plain', item.id);
      e.dataTransfer!.effectAllowed = 'move';
    });
    evt.addEventListener('dragend', () => { this.dragId = null; });
    evt.addEventListener('click', (e) => {
      e.stopPropagation();
    });
    const dot = el('span', { class: `cal-event-dot ${item.priority}` });
    const text = el('span', { class: 'cal-event-title' }, item.title.length > 14 ? item.title.slice(0, 14) + '…' : item.title);
    const badge = el('span', { class: 'cal-event-badge' }, priorityLabel(item.priority));
    evt.appendChild(dot);
    evt.appendChild(text);
    evt.appendChild(badge);
    return evt;
  }
}

export const calendar = new CalendarModule();
