import React, { useState, useCallback } from 'react'
import type { StampCounts, StampResponse } from '../App'

interface StampPanelProps {
  paintingId: string
  stamps: StampCounts
  onUpdateStamps: (paintingId: string, counts: StampCounts) => void
}

interface RippleData {
  id: number
  type: 'star' | 'flame'
}

const StampPanel: React.FC<StampPanelProps> = ({
  paintingId,
  stamps,
  onUpdateStamps
}) => {
  const [bouncingType, setBouncingType] = useState<'star' | 'flame' | null>(null)
  const [ripples, setRipples] = useState<RippleData[]>([])
  const [isSubmitting, setIsSubmitting] = useState<'star' | 'flame' | null>(null)
  const rippleIdRef = React.useRef(0)

  const addRipple = useCallback((type: 'star' | 'flame') => {
    const id = ++rippleIdRef.current
    setRipples(prev => [...prev, { id, type }])
    setTimeout(() => {
      setRipples(prev => prev.filter(r => r.id !== id))
    }, 450)
  }, [])

  const handleStampClick = useCallback(async (type: 'star' | 'flame') => {
    if (isSubmitting) return

    setIsSubmitting(type)
    setBouncingType(type)

    setTimeout(() => {
      setBouncingType(prev => prev === type ? null : prev)
    }, 220)

    addRipple(type)

    try {
      const response = await fetch('/api/stamp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          paintingId,
          type
        })
      })

      if (!response.ok) {
        throw new Error('Failed to submit stamp')
      }

      const data: StampResponse = await response.json()

      if (data.success) {
        onUpdateStamps(paintingId, data.counts)
      }
    } catch (_error) {
      // silent fail
    } finally {
      setIsSubmitting(null)
    }
  }, [paintingId, isSubmitting, onUpdateStamps, addRipple])

  const StarIcon = () => (
    <svg
      className="stamp-button-icon"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M12 2L14.5 8.5L21 9.5L16 14.5L17.5 21L12 17.5L6.5 21L8 14.5L3 9.5L9.5 8.5L12 2Z"
        fill="#ff6b6b"
        stroke="#ffa8a8"
        strokeWidth="0.8"
        strokeLinejoin="round"
      />
      <circle cx="10" cy="10" r="1.2" fill="#fff" opacity="0.6" />
    </svg>
  )

  const FlameIcon = () => (
    <svg
      className="stamp-button-icon"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M12 2C12 2 7 8 7 13C7 16.5 9.5 19 12 19C14.5 19 17 16.5 17 13C17 9 15 7 15 5C15 3 12 2 12 2Z"
        fill="#48dbfb"
        stroke="#9fe8fa"
        strokeWidth="0.8"
        strokeLinejoin="round"
      />
      <path
        d="M12 8C12 8 9 11 9 13.5C9 15 10 16.5 12 16.5"
        stroke="#fff"
        strokeWidth="1.2"
        strokeLinecap="round"
        opacity="0.5"
      />
      <ellipse cx="10.5" cy="12" rx="1" ry="0.8" fill="#fff" opacity="0.4" />
    </svg>
  )

  return (
    <div className="stamp-panel">
      <button
        className={`stamp-button star${bouncingType === 'star' ? ' bouncing' : ''}`}
        onClick={() => handleStampClick('star')}
        disabled={isSubmitting !== null}
        aria-label="星光图章"
      >
        <StarIcon />
        <span className="stamp-count star">{stamps.star}</span>
        {ripples
          .filter(r => r.type === 'star')
          .map(r => (
            <span key={r.id} className="ripple star" />
          ))}
      </button>

      <button
        className={`stamp-button flame${bouncingType === 'flame' ? ' bouncing' : ''}`}
        onClick={() => handleStampClick('flame')}
        disabled={isSubmitting !== null}
        aria-label="火焰图章"
      >
        <FlameIcon />
        <span className="stamp-count flame">{stamps.flame}</span>
        {ripples
          .filter(r => r.type === 'flame')
          .map(r => (
            <span key={r.id} className="ripple flame" />
          ))}
      </button>
    </div>
  )
}

export default StampPanel
