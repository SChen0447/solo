import { useState } from 'react'
import type { TeaEntry } from '../types/tea'
import { RATING_EMOJIS } from '../types/tea'
import { TEA_CATEGORY_CONFIG } from '../utils'

interface TeaDetailProps {
  record: TeaEntry
  onClose: () => void
  onEdit: () => void
  onDelete: () => void
}

export default function TeaDetail({ record, onClose, onEdit, onDelete }: TeaDetailProps) {
  const [showRipple, setShowRipple] = useState(false)
  const cfg = TEA_CATEGORY_CONFIG[record.category]
  const emoji = RATING_EMOJIS[record.rating - 1]

  const handleSip = () => {
    if (showRipple) return
    setShowRipple(true)
    setTimeout(() => setShowRipple(false), 1400)
  }

  const tempPercent = ((record.temperature - 75) / 25) * 100
  const amountPercent = ((record.teaAmount - 1) / 9) * 100
  const timePercent = ((record.brewTime - 5) / 295) * 100
  const ratingPercent = (record.rating / 10) * 100

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-actions">
          <button className="btn-icon" onClick={onEdit} title="编辑">
            ✏️
          </button>
          <button className="btn-icon" onClick={onDelete} title="删除">
            🗑️
          </button>
          <button className="btn-icon" onClick={onClose} title="关闭">
            ✕
          </button>
        </div>

        <div className="detail-body">
          <div className="detail-sidebar" style={{ background: cfg.gradient }}>
            <div className="detail-sidebar-category">{cfg.label}</div>
            <div className="detail-sidebar-name">{record.name}</div>
            <div className="detail-sidebar-meta">
              {record.origin && <div>{record.origin}</div>}
              <div>{record.year}年</div>
            </div>
            <div className="detail-sidebar-rating">
              <div className="detail-sidebar-emoji">{emoji}</div>
              <div className="detail-sidebar-score">口感评分 {record.rating}/10</div>
            </div>
          </div>

          <div className="detail-content">
            <div className="detail-section">
              <div className="detail-section-title">冲泡参数</div>
              <div className="detail-field-row">
                <div className="detail-field">
                  <div className="detail-field-label">冲泡水温</div>
                  <div className="detail-field-value">{record.temperature}°C</div>
                  <div className="progress-track">
                    <div
                      className="progress-fill"
                      style={{
                        width: `${tempPercent}%`,
                        background: cfg.accentColor,
                      }}
                    />
                  </div>
                </div>
                <div className="detail-field">
                  <div className="detail-field-label">投茶量</div>
                  <div className="detail-field-value">{record.teaAmount}g</div>
                  <div className="progress-track">
                    <div
                      className="progress-fill"
                      style={{
                        width: `${amountPercent}%`,
                        background: cfg.accentColor,
                      }}
                    />
                  </div>
                </div>
              </div>
              <div className="detail-field-row">
                <div className="detail-field">
                  <div className="detail-field-label">冲泡时间</div>
                  <div className="detail-field-value">{record.brewTime}秒</div>
                  <div className="progress-track">
                    <div
                      className="progress-fill"
                      style={{
                        width: `${timePercent}%`,
                        background: cfg.accentColor,
                      }}
                    />
                  </div>
                </div>
                <div className="detail-field">
                  <div className="detail-field-label">口感评分</div>
                  <div className="detail-field-value">{record.rating}/10</div>
                  <div className="progress-track">
                    <div
                      className="progress-fill"
                      style={{
                        width: `${ratingPercent}%`,
                        background: cfg.accentColor,
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {record.notes && (
              <div className="detail-section">
                <div className="detail-section-title">品鉴笔记</div>
                <div className="detail-notes">{record.notes}</div>
              </div>
            )}

            <div className="sip-btn-wrapper">
              {showRipple && (
                <div className="ripple-container">
                  <div className="ripple" />
                  <div className="ripple" />
                  <div className="ripple" />
                </div>
              )}
              <button className="sip-btn" onClick={handleSip}>
                啜一口
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
