import React from 'react'
import { GlassParams } from '../types'

interface GlassCardProps {
  params: GlassParams
  children: React.ReactNode
}

const GlassCard: React.FC<GlassCardProps> = React.memo(({ params, children }) => {
  const {
    blurRadius,
    opacity,
    highlightPosition,
    highlightIntensity,
    gradientHue,
    gradientSaturation,
    borderColor,
  } = params

  const color1 = `hsla(${gradientHue}, ${gradientSaturation}%, 30%, ${opacity})`
  const color2 = `hsla(${(gradientHue + 40) % 360}, ${gradientSaturation}%, 30%, ${opacity})`

  return (
    <div
      className="glass-card relative flex items-center justify-center overflow-hidden cursor-pointer"
      style={{
        width: '180px',
        height: '240px',
        borderRadius: '16px',
        background: `linear-gradient(135deg, ${color1} 0%, ${color2} 100%)`,
        backdropFilter: `blur(${blurRadius}px)`,
        WebkitBackdropFilter: `blur(${blurRadius}px)`,
        border: `1px solid ${borderColor}`,
        boxShadow: `
          0 8px 32px rgba(0, 0, 0, 0.3),
          0 1px 1px rgba(255, 255, 255, 0.1)
        `,
        transition: 'all 0.3s ease',
      }}
    >
      <div
        className="absolute top-0 left-0 right-0 pointer-events-none"
        style={{
          height: '50%',
          background: `linear-gradient(
            180deg,
            rgba(255, 255, 255, ${highlightIntensity * 0.3}) 0%,
            rgba(255, 255, 255, 0) ${highlightPosition}%
          )`,
        }}
      />
      <div
        className="relative z-10 w-full h-full flex items-center justify-center p-4"
        style={{ color: 'rgba(255, 255, 255, 0.9)' }}
      >
        {children}
      </div>
    </div>
  )
})

GlassCard.displayName = 'GlassCard'

export default GlassCard
