import { useState, useEffect } from 'react'
import './LetterReader.css'

interface LetterData {
  id: string
  content: string
  envelopeColor: string
  stamp: string
  season: string
  openDate: string
}

interface Props {
  letter: LetterData
  onClose?: () => void
}

export default function LetterReader({ letter, onClose }: Props) {
  const [visibleLines, setVisibleLines] = useState(0)
  const lines = letter.content.split('\n').filter((l) => l.trim())

  useEffect(() => {
    setVisibleLines(0)
    const interval = setInterval(() => {
      setVisibleLines((prev) => {
        if (prev >= lines.length) {
          clearInterval(interval)
          return prev
        }
        return prev + 1
      })
    }, 300)
    return () => clearInterval(interval)
  }, [letter.id, lines.length])

  const renderSeasonAnimation = () => {
    switch (letter.season) {
      case 'spring':
        return (
          <>
            {Array.from({ length: 15 }).map((_, i) => (
              <div key={i} className="petal" style={{
                left: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 8}s`,
                animationDuration: `${6 + Math.random() * 4}s`,
              }}>🌸</div>
            ))}
          </>
        )
      case 'summer':
        return (
          <>
            {Array.from({ length: 20 }).map((_, i) => (
              <div key={i} className="firefly" style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 3}s`,
              }} />
            ))}
          </>
        )
      case 'autumn':
        return (
          <>
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="maple" style={{
                left: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 8}s`,
                animationDuration: `${7 + Math.random() * 4}s`,
              }}>🍁</div>
            ))}
          </>
        )
      case 'winter':
        return (
          <>
            {Array.from({ length: 30 }).map((_, i) => (
              <div key={i} className="snowflake" style={{
                left: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 6}s`,
                animationDuration: `${5 + Math.random() * 5}s`,
              }}>❄️</div>
            ))}
          </>
        )
      default:
        return null
    }
  }

  return (
    <div className="letter-reader-overlay" style={{
      background: `linear-gradient(135deg, ${letter.envelopeColor}, #f5efe0)`,
    }}>
      <div className="season-animation">{renderSeasonAnimation()}</div>
      {onClose && (
        <button className="close-btn" onClick={onClose}>✕</button>
      )}
      <div className="letter-paper">
        <div className="burn-edge" />
        <div className="letter-content">
          {lines.map((line, idx) => (
            <p
              key={idx}
              className={`letter-line ${idx < visibleLines ? 'visible' : ''}`}
            >
              {line}
            </p>
          ))}
        </div>
        <div className="letter-signature">
          — 来自过去的信
        </div>
      </div>
    </div>
  )
}
