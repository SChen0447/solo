import { useEffect, useState, useRef } from 'react'
import { Comment, calculateSentimentStats } from '../utils/dataGenerator'

interface SentimentBoardProps {
  comments: Comment[]
}

function SentimentBoard({ comments }: SentimentBoardProps) {
  const stats = calculateSentimentStats(comments)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationRef = useRef<number>(0)

  useEffect(() => {
    if (comments.length === 0) return

    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const centerX = canvas.width / 2
    const centerY = canvas.height / 2
    const radius = 75
    const innerRadius = 45

    let progress = 0
    const duration = 600
    const startTime = performance.now()

    const positiveAngle = (stats.positive / 100) * Math.PI * 2
    const negativeAngle = (stats.negative / 100) * Math.PI * 2
    const neutralAngle = (stats.neutral / 100) * Math.PI * 2

    const colors = {
      positive: '#2ECC71',
      negative: '#E74C3C',
      neutral: '#95A5A6'
    }

    const easeOut = (t: number) => 1 - Math.pow(1 - t, 3)

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime
      progress = Math.min(elapsed / duration, 1)
      const easedProgress = easeOut(progress)

      ctx.clearRect(0, 0, canvas.width, canvas.height)

      let startAngle = -Math.PI / 2

      const currentPositive = positiveAngle * easedProgress
      const currentNegative = negativeAngle * easedProgress
      const currentNeutral = neutralAngle * easedProgress

      if (currentPositive > 0) {
        ctx.beginPath()
        ctx.arc(centerX, centerY, radius, startAngle, startAngle + currentPositive)
        ctx.arc(centerX, centerY, innerRadius, startAngle + currentPositive, startAngle, true)
        ctx.closePath()
        ctx.fillStyle = colors.positive
        ctx.fill()
        startAngle += positiveAngle
      }

      if (currentNegative > 0) {
        ctx.beginPath()
        ctx.arc(centerX, centerY, radius, startAngle, startAngle + currentNegative)
        ctx.arc(centerX, centerY, innerRadius, startAngle + currentNegative, startAngle, true)
        ctx.closePath()
        ctx.fillStyle = colors.negative
        ctx.fill()
        startAngle += negativeAngle
      }

      if (currentNeutral > 0) {
        ctx.beginPath()
        ctx.arc(centerX, centerY, radius, startAngle, startAngle + currentNeutral)
        ctx.arc(centerX, centerY, innerRadius, startAngle + currentNeutral, startAngle, true)
        ctx.closePath()
        ctx.fillStyle = colors.neutral
        ctx.fill()
      }

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate)
      }
    }

    animationRef.current = requestAnimationFrame(animate)

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [comments.length, stats])

  const sortedComments = [...comments].sort((a, b) => b.timestamp - a.timestamp)

  const getSentimentIcon = (sentiment: string) => {
    switch (sentiment) {
      case 'positive': return '😊'
      case 'negative': return '😞'
      default: return '😐'
    }
  }

  const getSentimentLabel = (sentiment: string) => {
    switch (sentiment) {
      case 'positive': return '正面'
      case 'negative': return '负面'
      default: return '中性'
    }
  }

  return (
    <div className="card sentiment-board">
      <h2 className="card-title">💭 情感分析看板</h2>

      {comments.length === 0 ? (
        <div className="empty-state">
          <p>暂无评论数据</p>
          <p className="empty-hint">投票结束后将自动生成情感分析</p>
        </div>
      ) : (
        <>
          <div className="sentiment-chart">
            <canvas ref={canvasRef} width={200} height={200} className="pie-canvas" />

            <div className="sentiment-legend">
              <div className="legend-item">
                <span className="legend-color" style={{ backgroundColor: '#2ECC71' }} />
                <span className="legend-label">正面</span>
                <span className="legend-value">{stats.positive.toFixed(1)}%</span>
              </div>
              <div className="legend-item">
                <span className="legend-color" style={{ backgroundColor: '#E74C3C' }} />
                <span className="legend-label">负面</span>
                <span className="legend-value">{stats.negative.toFixed(1)}%</span>
              </div>
              <div className="legend-item">
                <span className="legend-color" style={{ backgroundColor: '#95A5A6' }} />
                <span className="legend-label">中性</span>
                <span className="legend-value">{stats.neutral.toFixed(1)}%</span>
              </div>
            </div>
          </div>

          <div className="comments-section">
            <h3>评论列表 ({comments.length})</h3>
            <div className="comments-list">
              {sortedComments.map((comment) => (
                <div
                  key={comment.id}
                  className={`comment-item sentiment-${comment.sentiment}`}
                >
                  <div className="comment-header">
                    <span className="comment-avatar">{comment.avatar}</span>
                    <span className="comment-user">{comment.userName}</span>
                    <span className="comment-sentiment">
                      {getSentimentIcon(comment.sentiment)} {getSentimentLabel(comment.sentiment)}
                    </span>
                  </div>
                  <p className="comment-text">{comment.text}</p>
                  <span className="comment-time">
                    {new Date(comment.timestamp).toLocaleTimeString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

export default SentimentBoard
