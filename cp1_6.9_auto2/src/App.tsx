import { useState, useEffect } from 'react';
import CalendarGrid from './components/CalendarGrid';
import MoodTracker from './components/MoodTracker';
import TodoList from './components/TodoList';
import { formatDate, formatDateCN } from './types';
import type { MoodType, TodoItem } from './types';
import './App.css';

const MOOD_STORAGE_KEY = 'calendar_moods';
const TODO_STORAGE_KEY = 'calendar_todos';

export default function App() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [detailKey, setDetailKey] = useState<string>(formatDate(new Date()));
  const [moods, setMoods] = useState<Record<string, MoodType>>({});
  const [todos, setTodos] = useState<Record<string, TodoItem[]>>({});
  const [detailAnimating, setDetailAnimating] = useState(false);

  useEffect(() => {
    try {
      const savedMoods = localStorage.getItem(MOOD_STORAGE_KEY);
      if (savedMoods) setMoods(JSON.parse(savedMoods));
    } catch (_) {
      // ignore
    }
    try {
      const savedTodos = localStorage.getItem(TODO_STORAGE_KEY);
      if (savedTodos) setTodos(JSON.parse(savedTodos));
    } catch (_) {
      // ignore
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(MOOD_STORAGE_KEY, JSON.stringify(moods));
  }, [moods]);

  useEffect(() => {
    localStorage.setItem(TODO_STORAGE_KEY, JSON.stringify(todos));
  }, [todos]);

  const handleSelectDate = (date: Date) => {
    setDetailAnimating(true);
    setTimeout(() => {
      setSelectedDate(date);
      setDetailKey(formatDate(date));
      setDetailAnimating(false);
    }, 100);
  };

  const handleSelectMood = (mood: MoodType) => {
    setMoods(prev => ({ ...prev, [detailKey]: mood }));
  };

  const handleAddTodo = (text: string) => {
    const newTodo: TodoItem = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      text,
      completed: false,
      date: detailKey,
    };
    setTodos(prev => ({
      ...prev,
      [detailKey]: [newTodo, ...(prev[detailKey] || [])],
    }));
  };

  const handleToggleTodo = (id: string) => {
    setTodos(prev => ({
      ...prev,
      [detailKey]: (prev[detailKey] || []).map(t =>
        t.id === id ? { ...t, completed: !t.completed } : t
      ),
    }));
  };

  const handleDeleteTodo = (id: string) => {
    setTodos(prev => ({
      ...prev,
      [detailKey]: (prev[detailKey] || []).filter(t => t.id !== id),
    }));
  };

  const currentMood = moods[detailKey] || null;
  const currentTodos = todos[detailKey] || [];

  return (
    <div className="app-root">
      <div className="app-body">
        <aside className="sidebar">
          <TodoList
            todos={currentTodos}
            onAddTodo={handleAddTodo}
            onToggleTodo={handleToggleTodo}
            onDeleteTodo={handleDeleteTodo}
          />
        </aside>
        <main className="main-content">
          <CalendarGrid
            selectedDate={selectedDate}
            onSelectDate={handleSelectDate}
            moods={moods}
          />
          <div className={`detail-panel ${detailAnimating ? 'fade' : ''}`}>
            <h2 className="detail-title">{formatDateCN(selectedDate)}</h2>
            <MoodTracker currentMood={currentMood} onSelectMood={handleSelectMood} />
            <div className="detail-todos">
              <h3 className="detail-section-title">当日待办</h3>
              {currentTodos.length === 0 ? (
                <div className="detail-empty">暂无待办</div>
              ) : (
                <ul className="detail-todo-list">
                  {currentTodos.map(todo => (
                    <li
                      key={todo.id}
                      className={`detail-todo-item ${todo.completed ? 'done' : ''}`}
                    >
                      <span className="detail-todo-dot" />
                      {todo.text}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
