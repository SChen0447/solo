import { useState, useCallback, useMemo } from 'react'
import { v4 as uuidv4 } from 'uuid'
import type { Guest, Seat, CheckInModalState, PulsingSeat, ExportData } from './types'
import GuestList from './GuestList'
import SeatGrid from './SeatGrid'

const ROWS = 8
const COLS = 10

const AVATARS = ['🐱', '🐶', '🦊', '🐼', '🐨', '🐯', '🦁', '🐮', '🐷', '🐸', '🐵', '🐔', '🐧', '🐦', '🦄', '🐙', '🦋', '🐢', '🐝', '🌸']

const NAMES = [
  '喵小萌', '汪大星', '狐尼克', '潘达达', '考拉奇',
  '虎小啸', '狮里昂', '牛哞哞', '猪滚滚', '蛙呱呱',
  '孙小空', '鸡咯咯', '企鹅企', '鸟飞飞', '独角兽',
  '章鱼丸', '蝶翩翩', '龟慢慢', '蜜蜂蜂', '花朵朵',
  '张三', '李四', '王五', '赵六', '陈七',
  '周八', '吴九', '郑十', '钱多多', '孙小美'
]

const createInitialGuests = (): Guest[] => {
  return NAMES.slice(0, 20).map((name, idx) => ({
    id: uuidv4(),
    name,
    avatar: AVATARS[idx % AVATARS.length],
    assigned: false,
  }))
}

const createInitialSeats = (): Seat[][] => {
  const grid: Seat[][] = []
  for (let r = 0; r < ROWS; r++) {
    const row: Seat[] = []
    for (let c = 0; c < COLS; c++) {
      row.push({
        row: r,
        col: c,
        guestId: null,
        checkedIn: false,
      })
    }
    grid.push(row)
  }
  return grid
}

export default function App() {
  const [guests, setGuests] = useState<Guest[]>(createInitialGuests)
  const [seats, setSeats] = useState<Seat[][]>(createInitialSeats)
  const [checkInMode, setCheckInMode] = useState(false)
  const [checkInModal, setCheckInModal] = useState<CheckInModalState>({
    visible: false,
    row: -1,
    col: -1,
  })
  const [pulsingSeats, setPulsingSeats] = useState<PulsingSeat[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [showDropHint, setShowDropHint] = useState(false)

  const stats = useMemo(() => {
    let occupied = 0
    let checkedIn = 0
    const total = ROWS * COLS
    for (const row of seats) {
      for (const seat of row) {
        if (seat.guestId) occupied++
        if (seat.checkedIn) checkedIn++
      }
    }
    return { total, occupied, checkedIn }
  }, [seats])

  const handleConfirmAssign = useCallback((guestId: string, row: number, col: number) => {
    setGuests((prev) =>
      prev.map((g) => (g.id === guestId ? { ...g, assigned: true } : g))
    )
    setSeats((prev) => {
      const next = prev.map((r) => r.map((s) => ({ ...s })))
      next[row][col].guestId = guestId
      return next
    })
  }, [])

  const handleSeatClick = useCallback((row: number, col: number) => {
    const seat = seats[row][col]
    if (!seat.guestId) return
    setCheckInModal({ visible: true, row, col })
  }, [seats])

  const handleCheckInConfirm = useCallback(() => {
    const { row, col } = checkInModal
    if (row < 0 || col < 0) return

    setSeats((prev) => {
      const next = prev.map((r) => r.map((s) => ({ ...s })))
      next[row][col].checkedIn = true
      return next
    })

    setPulsingSeats((prev) => [...prev, { row, col }])
    setTimeout(() => {
      setPulsingSeats((prev) => prev.filter((s) => !(s.row === row && s.col === col)))
    }, 1500)

    setCheckInModal({ visible: false, row: -1, col: -1 })
  }, [checkInModal])

  const handleCheckInClose = useCallback(() => {
    setCheckInModal({ visible: false, row: -1, col: -1 })
  }, [])

  const getGuestById = (id: string | null) => guests.find((g) => g.id === id)

  const handleExport = useCallback(() => {
    const data: ExportData = {
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      guests,
      seats,
      gridConfig: { rows: ROWS, cols: COLS },
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `活动座位布局_${new Date().toISOString().slice(0, 10)}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }, [guests, seats])

  const handleImportData = useCallback(async (file: File) => {
    setIsLoading(true)
    try {
      const text = await file.text()
      const data = JSON.parse(text) as ExportData
      if (data.guests && data.seats) {
        setGuests(data.guests)
        setSeats(data.seats)
      }
    } catch (err) {
      console.error('导入失败:', err)
      alert('导入失败，请检查文件格式')
    } finally {
      setTimeout(() => setIsLoading(false), 300)
    }
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    if (e.dataTransfer.types.includes('Files')) {
      setShowDropHint(true)
    }
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    if (e.clientX === 0 && e.clientY === 0) {
      setShowDropHint(false)
    }
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setShowDropHint(false)
    const files = e.dataTransfer.files
    if (files.length > 0 && files[0].type === 'application/json') {
      handleImportData(files[0])
    } else if (files.length > 0) {
      alert('请拖拽JSON格式的布局文件')
    }
  }, [handleImportData])

  const checkInSeatGuest = checkInModal.visible
    ? getGuestById(seats[checkInModal.row]?.[checkInModal.col]?.guestId ?? null)
    : null

  return (
    <div
      className="app"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <header className="header">
        <h1>活动座位管家</h1>
        <div className="header-right">
          <div
            className="checkin-toggle"
            onClick={() => setCheckInMode((v) => !v)}
          >
            <span>签到模式</span>
            <div className={`switch${checkInMode ? ' active' : ''}`}>
              <div className="switch-knob" />
            </div>
          </div>
          <button className="export-btn" onClick={handleExport}>
            导出布局
          </button>
        </div>
      </header>

      <main className="main-content">
        <GuestList guests={guests} onDragStart={() => {}} />
        <div className="grid-section">
          <SeatGrid
            seats={seats}
            guests={guests}
            checkInMode={checkInMode}
            pulsingSeats={pulsingSeats}
            onConfirmAssign={handleConfirmAssign}
            onSeatClick={handleSeatClick}
          />
          <div className="stats-bar">
            <div className="stat-item">
              <span className="stat-label">总座位数</span>
              <span className="stat-value">{stats.total}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">已占用</span>
              <span className="stat-value">{stats.occupied}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">已签到</span>
              <span className="stat-value">{stats.checkedIn}</span>
            </div>
          </div>
        </div>
      </main>

      {checkInModal.visible && checkInSeatGuest && (
        <div className="modal-overlay" onClick={handleCheckInClose}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-avatar">{checkInSeatGuest.avatar}</div>
              <div className="modal-info">
                <h3>{checkInSeatGuest.name}</h3>
                <p>
                  {checkInModal.row + 1}排{checkInModal.col + 1}列
                </p>
              </div>
            </div>
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={handleCheckInClose}>
                关闭
              </button>
              <button
                className="btn btn-success"
                onClick={handleCheckInConfirm}
                disabled={seats[checkInModal.row][checkInModal.col].checkedIn}
              >
                {seats[checkInModal.row][checkInModal.col].checkedIn
                  ? '已签到'
                  : '签到'}
              </button>
            </div>
          </div>
        </div>
      )}

      {isLoading && (
        <div className="loading-overlay">
          <div className="loading-spinner">
            <div className="spinner" />
            <span className="loading-text">正在加载布局...</span>
          </div>
        </div>
      )}

      {showDropHint && (
        <div className="drop-hint">
          <div className="drop-hint-text">释放以导入JSON布局文件</div>
        </div>
      )}
    </div>
  )
}
