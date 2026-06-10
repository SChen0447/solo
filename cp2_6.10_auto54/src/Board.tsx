import React, { useState } from 'react'
import { Card as CardType, CardStatus, COLUMN_CONFIG } from './data'
import Card from './Card'

interface BoardProps {
  cards: CardType[]
  filteredTag: string | null
  onVote: (id: string) => void
  onUpdate: (id: string, updates: Partial<CardType>) => void
  onDelete: (id: string) => void
  onStatusChange: (id: string, status: CardStatus) => void
  newCardId: string | null
}

const Board: React.FC<BoardProps> = ({
  cards,
  filteredTag,
  onVote,
  onUpdate,
  onDelete,
  onStatusChange,
  newCardId
}) => {
  const [draggedCard, setDraggedCard] = useState<CardType | null>(null)
  const [dragOverColumn, setDragOverColumn] = useState<CardStatus | null>(null)

  const handleDragStart = (e: React.DragEvent, card: CardType) => {
    setDraggedCard(card)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', card.id)
  }

  const handleDragEnd = () => {
    setDraggedCard(null)
    setDragOverColumn(null)
  }

  const handleDragOver = (e: React.DragEvent, status: CardStatus) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOverColumn(status)
  }

  const handleDragLeave = () => {
    setDragOverColumn(null)
  }

  const handleDrop = (e: React.DragEvent, status: CardStatus) => {
    e.preventDefault()
    if (draggedCard && draggedCard.status !== status) {
      onStatusChange(draggedCard.id, status)
    }
    setDraggedCard(null)
    setDragOverColumn(null)
  }

  const getCardsByStatus = (status: CardStatus): CardType[] => {
    let filtered = cards.filter(card => card.status === status)
    if (filteredTag) {
      filtered = filtered.filter(card => card.tags.includes(filteredTag))
    }
    return filtered.sort((a, b) => b.votes - a.votes)
  }

  const columns: CardStatus[] = ['todo', 'inProgress', 'adopted', 'archived']

  return (
    <div
      style={{
        display: 'flex',
        gap: '20px',
        padding: '20px',
        minHeight: '500px',
        flexWrap: 'wrap'
      }}
    >
      {columns.map(status => {
        const config = COLUMN_CONFIG[status]
        const columnCards = getCardsByStatus(status)
        const isOver = dragOverColumn === status

        return (
          <div
            key={status}
            onDragOver={(e) => handleDragOver(e, status)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, status)}
            style={{
              flex: 1,
              minWidth: '280px',
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
              backdropFilter: 'blur(10px)',
              WebkitBackdropFilter: 'blur(10px)',
              borderRadius: '16px',
              padding: '20px',
              border: isOver ? `2px dashed ${config.color}` : '2px solid transparent',
              transition: 'all 0.3s ease-out',
              boxShadow: isOver ? `0 0 20px ${config.color}40` : 'none',
              display: 'flex',
              flexDirection: 'column'
            }}
          >
            <div
              style={{
                marginBottom: '20px',
                paddingBottom: '12px',
                borderBottom: `3px solid ${config.color}`,
                background: `linear-gradient(90deg, ${config.color}, transparent)`,
                WebkitBackgroundClip: 'text',
                backgroundClip: 'text'
              }}
            >
              <h2
                style={{
                  fontSize: '18px',
                  fontWeight: '700',
                  color: '#fff',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
              >
                <span>{config.title}</span>
                <span
                  style={{
                    fontSize: '14px',
                    fontWeight: '500',
                    backgroundColor: config.color,
                    color: '#fff',
                    padding: '2px 10px',
                    borderRadius: '12px'
                  }}
                >
                  {columnCards.length}
                </span>
              </h2>
            </div>

            <div
              style={{
                flex: 1,
                overflowY: 'auto',
                maxHeight: 'calc(100vh - 400px)',
                minHeight: '200px',
                paddingRight: '4px'
              }}
            >
              {columnCards.length === 0 ? (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: '120px',
                    color: 'rgba(255, 255, 255, 0.3)',
                    fontSize: '14px',
                    border: `2px dashed rgba(255, 255, 255, 0.1)`,
                    borderRadius: '12px'
                  }}
                >
                  {isOver ? '放下卡片到此处' : '暂无卡片'}
                </div>
              ) : (
                columnCards.map(card => (
                  <CardWrapper
                    key={card.id}
                    card={card}
                    isNew={card.id === newCardId}
                    isDragging={draggedCard?.id === card.id}
                    onVote={onVote}
                    onUpdate={onUpdate}
                    onDelete={onDelete}
                    onDragStart={handleDragStart}
                    onDragEnd={handleDragEnd}
                  />
                ))
              )}
            </div>
          </div>
        )
      })}

      <style>{`
        @media (max-width: 768px) {
          div[style*="display: flex"][style*="gap: 20px"] {
            flex-direction: column !important;
          }
        }
      `}</style>
    </div>
  )
}

interface CardWrapperProps {
  card: CardType
  isNew: boolean
  isDragging: boolean
  onVote: (id: string) => void
  onUpdate: (id: string, updates: Partial<CardType>) => void
  onDelete: (id: string) => void
  onDragStart: (e: React.DragEvent, card: CardType) => void
  onDragEnd: (e: React.DragEvent) => void
}

const CardWrapper: React.FC<CardWrapperProps> = ({ card, isNew, isDragging, ...props }) => {
  const [showAnimation, setShowAnimation] = useState(isNew)

  React.useEffect(() => {
    if (isNew) {
      setShowAnimation(true)
      const timer = setTimeout(() => setShowAnimation(false), 500)
      return () => clearTimeout(timer)
    }
  }, [isNew])

  return (
    <div
      style={{
        animation: showAnimation ? 'slideUp 0.3s ease-out' : undefined
      }}
    >
      <style>{`
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(50px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-8px); }
        }
      `}</style>
      <Card
        card={card}
        isNew={isNew}
        isDragging={isDragging}
        {...props}
      />
    </div>
  )
}

export default Board
