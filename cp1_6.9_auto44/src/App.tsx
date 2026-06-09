import { useState, useEffect, useRef, useCallback, createContext, useContext } from 'react';
import { io, Socket } from 'socket.io-client';
import Sequencer from './Sequencer';
import TrackPanel from './TrackPanel';
import { Note, Track, User, AppView } from './types';

interface SocketContextType {
  socket: Socket | null;
  userId: string | null;
  roomId: string | null;
  trackIndex: number;
  color: string;
  users: User[];
  tracks: Track[];
  bpm: number;
  setBpm: (bpm: number) => void;
  updateTrack: (trackId: number, data: { volume?: number; muted?: boolean }) => void;
  addNote: (note: Omit<Note, 'id' | 'trackId'>) => void;
  updateNote: (noteId: string, changes: Partial<Note>) => void;
  deleteNote: (noteId: string) => void;
  updateCursor: (x: number, y: number) => void;
  noteOn: (pitch: string) => void;
  noteOff: () => void;
}

const SocketContext = createContext<SocketContextType | null>(null);

export const useSocket = () => {
  const ctx = useContext(SocketContext);
  if (!ctx) throw new Error('useSocket must be used within SocketProvider');
  return ctx;
};

function App() {
  const [view, setView] = useState<AppView>('lobby');
  const [socket, setSocket] = useState<Socket | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [roomId, setRoomId] = useState<string | null>(null);
  const [trackIndex, setTrackIndex] = useState<number>(-1);
  const [color, setColor] = useState<string>('#ffffff');
  const [users, setUsers] = useState<User[]>([]);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [bpm, setBpmState] = useState<number>(120);
  const [windowWidth, setWindowWidth] = useState<number>(typeof window !== 'undefined' ? window.innerWidth : 1200);

  const [roomInput, setRoomInput] = useState<string>('');
  const [userName, setUserName] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [isConnecting, setIsConnecting] = useState<boolean>(false);

  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const initSocket = useCallback(() => {
    if (socketRef.current) return socketRef.current;
    const newSocket = io('http://localhost:3001', {
      transports: ['websocket', 'polling']
    });
    socketRef.current = newSocket;
    setSocket(newSocket);
    return newSocket;
  }, []);

  const handleCreateRoom = () => {
    setError('');
    setIsConnecting(true);
    const s = initSocket();
    s.emit('create-room', { isPublic: false }, (res: any) => {
      if (res.success) {
        joinExistingRoom(res.roomId);
      } else {
        setError(res.error || '创建房间失败');
        setIsConnecting(false);
      }
    });
  };

  const handleJoinRoom = () => {
    if (!roomInput.trim()) {
      setError('请输入房间ID');
      return;
    }
    setError('');
    setIsConnecting(true);
    joinExistingRoom(roomInput.trim().toUpperCase());
  };

  const handleRandomMatch = () => {
    setError('');
    setIsConnecting(true);
    const s = initSocket();
    s.emit('join-room', { randomMatch: true, userName: userName || undefined }, handleJoinResponse);
  };

  const joinExistingRoom = (id: string) => {
    const s = initSocket();
    s.emit('join-room', { roomId: id, userName: userName || undefined }, handleJoinResponse);
  };

  const handleJoinResponse = (res: any) => {
    setIsConnecting(false);
    if (res.success) {
      setUserId(res.userId);
      setRoomId(res.roomId);
      setTrackIndex(res.trackIndex);
      setColor(res.color);
      setUsers(res.users);
      setTracks(res.tracks);
      setBpmState(res.bpm);
      setView('sequencer');
      setupSocketListeners(socketRef.current!);
    } else {
      setError(res.error || '加入房间失败');
    }
  };

  const setupSocketListeners = (s: Socket) => {
    s.on('user-joined', (data: any) => {
      setUsers(prev => [...prev, data.user]);
    });

    s.on('user-left', (data: any) => {
      setUsers(prev => prev.filter(u => u.id !== data.userId));
      setTracks(prev => prev.map(t =>
        t.id === data.trackIndex ? { ...t, userId: null, notes: [] } : t
      ));
    });

    s.on('note-added', (data: any) => {
      setTracks(prev => prev.map(t =>
        t.id === data.note.trackId
          ? { ...t, notes: [...t.notes, data.note] }
          : t
      ));
    });

    s.on('note-updated', (data: any) => {
      setTracks(prev => prev.map(t =>
        t.id === data.trackId
          ? { ...t, notes: t.notes.map(n => n.id === data.noteId ? { ...n, ...data.changes } : n) }
          : t
      ));
    });

    s.on('note-deleted', (data: any) => {
      setTracks(prev => prev.map(t =>
        t.id === data.trackId
          ? { ...t, notes: t.notes.filter(n => n.id !== data.noteId) }
          : t
      ));
    });

    s.on('cursor-updated', (data: any) => {
      setUsers(prev => prev.map(u =>
        u.id === data.userId ? { ...u, cursorX: data.x, cursorY: data.y } : u
      ));
    });

    s.on('bpm-updated', (data: any) => {
      setBpmState(data.bpm);
    });

    s.on('track-updated', (data: any) => {
      setTracks(prev => prev.map(t =>
        t.id === data.trackId
          ? { ...t, volume: data.volume ?? t.volume, muted: data.muted ?? t.muted }
          : t
      ));
    });

    s.on('note-on', (data: any) => {
      setUsers(prev => prev.map(u =>
        u.id === data.userId ? { ...u, currentNote: { pitch: data.pitch, startTime: data.time } } : u
      ));
    });
  };

  const setBpm = useCallback((newBpm: number) => {
    setBpmState(newBpm);
    if (socketRef.current) {
      socketRef.current.emit('update-bpm', { bpm: newBpm });
    }
  }, []);

  const updateTrack = useCallback((trackId: number, data: { volume?: number; muted?: boolean }) => {
    setTracks(prev => prev.map(t =>
      t.id === trackId
        ? { ...t, volume: data.volume ?? t.volume, muted: data.muted ?? t.muted }
        : t
    ));
    if (socketRef.current) {
      socketRef.current.emit('update-track', { trackId, ...data });
    }
  }, []);

  const addNote = useCallback((note: Omit<Note, 'id' | 'trackId'>) => {
    if (socketRef.current) {
      socketRef.current.emit('add-note', { note });
    }
  }, []);

  const updateNote = useCallback((noteId: string, changes: Partial<Note>) => {
    setTracks(prev => prev.map(t =>
      t.id === trackIndex
        ? { ...t, notes: t.notes.map(n => n.id === noteId ? { ...n, ...changes } : n) }
        : t
    ));
    if (socketRef.current) {
      socketRef.current.emit('update-note', { noteId, changes });
    }
  }, [trackIndex]);

  const deleteNote = useCallback((noteId: string) => {
    setTracks(prev => prev.map(t =>
      t.id === trackIndex
        ? { ...t, notes: t.notes.filter(n => n.id !== noteId) }
        : t
    ));
    if (socketRef.current) {
      socketRef.current.emit('delete-note', { noteId });
    }
  }, [trackIndex]);

  const updateCursor = useCallback((x: number, y: number) => {
    if (socketRef.current) {
      socketRef.current.emit('update-cursor', { x, y });
    }
  }, []);

  const noteOn = useCallback((pitch: string) => {
    if (socketRef.current) {
      socketRef.current.emit('note-on', { pitch });
    }
  }, []);

  const noteOff = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.emit('note-off', {});
    }
  }, []);

  const contextValue: SocketContextType = {
    socket,
    userId,
    roomId,
    trackIndex,
    color,
    users,
    tracks,
    bpm,
    setBpm,
    updateTrack,
    addNote,
    updateNote,
    deleteNote,
    updateCursor,
    noteOn,
    noteOff
  };

  if (windowWidth < 1024) {
    return (
      <div style={{
        width: '100vw',
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#1a1a2e',
        color: '#ff4757',
        fontSize: '18px',
        textAlign: 'center',
        padding: '20px'
      }}>
        <div>
          <div style={{ fontSize: '48px', marginBottom: '20px' }}>⚠️</div>
          <div>屏幕宽度不足 1024px</div>
          <div style={{ marginTop: '10px', fontSize: '14px', color: '#888' }}>
            请使用更宽的屏幕或放大窗口以使用本应用
          </div>
        </div>
      </div>
    );
  }

  if (view === 'lobby') {
    return (
      <div style={{
        width: '100vw',
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)'
      }}>
        <div style={{
          background: 'rgba(22, 33, 62, 0.8)',
          backdropFilter: 'blur(10px)',
          borderRadius: '16px',
          padding: '48px',
          minWidth: '420px',
          border: '1px solid rgba(0, 212, 255, 0.2)',
          boxShadow: '0 0 40px rgba(0, 212, 255, 0.1)'
        }}>
          <h1 style={{
            color: '#00d4ff',
            fontSize: '32px',
            marginBottom: '8px',
            textAlign: 'center',
            letterSpacing: '2px'
          }}>
            MUSIC JAM
          </h1>
          <p style={{ color: '#8892b0', textAlign: 'center', marginBottom: '36px', fontSize: '14px' }}>
            协作式音乐即兴创作沙盒
          </p>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', color: '#a8b2d1', fontSize: '13px', marginBottom: '8px' }}>
              昵称（可选）
            </label>
            <input
              type="text"
              value={userName}
              onChange={e => setUserName(e.target.value)}
              placeholder="输入你的昵称"
              style={{
                width: '100%',
                padding: '12px 16px',
                background: 'rgba(15, 52, 96, 0.5)',
                border: '1px solid rgba(0, 212, 255, 0.3)',
                borderRadius: '8px',
                color: '#e0e0e0',
                fontSize: '14px',
                outline: 'none'
              }}
            />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', color: '#a8b2d1', fontSize: '13px', marginBottom: '8px' }}>
              房间 ID
            </label>
            <input
              type="text"
              value={roomInput}
              onChange={e => setRoomInput(e.target.value.toUpperCase())}
              placeholder="输入房间ID加入房间"
              style={{
                width: '100%',
                padding: '12px 16px',
                background: 'rgba(15, 52, 96, 0.5)',
                border: '1px solid rgba(0, 212, 255, 0.3)',
                borderRadius: '8px',
                color: '#e0e0e0',
                fontSize: '14px',
                outline: 'none',
                letterSpacing: '3px',
                textTransform: 'uppercase'
              }}
            />
          </div>

          {error && (
            <div style={{
              color: '#ff4757',
              fontSize: '13px',
              marginBottom: '16px',
              padding: '10px',
              background: 'rgba(255, 71, 87, 0.1)',
              borderRadius: '6px',
              textAlign: 'center'
            }}>
              {error}
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <button
              onClick={handleJoinRoom}
              disabled={isConnecting}
              style={{
                padding: '14px',
                background: 'linear-gradient(90deg, #00d4ff, #0099cc)',
                border: 'none',
                borderRadius: '8px',
                color: '#1a1a2e',
                fontSize: '15px',
                fontWeight: 600,
                cursor: isConnecting ? 'not-allowed' : 'pointer',
                opacity: isConnecting ? 0.6 : 1,
                transition: 'all 0.2s'
              }}
            >
              加入房间
            </button>
            <button
              onClick={handleCreateRoom}
              disabled={isConnecting}
              style={{
                padding: '14px',
                background: 'transparent',
                border: '1px solid rgba(0, 212, 255, 0.5)',
                borderRadius: '8px',
                color: '#00d4ff',
                fontSize: '15px',
                cursor: isConnecting ? 'not-allowed' : 'pointer',
                opacity: isConnecting ? 0.6 : 1,
                transition: 'all 0.2s'
              }}
            >
              创建新房间
            </button>
            <button
              onClick={handleRandomMatch}
              disabled={isConnecting}
              style={{
                padding: '14px',
                background: 'transparent',
                border: '1px solid rgba(46, 213, 115, 0.5)',
                borderRadius: '8px',
                color: '#2ed573',
                fontSize: '15px',
                cursor: isConnecting ? 'not-allowed' : 'pointer',
                opacity: isConnecting ? 0.6 : 1,
                transition: 'all 0.2s'
              }}
            >
              随机匹配
            </button>
          </div>

          <div style={{
            marginTop: '32px',
            paddingTop: '24px',
            borderTop: '1px solid rgba(255,255,255,0.05)',
            fontSize: '12px',
            color: '#5a6a8a',
            lineHeight: '1.8'
          }}>
            <div>🎹 键盘快捷键：A S D F G H J = C4-B4</div>
            <div>👆 鼠标点击虚拟键盘演奏</div>
            <div>✏️ 拖动音符调整位置和时长</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <SocketContext.Provider value={contextValue}>
      <div style={{
        width: '100vw',
        height: '100vh',
        display: 'flex',
        background: '#1a1a2e'
      }}>
        <div style={{ flex: 2, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          <Sequencer />
        </div>
        <div style={{
          width: '33%',
          minWidth: '320px',
          borderLeft: '1px solid rgba(0, 212, 255, 0.15)',
          display: 'flex',
          flexDirection: 'column'
        }}>
          <TrackPanel />
        </div>
      </div>
    </SocketContext.Provider>
  );
}

export default App;
