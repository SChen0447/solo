import { useState, useRef, useCallback, useEffect } from 'react'
import { Camera, Feather, Music } from 'lucide-react'
import type { CardData } from './store'

interface CardProps {
  card: CardData
  onDragEnd: (id: string, x: number, y: number) => void
  onClick: (card: CardData) => void
}

const GRID_SIZE = 20

function snapToGrid(value: number): number {
  return Math.round(value / GRID_SIZE) * GRID_SIZE
}

function TypeIcon({ type }: { type: CardData['type'] }) {
  const iconProps = { size: 16, color: 'white', opacity: 0.7 }
  switch (type) {
    case 'image':
      return <Camera {...iconProps} />
    case 'text':
      return <Feather {...iconProps} />
    case 'audio':
      return <Music {...iconProps} />
  }
}

export default function Card({ card, onDragEnd, onClick }: CardProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const [pos, setPos] = useState({ x: card.positionX, y: card.positionY })
  const [isHovered, setIsHovered] = useState(false)
  const [isSnapping, setIsSnapping] = useState(false)
  const cardRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setPos({ x: card.positionX, y: card.positionY })
  }, [card.positionX, card.positionY])

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setIsDragging(true)
      setDragOffset({
        x: e.clientX - pos.x,
        y: e.clientY - pos.y,
      })
    },
    [pos]
  )

  useEffect(() => {
    if (!isDragging) return

    const handleMouseMove = (e: MouseEvent) => {
      setPos({
        x: e.clientX - dragOffset.x,
        y: e.clientY - dragOffset.y,
      })
    }

    const handleMouseUp = () => {
      setIsDragging(false)
      setIsSnapping(true)
      const snappedX = snapToGrid(pos.x)
      const snappedY = snapToGrid(pos.y)
      setPos({ x: snappedX, y: snappedY })
      setTimeout(() => setIsSnapping(false), 150)
      onDragEnd(card.id, snappedX, snappedY)
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isDragging, dragOffset, pos, card.id, onDragEnd])

  const formatTime = (iso: string) => {
    const d = new Date(iso)
    return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`
  }

  return (
    <div
      ref={cardRef}
      className="archive-card"
      style={{
        transform: `translate(${pos.x}px, ${pos.y}px)${isHovered && !isDragging ? ' translateY(-3px)' : ''}${isSnapping ? '' : ''}`,
        zIndex: isDragging ? 1000 : 1,
        transition: isSnapping ? 'transform 0.15s ease-out' : isDragging ? 'none' : 'transform 0.15s ease, box-shadow 0.3s ease',
        cursor: isDragging ? 'grabbing' : 'grab',
      }}
      onMouseDown={handleMouseDown}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={(e) => {
        if (!isDragging) onClick(card)
      }}
    >
      <div className="card-type-icon">
        <TypeIcon type={card.type} />
      </div>

      <div className="card-content">
        {card.type === 'image' && card.fileUrl && (
          <img
            src={card.fileUrl}
            alt={card.title}
            className="card-image"
            draggable={false}
          />
        )}
        {card.type === 'audio' && card.fileUrl && (
          <div className="card-audio">
            <Music size={24} color="#667eea" />
            <audio src={card.fileUrl} controls className="card-audio-player" />
          </div>
        )}
        {card.type === 'text' && (
          <p className="card-text">{card.content || card.title}</p>
        )}
        {!card.fileUrl && card.type !== 'text' && (
          <p className="card-text">{card.title}</p>
        )}
      </div>

      <div className="card-footer">
        <span className="card-time">{formatTime(card.createdAt)}</span>
        <div className="card-tags">
          {card.tags.slice(0, 3).map((tag) => (
            <span key={tag} className="card-tag">
              {tag}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}
