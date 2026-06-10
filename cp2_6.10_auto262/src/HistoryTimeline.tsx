import React, { memo } from 'react'
import { motion } from 'framer-motion'
import { HistoryItem } from './types'

interface HistoryTimelineProps {
  history: HistoryItem[]
  onRestore: (item: HistoryItem) => void
}

const formatRelativeTime = (timestamp: number): string => {
  const diff = Date.now() - timestamp
  const seconds = Math.floor(diff / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  if (seconds < 60) return `${seconds}秒前`
  if (minutes < 60) return `${minutes}分钟前`
  if (hours < 24) return `${hours}小时前`
  return new Date(timestamp).toLocaleDateString('zh-CN')
}

const HistoryTimeline: React.FC<HistoryTimelineProps> = memo(({ history, onRestore }) => {
  return (
    <div style={styles.wrapper}>
      <div style={styles.label}>操作历史</div>
      <div style={styles.timeline}>
        {history.length === 0 ? (
          <div style={styles.empty}>暂无导出记录，导出后将显示在此处</div>
        ) : (
          history.map((item) => (
            <motion.div
              key={item.id}
              whileHover={{ scale: 1.05 }}
              transition={{ duration: 0.15 }}
              style={styles.item}
              onClick={() => onRestore(item)}
            >
              <img
                src={item.thumbnail}
                alt="历史缩略图"
                style={styles.thumbnail}
              />
              <span style={styles.timeText}>{formatRelativeTime(item.timestamp)}</span>
            </motion.div>
          ))
        )}
      </div>
    </div>
  )
})

HistoryTimeline.displayName = 'HistoryTimeline'

const styles: Record<string, React.CSSProperties> = {
  wrapper: {
    display: 'flex',
    alignItems: 'center',
    gap: 16,
    padding: '12px 24px',
    backgroundColor: '#1f1f1f',
    borderBottom: '1px solid #3a3a3a',
    minHeight: 72,
    overflowX: 'auto'
  },
  label: {
    fontSize: 13,
    fontWeight: 600,
    color: '#b0b0b0',
    whiteSpace: 'nowrap',
    letterSpacing: 0.5
  },
  timeline: {
    display: 'flex',
    gap: 12,
    alignItems: 'center',
    flex: 1
  },
  empty: {
    fontSize: 12,
    color: '#666'
  },
  item: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 4,
    cursor: 'pointer',
    flexShrink: 0
  },
  thumbnail: {
    width: 48,
    height: 48,
    borderRadius: 8,
    objectFit: 'cover',
    border: '1px solid rgba(255,255,255,0.1)'
  },
  timeText: {
    fontSize: 11,
    color: '#888',
    whiteSpace: 'nowrap'
  }
}

export default HistoryTimeline
