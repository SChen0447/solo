import { memo } from 'react'
import { AnimationElement, AnimationStatus } from '../types'

interface Props {
  elements: AnimationElement[]
  selectedElementId: string | null
  onSelectElement: (id: string) => void
  onAddElement: () => void
  onRemoveElement: (id: string) => void
}

const statusLabel: Record<AnimationStatus, string> = {
  playing: '播放中',
  paused: '暂停',
  stopped: '已停止'
}

const ElementItem = memo(
  ({
    element,
    isSelected,
    onSelect,
    onRemove
  }: {
    element: AnimationElement
    isSelected: boolean
    onSelect: () => void
    onRemove: () => void
  }) => {
    return (
      <div
        className={`element-item${isSelected ? ' selected' : ''}`}
        onClick={onSelect}
      >
        <div
          className="element-color-dot"
          style={{ backgroundColor: element.color }}
        />
        <div className="element-info">
          <div className="element-name">{element.name}</div>
          <div className="element-status">
            <span className={`status-dot ${element.status}`} />
            {statusLabel[element.status]}
          </div>
        </div>
        <button
          className="delete-btn"
          onClick={(e) => {
            e.stopPropagation()
            onRemove()
          }}
          title="删除元素"
        >
          ×
        </button>
      </div>
    )
  }
)

ElementItem.displayName = 'ElementItem'

const ElementList = ({
  elements,
  selectedElementId,
  onSelectElement,
  onAddElement,
  onRemoveElement
}: Props) => {
  return (
    <div className="element-list-panel">
      <div className="panel-header">
        <span className="panel-title">动画元素</span>
        <button className="add-btn" onClick={onAddElement}>
          + 添加元素
        </button>
      </div>
      <div className="element-list">
        {elements.length === 0 && (
          <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-secondary)', fontSize: 13 }}>
            暂无元素，点击上方按钮添加
          </div>
        )}
        {elements.map((element) => (
          <ElementItem
            key={element.id}
            element={element}
            isSelected={element.id === selectedElementId}
            onSelect={() => onSelectElement(element.id)}
            onRemove={() => onRemoveElement(element.id)}
          />
        ))}
      </div>
    </div>
  )
}

export default memo(ElementList)
