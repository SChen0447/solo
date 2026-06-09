import { useState } from 'react';
import type { TodoItem } from '../types';
import './TodoList.css';

interface TodoListProps {
  todos: TodoItem[];
  onAddTodo: (text: string) => void;
  onToggleTodo: (id: string) => void;
  onDeleteTodo: (id: string) => void;
}

export default function TodoList({ todos, onAddTodo, onToggleTodo, onDeleteTodo }: TodoListProps) {
  const [inputValue, setInputValue] = useState('');
  const [newIds, setNewIds] = useState<Set<string>>(new Set());

  const completedCount = todos.filter(t => t.completed).length;
  const totalCount = todos.length;

  const handleSubmit = () => {
    const text = inputValue.trim();
    if (!text) return;
    onAddTodo(text);
    const tempId = `new-${Date.now()}`;
    setNewIds(prev => new Set(prev).add(tempId));
    setTimeout(() => {
      setNewIds(prev => {
        const n = new Set(prev);
        n.delete(tempId);
        return n;
      });
    }, 300);
    setInputValue('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSubmit();
    }
  };

  return (
    <div className="todo-panel">
      <div className="todo-header">
        <h3 className="todo-title">待办事项</h3>
        <div className="todo-stats">
          已完成：{completedCount}/总数{totalCount}
        </div>
      </div>
      <div className="todo-input-row">
        <input
          className="todo-input"
          type="text"
          placeholder="添加待办事项"
          value={inputValue}
          onChange={e => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        <button className="todo-add-btn" onClick={handleSubmit}>
          添加
        </button>
      </div>
      <ul className="todo-list">
        {todos.length === 0 && (
          <li className="todo-empty">暂无待办</li>
        )}
        {todos.map(todo => (
          <li
            key={todo.id}
            className={`todo-item ${todo.completed ? 'completed' : ''} ${newIds.has(todo.id) ? 'slide-in' : ''}`}
          >
            <label className="todo-check-wrap">
              <input
                type="checkbox"
                className="todo-check"
                checked={todo.completed}
                onChange={() => onToggleTodo(todo.id)}
              />
              <span className="todo-text">{todo.text}</span>
            </label>
            <button
              className="todo-delete"
              onClick={() => onDeleteTodo(todo.id)}
              aria-label="删除待办"
            >
              ×
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
