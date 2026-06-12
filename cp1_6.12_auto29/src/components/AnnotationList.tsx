import React from 'react'
import { Annotation, AnnotationCategory } from '../types'
import '../styles/AnnotationList.css'

interface AnnotationListProps {
  annotations: Annotation[]
  selectedId: string | null
  onSelectAnnotation: (id: string) => void
}

const AnnotationList: React.FC<AnnotationListProps> = ({
  annotations,
  selectedId,
  onSelectAnnotation,
}) => {
  const sortedAnnotations = [...annotations].sort((a, b) => b.createdAt - a.createdAt)

  const getCategoryIcon = (category: AnnotationCategory) => {
    switch (category) {
      case 'problem':
        return '!'
      case 'suggestion':
        return '💡'
      case 'confirmation':
        return '✓'
      default:
        return '•'
    }
  }

  const getCategoryLabel = (category: AnnotationCategory) => {
    switch (category) {
      case 'problem':
        return '问题'
      case 'suggestion':
        return '建议'
      case 'confirmation':
        return '确认'
      default:
        return ''
    }
  }

  const truncateText = (text: string, maxLength: number) => {
    if (text.length <= maxLength) return text
    return text.slice(0, maxLength) + '…'
  }

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp)
    const hours = date.getHours().toString().padStart(2, '0')
    const minutes = date.getMinutes().toString().padStart(2, '0')
    return `${hours}:${minutes}`
  }

  const handleItemClick = (id: string) => {
    onSelectAnnotation(id)
  }

  return (
    <div className="annotation-list">
      <div className="list-header">
        <h2 className="list-title">标注列表</h2>
        <span className="list-count">{annotations.length}</span>
      </div>

      <div className="list-content">
        {sortedAnnotations.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <polyline points="21 15 16 10 5 21" />
              </svg>
            </div>
            <p className="empty-text">暂无标注</p>
            <p className="empty-hint">在画布上拖拽鼠标添加标注</p>
          </div>
        ) : (
          sortedAnnotations.map((annotation, index) => (
            <div
              key={annotation.id}
              className={`annotation-item ${selectedId === annotation.id ? 'selected' : ''}`}
              onClick={() => handleItemClick(annotation.id)}
            >
              <div className="item-left">
                <div
                  className="thumbnail-dot"
                  style={{ backgroundColor: annotation.color }}
                >
                  <span className="thumbnail-icon">{getCategoryIcon(annotation.category)}</span>
                </div>
              </div>

              <div className="item-content">
                <div className="item-header">
                  <span
                    className="category-badge"
                    style={{ backgroundColor: annotation.color + '30', color: annotation.color }}
                  >
                    {getCategoryLabel(annotation.category)}
                  </span>
                  <span className="item-index">#{sortedAnnotations.length - index}</span>
                </div>
                <p className="item-comment">
                  {truncateText(annotation.comment, 20)}
                </p>
                <div className="item-meta">
                  <span className="item-time">{formatTime(annotation.createdAt)}</span>
                  <span className="item-position">
                    {Math.round(annotation.x)}, {Math.round(annotation.y)}
                  </span>
                </div>
              </div>

              <div className="item-right">
                <div
                  className="color-indicator"
                  style={{ backgroundColor: annotation.color }}
                />
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

export default AnnotationList
