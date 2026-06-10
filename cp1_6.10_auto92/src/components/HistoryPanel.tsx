import { useState } from 'react'
import type { DrawRecord } from '../types'

interface HistoryPanelProps {
  draws: DrawRecord[]
  expanded: boolean
  onToggle: () => void
  isMobile: boolean
}

const HistoryPanel = ({ draws, expanded, onToggle, isMobile }: HistoryPanelProps) => {
  const [hoveredDraw, setHoveredDraw] = useState<string | null>(null)

  const formatTime = (ts: number) => {
    const d = new Date(ts)
    return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  }

  return (
    <div
      style={{
        position: 'absolute',
        top: isMobile ? 80 : 20,
        left: isMobile ? '50%' : 20,
        transform: isMobile ? 'translateX(-50%)' : 'none',
        zIndex: 50,
        maxWidth: isMobile ? '95vw' : 280,
        width: isMobile ? 'auto' : 260
      }}
    >
      <button
        onClick={onToggle}
        style={{
          padding: '8px 16px',
          borderRadius: 12,
          border: '1px solid #3a3a5a',
          background: 'rgba(30, 30, 50, 0.85)',
          color: '#fff',
          cursor: 'pointer',
          fontSize: 13,
          fontWeight: 500,
          marginBottom: expanded ? 8 : 0,
          transition: 'all 0.2s',
          display: 'flex',
          alignItems: 'center',
          gap: 6
        }}
        onMouseOver={e => {
          e.currentTarget.style.transform = 'scale(1.05)'
          e.currentTarget.style.background = 'rgba(50, 50, 70, 0.9)'
        }}
        onMouseOut={e => {
          e.currentTarget.style.transform = 'scale(1)'
          e.currentTarget.style.background = 'rgba(30, 30, 50, 0.85)'
        }}
      >
        {expanded ? '▼' : '▶'} 抽奖记录 ({draws.length})
      </button>

      {expanded && (
        <div
          style={{
            background: 'rgba(0, 0, 0, 0.6)',
            borderRadius: 12,
            padding: 12,
            backdropFilter: 'blur(8px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            maxHeight: isMobile ? '40vh' : '60vh',
            overflowY: 'auto'
          }}
        >
          {draws.length === 0 ? (
            <div style={{ color: '#888', fontSize: 13, textAlign: 'center', padding: 16 }}>
              暂无抽奖记录
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {draws.map((draw, idx) => (
                <div
                  key={draw.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: 8,
                    borderRadius: 8,
                    background: hoveredDraw === draw.id ? 'rgba(255, 215, 0, 0.1)' : 'rgba(255, 255, 255, 0.05)',
                    transition: 'all 0.2s',
                    cursor: 'pointer',
                    position: 'relative'
                  }}
                  onMouseEnter={() => setHoveredDraw(draw.id)}
                  onMouseLeave={() => setHoveredDraw(null)}
                >
                  <div style={{
                    width: 40,
                    height: 40,
                    borderRadius: 6,
                    overflow: 'hidden',
                    border: '1px solid #444',
                    flexShrink: 0,
                    background: '#1c1c2e'
                  }}>
                    <img src={draw.winnerImage} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} draggable={false} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ color: '#ffd700', fontSize: 14, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      🥇 {draw.winnerNickname}
                    </div>
                    <div style={{ color: '#888', fontSize: 11, marginTop: 2 }}>
                      {formatTime(draw.timestamp)} · 参与 {draw.participantCount} 人
                    </div>
                  </div>
                  <div style={{ color: '#666', fontSize: 12, fontWeight: 600 }}>
                    #{draws.length - idx}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default HistoryPanel
