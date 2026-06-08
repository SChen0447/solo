import React from 'react'
import type { HistoryRecord } from '@/types'

const HistoryIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/>
    <polyline points="12 6 12 12 16 14"/>
  </svg>
)

interface HistoryPanelProps {
  records: HistoryRecord[]
  onSelect: (record: HistoryRecord) => void
}

function formatTime(timestamp: number): string {
  const date = new Date(timestamp)
  const now = new Date()
  const diff = now.getTime() - timestamp

  if (diff < 60000) {
    return '刚刚'
  }
  if (diff < 3600000) {
    return `${Math.floor(diff / 60000)}分钟前`
  }
  if (diff < 86400000) {
    return `${Math.floor(diff / 3600000)}小时前`
  }

  const month = date.getMonth() + 1
  const day = date.getDate()
  const hours = date.getHours().toString().padStart(2, '0')
  const minutes = date.getMinutes().toString().padStart(2, '0')

  return `${month}月${day}日 ${hours}:${minutes}`
}

export const HistoryPanel: React.FC<HistoryPanelProps> = ({ records, onSelect }) => {
  return (
    <div className="history-panel">
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <HistoryIcon />
        <h2 className="history-title">历史记录</h2>
      </div>

      {records.length === 0 ? (
        <div className="history-empty">
          暂无历史记录<br />
          <span style={{ fontSize: '11px' }}>保存头像后将显示在这里</span>
        </div>
      ) : (
        <div className="history-list">
          {records.map((record, index) => (
            <div
              key={record.id}
              className="history-card"
              onClick={() => onSelect(record)}
              style={{ animationDelay: `${index * 0.05}s` }}
            >
              <img
                src={record.thumbnail}
                alt="像素头像缩略图"
                className="history-thumbnail"
              />
              <div className="history-info">
                <div className="history-theme">{record.themeName}</div>
                <div className="history-time">{formatTime(record.timestamp)}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
