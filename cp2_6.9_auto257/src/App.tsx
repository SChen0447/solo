import { useState, useEffect } from 'react'
import MapView from './MapView'
import type { Marker, ScentCategory, Comment } from './types'
import { MarkerService } from './MarkerService'

const CATEGORY_COLORS: Record<ScentCategory, string> = {
  flower: '#FF69B4',
  food: '#FF8C42',
  nature: '#4CAF50',
  city: '#64B5F6',
  other: '#9C27B0'
}

const CATEGORY_LABELS: Record<ScentCategory, string> = {
  flower: '花香',
  food: '食物',
  nature: '自然',
  city: '城市',
  other: '其他'
}

function formatDate(isoString: string): string {
  const date = new Date(isoString)
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

function getAvatarColor(name: string): string {
  const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8']
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  return colors[Math.abs(hash) % colors.length]
}

function getInitial(name: string): string {
  return name.charAt(0).toUpperCase()
}

export default function App() {
  const [markers, setMarkers] = useState<Marker[]>([])
  const [selectedMarker, setSelectedMarker] = useState<Marker | null>(null)
  const [showSuccess, setShowSuccess] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [likeAnimating, setLikeAnimating] = useState(false)
  const [commentText, setCommentText] = useState('')
  const [commentUsername, setCommentUsername] = useState('')
  const [isSubmittingComment, setIsSubmittingComment] = useState(false)

  useEffect(() => {
    loadMarkers()
  }, [])

  const loadMarkers = async () => {
    try {
      const data = await MarkerService.getMarkers()
      setMarkers(data)
    } catch (err) {
      console.error('Failed to load markers:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleShowSuccess = (message: string) => {
    setShowSuccess(message)
    setTimeout(() => setShowSuccess(null), 2000)
  }

  const handleMarkerClick = (marker: Marker) => {
    setSelectedMarker(marker)
    setCommentText('')
  }

  const handleCloseDetail = () => {
    setSelectedMarker(null)
  }

  const handleLike = async () => {
    if (!selectedMarker || likeAnimating) return

    setLikeAnimating(true)
    try {
      const result = await MarkerService.likeMarker(selectedMarker.id)
      setSelectedMarker(prev => prev ? { ...prev, likes: result.likes } : null)
      setMarkers(prev => prev.map(m => m.id === selectedMarker.id ? { ...m, likes: result.likes } : m))
      handleShowSuccess('已点赞！')
    } catch (err) {
      console.error('Failed to like:', err)
    } finally {
      setTimeout(() => setLikeAnimating(false), 300)
    }
  }

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedMarker || !commentText.trim() || !commentUsername.trim() || isSubmittingComment) return

    setIsSubmittingComment(true)
    try {
      const newComment = await MarkerService.addComment(selectedMarker.id, {
        username: commentUsername.trim(),
        content: commentText.trim()
      })

      const updatedComments = [newComment, ...selectedMarker.comments]
      setSelectedMarker(prev => prev ? { ...prev, comments: updatedComments } : null)
      setMarkers(prev => prev.map(m =>
        m.id === selectedMarker.id
          ? { ...m, comments: updatedComments }
          : m
      ))
      setCommentText('')
      handleShowSuccess('评论已发布！')
    } catch (err) {
      console.error('Failed to comment:', err)
    } finally {
      setIsSubmittingComment(false)
    }
  }

  const sortedComments: Comment[] = selectedMarker
    ? [...selectedMarker.comments].sort((a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )
    : []

  return (
    <div className={`app ${isLoading ? 'loading' : 'loaded'}`}>
      <header className="app-header">
        <div className="header-content">
          <h1 className="app-title">🌸 气味地图</h1>
          <p className="app-subtitle">探索城市的嗅觉记忆</p>
        </div>
        <div className="header-hint">
          <span>💡 右键点击地图创建新标记</span>
        </div>
      </header>

      <main className="app-main">
        {isLoading ? (
          <div className="loading-spinner">
            <div className="spinner" />
            <p>正在加载地图...</p>
          </div>
        ) : (
          <MapView
            markers={markers}
            onMarkersChange={setMarkers}
            onMarkerClick={handleMarkerClick}
            onShowSuccess={handleShowSuccess}
          />
        )}
      </main>

      {selectedMarker && (
        <div className="modal-overlay detail-overlay" onClick={handleCloseDetail}>
          <div className="modal-card detail-card animate-slide-up" onClick={(e) => e.stopPropagation()}>
            <button className="close-btn" onClick={handleCloseDetail}>×</button>

            <div className="detail-content">
              <div className="detail-left">
                <span
                  className="category-badge"
                  style={{ background: CATEGORY_COLORS[selectedMarker.category] }}
                >
                  {CATEGORY_LABELS[selectedMarker.category]}
                </span>

                <h2 className="detail-title">{selectedMarker.name}</h2>

                <p className="detail-description">
                  {selectedMarker.description || '暂无描述'}
                </p>

                <div className="detail-meta">
                  <div className="meta-user">
                    <div
                      className="avatar"
                      style={{ background: getAvatarColor(selectedMarker.username) }}
                    >
                      {getInitial(selectedMarker.username)}
                    </div>
                    <span className="username">@{selectedMarker.username}</span>
                  </div>
                  <div className="meta-date">
                    {formatDate(selectedMarker.createdAt)}
                  </div>
                </div>

                <div className="detail-stats">
                  <button
                    className={`like-btn ${selectedMarker.likes > 0 ? 'liked' : ''} ${likeAnimating ? 'animating' : ''}`}
                    onClick={handleLike}
                  >
                    <span className="like-icon">❤️</span>
                    <span className="like-count">{selectedMarker.likes}</span>
                  </button>
                  <div className="comment-stat">
                    <span>💬</span>
                    <span>{selectedMarker.comments.length} 条评论</span>
                  </div>
                </div>
              </div>

              <div className="detail-right">
                <h3 className="comments-title">评论</h3>

                <form className="comment-form" onSubmit={handleSubmitComment}>
                  <div className="comment-input-row">
                    <input
                      type="text"
                      className="comment-username-input"
                      placeholder="你的昵称"
                      maxLength={15}
                      value={commentUsername}
                      onChange={(e) => setCommentUsername(e.target.value)}
                    />
                  </div>
                  <div className="comment-input-row">
                    <input
                      type="text"
                      className="comment-text-input"
                      placeholder="写下你的评论..."
                      maxLength={200}
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                    />
                    <button
                      type="submit"
                      className="comment-submit-btn"
                      disabled={!commentText.trim() || !commentUsername.trim() || isSubmittingComment}
                    >
                      {isSubmittingComment ? '...' : '发送'}
                    </button>
                  </div>
                </form>

                <div className="comments-list">
                  {sortedComments.length === 0 ? (
                    <div className="no-comments">
                      <p>还没有评论，来抢沙发吧！</p>
                    </div>
                  ) : (
                    sortedComments.map((comment, index) => (
                      <div
                        key={comment.id}
                        className="comment-item"
                        style={{ animationDelay: `${index * 0.05}s` }}
                      >
                        <div
                          className="avatar comment-avatar"
                          style={{ background: getAvatarColor(comment.username) }}
                        >
                          {getInitial(comment.username)}
                        </div>
                        <div className="comment-body">
                          <div className="comment-header">
                            <span className="comment-username">{comment.username}</span>
                            <span className="comment-date">{formatDate(comment.createdAt)}</span>
                          </div>
                          <p className="comment-text">{comment.content}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {showSuccess && (
        <div className="toast toast-success animate-fade-in">
          <span>✓</span>
          <span>{showSuccess}</span>
        </div>
      )}
    </div>
  )
}
