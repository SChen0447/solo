import React from 'react'

interface PlaybackBarProps {
  isPlaying: boolean
  progress: number
  onTogglePlay: () => void
  onExport: () => void
  canExport: boolean
}

const iconButtonStyle: React.CSSProperties = {
  width: '40px',
  height: '40px',
  borderRadius: '50%',
  border: 'none',
  backgroundColor: 'transparent',
  color: '#fff',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  transition: 'all 0.3s ease',
}

const PlayIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
    <path d="M8 5v14l11-7z" />
  </svg>
)

const PauseIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
    <path d="M6 4h4v16H6zm8 0h4v16h-4z" />
  </svg>
)

const DownloadIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="7 10 12 15 17 10" />
    <line x1="12" y1="15" x2="12" y2="3" />
  </svg>
)

const PlaybackBar: React.FC<PlaybackBarProps> = ({
  isPlaying,
  progress,
  onTogglePlay,
  onExport,
  canExport
}) => {
  return (
    <div style={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      height: '60px',
      backgroundColor: '#111827',
      borderTop: '1px solid #374151',
      display: 'flex',
      alignItems: 'center',
      padding: '0 24px',
      gap: '20px',
      zIndex: 100,
      boxSizing: 'border-box'
    }}>
      <button
        onClick={onTogglePlay}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = '#374151'
          e.currentTarget.style.transform = 'translateY(-2px)'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = 'transparent'
          e.currentTarget.style.transform = 'translateY(0)'
        }}
        style={{
          ...iconButtonStyle,
          backgroundColor: isPlaying ? '#8b5cf6' : 'transparent',
        }}
        title={isPlaying ? '暂停' : '播放'}
      >
        {isPlaying ? <PauseIcon /> : <PlayIcon />}
      </button>

      <div style={{
        flex: 1,
        maxWidth: '60%',
        height: '4px',
        backgroundColor: '#374151',
        borderRadius: '2px',
        overflow: 'hidden',
        position: 'relative'
      }}>
        <div style={{
          height: '100%',
          width: `${progress * 100}%`,
          background: 'linear-gradient(90deg, #8b5cf6, #06b6d4)',
          borderRadius: '2px',
          transition: 'width 0.1s linear',
          boxShadow: '0 0 10px rgba(139, 92, 246, 0.5)'
        }} />
      </div>

      <span style={{
        color: '#9ca3af',
        fontSize: '12px',
        minWidth: '45px',
        textAlign: 'center'
      }}>
        {Math.round(progress * 100)}%
      </span>

      <button
        onClick={onExport}
        disabled={!canExport}
        onMouseEnter={(e) => {
          if (!e.currentTarget.disabled) {
            e.currentTarget.style.backgroundColor = '#374151'
            e.currentTarget.style.transform = 'translateY(-2px)'
          }
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = 'transparent'
          e.currentTarget.style.transform = 'translateY(0)'
        }}
        style={{
          ...iconButtonStyle,
          opacity: canExport ? 1 : 0.4,
          cursor: canExport ? 'pointer' : 'not-allowed'
        }}
        title="导出JSON"
      >
        <DownloadIcon />
      </button>
    </div>
  )
}

export default PlaybackBar
