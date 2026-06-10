import React, { useState, useMemo, useRef, useEffect } from 'react'
import { ingredients, Ingredient } from '../data'

interface Props {
  selectedIds: string[]
  onSelect: (id: string) => void
  onRemove: (id: string) => void
}

const MAX_SELECTION = 8

const IngredientSelector: React.FC<Props> = ({ selectedIds, onSelect, onRemove }) => {
  const [query, setQuery] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const wrapperRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const filtered = useMemo(() => {
    if (!query.trim()) return ingredients
    const q = query.toLowerCase()
    return ingredients.filter(i => i.name.toLowerCase().includes(q))
  }, [query])

  const selectedIngredients = useMemo(
    () => selectedIds.map(id => ingredients.find(i => i.id === id)!).filter(Boolean),
    [selectedIds]
  )

  const isMax = selectedIds.length >= MAX_SELECTION

  const handleSelect = (ing: Ingredient) => {
    if (selectedIds.includes(ing.id) || isMax) return
    onSelect(ing.id)
    setQuery('')
    setIsOpen(false)
  }

  return (
    <div className="ingredient-selector" ref={wrapperRef}>
      <div className="search-wrapper">
        <input
          type="text"
          className="search-input"
          placeholder={isMax ? '最多选择8种食材' : '搜索食材，如：西红柿、鸡蛋...'}
          value={query}
          onChange={e => { setQuery(e.target.value); setIsOpen(true) }}
          onFocus={() => setIsOpen(true)}
          disabled={isMax}
        />
        {isOpen && filtered.length > 0 && (
          <ul className="suggestions-list">
            {filtered.map(ing => (
              <li
                key={ing.id}
                className={`suggestion-item ${selectedIds.includes(ing.id) ? 'selected' : ''}`}
                onClick={() => handleSelect(ing)}
              >
                <span className="suggestion-emoji">{ing.iconEmoji}</span>
                <span className="suggestion-name">{ing.name}</span>
                <span className="suggestion-category">{ing.category}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {isMax && <div className="max-hint">⚠️ 最多选择8种食材</div>}

      {selectedIngredients.length > 0 && (
        <div className="selected-tags">
          {selectedIngredients.map(ing => (
            <span key={ing.id} className="ingredient-tag">
              {ing.iconEmoji} {ing.name}
              <button className="remove-btn" onClick={() => onRemove(ing.id)}>×</button>
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

export default IngredientSelector
