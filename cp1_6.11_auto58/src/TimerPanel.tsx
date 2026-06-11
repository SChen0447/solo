import { useState, useEffect, useRef, useCallback } from 'react'

interface TimerPanelProps {
  initialDuration?: number
  onFinish?: () => void
}

function playBeep() {
  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext
    const audioCtx = new AudioContext()
    const oscillator = audioCtx.createOscillator()
    const gainNode = audioCtx.createGain()

    oscillator.type = 'sine'
    oscillator.frequency.setValueAtTime(440, audioCtx.currentTime)

    gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime)
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3)

    oscillator.connect(gainNode)
    gainNode.connect(audioCtx.destination)

    oscillator.start(audioCtx.currentTime)
    oscillator.stop(audioCtx.currentTime + 0.3)

    setTimeout(() => audioCtx.close(), 500)
  } catch (e) {
    console.warn('Audio not supported:', e)
  }
}

function formatTime(totalSeconds: number) {
  const absSeconds = Math.max(0, totalSeconds)
  const minutes = Math.floor(absSeconds / 60)
  const seconds = absSeconds % 60
  return {
    mm: String(minutes).padStart(2, '0'),
    ss: String(seconds).padStart(2, '0'),
  }
}

export default function TimerPanel({ initialDuration, onFinish }: TimerPanelProps) {
  const initialMin = initialDuration ? Math.floor(initialDuration / 60) : 5
  const initialSec = initialDuration ? initialDuration % 60 : 0

  const [inputMin, setInputMin] = useState<number>(initialMin)
  const [inputSec, setInputSec] = useState<number>(initialSec)
  const [remaining, setRemaining] = useState<number>(initialMin * 60 + initialSec)
  const [isRunning, setIsRunning] = useState(false)
  const [isFinished, setIsFinished] = useState(false)
  const [isFlashing, setIsFlashing] = useState(false)

  const intervalRef = useRef<number | null>(null)
  const finishCallbackRef = useRef(onFinish)

  finishCallbackRef.current = onFinish

  const handleFinish = useCallback(() => {
    setIsRunning(false)
    setIsFinished(true)
    setIsFlashing(true)
    playBeep()

    const flashTimeout = setTimeout(() => {
      setIsFlashing(false)
    }, 3600)

    if (finishCallbackRef.current) {
      finishCallbackRef.current()
    }

    return () => clearTimeout(flashTimeout)
  }, [])

  useEffect(() => {
    if (isRunning) {
      intervalRef.current = window.setInterval(() => {
        setRemaining((prev) => {
          if (prev <= 1) {
            handleFinish()
            return 0
          }
          return prev - 1
        })
      }, 1000)
    }

    return () => {
      if (intervalRef.current !== null) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [isRunning, handleFinish])

  const handleStartPause = () => {
    if (isFinished) {
      setIsFinished(false)
      setIsFlashing(false)
      const total = inputMin * 60 + inputSec
      setRemaining(total)
      if (total > 0) {
        setIsRunning(true)
      }
      return
    }

    if (isRunning) {
      setIsRunning(false)
    } else {
      if (remaining <= 0) {
        const total = inputMin * 60 + inputSec
        if (total <= 0) return
        setRemaining(total)
      }
      setIsRunning(true)
    }
  }

  const handleReset = () => {
    setIsRunning(false)
    setIsFinished(false)
    setIsFlashing(false)
    const total = inputMin * 60 + inputSec
    setRemaining(total)
  }

  const handleMinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value || '0', 10)
    const clamped = Math.max(0, Math.min(999, isNaN(val) ? 0 : val))
    setInputMin(clamped)
    if (!isRunning) {
      setRemaining(clamped * 60 + inputSec)
      setIsFinished(false)
    }
  }

  const handleSecChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value || '0', 10)
    const clamped = Math.max(0, Math.min(59, isNaN(val) ? 0 : val))
    setInputSec(clamped)
    if (!isRunning) {
      setRemaining(inputMin * 60 + clamped)
      setIsFinished(false)
    }
  }

  const handlePreset = (minutes: number) => {
    if (isRunning) return
    setInputMin(minutes)
    setInputSec(0)
    setRemaining(minutes * 60)
    setIsFinished(false)
  }

  const { mm, ss } = formatTime(remaining)
  const totalInput = inputMin * 60 + inputSec

  const getStatusText = () => {
    if (isFinished) return '⏰ 时间到！'
    if (isRunning) return '⏳ 烹饪中...'
    if (remaining === 0 && totalInput === 0) return '设置时间后开始'
    if (remaining === totalInput || totalInput === 0) return '准备就绪'
    return '已暂停'
  }

  const getTimeClass = () => {
    if (isFinished) return 'finished'
    if (isRunning) return 'running'
    return ''
  }

  return (
    <div className="timer-panel">
      <h3 className="timer-title">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="13" r="8" />
          <path d="M12 9v4l2 2" />
          <path d="M9 2h6" />
        </svg>
        烹饪计时器
      </h3>

      <div className={`timer-display${isFlashing ? ' flashing' : ''}`}>
        <div className={`timer-time ${getTimeClass()}`}>
          {mm}:{ss}
        </div>
        <div className="timer-status">{getStatusText()}</div>
      </div>

      <div className="timer-inputs">
        <div className="timer-input-group">
          <label className="timer-input-label">分钟</label>
          <input
            type="number"
            className="timer-input"
            min="0"
            max="999"
            value={inputMin}
            onChange={handleMinChange}
            disabled={isRunning}
          />
        </div>
        <div className="timer-input-group">
          <label className="timer-input-label">秒</label>
          <input
            type="number"
            className="timer-input"
            min="0"
            max="59"
            value={inputSec}
            onChange={handleSecChange}
            disabled={isRunning}
          />
        </div>
      </div>

      <div className="timer-presets">
        <button className="timer-preset-btn" onClick={() => handlePreset(1)} disabled={isRunning}>
          1分钟
        </button>
        <button className="timer-preset-btn" onClick={() => handlePreset(5)} disabled={isRunning}>
          5分钟
        </button>
        <button className="timer-preset-btn" onClick={() => handlePreset(10)} disabled={isRunning}>
          10分钟
        </button>
        <button className="timer-preset-btn" onClick={() => handlePreset(15)} disabled={isRunning}>
          15分钟
        </button>
        <button className="timer-preset-btn" onClick={() => handlePreset(30)} disabled={isRunning}>
          30分钟
        </button>
        <button className="timer-preset-btn" onClick={() => handlePreset(60)} disabled={isRunning}>
          60分钟
        </button>
      </div>

      <div className="timer-buttons">
        <button
          className="timer-btn timer-btn-primary"
          onClick={handleStartPause}
          disabled={!isRunning && totalInput === 0}
        >
          {isFinished ? (
            <>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M6 4h4v16H6zM14 4h4v16h-4z" />
              </svg>
              重新开始
            </>
          ) : isRunning ? (
            <>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M6 4h4v16H6zM14 4h4v16h-4z" />
              </svg>
              暂停
            </>
          ) : (
            <>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M8 5v14l11-7z" />
              </svg>
              开始
            </>
          )}
        </button>
        <button
          className="timer-btn timer-btn-secondary"
          onClick={handleReset}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
            <path d="M3 3v5h5" />
          </svg>
          重置
        </button>
      </div>
    </div>
  )
}
