import React, { useState, useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import Canvas from './components/Canvas';
import Toolbar from './components/Toolbar';
import NotePanel from './components/NotePanel';
import Timeline from './components/Timeline';
import UserList from './components/UserList';
import ExportModal from './components/ExportModal';
import { Shape, Note, User, ToolType, HistoryAction, CanvasState } from './types';
import { generateId } from './utils/canvasUtils';

const App: React.FC = () => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [shapes, setShapes] = useState<Shape[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [selectedTool, setSelectedTool] = useState<ToolType>('select');
  const [selectedColor, setSelectedColor] = useState('#4d96ff');
  const [history, setHistory] = useState<HistoryAction[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [showExportModal, setShowExportModal] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  const shapesRef = useRef<Shape[]>([]);
  const notesRef = useRef<Note[]>([]);

  useEffect(() => {
    shapesRef.current = shapes;
  }, [shapes]);

  useEffect(() => {
    notesRef.current = notes;
  }, [notes]);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    const newSocket = io('/', { path: '/socket.io' });

    newSocket.on('connect', () => {
      console.log('Connected to server');
    });

    newSocket.on('user:init', ({ userId, user }: { userId: string; user: User }) => {
      setCurrentUser(user);
    });

    newSocket.on('canvas:snapshot', (state: CanvasState) => {
      setShapes(state.shapes);
      setNotes(state.notes);
    });

    newSocket.on('users:list', (userList: User[]) => {
      setUsers(userList);
    });

    newSocket.on('shape:add', (shape: Shape) => {
      setShapes((prev) => [...prev, shape]);
    });

    newSocket.on('shape:update', (updatedShape: Shape) => {
      setShapes((prev) => prev.map((s) => (s.id === updatedShape.id ? updatedShape : s)));
    });

    newSocket.on('shape:delete', (shapeId: string) => {
      setShapes((prev) => prev.filter((s) => s.id !== shapeId));
    });

    newSocket.on('note:add', (note: Note) => {
      setNotes((prev) => [...prev, note]);
    });

    newSocket.on('note:update', (updatedNote: Note) => {
      setNotes((prev) => prev.map((n) => (n.id === updatedNote.id ? updatedNote : n)));
    });

    newSocket.on('note:delete', (noteId: string) => {
      setNotes((prev) => prev.filter((n) => n.id !== noteId));
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, []);

  const pushHistory = useCallback((action: Omit<HistoryAction, 'timestamp'>) => {
    const historyAction: HistoryAction = {
      ...action,
      timestamp: Date.now(),
    };
    setHistory((prev) => {
      const newHistory = prev.slice(0, historyIndex + 1);
      newHistory.push(historyAction);
      if (newHistory.length > 200) {
        newHistory.shift();
      }
      return newHistory;
    });
    setHistoryIndex((prev) => Math.min(prev + 1, 199));
  }, [historyIndex]);

  const addShape = useCallback((shape: Shape) => {
    if (socket) {
      socket.emit('shape:add', shape);
    }
    setShapes((prev) => [...prev, shape]);
    pushHistory({ type: 'shape:add', data: shape });
  }, [socket, pushHistory]);

  const updateShape = useCallback((shape: Shape, addToHistory: boolean = true) => {
    if (socket) {
      socket.emit('shape:update', shape);
    }
    setShapes((prev) => prev.map((s) => (s.id === shape.id ? shape : s)));
    if (addToHistory) {
      const oldShape = shapesRef.current.find((s) => s.id === shape.id);
      if (oldShape) {
        pushHistory({ type: 'shape:update', data: { old: oldShape, new: shape } });
      }
    }
  }, [socket, pushHistory]);

  const deleteShape = useCallback((shapeId: string) => {
    const shape = shapesRef.current.find((s) => s.id === shapeId);
    if (socket) {
      socket.emit('shape:delete', shapeId);
    }
    setShapes((prev) => prev.filter((s) => s.id !== shapeId));
    if (shape) {
      pushHistory({ type: 'shape:delete', data: shape });
    }
  }, [socket, pushHistory]);

  const addNote = useCallback((note: Note) => {
    if (socket) {
      socket.emit('note:add', note);
    }
    setNotes((prev) => [...prev, note]);
    pushHistory({ type: 'note:add', data: note });
  }, [socket, pushHistory]);

  const updateNote = useCallback((note: Note, addToHistory: boolean = true) => {
    if (socket) {
      socket.emit('note:update', note);
    }
    setNotes((prev) => prev.map((n) => (n.id === note.id ? note : n)));
    if (addToHistory) {
      const oldNote = notesRef.current.find((n) => n.id === note.id);
      if (oldNote) {
        pushHistory({ type: 'note:update', data: { old: oldNote, new: note } });
      }
    }
  }, [socket, pushHistory]);

  const deleteNote = useCallback((noteId: string) => {
    const note = notesRef.current.find((n) => n.id === noteId);
    if (socket) {
      socket.emit('note:delete', noteId);
    }
    setNotes((prev) => prev.filter((n) => n.id !== noteId));
    if (note) {
      pushHistory({ type: 'note:delete', data: note });
    }
  }, [socket, pushHistory]);

  const undo = useCallback(() => {
    if (historyIndex < 0) return;

    const action = history[historyIndex];
    if (!action) return;

    switch (action.type) {
      case 'shape:add':
        setShapes((prev) => prev.filter((s) => s.id !== action.data.id));
        if (socket) socket.emit('shape:delete', action.data.id);
        break;
      case 'shape:delete':
        setShapes((prev) => [...prev, action.data]);
        if (socket) socket.emit('shape:add', action.data);
        break;
      case 'shape:update':
        setShapes((prev) => prev.map((s) => (s.id === action.data.old.id ? action.data.old : s)));
        if (socket) socket.emit('shape:update', action.data.old);
        break;
      case 'note:add':
        setNotes((prev) => prev.filter((n) => n.id !== action.data.id));
        if (socket) socket.emit('note:delete', action.data.id);
        break;
      case 'note:delete':
        setNotes((prev) => [...prev, action.data]);
        if (socket) socket.emit('note:add', action.data);
        break;
      case 'note:update':
        setNotes((prev) => prev.map((n) => (n.id === action.data.old.id ? action.data.old : n)));
        if (socket) socket.emit('note:update', action.data.old);
        break;
    }

    setHistoryIndex((prev) => prev - 1);
  }, [history, historyIndex, socket]);

  const redo = useCallback(() => {
    if (historyIndex >= history.length - 1) return;

    const action = history[historyIndex + 1];
    if (!action) return;

    switch (action.type) {
      case 'shape:add':
        setShapes((prev) => [...prev, action.data]);
        if (socket) socket.emit('shape:add', action.data);
        break;
      case 'shape:delete':
        setShapes((prev) => prev.filter((s) => s.id !== action.data.id));
        if (socket) socket.emit('shape:delete', action.data.id);
        break;
      case 'shape:update':
        setShapes((prev) => prev.map((s) => (s.id === action.data.new.id ? action.data.new : s)));
        if (socket) socket.emit('shape:update', action.data.new);
        break;
      case 'note:add':
        setNotes((prev) => [...prev, action.data]);
        if (socket) socket.emit('note:add', action.data);
        break;
      case 'note:delete':
        setNotes((prev) => prev.filter((n) => n.id !== action.data.id));
        if (socket) socket.emit('note:delete', action.data.id);
        break;
      case 'note:update':
        setNotes((prev) => prev.map((n) => (n.id === action.data.new.id ? action.data.new : n)));
        if (socket) socket.emit('note:update', action.data.new);
        break;
    }

    setHistoryIndex((prev) => prev + 1);
  }, [history, historyIndex, socket]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
      } else if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.shiftKey && e.key === 'Z'))) {
        e.preventDefault();
        redo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo]);

  return (
    <div className="app">
      <UserList users={users} currentUser={currentUser} />

      {!isMobile && (
        <Toolbar
          selectedTool={selectedTool}
          onToolSelect={setSelectedTool}
          selectedColor={selectedColor}
          onColorSelect={setSelectedColor}
          onExport={() => setShowExportModal(true)}
        />
      )}

      <Canvas
        shapes={shapes}
        notes={notes}
        selectedTool={selectedTool}
        selectedColor={selectedColor}
        onShapeAdd={addShape}
        onShapeUpdate={updateShape}
        onShapeDelete={deleteShape}
        onNoteUpdate={updateNote}
        onNoteDelete={deleteNote}
      />

      {!isMobile && (
        <div className="right-panel">
          <NotePanel onAddNote={(color) => {
            const newNote: Note = {
              id: generateId(),
              x: window.innerWidth / 2 - 100,
              y: window.innerHeight / 2 - 100,
              width: 200,
              height: 200,
              color,
              text: '',
            };
            addNote(newNote);
          }} />
          <Timeline
            history={history}
            historyIndex={historyIndex}
            onUndo={undo}
            onRedo={redo}
          />
        </div>
      )}

      {isMobile && (
        <div className="mobile-toolbar">
          <div className="mobile-tools">
            {['select', 'line', 'curve', 'rect', 'circle', 'pan'].map((tool) => (
              <button
                key={tool}
                className={`mobile-tool-btn ${selectedTool === tool ? 'active' : ''}`}
                onClick={() => setSelectedTool(tool as ToolType)}
              >
                {tool === 'select' ? '↖' : tool === 'line' ? '／' : tool === 'curve' ? '〜' : tool === 'rect' ? '▢' : tool === 'circle' ? '○' : '✋'}
              </button>
            ))}
            <button className="mobile-tool-btn export-btn" onClick={() => setShowExportModal(true)}>
              ⬇
            </button>
          </div>
        </div>
      )}

      {showExportModal && (
        <ExportModal
          shapes={shapes}
          notes={notes}
          onClose={() => setShowExportModal(false)}
        />
      )}
    </div>
  );
};

export default App;
