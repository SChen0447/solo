import { useState, useEffect, useRef, useMemo } from 'react'
import type { Habit, CheckInRecord, HabitStats, DayCellData } from '@/types'
import {
  formatDate,
  getMonthName,
  nextMonth,
  prevMonth,
  buildDayCells,
  getCompletionColor,
  getWeekDays,
  getWeekdayName,
} from '@/utils/date'

interface StatsPanelProps {
  habits: Habit[]
  records: CheckInRecord[]
  allStats: HabitStats[]
  activeHabitId: string | null
}

export function StatsPanel({ habits, records, allStats, activeHabitId }: StatsPanelProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [slideDirection, setSlideDirection] = useState<'left' | 'right' | null>(null)
  const [selectedCell, setSelectedCell] = useState<DayCellData | null>(null)
  const [hoveredPoint, setHoveredPoint] = useState<number | null>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const currentHabit = useMemo(() => {
    if (activeHabitId) {
      return habits.find((h) => h.id === activeHabitId) || null
    }
    return null
  }, [habits, activeHabitId])

  const dayCells = useMemo(() => {
    if (!currentHabit) return []
    return buildDayCells(currentHabit.id, currentMonth, records, currentHabit.targetMinutes)
  }, [currentHabit, currentMonth, records])

  const weekCompletionData = useMemo(() => {
    const weekDays = getWeekDays(new Date())
    return weekDays.map((date) => {
      const dateStr = formatDate(date)
      if (habits.length === 0) return 0
      let completedCount = 0
      habits.forEach((habit) => {
        const dayRecords = records.filter(
          (r) => r.habitId === habit.id && r.date === dateStr
        )
        const minutes = dayRecords.reduce((sum, r) => sum + r.completedMinutes, 0)
        if (minutes >= habit.targetMinutes) completedCount++
      })
      return Math.round((completedCount / habits.length) * 100)
    })
  }, [habits, records])

  const rankedHabits = useMemo(() => {
    return habits
      .map((habit) => {
        const stats = allStats.find((s) => s.habitId === habit.id)
        return { habit, stats }
      })
      .filter((item) => item.stats)
      .sort((a, b) => (b.stats?.completionRate ?? 0) - (a.stats?.completionRate ?? 0))
  }, [habits, allStats])

  const totalDays = useMemo(() => {
    return allStats.reduce((sum, s) => sum + s.totalDays, 0)
  }, [allStats])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    const rect = canvas.getBoundingClientRect()
    canvas.width = rect.width * dpr
    canvas.height = rect.height * dpr
    ctx.scale(dpr, dpr)

    const width = rect.width
    const height = rect.height
    const padding = { top: 20, right: 20, bottom: 30, left: 40 }
    const chartWidth = width - padding.left - padding.right
    const chartHeight = height - padding.top - padding.bottom

    ctx.clearRect(0, 0, width, height)

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)'
    ctx.lineWidth = 1
    for (let i = 0; i <= 4; i++) {
      const y = padding.top + (chartHeight / 4) * i
      ctx.beginPath()
      ctx.moveTo(padding.left, y)
      ctx.lineTo(width - padding.right, y)
      ctx.stroke()
    }

    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)'
    ctx.font = '10px sans-serif'
    ctx.textAlign = 'right'
    for (let i = 0; i <= 4; i++) {
      const y = padding.top + (chartHeight / 4) * i
      const value = 100 - i * 25
      ctx.fillText(`${value}%`, padding.left - 6, y + 3)
    }

    const points = weekCompletionData.map((value, index) => ({
      x: padding.left + (chartWidth / 6) * index,
      y: padding.top + chartHeight - (value / 100) * chartHeight,
      value,
    }))

    const gradient = ctx.createLinearGradient(0, padding.top, 0, padding.top + chartHeight)
    gradient.addColorStop(0, 'rgba(0, 210, 211, 0.3)')
    gradient.addColorStop(1, 'rgba(0, 210, 211, 0)')

    ctx.beginPath()
    ctx.moveTo(points[0].x, padding.top + chartHeight)
    points.forEach((p) => ctx.lineTo(p.x, p.y))
    ctx.lineTo(points[points.length - 1].x, padding.top + chartHeight)
    ctx.closePath()
    ctx.fillStyle = gradient
    ctx.fill()

    ctx.beginPath()
    ctx.strokeStyle = '#00d2d3'
    ctx.lineWidth = 2
    ctx.lineJoin = 'round'
    ctx.lineCap = 'round'
    points.forEach((p, i) => {
      if (i === 0) ctx.moveTo(p.x, p.y)
      else ctx.lineTo(p.x, p.y)
    })
    ctx.stroke()

    const weekDays = getWeekDays(new Date())
    points.forEach((p, i) => {
      ctx.beginPath()
      ctx.arc(p.x, p.y, hoveredPoint === i ? 6 : 4, 0, Math.PI * 2)
      ctx.fillStyle = hoveredPoint === i ? '#ff6b6b' : '#00d2d3'
      ctx.fill()
      ctx.strokeStyle = '#1a1a2e'
      ctx.lineWidth = 2
      ctx.stroke()

      ctx.fillStyle = 'rgba(255, 255, 255, 0.5)'
      ctx.font = '10px sans-serif'
      ctx.textAlign = 'center'
      const dayName = getWeekdayName(weekDays[i]).replace('星期', '周')
      ctx.fillText(dayName, p.x, height - 10)
    })

    if (hoveredPoint !== null) {
      const p = points[hoveredPoint]
      ctx.fillStyle = 'rgba(45, 45, 68, 0.95)'
      ctx.strokeStyle = '#00d2d3'
      ctx.lineWidth = 1
      const boxW = 50
      const boxH = 24
      const boxX = Math.min(Math.max(p.x - boxW / 2, 0), width - boxW)
      const boxY = p.y - 36
      ctx.beginPath()
      ctx.roundRect(boxX, boxY, boxW, boxH, 6)
      ctx.fill()
      ctx.stroke()
      ctx.fillStyle = '#fff'
      ctx.font = 'bold 12px sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText(`${p.value}%`, p.x, boxY + 16)
    }
  }, [weekCompletionData, hoveredPoint])

  const handlePrevMonth = () => {
    setSlideDirection('right')
    setTimeout(() => {
      setCurrentMonth(prevMonth(currentMonth))
      setSelectedCell(null)
      setTimeout(() => setSlideDirection(null), 50)
    }, 200)
  }

  const handleNextMonth = () => {
    setSlideDirection('left')
    setTimeout(() => {
      setCurrentMonth(nextMonth(currentMonth))
      setSelectedCell(null)
      setTimeout(() => setSlideDirection(null), 50)
    }, 200)
  }

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const width = rect.width
    const padding = { left: 40, right: 20 }
    const chartWidth = width - padding.left - padding.right
    const index = Math.round(((x - padding.left) / chartWidth) * 6)
    if (index >= 0 && index <= 6) {
      setHoveredPoint(index)
    } else {
      setHoveredPoint(null)
    }
  }

  const handleCanvasMouseLeave = () => {
    setHoveredPoint(null)
  }

  const getRankBorder = (index: number): string => {
    if (index === 0) return 'gold-border'
    if (index === 1) return 'silver-border'
    if (index === 2) return 'bronze-border'
    return ''
  }

  return (
    <div className="stats-panel">
      <div className="stats-summary">
        <div className="summary-card">
          <span className="summary-value">{totalDays}</span>
          <span className="summary-label">总坚持天数</span>
        </div>
        <div className="summary-card">
          <span className="summary-value">{habits.length}</span>
          <span className="summary-label">习惯总数</span>
        </div>
      </div>

      <div className="stats-section">
        <h3 className="section-title">本周完成率</h3>
        <div className="chart-container">
          <canvas
            ref={canvasRef}
            className="line-chart"
            onMouseMove={handleCanvasMouseMove}
            onMouseLeave={handleCanvasMouseLeave}
          />
        </div>
      </div>

      <div className="stats-section">
        <div className="section-header">
          <h3 className="section-title">
            {currentHabit ? `${currentHabit.icon} ${currentHabit.name} 完成日历` : '选择习惯查看日历'}
          </h3>
        </div>

        {currentHabit ? (
          <>
            <div className="calendar-header">
              <button className="cal-nav-btn" onClick={handlePrevMonth}>‹</button>
              <span className="cal-month-name">{getMonthName(currentMonth)}</span>
              <button className="cal-nav-btn" onClick={handleNextMonth}>›</button>
            </div>

            <div
              className={`calendar-grid ${slideDirection ? `slide-${slideDirection}` : ''}`}
              style={{ willChange: 'transform' }}
            >
              {['一', '二', '三', '四', '五', '六', '日'].map((d) => (
                <div key={d} className="cal-weekday">{d}</div>
              ))}
              {Array.from({ length: (new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).getDay() + 6) % 7 }).map((_, i) => (
                <div key={`empty-${i}`} className="cal-cell-empty" />
              ))}
              {dayCells.map((cell) => (
                <div
                  key={cell.date}
                  className="cal-cell"
                  style={{ backgroundColor: getCompletionColor(cell.completionPercent) }}
                  onClick={() => setSelectedCell(selectedCell?.date === cell.date ? null : cell)}
                  title={`${cell.date}: ${cell.completionPercent.toFixed(0)}%`}
                >
                  <span className="cal-cell-day">
                    {parseInt(cell.date.split('-')[2], 10)}
                  </span>
                  {selectedCell?.date === cell.date && cell.records.length > 0 && (
                    <div className="cal-tooltip">
                      <div className="cal-tooltip-date">{cell.date}</div>
                      {cell.records.map((r, i) => (
                        <div key={i} className="cal-tooltip-record">
                          <span>{r.checkInTime}</span>
                          <span>{r.completedMinutes}分钟</span>
                          {r.note && <span className="cal-tooltip-note">{r.note}</span>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="cal-legend">
              <span>少</span>
              <span className="legend-color" style={{ backgroundColor: '#2d2d44' }} />
              <span className="legend-color" style={{ backgroundColor: '#2d6a4f' }} />
              <span className="legend-color" style={{ backgroundColor: '#40916c' }} />
              <span className="legend-color" style={{ backgroundColor: '#52b788' }} />
              <span className="legend-color" style={{ backgroundColor: '#00d2d3' }} />
              <span>多</span>
            </div>
          </>
        ) : (
          <div className="empty-state small">
            <p>点击左侧习惯卡片查看历史完成记录</p>
          </div>
        )}
      </div>

      <div className="stats-section">
        <h3 className="section-title">习惯排行榜</h3>
        <div className="ranking-list">
          {rankedHabits.length === 0 ? (
            <div className="empty-state small">
              <p>暂无排行数据</p>
            </div>
          ) : (
            rankedHabits.map(({ habit, stats }, index) => (
              <div
                key={habit.id}
                className={`ranking-card ${getRankBorder(index)}`}
                style={{ willChange: 'transform' }}
              >
                <span className="ranking-index">{index + 1}</span>
                <span className="ranking-icon">{habit.icon}</span>
                <div className="ranking-info">
                  <span className="ranking-name">{habit.name}</span>
                  <span className="ranking-days">🔥 {stats?.currentStreak ?? 0}天</span>
                </div>
                <span className="ranking-rate">
                  {((stats?.completionRate ?? 0) * 100).toFixed(0)}%
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
