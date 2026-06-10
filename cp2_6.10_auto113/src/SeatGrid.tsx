import { useState, useRef, useEffect } from 'react'
import type { Seat, Guest, ConfirmBubbleState, PulsingSeat } from './types'

interface SeatGridProps {
  seats: Seat[][]
  guests: Guest[]
  checkInMode: boolean
  pulsingSeats: PulsingSeat[]
  onConfirmAssign: (guestId: string, row: number, col: number) => void
  onSeatClick: (row: number, col: number) => void
}

export default function SeatGrid({
  seats,
  guests,
  checkInMode,
  pulsingSeats,
  onConfirmAssign,
  onSeatClick,
}: SeatGridProps) {
  const [dragOverSeat, setDragOverSeat] = useState<{ row: number; col: number } | null>(null)
  const [confirmBubble, setConfirmBubble] = useState<ConfirmBubbleState>({
    visible: false,
    guestId: null,
    row: -1,
    col: -1,
  })
  const [bubblePosition, setBubblePosition] = useState({ x: 0, y: 0 })
  const wrapperRef = useRef<HTMLDivElement>(null)
  const draggedGuestId = useRef<string | null>(null)

  useEffect(() => {
    const handleDragEnd = () => {
      draggedGuestId.current = null
      setDragOverSeat(null)
    }
    document.addEventListener('dragend', handleDragEnd)
    return () => document.removeEventListener('dragend', handleDragEnd)
  }, [])

  const getGuestById = (id: string | null) => guests.find((g) => g.id === id)

  const getShortName = (name: string) => name.slice(0, 2)

  const isPulsing = (row: number, col: number) =>
    pulsingSeats.some((s) => s.row === row && s.col === col)

  const handleDragOver = (e: React.DragEvent, row: number, col: number) => {
    const seat = seats[row][col]
    if (seat.guestId) return
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    if (!dragOverSeat || dragOverSeat.row !== row || dragOverSeat.col !== col) {
      setDragOverSeat({ row, col })
    }
  }

  const handleDragLeave = () => {
    setDragOverSeat(null)
  }

  const handleDrop = (e: React.DragEvent, row: number, col: number) => {
    e.preventDefault()
    const seat = seats[row][col]
    if (seat.guestId) return

    const guestId = e.dataTransfer.getData('guestId')
    if (!guestId) return

    const guest = getGuestById(guestId)
    if (!guest || guest.assigned) return

    draggedGuestId.current = guestId
    setDragOverSeat(null)

    const seatEl = e.currentTarget as HTMLElement
    const wrapperRect = wrapperRef.current?.getBoundingClientRect()
    const seatRect = seatEl.getBoundingClientRect()

    if (wrapperRect) {
      setBubblePosition({
        x: seatRect.left - wrapperRect.left + seatRect.width / 2,
        y: seatRect.top - wrapperRect.top - 10,
      })
    }

    setConfirmBubble({
      visible: true,
      guestId,
      row,
      col,
    })
  }

  const handleConfirmBubble = () => {
    if (confirmBubble.guestId) {
      onConfirmAssign(confirmBubble.guestId, confirmBubble.row, confirmBubble.col)
    }
    setConfirmBubble({ visible: false, guestId: null, row: -1, col: -1 })
    draggedGuestId.current = null
  }

  const handleCancelBubble = () => {
    setConfirmBubble({ visible: false, guestId: null, row: -1, col: -1 })
    draggedGuestId.current = null
  }

  const handleSeatClick = (row: number, col: number) => {
    const seat = seats[row][col]
    if (!seat.guestId) return
    if (checkInMode) {
      onSeatClick(row, col)
    }
  }

  return (
    <div className="seat-grid-wrapper" ref={wrapperRef}>
      <div
        className="seat-grid"
        style={{ gridTemplateColumns: `repeat(${seats[0]?.length || 10}, 40px)` }}
      >
        {seats.map((row, rowIdx) =>
          row.map((seat, colIdx) => {
            const guest = getGuestById(seat.guestId)
            const isOccupied = !!seat.guestId
            const isDragOver =
              dragOverSeat?.row === rowIdx && dragOverSeat?.col === colIdx
            const pulsing = isPulsing(rowIdx, colIdx)

            return (
              <div
                key={`${rowIdx}-${colIdx}`}
                className={[
                  'seat',
                  isOccupied ? 'occupied' : '',
                  isDragOver ? 'drag-over' : '',
                  seat.checkedIn && !pulsing ? 'checked-in' : '',
                  pulsing ? 'pulsing' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                onDragOver={(e) => handleDragOver(e, rowIdx, colIdx)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, rowIdx, colIdx)}
                onClick={() => handleSeatClick(rowIdx, colIdx)}
                title={guest ? `${guest.name} (${rowIdx + 1}排${colIdx + 1}列)` : `${rowIdx + 1}排${colIdx + 1}列`}
              >
                {guest ? getShortName(guest.name) : ''}
              </div>
            )
          })
        )}
      </div>

      {confirmBubble.visible && confirmBubble.guestId && (
        <div
          className="confirm-bubble"
          style={{
            left: bubblePosition.x,
            top: bubblePosition.y,
            transform: 'translate(-50%, -100%)',
          }}
        >
          <p>
            确定将「{getGuestById(confirmBubble.guestId)?.name}」放在这个座位？
          </p>
          <div className="confirm-bubble-actions">
            <button className="btn btn-secondary" onClick={handleCancelBubble}>
              取消
            </button>
            <button className="btn btn-primary" onClick={handleConfirmBubble}>
              确认
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
