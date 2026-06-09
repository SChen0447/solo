import { useState, useRef, useCallback, useEffect } from 'react';
import Note from './Note';
import type { Note as NoteType, Comment } from './types';
import { Plus, Minus, StickyNote } from 'lucide-react';

interface BoardProps {
  notes: NoteType[];
  onCreateNote: (x: number, y: number) => Promise<NoteType | undefined>;
  onUpdateNote: (id: string, updates: Partial<NoteType>) => Promise<void>;
  onLikeNote: (id: string) => Promise<void>;
  onAddComment: (noteId: string, content: string) => Promise<void>;
}

const GRID_SIZE = 10;
const MIN_SCALE = 0.3;
const MAX_SCALE = 2.5;

function snapToGrid(value: number): number {
  return Math.round(value / GRID_SIZE) * GRID_SIZE;
}

export default function Board({
  notes,
  onCreateNote,
  onUpdateNote,
  onLikeNote,
  onAddComment,
}: BoardProps) {
  const boardRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [draggingNoteId, setDraggingNoteId] = useState<string | null>(null);
  const [resizingNoteId, setResizingNoteId] = useState<string | null>(null);
  const [showHint, setShowHint] = useState(true);
  const dragState = useRef<{
    noteId: string;
    startX: number;
    startY: number;
    noteStartX: number;
    noteStartY: number;
  } | null>(null);
  const resizeState = useRef<{
    noteId: string;
    startX: number;
    startY: number;
    startWidth: number;
    startHeight: number;
  } | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setShowHint(false), 3000);
    return () => clearTimeout(timer);
  }, []);

  const getBoardCoords = useCallback(
    (clientX: number, clientY: number) => {
      if (!boardRef.current) return { x: 0, y: 0 };
      const rect = boardRef.current.getBoundingClientRect();
      return {
        x: (clientX - rect.left - offset.x) / scale,
        y: (clientY - rect.top - offset.y) / scale,
      };
    },
    [offset, scale]
  );

  const handleDoubleClick = useCallback(
    async (e: React.MouseEvent) => {
      if (e.target !== e.currentTarget && !(e.target as HTMLElement).classList.contains('board-content')) return;
      const coords = getBoardCoords(e.clientX, e.clientY);
      await onCreateNote(snapToGrid(coords.x), snapToGrid(coords.y));
    },
    [getBoardCoords, onCreateNote]
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (e.button !== 0) return;
      if (e.target !== e.currentTarget && !(e.target as HTMLElement).classList.contains('board-content')) return;
      setIsPanning(true);
      setPanStart({ x: e.clientX - offset.x, y: e.clientY - offset.y });
    },
    [offset]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (isPanning) {
        setOffset({
          x: e.clientX - panStart.x,
          y: e.clientY - panStart.y,
        });
      }

      if (dragState.current) {
        const { noteId, startX, startY, noteStartX, noteStartY } = dragState.current;
        const dx = (e.clientX - startX) / scale;
        const dy = (e.clientY - startY) / scale;
        onUpdateNote(noteId, {
          x: snapToGrid(noteStartX + dx),
          y: snapToGrid(noteStartY + dy),
        });
      }

      if (resizeState.current) {
        const { noteId, startX, startY, startWidth, startHeight } = resizeState.current;
        const dx = (e.clientX - startX) / scale;
        const dy = (e.clientY - startY) / scale;
        onUpdateNote(noteId, {
          width: Math.max(150, snapToGrid(startWidth + dx)),
          height: Math.max(150, snapToGrid(startHeight + dy)),
        });
      }
    },
    [isPanning, panStart, scale, onUpdateNote]
  );

  const handleMouseUp = useCallback(() => {
    setIsPanning(false);
    setDraggingNoteId(null);
    setResizingNoteId(null);
    dragState.current = null;
    resizeState.current = null;
  }, []);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setScale(s => Math.min(MAX_SCALE, Math.max(MIN_SCALE, s * delta)));
  }, []);

  const handleNoteDragStart = useCallback(
    (noteId: string, e: React.MouseEvent) => {
      e.stopPropagation();
      const note = notes.find(n => n.id === noteId);
      if (!note) return;
      setDraggingNoteId(noteId);
      dragState.current = {
        noteId,
        startX: e.clientX,
        startY: e.clientY,
        noteStartX: note.x,
        noteStartY: note.y,
      };
    },
    [notes]
  );

  const handleNoteResizeStart = useCallback(
    (noteId: string, e: React.MouseEvent) => {
      e.stopPropagation();
      const note = notes.find(n => n.id === noteId);
      if (!note) return;
      setResizingNoteId(noteId);
      resizeState.current = {
        noteId,
        startX: e.clientX,
        startY: e.clientY,
        startWidth: note.width,
        startHeight: note.height,
      };
    },
    [notes]
  );

  const zoomIn = () => setScale(s => Math.min(MAX_SCALE, s * 1.2));
  const zoomOut = () => setScale(s => Math.max(MIN_SCALE, s / 1.2));

  return (
    <div
      ref={boardRef}
      className={`board-wrapper ${isPanning ? 'grabbing' : ''}`}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onWheel={handleWheel}
      onDoubleClick={handleDoubleClick}
    >
      <div className="board-canvas" />
      <div
        className="board-content"
        style={{
          transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
        }}
      >
        {scale > 0.6 && <div className="grid-overlay" />}
        {notes.map(note => (
          <Note
            key={note.id}
            note={note}
            isDragging={draggingNoteId === note.id}
            isResizing={resizingNoteId === note.id}
            onDragStart={(e) => handleNoteDragStart(note.id, e)}
            onResizeStart={(e) => handleNoteResizeStart(note.id, e)}
            onUpdate={(updates) => onUpdateNote(note.id, updates)}
            onLike={() => onLikeNote(note.id)}
            onAddComment={(content) => onAddComment(note.id, content)}
          />
        ))}
      </div>

      <div className="zoom-controls">
        <button className="zoom-btn" onClick={zoomIn} title="放大">
          <Plus size={20} />
        </button>
        <div className="zoom-level">{Math.round(scale * 100)}%</div>
        <button className="zoom-btn" onClick={zoomOut} title="缩小">
          <Minus size={20} />
        </button>
      </div>

      {showHint && (
        <div className="hint">
          <StickyNote size={14} style={{ display: 'inline', marginRight: 6 }} />
          双击画布创建便签，拖拽移动便签，滚轮缩放画布
        </div>
      )}
    </div>
  );
}
