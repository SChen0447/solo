import { useEffect, useRef, useCallback } from 'react'

interface TimelineProps {
  startTime: number
  currentTime: number
  isPlaying: boolean
  onTimeChange: (time: number) => void
  onPlayToggle: () => void
}

function formatTime(timestamp: number): string {
  const d = new Date(timestamp)
  const h = d.getHours().toString().padStart(2, '0')
  const m = d.getMinutes().toString().padStart(2, '0')
  const s = d.getSeconds().toString().padStart(2, '0')
  return `${h}:${m}:${s}`
}

export default function Timeline({
  startTime,
  currentTime,
  isPlaying,
  onTimeChange,
  onPlayToggle
}: TimelineProps) {
  const endTime = useRef(Date.now())
  const rafRef = useRef<number | null>(null)

  useEffect(() => {
    endTime.current = Date.now()
  }, [startTime])

  const tick = useCallback(() => {
    const now = Date.now()
    endTime.current = now
    const playSpeed = 500
    let next = currentTime + playSpeed / 30
    if (next > now) next = now
    onTimeChange(next)
    rafRef.current = requestAnimationFrame(tick)
  }, [startTime, currentTime, onTimeChange])

  useEffect(() => {
    if (isPlaying) {
      rafRef.current = requestAnimationFrame(tick)
    } else if (rafRef.current) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [isPlaying, tick])

  useEffect(() => {
    const interval = setInterval(() => {
      endTime.current = Date.now()
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  const now = endTime.current
  const minTime = Math.max(startTime, now - 30 * 60 * 1000)
  const range = now - minTime
  const clampedCurrent = Math.min(Math.max(currentTime, minTime), now)
  const progress = range > 0 ? ((clampedCurrent - minTime) / range) * 100 : 0

  const marks = []
  const markInterval = 5 * 60 * 1000
  for (let t = minTime; t <= now; t += markInterval) {
    const pos = range > 0 ? ((t - minTime) / range) * 100 : 0
    marks.push(
      <div
        key={t}
        className="timeline-mark"
        style={{ left: `${pos}%` }}
      />
    )
  }

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const percent = Number(e.target.value) / 100
    const newTime = minTime + percent * range
    onTimeChange(newTime)
  }

  return (
    <>
      <div className="playback-controls">
        <button
          className="play-btn"
          onClick={onPlayToggle}
          title={isPlaying ? '暂停' : '播放'}
        >
          {isPlaying ? '⏸' : '▶'}
        </button>
        <div className="current-time-display">
          {formatTime(clampedCurrent)}
        </div>
      </div>
      <div className="timeline-container">
        <div className="timeline-label">
          <span>{formatTime(minTime)}</span>
          <span>{formatTime(now)}</span>
        </div>
        <div className="timeline-track">
          <div
            className="timeline-progress"
            style={{ width: `${progress}%` }}
          />
          <div className="timeline-marks">{marks}</div>
          <div
            className="timeline-thumb"
            style={{ left: `${progress}%` }}
          />
          <input
            type="range"
            min="0"
            max="100"
            step="0.1"
            value={progress}
            onChange={handleSliderChange}
            className="timeline-input"
          />
        </div>
      </div>
    </>
  )
}
