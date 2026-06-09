import React from 'react'

interface ColorSliderProps {
  label: string
  value: number
  min: number
  max: number
  step: number
  onChange: (value: number) => void
  trackGradient?: string
  suffix?: string
}

const ColorSlider: React.FC<ColorSliderProps> = ({
  label,
  value,
  min,
  max,
  step,
  onChange,
  trackGradient,
  suffix = '',
}) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(Number(e.target.value))
  }

  return (
    <div className="slider-group">
      <div className="slider-label">
        <span>{label}</span>
        <span className="slider-value">{value}{suffix}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={handleChange}
        className="color-slider"
        style={trackGradient ? { background: trackGradient } : {}}
      />
    </div>
  )
}

export default ColorSlider
