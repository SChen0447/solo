import { useReducer, useEffect, useRef, useCallback } from 'react'
import Canvas from './components/Canvas'
import Palette from './components/Palette'
import UserList from './components/UserList'
import Timeline from './components/Timeline'
import {
  GRID_SIZE,
  CANDY_COLORS,
  AppState,
  AppAction,
  PixelUpdate,
  User
} from './types'

const initialState: AppState = {
  grid: new Array(GRID_SIZE * GRID_SIZE).fill(''),
  selectedColor: CANDY_COLORS[0],
  users: [],
  currentUser: null,
  isPlaying: false,
  playbackTime: Date.now(),
  startTime: Date.now() - 30 * 60 * 1000,
  hoveredCell: null,
  paletteCollapsed: false,
  recentPixels: new Map()
}

function reducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SET_GRID':
      return { ...state, grid: action.grid }
    case 'SET_PIXEL': {
      const newGrid = [...state.grid]
      const idx = action.y * GRID_SIZE + action.x
      newGrid[idx] = action.color
      return { ...state, grid: newGrid }
    }
    case 'SELECT_COLOR':
      return { ...state, selectedColor: action.color }
    case 'SET_USERS':
      return { ...state, users: action.users.sort((a, b) => b.joinedAt - a.joinedAt) }
    case 'ADD_USER':
      return {
        ...state,
        users: [action.user, ...state.users.filter(u => u.id !== action.user.id)]
      }
    case 'REMOVE_USER':
      return { ...state, users: state.users.filter(u => u.id !== action.userId) }
    case 'SET_CURRENT_USER':
      return { ...state, currentUser: action.user }
    case 'SET_HOVERED':
      return { ...state, hoveredCell: action.cell }
    case 'TOGGLE_PALETTE':
      return { ...state, paletteCollapsed: !state.paletteCollapsed }
    case 'SET_PLAYBACK':
      return { ...state, playbackTime: action.time }
    case 'SET_PLAYING':
      return { ...state, isPlaying: action.playing }
    case 'SET_START_TIME':
      return { ...state, startTime: action.time }
    case 'ADD_RECENT_PIXEL': {
      const newRecent = new Map(state.recentPixels)
      newRecent.set(action.key, action.time)
      return { ...state, recentPixels: newRecent }
    }
    case 'CLEAN_RECENT_PIXELS': {
      const newRecent = new Map<string, number>()
      for (const [key, time] of state.recentPixels) {
        if (action.now - time < 300) {
          newRecent.set(key, time)
        }
      }
      return { ...state, recentPixels: newRecent }
    }
    default:
      return state
  }
}

export default function App() {
  const [state, dispatch] = useReducer(reducer, initialState)
  const wsRef = useRef<WebSocket | null>(null)
  const useMock = useRef(false)
  const mockHistory = useRef<PixelUpdate[]>([])

  const sendPixel = useCallback((x: number, y: number, color: string) => {
    if (useMock.current) {
      const delay = 500 + Math.random() * 500
      setTimeout(() => {
        const update: PixelUpdate = {
          x, y, color,
          userId: state.currentUser?.id || 'local',
          timestamp: Date.now()
        }
        mockHistory.current.push(update)
        dispatch({ type: 'SET_PIXEL', x, y, color })
        dispatch({ type: 'ADD_RECENT_PIXEL', key: `${x},${y}`, time: Date.now() })
      }, delay)
    } else if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'pixel', x, y, color }))
    }
  }, [state.currentUser])

  const handleDownload = useCallback(() => {
    const canvas = document.createElement('canvas')
    canvas.width = GRID_SIZE
    canvas.height = GRID_SIZE
    const ctx = canvas.getContext('2d')!
    for (let y = 0; y < GRID_SIZE; y++) {
      for (let x = 0; x < GRID_SIZE; x++) {
        const color = state.grid[y * GRID_SIZE + x]
        if (color) {
          ctx.fillStyle = color
          ctx.fillRect(x, y, 1, 1)
        }
      }
    }
    const link = document.createElement('a')
    link.download = `pixel-place-${Date.now()}.png`
    link.href = canvas.toDataURL('image/png')
    link.click()
  }, [state.grid])

  useEffect(() => {
    const mockUserId = 'local-user-' + Math.random().toString(36).slice(2, 8)
    const mockUser: User = {
      id: mockUserId,
      name: '本地用户',
      color: CANDY_COLORS[Math.floor(Math.random() * CANDY_COLORS.length)],
      joinedAt: Date.now()
    }
    dispatch({ type: 'SET_CURRENT_USER', user: mockUser })
    dispatch({ type: 'SET_USERS', users: [mockUser] })
    dispatch({ type: 'SET_START_TIME', time: Date.now() - 30 * 60 * 1000 })
    dispatch({ type: 'SET_PLAYBACK', time: Date.now() })

    const wsUrl = `ws://${window.location.host}/ws`
    try {
      const ws = new WebSocket(wsUrl)
      wsRef.current = ws

      ws.onopen = () => {
        console.log('[WS] Connected')
        useMock.current = false
      }

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data)
          switch (msg.type) {
            case 'init':
              dispatch({ type: 'SET_GRID', grid: msg.grid })
              dispatch({ type: 'SET_CURRENT_USER', user: msg.user })
              dispatch({ type: 'SET_USERS', users: msg.users })
              dispatch({ type: 'SET_START_TIME', time: msg.startTime })
              dispatch({ type: 'SET_PLAYBACK', time: Date.now() })
              break
            case 'pixel':
              dispatch({ type: 'SET_PIXEL', x: msg.x, y: msg.y, color: msg.color })
              dispatch({ type: 'ADD_RECENT_PIXEL', key: `${msg.x},${msg.y}`, time: Date.now() })
              break
            case 'user_join':
              dispatch({ type: 'ADD_USER', user: msg.user })
              break
            case 'user_leave':
              dispatch({ type: 'REMOVE_USER', userId: msg.userId })
              break
          }
        } catch (e) {
          console.error('[WS] Parse error:', e)
        }
      }

      ws.onerror = () => {
        console.log('[WS] Connection failed, using mock mode')
        useMock.current = true
      }

      ws.onclose = () => {
        console.log('[WS] Disconnected, using mock mode')
        useMock.current = true
      }
    } catch {
      useMock.current = true
    }

    return () => {
      wsRef.current?.close()
    }
  }, [])

  useEffect(() => {
    const interval = setInterval(() => {
      dispatch({ type: 'CLEAN_RECENT_PIXELS', now: Date.now() })
    }, 500)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="app-container">
      <div className="main-content">
        <div className="sidebar">
          <Palette
            colors={CANDY_COLORS}
            selectedColor={state.selectedColor}
            collapsed={state.paletteCollapsed}
            onSelect={(color) => dispatch({ type: 'SELECT_COLOR', color })}
            onToggle={() => dispatch({ type: 'TOGGLE_PALETTE' })}
          />
          <UserList users={state.users} currentUserId={state.currentUser?.id} />
        </div>
        <div className="canvas-wrapper glass">
          <Canvas
            grid={state.grid}
            selectedColor={state.selectedColor}
            hoveredCell={state.hoveredCell}
            recentPixels={state.recentPixels}
            onPixelClick={sendPixel}
            onHover={(cell) => dispatch({ type: 'SET_HOVERED', cell })}
          />
        </div>
      </div>
      <div className="bottom-bar glass">
        <div className="status-indicator">
          <span className="status-dot" />
          <span>{useMock.current ? '单机模式' : '已连接'}</span>
        </div>
        <Timeline
          startTime={state.startTime}
          currentTime={state.playbackTime}
          isPlaying={state.isPlaying}
          onTimeChange={(time) => dispatch({ type: 'SET_PLAYBACK', time })}
          onPlayToggle={() => dispatch({ type: 'SET_PLAYING', playing: !state.isPlaying })}
        />
        <button className="download-btn" onClick={handleDownload}>
          保存 PNG
        </button>
      </div>
    </div>
  )
}
