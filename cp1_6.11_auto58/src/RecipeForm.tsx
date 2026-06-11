import { useState, useRef } from 'react'
import type { Recipe, RecipeStep } from './types'

interface RecipeFormProps {
  open: boolean
  onClose: () => void
  onSubmit: (recipe: Recipe) => void
}

const STAR_EMPTY = `
<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#C0B8B0" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
  <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" />
</svg>
`

const STAR_FILLED = `
<svg width="32" height="32" viewBox="0 0 24 24">
  <defs>
    <linearGradient id="starGold" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#FFD700"/>
      <stop offset="100%" style="stop-color:#FFA500"/>
    </linearGradient>
  </defs>
  <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"
    fill="url(#starGold)" stroke="#E8A317" stroke-width="0.5" stroke-linejoin="round"/>
</svg>
`

function DifficultyStar({ filled, onClick }: { filled: boolean; onClick: () => void }) {
  return (
    <div
      className="star-rating-star"
      onClick={onClick}
      dangerouslySetInnerHTML={{ __html: filled ? STAR_FILLED : STAR_EMPTY }}
    />
  )
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 5)
}

function createEmptyStep(_index: number): RecipeStep {
  return {
    id: generateId(),
    description: '',
    ingredients: '',
  }
}

export default function RecipeForm({ open, onClose, onSubmit }: RecipeFormProps) {
  const [name, setName] = useState('')
  const [duration, setDuration] = useState<number>(30)
  const [difficulty, setDifficulty] = useState<number>(3)
  const [steps, setSteps] = useState<RecipeStep[]>(() => [createEmptyStep(0)])
  const dragIndexRef = useRef<number | null>(null)

  if (!open) return null

  const nameCount = name.length
  const isNameNearLimit = nameCount >= 25
  const isNameOverLimit = nameCount > 30

  const durationOptions = Array.from({ length: 24 }, (_, i) => (i + 1) * 5)

  const isFormValid =
    name.trim().length > 0 &&
    name.trim().length <= 30 &&
    difficulty >= 1 &&
    difficulty <= 5 &&
    steps.length > 0 &&
    steps.some((s) => s.description.trim().length > 0)

  const handleAddStep = () => {
    if (steps.length >= 8) return
    setSteps((prev) => [...prev, createEmptyStep(prev.length)])
  }

  const handleRemoveStep = (index: number) => {
    if (steps.length <= 1) return
    setSteps((prev) => prev.filter((_, i) => i !== index))
  }

  const handleMoveStep = (index: number, direction: -1 | 1) => {
    const newIndex = index + direction
    if (newIndex < 0 || newIndex >= steps.length) return
    setSteps((prev) => {
      const copy = [...prev]
      const temp = copy[index]
      copy[index] = copy[newIndex]
      copy[newIndex] = temp
      return copy
    })
  }

  const handleStepChange = (index: number, field: 'description' | 'ingredients', value: string) => {
    setSteps((prev) =>
      prev.map((step, i) => (i === index ? { ...step, [field]: value } : step))
    )
  }

  const handleDragStart = (index: number) => {
    dragIndexRef.current = index
  }

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    if (dragIndexRef.current === null || dragIndexRef.current === index) return
    setSteps((prev) => {
      const copy = [...prev]
      const fromIdx = dragIndexRef.current!
      const [removed] = copy.splice(fromIdx, 1)
      copy.splice(index, 0, removed)
      dragIndexRef.current = index
      return copy
    })
  }

  const handleDragEnd = () => {
    dragIndexRef.current = null
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!isFormValid) return

    const validSteps = steps
      .filter((s) => s.description.trim().length > 0)
      .map((s, i) => ({
        ...s,
        description: s.description.trim(),
        ingredients: s.ingredients.trim(),
        id: generateId() + i,
      }))

    if (validSteps.length === 0) return

    const newRecipe: Recipe = {
      id: generateId(),
      name: name.trim(),
      duration,
      difficulty,
      icon: 'noodle',
      steps: validSteps,
      createdAt: Date.now(),
    }

    onSubmit(newRecipe)

    setName('')
    setDuration(30)
    setDifficulty(3)
    setSteps([createEmptyStep(0)])
    onClose()
  }

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  return (
    <div className="modal-overlay" onClick={handleOverlayClick}>
      <div className="modal-panel" onClick={(e) => e.stopPropagation()}>
        <form onSubmit={handleSubmit}>
          <div className="modal-header">
            <div>
              <h2 className="modal-title">添加新菜谱</h2>
              <div className="modal-title-sub">记录你的拿手好菜，下次烹饪不迷路</div>
            </div>
            <button
              type="button"
              className="modal-close"
              onClick={onClose}
              aria-label="关闭"
            >
              ✕
            </button>
          </div>

          <div className="modal-body">
            <div className="form-group">
              <label className="form-label">
                <span>菜名</span>
                <span className="form-label-required">*</span>
              </label>
              <input
                type="text"
                className="form-input"
                placeholder="例如：红烧狮子头、番茄炒蛋..."
                value={name}
                onChange={(e) => setName(e.target.value.slice(0, 31))}
                maxLength={31}
                style={{
                  borderColor: isNameOverLimit ? '#E63946' : undefined,
                  boxShadow: isNameOverLimit ? '0 0 0 4px rgba(230, 57, 70, 0.15)' : undefined,
                }}
              />
              <div className={`form-char-count${isNameNearLimit ? ' warning' : ''}`}>
                {nameCount}/30{isNameOverLimit ? ' · 超出限制' : ''}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
              <div className="form-group">
                <label className="form-label">
                  <span>烹饪时长</span>
                  <span className="form-label-required">*</span>
                </label>
                <select
                  className="form-select"
                  value={duration}
                  onChange={(e) => setDuration(Number(e.target.value))}
                >
                  {durationOptions.map((mins) => (
                    <option key={mins} value={mins}>
                      {mins} 分钟
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">
                  <span>难度等级</span>
                  <span className="form-label-required">*</span>
                </label>
                <div className="star-rating">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <DifficultyStar
                      key={star}
                      filled={star <= difficulty}
                      onClick={() => setDifficulty(star)}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">
                <span>烹饪步骤</span>
                <span className="form-label-required">*</span>
                <span style={{
                  marginLeft: 'auto',
                  fontSize: '0.8rem',
                  fontWeight: 'normal',
                  color: 'var(--color-text-light)',
                }}>
                  {steps.length}/8
                </span>
              </label>
              <div className="steps-container">
                {steps.map((step, index) => (
                  <div
                    key={step.id}
                    className="step-item"
                    draggable={steps.length > 1}
                    onDragStart={() => handleDragStart(index)}
                    onDragOver={(e) => handleDragOver(e, index)}
                    onDragEnd={handleDragEnd}
                  >
                    <div className="step-item-header">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        {steps.length > 1 && (
                          <div
                            className="step-drag-handle"
                            title="拖动排序"
                          >
                            <svg width="14" height="20" viewBox="0 0 14 20" fill="currentColor">
                              <circle cx="3" cy="3" r="2" />
                              <circle cx="11" cy="3" r="2" />
                              <circle cx="3" cy="10" r="2" />
                              <circle cx="11" cy="10" r="2" />
                              <circle cx="3" cy="17" r="2" />
                              <circle cx="11" cy="17" r="2" />
                            </svg>
                          </div>
                        )}
                        <div className="step-item-number">
                          <div className="step-item-number-badge">{index + 1}</div>
                          步骤 {index + 1}
                        </div>
                      </div>
                      <div className="step-item-actions">
                        <button
                          type="button"
                          className="step-action-btn"
                          onClick={() => handleMoveStep(index, -1)}
                          disabled={index === 0}
                          title="上移"
                        >
                          ↑
                        </button>
                        <button
                          type="button"
                          className="step-action-btn"
                          onClick={() => handleMoveStep(index, 1)}
                          disabled={index === steps.length - 1}
                          title="下移"
                        >
                          ↓
                        </button>
                        <button
                          type="button"
                          className="step-action-btn remove"
                          onClick={() => handleRemoveStep(index)}
                          disabled={steps.length <= 1}
                          title="删除"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                    <div className="step-item-fields">
                      <div>
                        <div className="step-field-label">步骤说明</div>
                        <textarea
                          className="form-textarea"
                          placeholder="描述这一步的操作..."
                          value={step.description}
                          onChange={(e) => handleStepChange(index, 'description', e.target.value)}
                          style={{ minHeight: '60px' }}
                        />
                      </div>
                      <div>
                        <div className="step-field-label">本步所需材料（点击步骤完成后显示）</div>
                        <textarea
                          className="form-textarea"
                          placeholder="例如：生抽2勺、料酒1勺、姜片3片..."
                          value={step.ingredients}
                          onChange={(e) => handleStepChange(index, 'ingredients', e.target.value)}
                          style={{ minHeight: '50px' }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
                <button
                  type="button"
                  className="add-step-btn"
                  onClick={handleAddStep}
                  disabled={steps.length >= 8}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                  {steps.length >= 8 ? '已达到最大步骤数' : '添加步骤'}
                </button>
              </div>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="modal-btn modal-btn-cancel" onClick={onClose}>
              取消
            </button>
            <button
              type="submit"
              className="modal-btn modal-btn-submit"
              disabled={!isFormValid}
            >
              保存菜谱
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
