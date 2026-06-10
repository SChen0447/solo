import { useState } from 'react'
import type { Frequency } from '@/types'

interface AddHabitModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: {
    name: string
    icon: string
    frequency: Frequency
    customDays?: number
    targetMinutes: number
    reminderTime?: string
  }) => void
}

const EMOJI_OPTIONS = [
  '📚', '🏃', '🧘', '💪', '🎨', '🎵', '💧', '🥗',
  '😴', '✍️', '🧹', '🌱', '📝', '🎯', '🚶', '🧠',
]

export function AddHabitModal({ isOpen, onClose, onSubmit }: AddHabitModalProps) {
  const [name, setName] = useState('')
  const [icon, setIcon] = useState(EMOJI_OPTIONS[0])
  const [frequency, setFrequency] = useState<Frequency>('daily')
  const [customDays, setCustomDays] = useState(7)
  const [targetMinutes, setTargetMinutes] = useState(30)
  const [reminderTime, setReminderTime] = useState('')

  if (!isOpen) return null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return

    onSubmit({
      name: name.trim(),
      icon,
      frequency,
      customDays: frequency === 'custom' ? customDays : undefined,
      targetMinutes,
      reminderTime: reminderTime || undefined,
    })

    setName('')
    setIcon(EMOJI_OPTIONS[0])
    setFrequency('daily')
    setCustomDays(7)
    setTargetMinutes(30)
    setReminderTime('')
    onClose()
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>添加新习惯</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form">
          <div className="form-group">
            <label>习惯名称</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="例如：每日阅读"
              required
              autoFocus
            />
          </div>

          <div className="form-group">
            <label>选择图标</label>
            <div className="emoji-grid">
              {EMOJI_OPTIONS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  className={`emoji-btn ${icon === emoji ? 'selected' : ''}`}
                  onClick={() => setIcon(emoji)}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label>目标频率</label>
            <div className="frequency-options">
              {[
                { value: 'daily' as Frequency, label: '每日' },
                { value: 'weekly' as Frequency, label: '每周' },
                { value: 'custom' as Frequency, label: '自定义' },
              ].map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  className={`freq-btn ${frequency === opt.value ? 'selected' : ''}`}
                  onClick={() => setFrequency(opt.value)}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            {frequency === 'custom' && (
              <input
                type="number"
                min={1}
                max={365}
                value={customDays}
                onChange={(e) => setCustomDays(parseInt(e.target.value, 10) || 1)}
                className="custom-days-input"
                placeholder="天数周期"
              />
            )}
          </div>

          <div className="form-group">
            <label>目标时长（分钟）</label>
            <input
              type="number"
              min={1}
              max={1440}
              value={targetMinutes}
              onChange={(e) => setTargetMinutes(parseInt(e.target.value, 10) || 1)}
            />
          </div>

          <div className="form-group">
            <label>提醒时间（可选）</label>
            <input
              type="time"
              value={reminderTime}
              onChange={(e) => setReminderTime(e.target.value)}
            />
          </div>

          <div className="modal-actions">
            <button type="button" className="btn-cancel" onClick={onClose}>
              取消
            </button>
            <button type="submit" className="btn-submit">
              添加习惯
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
