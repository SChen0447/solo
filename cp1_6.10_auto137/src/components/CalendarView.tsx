import { useState, useMemo } from 'react'
import { Article, MoodType } from '../IndexedDBStorage'

interface Props {
  articles: Article[]
}

const MOOD_LABELS: Record<MoodType, string> = {
  sunny: '晴',
  cloudy: '阴',
  rainy: '雨',
  snowy: '雪',
  thunder: '雷电'
}

const MOOD_ICONS: Record<MoodType, string> = {
  sunny: '☀️',
  cloudy: '☁️',
  rainy: '🌧️',
  snowy: '❄️',
  thunder: '⚡'
}

const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六']

function stripHtml(html: string): string {
  const tmp = document.createElement('div')
  tmp.innerHTML = html
  return tmp.textContent || tmp.innerText || ''
}

function formatTime(iso: string): string {
  const d = new Date(iso)
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(
    d.getDate()
  ).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(
    d.getMinutes()
  ).padStart(2, '0')}`
}

function CalendarView({ articles }: Props) {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [slideDirection, setSlideDirection] = useState<'left' | 'right' | null>(
    null
  )
  const [animatingKey, setAnimatingKey] = useState(0)

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()

  const articlesByDate = useMemo(() => {
    const map = new Map<string, Article>()
    for (const a of articles) {
      const d = new Date(a.createdAt)
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
      if (!map.has(key)) {
        map.set(key, a)
      }
    }
    return map
  }, [articles])

  const moodStats = useMemo(() => {
    const stats: Record<MoodType, number> = {
      sunny: 0,
      cloudy: 0,
      rainy: 0,
      snowy: 0,
      thunder: 0
    }
    const monthStart = new Date(year, month, 1)
    const monthEnd = new Date(year, month + 1, 0)
    for (const a of articles) {
      const d = new Date(a.createdAt)
      if (d >= monthStart && d <= monthEnd) {
        stats[a.mood]++
      }
    }
    return stats
  }, [articles, year, month])

  const changeMonth = (delta: number) => {
    const direction = delta > 0 ? 'left' : 'right'
    setSlideDirection(direction)
    setTimeout(() => {
      setCurrentDate(
        new Date(year, month + delta, 1)
      )
      setAnimatingKey((k) => k + 1)
      setTimeout(() => setSlideDirection(null), 50)
    }, 300)
  }

  const renderCalendar = () => {
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const startWeekday = firstDay.getDay()
    const daysInMonth = lastDay.getDate()
    const today = new Date()

    const cells: React.ReactNode[] = []

    WEEKDAYS.forEach((w) => {
      cells.push(
        <div key={`w-${w}`} className="weekday-label">
          {w}
        </div>
      )
    })

    for (let i = 0; i < startWeekday; i++) {
      cells.push(<div key={`empty-pre-${i}`} className="day-cell empty" />)
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const key = `${year}-${month}-${day}`
      const article = articlesByDate.get(key)
      const isToday =
        today.getFullYear() === year &&
        today.getMonth() === month &&
        today.getDate() === day

      const classes = ['day-cell']
      if (article) classes.push(`has-article`)
      if (isToday) classes.push('today')

      cells.push(
        <div
          key={day}
          className={classes.join(' ')}
          data-mood={article?.mood}
        >
          <span className="day-number">{day}</span>
          {article && (
            <span className="day-stars">
              {'★'.repeat(article.rating)}
              {'☆'.repeat(5 - article.rating)}
            </span>
          )}
          {article && (
            <div className="tooltip">
              <div className="tooltip-title">
                {article.title || stripHtml(article.content).slice(0, 20)}
              </div>
              <div className="tooltip-meta">
                <span>{MOOD_ICONS[article.mood]}</span>
                <span>{MOOD_LABELS[article.mood]}</span>
                <span>
                  {'★'.repeat(article.rating)}
                </span>
              </div>
              <div className="tooltip-meta" style={{ marginTop: '4px' }}>
                🕒 {formatTime(article.createdAt)}
              </div>
              <div
                className="tooltip-meta"
                style={{ marginTop: '4px', display: 'block' }}
              >
                {stripHtml(article.content).slice(0, 20)}
                {stripHtml(article.content).length > 20 ? '...' : ''}
              </div>
            </div>
          )}
        </div>
      )
    }

    const remaining = 42 - (startWeekday + daysInMonth)
    for (let i = 0; i < remaining; i++) {
      cells.push(<div key={`empty-post-${i}`} className="day-cell empty" />)
    }

    return cells
  }

  return (
    <>
      <div className="calendar-header">
        <button
          className="calendar-nav-btn"
          onClick={() => changeMonth(-1)}
          aria-label="上个月"
        >
          ‹
        </button>
        <div className="calendar-title">
          {year}年 {month + 1}月
        </div>
        <button
          className="calendar-nav-btn"
          onClick={() => changeMonth(1)}
          aria-label="下个月"
        >
          ›
        </button>
      </div>

      <div className="calendar-month">
        <div
          key={animatingKey}
          className={`calendar-grid ${
            slideDirection === 'left'
              ? 'slide-left-enter'
              : slideDirection === 'right'
              ? 'slide-right-enter'
              : ''
          }`}
        >
          {renderCalendar()}
        </div>
      </div>

      <div className="mood-trend">
        <div className="mood-trend-title">本月心情分布</div>
        <div className="mood-stats">
          {(Object.keys(MOOD_LABELS) as MoodType[]).map((m) => (
            <div key={m} className="mood-stat-item">
              <div className="mood-stat-icon">{MOOD_ICONS[m]}</div>
              <div className="mood-stat-count">{moodStats[m]}</div>
              <div className="mood-stat-label">{MOOD_LABELS[m]}</div>
            </div>
          ))}
        </div>
      </div>
    </>
  )
}

export default CalendarView
