import React from 'react'
import type { ElementType } from '../App'

interface ToolbarProps {
  onAddRock: () => void
  onAddRake: () => void
  onAddMoss: () => void
  onUndo: () => void
  onClear: () => void
  canUndo: boolean
  elementCount: number
  maxElements: number
}

function ToolbarButton({
  label,
  icon,
  onClick,
  disabled,
  draggable,
  onDragStart,
  elementType,
}: {
  label: string
  icon: string
  onClick: () => void
  disabled?: boolean
  draggable?: boolean
  onDragStart?: (e: React.DragEvent) => void
  elementType?: ElementType
}) {
  return (
    <button
      className="toolbar-btn"
      onClick={onClick}
      disabled={disabled}
      draggable={draggable}
      onDragStart={onDragStart}
      title={draggable ? `拖拽或点击添加${label}` : label}
    >
      <span className="toolbar-btn-icon">{icon}</span>
      <span className="toolbar-btn-label">{label}</span>
    </button>
  )
}

export default function Toolbar({
  onAddRock,
  onAddRake,
  onAddMoss,
  onUndo,
  onClear,
  canUndo,
  elementCount,
  maxElements,
}: ToolbarProps) {
  const handleDragStart = (e: React.DragEvent, type: ElementType) => {
    e.dataTransfer.setData('element-type', type)
    e.dataTransfer.effectAllowed = 'copy'
  }

  const isFull = elementCount >= maxElements

  return (
    <div className="toolbar">
      <div className="toolbar-title">枯山水 · 禅意花园</div>
      <div className="toolbar-actions">
        <ToolbarButton
          label="岩石"
          icon="🪨"
          onClick={onAddRock}
          disabled={isFull}
          draggable={!isFull}
          onDragStart={(e) => handleDragStart(e, 'rock')}
          elementType="rock"
        />
        <ToolbarButton
          label="耙纹"
          icon="〰"
          onClick={onAddRake}
          disabled={isFull}
          draggable={!isFull}
          onDragStart={(e) => handleDragStart(e, 'rake')}
          elementType="rake"
        />
        <ToolbarButton
          label="苔藓"
          icon="🌿"
          onClick={onAddMoss}
          disabled={isFull}
          draggable={!isFull}
          onDragStart={(e) => handleDragStart(e, 'moss')}
          elementType="moss"
        />
        <div className="toolbar-divider" />
        <ToolbarButton
          label="撤销"
          icon="↩"
          onClick={onUndo}
          disabled={!canUndo}
        />
        <ToolbarButton
          label="清空"
          icon="✕"
          onClick={onClear}
          disabled={elementCount === 0}
        />
      </div>
      <div className="toolbar-count">
        {elementCount}/{maxElements}
      </div>
    </div>
  )
}
