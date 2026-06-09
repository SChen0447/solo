import React, { useEffect, useState } from 'react'
import { useAuth } from './context/AuthContext'
import { Antique } from './types'
import './Gallery.css'

const Gallery: React.FC = () => {
  const [antiques, setAntiques] = useState<Antique[]>([])
  const [selected, setSelected] = useState<Antique | null>(null)
  const [userRating, setUserRating] = useState(0)
  const [hoverRating, setHoverRating] = useState(0)
  const [comment, setComment] = useState('')
  const { user } = useAuth()

  const loadAntiques = async () => {
    try {
      const res = await fetch('/api/antiques?status=completed')
      const data = await res.json()
      setAntiques(data)
    } catch (e) {
      console.error('加载鉴赏区失败', e)
    }
  }

  useEffect(() => {
    loadAntiques()
  }, [])

  const handleSelect = (a: Antique) => {
    setSelected(a)
    if (user) {
      const r = a.ratings.find(r => r.userId === user.id)
      setUserRating(r?.rating || 0)
    }
  }

  const getAvgRating = (a: Antique) => {
    if (a.ratings.length === 0) return 0
    return a.ratings.reduce((s, r) => s + r.rating, 0) / a.ratings.length
  }

  const handleRate = async (rating: number) => {
    if (!selected || !user) return
    setUserRating(rating)
    try {
      const res = await fetch(`/api/antiques/${selected.id}/rate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, rating }),
      })
      const data = await res.json()
      setSelected(data)
      setAntiques(prev => prev.map(a => (a.id === data.id ? data : a)))
    } catch (e) {
      console.error('评分失败', e)
    }
  }

  const handleComment = async () => {
    if (!selected || !user || !comment.trim()) return
    try {
      const res = await fetch(`/api/antiques/${selected.id}/comment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, username: user.username, content: comment.trim() }),
      })
      const data = await res.json()
      setSelected(data)
      setAntiques(prev => prev.map(a => (a.id === data.id ? data : a)))
      setComment('')
    } catch (e) {
      console.error('评论失败', e)
    }
  }

  const formatTime = (iso: string) => {
    const d = new Date(iso)
    return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`
  }

  const displayRating = hoverRating || userRating

  return (
    <div className="gallery-container">
      <h2 className="panel-title">🎨 公共鉴赏区</h2>
      {antiques.length === 0 ? (
        <div className="gallery-empty">
          <div style={{ fontSize: 48, marginBottom: 16 }}>🏺</div>
          <p>暂无鉴赏作品，快去修复一件古董并提交吧！</p>
        </div>
      ) : (
        <div className="gallery-grid">
          {antiques.slice(0, 9).map(a => (
            <div
              key={a.id}
              className="gallery-card"
              onClick={() => handleSelect(a)}
            >
              <div className="gallery-thumb-wrapper">
                {a.restoredThumbnail ? (
                  <img src={a.restoredThumbnail} alt={a.name} className="gallery-thumb" />
                ) : (
                  <div className="gallery-thumb-placeholder">🏺</div>
                )}
                <div className="gallery-card-glow" />
              </div>
              <div className="gallery-card-info">
                <div className="gallery-card-name">{a.name}</div>
                <div className="gallery-card-meta">
                  <span>修复师：{a.username}</span>
                  <span className="gallery-card-rating">
                    {'★'.repeat(Math.round(getAvgRating(a)))}
                    {'☆'.repeat(5 - Math.round(getAvgRating(a)))}
                    {a.ratings.length > 0 && (
                      <span className="rating-count">({a.ratings.length})</span>
                    )}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {selected && (
        <div className="modal-overlay" onClick={() => setSelected(null)}>
          <div className="modal-content gallery-detail" onClick={e => e.stopPropagation()}>
            <div className="gallery-detail-header">
              <h3>{selected.name}</h3>
              <button className="modal-close" onClick={() => setSelected(null)}>
                ✕
              </button>
            </div>
            <div className="gallery-detail-body">
              <div className="gallery-detail-image">
                {selected.restoredThumbnail ? (
                  <img src={selected.restoredThumbnail} alt={selected.name} />
                ) : (
                  <div className="gallery-thumb-placeholder" style={{ height: 250 }}>🏺</div>
                )}
              </div>
              <div className="gallery-detail-info">
                <div className="detail-row">
                  <span className="detail-label">年代</span>
                  <span className="detail-value">{selected.dynasty}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">修复师</span>
                  <span className="detail-value">{selected.username}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">完成时间</span>
                  <span className="detail-value">{formatTime(selected.completedAt || selected.createdAt)}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">平均评分</span>
                  <span className="detail-value gold">
                    {getAvgRating(selected).toFixed(1)} / 5.0 ({selected.ratings.length}人)
                  </span>
                </div>

                <div className="rating-section">
                  <div className="rating-label">我的评分：</div>
                  <div className="stars">
                    {[1, 2, 3, 4, 5].map(n => (
                      <span
                        key={n}
                        className={`star ${n <= displayRating ? 'filled' : ''} ${n <= userRating ? 'animated' : ''}`}
                        onMouseEnter={() => setHoverRating(n)}
                        onMouseLeave={() => setHoverRating(0)}
                        onClick={() => handleRate(n)}
                      >
                        ★
                      </span>
                    ))}
                  </div>
                </div>

                <div className="comment-section">
                  <div className="rating-label">发表评论：</div>
                  <textarea
                    className="comment-input"
                    placeholder="请输入您的鉴赏评论..."
                    value={comment}
                    onChange={e => setComment(e.target.value)}
                  />
                  <button className="btn btn-primary comment-submit" onClick={handleComment}>
                    发表评论
                  </button>
                </div>
              </div>
            </div>

            {selected.comments.length > 0 && (
              <div className="comments-list">
                <div className="comments-title">评论 ({selected.comments.length})</div>
                {selected.comments.map(c => (
                  <div key={c.id} className="comment-item fade-in">
                    <div className="comment-header">
                      <span className="comment-user">{c.username}</span>
                      <span className="comment-time">{formatTime(c.createdAt)}</span>
                    </div>
                    <div className="comment-content">{c.content}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default Gallery
