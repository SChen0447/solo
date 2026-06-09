import { COLORS, MIN_THICKNESS, MAX_THICKNESS, ViewState } from '../types'

interface ToolbarProps {
  color: string
  thickness: number
  onColorChange: (color: string) => void
  onThicknessChange: (thickness: number) => void
  onAddStickyNote: (centerX: number, centerY: number) => void
  viewState: ViewState
}

function Toolbar({
  color,
  thickness,
  onColorChange,
  onThicknessChange,
  onAddStickyNote,
  viewState,
}: ToolbarProps) {
  const handleAddStickyNote = () => {
    const centerX = (-viewState.offsetX + window.innerWidth / 2) / viewState.scale
    const centerY = (-viewState.offsetY + (window.innerHeight - 60 - 100) / 2) / viewState.scale
    onAddStickyNote(centerX, centerY)
  }

  return (
    <div style={styles.toolbar}>
      <div style={styles.section}>
        <span style={styles.sectionLabel}>颜色</span>
        <div style={styles.colorPicker}>
          {COLORS.map((c) => (
            <button
              key={c}
              style={{
                ...styles.colorButton,
                backgroundColor: c,
                ...(color === c ? styles.colorButtonActive : {}),
                boxShadow: color === c ? `0 0 12px ${c}, 0 0 24px ${c}40` : 'none',
              }}
              onClick={() => onColorChange(c)}
            />
          ))}
        </div>
      </div>

      <div style={styles.divider} />

      <div style={styles.section}>
        <span style={styles.sectionLabel}>粗细</span>
        <div style={styles.thicknessControl}>
          <span style={styles.thicknessValue}>{thickness}px</span>
          <input
            type="range"
            min={MIN_THICKNESS}
            max={MAX_THICKNESS}
            value={thickness}
            onChange={(e) => onThicknessChange(Number(e.target.value))}
            style={styles.rangeInput}
          />
          <div style={styles.thicknessPreview}>
            <div
              style={{
                width: thickness,
                height: thickness,
                backgroundColor: color,
                borderRadius: '50%',
              }}
            />
          </div>
        </div>
      </div>

      <div style={styles.divider} />

      <div style={styles.section}>
        <button style={styles.stickyButton} onClick={handleAddStickyNote}>
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#1a1a2e"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <path d="M9 3v18M15 3v18M3 9h18M3 15h18" />
          </svg>
          <span style={styles.buttonText}>添加便利贴</span>
        </button>
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  toolbar: {
    position: 'fixed',
    bottom: '24px',
    left: '50%',
    transform: 'translateX(-50%)',
    display: 'flex',
    alignItems: 'center',
    gap: '20px',
    padding: '14px 24px',
    backgroundColor: 'rgba(26, 26, 46, 0.75)',
    backdropFilter: 'blur(15px)',
    WebkitBackdropFilter: 'blur(15px)',
    borderRadius: '16px',
    border: '1px solid rgba(255,255,255,0.1)',
    boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
    zIndex: 1000,
    transition: 'all 0.2s ease',
  },
  section: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  sectionLabel: {
    fontSize: '12px',
    color: '#999',
    fontWeight: '500',
  },
  colorPicker: {
    display: 'flex',
    gap: '8px',
  },
  colorButton: {
    width: '28px',
    height: '28px',
    borderRadius: '50%',
    border: '2px solid rgba(255,255,255,0.15)',
    cursor: 'pointer',
    padding: 0,
    transition: 'all 0.2s ease',
  },
  colorButtonActive: {
    border: '3px solid #fff',
    transform: 'scale(1.15)',
  },
  divider: {
    width: '1px',
    height: '36px',
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  thicknessControl: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  thicknessValue: {
    fontSize: '13px',
    color: '#e0e0e0',
    fontFamily: 'monospace',
    minWidth: '40px',
  },
  rangeInput: {
    width: '120px',
    height: '4px',
    accentColor: '#4fc3f7',
    cursor: 'pointer',
  },
  thicknessPreview: {
    width: '24px',
    height: '24px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '6px',
    backgroundColor: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.1)',
  },
  stickyButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '10px 18px',
    borderRadius: '10px',
    border: 'none',
    backgroundColor: '#ffd700',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  buttonText: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#1a1a2e',
  },
}

export default Toolbar
