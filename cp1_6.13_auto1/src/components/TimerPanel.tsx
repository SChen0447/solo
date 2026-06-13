import { useEffect, useRef } from 'react'

interface TimerPanelProps {
  seconds: number
  totalSeconds: number
  isRunning: boolean
  onStart: () => void
  onPause: () => void
  onReset: () => void
}

function TimerPanel({
  seconds,
  totalSeconds,
  isRunning,
  onStart,
  onPause,
  onReset,
}: TimerPanelProps) {
  const progressRef = useRef<SVGCircleElement>(null)

  const formatTime = (secs: number) => {
    const minutes = Math.floor(secs / 60)
    const seconds = Math.floor(secs % 60)
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
  }

  const progress = totalSeconds > 0 ? (1 - seconds / totalSeconds) : 0

  const radius = 120
  const circumference = 2 * Math.PI * radius

  useEffect(() => {
    if (progressRef.current) {
      const offset = circumference - progress * circumference
      progressRef.current.style.strokeDashoffset = offset.toString()
    }
  }, [progress, circumference])

  return (
    <div className="panel glass-panel timer-panel">
      <h2 className="panel-title">
        <span className="panel-icon">🍅</span>
        番茄钟
      </h2>

      <div className="timer-container">
        <svg className="timer-svg" viewBox="0 0 280 280">
          <defs>
            <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#6366f1" />
              <stop offset="100%" stopColor="#a855f7" />
            </linearGradient>
          </defs>
          <circle
            className="timer-track"
            cx="140"
            cy="140"
            r={radius}
            fill="none"
            strokeWidth="8"
          />
          <circle
            ref={progressRef}
            className="timer-progress"
            cx="140"
            cy="140"
            r={radius}
            fill="none"
            stroke="url(#progressGradient)"
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={circumference}
            transform="rotate(-90 140 140)"
          />
        </svg>

        <div className="timer-display">
          <span className="timer-time">{formatTime(seconds)}</span>
          <span className="timer-label">
            {isRunning ? '专注中...' : seconds === 0 ? '已完成！' : '准备开始'}
          </span>
        </div>
      </div>

      <div className="timer-controls">
        {!isRunning ? (
          <button className="control-button primary" onClick={onStart}>
            开始
          </button>
        ) : (
          <button className="control-button secondary" onClick={onPause}>
            暂停
          </button>
        )}
        <button className="control-button ghost" onClick={onReset}>
          重置
        </button>
      </div>
    </div>
  )
}

export default TimerPanel
