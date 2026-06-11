import { useCallback, useMemo, useState } from 'react'
import { useWorkshopStore } from '../store'
import type { CandleState, ScentNote } from '../types'

interface WorkbenchProps {
  candle: CandleState
  scentNotes: ScentNote[]
}

export default function Workbench({ candle, scentNotes }: WorkbenchProps) {
  const updateScentPercentage = useWorkshopStore.getState().updateScentPercentage
  const [editingNote, setEditingNote] = useState<string | null>(null)

  const totalPercentage = useMemo(
    () => candle.scents.reduce((sum, s) => sum + s.percentage, 0),
    [candle.scents]
  )

  const getPercentage = useCallback(
    (noteId: string) => {
      const s = candle.scents.find((s) => s.noteId === noteId)
      return s ? s.percentage : 0
    },
    [candle.scents]
  )

  const handleInputChange = useCallback(
    (noteId: string, value: string) => {
      const num = parseInt(value, 10)
      if (isNaN(num)) return
      const clamped = Math.max(0, Math.min(100, num))
      const currentTotal = candle.scents
        .filter((s) => s.noteId !== noteId)
        .reduce((sum, s) => sum + s.percentage, 0)
      if (currentTotal + clamped > 100) return
      updateScentPercentage(candle.id, noteId, clamped)
    },
    [candle.id, candle.scents, updateScentPercentage]
  )

  const handleKnobDrag = useCallback(
    (noteId: string, e: React.MouseEvent | React.TouchEvent) => {
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
      const centerX = rect.left + rect.width / 2
      const centerY = rect.top + rect.height / 2

      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY

      const dx = clientX - centerX
      const dy = clientY - centerY
      const distance = Math.sqrt(dx * dx + dy * dy)
      const maxDist = rect.width / 2
      const rawPercent = Math.min(1, distance / maxDist) * 100
      const percent = Math.round(rawPercent)

      const currentTotal = candle.scents
        .filter((s) => s.noteId !== noteId)
        .reduce((sum, s) => sum + s.percentage, 0)
      const clamped = Math.min(percent, 100 - currentTotal)
      updateScentPercentage(candle.id, noteId, clamped)
    },
    [candle.id, candle.scents, updateScentPercentage]
  )

  const topNotes = scentNotes.filter((n) => n.category === 'top')
  const middleNotes = scentNotes.filter((n) => n.category === 'middle')
  const baseNotes = scentNotes.filter((n) => n.category === 'base')

  const allNotes = [...topNotes, ...middleNotes, ...baseNotes]

  return (
    <div className="workbench-panel">
      <div className="workbench-title">香调配比盘</div>

      <div className="dial-container">
        <svg className="dial-svg" viewBox="0 0 300 300">
          {allNotes.map((note, i) => {
            const angle = (i * 360) / 12 - 90
            const startAngle = ((angle - 15) * Math.PI) / 180
            const endAngle = ((angle + 15) * Math.PI) / 180
            const r = 130
            const cx = 150
            const cy = 150
            const percentage = getPercentage(note.id)
            const fillOpacity = percentage / 100

            const x1 = cx + r * Math.cos(startAngle)
            const y1 = cy + r * Math.sin(startAngle)
            const x2 = cx + r * Math.cos(endAngle)
            const y2 = cy + r * Math.sin(endAngle)
            const innerR = 40

            const ix1 = cx + innerR * Math.cos(startAngle)
            const iy1 = cy + innerR * Math.sin(startAngle)
            const ix2 = cx + innerR * Math.cos(endAngle)
            const iy2 = cy + innerR * Math.sin(endAngle)

            const ledAngle = ((angle) * Math.PI) / 180
            const ledR = 142
            const ledX = cx + ledR * Math.cos(ledAngle)
            const ledY = cy + ledR * Math.sin(ledAngle)

            return (
              <g key={note.id}>
                <path
                  d={`M ${ix1} ${iy1} L ${x1} ${y1} A ${r} ${r} 0 0 1 ${x2} ${y2} L ${ix2} ${iy2} A ${innerR} ${innerR} 0 0 0 ${ix1} ${iy1}`}
                  fill={note.color}
                  fillOpacity={fillOpacity}
                  stroke="#3e2723"
                  strokeWidth="1"
                  className="dial-segment"
                  onClick={() => setEditingNote(editingNote === note.id ? null : note.id)}
                />
                <text
                  x={cx + (r * 0.7) * Math.cos(((angle) * Math.PI) / 180)}
                  y={cy + (r * 0.7) * Math.sin(((angle) * Math.PI) / 180)}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fill="#f5e6c8"
                  fontSize="9"
                  className="dial-label"
                >
                  {note.name}
                </text>
                <circle
                  cx={ledX}
                  cy={ledY}
                  r="4"
                  fill={percentage > 60 ? '#ffd700' : '#3e2723'}
                  className={percentage > 60 ? 'led-active' : 'led-inactive'}
                />
              </g>
            )
          })}
          <circle cx="150" cy="150" r="38" fill="#2c1810" stroke="#d4af37" strokeWidth="1" />
          <text
            x="150"
            y="145"
            textAnchor="middle"
            dominantBaseline="middle"
            fill="#f5e6c8"
            fontSize="18"
            fontWeight="bold"
          >
            {totalPercentage}%
          </text>
          <text
            x="150"
            y="162"
            textAnchor="middle"
            dominantBaseline="middle"
            fill="#d4af37"
            fontSize="8"
          >
            总浓度
          </text>
        </svg>
      </div>

      <div className="scent-controls">
        <div className="scent-category">
          <span className="category-label">前调</span>
          <div className="scent-items">
            {topNotes.map((note) => (
              <ScentControl
                key={note.id}
                note={note}
                percentage={getPercentage(note.id)}
                isEditing={editingNote === note.id}
                onDrag={(e) => handleKnobDrag(note.id, e)}
                onChange={(v) => handleInputChange(note.id, v)}
                onToggleEdit={() => setEditingNote(editingNote === note.id ? null : note.id)}
              />
            ))}
          </div>
        </div>
        <div className="scent-category">
          <span className="category-label">中调</span>
          <div className="scent-items">
            {middleNotes.map((note) => (
              <ScentControl
                key={note.id}
                note={note}
                percentage={getPercentage(note.id)}
                isEditing={editingNote === note.id}
                onDrag={(e) => handleKnobDrag(note.id, e)}
                onChange={(v) => handleInputChange(note.id, v)}
                onToggleEdit={() => setEditingNote(editingNote === note.id ? null : note.id)}
              />
            ))}
          </div>
        </div>
        <div className="scent-category">
          <span className="category-label">基底调</span>
          <div className="scent-items">
            {baseNotes.map((note) => (
              <ScentControl
                key={note.id}
                note={note}
                percentage={getPercentage(note.id)}
                isEditing={editingNote === note.id}
                onDrag={(e) => handleKnobDrag(note.id, e)}
                onChange={(v) => handleInputChange(note.id, v)}
                onToggleEdit={() => setEditingNote(editingNote === note.id ? null : note.id)}
              />
            ))}
          </div>
        </div>
      </div>

      {totalPercentage > 100 && (
        <div className="warning-text">总浓度不能超过100%！</div>
      )}
    </div>
  )
}

interface ScentControlProps {
  note: ScentNote
  percentage: number
  isEditing: boolean
  onDrag: (e: React.MouseEvent | React.TouchEvent) => void
  onChange: (value: string) => void
  onToggleEdit: () => void
}

function ScentControl({ note, percentage, isEditing, onDrag, onChange, onToggleEdit }: ScentControlProps) {
  return (
    <div className="scent-control" onClick={onToggleEdit}>
      <div className="scent-color-dot" style={{ backgroundColor: note.color }} />
      <span className="scent-name">{note.name}</span>
      <div
        className="scent-slider-track"
        onMouseDown={onDrag}
        onTouchStart={onDrag}
      >
        <div
          className="scent-slider-fill"
          style={{ width: `${percentage}%`, backgroundColor: note.color }}
        />
        <div
          className="scent-slider-knob"
          style={{ left: `${percentage}%` }}
        />
      </div>
      {isEditing ? (
        <input
          className="scent-input"
          type="number"
          min={0}
          max={100}
          step={1}
          value={percentage}
          onChange={(e) => onChange(e.target.value)}
          onClick={(e) => e.stopPropagation()}
        />
      ) : (
        <span className="scent-percent">{percentage}%</span>
      )}
    </div>
  )
}
