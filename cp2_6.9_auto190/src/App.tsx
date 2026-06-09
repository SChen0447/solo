import { useState, useEffect, useCallback } from 'react'
import RadarChart from './components/RadarChart'
import CardList from './components/CardList'

interface User {
  id: string
  username: string
  createdAt: string
}

interface TastingRecord {
  id: string
  userId: string
  username: string
  coffeeName: string
  acidity: number
  sweetness: number
  bitterness: number
  aroma: number
  aftertaste: number
  tags: string[]
  notes?: string
  likes: number
  likedBy: string[]
  comments: { id: string; userId: string; username: string; content: string; createdAt: string }[]
  isPublic: boolean
  createdAt: string
}

const DIMENSIONS = ['酸度', '甜度', '苦味', '香气', '余韵']

function App() {
  const [user, setUser] = useState<User | null>(null)
  const [records, setRecords] = useState<TastingRecord[]>([])
  const [recommendations, setRecommendations] = useState<TastingRecord[]>([])
  const [loading, setLoading] = useState(false)

  const [loginName, setLoginName] = useState('')
  const [coffeeName, setCoffeeName] = useState('')
  const [coffeeNotes, setCoffeeNotes] = useState('')
  const [coffeeTags, setCoffeeTags] = useState('')
  const [ratings, setRatings] = useState<number[]>([5, 5, 5, 5, 5])
  const [submitting, setSubmitting] = useState(false)

  const fetchRecords = useCallback(async () => {
    try {
      const res = await fetch('/api/records')
      const data = await res.json()
      setRecords(data)
    } catch (err) {
      console.error('获取记录失败:', err)
    }
  }, [])

  const fetchRecommendations = useCallback(async (userId: string) => {
    try {
      const res = await fetch(`/api/recommendations/${userId}`)
      const data = await res.json()
      setRecommendations(data)
    } catch (err) {
      console.error('获取推荐失败:', err)
    }
  }, [])

  useEffect(() => {
    fetchRecords()
  }, [fetchRecords])

  useEffect(() => {
    if (user) {
      fetchRecommendations(user.id)
    }
  }, [user, records, fetchRecommendations])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!loginName.trim()) return

    setLoading(true)
    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: loginName.trim() })
      })
      const data = await res.json()
      setUser(data)
      setLoginName('')
    } catch (err) {
      console.error('登录失败:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = () => {
    setUser(null)
    setRecommendations([])
  }

  const handleRatingChange = (index: number, value: number) => {
    const newRatings = [...ratings]
    newRatings[index] = value
    setRatings(newRatings)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !coffeeName.trim()) return

    setSubmitting(true)
    try {
      const tagsArr = coffeeTags
        .split(/[,，、\s]+/)
        .map(t => t.trim())
        .filter(t => t.length > 0)

      const res = await fetch('/api/records', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          coffeeName: coffeeName.trim(),
          acidity: ratings[0],
          sweetness: ratings[1],
          bitterness: ratings[2],
          aroma: ratings[3],
          aftertaste: ratings[4],
          tags: tagsArr,
          notes: coffeeNotes.trim() || undefined,
          isPublic: true
        })
      })

      if (res.ok) {
        const newRecord = await res.json()
        setRecords(prev => [newRecord, ...prev])
        setCoffeeName('')
        setCoffeeNotes('')
        setCoffeeTags('')
        setRatings([5, 5, 5, 5, 5])
      }
    } catch (err) {
      console.error('提交记录失败:', err)
    } finally {
      setSubmitting(false)
    }
  }

  const handleLike = async (recordId: string) => {
    if (!user) return
    try {
      const res = await fetch(`/api/records/${recordId}/like`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id })
      })
      const updated = await res.json()
      setRecords(prev => prev.map(r => (r.id === recordId ? updated : r)))
      setRecommendations(prev => prev.map(r => (r.id === recordId ? updated : r)))
    } catch (err) {
      console.error('点赞失败:', err)
    }
  }

  const handleComment = async (recordId: string, content: string) => {
    if (!user || !content.trim()) return
    try {
      const res = await fetch(`/api/records/${recordId}/comment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, content: content.trim() })
      })
      const updated = await res.json()
      setRecords(prev => prev.map(r => (r.id === recordId ? updated : r)))
      setRecommendations(prev => prev.map(r => (r.id === recordId ? updated : r)))
    } catch (err) {
      console.error('评论失败:', err)
    }
  }

  if (!user) {
    return (
      <>
        <nav className="navbar">
          <div className="navbar-logo">
            <div className="navbar-logo-icon">☕</div>
            <span>咖啡风味品鉴台</span>
          </div>
        </nav>
        <div className="login-page">
          <div className="login-card fade-in">
            <div className="login-card-icon">☕</div>
            <h1>咖啡风味品鉴台</h1>
            <p>记录每一杯手冲咖啡的风味体验，与同好共享品鉴心得</p>
            <form onSubmit={handleLogin}>
              <input
                className="login-input"
                type="text"
                placeholder="请输入你的昵称"
                value={loginName}
                onChange={e => setLoginName(e.target.value)}
                maxLength={20}
              />
              <button className="login-btn" type="submit" disabled={loading || !loginName.trim()}>
                {loading ? '进入中...' : '进入品鉴台'}
              </button>
            </form>
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <nav className="navbar">
        <div className="navbar-logo">
          <div className="navbar-logo-icon">☕</div>
          <span>咖啡风味品鉴台</span>
        </div>
        <div className="navbar-user">
          <span>你好，{user.username}</span>
          <button className="navbar-user-btn" onClick={handleLogout}>
            退出
          </button>
        </div>
      </nav>

      <div className="main-content">
        <div className="page-layout">
          <div className="tasting-station fade-in">
            <h2>🎯 个人品鉴台</h2>
            <div className="radar-container">
              <RadarChart values={ratings} size={340} animated />
            </div>

            <div className="sliders-group">
              {DIMENSIONS.map((dim, i) => (
                <div className="slider-row" key={dim}>
                  <span className="slider-label">{dim}</span>
                  <input
                    className="slider-input"
                    type="range"
                    min={0}
                    max={10}
                    step={1}
                    value={ratings[i]}
                    onChange={e => handleRatingChange(i, parseInt(e.target.value))}
                  />
                  <span className="slider-value">{ratings[i]}</span>
                </div>
              ))}
            </div>

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">咖啡名称</label>
                <input
                  className="form-input"
                  type="text"
                  placeholder="如：埃塞俄比亚 耶加雪菲"
                  value={coffeeName}
                  onChange={e => setCoffeeName(e.target.value)}
                  maxLength={20}
                />
              </div>
              <div className="form-group">
                <label className="form-label">风味标签（用逗号或空格分隔）</label>
                <input
                  className="form-input"
                  type="text"
                  placeholder="如：果酸明亮, 焦糖甜感, 花香"
                  value={coffeeTags}
                  onChange={e => setCoffeeTags(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label className="form-label">品鉴笔记</label>
                <textarea
                  className="form-textarea"
                  placeholder="记录一下这杯咖啡的独特感受..."
                  value={coffeeNotes}
                  onChange={e => setCoffeeNotes(e.target.value)}
                />
              </div>
              <button
                className="submit-btn"
                type="submit"
                disabled={submitting || !coffeeName.trim()}
              >
                {submitting ? '保存中...' : '保存品鉴记录'}
              </button>
            </form>
          </div>

          <div className="right-panel">
            <CardList
              records={records}
              recommendations={recommendations}
              currentUserId={user.id}
              onLike={handleLike}
              onComment={handleComment}
            />
          </div>
        </div>
      </div>

      <footer className="footer">
        <p>☕ 咖啡风味品鉴台 · 记录每一杯的美好时刻</p>
      </footer>
    </>
  )
}

export default App
