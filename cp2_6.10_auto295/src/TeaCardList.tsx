import { useEffect, useState } from 'react'
import type { MatchedTea } from './types'

interface TeaCardListProps {
  matchedTeas: MatchedTea[]
  onSelect: (tea: MatchedTea) => void
}

function MatchBadge({ score }: { score: number }) {
  const [displayScore, setDisplayScore] = useState(0)
  const radius = 28
  const circumference = 2 * Math.PI * radius
  const progress = (displayScore / 100) * circumference
  const offset = circumference - progress

  useEffect(() => {
    const duration = 1000
    const startTime = performance.now()
    let animationId: number

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setDisplayScore(Math.round(score * eased))

      if (progress < 1) {
        animationId = requestAnimationFrame(animate)
      }
    }

    animationId = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(animationId)
  }, [score])

  return (
    <div className="match-badge">
      <svg width="64" height="64" viewBox="0 0 64 64">
        <defs>
          <linearGradient id={`gradient-${score}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#8b6914" />
            <stop offset="100%" stopColor="#d4a373" />
          </linearGradient>
        </defs>
        <circle
          cx="32"
          cy="32"
          r={radius}
          fill="none"
          stroke="#e8d5b7"
          strokeWidth="5"
        />
        <circle
          cx="32"
          cy="32"
          r={radius}
          fill="none"
          stroke={`url(#gradient-${score})`}
          strokeWidth="5"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 1s ease-out' }}
        />
      </svg>
      <div className="match-badge-text">{displayScore}%</div>
    </div>
  )
}

function getCardBgColor(score: number): string {
  if (score >= 85) return '#d4e8d4'
  if (score >= 70) return '#e4e4d4'
  return '#e8e8e8'
}

function TeaCardList({ matchedTeas, onSelect }: TeaCardListProps) {
  return (
    <div className="tea-grid">
      {matchedTeas.map((tea) => (
        <div
          key={tea.id}
          className="tea-card"
          style={{ backgroundColor: getCardBgColor(tea.matchScore) }}
        >
          <MatchBadge score={tea.matchScore} />
          <div className="tea-card-content">
            <h3 className="tea-name">{tea.name}</h3>
            <span className="tea-type">{tea.type}</span>
            <div className="tea-origin">
              <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
              </svg>
              {tea.origin}
            </div>
            <button
              className="tea-detail-btn"
              onClick={() => onSelect(tea)}
            >
              点击查看详情
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}

export default TeaCardList
