import { motion } from 'framer-motion'
import { useState, useCallback } from 'react'

export interface ControlValues {
  windSpeed: number
  concentration: number
}

interface ControlPanelProps {
  initialValues: ControlValues
  onChange: (values: ControlValues) => void
  onReset: () => void
  onThemeToggle?: () => void
  theme?: 'warm' | 'cool'
}

const THEME_COLORS = {
  warm: {
    primary: '#d2b48c',
    accent: '#ffd700',
    background: 'rgba(0,0,0,0.55)',
    border: '#b8860b',
    track: 'rgba(255,215,0,0.3)'
  },
  cool: {
    primary: '#87ceeb',
    accent: '#00bfff',
    background: 'rgba(0,20,40,0.55)',
    border: '#4682b4',
    track: 'rgba(0,191,255,0.3)'
  }
}

export function ControlPanel({
  initialValues,
  onChange,
  onReset,
  onThemeToggle,
  theme = 'warm'
}: ControlPanelProps) {
  const [windSpeed, setWindSpeed] = useState(initialValues.windSpeed)
  const [concentration, setConcentration] = useState(initialValues.concentration)
  const [activeSlider, setActiveSlider] = useState<string | null>(null)

  const colors = THEME_COLORS[theme]

  const handleWindChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value)
    setWindSpeed(value)
    onChange({ windSpeed: value, concentration })
  }, [concentration, onChange])

  const handleConcentrationChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value)
    setConcentration(value)
    onChange({ windSpeed, concentration: value })
  }, [windSpeed, onChange])

  const handleReset = useCallback(() => {
    setWindSpeed(initialValues.windSpeed)
    setConcentration(initialValues.concentration)
    onReset()
  }, [initialValues, onReset])

  const sliderStyle = (name: string): React.CSSProperties => ({
    WebkitAppearance: 'none',
    appearance: 'none',
    width: '100%',
    height: '4px',
    borderRadius: '2px',
    background: `linear-gradient(to right, ${colors.accent} 0%, ${colors.accent} ${
      name === 'wind'
        ? ((windSpeed - 0) / (20 - 0)) * 100
        : ((concentration - 0.1) / (1.0 - 0.1)) * 100
    }%, rgba(255,255,255,0.2) ${
      name === 'wind'
        ? ((windSpeed - 0) / (20 - 0)) * 100
        : ((concentration - 0.1) / (1.0 - 0.1)) * 100
    }%, rgba(255,255,255,0.2) 100%)`,
    outline: 'none',
    cursor: 'pointer',
    transition: 'all 0.2s ease-out'
  })

  const thumbStyle = (name: string) => ({
    WebkitAppearance: 'none' as const,
    appearance: 'none',
    width: '16px',
    height: '16px',
    borderRadius: '50%',
    background: colors.accent,
    cursor: 'grab',
    boxShadow: activeSlider === name
      ? `0 0 8px ${colors.accent}, 0 0 16px ${colors.accent}`
      : '0 2px 4px rgba(0,0,0,0.3)',
    transition: 'box-shadow 0.2s ease-out',
    transform: activeSlider === name ? 'scale(1.1)' : 'scale(1)',
    border: `2px solid ${colors.primary}`
  })

  return (
    <>
      <style>{`
        .slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 16px;
          height: 16px;
          border-radius: 50%;
          cursor: grab;
        }
        .slider::-moz-range-thumb {
          width: 16px;
          height: 16px;
          border-radius: 50%;
          border: none;
          cursor: grab;
        }
        .slider:active::-webkit-slider-thumb {
          cursor: grabbing;
        }
        .slider:active::-moz-range-thumb {
          cursor: grabbing;
        }
      `}</style>
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          background: colors.background,
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          border: `1px solid ${colors.border}`,
          borderRadius: '12px',
          padding: '20px',
          minWidth: '280px',
          zIndex: 100,
          color: colors.primary,
          boxShadow: '0 8px 32px rgba(0,0,0,0.3)'
        }}
        className="control-panel"
      >
        <div style={{
          fontSize: '14px',
          fontWeight: 600,
          marginBottom: '16px',
          color: colors.accent,
          letterSpacing: '0.5px',
          textTransform: 'uppercase'
        }}>
          沙暴控制台
        </div>

        <div style={{ marginBottom: '16px' }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            marginBottom: '8px',
            fontSize: '12px'
          }}>
            <span>风速</span>
            <span style={{ color: colors.accent, fontWeight: 500 }}>{windSpeed.toFixed(1)} m/s</span>
          </div>
          <input
            type="range"
            min="0"
            max="20"
            step="0.5"
            value={windSpeed}
            onChange={handleWindChange}
            onMouseDown={() => setActiveSlider('wind')}
            onMouseUp={() => setActiveSlider(null)}
            onTouchStart={() => setActiveSlider('wind')}
            onTouchEnd={() => setActiveSlider(null)}
            className="slider"
            style={sliderStyle('wind')}
          />
          <style>{`
            input[value="${windSpeed}"].slider::-webkit-slider-thumb {
              ${Object.entries(thumbStyle('wind')).map(([k, v]) => `${k}: ${v};`).join('')}
            }
          `}</style>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            marginBottom: '8px',
            fontSize: '12px'
          }}>
            <span>沙尘浓度</span>
            <span style={{ color: colors.accent, fontWeight: 500 }}>{concentration.toFixed(2)}</span>
          </div>
          <input
            type="range"
            min="0.1"
            max="1.0"
            step="0.05"
            value={concentration}
            onChange={handleConcentrationChange}
            onMouseDown={() => setActiveSlider('concentration')}
            onMouseUp={() => setActiveSlider(null)}
            onTouchStart={() => setActiveSlider('concentration')}
            onTouchEnd={() => setActiveSlider(null)}
            className="slider"
            style={sliderStyle('concentration')}
          />
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={handleReset}
            style={{
              flex: 1,
              padding: '10px 16px',
              borderRadius: '8px',
              border: `1px solid ${colors.border}`,
              background: 'transparent',
              color: colors.primary,
              fontSize: '13px',
              cursor: 'pointer',
              transition: 'all 0.2s ease-out',
              fontWeight: 500
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = `${colors.accent}22`
              e.currentTarget.style.borderColor = colors.accent
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent'
              e.currentTarget.style.borderColor = colors.border
            }}
          >
            重置
          </button>
          {onThemeToggle && (
            <button
              onClick={onThemeToggle}
              style={{
                padding: '10px 16px',
                borderRadius: '8px',
                border: `1px solid ${colors.border}`,
                background: 'transparent',
                color: colors.primary,
                fontSize: '13px',
                cursor: 'pointer',
                transition: 'all 0.2s ease-out',
                fontWeight: 500
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = `${colors.accent}22`
                e.currentTarget.style.borderColor = colors.accent
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent'
                e.currentTarget.style.borderColor = colors.border
              }}
              title="切换主题"
            >
              {theme === 'warm' ? '🌙' : '☀️'}
            </button>
          )}
        </div>
      </motion.div>

      <style>{`
        @media (max-width: 768px) {
          .control-panel {
            bottom: auto !important;
            top: 12px !important;
            right: 5% !important;
            left: 5% !important;
            width: 90% !important;
            min-width: unset !important;
            height: 60px !important;
            padding: 8px 16px !important;
            display: flex !important;
            align-items: center !important;
            gap: 16px !important;
          }
          .control-panel > div:first-child {
            display: none !important;
          }
          .control-panel > div:not(:last-child) {
            flex: 1 !important;
            margin-bottom: 0 !important;
            min-width: 0 !important;
          }
          .control-panel > div:last-child {
            flex-shrink: 0 !important;
            margin-bottom: 0 !important;
          }
        }
      `}</style>
    </>
  )
}
