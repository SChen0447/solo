import './sticky-note';
import type { StickyNote } from './sticky-note';

interface NoteData {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  content: string;
  color: string;
  zIndex: number;
}

interface BoardState {
  offsetX: number;
  offsetY: number;
  scale: number;
}

const MIN_SCALE = 0.5;
const MAX_SCALE = 2;
const SCALE_DAMPING = 0.15;

class StickyBoard {
  private container: HTMLElement;
  private canvas: HTMLElement;
  private ws: WebSocket | null = null;
  private notes: Map<string, StickyNote> = new Map();
  private state: BoardState = {
    offsetX: 0,
    offsetY: 0,
    scale: 1,
  };
  private targetScale: number = 1;
  private isPanning: boolean = false;
  private panStartX: number = 0;
  private panStartY: number = 0;
  private panStartOffsetX: number = 0;
  private panStartOffsetY: number = 0;
  private animationFrameId: number | null = null;
  private clientId: string = '';
  private isDraggingNote: boolean = false;
  private throttleTimer: Map<string, number> = new Map();

  constructor() {
    const container = document.getElementById('board-container');
    const canvas = document.getElementById('board-canvas');
    if (!container || !canvas) {
      throw new Error('Board elements not found');
    }
    this.container = container;
    this.canvas = canvas;
    this._init();
  }

  private _init(): void {
    this._setupEventListeners();
    this._connectWebSocket();
    this._startAnimationLoop();
  }

  private _setupEventListeners(): void {
    this.container.addEventListener('mousedown', (e) => {
      if (e.target === this.container || e.target === this.canvas) {
        this._startPan(e);
      }
    });

    document.addEventListener('mousemove', (e) => {
      if (this.isPanning) {
        this._onPan(e);
      }
    });

    document.addEventListener('mouseup', () => {
      if (this.isPanning) {
        this._endPan();
      }
    });

    this.container.addEventListener('wheel', (e) => {
      e.preventDefault();
      this._onZoom(e);
    }, { passive: false });

    const addBtn = document.getElementById('add-note-btn');
    if (addBtn) {
      addBtn.addEventListener('click', (e) => {
        this._createRipple(e);
        this._addNoteAtCenter();
      });
    }

    document.addEventListener('keydown', (e) => {
      if (e.key === 'n' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        this._addNoteAtCenter();
      }
    });

    this.canvas.addEventListener('click', (e) => {
      const note = (e.target as HTMLElement).closest('sticky-note') as StickyNote | null;
      if (note) {
        this._bringToFront(note);
      }
    });

    this.canvas.addEventListener('move', (e) => {
      const event = e as CustomEvent;
      const note = (e.target as HTMLElement).closest('sticky-note') as StickyNote | null;
      if (note && !this.isDraggingNote) {
        this.isDraggingNote = true;
      }
      if (note) {
        this._throttleSend('move', () => {
          this._sendMessage({
            type: 'move',
            id: note.noteId,
            x: event.detail.x,
            y: event.detail.y,
          });
        }, 30);
      }
    });

    this.canvas.addEventListener('dragend', (e) => {
      const event = e as unknown as CustomEvent;
      const note = (e.target as HTMLElement).closest('sticky-note') as StickyNote | null;
      if (note) {
        this.isDraggingNote = false;
        this._sendMessage({
          type: 'move',
          id: note.noteId,
          x: event.detail.x,
          y: event.detail.y,
        });
      }
    });

    this.canvas.addEventListener('delete', (e) => {
      const event = e as CustomEvent;
      const note = (e.target as HTMLElement).closest('sticky-note') as StickyNote | null;
      if (note) {
        this._sendMessage({
          type: 'delete',
          id: event.detail.id,
        });
        this.notes.delete(event.detail.id);
        setTimeout(() => {
          note.remove();
        }, 300);
      }
    });

    this.canvas.addEventListener('colorchange', (e) => {
      const event = e as CustomEvent;
      const note = (e.target as HTMLElement).closest('sticky-note') as StickyNote | null;
      if (note) {
        this._sendMessage({
          type: 'color',
          id: note.noteId,
          color: event.detail.color,
        });
      }
    });

    this.canvas.addEventListener('contentchange', (e) => {
      const event = e as CustomEvent;
      const note = (e.target as HTMLElement).closest('sticky-note') as StickyNote | null;
      if (note) {
        this._throttleSend('content', () => {
          this._sendMessage({
            type: 'content',
            id: note.noteId,
            content: event.detail.content,
          });
        }, 200);
      }
    });

    this.canvas.addEventListener('bringtofront', (e) => {
      const event = e as CustomEvent;
      const note = (e.target as HTMLElement).closest('sticky-note') as StickyNote | null;
      if (note) {
        this._sendMessage({
          type: 'zindex',
          id: event.detail.id,
        });
      }
    });

    this.canvas.addEventListener('resizeend', (e) => {
      const event = e as CustomEvent;
      const note = (e.target as HTMLElement).closest('sticky-note') as StickyNote | null;
      if (note) {
        this._sendMessage({
          type: 'resize',
          id: note.noteId,
          width: event.detail.width,
          height: event.detail.height,
        });
      }
    });
  }

  private _throttleSend(key: string, fn: () => void, delay: number): void {
    if (this.throttleTimer.has(key)) {
      return;
    }
    this.throttleTimer.set(key, window.setTimeout(() => {
      fn();
      this.throttleTimer.delete(key);
    }, delay));
  }

  private _startPan(e: MouseEvent): void {
    this.isPanning = true;
    this.panStartX = e.clientX;
    this.panStartY = e.clientY;
    this.panStartOffsetX = this.state.offsetX;
    this.panStartOffsetY = this.state.offsetY;
    this.container.classList.add('dragging');
  }

  private _onPan(e: MouseEvent): void {
    const dx = e.clientX - this.panStartX;
    const dy = e.clientY - this.panStartY;
    this.state.offsetX = this.panStartOffsetX + dx;
    this.state.offsetY = this.panStartOffsetY + dy;
  }

  private _endPan(): void {
    this.isPanning = false;
    this.container.classList.remove('dragging');
  }

  private _onZoom(e: WheelEvent): void {
    const delta = -e.deltaY * 0.001;
    const newScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, this.targetScale + delta));

    const rect = this.container.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const scaleChange = newScale / this.targetScale;

    this.state.offsetX = mouseX - (mouseX - this.state.offsetX) * scaleChange;
    this.state.offsetY = mouseY - (mouseY - this.state.offsetY) * scaleChange;

    this.targetScale = newScale;
  }

  private _startAnimationLoop(): void {
    const animate = () => {
      const diff = this.targetScale - this.state.scale;
      if (Math.abs(diff) > 0.001) {
        this.state.scale += diff * SCALE_DAMPING;
      } else {
        this.state.scale = this.targetScale;
      }

      this._applyTransform();
      this.animationFrameId = requestAnimationFrame(animate);
    };
    this.animationFrameId = requestAnimationFrame(animate);
  }

  private _applyTransform(): void {
    this.canvas.style.transform = `translate(${this.state.offsetX}px, ${this.state.offsetY}px) scale(${this.state.scale})`;
  }

  private _connectWebSocket(): void {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;

    this.ws = new WebSocket(wsUrl);

    this.ws.onopen = () => {
      console.log('WebSocket connected');
    };

    this.ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      this._handleServerMessage(data);
    };

    this.ws.onclose = () => {
      console.log('WebSocket disconnected, reconnecting...');
      setTimeout(() => this._connectWebSocket(), 2000);
    };

    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
  }

  private _handleServerMessage(data: { type: string; [key: string]: unknown }): void {
    switch (data.type) {
      case 'init':
        this.clientId = data.clientId as string;
        this._loadNotes(data.notes as NoteData[]);
        this._updateOnlineCount(data.onlineCount as number);
        break;

      case 'create':
        this._addNote(data.note as NoteData, true);
        break;

      case 'create-ack':
        break;

      case 'move':
        this._moveNote(data.id as string, data.x as number, data.y as number);
        break;

      case 'delete':
        this._deleteNote(data.id as string);
        break;

      case 'color':
        this._changeNoteColor(data.id as string, data.color as string);
        break;

      case 'content':
        this._changeNoteContent(data.id as string, data.content as string);
        break;

      case 'zindex':
        this._changeNoteZIndex(data.id as string, data.zIndex as number);
        break;

      case 'resize':
        this._resizeNote(data.id as string, data.width as number, data.height as number);
        break;

      case 'online-count':
        this._updateOnlineCount(data.count as number);
        break;
    }
  }

  private _loadNotes(notesData: NoteData[]): void {
    this.notes.clear();
    this.canvas.innerHTML = '';
    for (const noteData of notesData) {
      this._addNote(noteData, false);
    }
  }

  private _addNote(noteData: NoteData, animate: boolean = false): StickyNote {
    const note = document.createElement('sticky-note') as StickyNote;
    note.setAttribute('note-id', noteData.id);
    note.setAttribute('x', String(noteData.x));
    note.setAttribute('y', String(noteData.y));
    note.setAttribute('width', String(noteData.width));
    note.setAttribute('height', String(noteData.height));
    note.setAttribute('color', noteData.color);
    note.setAttribute('z-index', String(noteData.zIndex));
    note.setAttribute('content', noteData.content);

    this.canvas.appendChild(note);
    this.notes.set(noteData.id, note);

    if (animate) {
      note.playEnterAnimation();
    }

    return note;
  }

  private _moveNote(id: string, x: number, y: number): void {
    const note = this.notes.get(id);
    if (note) {
      note.setSmoothMove(true);
      note.setAttribute('x', String(x));
      note.setAttribute('y', String(y));
      setTimeout(() => {
        note.setSmoothMove(false);
      }, 300);
    }
  }

  private _deleteNote(id: string): void {
    const note = this.notes.get(id);
    if (note) {
      note.classList.add('exiting');
      this.notes.delete(id);
      setTimeout(() => {
        note.remove();
      }, 300);
    }
  }

  private _changeNoteColor(id: string, color: string): void {
    const note = this.notes.get(id);
    if (note) {
      note.setAttribute('color', color);
    }
  }

  private _changeNoteContent(id: string, content: string): void {
    const note = this.notes.get(id);
    if (note) {
      note.setAttribute('content', content);
    }
  }

  private _changeNoteZIndex(id: string, zIndex: number): void {
    const note = this.notes.get(id);
    if (note) {
      note.setAttribute('z-index', String(zIndex));
      note.classList.add('topmost');
      setTimeout(() => {
        note.classList.remove('topmost');
      }, 300);
    }
  }

  private _resizeNote(id: string, width: number, height: number): void {
    const note = this.notes.get(id);
    if (note) {
      note.setAttribute('width', String(width));
      note.setAttribute('height', String(height));
    }
  }

  private _bringToFront(note: StickyNote): void {
    note.bringToFront();
  }

  private _updateOnlineCount(count: number): void {
    const el = document.getElementById('online-count');
    if (el) {
      el.textContent = String(count);
    }
  }

  private _addNoteAtCenter(): void {
    const rect = this.container.getBoundingClientRect();
    const centerX = (rect.width / 2 - this.state.offsetX) / this.state.scale;
    const centerY = (rect.height / 2 - this.state.offsetY) / this.state.scale;

    const id = `note_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const noteData: NoteData = {
      id,
      x: centerX - 100,
      y: centerY - 90,
      width: 200,
      height: 180,
      content: '',
      color: '#FFF9C4',
      zIndex: 0,
    };

    const note = this._addNote(noteData, true);
    this.notes.set(id, note);

    this._sendMessage({
      type: 'create',
      note: noteData,
    });

    setTimeout(() => {
      const contentArea = note.shadowRoot?.querySelector('.content-area');
      if (contentArea) {
        (contentArea as HTMLElement).focus();
      }
    }, 400);
  }

  private _sendMessage(message: { type: string; [key: string]: unknown }): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    }
  }

  private _createRipple(e: MouseEvent): void {
    const button = e.currentTarget as HTMLElement;
    const rect = button.getBoundingClientRect();
    const ripple = document.createElement('span');
    const size = Math.max(rect.width, rect.height);
    const x = e.clientX - rect.left - size / 2;
    const y = e.clientY - rect.top - size / 2;

    ripple.style.width = ripple.style.height = `${size}px`;
    ripple.style.left = `${x}px`;
    ripple.style.top = `${y}px`;
    ripple.className = 'ripple';

    button.appendChild(ripple);
    setTimeout(() => ripple.remove(), 600);
  }

  public destroy(): void {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
    if (this.ws) {
      this.ws.close();
    }
  }
}

let board: StickyBoard | null = null;

document.addEventListener('DOMContentLoaded', () => {
  board = new StickyBoard();
});

export { StickyBoard };
