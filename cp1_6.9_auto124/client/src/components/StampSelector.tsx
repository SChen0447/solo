import { useState } from 'react'
import './StampSelector.css'

const STAMPS = [
  { id: 'sakura', name: '樱花', emoji: '🌸', glow: '#ffb7c5' },
  { id: 'moon', name: '星月', emoji: '🌙', glow: '#88ddff' },
  { id: 'ship', name: '帆船', emoji: '⛵', glow: '#88ccff' },
  { id: 'castle', name: '古堡', emoji: '🏰', glow: '#ccb388' },
  { id: 'bird', name: '飞鸟', emoji: '🕊️', glow: '#aaddff' },
  { id: 'aurora', name: '极光', emoji: '🌌', glow: '#66ffaa' },
]

interface Props {
  selected: string
  onChange: (stamp: string) => void
}

export default function StampSelector({ selected, onChange }: Props) {
  const [preview, setPreview] = useState<string | null>(null)

  const selectedStamp = STAMPS.find((s) => s.id === selected)

  return (
    <div className="stamp-selector">
      <label className="form-label">选择邮票</label>
      {selectedStamp && (
        <div className="selected-stamp-info" style={{ color: selectedStamp.glow }}>
          已选：{selectedStamp.emoji} {selectedStamp.name}
        </div>
      )}
      <div className="selector-group">
        {STAMPS.map((stamp) => (
          <div
            key={stamp.id}
            className={`stamp-item ${selected === stamp.id ? 'selected' : ''}`}
            onClick={() => onChange(stamp.id)}
            onMouseEnter={() => setPreview(stamp.id)}
            onMouseLeave={() => setPreview(null)}
          >
            <div
              className="stamp-emoji"
              style={selected === stamp.id ? { boxShadow: `0 0 20px ${stamp.glow}` } : {}}
            >
              {stamp.emoji}
            </div>
            <span className="stamp-name">{stamp.name}</span>
            {preview === stamp.id && (
              <div className="stamp-preview" style={{ borderColor: stamp.glow }}>
                {stamp.emoji}
                <div className="stamp-preview-name">{stamp.name}</div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
