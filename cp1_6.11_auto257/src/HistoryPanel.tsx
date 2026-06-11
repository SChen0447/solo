import { useState, useMemo } from 'react'
import type { Snapshot, EntanglementState } from './App'

interface HistoryPanelProps {
  snapshots: Snapshot[]
  onReplay: (snapshot: Snapshot) => void
  isReplaying: boolean
  isOpen: boolean
  onToggle: () => void
}

const getStateFormula = (state: EntanglementState): string => {
  switch (state) {
    case 'bell':
      return '|Φ+⟩ = 1/√2(|00⟩+|11⟩)'
    case 'ghz':
      return '|GHZ⟩ = 1/√2(|000⟩+|111⟩)'
    case 'w':
      return '|W⟩ = 1/√3(|001⟩+|010⟩+|100⟩)'
  }
}

const getStateColor = (state: EntanglementState): string => {
  switch (state) {
    case 'bell': return '#33ccff'
    case 'ghz': return '#ff66cc'
    case 'w': return '#ffdd00'
  }
}

const getStateName = (state: EntanglementState): string => {
  switch (state) {
    case 'bell': return 'Bell 态'
    case 'ghz': return 'GHZ 态'
    case 'w': return 'W 态'
  }
}

const ThumbnailCanvas = ({ snapshot }: { snapshot: Snapshot }) => {
  const canvasRef = (canvas: HTMLCanvasElement | null) => {
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const w = canvas.width
    const h = canvas.height

    const gradient = ctx.createLinearGradient(0, 0, 0, h)
    gradient.addColorStop(0, '#0f0f2e')
    gradient.addColorStop(1, '#301a52')
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, w, h)

    const centerX = w / 2
    const centerY = h / 2
    const scale = Math.min(w, h) / 8

    const positions = snapshot.nodes.map(n => ({
      x: centerX + n.x * scale,
      y: centerY + n.y * scale
    }))

    ctx.lineWidth = 1.5
    ctx.strokeStyle = getStateColor(snapshot.entanglementState) + '99'
    if (positions.length >= 2) {
      for (let i = 1; i < positions.length; i++) {
        ctx.beginPath()
        ctx.moveTo(positions[0].x, positions[0].y)
        ctx.lineTo(positions[i].x, positions[i].y)
        ctx.stroke()
      }
      for (let i = 1; i < positions.length - 1; i++) {
        ctx.beginPath()
        ctx.moveTo(positions[i].x, positions[i].y)
        ctx.lineTo(positions[i + 1].x, positions[i + 1].y)
        ctx.stroke()
      }
      if (positions.length > 2) {
        ctx.beginPath()
        ctx.moveTo(positions[positions.length - 1].x, positions[positions.length - 1].y)
        ctx.lineTo(positions[1].x, positions[1].y)
        ctx.stroke()
      }
    }

    positions.forEach((pos, i) => {
      const size = i === 0 ? 6 : 4
      ctx.beginPath()
      for (let j = 0; j < 6; j++) {
        const angle = (j / 6) * Math.PI * 2 - Math.PI / 2
        const hx = pos.x + Math.cos(angle) * size
        const hy = pos.y + Math.sin(angle) * size
        if (j === 0) ctx.moveTo(hx, hy)
        else ctx.lineTo(hx, hy)
      }
      ctx.closePath()
      ctx.fillStyle = i === 0 ? '#ff66cc' : '#33ccff'
      ctx.globalAlpha = 0.8
      ctx.fill()
      ctx.globalAlpha = 1
      ctx.strokeStyle = '#ffffff'
      ctx.lineWidth = 0.8
      ctx.stroke()
    })
  }

  return (
    <canvas
      ref={canvasRef}
      width={160}
      height={100}
      style={{ width: '100%', height: '100%', display: 'block' }}
    />
  )
}

const SnapshotCard = ({
  snapshot,
  index,
  onClick,
  isReplaying
}: {
  snapshot: Snapshot
  index: number
  onClick: () => void
  isReplaying: boolean
}) => {
  const [hovered, setHovered] = useState(false)
  const timeStr = useMemo(() => {
    const d = new Date(snapshot.timestamp)
    return d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  }, [snapshot.timestamp])

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        width: '100%',
        background: hovered
          ? 'rgba(51, 204, 255, 0.1)'
          : 'rgba(255, 255, 255, 0.03)',
        border: `1px solid ${hovered ? 'rgba(51, 204, 255, 0.5)' : 'rgba(255, 255, 255, 0.08)'}`,
        borderRadius: '8px',
        overflow: 'hidden',
        cursor: isReplaying ? 'wait' : 'pointer',
        transition: 'all 0.3s ease',
        transform: hovered && !isReplaying ? 'scale(1.03)' : 'scale(1)',
        boxShadow: hovered && !isReplaying ? '0 0 15px rgba(51, 204, 255, 0.3)' : 'none',
        opacity: isReplaying ? 0.6 : 1
      }}
    >
      <div style={{
        padding: '6px 10px',
        background: 'rgba(0, 0, 0, 0.3)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        fontSize: '10px'
      }}>
        <span style={{ color: '#888' }}>#{index + 1}</span>
        <span style={{ color: getStateColor(snapshot.entanglementState), fontWeight: 700 }}>
          {getStateName(snapshot.entanglementState)}
        </span>
        <span style={{ color: '#666' }}>{timeStr}</span>
      </div>
      <div style={{ borderTop: `2px solid ${getStateColor(snapshot.entanglementState)}` }}>
        <ThumbnailCanvas snapshot={snapshot} />
      </div>
    </div>
  )
}

const HistoryPanel = ({
  snapshots,
  onReplay,
  isReplaying,
  isOpen
}: HistoryPanelProps) => {
  const [selectedSnapshot, setSelectedSnapshot] = useState<Snapshot | null>(null)

  const handleClick = (snapshot: Snapshot) => {
    if (isReplaying) return
    setSelectedSnapshot(snapshot)
    onReplay(snapshot)
  }

  const activeSnapshot = selectedSnapshot || snapshots[0]

  return (
    <div
      style={{
        position: 'fixed',
        right: isOpen ? '0' : '-210px',
        top: '140px',
        bottom: '0',
        width: '200px',
        background: 'rgba(26, 26, 58, 0.6)',
        backdropFilter: 'blur(10px)',
        borderLeft: '1px solid rgba(255, 102, 204, 0.2)',
        padding: '16px 12px',
        overflowY: 'auto',
        zIndex: 60,
        transition: 'right 0.3s ease',
        display: 'flex',
        flexDirection: 'column',
        gap: '14px'
      }}
    >
      <h3 style={{
        fontSize: '14px',
        color: '#ff66cc',
        marginBottom: '4px',
        paddingBottom: '8px',
        borderBottom: '1px solid rgba(255, 102, 204, 0.2)',
        letterSpacing: '1px',
        fontWeight: 700,
        display: 'flex',
        alignItems: 'center',
        gap: '6px'
      }}>
        🕐 历史快照
        <span style={{
          fontSize: '10px',
          color: '#666',
          fontWeight: 400,
          marginLeft: 'auto'
        }}>
          {snapshots.length}/10
        </span>
      </h3>

      {snapshots.length === 0 ? (
        <div style={{
          padding: '30px 10px',
          textAlign: 'center',
          color: '#666',
          fontSize: '11px',
          lineHeight: 1.8,
          border: '1px dashed rgba(255, 255, 255, 0.1)',
          borderRadius: '8px'
        }}>
          <div style={{ fontSize: '30px', marginBottom: '10px' }}>📷</div>
          暂无历史快照<br />
          调节参数后点击<br />
          <span style={{ color: '#33ccff' }}>"保存状态快照"</span>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {snapshots.map((snap, i) => (
            <SnapshotCard
              key={snap.id}
              snapshot={snap}
              index={i}
              onClick={() => handleClick(snap)}
              isReplaying={isReplaying}
            />
          ))}
        </div>
      )}

      {activeSnapshot && (
        <div style={{
          marginTop: 'auto',
          padding: '14px 12px',
          background: 'rgba(0, 0, 0, 0.3)',
          borderRadius: '8px',
          border: '1px solid rgba(255, 221, 0, 0.2)'
        }}>
          <div style={{
            fontSize: '10px',
            color: '#ffdd00',
            marginBottom: '8px',
            fontWeight: 700,
            letterSpacing: '1px'
          }}>
            ⚛ 量子态表达式
          </div>
          <div style={{
            fontSize: '12px',
            color: '#ffffff',
            fontFamily: 'monospace',
            lineHeight: 1.6,
            wordBreak: 'break-all'
          }}>
            {getStateFormula(activeSnapshot.entanglementState)}
          </div>
          <div style={{
            marginTop: '10px',
            paddingTop: '10px',
            borderTop: '1px solid rgba(255, 255, 255, 0.08)',
            fontSize: '10px',
            color: '#666',
            display: 'flex',
            justifyContent: 'space-between'
          }}>
            <span>距离: <span style={{ color: getStateColor(activeSnapshot.entanglementState) }}>{activeSnapshot.entanglementDistance}</span></span>
            <span>节点: <span style={{ color: getStateColor(activeSnapshot.entanglementState) }}>{activeSnapshot.nodes.length}</span></span>
          </div>
        </div>
      )}
    </div>
  )
}

export default HistoryPanel
