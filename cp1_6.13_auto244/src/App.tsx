import { useState, useEffect } from 'react';
import CardWall from './components/CardWall';
import CardEditor from './components/CardEditor';
import PostcardViewer from './components/PostcardViewer';
import './styles/global.css';

export interface User {
  userId: string;
  username: string;
}

export interface PostcardData {
  id: string;
  accessCode: string;
  imageData: string;
  lines: Array<{ points: { x: number; y: number }[]; color: string; width: number }>;
  emotion: string | null;
  viewCount: number;
  maxViews: number;
  createdAt: number;
}

type Page = 'home' | 'editor' | 'viewer';

function App() {
  const [currentPage, setCurrentPage] = useState<Page>('home');
  const [user, setUser] = useState<User | null>(null);
  const [viewingCode, setViewingCode] = useState<string | null>(null);
  const [editingCard, setEditingCard] = useState<PostcardData | null>(null);

  useEffect(() => {
    const savedUser = localStorage.getItem('postcard_user');
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch {
        localStorage.removeItem('postcard_user');
      }
    }
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    if (code) {
      setViewingCode(code);
      setCurrentPage('viewer');
    }
  }, []);

  const handleLogin = (userData: User) => {
    setUser(userData);
    localStorage.setItem('postcard_user', JSON.stringify(userData));
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('postcard_user');
  };

  const handleCreateNew = () => {
    setEditingCard(null);
    setCurrentPage('editor');
  };

  const handleEditCard = (card: PostcardData) => {
    setEditingCard(card);
    setCurrentPage('editor');
  };

  const handleBack = () => {
    setCurrentPage('home');
    setEditingCard(null);
    setViewingCode(null);
    window.history.pushState({}, '', window.location.pathname);
  };

  const handleViewByCode = (code: string) => {
    setViewingCode(code);
    setCurrentPage('viewer');
    window.history.pushState({ code }, '', `?code=${code}`);
  };

  const handleSaveComplete = () => {
    setCurrentPage('home');
    setEditingCard(null);
  };

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative', overflow: 'hidden' }}>
      {currentPage === 'home' && (
        <CardWall
          user={user}
          onLogin={handleLogin}
          onLogout={handleLogout}
          onCreateNew={handleCreateNew}
          onViewByCode={handleViewByCode}
          onEditCard={handleEditCard}
        />
      )}
      {currentPage === 'editor' && user && (
        <CardEditor
          user={user}
          editingCard={editingCard}
          onBack={handleBack}
          onSaveComplete={handleSaveComplete}
        />
      )}
      {currentPage === 'viewer' && viewingCode && (
        <PostcardViewer
          accessCode={viewingCode}
          onBack={handleBack}
        />
      )}
    </div>
  );
}

export default App;
