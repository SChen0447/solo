import { useState, useEffect } from 'react'
import type { HistoryItem } from '../types'
import './HistoryTimeline.css'

function HistoryTimeline() {
  const [history, setHistory] = useState<HistoryItem[]>([])

  useEffect(() => {
    loadHistory()
  }, [])

  const loadHistory = () => {
    const stored = localStorage.getItem('greenMirrorHistory')
    if (stored) {
      setHistory(JSON.parse(stored))
    }
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const clearHistory = () => {
    if (confirm('确定要清空所有历史记录吗？')) {
      localStorage.removeItem('greenMirrorHistory')
      setHistory([])
    }
  }

  return (
    <div className="history-timeline fade-in">
      <div className="history-header">
        <div>
          <h2 className="section-title">📜 历史记录</h2>
          <p className="history-subtitle">最近 30 条操作记录</p>
        </div>
        {history.length > 0 && (
          <button className="clear-btn" onClick={clearHistory}>
            清空记录
          </button>
        )}
      </div>

      {history.length === 0 ? (
        <div className="empty-history">
          <p>暂无历史记录</p>
          <p className="hint">上传植物或进行杂交后，记录会显示在这里</p>
        </div>
      ) : (
        <div className="timeline">
          {history.map((item, index) => (
            <div key={item.id} className="timeline-item">
              <div className="timeline-dot-wrapper">
                <div className={`timeline-dot ${item.type}`}>
                  {item.type === 'upload' ? '📷' : '🧬'}
                </div>
                {index < history.length - 1 && <div className="timeline-line" />}
              </div>
              <div className="timeline-content">
                <div className="timeline-card">
                  <div className="timeline-image-wrapper">
                    <img
                      src={item.imageUrl}
                      alt={item.name}
                      loading="lazy"
                      className="timeline-image"
                    />
                  </div>
                  <div className="timeline-info">
                    <p className="timeline-name">{item.name}</p>
                    <p className="timeline-type">
                      {item.type === 'upload' ? '植物上传' : '杂交成功'}
                    </p>
                    <p className="timeline-date">{formatDate(item.date)}</p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default HistoryTimeline
