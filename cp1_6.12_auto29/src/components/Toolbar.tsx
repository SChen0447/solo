import React, { useState } from 'react'
import { SketchPicker } from 'react-color'
import { AnnotationCategory, ToolbarState } from '../types'
import '../styles/Toolbar.css'

interface ToolbarProps {
  toolbarState: ToolbarState
  onColorChange: (color: string) => void
  onCategoryChange: (category: AnnotationCategory) => void
  onUndo: () => void
  onRedo: () => void
  canUndo: boolean
  canRedo: boolean
}

const Toolbar: React.FC<ToolbarProps> = ({
  toolbarState,
  onColorChange,
  onCategoryChange,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
}) => {
  const [showColorPicker, setShowColorPicker] = useState(false)

  const categories: { value: AnnotationCategory; label: string; icon: string }[] = [
    { value: 'problem', label: '问题', icon: '!' },
    { value: 'suggestion', label: '建议', icon: '💡' },
    { value: 'confirmation', label: '确认', icon: '✓' },
  ]

  const handleColorClick = () => {
    setShowColorPicker(!showColorPicker)
  }

  const handleColorChangeComplete = (color: any) => {
    onColorChange(color.hex)
  }

  const handleCategoryClick = (category: AnnotationCategory) => {
    onCategoryChange(category)
  }

  return (
    <div className="toolbar">
      <div className="toolbar-section">
        <div className="toolbar-label">颜色</div>
        <div className="color-picker-wrapper">
          <button
            className="color-picker-btn"
            onClick={handleColorClick}
            style={{ backgroundColor: toolbarState.color }}
            title="选择颜色"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
              <circle cx="13.5" cy="6.5" r=".5" />
              <circle cx="17.5" cy="10.5" r=".5" />
              <circle cx="8.5" cy="7.5" r=".5" />
              <circle cx="6.5" cy="12.5" r=".5" />
              <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.555C21.965 6.012 17.461 2 12 2z" />
            </svg>
          </button>
          {showColorPicker && (
            <div className="color-picker-popover">
              <div className="color-picker-cover" onClick={() => setShowColorPicker(false)} />
              <SketchPicker
                color={toolbarState.color}
                onChangeComplete={handleColorChangeComplete}
                disableAlpha
              />
            </div>
          )}
        </div>
      </div>

      <div className="toolbar-divider" />

      <div className="toolbar-section">
        <div className="toolbar-label">类别</div>
        <div className="category-buttons">
          {categories.map((cat) => (
            <button
              key={cat.value}
              className={`category-btn ${toolbarState.category === cat.value ? 'active' : ''}`}
              onClick={() => handleCategoryClick(cat.value)}
              title={cat.label}
              style={{
                borderColor: toolbarState.category === cat.value ? toolbarState.color : 'transparent',
              }}
            >
              <span className="category-icon" style={{
                backgroundColor: toolbarState.category === cat.value ? toolbarState.color : 'rgba(255,255,255,0.1)'
              }}>
                {cat.icon}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="toolbar-divider" />

      <div className="toolbar-section">
        <div className="toolbar-label">操作</div>
        <div className="action-buttons">
          <button
            className="action-btn"
            onClick={onUndo}
            disabled={!canUndo}
            title="撤销 (Ctrl+Z)"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 7v6h6" />
              <path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13" />
            </svg>
          </button>
          <button
            className="action-btn"
            onClick={onRedo}
            disabled={!canRedo}
            title="重做 (Ctrl+Shift+Z)"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 7v6h-6" />
              <path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3l3 2.7" />
            </svg>
          </button>
        </div>
      </div>

      <div className="toolbar-footer">
        <div className="current-tool-info">
          <div
            className="current-color-indicator"
            style={{ backgroundColor: toolbarState.color }}
          />
          <span className="current-category">
            {categories.find((c) => c.value === toolbarState.category)?.label}
          </span>
        </div>
      </div>
    </div>
  )
}

export default Toolbar
