import { useState, useCallback, useRef } from 'react'
import type { EmotionType } from '@/store/fireplaceStore'

interface ControlPanelProps {
  onAddEmber: (emotion: EmotionType) => void
}

interface EmotionButton {
  emotion: EmotionType
  emoji: string
  label: string
  glowColor: string
  shadowColor: string
}

const EMOTIONS: EmotionButton[] = [
  { emotion: 'joy', emoji: '😊', label: '喜悦', glowColor: '#ffd700', shadowColor: 'rgba(255, 215, 0, 0.6)' },
  { emotion: 'sadness', emoji: '😢', label: '悲伤', glowColor: '#4a90d9', shadowColor: 'rgba(74, 144, 217, 0.6)' },
  { emotion: 'anger', emoji: '😠', label: '愤怒', glowColor: '#ff4500', shadowColor: 'rgba(255, 69, 0, 0.6)' },
  { emotion: 'serenity', emoji: '😌', label: '宁静', glowColor: '#98d8c8', shadowColor: 'rgba(152, 216, 200, 0.6)' },
]

interface FlyingLog {
  id: number
  emotion: EmotionType
  startX: number
  startY: number
  endX: number
  endY: number
}

export default function ControlPanel({ onAddEmber }: ControlPanelProps) {
  const [flyingLogs, setFlyingLogs] = useState<FlyingLog[]>([])
  const logIdRef = useRef(0)

  const handleAddEmber = useCallback((emotion: EmotionType, e?: React.MouseEvent | React.TouchEvent) => {
    const buttonEl = (e?.target as HTMLElement)?.closest('.emotion-btn')
    const rect = buttonEl?.getBoundingClientRect()
    const startX = rect ? rect.left + rect.width / 2 : window.innerWidth / 2
    const startY = rect ? rect.top : window.innerHeight - 100
    const endX = window.innerWidth / 2 + (Math.random() - 0.5) * 100
    const endY = window.innerHeight * 0.45

    const id = logIdRef.current++
    setFlyingLogs((prev) => [...prev, { id, emotion, startX, startY, endX, endY }])

    setTimeout(() => {
      onAddEmber(emotion)
    }, 600)

    setTimeout(() => {
      setFlyingLogs((prev) => prev.filter((l) => l.id !== id))
    }, 700)
  }, [onAddEmber])

  const handleDragStart = useCallback((e: React.DragEvent, emotion: EmotionType) => {
    e.dataTransfer.setData('emotion', emotion)
    e.dataTransfer.effectAllowed = 'copy'
  }, [])

  const getEmojiForEmotion = (emotion: EmotionType): string => {
    return EMOTIONS.find((e) => e.emotion === emotion)?.emoji || ''
  }

  return (
    <div className="control-panel">
      <div className="button-row">
        {EMOTIONS.map((item) => (
          <button
            key={item.emotion}
            className="emotion-btn"
            onClick={(e) => handleAddEmber(item.emotion, e)}
            draggable
            onDragStart={(e) => handleDragStart(e, item.emotion)}
            style={{
              '--glow-color': item.glowColor,
              '--shadow-color': item.shadowColor,
            } as React.CSSProperties}
          >
            <span className="emotion-emoji">{item.emoji}</span>
            <span className="emotion-label">{item.label}</span>
          </button>
        ))}
      </div>

      {flyingLogs.map((log) => (
        <div
          key={log.id}
          className="flying-log"
          style={{
            '--start-x': `${log.startX}px`,
            '--start-y': `${log.startY}px`,
            '--end-x': `${log.endX}px`,
            '--end-y': `${log.endY}px`,
          } as React.CSSProperties}
        >
          {getEmojiForEmotion(log.emotion)}
        </div>
      ))}
    </div>
  )
}
