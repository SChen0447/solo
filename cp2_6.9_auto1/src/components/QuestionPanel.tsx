import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { Question, QuestionPhase } from '../types'
import '../styles/QuestionPanel.css'

interface QuestionPanelProps {
  question: Question | null
  phase: QuestionPhase
  onTimeout: () => void
  isHost?: boolean
  onTerminate?: () => void
}

export const QuestionPanel: React.FC<QuestionPanelProps> = React.memo(({
  question,
  phase,
  onTimeout,
  isHost = false,
  onTerminate
}) => {
  const [timeLeft, setTimeLeft] = useState<number>(0)
  const [showCorrect, setShowCorrect] = useState(false)
  const intervalRef = useRef<number | null>(null)
  const startTimeRef = useRef<number>(0)

  const clearTimer = useCallback(() => {
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }, [])

  const startTimer = useCallback((duration: number) => {
    clearTimer()
    setTimeLeft(duration)
    startTimeRef.current = performance.now()

    intervalRef.current = window.setInterval(() => {
      const elapsed = (performance.now() - startTimeRef.current) / 1000
      const remaining = Math.max(0, duration - elapsed)
      setTimeLeft(remaining)

      if (remaining <= 0) {
        clearTimer()
      }
    }, 50)
  }, [clearTimer])

  useEffect(() => {
    if (phase === 'active' && question) {
      startTimer(question.duration)
      setShowCorrect(false)
    } else if (phase === 'revealed') {
      clearTimer()
      setShowCorrect(true)
    } else {
      clearTimer()
      setShowCorrect(false)
      setTimeLeft(0)
    }
    return clearTimer
  }, [phase, question, startTimer, clearTimer])

  useEffect(() => {
    if (phase === 'active' && timeLeft <= 0 && question) {
      onTimeout()
    }
  }, [timeLeft, phase, question, onTimeout])

  const progressPercent = useMemo(() => {
    if (!question || question.duration === 0) return 0
    return Math.max(0, Math.min(100, (timeLeft / question.duration) * 100))
  }, [timeLeft, question])

  const displayTime = useMemo(() => {
    return Math.ceil(timeLeft).toString()
  }, [timeLeft])

  if (!question) {
    return (
      <div className="question-panel empty">
        <div className="empty-state">
          <div className="empty-icon">📝</div>
          <p>等待题目发布...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="question-panel">
      <div className="question-header">
        <div className="timer-section">
          <div className={`timer-display ${timeLeft <= 5 ? 'urgent' : ''}`}>
            {displayTime}s
          </div>
          <div className="progress-bar">
            <div
              className="progress-fill"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
        {isHost && phase === 'active' && onTerminate && (
          <button className="terminate-btn" onClick={onTerminate}>
            强制下一题
          </button>
        )}
      </div>

      <div className="question-card">
        <h2 className="question-text">{question.text}</h2>
        <div className="options-grid">
          {question.options.map((option) => {
            const isCorrect = showCorrect && option.key === question.correctAnswer
            return (
              <div
                key={option.key}
                className={`option-item ${isCorrect ? 'correct' : ''}`}
              >
                <span className="option-key">{option.key}</span>
                <span className="option-text">{option.text}</span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
})

QuestionPanel.displayName = 'QuestionPanel'
