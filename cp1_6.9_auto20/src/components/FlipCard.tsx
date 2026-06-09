import { motion } from 'framer-motion'
import { useFlipInteraction } from '../hooks/useFlipInteraction'
import type { CardData } from '../data/cards'

interface FlipCardProps {
  card: CardData
  index: number
}

export function FlipCard({ card, index }: FlipCardProps) {
  const { isFlipped, isHovered, onFlip, onFlipBack, onHoverStart, onHoverEnd } = useFlipInteraction()

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 50 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.8 }}
      transition={{
        duration: 0.5,
        delay: index * 0.08,
        ease: 'easeOut',
      }}
      onHoverStart={onHoverStart}
      onHoverEnd={onHoverEnd}
      style={{
        perspective: '1000px',
        width: '280px',
        height: '380px',
        cursor: 'pointer',
      }}
      className="flip-card-wrapper"
    >
      <motion.div
        animate={{
          rotateY: isFlipped ? 180 : 0,
          y: isHovered && !isFlipped ? -8 : 0,
          boxShadow: isHovered && !isFlipped
            ? '0 16px 24px rgba(0,0,0,0.12)'
            : '0 4px 12px rgba(0,0,0,0.08)',
        }}
        transition={{
          rotateY: { duration: 0.6, ease: 'easeInOut' },
          y: { duration: 0.2 },
          boxShadow: { duration: 0.2 },
        }}
        style={{
          width: '100%',
          height: '100%',
          position: 'relative',
          transformStyle: 'preserve-3d',
          borderRadius: '16px',
        }}
      >
        <div
          onClick={onFlip}
          style={{
            position: 'absolute',
            width: '100%',
            height: '100%',
            backfaceVisibility: 'hidden',
            borderRadius: '16px',
            overflow: 'hidden',
          }}
        >
          <img
            src={card.imageUrl}
            alt={card.title}
            loading="lazy"
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              display: 'block',
            }}
          />
          <div
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              padding: '20px',
              background: 'linear-gradient(transparent, rgba(0,0,0,0.6))',
              color: 'white',
              fontSize: '20px',
              fontWeight: 300,
              letterSpacing: '1px',
            }}
          >
            {card.title}
          </div>
        </div>

        <div
          onClick={(e) => {
            e.stopPropagation()
            onFlipBack()
          }}
          style={{
            position: 'absolute',
            width: '100%',
            height: '100%',
            backfaceVisibility: 'hidden',
            transform: 'rotateY(180deg)',
            borderRadius: '16px',
            backgroundColor: '#2C3E50',
            padding: '28px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            boxSizing: 'border-box',
          }}
        >
          <div>
            <h3
              style={{
                color: 'white',
                fontWeight: 300,
                fontSize: '22px',
                margin: '0 0 16px 0',
                letterSpacing: '1px',
              }}
            >
              {card.title}
            </h3>
            <p
              style={{
                color: 'rgba(255,255,255,0.85)',
                fontWeight: 300,
                fontSize: '14px',
                lineHeight: 1.8,
                margin: 0,
              }}
            >
              {card.backDescription}
            </p>
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              onClick={(e) => {
                e.stopPropagation()
                alert(`了解更多：${card.title}`)
              }}
              style={{
                flex: 1,
                padding: '12px 20px',
                borderRadius: '8px',
                border: 'none',
                cursor: 'pointer',
                background: 'rgba(255,255,255,0.15)',
                backdropFilter: 'blur(10px)',
                WebkitBackdropFilter: 'blur(10px)',
                color: 'white',
                fontWeight: 300,
                fontSize: '14px',
                letterSpacing: '1px',
                transition: 'background 0.2s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.9)'
                e.currentTarget.style.color = '#2C3E50'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.15)'
                e.currentTarget.style.color = 'white'
              }}
            >
              了解更多
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation()
                onFlipBack()
              }}
              style={{
                padding: '12px 20px',
                borderRadius: '8px',
                border: 'none',
                cursor: 'pointer',
                background: 'rgba(255,255,255,0.15)',
                backdropFilter: 'blur(10px)',
                WebkitBackdropFilter: 'blur(10px)',
                color: 'white',
                fontWeight: 300,
                fontSize: '14px',
                letterSpacing: '1px',
                transition: 'background 0.2s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.9)'
                e.currentTarget.style.color = '#2C3E50'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.15)'
                e.currentTarget.style.color = 'white'
              }}
            >
              收起
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}
