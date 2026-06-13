import { useState, useRef } from 'react'

interface Flavor {
  id: string
  name: string
  votes: number
  color: string
}

interface VotePanelProps {
  flavors: Flavor[]
  onVote: (id: string, x: number, y: number, color: string) => void
  onAddFlavor: (name: string) => void
  highlightedId: string | null
}

function VotePanel({ flavors, onVote, onAddFlavor, highlightedId }: VotePanelProps) {
  const [newFlavorName, setNewFlavorName] = useState('')
  const [inputFocused, setInputFocused] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const sortedFlavors = [...flavors].sort((a, b) => b.votes - a.votes)

  const handleVote = (flavor: Flavor) => {
    onVote(flavor.id, 0, 0, flavor.color)
  }

  const handleAdd = () => {
    if (newFlavorName.trim()) {
      onAddFlavor(newFlavorName.trim())
      setNewFlavorName('')
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleAdd()
    }
  }

  const panelStyle: React.CSSProperties = {
    position: 'fixed',
    right: '0',
    top: '80px',
    bottom: '20px',
    width: '30%',
    maxWidth: '380px',
    minWidth: '280px',
    padding: '20px',
    background: 'rgba(255, 255, 255, 0.05)',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    borderRadius: '16px 0 0 16px',
    border: '1px solid rgba(102, 126, 234, 0.3)',
    borderRight: 'none',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    overflow: 'hidden',
    zIndex: 100,
    boxShadow: '-4px 0 20px rgba(0, 0, 0, 0.3)'
  }

  const titleStyle: React.CSSProperties = {
    fontSize: '18px',
    fontWeight: 600,
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
    textAlign: 'center',
    paddingBottom: '12px',
    borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
  }

  const listStyle: React.CSSProperties = {
    flex: 1,
    overflowY: 'auto',
    overflowX: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    paddingRight: '4px',
    scrollbarWidth: 'thin',
    scrollbarColor: 'rgba(102, 126, 234, 0.5) transparent'
  }

  const itemStyle = (isHighlighted: boolean): React.CSSProperties => ({
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '10px 12px',
    background: isHighlighted ? 'rgba(102, 126, 234, 0.3)' : 'rgba(255, 255, 255, 0.03)',
    borderRadius: '8px',
    transition: 'background-color 0.2s ease',
    border: '1px solid rgba(255, 255, 255, 0.05)'
  })

  const flavorInfoStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    flex: 1,
    minWidth: 0
  }

  const rankBadgeStyle = (rank: number): React.CSSProperties => {
    const colors = ['#feca57', '#c8d6e5', '#cd853f']
    return {
      width: '24px',
      height: '24px',
      borderRadius: '50%',
      background: rank <= 3 
        ? `linear-gradient(135deg, ${colors[rank - 1]} 0%, ${colors[rank - 1]}88 100%)`
        : 'rgba(255, 255, 255, 0.1)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '12px',
      fontWeight: 600,
      color: rank <= 3 ? '#141829' : 'rgba(255, 255, 255, 0.6)',
      flexShrink: 0
    }
  }

  const nameStyle: React.CSSProperties = {
    fontSize: '14px',
    color: '#ffffff',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    flex: 1
  }

  const votesStyle: React.CSSProperties = {
    fontSize: '13px',
    color: 'rgba(255, 255, 255, 0.6)',
    marginRight: '10px',
    fontWeight: 500
  }

  const addButtonStyle: React.CSSProperties = {
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    border: 'none',
    color: 'white',
    fontSize: '18px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'transform 0.3s ease, box-shadow 0.2s ease',
    flexShrink: 0,
    fontWeight: 300
  }

  const inputContainerStyle: React.CSSProperties = {
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    paddingTop: '12px',
    borderTop: '1px solid rgba(255, 255, 255, 0.1)'
  }

  const inputWrapperStyle: React.CSSProperties = {
    position: 'relative',
    width: '100%'
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    height: '40px',
    background: 'rgba(255, 255, 255, 0.1)',
    border: 'none',
    borderRadius: '8px',
    padding: '0 14px',
    color: 'white',
    fontSize: '14px',
    outline: 'none',
    transition: 'box-shadow 0.3s ease',
    boxSizing: 'border-box'
  }

  const glowLineStyle = (side: 'left' | 'right'): React.CSSProperties => ({
    position: 'absolute',
    top: 0,
    [side]: '50%',
    width: inputFocused ? '50%' : '0%',
    height: '100%',
    pointerEvents: 'none',
    transition: 'width 0.3s ease'
  })

  const glowLeftStyle: React.CSSProperties = {
    ...glowLineStyle('left'),
    borderLeft: '0.5px solid #48dbfb',
    borderRadius: '8px 0 0 8px',
    boxShadow: inputFocused ? '-2px 0 8px rgba(72, 219, 251, 0.5)' : 'none'
  }

  const glowRightStyle: React.CSSProperties = {
    ...glowLineStyle('right'),
    borderRight: '0.5px solid #48dbfb',
    borderRadius: '0 8px 8px 0',
    boxShadow: inputFocused ? '2px 0 8px rgba(72, 219, 251, 0.5)' : 'none'
  }

  const submitButtonStyle: React.CSSProperties = {
    width: '100%',
    height: '40px',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    border: 'none',
    borderRadius: '8px',
    color: 'white',
    fontSize: '14px',
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'opacity 0.2s ease, transform 0.2s ease'
  }

  const mobilePanelStyle: React.CSSProperties = {
    position: 'fixed',
    bottom: 0,
    left: 0,
    right: 0,
    height: '150px',
    background: 'rgba(255, 255, 255, 0.05)',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    borderRadius: '16px 16px 0 0',
    border: '1px solid rgba(102, 126, 234, 0.3)',
    borderBottom: 'none',
    padding: '12px',
    zIndex: 100,
    display: 'none',
    flexDirection: 'column',
    gap: '8px'
  }

  const mobileListStyle: React.CSSProperties = {
    display: 'flex',
    gap: '8px',
    overflowX: 'auto',
    overflowY: 'hidden',
    paddingBottom: '4px',
    flex: 1
  }

  const mobileItemStyle: React.CSSProperties = {
    flexShrink: 0,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '6px',
    padding: '8px 12px',
    background: 'rgba(255, 255, 255, 0.05)',
    borderRadius: '10px',
    border: '1px solid rgba(255, 255, 255, 0.08)'
  }

  return (
    <>
      <div style={panelStyle}>
        <div style={titleStyle}>云味排行榜</div>
        <div style={listStyle}>
          {sortedFlavors.map((flavor, index) => (
            <div 
              key={flavor.id} 
              style={itemStyle(highlightedId === flavor.id)}
              onMouseEnter={(e) => {
                const btn = e.currentTarget.querySelector('button') as HTMLButtonElement
                if (btn) {
                  btn.style.transform = 'scale(1.05)'
                  btn.style.boxShadow = '0 4px 15px rgba(102, 126, 234, 0.4)'
                }
              }}
              onMouseLeave={(e) => {
                const btn = e.currentTarget.querySelector('button') as HTMLButtonElement
                if (btn) {
                  btn.style.transform = 'scale(1)'
                  btn.style.boxShadow = 'none'
                }
              }}
            >
              <div style={flavorInfoStyle}>
                <div style={rankBadgeStyle(index + 1)}>
                  {index + 1}
                </div>
                <div style={nameStyle} title={flavor.name}>
                  {flavor.name}
                </div>
              </div>
              <span style={votesStyle}>{flavor.votes}</span>
              <button
                style={addButtonStyle}
                onClick={() => handleVote(flavor)}
                onMouseDown={(e) => {
                  e.currentTarget.style.transform = 'scale(1.2)'
                }}
                onMouseUp={(e) => {
                  e.currentTarget.style.transform = 'scale(1)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'scale(1)'
                }}
              >
                +
              </button>
            </div>
          ))}
        </div>
        <div style={inputContainerStyle}>
          <div style={inputWrapperStyle}>
            <div style={glowLeftStyle} />
            <div style={glowRightStyle} />
            <input
              ref={inputRef}
              type="text"
              placeholder="输入新风味..."
              value={newFlavorName}
              onChange={(e) => setNewFlavorName(e.target.value)}
              onFocus={() => setInputFocused(true)}
              onBlur={() => setInputFocused(false)}
              onKeyDown={handleKeyDown}
              style={inputStyle}
            />
          </div>
          <button
            style={submitButtonStyle}
            onClick={handleAdd}
            onMouseEnter={(e) => {
              e.currentTarget.style.opacity = '0.9'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.opacity = '1'
            }}
            onMouseDown={(e) => {
              e.currentTarget.style.transform = 'scale(0.98)'
            }}
            onMouseUp={(e) => {
              e.currentTarget.style.transform = 'scale(1)'
            }}
          >
            添加风味
          </button>
        </div>
      </div>

      <div style={mobilePanelStyle}>
        <div style={{ fontSize: '14px', fontWeight: 600, color: 'rgba(255,255,255,0.8)' }}>
          云味排行榜
        </div>
        <div style={mobileListStyle}>
          {sortedFlavors.map((flavor) => (
            <div key={flavor.id} style={mobileItemStyle}>
              <span style={{ fontSize: '12px', color: 'white' }}>{flavor.name}</span>
              <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.6)' }}>{flavor.votes}票</span>
              <button
                style={{
                  ...addButtonStyle,
                  width: '28px',
                  height: '28px',
                  fontSize: '16px'
                }}
                onClick={() => handleVote(flavor)}
              >
                +
              </button>
            </div>
          ))}
        </div>
      </div>

      <style>{`
        @media (max-width: 768px) {
          div[style*="position: fixed"][style*="right: 0"] {
            display: none !important;
          }
          div[style*="position: fixed"][style*="bottom: 0"] {
            display: flex !important;
          }
          div[style*="position: absolute"][style*="left: 0"] {
            width: 100% !important;
          }
        }
        ::-webkit-scrollbar {
          width: 6px;
        }
        ::-webkit-scrollbar-track {
          background: transparent;
        }
        ::-webkit-scrollbar-thumb {
          background: rgba(102, 126, 234, 0.5);
          border-radius: 3px;
        }
        ::-webkit-scrollbar-thumb:hover {
          background: rgba(102, 126, 234, 0.7);
        }
        input::placeholder {
          color: rgba(255, 255, 255, 0.4);
        }
      `}</style>
    </>
  )
}

export default VotePanel
