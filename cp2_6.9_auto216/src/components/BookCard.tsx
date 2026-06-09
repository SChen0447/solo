import { useState } from 'react'
import type { Book } from '../types'

interface BookCardProps {
  book: Book
  onClick: () => void
}

const statusMap: Record<Book['status'], { label: string; color: string; bg: string }> = {
  available: { label: '可交换', color: '#F5E6CA', bg: '#5D8A4C' },
  drifting: { label: '在漂流中', color: '#FFF8E1', bg: '#B8860B' },
  exchanged: { label: '已交换', color: '#F5E6CA', bg: '#666' },
  borrow_only: { label: '只借不换', color: '#F5E6CA', bg: '#4A7BA6' },
}

export default function BookCard({ book, onClick }: BookCardProps) {
  const [loaded, setLoaded] = useState(false)
  const [hovered, setHovered] = useState(false)
  const status = statusMap[book.status]

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        cursor: 'pointer',
        background: '#FFF8E7',
        borderRadius: '8px',
        overflow: 'hidden',
        boxShadow: hovered
          ? '0 8px 24px rgba(107, 68, 35, 0.25)'
          : '0 2px 8px rgba(107, 68, 35, 0.15)',
        transform: hovered ? 'translateY(-4px)' : 'translateY(0)',
        transition: 'all 0.3s ease',
        position: 'relative',
        border: '1px solid #E8D5B7',
      }}
    >
      <div
        style={{
          position: 'relative',
          width: '100%',
          aspectRatio: '3/4',
          background: '#E8D5B7',
          overflow: 'hidden',
        }}
      >
        {!loaded && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: '#E8D5B7',
            }}
          >
            <svg width="48" height="48" viewBox="0 0 24 24" fill="#8B5E3C" opacity="0.4">
              <path d="M21 5c-1.11-.35-2.33-.5-3.5-.5-1.95 0-4.05.4-5.5 1.5-1.45-1.1-3.55-1.5-5.5-1.5S2.45 4.9 1 6v14.65c0 .25.25.5.5.5.1 0 .15-.05.25-.05C3.1 20.45 5.05 20 6.5 20c1.95 0 4.05.4 5.5 1.5 1.35-.85 3.8-1.5 5.5-1.5 1.65 0 3.35.3 4.75 1.05.1.05.15.05.25.05.25 0 .5-.25.5-.5V6c-.6-.45-1.25-.75-2-1zm0 13.5c-1.1-.35-2.3-.5-3.5-.5-1.7 0-4.15.65-5.5 1.5V8c1.35-.85 3.8-1.5 5.5-1.5 1.2 0 2.4.15 3.5.5v11.5z" />
            </svg>
          </div>
        )}
        <img
          src={book.coverImages[0]}
          alt={book.title}
          loading="lazy"
          onLoad={() => setLoaded(true)}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            display: loaded ? 'block' : 'none',
          }}
        />
        <div
          style={{
            position: 'absolute',
            top: '12px',
            right: '12px',
            padding: '4px 12px',
            borderRadius: '20px',
            fontSize: '12px',
            fontWeight: 600,
            color: status.color,
            backgroundColor: status.bg,
            boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
          }}
        >
          {status.label}
        </div>
        {book.driftHistory.length > 0 && (
          <div
            style={{
              position: 'absolute',
              top: '12px',
              left: '12px',
              padding: '4px 8px',
              borderRadius: '6px',
              fontSize: '11px',
              fontWeight: 500,
              color: '#F5E6CA',
              backgroundColor: 'rgba(139, 94, 60, 0.85)',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
            </svg>
            {book.driftHistory.filter(d => d.status === 'completed').length}次漂流
          </div>
        )}
      </div>

      <div style={{ padding: '16px' }}>
        <h3
          style={{
            fontSize: '16px',
            fontWeight: 700,
            color: '#3E2723',
            marginBottom: '6px',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {book.title}
        </h3>
        <p
          style={{
            fontSize: '13px',
            color: '#6B4423',
            marginBottom: '8px',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {book.author}
        </p>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: '12px',
            color: '#8B5E3C',
          }}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
            </svg>
            {book.ownerName}
          </span>
          <span>{book.currentLocation.city}</span>
        </div>
      </div>
    </div>
  )
}
