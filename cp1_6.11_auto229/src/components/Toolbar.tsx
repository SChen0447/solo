import { motion } from 'framer-motion'
import type { ToolType } from '../utils/inkEngine'

interface ToolbarProps {
  currentTool: ToolType
  onToolChange: (tool: ToolType) => void
  onExportSVG: () => void
}

const BrushIcon = ({ active }: { active: boolean }) => (
  <svg width="28" height="28" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path
      d="M26 4C24 4 20 6 16 12C12 18 10 22 10 24C10 26 12 28 14 28C16 28 20 26 24 20C28 14 30 8 26 4Z"
      fill={active ? '#d4a017' : '#f5f0e0'}
      stroke={active ? '#d4a017' : '#f5f0e0'}
      strokeWidth="1.5"
      strokeLinejoin="round"
    />
    <path
      d="M8 26C6 26 4 28 4 30"
      stroke={active ? '#d4a017' : '#f5f0e0'}
      strokeWidth="2"
      strokeLinecap="round"
    />
    <circle cx="10" cy="26" r="1.5" fill={active ? '#d4a017' : '#f5f0e0'} />
  </svg>
)

const PenIcon = ({ active }: { active: boolean }) => (
  <svg width="28" height="28" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path
      d="M24 4L28 8L10 26L4 28L6 22L24 4Z"
      fill={active ? '#d4a017' : '#f5f0e0'}
      stroke={active ? '#d4a017' : '#f5f0e0'}
      strokeWidth="1.5"
      strokeLinejoin="round"
    />
    <path
      d="M22 6L26 10"
      stroke={active ? '#d4a017' : '#f5f0e0'}
      strokeWidth="1.5"
      strokeLinecap="round"
    />
  </svg>
)

const DropperIcon = ({ active }: { active: boolean }) => (
  <svg width="28" height="28" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path
      d="M20 2L26 8L18 16L12 10L20 2Z"
      fill={active ? '#d4a017' : '#f5f0e0'}
      stroke={active ? '#d4a017' : '#f5f0e0'}
      strokeWidth="1.5"
      strokeLinejoin="round"
    />
    <path
      d="M14 12L10 16C8 18 6 20 8 22C10 24 12 22 14 20L18 16"
      fill={active ? '#d4a017' : '#f5f0e0'}
      stroke={active ? '#d4a017' : '#f5f0e0'}
      strokeWidth="1.5"
      strokeLinejoin="round"
    />
    <path
      d="M6 24L4 28"
      stroke={active ? '#d4a017' : '#f5f0e0'}
      strokeWidth="2"
      strokeLinecap="round"
    />
  </svg>
)

const tools: { id: ToolType; label: string; Icon: typeof BrushIcon }[] = [
  { id: 'brush', label: '毛笔', Icon: BrushIcon },
  { id: 'pen', label: '钢笔', Icon: PenIcon },
  { id: 'dropper', label: '滴管', Icon: DropperIcon },
]

const Toolbar = ({ currentTool, onToolChange, onExportSVG }: ToolbarProps) => {
  return (
    <motion.div
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.3 }}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        height: 60,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 24px',
        backgroundColor: 'rgba(74, 59, 50, 0.75)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        zIndex: 100,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        {tools.map(({ id, label, Icon }) => (
          <motion.button
            key={id}
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => onToolChange(id)}
            title={label}
            style={{
              width: 48,
              height: 48,
              borderRadius: 8,
              border: currentTool === id ? '2px solid #d4a017' : '2px solid transparent',
              background: currentTool === id ? 'rgba(212, 160, 23, 0.15)' : 'transparent',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s ease',
            }}
          >
            <Icon active={currentTool === id} />
          </motion.button>
        ))}
      </div>

      <motion.button
        whileHover={{ scale: 1.05, backgroundColor: '#6b4e3a' }}
        whileTap={{ scale: 0.95 }}
        onClick={onExportSVG}
        style={{
          padding: '10px 20px',
          backgroundColor: '#5d4037',
          color: '#f5f0e0',
          border: 'none',
          borderRadius: 8,
          fontSize: 14,
          fontWeight: 600,
          cursor: 'pointer',
          letterSpacing: 1,
        }}
      >
        导出 SVG
      </motion.button>
    </motion.div>
  )
}

export default Toolbar
