import { useState, useRef } from 'react'
import RadarChart from './RadarChart'

interface Comment {
  id: string
  userId: string
  username: string
  content: string
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
  comments: Comment[]
  isPublic: boolean
  createdAt: string
}

interface CardListProps {
  records: TastingRecord[]
  recommendations: TastingRecord[]
  currentUserId: string
  onLike: (recordId: string) => void
  onComment: (recordId: string, content: string) => void
}

function TastingCard({
  record,
  currentUserId,
  expanded,
  onToggle,
  onLike,
  onComment,
  compact = false
}: {
  record: TastingRecord
  currentUserId: string
  expanded: boolean
  onToggle: () => void
  onLike: () => void
  onComment: (content: string) => void
  compact?: boolean
}) {
  const [commentText, setCommentText] = useState('')
  const radarSize = compact ? 160 : 200

  const handleSubmitComment = (e: React.FormEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (commentText.trim()) {
      onComment(commentText.trim())
      setCommentText('')
    }
  }

  const handleLikeClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    onLike()
  }

  const isLiked = record.likedBy.includes(currentUserId)

  return (
    <div
      className={`tasting-card fade-in ${expanded ? 'expanded' : ''}`}
      onClick={onToggle}
    >
      <div className="card-coffee-name">{record.coffeeName}</div>
      <div className="card-user">by {record.username}</div>
      <div className="card-radar">
        <RadarChart
          values={[record.acidity, record.sweetness, record.bitterness, record.aroma, record.aftertaste]}
          size={radarSize}
        />
      </div>
      {record.tags.length > 0 && (
        <div className="card-tags">
          {record.tags.map((tag, i) => (
            <span className="tag" key={i}>
              {tag}
            </span>
          ))}
        </div>
      )}
      <div className="card-stats">
        <div
          className={`card-stat ${isLiked ? 'liked' : ''}`}
          onClick={handleLikeClick}
        >
          <span>{isLiked ? '❤️' : '🤍'}</span>
          <span>{record.likes}</span>
        </div>
        <div className="card-stat">
          <span>💬</span>
          <span>{record.comments.length}</span>
        </div>
      </div>

      <div className="card-details" onClick={e => e.stopPropagation()}>
        {record.notes && (
          <div className="card-notes">
            <h4>品鉴笔记</h4>
            <p>{record.notes}</p>
          </div>
        )}
        <div className="card-comments">
          <h4>评论 ({record.comments.length})</h4>
          {record.comments.length > 0 ? (
            record.comments.map(comment => (
              <div className="comment-item" key={comment.id}>
                <div className="comment-user">{comment.username}</div>
                <div className="comment-content">{comment.content}</div>
              </div>
            ))
          ) : (
            <div style={{ fontSize: '13px', color: 'rgba(62,39,35,0.5)', padding: '4px 0' }}>
              暂无评论，来发表第一条吧
            </div>
          )}
          <form className="comment-form" onSubmit={handleSubmitComment}>
            <input
              className="comment-input"
              type="text"
              placeholder="写下你的评论..."
              value={commentText}
              onChange={e => setCommentText(e.target.value)}
              maxLength={200}
            />
            <button className="comment-btn" type="submit" disabled={!commentText.trim()}>
              发送
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

function RecommendationCard({
  record,
  onClick
}: {
  record: TastingRecord
  onClick: () => void
}) {
  return (
    <div className="rec-card fade-in" onClick={onClick}>
      <div className="rec-card-coffee" title={record.coffeeName}>
        {record.coffeeName}
      </div>
      <div className="rec-card-user">by {record.username}</div>
      <div className="rec-card-radar">
        <RadarChart
          values={[record.acidity, record.sweetness, record.bitterness, record.aroma, record.aftertaste]}
          size={160}
        />
      </div>
      {record.tags.length > 0 && (
        <div className="rec-card-tags">
          {record.tags.slice(0, 3).map((tag, i) => (
            <span className="tag" key={i}>
              {tag}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

function CardList({
  records,
  recommendations,
  currentUserId,
  onLike,
  onComment
}: CardListProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  const toggleExpand = (id: string) => {
    setExpandedId(prev => (prev === id ? null : id))
  }

  const scrollRecommendations = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const scrollAmount = 260
      scrollRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      })
    }
  }

  const scrollToRecord = (recordId: string) => {
    setExpandedId(recordId)
    setTimeout(() => {
      const el = document.getElementById(`record-${recordId}`)
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
    }, 100)
  }

  return (
    <>
      <section className="recommendations-section fade-in">
        <h2>✨ 风味探索 · 为你推荐</h2>
        {recommendations.length > 0 ? (
          <div className="recommendations-scroll">
            <button
              className="rec-arrow rec-arrow-left"
              onClick={() => scrollRecommendations('left')}
              aria-label="向左滚动"
            >
              ‹
            </button>
            <div className="recommendations-track" ref={scrollRef}>
              {recommendations.map(rec => (
                <RecommendationCard
                  key={rec.id}
                  record={rec}
                  onClick={() => scrollToRecord(rec.id)}
                />
              ))}
            </div>
            <button
              className="rec-arrow rec-arrow-right"
              onClick={() => scrollRecommendations('right')}
              aria-label="向右滚动"
            >
              ›
            </button>
          </div>
        ) : (
          <div className="empty-state">
            品鉴更多咖啡后，将为你推荐相似风味的记录
          </div>
        )}
      </section>

      <section className="cards-section fade-in">
        <h2>📋 品鉴记录社区</h2>
        {records.length > 0 ? (
          <div className="masonry-grid">
            {records.map(record => (
              <div key={record.id} id={`record-${record.id}`}>
                <TastingCard
                  record={record}
                  currentUserId={currentUserId}
                  expanded={expandedId === record.id}
                  onToggle={() => toggleExpand(record.id)}
                  onLike={() => onLike(record.id)}
                  onComment={content => onComment(record.id, content)}
                />
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-state loading">加载中...</div>
        )}
      </section>
    </>
  )
}

export default CardList
