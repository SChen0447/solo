import './event-card';
import './timeline-component';
import type { TimelineEvent } from './event-card';
import type { TimelineComponent } from './timeline-component';

type ViewMode = 'timeline' | 'list';

const STORAGE_KEY = 'interactive_timeline_events';
const EMOJI_OPTIONS = [
  '📌', '⭐', '🎉', '🎯', '💡', '🔥', '🚀', '✨',
  '📚', '🎓', '💼', '🏆', '❤️', '🌈', '🌸', '🌱',
  '🎵', '🎨', '📷', '✈️', '🏠', '🎂', '🎊', '💪',
  '⚡', '🌟', '🎁', '📝', '🔧', '🎮', '🍀', '🦋'
];

const SAMPLE_EVENTS: TimelineEvent[] = [
  {
    id: 'sample-1',
    title: '项目启动',
    date: '2024-01-15',
    description: '开始了这个交互式时间轴项目的开发，希望能打造一个美观实用的事件记录工具。',
    emoji: '🚀'
  },
  {
    id: 'sample-2',
    title: '完成基础架构',
    date: '2024-03-20',
    description: '搭建好了基于 Web Components 和 TypeScript 的项目架构，使用 Vite 作为构建工具。',
    emoji: '🏗️'
  },
  {
    id: 'sample-3',
    title: 'Canvas 时间线实现',
    date: '2024-05-10',
    description: '成功实现了基于 Canvas 的时间线渲染，支持缩放、拖拽和平滑动画效果。',
    emoji: '🎨'
  },
  {
    id: 'sample-4',
    title: '数据持久化功能',
    date: '2024-07-22',
    description: '添加了 localStorage 数据存储功能，刷新页面后数据不会丢失。',
    emoji: '💾'
  },
  {
    id: 'sample-5',
    title: '响应式布局完成',
    date: '2024-09-05',
    description: '优化了移动端和桌面端的自适应布局，在各种设备上都能完美展示。',
    emoji: '📱'
  }
];

class App {
  private events: TimelineEvent[] = [];
  private viewMode: ViewMode = 'timeline';
  private currentYear: number = new Date().getFullYear();
  private app: HTMLElement;
  private modal: HTMLElement | null = null;
  private editingEvent: TimelineEvent | null = null;
  private selectedEmoji: string = EMOJI_OPTIONS[0];
  private dragOverId: string | null = null;

  constructor() {
    this.app = document.getElementById('app')!;
    this.init();
  }

  private init() {
    this.loadEvents();
    this.determineInitialYear();
    this.render();
  }

  private loadEvents() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        this.events = JSON.parse(stored);
      } else {
        this.events = [...SAMPLE_EVENTS];
        this.saveEvents();
      }
    } catch {
      this.events = [...SAMPLE_EVENTS];
    }
    this.sortEvents();
  }

  private saveEvents() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.events));
  }

  private sortEvents() {
    this.events.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }

  private determineInitialYear() {
    if (this.events.length > 0) {
      const dates = this.events.map(e => new Date(e.date).getFullYear());
      this.currentYear = Math.floor((Math.min(...dates) + Math.max(...dates)) / 2);
    }
  }

  private generateId(): string {
    return `event-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private render() {
    this.app.innerHTML = `
      <header class="app-header">
        <h1 class="app-title">⏳ 交互式时间轴</h1>
        <div class="header-controls">
          <div class="year-nav">
            <button class="btn btn-icon" id="prev-year" title="上一年">◀</button>
            <span class="year-label" id="year-label">${this.currentYear}</span>
            <button class="btn btn-icon" id="next-year" title="下一年">▶</button>
          </div>
          <div class="view-toggle">
            <button class="btn ${this.viewMode === 'timeline' ? 'active' : ''}" data-view="timeline">时间线</button>
            <button class="btn ${this.viewMode === 'list' ? 'active' : ''}" data-view="list">列表</button>
          </div>
          <button class="btn btn-primary" id="add-event">+ 添加事件</button>
        </div>
      </header>
      <main class="main-content" id="main-content">
        ${this.renderContent()}
      </main>
    `;

    this.bindGlobalEvents();
    this.renderChildComponents();
  }

  private renderContent(): string {
    if (this.events.length === 0) {
      return `
        <div class="empty-state">
          <div class="empty-state-icon">📭</div>
          <p class="empty-state-text">还没有任何事件，点击右上角的"添加事件"按钮开始记录吧！</p>
          <button class="btn btn-primary" id="add-event-empty">+ 创建第一个事件</button>
        </div>
      `;
    }

    if (this.viewMode === 'timeline') {
      return `<timeline-component class="timeline-view" id="timeline"></timeline-component>`;
    } else {
      return `
        <div class="list-view">
          <div class="list-grid" id="event-list">
            ${this.events.map(() => `<event-card></event-card>`).join('')}
          </div>
        </div>
      `;
    }
  }

  private renderChildComponents() {
    if (this.viewMode === 'timeline') {
      const timeline = document.getElementById('timeline') as TimelineComponent | null;
      if (timeline) {
        timeline.setEvents(this.events);
      }
    } else {
      const cards = document.querySelectorAll('event-card');
      cards.forEach((card, index) => {
        (card as any).setEvent(this.events[index]);
      });
    }
  }

  private bindGlobalEvents() {
    const addBtn = document.getElementById('add-event');
    const addBtnEmpty = document.getElementById('add-event-empty');
    const prevYear = document.getElementById('prev-year');
    const nextYear = document.getElementById('next-year');
    const viewBtns = document.querySelectorAll('[data-view]');

    if (addBtn) addBtn.addEventListener('click', () => this.openModal());
    if (addBtnEmpty) addBtnEmpty.addEventListener('click', () => this.openModal());

    if (prevYear) prevYear.addEventListener('click', () => this.navigateYear(-1));
    if (nextYear) nextYear.addEventListener('click', () => this.navigateYear(1));

    viewBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const view = (btn as HTMLElement).dataset.view as ViewMode;
        if (view && view !== this.viewMode) {
          this.viewMode = view;
          this.render();
        }
      });
    });

    this.app.addEventListener('edit', ((e: CustomEvent) => {
      this.openModal(e.detail.event);
    }) as EventListener);

    this.app.addEventListener('delete', ((e: CustomEvent) => {
      this.deleteEvent(e.detail.id);
    }) as EventListener);

    this.app.addEventListener('select', ((e: CustomEvent) => {
      this.openModal(e.detail.event);
    }) as EventListener);

    this.setupDragAndDrop();
  }

  private setupDragAndDrop() {
    const listGrid = document.getElementById('event-list');
    if (!listGrid || this.viewMode !== 'list') return;

    listGrid.addEventListener('dragover', (e) => {
      e.preventDefault();
      const afterElement = this.getDragAfterElement(listGrid, e.clientY);
      const draggingCard = document.querySelector('event-card.dragging');
      if (!draggingCard) return;

      if (afterElement == null) {
        listGrid.appendChild(draggingCard);
        this.dragOverId = null;
      } else {
        listGrid.insertBefore(draggingCard, afterElement);
        const afterIndex = Array.from(listGrid.children).indexOf(afterElement);
        if (afterIndex < this.events.length) {
          this.dragOverId = this.events[afterIndex].id;
        }
      }
    });

    listGrid.addEventListener('drop', (e) => {
      e.preventDefault();
      const draggedId = e.dataTransfer?.getData('text/plain');
      if (!draggedId) return;
      this.reorderEvents(draggedId, this.dragOverId);
      this.dragOverId = null;
    });
  }

  private getDragAfterElement(container: HTMLElement, y: number): HTMLElement | null {
    const draggableElements = [...container.querySelectorAll('event-card:not(.dragging)')];

    return draggableElements.reduce((closest, child) => {
      const box = child.getBoundingClientRect();
      const offset = y - box.top - box.height / 2;
      if (offset < 0 && offset > closest.offset) {
        return { offset: offset, element: child as HTMLElement };
      } else {
        return closest;
      }
    }, { offset: Number.NEGATIVE_INFINITY, element: null as HTMLElement | null }).element;
  }

  private reorderEvents(draggedId: string, targetId: string | null) {
    const draggedIndex = this.events.findIndex(e => e.id === draggedId);
    if (draggedIndex === -1) return;

    const [draggedEvent] = this.events.splice(draggedIndex, 1);

    if (targetId == null) {
      this.events.push(draggedEvent);
    } else {
      const targetIndex = this.events.findIndex(e => e.id === targetId);
      if (targetIndex !== -1) {
        this.events.splice(targetIndex, 0, draggedEvent);
      } else {
        this.events.push(draggedEvent);
      }
    }

    this.saveEvents();
    this.render();
  }

  private navigateYear(delta: number) {
    this.currentYear += delta;
    const yearLabel = document.getElementById('year-label');
    if (yearLabel) {
      yearLabel.textContent = String(this.currentYear);
    }

    if (this.viewMode === 'timeline') {
      const timeline = document.getElementById('timeline') as TimelineComponent | null;
      if (timeline) {
        timeline.goToYear(this.currentYear);
      }
    }
  }

  private openModal(event?: TimelineEvent) {
    this.editingEvent = event || null;
    this.selectedEmoji = event?.emoji || EMOJI_OPTIONS[0];
    this.createModal();
    this.populateModal();
    this.bindModalEvents();

    requestAnimationFrame(() => {
      this.modal?.classList.add('visible');
    });
  }

  private closeModal() {
    this.modal?.classList.remove('visible');
    setTimeout(() => {
      this.modal?.remove();
      this.modal = null;
      this.editingEvent = null;
    }, 300);
  }

  private createModal() {
    this.modal = document.createElement('div');
    this.modal.className = 'modal-overlay';
    this.modal.innerHTML = `
      <div class="modal">
        <h2 class="modal-title">${this.editingEvent ? '编辑事件' : '添加新事件'}</h2>
        <form id="event-form">
          <div class="form-group">
            <label class="form-label">事件标题</label>
            <input type="text" class="form-input" id="event-title" placeholder="输入事件标题..." required maxlength="100" />
          </div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">日期</label>
              <input type="date" class="form-input" id="event-date" required />
            </div>
            <div class="form-group">
              <label class="form-label">图标</label>
              <input type="text" class="form-input" id="event-emoji-display" readonly value="${this.selectedEmoji}" />
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">选择图标</label>
            <div class="emoji-picker" id="emoji-picker">
              ${EMOJI_OPTIONS.map(emoji => `
                <button type="button" class="emoji-option ${emoji === this.selectedEmoji ? 'selected' : ''}" data-emoji="${emoji}">
                  ${emoji}
                </button>
              `).join('')}
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">详细描述</label>
            <textarea class="form-textarea" id="event-description" placeholder="描述这个事件的详细内容..." maxlength="500"></textarea>
          </div>
          <div class="modal-actions">
            <button type="button" class="btn" id="cancel-btn">取消</button>
            <button type="submit" class="btn btn-primary" id="save-btn">保存</button>
          </div>
        </form>
      </div>
    `;
    document.body.appendChild(this.modal);
  }

  private populateModal() {
    if (!this.modal || !this.editingEvent) return;

    const titleInput = this.modal.querySelector('#event-title') as HTMLInputElement;
    const dateInput = this.modal.querySelector('#event-date') as HTMLInputElement;
    const descInput = this.modal.querySelector('#event-description') as HTMLTextAreaElement;

    if (titleInput) titleInput.value = this.editingEvent.title;
    if (dateInput) dateInput.value = this.editingEvent.date;
    if (descInput) descInput.value = this.editingEvent.description;
  }

  private bindModalEvents() {
    if (!this.modal) return;

    const form = this.modal.querySelector('#event-form') as HTMLFormElement;
    const cancelBtn = this.modal.querySelector('#cancel-btn');
    const emojiPicker = this.modal.querySelector('#emoji-picker');

    this.modal.addEventListener('click', (e) => {
      if (e.target === this.modal) {
        this.closeModal();
      }
    });

    cancelBtn?.addEventListener('click', () => this.closeModal());

    emojiPicker?.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      const emojiBtn = target.closest('.emoji-option') as HTMLElement | null;
      if (!emojiBtn) return;

      const emoji = emojiBtn.dataset.emoji;
      if (!emoji) return;

      this.selectedEmoji = emoji;
      const display = this.modal?.querySelector('#event-emoji-display') as HTMLInputElement;
      if (display) display.value = emoji;

      emojiPicker.querySelectorAll('.emoji-option').forEach(btn => {
        btn.classList.remove('selected');
      });
      emojiBtn.classList.add('selected');
    });

    form?.addEventListener('submit', (e) => {
      e.preventDefault();
      this.handleFormSubmit();
    });

    document.addEventListener('keydown', this.handleEscKey);
  }

  private handleEscKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      this.closeModal();
      document.removeEventListener('keydown', this.handleEscKey);
    }
  };

  private handleFormSubmit() {
    if (!this.modal) return;

    const titleInput = this.modal.querySelector('#event-title') as HTMLInputElement;
    const dateInput = this.modal.querySelector('#event-date') as HTMLInputElement;
    const descInput = this.modal.querySelector('#event-description') as HTMLTextAreaElement;

    if (!titleInput || !dateInput) return;

    const eventData: TimelineEvent = {
      id: this.editingEvent?.id || this.generateId(),
      title: titleInput.value.trim(),
      date: dateInput.value,
      description: descInput?.value.trim() || '',
      emoji: this.selectedEmoji
    };

    if (!eventData.title || !eventData.date) return;

    if (this.editingEvent) {
      const index = this.events.findIndex(e => e.id === this.editingEvent!.id);
      if (index !== -1) {
        this.events[index] = eventData;
      }
    } else {
      this.events.push(eventData);
    }

    this.sortEvents();
    this.saveEvents();
    this.closeModal();
    this.render();
  }

  private deleteEvent(id: string) {
    this.events = this.events.filter(e => e.id !== id);
    this.saveEvents();
    this.render();
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new App();
});
