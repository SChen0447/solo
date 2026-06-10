import { useState, useEffect } from 'react'
import type { Habit } from '@/types'

interface HabitCardProps {
  habit: Habit
  progress: number
  streak: number
  todayMinutes: number
  onCheckIn: (habitId: string) => void
  onCancelCheckIn: (habitId: string) => void
  onClick?: () => void
  isActive?: boolean
}

export function HabitCard({
  habit,
  progress,
  streak,
  todayMinutes,
  onCheckIn,
  onCancelCheckIn,
  onClick,
  isActive = false,
}: HabitCardProps) {
  const [animatedProgress, setAnimatedProgress] = useState(0)
  const [isAnimating, setIsAnimating] = useState(false)

  useEffect(() => {
    if (progress !== animatedProgress) {
      setIsAnimating(true)
      setAnimatedProgress(progress)
      const timer = setTimeout(() => setIsAnimating(false), 800)
      return () => clearTimeout(timer)
    }
  }, [progress, animatedProgress])

  const radius = 28
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference - (animatedProgress / 100) * circumference

  const isCompleted = progress >= 100
  const isBigFlame = streak > 7

  const handleRingClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (isCompleted) {
      onCancelCheckIn(habit.id)
    } else {
      onCheckIn(habit.id)
    }
  }

  return (
    <div
      className={`habit-card ${isActive ? 'active' : ''}`}
      onClick={onClick}
      style={{ willChange: 'transform' }}
    >
      <div className="habit-card-header">
        <span className="habit-icon">{habit.icon}</span>
        <div className="habit-info">
          <h4 className="habit-name">{habit.name}</h4>
          <div className="habit-streak">
            <span className={`flame ${isBigFlame ? 'big' : ''}`}>🔥</span>
            <span className="streak-count">{streak}</span>
            <span className="streak-label">天</span>
          </div>
        </div>
      </div>

      <div className="habit-progress-ring-wrap">
        <svg className="progress-ring" width="72" height="72" onClick={handleRingClick}>
          <circle
            className="progress-ring-bg"
            cx="36"
            cy="36"
            r={radius}
            fill="none"
            stroke="#2d2d44"
            strokeWidth="5"
          />
          <circle
            className={`progress-ring-fill ${isAnimating ? 'animating' : ''}`}
            cx="36"
            cy="36"
            r={radius}
            fill="none"
            stroke={isCompleted ? '#00d2d3' : '#52b788'}
            strokeWidth="5"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            transform="rotate(-90 36 36)"
            style={{ transition: 'stroke-dashoffset 0.8s cubic-bezier(0.4, 0, 0.2, 1)' }}
          />
          <text
            className="progress-text"
            x="36"
            y="32"
            textAnchor="middle"
            fill="#fff"
            fontSize="13"
            fontWeight="600"
          >
            {todayMinutes}
          </text>
          <text
            className="progress-text-sub"
            x="36"
            y="46"
            textAnchor="middle"
            fill="#888"
            fontSize="10"
          >
            /{habit.targetMinutes}分
          </text>
        </svg>
      </div>
    </div>
  )
}
