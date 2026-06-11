import React, { useReducer, useEffect, useMemo, useCallback, useRef } from 'react';
import Timeline from './components/Timeline';
import EventCard from './components/EventCard';
import Heatmap from './components/Heatmap';
import { initialEvents, HistoricalEvent, eraNames, eraColors } from './data/initialEvents';
import './App.css';

const STORAGE_KEY = 'history-timeline-custom-events';

interface AppState {
  events: HistoricalEvent[];
  selectedEvent: HistoricalEvent | null;
  viewStart: number;
  viewEnd: number;
  searchQuery: string;
  isSearchExpanded: boolean;
  isEditing: boolean;
  editingEvent: HistoricalEvent | null;
}

type Action =
  | { type: 'SET_VIEW'; start: number; end: number }
  | { type: 'SELECT_EVENT'; event: HistoricalEvent }
  | { type: 'DESELECT_EVENT' }
  | { type: 'SET_SEARCH_QUERY'; query: string }
  | { type: 'TOGGLE_SEARCH' }
  | { type: 'ADD_CUSTOM_EVENT'; event: HistoricalEvent }
  | { type: 'UPDATE_CUSTOM_EVENT'; event: HistoricalEvent }
  | { type: 'DELETE_CUSTOM_EVENT'; id: string }
  | { type: 'START_EDITING'; event: HistoricalEvent | null }
  | { type: 'STOP_EDITING' }
  | { type: 'LOAD_CUSTOM_EVENTS'; events: HistoricalEvent[] };

const initialState: AppState = {
  events: initialEvents,
  selectedEvent: null,
  viewStart: -500,
  viewEnd: 2000,
  searchQuery: '',
  isSearchExpanded: true,
  isEditing: false,
  editingEvent: null,
};

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'SET_VIEW':
      return { ...state, viewStart: action.start, viewEnd: action.end };
    case 'SELECT_EVENT':
      return { ...state, selectedEvent: action.event };
    case 'DESELECT_EVENT':
      return { ...state, selectedEvent: null };
    case 'SET_SEARCH_QUERY':
      return { ...state, searchQuery: action.query };
    case 'TOGGLE_SEARCH':
      return { ...state, isSearchExpanded: !state.isSearchExpanded };
    case 'ADD_CUSTOM_EVENT':
      return { ...state, events: [...state.events, action.event] };
    case 'UPDATE_CUSTOM_EVENT':
      return {
        ...state,
        events: state.events.map((e) =>
          e.id === action.event.id ? action.event : e
        ),
      };
    case 'DELETE_CUSTOM_EVENT':
      return {
        ...state,
        events: state.events.filter((e) => e.id !== action.id),
        selectedEvent: state.selectedEvent?.id === action.id ? null : state.selectedEvent,
      };
    case 'START_EDITING':
      return { ...state, isEditing: true, editingEvent: action.event };
    case 'STOP_EDITING':
      return { ...state, isEditing: false, editingEvent: null };
    case 'LOAD_CUSTOM_EVENTS':
      return { ...state, events: [...initialEvents, ...action.events] };
    default:
      return state;
  }
}

const App: React.FC = () => {
  const [state, dispatch] = useReducer(reducer, initialState);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const customEvents = JSON.parse(stored);
        dispatch({ type: 'LOAD_CUSTOM_EVENTS', events: customEvents });
      }
    } catch (e) {
      console.error('Failed to load custom events:', e);
    }
  }, []);

  useEffect(() => {
    try {
      const customEvents = state.events.filter((e) => e.isCustom);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(customEvents));
    } catch (e) {
      console.error('Failed to save custom events:', e);
    }
  }, [state.events]);

  const handleViewChange = useCallback((start: number, end: number) => {
    dispatch({ type: 'SET_VIEW', start, end });
  }, []);

  const handleEventClick = useCallback((event: HistoricalEvent) => {
    dispatch({ type: 'SELECT_EVENT', event });
  }, []);

  const handleCloseCard = useCallback(() => {
    dispatch({ type: 'DESELECT_EVENT' });
  }, []);

  const handleJumpToYear = useCallback(
    (year: number) => {
      const span = state.viewEnd - state.viewStart;
      const newStart = year - span / 2;
      const newEnd = year + span / 2;
      dispatch({ type: 'SET_VIEW', start: newStart, end: newEnd });
    },
    [state.viewStart, state.viewEnd]
  );

  const matchedEvents = useMemo(() => {
    if (!state.searchQuery.trim()) return [];
    const query = state.searchQuery.toLowerCase();
    return state.events.filter(
      (e) =>
        e.title.toLowerCase().includes(query) ||
        e.description.toLowerCase().includes(query)
    );
  }, [state.events, state.searchQuery]);

  const handleSearchKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter' && matchedEvents.length > 0) {
        const firstMatch = matchedEvents[0];
        handleJumpToYear(firstMatch.date);
        dispatch({ type: 'SELECT_EVENT', event: firstMatch });
      }
    },
    [matchedEvents, handleJumpToYear]
  );

  const handleAddEvent = useCallback(() => {
    const centerYear = (state.viewStart + state.viewEnd) / 2;
    const newEvent: HistoricalEvent = {
      id: `custom-${Date.now()}`,
      date: Math.round(centerYear),
      title: '',
      description: '',
      imageUrl: '',
      era: 'custom',
      isCustom: true,
    };
    dispatch({ type: 'START_EDITING', event: newEvent });
  }, [state.viewStart, state.viewEnd]);

  const handleEditEvent = useCallback((event: HistoricalEvent) => {
    dispatch({ type: 'START_EDITING', event: { ...event } });
  }, []);

  const handleDeleteEvent = useCallback((id: string) => {
    dispatch({ type: 'DELETE_CUSTOM_EVENT', id });
  }, []);

  const handleSaveEvent = useCallback(() => {
    if (!state.editingEvent) return;
    if (!state.editingEvent.title.trim()) {
      alert('请输入事件标题');
      return;
    }
    if (state.events.some((e) => e.id === state.editingEvent?.id)) {
      dispatch({ type: 'UPDATE_CUSTOM_EVENT', event: state.editingEvent });
    } else {
      dispatch({ type: 'ADD_CUSTOM_EVENT', event: state.editingEvent });
    }
    dispatch({ type: 'STOP_EDITING' });
  }, [state.editingEvent, state.events]);

  const handleCancelEdit = useCallback(() => {
    dispatch({ type: 'STOP_EDITING' });
  }, []);

  const handleEditingChange = useCallback(
    (field: keyof HistoricalEvent, value: string | number) => {
      if (!state.editingEvent) return;
      dispatch({
        type: 'START_EDITING',
        event: { ...state.editingEvent, [field]: value },
      });
    },
    [state.editingEvent]
  );

  const toggleSearch = useCallback(() => {
    dispatch({ type: 'TOGGLE_SEARCH' });
    setTimeout(() => {
      searchInputRef.current?.focus();
    }, 100);
  }, []);

  return (
    <div className="app">
      <header className="app-header">
        <h1 className="app-title">历史时间轴</h1>
        <div className="header-actions">
          <div className={`search-container ${state.isSearchExpanded ? 'expanded' : ''}`}>
            {state.isSearchExpanded ? (
              <input
                ref={searchInputRef}
                type="text"
                className="search-input"
                placeholder="搜索历史事件..."
                value={state.searchQuery}
                onChange={(e) =>
                  dispatch({ type: 'SET_SEARCH_QUERY', query: e.target.value })
                }
                onKeyDown={handleSearchKeyDown}
              />
            ) : (
              <button className="search-icon-btn" onClick={toggleSearch} aria-label="搜索">
                🔍
              </button>
            )}
          </div>
          <button className="btn-add" onClick={handleAddEvent} aria-label="添加事件">
            <span className="btn-add-icon">+</span>
            <span className="btn-add-text">添加事件</span>
          </button>
        </div>
      </header>

      <main className="app-main">
        <Timeline
          events={state.events}
          selectedEvent={state.selectedEvent}
          viewStart={state.viewStart}
          viewEnd={state.viewEnd}
          searchQuery={state.searchQuery}
          onEventClick={handleEventClick}
          onViewChange={handleViewChange}
        />

        <Heatmap
          events={state.events}
          viewStart={state.viewStart}
          viewEnd={state.viewEnd}
          onJump={handleJumpToYear}
        />
      </main>

      <div className="era-legend">
        {Object.entries(eraNames).map(([era, name]) => (
          <div key={era} className="era-legend-item">
            <span
              className="era-legend-color"
              style={{ backgroundColor: eraColors[era] }}
            />
            <span className="era-legend-name">{name}</span>
          </div>
        ))}
      </div>

      {state.selectedEvent && (
        <EventCard
          event={state.selectedEvent}
          onClose={handleCloseCard}
          onEdit={state.selectedEvent.isCustom ? handleEditEvent : undefined}
          onDelete={state.selectedEvent.isCustom ? handleDeleteEvent : undefined}
        />
      )}

      {state.isEditing && state.editingEvent && (
        <div className="edit-modal-overlay" onClick={handleCancelEdit}>
          <div className="edit-modal" onClick={(e) => e.stopPropagation()}>
            <h2 className="edit-modal-title">
              {state.editingEvent.title ? '编辑事件' : '添加自定义事件'}
            </h2>

            <div className="form-group">
              <label>事件标题</label>
              <input
                type="text"
                value={state.editingEvent.title}
                onChange={(e) => handleEditingChange('title', e.target.value)}
                placeholder="请输入事件标题"
              />
            </div>

            <div className="form-group">
              <label>年份（负数表示公元前）</label>
              <input
                type="number"
                value={state.editingEvent.date}
                onChange={(e) => handleEditingChange('date', parseInt(e.target.value) || 0)}
              />
            </div>

            <div className="form-group">
              <label>描述</label>
              <textarea
                value={state.editingEvent.description}
                onChange={(e) => handleEditingChange('description', e.target.value)}
                placeholder="请输入事件描述"
                rows={4}
              />
            </div>

            <div className="form-group">
              <label>图片 URL</label>
              <input
                type="text"
                value={state.editingEvent.imageUrl}
                onChange={(e) => handleEditingChange('imageUrl', e.target.value)}
                placeholder="请输入图片 URL"
              />
            </div>

            <div className="form-group">
              <label>时代分类</label>
              <select
                value={state.editingEvent.era}
                onChange={(e) => handleEditingChange('era', e.target.value)}
              >
                {Object.entries(eraNames).map(([era, name]) => (
                  <option key={era} value={era}>
                    {name}
                  </option>
                ))}
              </select>
            </div>

            <div className="edit-modal-actions">
              <button className="btn btn-cancel" onClick={handleCancelEdit}>
                取消
              </button>
              <button className="btn btn-save" onClick={handleSaveEvent}>
                保存
              </button>
            </div>
          </div>
        </div>
      )}

      <footer className="app-footer">
        <p>拖拽时间轴浏览 · 滚轮缩放 · 点击节点查看详情</p>
      </footer>
    </div>
  );
};

export default App;
