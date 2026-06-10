import React, { useState, useEffect } from 'react'
import { useAuth } from './context/AuthContext'
import { FeedItem } from './types'
import './Feed.css'

const Feed: React.FC = () => {
  const [feeds, setFeeds] = useState<FeedItem[]>([])
  const { user } = useAuth()

  const loadFeeds = async () => {
    try {
      const res = await fetch('/api/feed')
      const data = await res.json()
      setFeeds(data)
    } catch (e) {
      console.error('加载动态失败', e)
    }
  }

  useEffect(() => {
    loadFeeds()
    const interval = setInterval(loadFeeds, 10000)
    return () => clearInterval(interval)
  }, [])

  const handleLike = async (feedId: string) => {
    if (!user) return
    try {
      await fetch(`/api/feed/${feedId}/like`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id }),
      })
      loadFeeds()
    } catch (e) {
      console.error('点赞失败', e)
    }
  }

  const formatTime = (iso: string) => {
    const d = new Date(iso)
    return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  }

  return (
    <div className="feed-sidebar">
      <div className="feed-title">📢 社区动态</div>
      <div className="feed-list">
        {feeds.length === 0 && (
          <div className="feed-empty">暂无动态，快去分享修复作品吧！</div>
        )}
        {feeds.map(feed => (
          <div key={feed.id} className="feed-item fade-in">
            <div className="feed-header">
              <span className="feed-avatar">{feed.avatar}</span>
              <div className="feed-user">
                <div className="feed-username">{feed.username}</div>
                <div className="feed-time">{formatTime(feed.createdAt)}</div>
              </div>
            </div>
            <div className="feed-card">
              {feed.thumbnail ? (
                <img src={feed.thumbnail} alt={feed.antiqueName} className="feed-thumb" />
              ) : (
                <div className="feed-thumb-placeholder">🏺</div>
              )}
              <div className="feed-card-title">{feed.antiqueName}</div>
            </div>
            <button
              className={`feed-like ${feed.likes.includes(user?.id || '') ? 'liked' : ''}`}
              onClick={() => handleLike(feed.id)}
            >
              ❤ {feed.likes.length}
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

export default Feed
