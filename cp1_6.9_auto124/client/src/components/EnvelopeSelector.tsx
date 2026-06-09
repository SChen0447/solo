import './EnvelopeSelector.css'

const ENVELOPE_COLORS = [
  { color: '#e8d5b7', name: '牛皮纸' },
  { color: '#c9b99a', name: '浅灰棕' },
  { color: '#f0e6d2', name: '米白' },
  { color: '#d4c4a8', name: '亚麻色' },
]

interface Props {
  selected: string
  onChange: (color: string) => void
}

export default function EnvelopeSelector({ selected, onChange }: Props) {
  return (
    <div className="envelope-selector">
      <label className="form-label">选择信封</label>
      <div className="selector-group">
        {ENVELOPE_COLORS.map((env) => (
          <div
            key={env.color}
            className={`envelope-item ${selected === env.color ? 'selected' : ''}`}
            onClick={() => onChange(env.color)}
            style={{ backgroundColor: env.color }}
          >
            <div className="envelope-preview">
              <div className="envelope-flap" style={{ borderBottomColor: env.color }} />
            </div>
            <span className="envelope-name">{env.name}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
