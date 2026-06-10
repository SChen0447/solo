import React, { useState, useEffect, useRef } from 'react'
import { Card as CardType, getTagColor, hasVotedToday, isExpiringSoon } from './data'

interface CardProps {
  card: CardType
  onVote: (id: string) => void
  onUpdate: (id: string, updates: Partial<CardType>) => void
  onDelete: (id: string) => void
  onDragStart: (e: React.DragEvent, card: CardType) => void
  onDragEnd: (e: React.DragEvent) => void
  isNew?: boolean
  isDragging?: boolean
}

const Card: React.FC<CardProps> = ({
  card,
  onVote,
  onUpdate,
  onDelete,
  onDragStart,
  onDragEnd,
  isNew = false,
  isDragging = false
}) => {
  const [isEditing, setIsEditing] = useState(false)
  const [editTitle, setEditTitle] = useState(card.title)
  const [editTags, setEditTags] = useState(card.tags.join(', '))
  const [showPulse, setShowPulse] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)
  const [isVoted, setIsVoted] = useState(hasVotedToday(card.id))
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [isEditing])

  const handleVote = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!isVoted) {
      onVote(card.id)
      setIsVoted(true)
      setShowPulse(true)
      setTimeout(() => setShowPulse(false), 600)
    }
  }

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    setIsEditing(true)
  }

  const handleSave = () => {
    const tags = editTags.split(',').map(t => t.trim()).filter(Boolean)
    onUpdate(card.id, { title: editTitle.trim() || card.title, tags: tags.length > 0 ? tags : card.tags })
    setIsEditing(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave()
    } else if (e.key === 'Escape') {
      setEditTitle(card.title)
      setEditTags(card.tags.join(', '))
      setIsEditing(false)
    }
  }

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation()
    setIsDeleting(true)
    setTimeout(() => {
      onDelete(card.id)
    }, 400)
  }

  const expiring = isExpiringSoon(card)
  const isArchived = card.status === 'archived'

  const cardStyle: React.CSSProperties = {
    position: 'relative',
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    padding: '16px',
    marginBottom: '12px',
    boxShadow: isDragging 
      ? '0 20px 40px rgba(0,0,0,0.3)' 
      : '0 2px 8px rgba(0,0,0,0.1)',
    cursor: 'grab',
    opacity: isDragging ? 0.6 : isDeleting ? 0 : 1,
    transform: isDragging 
      ? 'scale(0.95) rotate(2deg)' 
      : isDeleting 
        ? 'scaleX(0)' 
        : isNew 
          ? 'translateY(0)' 
          : 'translateY(0)',
    transition: 'all 0.3s ease-out',
    overflow: 'hidden',
    width: isDeleting ? '0%' : '100%'
  }

  return (
    <div
      style={cardStyle}
      draggable={!isEditing}
      onDragStart={(e) => onDragStart(e, card)}
      onDragEnd={onDragEnd}
      onClick={() => !isEditing && setIsExpanded(!isExpanded)}
      className="card-item"
    >
      {showPulse && (
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            width: '100px',
            height: '100px',
            marginLeft: '-50px',
            marginTop: '-50px',
            borderRadius: '50%',
            backgroundColor: 'rgba(255, 107, 107, 0.4)',
            animation: 'pulse 0.6s ease-out forwards',
            pointerEvents: 'none',
            zIndex: 10
          }}
        />
      )}

      {isArchived && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(128, 128, 128, 0.4)',
            borderRadius: '12px',
            zIndex: 5,
            pointerEvents: 'none'
          }}
        />
      )}

      {isArchived && (
        <button
          onClick={handleDelete}
          style={{
            position: 'absolute',
            top: '8px',
            right: '8px',
            width: '28px',
            height: '28px',
            borderRadius: '50%',
            border: 'none',
            backgroundColor: '#ff4757',
            color: '#fff',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '14px',
            zIndex: 10,
            transition: 'transform 0.2s ease-out'
          }}
          title="删除卡片"
          onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.1)')}
          onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
        >
          🗑️
        </button>
      )}

      {expiring && (
        <div
          style={{
            position: 'absolute',
            bottom: '8px',
            right: '8px',
            fontSize: '16px',
            animation: 'hourglass 2s ease-in-out infinite',
            zIndex: 10
          }}
          title="即将过期"
        >
          ⌛
        </div>
      )}

      {isEditing ? (
        <div style={{ animation: 'fadeIn 0.2s ease-out' }}>
          <input
            ref={inputRef}
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={handleSave}
            style={{
              width: '100%',
              padding: '6px 8px',
              border: '2px solid #667eea',
              borderRadius: '6px',
              fontSize: '16px',
              fontWeight: '600',
              marginBottom: '8px',
              outline: 'none',
              boxSizing: 'border-box'
            }}
            placeholder="标题"
          />
          <input
            value={editTags}
            onChange={(e) => setEditTags(e.target.value)}
            onKeyDown={handleKeyDown}
            style={{
              width: '100%',
              padding: '4px 8px',
              border: '1px solid #ddd',
              borderRadius: '4px',
              fontSize: '12px',
              boxSizing: 'border-box'
            }}
            placeholder="标签（逗号分隔）"
          />
        </div>
      ) : (
        <>
          <h3
            onDoubleClick={handleDoubleClick}
            style={{
              fontSize: '16px',
              fontWeight: '600',
              color: '#1a1a2e',
              marginBottom: '8px',
              cursor: 'text',
              userSelect: 'none',
              animation: isEditing ? 'fadeOut 0.2s ease-out' : undefined
            }}
          >
            {card.title}
          </h3>

          <p
            style={{
              fontSize: '13px',
              color: '#666',
              marginBottom: '12px',
              lineHeight: '1.5',
              display: '-webkit-box',
              WebkitLineClamp: isExpanded ? 'unset' : 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
              textOverflow: 'ellipsis'
            }}
          >
            {card.description}
          </p>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '12px' }}>
            {card.tags.slice(0, 3).map((tag, index) => (
              <span
                key={index}
                style={{
                  display: 'inline-block',
                  padding: '3px 10px',
                  borderRadius: '12px',
                  fontSize: '11px',
                  fontWeight: '500',
                  color: '#fff',
                  backgroundColor: getTagColor(tag)
                }}
              >
                {tag}
              </span>
            ))}
            {card.tags.length > 3 && (
              <span
                style={{
                  display: 'inline-block',
                  padding: '3px 8px',
                  borderRadius: '12px',
                  fontSize: '11px',
                  fontWeight: '500',
                  color: '#666',
                  backgroundColor: '#f0f0f0'
                }}
              >
                +{card.tags.length - 3}
              </span>
            )}
          </div>

          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}
          >
            <button
              onClick={handleVote}
              disabled={isVoted}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                borderRadius: '20px',
                border: 'none',
                backgroundColor: isVoted ? '#667eea' : '#f0f0f0',
                color: isVoted ? '#fff' : '#666',
                cursor: isVoted ? 'not-allowed' : 'pointer',
                fontSize: '13px',
                fontWeight: '500',
                transition: 'all 0.2s ease-out',
                transform: isVoted ? 'scale(1)' : 'scale(1)',
                zIndex: 6
              }}
              onMouseEnter={(e) => {
                if (!isVoted) e.currentTarget.style.transform = 'scale(1.05)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'scale(1)'
              }}
            >
              <span>👍</span>
              <span>{card.votes}</span>
            </button>

            <span
              style={{
                fontSize: '11px',
                color: '#999'
              }}
            >
              双击编辑
            </span>
          </div>
        </>
      )}

      <style>{`
        @keyframes pulse {
          0% {
            transform: scale(0);
            opacity: 1;
          }
          100% {
            transform: scale(4);
            opacity: 0;
          }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-5px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeOut {
          from { opacity: 1; transform: translateY(0); }
          to { opacity: 0; transform: translateY(-5px); }
        }
        @keyframes hourglass {
          0%, 100% { transform: rotate(0deg); }
          25% { transform: rotate(15deg); }
          75% { transform: rotate(-15deg); }
        }
        .card-item:hover {
          box-shadow: 0 8px 24px rgba(0,0,0,0.15) !important;
          transform: translateY(-4px);
        }
      `}</style>
    </div>
  )
}

export default Card
