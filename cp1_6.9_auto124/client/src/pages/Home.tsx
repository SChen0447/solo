import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api.js'
import TimelineCard from '../components/TimelineCard.jsx'

interface LetterData {
  id: string
  content: string | null
  envelopeColor: string
  stamp: string
  season: string
  openDate: string
  isOpened: boolean
  isArrived: boolean
}

export default function Home() {
  const navigate = useNavigate()
  const [letters, setLetters] = useState<LetterData[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadLetters()
  }, [])

  const loadLetters = async () => {
    try {
      const data = await api.getLetters()
      setLetters(data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const pendingCount = letters.filter((l) => !l.isArrived).length
  const totalCount = letters.length
  const recentLetters = letters.slice(0, 3)

  return (
    <div>
      <h1 className="page-title">欢迎来到时光邮局</h1>

      <div className="home-stats">
        <div className="stat-card">
          <div className="stat-number">{totalCount}</div>
          <div className="stat-label">总信件数</div>
        </div>
        <div className="stat-card">
          <div className="stat-number">{pendingCount}</div>
          <div className="stat-label">未抵达</div>
        </div>
        <div className="stat-card">
          <div className="stat-number">{totalCount - pendingCount}</div>
          <div className="stat-label">已抵达</div>
        </div>
      </div>

      <div className="home-actions">
        <button className="btn" onClick={() => navigate('/new')}>
          ✍️ 写一封新信
        </button>
        <button className="btn btn-secondary" onClick={() => navigate('/list')}>
          📬 查看所有信件
        </button>
      </div>

      {!loading && recentLetters.length > 0 && (
        <div className="recent-letters">
          <h2 className="section-title">最近的信件</h2>
          <div className="timeline-grid">
            {recentLetters.map((letter) => (
              <TimelineCard key={letter.id} letter={letter} />
            ))}
          </div>
        </div>
      )}

      {!loading && letters.length === 0 && (
        <div className="empty-state">
          <div className="empty-state-icon">💌</div>
          <div className="empty-state-text">还没有信件，写一封给未来的信吧</div>
          <button className="btn" onClick={() => navigate('/new')}>开始写信</button>
        </div>
      )}
    </div>
  )
}
