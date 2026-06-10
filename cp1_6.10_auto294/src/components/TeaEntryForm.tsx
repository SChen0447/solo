import { useEffect, useState } from 'react'
import type { TeaCategory, TeaEntry } from '../types/tea'
import { RATING_EMOJIS } from '../types/tea'
import { ALL_TEA_CATEGORIES, TEA_CATEGORY_CONFIG, generateId } from '../utils'

interface TeaEntryFormProps {
  initialData?: TeaEntry | null
  onSubmit: (entry: TeaEntry) => void
  onClose: () => void
}

const CURRENT_YEAR = new Date().getFullYear()

export default function TeaEntryForm({ initialData, onSubmit, onClose }: TeaEntryFormProps) {
  const [name, setName] = useState('')
  const [origin, setOrigin] = useState('')
  const [year, setYear] = useState<number>(CURRENT_YEAR)
  const [category, setCategory] = useState<TeaCategory>('green')
  const [temperature, setTemperature] = useState<number>(90)
  const [teaAmount, setTeaAmount] = useState<number>(5)
  const [brewTime, setBrewTime] = useState<number>(30)
  const [rating, setRating] = useState<number>(7)
  const [notes, setNotes] = useState('')

  useEffect(() => {
    if (initialData) {
      setName(initialData.name)
      setOrigin(initialData.origin)
      setYear(initialData.year)
      setCategory(initialData.category)
      setTemperature(initialData.temperature)
      setTeaAmount(initialData.teaAmount)
      setBrewTime(initialData.brewTime)
      setRating(initialData.rating)
      setNotes(initialData.notes)
    }
  }, [initialData])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return

    const now = new Date().toISOString()
    const entry: TeaEntry = {
      id: initialData?.id ?? generateId(),
      name: name.trim(),
      origin: origin.trim(),
      year,
      category,
      temperature,
      teaAmount,
      brewTime,
      rating,
      notes: notes.trim(),
      createdAt: initialData?.createdAt ?? now,
      updatedAt: now,
    }
    onSubmit(entry)
  }

  const years: number[] = []
  for (let y = CURRENT_YEAR; y >= 1900; y--) {
    years.push(y)
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card form-modal" onClick={(e) => e.stopPropagation()}>
        <form className="form-body" onSubmit={handleSubmit}>
          <h2 className="form-title">{initialData ? '编辑品鉴记录' : '新建品鉴记录'}</h2>

          <div className="form-grid">
            <div className="form-field">
              <label className="form-label">
                茶种名称<span className="required">*</span>
              </label>
              <input
                className="form-input"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="如：正山小种、西湖龙井"
                required
              />
            </div>

            <div className="form-field">
              <label className="form-label">产地</label>
              <input
                className="form-input"
                type="text"
                value={origin}
                onChange={(e) => setOrigin(e.target.value)}
                placeholder="如：福建武夷山"
              />
            </div>

            <div className="form-field">
              <label className="form-label">年份</label>
              <select
                className="form-select"
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
              >
                {years.map((y) => (
                  <option key={y} value={y}>{y}年</option>
                ))}
              </select>
            </div>

            <div className="form-field">
              <label className="form-label">茶类</label>
              <select
                className="form-select"
                value={category}
                onChange={(e) => setCategory(e.target.value as TeaCategory)}
              >
                {ALL_TEA_CATEGORIES.map((c) => (
                  <option key={c} value={c}>{TEA_CATEGORY_CONFIG[c].label}</option>
                ))}
              </select>
            </div>

            <div className="form-field">
              <label className="form-label">冲泡水温（°C）</label>
              <div className="slider-wrapper">
                <input
                  className="form-slider"
                  type="range"
                  min={75}
                  max={100}
                  step={1}
                  value={temperature}
                  onChange={(e) => setTemperature(Number(e.target.value))}
                />
                <span className="slider-value">{temperature}°C</span>
              </div>
            </div>

            <div className="form-field">
              <label className="form-label">投茶量（g）</label>
              <div className="slider-wrapper">
                <input
                  className="form-slider"
                  type="range"
                  min={1}
                  max={10}
                  step={0.5}
                  value={teaAmount}
                  onChange={(e) => setTeaAmount(Number(e.target.value))}
                />
                <span className="slider-value">{teaAmount}g</span>
              </div>
            </div>

            <div className="form-field">
              <label className="form-label">冲泡时间（秒）</label>
              <div className="slider-wrapper">
                <input
                  className="form-slider"
                  type="range"
                  min={5}
                  max={300}
                  step={5}
                  value={brewTime}
                  onChange={(e) => setBrewTime(Number(e.target.value))}
                />
                <span className="slider-value">{brewTime}s</span>
              </div>
            </div>

            <div className="form-field">
              <label className="form-label">口感评分</label>
              <div className="rating-bar">
                {RATING_EMOJIS.map((emoji, idx) => {
                  const score = idx + 1
                  return (
                    <button
                      key={score}
                      type="button"
                      className={`rating-emoji-btn ${rating === score ? 'active' : ''}`}
                      onClick={() => setRating(score)}
                    >
                      {emoji}
                    </button>
                  )
                })}
                <span className="rating-display">{rating}/10</span>
              </div>
            </div>

            <div className="form-field full">
              <label className="form-label">风味描述 / 品鉴笔记</label>
              <textarea
                className="form-textarea"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="记录这泡茶的香气、滋味、回甘、汤色等感受..."
              />
            </div>
          </div>

          <div className="form-actions">
            <button type="button" className="btn btn-ghost" onClick={onClose}>
              取消
            </button>
            <button type="submit" className="btn btn-primary">
              {initialData ? '保存修改' : '创建记录'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
