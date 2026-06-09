import { useEffect, useRef } from 'react'

interface ControlsProps {
  angle: number
  hue1: number
  hue2: number
  blurRadius: number
  schemeName: string
  onAngleChange: (value: number) => void
  onHue1Change: (value: number) => void
  onHue2Change: (value: number) => void
  onBlurRadiusChange: (value: number) => void
  onAddColorStop: () => void
  onSchemeNameChange: (name: string) => void
  onSave: () => void
}

interface SliderProps {
  label: string
  value: number
  min: number
  max: number
  step: number
  unit?: string
  onChange: (value: number) => void
}

const Slider = ({ label, value, min, max, step, unit = '', onChange }: SliderProps) => {
  const rafRef = useRef<number | null>(null)
  const pendingValue = useRef<number>(value)

  useEffect(() => {
    pendingValue.current = value
  }, [value])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = parseFloat(e.target.value)
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    rafRef.current = requestAnimationFrame(() => {
      onChange(newValue)
    })
  }

  return (
    <div style={styles.sliderRow}>
      <span style={styles.sliderLabel}>{label}</span>
      <div style={styles.sliderWrapper}>
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={handleChange}
          style={styles.sliderInput}
        />
        <span style={styles.sliderValue}>
          {value}
          {unit}
        </span>
      </div>
    </div>
  )
}

const Controls = ({
  angle,
  hue1,
  hue2,
  blurRadius,
  schemeName,
  onAngleChange,
  onHue1Change,
  onHue2Change,
  onBlurRadiusChange,
  onAddColorStop,
  onSchemeNameChange,
  onSave,
}: ControlsProps) => {
  return (
    <div style={styles.container}>
      <Slider
        label="渐变角度"
        value={angle}
        min={0}
        max={360}
        step={1}
        unit="°"
        onChange={onAngleChange}
      />
      <Slider
        label="色标1 色相"
        value={hue1}
        min={0}
        max={360}
        step={1}
        unit="°"
        onChange={onHue1Change}
      />
      <Slider
        label="色标2 色相"
        value={hue2}
        min={0}
        max={360}
        step={1}
        unit="°"
        onChange={onHue2Change}
      />
      <Slider
        label="模糊半径"
        value={blurRadius}
        min={0}
        max={50}
        step={1}
        unit="px"
        onChange={onBlurRadiusChange}
      />

      <div style={styles.buttonRow}>
        <button onClick={onAddColorStop} style={styles.addButton}>
          + 添加中间色标
        </button>
      </div>

      <div style={styles.saveRow}>
        <input
          type="text"
          placeholder="方案名称 (最多20字符)"
          value={schemeName}
          maxLength={20}
          onChange={(e) => onSchemeNameChange(e.target.value)}
          style={styles.nameInput}
        />
        <button onClick={onSave} style={styles.saveButton}>
          保存
        </button>
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: 20,
    width: 600,
    maxWidth: '100%',
    padding: 24,
    background: '#1a1a2e',
    borderRadius: 12,
  },
  sliderRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 16,
  },
  sliderLabel: {
    width: 100,
    color: '#8b8ba7',
    fontSize: 14,
    flexShrink: 0,
  },
  sliderWrapper: {
    display: 'flex',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  sliderInput: {
    flex: 1,
    height: 4,
    appearance: 'none',
    background: '#2a2a4a',
    borderRadius: 2,
    outline: 'none',
    cursor: 'pointer',
  },
  sliderValue: {
    minWidth: 50,
    textAlign: 'right',
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 500,
    transition: 'all 0.2s ease',
  },
  buttonRow: {
    display: 'flex',
    justifyContent: 'center',
    marginTop: 8,
  },
  addButton: {
    padding: '8px 20px',
    background: 'transparent',
    color: '#667eea',
    border: '1px solid #667eea',
    borderRadius: 6,
    cursor: 'pointer',
    fontSize: 14,
    transition: 'all 0.2s ease',
  },
  saveRow: {
    display: 'flex',
    gap: 12,
    marginTop: 8,
  },
  nameInput: {
    flex: 1,
    padding: '8px 12px',
    background: '#0f0f23',
    border: '1px solid #ddd',
    borderRadius: 6,
    color: '#ffffff',
    fontSize: 14,
    outline: 'none',
    transition: 'all 0.2s ease',
  },
  saveButton: {
    padding: '8px 24px',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: '#ffffff',
    border: 'none',
    borderRadius: 6,
    cursor: 'pointer',
    fontSize: 14,
    fontWeight: 500,
    transition: 'all 0.2s ease',
  },
}

export default Controls
