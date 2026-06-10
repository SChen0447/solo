import { memo } from 'react'
import type { TeaEntry } from '../types/tea'
import { RATING_EMOJIS } from '../types/tea'
import { TEA_CATEGORY_CONFIG } from '../utils'

interface TeaEntryListProps {
  entries: TeaEntry[]
  onSelect: (entry: TeaEntry) => void
}

function TeaEntryListImpl({ entries, onSelect }: TeaEntryListProps) {
  if (entries.length === 0) {
    return (
      <div className="empty-state">
        <span className="tea-leaf">🍃</span>
        <span className="tea-leaf">🍵</span>
        <span className="tea-leaf">🌿</span>
        <span className="tea-leaf">🍃</span>
        <span className="tea-leaf">🍵</span>
        <span className="tea-leaf">🌿</span>
        <div className="empty-state-icon">🍵</div>
        <div className="empty-state-title">尚无品鉴记录</div>
        <div className="empty-state-desc">点击右上角「新建记录」，开启你的茶艺档案之旅</div>
      </div>
    )
  }

  return (
    <div className="masonry-grid">
      {entries.map((entry) => {
        const cfg = TEA_CATEGORY_CONFIG[entry.category]
        const emoji = RATING_EMOJIS[entry.rating - 1]
        return (
          <div
            key={entry.id}
            className="tea-card"
            style={{ background: cfg.gradient }}
            onClick={() => onSelect(entry)}
          >
            <div
              className="tea-card-badge"
              style={{ backgroundColor: cfg.badgeColor }}
            >
              {cfg.label.charAt(0)}
            </div>
            <div className="tea-card-content">
              <div className="tea-card-name">{entry.name}</div>
              <div className="tea-card-meta">
                <span>{cfg.label}</span>
                {entry.origin && <span>{entry.origin}</span>}
                <span>{entry.year}年</span>
              </div>
              <div className="tea-card-rating">
                <span>{emoji}</span>
                <span className="tea-card-rating-score">{entry.rating}/10</span>
              </div>
              {entry.notes && (
                <div className="tea-card-notes">{entry.notes}</div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

export const TeaEntryList = memo(TeaEntryListImpl)
export default TeaEntryList
