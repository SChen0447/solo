import { useNavigate } from 'react-router-dom'
import { useState } from 'react'
import './TimelineCard.css'

const STAMP_EMOJI: Record<string, string> = {
  sakura: '🌸',
  moon: '🌙',
  ship: '⛵',
  castle: '🏰',
  bird: '🕊️',
  aurora: '🌌',
}

const STAMP_GLOW: Record<string, string> = {
  sakura: '#ffb7c5',
  moon: '#88ddff',
  ship: '#88ccff',
  castle: '#ccb388',
  bird: '#aaddff',
  aurora: '#66ffaa',
}

interface LetterData {
  id: string
  envelopeColor: string
  stamp: string
  openDate: string
  isArrived: boolean
}

interface Props {
  letter: LetterData
  onClick?: () => void
}

export default function TimelineCard({ letter, onClick }: Props) {
  const navigate = useNavigate()
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 640)

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr)
    return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`
  }

  const handleClick = () => {
    if (!letter.isArrived) return
    if (onClick) {
      onClick()
    } else {
      navigate(`/letter/${letter.id}`)
    }
  }

  const glowColor = STAMP_GLOW[letter.stamp] || '#c9b99a'

  return (
    <div
      className={`timeline-card ${letter.isArrived ? 'arrived' : 'not-arrived'}`}
      style={{
        backgroundColor: letter.envelopeColor,
        boxShadow: letter.isArrived ? `0 0 20px ${glowColor}55, 0 2px 8px rgba(74,59,44,0.1)` : '0 2px 8px rgba(74,59,44,0.08)',
      }}
      onClick={handleClick}
    >
      {!letter.isArrived && <div className="card-mask" />}
      <div className="card-stamp">{STAMP_EMOJI[letter.stamp] || '📮'}</div>
      {letter.isArrived && (
        <div className="card-glow" style={{ borderColor: glowColor }} />
      )}
      <div className="card-date">{formatDate(letter.openDate)}</div>
      {!letter.isArrived && <div className="card-status">未抵达</div>}
      <div className="card-envelope-detail">
        <div className="envelope-line" />
      </div>
    </div>
  )
}
