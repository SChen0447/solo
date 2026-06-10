import React, { memo } from 'react'
import { motion } from 'framer-motion'
import { GRADIENT_PRESETS, GradientPreset } from './types'

interface ColorPaletteProps {
  selectedId: string
  onSelect: (preset: GradientPreset) => void
}

const ColorPalette: React.FC<ColorPaletteProps> = memo(({ selectedId, onSelect }) => {
  return (
    <div style={styles.wrapper}>
      <div style={styles.title}>渐变背景预设</div>
      <div style={styles.grid}>
        {GRADIENT_PRESETS.map((preset) => {
          const gradient = `linear-gradient(135deg, ${preset.colors.join(', ')})`
          const isSelected = preset.id === selectedId
          return (
            <motion.button
              key={preset.id}
              onClick={() => onSelect(preset)}
              whileHover={{ scale: 1.05 }}
              transition={{ duration: 0.2, ease: 'ease' }}
              title={preset.name}
              style={{
                ...styles.swatch,
                background: gradient,
                outline: isSelected ? '2px solid #3b82f6' : 'none',
                outlineOffset: isSelected ? '2px' : '0'
              }}
            />
          )
        })}
      </div>
    </div>
  )
})

ColorPalette.displayName = 'ColorPalette'

const styles: Record<string, React.CSSProperties> = {
  wrapper: {
    width: '100%'
  },
  title: {
    fontSize: 13,
    fontWeight: 600,
    color: '#2d2d2d',
    marginBottom: 8
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(5, 64px)',
    gridTemplateRows: 'repeat(2, 64px)',
    gap: 8
  },
  swatch: {
    width: 64,
    height: 64,
    borderRadius: 4,
    border: 'none',
    cursor: 'pointer',
    padding: 0
  }
}

export default ColorPalette
