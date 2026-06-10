import {
  Note,
  storage,
  debouncedStorage,
  uid,
  $,
  el,
  bus,
  debounce,
  formatDate,
  formatRelative
} from './utils';

const STORAGE_KEY = 'notes';

class NotesModule {
  private notes: Note[] = [];
  private editingId: string | null = null;
  private searchKeyword = '';

  init(): void {
    this.notes = storage<Note[]>(STORAGE_KEY) || this.getDefaultNotes();
    this.bindEvents();
    this.renderList();
    this.selectNew();
  }

  private getDefaultNotes(): Note[] {
    const now = Date.now();
    return [
      {
        id: uid(),
        title: '欢迎使用 FlowBoard',
        content: '# 欢迎使用 FlowBoard ✨\n\n这是一款为独立开发者和小团队打造的**集成式生产力看板**。\n\n## 核心功能\n\n- 📋 **四象限看板**：按优先级管理待办事项\n- 📝 **Markdown 笔记**：快速记录灵感与想法\n- 📅 **日历视图**：全局查看任务截止日期\n- 📊 **统计概览**：追踪你的工作效率\n\n## 速记格式示例\n\n**加粗文本**  *斜体文本*  ~~删除线~~\n\n### 待办清单\n\n- [x] 了解产品功能\n- [ ] 完成第一个任务\n- [ ] 记录一条笔记\n\n> 小提示：笔记会自动保存，无需担心丢失！',
        createdAt: now - 86400000,
        updatedAt: now - 86400000
      }
    ];
  }

  addNote(): Note {
    const now = Date.now();
    const note: Note = {
      id: uid(),
      title: '',
      content: '',
      createdAt: now,
      updatedAt: now
    };
    this.notes.unshift(note);
    this.persist();
    this.renderList();
    this.setEditing(note.id);
    return note;
  }

  updateNote(id: string, patch: Partial<Note>): Note | null {
    const idx = this.notes.findIndex((n) => n.id === id);
    if (idx === -1) return null;
    this.notes[idx] = { ...this.notes[idx], ...patch, updatedAt: Date.now() };
    if (!this.notes[idx].title && this.notes[idx].content) {
      const firstLine = this.notes[idx].content.split('\n')[0].replace(/^#+\s*/, '').slice(0, 50);
      this.notes[idx].title = firstLine || '无标题笔记';
    }
    this.persist();
    this.renderList();
    bus.emit('notes:changed', [...this.notes]);
    return this.notes[idx];
  }

  deleteNote(id: string): void {
    const before = this.notes.length;
    this.notes = this.notes.filter((n) => n.id !== id);
    if (this.notes.length === before) return;
    this.persist();
    if (this.editingId === id) {
      if (this.notes.length > 0) this.setEditing(this.notes[0].id);
      else this.selectNew();
    }
    this.renderList();
    bus.emit('notes:changed', [...this.notes]);
  }

  searchNotes(keyword: string): Note[] {
    this.searchKeyword = keyword.trim().toLowerCase();
    if (!this.searchKeyword) return [...this.notes];
    return this.notes.filter(
      (n) =>
        n.title.toLowerCase().includes(this.searchKeyword) ||
        n.content.toLowerCase().includes(this.searchKeyword)
    );
  }

  private persist(): void {
    debouncedStorage(STORAGE_KEY, this.notes, 200);
  }

  private bindEvents(): void {
    const titleInput = $('#noteTitle') as HTMLInputElement;
    const contentInput = $('#noteContent') as HTMLTextAreaElement;

    const autosave = debounce(() => {
      if (!this.editingId) return;
      this.updateNote(this.editingId, { title: titleInput.value, content: contentInput.value });
    }, 300);

    titleInput.addEventListener('input', autosave);
    contentInput.addEventListener('input', autosave);

    $('#saveNoteBtn')!.addEventListener('click', () => {
      if (!this.editingId) return;
      this.updateNote(this.editingId, { title: titleInput.value, content: contentInput.value });
    });

    $('#newNoteBtn')!.addEventListener('click', () => {
      this.addNote();
    });

    const searchInput = $('#noteSearch') as HTMLInputElement;
    searchInput.addEventListener('input', debounce(() => {
      this.renderList(searchInput.value);
    }, 150));

    $$<HTMLButtonElement>('.editor-toolbar button').forEach((btn) => {
      btn.addEventListener('click', () => {
        const action = btn.dataset.action;
        if (action) this.insertMarkdown(action);
      });
    });
  }

  private insertMarkdown(action: string): void {
    const textarea = $('#noteContent') as HTMLTextAreaElement;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const value = textarea.value;
    const selected = value.slice(start, end);
    let prefix = '';
    let suffix = '';
    let newLinePrefix = '';

    switch (action) {
      case 'bold': prefix = '**'; suffix = '**'; break;
      case 'italic': prefix = '*'; suffix = '*'; break;
      case 'strikethrough': prefix = '~~'; suffix = '~~'; break;
      case 'code': prefix = '`'; suffix = '`'; break;
      case 'h1': newLinePrefix = '# '; break;
      case 'h2': newLinePrefix = '## '; break;
      case 'ul': newLinePrefix = '- '; break;
      case 'ol': newLinePrefix = '1. '; break;
      case 'todo': newLinePrefix = '- [ ] '; break;
      case 'quote': newLinePrefix = '> '; break;
    }

    let insertText = '';
    let cursorOffset = 0;

    if (newLinePrefix) {
      const lineStart = value.lastIndexOf('\n', start - 1) + 1;
      insertText = newLinePrefix + value.slice(lineStart, end);
      textarea.setRangeText(insertText, lineStart, end, 'end');
      cursorOffset = lineStart + insertText.length;
    } else {
      insertText = prefix + (selected || '文本') + suffix;
      textarea.setRangeText(insertText, start, end, 'end');
      cursorOffset = start + prefix.length + (selected ? selected.length : 2);
    }

    textarea.focus();
    if (!newLinePrefix) {
      textarea.setSelectionRange(start + prefix.length, start + prefix.length + (selected ? selected.length : 2));
    }
    textarea.dispatchEvent(new Event('input'));
    void cursorOffset;
  }

  private setEditing(id: string | null): void {
    this.editingId = id;
    const titleInput = $('#noteTitle') as HTMLInputElement;
    const contentInput = $('#noteContent') as HTMLTextAreaElement;
    if (!id) {
      titleInput.value = '';
      contentInput.value = '';
      return;
    }
    const note = this.notes.find((n) => n.id === id);
    if (note) {
      titleInput.value = note.title;
      contentInput.value = note.content;
    }
    this.renderList(this.searchKeyword);
  }

  selectNew(): void {
    this.setEditing(null);
    ($('#noteTitle') as HTMLInputElement).value = '';
    ($('#noteContent') as HTMLTextAreaElement).value = '';
  }

  private renderList(keyword: string = ''): void {
    const list = $('#notesList')!;
    const filtered = this.searchNotes(keyword);
    const frag = document.createDocumentFragment();

    if (filtered.length === 0) {
      frag.appendChild(el('div', { class: 'notes-empty' }, keyword ? '未找到匹配的笔记' : '暂无笔记，点击新建开始记录'));
    } else {
      const groups = this.groupByDate(filtered);
      for (const [groupLabel, groupNotes] of Object.entries(groups)) {
        frag.appendChild(el('div', { class: 'notes-group-label' }, groupLabel));
        groupNotes.forEach((note) => frag.appendChild(this.renderNoteItem(note)));
      }
    }

    list.innerHTML = '';
    list.appendChild(frag);
  }

  private groupByDate(notes: Note[]): Record<string, Note[]> {
    const groups: Record<string, Note[]> = {};
    const today = formatDate(new Date(), 'YYYY-MM-DD');
    const yesterday = (() => { const d = new Date(); d.setDate(d.getDate() - 1); return formatDate(d, 'YYYY-MM-DD'); })();

    notes.forEach((note) => {
      const dateStr = formatDate(note.createdAt, 'YYYY-MM-DD');
      let label: string;
      if (dateStr === today) label = '今天';
      else if (dateStr === yesterday) label = '昨天';
      else {
        const d = new Date(note.createdAt);
        label = `${d.getFullYear()}年${d.getMonth() + 1}月`;
      }
      if (!groups[label]) groups[label] = [];
      groups[label].push(note);
    });
    return groups;
  }

  private renderNoteItem(note: Note): HTMLElement {
    const item = el('div', {
      class: `note-item${this.editingId === note.id ? ' active' : ''}`,
      'data-id': note.id
    });
    item.addEventListener('click', () => this.setEditing(note.id));

    const header = el('div', { class: 'note-item-header' });
    header.appendChild(el('div', { class: 'note-item-title' }, note.title || '无标题笔记'));
    const delBtn = el('button', { class: 'note-item-del', title: '删除', 'aria-label': '删除笔记' });
    delBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-2 14a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2L5 6"/></svg>';
    delBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (confirm('删除这条笔记？')) this.deleteNote(note.id);
    });
    header.appendChild(delBtn);

    const preview = note.content.replace(/[#*`>\-]/g, '').slice(0, 60);
    item.appendChild(header);
    item.appendChild(el('div', { class: 'note-item-preview' }, preview || '（空笔记）'));
    item.appendChild(el('div', { class: 'note-item-time' }, formatRelative(note.updatedAt)));
    return item;
  }
}

export const notes = new NotesModule();
