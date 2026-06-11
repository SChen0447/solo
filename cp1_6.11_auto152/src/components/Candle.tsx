import { useMemo } from 'react'
import type { CandleState, ScentNote } from '../types'

interface CandleProps {
  candle: CandleState
  scentNotes: ScentNote[]
  isSelected: boolean
  onWickClick: (id: string) => void
  onCandleClick: (id: string) => void
}

export default function Candle({ candle, scentNotes, isSelected, onWickClick, onCandleClick }: CandleProps) {
  const meltClipPath = useMemo(() => {
    const level = candle.meltLevel
    const topInset = level * 40
    const wobble1 = 2 + level * 3
    const wobble2 = 1 + level * 5
    return `polygon(
      ${5 + wobble1}% ${topInset}%,
      ${15 + wobble2}% ${topInset - 1}%,
      ${30 - wobble1}% ${topInset + 2}%,
      ${50 + wobble2}% ${topInset - 1}%,
      ${70 - wobble1}% ${topInset + 1}%,
      ${85 + wobble2}% ${topInset - 2}%,
      ${95 - wobble1}% ${topInset + 1}%,
      100% 100%,
      0% 100%
    )`
  }, [candle.meltLevel])

  const flameStyle: React.CSSProperties = candle.isBurning
    ? {
        animation: 'flameFlicker 0.3s ease-in-out infinite alternate',
      }
    : { display: 'none' }

  const glowStyle: React.CSSProperties = candle.isBurning
    ? {
        animation: 'glowPulse 2s ease-in-out infinite',
      }
    : { display: 'none' }

  const scentLabel = useMemo(() => {
    return candle.scents
      .filter((s) => s.percentage > 0)
      .map((s) => {
        const note = scentNotes.find((n) => n.id === s.noteId)
        return note ? note.name : s.noteId
      })
      .slice(0, 3)
      .join(' · ')
  }, [candle.scents, scentNotes])

  return (
    <div
      className={`candle-container ${isSelected ? 'candle-selected' : ''}`}
      onClick={() => onCandleClick(candle.id)}
    >
      <div className="candle-body-wrapper">
        <div className="candle-glow" style={glowStyle} />

        <div
          className="candle-wick"
          onClick={(e) => {
            e.stopPropagation()
            onWickClick(candle.id)
          }}
        >
          <div className="wick-thread" />
          <div className="wick-flame" style={flameStyle}>
            <div className="flame-outer" />
            <div className="flame-inner" />
          </div>
        </div>

        <div
          className="candle-body"
          style={{
            backgroundColor: candle.currentColor,
            clipPath: meltClipPath,
          }}
        >
          <div className="candle-texture" />
          <div className="candle-layer candle-layer-1" />
          <div className="candle-layer candle-layer-2" />
          <div className="candle-layer candle-layer-3" />
        </div>

        <div className="candle-drip" style={{ borderColor: `transparent transparent ${candle.currentColor} transparent` }} />
      </div>

      <div className="candle-info">
        <span className="candle-name">{candle.name}</span>
        <span className="candle-scents">{scentLabel}</span>
        {candle.isBurning && (
          <span className="candle-burn-time">
            {Math.floor(candle.burnTime / 1000)}s
          </span>
        )}
      </div>
    </div>
  )
}
