import { useState, useRef } from 'react'
import { Capsule, COLOR_PALETTES } from './types'

interface CapsuleCardProps {
  capsule: Capsule
  onClick: () => void
  onDelete: () => void
}

function CapsuleCard({ capsule, onClick, onDelete }: CapsuleCardProps) {
  const [isDeleting, setIsDeleting] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [isPressed, setIsPressed] = useState(false)
  const cardRef = useRef<HTMLDivElement>(null)

  const palette = COLOR_PALETTES[capsule.color] || COLOR_PALETTES.amber

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    setShowConfirm(true)
  }

  const handleConfirmDelete = () => {
    setShowConfirm(false)
    setIsDeleting(true)
    setTimeout(() => {
      onDelete()
    }, 300)
  }

  const handleCancelDelete = () => {
    setShowConfirm(false)
  }

  const handleCardClick = () => {
    if (!isDeleting && !showConfirm) {
      onClick()
    }
  }

  return (
    <div
      style={{
        position: 'relative',
        width: '180px',
        height: '180px',
        opacity: isDeleting ? 0 : 1,
        transform: isDeleting ? 'scale(0) rotate(180deg)' : 'scale(1) rotate(0deg)',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
      }}
    >
      <div
        ref={cardRef}
        onClick={handleCardClick}
        onMouseDown={() => setIsPressed(true)}
        onMouseUp={() => setIsPressed(false)}
        onMouseLeave={() => setIsPressed(false)}
        className="capsule-card"
        style={{
          width: '180px',
          height: '180px',
          borderRadius: '50%',
          background: `linear-gradient(135deg, ${palette.from} 0%, ${palette.to} 100%)`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          position: 'relative',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          boxShadow: `0 8px 32px ${palette.from}40`,
          transform: isPressed ? 'scale(0.95)' : undefined,
          transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)'
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.1)',
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
            zIndex: 0
          }}
        />
        <span
          style={{
            position: 'relative',
            zIndex: 1,
            color: '#ffffff',
            fontSize: '16px',
            lineHeight: 1.5,
            fontWeight: 400,
            textAlign: 'center',
            padding: '0 20px',
            maxWidth: '100%',
            wordBreak: 'break-word',
            textShadow: '0 2px 8px rgba(0,0,0,0.3)'
          }}
        >
          {capsule.title}
        </span>
      </div>

      <button
        onClick={handleDeleteClick}
        onMouseDown={e => e.stopPropagation()}
        className="delete-btn"
        style={{
          position: 'absolute',
          bottom: '4px',
          right: '4px',
          width: '24px',
          height: '24px',
          borderRadius: '50%',
          background: 'rgba(40,40,60,0.8)',
          border: 'none',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#ffffff',
          fontSize: '14px',
          fontWeight: 300,
          zIndex: 10,
          opacity: 0,
          transition: 'all 0.3s ease',
          padding: 0
        }}
      >
        ×
      </button>

      {showConfirm && (
        <div
          onClick={e => e.stopPropagation()}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }}
        >
          <div
            style={{
              background: '#2a2a3e',
              borderRadius: '12px',
              padding: '32px 40px',
              textAlign: 'center',
              minWidth: '280px',
              boxShadow: '0 16px 48px rgba(0,0,0,0.5)',
              animation: 'confirmFadeIn 0.2s ease-out'
            }}
          >
            <p style={{ color: '#ffffff', fontSize: '16px', margin: '0 0 24px', fontWeight: 400 }}>
              确定删除？
            </p>
            <div style={{ display: 'flex', gap: '16px', justifyContent: 'center' }}>
              <button
                onClick={handleCancelDelete}
                onMouseDown={e => (e.currentTarget.style.transform = 'scale(0.95)')}
                onMouseUp={e => (e.currentTarget.style.transform = '')}
                onMouseLeave={e => (e.currentTarget.style.transform = '')}
                style={{
                  padding: '10px 28px',
                  borderRadius: '8px',
                  border: '1px solid rgba(255,255,255,0.2)',
                  background: 'transparent',
                  color: '#ffffff',
                  fontSize: '14px',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease'
                }}
              >
                取消
              </button>
              <button
                onClick={handleConfirmDelete}
                onMouseDown={e => (e.currentTarget.style.transform = 'scale(0.95)')}
                onMouseUp={e => (e.currentTarget.style.transform = '')}
                onMouseLeave={e => (e.currentTarget.style.transform = '')}
                style={{
                  padding: '10px 28px',
                  borderRadius: '8px',
                  border: 'none',
                  background: `linear-gradient(135deg, ${palette.from} 0%, ${palette.to} 100%)`,
                  color: '#ffffff',
                  fontSize: '14px',
                  fontWeight: 500,
                  cursor: 'pointer',
                  transition: 'all 0.3s ease'
                }}
              >
                删除
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const cardStyleInjected = (() => {
  const existing = document.getElementById('capsule-card-styles')
  if (existing) return true
  const style = document.createElement('style')
  style.id = 'capsule-card-styles'
  style.textContent = `
    .capsule-card:hover {
      transform: translateY(-12px) !important;
      box-shadow: 0 0 0 4px var(--glow-color, rgba(255,255,255,0.7)), 0 16px 48px rgba(0,0,0,0.4) !important;
    }
    .capsule-card:hover + .delete-btn,
    [class*="relative"]:hover .delete-btn {
      opacity: 1 !important;
    }
    @keyframes confirmFadeIn {
      from { opacity: 0; transform: scale(0.9); }
      to { opacity: 1; transform: scale(1); }
    }
  `
  document.head.appendChild(style)
  return true
})()
void cardStyleInjected

export default CapsuleCard
