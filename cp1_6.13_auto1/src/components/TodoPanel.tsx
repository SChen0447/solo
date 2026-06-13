import { useState, KeyboardEvent } from 'react'
import type { TodoItem } from '../App'

interface TodoPanelProps {
  todos: TodoItem[]
  onAdd: (text: string) => void
  onToggle: (id: string) => void
  onDelete: (id: string) => void
}

function TodoPanel({ todos, onAdd, onToggle, onDelete }: TodoPanelProps) {
  const [inputValue, setInputValue] = useState('')

  const handleAdd = () => {
    if (inputValue.trim()) {
      onAdd(inputValue.trim())
      setInputValue('')
    }
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleAdd()
    }
  }

  return (
    <div className="panel glass-panel">
      <h2 className="panel-title">
        <span className="panel-icon">📋</span>
        待办清单
      </h2>

      <div className="todo-input-wrapper">
        <input
          type="text"
          className="todo-input"
          placeholder="添加新任务..."
          value={inputValue}
          onChange={e => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        <button className="add-button" onClick={handleAdd}>
          添加
        </button>
      </div>

      <ul className="todo-list">
        {todos.length === 0 ? (
          <li className="todo-empty">暂无任务，添加一个吧～</li>
        ) : (
          todos.map(todo => (
            <li
              key={todo.id}
              className={`todo-item ${todo.completed ? 'completed' : ''}`}
            >
              <label className="todo-checkbox-wrapper">
                <input
                  type="checkbox"
                  className="todo-checkbox"
                  checked={todo.completed}
                  onChange={() => onToggle(todo.id)}
                />
                <span className="checkmark"></span>
              </label>
              <span className="todo-text">{todo.text}</span>
              <button
                className="delete-button"
                onClick={() => onDelete(todo.id)}
                aria-label="删除任务"
              >
                ×
              </button>
            </li>
          ))
        )}
      </ul>
    </div>
  )
}

export default TodoPanel
