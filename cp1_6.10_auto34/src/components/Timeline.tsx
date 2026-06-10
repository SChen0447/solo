import { useState, useRef } from 'react'
import { HabitCard } from './HabitCard'
import type { Habit, CheckInRecord, HabitStats } from '@/types'
import { formatDate, getWeekdayName, isToday } from '@/utils/date'

interface TimelineProps {
  habits: Habit[]
  records: CheckInRecord[]
  allStats: HabitStats[]
  activeHabitId: string | null
  onSelectHabit: (id: string | null) => void
  onCheckIn: (habitId: string) => void
  onCancelCheckIn: (habitId: string) => void
  getTodayProgress: (habitId: string) => number
  getTodayMinutes: (habitId: string) => number
}

export function Timeline({
  habits,
  allStats,
  activeHabitId,
  onSelectHabit,
  onCheckIn,
  onCancelCheckIn,
  getTodayProgress,
  getTodayMinutes,
}: TimelineProps) {
  const [sliderPosition, setSliderPosition] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)
  const touchStartX = useRef(0)
  const touchCurrentX = useRef(0)

  const today = new Date()
  const todayStr = formatDate(today)

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX
    touchCurrentX.current = e.touches[0].clientX
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    touchCurrentX.current = e.touches[0].clientX
    const diff = touchCurrentX.current - touchStartX.current
    setSliderPosition(Math.max(-100, Math.min(100, diff)))
  }

  const handleTouchEnd = () => {
    setSliderPosition(0)
  }

  return (
    <div className="timeline-container">
      <div className="timeline-header">
        <div className="timeline-date">
          <h2 className="today-label">
            {isToday(today) ? '今日打卡' : getWeekdayName(today)}
          </h2>
          <span className="today-date">{todayStr}</span>
        </div>
      </div>

      <div
        ref={containerRef}
        className="timeline-list"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{
          transform: `translateX(${sliderPosition * 0.1}px)`,
          transition: sliderPosition === 0 ? 'transform 0.3s ease' : 'none',
          willChange: 'transform',
        }}
      >
        {habits.length === 0 ? (
          <div className="empty-state">
            <span className="empty-icon">🎯</span>
            <p>还没有习惯，点击右上角添加第一个习惯吧！</p>
          </div>
        ) : (
          habits.map((habit) => {
            const stats = allStats.find((s) => s.habitId === habit.id)
            return (
              <HabitCard
                key={habit.id}
                habit={habit}
                progress={getTodayProgress(habit.id)}
                streak={stats?.currentStreak ?? 0}
                todayMinutes={getTodayMinutes(habit.id)}
                onCheckIn={onCheckIn}
                onCancelCheckIn={onCancelCheckIn}
                onClick={() => onSelectHabit(activeHabitId === habit.id ? null : habit.id)}
                isActive={activeHabitId === habit.id}
              />
            )
          })
        )}
      </div>
    </div>
  )
}
