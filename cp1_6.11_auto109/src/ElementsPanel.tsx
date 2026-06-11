import React from 'react'
import { ElementType, ELEMENT_CONFIGS } from './types'

interface ElementsPanelProps {
  onDragStart: (type: ElementType) => void
}

const ElementsPanel: React.FC<ElementsPanelProps> = ({ onDragStart }) => {
  const handleDragStart = (e: React.DragEvent, type: ElementType) => {
    e.dataTransfer.setData('elementType', type)
    e.dataTransfer.effectAllowed = 'copy'
    onDragStart(type)
  }

  return (
    <div style={styles.panel}>
      <div style={styles.header}>
        <h3 style={styles.title}>元素面板</h3>
      </div>
      <div style={styles.elementsList}>
        {Object.values(ELEMENT_CONFIGS).map((config) => (
          <div
            key={config.type}
            draggable
            onDragStart={(e) => handleDragStart(e, config.type)}
            style={styles.elementItem}
          >
            <div
              style={{
                ...styles.icon,
                backgroundColor: config.color,
              }}
            >
              <ElementIcon type={config.type} color={config.color} />
            </div>
            <span style={styles.elementName}>{config.name}</span>
          </div>
        ))}
      </div>
      <div style={styles.hint}>
        <p style={styles.hintText}>拖拽元素到沙盘</p>
      </div>
    </div>
  )
}

const ElementIcon: React.FC<{ type: ElementType; color: string }> = ({ type, color }) => {
  const darker = adjustColor(color, -30)
  const lighter = adjustColor(color, 30)

  switch (type) {
    case 'pine':
      return (
        <svg viewBox="0 0 50 50" width="40" height="40">
          <polygon points="25,5 10,25 18,25 5,40 15,40 15,45 35,45 35,40 45,40 32,25 40,25" fill={color} />
          <rect x="22" y="42" width="6" height="6" fill={darker} />
        </svg>
      )
    case 'oak':
      return (
        <svg viewBox="0 0 50 50" width="40" height="40">
          <circle cx="25" cy="20" r="15" fill={color} />
          <circle cx="15" cy="25" r="8" fill={lighter} />
          <circle cx="35" cy="25" r="8" fill={lighter} />
          <circle cx="25" cy="12" r="7" fill={lighter} />
          <rect x="22" y="32" width="6" height="13" fill={darker} />
        </svg>
      )
    case 'cabin':
      return (
        <svg viewBox="0 0 50 50" width="40" height="40">
          <polygon points="25,8 5,25 45,25" fill="#6b4423" />
          <rect x="10" y="25" width="30" height="18" fill={color} />
          <rect x="20" y="32" width="10" height="11" fill={darker} />
          <rect x="13" y="29" width="6" height="6" fill="#f9d71c" />
          <rect x="31" y="29" width="6" height="6" fill="#f9d71c" />
        </svg>
      )
    case 'lighthouse':
      return (
        <svg viewBox="0 0 50 50" width="40" height="40">
          <rect x="20" y="15" width="10" height="28" fill={color} />
          <rect x="18" y="40" width="14" height="5" fill={darker} />
          <polygon points="18,15 32,15 30,8 20,8" fill="#d9534f" />
          <circle cx="25" cy="11" r="3" fill="#f9d71c" />
          <rect x="23" y="22" width="4" height="4" fill="#4a90d9" />
          <rect x="23" y="30" width="4" height="4" fill="#4a90d9" />
        </svg>
      )
    case 'bridge':
      return (
        <svg viewBox="0 0 50 50" width="40" height="40">
          <rect x="5" y="22" width="40" height="6" fill={color} />
          <rect x="5" y="18" width="4" height="4" fill={darker} />
          <rect x="14" y="18" width="4" height="4" fill={darker} />
          <rect x="23" y="18" width="4" height="4" fill={darker} />
          <rect x="32" y="18" width="4" height="4" fill={darker} />
          <rect x="41" y="18" width="4" height="4" fill={darker} />
          <path d="M5 28 Q25 38 45 28" fill="none" stroke={darker} strokeWidth="2" />
        </svg>
      )
    case 'lake':
      return (
        <svg viewBox="0 0 50 50" width="40" height="40">
          <ellipse cx="25" cy="28" rx="22" ry="14" fill={color} />
          <ellipse cx="25" cy="26" rx="18" ry="10" fill={lighter} opacity="0.5" />
          <path d="M10 24 Q15 22 20 24" fill="none" stroke="#fff" strokeWidth="1" opacity="0.6" />
          <path d="M28 28 Q33 26 38 28" fill="none" stroke="#fff" strokeWidth="1" opacity="0.6" />
        </svg>
      )
    default:
      return null
  }
}

function adjustColor(color: string, amount: number): string {
  const hex = color.replace('#', '')
  const num = parseInt(hex, 16)
  const r = Math.min(255, Math.max(0, (num >> 16) + amount))
  const g = Math.min(255, Math.max(0, ((num >> 8) & 0x00ff) + amount))
  const b = Math.min(255, Math.max(0, (num & 0x0000ff) + amount))
  return `#${(r << 16 | g << 8 | b).toString(16).padStart(6, '0')}`
}

const styles: Record<string, React.CSSProperties> = {
  panel: {
    width: '200px',
    backgroundColor: '#2d3e4f',
    padding: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    boxShadow: '2px 0 4px rgba(0,0,0,0.2)',
    overflowY: 'auto',
  },
  header: {
    borderBottom: '1px solid #4a5568',
    paddingBottom: '12px',
  },
  title: {
    color: '#f1f1f1',
    fontSize: '18px',
    fontWeight: 600,
    margin: 0,
  },
  elementsList: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '12px',
  },
  elementItem: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '6px',
    cursor: 'grab',
    padding: '8px',
    borderRadius: '8px',
    backgroundColor: '#3d4f60',
    transition: 'transform 0.1s, background-color 0.2s',
  },
  icon: {
    width: '50px',
    height: '50px',
    borderRadius: '8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
  },
  elementName: {
    color: '#f1f1f1',
    fontSize: '12px',
    fontWeight: 500,
  },
  hint: {
    marginTop: 'auto',
    padding: '12px',
    backgroundColor: '#3d4f60',
    borderRadius: '8px',
  },
  hintText: {
    color: '#a0aec0',
    fontSize: '12px',
    textAlign: 'center',
    margin: 0,
  },
}

export default ElementsPanel
