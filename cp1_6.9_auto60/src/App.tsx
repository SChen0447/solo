import { useState, useEffect, useCallback, useRef } from 'react'
import { Socket } from 'socket.io-client'
import Canvas from './components/Canvas'
import Toolbar from './components/Toolbar'
import {
  Stroke,
  StickyNote,
  User,
  ViewState,
  COLORS,
  DEFAULT_COLOR,
  DEFAULT_THICKNESS,
  MIN_SCALE,
  MAX_SCALE,
} from './types'

interface AppProps {
  socket: Socket
}

function generateRoomId(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let result = ''
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

function generateId(): string {
  return Math.random().toString(36).substring(2, 15)
}

function getRandomName(): string {
  const names = ['用户' + Math.floor(Math.random() * 10000)]
  return names[0]
}

function App({ socket }: AppProps) {
  const [roomId, setRoomId] = useState<string>('')
  const [inputRoomId, setInputRoomId] = useState<string>('')
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [users, setUsers] = useState<User[]>([])
  const [strokes, setStrokes] = useState<Stroke[]>([])
  const [stickyNotes, setStickyNotes] = useState<StickyNote[]>([])
  const [color, setColor] = useState<string>(DEFAULT_COLOR)
  const [thickness, setThickness] = useState<number>(DEFAULT_THICKNESS)
  const [viewState, setViewState] = useState<ViewState>({
    offsetX: 0,
    offsetY: 0,
    scale: 1,
  })
  const isJoinedRef = useRef(false)

  useEffect(() => {
    const savedView = localStorage.getItem('whiteboard_view_state')
    if (savedView) {
      try {
        const parsed = JSON.parse(savedView)
        setViewState({
          offsetX: parsed.offsetX ?? 0,
          offsetY: parsed.offsetY ?? 0,
          scale: Math.min(MAX_SCALE, Math.max(MIN_SCALE, parsed.scale ?? 1)),
        })
      } catch (_e) {
        // ignore
      }
    }
  }, [])

  useEffect(() => {
    localStorage.setItem('whiteboard_view_state', JSON.stringify(viewState))
  }, [viewState])

  const createOrJoinRoom = useCallback(
    (targetRoomId?: string) => {
      if (isJoinedRef.current) return

      const finalRoomId = targetRoomId || generateRoomId()
      const user: User = {
        id: socket.id,
        name: getRandomName(),
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
      }

      setRoomId(finalRoomId)
      setCurrentUser(user)
      isJoinedRef.current = true

      socket.emit('join-room', { roomId: finalRoomId, user })
    },
    [socket]
  )

  const handleJoinRoom = () => {
    if (inputRoomId.trim().length === 6) {
      createOrJoinRoom(inputRoomId.trim().toUpperCase())
    }
  }

  useEffect(() => {
    createOrJoinRoom()

    socket.on('room-state', ({ users: roomUsers, strokes: roomStrokes, stickyNotes: notes }) => {
      setUsers(roomUsers)
      setStrokes(roomStrokes)
      setStickyNotes(notes)
    })

    socket.on('user-joined', (user: User) => {
      setUsers((prev) => [...prev, user])
    })

    socket.on('user-left', (userId: string) => {
      setUsers((prev) => prev.filter((u) => u.id !== userId))
    })

    socket.on('users-updated', (updatedUsers: User[]) => {
      setUsers(updatedUsers)
      if (currentUser) {
        const me = updatedUsers.find((u) => u.id === currentUser.id)
        if (me) setCurrentUser(me)
      }
    })

    socket.on('stroke-drawn', (stroke: Stroke) => {
      setStrokes((prev) => [...prev, stroke])
    })

    socket.on('sticky-note-added', (note: StickyNote) => {
      setStickyNotes((prev) => [...prev, note])
    })

    socket.on('sticky-note-updated', ({ noteId, updates }: { noteId: string; updates: Partial<StickyNote> }) => {
      setStickyNotes((prev) =>
        prev.map((n) => (n.id === noteId ? { ...n, ...updates } : n))
      )
    })

    socket.on('sticky-note-deleted', (noteId: string) => {
      setStickyNotes((prev) => prev.filter((n) => n.id !== noteId))
    })

    return () => {
      socket.off('room-state')
      socket.off('user-joined')
      socket.off('user-left')
      socket.off('users-updated')
      socket.off('stroke-drawn')
      socket.off('sticky-note-added')
      socket.off('sticky-note-updated')
      socket.off('sticky-note-deleted')
    }
  }, [socket, createOrJoinRoom, currentUser])

  const handleDrawStroke = useCallback(
    (points: { x: number; y: number }[]) => {
      if (!currentUser) return
      const stroke: Stroke = {
        id: generateId(),
        points,
        color,
        thickness,
        userId: currentUser.id,
      }
      setStrokes((prev) => [...prev, stroke])
      socket.emit('draw-stroke', { roomId, stroke })
    },
    [socket, roomId, color, thickness, currentUser]
  )

  const handleAddStickyNote = useCallback(
    (centerX: number, centerY: number) => {
      if (!currentUser) return
      const note: StickyNote = {
        id: generateId(),
        x: centerX - 100,
        y: centerY - 100,
        text: '',
        userId: currentUser.id,
      }
      setStickyNotes((prev) => [...prev, note])
      socket.emit('add-sticky-note', { roomId, note })
    },
    [socket, roomId, currentUser]
  )

  const handleUpdateStickyNote = useCallback(
    (noteId: string, updates: Partial<StickyNote>) => {
      setStickyNotes((prev) =>
        prev.map((n) => (n.id === noteId ? { ...n, ...updates } : n))
      )
      socket.emit('update-sticky-note', { roomId, noteId, updates })
    },
    [socket, roomId]
  )

  const handleDeleteStickyNote = useCallback(
    (noteId: string) => {
      setStickyNotes((prev) => prev.filter((n) => n.id !== noteId))
      socket.emit('delete-sticky-note', { roomId, noteId })
    },
    [socket, roomId]
  )

  useEffect(() => {
    if (currentUser && currentUser.color !== color) {
      socket.emit('update-user', { roomId, updates: { color } })
    }
  }, [color, currentUser, socket, roomId])

  return (
    <div style={styles.app}>
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <span style={styles.roomLabel}>房间ID:</span>
          <span style={styles.roomId}>{roomId}</span>
          <button style={styles.copyButton} onClick={() => navigator.clipboard?.writeText(roomId)}>
            复制
          </button>
        </div>
        <div style={styles.headerCenter}>
          <input
            style={styles.roomInput}
            placeholder="输入房间ID加入..."
            value={inputRoomId}
            maxLength={6}
            onChange={(e) => setInputRoomId(e.target.value.toUpperCase())}
            onKeyDown={(e) => e.key === 'Enter' && handleJoinRoom()}
          />
          <button style={styles.joinButton} onClick={handleJoinRoom}>
            加入房间
          </button>
        </div>
        <div style={styles.headerRight}>
          <span style={styles.userCount}>{users.length} 人在线</span>
          <div style={styles.userList}>
            {users.map((user) => (
              <div key={user.id} style={styles.userItem}>
                <div style={{ ...styles.userColorDot, backgroundColor: user.color }} />
                <span style={styles.userName}>{user.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <Canvas
        strokes={strokes}
        stickyNotes={stickyNotes}
        color={color}
        thickness={thickness}
        viewState={viewState}
        onViewStateChange={setViewState}
        onDrawStroke={handleDrawStroke}
        onUpdateStickyNote={handleUpdateStickyNote}
        onDeleteStickyNote={handleDeleteStickyNote}
      />

      <Toolbar
        color={color}
        thickness={thickness}
        onColorChange={setColor}
        onThicknessChange={setThickness}
        onAddStickyNote={handleAddStickyNote}
        viewState={viewState}
      />
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  app: {
    width: '100%',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    position: 'relative',
  },
  header: {
    height: '60px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 24px',
    backgroundColor: 'rgba(26, 26, 46, 0.95)',
    borderBottom: '1px solid rgba(255,255,255,0.1)',
    backdropFilter: 'blur(10px)',
    flexShrink: 0,
    zIndex: 100,
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  headerCenter: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  headerRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
  },
  roomLabel: {
    fontSize: '14px',
    color: '#999',
  },
  roomId: {
    fontSize: '20px',
    fontWeight: 'bold',
    letterSpacing: '3px',
    color: '#4fc3f7',
    fontFamily: 'monospace',
  },
  copyButton: {
    padding: '4px 12px',
    borderRadius: '6px',
    border: '1px solid rgba(255,255,255,0.2)',
    backgroundColor: 'rgba(255,255,255,0.05)',
    color: '#e0e0e0',
    cursor: 'pointer',
    fontSize: '12px',
    transition: 'all 0.2s ease',
  },
  roomInput: {
    padding: '8px 12px',
    borderRadius: '8px',
    border: '1px solid rgba(255,255,255,0.2)',
    backgroundColor: 'rgba(255,255,255,0.05)',
    color: '#e0e0e0',
    fontSize: '14px',
    width: '140px',
    letterSpacing: '2px',
    fontFamily: 'monospace',
    textTransform: 'uppercase',
    outline: 'none',
    transition: 'all 0.2s ease',
  },
  joinButton: {
    padding: '8px 16px',
    borderRadius: '8px',
    border: 'none',
    backgroundColor: '#4fc3f7',
    color: '#1a1a2e',
    cursor: 'pointer',
    fontWeight: '600',
    fontSize: '14px',
    transition: 'all 0.2s ease',
  },
  userCount: {
    fontSize: '14px',
    color: '#999',
  },
  userList: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  userItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  userColorDot: {
    width: '12px',
    height: '12px',
    borderRadius: '50%',
    border: '2px solid rgba(255,255,255,0.3)',
  },
  userName: {
    fontSize: '13px',
    color: '#e0e0e0',
  },
}

export default App
