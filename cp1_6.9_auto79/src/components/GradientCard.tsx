import React from 'react'

interface GradientCardProps {
  startColor: string
  endColor: string
  angle: number
  name?: string
  onClick?: () => void
}

const GradientCard: React.FC<GradientCardProps> = ({ startColor, endColor, angle, name, onClick }) => {
  return (
    <div className="gradient-card" onClick={onClick}>
      <div
        className="gradient-card-preview"
        style={{
          background: `linear-gradient(${angle}deg, ${startColor}, ${endColor})`,
        }}
      />
      {name && <div className="gradient-card-name">{name}</div>}
    </div>
  )
}

export default GradientCard
