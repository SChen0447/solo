import { useState } from 'react'
import { Pin } from '../types'

interface DetailPanelProps {
  pin: Pin | null
  isInRoute: boolean
  onToggleRoute: (pinId: string) => void
}

export default function DetailPanel({ pin, isInRoute, onToggleRoute }: DetailPanelProps) {
  const [showBurst, setShowBurst] = useState(false)
  const [added, setAdded] = useState(isInRoute)

  if (!pin) {
    return (
      <div className="detail-empty">
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 12, opacity: 0.3 }}>🎨</div>
          <div>点击展厅中的图钉查看藏品详情</div>
        </div>
      </div>
    )
  }

  const { exhibit } = pin

  const handleAddRoute = () => {
    if (!added) {
      setShowBurst(true)
      setTimeout(() => setShowBurst(false), 800)
    }
    onToggleRoute(pin.id)
    setAdded(!added)
  }

  const stars = Array.from({ length: 8 }).map((_, i) => {
    const angle = (i / 8) * Math.PI * 2
    const r = 60
    return {
      tx: Math.cos(angle) * r,
      ty: Math.sin(angle) * r,
      char: ['⭐', '✨', '💫', '🌟'][i % 4],
      delay: i * 30,
    }
  })

  return (
    <div>
      <div
        className="detail-thumb"
        style={{
          background: `linear-gradient(135deg, ${exhibit.gradientStart}, ${exhibit.gradientEnd})`,
        }}
      />
      <div className="detail-name">{exhibit.name}</div>
      <div className="detail-meta">
        <div className="detail-meta-row">
          <span className="detail-meta-label">年代</span>
          <span className="detail-meta-value">{exhibit.era}</span>
        </div>
        <div className="detail-meta-row">
          <span className="detail-meta-label">材质</span>
          <span className="detail-meta-value">{exhibit.material}</span>
        </div>
        <div className="detail-meta-row">
          <span className="detail-meta-label">尺寸</span>
          <span className="detail-meta-value">{exhibit.size}</span>
        </div>
      </div>
      <p className="detail-desc">{exhibit.description}</p>
      <div style={{ position: 'relative' }}>
        <button
          className={`add-route-btn ${added ? 'add-route-btn-added' : 'add-route-btn-default'}`}
          onClick={handleAddRoute}
        >
          {added ? '✓ 已添加至路线' : '＋ 添加至我的观展路线'}
        </button>
        {showBurst && (
          <div
            className="star-burst"
            style={{
              left: '50%',
              top: '50%',
              transform: 'translate(-50%, -50%)',
            }}
          >
            {stars.map((s, i) => (
              <span
                key={i}
                className="star-burst-item"
                style={
                  {
                    '--tx': `${s.tx}px`,
                    '--ty': `${s.ty}px`,
                    animationDelay: `${s.delay}ms`,
                  } as React.CSSProperties
                }
              >
                {s.char}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
