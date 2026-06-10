export interface TimelineEvent {
  id: string;
  title: string;
  date: string;
  description: string;
  emoji: string;
}

const cardStyles = `
  :host {
    display: block;
  }

  .event-card {
    position: relative;
    background: rgba(255, 255, 255, 0.08);
    border: 1px solid rgba(255, 255, 255, 0.15);
    border-radius: 12px;
    padding: 1.25rem;
    cursor: pointer;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
    overflow: hidden;
  }

  .event-card::before {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(135deg, rgba(167, 139, 250, 0.05), transparent);
    opacity: 0;
    transition: opacity 0.3s ease;
    pointer-events: none;
  }

  .event-card:hover {
    transform: translateY(-4px) scale(1.02);
    background: rgba(255, 255, 255, 0.12);
    border-color: rgba(167, 139, 250, 0.4);
    box-shadow: 0 12px 40px rgba(0, 0, 0, 0.4), 0 0 30px rgba(123, 104, 238, 0.2);
  }

  .event-card:hover::before {
    opacity: 1;
  }

  .event-card-header {
    display: flex;
    align-items: flex-start;
    gap: 0.75rem;
    margin-bottom: 0.75rem;
  }

  .event-emoji {
    font-size: 2rem;
    line-height: 1;
    flex-shrink: 0;
    filter: drop-shadow(0 2px 8px rgba(167, 139, 250, 0.3));
  }

  .event-header-content {
    flex: 1;
    min-width: 0;
  }

  .event-title {
    font-size: 1.1rem;
    font-weight: 600;
    color: #f1f5f9;
    margin-bottom: 0.25rem;
    word-break: break-word;
  }

  .event-date {
    font-size: 0.8rem;
    color: #94a3b8;
    font-weight: 500;
  }

  .event-description {
    font-size: 0.9rem;
    color: #cbd5e1;
    line-height: 1.6;
    word-break: break-word;
    display: -webkit-box;
    -webkit-line-clamp: 3;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .event-card.expanded .event-description {
    -webkit-line-clamp: unset;
    display: block;
  }

  .event-actions {
    display: none;
    gap: 0.5rem;
    margin-top: 0.75rem;
    padding-top: 0.75rem;
    border-top: 1px solid rgba(255, 255, 255, 0.1);
  }

  .event-card.expanded .event-actions {
    display: flex;
    animation: fadeIn 0.2s ease;
  }

  .action-btn {
    flex: 1;
    padding: 0.4rem 0.75rem;
    background: rgba(255, 255, 255, 0.06);
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 6px;
    color: #f1f5f9;
    font-size: 0.8rem;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .action-btn:hover {
    background: rgba(167, 139, 250, 0.2);
    border-color: rgba(167, 139, 250, 0.4);
  }

  .action-btn.delete:hover {
    background: rgba(239, 68, 68, 0.2);
    border-color: rgba(239, 68, 68, 0.4);
  }

  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(-5px); }
    to { opacity: 1; transform: translateY(0); }
  }

  :host(.dragging) {
    opacity: 0.5;
    transform: scale(0.98);
  }
`;

export class EventCard extends HTMLElement {
  private event: TimelineEvent | null = null;
  private expanded: boolean = false;
  private shadow: ShadowRoot;

  static get observedAttributes() {
    return ['expanded'];
  }

  constructor() {
    super();
    this.shadow = this.attachShadow({ mode: 'open' });
  }

  connectedCallback() {
    this.render();
    this.setupEventListeners();
    this.setAttribute('draggable', 'true');
  }

  attributeChangedCallback(name: string, oldValue: string, newValue: string) {
    if (name === 'expanded' && oldValue !== newValue) {
      this.expanded = newValue === 'true';
      this.updateCardState();
    }
  }

  setEvent(event: TimelineEvent) {
    this.event = event;
    this.render();
  }

  private setupEventListeners() {
    this.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      if (target.classList.contains('action-btn')) return;
      this.expanded = !this.expanded;
      this.setAttribute('expanded', String(this.expanded));
    });

    this.addEventListener('dragstart', (e) => {
      this.classList.add('dragging');
      if (e.dataTransfer && this.event) {
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', this.event.id);
      }
    });

    this.addEventListener('dragend', () => {
      this.classList.remove('dragging');
    });
  }

  private updateCardState() {
    const card = this.shadow.querySelector('.event-card') as HTMLElement | null;
    if (card) {
      card.classList.toggle('expanded', this.expanded);
    }
  }

  private handleEdit(e: Event) {
    e.stopPropagation();
    this.dispatchEvent(new CustomEvent('edit', {
      detail: { event: this.event },
      bubbles: true,
      composed: true
    }));
  }

  private handleDelete(e: Event) {
    e.stopPropagation();
    if (confirm('确定要删除这个事件吗？')) {
      this.dispatchEvent(new CustomEvent('delete', {
        detail: { id: this.event?.id },
        bubbles: true,
        composed: true
      }));
    }
  }

  private formatDate(dateStr: string): string {
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return dateStr;
      return date.toLocaleDateString('zh-CN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch {
      return dateStr;
    }
  }

  private render() {
    if (!this.event) return;

    this.shadow.innerHTML = `
      <style>${cardStyles}</style>
      <div class="event-card ${this.expanded ? 'expanded' : ''}">
        <div class="event-card-header">
          <span class="event-emoji">${this.event.emoji || '📌'}</span>
          <div class="event-header-content">
            <h3 class="event-title">${this.escapeHtml(this.event.title)}</h3>
            <span class="event-date">${this.formatDate(this.event.date)}</span>
          </div>
        </div>
        <p class="event-description">${this.escapeHtml(this.event.description)}</p>
        <div class="event-actions">
          <button class="action-btn edit-btn">编辑</button>
          <button class="action-btn delete">删除</button>
        </div>
      </div>
    `;

    const editBtn = this.shadow.querySelector('.edit-btn');
    const deleteBtn = this.shadow.querySelector('.delete');

    if (editBtn) editBtn.addEventListener('click', (e) => this.handleEdit(e));
    if (deleteBtn) deleteBtn.addEventListener('click', (e) => this.handleDelete(e));
  }

  private escapeHtml(str: string): string {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }
}

customElements.define('event-card', EventCard);
