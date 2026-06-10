import { useRef } from 'react'

interface PreferenceSliderPanelProps {
  preferences: number[]
  onChange: (preferences: number[]) => void
}

const DIMENSIONS = [
  { key: 'floral', label: '花香', desc: '如茉莉、兰花、玫瑰等清雅芬芳' },
  { key: 'fruity', label: '果香', desc: '如蜜桃、柑橘、苹果等清新果香' },
  { key: 'woody', label: '木香', desc: '如松木、樟木、陈年老茶之醇厚' },
  { key: 'honey', label: '蜜香', desc: '如蜂蜜、桂圆、枣花蜜之甘甜' }
]

function PreferenceSliderPanel({ preferences, onChange }: PreferenceSliderPanelProps) {
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const localPrefs = useRef<number[]>([...preferences])

  const handleSliderChange = (index: number, value: number) => {
    const newPrefs = [...localPrefs.current]
    newPrefs[index] = value
    localPrefs.current = newPrefs

    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }
  }

  const handleSliderCommit = (index: number, value: number) => {
    const newPrefs = [...localPrefs.current]
    newPrefs[index] = value
    localPrefs.current = newPrefs

    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }
    debounceRef.current = setTimeout(() => {
      onChange([...localPrefs.current])
    }, 500)
  }

  return (
    <section className="preference-panel">
      <h2 className="panel-title">调整您的口感偏好</h2>
      <div className="sliders-container">
        {DIMENSIONS.map((dim, index) => (
          <div key={dim.key} className="slider-wrapper">
            <div className="slider-header">
              <span className="slider-label">{dim.label}</span>
              <span className="slider-value">{preferences[index]}</span>
            </div>
            <input
              type="range"
              min={1}
              max={10}
              step={1}
              value={preferences[index]}
              onChange={(e) => handleSliderChange(index, Number(e.target.value))}
              onMouseUp={(e) => handleSliderCommit(index, Number((e.target as HTMLInputElement).value))}
              onTouchEnd={(e) => handleSliderCommit(index, Number((e.target as HTMLInputElement).value))}
              onKeyUp={(e) => handleSliderCommit(index, Number((e.target as HTMLInputElement).value))}
            />
            <p className="slider-desc">{dim.desc}</p>
          </div>
        ))}
      </div>
    </section>
  )
}

export default PreferenceSliderPanel
