import { useEffect, useRef, useState } from 'react'

interface StatsBarProps {
  todayCompleted: number
  inProgress: number
  total: number
}

interface StatCardProps {
  label: string
  value: number
  gradient: string
}

function StatCard({ label, value, gradient }: StatCardProps) {
  const [displayValue, setDisplayValue] = useState(0)
  const prevValueRef = useRef(0)
  const animationRef = useRef<number | null>(null)

  useEffect(() => {
    const startValue = prevValueRef.current
    const endValue = value
    const duration = 500
    const startTime = performance.now()

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime
      const progress = Math.min(elapsed / duration, 1)

      const easeOutQuart = 1 - Math.pow(1 - progress, 4)
      const currentValue = startValue + (endValue - startValue) * easeOutQuart

      setDisplayValue(Math.round(currentValue))

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate)
      } else {
        prevValueRef.current = endValue
      }
    }

    animationRef.current = requestAnimationFrame(animate)

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [value])

  return (
    <div className="stat-card glass-panel">
      <div className="stat-value-wrapper">
        <span className={`stat-value ${value !== prevValueRef.current ? 'animating' : ''}`}>
          {displayValue}
        </span>
      </div>
      <span className="stat-label">
        <span className={`stat-dot ${gradient}`}></span>
        {label}
      </span>
    </div>
  )
}

function StatsBar({ todayCompleted, inProgress, total }: StatsBarProps) {
  return (
    <div className="stats-bar">
      <StatCard label="今日完成" value={todayCompleted} gradient="gradient-success" />
      <StatCard label="进行中" value={inProgress} gradient="gradient-progress" />
      <StatCard label="总任务" value={total} gradient="gradient-total" />
    </div>
  )
}

export default StatsBar
