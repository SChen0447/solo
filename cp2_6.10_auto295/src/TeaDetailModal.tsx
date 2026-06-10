import { useState, useEffect, useRef } from 'react'
import type { MatchedTea, DimensionKey } from './types'

interface TeaDetailModalProps {
  tea: MatchedTea
  onClose: () => void
}

const DIMENSIONS: { key: DimensionKey; label: string }[] = [
  { key: 'floral', label: '花香' },
  { key: 'fruity', label: '果香' },
  { key: 'woody', label: '木香' },
  { key: 'honey', label: '蜜香' }
]

function RadarChart({ tea }: { tea: MatchedTea }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [tooltip, setTooltip] = useState<{ x: number; y: number; label: string; value: number } | null>(null)
  const [animated, setAnimated] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setAnimated(true), 100)
    return () => clearTimeout(timer)
  }, [])

  const size = 260
  const center = size / 2
  const radius = 100

  const getPoint = (angle: number, value: number, max: number = 10) => {
    const r = (value / max) * radius
    const x = center + r * Math.cos(angle)
    const y = center + r * Math.sin(angle)
    return [x, y] as const
  }

  const angles = DIMENSIONS.map((_, i) => -Math.PI / 2 + (2 * Math.PI * i) / DIMENSIONS.length)

  const points = DIMENSIONS.map((dim, i) => {
    const value = animated ? tea.scores[dim.key] : 0
    return getPoint(angles[i], value)
  })

  const polygonPath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p[0]} ${p[1]}`).join(' ') + ' Z'

  const gridLevels = [2, 4, 6, 8, 10]

  return (
    <div className="radar-container" ref={containerRef}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {gridLevels.map((level) => {
          const gridPoints = angles.map((angle) => getPoint(angle, level))
          const gridPath = gridPoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p[0]} ${p[1]}`).join(' ') + ' Z'
          return (
            <path
              key={level}
              d={gridPath}
              fill="none"
              stroke="#e8d5b7"
              strokeWidth="1"
            />
          )
        })}

        {DIMENSIONS.map((_, i) => {
          const [x, y] = getPoint(angles[i], 10)
          return (
            <line
              key={i}
              x1={center}
              y1={center}
              x2={x}
              y2={y}
              stroke="#e8d5b7"
              strokeWidth="1"
            />
          )
        })}

        <path
          d={polygonPath}
          fill="rgba(212, 163, 115, 0.5)"
          stroke="#8b6914"
          strokeWidth="2"
          style={{ transition: 'all 0.6s ease-out' }}
        />

        {DIMENSIONS.map((dim, i) => {
          const value = animated ? tea.scores[dim.key] : 0
          const [px, py] = getPoint(angles[i], value)
          const [lx, ly] = getPoint(angles[i], 11.5)
          return (
            <g key={dim.key}>
              <circle
                cx={px}
                cy={py}
                r="6"
                fill="#8b6914"
                stroke="#fff"
                strokeWidth="2"
                style={{
                  cursor: 'pointer',
                  transition: 'all 0.6s ease-out'
                }}
                onMouseEnter={(e) => {
                  const rect = containerRef.current?.getBoundingClientRect()
                  if (rect) {
                    setTooltip({
                      x: e.clientX - rect.left,
                      y: e.clientY - rect.top,
                      label: dim.label,
                      value: tea.scores[dim.key]
                    })
                  }
                }}
                onMouseMove={(e) => {
                  const rect = containerRef.current?.getBoundingClientRect()
                  if (rect) {
                    setTooltip({
                      x: e.clientX - rect.left,
                      y: e.clientY - rect.top,
                      label: dim.label,
                      value: tea.scores[dim.key]
                    })
                  }
                }}
                onMouseLeave={() => setTooltip(null)}
              />
              <text
                x={lx}
                y={ly}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize="13"
                fill="#3e2c1a"
                fontWeight="600"
              >
                {dim.label}
              </text>
            </g>
          )
        })}
      </svg>
      {tooltip && (
        <div
          className={`radar-tooltip ${tooltip ? 'visible' : ''}`}
          style={{ left: tooltip.x, top: tooltip.y }}
        >
          {tooltip.label}: {tooltip.value}/10
        </div>
      )}
    </div>
  )
}

function ThermometerIcon() {
  const [fill, setFill] = useState(0)

  useEffect(() => {
    const timer = setTimeout(() => setFill(1), 200)
    return () => clearTimeout(timer)
  }, [])

  return (
    <svg className="brew-icon" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
      <rect x="18" y="6" width="12" height="30" rx="6" fill="none" stroke="#8b6914" strokeWidth="2" />
      <circle cx="24" cy="40" r="6" fill="none" stroke="#8b6914" strokeWidth="2" />
      <circle
        cx="24"
        cy="40"
        r="4"
        fill="#d4a373"
        style={{
          transformOrigin: '24px 40px',
          transform: `scale(${fill})`,
          transition: 'transform 0.8s ease-out'
        }}
      />
      <rect
        x="21"
        y="12"
        width="6"
        height="22"
        rx="3"
        fill="#d4a373"
        style={{
          clipPath: 'polygon(0 100% 100% 100% 100% 100% 0 100%)',
          transformOrigin: '24px 34px',
          transform: `scaleY(${fill})`,
          transition: 'transform 0.8s ease-out'
        }}
      />
    </svg>
  )
}

function HourglassIcon() {
  const [fill, setFill] = useState(0)

  useEffect(() => {
    const timer = setTimeout(() => setFill(1), 200)
    return () => clearTimeout(timer)
  }, [])

  return (
    <svg className="brew-icon" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M10 6h28M10 42h28M10 6v8c0 8-4 8-4 12s4 4 4 12v8M38 6v8c0 8 4 8 4 12s-4 4-4 12v8"
        fill="none"
        stroke="#8b6914"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M14 12v4c0 5-2 5-2 8s2 3 2 8v4M34 12v4c0 5 2 5 2 8s-2 3-2 8v4"
        fill="none"
        stroke="#d4a373"
        strokeWidth="3"
        strokeLinecap="round"
        strokeDasharray="80"
        strokeDashoffset={80 - fill * 80}
        style={{ transition: 'stroke-dashoffset 0.8s ease-out' }}
      />
    </svg>
  )
}

function TeaDetailModal({ tea, onClose }: TeaDetailModalProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = ''
    }
  }, [onClose])

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-body">
          <div className="modal-grid">
            <div className="modal-left">
              <h2>{tea.name}</h2>
              <span className="tea-type">{tea.type}</span>
              <div className="tea-origin">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="#8b6914" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
                </svg>
                {tea.origin}
              </div>
              <p className="modal-desc">{tea.description}</p>
            </div>

            <div className="modal-right">
              <div className="brew-params">
                <div className="brew-item">
                  <ThermometerIcon />
                  <div className="brew-info">
                    <span className="brew-label">冲泡温度</span>
                    <span className="brew-value">{tea.brewTemp}</span>
                  </div>
                </div>
                <div className="brew-item">
                  <HourglassIcon />
                  <div className="brew-info">
                    <span className="brew-label">冲泡时长</span>
                    <span className="brew-value">{tea.brewTime}</span>
                  </div>
                </div>
              </div>

              <a
                href={tea.reportUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="report-link"
              >
                <svg viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                  <path d="M14 3v2h3.59l-9.83 9.83 1.41 1.41L19 6.41V10h2V3m-2 16H5V5h7V3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7h-2v7z" />
                </svg>
                查看农残检测报告
              </a>

              <div className="radar-section">
                <h4>口感四维分析</h4>
                <RadarChart tea={tea} />
              </div>
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn-close" onClick={onClose}>
            关闭
          </button>
          <button
            className="btn-cart"
            onClick={() => alert('已加入购物车（功能示意）')}
          >
            加入购物车
          </button>
        </div>
      </div>
    </div>
  )
}

export default TeaDetailModal
