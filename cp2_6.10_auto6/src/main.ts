import { $, $$, bus } from './utils';
import { board } from './board';
import { notes } from './notes';
import { calendar } from './calendar';
import { statistics } from './statistics';

type ViewName = 'board' | 'calendar';

class App {
  private currentView: ViewName = 'board';

  init(): void {
    board.init();
    notes.init();
    calendar.init();
    statistics.init();

    this.bindNav();
    this.bindNotesPanel();
    this.bindRipple();

    bus.on('items:changed', () => statistics.render());
    this.switchView('board');
  }

  private bindNav(): void {
    $$<HTMLButtonElement>('.nav-tab').forEach((tab) => {
      tab.addEventListener('click', () => {
        const view = tab.dataset.view as ViewName;
        if (view) this.switchView(view);
      });
    });
  }

  switchView(view: ViewName): void {
    this.currentView = view;
    $$<HTMLButtonElement>('.nav-tab').forEach((tab) => {
      const active = tab.dataset.view === view;
      tab.classList.toggle('active', active);
      tab.setAttribute('aria-selected', String(active));
    });
    const boardView = $('#boardView')!;
    const calView = $('#calendarView')!;
    boardView.classList.toggle('active', view === 'board');
    calView.classList.toggle('active', view === 'calendar');
    if (view === 'calendar') calendar.render();
    bus.emit('view:change', view);
  }

  private bindNotesPanel(): void {
    const panel = $('#notesPanel')!;
    const toggleBtn = $('#notesToggle')!;
    const closeBtn = $('#notesClose')!;

    toggleBtn.addEventListener('click', () => {
      panel.classList.toggle('open');
      toggleBtn.classList.toggle('active');
    });
    closeBtn.addEventListener('click', () => {
      panel.classList.remove('open');
      toggleBtn.classList.remove('active');
    });

    if (window.innerWidth > 768) panel.classList.add('open');
  }

  private bindRipple(): void {
    document.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      const btn = target.closest('button, .task-card, .note-item') as HTMLElement | null;
      if (!btn) return;
      if (btn.classList.contains('ripple-disabled')) return;

      const rect = btn.getBoundingClientRect();
      const size = Math.max(rect.width, rect.height);
      const x = e.clientX - rect.left - size / 2;
      const y = e.clientY - rect.top - size / 2;

      const ripple = document.createElement('span');
      ripple.className = 'ripple';
      ripple.style.width = ripple.style.height = size + 'px';
      ripple.style.left = x + 'px';
      ripple.style.top = y + 'px';

      btn.style.position = btn.style.position || 'relative';
      btn.style.overflow = btn.style.overflow || 'hidden';
      btn.appendChild(ripple);

      setTimeout(() => ripple.remove(), 600);
    });
  }
}

const app = new App();
document.addEventListener('DOMContentLoaded', () => app.init());

export { app };
