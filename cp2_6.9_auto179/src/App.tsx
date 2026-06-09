import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { Tour, Song, Venue, Collaborator, ViewMode, AppContextType } from './types';
import TourList from './components/TourList';
import ScheduleView from './components/ScheduleView';
import SetlistView from './components/SetlistView';
import MiniPlayer from './components/MiniPlayer';
import CollaborationPanel from './components/CollaborationPanel';
import LoginScreen from './components/LoginScreen';

const AppContext = createContext<AppContextType | null>(null);

export const useApp = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
};

const App: React.FC = () => {
  const [tours, setTours] = useState<Tour[]>([]);
  const [selectedTourId, setSelectedTourId] = useState<string | null>(null);
  const [expandedTourId, setExpandedTourId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('schedule');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState<Collaborator | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    const userStr = localStorage.getItem('currentUser');
    if (userStr) {
      setCurrentUser(JSON.parse(userStr));
      setIsLoggedIn(true);
    }
  }, []);

  useEffect(() => {
    if (!isLoggedIn) return;
    fetch('/api/tours')
      .then(res => res.json())
      .then(data => setTours(data))
      .catch(console.error);
  }, [isLoggedIn]);

  useEffect(() => {
    if (!isLoggedIn) return;
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const ws = new WebSocket(`${protocol}//${window.location.host}/ws`);
    wsRef.current = ws;

    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.type === 'songs_updated' || msg.type === 'song_reorder') {
        setTours(prev => prev.map(t => 
          t.id === msg.tourId ? { ...t, songs: msg.songs } : t
        ));
        const saved = localStorage.getItem(`songs_${msg.tourId}`);
        if (saved) {
          localStorage.setItem(`songs_${msg.tourId}`, JSON.stringify(msg.songs));
        }
      }
      if (msg.type === 'venues_updated') {
        setTours(prev => prev.map(t =>
          t.id === msg.tourId ? { ...t, venues: msg.venues } : t
        ));
      }
      if (msg.type === 'collaborator_joined') {
        setTours(prev => prev.map(t => {
          if (t.id !== msg.tourId) return t;
          const existingIdx = t.collaborators.findIndex(c => c.id === msg.collaborator.id);
          if (existingIdx >= 0) {
            const updated = [...t.collaborators];
            updated[existingIdx] = msg.collaborator;
            return { ...t, collaborators: updated };
          }
          return { ...t, collaborators: [...t.collaborators, msg.collaborator] };
        }));
      }
    };

    return () => ws.close();
  }, [isLoggedIn]);

  useEffect(() => {
    if (wsRef.current && selectedTourId && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'join_tour', tourId: selectedTourId }));
    }
  }, [selectedTourId]);

  const login = useCallback(() => {
    const colors = ['#E91E63', '#3F51B5', '#4CAF50', '#FF9800', '#9C27B0'];
    const user: Collaborator = {
      id: 'local-user-' + Date.now(),
      email: 'user@example.com',
      nickname: '音乐人',
      color: colors[Math.floor(Math.random() * colors.length)],
      token: '',
      accepted: true
    };
    localStorage.setItem('currentUser', JSON.stringify(user));
    setCurrentUser(user);
    setIsLoggedIn(true);
  }, []);

  const createTour = useCallback(async (data: Partial<Tour>): Promise<Tour> => {
    const res = await fetch('/api/tours', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    const tour = await res.json();
    setTours(prev => [...prev, tour]);
    return tour;
  }, []);

  const updateTour = useCallback(async (id: string, data: Partial<Tour>) => {
    await fetch(`/api/tours/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    setTours(prev => prev.map(t => t.id === id ? { ...t, ...data } : t));
  }, []);

  const deleteTour = useCallback(async (id: string) => {
    await fetch(`/api/tours/${id}`, { method: 'DELETE' });
    setTours(prev => prev.filter(t => t.id !== id));
    if (selectedTourId === id) setSelectedTourId(null);
    if (expandedTourId === id) setExpandedTourId(null);
  }, [selectedTourId, expandedTourId]);

  const updateSongs = useCallback(async (tourId: string, songs: Song[]) => {
    localStorage.setItem(`songs_${tourId}`, JSON.stringify(songs));
    await fetch(`/api/tours/${tourId}/songs`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ songs })
    });
    setTours(prev => prev.map(t => t.id === tourId ? { ...t, songs } : t));
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'song_reorder', tourId, songs }));
    }
  }, []);

  const updateVenue = useCallback(async (tourId: string, venueId: string, venue: Partial<Venue>) => {
    await fetch(`/api/tours/${tourId}/venues`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ venueId, venue })
    });
    setTours(prev => prev.map(t => {
      if (t.id !== tourId) return t;
      return {
        ...t,
        venues: t.venues.map(v => v.id === venueId ? { ...v, ...venue } : v)
      };
    }));
  }, []);

  const sendInvite = useCallback(async (tourId: string, email: string, nickname?: string) => {
    const res = await fetch('/api/invite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tourId, email, nickname })
    });
    const data = await res.json();
    setTours(prev => prev.map(t => {
      if (t.id !== tourId) return t;
      return { ...t, collaborators: [...t.collaborators, data.collaborator] };
    }));
    return data;
  }, []);

  const selectedTour = tours.find(t => t.id === selectedTourId) || null;

  const contextValue: AppContextType = {
    tours,
    selectedTourId,
    expandedTourId,
    viewMode,
    isLoggedIn,
    currentUser,
    ws: wsRef.current,
    setSelectedTourId,
    setExpandedTourId,
    setViewMode,
    createTour,
    updateTour,
    deleteTour,
    updateSongs,
    updateVenue,
    sendInvite,
    login
  };

  if (!isLoggedIn) {
    return <AppContext.Provider value={contextValue}><LoginScreen /></AppContext.Provider>;
  }

  return (
    <AppContext.Provider value={contextValue}>
      <div className="app-container">
        <div className={`sidebar-overlay ${sidebarOpen ? 'visible' : ''}`} onClick={() => setSidebarOpen(false)} />
        <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
          <div className="sidebar-header">
            <h1 className="app-title">巡演管理器</h1>
            <button className="menu-toggle" onClick={() => setSidebarOpen(false)}>✕</button>
          </div>
          <TourList />
        </aside>
        
        <main className="main-content">
          <header className="main-header">
            <button className="menu-toggle mobile-only" onClick={() => setSidebarOpen(true)}>☰</button>
            <h2 className="page-title">
              {selectedTour ? selectedTour.name : '巡演仪表盘'}
            </h2>
            {selectedTour && (
              <div className="view-tabs">
                <button 
                  className={`tab-btn ${viewMode === 'schedule' ? 'active' : ''}`}
                  onClick={() => setViewMode('schedule')}
                >
                  日程视图
                </button>
                <button 
                  className={`tab-btn ${viewMode === 'setlist' ? 'active' : ''}`}
                  onClick={() => setViewMode('setlist')}
                >
                  歌单模式
                </button>
              </div>
            )}
            {selectedTour && <CollaborationPanel tour={selectedTour} />}
          </header>
          
          <div className="content-area">
            {!selectedTour ? (
              <div className="empty-state">
                <div className="empty-icon">🎸</div>
                <h3>欢迎使用巡演管理器</h3>
                <p>从左侧选择一个巡演，或点击"新建巡演"开始规划</p>
              </div>
            ) : viewMode === 'schedule' ? (
              <ScheduleView tour={selectedTour} />
            ) : (
              <SetlistView tour={selectedTour} />
            )}
          </div>
        </main>
        
        {viewMode === 'setlist' && selectedTour && <MiniPlayer tour={selectedTour} />}
      </div>
    </AppContext.Provider>
  );
};

export default App;
