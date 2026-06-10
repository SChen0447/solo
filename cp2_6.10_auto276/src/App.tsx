import { useState, useCallback, useEffect, useMemo } from 'react'
import { v4 as uuidv4 } from 'uuid'
import FloorPlan from './components/FloorPlan'
import DetailPanel from './components/DetailPanel'
import { Room, Pin, HistoryState, ToolType, Exhibit } from './types'
import { sampleRooms, createSamplePins, PALETTE } from './utils/sampleData'
import { greedyNearestNeighbor } from './utils/pathfinding'

const MAX_HISTORY = 50

function App() {
  const initialRooms = useMemo(() => sampleRooms, [])
  const initialPins = useMemo(() => createSamplePins(initialRooms), [initialRooms])

  const [rooms, setRooms] = useState<Room[]>(initialRooms)
  const [pins, setPins] = useState<Pin[]>(initialPins)
  const [history, setHistory] = useState<HistoryState[]>([{ rooms: initialRooms, pins: initialPins }])
  const [historyIndex, setHistoryIndex] = useState(0)

  const [selectedPinId, setSelectedPinId] = useState<string | null>(null)
  const [tool, setTool] = useState<ToolType>('select')
  const [searchQuery, setSearchQuery] = useState('')
  const [routePinIds, setRoutePinIds] = useState<string[]>([])
  const [routeExpanded, setRouteExpanded] = useState(false)
  const [pathPoints, setPathPoints] = useState<{ x: number; y: number }[]>([])
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [showExportModal, setShowExportModal] = useState(false)
  const [exportJson, setExportJson] = useState('')

  const pushHistory = useCallback((newRooms: Room[], newPins: Pin[]) => {
    setHistory(prev => {
      const trimmed = prev.slice(0, historyIndex + 1)
      const next = [...trimmed, { rooms: newRooms, pins: newPins }]
      if (next.length > MAX_HISTORY) {
        return next.slice(next.length - MAX_HISTORY)
      }
      return next
    })
    setHistoryIndex(prev => Math.min(prev + 1, MAX_HISTORY - 1))
  }, [historyIndex])

  const updateState = useCallback((newRooms: Room[], newPins: Pin[]) => {
    setRooms(newRooms)
    setPins(newPins)
    pushHistory(newRooms, newPins)
  }, [pushHistory])

  const undo = useCallback(() => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1
      setHistoryIndex(newIndex)
      setRooms(history[newIndex].rooms)
      setPins(history[newIndex].pins)
    }
  }, [historyIndex, history])

  const redo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1
      setHistoryIndex(newIndex)
      setRooms(history[newIndex].rooms)
      setPins(history[newIndex].pins)
    }
  }, [historyIndex, history])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !e.shiftKey) {
        e.preventDefault()
        undo()
      }
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'z') {
        e.preventDefault()
        redo()
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault()
        redo()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [undo, redo])

  const addRoom = useCallback((x: number, y: number, width: number, height: number) => {
    const newRoom: Room = {
      id: uuidv4(),
      name: '新展厅',
      x,
      y,
      width,
      height,
      bgColor: PALETTE[Math.floor(Math.random() * PALETTE.length)],
    }
    updateState([...rooms, newRoom], pins)
  }, [rooms, pins, updateState])

  const updateRoom = useCallback((id: string, updates: Partial<Room>) => {
    const newRooms = rooms.map(r => r.id === id ? { ...r, ...updates } : r)
    updateState(newRooms, pins)
  }, [rooms, pins, updateState])

  const deleteRoom = useCallback((id: string) => {
    const newRooms = rooms.filter(r => r.id !== id)
    const newPins = pins.filter(p => p.roomId !== id)
    updateState(newRooms, newPins)
    setRoutePinIds(prev => prev.filter(pid => newPins.some(p => p.id === pid)))
  }, [rooms, pins, updateState])

  const addPin = useCallback((roomId: string, x: number, y: number) => {
    const randomColors = [
      { s: '#4a6fa5', e: '#7b9fd4', t: '#5a8fc4' },
      { s: '#8b5a3c', e: '#c48b6a', t: '#a47254' },
      { s: '#6b5b95', e: '#9e8ec9', t: '#8575ad' },
      { s: '#2c6e6e', e: '#5ab8b8', t: '#42a0a0' },
      { s: '#1e3a5f', e: '#4a7ab0', t: '#345a88' },
      { s: '#8b2500', e: '#c9543a', t: '#aa3a20' },
    ]
    const c = randomColors[Math.floor(Math.random() * randomColors.length)]
    const exhibit: Exhibit = {
      id: uuidv4(),
      name: '新藏品',
      era: '未知',
      material: '未知',
      size: '未知',
      description: '请编辑藏品描述。',
      thumbnailColor: c.t,
      gradientStart: c.s,
      gradientEnd: c.e,
    }
    const newPin: Pin = {
      id: uuidv4(),
      roomId,
      x,
      y,
      exhibit,
    }
    updateState(rooms, [...pins, newPin])
  }, [rooms, pins, updateState])

  const movePin = useCallback((id: string, x: number, y: number) => {
    const newPins = pins.map(p => p.id === id ? { ...p, x, y } : p)
    setPins(newPins)
  }, [pins])

  const commitMovePin = useCallback((id: string, x: number, y: number) => {
    const newPins = pins.map(p => p.id === id ? { ...p, x, y } : p)
    updateState(rooms, newPins)
  }, [rooms, pins, updateState])

  const selectedPin = pins.find(p => p.id === selectedPinId) || null

  const toggleRoutePin = useCallback((pinId: string) => {
    setRoutePinIds(prev =>
      prev.includes(pinId) ? prev.filter(id => id !== pinId) : [...prev, pinId]
    )
  }, [])

  const moveRouteItem = useCallback((index: number, direction: 'up' | 'down') => {
    setRoutePinIds(prev => {
      if (direction === 'up' && index === 0) return prev
      if (direction === 'down' && index === prev.length - 1) return prev
      const arr = [...prev]
      const target = direction === 'up' ? index - 1 : index + 1
      ;[arr[index], arr[target]] = [arr[target], arr[index]]
      return arr
    })
  }, [])

  const generatePath = useCallback(() => {
    if (routePinIds.length < 2) return
    const points = routePinIds
      .map(id => pins.find(p => p.id === id))
      .filter(Boolean)
      .map(p => ({ x: p!.x, y: p!.y }))
    const order = greedyNearestNeighbor(points)
    const sorted = order.map(i => points[i])
    setPathPoints(sorted)
    setTimeout(() => setPathPoints([]), 4000)
  }, [routePinIds, pins])

  const handleExport = useCallback(() => {
    const data = {
      rooms,
      pins: pins.map(p => ({
        id: p.id,
        roomId: p.roomId,
        x: p.x,
        y: p.y,
        exhibit: p.exhibit,
      })),
      exportedAt: new Date().toISOString(),
    }
    const json = JSON.stringify(data, null, 2)
    setExportJson(json)
    setShowExportModal(true)
    navigator.clipboard?.writeText(json).catch(() => {})
  }, [rooms, pins])

  const canUndo = historyIndex > 0
  const canRedo = historyIndex < history.length - 1

  return (
    <div className="app">
      <header className="topbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div className="history-btns">
            <button
              className="btn btn-ghost btn-icon"
              onClick={undo}
              disabled={!canUndo}
              title="撤销 (Ctrl+Z)"
              style={{ color: canUndo ? '#f8fafc' : '#64748b' }}
            >
              ↶
            </button>
            <button
              className="btn btn-ghost btn-icon"
              onClick={redo}
              disabled={!canRedo}
              title="重做 (Ctrl+Shift+Z)"
              style={{ color: canRedo ? '#f8fafc' : '#64748b' }}
            >
              ⇧
            </button>
          </div>
          <span className="topbar-title">虚拟策展台</span>
        </div>
        <div className="topbar-right">
          <input
            className="search-box"
            type="text"
            placeholder="搜索藏品或展厅..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
          <button className="btn btn-primary" onClick={handleExport}>
            导出
          </button>
        </div>
      </header>

      <main className="main">
        <section className="canvas-area">
          <FloorPlan
            rooms={rooms}
            pins={pins}
            selectedPinId={selectedPinId}
            onSelectPin={setSelectedPinId}
            tool={tool}
            onToolChange={setTool}
            searchQuery={searchQuery}
            onAddRoom={addRoom}
            onUpdateRoom={updateRoom}
            onDeleteRoom={deleteRoom}
            onAddPin={addPin}
            onMovePin={movePin}
            onCommitMovePin={commitMovePin}
            pathPoints={pathPoints}
          />
        </section>

        <aside className={`sidebar ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
          {!sidebarCollapsed ? (
            <>
              <button
                className="sidebar-toggle"
                onClick={() => setSidebarCollapsed(true)}
                title="收起详情"
              >
                ›
              </button>
              <div className="sidebar-content">
                <DetailPanel
                  pin={selectedPin}
                  isInRoute={selectedPinId ? routePinIds.includes(selectedPinId) : false}
                  onToggleRoute={toggleRoutePin}
                />
              </div>
            </>
          ) : (
            <button
              className="sidebar-toggle"
              onClick={() => setSidebarCollapsed(false)}
              title="展开详情"
              style={{
                position: 'absolute',
                left: 0,
                top: '50%',
                transform: 'translateY(-50%)',
                border: '1px solid #e2e8f0',
                borderLeft: 'none',
                borderRadius: '0 8px 8px 0',
              }}
            >
              ‹
            </button>
          )}
          {sidebarCollapsed && <div className="sidebar-indicator" />}
        </aside>
      </main>

      <div className="route-toolbar">
        {!routeExpanded ? (
          <button className="route-badge" onClick={() => setRouteExpanded(true)}>
            路线（{routePinIds.length}）
          </button>
        ) : (
          <>
            <button className="route-badge" onClick={() => setRouteExpanded(false)}>
              路线（{routePinIds.length}）
            </button>
            <div className="route-list">
              {routePinIds.length === 0 && (
                <span style={{ color: '#94a3b8', fontSize: 12, padding: '0 8px' }}>
                  点击藏品详情的"添加至观展路线"开始收藏
                </span>
              )}
              {routePinIds.map((pinId, index) => {
                const pin = pins.find(p => p.id === pinId)
                if (!pin) return null
                return (
                  <div key={pinId} className="route-item">
                    <div
                      className="route-item-thumb"
                      style={{ background: pin.exhibit.thumbnailColor }}
                    />
                    <span className="route-item-name">{pin.exhibit.name}</span>
                    <div className="route-item-controls">
                      <button
                        className="route-arrow"
                        onClick={() => moveRouteItem(index, 'up')}
                        disabled={index === 0}
                      >
                        ▲
                      </button>
                      <button
                        className="route-arrow"
                        onClick={() => moveRouteItem(index, 'down')}
                        disabled={index === routePinIds.length - 1}
                      >
                        ▼
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
            <button
              className="generate-path-btn"
              onClick={generatePath}
              disabled={routePinIds.length < 2}
            >
              生成导览路径
            </button>
          </>
        )}
      </div>

      {showExportModal && (
        <div className="modal-overlay" onClick={() => setShowExportModal(false)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <div className="modal-icon">📦</div>
            <div className="modal-title">导出成功！</div>
            <div className="modal-desc">展厅布局数据已复制到剪贴板</div>
            <div className="modal-data">{exportJson}</div>
            <div className="modal-actions">
              <button
                className="btn btn-primary"
                onClick={() => {
                  navigator.clipboard?.writeText(exportJson)
                }}
              >
                重新复制
              </button>
              <button className="btn btn-dark" onClick={() => setShowExportModal(false)}>
                关闭
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
