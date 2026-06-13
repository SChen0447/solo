import { useState, useEffect } from 'react'
import type { HybridResult } from '../types'
import { voteHybrid } from '../services/api'
import './CommunityRanking.css'

interface CommunityRankingProps {
  rankings: HybridResult[]
  onVote: () => void
}

function CommunityRanking({ rankings, onVote }: CommunityRankingProps) {
  const [selectedHybrid, setSelectedHybrid] = useState<HybridResult | null>(null)
  const [votedIds, setVotedIds] = useState<Set<string>>(new Set())
  const [commentText, setCommentText] = useState('')
  const [reactions, setReactions] = useState<Record<string, string[]>>({})

  useEffect(() => {
    const stored = localStorage.getItem('greenMirrorVoted')
    if (stored) {
      setVotedIds(new Set(JSON.parse(stored)))
    }
    const storedReactions = localStorage.getItem('greenMirrorReactions')
    if (storedReactions) {
      setReactions(JSON.parse(storedReactions))
    }
  }, [])

  const handleVote = async (hybridId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (votedIds.has(hybridId)) return

    try {
      await voteHybrid(hybridId)
      const newVotedIds = new Set(votedIds)
      newVotedIds.add(hybridId)
      setVotedIds(newVotedIds)
      localStorage.setItem('greenMirrorVoted', JSON.stringify([...newVotedIds]))
      onVote()
    } catch (error) {
      console.error('Vote failed:', error)
    }
  }

  const handleCommentSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedHybrid || !commentText.trim()) return

    const emojis = ['😊', '❤️', '🌿', '✨', '👍']
    const randomEmoji = emojis[Math.floor(Math.random() * emojis.length)]

    const newReactions = { ...reactions }
    if (!newReactions[selectedHybrid.id]) {
      newReactions[selectedHybrid.id] = []
    }
    newReactions[selectedHybrid.id].push(randomEmoji)
    setReactions(newReactions)
    localStorage.setItem('greenMirrorReactions', JSON.stringify(newReactions))

    setCommentText('')
  }

  const createRipple = (e: React.MouseEvent<HTMLButtonElement>) => {
    const button = e.currentTarget
    const ripple = document.createElement('span')
    const rect = button.getBoundingClientRect()
    const size = Math.max(rect.width, rect.height)
    const x = e.clientX - rect.left - size / 2
    const y = e.clientY - rect.top - size / 2

    ripple.style.width = ripple.style.height = size + 'px'
    ripple.style.left = x + 'px'
    ripple.style.top = y + 'px'
    ripple.classList.add('ripple')

    button.appendChild(ripple)
    setTimeout(() => ripple.remove(), 400)
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('zh-CN', {
      month: 'short',
      day: 'numeric'
    })
  }

  return (
    <div className="community-ranking fade-in">
      <div className="ranking-header">
        <h2 className="section-title">🏆 社区排行榜</h2>
        <p className="ranking-subtitle">最具创意的杂交设计 Top 10</p>
      </div>

      {rankings.length === 0 ? (
        <div className="empty-ranking">
          <p>还没有杂交作品哦~</p>
          <p className="hint">快去杂交工坊创造你的第一株杂交植物吧！</p>
        </div>
      ) : (
        <div className="ranking-grid">
          {rankings.map((hybrid, index) => (
            <div
              key={hybrid.id}
              className="ranking-card"
              onClick={() => setSelectedHybrid(hybrid)}
            >
              <div className="rank-badge">
                {index < 3 ? ['🥇', '🥈', '🥉'][index] : `#${index + 1}`}
              </div>
              <div className="card-image-wrapper">
                <img
                  src={hybrid.hybridImageUrl}
                  alt={`${hybrid.parent1Name} × ${hybrid.parent2Name}`}
                  loading="lazy"
                  className="card-image"
                />
              </div>
              <div className="card-content">
                <p className="card-title">
                  {hybrid.parent1Name} × {hybrid.parent2Name}
                </p>
                <p className="card-description">{hybrid.description}</p>
                <div className="card-footer">
                  <button
                    className={`like-btn ${votedIds.has(hybrid.id) ? 'liked' : ''}`}
                    onClick={(e) => handleVote(hybrid.id, e)}
                  >
                    <span className="like-icon">
                      {votedIds.has(hybrid.id) ? '❤️' : '🤍'}
                    </span>
                    <span className="like-count">{hybrid.votes}</span>
                  </button>
                  <span className="card-date">{formatDate(hybrid.createdAt)}</span>
                </div>
                {reactions[hybrid.id] && reactions[hybrid.id].length > 0 && (
                  <div className="card-reactions">
                    {reactions[hybrid.id].slice(0, 5).map((emoji, i) => (
                      <span key={i} className="reaction-emoji">{emoji}</span>
                    ))}
                    {reactions[hybrid.id].length > 5 && (
                      <span className="reaction-more">+{reactions[hybrid.id].length - 5}</span>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedHybrid && (
        <div className="modal-overlay" onClick={() => setSelectedHybrid(null)}>
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="modal-close"
              onClick={() => setSelectedHybrid(null)}
            >
              ✕
            </button>

            <div className="modal-image-wrapper">
              <img
                src={selectedHybrid.hybridImageUrl}
                alt="杂交详情"
                className="modal-image"
              />
            </div>

            <div className="modal-body">
              <h3 className="modal-title">
                {selectedHybrid.parent1Name} × {selectedHybrid.parent2Name}
              </h3>

              <div className="modal-parents">
                <div className="modal-parent">
                  <span className="parent-label">亲本1</span>
                  <span className="parent-name">{selectedHybrid.parent1Name}</span>
                </div>
                <span className="modal-x">×</span>
                <div className="modal-parent">
                  <span className="parent-label">亲本2</span>
                  <span className="parent-name">{selectedHybrid.parent2Name}</span>
                </div>
              </div>

              <p className="modal-description">
                「{selectedHybrid.description}」
              </p>

              <div className="modal-stats">
                <div className="stat-item">
                  <span className="stat-value">{selectedHybrid.votes}</span>
                  <span className="stat-label">点赞</span>
                </div>
                <div className="stat-item">
                  <span className="stat-value">{selectedHybrid.similarityScore}</span>
                  <span className="stat-label">相似度</span>
                </div>
                <div className="stat-item">
                  <span className="stat-value">{formatDate(selectedHybrid.createdAt)}</span>
                  <span className="stat-label">发布</span>
                </div>
              </div>

              <form className="comment-form" onSubmit={handleCommentSubmit}>
                <input
                  type="text"
                  className="comment-input"
                  placeholder="留下你的评论（最多50字）..."
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value.slice(0, 50))}
                  maxLength={50}
                />
                <button
                  type="submit"
                  className="comment-submit-btn"
                  onClick={(e) => createRipple(e as React.MouseEvent<HTMLButtonElement>)}
                  disabled={!commentText.trim()}
                >
                  发送
                </button>
              </form>

              <button
                className={`modal-like-btn ${votedIds.has(selectedHybrid.id) ? 'liked' : ''}`}
                onClick={(e) => {
                  createRipple(e)
                  handleVote(selectedHybrid.id, e)
                }}
                disabled={votedIds.has(selectedHybrid.id)}
              >
                {votedIds.has(selectedHybrid.id) ? '❤️ 已点赞' : '🤍 为它点赞'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default CommunityRanking
